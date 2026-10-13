-- GOXION · PRÓRROGA B2. No activa clientes ni modifica cargos al instalarse.
-- Una solicitud por CLIENTE y ciclo, <=5 días, antes del corte original.
-- Estado siempre auditado: solicitada -> aprobada/rechazada; no se renueva.
create table if not exists public.goxion_b2_prorrogas(
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 ciclo_id uuid not null references public.goxion_b2_ciclos(id) on delete restrict,
 cargo_id uuid not null references public.goxion_b2_cargos(id) on delete restrict,
 fecha_original date not null,
 fecha_pactada date not null,
 estado text not null default 'solicitada'
  check(estado in ('solicitada','aprobada','rechazada')),
 motivo text not null default 'Solicito prórroga',
 operation_id uuid not null unique,
 solicitado_en timestamptz not null default now(),
 revisado_en timestamptz,
 revisado_por text,
 unique(cliente_id,ciclo_id),
 unique(cargo_id),
 check(fecha_pactada>fecha_original and fecha_pactada<=fecha_original+5),
 check(length(motivo) between 3 and 300)
);
create index if not exists goxion_b2_prorrogas_estado_idx on public.goxion_b2_prorrogas(estado,cliente_id);
alter table public.goxion_b2_prorrogas enable row level security;
revoke all on public.goxion_b2_prorrogas from public,anon,authenticated;
grant select,insert,update on public.goxion_b2_prorrogas to service_role;

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
    'solicitud_id',v_prev.id,'estado',v_prev.estado);
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
 if v_hoy>v_cargo.fecha_vencimiento
  or p_fecha_pactada<=v_cargo.fecha_vencimiento
  or p_fecha_pactada>v_cargo.fecha_vencimiento+5
  or v_ciclo.lealtad_perdida then
  raise exception 'PRORROGA_FUERA_DE_PLAZO';
 end if;
 if exists(select 1 from public.goxion_b2_prorrogas
  where cliente_id=p_cliente_id and ciclo_id=v_ciclo.id)
 then raise exception 'PRORROGA_USADA_EN_ESTE_CICLO';end if;
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
  p_fecha_pactada,'solicitada',p_motivo,p_operation_id)
 returning * into v_result;
 return jsonb_build_object('ok',true,'solicitud_id',v_result.id,
   'estado','solicitada','requiere_aprobacion_admin',true,
   'fecha_original',v_result.fecha_original,
   'fecha_pactada',v_result.fecha_pactada,
   'mantiene_fecha_corte_original',true);
end $$;

create or replace function public.goxion_b2_resolver_prorroga(
 p_cliente_id uuid,p_solicitud_id uuid,p_aprobar boolean,
 p_actor text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pr record;v_cliente record;v_cargo record;v_ciclo record;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
begin
 if p_cliente_id is null or p_solicitud_id is null or p_aprobar is null
  or length(btrim(coalesce(p_actor,'')))<3 or length(p_actor)>120 then
   raise exception 'Resolución administrativa inválida';end if;
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then raise exception 'Cuenta no válida';end if;
 select * into v_pr from public.goxion_b2_prorrogas
 where id=p_solicitud_id and cliente_id=p_cliente_id for update;
 if not found then raise exception 'Solicitud inexistente';end if;
 if v_pr.estado<>'solicitada' then
  if (v_pr.estado='aprobada')=p_aprobar then
   return jsonb_build_object('ok',true,'repetida',true,'estado',v_pr.estado,
    'solicitud_id',v_pr.id);
  end if;
  raise exception 'Solicitud previamente resuelta';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_pr.ciclo_id for update;
 select * into v_cargo from public.goxion_b2_cargos
 where id=v_pr.cargo_id for update;
 if v_ciclo.estado<>'pendiente' or v_cargo.liquidado then
   raise exception 'Solicitud sobre cargo liquidado';end if;
 if p_aprobar and (v_hoy>v_pr.fecha_original or v_ciclo.lealtad_perdida)
 then raise exception 'Prórroga vencida; ya no conserva lealtad';end if;
 update public.goxion_b2_prorrogas set
  estado=case when p_aprobar then 'aprobada' else 'rechazada' end,
  revisado_en=now(),revisado_por=p_actor where id=p_solicitud_id;
 return jsonb_build_object('ok',true,'solicitud_id',p_solicitud_id,
  'estado',case when p_aprobar then 'aprobada' else 'rechazada' end,
  'fecha_pactada',v_pr.fecha_pactada,'fecha_original',v_pr.fecha_original,
  'lealtad_se_conserva_hasta',case when p_aprobar then v_pr.fecha_pactada else null end);
end $$;

revoke all on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text)
 from public,anon,authenticated;
revoke all on function public.goxion_b2_resolver_prorroga(uuid,uuid,boolean,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text),
 public.goxion_b2_resolver_prorroga(uuid,uuid,boolean,text) to service_role;
