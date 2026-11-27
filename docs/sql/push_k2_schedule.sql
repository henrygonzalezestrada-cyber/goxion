-- K2 only; apply production schedule after pilot authorization and database/Edge verification.
-- Do not apply to QA; K1 stays untouched.
select cron.schedule('goxion-push-k2','*/2 * * * *',$$
 select net.http_post(url:='https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/push-cliente',
 headers:=jsonb_build_object('Content-Type','application/json','x-gx-dispatch',public.goxion_push_issue_ticket()),
 body:='{"accion":"dispatch"}'::jsonb,timeout_milliseconds:=120000)
 where exists(select 1 from public.goxion_push_devices)
$$);
-- Stop without data loss: select cron.unschedule('goxion-push-k2');
