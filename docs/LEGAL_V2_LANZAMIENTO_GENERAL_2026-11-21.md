# GOXION · Lanzamiento oficial de restricciones legales 2.0
**Fecha:** 21 de noviembre de 2026
**Estado:** desplegado en código y Supabase; reglas generales activas. Ninguna baja automática de plataformas.

## Qué cambia desde hoy
- El rechazo de los términos impide nuevas contrataciones, promociones, beneficios, renovaciones, cancelaciones y prórrogas en los endpoints protegidos.
- El cliente **conserva la consulta de servicios ya pagados** hasta que termine la última cobertura verificada; si hay una fecha sin certeza o comprobantes previos por revisar, queda en `revision_manual` sin bloqueo total ni baja automática.
- Desde el siguiente día del último periodo pagado, si todo está conciliado, Mi Espacio se reemplaza por la pantalla restringida: `Revisar y aceptar términos`, `Cerrar sesión` y `Comprobantes y aclaraciones`.
- Admin consulta estados de clientes con rechazo, muestra bajas pendientes por separado y requiere doble confirmación de **baja interna**. La gestión de accesos externos es exclusivamente manual.
- Si el usuario acepta antes de la baja, desaparece la tarea pendiente al actualizar Admin. Si acepta después de la baja, se conserva el historial y NO se reactivan los servicios antiguos automáticamente.
- Los 30 días de validez de sesión no se cambiaron. Las operaciones en el servidor comprueban el estado en cada petición. La UI se actualiza en la decisión local, al recuperar foco y al menos cada 30 segundos mientras la pestaña esté visible.

## Estado de coberturas
Foto de datos del despliegue:
- 21 cuentas, 39 contratos/servicios activos.
- 30 contratos con todos los accesos verificados (incluye 25 fechas conciliadas y auditadas el 21 de noviembre).
- 2 contratos agrupados con `goxion_coberturas_legales_contrato` respaldadas por pagos y aprobaciones.
- 4 contratos de dos clientes, José (3) y Jeynner (1), continúan en revisión por falta de evidencia suficiente sobre la última cobertura: **no se permite baja automática de esas cuentas**.
- 3 contratos de cuentas ya suspendidas: se conserva el estado previo; no se reactivan ni se retiran accesos desde este flujo.

## Backend
- `goxion_legal_estado_acceso(uuid)`: política oficial común, basada en decisión más reciente, servicios activos, acceso individual o cobertura contractual verificada, comprobantes/prórrogas pendientes y suspensión previa.
- `goxion_legal_finalizar_servicios(uuid)`: baja transaccional confirmada exclusivamente desde Admin; verifica todas las fechas bajo bloqueo y no elimina pagos ni historial.
- `goxion_legal_bajas`: registro auditable por decisión de rechazo; conserva una baja histórica de Cliente Prueba.
- `tr_goxion_legal_serializar`: serializa decisión legal y baja interna sobre la fila del cliente.
- 18 Edge Functions activas: consentimiento, Mi Espacio, versiones antiguas, cancelaciones, accesos, credenciales, comprobantes B2, prórrogas, pedidos, opiniones, pagos, promociones y beneficios.
- Gate adicional: pagos nuevos después del rechazo se deniegan, pero se permite la conciliación de un comprobante ingresado antes de rechazar o la repetición de una operación ya aplicada.

## Frontend
- Mi Espacio: `assets/js/ayuda/22-legal-access.js`, `assets/css/goxion-legal-access.css` y `assets/js/ayuda/21-legal-v2-documents.js`; cargados desde `ayuda.html`.
- Admin: `assets/js/admin/36-admin-legal-bajas.js`, `assets/css/admin-legal-bajas.css`; cargados desde `admin.html`.
- Recursos antiguos del piloto retirados de Main; conserva únicamente código oficial en producción.

## Verificaciones realizadas
- Simulaciones SQL reversibles de rechazo (BEGIN / ROLLBACK):
  - Alondra, David, Laura, Nayeli: `rechazado_vigente`.
  - Casone: `restringido` con baja pendiente.
  - José, Jeynner: `revision_manual` sin baja pendiente.
  - Isamar: `cuenta_suspendida`, mantiene suspensión previa.
- Simulación de baja en Casone apagó internamente dos servicios y dos accesos; **ROLLBACK** restauró todos los datos al terminar.
- Comprobación posterior: 39 servicios activos, 0 rechazos vigentes, 0 bajas internas nuevas (además de la única baja histórica de Cliente Prueba).
- Comprobados permisos de SQL: `anon` y `authenticated` no pueden consultar la tabla de bajas ni ejecutar las RPC privadas.
- Las 18 Edge Functions auditadas devolvieron ACTIVE y se verificó que no contienen la limitación al UUID de Cliente Prueba.
- Sintaxis JavaScript, CSS y referencias de ambos HTML verificadas.

## Límites de la validación
No se ha realizado en este despliegue un recorrido de navegador con una sesión real de cada cliente ni una prueba de recepción de notificaciones administrativas con credenciales reales; las rutas funcionales fueron probadas anteriormente con Cliente Prueba. Las fechas que se modifiquen después deben permanecer sincronizadas al aprobar nuevos pagos. La política utiliza `revision_manual` como protección cuando detecta una fecha sin verificar o una discrepancia entre la cobertura y el periodo pendiente.

## Fuente y recuperación
SQL oficial: `docs/backend/legal-v2-general-policy.sql`.
Código Edge: `docs/backend/legal-v2-official/`.
Ningún término 2.0 ni su SHA fueron alterados. No se redujo la duración del token.
