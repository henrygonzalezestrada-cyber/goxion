-- GOXION B2: registro en sombra de obligaciones, propuestas de abono e imputaciones.
-- NO genera deuda oficial, no recibe pagos, no modifica pagos/pagos_parciales/clientes.
-- Todo el esquema queda inaccesible para anon/authenticated; Admin backend service_role.
create table if not exists public.goxion_obligaciones_sombra (
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 cliente_servicio_id uuid not null references public.cliente_servicios(id) on delete restrict,
 cliente_acceso_id uuid not null references public.cliente_accesos(id) on delete restrict,
 ciclo_inicio date not null,
 fecha_vencimiento date not null,
 cobertura_hasta date not null,
 base_centavos integer not null check (base_centavos>=0),
 descuentos_centavos integer not null default 0 check (descuentos_centavos>=0),
 mora_centavos integer not null default 0 check (mora_centavos>=0),
 otros_cargos_centavos integer not null default 0 check (otros_cargos_centavos>=0),
 total_estimado_centavos integer generated always as (
   greatest(0,base_centavos-descuentos_centavos+mora_centavos+otros_cargos_centavos)
 ) stored,
 estado text not null default 'simulado' check (estado in ('simulado','conciliado','descartado')),
 motor_version text not null default 'b2-sombra-1',
 actor text not null default 'admin',
 revision integer not null default 1 check (revision>=1),
 creado_en timestamptz not null default now(),
 actualizado_en timestamptz not null default now(),
 unique (cliente_acceso_id,ciclo_inicio),
 constraint obligaciones_sombra_rangos check (
   ciclo_inicio<=fecha_vencimiento and fecha_vencimiento<=cobertura_hasta
 ),
 constraint obligaciones_sombra_descuento_max check (
   descuentos_centavos<=base_centavos
 )
);
create index if not exists goxion_obligaciones_sombra_cliente_idx
 on public.goxion_obligaciones_sombra(cliente_id,fecha_vencimiento);
create index if not exists goxion_obligaciones_sombra_contrato_idx
 on public.goxion_obligaciones_sombra(cliente_servicio_id,ciclo_inicio);

create or replace function public.goxion_validar_obligacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare
 v_cliente uuid; v_servicio uuid; v_activo boolean; v_cal_state text;
begin
 select a.cliente_id,a.cliente_servicio_id,(a.activo and s.activo),
        cal.estado
  into v_cliente,v_servicio,v_activo,v_cal_state
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
 left join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.id=new.cliente_acceso_id;
 if v_cliente is null or not v_activo
    or v_cliente is distinct from new.cliente_id
    or v_servicio is distinct from new.cliente_servicio_id then
   raise exception 'Obligación no pertenece a un acceso activo de la contratación';
 end if;
 if new.estado='conciliado' and v_cal_state is distinct from 'verificado' then
   raise exception 'El acceso no tiene calendario confirmado';
 end if;
 if tg_op='UPDATE' then
   if old.cliente_id is distinct from new.cliente_id
    or old.cliente_servicio_id is distinct from new.cliente_servicio_id
    or old.cliente_acceso_id is distinct from new.cliente_acceso_id
    or old.ciclo_inicio is distinct from new.ciclo_inicio then
     raise exception 'No se permite cambiar identidad ni ciclo de la obligación';
   end if;
   new.revision=old.revision+1;
 end if;
 new.actualizado_en=now();
 return new;
end $$;
drop trigger if exists goxion_validar_obligacion_sombra_trg
 on public.goxion_obligaciones_sombra;
create trigger goxion_validar_obligacion_sombra_trg
 before insert or update on public.goxion_obligaciones_sombra
 for each row execute function public.goxion_validar_obligacion_sombra();

create table if not exists public.goxion_abonos_sombra (
 id uuid primary key default gen_random_uuid(),
 obligacion_id uuid not null references public.goxion_obligaciones_sombra(id) on delete restrict,
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 clave_idempotencia uuid not null,
 monto_propuesto_centavos integer not null check (monto_propuesto_centavos>0),
 estado text not null default 'borrador'
  check(estado in ('borrador','solicitado','en_revision','rechazado','cancelado')),
 comentario text not null default '',
 creado_en timestamptz not null default now(),
 actualizado_en timestamptz not null default now(),
 unique(cliente_id,clave_idempotencia)
);
create index if not exists goxion_abonos_sombra_obligacion_idx
 on public.goxion_abonos_sombra(obligacion_id,estado);

create or replace function public.goxion_validar_abono_sombra()
returns trigger language plpgsql set search_path='' as $$
declare v_cliente uuid;v_saldo integer;v_estado text;
begin
 select cliente_id,total_estimado_centavos,estado
 into v_cliente,v_saldo,v_estado
 from public.goxion_obligaciones_sombra where id=new.obligacion_id for update;
 if v_cliente is distinct from new.cliente_id then
   raise exception 'El abono no corresponde al cliente de la obligación';
 end if;
 if v_estado is distinct from 'conciliado' then
   raise exception 'No se permiten solicitudes sobre obligaciones sin conciliar';
 end if;
 if new.monto_propuesto_centavos>v_saldo then
   raise exception 'La propuesta excede el importe base de la obligación';
 end if;
 if tg_op='UPDATE' and (
   old.cliente_id is distinct from new.cliente_id or
   old.obligacion_id is distinct from new.obligacion_id or
   old.clave_idempotencia is distinct from new.clave_idempotencia or
   old.monto_propuesto_centavos is distinct from new.monto_propuesto_centavos
 ) then
   raise exception 'No modificar identidad o monto de un abono; crear nueva propuesta';
 end if;
 new.actualizado_en=now();
 return new;
end $$;
drop trigger if exists goxion_validar_abono_sombra_trg on public.goxion_abonos_sombra;
create trigger goxion_validar_abono_sombra_trg
 before insert or update on public.goxion_abonos_sombra
 for each row execute function public.goxion_validar_abono_sombra();

-- Las imputaciones NO actualizan el saldo oficial, ni cambian la condición de
-- pagado. Cada propuesta queda anclada a un movimiento ya existente.
create table if not exists public.goxion_imputaciones_sombra (
 id uuid primary key default gen_random_uuid(),
 obligacion_id uuid not null references public.goxion_obligaciones_sombra(id) on delete restrict,
 pago_id uuid references public.pagos(id) on delete restrict,
 pago_parcial_id uuid references public.pagos_parciales(id) on delete restrict,
 monto_centavos integer not null check(monto_centavos>0),
 estado text not null default 'propuesta' check(estado in ('propuesta','descartada')),
 creado_en timestamptz not null default now(),
 constraint goxion_imputaciones_fuente_exacta check (
  (pago_id is not null) <> (pago_parcial_id is not null)
 ),
 unique(obligacion_id,pago_id),
 unique(obligacion_id,pago_parcial_id)
);
create index if not exists goxion_imputaciones_sombra_pago_idx
 on public.goxion_imputaciones_sombra(pago_id);
create index if not exists goxion_imputaciones_sombra_partial_idx
 on public.goxion_imputaciones_sombra(pago_parcial_id);

create or replace function public.goxion_validar_imputacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare v_cliente uuid;v_total integer;v_pago_cliente uuid;v_monto integer;
 v_otras int;v_usado int;
begin
 select cliente_id,total_estimado_centavos into v_cliente,v_total
 from public.goxion_obligaciones_sombra where id=new.obligacion_id for update;
 if new.pago_id is not null then
  select p.cliente_id,round(p.monto*100)::int into v_pago_cliente,v_monto
  from public.pagos p where id=new.pago_id for update;
  select coalesce(sum(monto_centavos),0)::int into v_usado
  from public.goxion_imputaciones_sombra
  where pago_id=new.pago_id and estado='propuesta'
   and (tg_op='INSERT' or id<>new.id);
 else
  select p.cliente_id,round(p.monto_pagado*100)::int into v_pago_cliente,v_monto
  from public.pagos_parciales p where id=new.pago_parcial_id for update;
  select coalesce(sum(monto_centavos),0)::int into v_usado
  from public.goxion_imputaciones_sombra
  where pago_parcial_id=new.pago_parcial_id and estado='propuesta'
   and (tg_op='INSERT' or id<>new.id);
 end if;
 if v_pago_cliente is null or v_cliente is distinct from v_pago_cliente then
   raise exception 'No es un pago del mismo cliente';
 end if;
 if v_monto is null or v_monto<new.monto_centavos+v_usado then
   raise exception 'La imputación supera el movimiento de origen';
 end if;
 select coalesce(sum(monto_centavos),0)::int into v_otras
 from public.goxion_imputaciones_sombra
 where obligacion_id=new.obligacion_id and estado='propuesta'
  and (tg_op='INSERT' or id<>new.id);
 if new.estado='propuesta' and v_total<new.monto_centavos+v_otras then
   raise exception 'La imputación supera el importe de la obligación';
 end if;
 if tg_op='UPDATE' and (
   old.obligacion_id is distinct from new.obligacion_id or
   old.pago_id is distinct from new.pago_id or
   old.pago_parcial_id is distinct from new.pago_parcial_id or
   old.monto_centavos is distinct from new.monto_centavos
 ) then
   raise exception 'Una imputación no cambia de importe ni origen';
 end if;
 return new;
end $$;
drop trigger if exists goxion_validar_imputacion_sombra_trg on public.goxion_imputaciones_sombra;
create trigger goxion_validar_imputacion_sombra_trg
 before insert or update on public.goxion_imputaciones_sombra
 for each row execute function public.goxion_validar_imputacion_sombra();

-- Solo service_role. RLS se deja ACTIVADO sin políticas para clientes.
alter table public.goxion_obligaciones_sombra enable row level security;
alter table public.goxion_abonos_sombra enable row level security;
alter table public.goxion_imputaciones_sombra enable row level security;
revoke all on public.goxion_obligaciones_sombra from public,anon,authenticated;
revoke all on public.goxion_abonos_sombra from public,anon,authenticated;
revoke all on public.goxion_imputaciones_sombra from public,anon,authenticated;
grant select,insert,update,delete on public.goxion_obligaciones_sombra to service_role;
grant select,insert,update,delete on public.goxion_abonos_sombra to service_role;
grant select,insert,update,delete on public.goxion_imputaciones_sombra to service_role;
