-- GOXION B2: piloto transaccional de DOS VENCIMIENTOS, todo ficticio.
-- No son pagos reales: las imputaciones permanecen en SOMBRA y se revierte TODO.
BEGIN;
DO $fixture$
declare v_id uuid:=gen_random_uuid();v_s1 uuid;v_s2 uuid;v_pago uuid;
 v_r jsonb;v_ob record;v_imputacion uuid;v_key uuid;
 v_total bigint:=0;v_n int:=0;v_saldo bigint;v_error text;
begin
 select id into v_s1 from public.servicios where activo order by nombre limit 1;
 select id into v_s2 from public.servicios where activo and id<>v_s1 order by nombre limit 1;
 if v_s1 is null or v_s2 is null then raise exception 'Requiere dos servicios de prueba';end if;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(v_id,'B2'||substr(v_id::text,1,8),'B2'||substr(v_id::text,10,4),
 'B2 E2E TEST ROLLBACK',15,'pendiente','2026-10-01',0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(v_id,v_s1,'B2 servicio 1',49,true),(v_id,v_s2,'B2 servicio 2',45,true);
 insert into public.goxion_calendario_accesos(
 cliente_acceso_id,cliente_servicio_id,cliente_id,cobertura_hasta,dia_corte,
 precio_centavos,estado,verificado_en,actualizado_por,revision)
 select a.id,a.cliente_servicio_id,v_id,
  case when row_number()over(order by a.id)=1 then '2026-10-05'::date else '2026-10-25'::date end,
  case when row_number()over(order by a.id)=1 then 5 else 25 end,
  round(cs.monto*100)::integer,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos a
 join public.cliente_servicios cs on cs.id=a.cliente_servicio_id
 where a.cliente_id=v_id and a.activo;
 v_r=public.goxion_preparar_obligaciones_calendario_sombra(v_id,'2026-10-01',false);
 if v_r->>'aplicable'<>'true' or (v_r->>'nuevas_obligaciones')::integer<>2 then
 raise exception 'No materializó dos obligaciones sombra: %',v_r;end if;

 -- Comprobante ficticio aprobado en la misma transacción reversible.
 insert into public.pagos(cliente_id,periodo,monto,estado,notas,fecha)
 values(v_id,'octubre de 2026',94,'pagado','E2E B2 fixture',current_date)
 returning id into v_pago;

 for v_ob in select * from public.goxion_obligaciones_sombra
   where cliente_id=v_id order by fecha_vencimiento loop
   v_key=gen_random_uuid();
   v_r=public.goxion_preparar_imputacion_sombra(v_ob.id,v_pago,v_ob.total_estimado_centavos,v_key);
   v_imputacion=(v_r->>'imputacion_id')::uuid;
   if v_imputacion is null then raise exception 'Imputación no preparada';end if;
   v_r=public.goxion_preparar_imputacion_sombra(v_ob.id,v_pago,v_ob.total_estimado_centavos,v_key);
   if v_r->>'repetida'<>'true' or (v_r->>'imputacion_id')::uuid<>v_imputacion then
     raise exception 'Preparación no idempotente: %',v_r;
   end if;
   v_key=gen_random_uuid();
   v_r=public.goxion_confirmar_imputacion_sombra(v_imputacion,v_key);
   if v_r->>'acreditada_oficial'<>'false' or v_r->>'ok'<>'true' then
     raise exception 'Confirmación sombra acreditó oficial indebidamente: %',v_r;end if;
   v_r=public.goxion_confirmar_imputacion_sombra(v_imputacion,v_key);
   if v_r->>'repetida'<>'true' then raise exception 'Confirmación no idempotente: %',v_r;end if;
   v_saldo=(public.goxion_resumen_imputacion_sombra(v_ob.id)->>'saldo_proyectado_centavos')::bigint;
   if v_saldo<>0 then raise exception 'Saldo sombra residual %',v_saldo;end if;
   v_total=v_total+v_ob.total_estimado_centavos;
 end loop;
 if v_total<>9400 then raise exception 'Total sombra % distinto de 9400',v_total;end if;
 -- Intentar atribuir un centavo adicional a un comprobante ya repartido.
 select * into v_ob from public.goxion_obligaciones_sombra
 where cliente_id=v_id order by fecha_vencimiento limit 1;
 begin
  perform public.goxion_preparar_imputacion_sombra(v_ob.id,v_pago,1,gen_random_uuid());
  raise exception 'ERROR: permitió sobreatribución de pago';
 exception when others then
  get stacked diagnostics v_error=MESSAGE_TEXT;
  if v_error not like '%Imputación%' and v_error not like '%imputación%' then
    raise exception 'Error inesperado al probar sobreimputación: %',v_error;end if;
 end;
 select count(*) into v_n from public.goxion_imputaciones_sombra i
 join public.goxion_obligaciones_sombra o on o.id=i.obligacion_id
 where o.cliente_id=v_id and i.estado='imputada_sombra';
 if v_n<>2 then raise exception 'No quedaron exactamente dos imputaciones confirmadas';end if;
end $fixture$;
SELECT 'B2 E2E SOMBRA PASS (todos los datos revertidos)' AS resultado;
ROLLBACK;
