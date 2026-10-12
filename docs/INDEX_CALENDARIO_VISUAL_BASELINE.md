# GOXION · Línea base visual para integrar fechas en Index

**Inspección de fuentes reales:** 11/oct/2026. Estado: **auditado sin modificar Index ni Ayuda**. Este archivo complementa el contrato visual \`docs/GOXION_VISUAL_CONTRACT.md\` y \`AGENTS.md\`. No afirma equivalencia visual en Safari real.

## Propiedad de la interfaz y orden de carga

- HTML: \`index.html\`, hoja única: \`assets/css/index.css\`, tipografía **Poppins** (no Rajdhani).
- Adaptador autenticado: \`assets/js/index/01-index-supabase-layer.js\` intercepta \`clientes.json\`, recupera sesión desde \`GOXION_CORE.STORAGE.CLIENT_TOKEN\` y compara estado financiero oficial con el heredado. **No sustituir por acceso público a otros clientes**.
- Estado de cuenta renderizado desde \`assets/js/index/02-02-inline.js\` dentro de \`cargarEstadoCuenta()\` (no el HTML estático): modificar un único fragmento allí o usar integración localizada; nunca reconstruir todo el documento.
- Comportamientos complementarios en \`assets/js/index/03-03-inline.js\` y \`04-realtime.js\`. Antes de cambiar un evento, identificar su propietario y el script que se ejecuta después.

## Mapa visual existente: conservar exactamente la jerarquía

| Nivel | Elemento actual | Regla |
|---|---|---|
| Fondo | \`.bg\`, \`.lava-1\` a \`.lava-4\` | Mantener el ambiente, brillo moderado, filtros y \`prefers-reduced-motion\`. |
| Bloque superior fijo | \`.sticky-area\`, \`.header\`, \`.balance-hero\`, \`.total-label\`, \`.total-amount\`, \`.time-badge\` | No cambiar altura, tipografía, animaciones ni relación de jerarquía; el importe oficial **siempre** manda. |
| Borde fundido | \`.gx-payment-v2 .sticky-area::after\` | Conservar transición difuminada al scroll, sin bordes sólidos ni desplazamiento de contenido. |
| Cuerpo | \`.scrollable-content\` | Mantener scroll independiente del bloque superior y su margen; añadir, como máximo, una sección breve dentro del flujo existente. |
| Identidad y período | \`.glass-card.card-info\`, \`.info-block\` | Preservar nombre, folio, período y corte heredado salvo que motor autorice un cambio real. |
| Servicios | \`.glass-card.services-container\`, \`.service-item\` | Una contratación una fila; nunca dos tarjetas enormes por el mismo X2. |
| Desglose | \`.glass-card.breakdown-box\` | Seguir importes del estado financiero oficial, con lealtad, promociones, mora y revisión. |
| Beneficios | \`.glass-card.loyalty-badge\` | Sin reorganizar ni cambiar estilos. |
| Acciones | \`.actions-group\`, \`.gx-payment-primary\`, \`.gx-bank-trigger\`, soporte | Protagonismo de «Ya realicé mi pago» intacto; soporte secundario. |
| Cuentas | \`#bank-modal\`, \`.gx-bank-sheet\`, \`.gx-wallet-card\` | Carrusel de Nu/Revolut, copia de CLABE, fondos, blur y cierre sin alteraciones. |
| Comprobante | \`#payment-modal\`, \`.gx-payment-upload-sheet\`, \`#btn-enviar-comprobante\` | No duplicar formulario ni alterar \`pagoActualInfo\`. La acción reporta comprobante, **no acredita pago**. |

## Restricciones financieras detectadas

- La Edge \`estado-financiero\` tiene \`mi_estado\` **oficial** y \`mi_calendario\` **informativo**, ambas bajo \`X-Client-Token\`.
- \`mi_calendario\` no devuelve importe de deuda, no crea una obligación y solo responde con detalle cuando **todas** las fechas de servicios activos están confirmadas y conciliadas al precio contractual.
- Caso real de regresión: ViX X2 (dos accesos con fecha propia) tiene base comercial $98, pero saldo oficial de un período puede ser $92. **No inferir dos cargos exigibles de $49**.
- Hasta que exista conciliación de obligaciones, promociones, lealtad, mora y pagos aprobados, no mostrar «Pagar próximo» ni «Pagar todo» modificando \`pagoActualInfo\`, \`totalFinal\` o \`btnAccionHTML\`.
- El método oficial de pago y sus estados deben permanecer idénticos cuando haya una sola fecha o calendario incompleto.
- \`mi_calendario\` **todavía no se consume visualmente**. No integrarlo silenciosamente ni introducir otra pantalla secundaria.

## Hipótesis de integración mínima, NO aprobada

Una vez que el backend entregue importes *cobrables* conciliados: una única fila/miniacordeón en \`.scrollable-content\` **después de la tarjeta titular/período y antes de Servicios Activos**. Primera línea «Próximo a vencer» (fecha + monto del próximo compromiso); detalles futuros plegados; selector contextual próximo/todo y CTA principal intacto. Poppins, ancho de las tarjetas existentes, aire semejante y color de información neutro; sin nuevas lámparas de lava, cabeceras, carouseles, chapas o modales.

**No activar esta hipótesis hasta que los cálculos sean confiables y el usuario vea/valide la beta.**

## Pruebas obligatorias antes de publicar UI

1. Crear fixture de una fecha y confirmar captura **sin ninguna diferencia visual** contra Index original.
2. Fecha múltiple confirmada: una sección compacta sin scroll horizontal, alturas o sombras que compitan con el total.
3. Verificar 280, 320, 360, 375, 390, 430 y 768 px, portrait y landscape, Safari/WebKit iOS cuando haya acceso.
4. Comprobar apertura/cierre y conservación del scroll; no cerrar tarjetas por realtime.
5. Revisión completa: pagado, pendiente, vencido, suspendido, parcial, en revisión, sin servicios, X2, combo y fechas incompletas.
6. CTA «Ya realicé mi pago», selección Nu/Revolut, CLABE y envío de comprobante **sin regresiones**.
7. Igualdad financiera: el total del hero debe seguir el motor oficial; cero dobles cargos por perfil.
8. No afirmar «validado en Safari real» sin una prueba en dispositivo real. Tests estáticos no equivalen a screenshots.

**Próximo paso recomendado:** cerrar conciliación transaccional de obligaciones/pagos en backend y después preparar una beta acotada de Index con capturas comparativas, sin afectar \`index.html\` oficial.
