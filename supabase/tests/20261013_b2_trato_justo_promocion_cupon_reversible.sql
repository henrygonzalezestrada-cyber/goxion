-- F2 · atributos comerciales: fixtures falsos, ROLLBACK obligatorio.
begin;
do $test$
declare cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;
 a uuid;b uuid;ref uuid;v jsonb;f jsonb;
 period date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 today_local date:=(now() at time zone 'America/Merida')::date;
 good jsonb;wrong jsonb;rejected boolean; promocion uuid; beneficio uuid; trato uuid;serv_a uuid;serv_b uuid;monto_a numeric; ciclo uuid;comprobante uuid;clave uuid:=gen_random_uuid();aprobacion uuid:=gen_random_uuid(); file_ref text; asignaciones jsonb; ids uuid[]; sum_cents integer; rec numeric;
begin
 if extract(day from today_local)>24 then raise exception 'Ejecución fixture antes del día 25';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'AT'||substr(cid::text,1,8),'AT'||substr(cid::text,10,4),
 'B2 PROMO CUPON TEST',extract(day from today_local)::int,'pendiente',period,10);
 insert into public.cliente_servicios(cliente_id,servicio_id,nombre,monto,activo)
 values(cid,sid,'A contrato',49,true),(cid,sid2,'B contrato',45,true);
 insert into public.goxion_calendario_accesos(cliente_acceso_id,cliente_servicio_id,cliente_id,
  cobertura_hasta,dia_corte,precio_centavos,estado,verificado_en,actualizado_por,revision)
 select ac.id,ac.cliente_servicio_id,cid,
  today_local+row_number()over(order by ac.id)::int-1,
  extract(day from today_local+row_number()over(order by ac.id)::int-1)::int,
  round(cs.monto*100)::int,'verificado',now(),'test_b2_attrib',1
 from public.cliente_accesos ac join public.cliente_servicios cs
  on cs.id=ac.cliente_servicio_id where ac.cliente_id=cid and ac.activo;
 select id into a from public.cliente_accesos where cliente_id=cid order by id limit 1;
 select id into b from public.cliente_accesos where cliente_id=cid order by id desc limit 1;

 select cs.id,cs.monto into serv_a,monto_a
 from public.cliente_accesos ac join public.cliente_servicios cs on cs.id=ac.cliente_servicio_id
 where ac.id=a;
 insert into public.cliente_servicio_promociones(
  cliente_servicio_id,promocion_id,precio_normal_snapshot,precio_promocional,
  periodos_totales,periodos_consumidos,periodo_inicio,activo)
 values(serv_a,null,monto_a,monto_a-10,2,0,period,true)
 returning id into promocion;
 select ac.cliente_servicio_id into serv_b
 from public.cliente_accesos ac where ac.id=b;
 insert into public.trato_justo_compensaciones(
  cliente_id,cliente_servicio_id,periodo,dias_falla,porcentaje,monto,motivo,activo)
 values(cid,serv_b,period,2,10,4,'Compensación de servicio B para fixture',true)
 returning id into trato;
 insert into public.beneficios_programados(
  cliente_id,origen,origen_ref,concepto,tipo,valor,modo,periodo_inicio,
  periodos_total,periodos_consumidos,prioridad,estado,activo)
 values(cid,'misiones','fixture-cupon','Cupón de misión de prueba',
  'monto',5,'una_vez_elegible',period,1,0,10,'activo',true)
 returning id into beneficio;
 f=public.goxion_b2_fuentes_comerciales(cid,period);
 if f->>'ok'<>'true' or (f->>'total_centavos')::int<>1900
  or jsonb_array_length(f->'fuentes')<>3
 then raise exception 'Motor no detectó promo + cupón: %',f;end if;
 good=jsonb_build_array(
  jsonb_build_object('fuente','promocion','referencia_id',promocion,
   'cliente_acceso_id',a,'monto_centavos',1000,
   'justificacion','Promoción únicamente sobre contrato A'),
  jsonb_build_object('fuente','programado','referencia_id',beneficio,
   'cliente_acceso_id',b,'monto_centavos',500,
   'justificacion','Cupón autorizado a contrato B'),
  jsonb_build_object('fuente','trato_justo','referencia_id',trato,
   'cliente_acceso_id',b,'monto_centavos',400,
   'justificacion','Compensación corresponde al servicio B'));
 rejected=false;
 begin
  perform public.goxion_b2_guardar_atribuciones(cid,period,
   jsonb_build_array(
    good->0,good->1,
    jsonb_build_object('fuente','trato_justo','referencia_id',trato,
     'cliente_acceso_id',a,'monto_centavos',400,
     'justificacion','Asignación incorrecta a servicio A')),
   'admin:fixture');
 exception when others then
  if sqlerrm like 'ATRIBUCION_NO_CONCILIADA:%' then rejected=true;
  else raise;end if;
 end;
 if not rejected or exists(
  select 1 from public.goxion_b2_atribuciones_comerciales where cliente_id=cid)
 then raise exception 'Trato Justo fue reasignado a servicio ajeno';end if;
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:fixture');
 if v->>'conciliado'<>'true' then raise exception 'No concilió las fuentes %',v;end if;
 v=public.goxion_b2_activar_cliente(cid,period,true,'admin:fixture');
 if v->>'regimen_activo'<>'true' then raise exception 'No activó B2 ficticio %',v;end if;
 ciclo=(v->>'ciclo_id')::uuid;
 if (select sum(descuento_comercial_centavos)
  from public.goxion_b2_cargos where ciclo_id=ciclo)<>1900
 then raise exception 'No aplicó promociones, cupón y Trato Justo';end if;
 if (select sum(descuento_original_centavos)
  from public.goxion_b2_cargos where ciclo_id=ciclo)<>504
 then raise exception 'No recalculó lealtad sobre precio promocional';end if;
 rejected=false;
 begin
  update public.goxion_b2_atribuciones_comerciales
   set monto_centavos=501
   where cliente_id=cid and periodo=period and referencia_id=beneficio;
 exception when others then
  if sqlerrm like 'ATRIBUCION_CICLO_INMUTABLE%' then rejected=true;
  else raise;end if;
 end;
 if not rejected then raise exception 'Edición de cupón posterior al ciclo permitida';end if;
 rejected=false;
 begin
  delete from public.goxion_b2_atribuciones_comerciales
  where cliente_id=cid and periodo=period and referencia_id=promocion;
 exception when others then
  if sqlerrm like 'ATRIBUCION_CICLO_INMUTABLE%' then rejected=true;
  else raise;end if;
 end;
 if not rejected then raise exception 'Eliminar promoción posterior al ciclo permitido';end if;
 f=public.goxion_b2_cotizar_ciclo(cid,period,today_local);
 select coalesce(sum((x.value->>'total_centavos')::int),0),
  array_agg((x.value->>'cargo_id')::uuid)
 into sum_cents,ids from jsonb_array_elements(f->'cargos') x;
 if sum_cents<>6996 then raise exception 'Total esperado 69.96, llegó %',sum_cents;end if;
 file_ref=cid::text||'/'||clave::text||'-55aaccee10ef011a.png';
 insert into storage.objects(bucket_id,name,metadata)
 values('goxion-b2-evidencias',file_ref,'{"mimetype":"image/png","size":128}'::jsonb);
 v=public.goxion_b2_registrar_comprobante_seguro(cid,ciclo,sum_cents,file_ref,clave,ids);
 comprobante=(v->>'reporte_id')::uuid;
 select jsonb_agg(jsonb_build_object(
 'cargo_id',(x.value->>'cargo_id')::uuid,
 'monto_centavos',(x.value->>'total_centavos')::int,
 'saldo_esperado_centavos',(x.value->>'total_centavos')::int,
 'operation_id',gen_random_uuid()) order by x.value->>'cargo_id')
 into asignaciones from jsonb_array_elements(f->'cargos') x;
 v=public.goxion_b2_aprobar_comprobante(cid,comprobante,asignaciones,aprobacion,'admin:fixture',false,'');
 if v->>'ok'<>'true' then raise exception 'Aprobación inválida: %',v;end if;
 if (select count(*) from public.pagos where cliente_id=cid and estado='pagado')<>1
 then raise exception 'Recibo consolidado no es único';end if;
 select monto into rec from public.pagos where cliente_id=cid and estado='pagado';
 if rec<>69.96 then raise exception 'Recibo monetario incorrecto: %',rec;end if;
 if (select count(*) from public.beneficio_aplicaciones
   where beneficio_id=beneficio and estado='consumido'
    and monto_aplicado=5)<>1
 then raise exception 'Cupón no fue consumido exactamente una vez';end if;
 if (select count(*) from public.promocion_aplicaciones
   where asignacion_id=promocion and estado='consumido'
    and ahorro_aplicado=10)<>1
 then raise exception 'Promoción no fue consumida exactamente una vez';end if;
 if (select activo from public.trato_justo_compensaciones where id=trato) is distinct from false
 then raise exception 'Trato Justo no se consumió al cobrar';end if;
 if (select pagos_puntuales from public.clientes where id=cid)<>11
 then raise exception 'Racha global avanzó incorrectamente';end if;
 v=public.goxion_b2_aprobar_comprobante(cid,comprobante,asignaciones,aprobacion,'admin:fixture',false,'');
 if v->>'repetido'<>'true' then raise exception 'Idempotencia no protegió pago';end if;
end $test$;
select 'B2_PROMO_CUPON_TRATO_JUSTO_PASS_ROLLBACK' resultado;
rollback;
