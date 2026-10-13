-- GOXION B2 · prueba reversible de comprobante -> dos cargos.
-- NO COMMIT. Prueba sólo con identidad y servicios ficticios.
BEGIN;
DO $test$
DECLARE
 cid uuid:=gen_random_uuid();sid uuid;sid2 uuid;cy uuid;
 v_periodo date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
 x record;y record; d jsonb; quote jsonb;
 a int;b int;r1 uuid;rep_op uuid:=gen_random_uuid();ap_op uuid:=gen_random_uuid();
 item_op1 uuid:=gen_random_uuid();item_op2 uuid:=gen_random_uuid();
 file_ref text;
 j jsonb;wrong jsonb;reject_ok boolean:=false;
BEGIN
 if extract(day from v_hoy)>25 then raise exception 'Fixture solo permitido antes del día 26';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 if sid is null or sid2 is null then raise exception 'Fixture requiere dos servicios activos';end if;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'PX'||substr(cid::text,1,8),'PX'||substr(cid::text,10,4),
 'B2 COMPROBANTE TEST ROLLBACK',extract(day from v_hoy)::int,'pendiente',v_periodo,0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Plataforma A',49,true),(cid,sid2,'Plataforma B',45,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,
 cliente_id,cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,
 actualizado_por,revision)
 select ac.id,ac.cliente_servicio_id,cid,
 case when row_number() over(order by ac.id)=1 then v_hoy else v_hoy+2 end,
 case when row_number() over(order by ac.id)=1 then extract(day from v_hoy)::int
 else extract(day from v_hoy+2)::int end,
 round(s.monto*100)::int,'verificado',now(),'test_rollback',1
 from public.cliente_accesos ac
 join public.cliente_servicios s on s.id=ac.cliente_servicio_id
 where ac.cliente_id=cid and ac.activo;
 d=public.goxion_b2_activar_cliente(cid,v_periodo,true,'admin:fixture');
 if d->>'regimen_activo'<>'true' then raise exception 'No activó B2 fixture: %',d;end if;
 d=public.goxion_b2_iniciar_ciclo(cid,v_periodo);
 cy=(d->>'ciclo_id')::uuid;
 select * into x from public.goxion_b2_cargos where ciclo_id=cy
 order by fecha_vencimiento,id limit 1;
 select * into y from public.goxion_b2_cargos where ciclo_id=cy
 order by fecha_vencimiento desc,id limit 1;
 if x.id=y.id then raise exception 'No se crearon dos cargos';end if;
 quote=public.goxion_b2_cotizar_ciclo(cid,v_periodo,v_hoy);
 select (item->>'total_centavos')::int into a
 from jsonb_array_elements(quote->'cargos') item where item->>'cargo_id'=x.id::text;
 select (item->>'total_centavos')::int into b
 from jsonb_array_elements(quote->'cargos') item where item->>'cargo_id'=y.id::text;
 if a is null or b is null or a<=0 or b<=0 then raise exception 'Cotización inválida';end if;
 -- La función de reportar heredada SIN evidencia está cerrada.
 reject_ok=false;
 begin
  perform public.goxion_b2_registrar_comprobante(
    cid,cy,a+b,'texto/libre/discord',rep_op);
 exception when others then
  if sqlerrm like 'B2_REPORTE_REQUIERE_EVIDENCIA_AUTENTICADA%'
   then reject_ok=true;else raise;end if;
 end;
 if not reject_ok then raise exception 'Registro sin evidencia quedó accesible';end if;
 -- Ni montos inventados ni archivos que aún no se cargaron son aceptables.
 reject_ok=false;
 begin
  perform public.goxion_b2_registrar_comprobante_seguro(
    cid,cy,a+b,cid::text||'/'||rep_op::text||'-notyet.png',
    rep_op,array[x.id,y.id]);
 exception when others then
  if sqlerrm like 'COMPROBANTE_ARCHIVO_NO_VERIFICADO%'
   then reject_ok=true;else raise;end if;
 end;
 if not reject_ok then raise exception 'Se aceptó evidencia inexistente';end if;
 reject_ok=false;
 begin
  perform public.goxion_b2_registrar_comprobante_seguro(
    cid,cy,a+b+100,
    cid::text||'/'||rep_op::text||'-notyet.png',
    rep_op,array[x.id,y.id]);
 exception when others then
  if sqlerrm like 'COMPROBANTE_ARCHIVO_NO_VERIFICADO%'
   then reject_ok=true;else raise;end if;
 end;
 if not reject_ok then raise exception 'Faltó rechazo de archivo o importe';end if;
 file_ref=cid::text||'/'||rep_op::text||'-55aaccee10ef011a.png';
 -- Simula SÓLO el índice de evidencia privada en transacción reversible;
 -- la existencia de bytes reales se probará desde Edge/storage, no aquí.
 insert into storage.objects(bucket_id,name,metadata)
 values('goxion-b2-evidencias',file_ref,'{"mimetype":"image/png","size":128}'::jsonb);
 d=public.goxion_b2_registrar_comprobante_seguro(cid,cy,a+b,
  file_ref,rep_op,array[x.id,y.id]);
 r1=(d->>'reporte_id')::uuid;
 if d->>'acreditado'<>'false' then raise exception 'Reporte sin aprobación acreditó';end if;
 d=public.goxion_b2_registrar_comprobante_seguro(cid,cy,a+b,
  file_ref,rep_op,array[x.id,y.id]);
 if d->>'repetido'<>'true' or (d->>'reporte_id')::uuid<>r1 then
  raise exception 'Reintento del reporte duplicó recibo';end if;
 j=jsonb_build_array(
  jsonb_build_object('cargo_id',x.id,'monto_centavos',a,
    'saldo_esperado_centavos',a,'operation_id',item_op1),
  jsonb_build_object('cargo_id',y.id,'monto_centavos',b,
    'saldo_esperado_centavos',b,'operation_id',item_op2)
 );
 wrong=jsonb_build_array(
  jsonb_build_object('cargo_id',x.id,'monto_centavos',a,
    'saldo_esperado_centavos',a,'operation_id',item_op1),
  jsonb_build_object('cargo_id',y.id,'monto_centavos',b,
    'saldo_esperado_centavos',b,'operation_id',item_op1)
 );
 -- La segunda asignación falla: la primera no puede quedar acreditada.
 begin
  perform public.goxion_b2_aprobar_comprobante(cid,r1,wrong,ap_op,'admin:test',false,'');
 exception when others then
  if sqlerrm ilike '%operation id reutilizado%' then reject_ok=true;
  else raise;end if;
 end;
 if not reject_ok then raise exception 'No rechazó segundo cargo desactualizado';end if;
 if (select count(*) from public.goxion_b2_abonos_aprobados where cliente_id=cid)<>0
  or (select estado from public.goxion_b2_comprobantes where id=r1)<>'reportado' then
  raise exception 'Fallo no revirtió la acreditación primera';end if;
 d=public.goxion_b2_aprobar_comprobante(cid,r1,j,ap_op,'admin:test',false,'');
 if d->>'ok'<>'true' or d->>'repetido'<>'false' then
  raise exception 'No aprobó los dos cargos %',d;end if;
 if (select count(*) from public.goxion_b2_comprobante_aplicaciones where reporte_id=r1)<>2
  or (select count(*) from public.goxion_b2_abonos_aprobados where cliente_id=cid)<>2
  or (select count(*) from public.pagos where cliente_id=cid and estado='pagado')<>1 then
  raise exception 'No concilió comprobante/cargos/recibo global único';end if;
 d=public.goxion_b2_aprobar_comprobante(cid,r1,j,ap_op,'admin:test',false,'');
 if d->>'repetido'<>'true' then raise exception 'Reintento duplicó acreditación';end if;
 -- La MISMA clave con otra distribución no es un reintento idéntico.
 reject_ok=false;
 begin
  perform public.goxion_b2_aprobar_comprobante(
   cid,r1,
   jsonb_build_array(
    jsonb_build_object('cargo_id',x.id,'monto_centavos',a,
      'saldo_esperado_centavos',a,'operation_id',item_op2),
    jsonb_build_object('cargo_id',y.id,'monto_centavos',b,
      'saldo_esperado_centavos',b,'operation_id',item_op1)
   ),
   ap_op,'admin:test',false,'');
 exception when others then
  if sqlerrm like 'COMPROBANTE_IDEMPOTENCIA_INCOMPATIBLE%' then reject_ok=true;
  else raise;end if;
 end;
 if not reject_ok then raise exception 'La misma clave alteró el destino de un recibo';end if;
 reject_ok=false;
 begin
  perform public.goxion_b2_aprobar_comprobante(cid,r1,j,gen_random_uuid(),'admin:test',false,'');
 exception when others then
  if sqlerrm like 'COMPROBANTE_IDEMPOTENCIA_INCOMPATIBLE%' then reject_ok=true;
  else raise;end if;
 end;
 if not reject_ok then raise exception 'Otro operation_id permitió segundo cobro';end if;
END $test$;
select 'B2_COMPROBANTE_ATOMICO_PASS_SIN_COMMIT' resultado;
ROLLBACK;