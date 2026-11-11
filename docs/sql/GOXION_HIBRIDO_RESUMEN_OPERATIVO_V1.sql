-- GOXION · contrato unificado de consulta para saldos y contrataciones
-- Etapa preparatoria: únicamente lectura; NO modifica pagos, servicios ni ciclos.
-- Uso exclusivo de backend autorizado (service_role); no habilitar UI/cobro todavía.
-- La fuente de SALDO es goxion_hibrido_estado_financiero_v1, nunca la suma de servicios.

create or replace function public.goxion_hibrido_resumen_operativo_v1(
  p_cliente_id uuid,
  p_hoy date default (now() at time zone 'America/Mexico_City')::date
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $goxion$
declare
  v_fin jsonb;
  v_plan jsonb;
  v_servicios jsonb := '[]'::jsonb;
  v_lista_vigentes jsonb := '[]'::jsonb;
  v_lista_historica jsonb := '[]'::jsonb;
  v_vigentes int := 0;
  v_cancelados int := 0;
  v_cancelaciones_efectivas int := 0;
  v_anomalias int := 0;
  v_accesos_activos int := 0;
  v_monto bigint;
begin
  if p_cliente_id is null or p_hoy is null then
    raise exception 'RESUMEN_CLIENTE_FECHA_REQUERIDOS';
  end if;
  if not exists(select 1 from public.clientes where id=p_cliente_id) then
    return jsonb_build_object('ok',false,'codigo','CLIENTE_NO_ENCONTRADO',
      'cobrable',false,'publicable',false,'requiere_revision',true);
  end if;

  v_plan := public.goxion_hibrido_plan_transicion_v1(p_cliente_id,p_hoy);
  v_fin := public.goxion_hibrido_estado_financiero_v1(p_cliente_id,p_hoy);

  -- El estado del contrato proviene exclusivamente de la vigencia persistida.
  -- Una solicitud "aprobada" todavía NO equivale a una cancelación "efectiva".
  -- Los servicios cancelados permanecen en el historial con sus cargos B2.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'contratacion_id',s.id,
      'servicio_id',s.servicio_id,
      'nombre',s.nombre,
      'estado',case when s.activo then 'vigente' else 'historico' end,
      'activo',s.activo,
      'accesos_activos',(select count(*) from public.cliente_accesos a
        where a.cliente_servicio_id=s.id and a.activo),
      'cancelacion_efectiva',exists(
        select 1 from public.solicitudes_cancelacion x
        where x.cliente_servicio_id=s.id and x.cliente_id=p_cliente_id
          and x.estado='efectiva'
          and x.fecha_efectiva<=p_hoy
      ),
      'cargos_b2_totales',(select count(*) from public.goxion_b2_cargos b
        where b.cliente_servicio_id=s.id),
      'cargos_b2_pendientes',(select count(*) from public.goxion_b2_cargos b
        where b.cliente_servicio_id=s.id and not b.liquidado)
    ) order by s.id),'[]'::jsonb),
    count(*) filter (where s.activo)::int,
    count(*) filter (where not s.activo)::int,
    count(*) filter (where exists(
      select 1 from public.solicitudes_cancelacion x
        where x.cliente_servicio_id=s.id and x.cliente_id=p_cliente_id
          and x.estado='efectiva' and x.fecha_efectiva<=p_hoy
    ))::int,
    count(*) filter (where (not s.activo and exists(
      select 1 from public.cliente_accesos a
      where a.cliente_servicio_id=s.id and a.activo
    )) or (s.activo and exists(
      select 1 from public.solicitudes_cancelacion x
      where x.cliente_servicio_id=s.id and x.cliente_id=p_cliente_id
        and x.estado='efectiva' and x.fecha_efectiva<=p_hoy
    )))::int
  into v_servicios,v_vigentes,v_cancelados,v_cancelaciones_efectivas,v_anomalias
  from public.cliente_servicios s where s.cliente_id=p_cliente_id;

  -- Dos colecciones listas para Admin, sin reutilizar servicios cancelados
  -- en operaciones sobre contrataciones vigentes.
  select coalesce(jsonb_agg(j.value) filter(where j.value->>'estado'='vigente'),'[]'::jsonb),
         coalesce(jsonb_agg(j.value) filter(where j.value->>'estado'='historico'),'[]'::jsonb)
  into v_lista_vigentes,v_lista_historica
  from jsonb_array_elements(v_servicios) as j;

  select count(*)::int into v_accesos_activos
  from public.cliente_accesos a
  join public.cliente_servicios s on s.id=a.cliente_servicio_id
    and s.cliente_id=p_cliente_id and s.activo
  where a.cliente_id=p_cliente_id and a.activo;

  -- Si una cotización no concilia, NO devolver importe legado de respaldo.
  v_monto := case when v_fin->>'ok'='true' and
      v_fin->>'total_pendiente_centavos' is not null
    then (v_fin->>'total_pendiente_centavos')::bigint
    else null::bigint end;
  return jsonb_build_object(
    'ok',v_monto is not null and v_anomalias=0,
    'codigo',case when v_anomalias>0 then 'CONTRATOS_REQUIEREN_CONCILIACION'
      when v_monto is null then 'FINANZAS_REQUIEREN_CONCILIACION'
      else 'RESUMEN_CONCILIADO' end,
    'version','hibrido-resumen-v1',
    'cliente_id',p_cliente_id,
    'fecha_consulta',p_hoy,
    'fuente_saldo',v_fin->>'fuente_saldo',
    'modo_actual',v_plan->>'modo_deducido',
    'total_pendiente_centavos',v_monto,
    'servicios_vigentes',v_vigentes,
    'servicios_historicos',v_cancelados,
    'cancelaciones_efectivas',v_cancelaciones_efectivas,
    'accesos_vigentes',v_accesos_activos,
    'inconsistencias_contratacion',v_anomalias,
    'contrataciones',v_servicios,
    'contrataciones_vigentes',v_lista_vigentes,
    'contrataciones_historicas',v_lista_historica,
    'plan_transicion',v_plan,
    'requiere_revision',v_anomalias>0
      or coalesce((v_fin->>'requiere_revision')::boolean,true)
      or coalesce((v_plan->>'requiere_revision')::boolean,true),
    'cobrable',false,'publicable',false
  );
end $goxion$;

revoke all on function public.goxion_hibrido_resumen_operativo_v1(uuid,date)
  from public,anon,authenticated;
grant execute on function public.goxion_hibrido_resumen_operativo_v1(uuid,date)
  to service_role;

comment on function public.goxion_hibrido_resumen_operativo_v1(uuid,date)
is 'Resumen seguro de lectura. Cuenta vigente vs cancelada, un saldo oficial por período; no cobrable ni expuesto al frontend.';
