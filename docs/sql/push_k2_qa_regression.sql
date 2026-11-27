-- Run ONLY in isolated QA, with no K2 grants/devices. This test leaves no fixture.
begin;
do $test$
declare cid uuid; did uuid; nid uuid; second_id uuid; n integer; a smallint; st text;
begin
 select id into strict cid from public.clientes where usuario_acceso='qa-v2-push-k1';
 if public.goxion_push_eligible(cid) then raise exception 'gate default open'; end if;
 insert into public.goxion_push_grants(cliente_id,enabled,expires_at) values(cid,true,now()+interval '14 days');
 if not public.goxion_push_eligible(cid) then raise exception 'eligibility'; end if;
 did:=public.goxion_push_register(cid,'https://fcm.googleapis.com/k2-fake-1',repeat('a',87),repeat('b',22),array['cuenta','servicios','importante']);
 second_id:=public.goxion_push_register(cid,'https://fcm.googleapis.com/k2-fake-2',repeat('a',87),repeat('b',22),array['servicios']);
 if did is null or second_id is null or public.goxion_push_register(cid,'https://fcm.googleapis.com/k2-fake-3',repeat('a',87),repeat('b',22),array['cuenta']) is not null then raise exception 'device cap'; end if;
 insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,created_at) values
 (cid,'pago_acreditado','K2 SQL fixture','Synthetic QA',now()+interval '1 second') returning id into nid;
 insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,created_at) values
 (cid,'campana_missions','K2 SQL fixture','Synthetic QA',now()+interval '1 second'),
 (cid,'pago_acreditado','K2 SQL fixture','Synthetic QA',now()-interval '1 minute');
 select count(*),max(attempt) into n,a from public.goxion_push_claim() where device_id=did and notification_id=nid;
 if n<>1 or a<>1 or (select count(*) from public.goxion_push_deliveries)<>1 then raise exception 'selection/cutoff'; end if;
 if (select count(*) from public.goxion_push_send_current(did,nid,1::smallint))<>1 then raise exception 'send check'; end if;
 if (select count(*) from public.goxion_push_claim())<>0 then raise exception 'duplicate claim'; end if;
 perform public.goxion_push_finish(did,nid,1::smallint,'retryable');
 if (select count(*) from public.goxion_push_claim())<>0 then raise exception 'backoff'; end if;
 update public.goxion_push_deliveries set next_attempt_at=now() where device_id=did and notification_id=nid;
 select attempt into a from public.goxion_push_claim() where device_id=did and notification_id=nid;
 if a<>2 then raise exception 'retry2'; end if;
 perform public.goxion_push_finish(did,nid,2::smallint,'retryable');
 update public.goxion_push_deliveries set next_attempt_at=now() where device_id=did and notification_id=nid;
 select attempt into a from public.goxion_push_claim() where device_id=did and notification_id=nid;
 if a<>3 then raise exception 'retry3'; end if;
 update public.goxion_push_grants set enabled=false where cliente_id=cid;
 if public.goxion_push_eligible(cid) or (select count(*) from public.goxion_push_send_current(did,nid,3::smallint))<>0 then raise exception 'gate revoked'; end if;
 perform public.goxion_push_finish(did,nid,3::smallint,'retryable');
 select state into st from public.goxion_push_deliveries where device_id=did and notification_id=nid;
 if st<>'failed' then raise exception 'retry cap'; end if;
 update public.goxion_push_grants set enabled=true,expires_at=now()-interval '1 second' where cliente_id=cid;
 if public.goxion_push_eligible(cid) then raise exception 'expired gate'; end if;
end $test$;
rollback;
