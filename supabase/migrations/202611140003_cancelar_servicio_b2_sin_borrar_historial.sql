-- GOXION · cancelar servicio contratado sin destruir pagos/coberturas históricas.
-- Operación administrativa única, requiere HMAC Admin en Edge.
-- Revocada para anon/authenticated. Nunca aprobar pagos ni liquidar cargos ficticios.
-- Solo puede sustituir un ciclo B2 COMPLETAMENTE INTACTO (sin comprobantes,
-- abonos, extensiones ni eventos). Guarda snapshot en auditoría antes de retirar
-- obligaciones proyectadas NO COBRADAS. Cargos ya pagados nunca se borran.
create or replace function public.goxion_cancelar_servicio_admin_v1(
 p_cliente_servicio_id uuid,p_confirmado boolean,p_actor text
) returns jsonb
language plpgsql security definer
set search_path to ''
as $cancelar$
declare
 v_cliente_id uuid; v_cliente record;v_servicio record;v_reg record;
 v_ciclo record;v_snapshot jsonb;v_cargos jsonb;
 v_prev_ciclo uuid;v_regimen jsonb;v_creado jsonb;
 v_activas int;v_fechas int;v_dia smallint;v_total integer;
 v_retirados integer:=0;v_num_ciclos int;v_num_no_pagados int;
 v_reg_activo boolean:=false;
begin
 if p_cliente_servicio_id is null or p_confirmado is distinct from true
   or length(btrim(coalesce(p_actor,'')))<3 or length(p_actor)>120 then
    raise exception using message='SERVICIO_CONFIRMACIÓN_REQUERIDA';
 end if;
 select cliente_id into v_cliente_id from public.cliente_servicios
 where id=p_cliente_servicio_id;
 if not found then
   raise exception using message='SERVICIO_NO_EXISTE';
 end if;
 select * into v_cliente from public.clientes
 where id=v_cliente_id for update;
 if not found then raise exception using message='CLIENTE_NO_EXISTE';end if;
 select * into v_servicio from public.cliente_servicios
 where id=p_cliente_servicio_id for update;
 if v_servicio.activo is distinct from true then
   return jsonb_build_object('ok',true,'repetida',true,
     'cliente_id',v_cliente_id,'servicio_id',p_cliente_servicio_id,
     'modo','servicio_inactivo');
 end if;
 select count(*) into v_activas from public.cliente_servicios
 where cliente_id=v_cliente_id and activo and id<>p_cliente_servicio_id;
 if v_activas<1 then
   raise exception using message='SERVICIO_ULTIMO_REQUIERE_GESTION_CUENTA';
 end if;
 if v_cliente.pago_en_revision is true then
   raise exception using message='SERVICIO_PAGO_EN_REVISION';
 end if;
 select * into v_reg from public.goxion_b2_regimen_cliente
 where cliente_id=v_cliente_id for update;
 v_reg_activo=coalesce(v_reg.activo,false);
 if v_reg_activo then
   -- Se permite cancelar solo el ciclo pendiente del periodo actual,
   -- conservando todos los ciclos LIQUIDADOS de meses anteriores.
   select count(*) into v_num_ciclos from public.goxion_b2_ciclos
   where cliente_id=v_cliente_id and estado='pendiente'
     and periodo is distinct from v_cliente.periodo_pendiente;
   if v_num_ciclos>0 then
     raise exception using message='SERVICIO_B2_CICLOS_DIFERENTES_EN_REVISION';
   end if;
   select * into v_ciclo from public.goxion_b2_ciclos
     where cliente_id=v_cliente_id and periodo=v_cliente.periodo_pendiente
       and estado='pendiente' for update;
   if found then
     v_prev_ciclo=v_ciclo.id;
     -- Todas las mutaciones contables y evidencias deben estar ausentes.
     -- No sustituir dinero ya recibido por una cancelación administrativa.
     if exists(select 1 from public.goxion_b2_abonos_aprobados a
       join public.goxion_b2_cargos b on b.id=a.cargo_id
       where b.ciclo_id=v_prev_ciclo)
       or exists(select 1 from public.goxion_b2_comprobantes
         where ciclo_id=v_prev_ciclo)
       or exists(select 1 from public.goxion_b2_comprobante_aplicaciones a
         join public.goxion_b2_cargos b on b.id=a.cargo_id
         where b.ciclo_id=v_prev_ciclo)
       or exists(select 1 from public.goxion_b2_prorrogas
         where ciclo_id=v_prev_ciclo)
       or exists(select 1 from public.goxion_b2_f4_eventos
         where ciclo_id=v_prev_ciclo)
       or exists(select 1 from public.goxion_b2_atribuciones_comerciales
         where cliente_id=v_cliente_id and periodo=v_ciclo.periodo)
       or exists(select 1 from public.pagos
         where cliente_id=v_cliente_id and estado='pagado'
         and public.goxion_periodo_pago_canonico(periodo)=v_ciclo.periodo)
       or exists(select 1 from public.pagos_parciales
         where cliente_id=v_cliente_id and periodo=v_ciclo.periodo and activo)
     then
       raise exception using message='SERVICIO_B2_CICLO_CON_MOVIMIENTOS';
     end if;
     select count(*) into v_num_no_pagados
       from public.goxion_b2_cargos where ciclo_id=v_prev_ciclo
         and (liquidado or mora_generada_centavos>0
         or mora_pendiente_centavos>0);
     if v_num_no_pagados>0 then
       raise exception using message='SERVICIO_B2_CICLO_NO_VIRGEN';
     end if;
     select coalesce(jsonb_agg(to_jsonb(b) order by b.fecha_vencimiento,b.id),'[]'::jsonb)
       into v_cargos from public.goxion_b2_cargos b
       where b.ciclo_id=v_prev_ciclo;
     v_snapshot=jsonb_build_object(
       'ciclo',to_jsonb(v_ciclo),
       'cargos_proyectados_sin_pago',v_cargos,
       'servicio_antes',to_jsonb(v_servicio),
       'estado','ciclo_no_cobrado_cancelado_por_cambio_contrato',
       'actor',p_actor);
     -- Un único registro auditado, sin crear recibos ni pago de 0 pesos.
     insert into public.goxion_b2_auditoria
       (accion,antes,cliente_id,despues,entidad,entidad_id,ocurrido_en)
       values('eliminar',v_snapshot,v_cliente_id,
         jsonb_build_object('tipo','cancelacion_ciclo_no_cobrado',
         'servicio_cancelado_id',p_cliente_servicio_id,
         'motivo','recalcular cartera tras retirar servicio'),
         'obligacion',v_prev_ciclo,now());
     delete from public.goxion_b2_cargos
       where ciclo_id=v_prev_ciclo;
     get diagnostics v_retirados=row_count;
     delete from public.goxion_b2_ciclos where id=v_prev_ciclo;
   end if;
 end if;
 -- Contrato y acceso siguen existiendo como HISTORIAL, solo inactivos.
 update public.cliente_servicios set activo=false,updated_at=now()
 where id=p_cliente_servicio_id and activo;
 if not found then
   raise exception using message='SERVICIO_CONFLICTO_ACTUALIZACION';
 end if;
 -- El trigger estándar de cliente_servicios sincroniza los accesos.
 -- Al quedar una fecha real, volver al motor mensual único sin doble cargo.
 if v_reg_activo then
   select count(distinct cal.dia_corte)::int,
          min(cal.dia_corte)::smallint,
          count(distinct a.id)::int
   into v_fechas,v_dia,v_activas
   from public.cliente_accesos a
   join public.cliente_servicios s on s.id=a.cliente_servicio_id
     and s.activo and s.cliente_id=v_cliente_id
   join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
     and cal.estado='verificado' and cal.precio_centavos>0
   where a.cliente_id=v_cliente_id and a.activo;
   if v_activas<1 or v_fechas<1 then
     raise exception using message='SERVICIO_CALENDARIO_RESTANTE_INCOMPLETO';
   end if;
   if v_fechas=1 then
     -- Solo cambiar el día de cobro futuro, preservando periodos pagados.
     if v_dia is distinct from v_cliente.dia_pago then
       update public.clientes set dia_pago=v_dia where id=v_cliente_id;
     end if;
     v_regimen=public.goxion_b2_desactivar_cliente(
       v_cliente_id,true,p_actor,
       'cancelación de servicio; queda una sola fecha');
     if v_regimen->>'regimen_activo'<>'false' then
       raise exception using message='SERVICIO_UNIFICACION_NO_CONFIRMADA';
     end if;
   else
     v_creado=public.goxion_b2_iniciar_ciclo(
       v_cliente_id,v_cliente.periodo_pendiente);
     if v_creado->>'ok'<>'true' then
       raise exception using message='SERVICIO_RECONSTRUCCION_B2_NO_CONFIRMADA';
     end if;
   end if;
 end if;
 select count(*) into v_activas from public.cliente_servicios
 where cliente_id=v_cliente_id and activo;
 select count(distinct cal.dia_corte)::int into v_fechas
 from public.goxion_calendario_accesos cal
 join public.cliente_accesos a on a.id=cal.cliente_acceso_id
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
 and s.activo and s.cliente_id=v_cliente_id
 where a.cliente_id=v_cliente_id and a.activo and cal.estado='verificado';
 insert into public.goxion_b2_auditoria
   (accion,antes,cliente_id,despues,entidad,entidad_id,ocurrido_en)
 values('actualizar',
   jsonb_build_object('servicio',to_jsonb(v_servicio),
       'regimen_b2',v_reg_activo),
   v_cliente_id,
   jsonb_build_object('servicio_activo',false,
     'servicio_id',p_cliente_servicio_id,
     'motor',case when v_fechas=1 then 'mensual' else 'b2' end,
     'fechas_activas',v_fechas,'servicios_activos',v_activas,
     'actor',p_actor),
   'obligacion',p_cliente_servicio_id,now());
 return jsonb_build_object('ok',true,'repetida',false,
   'servicio_id',p_cliente_servicio_id,'cliente_id',v_cliente_id,
   'servicio_inactivo',true,
   'ciclos_reemplazados',case when v_prev_ciclo is null then 0 else 1 end,
   'cargos_proyectados_retirados',v_retirados,
   'fechas_activas',v_fechas,
   'servicios_activos',v_activas,
   'regimen_activo',coalesce((v_regimen->>'regimen_activo')::boolean,
      v_reg_activo and v_fechas>1),
   'codigo','SERVICIO_CANCELADO_CON_HISTORIAL');
end $cancelar$;

revoke all on function public.goxion_cancelar_servicio_admin_v1(uuid,boolean,text)
  from public,anon,authenticated;
grant execute on function public.goxion_cancelar_servicio_admin_v1(uuid,boolean,text)
  to service_role;
