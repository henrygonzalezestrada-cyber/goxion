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
