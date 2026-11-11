-- GOXION · Núcleo de lectura híbrida V1 (etapa protegida).
-- NO cambia pagos, regímenes, cargos, ciclos, RLS ni funciones oficiales.
-- NO es un endpoint de cobro: todas las respuestas llevan cobrable=false.
-- Ejecutar primero en proyecto aislado B2. No conectar a Index/Admin/Ayuda hasta validar.
--
-- Idea central: una cuenta sólo tiene UNA fuente de saldo por ciclo.
-- Si existe ciclo/régimen B2, jamás consultar como alternativa el total global.
-- Para clientes aún no migrados, el estado global actual es el origen histórico
-- transitorio. Migración completa a obligaciones unificadas en fase posterior.
create or replace function public.goxion_hibrido_estado_financiero_v1(
  p_cliente_id uuid,
  p_hoy date default (now() at time zone 'America/Merida')::date
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $goxion$
declare
  v_cliente record;
  v_periodo date;
  v_activos integer := 0;
  v_calendarios_validos integer := 0;
  v_fechas integer := 0;
  v_regimen_activo boolean := false;
  v_ciclo_existe boolean := false;
  v_modo text;
  v_estado jsonb;
  v_cargos jsonb;
  v_total bigint;
  v_sumado bigint;
  v_cantidad integer;
  v_modo_contable text;
begin
  if p_cliente_id is null or p_hoy is null then
    raise exception 'Cliente y fecha son obligatorios';
  end if;

  select c.id,c.estado,c.periodo_pendiente
    into v_cliente
  from public.clientes c where c.id=p_cliente_id;
  if not found then
    return jsonb_build_object('ok',false,'codigo','CLIENTE_NO_ENCONTRADO',
      'cobrable',false,'requiere_revision',true,'version','hibrido-lectura-v1');
  end if;
  v_periodo := v_cliente.periodo_pendiente;
  if v_periodo is null
    or v_periodo<>date_trunc('month',v_periodo)::date then
    return jsonb_build_object('ok',false,'codigo','PERIODO_NO_CONCILIADO',
      'cobrable',false,'requiere_revision',true,'version','hibrido-lectura-v1');
  end if;

  -- Derivar modo operativo de obligaciones potenciales, no del flag B2.
  -- Contar únicamente accesos vigentes y fechas del mes verificadas.
  select count(distinct a.id)::integer,
         count(distinct a.id) filter (
           where cal.estado='verificado'
             and cal.revision>0 and cal.precio_centavos>0
             and cal.cobertura_hasta>=v_periodo
             and cal.cobertura_hasta<(v_periodo+interval '1 month')::date
         )::integer,
         count(distinct cal.cobertura_hasta) filter (
           where cal.estado='verificado'
             and cal.revision>0 and cal.precio_centavos>0
             and cal.cobertura_hasta>=v_periodo
             and cal.cobertura_hasta<(v_periodo+interval '1 month')::date
         )::integer
  into v_activos,v_calendarios_validos,v_fechas
  from public.cliente_accesos a
  join public.cliente_servicios s
    on s.id=a.cliente_servicio_id and s.activo and s.cliente_id=p_cliente_id
  left join public.goxion_calendario_accesos cal
    on cal.cliente_acceso_id=a.id
  where a.cliente_id=p_cliente_id and a.activo;

  v_modo := case
    when v_activos=0 then 'sin_accesos'
    when v_activos<>v_calendarios_validos then 'calendario_pendiente'
    when v_fechas>=2 then 'multifecha'
    else 'fecha_unica' end;

  select coalesce(r.activo,false) into v_regimen_activo
    from public.goxion_b2_regimen_cliente r
   where r.cliente_id=p_cliente_id;
  v_regimen_activo := coalesce(v_regimen_activo,false);

  select exists (
    select 1 from public.goxion_b2_ciclos c
     where c.cliente_id=p_cliente_id and c.periodo=v_periodo
  ) into v_ciclo_existe;

  -- El historial B2 manda incluso si el calendario actual ha cambiado.
  -- Nunca convertir un ciclo ya materializado en una nueva deuda global.
  if v_regimen_activo or v_ciclo_existe then
    if not v_regimen_activo or not v_ciclo_existe then
      return jsonb_build_object('ok',false,
        'codigo',case when v_ciclo_existe then 'REGIMEN_B2_INACTIVO_CON_CICLO'
                      else 'CICLO_B2_NO_PREPARADO' end,
        'periodo',v_periodo,'modo_actual',v_modo,
        'fechas_distintas',v_fechas,'accesos_activos',v_activos,
        'fuente_saldo','obligaciones_b2',
        'cobrable',false,'requiere_revision',true,
        'version','hibrido-lectura-v1');
    end if;

    v_estado := public.goxion_b2_cotizar_ciclo(p_cliente_id,v_periodo,p_hoy);
    if coalesce(v_estado->>'ok','false')<>'true'
       or jsonb_typeof(v_estado->'cargos') is distinct from 'array' then
      return jsonb_build_object('ok',false,
        'codigo','COTIZACION_B2_NO_CONCILIADA','periodo',v_periodo,
        'modo_actual',v_modo,'fuente_saldo','obligaciones_b2',
        'cobrable',false,'requiere_revision',true,
        'version','hibrido-lectura-v1');
    end if;

    v_cargos := v_estado->'cargos';
    select count(*)::integer,coalesce(sum((x.value->>'total_centavos')::bigint),0)
      into v_cantidad,v_sumado
    from jsonb_array_elements(v_cargos) x;
    v_total := (v_estado->>'total_pendiente_centavos')::bigint;
    if v_cantidad=0 or v_sumado is distinct from v_total
      or v_total<0 or exists(
        select 1 from jsonb_array_elements(v_cargos) x
        where (x.value->>'total_centavos')::bigint<0
           or x.value->>'cargo_id' is null
      ) then
      return jsonb_build_object('ok',false,'codigo','CARGOS_B2_NO_CONCILIADOS',
        'periodo',v_periodo,'cobrable',false,'requiere_revision',true,
        'version','hibrido-lectura-v1');
    end if;

    return jsonb_build_object('ok',true,
      'codigo','LECTURA_B2_CONCILIADA','version','hibrido-lectura-v1',
      'cliente_id',p_cliente_id,'periodo',v_periodo,'fecha_consulta',p_hoy,
      'modo_actual',v_modo,'regimen_contable','obligaciones_b2',
      'fechas_distintas',v_fechas,'accesos_activos',v_activos,
      'calendarios_verificados',v_calendarios_validos,
      'transicion_pendiente',v_modo<>'multifecha',
      'requiere_revision',v_modo='calendario_pendiente' or v_modo='sin_accesos',
      'fuente_saldo','obligaciones_b2',
      'total_pendiente_centavos',v_total,
      'total_actual',round(v_total::numeric/100,2),
      'obligaciones',v_cargos,
      'cobrable',false);
  end if;

  -- Cuenta aún no migrada: un único saldo global HEREDADO.
  -- No calcula un importe nuevo a partir de los calendarios.
  v_estado := public.goxion_estado_financiero(p_cliente_id,p_hoy);
  if v_estado is null
    or v_estado->>'fuente_financiera'<>'supabase:goxion_estado_financiero'
    or v_estado->'contrato_financiero'->>'modo'<>'oficial'
    or v_estado->>'total_actual' is null then
    return jsonb_build_object('ok',false,'codigo','LEGACY_NO_CONCILIADO',
      'periodo',v_periodo,'modo_actual',v_modo,'cobrable',false,
      'requiere_revision',true,'version','hibrido-lectura-v1');
  end if;
  v_total := round((v_estado->>'total_actual')::numeric*100)::bigint;
  if v_total<0 then
    return jsonb_build_object('ok',false,'codigo','SALDO_GLOBAL_INVALIDO',
      'cobrable',false,'requiere_revision',true,'version','hibrido-lectura-v1');
  end if;
  return jsonb_build_object('ok',true,'codigo','LECTURA_LEGACY_CONCILIADA',
    'version','hibrido-lectura-v1','cliente_id',p_cliente_id,
    'periodo',v_periodo,'fecha_consulta',p_hoy,'modo_actual',v_modo,
    'regimen_contable','global_legacy','fuente_saldo','global_legacy',
    'fechas_distintas',v_fechas,'accesos_activos',v_activos,
    'calendarios_verificados',v_calendarios_validos,
    'transicion_pendiente',v_modo='multifecha',
    'requiere_revision',v_modo='multifecha',
    'total_pendiente_centavos',v_total,'total_actual',round(v_total::numeric/100,2),
    'obligaciones',jsonb_build_array(jsonb_build_object(
       'tipo','saldo_global_heredado','total_centavos',v_total)),
    'cobrable',false);
end $goxion$;

revoke all on function public.goxion_hibrido_estado_financiero_v1(uuid,date)
  from public,anon,authenticated;
grant execute on function public.goxion_hibrido_estado_financiero_v1(uuid,date)
  to service_role;

comment on function public.goxion_hibrido_estado_financiero_v1(uuid,date) is
  'Prototipo híbrido NO COBRABLE. Solo lectura: una fuente de saldo por ciclo; no habilitar sin integración de obligaciones únicas.';
