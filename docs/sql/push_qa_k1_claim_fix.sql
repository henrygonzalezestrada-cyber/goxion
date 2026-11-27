create or replace function public.goxion_push_qa_claim()
returns table(device_id uuid,notification_id uuid,endpoint text,p256dh text,auth_key text,tipo text)
language sql security invoker set search_path='' as $$
 with candidates as (
   select d.id did,n.id nid,n.tipo
   from public.goxion_push_qa_devices d
   join public.clientes c on c.id=d.cliente_id
   join public.cliente_notificaciones n on n.cliente_id=d.cliente_id
   where lower(c.usuario_acceso) in ('qa-v2-finanzas','qa-v2-b2','qa-v2-beneficios','qa-v2-beneficios-retest','qa-v2-vencido','qa-v2-nuevo') and lower(coalesce(c.estado,''))<>'suspendido'
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
