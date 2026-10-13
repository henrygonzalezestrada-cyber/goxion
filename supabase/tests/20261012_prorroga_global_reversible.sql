-- GOXION · Prórroga global (fecha 15→18 octubre), reversible.
BEGIN;
DO $test$
declare cid uuid:=gen_random_uuid();sid uuid;
 before jsonb;grace jsonb;expired jsonb;
begin
 select id into sid from public.servicios where activo order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'PR'||substr(cid::text,1,8),'PR'||substr(cid::text,10,4),
 'PRORROGA GLOBAL PRUEBA ROLLBACK',15,'pendiente','2026-10-01',10);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Prueba plataforma única',49,true);
 insert into public.acuerdos_cobro(cliente_id,periodo,fecha_original,
   fecha_pactada,motivo,activo,estado,operation_id)
 values(cid,'2026-10-01','2026-10-15','2026-10-18','Prórroga de 3 días',true,'activo',gen_random_uuid());
 before=public.goxion_estado_financiero(cid,'2026-10-15');
 grace=public.goxion_estado_financiero(cid,'2026-10-18');
 expired=public.goxion_estado_financiero(cid,'2026-10-19');
 if coalesce((grace->'cargos'->>'mora')::numeric,0)<>0 or
    coalesce((grace->'lealtad'->>'porcentaje')::numeric,0)<>6 then
   raise exception 'Prórroga vigente no protegió lealtad: %',grace;end if;
 if coalesce((expired->'cargos'->>'mora')::numeric,0)<>10
   or coalesce((expired->'lealtad'->>'porcentaje')::numeric,0)<>0 then
   raise exception 'No aplicó 4 días de mora retroactiva o no perdió lealtad: %',expired;end if;
 if (grace->>'fecha_corte')::date<>'2026-10-18'::date
    or (expired->>'fecha_corte')::date<>'2026-10-15'::date then
   raise exception 'No revirtió corte a la fecha original tras incumplir';end if;
end $test$;
select 'GOXION_PRORROGA_GLOBAL_RETRO_PASS' resultado;
ROLLBACK;