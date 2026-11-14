# Restauración · hacer efectiva cancelación / Admin, 14-nov-2026 UTC

## Versiones antes del cambio
- Edge `cancelaciones-admin`: **v2**, código de producción capturado del despliegue antes de crear el archivo `docs/edge/cancelaciones-admin/index.ts`. Seguridad de sesión HMAC y `verify_jwt=false` se mantienen.
- Admin: `assets/js/admin/20-admin-security-controller.js`, `admin.html` de `main` antes del PR.
- SQL: no existía `public.goxion_hacer_efectiva_cancelacion_admin_v1(uuid,text)` en producción.
- Se verificó: 3 solicitudes efectivas con servicio `activo=false`, y 1 aprobada aún activa. No se tocó la solicitud pendiente del Cliente Prueba.

## Revertir código (solo si no existen transacciones nuevas pendientes)
1. Primero inspeccionar las cancelaciones efectivas posteriores al despliegue y comprobar la contabilidad: NO revertir contratos inactivos o solicitudes efectivas editando pagos ni borrando auditoría.
2. Restaurar la Edge anterior v2 con HMAC y `verify_jwt=false`, asegurando que no quede un segundo escritor efectivo. Precaución: la Edge antigua hace dos UPDATE separados y es menos segura; restaurarla solo como medida extraordinaria.
3. Restaurar `admin.html` y `assets/js/admin/20-admin-security-controller.js` a la revisión previa.
4. Si ya no existen consumidores, ejecutar `REVOKE ALL ON FUNCTION public.goxion_hacer_efectiva_cancelacion_admin_v1(uuid,text) FROM service_role;` y finalmente `DROP FUNCTION ...` en una migración documentada, después de verificar todas las dependencias.
5. Comprobar que recibos, pagos, regímenes, cargos y calendarios son idénticos al snapshot legítimo más reciente, excepto operaciones autorizadas posteriores.
6. Para reactivar un servicio legítimamente cancelado, usar un NUEVO contrato/alta con vigencia. Nunca marcar `pagos` como no pagados ni eliminar el historial.

## Pruebas de regresión
`supabase/tests/20261114_cancelacion_efectiva_atomica_reversible.sql` requiere el resto de migraciones productivas, ejecuta en BEGIN/ROLLBACK y valida cancelación con servicios múltiples, último servicio, aprobación e idempotencia. En el entorno aislado también se verificó conversión B2 desde dos fechas con cargos proyectados, sin escribir pagos.

## Límite
Este cambio no automatiza la cancelación futura con dinero ya comprometido; la RPC debe devolver 409 y el operador programar conciliación. Tampoco hace efectiva ninguna solicitud antigua automáticamente.
