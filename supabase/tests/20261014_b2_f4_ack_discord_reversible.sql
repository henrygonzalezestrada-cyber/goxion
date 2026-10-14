-- F4 QA: la entrega exitosa no se puede despachar dos veces.
-- Datos preexistentes SOLO del entorno ficticio. Siempre ROLLBACK.
BEGIN;
DO $test$
DECLARE e uuid;payload record;result jsonb;
BEGIN
 update public.goxion_b2_f4_discord_outbox set proximo_intento=now()-interval '1 minute'
 where estado='pendiente';
 select evento_id into e from public.goxion_b2_f4_discord_outbox
 where estado='pendiente' order by creado_en limit 1;
 if e is null then raise exception 'El fixture requiere evento pendiente de QA';end if;
 select * into payload from public.goxion_b2_f4_claim_discord(5)
 where evento_id=e;
 if not found then raise exception 'Evento no reclamado';end if;
 result=public.goxion_b2_f4_finish_discord(e,true,null);
 if result->>'enviado'<>'true' then raise exception 'Evento no marcado enviado';end if;
 if exists(select 1 from public.goxion_b2_f4_claim_discord(5) where evento_id=e)
 then raise exception 'Se volvió a reclamar evento enviado';end if;
 result=public.goxion_b2_f4_finish_discord(e,true,null);
 if result->>'repetida'<>'true' then raise exception 'Confirmación de envío no idempotente';end if;
 if (select estado from public.goxion_b2_f4_discord_outbox where evento_id=e)<>'enviado'
 then raise exception 'Envío perdió su estado final';end if;
END $test$;
SELECT 'B2_F4_DISCORD_ACK_UNICO_PASS_ROLLBACK' resultado;
ROLLBACK;