-- B2 sombra: auditoría central de obligaciones, solicitudes e imputaciones.
-- No tocar tablas de pagos/cobros oficiales ni crear movimientos.
create table if not exists public.goxion_b2_auditoria (
 id uuid primary key default gen_random_uuid(),
 entidad text not null check (entidad in ('obligacion','abono','imputacion')),
 entidad_id uuid not null,
 cliente_id uuid not null,
 accion text not null check(accion in ('crear','actualizar','eliminar')),
 antes jsonb,
 despues jsonb,
 ocurrido_en timestamptz not null default now()
);
create index if not exists goxion_b2_auditoria_cliente_idx
 on public.goxion_b2_auditoria(cliente_id,ocurrido_en desc);
alter table public.goxion_b2_auditoria enable row level security;
revoke all on public.goxion_b2_auditoria from public,anon,authenticated,service_role;
grant select,insert on public.goxion_b2_auditoria to service_role;

create or replace function public.goxion_auditar_b2_sombra()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_row jsonb;v_cliente uuid;v_id uuid;v_entidad text;
begin
 if tg_op='DELETE' then v_row=to_jsonb(old); else v_row=to_jsonb(new);end if;
 if tg_table_name='goxion_obligaciones_sombra' then v_entidad='obligacion';
 elsif tg_table_name='goxion_abonos_sombra' then v_entidad='abono';
 elsif tg_table_name='goxion_imputaciones_sombra' then v_entidad='imputacion';
 else raise exception 'Fuente de auditoría desconocida';end if;
 v_id=(v_row->>'id')::uuid;
 if v_entidad='imputacion' then
  select cliente_id into v_cliente from public.goxion_obligaciones_sombra
   where id=(v_row->>'obligacion_id')::uuid;
 else v_cliente=(v_row->>'cliente_id')::uuid; end if;
 if v_cliente is null then raise exception 'Auditoría requiere cliente válido';end if;
 insert into public.goxion_b2_auditoria
  (entidad,entidad_id,cliente_id,accion,antes,despues)
 values (v_entidad,v_id,v_cliente,
  case when tg_op='INSERT' then 'crear'
       when tg_op='UPDATE' then 'actualizar'
       else 'eliminar' end,
  case when tg_op='INSERT' then null else to_jsonb(old) end,
  case when tg_op='DELETE' then null else to_jsonb(new) end);
 return null;
end $$;
drop trigger if exists goxion_b2_obligacion_audit on public.goxion_obligaciones_sombra;
create trigger goxion_b2_obligacion_audit after insert or update or delete
 on public.goxion_obligaciones_sombra for each row
 execute function public.goxion_auditar_b2_sombra();
drop trigger if exists goxion_b2_abono_audit on public.goxion_abonos_sombra;
create trigger goxion_b2_abono_audit after insert or update or delete
 on public.goxion_abonos_sombra for each row
 execute function public.goxion_auditar_b2_sombra();
drop trigger if exists goxion_b2_imputacion_audit on public.goxion_imputaciones_sombra;
create trigger goxion_b2_imputacion_audit after insert or update or delete
 on public.goxion_imputaciones_sombra for each row
 execute function public.goxion_auditar_b2_sombra();
