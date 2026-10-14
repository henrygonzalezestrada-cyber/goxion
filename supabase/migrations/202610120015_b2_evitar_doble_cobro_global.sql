-- Guardrail de compatibilidad: jamás acreditar un mes en el sistema
-- global cuando el cliente ya está activo en régimen B2.
-- Excepción: un ÚNICO recibo consolidado, al cerrar el ciclo B2, en
-- la misma transacción SQL autenticada y bajo señal local de ciclo.
-- Sin clientes opt-in, este trigger no altera el comportamiento antiguo.
create or replace function public.goxion_b2_impedir_pago_global_paralelo()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_periodo date;v_ciclo uuid;v_key text;
begin
 if new.estado is distinct from 'pagado' then return new;end if;
 v_periodo=public.goxion_periodo_pago_canonico(new.periodo);
 if v_periodo is null then return new;end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente r
   where r.cliente_id=new.cliente_id and r.activo and v_periodo>=r.periodo_inicio) then
   return new;end if;
 v_key=pg_catalog.current_setting('goxion.b2_recibo_autorizado',true);
 if v_key is null or v_key='' then
  raise exception 'CLIENTE_MULTIFECHA: usar aprobación por obligación';
 end if;
 select c.id into v_ciclo from public.goxion_b2_ciclos c
 where c.id::text=v_key and c.cliente_id=new.cliente_id
   and c.periodo=v_periodo and c.estado='liquidado' and c.racha_aplicada;
 if v_ciclo is null then
  raise exception 'Recibo B2 sin ciclo liquidado compatible';
 end if;
 if exists(select 1 from public.goxion_b2_cargos b
  where b.ciclo_id=v_ciclo and not b.liquidado) then
  raise exception 'Recibo B2 con obligación pendiente';end if;
 return new;
end $$;
drop trigger if exists goxion_b2_proteger_recibo_global on public.pagos;
create trigger goxion_b2_proteger_recibo_global
before insert or update of estado,periodo,monto on public.pagos
for each row execute function public.goxion_b2_impedir_pago_global_paralelo();
revoke all on function public.goxion_b2_impedir_pago_global_paralelo()
 from public,anon,authenticated;
grant execute on function public.goxion_b2_impedir_pago_global_paralelo()
 to service_role;
