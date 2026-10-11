# GOXION · Centro de Comunicaciones Inteligentes

> **Regla de integración:** consultar primero [el registro canónico de funciones de GOXION](ADMIN_FUNCTION_REGISTRY.md). Comunicaciones no administra promociones, descuentos, misiones ni incidencias: consume datos de los módulos propietarios. La interfaz oficial solo reutiliza los módulos propietarios.

Estado: **integrada en Admin oficial**, 2026-10-11. Las secciones antiguas siguientes son antecedentes históricos de la beta.

## Integración oficial · 11 de octubre de 2026

**Vigente:** Admin → Gestión → Experiencia → Comunicaciones, con interfaz en comunicaciones.html. El enlace anterior de la beta redirige a la pantalla oficial; la versión previa solo permanece archivada para regresión.

**Motor único:** Edge Function comunicaciones-admin-preview (nombre técnico heredado). Acciones autenticadas: resumen, validar_plan, enviar, programar, cancelar_programada e historial. Fuente desplegada versionada en docs/edge/comunicaciones-admin-preview.ts.

- Selecciona el motivo, destinatarios sugeridos, exclusiones/adiciones manuales y mensaje. Al enviar, el servidor recalcula elegibilidad y requiere confirmación explícita del alcance.
- SQL transaccional goxion_comunicaciones_emitir registra campaña, entregas y avisos de Mi Espacio; clave única y candados por cliente evitan duplicados, con límites de frecuencia de 20 horas para recordatorios y 72 horas para anuncios comerciales.
- Las campañas programadas están en goxion_comunicacion_agenda. pg_cron ejecuta goxion_comunicaciones_procesar_agenda cada 15 minutos, reevalúa destinatarios, aplica un máximo de tres intentos y permite cancelar antes de emitir.
- Las nuevas tablas mantienen RLS sin acceso directo para anon/authenticated; permisos de emisión reservados al servidor. El código SQL está en docs/sql/comunicaciones_oficial.sql.
- Los avisos usan la campana actual: Misiones abre Recompensas, Cobro abre Estado de cuenta y Promoción abre Catálogo. No son push, correo ni WhatsApp.
- La fecha mencionada en un recordatorio no establece la caducidad real de las misiones; esa regla permanece en el módulo propietario.

**Verificación:** cuatro suites de simulación aprobadas, trabajo cron activo, ejecución vacía del planificador correcta, permisos y RLS comprobados. No se enviaron avisos a clientes durante la instalación. **Pendiente:** prueba manual de interfaz y sesión autenticada en iPhone antes del primer envío real.

---
## Interfaz histórica · Beta intuitiva (10/oct/2026)

**Esta sección prevalece sobre las descripciones históricas de la beta de segmentación que aparecen más abajo.** Se conservan las fuentes/contratos de Supabase, pero la interfaz de `preview/comunicaciones/index.html` se simplificó: cuatro motivos — **Misiones, Próximo cobro, Promociones y Comunicado** — con audiencia calculada automáticamente, mensaje predeterminado y vista previa personalizada. La personalización del texto y la lista de destinatarios están ocultas en desplegables opcionales. Los automatismos ya activos solo aparecen en un resumen informativo; no son configurables desde Comunicaciones.

- **Misiones:** solo clientes con misiones activas pendientes; muestra cuántos ya recibieron avisos previos. Una nueva campaña debe tener idempotencia propia; esto no envía.
- **Cobro:** próximos 7 días, cuentas no pagadas y fecha validada por el motor financiero; no se vuelve a calcular monto o vencimiento.
- **Promociones:** selección directa de promociones publicadas desde Studio; el listado es de **candidatos preliminares**, nunca clientes contractualmente elegibles hasta validar en backend.
- **Comunicado:** clientes activos devueltos por el endpoint, ya excluidos los suspendidos, cuentas prueba y sin servicios.
- No existe selector ni formulario duplicado de fallas, cupones o recompensas. La integración futura de incidencias exige una relación estable con el ID del servicio antes de notificar afectados.
- Sin fecha manual, filtro cruzado o constructor largo en la vista principal. El usuario elige el motivo y GOXION compone el resto.
- Solo `accion:resumen` en `comunicaciones-admin-preview`; no se guarda ni se envía ninguna campaña, y el botón de envío está deshabilitado.
- Smoke actualizado: `npm run test:comunicaciones` con escenarios de inicio de sesión, misiones, pagos, promociones, vista previa y protección contra escrituras.


### Selección de destinatarios ajustable · Beta (10/oct/2026)

En «Editar destinatarios» la lista empieza con **los clientes sugeridos por GOXION**. El operador puede quitar clientes individualmente, buscarlos por nombre (sin distinguir acentos), reincorporarlos, agregar los permitidos por el motivo y restablecer los sugeridos. El contador y la vista previa se actualizan al instante. Las modificaciones se mantienen **por motivo y promoción** dentro de la sesión visual de la beta, no se escriben en Supabase.

- Misiones: agregar solo cuando hay misiones activas pendientes; no incluir quienes ya completaron todas.
- Próximo cobro: sugerencia por corte oficial dentro de 7 días, pero permitir agregar manualmente clientes con fecha oficial futura y pago no cubierto, aunque queden más de 7 días; nunca personas ya pagadas o con corte no verificable.
- Promociones: únicamente clientes en el conjunto activo devuelto por el servidor, con promoción publicada seleccionada; siguen siendo **candidatos preliminares**, no elegibles comercialmente validados.
- Comunicado: clientes activos autorizados devueltos por servidor; suspensión/cuenta de prueba/sin servicios siguen excluidos.
- En una futura emisión, la API **no confiará en el array de destinatarios del navegador**: debe revalidar servidor y registrar inclusiones/exclusiones autorizadas, idempotencia y auditoría.

Prueba automatizada ampliada: quitar, reincorporar, búsqueda insensible a acentos, añadir cobro futuro, bloquear cliente pagado o misión terminada, aislar selección por motivo, restablecer y confirmar modo solo lectura.



## Auditoría de robustez de la beta · octubre 2026

**Dictamen:** APTA para continuar en beta de solo lectura; NO apta todavía para envíos reales.

### Simulaciones reproducibles

Pruebas en `scripts/comunicaciones-beta-smoke.mjs` y `scripts/comunicaciones-resilience-smoke.mjs`, ejecutadas contra la interfaz exacta de la beta con datos sintéticos:

| Escenario | Resultado |
| --- | --- |
| 0 clientes y 0 promociones | Correcto: 0 destinatarios en todos los motivos |
| Dos clientes con el mismo nombre | Se distinguen por ID; excluir uno no excluye el otro |
| Texto hostil/HTML en nombres y títulos | Nombres escapados, vistas previas con `textContent`, sin HTML ejecutado |
| Cobro pagado, no verificable o vencido | No se puede agregar al público de cobro futuro |
| Cobro futuro mayor a 7 días, agregado a mano | Admitido con fecha verificada, mensaje adaptado |
| Hoy, mañana y 30 días antes del corte | Mensajes gramaticalmente correctos |
| Quitar/reagregar y restablecer personas | Correcto; selección independiente por motivo |
| 1,200 clientes sintéticos | Contador y operaciones de lista correctos; **no es prueba real de carga móvil** |
| Token borrado o API 401 | La lista se oculta y se limpia del DOM; requiere inicio de sesión |
| Error de red | Muestra error y elimina el roster antiguo, no presenta datos obsoletos |
| Dos actualizaciones respondidas al revés | Ignora respuesta antigua; prevalece última solicitud |
| Promoción que desaparece después de seleccionarla | Candidatos pasan a cero; no conserva una selección inexistente |
| Actualización de cliente recién pagado | Se retira de la selección de cobro al refrescar |
| Cambios de selección y vista previa | Solo consulta `accion:resumen`; botón de enviar sigue bloqueado |

**Correcciones hechas:** control de solicitudes concurrentes y sesión caducada en frontend; limpieza de datos obsoletos; validación de ID de promoción; redacción específica de cobro hoy/mañana/fecha futura. Edge `comunicaciones-admin-preview` **v6**: validación de firma malformada sin fallo 500 y hasta 8 consultas SQL financieras simultáneas. No se alteró Admin oficial ni se insertaron avisos.

**Verificación de Supabase:** existe índice único `ux_cliente_notificaciones_dedupe` en `(cliente_id,dedupe_key)` cuando hay clave; no crea por sí solo las claves futuras. Datos actuales consultados en modo lectura, sin escritura.

### Antes de habilitar envíos reales (obligatorio)

1. **Motor de envío autorizado en backend:** revalidar sesión, clientes suspendidos, cambios de misión/pago/servicios, promociones vigentes y elegibilidad comercial. Nunca confiar en IDs/estado de navegador ni enviar a candidatos preliminares como si fueran elegibles.
2. **Idempotencia + campañas auditables:** identificador inmutable por campaña/evento/destinatario, restricción única, tabla de campañas/entregas y estados reintentables; evitar múltiples avisos al pulsar dos veces o en reintentos.
3. **Scheduler real y condiciones de vencimiento:** misiones, cobros, ventanas de aviso, huso `America/Merida`, y reevaluación al ejecutar. La fecha escrita en un mensaje no cierra ninguna misión.
4. **Control de saturación y fallos:** límites de frecuencia, preferencias/consentimiento comercial, prioridad de transacciones, reintentos sin duplicados, pausado y métricas.
5. **Prueba de integración real:** sesión Admin válida, navegador iOS/WebKit, campana cliente, apertura del destino del aviso, backend y cortes de conexión. La prueba sintética de 1,200 no mide latencia ni memoria reales.
6. **Crecimiento:** paginación de lecturas de clientes y contratos en el endpoint; las consultas actuales usan límites y pueden truncarse cuando el conjunto crezca significativamente. Se limitó la concurrencia de RPC, pero no se implementó paginación todavía.

**Recomendación:** no añadir nuevas pestañas ni filtros generales. Conservar «Elegir motivo → sugerencia → editar destinatarios → vista previa»; invertir el siguiente bloque de trabajo en el contrato seguro de envío y registro, no en más interfaz.


## Etapa de seguridad del envío · Beta backend v8 (11/oct/2026)

Sin alterar la navegación, interfaz visual, clientes, tablas ni flujos oficiales, se amplió **la función Edge existente** \`comunicaciones-admin-preview\` (no se creó otro motor) con un comando separado \`accion: "validar_plan"\`. La función **sigue siendo de solo lectura**: no dispone de operaciones para crear campañas ni insertar avisos reales.

La validación se realiza desde el servidor con la sesión administrativa actual y requiere:
- \`plan.tipo\`: \`missions\`, \`pay\`, \`promo\` o \`general\`.
- \`plan.id_campana\`: UUID del intento/campaña (todavía no persistido).
- \`plan.agregar_ids\` y \`plan.excluir_ids\`: IDs UUID, máximo 200 por selección, sin solapamiento.
- \`plan.promocion_id\`: solo para promoción y debe existir, estar vigente/publicada y habilitada para adquisición.

**Validaciones:** reconstruye lista con clientes no suspendidos, no de prueba y con servicio activo; compara progreso **confirmado** de misiones contra la versión actual; toma cobros no cubiertos de \`goxion_estado_financiero\`; verifica en promociones \`goxion_promocion_elegibilidad\` y \`goxion_promocion_disponibilidad\` por cliente; descarta manuales no elegibles; consulta \`cliente_notificaciones\` con \`dedupe_key\` exacta (\`comunicaciones:<id_campana>:<tipo>\`) para evitar proponer duplicados de la misma campaña. Para cobros admite seleccionar manualmente fechas verificadas más lejanas a 7 días. Ante fallo SQL, sin stock o elegibilidad no confirmada se excluye y explica el motivo.

**Bloqueos:** validación de fecha **actual real** exclusivamente; si una consulta base llega al límite de 1,000 registros se rechaza en vez de confiar en datos potencialmente truncados; evita listas de más de 500 evaluados por intento; tokens HMAC obligatorios; la respuesta devuelve \`modo: "validacion_sin_envio"\`, \`envios_realizados: 0\` y \`habilita_envio: false\`.

**Pruebas reproducibles:** \`scripts/comunicaciones-plan-beta-smoke.mjs\` utiliza exactamente el bloque de validación del archivo \`docs/edge/comunicaciones-admin-preview.ts\` (copia versionada de la Edge desplegada) y ensaya 20 escenarios con datos ficticios: exclusiones, pagos cubiertos, manuales que no cumplen reglas, stock no disponible, fallos RPC, duplicados, promoción cerrada, más de 500 clientes e IDs inválidos. Integradas a \`npm run test:comunicaciones\`.

**Pendiente antes de envíos:** autorización de campaña persistida y doble confirmación, bitácora transaccional de destinatarios, reserva de clave/idempotencia de escritura, revalidación al ejecutar, preferencia comercial/frecuencia, programador, paginación completa, prueba autenticada en web/iOS y entrega efectiva en la campana existente. No interpretar una simulación como un mensaje enviado ni usar un UUID nuevo para evadir límites de frecuencia.


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

