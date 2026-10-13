-- GOXION · Operación transaccional MULTIFECHA, sólo clientes con opt-in.
-- Los clientes de fecha única NO usan estas funciones. Por defecto 0 opt-ins.
-- El día de aprobación es hora México obtenida del servidor, NO del navegador.

create or replace function public.goxion_b2_cotizar_ciclo(
 p_cliente_id uuid,p_periodo date,
 p_hoy date default (now() at time zone 'America/Merida')::date
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ciclo record;v_descartado boolean;v_res jsonb;v_base int;v_n int;
begin
 if p_cliente_id is null or p_periodo is null or p_hoy is null or
  p_periodo<>date_trunc('month',p_periodo)::date then
  raise exception 'Cotización multifecha requiere cliente/periodo/día';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where cliente_id=p_cliente_id and periodo=p_periodo;
 if not found then return jsonb_build_object('ok',false,
   'codigo','CICLO_NO_PREPARADO','cobrable',false);end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  return jsonb_build_object('ok',false,'codigo','REGIMEN_INACTIVO','cobrable',false);
 end if;
 select v_ciclo.lealtad_perdida or exists(select 1
  from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
  and b.fecha_vencimiento<p_hoy and not b.liquidado)
 into v_descartado;
 select coalesce(jsonb_agg(jsonb_build_object(
 'cargo_id',q.id,'acceso_id',q.cliente_acceso_id,'vence',q.fecha_vencimiento,
 'base_centavos',q.base_centavos,
 'descuento_centavos',q.descuento_efectivo,
 'principal_centavos',q.principal_efectivo,
 'mora_centavos',q.mora_efectiva,
 'total_centavos',q.principal_efectivo+q.mora_efectiva,
 'pagado',q.liquidado) order by q.fecha_vencimiento,q.id),'[]'::jsonb)
 into v_res
 from (
 select b.*,case when v_descartado and not b.liquidado then 0
    else b.descuento_vigente_centavos end descuento_efectivo,
   (b.principal_pendiente_centavos +
    case when v_descartado and not b.liquidado
      then b.descuento_vigente_centavos else 0 end) principal_efectivo,
   b.mora_pendiente_centavos +
     least(greatest(0,round(b.base_centavos*.50)::int-b.mora_generada_centavos),
      greatest(0,p_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
       round((b.principal_pendiente_centavos+
        case when v_descartado and not b.liquidado
          then b.descuento_vigente_centavos else 0 end)*.05)::int)
     as mora_efectiva
 from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
 ) q;
 return jsonb_build_object('ok',true,'modo','b2_multifecha',
  'cobrable',false,'solo_cotizacion',true,'cliente_id',p_cliente_id,
  'periodo',p_periodo,'lealtad_global_perdida',v_descartado,
  'cargos',v_res,
  'total_pendiente_centavos',(
   select coalesce(sum((i->>'total_centavos')::bigint),0)
   from jsonb_array_elements(v_res) i));
end $$;
revoke all on function public.goxion_b2_cotizar_ciclo(uuid,date,date)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_cotizar_ciclo(uuid,date,date)
 to service_role;

create or replace function public.goxion_b2_aprobar_abono(
 p_cliente_id uuid,p_cargo_id uuid,p_monto_centavos integer,
 p_saldo_esperado_centavos integer,p_operation_id uuid,p_nota text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cliente record;v_ciclo record;v_cargo record;v_op record;v_cargo_locator record;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_lealtad_perdida boolean;v_daydelta int;v_cobro_mora int;
 v_principal_pago int;v_mora_pago int;v_total int;
 v_estado text;v_streak int;v_label text;v_fin int;v_sum bigint;
 v_res jsonb;v_fechas int;
begin
 if p_cliente_id is null or p_cargo_id is null or p_operation_id is null
  or p_monto_centavos is null or p_monto_centavos<=0
  or p_saldo_esperado_centavos is null or p_saldo_esperado_centavos<=0
  or p_monto_centavos>p_saldo_esperado_centavos
  or length(coalesce(p_nota,''))>400 then
   raise exception 'Datos de abono multifecha incompletos';
 end if;
 -- Una sola exclusión para todos los accesos del cliente.
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then raise exception 'Cliente suspendido o inexistente';end if;
 -- Idempotencia PERMANENTE, incluso si el ciclo avanzó después del primer intento.
 select * into v_op from public.goxion_b2_abonos_aprobados where operation_id=p_operation_id;
 if found then
  if v_op.cliente_id is distinct from p_cliente_id or
   v_op.cargo_id is distinct from p_cargo_id or
   v_op.monto_centavos is distinct from p_monto_centavos or
   v_op.concepto is distinct from coalesce(p_nota,'') then
    raise exception 'Operation ID reutilizado con distintos datos';end if;
  return jsonb_build_object('ok',true,'repetida',true,'operation_id',p_operation_id,
   'cargo_id',p_cargo_id,'monto_centavos',v_op.monto_centavos,
   'acreditada_b2',true,'acreditada_global',false);
 end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente r
  where r.cliente_id=p_cliente_id and r.activo) then
   raise exception 'Régimen B2 no habilitado para esta cuenta';
 end if;
 select b.ciclo_id into v_cargo_locator
 from public.goxion_b2_cargos b
 where b.id=p_cargo_id and b.cliente_id=p_cliente_id;
 if not found then raise exception 'Cobro no pertenece a la cuenta';end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_cargo_locator.ciclo_id and cliente_id=p_cliente_id for update;
 if not found or v_ciclo.estado<>'pendiente' then
  raise exception 'Ciclo B2 liquidado o inexistente';end if;
 if v_ciclo.periodo is distinct from v_cliente.periodo_pendiente then
   raise exception 'Estado global cambió, requiere conciliación';
 end if;
 -- Bloquear todas las obligaciones, ordenadas, para evitar dobles cruces.
 perform 1 from public.goxion_b2_cargos b
 where b.ciclo_id=v_ciclo.id order by b.id for update;
 -- Si algún acceso ya venció y sigue impago, se pierde la racha
 -- global y el descuento de TODOS los accesos aún pendientes.
 select v_ciclo.lealtad_perdida or exists(
 select 1 from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
  and b.fecha_vencimiento<v_hoy and not b.liquidado)
 into v_lealtad_perdida;
 if v_lealtad_perdida and not v_ciclo.lealtad_perdida then
   update public.goxion_b2_ciclos set lealtad_perdida=true
     where id=v_ciclo.id;
   update public.goxion_b2_cargos set
    principal_pendiente_centavos=principal_pendiente_centavos+descuento_vigente_centavos,
    descuento_vigente_centavos=0
    where ciclo_id=v_ciclo.id and not liquidado;
 end if;
 -- Cada obligación genera mora POR SEPARADO desde el día posterior
 -- a su vencimiento; 5% al día del saldo principal, tope 50% de SU base.
 -- Un abono posterior reduce el saldo para la siguiente actualización.
 update public.goxion_b2_cargos b set
  mora_generada_centavos=b.mora_generada_centavos+
   least(greatest(0,round(b.base_centavos*.5)::int-b.mora_generada_centavos),
    greatest(0,v_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
     round(b.principal_pendiente_centavos*.05)::int),
  mora_pendiente_centavos=b.mora_pendiente_centavos+
   least(greatest(0,round(b.base_centavos*.5)::int-b.mora_generada_centavos),
    greatest(0,v_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
     round(b.principal_pendiente_centavos*.05)::int),
  mora_calculada_hasta=greatest(b.mora_calculada_hasta,v_hoy)
 where b.ciclo_id=v_ciclo.id and not b.liquidado;
 select * into v_cargo from public.goxion_b2_cargos
 where id=p_cargo_id for update;
 if v_cargo.liquidado then raise exception 'Cargo B2 ya liquidado';end if;
 v_total=v_cargo.principal_pendiente_centavos+v_cargo.mora_pendiente_centavos;
 if v_total is distinct from p_saldo_esperado_centavos then
  raise exception 'SALDO_B2_DESACTUALIZADO: %',v_total;end if;
 if p_monto_centavos>v_total then raise exception 'Abono superior al saldo';end if;
 v_principal_pago=least(v_cargo.principal_pendiente_centavos,p_monto_centavos);
 v_mora_pago=p_monto_centavos-v_principal_pago;
 update public.goxion_b2_cargos set
  principal_pendiente_centavos=principal_pendiente_centavos-v_principal_pago,
  mora_pendiente_centavos=mora_pendiente_centavos-v_mora_pago,
  liquidado=(v_total=p_monto_centavos)
 where id=p_cargo_id;
 insert into public.goxion_b2_abonos_aprobados(operation_id,cargo_id,cliente_id,
  monto_centavos,aplicado_principal_centavos,aplicado_mora_centavos,
  fecha_aprobacion,concepto)
 values(p_operation_id,p_cargo_id,p_cliente_id,p_monto_centavos,
  v_principal_pago,v_mora_pago,v_hoy,coalesce(p_nota,''));
 -- El estado de la CUENTA sólo cambia una vez, cuando están liquidadas
 -- TODAS las unidades: pagos ya aprobados no pierden su importe.
 select count(*) into v_fin from public.goxion_b2_cargos
 where ciclo_id=v_ciclo.id and not liquidado;
 if v_fin=0 then
  v_streak=case when v_lealtad_perdida then 0 else v_ciclo.racha_inicio+1 end;
  update public.goxion_b2_ciclos set
   estado='liquidado',liquidado_en=now(),racha_aplicada=true
   where id=v_ciclo.id and estado='pendiente';
  if not found then raise exception 'Ciclo ya cerrado';end if;
  select coalesce(sum(monto_centavos),0) into v_sum
   from public.goxion_b2_abonos_aprobados a
   join public.goxion_b2_cargos b on b.id=a.cargo_id
   where b.ciclo_id=v_ciclo.id;
  v_label=(array['enero','febrero','marzo','abril','mayo','junio',
   'julio','agosto','septiembre','octubre','noviembre','diciembre'])
    [extract(month from v_ciclo.periodo)::integer] || ' de ' ||
     extract(year from v_ciclo.periodo)::integer;
  if exists(select 1 from public.pagos where cliente_id=p_cliente_id
    and public.goxion_periodo_pago_canonico(periodo)=v_ciclo.periodo) then
   raise exception 'Pago global ya existe: impedir doble acreditación';
  end if;
  -- ÚNICO comprobante consolidado para historial y triggers existentes.
  insert into public.pagos(cliente_id,fecha,periodo,monto,estado,notas,
   puntual,lealtad_efecto,racha_resultado)
  values(p_cliente_id,v_hoy,v_label,v_sum::numeric/100,'pagado',
   'B2: liquidación de vencimientos por acceso',
   not v_lealtad_perdida,
   case when v_lealtad_perdida then 'reinicio' else 'sumo' end,v_streak);
  update public.clientes set
   pagos_puntuales=v_streak,estado='pagado',pago_en_revision=false,
   periodo_pendiente=(v_ciclo.periodo+interval '1 month')::date,
   pago_revision_estado='aprobado',pago_revision_mensaje=null,
   pago_revision_monto_faltante=0,pago_revision_updated_at=now()
  where id=p_cliente_id;
  -- Siguiente vencimiento de cada acceso (29/30/31 sujeto a mes).
  update public.goxion_calendario_accesos cal set
    cobertura_hasta=make_date(
     extract(year from v_ciclo.periodo+interval '1 month')::integer,
     extract(month from v_ciclo.periodo+interval '1 month')::integer,
     least(cal.dia_corte,
       extract(day from
        date_trunc('month',v_ciclo.periodo+interval '2 months')-interval '1 day')::integer)),
    verificado_en=now(),actualizado_por='b2:renovacion_acreditada'
  where cal.cliente_id=p_cliente_id and cal.estado='verificado'
    and exists(select 1 from public.goxion_b2_cargos b
     where b.ciclo_id=v_ciclo.id and b.cliente_acceso_id=cal.cliente_acceso_id);
 end if;
 return jsonb_build_object('ok',true,'repetida',false,'operation_id',p_operation_id,
  'cargo_id',p_cargo_id,'monto_centavos',p_monto_centavos,
  'saldo_restante_centavos',v_total-p_monto_centavos,
  'mora_aplicada_centavos',v_mora_pago,'principal_aplicado_centavos',v_principal_pago,
  'ciclo_liquidado',v_fin=0,'lealtad_perdida',v_lealtad_perdida,
  'acreditada_b2',true,'acreditada_global',v_fin=0);
end $$;
revoke all on function public.goxion_b2_aprobar_abono(uuid,uuid,integer,integer,uuid,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_aprobar_abono(uuid,uuid,integer,integer,uuid,text)
 to service_role;
