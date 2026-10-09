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

Tras la promoción de producción, `ayuda.html`, `admin.html` e `index.html` incluyen el núcleo Realtime y su adaptador correspondiente. La bandeja premium (CSS + JavaScript) solo se carga en Ayuda. Las rutas `preview/realtime/` se conservan para pruebas controladas; nunca son el destino del cliente oficial.

## Criterio para promover a producción

1. Prueba manual en iPhone.
2. Integridad del repositorio.
3. Sin regresión visual por eventos.
4. Reconnect/resync después de suspender Safari.
5. Actualización modular correcta en Mi Espacio, Estado de cuenta y Admin.
6. Integración a oficiales en un PR separado, después de pasar verificaciones del release.

## Cierre de beta y protección de regresiones (octubre 2026)

La promoción a producción **no** se realiza desde un preview ni copiando todo el HTML de la beta. El PR de lanzamiento agrega únicamente los adaptadores/estilos aprobados a los HTML oficiales, respeta sus rutas locales y actualiza el contrato de `scripts/verify-integrity.mjs` para exigirlos de manera explícita. La beta se conserva como entorno de verificación.

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

## Verificación posdespliegue

- Abrir Ayuda, Admin e Index oficiales y revisar que no aparezcan errores JavaScript.
- Comprobar campana, bandeja, confirmaciones, swipe y bloqueo de desplazamiento en iPhone.
- Probar conexión Realtime, renovación después de suspender Safari y recuperación de sesión.
- Verificar eventos de registro, pedido, pago, acceso y beneficio con cuentas de ensayo autorizadas, sin datos destructivos de clientes.
- Confirmar que ni el catálogo ni las tarjetas abiertas se reconstruyen ante eventos ajenos.
- Ante cualquier regresión, revertir exclusivamente el PR de promoción; no borrar migraciones ni notificaciones reales.
