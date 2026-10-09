# GOXION Realtime

## Objetivo

Realtime funciona como una capa de invalidación sobre la arquitectura oficial de GOXION. Los eventos no sustituyen la lógica de negocio ni transportan datos privados. Cuando llega un evento, la superficie afectada vuelve a consultar su endpoint autenticado y actualiza únicamente el módulo necesario.

## Alcance actual

### Mi Espacio / Ayuda
- Estado de cuenta: `account_state`
- Misiones y cupón: `rewards`
- Referidos: `referrals`
- Datos y estado del cliente: `client_state`
- Accesos y perfiles: `client_access`
- Cancelaciones: `cancellations`
- Bandeja de notificaciones: `client_notifications`

La bandeja combina:
- notificaciones generales de cuenta (`cliente_notificaciones`)
- novedades de servicio no sensibles (`cliente_servicio_novedades`)

### Admin
- Registros nuevos: `registrations`
- Actividad / pedidos / pagos reportados / soporte: `admin_activity`
- Cancelaciones: `cancellations`
- Estado financiero: `account_state`
- Cliente / accesos / rewards / referidos para mantener el modelo operativo sincronizado.

Admin no ejecuta `inicializarPanel()` en cada evento. Utiliza `goxionReloadAdminModel()` y refresca las vistas operativas existentes.

### Index / Estado de cuenta
- `account_state`
- `client_state`
- `resync` al recuperar una conexión.

## Fuera de alcance

Catálogo, promociones e inventario **no se actualizan en Realtime**. Su disponibilidad se valida por los flujos oficiales al entrar o realizar acciones. Esta exclusión es intencional para no reconstruir tarjetas ni alterar el estado visual del catálogo.

## Canal

Broadcast público de invalidación:

`goxion:live`

Los mensajes contienen únicamente metadatos de invalidación:
- scope
- tabla
- operación
- timestamp

No incluyen nombre, importe, credenciales, PIN, mensajes privados ni estado financiero.

## Seguridad

GOXION conserva su autenticación propia mediante:
- `X-Client-Token`
- `X-Admin-Token`

Realtime solo avisa. Las respuestas con información privada siguen requiriendo los endpoints autenticados existentes.

`cliente_notificaciones` tiene RLS habilitado y no está expuesto directamente a `anon` ni `authenticated`; el acceso del cliente se realiza mediante la Edge Function `notificaciones-cliente`.

## Previews

Durante validación, únicamente las páginas bajo `preview/realtime/` cargan los adaptadores Realtime. `admin.html`, `ayuda.html` e `index.html` oficiales permanecen sin estos scripts hasta la aprobación final.

## Criterio para promover a producción

1. Prueba manual en iPhone.
2. Integridad del repositorio.
3. Sin regresión visual por eventos.
4. Reconnect/resync después de suspender Safari.
5. Actualización modular correcta en Mi Espacio, Estado de cuenta y Admin.
6. Integración a oficiales en un PR separado.

## Cierre de beta y protección de regresiones (octubre 2026)

La promoción a producción **no** se realiza desde un preview ni copiando todo el HTML de la beta. Solo se agregan a `ayuda.html`, `admin.html` e `index.html` los adaptadores/estilos aprobados con sus rutas relativas correctas. La regla de `scripts/verify-integrity.mjs` que hoy prohíbe Realtime en oficiales deberá actualizarse **en el mismo PR de producción**; hasta entonces funciona como barrera contra un despliegue prematuro.

Suite adicional: `npm run test:realtime`. Usa Chromium, WebKit, una fixture independiente y respuestas simuladas (no escribe datos en Supabase). Comprueba:
- confirmación en dos toques, resultado y estado final de la bandeja;
- separación de clientes ante respuestas tardías, además del borrado inmediato de UI al cambiar de sesión;
- invalidaciones concurrentes, `resync` y vuelta de Safari a primer plano;
- contratos entre adaptadores de Ayuda, Admin e Index sin reconstruir el catálogo;
- salida de sesión sin conservar avisos ajenos.

La suite aislada **no sustituye** una prueba funcional con cuentas de ensayo en las páginas completas. Antes del PR oficial hay que validar los eventos reales (registro, pedido, pago, acceso, beneficio) desde Admin ↔ Ayuda ↔ Index, suspensión de Safari, sesión expirada, desconexión y protección del estado visual. Las pruebas generales de navegador y carrito deben revisarse por separado cuando fallen, sin desactivar comprobaciones para hacer verde el CI.



### Centro de actividad

La bandeja del cliente funciona como un centro de actividad contextual. Además de pagos, beneficios y cancelaciones, genera avisos automáticos para:

- avance de referidos y beneficio listo;
- misión completada y cupón disponible;
- reporte de pago recibido y diferencias pendientes;
- pedido recibido y pedido tomado por Administración;
- acceso de servicio listo o actualizado.

Cada notificación puede declarar una acción contextual sin transportar datos sensibles en Broadcast:

- `account` → Estado de cuenta;
- `referral` → Referidos;
- `coupon` → Misiones / Rewards;
- `service` → servicio concreto;
- `services` → bloque de servicios.

La acción se resuelve después de consultar `notificaciones-cliente` con `X-Client-Token`. Realtime sigue enviando únicamente invalidaciones.
