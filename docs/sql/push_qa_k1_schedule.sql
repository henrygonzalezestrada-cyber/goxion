-- Only run on the isolated QA project nsvybyvvdpdgbgtvydfb.
-- One job, no production calls. Private dispatch token never leaves server storage.
select cron.schedule('goxion-push-qa-k1','*/2 * * * *',$$
  select net.http_post(
    url:='https://nsvybyvvdpdgbgtvydfb.supabase.co/functions/v1/push-cliente-qa',
    headers:=jsonb_build_object('Content-Type','application/json','x-gx-dispatch',dispatch_secret::text),
    body:='{"accion":"dispatch"}'::jsonb,
    timeout_milliseconds:=120000
  ) from public.goxion_push_qa_config
  where singleton and exists(select 1 from public.goxion_push_qa_devices where expires_at>now())
$$);
-- To disable without data loss: select cron.unschedule('goxion-push-qa-k1');
