-- GOXION B2: solicitud de abono idempotente, solo en registro sombra.
-- Expuesta SOLO a service_role (Edge deberá validar sesión de cliente).
-- Jamás marca pagado, registra transferencia, modifica mora o consumo de cupón.
create or replace function public.goxion_solicitar_abono_sombra(
 p_cliente_id uuid,p_obligacion_id uuid,p_monto_centavos integer,
 p_clave_idempotencia uuid,p_comentario text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_estado_cliente text;v_revision_pago bool;v_saldo integer;
 v_estado_obligacion text;v_owner uuid;v_current record;v_id uuid;
 v_asignado bigint;
begin
 if p_cliente_id is null or p_obligacion_id is null
    or p_clave_idempotencia is null or p_monto_centavos is null then
   raise exception 'Datos incompletos en solicitud';
 end if;
 select estado,pago_en_revision
 into v_estado_cliente,v_revision_pago
 from public.clientes where id=p_cliente_id for update;
 if v_estado_cliente is null or v_estado_cliente='suspendido' then
   raise exception 'Cuenta inactiva o inexistente';
 end if;
 if v_revision_pago then raise exception 'Ya hay un comprobante en revisión'; end if;
 select cliente_id,total_estimado_centavos,estado
 into v_owner,v_saldo,v_estado_obligacion
 from public.goxion_obligaciones_sombra
 where id=p_obligacion_id for update;
 if v_owner is null or v_owner is distinct from p_cliente_id or
    v_estado_obligacion is distinct from 'conciliado' then
   raise exception 'Obligación inexistente o sin conciliar para el cliente';
 end if;
 if p_monto_centavos<=0 or p_monto_centavos>=v_saldo then
   raise exception 'El abono debe ser menor al total confirmado; para liquidar, usar pago completo';
 end if;
 select id,obligacion_id,monto_propuesto_centavos,estado into v_current
 from public.goxion_abonos_sombra
 where cliente_id=p_cliente_id and clave_idempotencia=p_clave_idempotencia;
 if found then
  if v_current.obligacion_id is distinct from p_obligacion_id
     or v_current.monto_propuesto_centavos is distinct from p_monto_centavos then
   raise exception 'Clave de solicitud reutilizada con datos distintos';
  end if;
  return jsonb_build_object('ok',true,'solicitud_id',v_current.id,
    'estado',v_current.estado,'repetida',true,'cobrable',false);
 end if;
 if exists(select 1 from public.goxion_abonos_sombra where
   obligacion_id=p_obligacion_id and estado in ('solicitado','en_revision')) then
   raise exception 'Ya existe una solicitud activa para esta obligación';
 end if;
 select coalesce(sum(monto_centavos),0) into v_asignado
 from public.goxion_imputaciones_sombra
 where obligacion_id=p_obligacion_id and estado='propuesta';
 if v_asignado>0 then
   raise exception 'Existe una imputación pendiente de reconciliación';
 end if;
 insert into public.goxion_abonos_sombra(
   obligacion_id,cliente_id,clave_idempotencia,monto_propuesto_centavos,estado,comentario
 ) values(p_obligacion_id,p_cliente_id,p_clave_idempotencia,
          p_monto_centavos,'solicitado',left(coalesce(p_comentario,''),500))
 returning id into v_id;
 return jsonb_build_object('ok',true,'solicitud_id',v_id,'estado','solicitado',
   'repetida',false,'cobrable',false,'requiere_revision',true);
end $$;
revoke all on function public.goxion_solicitar_abono_sombra(uuid,uuid,integer,uuid,text)
 from public,anon,authenticated;
grant execute on function public.goxion_solicitar_abono_sombra(uuid,uuid,integer,uuid,text)
 to service_role;
