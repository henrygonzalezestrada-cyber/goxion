-- B2 F2: fecha inmutable del derecho comercial por ciclo.
-- Ajuste en trigger de consumo sólo cuando el recibo está autorizado
-- explícitamente por la RPC B2, sin retroceder fecha de pago real.
alter table public.goxion_b2_ciclos
 add column if not exists fuentes_fecha_snapshot date;
CREATE OR REPLACE FUNCTION public.goxion_b2_fuentes_comerciales(p_cliente_id uuid, p_periodo date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f jsonb;claims jsonb:='[]'::jsonb; x jsonb;
 v_asof date:=(now() at time zone 'America/Merida')::date;
 ref uuid; cents integer;scope jsonb;total bigint;expected bigint;
begin
 if p_cliente_id is null or p_periodo is null or p_periodo<>date_trunc('month',p_periodo)::date
 then raise exception 'ATRIBUCION_PERIODO_INVALIDO';end if;
 if not exists(select 1 from public.clientes
  where id=p_cliente_id and periodo_pendiente=p_periodo)
 then return jsonb_build_object('ok',false,'codigo','PERIODO_NO_PENDIENTE');end if;
 select c.fuentes_fecha_snapshot into v_asof
 from public.goxion_b2_ciclos c
 where c.cliente_id=p_cliente_id and c.periodo=p_periodo
   and c.fuentes_fecha_snapshot is not null;
 v_asof=coalesce(v_asof,(now() at time zone 'America/Merida')::date);
 f=public.goxion_estado_financiero(p_cliente_id,v_asof);
 if left(coalesce(f->>'periodo',''),7)<>to_char(p_periodo,'YYYY-MM')
 then return jsonb_build_object('ok',false,'codigo','MOTOR_NO_CONCILIADO');end if;
 for x in select value from jsonb_array_elements(coalesce(f->'promociones'->'detalles','[]'::jsonb)) loop
  ref=nullif(coalesce(x->>'adquisicion_id',x->>'asignacion_id'),'')::uuid;
  cents=round(coalesce((x->>'ahorro')::numeric,0)*100)::integer;
  if cents<=0 then continue;end if;
  if ref is null then raise exception 'PROMOCION_SIN_ID';end if;
  if x->>'fuente'='adquisicion_inmutable' then
   select coalesce(jsonb_agg(distinct y.value->>'cliente_servicio_id'),'[]'::jsonb) into scope
   from jsonb_array_elements(coalesce(x->'items','[]'::jsonb)) y
   where y.value->>'cliente_servicio_id' is not null and
    coalesce((y.value->>'afecta_precio')::boolean,false);
  else scope=case when x->>'cliente_servicio_id' is null then '[]'::jsonb
   else jsonb_build_array(x->>'cliente_servicio_id') end;end if;
  if jsonb_array_length(scope)=0 then raise exception 'PROMOCION_SIN_SERVICIO';end if;
  claims=claims||jsonb_build_array(jsonb_build_object(
   'fuente','promocion','referencia_id',ref,'monto_centavos',cents,
   'concepto',coalesce(x->>'promocion','Promoción'),'servicios_destino',scope,
   'bloqueo_lealtad',x->'acumulacion'->>'lealtad'));
 end loop;
 for x in select value from jsonb_array_elements(coalesce(f->'descuentos'->'detalles','[]'::jsonb)) loop
  if x->>'tipo' not in ('especial','trato_justo') then continue;end if;
  ref=nullif(x->>'id','')::uuid;
  cents=round(coalesce((x->>'monto')::numeric,0)*100)::integer;
  if cents<=0 then continue;end if;
  if ref is null then raise exception 'DESCUENTO_SIN_ID';end if;
  scope=case when x->>'tipo'='trato_justo' and x->>'cliente_servicio_id' is not null
   then jsonb_build_array(x->>'cliente_servicio_id') else '[]'::jsonb end;
  claims=claims||jsonb_build_array(jsonb_build_object('fuente',x->>'tipo',
   'referencia_id',ref,'monto_centavos',cents,
   'concepto',coalesce(x->>'concepto',x->>'tipo'),'servicios_destino',scope));
 end loop;
 for x in select value from jsonb_array_elements(coalesce(f->'beneficios_programados','[]'::jsonb)) loop
  ref=nullif(x->>'id','')::uuid;
  cents=round(coalesce((x->>'monto')::numeric,0)*100)::integer;
  if cents<=0 then continue;end if;
  if ref is null then raise exception 'BENEFICIO_SIN_ID';end if;
  claims=claims||jsonb_build_array(jsonb_build_object(
   'fuente','programado','referencia_id',ref,'monto_centavos',cents,
   'concepto',coalesce(x->>'concepto','Beneficio'),'origen',x->>'origen',
   'servicios_destino','[]'::jsonb));
 end loop;
 select coalesce(sum((z.value->>'monto_centavos')::bigint),0) into total
 from jsonb_array_elements(claims) z;
 expected=round(100*(coalesce((f->'descuentos'->>'promociones')::numeric,0)
 +coalesce((f->'descuentos'->>'especiales')::numeric,0)
 +coalesce((f->'descuentos'->>'trato_justo')::numeric,0)
 +coalesce((f->'descuentos'->>'programados')::numeric,0)))::bigint;
 return jsonb_build_object('ok',total=expected,
  'codigo',case when total=expected then 'FUENTES_CONCILIADAS' else 'FUENTES_NO_CUADRAN' end,
  'fuentes',claims,'total_centavos',total,'oficial_centavos',expected,
  'subtotal_centavos',round(coalesce((f->>'subtotal')::numeric,0)*100)::bigint,
  'lealtad_oficial_centavos',round(coalesce((f->'descuentos'->>'lealtad')::numeric,0)*100)::bigint,
  'base_bloqueada_lealtad_centavos',round(coalesce(
    (f->'promociones'->'stacking'->>'base_bloqueada_lealtad')::numeric,0)*100)::bigint,
  'cobrable',false);
end $function$;
CREATE OR REPLACE FUNCTION public.goxion_b2_iniciar_ciclo(p_cliente_id uuid, p_periodo date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cliente record;v_reg record;v_ciclo record;v_fin jsonb;
 v_n int;v_ver int;v_fechas int;v_base bigint;v_base_of bigint;
 v_disc numeric;v_lealtad numeric;v_cargos numeric;
 v_pct int;v_nivel int;v_creados int;v_atrib jsonb;v_comercial bigint;
begin
 if p_cliente_id is null or p_periodo is null
   or p_periodo<>date_trunc('month',p_periodo)::date then
   raise exception 'Cliente y ciclo válidos requeridos';
 end if;
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then raise exception 'Cuenta no elegible';end if;
 select * into v_reg from public.goxion_b2_regimen_cliente
 where cliente_id=p_cliente_id and activo for update;
 if not found or p_periodo<v_reg.periodo_inicio then
  raise exception 'MULTIFECHA_NO_ACTIVADO';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where cliente_id=p_cliente_id and periodo=p_periodo for update;
 if found then return jsonb_build_object('ok',true,'ciclo_id',v_ciclo.id,
  'repetida',true,'modo','b2_por_acceso','cobrable',false);end if;
 if p_periodo is distinct from v_cliente.periodo_pendiente then
  raise exception 'El ciclo global requiere conciliación previa';
 end if;
 if exists(select 1 from public.pagos where cliente_id=p_cliente_id
  and estado='pagado'
  and public.goxion_periodo_pago_canonico(periodo)=p_periodo) then
  raise exception 'Hay comprobante global pagado; no duplicar';
 end if;
 if exists(select 1 from public.pagos_parciales where cliente_id=p_cliente_id
  and periodo=p_periodo and activo) then
  raise exception 'Existen abonos heredados; requieren conciliación';
 end if;
 if v_cliente.pago_en_revision then raise exception 'Comprobante global en revisión';end if;
 select count(*),count(*) filter(where cal.estado='verificado'
   and cal.precio_centavos>0 and cal.revision>0
   and cal.cobertura_hasta>=p_periodo
   and cal.cobertura_hasta<(p_periodo+interval '1 month')::date),
 count(distinct cal.cobertura_hasta),
 coalesce(sum(cal.precio_centavos),0)::bigint
 into v_n,v_ver,v_fechas,v_base
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
  and s.activo and s.cliente_id=p_cliente_id
 left join public.goxion_calendario_accesos cal
  on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo;
 if v_n<2 or v_n<>v_ver or v_fechas<2 then
  raise exception 'Calendarios verificados insuficientes';
 end if;
 if exists(select 1 from public.cliente_servicios s where s.cliente_id=p_cliente_id
  and s.activo and round(s.monto*100)::bigint is distinct from
   (select coalesce(sum(cal.precio_centavos),0) from public.goxion_calendario_accesos cal
    where cal.cliente_servicio_id=s.id and cal.estado='verificado')) then
  raise exception 'Precio de accesos sin conciliación comercial';
 end if;
 -- Evitar combo cuyo ordinal de acceso es repetido/ambiguo.
 if exists(select 1 from public.cliente_accesos a join public.cliente_servicios s
   on s.id=a.cliente_servicio_id and s.activo
   where a.cliente_id=p_cliente_id and a.activo
   group by a.cliente_servicio_id having count(*)<>count(distinct a.ordinal)) then
  raise exception 'Contrato con unidades ambiguas';
 end if;
 v_fin=public.goxion_estado_financiero(p_cliente_id);
 if v_fin->>'fuente_financiera'<>'supabase:goxion_estado_financiero'
   or v_fin->'contrato_financiero'->>'modo'<>'oficial'
   or left(v_fin->>'periodo',7)<>to_char(p_periodo,'YYYY-MM') then
  raise exception 'Estado financiero oficial desactualizado';
 end if;
 v_base_of=round((v_fin->>'subtotal')::numeric*100)::bigint;
 v_disc=coalesce((v_fin->'descuentos'->>'total')::numeric,0);
 v_lealtad=coalesce((v_fin->'descuentos'->>'lealtad')::numeric,0);
 v_cargos=coalesce((v_fin->'cargos'->>'total')::numeric,0);
 if v_base_of is distinct from v_base or v_cargos<>0 then
  raise exception 'B2_PRECIO_O_RECARGO_NO_CONCILIADO';end if;
 v_atrib=public.goxion_b2_validar_atribuciones(p_cliente_id,p_periodo);
 if v_atrib->>'ok'<>'true' or v_atrib->>'conciliado'<>'true' then
  raise exception 'B2_ATRIBUCION_COMERCIAL_PENDIENTE';end if;
 v_comercial=coalesce((v_atrib->>'total_centavos')::bigint,0);
 if v_comercial<>round((v_disc-v_lealtad)*100)::bigint then
  raise exception 'B2_DESCUENTOS_NO_COINCIDEN';end if;
 -- La base no acumulable por acceso concilia contra el motor oficial.
 v_pct=coalesce((v_fin->'lealtad'->>'porcentaje')::numeric,0)::integer;
 v_nivel=coalesce((v_fin->'lealtad'->>'nivel')::int,0);
 if (v_nivel,v_pct) not in ((0,0),(1,3),(2,6)) then
  raise exception 'Nivel de lealtad inconsistente';
 end if;
 -- Protege contra cambios de fecha/precio durante materialización.
 perform 1 from public.goxion_calendario_accesos cal
 join public.cliente_accesos a on a.id=cal.cliente_acceso_id
 where a.cliente_id=p_cliente_id and a.activo for share of cal;
 insert into public.goxion_b2_ciclos(cliente_id,periodo,nivel_lealtad,
  porcentaje_lealtad,racha_inicio)
 values(p_cliente_id,p_periodo,v_nivel,v_pct,v_cliente.pagos_puntuales)
 returning * into v_ciclo;
 insert into public.goxion_b2_cargos(ciclo_id,cliente_id,cliente_servicio_id,
  cliente_acceso_id,periodo,fecha_vencimiento,calendario_revision,base_centavos,
  descuento_original_centavos,descuento_vigente_centavos,
  principal_pendiente_centavos,mora_calculada_hasta)
 select v_ciclo.id,p_cliente_id,a.cliente_servicio_id,a.id,
  p_periodo,cal.cobertura_hasta,cal.revision,cal.precio_centavos,
  round(cal.precio_centavos*v_pct::numeric/100)::int,
  round(cal.precio_centavos*v_pct::numeric/100)::int,
  cal.precio_centavos-round(cal.precio_centavos*v_pct::numeric/100)::int,
  cal.cobertura_hasta
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id and s.activo
 join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo and cal.estado='verificado';
 get diagnostics v_creados=row_count;
 if v_creados<>v_n then raise exception 'No se preparó la totalidad de accesos';end if;
 -- Fijar la fecha de cálculo de descuentos programados y promociones:
 -- la segunda cuota no puede recalcular el cupón con otra racha virtual.
 update public.goxion_b2_ciclos set
  fuentes_fecha_snapshot=(now() at time zone 'America/Merida')::date
 where id=v_ciclo.id;
 -- Los beneficios comerciales son persistentes; sólo la lealtad se revoca por impuntualidad.
 with sums as (
  select cliente_acceso_id,sum(monto_centavos)::int total,
   coalesce(sum(monto_centavos) filter(where fuente='promocion'),0)::int promo,
   sum(bloqueo_lealtad_centavos)::int bloqueado
  from public.goxion_b2_atribuciones_comerciales
  where cliente_id=p_cliente_id and periodo=p_periodo
  group by cliente_acceso_id
 )
 update public.goxion_b2_cargos b set
  descuento_comercial_centavos=s.total,
  descuento_original_centavos=round(greatest(0,b.base_centavos-s.promo-s.bloqueado)*v_pct::numeric/100)::int,
  descuento_vigente_centavos=round(greatest(0,b.base_centavos-s.promo-s.bloqueado)*v_pct::numeric/100)::int,
  principal_pendiente_centavos=b.base_centavos-s.total-
   round(greatest(0,b.base_centavos-s.promo-s.bloqueado)*v_pct::numeric/100)::int
 from sums s where b.ciclo_id=v_ciclo.id and b.cliente_acceso_id=s.cliente_acceso_id;
 if exists(select 1 from public.goxion_b2_cargos
  where ciclo_id=v_ciclo.id and principal_pendiente_centavos<=0)
 then raise exception 'B2_CARGO_CUBIERTO_POR_BENEFICIO_REQUIERE_REVISION';end if;
 return jsonb_build_object('ok',true,'ciclo_id',v_ciclo.id,'accesos',v_creados,
  'porcentaje_lealtad',v_pct,'repetida',false,'modo','b2_por_acceso',
  'cobrable',false,'advertencia','Ciclo creado, aún no hay pagos aprobados');
end $function$;
CREATE OR REPLACE FUNCTION public.goxion_consumir_beneficios_on_pago()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_key text;
  v_period date;
  v_subtotal numeric := 0;
  v_promos jsonb := '{}'::jsonb;
  v_promo numeric := 0;
  v_subtotal_efectivo numeric := 0;
  v_block_loyalty numeric := 0;
  v_block_tj jsonb := '[]'::jsonb;
  v_special numeric := 0;
  v_tj numeric := 0;
  v_loyalty_pct numeric := 0;
  v_loyalty numeric := 0;
  v_disponible numeric := 0;
  v_engine jsonb := '{}'::jsonb;
  x jsonb;
  v_id uuid;
  v_mode text;
  v_amount numeric;
  v_last date;
  v_client public.clientes%rowtype;
  v_last_day int;
  v_cut_day int;
  v_cut date;
  v_pact_date date;
  v_payment_date date;
begin
  if lower(coalesce(new.estado,''))<>'pagado' then return new; end if;

  v_key := public.goxion_period_key(coalesce(new.periodo,new.fecha::text));
  if v_key is null then return new; end if;
  v_period := to_date(v_key||'-01','YYYY-MM-DD');
  v_payment_date := coalesce(new.fecha,(timezone('America/Mexico_City',now()))::date);
  -- B2: las aplicaciones comerciales se honran con la fecha congelada
  -- al materializar la obligación, no con la fecha del último perfil.
  -- La fecha REAL del pago (new.fecha) no se altera ni se retrodata.
  if nullif(pg_catalog.current_setting('goxion.b2_recibo_autorizado',true),'') is not null then
   select b.fuentes_fecha_snapshot into v_payment_date
   from public.goxion_b2_ciclos b
   where b.id::text=pg_catalog.current_setting('goxion.b2_recibo_autorizado',true)
    and b.cliente_id=new.cliente_id and b.periodo=v_period and b.estado='liquidado';
   if not found or v_payment_date is null then
    raise exception 'B2_CONTEXTO_CONSUMO_NO_CONCILIADO';end if;
  end if;

  select * into v_client from public.clientes where id=new.cliente_id;

  select coalesce(sum(cs.monto),0) into v_subtotal
  from public.cliente_servicios cs where cs.cliente_id=new.cliente_id and cs.activo=true;

  v_promos := public.goxion_promociones_periodo(new.cliente_id,v_period);
  v_promo := greatest(0,coalesce((v_promos->>'total_ahorro')::numeric,0));
  v_subtotal_efectivo := greatest(0,v_subtotal-v_promo);
  v_block_loyalty := greatest(0,coalesce((v_promos->'stacking'->>'base_bloqueada_lealtad')::numeric,0));
  v_block_tj := coalesce(v_promos->'stacking'->'servicios_bloqueados_trato_justo','[]'::jsonb);

  select coalesce(sum(de.monto),0) into v_special
  from public.descuentos_especiales de
  where de.cliente_id=new.cliente_id and de.activo=true and de.monto>0;

  select coalesce(sum(t.monto),0) into v_tj
  from public.trato_justo_compensaciones t
  where t.cliente_id=new.cliente_id
    and t.activo=true
    and t.periodo=v_period
    and t.monto>0
    and not exists(
      select 1 from jsonb_array_elements_text(v_block_tj) y
      where y=t.cliente_servicio_id::text
    );

  if v_client.id is not null and v_client.estado<>'suspendido' then
    v_last_day := extract(day from(date_trunc('month',v_period)+interval '1 month - 1 day'))::int;
    v_cut_day := least(greatest(coalesce(v_client.dia_pago,15),1),v_last_day);
    v_cut := make_date(extract(year from v_period)::int,extract(month from v_period)::int,v_cut_day);

    select a.fecha_pactada into v_pact_date
    from public.acuerdos_cobro a
    where a.cliente_id=new.cliente_id and a.periodo=v_period and a.activo=true and a.estado='activo'
    order by a.updated_at desc,a.created_at desc limit 1;
    v_cut := coalesce(v_pact_date,v_cut);

    if v_payment_date<=v_cut then
      if greatest(0,coalesce(v_client.pagos_puntuales,0))>=9 then v_loyalty_pct:=0.06;
      elsif greatest(0,coalesce(v_client.pagos_puntuales,0))>=4 then v_loyalty_pct:=0.03;
      end if;
    end if;
  end if;

  v_loyalty := round(greatest(0,v_subtotal_efectivo-v_block_loyalty)*v_loyalty_pct);
  v_disponible := greatest(0,v_subtotal_efectivo-v_loyalty-v_special-v_tj);
  v_engine := public.goxion_beneficios_periodo(new.cliente_id,v_period,v_subtotal_efectivo,v_disponible);

  for x in select value from jsonb_array_elements(coalesce(v_engine->'detalles','[]'::jsonb))
  loop
    v_id := (x->>'id')::uuid;
    v_mode := x->>'modo';
    v_amount := greatest(0,coalesce((x->>'monto')::numeric,0));
    if v_amount<=0 then continue; end if;

    insert into public.beneficio_aplicaciones(beneficio_id,cliente_id,periodo,monto_aplicado,estado)
    values(v_id,new.cliente_id,v_period,v_amount,'consumido')
    on conflict(beneficio_id,periodo) do update
      set monto_aplicado=excluded.monto_aplicado,estado='consumido';

    if v_mode='una_vez_elegible' then
      update public.beneficios_programados
      set periodos_consumidos=1,estado='consumido',activo=false,
          consumido_at=coalesce(consumido_at,now()),updated_at=now()
      where id=v_id;
    else
      update public.beneficios_programados bp
      set periodos_consumidos=(
        select count(*) from public.beneficio_aplicaciones ba
        where ba.beneficio_id=bp.id and ba.estado='consumido'
      ),updated_at=now()
      where bp.id=v_id;

      select(periodo_inicio+make_interval(months=>periodos_total-1))::date
      into v_last from public.beneficios_programados where id=v_id;

      if v_period>=v_last then
        update public.beneficios_programados
        set estado='finalizado',activo=false,consumido_at=coalesce(consumido_at,now()),updated_at=now()
        where id=v_id;
      end if;
    end if;
  end loop;
  return new;
end;
$function$;
revoke all on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_iniciar_ciclo(uuid,date),
 public.goxion_consumir_beneficios_on_pago()
 from public,anon,authenticated;
grant execute on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_iniciar_ciclo(uuid,date),
 public.goxion_consumir_beneficios_on_pago() to service_role;
