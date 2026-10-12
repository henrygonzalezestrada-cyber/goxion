-- GOXION · Pago incompleto administrativo en transacción PostgreSQL.
-- Mantiene contrato original de acciones-financieras pero reemplaza sus 3
-- escrituras separadas por una operación atómica. NO es el pago B2 por obligación.
-- Sin backfill, sin modificaciones automáticas a clientes o pagos al migrar.
create unique index if not exists goxion_parcial_activo_por_periodo_uq
 on public.pagos_parciales(cliente_id,periodo) where activo;
create unique index if not exists goxion_parcial_operation_id_uq
 on public.pagos_parciales(operation_id) where operation_id is not null;

create or replace function public.goxion_registrar_pago_parcial_atomico(
 p_cliente_id uuid,
 p_periodo_esperado text,
 p_saldo_restante_centavos integer,
 p_operation_id uuid,
 p_notas text default 'Pago parcial registrado'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cliente record;
 v_financial jsonb;
 v_periodo date;
 v_total_centavos bigint;
 v_pagado_centavos bigint;
 v_fecha date;
 v_anterior record;
 v_existente record;
 v_insertado record;
 v_msg text;
begin
 if p_cliente_id is null or p_operation_id is null
    or p_periodo_esperado is null
    or p_periodo_esperado !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or p_saldo_restante_centavos is null or p_saldo_restante_centavos<=0 then
  raise exception 'Cliente, periodo, clave o saldo restante inválido';
 end if;
 if length(coalesce(p_notas,''))>300 then raise exception 'Notas demasiado largas';end if;

 -- Serialización por cliente, también entre dos sesiones concurrentes.
 select id,estado,pago_en_revision,periodo_pendiente into v_cliente
 from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then
  raise exception 'Cliente inexistente o suspendido';
 end if;

 -- Reintento exacto: responde sin volver a reducir el saldo, aunque el estado
 -- financiero ya haya cambiado después del primer intento.
 select * into v_existente from public.pagos_parciales
 where operation_id=p_operation_id limit 1;
 if found then
  if v_existente.cliente_id is distinct from p_cliente_id
    or to_char(v_existente.periodo,'YYYY-MM') is distinct from p_periodo_esperado
    or round(v_existente.saldo_restante*100)::bigint<>p_saldo_restante_centavos then
   raise exception 'Clave de operación reutilizada con datos distintos';
  end if;
  return jsonb_build_object(
   'ok',true,'repetida',true,'pago_parcial',to_jsonb(v_existente),
   'monto_pagado',v_existente.monto_pagado,'saldo_restante',v_existente.saldo_restante
  );
 end if;

 v_financial=public.goxion_estado_financiero(p_cliente_id);
 if v_financial is null then raise exception 'No se pudo obtener el estado financiero';end if;
 if substring(coalesce(v_financial->>'periodo',''),1,7)<>p_periodo_esperado
    then raise exception 'PERIODO_DESACTUALIZADO'; end if;
 if coalesce((v_financial->>'esta_pagado_periodo')::boolean,false)
    then raise exception 'Este periodo ya está pagado';end if;
 if (v_financial->>'total_actual') is null
    then raise exception 'No se encontró un saldo financiero verificable';end if;
 v_total_centavos=round((v_financial->>'total_actual')::numeric*100);
 if v_total_centavos<=0 or p_saldo_restante_centavos>=v_total_centavos
    then raise exception 'El saldo restante debe ser menor al total actual y mayor a cero'; end if;
 v_pagado_centavos=v_total_centavos-p_saldo_restante_centavos;
 if v_pagado_centavos<=0 then raise exception 'El monto abonado debe ser positivo';end if;

 v_periodo=to_date(p_periodo_esperado||'-01','YYYY-MM-DD');
 v_fecha=(now() at time zone 'America/Mexico_City')::date;

 -- Todas las mutaciones ocurren en la MISMA transacción de esta RPC.
 update public.pagos_parciales set activo=false,updated_at=now()
 where cliente_id=p_cliente_id and periodo=v_periodo and activo=true;
 insert into public.pagos_parciales(
  cliente_id,periodo,fecha_pago,monto_pagado,
  saldo_anterior,saldo_restante,notas,activo,estado,operation_id
 ) values(
  p_cliente_id,v_periodo,v_fecha,v_pagado_centavos::numeric/100,
  v_total_centavos::numeric/100,p_saldo_restante_centavos::numeric/100,
  coalesce(nullif(trim(p_notas),''),'Pago parcial registrado'),
  true,'pendiente',p_operation_id
 ) returning * into v_insertado;

 v_msg=coalesce(nullif(trim(p_notas),''),'Pago parcial registrado');
 update public.clientes set
  estado='pendiente',
  pago_en_revision=false,
  pago_revision_estado='incompleto',
  pago_revision_mensaje=v_msg,
  pago_revision_monto_faltante=p_saldo_restante_centavos::numeric/100,
  pago_revision_updated_at=now()
 where id=p_cliente_id;

 return jsonb_build_object(
  'ok',true,'repetida',false,'pago_parcial',to_jsonb(v_insertado),
  'monto_pagado',v_pagado_centavos::numeric/100,
  'saldo_restante',p_saldo_restante_centavos::numeric/100
 );
end $$;
revoke all on function public.goxion_registrar_pago_parcial_atomico(uuid,text,integer,uuid,text)
 from public,anon,authenticated;
grant execute on function public.goxion_registrar_pago_parcial_atomico(uuid,text,integer,uuid,text)
 to service_role;
