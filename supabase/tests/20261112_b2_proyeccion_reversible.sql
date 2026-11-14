-- GOXION · regresión reversible de proyección por cobertura pagada.
-- Requiere desplegar previamente la RPC solo lectura en el entorno AISLADO.
-- NO aprueba pagos ni inserta clientes; BEGIN/ROLLBACK preservan las tablas.
begin;
do $test$
declare
 f date; p jsonb;
begin
 f=public.goxion_b2_proxima_renovacion('2026-11-15'::date,15::smallint);
 if f<>'2026-12-15' then raise exception 'Vencimiento del 15 incorrecto: %',f;end if;
 f=public.goxion_b2_proxima_renovacion('2026-11-30'::date,30::smallint);
 if f<>'2026-12-30' then raise exception 'Vencimiento del 30 incorrecto: %',f;end if;
 f=public.goxion_b2_proxima_renovacion('2026-12-20'::date,20::smallint);
 if f<>'2027-01-20' then raise exception 'Servicio con diciembre pagado se cobraría dos veces: %',f;end if;
 f=public.goxion_b2_proxima_renovacion('2027-02-28'::date,31::smallint);
 if f<>'2027-03-31' then raise exception 'Febrero 28 a marzo 31 incorrecto: %',f;end if;
 f=public.goxion_b2_proxima_renovacion('2028-02-29'::date,31::smallint);
 if f<>'2028-03-31' then raise exception 'Bisiesto incorrecto: %',f;end if;
 f=public.goxion_b2_proxima_renovacion('2027-01-29'::date,31::smallint);
 if f<>'2027-01-31' then raise exception 'Corte dentro de mes incorrecto: %',f;end if;
 -- El calendario B2 puede avanzar al vencimiento del mismo mes al liquidarse.
 f=public.goxion_b2_vencimiento_periodo('2026-11-15'::date,15::smallint,'2026-12-01'::date);
 if f<>'2026-12-15' then raise exception 'Ciclo diciembre incorrecto: %',f;end if;
 f=public.goxion_b2_vencimiento_periodo('2026-11-15'::date,15::smallint,'2027-01-01'::date);
 if f<>'2027-01-15' then raise exception 'Ciclo enero recicló diciembre: %',f;end if;
 f=public.goxion_b2_vencimiento_periodo('2027-01-15'::date,15::smallint,'2027-01-01'::date);
 if f<>'2027-01-15' then raise exception 'Calendario avanzado al vencimiento enero se bloqueó: %',f;end if;
 f=public.goxion_b2_vencimiento_periodo('2027-02-20'::date,20::smallint,'2027-01-01'::date);
 if f is not null then raise exception 'Cobertura futura creó cargo anticipado: %',f;end if;
 if has_function_privilege('anon','public.goxion_b2_previsualizar_renovaciones(uuid,date)','EXECUTE')
   or has_function_privilege('authenticated','public.goxion_b2_previsualizar_renovaciones(uuid,date)','EXECUTE')
 then raise exception 'La vista privada no debe poder llamarse sin service_role';end if;
 if not has_function_privilege('service_role','public.goxion_b2_previsualizar_renovaciones(uuid,date)','EXECUTE')
 then raise exception 'El gateway Admin no tiene permiso a la vista';end if;
 p=public.goxion_b2_previsualizar_renovaciones(gen_random_uuid(),'2026-12-01'::date);
 if p->>'ok'<>'true' or p->>'solo_lectura'<>'true'
 then raise exception 'La vista debe ser consultable y sin mutaciones: %',p;end if;
end
$test$;
select 'B2_PROYECCION_REVERSIBLE_PASS' as resultado;
rollback;
