# GOXION · Centro de Comunicaciones Inteligentes

> **Regla de integración:** consultar primero [el registro canónico de funciones de GOXION](ADMIN_FUNCTION_REGISTRY.md). Comunicaciones no administra promociones, descuentos, misiones ni incidencias: consume datos de los módulos propietarios. La beta actual puede mostrar opciones redundantes y es solo un laboratorio no aprobado para el Admin oficial.

Estado: **beta de simulación**, 2026-10-09. No altera `admin.html` ni envía notificaciones.

## Recursos de esta entrega

- `preview/comunicaciones/index.html`: interfaz responsiva y protegida por sesión administrativa. Borrador local y preview personalizado, filtros combinados, lista exacta de destinatarios y exclusión individual.
- Edge Function `comunicaciones-admin-preview`: consulta de solo lectura con firma HMAC `X-Admin-Token`; no admite acciones de envío.
- La fuente de clientes es Supabase (servicios asignados activos, progreso de misiones de versión vigente, día de pago, promociones activas y fallas).

## Segmentación disponible en beta

- Por misiones: pendientes, solo una, ninguna completada, todas completadas.
- Por plataforma: tiene / no tiene un servicio específico.
- Por cobro: hoy, 3, 7 o 15 días.
- Por antigüedad: alta en 7, 30 o 90 días.
- Por estado: pagado, pendiente y vencido (sin suspendidos).
- Combinación de filtros con lógica AND y exclusiones individuales.

Exclusiones incondicionales: suspendidos, sin servicio activo y cuentas de prueba. La beta propone públicos; **no ejecuta la comprobación específica de elegibilidad contractual de ofertas o promociones**.

## Categorías de campañas

Misiones; descuentos y beneficios; ofertas/promociones; incidencias/mantenimiento; recordatorios de pago; comunicados generales.

Variables en preview: `{nombre}`, `{pendientes}`, `{hechas}`, `{total}`, `{servicios}`, `{fecha}`, `{dias_cobro}`.

## Requisitos obligatorios antes de habilitar el envío

1. Endpoint `comunicaciones-admin` separado de beta, autenticado con `X-Admin-Token`. El servidor debe calcular siempre el público de nuevo y validar las plantillas; **nunca confiar en la lista de IDs enviada por el navegador**.
2. Persistencia de campañas (borrador, aprobada, programada, enviando, finalizada, cancelada) con bitácora inmutable de cada destinatario.
3. Confirmación doble con token de previsualización de validez corta: mostrar alcance y cantidad exacta antes de autorizar una operación masiva.
4. Envío con deduplicación: `dedupe_key` único por destinatario y campaña; transacciones idempotentes; reintentos parciales seguros.
5. Límites de frecuencia y prioridad por tipo: seguridad/fallas críticas antes que promoción; máximo razonable de marketing; consentimiento y preferencias de comunicación.
6. Reevaluación de reglas al momento del envío programado. Quien completó una misión o perdió elegibilidad de servicio no debe recibir un recordatorio obsoleto.
7. Promociones: validar audiencia real, vigencia, disponibilidad de stock, contrataciones actuales y restricciones de acumulación/descuento. No prometer un descuento no elegible.
8. Alertas de fallas: relacionar explícitamente la incidencia con IDs de servicios; nunca inferir destinos únicamente por similitud textual.
9. Navegación contextual en `notificaciones-cliente`: misiones/recompensas, promociones/catálogo, estado de cuenta, soporte. Sin exponer datos personales en Broadcast.
10. Programación transaccional (Supabase Cron o función programada) con hora local `America/Merida`; fecha de cierre real de las misiones configurada en la lógica de premios, no solo en los textos.
11. Historial de alcance, notificaciones generadas/leídas y métricas de conversión cuando existan eventos verificables; no confundir "insertada en BD" con "vista por cliente".
12. Pruebas de beta con cuentas de ensayo, clientes suspendidos, servicios que cambian entre previsualización y envío, y campañas repetidas.

## Estrategia sugerida para misiones al 20/oct/2026

- Aviso inicial del 9 de octubre ya realizado fuera de este módulo.
- Revisión diaria de completados. Programar recordatorios para 16 y 19/oct, condicionados a `misiones_pendientes > 0`.
- Después del cierre, no enviar recordatorios pendientes. La caducidad de misión requiere regla real en backend.

## Promoción a oficial

La beta sigue separada de `admin.html`. Una vez aprobada: integrar botón/sección «Comunicaciones» en la navegación administrativa, desplegar API de envío controlado, activar la bitácora y ejecutar smoke tests. El HTML oficial y el centro de notificaciones de clientes no deben reemplazarse.

## Beta de detonaciones 2.0 · 10/oct/2026

Implementación **aislada en `preview/comunicaciones/index.html`**: no añade pestaña a Admin, no modifica otros módulos, no guarda reglas en Supabase ni escribe notificaciones.

- La Edge Function `comunicaciones-admin-preview` **v5**, autenticada por sesión Admin HMAC, admite exclusivamente `accion:resumen` (solo lectura) y una fecha opcional `fecha_simulacion` validada desde hoy hasta 92 días. Cualquier acción de envío es rechazada.
- La fecha de corte y los días próximos al pago provienen ahora de `goxion_estado_financiero(p_cliente_id,p_hoy)`; no se usa la aproximación `dia_pago` del prototipo. Los estados financieros no verificables quedan fuera del filtro de cobro.
- Mapa de detonadores ya existentes: pago acreditado, revisión, misiones, beneficio, referido, cancelaciones, accesos. Están marcados como **automáticos**, y el prototipo NO los duplica.
- Nuevas detonaciones en modo simulación: recordatorio de misiones, próximo cobro, anuncio de una promoción seleccionada en Promotions Studio; no están programadas ni activadas.
- Incidencias aparecen únicamente como conexión de origen, no como un segundo editor o plantilla. **Falta relacionar alertas con IDs de servicios** antes de enviar avisos segmentados.
- Deduplicación exploratoria: el escenario «Repetir aviso inicial» identifica `misiones:FECHA:aviso-inicial` por cliente y lo excluye. **No sustituye** una futura llave única y transaccional por campaña y destinatario.
- Promociones: selección de un objeto real con su campo `notificar_cliente`, que es solo metadato. La audiencia es orientativa hasta invocar las reglas de elegibilidad por cliente desde servidor. No se habilita envío.
- Regla de misiones: la fecha ingresada sirve para visualizar mensajes, no significa que se haya implementado una caducidad efectiva.
- El historial de la beta es una muestra de avisos existentes; **no es** bitácora de campañas.

### Pruebas

`npm run test:comunicaciones` ejecuta un smoke de entorno ficticio sin sesiones ni clientes reales. Comprueba ausencia de control de envío activo, exclusión sin login, lectura por `accion:resumen`, estado de automatismos, deduplicación de aviso inicial, fechas oficiales y selección de promoción sin duplicar editor. Complementar antes de producción con smoke autenticado de la Edge, UI real en iOS/WebKit y escenarios financieros.

En consulta SQL de solo lectura se comprobó que el motor financiero respondió a todos los clientes no suspendidos evaluados durante la revisión. **No se hicieron envíos ni se cambiaron beneficios, cobros, promociones o cuentas.**

### Pendiente para una versión productiva

Emisión autorizada con auditoría e idempotencia, registro de campañas/programación, revalidación de destinatarios y elegibilidad comercial, enlaces confiables de incidencias, límites de frecuencia y pruebas end-to-end autenticadas. No implementar nuevas fuentes paralelas.

