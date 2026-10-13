-- GOXION · Pruebas del diagnóstico B2 (sin persistencia).
-- Ejecutar únicamente tras instalar temporalmente la migración 202610120011.
-- Todo el fixture se revierte; no se alteran pagos de clientes reales.
begin;
do $fixture$
declare v_id uuid:=gen_random_uuid();v_s1 uuid;v_s2 uuid;
 v_before jsonb;v_after jsonb;v_count integer;
begin
 select id into v_s1 from public.servicios where activo order by nombre limit 1;
 select id into v_s2 from public.servicios where activo and id<>v_s1 order by nombre limit 1;
 if v_s1 is null or v_s2 is null then raise exception 'Se necesitan dos plataformas de prueba';end if;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(v_id,'B2'||substr(v_id::text,1,8),'B2'||substr(v_id::text,10,4),
 'Fixture diagnóstico con reversión',15,'pendiente','2026-10-01',0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(v_id,v_s1,'Fixture S1',49,true),(v_id,v_s2,'Fixture S2',45,true);
 select count(*) into v_count from public.cliente_accesos where cliente_id=v_id and activo;
 if v_count<>2 then raise exception 'Fixture no logró dos accesos';end if;
 v_before=public.goxion_diagnostico_b2_sombra(v_id);
 if v_before->>'aplicable_sombra'<>'false' or
  not ((v_before->'razones') ? 'calendarios_no_verificados_o_fuera_de_periodo')
  then raise exception 'Se aceptó deuda sin calendario: %',v_before;end if;
 insert into public.goxion_calendario_accesos(
 cliente_acceso_id,cliente_servicio_id,cliente_id,cobertura_hasta,dia_corte,
 precio_centavos,estado,verificado_en,actualizado_por,revision)
 select a.id,a.cliente_servicio_id,v_id,
 case when row_number()over(order by a.id)=1 then '2026-10-05'::date else '2026-10-25'::date end,
 case when row_number()over(order by a.id)=1 then 5 else 25 end,
 round(cs.monto*100)::integer,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos a join public.cliente_servicios cs on cs.id=a.cliente_servicio_id
 where a.cliente_id=v_id and a.activo;
 v_after=public.goxion_diagnostico_b2_sombra(v_id);
 if v_after->>'aplicable_sombra'<>'true' or v_after->>'cobrable'<>'false'
  or (v_after->>'calendarios_verificados')::integer<>2
  or (v_after->>'fechas_distintas')::integer<>2 then
  raise exception 'Dos fechas verificadas no se conciliaron: %',v_after;
 end if;
 -- Igualar fechas debe preservar cobro heredado, aun si el precio cuadra.
 update public.goxion_calendario_accesos
 set cobertura_hasta='2026-10-05',dia_corte=5
 where cliente_id=v_id and cobertura_hasta='2026-10-25';
 v_after=public.goxion_diagnostico_b2_sombra(v_id);
 if v_after->>'aplicable_sombra'<>'false' or
   not ((v_after->'razones') ? 'fecha_unica_conservar_cobro_global') then
    raise exception 'Un solo vencimiento no preservó legacy: %',v_after;
 end if;
end $fixture$;
select 'B2 PRE-FLIGHT PASS (ROLLBACK)' as resultado;
rollback;
