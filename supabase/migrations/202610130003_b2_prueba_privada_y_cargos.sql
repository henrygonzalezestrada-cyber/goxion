-- GOXION B2: evidencia privada y selección exacta de cargos.
-- No afecta cuentas globales, no crea deuda, no modifica Index/Ayuda.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('goxion-b2-evidencias','goxion-b2-evidencias',false,6291456,
  array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
alter table public.goxion_b2_comprobantes
 add column if not exists cargos_solicitados uuid[] not null default array[]::uuid[];

-- RPC segura: exige carga real preexistente en bucket privado y cargos
-- identificados por el cliente. Revalida opt-in, período, saldo y precio.
create or replace function public.goxion_b2_registrar_comprobante_seguro(
 p_cliente_id uuid,p_ciclo_id uuid,p_monto_centavos integer,
 p_evidencia_ref text,p_operation_id uuid,p_cargo_ids uuid[]
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cli record;v_ciclo record;v_old record;v_new uuid;
 v_select_count int;v_amount bigint;v_quote jsonb;
begin
 if p_cliente_id is null or p_ciclo_id is null or p_operation_id is null
  or p_monto_centavos is null or p_monto_centavos not between 1 and 100000000
  or p_cargo_ids is null or cardinality(p_cargo_ids) not between 1 and 80
  or exists(select 1 from unnest(p_cargo_ids) as x(id) where x.id is null)
  or length(btrim(coalesce(p_evidencia_ref,''))) not between 60 and 220
  or left(p_evidencia_ref,length(p_cliente_id::text)+1)<>p_cliente_id::text||'/'
  or p_evidencia_ref ~ '[[:cntrl:]]|\.\.|^https?://' then
   raise exception 'REPORTE_B2_INVALIDO';
 end if;
 select id,periodo_pendiente,estado into v_cli
  from public.clientes where id=p_cliente_id for update;
 if not found or v_cli.estado='suspendido' then raise exception 'CLIENTE_NO_DISPONIBLE';end if;
 select * into v_old from public.goxion_b2_comprobantes
  where reporte_operation_id=p_operation_id;
 if found then
  if v_old.cliente_id is distinct from p_cliente_id
   or v_old.ciclo_id is distinct from p_ciclo_id
   or v_old.monto_reportado_centavos is distinct from p_monto_centavos
   or v_old.evidencia_ref is distinct from p_evidencia_ref
   or (select array_agg(x.id order by x.id) from unnest(v_old.cargos_solicitados) as x(id))
      is distinct from
      (select array_agg(x.id order by x.id) from unnest(p_cargo_ids) as x(id)) then
   raise exception 'REPORTE_IDEMPOTENCIA_INCOMPATIBLE';end if;
  return jsonb_build_object('ok',true,'repetido',true,'reporte_id',v_old.id,
   'estado',v_old.estado,'acreditado',v_old.estado='aprobado');
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
  where id=p_ciclo_id and cliente_id=p_cliente_id for update;
 if not found or v_ciclo.estado<>'pendiente'
  or v_ciclo.periodo is distinct from v_cli.periodo_pendiente then
   raise exception 'CICLO_B2_NO_DISPONIBLE';end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo and periodo_inicio<=v_ciclo.periodo) then
   raise exception 'MULTIFECHA_NO_ACTIVADO';end if;
 -- NO aceptar cadenas de imagen enviadas por cliente sin archivo real.
 if not exists(select 1 from storage.objects
   where bucket_id='goxion-b2-evidencias' and name=p_evidencia_ref) then
  raise exception 'COMPROBANTE_ARCHIVO_NO_VERIFICADO';end if;
 -- No pueden existir cargos repetidos, ajenos, pagados o de otro ciclo.
 select count(distinct b.id) into v_select_count
 from public.goxion_b2_cargos b
 where b.id=any(p_cargo_ids) and b.cliente_id=p_cliente_id
  and b.ciclo_id=p_ciclo_id and not b.liquidado;
 if v_select_count<>cardinality(p_cargo_ids)
  then raise exception 'COMPROBANTE_CARGOS_INVALIDOS';end if;
 v_quote=public.goxion_b2_cotizar_ciclo(p_cliente_id,v_ciclo.periodo);
 select coalesce(sum((x.value->>'total_centavos')::bigint),0) into v_amount
 from jsonb_array_elements(v_quote->'cargos') as x(value)
 where (x.value->>'cargo_id')::uuid=any(p_cargo_ids);
 if v_amount is distinct from p_monto_centavos then
  raise exception 'COMPROBANTE_MONTO_CAMBIO: monto ya no coincide con cotización B2';end if;
 insert into public.goxion_b2_comprobantes(
  cliente_id,ciclo_id,periodo,monto_reportado_centavos,
  evidencia_ref,reporte_operation_id,cargos_solicitados
 ) values(p_cliente_id,p_ciclo_id,v_ciclo.periodo,p_monto_centavos,
  p_evidencia_ref,p_operation_id,p_cargo_ids)
 returning id into v_new;
 return jsonb_build_object('ok',true,'repetido',false,'reporte_id',v_new,
  'estado','reportado','acreditado',false,
  'cargo_ids',p_cargo_ids,'ciclo_id',p_ciclo_id);
end $$;


-- La entrada legacy del libro no verificaba imagen ni selección de cargos.
-- Se mantiene su firma por compatibilidad pero queda DESHABILITADA.
create or replace function public.goxion_b2_registrar_comprobante(
 p_cliente_id uuid,p_ciclo_id uuid,p_monto_centavos integer,
 p_evidencia_ref text,p_operation_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 raise exception 'B2_REPORTE_REQUIERE_EVIDENCIA_AUTENTICADA';
end $$;

create or replace function public.goxion_b2_aprobar_comprobante(
 p_cliente_id uuid,p_reporte_id uuid,p_asignaciones jsonb,
 p_operation_id uuid,p_actor text,
 p_excepcion_parcial boolean default false,p_motivo text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cliente record;v_reporte record;v_ciclo record;v_cargo record;v_line record;
 v_items int;v_total bigint:=0;v_cargo_id uuid;v_approval_id uuid;
 v_expected int;v_amount int;v_response jsonb;v_results jsonb:='[]'::jsonb;
 v_seen uuid[]:=array[]::uuid[];v_return jsonb;
begin
 if p_cliente_id is null or p_reporte_id is null or p_operation_id is null
  or length(btrim(coalesce(p_actor,''))) not between 3 and 120
  or jsonb_typeof(p_asignaciones) is distinct from 'array'
  or (p_excepcion_parcial and length(btrim(coalesce(p_motivo,'')))<10) then
   raise exception 'APROBACION_B2_INVALIDA';
 end if;
 v_items=jsonb_array_length(p_asignaciones);
 if v_items not between 1 and 80 then raise exception 'CARGOS_B2_INVALIDOS';end if;
 -- Misma orden de locks que la RPC de abonos, evitando interbloqueos.
 select id,periodo_pendiente into v_cliente from public.clientes
  where id=p_cliente_id for update;
 if not found then raise exception 'CLIENTE_NO_EXISTE';end if;
 select * into v_reporte from public.goxion_b2_comprobantes
  where id=p_reporte_id and cliente_id=p_cliente_id for update;
 if not found then raise exception 'COMPROBANTE_NO_EXISTE';end if;
 if v_reporte.estado='aprobado' then
  if v_reporte.aprobado_operation_id is distinct from p_operation_id
    or v_reporte.asignaciones_aprobadas is distinct from p_asignaciones
    or v_reporte.aprobado_por is distinct from p_actor
    or coalesce((v_reporte.resultado->>'excepcion_parcial')::boolean,false) is distinct from p_excepcion_parcial
    or coalesce(v_reporte.resultado->>'motivo','') is distinct from coalesce(p_motivo,'')
  then raise exception 'COMPROBANTE_IDEMPOTENCIA_INCOMPATIBLE';end if;
  return v_reporte.resultado || jsonb_build_object('repetido',true);
 end if;
 if v_reporte.estado<>'reportado' then
  raise exception 'COMPROBANTE_NO_APROBABLE';
 end if;
 if v_reporte.periodo is distinct from v_cliente.periodo_pendiente then
  raise exception 'PERIODO_B2_DESACTUALIZADO';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_reporte.ciclo_id and cliente_id=p_cliente_id
   and periodo=v_reporte.periodo for update;
 if not found or v_ciclo.estado<>'pendiente' then
  raise exception 'CICLO_NO_APROBABLE';
 end if;
 -- Validación previa de identidad y suma. Se procesan en orden de cargo
 -- para bloquear en orden estable y no decidir montos desde JavaScript.
 for v_line in
  select value from jsonb_array_elements(p_asignaciones) value
  order by value->>'cargo_id'
 loop
  if jsonb_typeof(v_line.value) is distinct from 'object'
    or (v_line.value->>'cargo_id') is null
    or (v_line.value->>'operation_id') is null
    or (v_line.value->>'monto_centavos') is null
    or (v_line.value->>'saldo_esperado_centavos') is null then
    raise exception 'ASIGNACION_B2_INCOMPLETA';
  end if;
  v_cargo_id=(v_line.value->>'cargo_id')::uuid;
  v_approval_id=(v_line.value->>'operation_id')::uuid;
  v_amount=(v_line.value->>'monto_centavos')::int;
  v_expected=(v_line.value->>'saldo_esperado_centavos')::int;
  if v_cargo_id=any(v_seen) or v_amount<=0 or v_expected<=0
    or (not p_excepcion_parcial and v_amount<>v_expected)
    or (p_excepcion_parcial and v_amount>v_expected) then
    raise exception 'ASIGNACION_B2_DUPLICADA_O_IMPORTE_NO_VALIDO';
  end if;
  v_seen=array_append(v_seen,v_cargo_id);
  select id,cliente_id,ciclo_id,liquidado into v_cargo
    from public.goxion_b2_cargos where id=v_cargo_id for update;
  if not found or v_cargo.cliente_id is distinct from p_cliente_id
   or v_cargo.ciclo_id is distinct from v_reporte.ciclo_id or v_cargo.liquidado then
   raise exception 'CARGO_B2_NO_PERTENECE_AL_COMPROBANTE';
  end if;
  v_total=v_total+v_amount;
 end loop;
 if v_total is distinct from v_reporte.monto_reportado_centavos then
   raise exception 'COMPROBANTE_NO_CUADRA_CON_CARGOS';
 end if;
 -- La asignación Admin no puede cambiar los accesos elegidos en Index.
 -- El orden no afecta la identidad de las obligaciones.
 if v_reporte.cargos_solicitados is null
  or coalesce(array_length(v_reporte.cargos_solicitados,1),0)<>v_items
  or (select array_agg(e.id order by e.id)
      from unnest(v_reporte.cargos_solicitados) as e(id))
       is distinct from
     (select array_agg(e.id order by e.id)
      from unnest(v_seen) as e(id)) then
    raise exception 'COMPROBANTE_CARGOS_NO_COINCIDEN_CON_SOLICITUD';
 end if;
 -- Aplicación real: cada abono revalida el saldo dentro del mismo lock,
 -- incluyendo mora, lealtad y fecha; un fallo revierte TODO el comprobante.
 for v_line in
  select value from jsonb_array_elements(p_asignaciones) value
  order by value->>'cargo_id'
 loop
  v_cargo_id=(v_line.value->>'cargo_id')::uuid;
  v_approval_id=(v_line.value->>'operation_id')::uuid;
  v_amount=(v_line.value->>'monto_centavos')::int;
  v_expected=(v_line.value->>'saldo_esperado_centavos')::int;
  v_response=public.goxion_b2_aprobar_abono(
    p_cliente_id,v_cargo_id,v_amount,v_expected,v_approval_id,
    case when p_excepcion_parcial
      then 'Excepción Admin: '||p_motivo
      else 'Comprobante B2 aprobado: '||p_reporte_id::text end
  );
  if v_response->>'ok' is distinct from 'true' then
   raise exception 'ACREDITACION_INDIVIDUAL_NO_CONFIRMADA';
  end if;
  insert into public.goxion_b2_comprobante_aplicaciones(
   reporte_id,cargo_id,operation_id,monto_centavos
  ) values(p_reporte_id,v_cargo_id,v_approval_id,v_amount);
  v_results=v_results||jsonb_build_array(jsonb_build_object(
    'cargo_id',v_cargo_id,'monto_centavos',v_amount,'resultado',v_response));
 end loop;
 v_return=jsonb_build_object('ok',true,'repetido',false,
  'comprobante_id',p_reporte_id,'operation_id',p_operation_id,
  'monto_aprobado_centavos',v_total,'aplicaciones',v_results,
  'estado','aprobado','actor',p_actor,
  'excepcion_parcial',p_excepcion_parcial,'motivo',coalesce(p_motivo,''));
 update public.goxion_b2_comprobantes set
  estado='aprobado',aprobado_operation_id=p_operation_id,
  aprobado_por=p_actor,aprobado_en=now(),resultado=v_return,
  asignaciones_aprobadas=p_asignaciones
 where id=p_reporte_id;
 return v_return;
end $$;


revoke all on function public.goxion_b2_registrar_comprobante_seguro(uuid,uuid,integer,text,uuid,uuid[])
 from public,anon,authenticated;
grant execute on function public.goxion_b2_registrar_comprobante_seguro(uuid,uuid,integer,text,uuid,uuid[])
 to service_role;
revoke all on function public.goxion_b2_aprobar_comprobante(uuid,uuid,jsonb,uuid,text,boolean,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_aprobar_comprobante(uuid,uuid,jsonb,uuid,text,boolean,text)
 to service_role;
