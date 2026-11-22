# GOXION · Avisos apilados oficiales
**Fecha:** 21 de noviembre de 2026
**Estado:** implementado en `main` para todas las sesiones autenticadas de Mi Espacio.

## Funcionamiento

Se conservó **sin rediseño** la tarjeta real y compacta de los Términos 2.0. No existe una segunda tarjeta legal simulada. El servidor sigue registrando las decisiones.

- **Términos pendientes y aviso exigible:** términos aparecen primero. Si hay novedades nuevas, asoma detrás su tarjeta. «Ahora no» y X solo posponen términos 24 horas según el sistema ya vigente, y dejan pasar a novedades.
- **Aceptó términos:** se mantiene su aceptación persistida; novedades se muestran después si aún no se han visto en esta versión.
- **Rechazó términos:** novedades no aparecen mientras la decisión vigente siga siendo rechazo, y se respetan los controles de acceso ya existentes.
- **Términos pendientes previamente pospuestos:** novedades pueden mostrarse sin reabrir términos antes de que venza la prórroga de 24 horas.
- **Novedades X y «¡Entendido!»:** marcan **solo** la versión del aviso informativo como vista en este navegador. No alteran consentimiento, servicio ni sesiones. Otro navegador puede recibir el aviso una vez; se conserva ese comportamiento original.
- **Nueva versión:** `nov2026-novedades-apiladas-v1`. Permite que todos los clientes vean una vez el nuevo aviso aunque ya hubieran cerrado la versión de octubre; no se repite cada inicio de sesión.
- Si el cliente abre manualmente términos mientras novedades está visible, términos tienen prioridad y novedades regresan a la cola sin darse por vistas.

## Diseño aprobado

- Título exclusivo `Tu Espacio, más inteligente.`, sin sobretítulos ni subtítulos.
- Las seis novedades completas de Goxy F17, notificaciones, catálogo, multifecha, prórrogas/lealtad y cupones/misiones/opiniones; se conservan los separadores suaves **entre novedades**, no líneas debajo del título o encima del botón.
- Contenido con desplazamiento interno, fade arriba y abajo, CTA inferior fijo, X cian.
- Scroll automático infinito mediante `requestAnimationFrame`, velocidad aproximada 30 píxeles/segundo, con acumulación subpíxel para Safari iPhone. Clones `aria-hidden` solo durante movimiento automático.
- Al tocar/arrastrar/usar rueda o teclado en la lista: detener el automático, eliminar los clones y dejar un **scroll manual finito** hasta la sexta novedad.
- Respeta `prefers-reduced-motion`, pestaña oculta, cierre de sesión, y no muestra contornos de preselección táctil. Conserva enfoque visible cuando se navega con teclado.

## Archivos oficiales

- `assets/js/ayuda/20-release-announcement.js` – nueva cola y noticias (se conserva nombre de entrada para compatibilidad).
- `assets/css/goxion-release-v2.css` – estilo oficial de novedades y pista de segunda tarjeta detrás de términos.
- `assets/js/ayuda/21-legal-v2-documents.js` – emite `goxion:legal-opened` y `goxion:legal-dismissed`, más `getQueueStatus` de solo lectura. No se modificaron textos, documento, hash o decisiones.
- `ayuda.html` – enlaces versionados oficiales.
- `scripts/goxy-official-launch-smoke.mjs` – prueba dinámica con estado aceptado, pospuesto y logout más verificaciones estáticas.

Los archivos `23-avisos-apilados-beta.js`, `goxion-avisos-apilados-beta.css` y `goxion-release-oct2026.css` se retiraron de Main tras la migración; el estilo anterior ya no se carga.

## Corrección general de distribución · 21/11/2026

Se detectó con Casone que el comprobador del módulo de novedades buscaba `window.globalClientesData`, pero el estado compartido real de Mi Espacio se declara como `let globalClientesData` en un script clásico. La propiedad `window.globalClientesData` no existe necesariamente y podía bloquear silenciosamente el aviso para cuentas reales.

- El módulo oficial ahora consulta la variable compartida lexical y mantiene `window.globalClientesData` como alternativa de compatibilidad.
- La versión de novedades subió a `nov2026-novedades-apiladas-v2-todos`. Así **todos los perfiles con sesión y acceso habilitado vuelven a verla una sola vez**, incluso si ya cerraron la versión anterior, sin limpiar ni modificar las marcas históricas de lectura.
- Se actualizó el parámetro de caché de `ayuda.html` para Safari.
- Se incorporó una regresión automatizada de Casone que simula la variable lexical global, la marca de lectura de V1 y el paso de términos a novedades tras aplazarlos.
- Las cuentas cuyo acceso está restringido por rechazo continúan sujetas a los controles legales previamente aprobados, sin mostrarles promociones ni novedades comerciales.

## QA y alcance

- Código JavaScript/CSS sintácticamente verificado y referencias a archivos oficiales comprobadas.
- Prueba de flujo con DOM simulado: visitantes no reciben avisos, dos cuentas no comparten marca de leído, logout no marca visto, los términos exigibles conservan prioridad y «Ahora no» permite mostrar novedades.
- Los tests no sustituyen recorrido visual con una sesión autenticada real de iPhone. No se hizo ningún cambio en Supabase ni en la duración de tokens durante esta publicación.
