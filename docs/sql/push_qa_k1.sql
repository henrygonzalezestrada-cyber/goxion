-- K1: isolated QA only. No business writers, triggers or financial changes.
-- Separate device subscriptions and delivery journal. No public client access.
create table public.goxion_push_qa_config(
  singleton boolean primary key default true check(singleton),
  public_key text, private_key text,
  dispatch_secret uuid not null default gen_random_uuid()
);
insert into public.goxion_push_qa_config(singleton) values(true);
create table public.goxion_push_qa_devices(
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  endpoint text not null unique check(length(endpoint)<=2048),
  p256dh text not null, auth_key text not null,
  created_at timestamptz not null default now(),
  last_test_at timestamptz,
  expires_at timestamptz not null default now()+interval '30 days'
);
create index goxion_push_qa_devices_cliente on public.goxion_push_qa_devices(cliente_id);
create table public.goxion_push_qa_deliveries(
  device_id uuid not null references public.goxion_push_qa_devices(id) on delete cascade,
  notification_id uuid not null,
  claimed_at timestamptz not null default now(),
  state text not null default 'claimed' check(state in ('claimed','accepted','failed')),
  primary key(device_id,notification_id)
);
alter table public.goxion_push_qa_config enable row level security;
alter table public.goxion_push_qa_devices enable row level security;
alter table public.goxion_push_qa_deliveries enable row level security;
revoke all on public.goxion_push_qa_config,public.goxion_push_qa_devices,public.goxion_push_qa_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.goxion_push_qa_config,public.goxion_push_qa_devices,public.goxion_push_qa_deliveries to service_role;
-- Claim exactly once. Only recent unread notices created AFTER explicit consent.
-- No raw message/title, amounts, credentials, client name or service identifiers leave the database.
create function public.goxion_push_qa_claim()
returns table(device_id uuid,notification_id uuid,endpoint text,p256dh text,auth_key text,tipo text)
language sql security invoker set search_path='' as $$
 with candidates as (
   select d.id did,n.id nid,n.tipo
   from public.goxion_push_qa_devices d
   join public.clientes c on c.id=d.cliente_id
   join public.cliente_notificaciones n on n.cliente_id=d.cliente_id
   where lower(c.nombre) like 'qa-v2-%' and lower(coalesce(c.estado,''))<>'suspendido'
     and d.expires_at>now() and n.created_at>=d.created_at
     and n.created_at>now()-interval '24 hours' and n.leida_at is null
     and n.tipo in ('pago_acreditado','pago_incompleto','pago_rechazado','campana_pay','cancelacion','cupon_disponible','campana_missions','legal_actualizacion')
     and not exists(select 1 from public.goxion_push_qa_deliveries l where l.device_id=d.id and l.notification_id=n.id)
   order by n.created_at asc limit 40
 ), claimed as (
   insert into public.goxion_push_qa_deliveries(device_id,notification_id)
   select did,nid from candidates on conflict do nothing returning device_id,notification_id
 )
 select c.device_id,c.notification_id,d.endpoint,d.p256dh,d.auth_key,n.tipo
 from claimed c join public.goxion_push_qa_devices d on d.id=c.device_id
 join public.cliente_notificaciones n on n.id=c.notification_id;
$$;
revoke all on function public.goxion_push_qa_claim() from public,anon,authenticated;
grant execute on function public.goxion_push_qa_claim() to service_role;
