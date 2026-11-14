-- QA reversible: aprobación -> efectiva debe reflejarse en DB/Admin, sin pérdida contable.
begin;
do $qa$
declare
  cid uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); c3 uuid:=gen_random_uuid();
  s1 uuid; s2 uuid; cs1 uuid; cs2 uuid;cs3 uuid;
  req uuid;req2 uuid;req3 uuid; result jsonb; msg text;
begin
  insert into public.servicios(nombre,precio,costo,cuentas,limite)
    values ('CANCEL EFFECT GOOGLE',29,0,1,1) returning id into s1;
  insert into public.servicios(nombre,precio,costo,cuentas,limite)
    values ('CANCEL EFFECT CRUNCH',99,0,1,1) returning id into s2;
  insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
  values
   (cid,'EF1'||substr(cid::text,1,8),'EF1'||substr(cid::text,10,4),'QA CANCEL EFFECT MULTI',15,'pagado','2026-12-01',0),
   (c2,'EF2'||substr(c2::text,1,8),'EF2'||substr(c2::text,10,4),'QA CANCEL EFFECT LAST',15,'pagado','2026-12-01',0),
   (c3,'EF3'||substr(c3::text,1,8),'EF3'||substr(c3::text,10,4),'QA CANCEL EFFECT REJECT',15,'pagado','2026-12-01',0);
  insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
  values(cid,s1,'Google One',29,true) returning id into cs1;
  insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
  values(cid,s2,'Crunchyroll',99,true);
  insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
  values(c2,s1,'Google One',29,true) returning id into cs2;
  insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
  values(c3,s1,'Google One',29,true) returning id into cs3;
  insert into public.solicitudes_cancelacion(cliente_id,cliente_servicio_id,estado)
  values(cid,cs1,'aprobada') returning id into req;
  result=public.goxion_hacer_efectiva_cancelacion_admin_v1(req,'admin:qa_rollback');
  if result->>'estado'<>'efectiva' or (result->>'servicio_activo')::boolean is distinct from false
   or (select count(*) from public.cliente_servicios where cliente_id=cid and activo)<>1
   or (select estado from public.solicitudes_cancelacion where id=req)<>'efectiva'
   or (public.goxion_estado_financiero(cid)->>'subtotal')::numeric<>99
   then raise exception 'No se sincronizó la cancelación y el saldo multi: %',result;end if;
  result=public.goxion_hacer_efectiva_cancelacion_admin_v1(req,'admin:qa_rollback');
  if result->>'repetida'<>'true' then raise exception 'No es idempotente: %',result;end if;
  insert into public.solicitudes_cancelacion(cliente_id,cliente_servicio_id,estado)
  values(c2,cs2,'aprobada') returning id into req2;
  result=public.goxion_hacer_efectiva_cancelacion_admin_v1(req2,'admin:qa_rollback');
  if (select count(*) from public.cliente_servicios where cliente_id=c2 and activo)<>0
   or (select count(*) from public.cliente_servicios where cliente_id=c2 and not activo)<>1
   or (select estado from public.solicitudes_cancelacion where id=req2)<>'efectiva'
   then raise exception 'No se desactivó el último servicio: %',result;end if;
  insert into public.solicitudes_cancelacion(cliente_id,cliente_servicio_id,estado)
  values(c3,cs3,'solicitada') returning id into req3;
  msg=null;
  begin
    perform public.goxion_hacer_efectiva_cancelacion_admin_v1(req3,'admin:qa_rollback');
  exception when others then get stacked diagnostics msg=MESSAGE_TEXT;
  end;
  if msg<>'CANCELACION_REQUIERE_APROBACION'
    or (select activo from public.cliente_servicios where id=cs3) is not true
    or (select estado from public.solicitudes_cancelacion where id=req3)<>'solicitada'
    then raise exception 'Saltó la aprobación previa, error=%',msg;end if;
  if (select count(*) from public.pagos where cliente_id in(cid,c2,c3))<>0 then
    raise exception 'Generó un pago durante la cancelación';end if;
end $qa$;
select 'CANCELACION_EFECTIVA_ATOMICA_PASS' resultado;
rollback;
