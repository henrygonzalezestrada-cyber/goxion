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
