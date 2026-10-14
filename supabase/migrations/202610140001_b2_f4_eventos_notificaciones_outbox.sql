-- GOXION · B2 F4: un único aviso por acuerdo automático, fuera del flujo de cobro.
-- La inserción es la confirmación transaccional; la entrega externa usa un outbox.
create table if not exists public.goxion_b2_f4_eventos (
 id uuid primary key default gen_random_uuid(),
 clave text not null unique,
 tipo text not null check(tipo in ('prorroga_activada','prorroga_cumplida')),
 acuerdo_id uuid not null references public.goxion_b2_prorrogas(id) on delete restrict,
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 ciclo_id uuid not null references public.goxion_b2_ciclos(id) on delete restrict,
 cargo_id uuid not null references public.goxion_b2_cargos(id) on delete restrict,
 fecha_original date not null, fecha_pactada date not null,
 creado_en timestamptz not null default now()
);
create index if not exists goxion_b2_f4_eventos_cliente_idx
 on public.goxion_b2_f4_eventos(cliente_id,creado_en desc);
create table if not exists public.goxion_b2_f4_discord_outbox (
 evento_id uuid primary key references public.goxion_b2_f4_eventos(id) on delete restrict,
 estado text not null default 'pendiente'
   check(estado in ('pendiente','enviando','enviado')),
 intentos integer not null default 0 check(intentos between 0 and 20),
 proximo_intento timestamptz not null default now(),
 bloqueado_en timestamptz,
 enviado_en timestamptz,
 ultimo_error text,
 creado_en timestamptz not null default now()
);
create index if not exists goxion_b2_f4_outbox_pendientes_idx
 on public.goxion_b2_f4_discord_outbox(proximo_intento)
 where estado<>'enviado';
alter table public.goxion_b2_f4_eventos enable row level security;
alter table public.goxion_b2_f4_discord_outbox enable row level security;
revoke all on public.goxion_b2_f4_eventos,public.goxion_b2_f4_discord_outbox from public,anon,authenticated;
grant select,insert on public.goxion_b2_f4_eventos to service_role;
grant select,insert,update on public.goxion_b2_f4_discord_outbox to service_role;

create or replace function public.goxion_b2_f4_registrar_evento(
 p_tipo text,p_acuerdo_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $f$
declare a record;c record;k text;eid uuid;v_notification text;
begin
 if p_tipo not in ('prorroga_activada','prorroga_cumplida')
   or p_acuerdo_id is null then raise exception 'B2_F4_EVENTO_INVALIDO';end if;
 select * into a from public.goxion_b2_prorrogas where id=p_acuerdo_id;
 if not found or a.estado<>'aprobada' then
   raise exception 'B2_F4_ACUERDO_NO_CONFIRMADO';end if;
 select id,nombre,folio into c from public.clientes where id=a.cliente_id;
 if not found then raise exception 'B2_F4_CLIENTE_NO_EXISTE';end if;
 k=p_tipo||':'||a.id::text;
 insert into public.goxion_b2_f4_eventos
 (clave,tipo,acuerdo_id,cliente_id,ciclo_id,cargo_id,fecha_original,fecha_pactada)
 values(k,p_tipo,a.id,a.cliente_id,a.ciclo_id,a.cargo_id,a.fecha_original,a.fecha_pactada)
 on conflict(clave) do nothing
 returning id into eid;
 if eid is null then
   select id into eid from public.goxion_b2_f4_eventos where clave=k;
   return jsonb_build_object('ok',true,'nuevo',false,'evento_id',eid);
 end if;
 insert into public.goxion_b2_f4_discord_outbox(evento_id) values(eid);
 v_notification=case when p_tipo='prorroga_activada'
  then 'Prórroga hasta '||to_char(a.fecha_pactada,'DD/MM/YYYY')
  else 'Prórroga cumplida' end;
 insert into public.notificaciones_admin
 (cliente_id,cliente_nombre,tipo,titulo,mensaje,referencia,leida)
 values(a.cliente_id,c.nombre,p_tipo,v_notification,
  'Fecha original: '||to_char(a.fecha_original,'DD/MM/YYYY')||
  ' · Fecha pactada: '||to_char(a.fecha_pactada,'DD/MM/YYYY')||
  ' · Acuerdo: '||a.id::text||
  ' · Obligación: '||a.cargo_id::text,
  'b2:'||p_tipo||':'||a.id::text,false);
 return jsonb_build_object('ok',true,'nuevo',true,'evento_id',eid);
end $f$;

create or replace function public.goxion_b2_f4_evento_prorroga_trigger()
 returns trigger language plpgsql security definer set search_path='' as $f$
begin
 if new.estado='aprobada' and (
   tg_op='INSERT' or (tg_op='UPDATE' and old.estado is distinct from new.estado)
 ) then
   perform public.goxion_b2_f4_registrar_evento('prorroga_activada',new.id);
 end if;
 return new;
end $f$;
drop trigger if exists gx_b2_f4_prorroga_confirmada on public.goxion_b2_prorrogas;
create trigger gx_b2_f4_prorroga_confirmada
 after insert or update of estado on public.goxion_b2_prorrogas
 for each row execute function public.goxion_b2_f4_evento_prorroga_trigger();

-- No se escribe un estado falso de "cumplida": se acredita cuando
-- el libro de cargos confirma liquidación y el corte sigue dentro del acuerdo.
create or replace function public.goxion_b2_f4_evento_pago_trigger()
 returns trigger language plpgsql security definer set search_path='' as $f$
declare a record;
begin
 if new.liquidado=true and (tg_op='INSERT' or old.liquidado is distinct from true) then
  select * into a from public.goxion_b2_prorrogas
  where cargo_id=new.id and estado='aprobada';
  if found and (now() at time zone 'America/Merida')::date<=a.fecha_pactada then
   perform public.goxion_b2_f4_registrar_evento('prorroga_cumplida',a.id);
  end if;
 end if;
 return new;
end $f$;
drop trigger if exists gx_b2_f4_prorroga_liquidada on public.goxion_b2_cargos;
create trigger gx_b2_f4_prorroga_liquidada
 after update of liquidado on public.goxion_b2_cargos
 for each row execute function public.goxion_b2_f4_evento_pago_trigger();

create or replace function public.goxion_b2_f4_claim_discord(p_limit integer default 5)
 returns table(evento_id uuid,tipo text,acuerdo_id uuid,cliente_id uuid,
 cliente_nombre text,folio text,fecha_original date,fecha_pactada date,
 cargo_id uuid,cuenta_intentos integer)
 language plpgsql security definer set search_path='' as $f$
begin
 if p_limit not between 1 and 20 then raise exception 'LIMITE_B2_F4_INVALIDO';end if;
 return query with locked as (
  select o.evento_id from public.goxion_b2_f4_discord_outbox o
  where (o.estado='pendiente' and o.proximo_intento<=now())
    or (o.estado='enviando' and o.bloqueado_en<now()-interval '5 minutes')
  order by o.proximo_intento,o.evento_id for update skip locked limit p_limit
 ),claimed as (
  update public.goxion_b2_f4_discord_outbox o
  set estado='enviando',bloqueado_en=now(),intentos=o.intentos+1
  from locked l where o.evento_id=l.evento_id
  returning o.evento_id,o.intentos
 )
 select e.id,e.tipo,e.acuerdo_id,e.cliente_id,c.nombre,c.folio,
  e.fecha_original,e.fecha_pactada,e.cargo_id,cl.intentos
 from claimed cl join public.goxion_b2_f4_eventos e on e.id=cl.evento_id
 join public.clientes c on c.id=e.cliente_id;
end $f$;

create or replace function public.goxion_b2_f4_finish_discord(
 p_evento_id uuid,p_ok boolean,p_error text default null
) returns jsonb language plpgsql security definer set search_path='' as $f$
declare i record;
begin
 if p_evento_id is null or p_ok is null then raise exception 'EVENTO_B2_F4_INVALIDO';end if;
 select * into i from public.goxion_b2_f4_discord_outbox
 where evento_id=p_evento_id for update;
 if not found then raise exception 'EVENTO_B2_F4_INEXISTENTE';end if;
 if i.estado='enviado' then return jsonb_build_object('ok',true,'repetida',true);end if;
 if i.estado<>'enviando' then raise exception 'EVENTO_B2_F4_NO_RECLAMADO';end if;
 update public.goxion_b2_f4_discord_outbox set
  estado=case when p_ok then 'enviado' else 'pendiente' end,
  enviado_en=case when p_ok then now() else null end,
  bloqueado_en=null,
  proximo_intento=case when p_ok then now()+interval '100 years'
    else now()+make_interval(secs=>least(3600,30*power(2,least(7,i.intentos))::integer)) end,
  ultimo_error=case when p_ok then null else left(coalesce(p_error,'Error de entrega'),250) end
 where evento_id=p_evento_id;
 return jsonb_build_object('ok',true,'enviado',p_ok,'reintento',not p_ok);
end $f$;
revoke all on function public.goxion_b2_f4_registrar_evento(text,uuid),
 public.goxion_b2_f4_claim_discord(integer),
 public.goxion_b2_f4_finish_discord(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.goxion_b2_f4_registrar_evento(text,uuid),
 public.goxion_b2_f4_claim_discord(integer),
 public.goxion_b2_f4_finish_discord(uuid,boolean,text) to service_role;
-- Privar también los entrypoints de triggers, aunque no son RPC invocables.
revoke all on function public.goxion_b2_f4_evento_prorroga_trigger(),
 public.goxion_b2_f4_evento_pago_trigger() from public,anon,authenticated;
grant execute on function public.goxion_b2_f4_evento_prorroga_trigger(),
 public.goxion_b2_f4_evento_pago_trigger() to service_role;
