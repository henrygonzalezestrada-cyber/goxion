-- GOXION B2 F2 · acuerdo prórroga vs comprobante en revisión.
-- Cambia únicamente RPCs B2 opt-in. No modifica día único, Edge oficiales,
-- datos, clientes activados o estados históricos.
-- Idempotencia: el replay de un acuerdo existente se valida antes de la nueva
-- guarda, conservando respuesta al repetir exactamente una operación pactada.
-- GOXION: confirmación automática de prórroga desde Mi Espacio.
-- Un solo acuerdo por ciclo. Si varios accesos comparten fecha original,
-- la prórroga protege ese conjunto, no únicamente un perfil.
create or replace function public.goxion_b2_solicitar_prorroga(
 p_cliente_id uuid,p_cargo_id uuid,p_fecha_pactada date,
 p_operation_id uuid,p_motivo text default 'Solicito prórroga'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_cargo record;v_ciclo record;v_prev record;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_result record;
begin
 if p_cliente_id is null or p_cargo_id is null or p_operation_id is null
 or p_fecha_pactada is null or length(btrim(coalesce(p_motivo,''))) not between 3 and 300
 then raise exception 'Solicitud de prórroga incompleta';end if;
 select id,estado,periodo_pendiente into v_cliente from public.clientes
 where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then
  raise exception 'Cliente no disponible';end if;
 select * into v_prev from public.goxion_b2_prorrogas
 where operation_id=p_operation_id;
 if found then
  if v_prev.cliente_id is distinct from p_cliente_id or
     v_prev.cargo_id is distinct from p_cargo_id or
     v_prev.fecha_pactada is distinct from p_fecha_pactada or
     v_prev.motivo is distinct from p_motivo then
    raise exception 'PRORROGA_IDEMPOTENCIA_INCOMPATIBLE';
  end if;
  return jsonb_build_object('ok',true,'repetida',true,
    'solicitud_id',v_prev.id,'estado',v_prev.estado,
    'acuerdo_activo',v_prev.estado='aprobada','aprobacion','automatica');
 end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  raise exception 'B2_NO_ACTIVO';end if;
 select * into v_cargo from public.goxion_b2_cargos
 where id=p_cargo_id and cliente_id=p_cliente_id for update;
 if not found or v_cargo.liquidado or v_cargo.principal_pendiente_centavos<=0
 then raise exception 'OBLIGACION_NO_ELEGIBLE';end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_cargo.ciclo_id and cliente_id=p_cliente_id for update;
 if v_ciclo.estado<>'pendiente' or
    v_ciclo.periodo is distinct from v_cliente.periodo_pendiente
 then raise exception 'CICLO_NO_DISPONIBLE';end if;
 if v_cliente.pago_en_revision then raise exception 'PRORROGA_PAGO_EN_REVISION';end if;
 -- Un comprobante B2 reportado y todavía pendiente congela la fecha.
 -- Es el mismo ciclo: no prometer nueva fecha mientras Admin revisa cobro.
 if exists(select 1 from public.goxion_b2_comprobantes r
   where r.cliente_id=p_cliente_id and r.ciclo_id=v_ciclo.id
   and r.estado='reportado')
 then raise exception 'PRORROGA_PAGO_EN_REVISION_B2';end if;
 if v_hoy<>v_cargo.fecha_vencimiento
  or p_fecha_pactada<=v_cargo.fecha_vencimiento
  or p_fecha_pactada>v_cargo.fecha_vencimiento+5
  or v_ciclo.lealtad_perdida then
  raise exception 'PRORROGA_FUERA_DE_PLAZO';
 end if;
 if exists(select 1 from public.goxion_b2_prorrogas
  where cliente_id=p_cliente_id and ciclo_id=v_ciclo.id)
 then raise exception 'PRORROGA_USADA_EN_ESTE_CICLO';end if;
 -- La extensión NO puede solaparse con otro acceso cuyo vencimiento
 -- todavía está pendiente: sin esto prometería conservar lealtad cuando
 -- otra fecha se perdería antes.
 if exists(select 1 from public.goxion_b2_cargos b
  where b.ciclo_id=v_ciclo.id and b.id<>v_cargo.id and not b.liquidado
  and b.fecha_vencimiento>v_cargo.fecha_vencimiento
  and b.fecha_vencimiento<=p_fecha_pactada)
 then raise exception 'PRORROGA_CRUZA_OTRO_VENCIMIENTO';end if;
 -- Una fecha independiente que ya se venció descalifica la prórroga:
 -- la lealtad global ya se perdió y no puede revivirse.
 if exists(select 1 from public.goxion_b2_cargos b
  where b.ciclo_id=v_ciclo.id and b.id<>v_cargo.id and
    b.fecha_vencimiento<v_hoy and not b.liquidado and
    not exists(select 1 from public.goxion_b2_prorrogas pr
       where pr.cargo_id=b.id and pr.estado='aprobada'
         and pr.fecha_pactada>=v_hoy))
 then raise exception 'OTRA_FECHA_DEL_CLIENTE_INCUMPLIDA';end if;
 insert into public.goxion_b2_prorrogas(cliente_id,ciclo_id,cargo_id,
  fecha_original,fecha_pactada,estado,motivo,operation_id)
 values(p_cliente_id,v_ciclo.id,p_cargo_id,v_cargo.fecha_vencimiento,
  p_fecha_pactada,'aprobada',p_motivo,p_operation_id)
 returning * into v_result;
 return jsonb_build_object('ok',true,'solicitud_id',v_result.id,
   'estado','aprobada','aprobacion','automatica','requiere_aprobacion_admin',false,
   'fecha_original',v_result.fecha_original,
   'fecha_pactada',v_result.fecha_pactada,
   'mantiene_fecha_corte_original',true,'acuerdo_activo',true);
end $$;



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
  if exists(select 1 from public.goxion_b2_comprobantes r
   where r.cliente_id=p_cliente_id and r.ciclo_id=v_cargo.ciclo_id
   and r.estado='reportado')
  then raise exception 'PRORROGA_PAGO_EN_REVISION_B2';end if;
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

revoke all on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text) to service_role;
revoke all on function public.goxion_prorroga_auto_cotizar(uuid,date,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_prorroga_auto_cotizar(uuid,date,uuid) to service_role;
