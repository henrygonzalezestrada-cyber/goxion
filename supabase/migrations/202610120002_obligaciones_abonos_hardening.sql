-- B2 sombra: proteger concurrencia de propuestas y cambios de importe ya imputado.
-- No modifica cobros oficiales, ni activa solicitudes cliente.
create unique index if not exists goxion_abonos_sombra_solicitud_activa_key
 on public.goxion_abonos_sombra(obligacion_id)
 where estado in ('solicitado','en_revision');

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
    where obligacion_id=old.id and estado='propuesta';
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

-- No se permite asignar un movimiento oficialmente inexistente ni cambiar su
-- identidad. Las imputaciones siguen siendo propuestas, nunca acreditación.
create or replace function public.goxion_validar_imputacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare v_cliente uuid;v_total integer;v_pago_cliente uuid;v_monto integer;
 v_otras bigint;v_usado bigint;
begin
 select cliente_id,total_estimado_centavos into v_cliente,v_total
 from public.goxion_obligaciones_sombra where id=new.obligacion_id for update;
 if new.pago_id is not null then
  select p.cliente_id,round(p.monto*100)::int into v_pago_cliente,v_monto
  from public.pagos p where id=new.pago_id for update;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_id=new.pago_id and estado='propuesta'
   and (tg_op='INSERT' or id<>new.id);
 else
  select p.cliente_id,round(p.monto_pagado*100)::int into v_pago_cliente,v_monto
  from public.pagos_parciales p where id=new.pago_parcial_id for update;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_parcial_id=new.pago_parcial_id and estado='propuesta'
   and (tg_op='INSERT' or id<>new.id);
 end if;
 if v_pago_cliente is null or v_cliente is distinct from v_pago_cliente then
   raise exception 'No es un pago del mismo cliente';
 end if;
 select coalesce(sum(monto_centavos),0) into v_otras
 from public.goxion_imputaciones_sombra
 where obligacion_id=new.obligacion_id and estado='propuesta'
  and (tg_op='INSERT' or id<>new.id);
 if new.estado='propuesta' and (v_monto<new.monto_centavos+v_usado
    or v_total<new.monto_centavos+v_otras) then
   raise exception 'Imputación mayor que el pago o la obligación';
 end if;
 if tg_op='UPDATE' and (
   old.obligacion_id is distinct from new.obligacion_id or
   old.pago_id is distinct from new.pago_id or
   old.pago_parcial_id is distinct from new.pago_parcial_id or
   old.monto_centavos is distinct from new.monto_centavos
 ) then
   raise exception 'Una imputación no cambia importe ni origen';
 end if;
 return new;
end $$;
