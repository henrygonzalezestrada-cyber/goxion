-- K2: pilot transport only. Run first in isolated QA; no account is enrolled by this schema.
-- Business notification writers and all existing K1 tables/cron are left intact.
create table public.goxion_push_grants(
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  enabled boolean not null default false,
  expires_at timestamptz not null,
  granted_at timestamptz not null default now()
);
create table public.goxion_push_settings(
  singleton boolean primary key default true check(singleton),
  public_key text,
  private_secret_id uuid,
  dispatch_secret_id uuid not null
);
insert into public.goxion_push_settings(singleton,dispatch_secret_id)
values(true,vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'goxion_push_k2_dispatch','K2 isolated dispatch only',null));
create table public.goxion_push_devices(
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  endpoint text not null unique check(length(endpoint)<=2048),
  p256dh text not null check(length(p256dh)=87), auth_key text not null check(length(auth_key)=22),
  categories text[] not null check(cardinality(categories) between 1 and 4 and categories <@ array['cuenta','servicios','beneficios','importante']::text[]),
  created_at timestamptz not null default now(),
  preferences_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_test_at timestamptz
);
create index goxion_push_devices_owner on public.goxion_push_devices(cliente_id);
create table public.goxion_push_deliveries(
  device_id uuid not null references public.goxion_push_devices(id) on delete cascade,
  notification_id uuid not null references public.cliente_notificaciones(id) on delete cascade,
  state text not null default 'pending' check(state in ('pending','claimed','retry','accepted','failed')),
  attempts smallint not null default 0 check(attempts between 0 and 3),
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key(device_id,notification_id)
);
create index goxion_push_deliveries_due on public.goxion_push_deliveries(next_attempt_at) where state in ('pending','retry');
alter table public.goxion_push_grants enable row level security;
alter table public.goxion_push_settings enable row level security;
alter table public.goxion_push_devices enable row level security;
alter table public.goxion_push_deliveries enable row level security;
revoke all on public.goxion_push_grants,public.goxion_push_settings,public.goxion_push_devices,public.goxion_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.goxion_push_grants,public.goxion_push_settings,public.goxion_push_devices,public.goxion_push_deliveries to service_role;

-- Calls existing legal gate (read only). Fail closed when absent/blocked.
create function public.goxion_push_eligible(p_cliente_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(
  select 1 from public.goxion_push_grants g join public.clientes c on c.id=g.cliente_id
  where g.cliente_id=p_cliente_id and g.enabled and g.expires_at>now()
    and lower(coalesce(c.estado,''))<>'suspendido'
    and coalesce((public.goxion_legal_estado_acceso(c.id)->>'bloquea_operaciones')='false',false)
 );
$$;

create function public.goxion_push_category(p_tipo text) returns text
language sql immutable security invoker set search_path='' as $$
 select case when p_tipo in ('pago_acreditado','pago_incompleto','pago_rechazado','campana_pay') then 'cuenta'
 when p_tipo='cancelacion' then 'servicios'
 when p_tipo in ('cupon_disponible','campana_missions') then 'beneficios'
 when p_tipo='legal_actualizacion' then 'importante' else null end;
$$;

-- Service-only fixed Vault references, no generic secret access/RPC.
create function public.goxion_push_key_config() returns table(public_key text,private_key text,dispatch_secret text)
language sql stable security invoker set search_path='' as $$
 select s.public_key,v.decrypted_secret,d.decrypted_secret
 from public.goxion_push_settings s left join vault.decrypted_secrets v on v.id=s.private_secret_id
 join vault.decrypted_secrets d on d.id=s.dispatch_secret_id where s.singleton;
$$;
create function public.goxion_push_init_keys(p_public text,p_private text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare existing text;
begin
 if p_public !~ '^[A-Za-z0-9_-]{87}$' or p_private !~ '^[A-Za-z0-9_-]{43}$' then return false; end if;
 select s.public_key into existing from public.goxion_push_settings s where s.singleton for update;
 if existing is null then
  update public.goxion_push_settings set public_key=p_public,
   private_secret_id=vault.create_secret(p_private,'goxion_push_k2_vapid','K2 VAPID private key',null) where singleton;
 end if;
 return true;
end;
$$;

-- Enrollment is serialized by the gate row; endpoint reassignment is never automatic.
create function public.goxion_push_register(p_cliente_id uuid,p_endpoint text,p_p256dh text,p_auth text,p_categories text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.goxion_push_grants%rowtype; d public.goxion_push_devices%rowtype; result uuid;
begin
 select * into g from public.goxion_push_grants where cliente_id=p_cliente_id for update;
 if not found or not public.goxion_push_eligible(p_cliente_id) then return null; end if;
 if cardinality(p_categories) not between 1 and 4 or not(p_categories <@ array['cuenta','servicios','beneficios','importante']::text[]) then return null; end if;
 delete from public.goxion_push_devices where cliente_id=p_cliente_id and expires_at<=now();
 select * into d from public.goxion_push_devices where endpoint=p_endpoint;
 if found then
  if d.cliente_id<>p_cliente_id or d.p256dh<>p_p256dh or d.auth_key<>p_auth then return null; end if;
  update public.goxion_push_devices set categories=p_categories,preferences_at=now(),expires_at=least(g.expires_at,now()+interval '30 days') where id=d.id returning id into result;
  return result;
 end if;
 if (select count(*) from public.goxion_push_devices where cliente_id=p_cliente_id)>=2 then return null; end if;
 insert into public.goxion_push_devices(cliente_id,endpoint,p256dh,auth_key,categories,expires_at)
 values(p_cliente_id,p_endpoint,p_p256dh,p_auth,p_categories,least(g.expires_at,now()+interval '30 days')) returning id into result;
 return result;
end;
$$;

-- Only new, unread, eligible notices after the latest explicit device preferences; no credentials.
create function public.goxion_push_claim()
returns table(device_id uuid,notification_id uuid,attempt smallint)
language plpgsql security invoker set search_path='' as $$
begin
 delete from public.goxion_push_devices d where d.expires_at<=now();
 delete from public.goxion_push_deliveries l where l.created_at<now()-interval '7 days';
 -- Unknown result after crash: terminal, not sent again.
 update public.goxion_push_deliveries l set state='failed' where l.state='claimed' and l.claimed_at<now()-interval '5 minutes';
 insert into public.goxion_push_deliveries(device_id,notification_id)
 select d.id,n.id from public.goxion_push_devices d join public.cliente_notificaciones n on n.cliente_id=d.cliente_id
 where d.expires_at>now() and public.goxion_push_eligible(d.cliente_id)
   and n.leida_at is null and n.created_at>=greatest(d.created_at,d.preferences_at)
   and n.created_at>now()-interval '24 hours' and public.goxion_push_category(n.tipo)=any(d.categories)
   and not exists(select 1 from public.goxion_push_deliveries l where l.device_id=d.id and l.notification_id=n.id)
 order by n.created_at limit 40 on conflict do nothing;
 return query
 with due as (
  select l.device_id,l.notification_id from public.goxion_push_deliveries l
  where l.state in ('pending','retry') and l.next_attempt_at<=now() and l.attempts<3
  order by l.next_attempt_at limit 20 for update skip locked
 )
 update public.goxion_push_deliveries l set state='claimed',attempts=l.attempts+1,claimed_at=now()
 from due where (l.device_id,l.notification_id)=(due.device_id,due.notification_id)
 returning l.device_id,l.notification_id,l.attempts;
end;
$$;

-- Recheck at send time: consent, legal restriction, preferences, unread, freshness.
create function public.goxion_push_send_current(p_device uuid,p_notice uuid,p_attempt smallint)
returns table(endpoint text,p256dh text,auth_key text)
language sql stable security invoker set search_path='' as $$
 select d.endpoint,d.p256dh,d.auth_key from public.goxion_push_deliveries l
 join public.goxion_push_devices d on d.id=l.device_id join public.cliente_notificaciones n on n.id=l.notification_id and n.cliente_id=d.cliente_id
 where l.device_id=p_device and l.notification_id=p_notice and l.attempts=p_attempt and l.state='claimed'
 and d.expires_at>now() and public.goxion_push_eligible(d.cliente_id)
 and n.leida_at is null and n.created_at>=greatest(d.created_at,d.preferences_at)
 and n.created_at>now()-interval '24 hours' and public.goxion_push_category(n.tipo)=any(d.categories);
$$;
create function public.goxion_push_finish(p_device uuid,p_notice uuid,p_attempt smallint,p_result text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_result='gone' then
  delete from public.goxion_push_devices d where d.id=p_device and exists(
    select 1 from public.goxion_push_deliveries l where l.device_id=p_device and l.notification_id=p_notice and l.attempts=p_attempt and l.state='claimed');
 else
  update public.goxion_push_deliveries l set state=case when p_result='accepted' then 'accepted'
    when p_result='retryable' and p_attempt<3 then 'retry' else 'failed' end,
    next_attempt_at=now()+case when p_attempt=1 then interval '2 minutes' else interval '6 minutes' end
  where l.device_id=p_device and l.notification_id=p_notice and l.attempts=p_attempt and l.state='claimed';
 end if;
end;
$$;
revoke all on function public.goxion_push_eligible(uuid),public.goxion_push_category(text),
 public.goxion_push_key_config(),public.goxion_push_init_keys(text,text),public.goxion_push_register(uuid,text,text,text,text[]),
 public.goxion_push_claim(),public.goxion_push_send_current(uuid,uuid,smallint),public.goxion_push_finish(uuid,uuid,smallint,text) from public,anon,authenticated;
grant execute on function public.goxion_push_eligible(uuid),public.goxion_push_category(text),
 public.goxion_push_key_config(),public.goxion_push_init_keys(text,text),public.goxion_push_register(uuid,text,text,text,text[]),
 public.goxion_push_claim(),public.goxion_push_send_current(uuid,uuid,smallint),public.goxion_push_finish(uuid,uuid,smallint,text) to service_role;
