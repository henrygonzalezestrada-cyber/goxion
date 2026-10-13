-- GOXION B2 · Libro independiente por acceso. INACTIVO por defecto.
-- No modifica el estado de cuenta global ni crea pagos; toda activación
-- exige un contrato explícito y pruebas de la ruta Admin/Index.
create table if not exists public.goxion_b2_regimen_cliente(
 cliente_id uuid primary key references public.clientes(id) on delete restrict,
 activo boolean not null default false,
 periodo_inicio date not null,
 autorizado_por text not null,
 creado_en timestamptz not null default now(),
 check (periodo_inicio=date_trunc('month',periodo_inicio)::date)
);
create table if not exists public.goxion_b2_ciclos(
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 periodo date not null,
 nivel_lealtad smallint not null check(nivel_lealtad between 0 and 2),
 porcentaje_lealtad smallint not null check(porcentaje_lealtad in (0,3,6)),
 racha_inicio integer not null check(racha_inicio>=0),
 lealtad_perdida boolean not null default false,
 estado text not null default 'pendiente' check(estado in ('pendiente','liquidado')),
 racha_aplicada boolean not null default false,
 creado_en timestamptz not null default now(),
 liquidado_en timestamptz,
 unique(cliente_id,periodo),
 unique(id,cliente_id),
 check(periodo=date_trunc('month',periodo)::date)
);
create table if not exists public.goxion_b2_cargos(
 id uuid primary key default gen_random_uuid(),
 ciclo_id uuid not null references public.goxion_b2_ciclos(id) on delete restrict,
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 cliente_servicio_id uuid not null references public.cliente_servicios(id) on delete restrict,
 cliente_acceso_id uuid not null references public.cliente_accesos(id) on delete restrict,
 periodo date not null,
 fecha_vencimiento date not null,
 calendario_revision int not null check(calendario_revision>0),
 base_centavos integer not null check(base_centavos>0),
 descuento_original_centavos integer not null check(descuento_original_centavos>=0),
 descuento_vigente_centavos integer not null check(descuento_vigente_centavos>=0),
 principal_pendiente_centavos integer not null check(principal_pendiente_centavos>=0),
 mora_generada_centavos integer not null default 0 check(mora_generada_centavos>=0),
 mora_pendiente_centavos integer not null default 0 check(mora_pendiente_centavos>=0),
 mora_calculada_hasta date not null,
 liquidado boolean not null default false,
 creado_en timestamptz not null default now(),
 unique(cliente_acceso_id,periodo),
 unique(id,cliente_id),
 check(descuento_original_centavos<=base_centavos),
 check(descuento_vigente_centavos<=descuento_original_centavos),
 check(mora_generada_centavos<=round(base_centavos*.50)),
 check(mora_pendiente_centavos<=mora_generada_centavos),
 check(fecha_vencimiento>=periodo and fecha_vencimiento<(periodo+interval '1 month')::date)
);
create table if not exists public.goxion_b2_abonos_aprobados(
 operation_id uuid primary key,
 cargo_id uuid not null references public.goxion_b2_cargos(id) on delete restrict,
 cliente_id uuid not null references public.clientes(id) on delete restrict,
 monto_centavos integer not null check(monto_centavos>0),
 aplicado_principal_centavos integer not null check(aplicado_principal_centavos>=0),
 aplicado_mora_centavos integer not null check(aplicado_mora_centavos>=0),
 fecha_aprobacion date not null,
 concepto text not null,
 creado_en timestamptz not null default now(),
 check(monto_centavos=aplicado_principal_centavos+aplicado_mora_centavos)
);
create index if not exists goxion_b2_cargos_cliente_periodo_idx
 on public.goxion_b2_cargos(cliente_id,periodo);
create index if not exists goxion_b2_abonos_cargo_idx
 on public.goxion_b2_abonos_aprobados(cargo_id);
alter table public.goxion_b2_regimen_cliente enable row level security;
alter table public.goxion_b2_ciclos enable row level security;
alter table public.goxion_b2_cargos enable row level security;
alter table public.goxion_b2_abonos_aprobados enable row level security;
revoke all on public.goxion_b2_regimen_cliente,
 public.goxion_b2_ciclos,public.goxion_b2_cargos,
 public.goxion_b2_abonos_aprobados from public,anon,authenticated;
grant select,insert,update on public.goxion_b2_regimen_cliente,
 public.goxion_b2_ciclos,public.goxion_b2_cargos,
 public.goxion_b2_abonos_aprobados to service_role;

-- Preparación atómica por ciclo, sin activar automáticamente clientes.
-- El calendario/importe/beneficio deben ser oficiales y estar VERIFICADOS.
create or replace function public.goxion_b2_iniciar_ciclo(
 p_cliente_id uuid,p_periodo date
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_reg record;v_ciclo record;v_fin jsonb;
 v_n int;v_ver int;v_fechas int;v_base bigint;v_base_of bigint;
 v_disc numeric;v_lealtad numeric;v_cargos numeric;
 v_pct int;v_nivel int;v_creados int;
begin
 if p_cliente_id is null or p_periodo is null
   or p_periodo<>date_trunc('month',p_periodo)::date then
   raise exception 'Cliente y ciclo válidos requeridos';
 end if;
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then raise exception 'Cuenta no elegible';end if;
 select * into v_reg from public.goxion_b2_regimen_cliente
 where cliente_id=p_cliente_id and activo for update;
 if not found or p_periodo<v_reg.periodo_inicio then
  raise exception 'MULTIFECHA_NO_ACTIVADO';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where cliente_id=p_cliente_id and periodo=p_periodo for update;
 if found then return jsonb_build_object('ok',true,'ciclo_id',v_ciclo.id,
  'repetida',true,'modo','b2_por_acceso','cobrable',false);end if;
 if p_periodo is distinct from v_cliente.periodo_pendiente then
  raise exception 'El ciclo global requiere conciliación previa';
 end if;
 if exists(select 1 from public.pagos where cliente_id=p_cliente_id
  and estado='pagado'
  and public.goxion_periodo_pago_canonico(periodo)=p_periodo) then
  raise exception 'Hay comprobante global pagado; no duplicar';
 end if;
 if exists(select 1 from public.pagos_parciales where cliente_id=p_cliente_id
  and periodo=p_periodo and activo) then
  raise exception 'Existen abonos heredados; requieren conciliación';
 end if;
 if v_cliente.pago_en_revision then raise exception 'Comprobante global en revisión';end if;
 select count(*),count(*) filter(where cal.estado='verificado'
   and cal.precio_centavos>0 and cal.revision>0
   and cal.cobertura_hasta>=p_periodo
   and cal.cobertura_hasta<(p_periodo+interval '1 month')::date),
 count(distinct cal.cobertura_hasta),
 coalesce(sum(cal.precio_centavos),0)::bigint
 into v_n,v_ver,v_fechas,v_base
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id
  and s.activo and s.cliente_id=p_cliente_id
 left join public.goxion_calendario_accesos cal
  on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo;
 if v_n<2 or v_n<>v_ver or v_fechas<2 then
  raise exception 'Calendarios verificados insuficientes';
 end if;
 if exists(select 1 from public.cliente_servicios s where s.cliente_id=p_cliente_id
  and s.activo and round(s.monto*100)::bigint is distinct from
   (select coalesce(sum(cal.precio_centavos),0) from public.goxion_calendario_accesos cal
    where cal.cliente_servicio_id=s.id and cal.estado='verificado')) then
  raise exception 'Precio de accesos sin conciliación comercial';
 end if;
 -- Evitar combo cuyo ordinal de acceso es repetido/ambiguo.
 if exists(select 1 from public.cliente_accesos a join public.cliente_servicios s
   on s.id=a.cliente_servicio_id and s.activo
   where a.cliente_id=p_cliente_id and a.activo
   group by a.cliente_servicio_id having count(*)<>count(distinct a.ordinal)) then
  raise exception 'Contrato con unidades ambiguas';
 end if;
 v_fin=public.goxion_estado_financiero(p_cliente_id);
 if v_fin->>'fuente_financiera'<>'supabase:goxion_estado_financiero'
   or v_fin->'contrato_financiero'->>'modo'<>'oficial'
   or left(v_fin->>'periodo',7)<>to_char(p_periodo,'YYYY-MM') then
  raise exception 'Estado financiero oficial desactualizado';
 end if;
 v_base_of=round((v_fin->>'subtotal')::numeric*100)::bigint;
 v_disc=coalesce((v_fin->'descuentos'->>'total')::numeric,0);
 v_lealtad=coalesce((v_fin->'descuentos'->>'lealtad')::numeric,0);
 v_cargos=coalesce((v_fin->'cargos'->>'total')::numeric,0);
 if v_base_of is distinct from v_base or v_disc<>v_lealtad or v_cargos<>0 then
  raise exception 'Promociones, cupón o mora requieren atribución antes de B2';
 end if;
 v_pct=coalesce((v_fin->'lealtad'->>'porcentaje')::numeric,0)::integer;
 v_nivel=coalesce((v_fin->'lealtad'->>'nivel')::int,0);
 if (v_nivel,v_pct) not in ((0,0),(1,3),(2,6)) then
  raise exception 'Nivel de lealtad inconsistente';
 end if;
 -- Protege contra cambios de fecha/precio durante materialización.
 perform 1 from public.goxion_calendario_accesos cal
 join public.cliente_accesos a on a.id=cal.cliente_acceso_id
 where a.cliente_id=p_cliente_id and a.activo for share of cal;
 insert into public.goxion_b2_ciclos(cliente_id,periodo,nivel_lealtad,
  porcentaje_lealtad,racha_inicio)
 values(p_cliente_id,p_periodo,v_nivel,v_pct,v_cliente.pagos_puntuales)
 returning * into v_ciclo;
 insert into public.goxion_b2_cargos(ciclo_id,cliente_id,cliente_servicio_id,
  cliente_acceso_id,periodo,fecha_vencimiento,calendario_revision,base_centavos,
  descuento_original_centavos,descuento_vigente_centavos,
  principal_pendiente_centavos,mora_calculada_hasta)
 select v_ciclo.id,p_cliente_id,a.cliente_servicio_id,a.id,
  p_periodo,cal.cobertura_hasta,cal.revision,cal.precio_centavos,
  round(cal.precio_centavos*v_pct::numeric/100)::int,
  round(cal.precio_centavos*v_pct::numeric/100)::int,
  cal.precio_centavos-round(cal.precio_centavos*v_pct::numeric/100)::int,
  cal.cobertura_hasta
 from public.cliente_accesos a
 join public.cliente_servicios s on s.id=a.cliente_servicio_id and s.activo
 join public.goxion_calendario_accesos cal on cal.cliente_acceso_id=a.id
 where a.cliente_id=p_cliente_id and a.activo and cal.estado='verificado';
 get diagnostics v_creados=row_count;
 if v_creados<>v_n then raise exception 'No se preparó la totalidad de accesos';end if;
 return jsonb_build_object('ok',true,'ciclo_id',v_ciclo.id,'accesos',v_creados,
  'porcentaje_lealtad',v_pct,'repetida',false,'modo','b2_por_acceso',
  'cobrable',false,'advertencia','Ciclo creado, aún no hay pagos aprobados');
end $$;
revoke all on function public.goxion_b2_iniciar_ciclo(uuid,date)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_iniciar_ciclo(uuid,date) to service_role;
