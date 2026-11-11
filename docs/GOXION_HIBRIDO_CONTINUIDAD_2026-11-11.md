# GOXION · Motor financiero híbrido · inicio de consolidación (11/nov/2026)

## Objetivo aprobado

Elevar el sistema existente, no reconstruirlo. Mantener las reglas oficiales de promociones, lealtad, Trato Justo, mora, reactivación, acuerdos y pagos aprobados, combinándolas con obligaciones por acceso y vencimiento. Una **sola fuente de saldo por ciclo** debe alimentar Index, Admin y Ayuda. No cambiar interfaces, Index animado, ni integrar Gixys.

## Etapa implementada: lector híbrido NO cobrable

- Prototipo: `docs/sql/GOXION_HIBRIDO_LECTURA_V1.sql`; función `goxion_hibrido_estado_financiero_v1(uuid,date)`.
- Únicamente se instaló en proyecto aislado B2 `nsvybyvvdpdgbgtvydfb`; no se instaló en producción.
- Lectura compatible y transitoria: con régimen/ciclo B2, el saldo proviene **exclusivamente** de cargos B2; sin B2, utiliza temporalmente el estado global heredado.
- El modo operativo (`fecha_unica`/`multifecha`) deriva de accesos activos, calendarios verificados y fechas distintas del período. **No migra ni desactiva regímenes automáticamente**.
- Si falta un ciclo, hay un desacuerdo de cargos o existen obligaciones B2 históricas sin liquidar al salir del régimen, devuelve `requiere_revision=true` y **no devuelve una deuda global sustitutiva**.
- El prototipo no es un nuevo checkout: todo resultado declara `cobrable=false`. Solo `service_role` puede ejecutarlo; función `SECURITY INVOKER`.
- Preserva pagos, cargos, fechas, auditoría, migraciones y funciones existentes; no escribe ninguna fila.

## Pruebas realizadas en aislado

`supabase/tests/goxion_hibrido_lectura_v1_regresion.sql` compara cotizaciones B2 y saldos globales por cliente, rechaza importes negativos, exige `cobrable=false`, y comprueba que las inconsistencias fallen sin devolver monto.

Resultado de 8 casos: **4 B2 conciliados, 2 globales conciliados y 2 sin ciclo B2 preparado señalados para revisión**. No se modificó la base de producción.

## Riesgos pendientes antes de habilitar cobros

1. **Motor transaccional único todavía no existe.** La lectura compartida no reemplaza las rutas separadas de activación, comprobantes, descuentos, mora y aprobación. No fusionar este PR ni activar el prototipo como fuente cobrable.
2. Definir obligación por acceso/fecha/cobertura con versión de contrato; proteger saldos históricos de cancelación y transición sin borrar pagos.
3. Especificar reglas contractuales por fecha: descuentos y promociones atribuibles, lealtad global, prórrogas, mora sobre saldo restante, reactivación, saldo a favor, meses cortos y cambios de calendario.
4. Implementar transición **unificada, atómica e idempotente** en backend al aprobar cambios comerciales y de calendario. Calcular modo a partir de fechas vigentes, pero no materializar nuevos cargos ni desactivar B2 mediante una simple consulta.
5. Migrar primero los mecanismos de aplicación/aprobación a una única transacción autorizada. Rechazar dobles cargos, reintentos y pagos en revisión.
6. Corregir el acceso público a `goxion_b2_desactivar_cliente` antes de usarla en producción.
7. Probar los casos reales (sin modificarlos): Nayeli, 6 noviembre pagado y 30 pendiente; Luis, cancelación de acceso y transición. Testear también cero accesos, X2, misma fecha, diferente fecha, pago parcial, promociones, mora/prórrogas y concurrencia.
8. Solo con paridad aprobada, actualizar un contrato Edge oficial y conectar consumidores de Index/Admin/Ayuda sin alterar diseño. Registrar migración, runbook y rollback.

## Requisitos de aceptación final

- Una sola cotización autoritativa por ciclo, un único saldo reproducible en todas las pantallas.
- Los abonos acreditados reducen la obligación correspondiente exactamente una vez.
- Un cambio de fecha/recuento de accesos cambia el modo sin generar una mensualidad paralela.
- Historial inmutable, centavos exactos, límites de descuento/mora y control de permisos.
- Pruebas SQL y funcionales tanto en aislado como en modo solo lectura de producción antes de desplegar.
