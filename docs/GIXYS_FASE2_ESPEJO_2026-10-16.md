# GOXION · Gixys / Microinteracciones · Handoff y Fase 2

Fecha: 16/oct/2026.

## Aprobación expresa del usuario

**Bloque A + Fase 1: APROBADOS** con la beta V4 del [PR #132](https://github.com/henrygonzalezestrada-cyber/goxion/pull/132):
- Gixys Hex/Square/Circle con `bot-avatars@0.2.2`, cara **solo ojos**, color GOXION y acabado **Plastic** como base.
- Motor de animación y saltos originales de Libraries.dev. No crear otro dibujo Canvas simplificado.
- Misiones: **check + botón elástico V1** (no SpringCheck de React Bits).
- Lealtad: **PulseHeart original de React Bits**, rojo `#ff4d6d`.
- Avisos: **campana V1**, movimiento aprobado, sin un recuadro nuevo alrededor del componente.
- Goxy original, sus animaciones de carga y funciones: intactos.
- Los Gixys acompañan **sin ocupar una nueva tarjeta** ni tapar información, preferentemente mediante overlays contextuales.

## Fase 2 · Beta espejo (presente)

Ruta: `preview/gixys-mi-espacio-espejo/`.

- Se genera `index.html` extrayendo `#goxion-main-nav` y `#view-dashboard` directamente de `ayuda.html`, reutilizando `assets/css/ayuda.css`, notificaciones oficiales y el morph compartido existente `05-gamification-shared-morph-js.js`.
- Datos **sintéticos** y anónimos; **no** se cargan controladores de sesión, cuentas, pagos, notificaciones reales, Supabase ni Goxy.
- La notificación usa la **campana existente de la cabecera** y su cápsula actual, sin agregar un recuadro para el efecto.
- La misión conserva el contenedor / tarjeta / detalle de Ayuda, sin módulo duplicado. En pantallas muy estrechas, Hex se muestra en el detalle cuando no cabe en la tarjeta sin tapar texto.
- PulseHeart acompaña el encabezado de lealtad, y Circle solo aparece con un avance. Square solo aparece al recibir un aviso. Son reacciones contextuales, no mascotas en movimiento constante.
- El build recompila el componente original de los Gixys y Pulse Heart con sus licencias originales, sin modificar sus movimientos.
- Antes de publicar la beta: QA de 280, 320, 360, 375, 390, 430 y 768 px, WebKit/Chromium, overlay sin solapamientos, scroll lateral 0, pruebas de toque, no requests al backend.
- **La beta espejo NO equivale a integración oficial**. Queda pendiente inspección humana en Safari iPhone y aprobación del usuario. Solamente después se puede preparar una integración productiva localizada en las funciones dueñas, sin duplicar cálculos y eventos.

## Restricciones de integración posterior

1. No usar el botón simulado para marcar misiones reales; escuchar exclusivamente una confirmación fiable del motor propietario tras persistencia.
2. No transformar Heart en control de progresión manual real; sus reacciones deben depender del progreso calculado en el backend. No conceder pagos ni niveles desde React.
3. No cambiar estados de notificaciones con el efecto visual. Se respeta `04-client-notifications-realtime.js`.
4. No instalar un segundo sistema de navegación, acciones de cobro o asistentes inteligentes.
5. Evitar overlays persistentes encima de importes, progreso, cabecera, X o controles.
6. La calidad y fluidez de la biblioteca es criterio de aprobación, no solamente pasar test técnicos.
