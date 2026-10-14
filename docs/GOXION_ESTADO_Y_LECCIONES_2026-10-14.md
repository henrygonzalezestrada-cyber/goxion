# GOXION · Estado oficial, lecciones y continuidad entre chats

> **Documento canónico de traspaso. Corte verificado: 14 de octubre de 2026.**
> Repositorio: [GOXION](https://github.com/henrygonzalezestrada-cyber/goxion) · rama productiva: `main`.
> Propósito: que un nuevo chat o colaborador sepa qué **ya se cerró**, qué decisiones **no se reabren**, qué sí puede cambiar y cómo evitar las demoras de la integración B2.
>
> **Orden de autoridad:** código y datos actuales en `main`/Supabase > este reporte fechado > guías vigentes `AGENTS.md`, registro funcional y contrato visual > hojas de ruta y betas históricas. Una captura o un documento con fecha anterior NO demuestra por sí solo el estado actual. Ante contradicciones, inspeccionar la fuente operativa y actualizar este reporte.

## 1. Estado ejecutivo: dónde estamos parados

**La integración financiera B2 se publicó de forma gradual y el ciclo de trabajo F0–F5 está cerrado como entrega inicial.** No hay autorización para activar masivamente a todos los clientes. Los controles se diseñaron para que el régimen tradicional de **fecha única** siga funcionando mientras cada cuenta se habilita **individualmente** para multifecha.

| Bloque | Estado acreditado | Referencia |
| --- | --- | --- |
| F0 · Auditoría | Cerrada; inventario y límites de cobro identificados | [Ruta de cierre](B2_RUTA_CIERRE_CONTROLADA.md) |
| F1 · UX | Diseño visual acordado; conserva ADN propio de cada pantalla | [PR #97](https://github.com/henrygonzalezestrada-cyber/goxion/pull/97), [contrato visual](GOXION_VISUAL_CONTRACT.md) |
| F2 · Motor | SQL B2 opt-in, obligaciones por perfil, lealtad global, mora por obligación y evidencia privada; protegido por autorización de servidor | [PR histórica #96](https://github.com/henrygonzalezestrada-cyber/goxion/pull/96), [motor financiero](FINANCIAL_ENGINE.md) |
| F3 · Integración | Index B2, Mi Espacio y revisión Admin con comprobante e idempotencia; validación HTTP positiva y concurrencia en entorno ficticio | [PR #99](https://github.com/henrygonzalezestrada-cyber/goxion/pull/99), [detalle F3](B2_F3_INTEGRACION_BETA.md) |
| F4 · Avisos | Confirmación automática de prórroga, campana Admin y outbox de Discord con reintento programado | [PR #100](https://github.com/henrygonzalezestrada-cyber/goxion/pull/100), [cierre F4](B2_F4_CIERRE_BETA.md) |
| F5 · Publicación | Integración selectiva en las páginas oficiales; clientes globales conservan flujo anterior | [PR #101](https://github.com/henrygonzalezestrada-cyber/goxion/pull/101) |
| Cierre operativo | Activador B2 junto al calendario; conciliación de redondeo; próximo importe en Index y Mi Espacio | [PR #102](https://github.com/henrygonzalezestrada-cyber/goxion/pull/102), [PR #103](https://github.com/henrygonzalezestrada-cyber/goxion/pull/103) |

**Última versión productiva comprobada en este corte:** commit `8944b30ce` (PR #103), GitHub Pages **SUCCESS** y GOXION Integrity **SUCCESS** para ese mismo commit: [Pages](https://github.com/henrygonzalezestrada-cyber/goxion/actions/runs/38640614370), [Integrity](https://github.com/henrygonzalezestrada-cyber/goxion/actions/runs/38640615453). Estos resultados corresponden a código y CI; no sustituyen una aceptación visual humana en Safari para futuros cambios.

**Fotografía del backend, NO cifra permanente (14/oct/2026):** **21 clientes, 29 pagos, 1 cliente B2 activo, 1 ciclo B2, 2 cargos B2, 0 comprobantes B2 y 0 eventos F4**. Los contadores pueden cambiar sin que ello sea un defecto. No restaurarlos artificialmente ni afirmar que son fijos. El trabajo previo registró 22/28/0 antes de nuevas operaciones; usar siempre lecturas frescas.

## 2. Cómo opera realmente el nuevo esquema

### Activación: calendario guardado ≠ régimen B2 activo

1. En **Admin → Clientes → Servicios → Fechas de renovación → Gestionar**, guardar fechas, coberturas y precios de **cada acceso/perfil real**.
2. En ese mismo calendario, el control contextual **«Cobro por perfil → Activar»** consulta `b2_estado_activacion`. Indica requisitos faltantes; exige, como mínimo, dos perfiles reales con fechas distintas y calendarios verificados.
3. Solo una **confirmación administrativa explícita** llama a `b2_activar_cliente`. **El servidor** vuelve a verificar período, precios, lealtad, beneficios, saldo global y pagos pendientes; crea/materializa el ciclo de manera atómica o revierte sin cambiar el régimen.
4. Confirmar la respuesta `regimen_activo=true` y volver a leer el estado real. **Nunca** inferir activación por el mero guardado visual ni mostrar «Listo» antes de comprobarla.
5. Las cuentas **sin opt-in** siguen con el estado de cuenta y aprobación de pago de fecha única. No forzar B2 por parámetro de URL, fecha guardada, sesión caducada o una maqueta.

**Componentes en el código:** `preview/calendario-financiero/index.html`, `preview/calendario-financiero/b2-activacion.js`, `docs/edge/acciones-financieras-b2-beta/index.ts`, `assets/js/admin/33-b2-f5-review-router.js`, `preview/integracion-b2/admin-b2-f3.js`.

### Qué se cobra, qué se muestra y qué se acredita

- **Index B2:** el importe grande es **el próximo vencimiento pendiente**, agrupando todos los cargos cuyo vencimiento efectivo sea ese mismo día; no es automáticamente el total del mes. El **total del período** debe seguir disponible en el desglose y **«Todo junto»** sigue siendo una opción.
- **Mi Espacio:** la cápsula de consultar estado y la próxima fecha usan la **misma cotización B2 autenticada**, no otro cálculo ni el total global heredado. Fecha única mantiene el comportamiento anterior.
- Al pagar el primer perfil, el próximo pago cambia al siguiente **pendiente**. Una prórroga activa cambia la **fecha efectiva** para presentarlo; el incumplimiento se calcula en el servidor.
- **Precio siempre en centavos del servidor:** descuento de lealtad, promociones, cupones, ajustes comerciales, pagos parciales y mora no se redistribuyen «a ojo» con JavaScript.
- **Caso real de regresión que no se debe repetir:** servicio de dos perfiles, base **$98**, descuento global de lealtad **$6**, **total oficial $92**, y dos obligaciones de **$46** en el escenario de prueba. Antes de corregir el redondeo, aplicar 6 % por perfil producía **$92.12**. La conciliación SQL distribuye el residuo de centavos y exige que la suma de obligaciones coincida **exactamente** con el total oficial. **No asumir que todos los X2 cuestan $46:** se cotiza por cuenta/período.
- **Reportar** un comprobante no es **acreditarlo**. Evidencia en Storage privado, idempotencia al reportar, validación y aprobación Admin, recibo global consolidado al liquidar el ciclo. El pago por un perfil no liquida accidentalmente los demás.
- **Prórroga:** una por cliente/período, solo en su día de vencimiento elegible, hasta cinco días, aceptación automática en Mi Espacio sin aprobación manual de Admin. Si cumple, conserva lealtad y evita mora; si incumple, aplicar reglas del motor B2 sin perder trazabilidad. Los servicios con fechas distintas mantienen consecuencias individuales y la lealtad se rige globalmente.
- **Pagos parciales:** distinguir el flujo transaccional de Admin para fecha única del autoservicio de pago por perfil. No anunciar como habilitada una función cliente que no aparezca realmente conectada en Index.

**Componentes:** `preview/integracion-b2/index-adapter.js`, `preview/index-b2/b2-bridge.js`, `assets/js/ayuda/17-b2-prorroga-oficial.js`, `assets/js/ayuda/18-b2-index-ruta-oficial.js`, `assets/js/ayuda/19-b2-proximo-pago.js`, Edge `estado-financiero-b2-beta` / `comprobantes-b2-beta`.

### Notificaciones

- F4 registra un aviso **único por acuerdo** dentro de la transacción financiera; Admin reutiliza `notificaciones_admin`, leído/no leído y la ficha existente.
- Discord usa el **webhook existente** a través de outbox, **no** un segundo sistema o una llamada directa desde el navegador. Cron `goxion-b2-f4-discord-retry`, frecuencia **cada 15 minutos**, activo en el corte.
- Discord caído = evento **pendiente de reintento**, **nunca** prórroga cancelada ni pago alterado. No prometer «exactly once» a través de una red externa: un envío exitoso sin confirmación HTTP podría reintentarse; incluir ID de evento para seguimiento.
- Cualquier cambio de webhook, permisos o frecuencia requiere observar el outbox y validar el flujo separado del financiero. **Nunca** publicar tokens, secretos HMAC, claves de servicio, credenciales bancarias o enlaces permanentes de evidencias.

## 3. Los tropiezos y qué aprendimos

| Tropiezo real | Causa principal | Regla preventiva |
| --- | --- | --- |
| «Todo está listo», pero nadie podía habilitar B2 desde Admin | Se cerró motor/UI sin un control operativo de **activación**; se confundió guardar calendario con activar régimen | Toda funcionalidad requiere **entrada visible → permiso → acción servidor → confirmación → estado observable**, además del backend. PR #102. |
| Mostrar $92 como «Total a pagar» cuando vencía solo un perfil de $46 | Se reutilizó el total global como importe protagonista | **Próxima obligación** arriba, total del período secundario; agrupar coincidentes. Misma cotización para Index y Mi Espacio. PR #103. |
| $92.12 al desglosar $92 | Redondeo porcentual por perfil sin conciliar contra lealtad oficial | Distribución de residuos en **SQL**, total invariante; prueba exacta antes de activar. PR #102. |
| Varios días de avances, pruebas y betas adicionales | Redescubrimiento del estado entre chats, repetir suites sin decisión de salida, mezclar fase visual, motor y publicación | Inventario y una **ruta corta de aceptación**; solo probar el cambio y un flujo completo afectado. No reiniciar F0–F5 por cada detalle. |
| Diferencias en modal: scroll de fondo iOS, contorno inicial de foco, selector desalineado, exceso de espacio | No respetar el ADN ni el componente dueño del estado/estilos | Leer HTML/JS/CSS reales **antes** de diseñar; conservar morph/vidrio/retícula; probar móvil y WebKit cuando el cambio sea visual. Mantener foco accesible de teclado sin aro automático decorativo. |
| Adaptadores duplicados y propuestas de otra reorganización de Admin | Falta de mapa de funciones y dueños | **Consultar `docs/ADMIN_FUNCTION_REGISTRY.md`** y reutilizar el módulo existente. No cuarta reorganización, no nuevos paneles para lo que ya está en Servicios/Operaciones. |
| Confundir prueba estática, beta, resultado CI y despliegue real | «Commit hecho» no equivale a «Pages servido», ni HTTP negativo equivale a cobro aprobado | Declarar separadamente **implementado**, **QA aprobada**, **PR fusionado**, **Pages publicado** y **activación de cliente**. Nunca anticipar éxito de jobs en progreso. |
| Costos/condiciones de Supabase Branching | Branching requería plan Pro; se evaluó innecesariamente como único camino | Revisar plan/precio/alternativas **antes** de crear; se usó un **proyecto aislado** de pruebas, sin copiar datos reales. QA temporal sí; experimentos sobre clientes de producción no. |
| Conflictos de ramas y documentos de fases desactualizados | PRs largas superpuestas, SQL desplegado por separado y documentación escrita antes del cierre | No fusionar ramas históricas a ciegas. Una referencia **canónica de estado actual** y PRs pequeñas; reportar excepciones. |
| Discord pudo convertirse en una dependencia del cobro | Entrega externa confundida con aprobación financiera | Transacción SQL del acuerdo **primero**; cola/reintento Discord **después**. |

**Lección central:** para una función nueva, *«tengo el motor y la pantalla» NO es suficiente*. Debe cerrarse también el último paso humano en Admin o Mi Espacio, con un estado verificable y sin cambiar los contratos antiguos.

## 4. Qué SÍ hacer y qué NO volver a hacer

### SÍ

- **Primero leer**, en este orden: este reporte; `AGENTS.md`; `docs/ADMIN_FUNCTION_REGISTRY.md`; contrato visual; documentación financiera; código real del módulo solicitado.
- Ante un defecto, decir en una frase **qué falla / en qué archivo / qué cliente o régimen afecta**; proponer el cambio mínimo y aplicarlo en una **rama corta + PR**.
- Investigar dónde vive ya la operación antes de crear métodos, scripts o pantallas.
- Conservar el mismo ADN visual en cada superficie **sin mezclarlas**: Admin, Ayuda/Mi Espacio e Index son experiencias distintas.
- Reutilizar motor y cotización autenticada en el servidor, cotizar dinero en centavos, validar cliente/período/ciclo/perfil y mantener idempotencia.
- Dar actualizaciones breves con **resultado real**, no promesas de «avanzaré tres fases».
- Hacer una **sola comprobación acotada** del cambio y la regresión relevante. Visual → móvil/WebKit; financiera → caso exacto + idempotencia. Expandir QA solo si hay un fallo concreto.
- Antes de decir «oficial»: confirmar **PR mergeada**, **Pages SUCCESS del mismo SHA**, **Integrity PASS del mismo SHA**, y si una cuenta fue realmente **opt-in**.

### NO

- No reconstruir el diseño aprobado, duplicar banners, modales, calendarios o tabs ni volver a reorganizar Admin.
- No activar B2 por haber guardado fechas; tampoco habilitar todos los clientes con un script masivo.
- No recalcular/importar **totales globales** como «próximo pago», ni dividir servicios X2 de forma matemática en el frontend.
- No cambiar reglas de mora, lealtad, cupones, promociones o pagos parciales para arreglar un problema puramente visual.
- No presentar datos demo, simulaciones SQL revertidas o escenarios ficticios como operaciones de clientes reales.
- No aprobar automáticamente un comprobante porque se subió; tampoco mostrarlo «pagado» antes de la aprobación de Admin.
- No fusionar **PR #96** ni **PR #95** de forma automática: están abiertas, con historial/conflictos, y pueden sobreescribir mejoras que ya existen en producción.
- No prolongar días de «auditorías adicionales» si el defecto y su validación mínima ya se resolvieron; no convertir una petición pequeña en otra fase B2.
- No entregar enlaces o estados de publicación que no se hayan comprobado.

## 5. Arquitectura rápida para localizar cualquier problema

| Si el cambio es… | Consultar primero |
| --- | --- |
| Cliente: total grande, calendario, comprobante y selección próximo/todo | `index.html`, `assets/js/index/`, `preview/integracion-b2/index-adapter.js`, `preview/index-b2/b2-bridge.js` |
| Mi Espacio: próxima fecha e importe, prórroga | `ayuda.html`, `assets/js/ayuda/01e-client-dashboard.js`, `17-b2-prorroga-oficial.js`, `18-b2-index-ruta-oficial.js`, `19-b2-proximo-pago.js` |
| Admin: fecha individual, opt-in B2 | `admin.html`, `assets/js/admin/32-admin-calendario-beta.js`, `preview/calendario-financiero/index.html`, `b2-activacion.js`, Edge acciones B2 |
| Admin: comprobantes y revisión | `assets/js/admin/33-b2-f5-review-router.js`, `preview/integracion-b2/admin-b2-f3.js`, Edge `acciones-financieras-b2-beta` |
| Motor: precios, saldo, ciclo, mora, pagos | `docs/FINANCIAL_ENGINE.md`, `supabase/migrations/`, `supabase/tests/`, RPC B2 reales; contrastar con `goxion_estado_financiero` |
| Avisos de prórroga | `docs/B2_F4_CIERRE_BETA.md`, `notificaciones_admin`, `goxion_b2_f4_eventos`, outbox, `docs/edge/b2-f4-discord-beta/index.ts`, cron |
| Arquitectura y componentes existentes | `docs/ADMIN_FUNCTION_REGISTRY.md`, `docs/ARCHITECTURE.md`, `docs/GOXION_VISUAL_CONTRACT.md` |

**Dos regímenes, dos fronteras de acceso:** Index/Ayuda/flujo Admin **fecha única** continúan; B2 usa puente y endpoints autenticados hasta opt-in. `main` es código publicado; los archivos `preview/` pueden ser componentes operativos del puente B2 **además de** betas históricas. No eliminarlos por su nombre sin revisar las referencias productivas.

**Supabase:** proyecto productivo `hmpevcwodcgbkviarfic`. El proyecto separado de QA `nsvybyvvdpdgbgtvydfb` contiene **datos ficticios**; no es producción y no debe eliminarse ni reutilizarse para cobros reales sin una decisión consciente. No registrar secretos en GitHub. Las versiones de Edge cambian con cada despliegue; buscar la versión actual, no suponer una versión fija documentada.

## 6. Estado pendiente / mantenimiento — sin reabrir B2

1. **Operación ordinaria:** gestionar altas B2 individualmente desde el calendario de Admin, vigilando precios y coberturas. Las cifras anteriores son un **corte**, no una meta.
2. **Seguimiento de PR históricas:** [#96](https://github.com/henrygonzalezestrada-cyber/goxion/pull/96) y [#95](https://github.com/henrygonzalezestrada-cyber/goxion/pull/95) siguen abiertas; tratarlas como deuda de conciliación documental/código, **no** como autorización para volver a construir F2. Archivar/cerrar solo después de determinar qué archivos faltan realmente en `main`; si no hay un fallo, no bloquear operaciones por ello.
3. **Entrega real de notificaciones:** cron activo, pero en este corte **0 eventos F4 reales**. No afirmar que Discord ya notificó efectivamente una prórroga real; la lógica, cola y pruebas de falla están implementadas. Verificar cuando ocurra el primer acuerdo real.
4. **Safari real y atención al cliente:** Chromium/WebKit y CI general verdes en el corte; cualquier incidencia reportada mediante captura/video debe corregirse en su componente, sin rehacer todo el diseño.
5. **Infraestructura QA:** proyecto aislado permanece disponible para pruebas ficticias. Evaluar costo/limpieza conscientemente; no atribuirle actividad de clientes.

**No hay una «F6» pendiente por obligación.** Una incidencia futura debe tener una definición propia y un alcance pequeño.

## 7. Reglas para cerrar cualquier solicitud futura en el mismo día, cuando sea viable

1. Confirmar versión afectada, rama, estado de CI y si el cliente es **global** o **B2**. No asumir datos de conversaciones pasadas.
2. Localizar **una** fuente de verdad de datos y el componente visual dueño.
3. Escribir el comportamiento esperado con **un ejemplo numérico** y contemplar la excepción de fecha única.
4. Implementar la solución más pequeña posible (nada de rediseños ni reescrituras por inercia).
5. Ejecutar solo las comprobaciones pertinentes y revisar regresiones relevantes.
6. Crear/fusionar PR, confirmar Pages y CI, **no confundir merge con publicación**, indicar qué verá el usuario y cómo comprobarlo.
7. Actualizar este reporte **solo si cambió la arquitectura, una regla o el estado general**. No reescribir el documento en cada parche.

## 8. Mensaje listo para comenzar otro chat

> Continuemos GOXION desde su estado oficial actual, **sin reabrir F0–F5** ni rediseñar las interfaces. Repositorio: `henrygonzalezestrada-cyber/goxion`, rama `main`. Lee en GitHub **`docs/GOXION_ESTADO_Y_LECCIONES_2026-10-14.md`**, `AGENTS.md`, `docs/ADMIN_FUNCTION_REGISTRY.md` y `docs/GOXION_VISUAL_CONTRACT.md`. La integración B2 opt-in, el botón contextual de activación en el calendario, el próximo pago destacado y las notificaciones F4 ya están integrados. **Verifica el estado actual** de GitHub, Pages y Supabase antes de cambiar algo. El esquema global debe mantenerse, y no autorices activaciones masivas. Mi nueva petición es: [escribe aquí el cambio concreto].

### Referencias rápidas

- [Repositorio principal](https://github.com/henrygonzalezestrada-cyber/goxion)
- [Último cambio de próximo pago · PR #103](https://github.com/henrygonzalezestrada-cyber/goxion/pull/103)
- [Activación desde Admin · PR #102](https://github.com/henrygonzalezestrada-cyber/goxion/pull/102)
- [Publicación B2 · PR #101](https://github.com/henrygonzalezestrada-cyber/goxion/pull/101)
- [Cierre de avisos · PR #100](https://github.com/henrygonzalezestrada-cyber/goxion/pull/100)
- [Integración cliente/Admin · PR #99](https://github.com/henrygonzalezestrada-cyber/goxion/pull/99)
- [Diseño F1 · PR #97](https://github.com/henrygonzalezestrada-cyber/goxion/pull/97)

**Este reporte evita perder el contexto, no sustituye volver a leer el código real ni autoriza modificar producción sin comprobar impactos.**
