-- GOXION B2 · Comprobante -> cargos por acceso, sin doble imputación.
-- MIGRACIÓN DE PREPARACIÓN: no sustituye flujos oficiales ni activa B2.
-- Index (F3) deberá crear el reporte autenticado y Admin aprobarlo.
-- Al aprobar, TODOS los cargos y el estado del reporte cambian en una
-- misma transacción. Un error revierte todas las aplicaciones del recibo.
create table if not exists public.goxion_b2_comprobantes (
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 ciclo_id uuid not null references public.goxion_b2_ciclos(id) on delete restrict,
 periodo date not null,
 monto_reportado_centavos integer not null check(monto_reportado_centavos>0 and monto_reportado_centavos<=100000000),
 evidencia_ref text not null check(length(evidencia_ref) between 12 and 220),
 reporte_operation_id uuid not null unique,
 estado text not null default 'reportado' check(estado in ('reportado','aprobado','rechazado')),
 aprobado_operation_id uuid unique,
 aprobado_por text,
 aprobado_en timestamptz,
 resultado jsonb,
 creado_en timestamptz not null default now(),
 unique(cliente_id,evidencia_ref),
 check((estado='aprobado')=(aprobado_operation_id is not null)),
 check((estado='aprobado')=(resultado is not null))
);
create index if not exists goxion_b2_reportes_ciclo_estado_idx
 on public.goxion_b2_comprobantes(cliente_id,ciclo_id,estado,creado_en);
create table if not exists public.goxion_b2_comprobante_aplicaciones(
 reporte_id uuid not null references public.goxion_b2_comprobantes(id) on delete restrict,
 cargo_id uuid not null references public.goxion_b2_cargos(id) on delete restrict,
 operation_id uuid not null references public.goxion_b2_abonos_aprobados(operation_id) on delete restrict,
 monto_centavos integer not null check(monto_centavos>0),
 creado_en timestamptz not null default now(),
 primary key(reporte_id,cargo_id),
 unique(operation_id)
);
alter table public.goxion_b2_comprobantes enable row level security;
alter table public.goxion_b2_comprobante_aplicaciones enable row level security;
revoke all on public.goxion_b2_comprobantes,public.goxion_b2_comprobante_aplicaciones
 from public,anon,authenticated;
grant select,insert,update on public.goxion_b2_comprobantes to service_role;
grant select,insert on public.goxion_b2_comprobante_aplicaciones to service_role;

-- Entrada de cliente: la Edge debe obtener p_cliente_id DESDE su token.
-- Evidencia es una clave de archivo cargado y validado, nunca una URL libre.
-- No acredita nada ni decide la validez del comprobante.
create or replace function public.goxion_b2_registrar_comprobante(
 p_cliente_id uuid,p_ciclo_id uuid,p_monto_centavos integer,
 p_evidencia_ref text,p_operation_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cli record;v_ciclo record;v_old record;v_nuevo uuid;
begin
 if p_cliente_id is null or p_ciclo_id is null or p_operation_id is null
  or p_monto_centavos is null or p_monto_centavos not between 1 and 100000000
  or length(btrim(coalesce(p_evidencia_ref,''))) not between 12 and 220
  or p_evidencia_ref ~ '(^https?://|[[:cntrl:]]|\.\.)' then
   raise exception 'REPORTE_B2_INVALIDO';
 end if;
 select id,periodo_pendiente into v_cli from public.clientes
 where id=p_cliente_id for update;
 if not found then raise exception 'CLIENTE_NO_EXISTE';end if;
 select * into v_old from public.goxion_b2_comprobantes
 where reporte_operation_id=p_operation_id;
 if found then
  if v_old.cliente_id is distinct from p_cliente_id
   or v_old.ciclo_id is distinct from p_ciclo_id
   or v_old.monto_reportado_centavos is distinct from p_monto_centavos
   or v_old.evidencia_ref is distinct from p_evidencia_ref
  then raise exception 'REPORTE_IDEMPOTENCIA_INCOMPATIBLE';end if;
  return jsonb_build_object('ok',true,'repetido',true,'reporte_id',v_old.id,
    'estado',v_old.estado,'acreditado',v_old.estado='aprobado');
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=p_ciclo_id and cliente_id=p_cliente_id for update;
 if not found or v_ciclo.estado<>'pendiente'
    or v_ciclo.periodo is distinct from v_cli.periodo_pendiente then
  raise exception 'CICLO_B2_NO_DISPONIBLE';
 end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
   where cliente_id=p_cliente_id and activo and periodo_inicio<=v_ciclo.periodo) then
   raise exception 'MULTIFECHA_NO_ACTIVADO';
 end if;
 insert into public.goxion_b2_comprobantes(
  cliente_id,ciclo_id,periodo,monto_reportado_centavos,evidencia_ref,reporte_operation_id
 ) values(p_cliente_id,p_ciclo_id,v_ciclo.periodo,p_monto_centavos,p_evidencia_ref,p_operation_id)
 returning id into v_nuevo;
 return jsonb_build_object('ok',true,'repetido',false,'reporte_id',v_nuevo,
  'estado','reportado','acreditado',false);
end $$;

-- Aprobación administrativa UNICA por comprobante. Entrada JSON:
-- [{cargo_id, monto_centavos, saldo_esperado_centavos, operation_id}]
-- Una selección "próximo"/"todo" paga cargos completos. Los parciales
-- únicamente son excepciones explícitas de Admin con motivo registrado.
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
  if v_reporte.aprobado_operation_id is distinct from p_operation_id then
   raise exception 'COMPROBANTE_YA_APROBADO';end if;
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
  'estado','aprobado','actor',p_actor);
 update public.goxion_b2_comprobantes set
  estado='aprobado',aprobado_operation_id=p_operation_id,
  aprobado_por=p_actor,aprobado_en=now(),resultado=v_return
 where id=p_reporte_id;
 return v_return;
end $$;
revoke all on function public.goxion_b2_registrar_comprobante(uuid,uuid,integer,text,uuid)
 from public,anon,authenticated;
revoke all on function public.goxion_b2_aprobar_comprobante(uuid,uuid,jsonb,uuid,text,boolean,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_registrar_comprobante(uuid,uuid,integer,text,uuid) to service_role;
grant execute on function public.goxion_b2_aprobar_comprobante(uuid,uuid,jsonb,uuid,text,boolean,text)
 to service_role;
