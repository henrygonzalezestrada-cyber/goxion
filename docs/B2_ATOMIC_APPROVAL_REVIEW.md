# GOXION B2 · Aprobación global atómica, revisión pendiente

**Fecha:** 12/oct/2026. **Estado:** PR de preparación, SIN despliegue. No habilitar en Index/Ayuda. El gateway desplegado sigue en v10 mientras este PR sea borrador.

## Propietario y compatibilidad

- Contrato de Admin: `GOXION_FINANCIAL_ACTIONS.approvePayment()` → `acciones-financieras.aprobar_pago`.
- Un solo ejecutor SQL: `goxion_aprobar_pago_periodo_atomico`. La ruta heredada `periodo-cobro.aprobar_pago_periodo` conserva sesión Admin, pero delega la escritura a la misma RPC.
- Operación: bloqueo `FOR UPDATE` por cliente, fuente oficial, período e importe exactos; creación/actualización del recibo y sus triggers; cierre de parciales y acuerdos; actualización de lealtad, estado y período; constancia de idempotencia.
- Fuente oficial `goxion_estado_financiero`. Una aprobación completa no puede convertir un pago parcial en pago total con monto menor al saldo ni reabrir una cuota pagada por otro intento.
- La nueva constancia de idempotencia usa RLS y exclusividad de `service_role`. El navegador no escribe SQL ni ve operaciones B2.
- El reintento tras pérdida de respuesta puede consultar la clave anterior aunque la primera ejecución haya avanzado el período; sólo la RPC decide si es repetición legítima.
- Los triggers existentes de consumo de beneficios, promociones, retención, notificaciones y tiempo real siguen bajo PostgreSQL y quedan en la misma transacción. No se desactivan para facilitar pruebas.

## Pruebas verificadas

En Supabase se ejecutó migración envuelta en `BEGIN; ... ROLLBACK;`: definición aceptada, RLS activo en tabla temporal, `anon` sin EXECUTE y los objetos de prueba ausentes después de la reversión. **No se llamó a la aprobación sobre un cliente real.** Posterior lectura: 22/22 estados con contrato oficial, cero desviaciones en `shadow.delta`, 28 pagos históricos, 0 obligaciones/imputaciones B2.

`scripts/aprobacion-global-atomica-smoke.mjs` comprueba 35 contratos, rutas, guardas y simulaciones del gateway; participa en `npm run verify`.

**Pruebas SQL reversibles adicionales realizadas en Supabase (12/oct):** en una transacción `BEGIN / ROLLBACK` con cliente y servicio exclusivamente ficticios se aprobó una mensualidad: un solo pago, avance exacto de período, reintento con igual clave sin segunda acreditación. En una segunda transacción igualmente reversible se registraron abono parcial y acuerdo de cobro, se rechazó un importe incorrecto y se aprobó el saldo oficial: el pago previo quedó liquidado, el acuerdo cumplido, el recibo fue único y la racha creció exactamente una vez. Ambas transacciones respondieron `OK`, sin persistir los fixtures.

**Matriz de atribución sombra:** `docs/edge/estado-financiero/atribucion-b2.mjs` y `scripts/atribucion-b2-smoke.mjs` comprueban evidencia comercial por obligación, restricciones de promoción/lealtad, cupones únicos, Trato Justo por servicio, mora por saldo/fecha y reactivación; el resultado sigue siendo `cobrable:false` siempre. Esta política conservadora **no sustituye** la imputación transaccional ni prueba elegibilidad real de clientes: exige documentación confirmada desde backend.

Los fixtures **NO** prueban aún ejecuciones simultáneas reales, fallos inyectados a los triggers, todos los beneficios reales ni aplicación independiente B2; la migración no se desplegó.

## Matriz de aceptación pendiente antes de desplegar

1. Pago normal íntegro: mismo resultado visible y financiero, un único recibo, próximo período exacto y un solo avance de racha.
2. Reintento después de COMMIT con respuesta HTTP perdida: misma clave, mismo resultado, sin segundo pago ni nueva racha. Clave reutilizada con monto/período/cliente diferentes: error.
3. Dos administradores aprueban concurrentemente: uno gana y el otro ve el período cambiado; nunca doble acreditación.
4. Cobro parcial previo y acuerdo pactado: al liquidar, ambos se cierran **en la misma transacción**. Probar saldo igual, insuficiente y ya liquidado.
5. Lealtad 3%/6%, promoción apilable/no apilable, descuento especial, Trato Justo y cupón único de misión: comprobar sus triggers y consumos una sola vez bajo transacción revertible.
6. Un trigger falla deliberadamente en un fixture aislado: deben revertirse pago, cliente, parcial, acuerdo, racha y operación idempotente.
7. Período histórico con denominación en español: normalización a mes canónico, sin migración ni doble registro histórico.
8. Cliente suspendido, en revisión, estado pagado, cero servicios, corte 29/30/31 y cambio de mes: bloqueo o resultado correcto, sin cargos fantasma.
9. Verificar nuevamente 22/22 estados, 0 divergencias, historial intacto y permisos SQL después de aplicar migración.

## Atribución B2 independiente: AÚN BLOQUEADA

La transacción del **pago global** no equivale a acreditar un pago por acceso. Para activar B2 hace falta: obligación por ciclo y cobertura pagada verificadas; descuento de lealtad elegible a fecha concreta; promoción y combo con período, exclusión de stacking y precio contractual propios; cupón con unicidad de consumo; especiales/Trato Justo por servicio; mora calculada sobre el **saldo aprobado y fecha de cada obligación** con límite vigente; acuerdo de fecha y reactivación pertinentes; imputación al comprobante aprobado y consumos en la misma operación.

Las cifras en `calendario-conciliacion.mjs` son de **conciliación sombra**. Sin evidencia por vencimiento, retornar `cobrable:false` y nunca publicar el selector “pagar próximo / todo junto” ni pago parcial cliente.

## Entrega visual futura

Cuando las pruebas y la atribución real estén cerradas, Index va primero (baseline `docs/INDEX_CALENDARIO_VISUAL_BASELINE.md`), Ayuda después. Las opciones de selección y abono parcial deben ocupar un bloque compacto en el Index existente, sin otro estado de cuenta ni modal duplicado. No se modificó UI en este PR.


## Diagnóstico operativo B2 sin mutaciones (12/oct/2026)

La nueva RPC de sólo lectura `goxion_diagnostico_b2_sombra(cliente, periodo)` y la acción `acciones-financieras.diagnostico_b2_sombra` (exclusiva de Admin) determinan si un cliente puede materializar obligaciones **en sombra**, con razones concretas. Comprueban accesos de contratos activos, revisión/calendario/precio/ciclo, fechas distintas, conciliación con el estado oficial, beneficios/cargos sin atribuir y posibles operaciones B2 anteriores. `aplicable_sombra` **no** significa `cobrable`. Siempre devuelve `cobrable:false`; nunca escribe datos. Pendiente de despliegue, versionado en `202610120011_diagnostico_b2_sombra.sql`.

Pruebas SQL realizadas bajo `BEGIN/ROLLBACK`: 22 diagnósticos reales con datos leídos, nunca modificados; cero listos para obligaciones sombra, cero cobrables. En un cliente ficticio con dos contrataciones de distinta fecha se confirmó: sin calendario no pasa; dos fechas/precios conciliados pasan **solo** a sombra; al unificar fechas se mantiene el cobro legacy. Archivo reproducible `supabase/tests/20261012_diagnostico_b2_reversible.sql`. El gateway cuenta con prueba automática `scripts/diagnostico-b2-smoke.mjs`.

**Inventario correcto de producción:** 22 clientes, 47 accesos persistidos en 21 clientes, 2 calendarios *verificados* correspondientes a un cliente con dos fechas, 28 recibos históricos, cero obligaciones/imputaciones B2. El cliente piloto posee base de dos accesos por **9,800 centavos**; el motor oficial aplica **600 centavos de beneficios**. No debe dividirse ni cobrarse por perfil hasta conocer la atribución documentada de ese beneficio y su vencimiento. El resto de la cartera conserva el período global sin cambios. No masificar la verificación con una fecha presumida.

**Próxima barrera técnica:** vincular la procedencia y elegibilidad de beneficios, cupones, Trato Justo, promociones y mora a cada unidad de cobertura; diseñar la acreditación por obligación *real*, con comprobante aprobado, saldo por fecha, idempotencia y una transacción. Luego piloto con fixtures y finalmente Index.


## Prueba integral de imputación B2 en sombra (12/oct/2026)

Archivo versionado: `supabase/tests/20261012_b2_dos_vencimientos_imputacion_reversible.sql`. **Ejecutado y aprobado** contra la estructura real de Supabase con `BEGIN/ROLLBACK`: se prepararon dos vencimientos verificables (días 5 y 25), dos obligaciones ficticias de $49 y $45, un comprobante ficticio previamente aprobado de $94, se preparó y confirmó una imputación por obligación, se reintentó cada fase con la misma clave sin duplicar y se bloqueó una imputación excesiva. Confirmación `acreditada_oficial:false` en ambas, sin cobro ni cambios persistentes.

Inventario de control posterior: 22/22 estados oficiales, `shadow.delta_total=0` en todos, 28 pagos, 2 calendarios verificados en una cuenta, **0 obligaciones, 0 solicitudes, 0 imputaciones y 0 registros de auditoría B2**.

El diagnóstico `202610120011` desglosa ahora siete categorías copiadas de la fuente oficial (promociones, lealtad, especiales, Trato Justo, programados/cupones, mora y reactivación), **sin distribuirlas**: auditoría reversible sobre 22 cuentas encontró 0 divergencias entre las sumas de categorías y los totales de descuentos/cargos. La función nunca presenta los importes como cobrables.

El único cliente con dos fechas verificadas tiene **9,800 centavos** de precio contractual para los dos accesos y **600 centavos de beneficio** en el total oficial. No autorizar una cuota individual de $49 ni trasladar mecánicamente los $6: la atribución elegible y el efecto sobre puntualidad/vencimiento faltan.

La corrección de permisos del trigger `goxion_auditar_b2_sombra` (`202610120012`) **sí** fue aplicada a la base oficial y verificada: `anon=false`, `authenticated=false`, `service_role=true`; asesor de seguridad sin avisos WARN. El resto del PR es borrador SIN DESPLIEGUE.


## Decisión operativa · La cartera de fecha única no debe pasar por B2 (12/oct/2026)

Tras autorización expresa se revisó el padrón de **22 clientes**. La configuración global vigente es: **17 día 15**, una fecha 6 (Nayeli, excepción 6/30), una fecha 16, una 20, una 21 (cuenta suspendida) y una 30. Los clientes con varias plataformas pero un solo día —por ejemplo David— **conservan el pago mensual global y todo el waterfall oficial**: lealtad, promociones, cupones, descuentos y mora se calculan juntos, sin repartir entre servicios.

**Operación real ejecutada y verificada:** `supabase/ops/20261012_sembrar_calendarios_legados_borrador.sql`. Dos fases: ensayo completo `BEGIN/ROLLBACK`, luego ejecución con `COMMIT` y controles de paridad en transacción. Sembró **37 calendarios de un acceso, en borrador, de 19 clientes activos**, derivando día de cobro de `clientes.dia_pago`, fecha propuesta del `periodo_pendiente` oficial, y tarifa del contrato de una única unidad. No indica cobertura pagada: `estado=borrador,verificado_en=NULL`. No crea pagos, mora, imputaciones ni obligaciones. Preservó los **2 calendarios verificados de Nayeli** (6 y 30 nov), saldos oficiales y los 28 pagos anteriores. Total calendario 39 (37 borrador + 2 verificados); auditoría de calendario registra el origen del lote. Se excluyeron suspensión, contratos ya configurados y **3 contratos multiacceso sin un desglose real de precio**, incluidos un combo y X2; estos clientes siguen con fecha y total global intactos y **no quedan bloqueados** por no tener B2.

Verificación posterior: 37 borradores / 19 clientes; 0 marcados verificados por error; 0 fechas discordantes al día original, 0 precios discordantes al contrato; 4 accesos con fecha distinta del 15, preservada de la configuración real; 22/22 `goxion_estado_financiero` oficiales, 0 diferencias, 28 pagos intactos, 0 obligaciones, 0 imputaciones y 0 abonos B2.

El módulo de decisión `docs/edge/estado-financiero/calendario-ruteo.mjs` + 11 pruebas `scripts/calendario-ruteo-smoke.mjs` formaliza dos vías:
1. **global_heredado**: no hay fechas separadas verificadas, o todas corresponden a la única fecha de corte del cliente. El total global es la fuente única; no se calculan cuotas por acceso y las promos/lealtad/cupones/mora no cambian.
2. **b2_multifecha_sombra**: al menos dos fechas confirmadas, todas sus unidades identificadas inequívocamente; admite mostrar el calendario pero no exige importes individuales ni permite cobro separado. Si falta verificación o hay un corte confirmado contradictorio, exige revisión.

**Nueva conclusión:** la falta de 37 verificaciones individuales **no bloquea la integración de los clientes de fecha única**. Sí debe cerrarse el motor de aplicación individual para Nayeli y futuros multi-fecha, y el ciclo/beneficios por unidad. No reabrir cálculos globales para forzar una migración innecesaria.


## Decisión de producto: una lealtad por cliente, cálculo por acceso en multifecha (12/oct/2026)

Se cierra la ambigüedad funcional. **Cuentas con una fecha** conservan el total mensual, lealtad global y cobro global existentes. **Cuentas con fechas independientes verificadas** calculan el porcentaje de lealtad elegible por acceso (no se inventa otro nivel). La racha es única por cliente: solamente se incrementa **una vez** cuando TODOS los vencimientos del ciclo se liquidaron puntualmente; si uno vence sin pagarse, o se liquidó tarde, la racha del cliente se reinicia a cero. El acceso ya pagado no pierde retroactivamente un descuento aprobado; el reinicio afecta los beneficios de ciclos siguientes. Unificar fechas vuelve al cálculo global, pero exige operación de migración de cobertura/prorrateo confirmada en backend, no un cambio cosmético.

**Dato verificado de Nayeli:** tiene nivel **2 (6%)**, 10 pagos puntuales y dos accesos ViX de $49 con cortes el 6 y 30 de noviembre. Los **3% mencionados son nivel 1** y no se deben imponer a Nayeli sin decisión comercial expresa de reducción de nivel. La simulación exacta por centavos para nivel 2 da $2.94 de descuento y **$46.06 por acceso**, $92.12 entre ambos. El estado global anterior muestra $92.00 por redondeo del descuento agregado a pesos; la transición NO debe cargar retroactivamente $0.12 sobre períodos pagados. Si fuera nivel 1, el 3% por acceso sería $1.47 y pagarían $47.53 cada uno. El contrato de redondeo y diferencia debe fijarse antes de activar una deuda real.

**Implementación verificable en rama:** `docs/edge/estado-financiero/lealtad-multifecha.mjs` implementa la regla pura; `scripts/lealtad-multifecha-smoke.mjs` comprueba ambos niveles, pagos completos/parciales pendientes, retrasos en uno de dos, mora individual 5%/día con tope 50%, idempotencia lógica de racha y bloqueos de descuentos de origen desconocido. `npm run verify` incluye esos casos. **Es una proyección NO COBRABLE**, aún no está conectada a los triggers oficiales ni a Index.

**Ruta crítica acotada para terminar:** (1) aprobación de pago por `cliente_acceso_id+ciclo` en transacción SQL con liquidación parcial, reintento idempotente y consumo comprobable del comprobante; (2) acumulación de un estado de puntualidad global al cierre del ciclo, reinicio inmediato de elegibilidad cuando un acceso vence; (3) exponer al cliente sólo su próximo vencimiento y opción conjunto; (4) beta compacta Index, sin duplicar el estado de cuenta. Evitar nuevas auditorías genéricas que no contribuyan a esos cuatro entregables. NO activar estas rutas antes de pasar pruebas de dinero real en fixtures.

**Ajuste de política (12/oct, revisión posterior):** Ante el primer vencimiento no pagado, toda la cuenta pierde la lealtad inmediatamente. Los accesos aún pendientes, aunque venzan después, ya no reciben descuento; los importes de pagos previamente aprobados permanecen inmutables. El próximo ciclo inicia sin el nivel anterior y la racha sólo crece una vez si todos los accesos se pagaron puntualmente.


## B2 · Libro REAL aislado, mora individual, abonos y renovación (12/oct/2026)

**Motor backend implementado y migraciones instaladas** en Supabase, pero **0 clientes activados**:
- `202610120013_b2_libro_multifecha.sql`: RLS, `goxion_b2_regimen_cliente` (opt-in obligatorio, por defecto vacío), ciclos con racha global única, cargos por acceso/fecha y comprobantes parciales aprobados con UUID. La preparación bloquea descuentos/cupones/promociones o cargos de origen no conciliado; no divide combos con identidad ambigua ni sobreescribe pagos globales.
- `202610120014_b2_cotizacion_abono_atomico.sql` + `202610120018_b2_renovacion_recurrente.sql`: cotización individual por acceso (5% diario sobre principal impago, tope del 50% del precio del acceso; mora de fechas diferentes se **suma**, no se aplica sobre la mensualidad completa); la aprobación bajo lock de cliente + ciclo + cargos aplica primero el abono a principal, conserva la mora acumulada y recalcula solo sobre el saldo restante. Idempotencia permanente por UUID, rechazo de saldo obsoleto, consumo único del período, un solo recibo mensual al liquidar todos los accesos. Un fallo al preparar el siguiente mes **no revierte** la liquidación ya válida; queda indicado que requiere conciliación. Al cerrar el mes, se renuevan las fechas verificadas del ciclo siguiente respetando días 29/30/31.
- `202610120015_b2_evitar_doble_cobro_global.sql`: bloquea cobro global del mismo período de cualquier cuenta B2 activa; solamente la función B2 autorizada puede registrar el único recibo consolidado.
- `202610120016_b2_activacion_y_unificacion_segura.sql`: activar requiere confirmación explícita Admin y concilia todo en una transacción; unificar requiere no tener obligaciones B2 abiertas y que Admin haya alineado las fechas. Nunca activa a todos automáticamente.
- `202610120017_b2_proteger_fechas_y_precios.sql`: prohíbe cambiar fecha/precio/cancelación mientras el ciclo individual siga sin liquidarse, evitando deudas o importes fantasmas.

**Lealtad:** global y única para cliente, con descuento calculado por acceso si hay fechas separadas. El primer impago cancela lealtad de todos los accesos pendientes y reinicia racha; los pagos ya aprobados no sufren retroactividad. Si TODO el ciclo se pagó puntualmente, solo +1 a la racha. Ejemplo con nivel 2 (6%): dos perfiles de $49 pagan $46.06 cada uno (total $92.12), sujeto a los redondeos por acceso y a la verificación exacta del ciclo. El estado global heredado $92 es diferente por diseño; no cobrar una diferencia sobre un período ya liquidado.

**Pruebas ejecutadas en Supabase con ROLLBACK:** `supabase/tests/20261012_b2_libro_real_atómico_reversible.sql`, dos fechas 5/15, mora separada, abono parcial del primer acceso conservando mora, liquidación individual, segundo acceso, bloqueo de doble cobro global, una racha, un recibo, idempotencia y siguiente ciclo. `20261012_b2_lealtad_seis_reversible.sql`, nivel 2/6% en dos accesos X2, liquidación puntual, una racha y renovación automática. Cotización reversiblemente probada además con las fechas reales de Nayeli, **sin activarla**. `scripts/mora-multifecha-smoke.mjs` y `scripts/lealtad-multifecha-smoke.mjs` entraron a `npm run verify`; workflow separado `GOXION · B2 Backend` aprobado.

**Operación efectivamente desplegada:** migraciones 013-018 y Edge Functions independientes `acciones-financieras-b2-beta` y `estado-financiero-b2-beta`, ambas con verificadores HMAC propios de sesión Admin/cliente. **No** se reemplazaron `acciones-financieras` ni `estado-financiero` oficiales (v10/v12), ni se activó régimen B2 para Nayeli u otro cliente, ni se integró Index visual. Comprobación: 22 estados oficiales correctos, delta=0, 28 recibos históricos, 0 afiliados, ciclos y abonos B2, permisos de aprobación sólo service_role y asesor de seguridad con 0 WARN.

**Siguiente frontera de salida:** revisión de contrato de selección/reportar comprobante en Index beta con `X-Client-Token` y asociación de evidencia a `cargo_id`; cambio de visualización del hero del total GLOBAL al total B2 confirmado cuando el régimen esté activo, sin perjudicar la UI de fecha única. Pruebas visuales WebKit/Safari y de subidas y Admin; después prueba de activación controlada de Nayeli antes de declararlo oficial. Nunca activar cliente B2 mientras Index oficial siga mostrando únicamente el importe del estado global.


## Prórrogas · regla acordada y protección contra abuso (12/oct/2026)

El **abono parcial deja de ofrecerse al cliente** en la beta Index y queda como herramienta excepcional de Admin (se conserva la infraestructura). Se ofrece **pactar fecha**, solicitud no aprobada automáticamente: una por cliente y período, hecha antes o durante la fecha de vencimiento original, con extensión **máxima de cinco días** y revisión de Admin. No se reabre un acuerdo rechazado/cancelado ni se permiten fechas renovadas del mismo ciclo. La prórroga autorizada protege lealtad y suspende mora **solo si se paga a más tardar en la fecha pactada**. Si al día siguiente no se paga, **recupera retroactivamente desde la fecha original TODOS los días de mora (5% diario, tope individual 50%)**, pierde la lealtad global y se retira descuento de otros vencimientos aún pendientes. Los pagos que ya estaban aprobados no se recalculan retroactivamente.

**Fecha única:** migración 021 `goxion_estado_cuenta_core_v1` preserva el día de pago original; durante el acuerdo sustituye el corte operativo, al incumplir vuelve al corte original para mora y lealtad. Trigger `goxion_proteger_prorroga_global` impide más de cinco días, aprobación tardía, cambiar fecha una vez guardada y reutilizar un ciclo. Probada reversiblemente con 15→18 oct: al pagar el 18, $0 mora y 6% lealtad; al 19, cuatro días retroactivos y lealtad perdida. **Aplicado a Supabase** tras verificar cero diferencias en 22 clientes sin acuerdos. No se modificaron pagos ni contratos.

**Vencimientos distintos:** 019 `goxion_b2_prorrogas` (RLS, solicitud idempotente por UUID, una solicitud por ciclo, <=5 días) y RPC `goxion_b2_solicitar_prorroga` / `goxion_b2_resolver_prorroga`; 020 modifica cotización y aprobación B2 para proteger el plazo aprobado y recuperar días desde la fecha original al incumplir. Probado con dos perfiles de $49: el 7 y 11 de noviembre el perfil prorrogado 6→11 mantiene lealtad y total conjunto $92.12; el 12, +$14.70 de mora retroactiva en acceso 1 y +$2.94 de lealtad perdida en cada acceso pendiente, total $112.70. Una mera solicitud no altera lealtad ni mora. **Aplicadas migraciones 019–020 en Supabase**, 0 clientes B2 reales activados.

**Edge Functions beta:** `estado-financiero-b2-beta` v2 expone `solicitar_prorroga` con X-Client-Token propio; `acciones-financieras-b2-beta` v2 expone `b2_listar_prorrogas` y `b2_resolver_prorroga` solo Admin. No se alteró la función Edge oficial.

**Diseño Index beta:** Servicios Contratados **antes** de Calendario; próximo vencimiento señalado con línea/dot y contraste premium, sin iconos genéricos encerrados en cápsulas; Próximo/Todo junto como opciones principales. En el acceso secundario «¿No puedes pagar en tu fecha?» se escoge día desde calendario y se comparan **pago dentro de fecha pactada vs importe al día siguiente de incumplir**, con desglose de mora retroactiva y descuento de lealtad perdido. Modal de confirmación final y aceptación explícita; modo demo nunca envía solicitudes ni comprobantes. Mi Espacio/Ayuda conserva destino futuro para gestión detallada; no atribuirle funcionalidades que aún no se integraron.

**Liberación:** permanece beta aislada, SIN cambios al Index oficial ni activación de clientes reales. Antes de operar prórrogas cliente real en B2 se necesita conectar aprobación visual de Admin y validar Safari/Index con un cliente opt-in controlado. La prórroga global de Admin actualmente validará cinco días por SQL; su frontend/gateway antiguos pueden seguir mostrando hasta 31 días y deberán actualizarse en su propia integración controlada para no inducir errores.


## Actualización F2 · comprobante vinculado y aprobación SQL (13/oct/2026)

**Instalado en Supabase sin activar clientes:** la RPC global `goxion_aprobar_pago_periodo_atomico` y su tabla de operaciones se aplicaron de manera aditiva, sin conectar aún el gateway oficial `acciones-financieras` ni tocar `periodo-cobro`. Prueba SQL real de aprobación global con dos fixtures temporales, incluido parcial y prórroga dentro del límite de cinco días, ejecutada con BEGIN/ROLLBACK → **PASS**. Archivo `supabase/tests/20261012_aprobacion_global_atomica_reversible.sql`. Se mantienen intactos 22 clientes y 28 recibos.

**Cobros B2 por comprobante:** nueva migración `supabase/migrations/202610130001_b2_comprobantes_transaccionales.sql` y endurecimiento `202610130002_b2_replay_comprobante_estricto.sql`, instaladas en base real, crean tabla de reporte, relación comprobante → cargos, RPC de reporte sin acreditación y RPC administrativa de aprobación de uno o varios cargos. La transacción acredita mediante `goxion_b2_aprobar_abono`; se rechazan monto sin cuadrar, acceso ajeno, repetición de cargo/operación y pagos parciales sin autorización excepcional; cualquier fallo revierte el comprobante entero. La repetición con MISMA operación y DIFERENTES cargos, importes o modalidad también se rechaza (identidad de solicitud almacenada), no se interpreta como reintento equivalente.

**Pruebas de integración SQL reversibles ejecutadas en Supabase:** `supabase/tests/20261013_b2_comprobantes_reversibles.sql`, cliente ficticio con dos fechas, reporte único sin acreditación, 2 asignaciones, fallo inyectado en la segunda que revierte la primera, liquidación con único pago global, reintento idéntico inocuo, clave diferente y mutación de reparto rechazadas → **B2_COMPROBANTE_ATOMICO_PASS_SIN_COMMIT**. Al acabar: 22 clientes, 28 pagos, 0 cuentas B2 activas, 0 reportes, 0 aplicaciones, 0 ciclos y 0 abonos. `anon/authenticated` sin EXECUTE en RPCs; sólo `service_role`.

**Gateway B2 separado, versión 3 desplegada:** `docs/edge/acciones-financieras-b2-beta/index.ts` mantiene HMAC Admin, añade `b2_aprobar_comprobante` asociado al reporte y devuelve error `B2_REQUIERE_COMPROBANTE` ante la acción directa `b2_aprobar_abono` (sin evidencia). Se incorpora a las pruebas del backend `scripts/b2-comprobante-ledger-smoke.mjs`. El gateway **oficial** y el flujo de pagos habitual NO se han reemplazado.

**Puertas críticas AÚN ABIERTAS — F2 NO FINALIZADA:**
1. **Evidencia de comprobante:** Index cliente todavía no reporta contra el libro B2 ni existe integración segura del archivo cargado con `evidencia_ref`. Nunca exponer la nueva RPC pública aceptando sólo una ruta declarada por el navegador. La infraestructura de reporte espera un comprobante autenticado y almacenado/validado (posteriormente se integrará visualmente en F3).
2. **Atribución comercial:** `goxion_b2_iniciar_ciclo` BLOQUEA promociones, combos, cupones/programados, especiales, Trato Justo, mora ajena y cualquier diferencia entre total y lealtad. `verificarAtribucionB2` es evidencia SOMBRA y retorna `cobrable:false`. No inventar distribución; falta mecanismo SQL atómico de asignación y consumo único verificable por obligación.
3. **Despliegue global oficial:** `acciones-financieras` v10 y `periodo-cobro` v3 conservan aprobación legacy; la nueva RPC global está lista pero no conectada al flujo oficial. Deben validarse reintentos, triggers de consumo de beneficio, avisos, concurrencia y rollback al cambiar gateway, sin poner en peligro cobros próximos.
4. **Estado multiplataforma e instrumentación:** probar estados de revisión/rechazo, carga auténtica, promociones y notificaciones de pago. No habilitar Nayeli ni F3 todavía.

**Decisión conservadora:** mantener PR #96 en borrador, F2 en ejecución, sin activar clientes ni reescribir Index/Ayuda/Admin. CI verde del backend es necesario pero no prueba los puntos 1–4.

### Hallazgo F2 · autenticidad de captura en Index
La página oficial `assets/js/index/02-02-inline.js` (función `enviarComprobanteDiscord()`) entrega la imagen mediante `FormData` a Discord. **No existe objeto persistido verificable en la base de datos que vincule el archivo con `cargo_id`**, y la tabla `storage.buckets` de Supabase estaba vacía en la auditoría. Un simple `evidencia_ref` enviado por el navegador NO es prueba auténtica de pago.

**Requisito técnico obligatorio antes de exponer `goxion_b2_registrar_comprobante`:** crear canal seguro de captura con identidad `X-Client-Token`, comprobar tipo/tamaño e integridad de archivo en servidor, persistir evidencia privada o referencia validada, vincular selección exacta de cargos y registrar comprobante con idempotencia. El gateway B2 Admin v3 ya exige recibo existente. La migración no ha abierto el endpoint del cliente; evitar falsas acreditaciones. El envío de Discord actual queda intacto para clientes legados y NO sirve como prueba de imputación B2.


### F2 · evidencia privada e identidad por cargo (13/oct)

**Backend adicional instalado (sin interfaz ni clientes reales):**
- `supabase/migrations/202610130003_b2_prueba_privada_y_cargos.sql` creó el bucket privado `goxion-b2-evidencias` (sin acceso público, 6 MB, imágenes JPEG/PNG/WEBP) y añadió `cargos_solicitados` al comprobante B2.
- La función de reporte antigua, que recibía un texto de evidencia sin verificar el archivo, queda deliberadamente bloqueada. La nueva RPC `goxion_b2_registrar_comprobante_seguro` comprueba cliente/ciclo opt-in, identidad exacta de cargos no pagados, cotización B2 del servidor, archivo de `storage.objects` en bucket privado y clave idempotente.
- `goxion_b2_aprobar_comprobante` ahora también comprueba que las obligaciones aprobadas son **exactamente** las elegidas al reportar, para que Admin no pueda cambiar de perfil al acreditar.
- Se versionó y desplegó `docs/edge/comprobantes-b2-beta/index.ts`, Edge Function separada `comprobantes-b2-beta` **v1**, con HMAC `X-Client-Token`, comprobación MIME + firma de archivo, 6 MB, hash SHA-256, nombre privado por cliente/operación, sin reutilizar nombre original, `upsert:false`, y registro SQL de estado `reportado`; cliente **nunca aprueba**.
- La prueba SQL reversible se actualizó para incluir fila de índice de evidencia privada ficticia y comprobar rechazo de la función antigua o archivo inexistente. La corrida volvió a responder `B2_COMPROBANTE_ATOMICO_PASS_SIN_COMMIT`. La prueba SQL sólo demuestra validación de fila `storage.objects`; **la subida real binaria con token legítimo todavía requiere prueba controlada end-to-end**. En producción hay 0 archivos, 0 comprobantes, 0 clientes B2 activos.

**F2 aún por cerrar:** pruebas integrales de upload autenticado, atribución/consumo de descuentos y cupones por obligación, compatibilidad de todos los triggers con aprobación por acceso y transición controlada del gateway global oficial. Si alguno falla, el sistema debe rechazar B2 para esa cuenta y conservar el régimen heredado. F3 visual sigue bloqueada.
