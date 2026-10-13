-- B2, escenario sin atraso y con lealtad nivel 2, reversible.
-- Cada acceso ViX tiene descuento de 6% y sólo UNA racha global.
BEGIN;
DO $test$
DECLARE cid uuid:=gen_random_uuid(); sid uuid; cyc uuid;rowc record;
 d jsonb; a int; nro int:=0; solicitud uuid; cargo_primero uuid; op uuid:=gen_random_uuid(); rechazo boolean:=false;
BEGIN
 select id into sid from public.servicios where nombre ilike '%vix%' limit 1;
 if sid is null then raise exception 'Falta plataforma para fixture';end if;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'B2'||substr(cid::text,1,8),'B2'||substr(cid::text,10,4),
  'B2 6PCT ROLLBACK',6,'pagado','2026-11-01',10);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Vix Premium (x2)',98,true);
 -- La infraestructura crea normalmente un acceso heredado; la segunda
 -- unidad de X2 se asigna explícitamente por Admin en el fixture.
 if (select count(*) from public.cliente_accesos where cliente_id=cid and activo)=1 then
  insert into public.cliente_accesos(cliente_servicio_id,cliente_id,servicio_id,ordinal,activo)
  select s.id,s.cliente_id,s.servicio_id,2,true from public.cliente_servicios s
  where s.cliente_id=cid and s.activo;
 end if;
 if (select count(*) from public.cliente_accesos where cliente_id=cid and activo)<>2 then
  raise exception 'La prueba requiere dos accesos reales';end if;
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,cliente_id,
 cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select a.id,a.cliente_servicio_id,cid,
  case when a.ordinal=1 then '2026-11-06'::date else '2026-11-30'::date end,
  case when a.ordinal=1 then 6 else 30 end,
  4900,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos a where a.cliente_id=cid and a.activo;
 d=public.goxion_b2_activar_cliente(cid,'2026-11-01',true,'admin:fixture');
 if d->>'porcentaje_lealtad'<>'6' then
    raise exception 'No respetó nivel 2 del cliente: %',d;end if;
 cyc=(d->>'ciclo_id')::uuid;
 select id into cargo_primero from public.goxion_b2_cargos
 where ciclo_id=cyc order by fecha_vencimiento limit 1;
 -- Una petición hasta cinco días; la solicitud NO otorga protección.
 d=public.goxion_b2_solicitar_prorroga(cid,cargo_primero,'2026-11-11',op,'Diferir cinco días');
 if d->>'estado'<>'solicitada' then raise exception 'La petición no quedó pendiente';end if;
 solicitud=(d->>'solicitud_id')::uuid;
 d=public.goxion_b2_solicitar_prorroga(cid,cargo_primero,'2026-11-11',op,'Diferir cinco días');
 if d->>'repetida'<>'true' then raise exception 'Solicitud duplicada';end if;
 begin
  perform public.goxion_b2_solicitar_prorroga(cid,cargo_primero,
    '2026-11-12',gen_random_uuid(),'Diferir más de cinco días');
 exception when others then rechazo=true;end;
 if not rechazo then raise exception 'Aceptó más de cinco días';end if;
 rechazo=false;
 begin
  perform public.goxion_b2_solicitar_prorroga(cid,cargo_primero,
    '2026-11-10',gen_random_uuid(),'Otra prórroga del mismo período');
 exception when others then rechazo=true;end;
 if not rechazo then raise exception 'Permitió segunda petición en mismo ciclo';end if;
 -- Sin revisión administrativa no existe gracia.
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-11-01','2026-11-07');
 if d->>'lealtad_global_perdida'<>'true' then
   raise exception 'Petición sola dio beneficio sin Admin';end if;
 d=public.goxion_b2_resolver_prorroga(cid,solicitud,true,'admin:fixture');
 if d->>'estado'<>'aprobada' then raise exception 'Admin no pudo aprobar';end if;
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-11-01','2026-11-07');
 if (d->>'total_pendiente_centavos')::int<>9212 or
    d->>'lealtad_global_perdida'<>'false' then
   raise exception 'Prórroga aprobada no conservó lealtad: %',d;end if;
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-11-01','2026-11-11');
 if (d->>'total_pendiente_centavos')::int<>9212 then
   raise exception 'Último día de prórroga cobró mora: %',d;end if;
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-11-01','2026-11-12');
 if (d->>'total_pendiente_centavos')::int<>11270
  or d->>'lealtad_global_perdida'<>'true' then
  raise exception 'Al día siguiente no liquidó retroactivo/lealtad: %',d;end if;
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-11-01','2026-11-05');
 if (d->>'total_pendiente_centavos')::integer<>9212 then
   raise exception 'Dos cargos de 4606 esperados, llegó %',d;end if;
 for rowc in select * from public.goxion_b2_cargos
   where ciclo_id=cyc order by fecha_vencimiento loop
  nro=nro+1;
  d=public.goxion_b2_aprobar_abono(cid,rowc.id,4606,4606,gen_random_uuid(),'pago B2 simulado');
  if d->>'ok'<>'true' then raise exception 'Aprobación fallo %',d;end if;
 end loop;
 if nro<>2 then raise exception 'Faltó un acceso';end if;
 if (select pagos_puntuales from public.clientes where id=cid)<>11 then
  raise exception 'La lealtad avanzó más de una vez o no avanzó';end if;
 if (select count(*) from public.pagos where cliente_id=cid and estado='pagado')<>1 then
  raise exception 'Debe existir un solo recibo global al cerrar';end if;
 if (select monto from public.pagos where cliente_id=cid and estado='pagado')<>92.12 then
  raise exception 'Importe global consolidado incorrecto';end if;
 if (select count(*) from public.goxion_b2_ciclos
   where cliente_id=cid and periodo='2026-12-01')<>1 then
  raise exception 'No creó el siguiente ciclo de forma automática';end if;
END $test$;
SELECT 'B2_PRORROGA_5_DIAS_CON_LEALTAD_Y_MORA_RETRO_PASS' AS resultado;
ROLLBACK;
