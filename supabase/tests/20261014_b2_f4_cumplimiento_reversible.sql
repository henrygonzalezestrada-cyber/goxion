-- GOXION B2 F2 · prórroga automática desde la fecha real de SQL.
-- Fixture totalmente ficticio, siempre BEGIN/ROLLBACK. No altera clientes.
BEGIN;
DO $test$
DECLARE
 cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;cy uuid; c1 uuid;
 today_local date:=(now() at time zone 'America/Merida')::date;
 period_local date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 d jsonb; q jsonb; qlate jsonb; request_id uuid:=gen_random_uuid();
 reject_ok boolean:=false; amount_today integer; amount_extended integer;
BEGIN
 if extract(day from today_local)>20 then
  raise exception 'Fixture requiere margen de 8 días en el mes vigente';
 end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 if sid is null or sid2 is null then raise exception 'Faltan dos servicios activos';end if;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'PX'||substr(cid::text,1,8),'PX'||substr(cid::text,10,4),
 'B2 PRORROGA AUTO REVERSIBLE',extract(day from today_local)::integer,'pendiente',period_local,10);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'Plataforma prueba A',49,true),(cid,sid2,'Plataforma prueba B',45,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,cliente_id,
 cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select a.id,a.cliente_servicio_id,cid,
 case when row_number()over(order by a.id)=1 then today_local else today_local+8 end,
 case when row_number()over(order by a.id)=1
      then extract(day from today_local)::integer
      else extract(day from today_local+8)::integer end,
 round(s.monto*100)::integer,'verificado',now(),'fixture_rollback',1
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
 where a.cliente_id=cid and a.activo;
 d=public.goxion_b2_activar_cliente(cid,period_local,true,'admin:fixture');
 if d->>'regimen_activo'<>'true' then raise exception 'B2 no activó fixture';end if;
 cy=(d->>'ciclo_id')::uuid;
 select id into c1 from public.goxion_b2_cargos
 where ciclo_id=cy order by fecha_vencimiento,id limit 1;
 if c1 is null then raise exception 'No se creó primer cargo';end if;
 -- El servidor NO acepta una fecha pasada ni mayor a cinco días.
 reject_ok=false;
 begin
  perform public.goxion_b2_solicitar_prorroga(
   cid,c1,today_local+6,gen_random_uuid(),'Fuera de plazo');
 exception when others then
  if sqlerrm like 'PRORROGA_FUERA_DE_PLAZO%' then reject_ok=true; else raise; end if;
 end;
 if not reject_ok then raise exception 'Se autorizó una extensión de seis días';end if;
 q=public.goxion_prorroga_auto_cotizar(cid,today_local+3,c1);
 if q->>'ok'<>'true' or q->>'requiere_admin'<>'false' then
  raise exception 'La cotización no es automática %',q;end if;
 d=public.goxion_b2_solicitar_prorroga(
  cid,c1,today_local+3,request_id,'Acuerdo B2 de tres días');
 if d->>'estado'<>'aprobada' or d->>'requiere_aprobacion_admin'<>'false' then
  raise exception 'Solicitud no se aprobó automáticamente %',d;end if;
 d=public.goxion_b2_solicitar_prorroga(
  cid,c1,today_local+3,request_id,'Acuerdo B2 de tres días');
 if d->>'repetida'<>'true' then raise exception 'Idempotencia de prórroga no funcionó';end if;
 reject_ok=false;
 begin
  perform public.goxion_b2_solicitar_prorroga(
   cid,c1,today_local+2,gen_random_uuid(),'Otro acuerdo');
 exception when others then
  if sqlerrm like 'PRORROGA_USADA_EN_ESTE_CICLO%' then reject_ok=true;else raise;end if;
 end;
 if not reject_ok then raise exception 'Permitió una segunda prórroga del período';end if;
 q=public.goxion_b2_cotizar_ciclo(cid,period_local,today_local+3);
 qlate=public.goxion_b2_cotizar_ciclo(cid,period_local,today_local+4);
 if q->>'lealtad_global_perdida'<>'false' or
   qlate->>'lealtad_global_perdida'<>'true' then
  raise exception 'La lealtad no respeta el acuerdo';end if;
 select (item->>'total_centavos')::integer into amount_extended
 from jsonb_array_elements(q->'cargos') item where item->>'cargo_id'=c1::text;
 select (item->>'total_centavos')::integer into amount_today
 from jsonb_array_elements(qlate->'cargos') item where item->>'cargo_id'=c1::text;
 if amount_extended<>(select base_centavos-descuento_original_centavos
                          from public.goxion_b2_cargos where id=c1)
    or amount_today<=amount_extended then
  raise exception 'Mora retroactiva incorrecta: gracia %, vencido %',
    amount_extended,amount_today;end if;
 if (select count(*) from public.goxion_b2_prorrogas where cliente_id=cid)<>1
 then raise exception 'Hubo prórrogas duplicadas';end if;
 -- Cobro puntual sobre el cargo prorrogado: se registra un evento
 -- de cumplimiento, sin segundo aviso de activación ni segunda lealtad.
 q=public.goxion_b2_cotizar_ciclo(cid,period_local,today_local);
 select (item->>'total_centavos')::integer into amount_today
 from jsonb_array_elements(q->'cargos') item where item->>'cargo_id'=c1::text;
 d=public.goxion_b2_aprobar_abono(cid,c1,amount_today,amount_today,
    gen_random_uuid(),'Liquidación puntual F4');
 if d->>'ok'<>'true' then raise exception 'No se acreditó pago puntual %',d;end if;
 if (select count(*) from public.goxion_b2_f4_eventos
     where cliente_id=cid and tipo='prorroga_cumplida')<>1
    or (select count(*) from public.notificaciones_admin
     where cliente_id=cid and tipo='prorroga_cumplida')<>1
 then raise exception 'La liquidación puntual no originó aviso de cumplimiento';end if;
 if (select count(*) from public.goxion_b2_f4_eventos
      where cliente_id=cid and tipo='prorroga_activada')<>1
 then raise exception 'La liquidación duplicó confirmación original';end if;
 if (select count(*) from public.pagos where cliente_id=cid)<>0
 then raise exception 'Abono parcial cerró el recibo antes de terminar ciclo';end if;
END $test$;
select 'B2_F4_ACUERDO_CUMPLIDO_PASS_ROLLBACK' as resultado;
ROLLBACK;
