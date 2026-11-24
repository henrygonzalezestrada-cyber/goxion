-- Aviso interno en el mismo INSERT del reporte. No genera cobros ni compensaciones.
create or replace function public.goxion_aviso_trato_justo()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
 v_nombre text;
 v_folio text;
 v_motivo text;
begin
 select c.nombre,c.folio into v_nombre,v_folio from public.clientes c where c.id=new.cliente_id;
 v_motivo:=case new.motivo when 'interrumpido' then 'Servicio interrumpido' when 'frecuente' then 'Fallas frecuentes' when 'sin_acceso' then 'Sin acceso a la plataforma' else 'Otra afectación' end;
 insert into public.notificaciones_admin (id,cliente_id,cliente_nombre,tipo,titulo,mensaje,referencia,leida)
 values (new.id,new.cliente_id,v_nombre,'soporte','Trato justo · Reporte de fallo',
 concat('Cliente: ',coalesce(v_nombre,'Cliente'),' · GOXION ID: ',coalesce(v_folio,'No disponible'),E'\nPlataforma: ',new.plataforma,E'\nAfectación: ',v_motivo,E'\nDesde: ',to_char(new.afectacion_desde,'DD/MM/YYYY'),E'\nPendiente de revisión. Referencia: ',new.id::text),
 'trato-justo:'||new.id::text,false);
 return new;
end $$;
revoke execute on function public.goxion_aviso_trato_justo() from public,anon,authenticated;
grant execute on function public.goxion_aviso_trato_justo() to service_role;
drop trigger if exists gx_aviso_trato_justo on public.goxion_reportes_trato_justo;
create trigger gx_aviso_trato_justo after insert on public.goxion_reportes_trato_justo for each row execute function public.goxion_aviso_trato_justo();