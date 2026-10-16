# GOXION · Goxy F17 oficial y anuncio de mejoras a clientes
Fecha de trabajo: 15/oct/2026. Rama: `feature/goxy-f17-official-launch-announcement-20261015`.

## Alcance autorizado
El propietario aprobó expresamente integrar la beta F17, ya aceptada en Safari, al **Soporte oficial de Ayuda** y anunciar por popup las novedades recientes de GOXION. No solicitó rediseñar Admin, Index ni recalcular importes.

## Integración
- `ayuda.html` incluye, bajo `#view-soporte`, la misma pila comprobada de Goxy: robot-heads original (MIT), catálogo canónico de guías, contexto de plataformas autenticado, recuperación de accesos, ficha WhatsApp consentida, puente a la función Edge y lector B2, terminando en `mascota.js`. Solo una fuente de código en `preview/goxion-ai/` para evitar versiones divergentes.
- Las dependencias están ordenadas explícitamente después de Ayuda y su motor financiero; nunca copiar secretos o calcular mora en el navegador.
- La URL anterior `preview/goxion-ai/` reconoce que Ayuda ya creó Goxy y no inyecta ni duplica instancias/canvas/listeners.
- Texto de prueba del formulario se convierte en texto normal para clientes. Sigue vigente la cuota de IA controlada por servidor, con consultas locales gratuitas; fichas de WhatsApp requieren el clic del cliente y el envío manual.
- La función Edge actualmente desplegada es `goxy-ai-beta` v8, con validación de sesión/token y consulta autorizada, reutilizada por la vista oficial. El nombre interno no se presenta al usuario. Cambiar ese endpoint requeriría una migración posterior explícita y pruebas de paridad (NO parte de este lanzamiento).
- Goxy no muestra PIN, contraseña ni QR dentro del chat: remite a los controles protegidos de Mi Espacio. El 20% futuro de reactivación en régimen B2 continúa **condicionado** y no se suma como cobro certificado si el cotizador no lo informa.

## Anuncio de novedades
- Archivos `assets/css/goxion-release-oct2026.css` y `assets/js/ayuda/20-release-announcement.js`. Pop-up con una tarjeta cristal, acentos morado/cian, jerarquía legible, encabezado, desplazamiento solo del contenido, X cian y CTA claro. Respeta movimiento reducido, teclado Escape, foco, bloqueo/restauración de scroll de fondo.
- Texto breve, desde la perspectiva del cliente, sobre: **Goxy**, centro de **notificaciones**, **promociones y catálogo**, calendario de **cobros multifecha**, **prórrogas y lealtad**, **misiones, cupones y comentarios**. Evita presentar funciones condicionadas como disponibles para todos.
- `02-client-supabase-layer.js` emite `goxion:client-ready` después del éxito de login o al recuperar sesión válida y renderizar el dashboard; emite `goxion:client-logout` para cancelar un aviso abierto. No mostrar a invitados ni antes de autenticación/splash. No secuestrar modales existentes.
- Descartar marca `gx-release-seen:oct2026-goxy-f17-v1:<cliente>` **en el almacenamiento local por cliente y navegador** al pulsar Entendido o cerrar. No es un registro global sincronizado entre dispositivos: en otro dispositivo puede volver a aparecer una vez. No guardar token ni datos sensibles en el aviso.
- Aviso es solamente informativo; no modifica notificaciones reales, pedidos, promociones, misiones o pagos. No envía nada a Discord/WhatsApp.

## Validación y alcance de pruebas
- `npm run test:goxy:oficial`: regresión Goxy F17 (219 aserciones simuladas) y `scripts/goxy-official-launch-smoke.mjs` (orden de carga, idempotencia, sesión invitada, primera visualización, persistencia por cliente, cambio de usuario, cierre de sesión y retorno a la vista original). El flujo corre como step independiente en `.github/workflows/goxion-integrity.yml` incluso si otros tests históricos fallan.
- Pendientes de control final: GitHub Pages para HEAD de integración, verificación de apertura Goxy en sesión real, popup responsivo en iPhone, confirmación de que el cliente con varias fechas ve importes B2 correctos y que las notificaciones existentes siguen funcionando. No afirmar haber realizado estas pruebas físicas sin evidencia.

## Rollback
- Revertir la PR de integración para quitar las inclusiones en `ayuda.html`, los eventos de sesión y el nuevo anuncio; los lectores financieros y Edge Functions no se modifican.
- Alternativa de contención inmediata, si solo falla el aviso: quitar `20-release-announcement.js` y su hoja de estilo de `ayuda.html` sin desactivar Goxy.
- Si solo falla Goxy: quitar los ocho scripts oficiales y `mascota.css` de Ayuda. La tarjeta original queda conservada en el DOM por `gxai-original` y vuelve a funcionar sin el asistente.
