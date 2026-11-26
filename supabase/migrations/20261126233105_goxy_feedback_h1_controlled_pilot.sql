-- GOXION: feedback minimizado, sólo servicio autenticado por backend.
-- H1: pilot feedback, same validated QA storage; no raw text/image/identity in feedback records.
create schema goxy_learning;
revoke all on schema goxy_learning from public, anon, authenticated;
grant usage on schema goxy_learning to service_role;
create table goxy_learning.feedback (
 actor_key text not null check(actor_key ~ '^[a-f0-9]{64}$'),
 response_id uuid not null,
 topic text not null check(topic in ('identity','catalog','payment','missions','loyalty','promotions','cancel','support','policy','other')),
 source text not null check(source in ('local','official','ai','vision')),
 vote smallint not null check(vote in (-1,0,1)),
 reason text check(reason in ('understanding','incorrect','unresolved','repetitive','other')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(actor_key,response_id),
 check(vote=-1 or reason is null)
);
create index feedback_actor_created on goxy_learning.feedback(actor_key,created_at);
create index feedback_created on goxy_learning.feedback(created_at);
create table goxy_learning.monthly (
 month date not null,
 topic text not null,
 source text not null,
 vote smallint not null check(vote in (-1,1)),
 reason text not null check(reason in ('none','understanding','incorrect','unresolved','repetitive','other')),
 total bigint not null check(total>=0),
 primary key(month,topic,source,vote,reason)
);
alter table goxy_learning.feedback enable row level security;
alter table goxy_learning.monthly enable row level security;
revoke all on all tables in schema goxy_learning from public, anon, authenticated;
grant select,insert,update,delete on all tables in schema goxy_learning to service_role;

create function public.goxy_feedback_write(p_actor text,p_response uuid,p_topic text,p_source text,p_vote smallint,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
 old_row goxy_learning.feedback%rowtype;
 size_bytes bigint;
begin
 if p_actor is null or p_actor !~ '^[a-f0-9]{64}$' or p_response is null
 or p_topic is null or p_topic not in ('identity','catalog','payment','missions','loyalty','promotions','cancel','support','policy','other')
 or p_source is null or p_source not in ('local','official','ai','vision')
 or p_vote is null or p_vote not in (-1,0,1)
 or (p_reason is not null and (p_vote<>-1 or p_reason not in ('understanding','incorrect','unresolved','repetitive','other'))) then
  return jsonb_build_object('ok',false,'code','INVALID_FEEDBACK');
 end if;
 perform pg_advisory_xact_lock(741025,1);
 select * into old_row from goxy_learning.feedback where actor_key=p_actor and response_id=p_response;
 if found then
  if old_row.topic<>p_topic or old_row.source<>p_source then return jsonb_build_object('ok',false,'code','RESPONSE_MISMATCH'); end if;
  if old_row.vote=p_vote and old_row.reason is not distinct from p_reason then return jsonb_build_object('ok',true,'vote',p_vote,'unchanged',true); end if;
  if old_row.created_at<now()-interval '30 days' then return jsonb_build_object('ok',false,'code','EXPIRED'); end if;
  if old_row.updated_at>now()-interval '1 second' then return jsonb_build_object('ok',false,'code','FEEDBACK_PAUSE'); end if;
 else
  if p_vote=0 then return jsonb_build_object('ok',true,'vote',0,'unchanged',true); end if;
  if (select count(*) from goxy_learning.feedback where actor_key=p_actor and created_at>now()-interval '24 hours')>=20 then
   return jsonb_build_object('ok',false,'code','FEEDBACK_LIMIT');
  end if;
 end if;
 size_bytes:=pg_total_relation_size('goxy_learning.feedback'::regclass)+pg_total_relation_size('goxy_learning.monthly'::regclass);
 if size_bytes>=8*1024*1024 or pg_database_size(current_database())>=350*1024*1024 then
  return jsonb_build_object('ok',false,'code','LEARNING_CAPACITY');
 end if;
 insert into goxy_learning.feedback(actor_key,response_id,topic,source,vote,reason)
 values(p_actor,p_response,p_topic,p_source,p_vote,p_reason)
 on conflict(actor_key,response_id) do update set vote=excluded.vote,reason=excluded.reason,updated_at=now();
 return jsonb_build_object('ok',true,'vote',p_vote,'warning',size_bytes>=7*1024*1024);
end $$;
revoke all on function public.goxy_feedback_write(text,uuid,text,text,smallint,text) from public, anon, authenticated;
grant execute on function public.goxy_feedback_write(text,uuid,text,text,smallint,text) to service_role;

-- Consolidación explícita en lotes. No ejecutar automáticamente hasta validar scheduler.
-- El detalle de más de 30 días se agrega por mes, sin actor ni respuesta.
create function public.goxy_feedback_compact(p_limit integer default 500)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare n integer;
begin
 if p_limit is null or p_limit<1 or p_limit>1000 then return jsonb_build_object('ok',false,'code','INVALID_LIMIT'); end if;
 perform pg_advisory_xact_lock(741025,1);
 with picked as (
  select actor_key,response_id from goxy_learning.feedback
  where created_at<now()-interval '30 days' order by created_at limit p_limit
 ), removed as (
  delete from goxy_learning.feedback f using picked p where f.actor_key=p.actor_key and f.response_id=p.response_id
  returning f.created_at,f.topic,f.source,f.vote,f.reason
 ), merged as (
  insert into goxy_learning.monthly(month,topic,source,vote,reason,total)
  select date_trunc('month',created_at at time zone 'UTC')::date,topic,source,vote,coalesce(reason,'none'),count(*)
  from removed where vote<>0 group by 1,2,3,4,5
  on conflict(month,topic,source,vote,reason) do update set total=goxy_learning.monthly.total+excluded.total
  returning 1
 )
 select count(*) into n from removed;
 return jsonb_build_object('ok',true,'removed',n);
end $$;
revoke all on function public.goxy_feedback_compact(integer) from public, anon, authenticated;
grant execute on function public.goxy_feedback_compact(integer) to service_role;

-- Only database administration may enable the pilot. No account is seeded here.
create table goxy_learning.pilot_clients (
 client_id uuid primary key,
 expires_at timestamptz not null
);
alter table goxy_learning.pilot_clients enable row level security;
revoke all on goxy_learning.pilot_clients from public, anon, authenticated, service_role;
grant select on goxy_learning.pilot_clients to service_role;

-- Single server-only wrapper: authorization precedes the existing writer.
-- Null feedback inputs are the non-mutating readiness probe.
create function public.goxy_feedback_pilot(p_client_id uuid,p_actor text,p_response uuid,p_topic text,p_source text,p_vote smallint,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if p_client_id is null or not exists(
  select 1 from goxy_learning.pilot_clients
  where client_id=p_client_id and expires_at>now()
 ) then
  return jsonb_build_object('ok',false,'code','PILOT_REQUIRED');
 end if;
 return public.goxy_feedback_write(p_actor,p_response,p_topic,p_source,p_vote,p_reason);
end $$;
revoke all on function public.goxy_feedback_pilot(uuid,text,uuid,text,text,smallint,text) from public,anon,authenticated;
grant execute on function public.goxy_feedback_pilot(uuid,text,uuid,text,text,smallint,text) to service_role;
