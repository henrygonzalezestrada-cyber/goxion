-- Ejecución MANUAL en entorno controlado, con la migración 202610120010 instalada.
-- No requiere datos reales. Todos los fixtures se revierten.
-- No se debe quitar BEGIN/ROLLBACK.
begin;
do $test$
declare
 v_cliente uuid := gen_random_uuid();
 v_op uuid := gen_random_uuid();
 v_monto numeric;v_uno jsonb;v_dos jsonb;v_error text;v_n integer;
begin
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(v_cliente,'B2'||substr(v_cliente::text,1,8),'B2'||substr(v_cliente::text,10,4),
 'Fixture reversión GOXION',15,'pendiente','2026-10-01',0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(v_cliente,null,'Servicio fixture',92,true);
 v_monto=(public.goxion_estado_financiero(v_cliente)->>'total_actual')::numeric;
 v_uno=public.goxion_aprobar_pago_periodo_atomico(v_cliente,'2026-10',v_monto,true,'Prueba',v_op);
 v_dos=public.goxion_aprobar_pago_periodo_atomico(v_cliente,'2026-10',v_monto,true,'Prueba',v_op);
 if v_uno->>'ok' is distinct from 'true' or v_dos->>'repetida' is distinct from 'true'
 then raise exception 'Aprobación o idempotencia fallida';end if;
 select count(*) into v_n from public.pagos where cliente_id=v_cliente and estado='pagado';
 if v_n<>1 then raise exception 'Duplicación de pago';end if;
 if (select periodo_pendiente from public.clientes where id=v_cliente) <> '2026-11-01'
 then raise exception 'Ciclo inconsistente';end if;
 begin
  perform public.goxion_aprobar_pago_periodo_atomico(v_cliente,'2026-10',v_monto,true,'Prueba',gen_random_uuid());
  raise exception 'Debería rechazar nueva aprobación del período';
 exception when others then
  get stacked diagnostics v_error=MESSAGE_TEXT;
  if v_error not like '%PERIODO_DESACTUALIZADO%' then
   raise exception 'Error inesperado al proteger el período: %',v_error;
  end if;
 end;
end $test$;

do $test$
declare
 v_cliente uuid := gen_random_uuid();v_op uuid:=gen_random_uuid();v_parcial uuid:=gen_random_uuid();
 v_monto numeric;v_error text;v_result jsonb;v_n integer;
begin
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(v_cliente,'B2'||substr(v_cliente::text,1,8),'B2'||substr(v_cliente::text,10,4),
 'Fixture abono GOXION',15,'pendiente','2026-10-01',3);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(v_cliente,null,'Servicio abono fixture',92,true);
 perform public.goxion_registrar_pago_parcial_atomico(v_cliente,'2026-10',4000,v_parcial,'Abono');
 insert into public.acuerdos_cobro(cliente_id,periodo,fecha_original,fecha_pactada,motivo,activo,estado)
 values(v_cliente,'2026-10-01','2026-10-15','2026-10-22','Prueba',true,'activo');
 v_monto=(public.goxion_estado_financiero(v_cliente)->>'total_actual')::numeric;
 begin
  perform public.goxion_aprobar_pago_periodo_atomico(v_cliente,'2026-10',v_monto+1,true,'Prueba',gen_random_uuid());
  raise exception 'Debería bloquear importe desactualizado';
 exception when others then
  get stacked diagnostics v_error=MESSAGE_TEXT;
  if v_error not like 'MONTO_DESACTUALIZADO:%' then
   raise exception 'Error de monto inesperado: %',v_error;
  end if;
 end;
 v_result=public.goxion_aprobar_pago_periodo_atomico(v_cliente,'2026-10',v_monto,true,'Prueba',v_op);
 if v_result->>'ok' is distinct from 'true' then raise exception 'No se liquidó';end if;
 select count(*) into v_n from public.pagos_parciales
 where cliente_id=v_cliente and estado='liquidado' and activo=false;
 if v_n<>1 then raise exception 'Parcial no liquidado';end if;
 select count(*) into v_n from public.acuerdos_cobro
 where cliente_id=v_cliente and estado='cumplido' and activo=false;
 if v_n<>1 then raise exception 'Acuerdo no cerrado';end if;
 if (select pagos_puntuales from public.clientes where id=v_cliente)<>4
 then raise exception 'Lealtad duplicada o sin avance';end if;
end $test$;
select 'PASS, fixtures temporales' as resultado;
rollback;
