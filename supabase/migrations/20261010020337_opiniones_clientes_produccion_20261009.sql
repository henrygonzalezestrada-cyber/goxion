-- GOXION · Opiniones oficiales; migración aplicada a GOXION_CORE el 2026-10-10 UTC.
-- Acceso solo mediante Edge Function opiniones-goxion con sesiones firmadas.
create table if not exists public.opiniones_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  calificacion smallint not null check (calificacion between 1 and 5),
  comentario text not null check (char_length(btrim(comentario)) between 12 and 500),
  consentimiento_publicacion boolean not null default false,
  cliente_verificado boolean not null default true,
  autor_publico text not null check (char_length(autor_publico) between 2 and 90),
  estado text not null default 'pendiente' check (estado in ('pendiente','publicada','privada','oculta')),
  respuesta_admin text check (respuesta_admin is null or char_length(btrim(respuesta_admin)) between 2 and 200),
  creado_en timestamptz not null default now(),
  revisado_en timestamptz,
  constraint opiniones_estado_consentimiento
    check (estado <> 'publicada' or (consentimiento_publicacion and cliente_verificado))
);
create index if not exists opiniones_clientes_publicadas_idx
 on public.opiniones_clientes (creado_en desc)
 where estado='publicada' and consentimiento_publicacion and cliente_verificado;
create index if not exists opiniones_clientes_cliente_fecha_idx
 on public.opiniones_clientes (cliente_id,creado_en desc);
create index if not exists opiniones_clientes_estado_fecha_idx
 on public.opiniones_clientes (estado,creado_en desc);
alter table public.opiniones_clientes enable row level security;
revoke all on table public.opiniones_clientes from anon, authenticated;
comment on table public.opiniones_clientes is
 'Opiniones verificadas de GOXION. Lectura y escritura exclusivamente mediante Edge Function con sesión propia verificada y service role; publicación requiere consentimiento y moderación.';