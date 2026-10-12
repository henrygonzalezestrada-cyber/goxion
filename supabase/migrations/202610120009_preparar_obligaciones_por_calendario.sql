-- GOXION B2 · Materialización completa y conservadora por acceso verificado.
-- Sólo datos sombra; NO crea deuda ni mueve pagos oficiales.
-- Sin parámetros explícitos solo valida. Con p_solo_validar=false registra
-- obligaciones "conciliadas" únicamente cuando TODO el período cuadra sin
-- descuentos, promociones, beneficios, mora ni parciales pendientes.
create or replace function public.goxion_preparar_obligaciones_calendario_sombra(
 p_cliente_id uuid,p_periodo date,p_solo_validar boolean default true
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cliente record; v_estado jsonb;v_total_contratado bigint;
 v_total_accesos bigint;v_count int;v_validos int;v_days int;
 v_fechas_distintas int;v_official_period date;v_subtotal bigint;
 v_disc bigint;v_fees bigint;v_total bigint;v_saved int:=0;
 v_ya_pagado boolean;v_revisando boolean;v_partial boolean;
 v_note text;
begin
 if p_cliente_id is null or p_periodo is null or
  p_periodo is distinct from date_trunc('month',p_periodo)::date
  then raise exception 'Cliente y mes inicial son obligatorios';end if;
 -- Una sola operación serializada contra el registro principal.
 select id,estado into v_cliente from public.clientes
 where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then
  return jsonb_build_object('ok',true,'aplicable',false,'motivo','cliente_inactivo',
    'cobrable',false);
 end if;
 select count(*),coalesce(round(sum(monto)*100),0)::bigint
 into v_count,v_total_contratado
 from public.cliente_servicios
 where cliente_id=p_cliente_id and activo=true;
 if v_count=0 or v_count>60 then return jsonb_build_object('ok',true,
   'aplicable',false,'motivo','sin_servicios_conciliables','cobrable',false);end if;

 -- Todas las unidades activas deben tener calendario verificado, con
 -- vencimiento dentro del mismo mes a facturar. Ninguna fila fantasma.
 select count(*),
        count(*) filter (where cal.estado='verificado'
             and cal.cobertura_hasta>=p_periodo
             and cal.cobertura_hasta<(p_periodo+interval '1 month')::date
             and cal.precio_centavos is not null
             and cal.revision>0),
        coalesce(sum(cal.precio_centavos),0)::bigint,
        count(distinct cal.cobertura_hasta)
 into v_days,v_validos,v_total_accesos,v_fechas_distintas
 from public.cliente_accesos a
 join public.cliente_servicios cs on cs.id=a.cliente_servicio_id and cs.activo
 left join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo;
 if v_days=0 or v_days>80 or v_validos<>v_days
   or v_total_accesos<>v_total_contratado then
  return jsonb_build_object('ok',true,'aplicable',false,
   'motivo','calendario_incompleto_o_precio_no_conciliado','cobrable',false);
 end if;
 -- El sistema con una sola fecha continúa en el motor tradicional.
 if v_fechas_distintas<2 then
  return jsonb_build_object('ok',true,'aplicable',false,
    'motivo','fecha_unica_mantener_cobro_legacy','cobrable',false);
 end if;
 v_estado=public.goxion_estado_financiero(p_cliente_id);
 if v_estado->>'fuente_financiera' is distinct from 'supabase:goxion_estado_financiero'
  or v_estado->'contrato_financiero'->>'modo' is distinct from 'oficial' then
  return jsonb_build_object('ok',true,'aplicable',false,
    'motivo','fuente_financiera_no_oficial','cobrable',false);
 end if;
 begin
  v_official_period=date_trunc('month',(v_estado->>'periodo')::date)::date;
  v_subtotal=round((v_estado->>'subtotal')::numeric*100)::bigint;
  v_disc=round(coalesce((v_estado->'descuentos'->>'total')::numeric,0)*100)::bigint;
  v_fees=round(coalesce((v_estado->'cargos'->>'total')::numeric,0)*100)::bigint;
  v_total=round((v_estado->>'total_actual')::numeric*100)::bigint;
 exception when others then
  return jsonb_build_object('ok',true,'aplicable',false,
    'motivo','importe_oficial_no_verificable','cobrable',false);
 end;
 v_ya_pagado=coalesce((v_estado->>'esta_pagado_periodo')::boolean,false);
 v_revisando=coalesce((v_estado->>'pago_en_revision')::boolean,false);
 v_partial=coalesce((v_estado->>'pago_incompleto')::boolean,false);
 if v_official_period is distinct from p_periodo or v_total_contratado<>v_subtotal
  or v_disc<>0 or v_fees<>0 or v_total<>v_subtotal
  or v_ya_pagado or v_revisando or v_partial then
  return jsonb_build_object('ok',true,'aplicable',false,
    'motivo','periodo_o_beneficios_requieren_conciliacion_individual',
    'cobrable',false,'importe_oficial_centavos',v_total,
    'beneficios_pendientes_centavos',v_disc,'cargos_pendientes_centavos',v_fees);
 end if;

 if p_solo_validar then
  return jsonb_build_object('ok',true,'aplicable',true,
    'solo_validacion',true,'accesos',v_days,
    'fechas_distintas',v_fechas_distintas,
    'importe_base_centavos',v_subtotal,'cobrable',false);
 end if;

 -- Siempre aceptar sólo datos verificados, con revisión immutable atada
 -- a cada obligación. El trigger/índice evitan reasignar ciclos existentes.
 if exists(
  select 1 from public.goxion_obligaciones_sombra ob
  join public.cliente_accesos a on a.id=ob.cliente_acceso_id
  left join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
  where ob.cliente_id=p_cliente_id and ob.ciclo_inicio=p_periodo
   and (ob.estado<>'conciliado'
        or ob.calendario_revision is distinct from cal.revision
        or ob.fecha_vencimiento is distinct from cal.cobertura_hasta
        or ob.base_centavos is distinct from cal.precio_centavos
        or ob.descuentos_centavos<>0 or ob.mora_centavos<>0 or ob.otros_cargos_centavos<>0)
 ) then raise exception 'Obligaciones del período desactualizadas: requiere revisión';end if;

 insert into public.goxion_obligaciones_sombra(
  cliente_id,cliente_servicio_id,cliente_acceso_id,
  ciclo_inicio,fecha_vencimiento,cobertura_hasta,
  base_centavos,descuentos_centavos,mora_centavos,otros_cargos_centavos,
  estado,motor_version,actor,calendario_revision
 )
 select p_cliente_id,a.cliente_servicio_id,a.id,
  p_periodo,cal.cobertura_hasta,cal.cobertura_hasta,
  cal.precio_centavos,0,0,0,
  'conciliado','b2-sombra-3','servicio_backend',cal.revision
 from public.cliente_accesos a
 join public.cliente_servicios cs on cs.id=a.cliente_servicio_id and cs.activo
 join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo
 on conflict (cliente_acceso_id,ciclo_inicio) do nothing;
 get diagnostics v_saved=row_count;
 return jsonb_build_object('ok',true,'aplicable',true,
  'solo_validacion',false,'accesos',v_days,'nuevas_obligaciones',v_saved,
  'importe_base_centavos',v_subtotal,'cobrable',false,
  'modo','obligaciones_conciliadas_sin_acreditacion');
end $$;
revoke all on function public.goxion_preparar_obligaciones_calendario_sombra(uuid,date,boolean)
 from public,anon,authenticated;
grant execute on function public.goxion_preparar_obligaciones_calendario_sombra(uuid,date,boolean)
 to service_role;
