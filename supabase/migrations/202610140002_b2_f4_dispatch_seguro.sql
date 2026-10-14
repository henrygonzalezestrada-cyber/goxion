-- GOXION B2 F4 · Autorización de cron sin exponer service_role ni Discord.
-- Instalar sólo el endpoint correspondiente a CADA proyecto antes de programar cron.
create schema if not exists goxion_internal;
revoke all on schema goxion_internal from public, anon, authenticated;
create table if not exists goxion_internal.b2_f4_dispatch_secreto(
 id integer primary key default 1 check(id=1),
 clave text not null check(length(clave)=64),
 endpoint text,
 creado_en timestamptz not null default now()
);
revoke all on goxion_internal.b2_f4_dispatch_secreto from public,anon,authenticated;
insert into goxion_internal.b2_f4_dispatch_secreto(id,clave)
values(1,encode(extensions.gen_random_bytes(32),'hex'))
on conflict (id) do nothing;

create or replace function public.goxion_b2_f4_autorizar_dispatch(p_token text)
returns boolean language sql security definer set search_path='' as $q$
 select length(coalesce(p_token,''))=64 and exists (
  select 1 from goxion_internal.b2_f4_dispatch_secreto s
  where s.id=1
   and encode(extensions.digest(p_token,'sha256'),'hex') =
       encode(extensions.digest(s.clave,'sha256'),'hex')
 );
$q$;
revoke all on function public.goxion_b2_f4_autorizar_dispatch(text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_f4_autorizar_dispatch(text) to service_role;

-- pg_net ejecuta HTTP sin bloquear transacciones financieras.
create extension if not exists pg_net;
