-- GOXION Goxy F7 · cuota de IA de beta, exclusivamente para clientes válidos.
-- No toca tablas financieras ni permite acceso desde anon/authenticated.
create table if not exists public.goxy_ai_beta_requests (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists goxy_ai_beta_requests_lookup
  on public.goxy_ai_beta_requests (cliente_id, created_at desc);
alter table public.goxy_ai_beta_requests enable row level security;
revoke all on public.goxy_ai_beta_requests from public, anon, authenticated;
revoke all on sequence public.goxy_ai_beta_requests_id_seq from public, anon, authenticated;
grant select, insert on public.goxy_ai_beta_requests to service_role;
grant usage on sequence public.goxy_ai_beta_requests_id_seq to service_role;

create or replace function public.goxy_ai_beta_take_quota(p_cliente_id uuid)
returns table(allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_total integer;
  v_previous timestamptz;
  v_short integer;
begin
  if p_cliente_id is null then
    return query select false, 0, 60; return;
  end if;
  -- La función no sustituye la verificación HMAC y la comprobación del estado
  -- del cliente en la Edge Function. No aceptar solicitudes desde el navegador.
  perform pg_advisory_xact_lock(hashtextextended(p_cliente_id::text, 307));
  select count(*)::integer, max(created_at)
    into v_total, v_previous
  from public.goxy_ai_beta_requests
  where cliente_id = p_cliente_id
    and created_at > v_now - interval '24 hours';
  if v_total >= 8 then
    return query select false, 0, 3600; return;
  end if;
  if v_previous is not null and v_previous > v_now - interval '20 seconds' then
    v_short := greatest(1, ceil(extract(epoch from (v_previous + interval '20 seconds' - v_now)))::integer);
    return query select false, greatest(0,8-v_total), v_short; return;
  end if;
  insert into public.goxy_ai_beta_requests(cliente_id,created_at) values(p_cliente_id,v_now);
  return query select true, greatest(0,7-v_total), 0;
end;
$$;
revoke all on function public.goxy_ai_beta_take_quota(uuid) from public, anon, authenticated;
grant execute on function public.goxy_ai_beta_take_quota(uuid) to service_role;
comment on table public.goxy_ai_beta_requests is 'Beta Goxy: solo contadores de llamadas, nunca mensajes ni historiales';
