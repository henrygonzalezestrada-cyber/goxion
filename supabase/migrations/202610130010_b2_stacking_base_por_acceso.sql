-- B2 F2: monto explícito de la base sin lealtad de promociones no acumulables.
alter table public.goxion_b2_atribuciones_comerciales
 add column if not exists bloqueo_lealtad_centavos integer not null default 0
 check(bloqueo_lealtad_centavos>=0);
CREATE OR REPLACE FUNCTION public.goxion_b2_fuentes_comerciales(p_cliente_id uuid, p_periodo date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f jsonb;claims jsonb:='[]'::jsonb; x jsonb;
 ref uuid; cents integer;scope jsonb;total bigint;expected bigint;
begin
 if p_cliente_id is null or p_periodo is null or p_periodo<>date_trunc('month',p_periodo)::date
 then raise exception 'ATRIBUCION_PERIODO_INVALIDO';end if;
 if not exists(select 1 from public.clientes
  where id=p_cliente_id and periodo_pendiente=p_periodo)
 then return jsonb_build_object('ok',false,'codigo','PERIODO_NO_PENDIENTE');end if;
 f=public.goxion_estado_financiero(p_cliente_id);
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
CREATE OR REPLACE FUNCTION public.goxion_b2_validar_atribuciones(p_cliente_id uuid, p_periodo date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f jsonb;src jsonb; x jsonb; wanted bigint;given bigint;
 missing jsonb:='[]'::jsonb;bad jsonb:='[]'::jsonb;v_block bigint;v_block_off bigint;
begin
 f=public.goxion_b2_fuentes_comerciales(p_cliente_id,p_periodo);
 if f->>'ok'<>'true' then return f;end if;
 src=coalesce(f->'fuentes','[]'::jsonb);
 for x in select value from jsonb_array_elements(src) loop
  wanted=(x->>'monto_centavos')::bigint;
  select coalesce(sum(a.monto_centavos),0) into given
  from public.goxion_b2_atribuciones_comerciales a
  where a.cliente_id=p_cliente_id and a.periodo=p_periodo
   and a.fuente=x->>'fuente'
   and a.referencia_id=(x->>'referencia_id')::uuid;
  if wanted<>given then
   missing=missing||jsonb_build_array(jsonb_build_object(
    'fuente',x->>'fuente','referencia_id',x->>'referencia_id',
    'esperado',wanted,'asignado',given));end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object(
    'fuente',a.fuente,'referencia_id',a.referencia_id,'acceso_id',a.cliente_acceso_id,
    'codigo',case when ac.id is null then 'ACCESO_INVALIDO'
     when cal.id is null then 'CALENDARIO_NO_VERIFICADO'
     when s.value is null then 'FUENTE_NO_VIGENTE'
     else 'SERVICIO_NO_PERTENECE_A_PROMOCION' end)), '[]'::jsonb)
 into bad
 from public.goxion_b2_atribuciones_comerciales a
 left join public.cliente_accesos ac on ac.id=a.cliente_acceso_id
  and ac.cliente_id=p_cliente_id and ac.activo
 left join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=ac.id
  and cal.cliente_id=p_cliente_id and cal.estado='verificado'
  and cal.precio_centavos>0 and cal.cobertura_hasta>=p_periodo
  and cal.cobertura_hasta<(p_periodo+interval '1 month')::date
 left join lateral (
  select y.value from jsonb_array_elements(src) y
  where y.value->>'fuente'=a.fuente
   and y.value->>'referencia_id'=a.referencia_id::text limit 1
 ) s on true
 where a.cliente_id=p_cliente_id and a.periodo=p_periodo
 and (ac.id is null or cal.id is null or s.value is null
  or (jsonb_array_length(coalesce(s.value->'servicios_destino','[]'::jsonb))>0
   and not (s.value->'servicios_destino' ? ac.cliente_servicio_id::text)));
 if exists(
 select 1 from public.goxion_b2_atribuciones_comerciales a
 join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.cliente_acceso_id
 where a.cliente_id=p_cliente_id and a.periodo=p_periodo
 group by a.cliente_acceso_id,cal.precio_centavos
 having sum(a.monto_centavos)>cal.precio_centavos
 ) then bad=bad||jsonb_build_array(jsonb_build_object('codigo','DESCUENTO_SUPERA_PRECIO'));end if;
 select coalesce(sum(bloqueo_lealtad_centavos),0) into v_block
 from public.goxion_b2_atribuciones_comerciales
 where cliente_id=p_cliente_id and periodo=p_periodo;
 v_block_off=coalesce((f->>'base_bloqueada_lealtad_centavos')::bigint,0);
 if v_block<>v_block_off then
  bad=bad||jsonb_build_array(jsonb_build_object(
   'codigo','BASE_LEALTAD_NO_ACUMULABLE_NO_CONCILIADA',
   'esperado_centavos',v_block_off,'asignado_centavos',v_block));end if;
 if exists(select 1 from public.goxion_b2_atribuciones_comerciales
  where cliente_id=p_cliente_id and periodo=p_periodo
    and fuente<>'promocion' and bloqueo_lealtad_centavos<>0)
 then bad=bad||jsonb_build_array(jsonb_build_object(
  'codigo','BLOQUEO_LEALTAD_SOLO_PROMOCIONES'));end if;
 if exists(select 1
  from public.goxion_b2_atribuciones_comerciales a
  join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.cliente_acceso_id
  where a.cliente_id=p_cliente_id and a.periodo=p_periodo
  group by a.cliente_acceso_id,cal.precio_centavos
  having sum(a.bloqueo_lealtad_centavos)
    >cal.precio_centavos-sum(case when a.fuente='promocion'
       then a.monto_centavos else 0 end))
 then bad=bad||jsonb_build_array(jsonb_build_object(
  'codigo','BLOQUEO_LEALTAD_SUPERA_BASE_POR_ACCESO'));end if;
 return f||jsonb_build_object('conciliado',
  jsonb_array_length(missing)=0 and jsonb_array_length(bad)=0,
  'faltantes',missing,'errores',bad,'cobrable',false);
end $function$;
CREATE OR REPLACE FUNCTION public.goxion_b2_guardar_atribuciones(p_cliente_id uuid, p_periodo date, p_lineas jsonb, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare x jsonb;v jsonb;
begin
 if p_cliente_id is null or p_periodo is null or
  p_periodo<>date_trunc('month',p_periodo)::date
  or jsonb_typeof(p_lineas) is distinct from 'array'
  or jsonb_array_length(p_lineas)>100
  or length(btrim(coalesce(p_actor,''))) not between 3 and 120
 then raise exception 'ATRIBUCION_INVALIDA';end if;
 perform 1 from public.clientes
  where id=p_cliente_id and periodo_pendiente=p_periodo for update;
 if not found then raise exception 'ATRIBUCION_CLIENTE_PERIODO';end if;
 if exists(select 1 from public.goxion_b2_ciclos
  where cliente_id=p_cliente_id and periodo=p_periodo)
 then raise exception 'ATRIBUCION_CICLO_CONGELADO';end if;
 delete from public.goxion_b2_atribuciones_comerciales
  where cliente_id=p_cliente_id and periodo=p_periodo;
 for x in select value from jsonb_array_elements(p_lineas) loop
  insert into public.goxion_b2_atribuciones_comerciales(
    cliente_id,periodo,fuente,referencia_id,cliente_acceso_id,
    monto_centavos,bloqueo_lealtad_centavos,justificacion,validado_por)
  values(p_cliente_id,p_periodo,x->>'fuente',
    (x->>'referencia_id')::uuid,(x->>'cliente_acceso_id')::uuid,
    (x->>'monto_centavos')::integer,coalesce((x->>'bloqueo_lealtad_centavos')::int,0),x->>'justificacion',p_actor);
 end loop;
 v=public.goxion_b2_validar_atribuciones(p_cliente_id,p_periodo);
 if v->>'conciliado'<>'true' or v->>'ok'<>'true'
 then raise exception 'ATRIBUCION_NO_CONCILIADA: %',v;end if;
 return v||jsonb_build_object('guardado',true,'actor',p_actor);
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
revoke all on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_validar_atribuciones(uuid,date),
 public.goxion_b2_guardar_atribuciones(uuid,date,jsonb,text),
 public.goxion_b2_iniciar_ciclo(uuid,date)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_validar_atribuciones(uuid,date),
 public.goxion_b2_guardar_atribuciones(uuid,date,jsonb,text),
 public.goxion_b2_iniciar_ciclo(uuid,date) to service_role;