-- E2E atómico B2 con cliente ficticio. Requiere migraciones 013 y 014.
-- No usar COMMIT: pagos, calendarios, racha y auditoría se revierten.
BEGIN;
DO $fixture$
DECLARE cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;cy uuid;
 x record;y record; a int;b int; d jsonb; k1 uuid:=gen_random_uuid();k2 uuid:=gen_random_uuid();
 v_rechazo boolean:=false;
BEGIN
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'B2'||substr(cid::text,1,8),'B2'||substr(cid::text,10,4),'B2 TEST ROLLBACK',15,'pendiente','2026-10-01',0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Plataforma A',49,true),(cid,sid2,'Plataforma B',45,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,
 cliente_id,cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select ac.id,ac.cliente_servicio_id,cid,
 case when row_number()over(order by ac.id)=1 then '2026-10-05'::date else '2026-10-15'::date end,
 case when row_number()over(order by ac.id)=1 then 5 else 15 end,
 round(s.monto*100)::int,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos ac join public.cliente_servicios s on s.id=ac.cliente_servicio_id
 where ac.cliente_id=cid and ac.activo;
 insert into public.goxion_b2_regimen_cliente(cliente_id,activo,periodo_inicio,autorizado_por)
 values(cid,true,'2026-10-01','test_rollback');
 d=public.goxion_b2_iniciar_ciclo(cid,'2026-10-01');
 if d->>'ok'<>'true' then raise exception 'No creó ciclo: %',d;end if;
 cy=(d->>'ciclo_id')::uuid;
 select * into x from public.goxion_b2_cargos where ciclo_id=cy order by fecha_vencimiento asc limit 1;
 select * into y from public.goxion_b2_cargos where ciclo_id=cy order by fecha_vencimiento desc limit 1;
 d=public.goxion_b2_cotizar_ciclo(cid,'2026-10-01','2026-10-12');
 select (j->>'total_centavos')::int into a from jsonb_array_elements(d->'cargos') j
 where j->>'cargo_id'=x.id::text;
 select (j->>'total_centavos')::int into b from jsonb_array_elements(d->'cargos') j
 where j->>'cargo_id'=y.id::text;
 if a<>x.base_centavos+round(x.base_centavos*.35)::int or b<>y.base_centavos then
 raise exception 'Mora independiente no conciliada: A %, B %',a,b;end if;
 -- Ni Admin heredado ni un request duplicado pueden cobrar globalmente B2.
 begin
  insert into public.pagos(cliente_id,periodo,monto,estado,notas,fecha)
  values(cid,'octubre de 2026',94,'pagado','Doble cargo rechazado',current_date);
 exception when others then
   if sqlerrm like 'CLIENTE_MULTIFECHA:%' then v_rechazo=true;
   else raise;end if;
 end;
 if not v_rechazo then raise exception 'La aprobación global B2 quedó desprotegida';end if;
 d=public.goxion_b2_aprobar_abono(cid,x.id,a,a,k1,'fixture');
 if d->>'ok'<>'true' or d->>'ciclo_liquidado'<>'false' then raise exception 'Cierre prematuro %',d;end if;
 d=public.goxion_b2_aprobar_abono(cid,y.id,b,b,k2,'fixture');
 if d->>'ok'<>'true' or d->>'ciclo_liquidado'<>'true' then raise exception 'No liquidó %',d;end if;
 if (select count(*) from public.pagos where cliente_id=cid and estado='pagado')<>1 then
 raise exception 'Duplicó comprobante consolidado';end if;
 if (select pagos_puntuales from public.clientes where id=cid)<>0 then
 raise exception 'No reinició lealtad global';end if;
 d=public.goxion_b2_aprobar_abono(cid,x.id,a,a,k1,'fixture');
 if d->>'repetida'<>'true' then raise exception 'Reintento acreditó de nuevo';end if;
 if (select count(*) from public.goxion_b2_abonos_aprobados where cliente_id=cid)<>2 then
 raise exception 'Duplicó movimiento B2';end if;
END $fixture$;
SELECT 'B2_E2E_PASS_ROLLBACK' AS resultado;
ROLLBACK;
