-- F2 · atributos comerciales: fixtures falsos, ROLLBACK obligatorio.
begin;
do $test$
declare cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;
 a uuid;b uuid;ref uuid;v jsonb;f jsonb;
 period date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 today_local date:=(now() at time zone 'America/Merida')::date;
 good jsonb;wrong jsonb;rejected boolean;acquisition uuid;service_id_a uuid;service_a uuid;normal_price numeric; block_amount integer;cycle_id uuid;expected_total integer;loyalty_b integer; quote jsonb;
begin
 if extract(day from today_local)>24 then raise exception 'Ejecución fixture antes del día 25';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'AT'||substr(cid::text,1,8),'AT'||substr(cid::text,10,4),
 'B2 P3 NO STACK FIXTURE',extract(day from today_local)::int,'pendiente',period,10);
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

 select cs.id,cs.servicio_id,cs.monto into service_a,service_id_a,normal_price
 from public.cliente_accesos ac join public.cliente_servicios cs on cs.id=ac.cliente_servicio_id
 where ac.id=a;
 block_amount=round((normal_price-10)*100)::integer;
 insert into public.promocion_adquisiciones(
 cliente_id,promocion_revision_snapshot,mecanica_snapshot,nombre_snapshot,titulo_publico_snapshot,
 acumulacion_snapshot,subtotal_normal_snapshot,total_promocional_snapshot,ahorro_snapshot,
 periodos_totales,periodos_consumidos,periodo_inicio,periodo_fin,estado,operation_id)
 values(cid,1,'porcentaje','Promoción NO acumulable de prueba','Promoción de prueba',
 '{"lealtad":false,"beneficios_programados":false,"trato_justo":false}'::jsonb,
 normal_price,normal_price-10,10,2,0,period,(period+interval '2 months')::date,
 'activa',gen_random_uuid()) returning id into acquisition;
 insert into public.promocion_adquisicion_items(
 adquisicion_id,servicio_id,cliente_servicio_id,rol,nombre_snapshot,
 precio_normal_snapshot,precio_efectivo_snapshot,ahorro_snapshot,afecta_precio,activo)
 values(acquisition,service_id_a,service_a,'principal','Servicio P3 ficticio',
 normal_price,normal_price-10,10,true,true);
 f=public.goxion_b2_fuentes_comerciales(cid,period);
 if f->>'ok'<>'true' or coalesce((f->>'base_bloqueada_lealtad_centavos')::int,0)<>block_amount
 then raise exception 'No halló bloqueo P3 no acumulable %',f;end if;
 good=jsonb_build_array(jsonb_build_object('fuente','promocion',
  'referencia_id',acquisition,'cliente_acceso_id',a,
  'monto_centavos',1000,'bloqueo_lealtad_centavos',block_amount,
  'justificacion','Campaña P3 sin stacking validada por su precio'));
 rejected=false;
 begin
  perform public.goxion_b2_guardar_atribuciones(cid,period,
   jsonb_build_array(jsonb_build_object('fuente','promocion','referencia_id',acquisition,
    'cliente_acceso_id',a,'monto_centavos',1000,
    'bloqueo_lealtad_centavos',block_amount-100,
    'justificacion','Base P3 insuficiente deliberadamente')),'admin:test');
 exception when others then
  if sqlerrm like 'ATRIBUCION_NO_CONCILIADA:%' then rejected=true;else raise;end if;
 end;
 if not rejected then raise exception 'No detectó diferencia de bloqueo P3';end if;
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:test');
 if v->>'conciliado'<>'true' then raise exception 'No conciliado P3 %',v;end if;
 v=public.goxion_b2_activar_cliente(cid,period,true,'admin:fixture');
 if v->>'regimen_activo'<>'true' then raise exception 'No materializó P3 %',v;end if;
 cycle_id=(v->>'ciclo_id')::uuid;
 if (select descuento_vigente_centavos from public.goxion_b2_cargos
  where ciclo_id=cycle_id and cliente_acceso_id=a)<>0
 then raise exception 'Descuento lealtad se apiló en campaña excluyente';end if;
 loyalty_b=round((94-normal_price)*100*0.06)::integer;
 if (select sum(descuento_vigente_centavos) from public.goxion_b2_cargos
  where ciclo_id=cycle_id)<>loyalty_b
 then raise exception 'Se retiró lealtad del acceso no promocionado';end if;
 quote=public.goxion_b2_cotizar_ciclo(cid,period,today_local);
 select coalesce(sum((x.value->>'total_centavos')::integer),0)
 into expected_total from jsonb_array_elements(quote->'cargos') x;
 if expected_total<>9400-1000-loyalty_b
 then raise exception 'Subtotal P3 no cuadra: %',quote;end if;
end $test$;
select 'B2_P3_NO_STACK_BASE_INDIVIDUAL_PASS_ROLLBACK' resultado;
rollback;
