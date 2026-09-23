# GOXION · Motor financiero v1

## Estado actual

El motor financiero v1 opera en **modo oficial** para Index, Ayuda y Admin.

Las fases 1 y 2 documentadas abajo describen la transición histórica desde el
modo sombra. A partir de la Fase 3, las lecturas y las principales escrituras
financieras convergen en el mismo núcleo, conservando compatibilidad y
trazabilidad para la auditoría final.

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

`total_actual` sigue siendo el total oficial existente. Las promociones se
auditan en `promociones` y su impacto hipotético vive en `shadow`.

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


## Fase 3C · Beneficios y descuentos programados

Las altas y cancelaciones manuales de beneficios dejan de escribir directamente
en `beneficios-admin-beta`. Admin utiliza ahora:

- `GOXION_FINANCIAL_ACTIONS.saveBenefit()`
- `GOXION_FINANCIAL_ACTIONS.cancelBenefit()`
- `GOXION_FINANCIAL_ACTIONS.deleteBenefit()`

La Edge Function `acciones-financieras` valida la sesión y delega la operación
estable al backend de beneficios. El motor existente
`goxion_consumir_beneficios_on_pago` continúa consumiendo los beneficios al
registrar el pago y finaliza automáticamente los descuentos al completar su
duración.

Los descuentos porcentuales se calculan sobre el subtotal efectivo después de
promociones, evitando que una promoción y un beneficio dupliquen la misma base.

## Fase 3D · Promociones

Las escrituras del catálogo de promociones también pasan por
`acciones-financieras`:

- crear/editar promoción;
- activar o pausar;
- eliminar;
- asignar una promoción a un servicio contratado;
- retirar una asignación.

Las promociones dejan de ser sólo información de catálogo y forman parte del
cálculo oficial del periodo. `goxion_estado_cuenta` conserva el subtotal
normal y añade `subtotal_efectivo`, descontando el ahorro promocional antes de
calcular lealtad, mora y beneficios posteriores.

Cuando un servicio nuevo se agrega mientras existe una promoción activa para
esa plataforma, el backend crea automáticamente la asignación correspondiente.
La tabla `promocion_aplicaciones` registra el consumo por periodo y el trigger
de pagos avanza `periodos_consumidos` de forma idempotente; al completar la
duración, la asignación se desactiva automáticamente.

## Fase 3E · Pagos parciales y fecha pactada

Se agregan dos conceptos financieros persistentes:

### Pagos parciales

`pagos_parciales` guarda monto abonado, saldo anterior y saldo restante por
periodo. El flujo que antes sólo marcaba un comprobante como "incompleto" ahora
registra un pago parcial real mediante
`GOXION_FINANCIAL_ACTIONS.registerPartialPayment()`.

Después de un parcial:

- el periodo no avanza;
- la racha no se incrementa hasta liquidar;
- el saldo restante se convierte en la base del cobro;
- si vence, la mora nueva se calcula sobre ese saldo;
- si se registra otro parcial, se conserva historial y el nuevo saldo pasa a ser
  la referencia activa;
- al liquidar el periodo, los parciales activos se marcan como liquidados.

### Fecha pactada

`acuerdos_cobro` permite pactar una fecha sólo para el periodo actual mediante
`GOXION_FINANCIAL_ACTIONS.pactPaymentDate()`.

El acuerdo conserva `fecha_original`; no modifica `clientes.dia_pago`. La
mora del periodo comienza después de la fecha pactada mientras el acuerdo está
activo. El backend limita el acuerdo a un máximo de 31 días posteriores al
corte original.

Al pagar el periodo el acuerdo queda cumplido; también puede cancelarse y el
cálculo vuelve inmediatamente al corte original.

## Estado previo a auditoría final

Con 3C, 3D y 3E terminadas, el motor financiero cubre lectura y escritura de:

- mensualidad y periodos;
- lealtad;
- mora y reactivación;
- Trato Justo;
- beneficios y descuentos programados;
- promociones por servicio y consumo por periodo;
- pagos parciales y saldos;
- fechas pactadas por periodo;
- aprobación y liquidación de pagos.

El siguiente paso es **Fase 3F · auditoría final**. En ella se revisarán
escrituras legacy restantes, permisos/RLS, contratos, triggers, cálculos,
paridad de las tres superficies y pruebas Chromium/WebKit antes de la revisión
manual general.
