# GOXION · Conciliación de coberturas para reglas legales 2.0
Fecha: 21 de noviembre de 2026.

## Resultado verificado en producción
De 39 contrataciones con `cliente_servicios.activo=true`:
- 30 tienen todos sus accesos con calendario `verificado` y una fecha `cobertura_hasta`. Incluye 25 calendarios V1 conciliados en esta intervención, correspondientes a 11 clientes; 5 contrataciones ya tenían calendario verificado.
- 2 contrataciones con dos accesos y sin calendario financiero tienen **cobertura respaldada a nivel de contrato**, hasta el 15 de diciembre de 2026. Sus pagos de noviembre coinciden tanto con `pagos` como con `goxion_aprobaciones_pago_operaciones`. Se guardaron en `public.goxion_coberturas_legales_contrato` sin inventar ni repartir precios por perfil.
- 3 contratos figuran activos internamente, pero pertenecen a cuentas `suspendido`. No se han reactivado ni reescrito fechas a partir de borradores migrados. El despliegue legal deberá conservar la suspensión preexistente y excluirlos del cierre automático mientras no se reconcilien.
- 4 contratos activos de 2 clientes carecen de evidencia vigente suficiente (pagos históricos o discrepancias entre `periodo_pendiente` y pagos). No se les fijó fecha artificial. En fase general, las cuentas con contrato no corroborado deben permanecer `revision_manual` sin baja automática.

## Criterio estricto para los 25 calendarios V1
- Cliente `pagado` con `pago_revision_estado='aprobado'`, sin pago/comprobante/abono pendiente.
- `periodo_pendiente` es el mes siguiente a un registro `pagos` marcado `pagado`, y el periodo textual del pago coincide exactamente.
- Servicio y acceso activos; el alta del servicio no es posterior al pago validado.
- Calendario existente en `borrador`, con `dia_corte` igual al día oficial de pago del cliente y `precio_centavos` igual al precio único contratado, **sin modificar el precio**.
- Contrato de **un solo acceso**, régimen B2 inactivo y sin cargos B2 abiertos.
- La fecha de cobertura se establece en el día de corte del próximo `periodo_pendiente`, conservando el último día del mes cuando sea necesario.
- Autor de auditoría: `admin:conciliacion_pagos_v1_20261121`. Los triggers guardan antes/después en `goxion_calendario_auditoria`.
- Ningún campo de pagos, servicios, perfil, catálogo, lealtad, precios o sesiones fue modificado.

## Dos coberturas de contratos agrupados
Tabla: `public.goxion_coberturas_legales_contrato`.
- Llave primaria: `cliente_servicio_id`, referencias a cliente, pago y aprobación de pago.
- Guarda exclusivamente `cobertura_hasta`, evidencia y marca de confirmación, no crea ni edita calendarios de cobro.
- RLS habilitada; sin lectura/escritura para `anon` o `authenticated`. Solo el servidor puede consultar los datos.
- La futura validación general debe utilizar esta cobertura cuando la contratación tenga varios accesos y no exista calendario individual verificado; no inventar reparto de importes.

## Pendientes reales antes del despliegue general
1. Revisar **solo los 2 historiales de clientes** que contienen los 4 contratos sin última cobertura corroborable; no inferir pago donde no aparece.
2. Mantener las 3 cuentas ya suspendidas en su estado original sin proceder a una baja legal automática basada en una fecha histórica.
3. Integrar esta tabla de coberturas agrupadas en la lógica general de estados de acceso, aplicar validación a todos los endpoints y Admin, con fallo seguro `revision_manual` cuando falte evidencia.
4. Revalidar el estado de todos los servicios antes de desplegar, por si desde esta fotografía hubiera nuevos pagos, contrataciones o cancelaciones.

**Importante:** la conciliación de fechas fue desplegada; **la restricción general de términos todavía no fue activada**. Continúa el piloto de Cliente Prueba. Ninguna fecha sin evidencia ha sido marcada como `verificado`.
