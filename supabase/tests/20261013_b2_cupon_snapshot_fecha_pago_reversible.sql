BEGIN;
do $test$
declare cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;
 a uuid;b uuid;ref uuid;v jsonb;f jsonb;
 period date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 today_local date:=(now() at time zone 'America/Merida')::date;
 good jsonb;wrong jsonb;rejected boolean; promocion uuid; beneficio uuid; serv_a uuid; monto_a numeric; ciclo uuid;comprobante uuid;clave uuid:=gen_random_uuid();aprobacion uuid:=gen_random_uuid(); file_ref text; asignaciones jsonb; ids uuid[]; sum_cents integer; rec numeric;
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
 insert into public.beneficios_programados(
  cliente_id,origen,origen_ref,concepto,tipo,valor,modo,periodo_inicio,
  periodos_total,periodos_consumidos,prioridad,estado,activo)
 values(cid,'misiones','fixture-cupon','Cupón de misión de prueba',
  'porcentaje',10,'una_vez_elegible',period,1,0,10,'activo',true)
 returning id into beneficio;
 f=public.goxion_b2_fuentes_comerciales(cid,period);
 if f->>'ok'<>'true' or (f->>'total_centavos')::int<>1840
  or jsonb_array_length(f->'fuentes')<>2
 then raise exception 'Motor no detectó promo + cupón: %',f;end if;
 good=jsonb_build_array(
  jsonb_build_object('fuente','promocion','referencia_id',promocion,
   'cliente_acceso_id',a,'monto_centavos',1000,
   'justificacion','Promoción únicamente sobre contrato A'),
  jsonb_build_object('fuente','programado','referencia_id',beneficio,
   'cliente_acceso_id',b,'monto_centavos',840,
   'justificacion','Cupón autorizado a contrato B'));
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:fixture');
 if v->>'conciliado'<>'true' then raise exception 'No concilió las fuentes %',v;end if;
 v=public.goxion_b2_activar_cliente(cid,period,true,'admin:fixture');
 if v->>'regimen_activo'<>'true' then raise exception 'No activó B2 ficticio %',v;end if;
 ciclo=(v->>'ciclo_id')::uuid;
 if (select sum(descuento_comercial_centavos)
  from public.goxion_b2_cargos where ciclo_id=ciclo)<>1840
 then raise exception 'No aplicó promociones y cupón al cargo';end if;
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
 if sum_cents<>7056 then raise exception 'Total esperado 73.96, llegó %',sum_cents;end if;

 if (select fuentes_fecha_snapshot from public.goxion_b2_ciclos where id=ciclo)
   is distinct from today_local then raise exception 'Falta fecha de snapshot';end if;
 update public.goxion_b2_cargos set principal_pendiente_centavos=0,liquidado=true where ciclo_id=ciclo;
 update public.goxion_b2_ciclos
 set estado='liquidado',liquidado_en=now(),racha_aplicada=true where id=ciclo;
 perform pg_catalog.set_config('goxion.b2_recibo_autorizado',ciclo::text,true);
 insert into public.pagos(cliente_id,fecha,periodo,monto,estado,notas)
 values(cid,today_local+4,
  (array['enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'])
    [extract(month from period)::int]||' de '||extract(year from period)::int,
 70.56,'pagado','Fixture cuota B2 aprobada después del vencimiento');
 perform pg_catalog.set_config('goxion.b2_recibo_autorizado','',true);
 if (select count(*) from public.beneficio_aplicaciones
     where beneficio_id=beneficio and estado='consumido'
      and monto_aplicado=8.40)<>1 then
 raise exception 'Cupón porcentual no concilia con el corte congelado';end if;
 if (select fecha from public.pagos where cliente_id=cid and estado='pagado')<>today_local+4
 then raise exception 'Recibo no conserva fecha real futura';end if;
end $test$;
select 'B2_FECHA_CUPON_SNAPSHOT_PASS_ROLLBACK' resultado;

ROLLBACK;