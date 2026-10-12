# GOXION · Motor financiero v1

## Estado actual

El motor financiero de lectura opera con **contrato v1.1 en modo oficial** y
el gateway compartido de escrituras `acciones-financieras` opera con
**contrato v1.2**.

La etapa de sombra ya cumplió su función: Index, Ayuda y Admin conservaron
paridad durante la migración y el motor central es ahora la fuente financiera
oficial. La auditoría 3F confirmó paridad real en producción. El fallback legacy
se conserva deliberadamente como protección de continuidad durante la regresión
manual posterior; no es la fuente financiera principal.

## Fuente única

La nueva entrada es la Edge Function `estado-financiero`.

Acciones:
- `mi_estado`: cliente autenticado.
- `obtener_admin`: un cliente desde Admin.
- `listar_admin`: todos los estados para auditoría.
- `comparar_admin`: comparación masiva del modo sombra.

La Edge Function usa `public.goxion_estado_financiero(cliente_id, hoy)`, que
compone el cálculo existente con la capa de promociones asignadas.

## Qué calcula

Servicios y subtotal, estado del periodo, fecha de corte, lealtad, descuentos
especiales, Trato Justo, beneficios programados, mora, reactivación,
promociones asignadas, desglose, total oficial y total sombra.

## Seguridad de Fase 1

`total_actual` es producido por el motor financiero oficial. El bloque `shadow`
se conserva únicamente como telemetría de compatibilidad y reporta delta 0.

Las funciones PostgreSQL nuevas no tienen EXECUTE para `public`, `anon` ni
`authenticated`; sólo `service_role`. La Edge Function valida primero la
sesión del cliente o administrador.

## Contrato frontend

Las tres páginas cargarán `assets/js/core/financial-engine.js` y expondrán:

- `GOXION_FINANCIAL.clientState()`
- `GOXION_FINANCIAL.adminState(clienteId)`
- `GOXION_FINANCIAL.adminCompare()`

Durante Fase 1 ninguna sustituye automáticamente las lecturas existentes.

## Siguiente fase

Migrar lecturas, no escrituras, en este orden:
1. Index / tarjeta principal.
2. Ayuda / estado de cuenta.
3. Admin / resumen de cliente y Cobro Inteligente.

El fallback anterior se retirará sólo después de validar paridad.


## Fase 2A · Index

Index migra primero a lectura financiera unificada.

La capa `assets/js/index/01-index-supabase-layer.js` consulta en paralelo:

- el estado anterior de `estado-cuenta-beta`;
- el contrato nuevo de `GOXION_FINANCIAL.clientState()`.

Antes de entregar datos al render existente se comparan periodo, estado, subtotal,
total, racha efectiva, nivel de lealtad, mora y reactivación.

Reglas de selección:

1. Motor financiero válido + paridad con legacy: usa `financial-v1`.
2. Motor inválido o incompleto: usa `legacy-fallback`.
3. Motor válido pero con alguna diferencia: usa `legacy-variance-fallback`.
4. La diferencia queda disponible en `window.__GOXION_INDEX_FINANCE_AUDIT`.

Por tanto, la Fase 2A puede adoptar la lectura nueva sin permitir que una
divergencia silenciosa cambie lo que el cliente ve.


## Fase 2B · Ayuda / Mi Espacio

Ayuda consulta simultáneamente el estado anterior de `estado-cuenta-beta` y
`GOXION_FINANCIAL.clientState()`.

Ambos pasan por `GOXION_FINANCIAL.selectCompatibleState()`.

Ayuda adopta el motor financiero sólo cuando periodo, estado, subtotal, total,
lealtad, mora, reactivación y estados de revisión/incompleto coinciden. Ante
cualquier diferencia conserva el estado anterior y registra la auditoría en
`window.__GOXION_AYUDA_FINANCE_AUDIT`.

La migración ocurre antes de construir el view model, por lo que tarjeta de
estado de cuenta, desglose, lealtad, mora, Trato Justo y total consumen la misma
fuente sin reescribir sus componentes visuales.

## Fase 2C · Admin / Cobro Inteligente

Admin carga el lote legacy y además consulta
`GOXION_FINANCIAL.adminCompare()`.

Cada cliente se compara individualmente con
`GOXION_FINANCIAL.selectCompatibleState()`. Cuando existe paridad,
`cliente.estado_cuenta` recibe el contrato financiero nuevo; ante una
divergencia ese cliente conserva exclusivamente su estado legacy.

La auditoría consolidada vive en
`window.__GOXION_ADMIN_FINANCE_AUDIT` e incluye clientes migrados, fallbacks y
diferencias detectadas.

Como los módulos de Resumen, clientes, móvil, lealtad, Cobro actual y Cobro
Inteligente ya consumían `cliente.estado_cuenta`, todos quedan conectados al
motor sin duplicar lógica ni modificar sus escrituras.

## Estado al cerrar Fase 2

Index, Ayuda y Admin comparten el mismo cerebro financiero para lectura, con
fallback legacy por divergencia.

Las escrituras permanecen sin cambios. Aprobar pagos, Trato Justo, beneficios,
promociones y demás acciones administrativas todavía usan sus flujos actuales.
La siguiente fase debe centralizar esas escrituras gradualmente y retirar el
doble cálculo sólo después de validar producción.


## Fase 3A · Aprobación de pagos

La primera escritura financiera centralizada es la aprobación de pagos.

Admin ya no llama directamente a `periodo-cobro / aprobar_pago_periodo`.
Las dos rutas de aprobación existentes usan
`GOXION_FINANCIAL_ACTIONS.approvePayment()`, que invoca una única Edge
Function: `acciones-financieras`.

Flujo:

1. Admin envía cliente, monto, puntualidad, notas y el periodo que tenía abierto.
2. `acciones-financieras` valida la sesión administrativa.
3. El motor consulta el estado financiero previo.
4. Si el periodo actual ya no coincide con el periodo esperado, aborta con
   `PERIODO_DESACTUALIZADO` y no escribe nada.
5. Si coincide, delega la escritura estable existente a
   `periodo-cobro / aprobar_pago_periodo`.
6. Después de guardar, obtiene nuevamente `goxion_estado_financiero` y devuelve
   el estado actualizado junto con un `operation_id`.

La protección de periodo evita que un reenvío accidental, doble toque o retry
después de que el primer intento avanzó el ciclo pueda aprobar el siguiente mes.

También se retiró el reinicio redundante de lealtad que el frontend ejecutaba
después de un pago tardío. Esa regla ya vive dentro de la aprobación del
periodo; el frontend deja de coordinarla.

Durante 3A, `periodo-cobro` sigue siendo la implementación estable de la
escritura. `acciones-financieras` funciona como puerta única y capa de
seguridad/contrato. Las siguientes acciones financieras migrarán gradualmente a
la misma entrada antes de consolidar la lógica interna.


## Fase 3B · Trato Justo

Las escrituras de Trato Justo pasan a la misma puerta financiera creada en 3A.

Acciones expuestas por `GOXION_FINANCIAL_ACTIONS`:

- `saveFairDeal()`: crea o actualiza la compensación individual.
- `deleteFairDeal()`: desactiva una compensación individual.
- `applyFairDealBulk()`: aplica o actualiza compensaciones en lote.

El frontend de Admin ya no llama directamente a `trato-justo` para escribir.
El antiguo puente `gxTratoJustoAction` fue retirado de la capa general de
escrituras.

`acciones-financieras` valida primero la sesión administrativa y después
delega en la Edge Function estable `trato-justo`. Las acciones individuales
capturan el estado financiero previo y posterior; la acción masiva devuelve el
resumen del lote y Admin recarga desde la fuente financiera unificada.

La fórmula existente se conserva: 5% del precio mensual por día de falla, hasta
10 días / 50%. Esta fase cambia la coordinación y el contrato de escritura, no
la regla económica.

Las pruebas de navegador interceptan `acciones-financieras` y validan los tres
contratos sin crear, modificar ni eliminar compensaciones reales.


## Fase 3D · Promociones

Las escrituras de promociones pasan por `GOXION_FINANCIAL_ACTIONS`.

- `savePromotion()`: crear/editar promoción.
- `togglePromotion()`: activar o pausar.
- `deletePromotion()`: eliminar o desactivar según dependencias.
- `assignPromotion()`: asignar manualmente a un servicio de cliente.
- `removePromotionAssignment()`: desactivar una asignación.

El listado sigue siendo una lectura directa del endpoint de promociones, pero
guardar/activar ya no puede escribir fuera del gateway financiero.

Las promociones activas se asignan automáticamente al alta de un servicio
mediante el trigger existente y se consumen por periodo cuando el pago queda
pagado. El motor financiero usa esa asignación para calcular el ahorro real.

## Fase 3E · Cobros especiales

El núcleo incorpora dos operaciones:

- `registerPartialPayment()`: registra el saldo restante del periodo.
- `pactPaymentDate()` / `cancelPactPaymentDate()`: crea o cancela una fecha
  pactada sin borrar la fecha de corte original.

Cuando Admin marca un comprobante como incompleto e introduce un monto faltante,
ese flujo registra ahora un pago parcial real. El motor conserva el saldo,
calcula la mora sobre el saldo restante después del pago parcial y mantiene el
estado `incompleto` hasta liquidación.

La fecha pactada conserva `fecha_corte_original` y expone `fecha_pactada`.
El estado de cuenta usa la fecha pactada como corte operativo mientras el
acuerdo esté activo; cancelar el acuerdo devuelve el cálculo a la fecha
original.

Las dos acciones exigen el periodo esperado para impedir que una ficha
desactualizada escriba sobre el siguiente ciclo.


## Fase 3C · Beneficios y descuentos programados

Admin deja de escribir directamente en `beneficios-admin-beta`.

- `saveBenefit()`: programa monto o porcentaje por N periodos.
- `cancelBenefit()`: detiene el beneficio desde el siguiente cálculo.
- `deleteBenefit()`: elimina beneficios que todavía admiten eliminación.

El motor ya consume `beneficios_programados` por periodo y finaliza
automáticamente las reglas al completar su duración. La interfaz no cambia;
sólo cambia la puerta de escritura.


## Fase 3F · Auditoría final cerrada

La auditoría final se ejecutó sobre el estado productivo posterior a 3C/3D/3E.

- Los 23 clientes activos en la base comparada presentan paridad en los campos
  protegidos por el selector entre `goxion_estado_cuenta_beneficios` y
  `goxion_estado_financiero`.
- Los 23 contratos financieros devueltos son válidos para v1.1 oficial.
- No se detectaron estados financieros nulos ni totales negativos.
- Las escrituras que afectan el cálculo financiero central pasan por
  `GOXION_FINANCIAL_ACTIONS` / `acciones-financieras`: aprobación de pagos,
  Trato Justo, beneficios/descuentos programados, promociones y asignaciones,
  pagos parciales y fecha pactada.
- Los accesos directos restantes a endpoints legacy en Admin corresponden a
  lecturas/listados de compatibilidad; el estado `pago_incompleto` sin saldo
  positivo conserva su ruta de notificación/estado y no registra un pago
  parcial financiero.
- Las funciones PostgreSQL financieras privilegiadas no exponen `EXECUTE` a
  `public`, `anon` ni `authenticated`.
- Las tablas de `public` mantienen RLS habilitado. La arquitectura productiva
  accede a datos sensibles mediante Edge Functions autenticadas.
- Integrity y el smoke de Chromium/WebKit quedaron en verde para el cierre.

El fallback legacy se mantiene intencionalmente durante la prueba manual general
de Admin, Ayuda e Index. Sólo entra ante indisponibilidad o divergencia y puede
retirarse en una etapa posterior, cuando ya no aporte protección operacional.

### Hardening posterior no bloqueante

Quedan fuera del cierre funcional del núcleo financiero algunas mejoras de
operación y mantenimiento: proteger la rama `main`, añadir rate limiting al
login administrativo, revisar grants redundantes de Data API y depurar índices
duplicados o sin uso. Ninguna de estas tareas cambia el cálculo financiero ni
bloquea la regresión manual posterior.


## Cierre posterior a prueba manual · Referidos inteligentes

Durante la regresión manual se corrigió la reactivación de referidos inactivos y
se conectó el premio de 3/3 meses al motor financiero.

Al reclamar un mes gratis por referido:

- se crea un beneficio de origen `referidos`, 100%, `una_vez_elegible`;
- se reserva para el periodo pendiente o para el siguiente si el actual ya fue
  pagado o está en revisión;
- tiene prioridad financiera sobre cupones menores para evitar consumir un cupón
  de Misiones dentro de un mes que ya será 100% gratis;
- el beneficio queda ligado al reclamo concreto del referido, por lo que la
  operación es idempotente y un mismo reclamo no puede duplicarse;
- al pagarse el periodo beneficiado, el motor lo consume automáticamente igual
  que los demás beneficios programados.

La prueba con el cliente de regresión confirmó total financiero 0 en el periodo
beneficiado y conservación del cupón de Misiones pendiente para un periodo
posterior.


## Fase inicial · Calendarios individuales por servicio (11/oct/2026)

Iniciada en **modo sombra, no operativo para cobros**. Se amplió la Edge oficial **estado-financiero** con las acciones protegidas por Admin **listar_calendarios_beta** y **simular_calendario_beta**, ambas exclusivamente de lectura. El motor puro de simulación está versionado en **docs/edge/estado-financiero/calendario-beta.mjs**, la versión de la Edge en **docs/edge/estado-financiero/index.ts** y su laboratorio en **preview/calendario-financiero/index.html**.

La beta agrupa plataformas por su primera fecha no cubierta, simula pago del próximo vencimiento o de todas las plataformas y distribuye pagos parciales por servicio y rango de cobertura. Puede estimar prorrateos al extender cobertura para unificar fechas con días reales del ciclo y anclas de 29/30/31. Nunca reduce cobertura pagada automáticamente.

**Garantía de compatibilidad:** los clientes con calendario general heredado continúan bajo el cálculo oficial actual; no hay cambios en tablas ni escrituras. Cada resultado contiene advertencias cuando la fecha no fue confirmada o cuando existen promociones, lealtad, mora o diferencias con el saldo oficial. Este resultado **no es deuda exigible ni pago acreditado**.

Pruebas: **npm run test:calendario**, incluido en **npm run verify**. Para activar el cobro real hace falta crear obligaciones únicas por servicio/rango, aplicar cada aprobación de pago a obligaciones específicas con idempotencia y reconciliar promociones/descuentos y ajustes a favor. Ver **docs/CALENDARIO_FINANCIERO.md**.


## B2 · Hallazgo y protección de pagos parciales (12/oct/2026)

**Verificado en código y Supabase:** Admin ya permite marcar un comprobante **incompleto** e introducir el **saldo restante**. `GOXION_FINANCIAL_ACTIONS.registerPartialPayment()` llama `acciones-financieras/registrar_pago_parcial`, la función comprueba cliente y período, registra saldo y monto abonado en `pagos_parciales` y conserva estado incompleto. `pactPaymentDate()` guarda acuerdos en `acuerdos_cobro` con fecha original y fecha pactada. La mora se determina por la lectura oficial sobre el saldo restante, no se elimina por el mero abono. **Index todavía no ofrece al cliente solicitar abonos libremente.** Durante la revisión, `pagos_parciales` tenía 0 registros.

Se instalaron en Supabase tres **tablas de simulación aisladas** para obligaciones por acceso/ciclo, solicitudes de abono e imputaciones, más auditoría y restricciones de idempotencia. No intervienen en los cobros actuales. Se probaron bajo `BEGIN ... ROLLBACK` con un expediente X2; los cuatro registros nuevos terminaron vacíos. La política `abonos-politica.mjs` evalúa monto, saldo, revisión, mora y acuerdos, **no acredita dinero** ni permite inferir condonaciones. La operación real de `registrar_pago_parcial` tiene escrituras sucesivas y requiere refactorización transaccional antes de reutilizarse para autocobro independiente. Consulta `docs/GOXION_MULTI_DATE_ROADMAP.md`.



### B2 · RPC segura para propuesta de abono (12/oct/2026)

Migración `supabase/migrations/202610120004_solicitar_abono_sombra_rpc.sql`: función `goxion_solicitar_abono_sombra(cliente_id,obligacion_id,monto_centavos,clave_idempotencia,comentario)`. **Únicamente `service_role` puede ejecutarla**; la futura Edge debe verificar el `X-Client-Token` y derivar el ID del propio cliente. Esta RPC comprueba cuenta no suspendida, comprobante fuera de revisión, propiedad del acceso, obligación conciliada, importe menor al saldo y ausencia de solicitudes activas o imputaciones pendientes. Bloquea filas `FOR UPDATE`, admite reintentos con la misma clave sin crear otra solicitud, rechaza uso de una clave con datos diferentes y devuelve `cobrable:false`/`requiere_revision:true`.

Prueba SQL sobre contrato X2 dentro de `BEGIN/ROLLBACK`: primera propuesta, reintento idempotente, clave conflictiva, segundo intento concurrente, intento de otro cliente, pago completo enviado al flujo normal; **todo aprobado**, sin filas persistidas tras reversión. Permisos: `anon=false`, `authenticated=false`, `service_role=true`. En producción no hay pagos parciales registrados; las tablas B2, su auditoría y las nuevas solicitudes siguen vacías.

**Queda pendiente** el endpoint autenticado del cliente, comprobante y operación real de aprobación/transacción que asigne el abono y recalcule mora, promociones, lealtad y saldo por obligación. No se habilitó Index ni se modificó `acciones-financieras`, por lo que las cuotas y descuentos actuales siguen iguales. Un abono solicitado no evita mora ni acredita cobertura hasta que se revise y apruebe; los acuerdos para cambiar el corte requieren autorización.


## Paso B2 · Pago parcial administrativo transaccional (12/oct/2026)

**Hecho y desplegado en producción (gateway `acciones-financieras` v7):** se versionó su código en `docs/edge/acciones-financieras/index.ts`, que antes solo estaba desplegado en Supabase. La acción preexistente `registrar_pago_parcial` conserva **el mismo contrato de Admin** (cliente, saldo restante, período esperado, respuesta `resultado.pago_parcial`), pero reemplaza sus tres escrituras sucesivas por `public.goxion_registrar_pago_parcial_atomico`, migración `supabase/migrations/202610120005_pago_parcial_atomico_legacy.sql`.

La RPC bloquea al cliente para serializar operaciones, lee el estado oficial después de adquirir el bloqueo, verifica período y saldo actual, desactiva el parcial anterior, inserta el nuevo y actualiza el estado de revisión **en una sola transacción**. Acepta `operation_id` único (puede ser generado por el gateway o pasarse como `clave_idempotencia`) para devolver un reintento equivalente sin volver a abonar. Un parcial no puede superar el saldo, ni repetir el mismo período activo; los índices únicos complementan las guardas. La función está revocada para `public`/`anon`/`authenticated` y solo la ejecuta `service_role` desde Edge con `X-Admin-Token`.

**Verificaciones alcanzadas:** 19 guardas de código + 19 casos simulados del gateway = 38; la RPC se probó con una transacción que terminó en `ROLLBACK` (idempotencia, saldo, periodo, propiedad), sin registros persistidos. Después del despliegue: 22/22 estados oficiales, 0 divergencias, 28 pagos originales y 0 `pagos_parciales` en producción. Código en GitHub idéntico a Edge v7.

**Limitación que NO debe confundirse con pago B2 habilitado:** esta mejora aplica al *pago parcial del período global* que administra GOXION; no acredita obligaciones por acceso. Tampoco conecta una solicitud de abono de Index ni cambia mora por vencimiento, cupones o descuentos distribuidos. La validación adicional de mora después de un abono aprobado no se pudo ejecutar sobre cuenta real por una restricción de seguridad del entorno; queda como requisito explícito para activar autoservicio. Se conservan sin cambios Index, Ayuda y la aprobación habitual de pago completo.

**Próximo bloque seguro:** completar motor de obligaciones por ciclo con beneficios elegibles, y diseñar flujo autenticado de propuesta/comprobante → revisión de Admin → imputación idempotente de **pago aprobado** → recálculo por vencimiento. No llamar a `goxion_solicitar_abono_sombra` desde la web pública antes de esa integración y validación.


**Refuerzo de Admin y Safari:** `assets/js/core/financial-actions.js` reutiliza una clave de idempotencia mientras cliente, período y saldo faltante sean iguales; un reintento por pérdida de respuesta o doble toque no crea otro pago. Si cambian cliente, período o saldo, utiliza una clave nueva. `admin.html` actualizó la referencia de caché. Prueba adicional: `scripts/pago-parcial-retry-client-smoke.mjs` (9 casos; total nuevo 47 guardas y simulaciones del flujo atómico). Se mantiene idéntico el diseño de Admin.


## B2 · Preparación de imputaciones de pagos aprobados (12/oct/2026)

En Supabase se agregó `goxion_preparar_imputacion_sombra` con clave idempotente, bloqueo de origen/aplicación, comprobante `pagado`, misma cuenta, mismo mes de obligación y protección contra importes duplicados. La función auxiliar `goxion_periodo_pago_canonico` interpreta meses históricos en español (`Julio 2026`, `septiembre de 2026`); no adivina qué perfil fue pagado. Todo se mantiene como **propuesta no acreditable** y se registra en `goxion_b2_auditoria`.

Gateway `acciones-financieras` v8 permite a Admin preparar la propuesta con la acción `preparar_imputacion_sombra` bajo token administrativo; no modifica `pagos`, `clientes`, `pagos_parciales` ni Index. Se realizaron pruebas transaccionales con reversión de pagos aprobados y de períodos incompatibles, y 39 pruebas de código automatizadas; la ruta de parciales anterior superó nuevamente sus 47 casos. La acreditación por acceso/fecha y el nuevo saldo de mora por obligación **aún no están habilitados**.
