# GOXION · Motor financiero v1

## Estado de la fase

Fase 1 activa en **modo sombra**.

El motor financiero calcula un contrato común para Index, Ayuda y Admin, pero
todavía no sustituye el total oficial mostrado/cobrado. Esto permite comparar el
nuevo cálculo contra producción antes de cambiar comportamiento económico.

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
