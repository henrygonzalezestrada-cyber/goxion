# GOXION · Hoja de ruta de renovaciones independientes

**Corte de análisis:** 11/oct/2026. **Etapa real:** persistencia de calendarios por acceso en Admin, cálculos y guardado auditado; Ayuda/Index aún no usan obligaciones financieras separadas. **No** actualizar el estado de cuenta cliente basándose en IDs virtuales o importes calculados en el navegador.

## Contrato de producto acordado

- Mayoría de los clientes: una fecha heredada, habitualmente **día 15**, sin cambios visibles ni de cobro.
- Excepción: servicios (incluso dos perfiles de un mismo X2) pueden tener fechas y cobertura pagada diferentes.
- La ficha de Admin permite cambiar fechas exactas, confirmar cobertura y —si se solicita— estimar unión de fechas con prorrateo justo. No meter formularios en varias fases ni otro encabezado.
- Cliente en Ayuda: resumen breve con **«Próximo a vencer»** cuando existan varias fechas verificadas; si no, conserva la tarjeta habitual. Cliente en Index: **el mismo estado de cuenta** muestra próximo vencimiento, el resto y selección «pagar próximo» / «todo junto».
- «Unificar fechas» es una **operación financiera**, no un simple cambio de texto o día. Debe explicar la diferencia a favor/en contra y requerir autorización/confirmación.
- Separar **ver/simular**, **solicitar cambio**, **confirmar obligación** y **acreditar pago**. Reportar comprobante no equivale a aprobarlo.

## Lo que ya existe (verificado en repositorio)

- `docs/edge/estado-financiero/calendario-beta.mjs`: cálculo independiente simulado de X2 con IDs virtuales; no equivalen a líneas persistidas.
- `docs/edge/estado-financiero/index.ts`: `simular_calendario_beta` exige **token de Admin**. Con `X-Client-Token` solo expone `mi_estado` y su total financiero **oficial**.
- `assets/js/core/financial-engine.js`: `GOXION_FINANCIAL.clientState()` y `adminState()` son fuentes compartidas oficiales; `selectCompatibleState` preserva compatibilidad.
- `assets/js/index/01-index-supabase-layer.js` y `02-02-inline.js`: estado de cuenta existente. **La visual de Index todavía sigue un período global**, no un calendario de obligaciones independientes.
- `assets/js/ayuda/01e-client-dashboard.js` y `02-client-supabase-layer.js`: Mi Espacio y estado de cuenta del cliente; no conectar acceso de Admin aquí.
- `assets/js/core/financial-actions.js`: operaciones de pago centralizadas. `docs/ADMIN_FUNCTION_REGISTRY.md` mantiene propietarios.

## Orden para avanzar sin rehacer pantallas

| Fase | Trabajo | Resultado para validar | Prohibiciones |
|---|---|---|---|
| **A. Persistencia y autorización** ✅ estructura y guardado base; aún falta conciliación comercial | Definir obligaciones por **contrato + unidad/perfil**, importe real (no asumido 50/50), próxima fecha, cobertura pagada, recurrencia mensual, cambio y auditoría; migración retrocompatible | Consultas de obligaciones con historial y cobertura coherentes; cliente heredado intacto | No mutar `cliente_servicios` a ciegas, no confiar en nombre `(x2)` como esquema final, no guardar operaciones desde JS |
| **B. Motor y pagos** | Integrar cálculo a `estado-financiero` y aplicación transaccional/idempotente a `acciones-financieras`; pagos por vencimiento y conjunto, créditos/prorrateo, mora/descuentos, suspensiones | Pruebas de total exacto y no doble cobro con fechas 5/15/30/31, meses cortos, X2, saldo a favor y pago parcial | No permitir pagar un período dos veces ni redondear centavos por separado |
| **C. Contrato cliente de lectura** | Extender endpoint autenticado **`mi_estado`** u otro contrato autorizado del mismo propietario con próximos vencimientos por obligación | El propio cliente ve SOLO su calendario confirmado, sin datos de otros clientes ni IDs técnicos | Nunca exponer `simular_calendario_beta` administrativo ni leer el catálogo de clientes por URL |
| **D. Index primero** | Integrar un pequeño resumen de próximos vencimientos y selector de importe sobre la **interfaz Index existente**; flujo de comprobante se conserva | Capturas móvil: una fecha igual que hoy; varias fechas, pago próximo/todo junto sin duplicaciones | No reemplazar hero, fondo, tarjetas, barra fija o métodos de pago; no crear Index por servicio |
| **E. Ayuda después** | Mostrar en tarjeta principal el próximo importe y fecha; texto «Próximo a vencer» si realmente aplica, acceso a Index actual; evitar cerrar tarjeta al actualizar | Comparación de capturas antes/después; scroll, pestañas y realtime preservados | No implementar segunda calculadora ni rediseñar catálogo, carrito, misiones o registro |
| **F. Piloto y cierre** | Probar primero con pocos clientes con calendarios dispares y X2; auditar datos y recepción de pagos; aprobar visual y backend | Validación de casos y rollback documentado | No habilitar masivamente por defecto |


**Cierre de fase A (implementado):** `goxion_calendario_accesos` vincula cada fecha con `cliente_accesos.id`, guarda estado borrador/verificado y auditoría; la Edge `estado-financiero` incluye `guardar_calendario_beta` bajo token Admin. No se tocaron clientes ni importes históricos y no se ejecutó ningún pago. **Fase B sigue pendiente**: obligaciones, promociones, mora, saldos a favor y aplicación idempotente de pagos aprobados. No saltarse B para mostrar importes reales en Index.

## Avance de la fase C: consulta informativa autenticada (11/oct/2026)

**Implementado en la Edge `estado-financiero` v11, sin cambios de UI en Index o Ayuda:**

- `mi_calendario` acepta únicamente un `X-Client-Token` válido, obtiene el cliente del token y exige cuenta no suspendida. No acepta `cliente_id` suministrado por navegador.
- Exige cobertura verificada de **todos** los accesos de todas las contrataciones activas, precios base conciliados por contrato, fechas válidas no pasadas e identidad de acceso inequívoca. Si falta algo, devuelve `disponible:false` y **no** presenta un calendario parcial.
- Responde exclusivamente con fechas, plataforma y ordinales (cuando aplica), en modo `informativo_sin_cobro`. No expone monto individual exigible, ni cobra, ni guarda, ni modifica período, descuentos o saldo oficial.
- Módulo puro: `docs/edge/estado-financiero/calendario-cliente.mjs`. Prueba `scripts/calendario-cliente-read-smoke.mjs` (27 escenarios/controles) y prueba de preflight visual `scripts/index-calendario-visual-preflight.mjs` (25 comprobaciones).
- **Situación real**: solo una contratación X2 tiene todas las fechas verificadas; no se propagaron supuestos a otros clientes. Se reconfirmó paridad 22/22 de estados financieros oficiales, 0 divergencias.
- Index sigue sin consumir esta ruta. Preparación de componentes reales en `docs/INDEX_CALENDARIO_VISUAL_BASELINE.md`, sin activar UI ni nueva opción de pago. El siguiente paso técnico continúa siendo conciliación/aplicación transaccional de obligaciones de la fase B.

**Importante:** fase C aquí se refiere solo a la **lectura informativa**, no a la disponibilidad de importes pagables; por ello las fases B y D completas siguen pendientes. No dar por terminado el flujo de cobros por fechas.

## Riesgos que no deben ocultarse

- El simulador divide importes X2 de forma aritmética; **esto no demuestra la tarifa real ni su cobertura individual**. Verificación obligatoria antes de persistir.
- Elegir un día no indica si el período ya está pagado. La **cobertura confirmada** manda sobre la simulación.
- La función cliente `mi_estado` hoy no entrega obligaciones individuales. Exponer el calendario administrativo sería una filtración y además un error de negocio.
- Se necesita definir imputación del comprobante a obligación(es), manejo de remanentes/créditos, retardo y lealtad antes de acciones reales.
- Las correcciones visuales pendientes de Admin no bloquean documentar el trabajo; sí deben quedar registradas como deuda visual, sin presentarlas como cerradas.

## Criterios mínimos de aceptación

- El cliente con una sola fecha conserva monto y CTA actuales.
- En X2 dos fechas no duplican el total contratado ni adelantan deuda ya pagada.
- Unificar mantiene períodos cubiertos y explica prorrateo **solo después** de cálculo verificable en backend.
- Suspensión y estado pagado/revisión respetados.
- Sin revelar importes o servicios ajenos; tokens por rol.
- Sin salto de pestaña, cierre de tarjetas, modal superpuesto, scrolling horizontal o importes diferentes entre Admin, Ayuda e Index.
- Validaciones estáticas, motor, integración y Safari real antes de declarar oficial.

**Próxima intervención de código:** empezar **A + B** en una beta/PR limitada al modelo de obligaciones y cálculos, antes de tocar visual de Index o Ayuda.


## Fase B1 · Conciliación contable sombra implementada (11/oct/2026)

La Edge `estado-financiero` ahora ejecuta **`reconciliarCalendarioOficial({calendario,financiero})`** dentro de **`simular_calendario_beta`**, bajo sesión Admin. Código versionado: `docs/edge/estado-financiero/calendario-conciliacion.mjs`. No se agregó endpoint ni acceso de cliente a importes estimados.

**Criterio:** el motor SQL `goxion_estado_financiero` sigue siendo la **única fuente de importes**, y los servicios/accessos deben sumar exactamente el subtotal contractual. El reconciliador toma las cantidades ya oficiales de:
- `descuentos.promociones` y `promociones.total_ahorro`, con bloqueo de acumulación promocional;
- `descuentos.lealtad` y `lealtad.monto`, niveles 3% y 6%, sin recalcular ni reiniciar racha aquí;
- `descuentos.especiales` (descuentos especiales activos);
- `descuentos.trato_justo` (servicios afectados por fallas, con restricciones de stacking);
- `descuentos.programados` y `beneficios_programados`, incluyendo cupones `origen: misiones`, con verificación de IDs únicos;
- `cargos.mora` y `cargos.reactivacion`, calculados por SQL a fecha actual;
- `pago_en_revision`, `pago_incompleto`, `esta_pagado_periodo` y acuerdos de cobro.

La asignación por accesos es **aritmética, en centavos**, con restos mayores y límites por saldo. El resultado tiene `modo:"conciliacion_sombra"`, `cuadrado`, categorías y bloqueos, pero **siempre `cobrable:false`** y `desglose_de_obligaciones_autorizado:false`. Si las fuentes no coinciden, retorna fallo cerrado. Un saldo pagado o parcial nunca se reconvierte en cargo.

**Verificación:** 16 casos de regla (lealtad, descuentos, cupón una sola vez, mora, reactivación, pagos parciales, revisión y pagos ya realizados), 16 guardas de rutas, contraste de la contratación ViX X2 real $98 base → $6 lealtad → $92 oficial y prueba de 22 estados financieros (21 conciliaron contablemente; 1 no tenía servicios; **fixture de fechas sintéticas, no afirmación de que tengan calendarios guardados**). No se han modificado `pagos`, `pagos_parciales`, Index ni Ayuda.

**Qué aún falta para B2 / pagos reales:** modelar obligación persistente por `cliente_acceso_id + ciclo`, reglas por período exacto para promociones y cupones de único consumo, créditos y cobertura pagada; recalcular **mora por vencimiento** (no repartir ciegamente mora del corte global); destinar descuentos individuales conforme a sus restricciones; auditar la aprobación de comprobantes y aplicar fondos en transacción SQL idempotente, con bloqueo y no-doble-cobro. Hasta entonces, no permitir «Pagar próximo» o «Todo junto» con importes por servicio en Index.



## B2 · Fundamentos de obligaciones y abonos en sombra (12/oct/2026)

**Resultado aplicado en Supabase, NO habilitado como cobro:** tres tablas nuevas con políticas RLS activas y permisos exclusivos para `service_role`, migraciones:
- `supabase/migrations/202610120001_obligaciones_abonos_sombra.sql`: `goxion_obligaciones_sombra` (clave única acceso real + inicio del ciclo), `goxion_abonos_sombra` (propuesta asociada a la obligación y clave idempotente), `goxion_imputaciones_sombra` (propuesta de imputación al pago `pagos` o al abono de `pagos_parciales` existente, sin abonarlo de verdad).
- `supabase/migrations/202610120002_obligaciones_abonos_hardening.sql`: como máximo una solicitud pendiente/en revisión por obligación; locks de fuente de pago y controles para no imputar más del pago ni del total de obligación; impedir bajar el importe por debajo de propuestas/imputaciones vigentes o desactivar conciliación con movimientos.
- `supabase/migrations/202610120003_abonos_b2_auditoria.sql`: `goxion_b2_auditoria`, registro de antes/después en obligaciones, propuestas e imputaciones, solo adicionable para el servicio.
- `docs/edge/estado-financiero/abonos-politica.mjs`: política **pura e informativa** de elegibilidad y saldo proyectado; ni acredita abonos ni condona mora ni cambia la fecha de corte.
- `scripts/abonos-politica-smoke.mjs`: 15 pruebas; `scripts/abonos-b2-schema-smoke.mjs`: 33 verificaciones de seguridad, exclusividad e invariantes, incorporadas a `npm run verify`.

**Prueba con reversión:** se crearon temporalmente obligación ViX X2, abono y propuesta de imputación de un pago ya existente en una transacción, se comprobaron duplicidad, propiedad, restricciones y auditoría; se ejecutó `ROLLBACK`. Tras las pruebas, el recuento de obligaciones, abonos, imputaciones y auditoría B2 se mantiene **0**. No se insertó ningún cargo real, ni se tocaron pagos oficiales.

### Estado encontrado del pago parcial heredado

El autoservicio de Index **nunca estuvo habilitado**. Sí existen y están centralizados en Admin `GOXION_FINANCIAL_ACTIONS.registerPartialPayment()` y `pactPaymentDate()`:
- Admin, al revisar un comprobante **incompleto**, introduce el **saldo que falta** y la Edge `acciones-financieras` registra un parcial global para el período en `pagos_parciales`. El saldo pendiente (no la mensualidad completa) es base de mora; el estado permanece incompleto.
- La fecha pactada es administrativa; retiene el corte original y ajusta el corte operativo sin borrarlo. **No equivale a condonación automática** de mora.
- En producción la tabla `pagos_parciales` se consultó y no contenía movimientos al inicio de este trabajo. **No hay prueba real de un abono cliente autogestionado**, porque no existe tal función todavía.

### Decisiones de seguridad y siguiente implementación

**Una propuesta del cliente no es un pago aprobado.** Un abono confirmado reduce el saldo restante, pero NO borra automáticamente mora ya devengada; para diferir la fecha operativa debe existir acuerdo aprobado. La política actual preserva el 5% diario con tope 50% donde aplique, calculado por el motor oficial, no lo vuelve a sumar sobre cada componente sombra.

**Pendiente para culminar B2:** materializar obligaciones por ciclo desde saldos y coberturas conciliados, contemplar el destino por servicio de cupones, promociones y lealtad, y pasar la aprobación de abonos al gateway transaccional/idempotente de `acciones-financieras` antes de exponer solicitudes en Index. El camino administrativo de `registrar_pago_parcial` hoy efectúa varias escrituras sucesivas, **no una transacción única**; no reutilizar esa implementación tal cual para pagos por obligación hasta resolver atomicidad y reintentos. No se cambió el flujo existente en producción.



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


## B2 · Asociación controlada de pagos aprobados (12/oct/2026)

**Hecho, exclusivamente en sombra:** nueva migración `supabase/migrations/202610120006_imputacion_sombra_aprobada.sql` y gateway `acciones-financieras` **v8**. No se tocaron los 28 pagos previos ni se registró ninguna acreditación B2.

- `goxion_periodo_pago_canonico(text)` convierte **solo meses válidos** de los formatos históricos (por ejemplo `Julio 2026`, `septiembre de 2026`, `octubre de 2026`) a la fecha del primer día del mes. Fecha inválida → `NULL`. **Normalizar el mes no prueba qué perfil se pagó**: la obligación debe elegirse explícitamente y seguir conciliada.
- Se refuerza el trigger de `goxion_imputaciones_sombra`: exige `pagos.estado='pagado'`, misma cuenta, mes del comprobante igual al del ciclo y topes tanto del pago como de la obligación. Bloqueos `FOR UPDATE` y nueva clave idempotente con índice único. Para parciales, solo considera los vigentes con estado pendiente y bloquea el cruce con un pago completo del mismo período.
- `goxion_preparar_imputacion_sombra(obligacion_id,pago_id,monto_centavos,clave)` es una RPC transaccional solo para `service_role`. En `docs/edge/acciones-financieras/index.ts`, nueva acción **Admin** `preparar_imputacion_sombra` bajo `X-Admin-Token`, no expuesta a clientes. Devuelve `modo:'propuesta_sin_acreditacion'`, `acreditada:false`.
- Pruebas `scripts/imputacion-sombra-b2-smoke.mjs` (**39 casos y guardas**) incorporadas a `npm run verify`. Transacciones SQL con `ROLLBACK` probaron asignación de un pago aprobado, repetición de clave, conflicto de importe, límite, auditoría, comprobante inexistente y período incompatible. Recuento B2 tras reversión: **0**.
- Revalidación de la versión 7 heredada: 47 pruebas de parcial atómico/Idempotencia siguen pasando. La versión 8 conserva aprobar pago total y pago incompleto de Admin sin cambios visuales.

**Límite vigente:** la tabla `goxion_imputaciones_sombra` sigue en estado **propuesta**, jamás marca deuda como pagada ni consume lealtad, cupones o mora. Tampoco crea obligaciones de manera automática: la correspondencia entre ciclos, cobertura pagada y descuentos por acceso sigue pendiente. No llamar `preparar_imputacion_sombra` para acreditar una cuenta, ni habilitar aún en Index. Próximo trabajo: cierre de ciclo y recálculo transaccional de saldo/mora/beneficios con comprobante aprobado, sin facturar pagos históricos nuevamente.
