-- F2 · atributos comerciales: fixtures falsos, ROLLBACK obligatorio.
begin;
do $test$
declare cid uuid:=gen_random_uuid(); sid uuid;sid2 uuid;
 a uuid;b uuid;ref uuid;v jsonb;f jsonb;
 period date:=date_trunc('month',(now() at time zone 'America/Merida')::date)::date;
 today_local date:=(now() at time zone 'America/Merida')::date;
 good jsonb;wrong jsonb;rejected boolean; cycle_id uuid;now_quote jsonb;future_quote jsonb;v_today integer;v_late integer;v_a integer;v_b integer;
begin
 if extract(day from today_local)>24 then raise exception 'Ejecución fixture antes del día 25';end if;
 select id into sid from public.servicios where activo order by nombre limit 1;
 select id into sid2 from public.servicios where activo and id<>sid order by nombre limit 1;
 insert into public.clientes(id,clave,folio,nombre,dia_pago,estado,periodo_pendiente,pagos_puntuales)
 values(cid,'AT'||substr(cid::text,1,8),'AT'||substr(cid::text,10,4),
 'B2 MORA INDEPENDIENTE',extract(day from today_local)::int,'pendiente',period,10);
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
 insert into public.descuentos_especiales(cliente_id,descripcion,monto,activo)
 values(cid,'Descuento especial de prueba',10,true) returning id into ref;
 f=public.goxion_b2_fuentes_comerciales(cid,period);
 if f->>'ok'<>'true' or jsonb_array_length(f->'fuentes')<>1
  or (f->>'total_centavos')::int<>1000 or
  (f->'fuentes'->0->>'referencia_id')::uuid<>ref
 then raise exception 'Fuentes originales mal capturadas: %',f;end if;
 v=public.goxion_b2_validar_atribuciones(cid,period);
 if v->>'conciliado'<>'false' then raise exception 'Permitió sin destino';end if;
 good=jsonb_build_array(jsonb_build_object(
  'fuente','especial','referencia_id',ref,
  'cliente_acceso_id',a,'monto_centavos',1000,
  'justificacion','Asignación explícita a contrato A'));
 wrong=jsonb_build_array(jsonb_build_object(
  'fuente','especial','referencia_id',ref,
  'cliente_acceso_id',a,'monto_centavos',999,
  'justificacion','Monto deliberadamente insuficiente'));
 rejected=false;
 begin
  perform public.goxion_b2_guardar_atribuciones(cid,period,wrong,'admin:test');
 exception when others then
  if sqlerrm like 'ATRIBUCION_NO_CONCILIADA:%' then rejected=true; else raise;end if;
 end;
 if not rejected or exists(select 1 from public.goxion_b2_atribuciones_comerciales where cliente_id=cid)
 then raise exception 'Diferencia de un centavo no hizo rollback';end if;
 rejected=false;
 begin
  perform public.goxion_b2_guardar_atribuciones(cid,period,jsonb_build_array(jsonb_build_object(
   'fuente','especial','referencia_id',ref,
   'cliente_acceso_id',gen_random_uuid(),'monto_centavos',1000,
   'justificacion','Acceso inexistente de prueba')),'admin:test');
 exception when others then rejected=true;end;
 if not rejected or exists(select 1 from public.goxion_b2_atribuciones_comerciales where cliente_id=cid)
 then raise exception 'Acceso ajeno o inexistente no revirtió';end if;
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:test');
 if v->>'conciliado'<>'true' or v->>'guardado'<>'true'
 then raise exception 'Contrato válido no pasó: %',v;end if;
 v=public.goxion_b2_guardar_atribuciones(cid,period,good,'admin:test');
 if v->>'conciliado'<>'true' or (select count(*) from public.goxion_b2_atribuciones_comerciales
  where cliente_id=cid)<>1 then raise exception 'Reintento duplicó la asignación';end if;
 v=public.goxion_b2_activar_cliente(cid,period,true,'admin:fixture');
 cycle_id=(v->>'ciclo_id')::uuid;
 if cycle_id is null then raise exception 'No se creó ciclo';end if;
 now_quote=public.goxion_b2_cotizar_ciclo(cid,period,today_local);
 future_quote=public.goxion_b2_cotizar_ciclo(cid,period,today_local+2);
 v_today=(now_quote->>'total_pendiente_centavos')::integer;
 v_late=(future_quote->>'total_pendiente_centavos')::integer;
 if v_today<>7836 or now_quote->>'lealtad_global_perdida'<>'false'
 then raise exception 'Lealtad inicial incorrecta: %',now_quote;end if;
 if v_late<>9015 or future_quote->>'lealtad_global_perdida'<>'true'
 then raise exception 'Mora y pérdida de lealtad incorrectas: %',future_quote;end if;
 select (item->>'total_centavos')::integer into v_a from jsonb_array_elements(future_quote->'cargos') item where item->>'acceso_id'=a::text;
 select (item->>'total_centavos')::integer into v_b from jsonb_array_elements(future_quote->'cargos') item where item->>'acceso_id'=b::text;
 if v_a<>4290 or v_b<>4725 then raise exception
  'Mora no es por obligación: A=% B=%',v_a,v_b;end if;
 if (select pagos_puntuales from public.clientes where id=cid)<>10
 then raise exception 'Una simple cotización no debe mutar la racha global';end if;
 if exists(select 1 from public.goxion_b2_atribuciones_comerciales
   where cliente_id=cid and periodo<>period)
 then raise exception 'Aplicó asignación fuera de período';end if;
end $test$;
select 'B2_MORA_POR_ACCESO_DESCUENTO_ESPECIAL_PASS_ROLLBACK' resultado;
rollback;
