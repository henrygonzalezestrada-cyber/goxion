-- Activación B2 por cliente ÚNICAMENTE tras confirmación explícita de Admin.
-- Misma transacción: el cliente pasa a multifecha si y solo si
-- su calendario, su historial y su conciliación cumplen las guardas.
-- Nadie se activa automáticamente al aplicar las migraciones.
create or replace function public.goxion_b2_activar_cliente(
 p_cliente_id uuid,p_periodo date,p_confirmado boolean,
 p_actor text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_reg record;v_result jsonb;
begin
 if p_cliente_id is null or p_periodo is null
  or p_periodo<>date_trunc('month',p_periodo)::date
  or p_confirmado is distinct from true
  or length(btrim(coalesce(p_actor,'')))<3
  or length(p_actor)>120 then
  raise exception 'Activación de B2 requiere confirmación administrativa';
 end if;
 select id,estado,periodo_pendiente into v_cliente
 from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then
  raise exception 'Cuenta inactiva para nuevo régimen';
 end if;
 select * into v_reg from public.goxion_b2_regimen_cliente
 where cliente_id=p_cliente_id for update;
 if found and v_reg.activo and v_reg.periodo_inicio<>p_periodo then
  raise exception 'Cuenta B2 activa en otro período, reconciliar antes';end if;
 if found then
  update public.goxion_b2_regimen_cliente set
   activo=true,periodo_inicio=p_periodo,autorizado_por=p_actor
  where cliente_id=p_cliente_id;
 else
  insert into public.goxion_b2_regimen_cliente(cliente_id,activo,
   periodo_inicio,autorizado_por)
  values(p_cliente_id,true,p_periodo,p_actor);
 end if;
 -- Ésta realiza todas las validaciones comerciales y crea obligaciones
 -- o ABORTA toda la transacción, incluida la activación.
 v_result=public.goxion_b2_iniciar_ciclo(p_cliente_id,p_periodo);
 return v_result||jsonb_build_object('regimen_activo',true,
  'modo','b2_cliente_confirmado','cobrable',true);
end $$;

create or replace function public.goxion_b2_desactivar_cliente(
 p_cliente_id uuid,p_confirmado boolean,p_actor text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_reg record;
begin
 if p_cliente_id is null or p_confirmado is distinct from true
  or length(btrim(coalesce(p_actor,'')))<3 or length(p_actor)>120 then
   raise exception 'La unificación requiere confirmación Admin';end if;
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found then raise exception 'Cliente inexistente';end if;
 select * into v_reg from public.goxion_b2_regimen_cliente
 where cliente_id=p_cliente_id for update;
 if not found or not v_reg.activo then
  return jsonb_build_object('ok',true,'repetida',true,'regimen_activo',false);
 end if;
 if exists(select 1 from public.goxion_b2_ciclos
  where cliente_id=p_cliente_id and estado<>'liquidado') then
  raise exception 'No unificar con obligaciones pendientes; conciliar/prorratear primero';
 end if;
 -- Deshabilita sólo la ruta B2. Admin debe confirmar que los calendarios
 -- unificados estén efectivamente guardados y su precio/cobertura no cambia.
 if exists(select 1 from public.goxion_calendario_accesos
    where cliente_id=p_cliente_id and estado='verificado'
    and dia_corte is distinct from v_cliente.dia_pago) then
   raise exception 'Fechas independientes siguen activas; unificar calendario en Admin';
 end if;
 update public.goxion_b2_regimen_cliente set activo=false,
   autorizado_por=p_actor where cliente_id=p_cliente_id;
 return jsonb_build_object('ok',true,'regimen_activo',false,'cobrable_global',true);
end $$;
revoke all on function public.goxion_b2_activar_cliente(uuid,date,boolean,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_activar_cliente(uuid,date,boolean,text)
 to service_role;
revoke all on function public.goxion_b2_desactivar_cliente(uuid,boolean,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_desactivar_cliente(uuid,boolean,text)
 to service_role;
