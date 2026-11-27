-- Apply after push_k2_schema.sql in QA and before any production schedule.
-- pg_net retains HTTP headers until dispatch; never put the reusable Vault secret there.
create table public.goxion_push_tickets(
  digest text primary key check(length(digest)=64),
  expires_at timestamptz not null
);
alter table public.goxion_push_tickets enable row level security;
revoke all on public.goxion_push_tickets from public,anon,authenticated;
grant select,insert,delete on public.goxion_push_tickets to service_role;

create function public.goxion_push_issue_ticket() returns text
language plpgsql security invoker set search_path='' as $$
declare t text; k text;
begin
 delete from public.goxion_push_tickets where expires_at<=clock_timestamp();
 select c.dispatch_secret into strict k from public.goxion_push_key_config() c;
 t:=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into public.goxion_push_tickets(digest,expires_at)
 values(encode(extensions.hmac(t,k,'sha256'),'hex'),clock_timestamp()+interval '90 seconds');
 return t;
end;
$$;
create function public.goxion_push_consume_ticket(p_ticket text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare k text; consumed boolean;
begin
 if p_ticket is null or p_ticket !~ '^[0-9a-f-]{72}$' then return false; end if;
 select c.dispatch_secret into strict k from public.goxion_push_key_config() c;
 delete from public.goxion_push_tickets where digest=encode(extensions.hmac(p_ticket,k,'sha256'),'hex')
   and expires_at>clock_timestamp() returning true into consumed;
 return coalesce(consumed,false);
end;
$$;
revoke all on function public.goxion_push_issue_ticket(),public.goxion_push_consume_ticket(text) from public,anon,authenticated;
grant execute on function public.goxion_push_issue_ticket(),public.goxion_push_consume_ticket(text) to service_role;
