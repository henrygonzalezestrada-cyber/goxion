-- GOXION · Planificador de transición para UN motor financiero (etapa NO cobrable).
-- Funciones sin efectos: ninguna crea ciclos, modifica permisos, acredita pagos o cambia regímenes.
-- No exponer a clientes. Instalar/validar solamente en el proyecto B2 aislado.

-- Reductor determinista. Esta función es la política de transición; NO calcula dinero.
-- Para pruebas es posible simular cualquier escenario sin alterar registros reales.
create or replace function public.goxion_hibrido_decidir_transicion_v1(
  p_modo text,
  p_b2_activo boolean,
  p_ciclo_actual boolean,
  p_deuda_actual boolean,
  p_deuda_historica boolean,
  p_global_pagado boolean,
  p_global_revision boolean,
  p_parcial_heredado boolean
) returns text language plpgsql immutable security invoker
set search_path = ''
as $goxion$
begin
  if p_modo is null or p_modo not in
      ('sin_accesos','calendario_pendiente','fecha_unica','multifecha')
    or p_b2_activo is null or p_ciclo_actual is null
    or p_deuda_actual is null or p_deuda_historica is null
    or p_global_pagado is null or p_global_revision is null
    or p_parcial_heredado is null then
    raise exception 'TRANSICION_ENTRADAS_INVALIDAS';
  end if;

  -- Un ciclo B2 no puede perder su autoridad aunque el indicador cambie.
  if p_ciclo_actual and not p_b2_activo then
    return 'B2_CICLO_SIN_REGIMEN';
  end if;
  if p_b2_activo and not p_ciclo_actual then
    return 'CICLO_B2_NO_PREPARADO';
  end if;
  -- Nunca considerar estable un B2 con pago global del mismo ciclo.
  if p_b2_activo and p_ciclo_actual and p_global_pagado then
    return 'CONFLICTO_PAGO_GLOBAL_B2';
  end if;
  if p_b2_activo and p_ciclo_actual and (p_global_revision or p_parcial_heredado) then
    return 'CONFLICTO_REVISION_GLOBAL_B2';
  end if;
  if p_b2_activo and p_ciclo_actual and p_deuda_historica then
    return 'B2_HISTORICO_PENDIENTE_CON_CICLO';
  end if;
  if p_modo='sin_accesos' then
    return case when p_deuda_actual or p_deuda_historica
      then 'SIN_ACCESOS_CON_DEUDA' else 'SIN_ACCESOS' end;
  end if;
  if p_modo='calendario_pendiente' then
    return 'CALENDARIO_NO_CONCILIADO';
  end if;

  if p_modo='multifecha' then
    if p_b2_activo and p_ciclo_actual then
      return 'ESTABLE_MULTIFECHA';
    end if;
    if p_deuda_historica then
      return 'HISTORICO_B2_PENDIENTE';
    end if;
    if p_global_pagado or p_global_revision or p_parcial_heredado then
      return 'MIGRACION_BLOQUEADA_POR_PAGO_GLOBAL';
    end if;
    -- La migración requiere materializar en una transacción autorizada.
    return 'CANDIDATA_ALTA_MULTIFECHA';
  end if;

  -- Una única fecha vigente no borra las obligaciones de su ciclo B2.
  if p_b2_activo then
    if p_deuda_actual or p_deuda_historica then
      return 'MANTENER_B2_HASTA_LIQUIDAR';
    end if;
    return 'CANDIDATA_SALIDA_B2_PROXIMO_CICLO';
  end if;
  if p_deuda_actual or p_deuda_historica then
    return 'HISTORICO_B2_PENDIENTE';
  end if;
  return 'ESTABLE_FECHA_UNICA';
end $goxion$;

-- Lee la realidad del cliente para alimentar el reductor anterior.
-- Genera un plan, NO una autorización para ejecutar cobros ni migraciones.
create or replace function public.goxion_hibrido_plan_transicion_v1(
  p_cliente_id uuid,
  p_hoy date default (now() at time zone 'America/Mexico_City')::date
) returns jsonb language plpgsql stable security invoker
set search_path = ''
as $goxion$
declare
  v_cliente record;
  v_accesos int := 0;
  v_verificados int := 0;
  v_fechas int := 0;
  v_precios_inconsistentes int := 0;
  v_regimen boolean := false;
  v_ciclo boolean := false;
  v_deuda_actual boolean := false;
  v_deuda_historica boolean := false;
  v_global_pagado boolean := false;
  v_revision boolean := false;
  v_parcial boolean := false;
  v_modo text;
  v_decision text;
begin
  if p_cliente_id is null or p_hoy is null then
    raise exception 'TRANSICION_CLIENTE_FECHA_REQUERIDOS';
  end if;
  select id,periodo_pendiente,pago_en_revision into v_cliente
  from public.clientes where id=p_cliente_id;
  if not found or v_cliente.periodo_pendiente is null or
      v_cliente.periodo_pendiente<>date_trunc('month',v_cliente.periodo_pendiente)::date
  then
    return jsonb_build_object('ok',false,'codigo','CLIENTE_O_PERIODO_INVALIDO',
      'cobrable',false,'ejecutable',false,'requiere_revision',true,
      'version','hibrido-transiciones-v1');
  end if;
  select count(distinct a.id)::int,
         count(distinct a.id) filter (
           where cal.estado='verificado' and cal.verificado_en is not null
             and cal.revision>0 and cal.precio_centavos>0
             and cal.cobertura_hasta>=v_cliente.periodo_pendiente
             and cal.cobertura_hasta <
               (v_cliente.periodo_pendiente+interval '1 month')::date
         )::int,
         count(distinct cal.cobertura_hasta) filter (
           where cal.estado='verificado' and cal.verificado_en is not null
             and cal.revision>0 and cal.precio_centavos>0
             and cal.cobertura_hasta>=v_cliente.periodo_pendiente
             and cal.cobertura_hasta <
               (v_cliente.periodo_pendiente+interval '1 month')::date
         )::int
    into v_accesos,v_verificados,v_fechas
  from public.cliente_accesos a
  join public.cliente_servicios s
    on s.id=a.cliente_servicio_id and s.cliente_id=p_cliente_id and s.activo
  left join public.goxion_calendario_accesos cal
    on cal.cliente_acceso_id=a.id
  where a.cliente_id=p_cliente_id and a.activo;

  -- Los precios de los accesos tienen que conciliar contra el contrato:
  -- un descuento NO es una reducción de precio base.
  select count(*)::int into v_precios_inconsistentes
  from public.cliente_servicios s
  where s.cliente_id=p_cliente_id and s.activo
    and round(s.monto*100)::bigint is distinct from (
      select coalesce(sum(cal.precio_centavos),0)::bigint
      from public.cliente_accesos a
      join public.goxion_calendario_accesos cal
        on cal.cliente_acceso_id=a.id and cal.estado='verificado'
      where a.cliente_servicio_id=s.id and a.activo
    );

  v_modo := case
    when v_accesos=0 then 'sin_accesos'
    when v_accesos<>v_verificados or v_precios_inconsistentes>0
      then 'calendario_pendiente'
    when v_fechas>1 then 'multifecha'
    else 'fecha_unica' end;

  select coalesce(r.activo,false) into v_regimen
  from public.goxion_b2_regimen_cliente r
  where r.cliente_id=p_cliente_id;
  v_regimen:=coalesce(v_regimen,false);
  select exists(
    select 1 from public.goxion_b2_ciclos c
    where c.cliente_id=p_cliente_id and c.periodo=v_cliente.periodo_pendiente
  ) into v_ciclo;

  select coalesce(bool_or(
    not b.liquidado and (b.principal_pendiente_centavos>0 or b.mora_pendiente_centavos>0)
    ) filter(where b.periodo=v_cliente.periodo_pendiente),false),
    coalesce(bool_or(
    not b.liquidado and (b.principal_pendiente_centavos>0 or b.mora_pendiente_centavos>0)
    ) filter(where b.periodo<>v_cliente.periodo_pendiente),false)
  into v_deuda_actual,v_deuda_historica
  from public.goxion_b2_cargos b where b.cliente_id=p_cliente_id;

  select exists(
    select 1 from public.pagos p where p.cliente_id=p_cliente_id
      and p.estado='pagado'
      and public.goxion_periodo_pago_canonico(p.periodo)=v_cliente.periodo_pendiente
  ) into v_global_pagado;
  v_revision:=coalesce(v_cliente.pago_en_revision,false);
  select exists(
    select 1 from public.pagos_parciales p where p.cliente_id=p_cliente_id
      and p.periodo=v_cliente.periodo_pendiente and p.activo
  ) into v_parcial;

  v_decision:=public.goxion_hibrido_decidir_transicion_v1(
    v_modo,v_regimen,v_ciclo,v_deuda_actual,v_deuda_historica,
    v_global_pagado,v_revision,v_parcial
  );

  return jsonb_build_object(
    'ok',true,'codigo',v_decision,'version','hibrido-transiciones-v1',
    'cliente_id',p_cliente_id,'periodo',v_cliente.periodo_pendiente,
    'fecha_consulta',p_hoy,'modo_deducido',v_modo,
    'accesos_activos',v_accesos,'calendarios_verificados',v_verificados,
    'fechas_distintas',v_fechas,'contratos_con_precio_discrepante',v_precios_inconsistentes,
    'b2_activo',v_regimen,'ciclo_b2_actual',v_ciclo,
    'deuda_b2_actual',v_deuda_actual,'deuda_b2_historica',v_deuda_historica,
    'pago_global_confirmado',v_global_pagado,
    'pago_global_en_revision',v_revision,
    'parcial_heredado_activo',v_parcial,
    'requiere_revision',v_decision not in ('ESTABLE_FECHA_UNICA','ESTABLE_MULTIFECHA'),
    'cobrable',false,'ejecutable',false
  );
end $goxion$;

-- Las RPC de preparación se ejecutan exclusivamente a través de service_role.
revoke all on function public.goxion_hibrido_decidir_transicion_v1(
  text,boolean,boolean,boolean,boolean,boolean,boolean,boolean
) from public,anon,authenticated;
revoke all on function public.goxion_hibrido_plan_transicion_v1(uuid,date)
  from public,anon,authenticated;
grant execute on function public.goxion_hibrido_decidir_transicion_v1(
  text,boolean,boolean,boolean,boolean,boolean,boolean,boolean
) to service_role;
grant execute on function public.goxion_hibrido_plan_transicion_v1(uuid,date)
  to service_role;

comment on function public.goxion_hibrido_plan_transicion_v1(uuid,date) is
 'Plan de transición no cobrable ni ejecutable. Conserva todas las obligaciones y exige conciliación antes de migrar.';
