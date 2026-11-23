# GOXION Mi Espacio V2 · Ruta de salida a oficial
Fecha: 23 de noviembre de 2026

## Alcance acordado
**Se rediseña exclusivamente Mi Espacio.** Catálogo, carrito, promociones, soporte, autenticación, pagos, prórrogas, condiciones legales, notificaciones y acciones administrativas conservan su lógica y deben ser verificadas en conjunto. Catálogo y Soporte **no** se rediseñan.

## Fuentes de verdad
- UI de Mi Espacio aprobada: `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.
- Feed V2 de laboratorio conectado: `preview/mi-espacio-v2/index.html`.
- **Espejo de integración funcional en pruebas:** `preview/mi-espacio-v2/espejo.html`. Carga Catálogo y Soporte directamente desde `ayuda.html` mediante un único iframe aislado de estilos, sin clonarlos.
- Oficial vigente: `ayuda.html`; se mantiene intacta hasta pasar toda la matriz.
- Estado de no-leído, swipe, deshacer, marcar/borrar todo y campana: `assets/js/ayuda/04-client-notifications-realtime.js` preservado en la adaptación V2.
- La cápsula conserva geometría y badge degradado de la oficial, pero con materiales de cristal neutro.

## Contrato de no regresión
1. La interfaz de Mi Espacio debe ser visualmente idéntica al laboratorio, sin CSS del dashboard viejo.
2. Catálogo y Soporte deben funcionar con los módulos oficiales **sin reimplementar lógica** ni colocar versiones simplificadas.
3. Navegación Mi Espacio → Catálogo → Soporte → Mi Espacio sin pantallas antiguas mezcladas ni pérdida de sesión.
4. Cada flujo visible debe conservar efectos de carga, accesibilidad, confirmación, error, y pruebas en iPhone.
5. El espejo con iframe permite auditar experiencias completas **pero no es la migración definitiva**: antes de publicar hay que validar el mismo artefacto y la solución de integración final, sin reescribirla después de aprobarla.
6. No entregar controles de QA, datos ficticios o escenarios en la UI del cliente.

## Puertas de lanzamiento
- **P1 Diseño:** V2 fiel al laboratorio (hero, servicios, ahorro con animación, beneficios, movimiento, Goxy, cápsula).
- **P2 Funciones Mi Espacio:** B2 dos fechas, estado de cuenta, cobros, comprobantes, prórrogas, cancelaciones, servicios, PIN seguro, cupones, misiones, referidos, lealtad.
- **P3 Interconexión:** mismo inicio de sesión, notificaciones completas, acciones hacia cuenta/servicios/beneficios, carrito/promociones/catálogo/soporte original en el espejo, vuelta sin doble UI.
- **P4 QA:** Playwright Chromium + WebKit a 390/320/280px, Safari iPhone real, error y reconexión, dos sesiones, estados vacíos y pendientes, pruebas del flujo comercial con usuario controlado. Ninguna acción que escriba datos se prueba en clientes reales.
- **P5 Espejo preproducción exacto:** una sola versión que será promovida **sin rediseñarla ni reescribir módulos después de la aprobación**, con revisión de seguridad, SEO, credenciales y RLS.
- **P6 Promoción controlada:** respaldo de `ayuda.html`, despliegue con opción de reversión, prueba posterior y monitoreo.

## Estado hoy
- Badge circular morado-cian y morph de la campana restaurados en V2.
- Catálogo y Soporte conservados en espejo integral mediante marco aislado, **pendiente de comprobar los flujos reales y de acordar la integración definitiva sin iframe provisional**.
- El espejo es funcional para pruebas exploratorias, no está aprobado para sustitución de `ayuda.html`.
