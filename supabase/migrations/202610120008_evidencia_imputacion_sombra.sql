-- GOXION B2 · Sólo confirmaciones sombra con evidencia del calendario actual.
-- Bloquea retroactividad, precio desactualizado, abonos sin aprobación,
-- descuentos/mora sin atribución. No toca cobros oficiales ni Index.
alter table public.goxion_obligaciones_sombra
 add column if not exists calendario_revision integer
 check(calendario_revision>0);

create or replace function public.goxion_confirmar_imputacion_sombra(
 p_imputacion_id uuid,p_clave_confirmacion uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v record; v_repetida boolean:=false; v_resumen jsonb; v_ob record; v_cal record;
begin
 if p_imputacion_id is null or p_clave_confirmacion is null then
   raise exception 'Imputación y clave idempotente obligatorias';
 end if;
 -- Orden inmutable: obligación, después imputación y comprobante.
 select obligacion_id into v from public.goxion_imputaciones_sombra
 where id=p_imputacion_id;
 if v.obligacion_id is null then raise exception 'Imputación inexistente';end if;
 perform 1 from public.goxion_obligaciones_sombra
 where id=v.obligacion_id for update;
 select * into v from public.goxion_imputaciones_sombra
 where id=p_imputacion_id for update;
 -- Antes de confirmar, el acceso técnico y su calendario deben corresponder
 -- exactamente a la obligación guardada, sin cambios de versión ni fecha.
 select ob.* into v_ob from public.goxion_obligaciones_sombra ob
 where ob.id=v.obligacion_id for update;
 select ca.estado,ca.revision,ca.cobertura_hasta,ca.precio_centavos
 into v_cal from public.goxion_calendario_accesos ca
 where ca.cliente_acceso_id=v_ob.cliente_acceso_id;
 if v_cal.estado is distinct from 'verificado'
   or v_cal.revision is distinct from v_ob.calendario_revision
   or v_cal.cobertura_hasta is distinct from v_ob.fecha_vencimiento
   or v_cal.precio_centavos is distinct from v_ob.base_centavos
   or v_ob.ciclo_inicio is distinct from date_trunc('month',v_ob.fecha_vencimiento)::date then
   raise exception 'Calendario cambió o el ciclo/precio no están verificados';
 end if;
 -- Los descuentos, la mora y los cargos deben tener atribución acreditable
 -- antes de habilitar importes B2; no convertir cifras globales prorrateadas.
 if v_ob.descuentos_centavos>0 or v_ob.mora_centavos>0 or v_ob.otros_cargos_centavos>0 then
   raise exception 'Beneficios o mora pendientes de atribución por obligación';
 end if;
 if v.pago_id is null then
   raise exception 'El abono parcial requiere una aprobación individual previa';
 end if;
 if v.estado='imputada_sombra' then
   if v.confirmacion_clave is distinct from p_clave_confirmacion then
     raise exception 'Imputación confirmada con otra clave';
   end if;
   v_repetida=true;
 elsif v.estado='propuesta' then
   -- Volver a validar pago pagado, período, mismo propietario, importe
   -- y saldo usando el trigger actualizado: una sola transacción.
   update public.goxion_imputaciones_sombra
   set estado='imputada_sombra',confirmacion_clave=p_clave_confirmacion,
       confirmado_en=now()
   where id=p_imputacion_id;
 else
   raise exception 'Imputación descartada no puede recuperarse';
 end if;
 v_resumen=public.goxion_resumen_imputacion_sombra(v.obligacion_id);
 return jsonb_build_object('ok',true,'imputacion_id',p_imputacion_id,
   'repetida',v_repetida,'estado','imputada_sombra',
   'saldo_proyectado',v_resumen,'acreditada_oficial',false,
   'modo','asignacion_sombra_sin_cobro');
end $$;

