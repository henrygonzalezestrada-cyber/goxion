-- GOXION B2: libro real, parcial y mora por plataforma.
-- Prueba interna de RPC (NO habilita pago directo en Admin).
-- Fecha local actual, no fecha hardcodeada; BEGIN / ROLLBACK.
BEGIN;
DO $fixture$
DECLARE
 cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;cy uuid;
 x record;y record; a int;b int; d jsonb;quote jsonb;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_periodo date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 k1 uuid:=gen_random_uuid();k2 uuid:=gen_random_uuid(); kpar uuid:=gen_random_uuid();
 v_rechazo boolean:=false;
BEGIN
 if extract(day from v_hoy) not between 3 and 25
  then raise exception 'Fixture requiere vencimientos dentro del mismo mes';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'B2'||substr(cid::text,1,8),'B2'||substr(cid::text,10,4),
 'B2 LIBRO PARCIAL ROLLBACK',extract(day from v_hoy)::int,'pendiente',v_periodo,0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Plataforma A',49,true),(cid,sid2,'Plataforma B',45,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,
 cliente_id,cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select ac.id,ac.cliente_servicio_id,cid,
 case when row_number()over(order by ac.id)=1 then v_hoy-1 else v_hoy+1 end,
 case when row_number()over(order by ac.id)=1 then extract(day from v_hoy-1)::int else extract(day from v_hoy+1)::int end,
 round(s.monto*100)::int,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos ac join public.cliente_servicios s on s.id=ac.cliente_servicio_id
 where ac.cliente_id=cid and ac.activo;
 d=public.goxion_b2_activar_cliente(cid,v_periodo,true,'admin:fixture');
 if d->>'regimen_activo'<>'true' then raise exception 'Régimen no activado';end if;
 cy=(d->>'ciclo_id')::uuid;
 d=public.goxion_b2_iniciar_ciclo(cid,v_periodo);
 if d->>'repetida'<>'true' then raise exception 'Ciclo se duplicó';end if;
 select * into x from public.goxion_b2_cargos where ciclo_id=cy order by fecha_vencimiento asc limit 1;
 select * into y from public.goxion_b2_cargos where ciclo_id=cy order by fecha_vencimiento desc limit 1;
 quote=public.goxion_b2_cotizar_ciclo(cid,v_periodo,v_hoy);
 select (j->>'total_centavos')::int into a from jsonb_array_elements(quote->'cargos') j where j->>'cargo_id'=x.id::text;
 select (j->>'total_centavos')::int into b from jsonb_array_elements(quote->'cargos') j where j->>'cargo_id'=y.id::text;
 if a is null or b is null then raise exception 'Cotizador no devolvió cargos';end if;
 if a<>x.base_centavos+round(x.base_centavos*.05)::int or b<>y.base_centavos then
  raise exception 'Mora individual errónea: primero %, segundo %',a,b;end if;
 begin
  insert into public.pagos(cliente_id,periodo,monto,estado,notas,fecha)
  values(cid,to_char(v_periodo,'YYYY-MM'),94,'pagado','Pago global no autorizado',v_hoy);
 exception when others then
  if sqlerrm like 'CLIENTE_MULTIFECHA:%' then v_rechazo=true;
  else raise;end if;end;
 if not v_rechazo then raise exception 'Pago global B2 no protegido';end if;
 d=public.goxion_b2_aprobar_abono(cid,x.id,1000,a,kpar,'abono interno de prueba');
 if d->>'principal_aplicado_centavos'<>'1000'
  or d->>'mora_aplicada_centavos'<>'0'
  or (d->>'saldo_restante_centavos')::int<>a-1000 then
   raise exception 'Abono cambió la mora o el principal %',d;end if;
 d=public.goxion_b2_aprobar_abono(cid,x.id,a-1000,a-1000,k1,'segunda parte interna');
 if d->>'ok'<>'true' or d->>'ciclo_liquidado'<>'false' then
  raise exception 'Cierre prematuro %',d;end if;
 d=public.goxion_b2_aprobar_abono(cid,y.id,b,b,k2,'segundo acceso interno');
 if d->>'ok'<>'true' or d->>'ciclo_liquidado'<>'true' then
  raise exception 'Ciclo no cerró %',d;end if;
 if (select count(*) from public.pagos where cliente_id=cid and estado='pagado')<>1
  or (select count(*) from public.goxion_b2_abonos_aprobados where cliente_id=cid)<>3
 then raise exception 'Recibo consolidado o libro de abonos incorrecto';end if;
 if (select pagos_puntuales from public.clientes where id=cid)<>0
 then raise exception 'Impuntualidad no reinició la racha';end if;
 if not exists(select 1 from public.goxion_b2_ciclos where cliente_id=cid
    and periodo=(v_periodo+interval '1 month')::date)
 then raise exception 'No creó el siguiente ciclo';end if;
 d=public.goxion_b2_aprobar_abono(cid,x.id,a-1000,a-1000,k1,'segunda parte interna');
 if d->>'repetida'<>'true' then raise exception 'Reintento no idempotente';end if;
END $fixture$;
SELECT 'B2_LIBRO_REAL_PARCIAL_ACTUALIZADO_PASS_ROLLBACK' AS resultado;
ROLLBACK;