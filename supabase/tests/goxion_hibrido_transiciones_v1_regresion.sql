-- Regresión sin escrituras del planificador financiero híbrido.
-- Incluye transiciones y guardas de idempotencia/contabilidad.
do $goxion_test$
declare
 v record;
 v_actual text;
 v_plan jsonb;
 v_pasos int:=0;
 v_cuentas int:=0;
 v_decisiones int:=0;
begin
 for v in
   select * from (values
    ('fecha única estable','fecha_unica',false,false,false,false,false,false,false,'ESTABLE_FECHA_UNICA'),
    ('alta multifecha candidata','multifecha',false,false,false,false,false,false,false,'CANDIDATA_ALTA_MULTIFECHA'),
    ('global pagado bloquea alta','multifecha',false,false,false,false,true,false,false,'MIGRACION_BLOQUEADA_POR_PAGO_GLOBAL'),
    ('global en revisión bloquea alta','multifecha',false,false,false,false,false,true,false,'MIGRACION_BLOQUEADA_POR_PAGO_GLOBAL'),
    ('parcial legacy bloquea alta','multifecha',false,false,false,false,false,false,true,'MIGRACION_BLOQUEADA_POR_PAGO_GLOBAL'),
    ('ciclo faltante','multifecha',true,false,false,false,false,false,false,'CICLO_B2_NO_PREPARADO'),
    ('multifecha con cargo pendiente','multifecha',true,true,true,false,false,false,false,'ESTABLE_MULTIFECHA'),
    ('baja de acceso sin saldar','fecha_unica',true,true,true,false,false,false,false,'MANTENER_B2_HASTA_LIQUIDAR'),
    ('baja de acceso saldo cero','fecha_unica',true,true,false,false,false,false,false,'CANDIDATA_SALIDA_B2_PROXIMO_CICLO'),
    ('ciclo histórico B2 pendiente','fecha_unica',true,true,false,true,false,false,false,'B2_HISTORICO_PENDIENTE_CON_CICLO'),
    ('histórico sin régimen','fecha_unica',false,false,false,true,false,false,false,'HISTORICO_B2_PENDIENTE'),
    ('ciclo sin flag','fecha_unica',false,true,false,false,false,false,false,'B2_CICLO_SIN_REGIMEN'),
    ('calendario sin conciliar','calendario_pendiente',false,false,false,false,false,false,false,'CALENDARIO_NO_CONCILIADO'),
    ('sin accesos sin deuda','sin_accesos',false,false,false,false,false,false,false,'SIN_ACCESOS'),
    ('sin accesos con deuda','sin_accesos',false,false,false,true,false,false,false,'SIN_ACCESOS_CON_DEUDA'),
    ('conflicto B2 y global pagado','multifecha',true,true,false,false,true,false,false,'CONFLICTO_PAGO_GLOBAL_B2'),
    ('conflicto B2 y revisión global','multifecha',true,true,false,false,false,true,false,'CONFLICTO_REVISION_GLOBAL_B2'),
    ('conflicto B2 y parcial legacy','multifecha',true,true,false,false,false,false,true,'CONFLICTO_REVISION_GLOBAL_B2'),
    ('histórico al mantener multifecha','multifecha',true,true,false,true,false,false,false,'B2_HISTORICO_PENDIENTE_CON_CICLO'),
    ('borrador con B2 y sin ciclo','calendario_pendiente',true,false,false,false,false,false,false,'CICLO_B2_NO_PREPARADO')
   ) as casos(nombre,modo,b2,ciclo,deuda_actual,deuda_historica,
              global_pagado,global_revision,parcial_legacy,esperado)
 loop
   v_actual:=public.goxion_hibrido_decidir_transicion_v1(
     v.modo,v.b2,v.ciclo,v.deuda_actual,v.deuda_historica,
     v.global_pagado,v.global_revision,v.parcial_legacy
   );
   if v_actual is distinct from v.esperado then
     raise exception 'Caso de transición %: se esperaba %, se obtuvo %',
       v.nombre,v.esperado,v_actual;
   end if;
   v_pasos:=v_pasos+1;
 end loop;

 -- El reductor integrado debe emitir exactamente la misma decisión.
 for v in select c.id from public.clientes c loop
   v_cuentas:=v_cuentas+1;
   v_plan:=public.goxion_hibrido_plan_transicion_v1(v.id,'2026-11-11'::date);
   if v_plan->>'cobrable'<>'false' or v_plan->>'ejecutable'<>'false' then
     raise exception 'El plan autoriza cobro/escritura sin aprobación';
   end if;
   if v_plan->>'ok'='true' then
     if v_plan->>'codigo' is distinct from
       public.goxion_hibrido_decidir_transicion_v1(
         v_plan->>'modo_deducido',
         (v_plan->>'b2_activo')::boolean,
         (v_plan->>'ciclo_b2_actual')::boolean,
         (v_plan->>'deuda_b2_actual')::boolean,
         (v_plan->>'deuda_b2_historica')::boolean,
         (v_plan->>'pago_global_confirmado')::boolean,
         (v_plan->>'pago_global_en_revision')::boolean,
         (v_plan->>'parcial_heredado_activo')::boolean
       ) then
       raise exception 'El plan no coincide con el reductor puro';
     end if;
     v_decisiones:=v_decisiones+1;
   else
     if v_plan->>'requiere_revision'<>'true' then
       raise exception 'Caso inválido sin cierre por revisión';
     end if;
   end if;
 end loop;

 if v_cuentas=0 or v_decisiones=0 then
   raise exception 'Fixtures insuficientes: % cuentas, % decisiones',v_cuentas,v_decisiones;
 end if;

 -- Las dos funciones nuevas deben estar cerradas al navegador.
 if exists(
   select 1 from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname in (
       'goxion_hibrido_decidir_transicion_v1',
       'goxion_hibrido_plan_transicion_v1'
     )
     and (has_function_privilege('anon',p.oid,'EXECUTE')
       or has_function_privilege('authenticated',p.oid,'EXECUTE')
       or not has_function_privilege('service_role',p.oid,'EXECUTE')
       or p.prosecdef)
 ) then
    raise exception 'Permisos o SECURITY DEFINER inseguros';
 end if;

 raise notice 'OK: % reglas, % cuentas reales aisladas, % decisiones; sin DML',
   v_pasos,v_cuentas,v_decisiones;
end $goxion_test$;

-- Resumen anónimo de los casos observados.
with s as (
 select public.goxion_hibrido_plan_transicion_v1(id,'2026-11-11'::date) plan
 from public.clientes
)
select plan->>'codigo' as codigo,count(*)::int as casos
from s group by 1 order by 1;
