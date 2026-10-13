-- Mantener inmutables vencimiento, identidad y precio durante un ciclo B2
-- con obligaciones pendientes, para impedir acreditaciones contra datos
-- cambiados desde Admin. Unificar requiere cerrar/conciliar el ciclo.
create or replace function public.goxion_b2_congelar_calendario_en_ciclo()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_access uuid;
begin
 v_access=case when tg_op='DELETE' then old.cliente_acceso_id
   else new.cliente_acceso_id end;
 if not exists (
  select 1 from public.goxion_b2_cargos b
  join public.goxion_b2_ciclos ciclo on ciclo.id=b.ciclo_id
  join public.goxion_b2_regimen_cliente reg on reg.cliente_id=b.cliente_id
  where b.cliente_acceso_id=v_access
   and reg.activo and ciclo.estado='pendiente'
 ) then return case when tg_op='DELETE' then old else new end;end if;
 if tg_op='DELETE' then
  raise exception 'CALENDARIO_B2_EN_COBRO: no borrar fecha pendiente';end if;
 if new.cliente_acceso_id is distinct from old.cliente_acceso_id
   or new.cliente_servicio_id is distinct from old.cliente_servicio_id
   or new.cliente_id is distinct from old.cliente_id
   or new.cobertura_hasta is distinct from old.cobertura_hasta
   or new.dia_corte is distinct from old.dia_corte
   or new.precio_centavos is distinct from old.precio_centavos
   or new.estado is distinct from old.estado then
    raise exception 'CALENDARIO_B2_EN_COBRO: conciliar abonos antes de cambiar vencimientos';
 end if;
 return new;
end $$;
drop trigger if exists goxion_b2_guardar_fecha_en_ciclo on public.goxion_calendario_accesos;
create trigger goxion_b2_guardar_fecha_en_ciclo
before update or delete on public.goxion_calendario_accesos
for each row execute function public.goxion_b2_congelar_calendario_en_ciclo();

create or replace function public.goxion_b2_congelar_precio_contrato()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='UPDATE' and
   new.monto is not distinct from old.monto and
   new.activo is not distinct from old.activo) then return new;end if;
 if exists(select 1 from public.goxion_b2_cargos b
  join public.goxion_b2_ciclos c on c.id=b.ciclo_id
  join public.goxion_b2_regimen_cliente reg on reg.cliente_id=b.cliente_id
  where b.cliente_servicio_id=old.id and reg.activo and c.estado='pendiente') then
   raise exception 'CONTRATO_B2_EN_COBRO: precio/cancelación requieren conciliación';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists goxion_b2_guardar_contrato_en_ciclo on public.cliente_servicios;
create trigger goxion_b2_guardar_contrato_en_ciclo
before update of monto,activo or delete on public.cliente_servicios
for each row execute function public.goxion_b2_congelar_precio_contrato();

revoke all on function public.goxion_b2_congelar_calendario_en_ciclo()
 from public,anon,authenticated;
revoke all on function public.goxion_b2_congelar_precio_contrato()
 from public,anon,authenticated;
grant execute on function public.goxion_b2_congelar_calendario_en_ciclo(),
 public.goxion_b2_congelar_precio_contrato() to service_role;
