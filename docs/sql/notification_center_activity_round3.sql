-- GOXION Notification Center · activity round 3
-- Applied to production Supabase on 2026-10-08.

create or replace function public.goxion_notify_referral_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old_months int := least(3,greatest(0,coalesce(old.meses_override,old.meses,0)));
  v_new_months int := least(3,greatest(0,coalesce(new.meses_override,new.meses,0)));
  v_old_services int := greatest(coalesce(cardinality(old.servicios),0),coalesce(old.plataformas,0));
  v_new_services int := greatest(coalesce(cardinality(new.servicios),0),coalesce(new.plataformas,0));
  v_old_ready boolean; v_new_ready boolean; v_key text; v_title text; v_message text;
begin
  if new.activo is not true then return new; end if;
  v_old_ready := old.activo is true and v_old_services>=2 and v_old_months>=3 and old.beneficio_reclamado is not true;
  v_new_ready := new.activo is true and v_new_services>=2 and v_new_months>=3 and new.beneficio_reclamado is not true;

  if not v_old_ready and v_new_ready then
    v_key := 'referido:'||new.id::text||':ready';
    v_title := '¡Mes gratis disponible!';
    v_message := 'Tu referido '||coalesce(nullif(trim(new.nombre),''),'activo')||' completó los requisitos. Ya puedes revisar y reclamar tu beneficio.';
  elsif v_new_months > v_old_months then
    v_key := 'referido:'||new.id::text||':mes:'||v_new_months::text;
    v_title := 'Tu referido avanzó';
    v_message := coalesce(nullif(trim(new.nombre),''),'Tu referido')||' llegó a '||v_new_months::text||'/3 meses de progreso.';
  else return new;
  end if;

  insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
  select new.cliente_id,
         case when v_new_ready then 'referido_listo' else 'referido_progreso' end,
         v_title,v_message,new.id::text,case when v_new_ready then 3 else 1 end,v_key
  where not exists(select 1 from public.cliente_notificaciones where cliente_id=new.cliente_id and dedupe_key=v_key);
  return new;
end $$;

drop trigger if exists gx_notify_referral_progress on public.referidos;
create trigger gx_notify_referral_progress
after update of meses,meses_override,servicios,plataformas,activo,beneficio_reclamado on public.referidos
for each row execute function public.goxion_notify_referral_progress();

create or replace function public.goxion_notify_mission_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_active boolean; v_tasks text; v_version int; v_lines text[];
  v_total int:=0; v_done int:=0; v_label text; v_key text;
begin
  if lower(coalesce(new.origen,''))='migracion_local' then return new; end if;
  select g.misiones_activas,g.tareas,g.misiones_version into v_active,v_tasks,v_version
  from public.gamificacion g where g.cliente_id=new.cliente_id limit 1;
  if v_active is not true or coalesce(v_version,0)<>new.misiones_version then return new; end if;

  select array_agg(trim(t.line) order by t.ord) into v_lines
  from regexp_split_to_table(coalesce(v_tasks,''),E'\r?\n') with ordinality as t(line,ord)
  where trim(t.line)<>'';

  v_total:=coalesce(cardinality(v_lines),0);
  if v_total<=0 or new.mision_index<0 or new.mision_index>=v_total then return new; end if;
  v_label:=regexp_replace(v_lines[new.mision_index+1],'\s*\[[^]]+\]\s*$','','g');

  select count(distinct p.mision_index)::int into v_done
  from public.cliente_misiones_progreso p
  where p.cliente_id=new.cliente_id and p.misiones_version=new.misiones_version;

  if v_done>=v_total then
    v_key:='cupon-misiones:'||new.cliente_id::text||':v'||new.misiones_version::text;
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    select new.cliente_id,'cupon_disponible','¡Cupón disponible!',
           'Completaste todas tus misiones. Tu recompensa ya está lista para revisar.',
           new.misiones_version::text,3,v_key
    where not exists(select 1 from public.cliente_notificaciones where cliente_id=new.cliente_id and dedupe_key=v_key);
  else
    v_key:='mision:'||new.id::text;
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    select new.cliente_id,'mision_completada','Misión completada',
           coalesce(nullif(trim(v_label),''),'Una misión')||' · '||v_done::text||'/'||v_total::text||' completadas.',
           new.id::text,1,v_key
    where not exists(select 1 from public.cliente_notificaciones where cliente_id=new.cliente_id and dedupe_key=v_key);
  end if;
  return new;
end $$;

drop trigger if exists gx_notify_mission_progress on public.cliente_misiones_progreso;
create trigger gx_notify_mission_progress after insert on public.cliente_misiones_progreso
for each row execute function public.goxion_notify_mission_progress();

create or replace function public.goxion_notify_payment_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_key text; v_message text; v_stamp text;
begin
  v_stamp:=coalesce(
    to_char(new.pago_revision_updated_at at time zone 'UTC','YYYYMMDDHH24MISSMS'),
    to_char(clock_timestamp() at time zone 'UTC','YYYYMMDDHH24MISSMS')
  );

  if new.pago_en_revision is true
     and (old.pago_en_revision is not true or lower(coalesce(old.pago_revision_estado,''))<>'revision')
     and lower(coalesce(new.pago_revision_estado,''))='revision' then
    v_key:='pago-reporte:'||new.id::text||':'||v_stamp;
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    values(new.id,'pago_reportado','Reporte de pago recibido',
           'Recibimos tu comprobante. Lo estamos validando y te avisaremos cuando termine la revisión.',
           new.periodo_pendiente::text,2,v_key);
  end if;

  if lower(coalesce(new.pago_revision_estado,''))='incompleto'
     and lower(coalesce(old.pago_revision_estado,''))<>'incompleto' then
    v_key:='pago-incompleto:'||new.id::text||':'||v_stamp;
    v_message:=case when coalesce(new.pago_revision_monto_faltante,0)>0
      then 'Revisamos tu pago y todavía resta $'||trim(to_char(new.pago_revision_monto_faltante,'FM999999990.00'))||' por cubrir.'
      else 'Revisamos tu pago y encontramos una diferencia pendiente. Consulta tu estado de cuenta.' end;
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    values(new.id,'pago_incompleto','Tu pago requiere atención',v_message,new.periodo_pendiente::text,3,v_key);
  end if;
  return new;
end $$;

drop trigger if exists gx_notify_payment_review on public.clientes;
create trigger gx_notify_payment_review
after update of pago_en_revision,pago_revision_estado,pago_revision_monto_faltante,pago_revision_updated_at on public.clientes
for each row execute function public.goxion_notify_payment_review();

create or replace function public.goxion_notify_order_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ref text; v_key text;
begin
  if new.cliente_id is null or lower(coalesce(new.tipo,''))<>'pedidos' then return new; end if;
  v_ref:=coalesce(nullif(trim(new.referencia),''),new.id::text);

  if TG_OP='INSERT' then
    v_key:='pedido:'||v_ref||':recibido';
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    select new.cliente_id,'pedido_recibido','Solicitud recibida',
           'Recibimos tu solicitud de contratación. Te avisaremos conforme avance.',v_ref,2,v_key
    where not exists(select 1 from public.cliente_notificaciones where cliente_id=new.cliente_id and dedupe_key=v_key);
  elsif TG_OP='UPDATE' and old.leida is false and new.leida is true then
    v_key:='pedido:'||v_ref||':revision';
    insert into public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
    select new.cliente_id,'pedido_revision','Estamos revisando tu solicitud',
           'Tu solicitud ya fue tomada por el equipo. El siguiente aviso llegará cuando haya una novedad en tus servicios o accesos.',
           v_ref,1,v_key
    where not exists(select 1 from public.cliente_notificaciones where cliente_id=new.cliente_id and dedupe_key=v_key);
  end if;
  return new;
end $$;

drop trigger if exists gx_notify_order_activity on public.notificaciones_admin;
create trigger gx_notify_order_activity after insert or update of leida on public.notificaciones_admin
for each row execute function public.goxion_notify_order_activity();

create or replace function public.goxion_cliente_acceso_novedad_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old_ready boolean:=false; v_new_ready boolean:=false;
  v_title text; v_summary text; v_tipo text:='acceso'; v_changes text[]:=array[]::text[];
begin
  if new.activo is not true then return new; end if;

  if TG_OP='UPDATE' then
    v_old_ready:=old.activo is true and (
      old.cuenta_id is not null or nullif(trim(coalesce(old.correo_override,'')),'') is not null or
      nullif(trim(coalesce(old.perfil_nombre,'')),'') is not null or nullif(trim(coalesce(old.perfil_pin,'')),'') is not null
    );
  end if;

  v_new_ready:=new.activo is true and (
    new.cuenta_id is not null or nullif(trim(coalesce(new.correo_override,'')),'') is not null or
    nullif(trim(coalesce(new.perfil_nombre,'')),'') is not null or nullif(trim(coalesce(new.perfil_pin,'')),'') is not null
  );
  if not v_new_ready then return new; end if;

  if TG_OP='INSERT' or not v_old_ready then
    v_title:='Tu acceso está listo'; v_summary:='Ya puedes revisar los datos de acceso de este servicio.'; v_tipo:='acceso';
  else
    if new.correo_override is distinct from old.correo_override then v_changes:=array_append(v_changes,'Correo'); end if;
    if new.perfil_nombre is distinct from old.perfil_nombre then v_changes:=array_append(v_changes,'Perfil'); end if;
    if new.perfil_pin is distinct from old.perfil_pin then v_changes:=array_append(v_changes,'PIN'); end if;
    if new.cuenta_id is distinct from old.cuenta_id then v_changes:=array_append(v_changes,'Cuenta'); end if;
    if coalesce(array_length(v_changes,1),0)=0 then return new; end if;

    if array_length(v_changes,1)=1 then
      case v_changes[1]
        when 'Correo' then v_tipo:='correo'; v_title:='Correo actualizado'; v_summary:='Revisa tu correo de acceso.';
        when 'Perfil' then v_tipo:='perfil'; v_title:='Perfil actualizado'; v_summary:='Revisa tu perfil asignado.';
        when 'PIN' then v_tipo:='pin'; v_title:='PIN actualizado'; v_summary:='Revisa tu PIN de perfil.';
        else v_tipo:='acceso'; v_title:='Acceso actualizado'; v_summary:='Revisa tus datos de acceso.';
      end case;
    else
      v_title:='Accesos actualizados'; v_summary:=array_to_string(v_changes,' · ');
    end if;
  end if;

  if exists(
    select 1 from public.cliente_servicio_novedades n
    where n.cliente_id=new.cliente_id and n.cliente_servicio_id=new.cliente_servicio_id
      and n.titulo=v_title and n.created_at>now()-interval '5 seconds'
  ) then return new; end if;

  insert into public.cliente_servicio_novedades(cliente_id,cliente_servicio_id,tipo,titulo,resumen,prioridad,expira_at)
  values(new.cliente_id,new.cliente_servicio_id,v_tipo,v_title,v_summary,
         case when v_title='Tu acceso está listo' then 3 else 2 end,now()+interval '14 days');
  return new;
end $$;

drop trigger if exists gx_notify_cliente_acceso on public.cliente_accesos;
create trigger gx_notify_cliente_acceso
after insert or update of cuenta_id,correo_override,perfil_nombre,perfil_pin,activo on public.cliente_accesos
for each row execute function public.goxion_cliente_acceso_novedad_trigger();

revoke execute on function public.goxion_notify_referral_progress() from public,anon,authenticated;
revoke execute on function public.goxion_notify_mission_progress() from public,anon,authenticated;
revoke execute on function public.goxion_notify_payment_review() from public,anon,authenticated;
revoke execute on function public.goxion_notify_order_activity() from public,anon,authenticated;
revoke execute on function public.goxion_cliente_acceso_novedad_trigger() from public,anon,authenticated;
