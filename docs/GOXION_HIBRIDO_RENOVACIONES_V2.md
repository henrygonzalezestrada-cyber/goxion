# GOXION · Contrato V2 de renovaciones híbridas por acceso

**Estado:** corte de renovaciones por cobertura **desplegado en producción el 13/nov/2026** (SQL y Edge B2). La gestión dinámica de altas y bajas durante un ciclo B2 activo sigue **pendiente**, no anunciar V2 completa.  
**Origen:** incidente FIN-CALENDARIO-409 en Cliente Prueba (12/nov/2026).  
**Fuente contable:** motor único V1; nunca introducir un segundo escritor.

## Invariantes no negociables

1. **Alta sin bloqueo retroactivo.** Un nuevo servicio o acceso se incorpora con precio, fecha de alta y cobertura abonada independientes. No reabre el pago aprobado de otro servicio ni convierte automáticamente en deuda un periodo ya liquidado.
2. **Cobertura pagada ≠ próxima renovación.** `goxion_calendario_accesos.cobertura_hasta` identifica el fin de la cobertura conocida; el vencimiento futuro se calcula usando `dia_corte` y el mes calendario (incluidos 28, 29, 30 y 31).
3. **Cada obligación tiene dueño.** El cargo se asocia al acceso/servicio, ciclo y vencimiento; los comprobantes aprobados se aplican una sola vez mediante el motor V1. El periodo global heredado permanece para cuentas no convertidas.
4. **Cancelar no es borrar el pasado.** Cancelación al fin de cobertura detiene futuras obligaciones de ese acceso, mantiene pago y servicio hasta cobertura ya abonada y conserva comprobantes e historial. El resto de accesos sigue renovándose.
5. **Edición tras pago.** Los cargos cerrados y cobertura consumida son inmutables. Cambios futuros se reflejan mediante una versión de contrato/fecha efectiva, sin reescribir saldos históricos. No eliminar un servicio con cargos pendientes sin resolución explícita.
6. **Activación sin sorpresas.** La transición de global a B2 conserva suma, descuentos, mora, beneficios, créditos y auditoría. Debe probar la ausencia de doble cobro y bloquear únicamente inconsistencias monetarias reales.
7. **Un solo propietario de reglas.** SQL autoritativo en el motor, Edge autenticada de adaptador, Admin/Index/Ayuda como consumidores; no hacer cálculos de cobros autónomos en JS.
8. **Reversión y concurrencia.** Confirmación explícita, operación idempotente, bloqueo transaccional, pruebas ROLLBACK y no cobros ni recibos ficticios persistidos.

## Caso observado

`Cliente Prueba`: periodo pendiente **2026-12-01**, cobertura guardada y verificada de Crunchyroll **2026-11-15** (corte 15) y Google One **2026-11-30** (corte 30). Las próximas renovaciones son **2026-12-15** y **2026-12-30**. La validación productiva actual exige cobertura dentro de diciembre y confunde cobertura con vencimiento; por eso FIN-CALENDARIO-409.

## Implementación por cortes seguros

**Corte A — DESPLEGADO, proyección/diagnóstico (solo lectura):** RPC `goxion_b2_previsualizar_renovaciones` con accesos activos, cobertura, próxima renovación, verificación y vencimientos fuera del periodo; permisos exclusivamente `service_role`. Sin cambios en `pagos`, recibos, saldos o régímenes.

**Corte B — DESPLEGADO, transición B2 atómica:** cambiar juntos la prevalidación Edge y el escritor SQL `goxion_b2_iniciar_ciclo` para usar la misma proyección. El cambio se instaló tras prueba reversible de Cliente Prueba y comparación de las cotizaciones existentes de Luis/Nayeli; **no se ha aprobado una activación real de Cliente Prueba ni una prueba de pago real en Safari**. El escritor debe seguir reconciliando subtotal oficial y detectar pagos ya aplicados. Fuente canónica versionada: `supabase/migrations/202611130001_b2_renovacion_proyectada_v2.sql`, desplegada vía Supabase MCP tras pruebas reversibles.

**Corte C — PENDIENTE, altas y bajas posteriores a la transición:** contratos por unidad con `fecha_efectiva`, `cobertura_pagada_hasta`, `fin_al_renovar`, historial de revisiones e idempotencia; materializar solo cargos futuros exigibles. Cancelación conserva cobertura y recibos. No activar en Index una modalidad nueva hasta que Admin y el motor coincidan.

## Pruebas de aceptación

- Pago del día 15 liquidado, alta de otro servicio el día 20: no se toca pago del día 15 ni se cobra dos veces; próxima renovación individual correcta.
- Renovaciones 15 y 30 atravesando noviembre/diciembre; 31 en febrero y años bisiestos.
- Cancelar Disney+ para el próximo periodo preserva su cobertura actual y deja inalterados los demás cargos.
- Repetir alta, baja, comprobante, aprobación y reversión: importes y número de comprobantes constantes.
- Los dos clientes B2 actualmente activos conservan saldo, mora, historial y operación en Index.
- Conciliación contra un snapshot tomado justo antes y después del despliegue; no fijar en código el número histórico de pagos. En la verificación SQL del 12/nov hay 21 clientes y 41 pagos (incluido el comprobante recientemente aprobado del Cliente Prueba). Ninguna prueba deja escrituras definitivas.

## Criterio de promoción a oficial

No afirmar «corregido en producción» hasta que **SQL + Edge + Admin/Index/Ayuda** coincidan, pruebas reversibles pasen, rollback esté documentado y alias antiguos se retiren o se mantengan como compatibilidad con fecha de caducidad. El corte A y el escritor B están desplegados; **faltan pruebas reales de flujo Admin**, alta/baja en B2 activo y normalización del alias Edge antes del cierre completo.
