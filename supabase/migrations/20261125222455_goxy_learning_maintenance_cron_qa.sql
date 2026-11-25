-- QA only: bounded maintenance; no Edge requests, no AI, no business data.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('goxy-learning-maintenance-qa','15 3,15 * * *','select public.goxy_learning_maintain();');
