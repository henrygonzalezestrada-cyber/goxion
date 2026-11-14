# GOXION · rollback de quitar servicio con ciclo B2 sin cobrar

**Corte:** 13 noviembre 2026 (México) / 14 noviembre 2026 UTC.  
**Migración:** `supabase/migrations/202611140003_cancelar_servicio_b2_sin_borrar_historial.sql`.  
**Edge propietaria:** `admin-acciones` (ruta oficial v10 antes del cambio).  
**UI:** `assets/js/admin/03-supabase-v3-writes.js` consumida por `admin.html`.

## Estado verificado antes de la corrección
- 21 clientes, 41 pagos.
- 3 regímenes B2 activos, 3 ciclos, 7 cargos; Cliente Prueba: 2 cargos pendientes de diciembre (Crunchyroll $99, Google One $29), sin abonos/comprobantes/prórrogas/eventos.
- `pagos_fp=6b35f2c0ce303367522997845e6219f1`; `cargos_fp=450c699ef334a896571c955f08ffcb32`; `calendarios_fp=43597953a3efbc94396444c60aa503ff`.
- `admin-acciones` v10 original coincide con `docs/edge/admin-acciones/index.ts` antes del PR; blob SHA `8209816ba29b7f8aba166f6e9275fcb7dc24e822`.
- QA en entorno B2 aislado: `CANCELACION_B2_Y_MENSUAL_REVERSIBLE_PASS`; QA reversible en producción: queda un servicio, un día, $99 y B2 inactivo; se hizo `ROLLBACK`.

## Comportamiento oficial nuevo

`quitar_servicio_cliente` ya NO ejecuta `DELETE FROM cliente_servicios`. La Edge autenticada llama a una única RPC con permisos sólo para `service_role` que bloquea el cliente, rechaza cualquier ciclo comprometido, audita íntegramente un ciclo proyectado sin cobro antes de retirarlo y **marca el contrato inactivo, no lo destruye**.

Si queda una única fecha, reutiliza `goxion_b2_desactivar_cliente` y devuelve el cobro global sin duplicados. Si quedan fechas distintas, reconstruye el ciclo B2 mediante la RPC oficial existente. Reintentar la misma eliminación devuelve `repetida:true`.

## Restauración segura

1. **Si ya se canceló algún servicio con esta función, no restaurar el código antiguo ni borrar el rastro:** los contratos históricos, la auditoría de obligaciones anuladas y la conversión de régimen forman parte de la historia contable. Cualquier reversión de una cancelación requiere una **nueva alta con fecha efectiva**, no alterar pagos antiguos.
2. Si ningún operador la ha utilizado, redeplegar el código antiguo de `docs/edge/admin-acciones/index.ts` del commit anterior; conservar `verify_jwt=false` y la autenticación HMAC interna.
3. Restaurar JS y `admin.html` del commit previo para no enviar el parámetro nuevo. Solo entonces revocar `EXECUTE` y `DROP FUNCTION public.goxion_cancelar_servicio_admin_v1(uuid,boolean,text)`, si no quedan consumidores.
4. Verificar conteos, huellas de `pagos`, calendario y cargos. No tocar `goxion_motor` ni las dos funciones del motor de pagos V1.
5. Los fallos previos de pruebas visuales (morph de Ayuda y color de modales) no guardan relación con este cambio; no usar esos resultados como evidencia de QA financiero.

## Límites

Un ciclo ya reportado, con pagos, prórroga o beneficios asociados **no se cancela automáticamente**; responde HTTP 409 con texto claro. Requiere un proceso de cierre/cancelación futura, que se implementará por el propietario financiero sin sustituir ni duplicar el escritor V1.
