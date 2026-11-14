-- GOXION · cancelación B2 reversible sin dinero ni servicios ficticios persistidos
-- Requiere la RPC privada goxion_cancelar_servicio_admin_v1; BEGIN/ROLLBACK total.
begin;
do $qa$
declare cid uuid:=gen_random_uuid();c2 uuid:=gen_random_uuid();c3 uuid:=gen_random_uuid();
 s_google uuid;s_crunch uuid;cs_google uuid;cs2_google uuid;cs3_google uuid;
 v jsonb; vid uuid;v_error text; aud int;
begin
 insert into public.servicios(nombre,precio,costo,cuentas,limite)
 values('GOOGLE ROLLBACK CANCEL',29,0,1,1) returning id into s_google;
 insert into public.servicios(nombre,precio,costo,cuentas,limite)
 values('CRUNCH ROLLBACK CANCEL',99,0,1,1) returning id into s_crunch;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'C1'||substr(cid::text,1,8),'C1'||substr(cid::text,10,4),'QA B2 CANCEL',15,'pagado','2026-12-01',0),
 (c2,'C2'||substr(c2::text,1,8),'C2'||substr(c2::text,10,4),'QA GLOBAL CANCEL',15,'pagado','2026-12-01',0),
 (c3,'C3'||substr(c3::text,1,8),'C3'||substr(c3::text,10,4),'QA B2 PROOF GUARD',15,'pagado','2026-12-01',0);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,s_google,'Google One 2TB',29,true) returning id into cs_google;
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,s_crunch,'Crunchyroll',99,true);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(c2,s_google,'Google One 2TB',29,true) returning id into cs2_google;
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(c2,s_crunch,'Crunchyroll',99,true);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(c3,s_google,'Google One 2TB',29,true) returning id into cs3_google;
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(c3,s_crunch,'Crunchyroll',99,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,cliente_id,
  cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select a.id,a.cliente_servicio_id,a.cliente_id,
  case when a.servicio_id=s_google then '2026-11-30'::date else '2026-11-15'::date end,
  case when a.servicio_id=s_google then 30 else 15 end,
  round(s.monto*100)::int,'verificado',now(),'qa_rollback',1
 from public.cliente_accesos a join public.cliente_servicios s on s.id=a.cliente_servicio_id
 where a.cliente_id in (cid,c3) and a.activo;
 v=public.goxion_b2_activar_cliente(cid,'2026-12-01',true,'admin:fixture');
 if v->>'regimen_activo'<>'true' then raise exception 'No activó B2 %',v;end if;
 v=public.goxion_cancelar_servicio_admin_v1(cs_google,true,'admin:qa');
 if v->>'regimen_activo'<>'false' or (v->>'fechas_activas')::int<>1
   or (v->>'cargos_proyectados_retirados')::int<>2 then
   raise exception 'No unificó correctamente: %',v;end if;
 if (select count(*) from public.goxion_b2_ciclos where cliente_id=cid)<>0
  or (select count(*) from public.goxion_b2_cargos where cliente_id=cid)<>0
  or (select count(*) from public.pagos where cliente_id=cid)<>0
 then raise exception 'Dejó cargo/ciclo/pago fantasma';end if;
 if (select count(*) from public.goxion_b2_auditoria where cliente_id=cid and accion='eliminar')<>1
 then raise exception 'No auditó las obligaciones retiradas';end if;
 v=public.goxion_estado_financiero(cid);
 if (v->>'subtotal')::numeric<>99 then raise exception 'Subtotal tras cancelar %',v->>'subtotal';end if;
 v=public.goxion_cancelar_servicio_admin_v1(cs_google,true,'admin:qa');
 if v->>'repetida'<>'true' then raise exception 'Reintento no es idempotente';end if;
 v=public.goxion_cancelar_servicio_admin_v1(cs2_google,true,'admin:qa');
 if (v->>'servicio_inactivo')::boolean is distinct from true then raise exception 'Mensual falló %',v;end if;
 if (select count(*) from public.cliente_servicios where cliente_id=c2 and activo)<>1
 then raise exception 'Mensual quedó con dos servicios';end if;
 -- Evidencia recibida prohíbe reconstruir un ciclo abierto.
 v=public.goxion_b2_activar_cliente(c3,'2026-12-01',true,'admin:fixture');
 vid=(v->>'ciclo_id')::uuid;
 insert into public.goxion_b2_comprobantes(cliente_id,ciclo_id,periodo,
   monto_reportado_centavos,evidencia_ref,reporte_operation_id,estado)
 values(c3,vid,'2026-12-01',2900,'qa/reversible',gen_random_uuid(),'reportado');
 v_error=null;
 begin
  perform public.goxion_cancelar_servicio_admin_v1(cs3_google,true,'admin:qa');
 exception when others then get stacked diagnostics v_error=MESSAGE_TEXT;
 end;
 if v_error is null or (v_error not like 'SERVICIO_PAGO_EN_REVISION%'
  and v_error not like 'SERVICIO_B2_CICLO_CON_MOVIMIENTOS%') then
  raise exception 'No bloqueó comprobante pendiente: %',v_error;end if;
 if (select activo from public.cliente_servicios where id=cs3_google) is not true
 then raise exception 'Cambio contrato pese a comprobante';end if;
end $qa$;
select 'CANCELACION_B2_Y_MENSUAL_REVERSIBLE_PASS' resultado;
rollback;
