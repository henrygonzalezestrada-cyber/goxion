-- K2 only; apply production schedule after pilot authorization and database/Edge verification.
-- Do not apply to QA; K1 stays untouched.
select cron.schedule('goxion-push-k2','*/2 * * * *',$$
 select net.http_post(url:='https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/push-cliente',
 headers:=jsonb_build_object('Content-Type','application/json','x-gx-dispatch',v.decrypted_secret),
 body:='{"accion":"dispatch"}'::jsonb,timeout_milliseconds:=120000)
 from public.goxion_push_settings s join vault.decrypted_secrets v on v.id=s.dispatch_secret_id
 where s.singleton and exists(select 1 from public.goxion_push_devices)
$$);
-- Stop without data loss: select cron.unschedule('goxion-push-k2');
