-- Registro de experiencia por plataforma y reportes de cliente (no determina compensaciones).
create table if not exists public.goxion_calificaciones_plataforma (
 cliente_id uuid not null references public.clientes(id) on delete cascade,
 plataforma_clave text not null check (length(plataforma_clave) between 1 and 180),
 plataforma text not null,
 calificacion smallint not null check(calificacion between 1 and 5),
 comentario text not null default '' check(length(comentario)<=500),
 actualizado_en timestamptz not null default now(),
 primary key(cliente_id,plataforma_clave)
);
create table if not exists public.goxion_reportes_trato_justo (
 id uuid primary key,
 cliente_id uuid not null references public.clientes(id) on delete cascade,
 cliente_servicio_id uuid references public.cliente_servicios(id) on delete set null,
 plataforma text not null,
 motivo text not null check(motivo in ('interrumpido','frecuente','sin_acceso','otro')),
 descripcion text not null default '' check(length(descripcion)<=500),
 afectacion_desde date not null,
 creado_en timestamptz not null default now(),
 estado text not null default 'pendiente' check(estado in ('pendiente','en_revision','resuelto','no_procede'))
);
alter table public.goxion_calificaciones_plataforma enable row level security;
alter table public.goxion_reportes_trato_justo enable row level security;
revoke all on public.goxion_calificaciones_plataforma,public.goxion_reportes_trato_justo from public,anon,authenticated;
grant select,insert,update on public.goxion_calificaciones_plataforma,public.goxion_reportes_trato_justo to service_role;
create index if not exists goxion_reportes_trato_cliente_fecha on public.goxion_reportes_trato_justo(cliente_id,creado_en desc);