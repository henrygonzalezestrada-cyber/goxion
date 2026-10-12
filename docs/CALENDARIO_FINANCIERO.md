# GOXION · Calendario financiero por servicio

## Estado comprobado · 11/oct/2026 (fase A operativa solo en Admin)

**Persistencia por acceso real habilitada y protegida; cobros oficiales intactos.** Se creó `public.goxion_calendario_accesos` con FK a `cliente_accesos.id` (identidad física X2), verificación del contrato/precio, control de fechas y `goxion_calendario_auditoria` con evento por modificación. Migración: `supabase/migrations/202610110001_calendario_accesos_sombra.sql`.

La Edge oficial `estado-financiero` mantiene `mi_estado` y sus acciones existentes. Bajo sesión HMAC de Admin, ahora `simular_calendario_beta` recupera calendarios guardados y `guardar_calendario_beta` los persiste mediante una operación SQL transaccional y auditada. Admin ofrece **Guardar fechas** únicamente cuando el contrato puede relacionarse inequívocamente con accesos técnicos reales. «Usar fecha general» desactiva la cobertura guardada **en la simulación** hasta confirmar un nuevo guardado. Se verificó la operación SQL de guardar X2 dentro de una transacción con `ROLLBACK`, sin datos persistidos de prueba. 56 casos deterministas verifican tarifas iguales/desiguales, fechas y pagos simulados.

**Límite actual crucial:** el guardado registra la configuración, NO crea deuda, NO aplica una transferencia a obligaciones ni acredita pagos. Los montos mostrados siguen siendo base/estimados cuando existen descuentos, promociones, mora o saldo en revisión. En Ayuda e Index se mantiene el estado de cuenta anterior hasta completar la conciliación financiera. No se han migrado automáticamente fechas de clientes. La etapa siguiente sigue siendo modelar obligaciones independientes y su conciliación idempotente en `acciones-financieras` antes de comunicar importes pagables al cliente. La interfaz móvil Safari requiere aceptación visual en dispositivo real.

**Nota histórica:** la documentación inferior describe el origen en modo sombra; las funciones de simulación continúan sin efectuar cargos, aunque ahora existe un guardado administrativo separado.


**Siguiente fase:** modelo persistente de obligaciones y pagos antes de exponer fechas a clientes. Ver `docs/GOXION_MULTI_DATE_ROADMAP.md` (backend → Index → Ayuda), y contrato de identidad en `docs/GOXION_VISUAL_CONTRACT.md`. Una prueba de simulación no acredita pagos ni completa visualmente las pantallas.



## Refinamiento de experiencia · octubre 2026

- La pantalla principal muestra **una fila por contratación**, incluso si contiene dos o más accesos (X2). Nombre e importe aparecen **una sola vez**; se resumen la primera fecha y, cuando aplica, la siguiente fecha distinta.
- «Fechas ›» abre **un solo detalle contextual** para el contrato seleccionado, con filas compactas «Acceso 1», «Acceso 2» y su fecha. Los demás contratos no generan editores desplegados simultáneamente.
- Las fechas individuales se editan exclusivamente con **calendario nativo** (`input type=date`); GOXION deriva la ancla del día automáticamente y preserva los cálculos de cobertura. «General» restaura la simulación de fecha heredada de ese acceso.
- El cambio de día conjunto también usa un **calendario**, aunque el motor conserva la recurrencia mensual por día. El calendario solo elige el día común: no acorta coberturas ya pagadas.
- El pago «vence primero» y «todo junto», selección avanzada, simulación de abonos, totales y advertencias continúan funcionando. Solo cambia la presentación.
- No se alteraron ni Finanzas oficial, ni los saldos reales, ni Ayuda o Index. Se actualizaron pruebas de interfaz y X2 y se forzó recarga de la vista en Safari para evitar HTML anterior en caché.

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

## Simplificación visual de la beta · 11/oct/2026

Se conserva la ubicación **Admin → Clientes → Servicios → Fechas de renovación → Simular**. La superficie no es otro panel administrativo: usa la tipografía, jerarquía y contenedor del expediente original.

El recorrido visible quedó reducido a **Servicios (fecha e importe), Pago que quieres revisar (vence primero o todo junto), e importe estimado**. Cada perfil X2 se identifica individualmente y presenta solo un enlace **Cambiar fecha**, que expone «Renueva cada día» como selector del 1 al 31 y el próximo vencimiento con calendario; se recalcula automáticamente. «Elegir perfiles», abonos, unificación y detalles de advertencias aparecen únicamente si se abren sus opciones secundarias. No hay formulario de pasos, botón de actualización necesario, selector de otros clientes dentro del expediente ni términos técnicos para operar.

La indicación «próximo vencimiento estimado» es intencional: el calendario de cobertura por perfil aún no se ha confirmado/persistido en el modelo real. Todo continúa en lectura y simulación. **No** se alteran Admin financiero, Ayuda ni Index; se conservan los 52 ensayos de matemáticas y las pruebas de UI e integración en el expediente.

