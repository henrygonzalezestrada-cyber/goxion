-- Endurecimiento de auditoría B2: no exponer el trigger SECURITY DEFINER.
-- Solo privilegios; no cambia ni elimina datos, funciones ni disparadores.
revoke all on function public.goxion_auditar_b2_sombra() from PUBLIC, anon, authenticated;
grant execute on function public.goxion_auditar_b2_sombra() to service_role;