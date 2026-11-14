# GOXION · rollback de recurrencia B2 · 14/nov/2026 UTC

**Cambio efectivo:** migración `supabase/migrations/202611140002_b2_vencimiento_recurrente_v2.sql`.  
**Estado:** instalada en Supabase producción; fecha y comprobación de despliegue documentadas en PR #206.

## Antes del cambio
- SQL `public.goxion_b2_iniciar_ciclo(uuid,date)`: fingerprint MD5 `f15d98b7ff3247037f4a3f02bbb24c21`.
- SQL `public.goxion_b2_previsualizar_renovaciones(uuid,date)`: MD5 `605ff78befeaf40a94c46bd7f609d156`.
- No existía `public.goxion_b2_vencimiento_periodo(date,smallint,date)`.
- La Edge `acciones-financieras-b2-beta` v13 ya estaba desplegada antes de esta migración y coincide con la fuente del PR.
- Baseline: 21 clientes, 41 pagos, 2 regímenes B2 activos, 2 ciclos y 5 cargos.
- Huellas solo auditoría: pagos `6b35f2c0ce303367522997845e6219f1`, cargos `17942ab6960bcdb02607d4152cab8968`, calendarios `e69691c6f7ae721701008a8cc771c56d`.

## Cómo revertir sin destruir el historial

1. Revisar si se han activado nuevos clientes B2 o preparado ciclos después del despliegue. Si existen, **NO ejecutar rollback mecánico**: podrían quedar cargos cuyos vencimientos corresponden a una regla nueva; planificar conciliación de esos ciclos antes.
2. Si no hay ciclos nuevos, extraer las definiciones oficiales de `goxion_b2_previsualizar_renovaciones` y `goxion_b2_iniciar_ciclo` del archivo histórico `supabase/migrations/202611130001_b2_renovacion_proyectada_v2.sql`. Restaurarlas transaccionalmente y verificar las huellas previas de las funciones.
3. Tras comprobar que no quedan consumidores de `goxion_b2_vencimiento_periodo`, eliminar SOLO esa función auxiliar. Mantener el alias de Edge y las dos funciones V2 previas mientras las utiliza Admin.
4. Revalidar las cifras y los recibos sin modificar `pagos`, `cliente_servicios`, `goxion_b2_cargos` ni coberturas históricas. No eliminar pagos reales ni filas de auditoría.

## Evidencia del despliegue

- `apply_migration`: `success: true` en producción.
- Fingerprints posteriores: escritor `eb1978a36f511b67e0e8338ef8b5eed8`, previsualizador `013a01b3df00511b63d4aa732e593300`, auxiliar recurrente `032c2cb283275c4ce66f6b00decb2284`.
- Simulación real **Cliente Prueba** `BEGIN; ... goxion_b2_activar_cliente(...); ROLLBACK;`: devuelve `regimen_activo:true`, 2 accesos y operación aprobada.
- Lectura posterior: idénticos 21 clientes, 41 pagos, 2 regímenes activos, 2 ciclos y 5 cargos; huellas de pagos, cargos y calendario idénticas al baseline.

**Alcance:** desbloquea la elegibilidad de transición y la recurrencia de ciclos. No implementa automáticamente altas/cancelaciones contractuales de servicios DURANTE un ciclo B2 activo. Ese trabajo conserva estado pendiente.
