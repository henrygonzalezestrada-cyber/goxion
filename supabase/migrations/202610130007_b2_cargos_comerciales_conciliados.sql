-- GOXION B2 F2: integrar atribuciones comerciales verificadas, sin clientes activos.
alter table public.goxion_b2_cargos add column if not exists descuento_comercial_centavos
 integer not null default 0 check(descuento_comercial_centavos>=0);
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
 if coalesce((v_fin->'promociones'->'stacking'->>'base_bloqueada_lealtad')::numeric,0)>0 then
  raise exception 'B2_PROMOCION_NO_ACUMULABLE_REQUIERE_BASE_INDIVIDUAL';end if;
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
   coalesce(sum(monto_centavos) filter(where fuente='promocion'),0)::int promo
  from public.goxion_b2_atribuciones_comerciales
  where cliente_id=p_cliente_id and periodo=p_periodo
  group by cliente_acceso_id
 )
 update public.goxion_b2_cargos b set
  descuento_comercial_centavos=s.total,
  descuento_original_centavos=round((b.base_centavos-s.promo)*v_pct::numeric/100)::int,
  descuento_vigente_centavos=round((b.base_centavos-s.promo)*v_pct::numeric/100)::int,
  principal_pendiente_centavos=b.base_centavos-s.total-
   round((b.base_centavos-s.promo)*v_pct::numeric/100)::int
 from sums s where b.ciclo_id=v_ciclo.id and b.cliente_acceso_id=s.cliente_acceso_id;
 if exists(select 1 from public.goxion_b2_cargos
  where ciclo_id=v_ciclo.id and principal_pendiente_centavos<=0)
 then raise exception 'B2_CARGO_CUBIERTO_POR_BENEFICIO_REQUIERE_REVISION';end if;
 return jsonb_build_object('ok',true,'ciclo_id',v_ciclo.id,'accesos',v_creados,
  'porcentaje_lealtad',v_pct,'repetida',false,'modo','b2_por_acceso',
  'cobrable',false,'advertencia','Ciclo creado, aún no hay pagos aprobados');
end $function$;
CREATE OR REPLACE FUNCTION public.goxion_b2_cotizar_ciclo(p_cliente_id uuid, p_periodo date, p_hoy date DEFAULT ((now() AT TIME ZONE 'America/Merida'::text))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ciclo record;v_descartado boolean;v_res jsonb;v_base int;v_n int;
begin
 if p_cliente_id is null or p_periodo is null or p_hoy is null or
  p_periodo<>date_trunc('month',p_periodo)::date then
  raise exception 'Cotización multifecha requiere cliente/periodo/día';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where cliente_id=p_cliente_id and periodo=p_periodo;
 if not found then return jsonb_build_object('ok',false,
   'codigo','CICLO_NO_PREPARADO','cobrable',false);end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  return jsonb_build_object('ok',false,'codigo','REGIMEN_INACTIVO','cobrable',false);
 end if;
 select v_ciclo.lealtad_perdida or exists(select 1
  from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
  and b.fecha_vencimiento<p_hoy and not b.liquidado
  and not exists(select 1 from public.goxion_b2_prorrogas pr
    where pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento and pr.estado='aprobada' and pr.fecha_pactada>=p_hoy))
 into v_descartado;
 select coalesce(jsonb_agg(jsonb_build_object(
 'cargo_id',q.id,'acceso_id',q.cliente_acceso_id,'vence',q.fecha_vencimiento,
 'base_centavos',q.base_centavos,
 'descuento_centavos',q.descuento_efectivo,
 'descuento_comercial_centavos',q.descuento_comercial_centavos,
 'descuento_total_centavos',q.descuento_efectivo+q.descuento_comercial_centavos,
 'principal_centavos',q.principal_efectivo,
 'mora_centavos',q.mora_efectiva,
 'total_centavos',q.principal_efectivo+q.mora_efectiva,
 'pagado',q.liquidado,
 'fecha_pactada',q.fecha_pactada,'prorroga_estado',q.prorroga_estado) order by q.fecha_vencimiento,q.id),'[]'::jsonb)
 into v_res
 from (
 select b.*,case when v_descartado and not b.liquidado then 0
    else b.descuento_vigente_centavos end descuento_efectivo,
   (b.principal_pendiente_centavos +
    case when v_descartado and not b.liquidado
      then b.descuento_vigente_centavos else 0 end) principal_efectivo,
   b.mora_pendiente_centavos +
     case when pr.estado='aprobada' and p_hoy<=pr.fecha_pactada
       then 0 else
     least(greatest(0,round(b.base_centavos*.50)::int-b.mora_generada_centavos),
      greatest(0,p_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
       round((b.principal_pendiente_centavos+
        case when v_descartado and not b.liquidado
          then b.descuento_vigente_centavos else 0 end)*.05)::int)
     end as mora_efectiva,pr.fecha_pactada,pr.estado as prorroga_estado
 from public.goxion_b2_cargos b
 left join public.goxion_b2_prorrogas pr on pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento
 where b.ciclo_id=v_ciclo.id
 ) q;
 return jsonb_build_object('ok',true,'modo','b2_multifecha',
  'cobrable',true,'solo_cotizacion',true,'requiere_aprobacion_admin',true,
  'cliente_id',p_cliente_id,
  'periodo',p_periodo,'lealtad_global_perdida',v_descartado,
  'cargos',v_res,
  'total_pendiente_centavos',(
   select coalesce(sum((i->>'total_centavos')::bigint),0)
   from jsonb_array_elements(v_res) i));
end $function$;
revoke all on function public.goxion_b2_iniciar_ciclo(uuid,date),
 public.goxion_b2_cotizar_ciclo(uuid,date,date) from public,anon,authenticated;
grant execute on function public.goxion_b2_iniciar_ciclo(uuid,date),
 public.goxion_b2_cotizar_ciclo(uuid,date,date) to service_role;