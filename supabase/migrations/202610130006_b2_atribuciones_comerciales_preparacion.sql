-- GOXION B2 F2: trazabilidad comercial por acceso; PREPARACIÓN SIN COBROS.
-- Reutiliza goxion_estado_financiero y sus submotores, no reinterpreta ofertas.
create table if not exists public.goxion_b2_atribuciones_comerciales(
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 periodo date not null check(periodo=date_trunc('month',periodo)::date),
 fuente text not null check(fuente in ('promocion','especial','trato_justo','programado')),
 referencia_id uuid not null,
 cliente_acceso_id uuid not null references public.cliente_accesos(id) on delete restrict,
 monto_centavos integer not null check(monto_centavos>0),
 justificacion text not null check(length(btrim(justificacion)) between 12 and 400),
 validado_por text not null check(length(btrim(validado_por)) between 3 and 120),
 creado_en timestamptz not null default now(),
 unique(cliente_id,periodo,fuente,referencia_id,cliente_acceso_id)
);
create index if not exists goxion_b2_atribucion_origen_idx on public.goxion_b2_atribuciones_comerciales(cliente_id,periodo,fuente,referencia_id);
alter table public.goxion_b2_atribuciones_comerciales enable row level security;
revoke all on public.goxion_b2_atribuciones_comerciales from public,anon,authenticated;
grant select,insert,update,delete on public.goxion_b2_atribuciones_comerciales to service_role;

-- Snapshot efectivo: obtiene importes y restricciones desde el motor oficial.
create or replace function public.goxion_b2_fuentes_comerciales(p_cliente_id uuid,p_periodo date)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  'cobrable',false);
end $$;

-- Valida montos EXACTOS y destino de cada descuento sin repartir de oficio.
create or replace function public.goxion_b2_validar_atribuciones(p_cliente_id uuid,p_periodo date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f jsonb;src jsonb; x jsonb; wanted bigint;given bigint;
 missing jsonb:='[]'::jsonb;bad jsonb:='[]'::jsonb;
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
 return f||jsonb_build_object('conciliado',
  jsonb_array_length(missing)=0 and jsonb_array_length(bad)=0,
  'faltantes',missing,'errores',bad,'cobrable',false);
end $$;

-- Sólo Admin autenticado desde gateway service-role podrá invocarla.
-- Reemplazo completo en una transacción; cualquier error revierte todo.
create or replace function public.goxion_b2_guardar_atribuciones(
 p_cliente_id uuid,p_periodo date,p_lineas jsonb,p_actor text)
returns jsonb language plpgsql security definer set search_path='' as $$
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
    monto_centavos,justificacion,validado_por)
  values(p_cliente_id,p_periodo,x->>'fuente',
    (x->>'referencia_id')::uuid,(x->>'cliente_acceso_id')::uuid,
    (x->>'monto_centavos')::integer,x->>'justificacion',p_actor);
 end loop;
 v=public.goxion_b2_validar_atribuciones(p_cliente_id,p_periodo);
 if v->>'conciliado'<>'true' or v->>'ok'<>'true'
 then raise exception 'ATRIBUCION_NO_CONCILIADA: %',v;end if;
 return v||jsonb_build_object('guardado',true,'actor',p_actor);
end $$;
revoke all on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_validar_atribuciones(uuid,date),
 public.goxion_b2_guardar_atribuciones(uuid,date,jsonb,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_fuentes_comerciales(uuid,date),
 public.goxion_b2_validar_atribuciones(uuid,date),
 public.goxion_b2_guardar_atribuciones(uuid,date,jsonb,text) to service_role;
