-- GOXION Realtime · Round 2
-- Aplicado en producción: 2026-10-08
-- Crea la bandeja general del cliente, notificaciones automáticas y scopes Realtime.

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
  on public.cliente_notificaciones(cliente_id, leida_at) where leida_at is null;
create unique index if not exists ux_cliente_notificaciones_dedupe
  on public.cliente_notificaciones(cliente_id, dedupe_key) where dedupe_key is not null;

-- Las funciones/trigger de producción:
-- public.goxion_notify_pago_cliente()
-- public.goxion_notify_cancelacion_cliente()
-- public.goxion_notify_beneficio_cliente()
-- public.goxion_cliente_notificaciones_touch()
-- public.goxion_realtime_invalidate()
--
-- El detalle íntegro del contrato funcional se documenta en docs/REALTIME.md.
-- Mantener cliente_notificaciones y trato_justo_compensaciones conectados a
-- gx_realtime_* con scopes client_notifications y account_state respectivamente.
