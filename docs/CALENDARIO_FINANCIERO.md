# GOXION · Calendario financiero por servicio

**Fase 1: beta de cálculo y aplicación simulada.** 11 de octubre de 2026.


## Corrección X2 e integración visual Admin · 11/oct/2026

**Problema confirmado en base real:** ViX Premium (x2) ($98) y YouTube Premium (x2) ($178) se almacenan como **una sola fila** de `cliente_servicios`. Por tanto, una fila no siempre equivale a una sola fecha de renovación.

**Solución beta sin migrar contratos:**
- `desglosarUnidades()` interpreta la cantidad explícita **`(x2)`** (soporta x2–x12), genera IDs virtuales estables `<cliente_servicio_id>#1` y `#2`, y conserva `cliente_servicio_id` para identificar el contrato original.
- La fecha pagada, día de origen, ajuste proporcional y elección de pago son **independientes por unidad**.
- Los centavos del monto contractual se reparten determinísticamente, sin crear dinero ni duplicar cargos (por ejemplo, $178 → $89 + $89, $98 → $49 + $49). El reparto comercial es **estimativo hasta validación**, porque una sola fila no identifica los precios ni las coberturas pactadas de cada perfil.
- Un combo entre marcas, como «HBO Max + Prime», **no se divide por interpretación del nombre**. Si se requiere una fecha individual dentro de un combo, habrá que modelar su paquete y componentes expresamente.
- La lista de calendarios cuenta las unidades que contiene X2, aunque la contratación original continúe existiendo como una sola fila. No modifica precios ni fecha en el modelo oficial.
- No se ejecutan escrituras y `listo_para_acreditar` permanece falso.

**Experiencia visual:** el enlace de prueba vive **dentro de Clientes → Servicios del Admin existente**, como un pequeño acceso «Fechas de renovación · Simular». Un diálogo modal conserva la ficha de cliente y aloja `preview/calendario-financiero/index.html?embedded=1&cliente=<uuid>`, ocultando encabezado, selector de cliente y pasos redundantes. Los detalles avanzados de cada perfil están recogidos de forma opcional. No se tocó el diseño de Ayuda ni Index.

Código de integración: `assets/js/admin/32-admin-calendario-beta.js` y estilos exclusivos en `assets/css/admin.css`.
Pruebas: `scripts/calendario-financiero-beta-smoke.mjs` (52 casos matemáticos, incluyendo X2), `scripts/calendario-financiero-ui-smoke.mjs` y `scripts/calendario-admin-integracion-smoke.mjs`.

**Siguiente fase, antes de cobros reales:** registro persistente opcional por `cliente_servicio_id + unidad` para coberturas individuales, importe verificable por perfil y aplicación transaccional a cada obligación. Los IDs virtuales X2 NO son todavía líneas comerciales independientes persistidas.

## Arquitectura

Se extendió la función Edge oficial **estado-financiero** (v5) con dos acciones protegidas por la sesión HMAC de Admin: **listar_calendarios_beta** y **simular_calendario_beta**. No se creó otro motor financiero. Las nuevas rutas son de **solo lectura** y no modifican clientes, servicios, pagos, mora, créditos o períodos existentes.

Código versionado:
- docs/edge/estado-financiero/index.ts
- docs/edge/estado-financiero/calendario-beta.mjs

Interfaz para pruebas: preview/calendario-financiero/index.html. No se ha modificado Admin, Ayuda ni Index.

## Qué simula

1. Cada servicio conserva su **fecha de cobertura pagada** (primer día aún no cubierto), si el administrador la introduce y confirma. Por omisión se utiliza el corte heredado del cliente **únicamente como una hipótesis**, no como fecha verificada.
2. Agrupa servicios por vencimiento y permite elegir **próximo**, **todos juntos** o **servicios específicos**.
3. Calcula un importe base en centavos para cada obligación con su rango de cobertura. Permite simular un pago parcial y reparte únicamente entre conceptos seleccionados, por fecha, sin adelantar otros servicios.
4. Ofrece unificación opcional de día del mes. El cálculo solo **extiende** el período ya pagado, sin recortarlo ni cobrar los mismos días dos veces. Los días se cuentan según el ciclo real, con meses bisiestos y fechas ancladas 29/30/31.
5. Emite advertencias ante fechas no confirmadas, promociones, descuento o saldo total diferente al motor oficial.

**Pagar varias plataformas con una transferencia no unifica sus fechas de renovación.**

El cálculo de ajustes todavía no incluye un saldo a favor por un cambio contractual que reduzca cobertura: esto requiere verificar derechos pagados, aceptación del cliente y un asiento contable. Ningún retroactivo se cobrará automáticamente.

## Reglas críticas

- La fecha de registro de un servicio NO se utiliza como prueba de inicio de cobertura.
- El importe base de cliente_servicios NO sustituye el total del motor oficial si intervienen promociones, combos, Trato Justo, lealtad, mora, pagos parciales o pagos en revisión.
- No hay escritura ni aplicación real de pagos. La simulación solo muestra asignaciones por servicio y ciclo; jamás marca un período pagado.
- Clientes con el mismo día 15 o cualquier otro día mantienen intacto el flujo anterior.
- Solo un Admin con sesión válida accede a la beta.

## Pruebas y evolución

**npm run test:calendario**: 39 pruebas deterministas de cálculo, cobertura, pagos conjuntos/parciales y prorrateos, más pruebas de interfaz con sesión ficticia y comprobación de que no se hace ninguna escritura. Incluido en **npm run verify**.

La segunda fase debe crear, con migración compatible, un calendario opcional por contrato, un registro único de obligación por servicio/rango y una aplicación de pagos asociada al pago aprobado. Solo entonces se conectará Index para pago de uno o varios períodos y Ayuda para indicar exclusivamente **próximo a vencer**. No duplicar CSS ni componentes visuales entre Admin, Ayuda e Index.

**El motor financiero oficial y su fallback permanecen vigentes sin cambios en sus acciones anteriores.**
