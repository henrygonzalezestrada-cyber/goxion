# Admin · Alertas rojas de prórrogas incumplidas
**18 de noviembre de 2026 — actualización operativa (solo lectura)**

## Comportamiento
- `admin-operaciones` v10 implementa la consulta autenticada `listar_prorrogas_incumplidas`. No contiene escrituras ni retira accesos.
- La señal roja aparece **al día natural siguiente** a la fecha pactada (zona horaria `America/Mexico_City`) y solo cuando existe una prórroga B2 aprobada, cargo no liquidado con saldo positivo, contrato y acceso aún activos.
- Incluye nombre de cliente, folio, servicio(s) específicos, fecha pactada y acción para **abrir la ficha** en el Admin existente.
- Si existe un comprobante B2 `reportado` para ese cargo (o un reporte global de ese ciclo), se indica **Comprobante en revisión: no retirar todavía**, sin foco rojo para ese servicio.
- Si el cargo se liquida o el acceso/contrato se desactiva, deja de generar la alerta. Las demás suscripciones del cliente no se incluyen.
- Aparece en **Inicio** y **Operaciones**; se refresca al iniciar sesión, recuperar foco/visibilidad y periódicamente. Un error al consultar se muestra como error de verificación, nunca como «cero alertas».
- **Mi Espacio no ejecuta suspensiones, retiros ni cambios automáticos**. El operador debe comprobar pagos y realizar las bajas por el flujo oficial.

## Archivos
- `assets/js/admin/35-admin-prorrogas-vencidas.js`
- `assets/css/admin-prorrogas-vencidas.css`
- `admin.html` (entradas de JS y CSS)
- `docs/backend/admin-operaciones.v10.prorrogas-incumplidas.ts` en rama `fix/ayuda-prorroga-vencida-revision`, fuente de la Edge Function desplegada.

## Comprobación
- Despliegue de la función `admin-operaciones` v10 confirmado ACTIVE.
- Verificación SQL de estado actual: no existen prórrogas B2 vencidas al 18/nov/2026.
- Simulación **solo lectura** con el cargo conocido de prueba y fecha hipotética posterior al vencimiento: activa foco rojo para el servicio correspondiente si sigue pendiente, sin comprobante en revisión.
- Smoke local estructural de la interfaz: la respuesta simulada muestra nombre, servicio y etiqueta de retiro manual.
- No se ha comprobado todavía con una prórroga realmente vencida en la navegación autenticada del operador. No crear un impago real solo para ilustrar el aviso.

## Pendiente
Validar en el flujo manual de cancelación/retiro que el contrato B2 con prórroga vencida y aún sin pago pueda retirarse **sin borrar registros contables ni afectar otros servicios**; hay salvaguardas anteriores que podrían impedir retirar un ciclo B2 con movimientos. No habilitar un botón directo de eliminación sin esa verificación.
