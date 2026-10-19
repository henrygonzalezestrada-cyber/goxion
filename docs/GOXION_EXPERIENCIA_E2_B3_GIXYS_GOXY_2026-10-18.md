# GOXION · Bloque E2/B3 — Goxy y los Gixys contextuales
Fecha: 18/oct/2026. Estado: beta integrada para revisión; NO aprobada todavía.

## Bases preservadas
- Goxy existe en el Soporte oficial de Ayuda desde F17; el Bloque 3 no recrea su IA, API o interfaz. Fuente: docs/GOXY_INTEGRACION_OFICIAL_LANZAMIENTO_2026-10-15.md.
- Gixys V9 es el diseño visual aceptado. Su motor original bot-avatars Plastic, sus burbujas, reacciones, diálogos, física y easter egg de prueba se reutilizan tal como están. No se modifica su versión previa.
- Los Bloques 1 y 2 ya están aprobados visualmente; no se reabren.

## Beta espejo
Nuevo directorio preview/experiencia-b3-goxy-gixys/ generado desde el espejo V9 real. Conserva ayudas CSS, pantalla, servicios, campana, lealtad, misiones, animations y materiales. Solo agrega controlador contextual de eventos y laboratorio pequeño, plegado por defecto.

Tres eventos sintéticos revisables:
- Aviso nuevo: la campana debe registrar un aviso no leído antes de activar un Gixy.
- Lealtad: la racha de ejemplo debe alcanzar el hito explícito 4/4.
- Misión: la tarea simulada debe llegar realmente al estado de completada.

Ningún Gixy aparece solo por cargar la página. Una transición repetida sin cambio real no genera un segundo aviso. Los eventos desactivados retiran el aviso correspondiente. Gixy comunica de forma breve y orienta; no intenta responder como un chatbot. La pestaña Soporte abre, solo al pulsarla, Ayuda oficial, donde ya está Goxy: sin inyección de datos en la URL, sin chatbot duplicado ni cobros. El laboratorio desaparece al disparar un evento, sin tapar a los personajes.

## Restricción de seguridad
La verificación de eventos por DOM es EXCLUSIVAMENTE de esta demostración ficticia. Para una integración real se requiere leer un sobre de evento autenticado y validado en servidor con ID de destinatario, ID único de evento, estado persistido, fecha, autorización, idempotencia y no repetición por cada refresco. No inferir mora, lealtad, misiones ni comunicaciones desde números o textos del cliente. NO reutilizar estas guardas de demo en producción.

## Criterios de aceptación
Workflow E2/B3 ejecuta test sobre Chromium/WebKit, anchos 280–768, ausencia de scroll lateral y peticiones privadas, aparición contextual, deduplicación, retorno a Goxy solo voluntario y conservación del motor V9. Tras éxito, publicar una beta espejo y pedir la evaluación visual del propietario. El paquete completo sigue bloqueado para producción por Issue #142.


## E2/B3 V2 — Coordinación de avisos prioritarios y entrega voluntaria a Goxy
Concepto aprobado por el propietario: integrar en una beta, sin reabrir B1, B2 ni la V9, la comunicación contextual y el botón hacia Goxy.

- **Animación auténtica:** utiliza el motor de prioridades original E1/B1 y copia sin reinterpretar su notice-demo.js V6 + smart.css. build.mjs solo adapta los IDs de campana para encadenar la tarjeta, cinta óptica y campana previamente aprobadas.
- **Prioridades de la beta:** comprobante con observación (100), vencido (90), revisión (85) y prórroga (70). Solo esos eventos ejecutan la animación de tarjeta. Avisos ordinarios y mensajes de tranquilidad no interrumpen Mi Espacio.
- **Gixy selectivo:** tras el impacto en la campana, solo corrección y vencido presentan al Gixy de notificaciones ya diseñado en V9, con el botón 'Preguntar a Goxy' junto a su burbuja y también desde el detalle de la notificación. Revisiones y acuerdos quedan registrados sin Gixy adicional. Lealtad y misiones preservan sus celebraciones sin CTA de soporte.
- **Goxy auténtico:** el botón solo responde al clic del cliente y abre la vista aislada preview/experiencia-b3-goxy-gixys/goxy-handoff.html, que carga Ayuda oficial en un iframe del mismo origen y activa su pestaña Soporte. No instala otro Goxy. No instala otra IA ni envía datos de cuentas por URL. Un contexto real autenticado NO se transfiere todavía: requiere backend con destinatario, ID de evento, estado de servidor y permiso de lectura.
- **No repetir:** un ID ficticio de evento ya consumido no vuelve a animar ni a crear otro Gixy al volver a cargar un mismo escenario de prueba en esa sesión. Sin cobros, cupones ni mensajes reales.
- **QA:** Chrome/WebKit, siete anchos, cuatro escenarios prioritarios y dos ordinarios; verificaciones de aparición/deduplicación, ausencia de Gixy en estados no urgentes, CTA contextual, Gixys V9 sin modificaciones, privacidad y no desbordamiento.

Estado: Beta integrada pendiente de aprobación visual del usuario. Bloques 1 y 2 aprobados, pero ninguna modificación funcional se incorpora a Ayuda/Index oficial. Continúa barrera de lanzamiento Issue #142.

## B3 V3 · Pulido final solicitado: desplazamiento, Goxy, paleta y saludo

El propietario revisó V2 desde iPhone y aprobó el concepto; pidió únicamente corregir cuatro detalles observados en la grabación de 18/oct: Gixys trabados al desplazarse, CTA «Preguntar a Goxy» desalineada y persistente cuando el cliente toca al Gixy, similitud entre los dos morados y salto vertical del contenido por saludo de una o dos líneas.

**Implementación estrictamente beta:**
- El motor V9 no se edita. Se conserva el mismo source Plastic/avatar y PulseHeart original, se compila un *fork local de escena* dentro de B3 (`src/companions.jsx` → `companions-v3.js`). Antes V9 llamaba a `setLayout` en cada evento `scroll`, repintando React+canvas. Ahora se calcula el anclaje al mostrar el personaje y solo se mueve la posición de su DOM en `requestAnimationFrame`, sin re-render de avatar por scroll. Al salir el ancla de pantalla el Gixy se desvanece y regresa al volver; no cambia de lado intempestivamente.
- La CTA se alinea al comienzo real de la burbuja y se integra en su ancho. Tras tocar al Gixy o cerrar su mensaje, un evento específico bloquea la CTA flotante y retira también la de la notificación; el observador no puede recrearla para ese evento. Para un evento nuevo podrá volver a ofrecer ayuda.
- Paleta V9 original de misión violeta `#8663ff` y notificación cian `#04c8ee` intactos. Solo el Gixy de lealtad pasa de morado `#9c6aff` a coral rosado `#ff83ab`, manteniendo el modelo Plastic y expresiones.
- Saludo con **alto constante de 79px**, texto centrado y escalado responsivo, independientemente de una o dos líneas; margen vertical uniforme, sin empujar tarjeta, lealtad, misiones ni contenido.
- Pruebas B3 específicas sobre Chromium y WebKit: continuidad visual en siete anchos, saludo 1/2 líneas sin variación del inicio de tarjeta, color diferenciado, canvas sin remount al hacer scroll, CTA alineada y desaparición al tocar, y todos los estados/contextos previos.
- No hay modificaciones a páginas oficiales, B1/B2, motor financiero, Supabase ni la V9 aprobada. Mantener barrera global de Issue #142.

**Estado:** beta V3 por validar y revisar visualmente en iPhone. No declarar cierre del Bloque 3 sin visto bueno del propietario.
