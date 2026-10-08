-- GOXION Realtime · Round 2
-- Aplicado en producción: 2026-10-08

create table if not exists public.cliente_notificaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  referencia text,
  prioridad smallint not null default 0,
  leida_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cliente_notificaciones enable row level security;
revoke all on table public.cliente_notificaciones from anon, authenticated;

create index if not exists idx_cliente_notificaciones_cliente_created
  on public.cliente_notificaciones(cliente_id, created_at desc);
create index if not exists idx_cliente_notificaciones_unread
  on public.cliente_notificaciones(cliente_id, leida_at)
  where leida_at is null;
create unique index if not exists ux_cliente_notificaciones_dedupe
  on public.cliente_notificaciones(cliente_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.goxion_cliente_notificaciones_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gx_cliente_notificaciones_touch on public.cliente_notificaciones;
create trigger gx_cliente_notificaciones_touch
before update on public.cliente_notificaciones
for each row execute function public.goxion_cliente_notificaciones_touch();

create or replace function public.goxion_notify_pago_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_should_notify boolean := false;
  v_periodo text;
begin
  if TG_OP = 'INSERT' then
    v_should_notify := lower(coalesce(new.estado,'')) = 'pagado';
  elsif TG_OP = 'UPDATE' then
    v_should_notify := lower(coalesce(new.estado,'')) = 'pagado'
      and lower(coalesce(old.estado,'')) <> 'pagado';
  end if;

  if not v_should_notify then return new; end if;
  v_periodo := nullif(trim(coalesce(new.periodo,'')), '');

  insert into public.cliente_notificaciones(
    cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key
  )
  select
    new.cliente_id,
    'pago_acreditado',
    'Pago acreditado',
    'Tu pago de $' || trim(to_char(new.monto,'FM999999990.00')) ||
      case when v_periodo is not null then ' para ' || v_periodo else '' end ||
      ' quedó registrado correctamente.',
    new.id::text,
    2,
    'pago:' || new.id::text
  where not exists (
    select 1 from public.cliente_notificaciones
    where cliente_id=new.cliente_id and dedupe_key='pago:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists gx_notify_pago_cliente on public.pagos;
create trigger gx_notify_pago_cliente
after insert or update of estado on public.pagos
for each row execute function public.goxion_notify_pago_cliente();

create or replace function public.goxion_notify_cancelacion_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_message text;
  v_key text;
begin
  if TG_OP = 'INSERT' then
    v_title := 'Solicitud recibida';
    v_message := 'Recibimos tu solicitud de cancelación y ya está en revisión.';
    v_key := 'cancelacion:' || new.id::text || ':solicitada';
  elsif TG_OP = 'UPDATE' and new.estado is distinct from old.estado then
    v_key := 'cancelacion:' || new.id::text || ':' || lower(coalesce(new.estado,'actualizada'));
    case lower(coalesce(new.estado,''))
      when 'aprobada' then
        v_title := 'Cancelación aprobada';
        v_message := 'Tu solicitud de cancelación fue aprobada. Revisa Mi Espacio para ver el estado del servicio.';
      when 'rechazada' then
        v_title := 'Cancelación revisada';
        v_message := case when nullif(trim(coalesce(new.nota_admin,'')),'') is not null
          then new.nota_admin
          else 'Tu solicitud de cancelación fue revisada y no se aplicó.'
        end;
      when 'efectiva' then
        v_title := 'Cancelación completada';
        v_message := 'La cancelación de tu servicio ya quedó aplicada.';
      when 'cancelada' then
        v_title := 'Solicitud cerrada';
        v_message := 'La solicitud de cancelación quedó cerrada.';
      else
        v_title := 'Solicitud actualizada';
        v_message := 'Hay un nuevo estado en tu solicitud de cancelación.';
    end case;
  else
    return new;
  end if;

  insert into public.cliente_notificaciones(
    cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key
  )
  select new.cliente_id,'cancelacion',v_title,v_message,new.id::text,2,v_key
  where not exists (
    select 1 from public.cliente_notificaciones
    where cliente_id=new.cliente_id and dedupe_key=v_key
  );
  return new;
end;
$$;

drop trigger if exists gx_notify_cancelacion_cliente on public.solicitudes_cancelacion;
create trigger gx_notify_cancelacion_cliente
after insert or update of estado on public.solicitudes_cancelacion
for each row execute function public.goxion_notify_cancelacion_cliente();

create or replace function public.goxion_notify_beneficio_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_concepto text;
begin
  select concepto into v_concepto
  from public.beneficios_programados
  where id=new.beneficio_id;

  insert into public.cliente_notificaciones(
    cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key
  )
  select
    new.cliente_id,
    'beneficio_aplicado',
    'Beneficio aplicado',
    coalesce(nullif(trim(v_concepto),''),'Se aplicó un beneficio a tu cuenta') ||
      ' · ahorro $' || trim(to_char(new.monto_aplicado,'FM999999990.00')) || '.',
    new.id::text,
    1,
    'beneficio:' || new.id::text
  where not exists (
    select 1 from public.cliente_notificaciones
    where cliente_id=new.cliente_id and dedupe_key='beneficio:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists gx_notify_beneficio_cliente on public.beneficio_aplicaciones;
create trigger gx_notify_beneficio_cliente
after insert on public.beneficio_aplicaciones
for each row execute function public.goxion_notify_beneficio_cliente();

create or replace function public.goxion_realtime_invalidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
begin
  v_scope := case TG_TABLE_NAME
    when 'registro_solicitudes' then 'registrations'
    when 'notificaciones_admin' then 'admin_activity'
    when 'solicitudes_cancelacion' then 'cancellations'
    when 'cliente_servicio_novedades' then 'client_notifications'
    when 'cliente_notificaciones' then 'client_notifications'
    when 'gamificacion' then 'rewards'
    when 'cliente_misiones_progreso' then 'rewards'
    when 'referidos' then 'referrals'
    when 'clientes' then 'client_state'
    when 'cliente_servicios' then 'client_state'
    when 'cliente_accesos' then 'client_access'
    when 'servicio_cuentas' then 'client_access'
    when 'pagos' then 'account_state'
    when 'pagos_parciales' then 'account_state'
    when 'beneficios_programados' then 'account_state'
    when 'beneficio_aplicaciones' then 'account_state'
    when 'descuentos_especiales' then 'account_state'
    when 'trato_justo_compensaciones' then 'account_state'
    when 'promocion_aplicaciones' then 'account_state'
    when 'cliente_servicio_promociones' then 'account_state'
    when 'promocion_adquisicion_aplicaciones' then 'account_state'
    else 'general'
  end;

  perform realtime.send(
    jsonb_build_object(
      'scope', v_scope,
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'at', extract(epoch from clock_timestamp())::bigint
    ),
    'invalidate',
    'goxion:live',
    false
  );
  return null;
end;
$$;

drop trigger if exists gx_realtime_cliente_notificaciones on public.cliente_notificaciones;
create trigger gx_realtime_cliente_notificaciones
after insert or update or delete on public.cliente_notificaciones
for each statement execute function public.goxion_realtime_invalidate();

drop trigger if exists gx_realtime_trato_justo_compensaciones on public.trato_justo_compensaciones;
create trigger gx_realtime_trato_justo_compensaciones
after insert or update or delete on public.trato_justo_compensaciones
for each statement execute function public.goxion_realtime_invalidate();

revoke execute on function public.goxion_realtime_invalidate() from public, anon, authenticated;
revoke execute on function public.goxion_notify_pago_cliente() from public, anon, authenticated;
revoke execute on function public.goxion_notify_cancelacion_cliente() from public, anon, authenticated;
revoke execute on function public.goxion_notify_beneficio_cliente() from public, anon, authenticated;
revoke execute on function public.goxion_cliente_notificaciones_touch() from public, anon, authenticated;
