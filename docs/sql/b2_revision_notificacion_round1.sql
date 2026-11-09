-- GOXION Admin B2 · marcar en revisión al reportar comprobante + aviso Admin.
-- Cura los síntomas 1 y 2 del diagnóstico Admin B2 (2026-11-08): la Edge
-- comprobantes-b2-beta inserta en goxion_b2_comprobantes pero nunca pone
-- clientes.pago_en_revision=true, así que la campana derivada de Admin, el
-- filtro Revisión y la ficha no ven el comprobante B2.
-- Patrón: mismo estilo que docs/sql/notification_center_activity_round3.sql
-- (gx_notify_payment_review) y supabase/migrations/202610140001_... (F4):
-- funciones security definer con search_path='', triggers AFTER con
-- drop trigger if exists, y aviso en notificaciones_admin con referencia
-- con espacio de nombres B2 (b2:reporte:<id>) para idempotencia por reporte.
-- Estado: PENDIENTE de aplicar. Primero en QA (nsvybyvvdpdgbgtvydfb) desde
-- el editor SQL del dashboard de Supabase, verificar el caso Nayeli
-- replicado y, solo con el visto bueno de Henry, aplicar en producción
-- con este mismo archivo (idempotente: CREATE OR REPLACE + DROP IF EXISTS).

create or replace function public.goxion_b2_marcar_revision_al_reportar()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare
  v_cliente record;
  v_ref text;
  v_nombre text;
begin
  -- Solo el reporte nuevo activa la revisión; un comprobante que nace en
  -- otro estado (p. ej. migración) no debe encender la marca.
  if lower(coalesce(new.estado, '')) <> 'reportado' then
    return new;
  end if;
  if new.cliente_id is null then
    return new;
  end if;
  select id, nombre, folio into v_cliente
  from public.clientes where id = new.cliente_id;
  if not found then
    return new;
  end if;
  v_nombre := coalesce(nullif(trim(v_cliente.nombre), ''), 'Un cliente');

  -- La campana de Admin, el filtro Revisión y la ficha leen esta bandera.
  -- Solo se enciende si no estaba encendida: si el cliente ya estaba en
  -- revisión por otro comprobante, no se reescribe (y el trigger
  -- gx_notify_payment_review del cliente no se dispara de más).
  update public.clientes
  set pago_en_revision = true,
      pago_revision_estado = 'revision',
      pago_revision_updated_at = now()
  where id = new.cliente_id
    and pago_en_revision is not true;

  -- Aviso Admin con la forma exacta de fecha única (mismo título y mensaje);
  -- la referencia con espacio de nombres B2 da la idempotencia por reporte:
  -- un reintento del mismo comprobante no crea un segundo aviso.
  v_ref := 'b2:reporte:' || new.id::text;
  insert into public.notificaciones_admin
    (cliente_id, cliente_nombre, tipo, titulo, mensaje, referencia, leida)
  select new.cliente_id, v_nombre, 'pago_revision',
         '💳 Comprobante recibido',
         v_nombre || ' envió un comprobante y requiere revisión.',
         v_ref, false
  where not exists (
    select 1 from public.notificaciones_admin
    where tipo = 'pago_revision' and referencia = v_ref
  );
  return new;
end $f$;

drop trigger if exists gx_b2_marcar_revision_al_reportar
  on public.goxion_b2_comprobantes;
create trigger gx_b2_marcar_revision_al_reportar
after insert on public.goxion_b2_comprobantes
for each row execute function public.goxion_b2_marcar_revision_al_reportar();

create or replace function public.goxion_b2_limpiar_revision_al_resolver()
returns trigger language plpgsql security definer set search_path = '' as $f$
begin
  -- Solo la resolución de un comprobante que estaba en revisión limpia la
  -- marca; cualquier otro cambio de estado no toca al cliente.
  if lower(coalesce(old.estado, '')) <> 'reportado' then
    return new;
  end if;
  if lower(coalesce(new.estado, '')) not in ('aprobado', 'rechazado', 'incompleto') then
    return new;
  end if;
  if new.cliente_id is null then
    return new;
  end if;
  -- La marca solo se apaga si ya no queda otro comprobante en revisión en
  -- el mismo ciclo: aprobar el 6 nov no debe borrar la revisión del 30 nov
  -- si ese comprobante llegó después.
  if exists (
    select 1 from public.goxion_b2_comprobantes
    where cliente_id = new.cliente_id
      and (new.ciclo_id is null or ciclo_id = new.ciclo_id)
      and id <> new.id
      and lower(coalesce(estado, '')) = 'reportado'
  ) then
    return new;
  end if;
  -- Espejo del flujo de fecha única (07-admin-ops-v2.js): al resolver se
  -- apaga la marca y el estado refleja la decisión (aprobado / rechazado /
  -- incompleto). Si la decisión es 'incompleto', el trigger versionado
  -- gx_notify_payment_review avisa al cliente, igual que en fecha única.
  update public.clientes
  set pago_en_revision = false,
      pago_revision_estado = lower(new.estado),
      pago_revision_updated_at = now()
  where id = new.cliente_id
    and pago_en_revision is true;
  return new;
end $f$;

drop trigger if exists gx_b2_limpiar_revision_al_resolver
  on public.goxion_b2_comprobantes;
create trigger gx_b2_limpiar_revision_al_resolver
after update of estado on public.goxion_b2_comprobantes
for each row execute function public.goxion_b2_limpiar_revision_al_resolver();

revoke execute on function public.goxion_b2_marcar_revision_al_reportar()
  from public, anon, authenticated;
revoke execute on function public.goxion_b2_limpiar_revision_al_resolver()
  from public, anon, authenticated;
