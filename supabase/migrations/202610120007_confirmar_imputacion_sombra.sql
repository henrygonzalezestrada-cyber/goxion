-- GOXION B2 · Confirmación de imputación EN SOMBRA.
-- Refleja asignación de pago YA APROBADO; NO crea transferencia, NO marca
-- pagado en el ledger oficial, NO consume descuentos/cupones ni condona mora.
-- Transacción idempotente y auditable para piloto aislado. No activa Index.
alter table public.goxion_imputaciones_sombra
 drop constraint if exists goxion_imputaciones_sombra_estado_check;
alter table public.goxion_imputaciones_sombra
 add constraint goxion_imputaciones_sombra_estado_check
 check (estado in ('propuesta','imputada_sombra','descartada'));

alter table public.goxion_imputaciones_sombra
 add column if not exists confirmacion_clave uuid;
alter table public.goxion_imputaciones_sombra
 add column if not exists confirmado_en timestamptz;
create unique index if not exists goxion_imputaciones_confirmacion_key_uq
 on public.goxion_imputaciones_sombra(confirmacion_clave)
 where confirmacion_clave is not null;
alter table public.goxion_imputaciones_sombra add constraint
 goxion_imputaciones_confirmacion_consistente check (
 (estado='imputada_sombra' and confirmacion_clave is not null and confirmado_en is not null)
 or (estado<>'imputada_sombra' and confirmacion_clave is null and confirmado_en is null)
);

-- Para mantener "repartible" únicamente dinero todavía no reservado,
-- las funciones de validación cuentan tanto propuestas como imputadas sombra.
create or replace function public.goxion_validar_imputacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare
 v_cliente uuid;v_total integer;v_ciclo date;v_estado text;
 v_pago_cliente uuid;v_monto bigint;v_pago_estado text;v_periodo date;
 v_otras bigint;v_usado bigint;v_fecha date;
begin
 -- Serializa intentos sobre el mismo vencimiento.
 select cliente_id,total_estimado_centavos,ciclo_inicio,estado
 into v_cliente,v_total,v_ciclo,v_estado
 from public.goxion_obligaciones_sombra
 where id=new.obligacion_id for update;
 if v_cliente is null or v_estado<>'conciliado' then
  raise exception 'Obligación sin conciliación';
 end if;
 if tg_op='UPDATE' and (
   old.obligacion_id is distinct from new.obligacion_id or
   old.pago_id is distinct from new.pago_id or
   old.pago_parcial_id is distinct from new.pago_parcial_id or
   old.monto_centavos is distinct from new.monto_centavos or
   old.clave_idempotencia is distinct from new.clave_idempotencia or
   (old.estado='imputada_sombra' and new.estado is distinct from old.estado) or
   (old.estado='descartada' and new.estado is distinct from old.estado)
 ) then
   raise exception 'No se puede alterar una imputación existente';
 end if;
 if new.pago_id is not null then
  select p.cliente_id,round(p.monto*100)::bigint,p.estado,
         public.goxion_periodo_pago_canonico(p.periodo)
   into v_pago_cliente,v_monto,v_pago_estado,v_periodo
  from public.pagos p where p.id=new.pago_id for update;
  if v_pago_estado is distinct from 'pagado' then
   raise exception 'Comprobante no aprobado';
  end if;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_id=new.pago_id and estado in ('propuesta','imputada_sombra')
    and (tg_op='INSERT' or id<>new.id);
 else
  select p.cliente_id,round(p.monto_pagado*100)::bigint,p.estado,p.periodo,p.fecha_pago
   into v_pago_cliente,v_monto,v_pago_estado,v_periodo,v_fecha
  from public.pagos_parciales p
  where p.id=new.pago_parcial_id and p.activo=true for update;
  if v_pago_estado is distinct from 'pendiente' then
   raise exception 'Abono incompleto no confirmado o ya liquidado';
  end if;
  -- Puede existir pago total del mismo mes: no atribuir el parcial dos veces.
  if exists(select 1 from public.pagos fullp
    where fullp.cliente_id=v_pago_cliente and fullp.estado='pagado'
     and public.goxion_periodo_pago_canonico(fullp.periodo)=v_periodo) then
    raise exception 'Existe pago completo del período; revisar abono antes de asignar';
  end if;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_parcial_id=new.pago_parcial_id and estado in ('propuesta','imputada_sombra')
    and (tg_op='INSERT' or id<>new.id);
 end if;
 if v_pago_cliente is null or v_cliente is distinct from v_pago_cliente then
   raise exception 'El pago no pertenece a este cliente';
 end if;
 if v_periodo is null or v_periodo is distinct from date_trunc('month',v_ciclo)::date then
   raise exception 'El período del pago no corresponde al ciclo del vencimiento';
 end if;
 if new.estado in ('propuesta','imputada_sombra') and (v_monto is null or new.monto_centavos+v_usado>v_monto) then
   raise exception 'Imputación duplicada o superior al pago confirmado';
 end if;
 select coalesce(sum(monto_centavos),0) into v_otras
 from public.goxion_imputaciones_sombra
 where obligacion_id=new.obligacion_id and estado in ('propuesta','imputada_sombra')
   and (tg_op='INSERT' or id<>new.id);
 if new.estado in ('propuesta','imputada_sombra') and new.monto_centavos+v_otras>v_total then
   raise exception 'Imputación superior al importe de la obligación';
 end if;
 if new.estado='imputada_sombra' and (
  new.confirmacion_clave is null or new.confirmado_en is null
 ) then raise exception 'La imputación confirmada requiere constancia';end if;
 if tg_op='UPDATE' and old.estado='propuesta' and new.estado='imputada_sombra'
   and (new.confirmacion_clave is null or new.confirmado_en is null) then
   raise exception 'No se permite confirmar sin clave';end if;
 -- Una imputación en sombra NO modifica pagos oficiales.
 return new;
end $$;


create or replace function public.goxion_validar_obligacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare v_cliente uuid; v_servicio uuid; v_activo boolean; v_cal_state text;
 v_total integer;v_imputado bigint;v_pendientes bigint;
begin
 select a.cliente_id,a.cliente_servicio_id,(a.activo and s.activo),
        cal.estado
  into v_cliente,v_servicio,v_activo,v_cal_state
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
 left join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.id=new.cliente_acceso_id;
 if v_cliente is null or not v_activo
    or v_cliente is distinct from new.cliente_id
    or v_servicio is distinct from new.cliente_servicio_id then
   raise exception 'Obligación no pertenece a un acceso activo de la contratación';
 end if;
 if new.estado='conciliado' and v_cal_state is distinct from 'verificado' then
   raise exception 'El acceso no tiene calendario confirmado';
 end if;
 if tg_op='UPDATE' then
   if old.cliente_id is distinct from new.cliente_id
    or old.cliente_servicio_id is distinct from new.cliente_servicio_id
    or old.cliente_acceso_id is distinct from new.cliente_acceso_id
    or old.ciclo_inicio is distinct from new.ciclo_inicio then
     raise exception 'No se permite cambiar identidad ni ciclo de la obligación';
   end if;
   v_total=greatest(0,new.base_centavos-new.descuentos_centavos+
                         new.mora_centavos+new.otros_cargos_centavos);
   select coalesce(sum(monto_centavos),0) into v_imputado
    from public.goxion_imputaciones_sombra
    where obligacion_id=old.id and estado in ('propuesta','imputada_sombra');
   select coalesce(sum(monto_propuesto_centavos),0) into v_pendientes
    from public.goxion_abonos_sombra
    where obligacion_id=old.id and estado in ('solicitado','en_revision');
   if v_imputado>v_total or v_pendientes>v_total then
     raise exception 'El nuevo total es menor a imputaciones o solicitudes existentes';
   end if;
   if new.estado<>'conciliado' and (v_imputado>0 or v_pendientes>0) then
     raise exception 'No desactivar la conciliación con pagos/abonos pendientes';
   end if;
   new.revision=old.revision+1;
 end if;
 new.actualizado_en=now();
 return new;
end $$;


-- Resumen explícitamente no oficial: saldo asignable = total obligación -
-- imputaciones contables confirmadas. NO sustituye mi_estado.
create or replace function public.goxion_resumen_imputacion_sombra(
 p_obligacion_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v record;v_imputado bigint;v_pendiente bigint;
begin
 select id,cliente_id,cliente_acceso_id,ciclo_inicio,fecha_vencimiento,
        total_estimado_centavos,estado into v
 from public.goxion_obligaciones_sombra where id=p_obligacion_id;
 if not found then raise exception 'Obligación no encontrada';end if;
 select coalesce(sum(monto_centavos),0) into v_imputado
 from public.goxion_imputaciones_sombra
 where obligacion_id=p_obligacion_id and estado='imputada_sombra';
 select coalesce(sum(monto_centavos),0) into v_pendiente
 from public.goxion_imputaciones_sombra
 where obligacion_id=p_obligacion_id and estado='propuesta';
 return jsonb_build_object('obligacion_id',v.id,'cliente_id',v.cliente_id,
   'acceso_id',v.cliente_acceso_id,'ciclo',v.ciclo_inicio,
   'vence',v.fecha_vencimiento,'importe_estimado_centavos',v.total_estimado_centavos,
   'asignado_sombra_centavos',v_imputado,'pendiente_revision_centavos',v_pendiente,
   'saldo_proyectado_centavos',greatest(0,v.total_estimado_centavos-v_imputado),
   'saldo_disponible_para_imputar_centavos',
     greatest(0,v.total_estimado_centavos-v_imputado-v_pendiente),
   'estado','informativo_no_cobrable',
   'acreditada_oficial',false);
end $$;

create or replace function public.goxion_confirmar_imputacion_sombra(
 p_imputacion_id uuid,p_clave_confirmacion uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v record; v_repetida boolean:=false; v_resumen jsonb;v_revision int;
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

revoke all on function public.goxion_resumen_imputacion_sombra(uuid)
 from public,anon,authenticated;
revoke all on function public.goxion_confirmar_imputacion_sombra(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_resumen_imputacion_sombra(uuid) to service_role;
grant execute on function public.goxion_confirmar_imputacion_sombra(uuid,uuid) to service_role;
