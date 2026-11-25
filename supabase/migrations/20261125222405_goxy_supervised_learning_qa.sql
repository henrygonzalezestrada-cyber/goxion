-- QA only. No historical conversation content, no automatic approval.
create table goxy_learning.reviewed_routes (
 platform text not null check(platform in ('Netflix','Disney+','Max','Prime Video','YouTube','ViX','Crunchyroll','Microsoft','Google One')),
 alias_key text not null check(length(alias_key) between 8 and 80 and alias_key ~ '^[a-z]+( [a-z]+)*$'),
 guide_id integer not null check(guide_id between 0 and 20),
 source_revision text not null check(source_revision ~ '^[a-f0-9]{40}$'),
 state text not null default 'candidate' check(state in ('candidate','approved','revoked')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 expires_at timestamptz,
 primary key(platform,alias_key),
 check((state='candidate' and reviewed_at is null and expires_at is null) or
 (state='approved' and reviewed_at is not null and expires_at is not null and expires_at>reviewed_at and expires_at<=reviewed_at+interval '90 days') or state='revoked')
);
alter table goxy_learning.reviewed_routes enable row level security;
revoke all on goxy_learning.reviewed_routes from public,anon,authenticated;
grant select,insert,update,delete on goxy_learning.reviewed_routes to service_role;

create function goxy_learning.size_bytes() returns bigint
language sql stable security invoker set search_path=pg_catalog as $$
 select coalesce(sum(pg_total_relation_size(c.oid)),0)::bigint
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='goxy_learning' and c.relkind='r'
$$;
revoke all on function goxy_learning.size_bytes() from public,anon,authenticated;
grant execute on function goxy_learning.size_bytes() to service_role;

create function goxy_learning.guard_route() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
 perform pg_advisory_xact_lock(741025,1);
 if new.state='approved' and (new.reviewed_at>now() or new.expires_at<=now()) then
  raise exception 'INVALID_REVIEW_WINDOW';
 end if;
 if tg_op='INSERT' then
  if (select count(*) from goxy_learning.reviewed_routes)>=500 or goxy_learning.size_bytes()>=8*1024*1024 or pg_database_size(current_database())>=350*1024*1024 then
   raise exception 'LEARNING_CAPACITY';
  end if;
 elsif old.state='approved' and (new.guide_id<>old.guide_id or new.source_revision<>old.source_revision or new.alias_key<>old.alias_key or new.platform<>old.platform) and new.state='approved' then
  raise exception 'REVIEW_REQUIRED';
 end if;
 return new;
end $$;
revoke all on function goxy_learning.guard_route() from public,anon,authenticated;
grant execute on function goxy_learning.guard_route() to service_role;
create trigger goxy_route_guard before insert or update on goxy_learning.reviewed_routes for each row execute function goxy_learning.guard_route();

-- Exact matching only. Caller must also check canonical platform/id and revision against bundled guide.
create function public.goxy_verified_route(p_platform text,p_alias text,p_revision text) returns jsonb
language sql stable security invoker set search_path=pg_catalog as $$
 select coalesce((select jsonb_build_object('ok',true,'guide_id',guide_id,'platform',platform,'source_revision',source_revision)
 from goxy_learning.reviewed_routes
 where platform=p_platform and alias_key=p_alias and source_revision=p_revision
 and state='approved' and reviewed_at<=now() and expires_at>now()),
 jsonb_build_object('ok',false,'code','NO_VERIFIED_ROUTE'))
$$;
revoke all on function public.goxy_verified_route(text,text,text) from public,anon,authenticated;
grant execute on function public.goxy_verified_route(text,text,text) to service_role;

-- Counts indicate review priorities, not correctness. No raw actor IDs or text in output.
-- A minimum of five negative ratings from at least three actors in 30 days.
create function public.goxy_learning_review_queue() returns jsonb
language sql stable security invoker set search_path=pg_catalog as $$
 with negative as (
  select topic,source,coalesce(reason,'none') as reason,count(*) as negatives,count(distinct actor_key) as actors
  from goxy_learning.feedback where vote=-1 and created_at>=now()-interval '30 days'
  group by topic,source,coalesce(reason,'none') having count(*)>=5 and count(distinct actor_key)>=3
 ), totals as (
  select topic,source,count(*) as votes from goxy_learning.feedback
  where vote<>0 and created_at>=now()-interval '30 days' group by topic,source
 )
 select coalesce(jsonb_agg(jsonb_build_object('topic',n.topic,'source',n.source,'reason',n.reason,'negative_votes',n.negatives,'distinct_actors',n.actors,'total_votes',t.votes,'status','review_required') order by n.negatives desc,n.topic,n.source,n.reason),'[]'::jsonb)
 from negative n join totals t using(topic,source)
$$;
revoke all on function public.goxy_learning_review_queue() from public,anon,authenticated;
grant execute on function public.goxy_learning_review_queue() to service_role;

-- Bounded maintenance: existing 30-day compaction, expired candidates/revocations,
-- aggregates retained 12 calendar months. Approved guides are never deleted here.
create function public.goxy_learning_maintain() returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare compact jsonb; removed_routes integer; removed_months integer; size_bytes bigint;
begin
 perform pg_advisory_xact_lock(741025,1);
 compact:=public.goxy_feedback_compact(500);
 with picked as (select platform,alias_key from goxy_learning.reviewed_routes where state in ('candidate','revoked') and coalesce(reviewed_at,created_at)<now()-interval '90 days' order by created_at limit 100)
 delete from goxy_learning.reviewed_routes r using picked p where r.platform=p.platform and r.alias_key=p.alias_key;
 get diagnostics removed_routes=row_count;
 with picked as (select month,topic,source,vote,reason from goxy_learning.monthly where month<(date_trunc('month',now() at time zone 'UTC')-interval '12 months')::date order by month limit 500)
 delete from goxy_learning.monthly m using picked p where (m.month,m.topic,m.source,m.vote,m.reason)=(p.month,p.topic,p.source,p.vote,p.reason);
 get diagnostics removed_months=row_count;
 size_bytes:=goxy_learning.size_bytes();
 return jsonb_build_object('ok',true,'compacted',compact,'removed_routes',removed_routes,'removed_monthly',removed_months,'bytes',size_bytes,'warning',size_bytes>=7*1024*1024,'paused',size_bytes>=8*1024*1024 or pg_database_size(current_database())>=350*1024*1024);
end $$;
revoke all on function public.goxy_learning_maintain() from public,anon,authenticated;
grant execute on function public.goxy_learning_maintain() to service_role;
create or replace function public.goxy_feedback_write(p_actor text,p_response uuid,p_topic text,p_source text,p_vote smallint,p_reason text default null)
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
 size_bytes:=goxy_learning.size_bytes();
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
