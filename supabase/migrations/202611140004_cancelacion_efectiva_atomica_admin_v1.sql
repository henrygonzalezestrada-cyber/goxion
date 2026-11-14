-- GOXION · hacer efectiva una solicitud aprobada: una transacción autoritativa.
-- Preserva contratos históricos y cobros previamente realizados.
-- Esta RPC es interna: solo service_role tras autenticación HMAC Admin en Edge.
create or replace function public.goxion_hacer_efectiva_cancelacion_admin_v1(
 p_solicitud_id uuid,p_actor text
) returns jsonb
language plpgsql security definer
set search_path to ''
as $effective$
declare
 v_solicitud record;
 v_servicio record;
 v_reg record;
 v_otros integer;
 v_resultado jsonb;
 v_unificar jsonb;
 v_fecha date:=(now() at time zone 'America/Mexico_City')::date;
begin
 if p_solicitud_id is null or length(btrim(coalesce(p_actor,'')))<3
    or length(p_actor)>120 then
   raise exception using message='CANCELACION_DATOS_INVALIDOS';
 end if;
 select * into v_solicitud from public.solicitudes_cancelacion
 where id=p_solicitud_id for update;
 if not found then raise exception using message='CANCELACION_NO_EXISTE';end if;
 -- Un único bloqueo de cliente impide carreras entre dos bajas simultáneas.
 perform 1 from public.clientes where id=v_solicitud.cliente_id for update;
 if not found then raise exception using message='CANCELACION_CLIENTE_NO_EXISTE';end if;
 select * into v_servicio from public.cliente_servicios
 where id=v_solicitud.cliente_servicio_id
   and cliente_id=v_solicitud.cliente_id for update;
 if not found then raise exception using message='CANCELACION_SERVICIO_NO_EXISTE';end if;
 if v_solicitud.estado='efectiva' then
   if v_servicio.activo then
     raise exception using message='CANCELACION_ESTADO_NO_CONCILIADO';
   end if;
   return jsonb_build_object('ok',true,'repetida',true,
     'solicitud_id',p_solicitud_id,'cliente_id',v_solicitud.cliente_id,
     'servicio_id',v_servicio.id,'estado','efectiva');
 end if;
 if v_solicitud.estado<>'aprobada' then
   raise exception using message='CANCELACION_REQUIERE_APROBACION';
 end if;
 if v_servicio.activo then
   select count(*) into v_otros from public.cliente_servicios
   where cliente_id=v_solicitud.cliente_id and activo
     and id<>v_servicio.id;
   if v_otros>0 then
     -- Reutilizar la única operación oficial para baja de un servicio,
     -- incluidos ciclos B2 sin cobro y retorno a fecha mensual.
     v_resultado=public.goxion_cancelar_servicio_admin_v1(
       v_servicio.id,true,p_actor);
     if v_resultado->>'ok'<>'true'
       or v_resultado->>'servicio_inactivo'<>'true' then
       raise exception using message='CANCELACION_SERVICIO_NO_CONFIRMADO';
     end if;
   else
     -- Último servicio de la cuenta: nunca borrar al cliente ni su historial.
     -- Si B2 tiene un ciclo abierto, requiere conciliación financiera previa.
     select * into v_reg from public.goxion_b2_regimen_cliente
       where cliente_id=v_solicitud.cliente_id for update;
     if coalesce(v_reg.activo,false) and exists (
       select 1 from public.goxion_b2_ciclos
       where cliente_id=v_solicitud.cliente_id and estado='pendiente'
     ) then
       raise exception using message='CANCELACION_B2_CICLO_PENDIENTE';
     end if;
     if exists (
       select 1 from public.pagos_parciales
       where cliente_id=v_solicitud.cliente_id and activo
     ) then
       raise exception using message='CANCELACION_PARCIAL_PENDIENTE';
     end if;
     update public.cliente_servicios set activo=false,updated_at=now()
       where id=v_servicio.id and activo;
     if not found then
       raise exception using message='CANCELACION_CONTRATO_CAMBIO';
     end if;
     if coalesce(v_reg.activo,false) then
       v_unificar=public.goxion_b2_desactivar_cliente(
         v_solicitud.cliente_id,true,p_actor,'cancelación efectiva del último servicio');
       if v_unificar->>'regimen_activo'<>'false' then
         raise exception using message='CANCELACION_B2_NO_DESACTIVADO';
       end if;
     end if;
     insert into public.goxion_b2_auditoria
       (accion,antes,cliente_id,despues,entidad,entidad_id,ocurrido_en)
     values('actualizar',jsonb_build_object('servicio',to_jsonb(v_servicio)),
       v_solicitud.cliente_id,
       jsonb_build_object('servicio_activo',false,
          'razon','solicitud_efectiva_ultimo_servicio','actor',p_actor),
       'obligacion',v_servicio.id,now());
   end if;
 end if;
 -- Cambiar la solicitud se confirma EN LA MISMA TRANSACCIÓN que el contrato.
 update public.solicitudes_cancelacion
 set estado='efectiva',efectiva_at=now(),fecha_efectiva=v_fecha,
     updated_at=now()
 where id=p_solicitud_id and estado='aprobada';
 if not found then raise exception using message='CANCELACION_SOLICITUD_CAMBIO';end if;
 if v_solicitud.notificacion_id is not null then
   update public.notificaciones_admin set leida=true
   where id=v_solicitud.notificacion_id;
 end if;
 if exists(select 1 from public.cliente_servicios
   where id=v_servicio.id and activo) then
   raise exception using message='CANCELACION_CONTRATO_SIGUE_ACTIVO';
 end if;
 return jsonb_build_object('ok',true,'repetida',false,'estado','efectiva',
   'solicitud_id',p_solicitud_id,'cliente_id',v_solicitud.cliente_id,
   'servicio_id',v_servicio.id,'servicio_activo',false,
   'resultado_contrato',v_resultado);
end $effective$;
revoke all on function public.goxion_hacer_efectiva_cancelacion_admin_v1(uuid,text)
  from public,anon,authenticated;
grant execute on function public.goxion_hacer_efectiva_cancelacion_admin_v1(uuid,text)
  to service_role;
