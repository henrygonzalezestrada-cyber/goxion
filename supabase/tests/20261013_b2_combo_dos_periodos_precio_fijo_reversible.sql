-- F2 · atributos comerciales: fixtures falsos, ROLLBACK obligatorio.
begin;
do $test$
declare cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;
 a uuid;b uuid;ref uuid;v jsonb;f jsonb;
 period date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 today_local date:=(now() at time zone 'America/Merida')::date;
 good jsonb;wrong jsonb;rejected boolean; purchase uuid; svc1 uuid;svc2 uuid; platform1 uuid;platform2 uuid; cycle_id uuid; quote jsonb; proof uuid;key uuid:=gen_random_uuid();approve_id uuid:=gen_random_uuid(); fref text; rows jsonb;selected uuid[];due integer; receipt numeric; next_promo jsonb;
begin
 if extract(day from today_local)>24 then raise exception 'Ejecución fixture antes del día 25';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'AT'||substr(cid::text,1,8),'AT'||substr(cid::text,10,4),
 'B2 COMBO TOTAL REVERSIBLE',extract(day from today_local)::int,'pendiente',period,10);
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

 select cs.id,cs.servicio_id into svc1,platform1
 from public.cliente_accesos ac join public.cliente_servicios cs
 on cs.id=ac.cliente_servicio_id where ac.id=a;
 select cs.id,cs.servicio_id into svc2,platform2
 from public.cliente_accesos ac join public.cliente_servicios cs
 on cs.id=ac.cliente_servicio_id where ac.id=b;
 -- Paquete comercial de 2 períodos por $139.99:
 -- primer período $69.99, siguiente período $70.00 (sin cobrar $0.01 dos veces).
 insert into public.promocion_adquisiciones(
 cliente_id,promocion_revision_snapshot,mecanica_snapshot,nombre_snapshot,
 titulo_publico_snapshot,acumulacion_snapshot,subtotal_normal_snapshot,
 total_promocional_snapshot,ahorro_snapshot,periodos_totales,periodos_consumidos,
 periodo_inicio,periodo_fin,estado,operation_id,condiciones_snapshot)
 values(cid,1,'combo','Combo P3 dos meses','Combo prueba',
 '{"lealtad":false,"beneficios_programados":false,"trato_justo":false}'::jsonb,
 94,69.99,24.01,2,0,period,(period+interval '2 months')::date,
 'activa',gen_random_uuid(),'{"precio_total_promocion":"139.99"}'::jsonb)
 returning id into purchase;
 insert into public.promocion_adquisicion_items(
 adquisicion_id,servicio_id,cliente_servicio_id,rol,nombre_snapshot,
 precio_normal_snapshot,precio_efectivo_snapshot,ahorro_snapshot,afecta_precio,activo,orden)
 values(purchase,platform1,svc1,'principal','Contrato A',49,34.99,14.01,true,true,1),
 (purchase,platform2,svc2,'incluido','Contrato B',45,35.00,10.00,true,true,2);
 f=public.goxion_b2_fuentes_comerciales(cid,period);
 if f->>'ok'<>'true' or (f->>'total_centavos')::int<>2401 or
    (f->>'base_bloqueada_lealtad_centavos')::int<>6999
 then raise exception 'Precio fijo no generó la fuente exacta: %',f;end if;
 good=jsonb_build_array(
 jsonb_build_object('fuente','promocion','referencia_id',purchase,
  'cliente_acceso_id',a,'monto_centavos',1401,'bloqueo_lealtad_centavos',3499,
  'justificacion','Primer servicio del combo de dos meses'),
 jsonb_build_object('fuente','promocion','referencia_id',purchase,
  'cliente_acceso_id',b,'monto_centavos',1000,'bloqueo_lealtad_centavos',3500,
  'justificacion','Segundo servicio del combo de dos meses'));
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:fixture');
 if v->>'conciliado'<>'true' then raise exception 'Combo no concilió %',v;end if;
 v=public.goxion_b2_activar_cliente(cid,period,true,'admin:fixture');
 cycle_id=(v->>'ciclo_id')::uuid;
 quote=public.goxion_b2_cotizar_ciclo(cid,period,today_local);
 select coalesce(sum((x.value->>'total_centavos')::int),0),
  array_agg((x.value->>'cargo_id')::uuid) into due,selected
 from jsonb_array_elements(quote->'cargos') x;
 if due<>6999 or (select sum(descuento_vigente_centavos)
  from public.goxion_b2_cargos where ciclo_id=cycle_id)<>0
 then raise exception 'Combo no acumulable aplicó lealtad o cobró más: %',quote;end if;
 fref=cid::text||'/'||key::text||'-55aaccee10ef011a.png';
 insert into storage.objects(bucket_id,name,metadata)
 values('goxion-b2-evidencias',fref,'{"mimetype":"image/png","size":128}'::jsonb);
 v=public.goxion_b2_registrar_comprobante_seguro(cid,cycle_id,due,fref,key,selected);
 proof=(v->>'reporte_id')::uuid;
 select jsonb_agg(jsonb_build_object(
 'cargo_id',(x.value->>'cargo_id')::uuid,
 'monto_centavos',(x.value->>'total_centavos')::int,
 'saldo_esperado_centavos',(x.value->>'total_centavos')::int,
 'operation_id',gen_random_uuid()) order by x.value->>'cargo_id')
 into rows from jsonb_array_elements(quote->'cargos') x;
 v=public.goxion_b2_aprobar_comprobante(cid,proof,rows,approve_id,'admin:fixture',false,'');
 if v->>'ok'<>'true' then raise exception 'Combo B2 no liquidó %',v;end if;
 select monto into receipt from public.pagos where cliente_id=cid and estado='pagado';
 if receipt<>69.99 then raise exception 'Recibo combo primer mes incorrecto %',receipt;end if;
 if (select count(*) from public.promocion_adquisicion_aplicaciones
   where adquisicion_id=purchase and ahorro_aplicado=24.01
    and total_promocional_aplicado=69.99 and estado='consumido')<>1
 then raise exception 'No consumió combo una sola vez';end if;
 next_promo=public.goxion_promociones_periodo(cid,(period+interval '1 month')::date);
 if (next_promo->>'total_ahorro')::numeric<>24.00 or
   (next_promo->'detalles'->0->>'precio_promocional')::numeric<>70.00
 then raise exception 'Redondeo del segundo período incorrecto: %',next_promo;end if;
end $test$;
select 'B2_COMBO_DOS_MESES_13999_PASS_ROLLBACK' resultado;
rollback;
