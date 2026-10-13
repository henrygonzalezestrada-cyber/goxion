-- GOXION B2: aprobación global completamente atómica, idempotente y aislada.
-- Migración preparada para validación antes del despliegue; no backfill ni escrituras de clientes.
-- La operación NO activa cobro por obligaciones. Las obligaciones B2 siguen en sombra.
create table if not exists public.goxion_aprobaciones_pago_operaciones (
 operation_id uuid primary key,
 cliente_id uuid not null references public.clientes(id),
 periodo date not null,
 monto_centavos bigint not null check (monto_centavos between 0 and 100000000),
 puntual boolean not null,
 notas text not null,
 resultado jsonb not null,
 creado_en timestamptz not null default now()
);
create index if not exists goxion_aprobaciones_cliente_periodo_idx
 on public.goxion_aprobaciones_pago_operaciones(cliente_id,periodo);
alter table public.goxion_aprobaciones_pago_operaciones enable row level security;
revoke all on public.goxion_aprobaciones_pago_operaciones from public,anon,authenticated;
grant select,insert on public.goxion_aprobaciones_pago_operaciones to service_role;

create or replace function public.goxion_aprobar_pago_periodo_atomico(
 p_cliente_id uuid, p_periodo_esperado text, p_monto numeric,
 p_puntual boolean, p_notas text, p_operation_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_cliente record; v_prev record; v_op record; v_pago record;
 v_periodo date; v_next date; v_label text; v_pagos int; v_streak int;
 v_new_streak int; v_efecto text; v_monto_centavos bigint;
 v_puntual boolean; v_notas text; v_result jsonb;
 v_financial jsonb; v_oficial_centavos bigint;
begin
 if p_cliente_id is null or p_operation_id is null or p_periodo_esperado is null
    or p_periodo_esperado !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or p_monto is null or p_monto='NaN'::numeric or p_monto<0
    or p_monto>1000000 or p_monto*100<>round(p_monto*100)
    or p_puntual is null or length(coalesce(p_notas,''))>500 then
   raise exception 'Parámetros de aprobación inválidos';
 end if;
 v_periodo=(p_periodo_esperado||'-01')::date;
 v_monto_centavos=round(p_monto*100)::bigint;
 v_puntual=p_puntual;
 v_notas=coalesce(p_notas,'');
 -- Lock único por cliente para serializar pago, parcial y aprobación repetida.
 select * into v_cliente from public.clientes
 where id=p_cliente_id for update;
 if not found then raise exception 'Cliente inexistente';end if;
 select * into v_op from public.goxion_aprobaciones_pago_operaciones
 where operation_id=p_operation_id;
 if found then
   if v_op.cliente_id is distinct from p_cliente_id
     or v_op.periodo is distinct from v_periodo
     or v_op.monto_centavos is distinct from v_monto_centavos
     or v_op.puntual is distinct from v_puntual
     or v_op.notas is distinct from v_notas then
      raise exception 'Clave de aprobación reutilizada con datos diferentes';
   end if;
   return v_op.resultado || jsonb_build_object('repetida',true);
 end if;
 if v_cliente.estado='suspendido' then
   raise exception 'Cuenta suspendida; requiere revisión administrativa';
 end if;
 -- Régimen B2 activo: el recibo global sólo se permite al cerrar TODAS
 -- las obligaciones por acceso y únicamente por la función B2.
 -- La guarda del trigger de pagos añade defensa incluso ante rutas legacy.
 if pg_catalog.to_regclass('public.goxion_b2_regimen_cliente') is not null then
  if exists(select 1 from public.goxion_b2_regimen_cliente reg
   where reg.cliente_id=p_cliente_id and reg.activo
    and v_periodo>=reg.periodo_inicio) then
    raise exception 'CLIENTE_MULTIFECHA: aprobar cada vencimiento, no el mes global';
  end if;
 end if;
 if v_cliente.periodo_pendiente is distinct from v_periodo then
   raise exception 'PERIODO_DESACTUALIZADO';
 end if;
 -- La fuente oficial se consulta bajo el lock. No se permite reabrir un pago ya liquidado.
 v_financial=public.goxion_estado_financiero(p_cliente_id);
 if v_financial->>'fuente_financiera' is distinct from 'supabase:goxion_estado_financiero'
    or v_financial->'contrato_financiero'->>'modo' is distinct from 'oficial'
    or substring(coalesce(v_financial->>'periodo',''),1,7)<>p_periodo_esperado
    or coalesce((v_financial->>'esta_pagado_periodo')::boolean,false) then
   raise exception 'PERIODO_DESACTUALIZADO o fuente financiera no cobrable';
 end if;
 if v_financial->>'total_actual' is null then
   raise exception 'No existe un total oficial verificable';
 end if;
 v_oficial_centavos=round((v_financial->>'total_actual')::numeric*100);
 if v_oficial_centavos is null or v_oficial_centavos<0
    or v_monto_centavos is distinct from v_oficial_centavos then
   raise exception 'MONTO_DESACTUALIZADO: el pago no coincide con el saldo oficial';
 end if;
 select count(*) into v_pagos from public.pagos
 where cliente_id=p_cliente_id and public.goxion_periodo_pago_canonico(periodo)=v_periodo;
 if v_pagos>1 then raise exception 'Comprobantes históricos ambiguos para este período';end if;
 select * into v_pago from public.pagos
 where cliente_id=p_cliente_id and public.goxion_periodo_pago_canonico(periodo)=v_periodo
 for update;
 if found and v_pago.estado='pagado' then
   raise exception 'Período ya acreditado con otra operación';
 end if;
 v_streak=greatest(0,coalesce(v_cliente.pagos_puntuales,0));
 v_new_streak=case when v_puntual then v_streak+1 else 0 end;
 v_efecto=case when v_puntual then 'sumo' else 'reinicio' end;
 v_label=(array['enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from v_periodo)::integer]
  || ' de ' || extract(year from v_periodo)::integer;
 if v_pago.id is not null then
   update public.pagos set fecha=(now() at time zone 'America/Mexico_City')::date,
     monto=v_monto_centavos::numeric/100, estado='pagado', notas=v_notas,
     puntual=v_puntual,lealtad_efecto=v_efecto,racha_resultado=v_new_streak
   where id=v_pago.id;
 else
   insert into public.pagos(cliente_id,fecha,periodo,monto,estado,notas,
     puntual,lealtad_efecto,racha_resultado)
   values(p_cliente_id,(now() at time zone 'America/Mexico_City')::date,
     v_label,v_monto_centavos::numeric/100,'pagado',v_notas,
     v_puntual,v_efecto,v_new_streak);
 end if;
 -- Los triggers de descuentos, promociones, retención y avisos se ejecutan
 -- dentro de ESTA MISMA transacción y revertirán si cualquiera falla.
 update public.pagos_parciales set activo=false,estado='liquidado',updated_at=now()
 where cliente_id=p_cliente_id and periodo=v_periodo and activo;
 update public.acuerdos_cobro set activo=false,estado='cumplido',updated_at=now()
 where cliente_id=p_cliente_id and periodo=v_periodo and activo;
 v_next=(v_periodo+interval '1 month')::date;
 update public.clientes set estado='pagado',pago_en_revision=false,
   pagos_puntuales=v_new_streak,descuento_fallas=0,
   periodo_pendiente=v_next,pago_revision_estado='aprobado',
   pago_revision_mensaje=null,pago_revision_monto_faltante=0,
   pago_revision_updated_at=now()
 where id=p_cliente_id;
 v_result=jsonb_build_object('ok',true,'periodo_pagado',v_label,
  'periodo_pendiente',v_next,'pagos_puntuales',v_new_streak,
  'reutilizado',v_pago.id is not null,'puntual',v_puntual,
  'lealtad_efecto',v_efecto,'racha_resultado',v_new_streak,
  'ciclo_cobro_manual',v_cliente.ciclo_cobro_manual,
  'acreditada_global',true,'acreditada_b2',false,'repetida',false);
 insert into public.goxion_aprobaciones_pago_operaciones
 (operation_id,cliente_id,periodo,monto_centavos,puntual,notas,resultado)
 values(p_operation_id,p_cliente_id,v_periodo,v_monto_centavos,
  v_puntual,v_notas,v_result);
 return v_result;
end $$;
revoke all on function public.goxion_aprobar_pago_periodo_atomico(uuid,text,numeric,boolean,text,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_aprobar_pago_periodo_atomico(uuid,text,numeric,boolean,text,uuid)
 to service_role;
