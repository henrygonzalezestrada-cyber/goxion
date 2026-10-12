-- GOXION: persistencia aislada de fechas por acceso real. NO modifica la facturación oficial.
-- Sin backfill ni cargos automáticos; contratos heredados continúan intactos.
create table if not exists public.goxion_calendario_accesos (
  id uuid primary key default gen_random_uuid(),
  cliente_acceso_id uuid not null unique references public.cliente_accesos(id) on delete cascade,
  cliente_servicio_id uuid not null references public.cliente_servicios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cobertura_hasta date not null,
  dia_corte smallint not null check (dia_corte between 1 and 31),
  precio_centavos integer not null check (precio_centavos >= 0),
  estado text not null default 'borrador' check (estado in ('borrador','verificado')),
  verificado_en timestamptz,
  actualizado_por text not null default 'admin',
  revision integer not null default 1 check (revision >= 1),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint calendario_verificado_en_check check (
    (estado = 'borrador' and verificado_en is null) or
    (estado = 'verificado' and verificado_en is not null)
  )
);
create index if not exists goxion_calendario_accesos_cliente_idx on public.goxion_calendario_accesos(cliente_id,estado,cobertura_hasta);
create index if not exists goxion_calendario_accesos_contrato_idx on public.goxion_calendario_accesos(cliente_servicio_id);

create table if not exists public.goxion_calendario_auditoria (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null,
  cliente_id uuid not null,
  cliente_servicio_id uuid not null,
  acceso_id uuid not null,
  accion text not null check (accion in ('crear','actualizar','eliminar')),
  antes jsonb,
  despues jsonb,
  actor text not null,
  ocurrido_en timestamptz not null default now()
);
create index if not exists goxion_calendario_auditoria_cliente_idx on public.goxion_calendario_auditoria(cliente_id,ocurrido_en desc);

create or replace function public.goxion_validar_calendario_acceso()
returns trigger language plpgsql set search_path = '' as $$
declare v_cliente uuid; v_contrato uuid; v_activo boolean;
begin
  select ca.cliente_id, ca.cliente_servicio_id, ca.activo and cs.activo
    into v_cliente,v_contrato,v_activo
  from public.cliente_accesos ca
  join public.cliente_servicios cs on cs.id=ca.cliente_servicio_id and cs.cliente_id=ca.cliente_id
  where ca.id = new.cliente_acceso_id;
  if v_contrato is null or not v_activo then
    raise exception 'Acceso inválido o inactivo para el calendario';
  end if;
  if v_cliente is distinct from new.cliente_id or v_contrato is distinct from new.cliente_servicio_id then
    raise exception 'El acceso no pertenece a la contratación indicada';
  end if;
  if tg_op='UPDATE' and (
      old.cliente_acceso_id<>new.cliente_acceso_id or old.cliente_servicio_id<>new.cliente_servicio_id
      or old.cliente_id<>new.cliente_id
    ) then
    raise exception 'No se puede reasignar el calendario a otro acceso';
  end if;
  if tg_op='UPDATE' then new.revision=old.revision+1; end if;
  new.actualizado_en=now();
  return new;
end $$;

drop trigger if exists goxion_validar_calendario_acceso_trg on public.goxion_calendario_accesos;
create trigger goxion_validar_calendario_acceso_trg before insert or update
on public.goxion_calendario_accesos for each row execute function public.goxion_validar_calendario_acceso();

create or replace function public.goxion_auditar_calendario_acceso()
returns trigger language plpgsql set search_path='' as $$
declare v_row record;
begin
  if tg_op='DELETE' then v_row:=old; else v_row:=new; end if;
  insert into public.goxion_calendario_auditoria(
    calendario_id,cliente_id,cliente_servicio_id,acceso_id,accion,antes,despues,actor
  ) values (
    v_row.id,v_row.cliente_id,v_row.cliente_servicio_id,v_row.cliente_acceso_id,
    case when tg_op='INSERT' then 'crear' when tg_op='UPDATE' then 'actualizar' else 'eliminar' end,
    case when tg_op='INSERT' then null else to_jsonb(old) end,
    case when tg_op='DELETE' then null else to_jsonb(new) end,
    coalesce(nullif(v_row.actualizado_por,''),'admin')
  );
  return null;
end $$;
drop trigger if exists goxion_auditar_calendario_acceso_trg on public.goxion_calendario_accesos;
create trigger goxion_auditar_calendario_acceso_trg after insert or update or delete
on public.goxion_calendario_accesos for each row execute function public.goxion_auditar_calendario_acceso();

-- Transacción completa por contrato: solo las unidades reales del contrato activo
-- y suma exacta de precio confirmado/base contractual. No crea obligaciones ni pagos.
create or replace function public.goxion_guardar_calendario_contrato_borrador(
  p_cliente_servicio_id uuid, p_unidades jsonb, p_actor text default 'admin'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  contrato record; elem jsonb; access_id uuid; n integer:=0; cents_total bigint:=0;
  expected integer; cents integer; fecha date; dia smallint; verif boolean; saved integer:=0;
begin
  select id,cliente_id,monto,activo into contrato
  from public.cliente_servicios where id=p_cliente_servicio_id for update;
  if contrato.id is null or not contrato.activo then raise exception 'Contrato no encontrado o inactivo'; end if;
  if jsonb_typeof(p_unidades) is distinct from 'array' then raise exception 'Se requiere lista de accesos'; end if;
  expected=(select count(*) from public.cliente_accesos where cliente_servicio_id=p_cliente_servicio_id and activo);
  if expected=0 or expected>30 or jsonb_array_length(p_unidades)<>expected then
    raise exception 'Debe incluir exactamente todos los accesos activos del contrato';
  end if;
  if p_actor is null or length(trim(p_actor))<1 or length(p_actor)>120 then
    raise exception 'Actor administrativo no válido';
  end if;
  create temporary table if not exists pg_temp.goxion_calendar_input (
    acceso_id uuid primary key, cobertura date not null, ancla smallint not null, cents integer not null, confirmado boolean not null
  ) on commit drop;
  truncate table pg_temp.goxion_calendar_input;
  for elem in select value from jsonb_array_elements(p_unidades) loop
    if jsonb_typeof(elem)<>'object' then raise exception 'Cada acceso debe ser un objeto'; end if;
    begin
      access_id=(elem->>'acceso_id')::uuid;
      fecha=(elem->>'cobertura_hasta')::date;
      dia=(elem->>'dia_corte')::smallint;
      cents=(elem->>'precio_centavos')::integer;
      verif=(elem->>'confirmado')::boolean;
    exception when others then
      raise exception 'Datos de cobertura, día o precio no válidos';
    end;
    if access_id is null or fecha is null or dia not between 1 and 31 or cents is null or cents<0
       or verif is null then raise exception 'Faltan datos obligatorios de acceso'; end if;
    if not exists(select 1 from public.cliente_accesos a
       where a.id=access_id and a.cliente_servicio_id=p_cliente_servicio_id
         and a.cliente_id=contrato.cliente_id and a.activo) then
      raise exception 'Acceso que no corresponde al contrato';
    end if;
    insert into pg_temp.goxion_calendar_input values (access_id,fecha,dia,cents,verif);
    n=n+1;cents_total=cents_total+cents;
  end loop;
  if n<>expected or cents_total<>round(contrato.monto*100)::bigint then
    raise exception 'El total de perfiles no coincide con el importe del contrato';
  end if;
  insert into public.goxion_calendario_accesos (
    cliente_acceso_id,cliente_servicio_id,cliente_id,cobertura_hasta,dia_corte,
    precio_centavos,estado,verificado_en,actualizado_por
  )
  select i.acceso_id,p_cliente_servicio_id,contrato.cliente_id,i.cobertura,i.ancla,
         i.cents,case when i.confirmado then 'verificado' else 'borrador' end,
         case when i.confirmado then now() else null end,p_actor
  from pg_temp.goxion_calendar_input i
  on conflict (cliente_acceso_id) do update set
    cobertura_hasta=excluded.cobertura_hasta,dia_corte=excluded.dia_corte,
    precio_centavos=excluded.precio_centavos,estado=excluded.estado,
    verificado_en=excluded.verificado_en,actualizado_por=excluded.actualizado_por;
  get diagnostics saved=row_count;
  return jsonb_build_object('ok',true,'cliente_id',contrato.cliente_id,
     'cliente_servicio_id',contrato.id,'accesos_guardados',saved,'importe_centavos',cents_total,
     'modo','calendario_sin_cobro');
end $$;

-- Service role only, NO exposed PostgREST RPC to anon/authenticated.
alter table public.goxion_calendario_accesos enable row level security;
alter table public.goxion_calendario_auditoria enable row level security;
revoke all on public.goxion_calendario_accesos from public,anon,authenticated;
revoke all on public.goxion_calendario_auditoria from public,anon,authenticated;
revoke all on function public.goxion_guardar_calendario_contrato_borrador(uuid,jsonb,text) from public,anon,authenticated;
grant select,insert,update,delete on public.goxion_calendario_accesos to service_role;
grant select,insert on public.goxion_calendario_auditoria to service_role;
grant execute on function public.goxion_guardar_calendario_contrato_borrador(uuid,jsonb,text) to service_role;
