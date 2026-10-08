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
