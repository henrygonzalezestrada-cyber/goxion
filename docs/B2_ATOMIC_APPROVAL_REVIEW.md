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
