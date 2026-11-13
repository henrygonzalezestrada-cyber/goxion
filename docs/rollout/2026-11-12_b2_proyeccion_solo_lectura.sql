-- GOXION · Proyección de renovaciones por cobertura pagada.
-- CORTE A: SOLO LECTURA. No modifica régimen, pagos, cargos ni coberturas.
-- BORRADOR DE DESPLIEGUE: generar migración con Supabase CLI al promover.
-- Instalación: primero en entorno aislado, validar y luego promover a producción.
-- Rollback si no existen consumidores: DROP FUNCTION ... previsualizar; DROP FUNCTION ... proxima_renovacion.

create or replace function public.goxion_b2_proxima_renovacion(
  p_cobertura_hasta date, p_dia_corte smallint
) returns date
language sql immutable strict security invoker
set search_path = ''
as $proxima$
 with mes as (
   select date_trunc('month',p_cobertura_hasta)::date as inicio
 ), cortes as (
   select
     (inicio + least(p_dia_corte::int,
       extract(day from (inicio+interval '1 month - 1 day')::date)::int)-1)::date as actual,
     ((inicio+interval '1 month')::date
       +least(p_dia_corte::int,
       extract(day from (inicio+interval '2 months - 1 day')::date)::int)-1)::date as siguiente
   from mes
 )
 select case when p_dia_corte between 1 and 31
   then case when actual>p_cobertura_hasta then actual else siguiente end
   else null end
 from cortes
$proxima$;

revoke all on function public.goxion_b2_proxima_renovacion(date,smallint)
 from public, anon, authenticated;
grant execute on function public.goxion_b2_proxima_renovacion(date,smallint) to service_role;

create or replace function public.goxion_b2_previsualizar_renovaciones(
  p_cliente_id uuid, p_periodo date
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $vista$
declare v_result jsonb;
begin
 if p_cliente_id is null or p_periodo is null
    or p_periodo<>date_trunc('month',p_periodo)::date then
   return jsonb_build_object('ok',false,'codigo','FIN-PERIODO-409',
     'motivo','Cliente o primer día del periodo inválidos','solo_lectura',true);
 end if;
 with lineas as (
   select a.id as acceso_id,a.cliente_servicio_id,
     cal.estado,cal.revision,cal.precio_centavos,
     cal.cobertura_hasta,cal.dia_corte,
     (cal.estado='verificado' and cal.revision>0
       and cal.precio_centavos>0 and cal.cobertura_hasta is not null
       and cal.dia_corte between 1 and 31) as verificada,
     public.goxion_b2_proxima_renovacion(cal.cobertura_hasta,cal.dia_corte)
       as siguiente_vencimiento
   from public.cliente_accesos a
   join public.cliente_servicios s on s.id=a.cliente_servicio_id
      and s.cliente_id=p_cliente_id and s.activo
   left join public.goxion_calendario_accesos cal
      on cal.cliente_acceso_id=a.id and cal.cliente_id=p_cliente_id
   where a.cliente_id=p_cliente_id and a.activo
 ), resumen as (
   select count(*)::int as perfiles,
     count(*) filter(where verificada)::int as verificados,
     count(*) filter(where verificada and siguiente_vencimiento>=p_periodo
       and siguiente_vencimiento<(p_periodo+interval '1 month')::date)::int
        as exigibles_en_periodo,
     count(distinct siguiente_vencimiento) filter(
       where verificada and siguiente_vencimiento>=p_periodo
        and siguiente_vencimiento<(p_periodo+interval '1 month')::date)::int
        as fechas_distintas,
     count(*) filter(where verificada and siguiente_vencimiento<p_periodo)::int
        as atrasados,
     count(*) filter(where verificada and siguiente_vencimiento>=(p_periodo+interval '1 month')::date)::int
        as cubiertos_periodos_futuros,
     coalesce(jsonb_agg(jsonb_build_object(
       'acceso_id',acceso_id,
       'cliente_servicio_id',cliente_servicio_id,
       'cobertura_hasta',cobertura_hasta,
       'proxima_renovacion',siguiente_vencimiento,
       'verificada',coalesce(verificada,false),
       'exigible_en_periodo',(coalesce(verificada,false) and siguiente_vencimiento>=p_periodo
           and siguiente_vencimiento<(p_periodo+interval '1 month')::date)
     ) order by acceso_id) filter(where acceso_id is not null),'[]'::jsonb) as detalles
   from lineas
 )
 select jsonb_build_object(
   'ok',true,'solo_lectura',true,'periodo',p_periodo,
   'perfiles',perfiles,'perfiles_verificados',verificados,
   'exigibles_en_periodo',exigibles_en_periodo,
   'fechas_distintas',fechas_distintas,
   'atrasados',atrasados,'cubiertos_periodos_futuros',cubiertos_periodos_futuros,
   'todos_exigibles_en_periodo',(perfiles>=2 and perfiles=verificados
     and perfiles=exigibles_en_periodo and fechas_distintas>=2),
   'renovaciones',detalles
 ) into v_result from resumen;
 return v_result;
end
$vista$;

revoke all on function public.goxion_b2_previsualizar_renovaciones(uuid,date)
 from public, anon, authenticated;
grant execute on function public.goxion_b2_previsualizar_renovaciones(uuid,date)
 to service_role;
