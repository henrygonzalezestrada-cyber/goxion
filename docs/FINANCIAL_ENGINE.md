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
