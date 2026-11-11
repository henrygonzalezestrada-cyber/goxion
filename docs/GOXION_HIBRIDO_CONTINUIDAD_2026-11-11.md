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


## Etapa 2 completada en entorno aislado: plan de transición, sin escrituras

- `docs/sql/GOXION_HIBRIDO_TRANSICIONES_V1.sql` reúne el **reductor determinista de estado** `goxion_hibrido_decidir_transicion_v1` y el planificador `goxion_hibrido_plan_transicion_v1`.
- La consulta híbrida ahora reutiliza ese plan. No hay una segunda lógica de detección de régimen en el lector.
- Señales verificadas: número de accesos, calendario/precio conciliados, B2 activo, existencia de ciclo, deuda del ciclo y de otros períodos, recibos globales aprobados, en revisión y parciales heredados.
- Entrada a multifecha: exige conciliación; si ya existe pago global/abono/revisión, **bloquea migración automática** para evitar doble crédito/deuda.
- Salida a fecha única: si hay obligaciones B2 abiertas, las conserva; si el ciclo está liquidado, **solo propone** transición para próximo ciclo (no muta el actual).
- Si existe conflicto entre recibo global y B2 en el mismo mes, o un saldo B2 de otro período, el lector **falla cerrado**: no devuelve saldo alternativo.
- Distinción de **días de corte contractuales** vs **fechas de vencimiento efectivas**: 30 y 31 siguen representando dos cortes en febrero aunque ambos venzan el 28. El RPC existente de activación B2 requiere dos vencimientos reales; cuando coinciden, el plan marca `MULTIFECHA_CORTES_COINCIDENTES_REQUIERE_ADAPTACION` y no activa nada.
- `supabase/tests/goxion_hibrido_transiciones_v1_regresion.sql`: 20 escenarios de transición más una aserción de febrero 30/31 y paridad sobre las 8 cuentas del entorno aislado.
- Los dos scripts de regresión SQL pasaron tras la integración. Todas las funciones nuevas conservan `cobrable=false` / `ejecutable=false` y permisos exclusivos del rol de servicio.

## Seguridad predespliegue

- `docs/sql/GOXION_B2_RESTRINGIR_DESACTIVACION.sql`: limita RPC `goxion_b2_desactivar_cliente` a `service_role`, sin modificar su código ni ejecutar desactivaciones. Instalado y comprobado **solo en el proyecto aislado**: `anon=false`, `authenticated=false`, `service_role=true`.
- **Producción aún no recibió ese cambio** y la alerta debe tratarse como pendiente antes de desplegar el futuro motor.

## No confundir con entrega final

Esta versión resuelve **diagnóstico, clasificación y planificación** de transiciones, no ejecuta cambios de régimen ni movimientos de dinero. Todavía son necesarias: una RPC autorizada de aplicación transaccional con idempotencia, los casos de promociones/Trato Justo/mora y cancelaciones con crédito, y reconciliación de pagos en el ciclo de transición. La funcionalidad de producción no debe cambiar por fusionar el PR de borrador.
