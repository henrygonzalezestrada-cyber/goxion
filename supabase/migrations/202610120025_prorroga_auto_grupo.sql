-- Forecast de prórroga, siempre del motor FINANCIERO oficial,
-- recalculado al confirmar. Nunca confiar en montos del navegador.
create or replace function public.goxion_prorroga_auto_cotizar(
 p_cliente_id uuid,p_fecha_pactada date,p_cargo_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_original date;v_actual jsonb;v_futuro jsonb;
 v_periodo date;v_cargo record;v_base integer;v_fut_base integer;
 v_hoy_base jsonb;v_next_base jsonb;
 v_al_dia integer;v_incumplimiento integer;v_mora integer;v_desc integer;
 v_corte date;v_next date;
begin
 if p_cliente_id is null or p_fecha_pactada is null then
  raise exception 'PRORROGA_FECHA_INVALIDA';end if;
 select id,periodo_pendiente,dia_pago,estado,pago_en_revision
 into v_cliente from public.clientes where id=p_cliente_id;
 if not found or v_cliente.estado='suspendido' or v_cliente.pago_en_revision then
  raise exception 'PRORROGA_CUENTA_NO_DISPONIBLE';end if;
 if p_cargo_id is not null then
  select b.* into v_cargo from public.goxion_b2_cargos b
  join public.goxion_b2_ciclos c on c.id=b.ciclo_id and c.estado='pendiente'
  join public.goxion_b2_regimen_cliente reg on reg.cliente_id=b.cliente_id and reg.activo
  where b.id=p_cargo_id and b.cliente_id=p_cliente_id and not b.liquidado;
  if not found then raise exception 'PRORROGA_CARGO_NO_DISPONIBLE';end if;
  v_original=v_cargo.fecha_vencimiento;v_periodo=v_cargo.periodo;
  if exists(select 1 from public.goxion_b2_prorrogas where cliente_id=p_cliente_id and ciclo_id=v_cargo.ciclo_id)
   then raise exception 'PRORROGA_YA_UTILIZADA_EN_PERIODO';end if;
  if exists(select 1 from public.goxion_b2_cargos b
    where b.ciclo_id=v_cargo.ciclo_id and b.id<>v_cargo.id and not b.liquidado
    and b.fecha_vencimiento>v_original and b.fecha_vencimiento<=p_fecha_pactada)
   then raise exception 'PRORROGA_CRUZA_OTRO_VENCIMIENTO';end if;
  v_actual=public.goxion_b2_cotizar_ciclo(p_cliente_id,v_periodo,v_hoy);
  v_futuro=public.goxion_b2_cotizar_ciclo(p_cliente_id,v_periodo,p_fecha_pactada+1);
  if coalesce((v_actual->>'lealtad_global_perdida')::boolean,false) then
   raise exception 'PRORROGA_LEALTAD_YA_PERDIDA';end if;
  -- Si varios accesos vencen el mismo día, el acuerdo se aplica al
  -- conjunto. Mostrar su IMPORTE SUMADO (nunca sólo un perfil).
  select coalesce(sum((j.item->>'total_centavos')::int),0)
    into v_al_dia from jsonb_array_elements(v_actual->'cargos') as j(item)
    join public.goxion_b2_cargos b on b.id=(j.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
  select coalesce(sum((j.item->>'total_centavos')::int),0),
    coalesce(sum((j.item->>'mora_centavos')::int),0)
    into v_incumplimiento,v_mora
    from jsonb_array_elements(v_futuro->'cargos') as j(item)
    join public.goxion_b2_cargos b on b.id=(j.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
  select coalesce(sum(greatest(0,
    (a.item->>'descuento_centavos')::int-
    (f.item->>'descuento_centavos')::int)),0)
    into v_desc
    from jsonb_array_elements(v_actual->'cargos') as a(item)
    join jsonb_array_elements(v_futuro->'cargos') as f(item)
      on a.item->>'cargo_id'=f.item->>'cargo_id'
    join public.goxion_b2_cargos b on b.id=(a.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
 else
  if exists(select 1 from public.goxion_b2_regimen_cliente
   where cliente_id=p_cliente_id and activo) then
   raise exception 'PRORROGA_REQUIERE_ACCESO';end if;
  v_periodo=v_cliente.periodo_pendiente;
  v_original=make_date(extract(year from v_periodo)::int,
   extract(month from v_periodo)::int,
   least(v_cliente.dia_pago,extract(day from date_trunc('month',v_periodo)+
     interval '1 month - 1 day')::int));
  if exists(select 1 from public.acuerdos_cobro
   where cliente_id=p_cliente_id and periodo=v_periodo) then
   raise exception 'PRORROGA_YA_UTILIZADA_EN_PERIODO';end if;
  v_actual=public.goxion_estado_financiero(p_cliente_id,v_hoy);
  v_futuro=public.goxion_estado_financiero(p_cliente_id,p_fecha_pactada+1);
  v_al_dia=round(coalesce((v_actual->>'total_actual')::numeric,0)*100)::int;
  v_incumplimiento=round(coalesce((v_futuro->>'total_actual')::numeric,0)*100)::int;
  v_mora=round(coalesce((v_futuro->'cargos'->>'mora')::numeric,0)*100)::int;
  v_desc=greatest(0,round((
   coalesce((v_actual->'descuentos'->>'lealtad')::numeric,0)-
   coalesce((v_futuro->'descuentos'->>'lealtad')::numeric,0))*100)::int);
 end if;
 if v_original is distinct from v_hoy then raise exception 'PRORROGA_SOLO_DIA_DE_PAGO';end if;
 if p_fecha_pactada<=v_original or p_fecha_pactada>v_original+5 then
  raise exception 'PRORROGA_MAX_5_DIAS';end if;
 return jsonb_build_object('ok',true,'fecha_original',v_original,
  'fecha_pactada',p_fecha_pactada,'periodo',v_periodo,
  'cargo_id',p_cargo_id,'importe_pactado_centavos',v_al_dia,
  'importe_si_incumple_centavos',v_incumplimiento,
  'mora_si_incumple_centavos',v_mora,'lealtad_en_riesgo_centavos',v_desc,
  'requiere_admin',false,'confirmacion_necesaria',true);
end $$;
revoke all on function public.goxion_prorroga_auto_cotizar(uuid,date,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_prorroga_auto_cotizar(uuid,date,uuid) to service_role;
