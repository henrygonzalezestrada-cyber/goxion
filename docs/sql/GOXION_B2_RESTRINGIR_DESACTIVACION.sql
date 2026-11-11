-- GOXION B2 · Hardening previo a unificación del motor.
-- gοxion_b2_desactivar_cliente es SECURITY DEFINER; no debe ser invocable
-- directamente desde navegador con anon/authenticated.
-- El gateway autenticado conserva acceso mediante service_role.
-- Solo cambiar permisos de ejecución; NO ejecutar desactivaciones ni cambios de datos.
revoke all on function public.goxion_b2_desactivar_cliente(uuid,boolean,text,text)
  from public, anon, authenticated;
grant execute on function public.goxion_b2_desactivar_cliente(uuid,boolean,text,text)
  to service_role;

-- Bloqueo de reutilización anónima en la capa transaccional.
-- El cambio de régimen sigue pendiente hasta que un flujo autorizado
-- pruebe tanto altas como bajas sin doble cobro.
