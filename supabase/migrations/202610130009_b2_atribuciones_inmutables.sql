-- B2 F2: congelar plan comercial al materializar un ciclo.
-- Defensa de BD incluso contra escrituras service_role fuera del gateway.
create or replace function public.goxion_b2_bloquear_mutacion_atribucion()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_periodo date;
begin
 v_id=case when tg_op='INSERT' then new.cliente_id else old.cliente_id end;
 v_periodo=case when tg_op='INSERT' then new.periodo else old.periodo end;
 perform 1 from public.clientes where id=v_id for update;
 if not found then raise exception 'ATRIBUCION_CLIENTE_NO_EXISTE';end if;
 if exists(select 1 from public.goxion_b2_ciclos
  where cliente_id=v_id and periodo=v_periodo) then
  raise exception 'ATRIBUCION_CICLO_INMUTABLE';end if;
 if tg_op='UPDATE' and
  (new.cliente_id is distinct from old.cliente_id or
   new.periodo is distinct from old.periodo) then
  raise exception 'ATRIBUCION_NO_TRANSFERIBLE';end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end $$;
drop trigger if exists goxion_b2_atribucion_inmutable on public.goxion_b2_atribuciones_comerciales;
create trigger goxion_b2_atribucion_inmutable
before insert or update or delete on public.goxion_b2_atribuciones_comerciales
for each row execute function public.goxion_b2_bloquear_mutacion_atribucion();
revoke all on function public.goxion_b2_bloquear_mutacion_atribucion() from public,anon,authenticated;
grant execute on function public.goxion_b2_bloquear_mutacion_atribucion() to service_role;
