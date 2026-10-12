-- GOXION B2 · Diagnóstico de preparación por vencimiento, SOLO LECTURA.
-- Nunca crea deuda, pagos, calendarios ni imputaciones. No habilita Index.
-- Cliente heredado/sin fechas verificadas conserva cobro global.
create or replace function public.goxion_diagnostico_b2_sombra(
 p_cliente_id uuid, p_periodo date default null
) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare
 v_cliente record; v_estado jsonb; v_periodo date;
 v_servicios integer:=0;v_accesos integer:=0;v_contratos_con_accesos integer:=0;
 v_verificados integer:=0;v_fechas integer:=0;
 v_calendarios integer:=0;v_precio_accesos bigint:=0;v_precio_contratos bigint:=0;
 v_subtotal bigint;v_total bigint;v_descuentos bigint;v_cargos bigint;
 v_propuestas integer:=0;v_abonos integer:=0;v_obligaciones integer:=0;
 v_motivos text[]:=array[]::text[];
 v_oficial date;v_ajustes jsonb:='{}'::jsonb;
begin
 if p_cliente_id is null then raise exception 'Cliente requerido';end if;
 if p_periodo is not null and
    p_periodo is distinct from date_trunc('month',p_periodo)::date then
   raise exception 'El período debe comenzar el primer día del mes';
 end if;
 select id,estado,periodo_pendiente into v_cliente
 from public.clientes where id=p_cliente_id;
 if not found then raise exception 'Cliente inexistente';end if;
 v_periodo=coalesce(p_periodo,v_cliente.periodo_pendiente);
 if v_periodo is null then raise exception 'Período no verificable';end if;
 if v_cliente.estado='suspendido' then
   v_motivos=array_append(v_motivos,'cliente_suspendido');
 end if;

 select count(*),coalesce(round(sum(monto)*100),0)::bigint
 into v_servicios,v_precio_contratos
 from public.cliente_servicios where cliente_id=p_cliente_id and activo;
 if v_servicios=0 then
   v_motivos=array_append(v_motivos,'sin_servicios_activos');
 end if;

 -- Cada acceso activo debe corresponder a una contratación activa,
 -- y tener un único calendario válido, verificado en el mismo ciclo.
 select count(*),count(distinct a.cliente_servicio_id),
 count(cal.cliente_acceso_id),
 count(*) filter (where cal.estado='verificado' and cal.revision>0
   and cal.cobertura_hasta>=v_periodo
   and cal.cobertura_hasta<(v_periodo+interval '1 month')::date
   and cal.precio_centavos>0),
 count(distinct cal.cobertura_hasta) filter (where cal.estado='verificado'),
 coalesce(sum(cal.precio_centavos),0)::bigint
 into v_accesos,v_contratos_con_accesos,v_calendarios,
      v_verificados,v_fechas,v_precio_accesos
 from public.cliente_accesos a
 join public.cliente_servicios cs
   on cs.id=a.cliente_servicio_id and cs.cliente_id=p_cliente_id and cs.activo
 left join public.goxion_calendario_accesos cal
   on cal.cliente_acceso_id=a.id and cal.cliente_id=p_cliente_id
 where a.cliente_id=p_cliente_id and a.activo;

 if v_accesos=0 or v_contratos_con_accesos<>v_servicios then
   v_motivos=array_append(v_motivos,'accesos_de_contrato_incompletos');
 end if;
 if v_accesos<>v_calendarios or v_accesos<>v_verificados then
   v_motivos=array_append(v_motivos,'calendarios_no_verificados_o_fuera_de_periodo');
 end if;
 if v_fechas<2 then
   v_motivos=array_append(v_motivos,'fecha_unica_conservar_cobro_global');
 end if;
 if v_precio_accesos<>v_precio_contratos then
   v_motivos=array_append(v_motivos,'precios_por_acceso_no_conciliados');
 end if;

 v_estado=public.goxion_estado_financiero(p_cliente_id);
 if v_estado is null or
    v_estado->>'fuente_financiera' is distinct from 'supabase:goxion_estado_financiero'
    or v_estado->'contrato_financiero'->>'modo' is distinct from 'oficial' then
   v_motivos=array_append(v_motivos,'motor_financiero_no_oficial');
 else
   begin
     v_oficial=date_trunc('month',(v_estado->>'periodo')::date)::date;
     v_subtotal=round((v_estado->>'subtotal')::numeric*100)::bigint;
     v_total=round((v_estado->>'total_actual')::numeric*100)::bigint;
     v_descuentos=round(coalesce((v_estado->'descuentos'->>'total')::numeric,0)*100)::bigint;
     v_cargos=round(coalesce((v_estado->'cargos'->>'total')::numeric,0)*100)::bigint;
     -- Sólo valores OFICIALES; no se distribuye ni calcula un nuevo beneficio.
     v_ajustes=jsonb_build_object(
       'promociones_centavos',round(coalesce((v_estado->'descuentos'->>'promociones')::numeric,0)*100)::bigint,
       'lealtad_centavos',round(coalesce((v_estado->'descuentos'->>'lealtad')::numeric,0)*100)::bigint,
       'especiales_centavos',round(coalesce((v_estado->'descuentos'->>'especiales')::numeric,0)*100)::bigint,
       'trato_justo_centavos',round(coalesce((v_estado->'descuentos'->>'trato_justo')::numeric,0)*100)::bigint,
       'programados_y_cupones_centavos',round(coalesce((v_estado->'descuentos'->>'programados')::numeric,0)*100)::bigint,
       'mora_centavos',round(coalesce((v_estado->'cargos'->>'mora')::numeric,0)*100)::bigint,
       'reactivacion_centavos',round(coalesce((v_estado->'cargos'->>'reactivacion')::numeric,0)*100)::bigint
     );
   exception when others then
     v_motivos=array_append(v_motivos,'importes_financieros_invalidos');
   end;
   if v_oficial is distinct from v_periodo then
     v_motivos=array_append(v_motivos,'periodo_global_desactualizado');
   end if;
   if v_subtotal is null or v_total is null
       or v_subtotal is distinct from v_precio_contratos then
     v_motivos=array_append(v_motivos,'subtotal_oficial_no_conciliado');
   end if;
   if v_descuentos>0 or v_cargos>0 then
     v_motivos=array_append(v_motivos,'beneficios_mora_o_reactivacion_sin_atribucion');
   end if;
   if coalesce((v_estado->>'esta_pagado_periodo')::boolean,false) then
     v_motivos=array_append(v_motivos,'periodo_ya_pagado');
   end if;
   if coalesce((v_estado->>'pago_en_revision')::boolean,false)
     or coalesce((v_estado->>'pago_incompleto')::boolean,false) then
     v_motivos=array_append(v_motivos,'pago_en_revision_o_parcial');
   end if;
   if v_total is not null and v_subtotal is not null
     and v_total is distinct from greatest(0,v_subtotal-coalesce(v_descuentos,0)+coalesce(v_cargos,0)) then
     v_motivos=array_append(v_motivos,'waterfall_financiero_inconsistente');
   end if;
 end if;

 select count(*) into v_obligaciones from public.goxion_obligaciones_sombra
 where cliente_id=p_cliente_id and ciclo_inicio=v_periodo;
 select count(*) into v_propuestas
 from public.goxion_imputaciones_sombra i
 join public.goxion_obligaciones_sombra o on o.id=i.obligacion_id
 where o.cliente_id=p_cliente_id and o.ciclo_inicio=v_periodo
  and i.estado in ('propuesta','imputada_sombra');
 select count(*) into v_abonos
 from public.goxion_abonos_sombra a
 join public.goxion_obligaciones_sombra o on o.id=a.obligacion_id
 where o.cliente_id=p_cliente_id and o.ciclo_inicio=v_periodo
  and a.estado in ('solicitado','en_revision');
 if v_obligaciones>0 or v_propuestas>0 or v_abonos>0 then
   v_motivos=array_append(v_motivos,'movimientos_b2_requieren_conciliacion');
 end if;
 return jsonb_build_object(
   'ok',true,'modo','diagnostico_b2_sombra',
   'cliente_id',p_cliente_id,'periodo',v_periodo,
   'aplicable_sombra',coalesce(array_length(v_motivos,1),0)=0,
   'cobrable',false,'acreditada_oficial',false,
   'razones',to_jsonb(v_motivos),
   'servicios_activos',v_servicios,'accesos_activos',v_accesos,
   'calendarios_verificados',v_verificados,
   'fechas_distintas',v_fechas,
   'base_contratos_centavos',v_precio_contratos,
   'base_calendarios_centavos',v_precio_accesos,
   'subtotal_oficial_centavos',v_subtotal,
   'total_oficial_centavos',v_total,
   'beneficios_oficiales_centavos',v_descuentos,
   'cargos_oficiales_centavos',v_cargos,
   'ajustes_oficiales_sin_asignar',v_ajustes,
   'obligaciones_b2',v_obligaciones,'imputaciones_b2',v_propuestas,
   'solicitudes_b2',v_abonos
 );
end $$;
revoke all on function public.goxion_diagnostico_b2_sombra(uuid,date)
 from public,anon,authenticated;
grant execute on function public.goxion_diagnostico_b2_sombra(uuid,date)
 to service_role;
