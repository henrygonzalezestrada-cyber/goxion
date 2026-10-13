-- GOXION · Fechas heredadas, lote controlado 2026-10-12.
-- Una fecha global NO requiere deuda individual. Sembrar únicamente BORRADORES
-- para contratos de 1 acceso, a partir del día configurado y el período pendiente.
-- cobertura_hasta es FECHA PROPUESTA, no cobertura acreditada. confirmado=false.
-- No tocar a Nayeli, otros calendarios, suspendidos, combos o contratos X2.
-- No toca clientes, pagos, lealtad, estados financieros, descuentos ni mora.
-- Audita mediante el RPC de calendario existente; falla toda la transacción si
-- se altera cualquier importe oficial o se pierde alguna fecha ya verificada.
begin;
create temporary table pg_temp.goxion_lote_fechas_legadas on commit drop as
select cs.id as contrato_id,cs.cliente_id,a.id as acceso_id,
       make_date(extract(year from c.periodo_pendiente)::int,
         extract(month from c.periodo_pendiente)::int,
         least(c.dia_pago,
           extract(day from (date_trunc('month',c.periodo_pendiente)+
             interval '1 month - 1 day'))::int)) as fecha_propuesta,
       c.dia_pago as dia_corte,round(cs.monto*100)::integer as precio_centavos
from public.cliente_servicios cs
join public.clientes c on c.id=cs.cliente_id
join public.cliente_accesos a on a.cliente_servicio_id=cs.id
 and a.cliente_id=cs.cliente_id and a.activo
where cs.activo and c.estado<>'suspendido'
  and c.periodo_pendiente is not null
  and c.dia_pago between 1 and 31
  and cs.monto>=0 and cs.monto<=100000
  and cs.monto*100=round(cs.monto*100)
  and (select count(*) from public.cliente_accesos aa
       where aa.cliente_servicio_id=cs.id and aa.activo)=1
  and not exists(select 1 from public.goxion_calendario_accesos ca
    where ca.cliente_servicio_id=cs.id);
do $lote$
declare r record;v_before text;v_after text;v_n integer:=0;
 v_preservados integer;v_actual integer;v_resultado jsonb;
begin
 select md5(string_agg(c.id::text||':'||public.goxion_estado_financiero(c.id)::text,'|' order by c.id))
 into v_before from public.clientes c;
 select count(*) into v_preservados from public.goxion_calendario_accesos
 where estado='verificado';
 if v_preservados<>2 then
   raise exception 'Se aborta lote: número inesperado de fechas verificadas: %',v_preservados;
 end if;
 for r in select * from pg_temp.goxion_lote_fechas_legadas order by contrato_id loop
   v_resultado=public.goxion_guardar_calendario_contrato_borrador(
      r.contrato_id,
      jsonb_build_array(jsonb_build_object(
        'acceso_id',r.acceso_id,
        'cobertura_hasta',r.fecha_propuesta,
        'dia_corte',r.dia_corte,
        'precio_centavos',r.precio_centavos,
        'confirmado',false
      )),
      'admin:migracion_borrador_legado_20261012'
   );
   if v_resultado->>'ok'<>'true' or
      (v_resultado->>'accesos_guardados')::integer<>1 then
       raise exception 'Error al guardar borrador %: %',r.contrato_id,v_resultado;
   end if;
   v_n=v_n+1;
 end loop;
 if v_n<>(select count(*) from pg_temp.goxion_lote_fechas_legadas) then
   raise exception 'Lote incompleto';
 end if;
 select count(*) into v_actual from public.goxion_calendario_accesos
 where estado='verificado';
 if v_actual<>v_preservados then
   raise exception 'El lote alteró calendarios verificados';
 end if;
 if exists(select 1 from pg_temp.goxion_lote_fechas_legadas l
  join public.goxion_calendario_accesos ca on ca.cliente_acceso_id=l.acceso_id
  where ca.estado<>'borrador' or ca.verificado_en is not null
    or ca.cobertura_hasta<>l.fecha_propuesta
    or ca.dia_corte<>l.dia_corte
    or ca.precio_centavos<>l.precio_centavos) then
    raise exception 'Lote produjo una fecha o precio inesperado';
 end if;
 select md5(string_agg(c.id::text||':'||public.goxion_estado_financiero(c.id)::text,'|' order by c.id))
 into v_after from public.clientes c;
 if v_before is distinct from v_after then
   raise exception 'Estado financiero cambió: ROLLBACK de todo el lote';
 end if;
end $lote$;
select count(*) as borradores_nuevos,
count(distinct cliente_id) as clientes_con_borradores,
(select count(*) from public.goxion_calendario_accesos where estado='verificado') as verificados_preservados
from pg_temp.goxion_lote_fechas_legadas;
commit;
