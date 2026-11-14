# GOXION · hacer efectiva una solicitud de cancelación (oficial)

## Regla y fuente de verdad

**Aprobar** una solicitud no desactiva el servicio. **Hacer efectiva** sí lo hace, en la misma transacción en que se marca `solicitudes_cancelacion.estado='efectiva'`. Desde ese momento:

- `cliente_servicios.activo=false`, sin eliminar físicamente el contrato;
- `cliente_accesos` queda sincronizado por el trigger existente;
- Mi Espacio e Index consultan solamente servicios activos;
- Admin reconstruye sus tarjetas desde `admin-datos`, filtra `activo!==false` y coloca el registro en `servicios_historicos`;
- el detalle enfocado se cierra, vuelve a cargar y abre desde el modelo nuevo para no mostrar un nodo obsoleto;
- recibos, pagos y descuentos ya acreditados no se alteran.

## Propietarios: sin motores paralelos

- **Operación de negocio**: RPC privada `public.goxion_hacer_efectiva_cancelacion_admin_v1(uuid,text)` (migration `202611140004`). Bloqueo transaccional de solicitud y cliente, verificación de estado `aprobada`, idempotencia, y actualización indivisible.
- **Baja contractual financiera**: RPC preexistente `public.goxion_cancelar_servicio_admin_v1`. Si quedan dos o más servicios, mantiene conciliación B2 y retorno automático a fecha única. Si es el último, preserva al cliente y los pagos, pero rechaza ciclos B2 aún pendientes y parcialidades.
- **Adaptador Admin autenticado**: Edge oficial `cancelaciones-admin`, fuente `docs/edge/cancelaciones-admin/index.ts`. No escribe `cliente_servicios` ni solicitud por separado.
- **Presentación**: `assets/js/admin/20-admin-security-controller.js`, `gxReloadAdminClient` ya existente y filtro oficial de `02-admin-supabase-layer.js`.

## Estado previo verificado

Producción tenía **3 cancelaciones efectivas y 0 servicios activos asociados a ellas**. El defecto visible era el detalle Admin conservado tras recargar las tarjetas. Había 1 solicitud aprobada y aún no efectiva; **no se ejecutó**.

## Aceptación

1. Solicitud aprobada → botón Hacer efectiva → RPC exitosa → en ficha abierta Admin el servicio desaparece del activo, sigue en histórico y no aparece en Mi Espacio.
2. Reintento → `repetida:true`, sin doble auditoría ni movimientos financieros.
3. Solicitud pendiente/rechazada → error 409, sin desactivar contrato.
4. B2 con dos servicios y cargos sólo proyectados sin cobrar → auditar, conciliar y convertir a mensual si queda una fecha, sin dar por pagado nada.
5. B2 con comprobantes, abonos o prórrogas → 409; la solicitud permanece aprobada y el servicio activo.
6. Último servicio mensual → inactivo y expediente conservado; último servicio B2 con ciclo abierto → 409 para conciliación antes de la baja.

## Rollback

Ver `docs/rollback/2026-11-13_cancelacion_efectiva_admin.md`. **No** revertir datos ya cancelados editando contratos históricos; se reactiva únicamente por un alta nueva y fecha efectiva, con trazabilidad.
