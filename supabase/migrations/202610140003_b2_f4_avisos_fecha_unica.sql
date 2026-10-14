-- GOXION F4 · un solo bus de acuerdos automáticos: fecha única + B2.
-- No modifica mora ni lealtad, sólo registra confirmaciones reales.
alter table public.goxion_b2_f4_eventos
 add column if not exists acuerdo_global_id uuid references public.acuerdos_cobro(id) on delete restrict;
alter table public.goxion_b2_f4_eventos alter column acuerdo_id drop not null;
alter table public.goxion_b2_f4_eventos alter column ciclo_id drop not null;
alter table public.goxion_b2_f4_eventos alter column cargo_id drop not null;
alter table public.goxion_b2_f4_eventos
 add constraint goxion_b2_f4_fuente_unica_check
 check (
  (acuerdo_id is not null and acuerdo_global_id is null
    and ciclo_id is not null and cargo_id is not null)
  or (acuerdo_global_id is not null and acuerdo_id is null
    and ciclo_id is null and cargo_id is null)
 );

create or replace function public.goxion_b2_f4_registrar_global(
 p_tipo text,p_acuerdo_global_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $f$
declare a record;c record;k text;v_id uuid;
begin
 if p_tipo not in ('prorroga_activada','prorroga_cumplida')
  or p_acuerdo_global_id is null then
  raise exception 'F4_GLOBAL_EVENTO_INVALIDO';end if;
 select * into a from public.acuerdos_cobro where id=p_acuerdo_global_id;
 if not found or a.operation_id is null
  or a.motivo is distinct from 'Prórroga automática confirmada desde Mi Espacio'
  or a.fecha_pactada<=a.fecha_original
  or a.fecha_pactada>a.fecha_original+5
  or a.estado not in ('activo','cumplido') then
   raise exception 'F4_GLOBAL_ACUERDO_NO_AUTOMATICO';end if;
 select id,nombre into c from public.clientes where id=a.cliente_id;
 if not found then raise exception 'F4_GLOBAL_CLIENTE_NO_EXISTE';end if;
 k=p_tipo||':global:'||a.id::text;
 insert into public.goxion_b2_f4_eventos
  (clave,tipo,acuerdo_global_id,cliente_id,fecha_original,fecha_pactada)
 values(k,p_tipo,a.id,a.cliente_id,a.fecha_original,a.fecha_pactada)
 on conflict(clave) do nothing returning id into v_id;
 if v_id is null then
   select id into v_id from public.goxion_b2_f4_eventos where clave=k;
   return jsonb_build_object('ok',true,'nuevo',false,'evento_id',v_id);
 end if;
 insert into public.goxion_b2_f4_discord_outbox(evento_id) values(v_id);
 insert into public.notificaciones_admin
  (cliente_id,cliente_nombre,tipo,titulo,mensaje,referencia,leida)
 values(a.cliente_id,c.nombre,p_tipo,
  case when p_tipo='prorroga_activada'
    then 'Prórroga hasta '||to_char(a.fecha_pactada,'DD/MM/YYYY')
    else 'Prórroga cumplida' end,
  'Fecha original: '||to_char(a.fecha_original,'DD/MM/YYYY')||
  ' · Fecha pactada: '||to_char(a.fecha_pactada,'DD/MM/YYYY')||
  ' · Acuerdo: '||a.id::text||
  ' · Esquema: fecha única',
  'b2:'||k,false);
 return jsonb_build_object('ok',true,'nuevo',true,'evento_id',v_id);
end $f$;

create or replace function public.goxion_b2_f4_global_confirmado_trigger()
 returns trigger language plpgsql security definer set search_path='' as $f$
begin
 if new.activo and new.estado='activo'
  and new.motivo='Prórroga automática confirmada desde Mi Espacio'
  and new.operation_id is not null
  and (tg_op='INSERT' or (tg_op='UPDATE' and
    (old.estado is distinct from new.estado or
     old.operation_id is distinct from new.operation_id))) then
  perform public.goxion_b2_f4_registrar_global('prorroga_activada',new.id);
 end if;
 return new;
end $f$;
drop trigger if exists gx_b2_f4_global_confirmada on public.acuerdos_cobro;
create trigger gx_b2_f4_global_confirmada
 after insert or update of estado,operation_id on public.acuerdos_cobro
 for each row execute function public.goxion_b2_f4_global_confirmado_trigger();

create or replace function public.goxion_b2_f4_global_pago_trigger()
 returns trigger language plpgsql security definer set search_path='' as $f$
declare a record; v_periodo date;
begin
 if new.estado='pagado' and
   (tg_op='INSERT' or old.estado is distinct from 'pagado') then
  -- No interpretar períodos legacy salvo que exista una prórroga
  -- automática real para este cliente: el cobro habitual queda intacto.
  if not exists(select 1 from public.acuerdos_cobro
    where cliente_id=new.cliente_id and activo
    and operation_id is not null
    and motivo='Prórroga automática confirmada desde Mi Espacio')
  then return new;end if;
  v_periodo=public.goxion_periodo_pago_canonico(new.periodo);
  for a in select * from public.acuerdos_cobro
   where cliente_id=new.cliente_id and periodo=v_periodo
    and activo and estado in ('activo','cumplido')
    and new.fecha<=fecha_pactada
    and operation_id is not null
    and motivo='Prórroga automática confirmada desde Mi Espacio'
  loop
   perform public.goxion_b2_f4_registrar_global('prorroga_cumplida',a.id);
  end loop;
 end if;
 return new;
end $f$;
drop trigger if exists gx_b2_f4_global_pago on public.pagos;
create trigger gx_b2_f4_global_pago
 after insert or update of estado on public.pagos
 for each row execute function public.goxion_b2_f4_global_pago_trigger();

-- La entrega procesa exactamente el mismo outbox y webhook.
create or replace function public.goxion_b2_f4_claim_discord(p_limit integer default 5)
 returns table(evento_id uuid,tipo text,acuerdo_id uuid,cliente_id uuid,
 cliente_nombre text,folio text,fecha_original date,fecha_pactada date,
 cargo_id uuid,cuenta_intentos integer)
 language plpgsql security definer set search_path='' as $f$
begin
 if p_limit not between 1 and 20 then raise exception 'LIMITE_B2_F4_INVALIDO';end if;
 return query with locked as (
  select o.evento_id from public.goxion_b2_f4_discord_outbox o
  where (o.estado='pendiente' and o.proximo_intento<=now())
    or (o.estado='enviando' and o.bloqueado_en<now()-interval '5 minutes')
  order by o.proximo_intento,o.evento_id for update skip locked limit p_limit
 ),claimed as (
  update public.goxion_b2_f4_discord_outbox o
  set estado='enviando',bloqueado_en=now(),intentos=o.intentos+1
  from locked l where o.evento_id=l.evento_id
  returning o.evento_id,o.intentos
 )
 select e.id,e.tipo,coalesce(e.acuerdo_id,e.acuerdo_global_id),e.cliente_id,c.nombre,c.folio,
  e.fecha_original,e.fecha_pactada,e.cargo_id,cl.intentos
 from claimed cl join public.goxion_b2_f4_eventos e on e.id=cl.evento_id
 join public.clientes c on c.id=e.cliente_id;
end $f$;

revoke all on function public.goxion_b2_f4_registrar_global(text,uuid),
 public.goxion_b2_f4_global_confirmado_trigger(),
 public.goxion_b2_f4_global_pago_trigger()
 from public,anon,authenticated;
grant execute on function public.goxion_b2_f4_registrar_global(text,uuid),
 public.goxion_b2_f4_global_confirmado_trigger(),
 public.goxion_b2_f4_global_pago_trigger() to service_role;
