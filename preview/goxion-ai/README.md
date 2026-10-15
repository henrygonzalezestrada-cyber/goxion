# GOXION · Goxy F3 · robot-heads original en beta

## Objetivo
Se sustituyó el SVG plano de la primera beta por la implementación original de **[robot-heads](https://github.com/fayazara/robot-heads)** (v0.3.0, Fayaz Ahmed, licencia MIT). La cabeza es el modelo **TV rectangular real**, renderizado en **Canvas 2D** con geometría, luces, reflejos, pantalla LED y movimiento; exactamente el tipo de tecnología de la referencia visual.

La experiencia de GOXION **no se convirtió a React**. Solo el robot tiene un pequeño montaje encapsulado con React, y sus dependencias están incluidas en un archivo JavaScript estático de la beta.

## Abrir
`https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f3`

- Abre `../../ayuda.html` original en iframe **de mismo origen**; no duplica páginas oficiales.
- Sección Soporte y sesión ya existentes. La capa de bloqueo de clientes sin sesión permanece en su lugar.
- Reemplaza solo la cuadrícula de plataformas dentro de `smart-support-card`; mantiene FAQ, comentarios, asesor humano, pagos y catálogo existentes.

## Estados y juego
- **Idle:** cabeza original con LEDs de color blanco frío, parpadeo, giro y antena.
- **Toque:** gestos feliz/guiño/sorpresa de Goxy. Como robot-heads no incluye literalmente `wink` ni `surprised`, estos eventos se asocian a sus estados nativos `happy` y `listening`. No abre chat.
- **Deslizar/caricia:** se conserva el detector Pointer Events, con corazones y rubor sobre el robot; el render original muestra su animación `happy`. No abre chat.
- **Botón «Hablar con Goxy»:** acceso único al chat de demostración, con línea animada discreta. Sin emoji/flecha.
- **Chat:** estados nativos originales `listening`, `thinking`, `speaking` y `happy`, sin respuestas reales de IA todavía.
- Respeta `prefers-reduced-motion`, accesibilidad y comportamiento táctil de iPhone.

## Archivos
- `index.html`: carga `goxy-heads.bundle.js` desde **la misma carpeta/origen**, antes de `mascota.js`.
- `goxy-heads.bundle.js`: build estático minificado del paquete real y React. No necesita CDN.
- `goxy-heads-entry.js`: adaptador React aislado; observa `data-mood` para sincronizar estados.
- `package.json`: versiones fijadas de `robot-heads@0.3.0`, React y esbuild. Para regenerar, ejecutar `npm install --no-audit --no-fund` y `npm run bundle` dentro de esta carpeta y subir el bundle.
- `mascota.js`: lógica de caricias, gestos y chat existente, sin cambios de negocio.
- `mascota.css`: estilos del Canvas y ADN visual GOXION.
- `check.mjs`: pruebas simuladas de tap, caricia, botón, sesión, movimiento reducido y presencia de adaptador real.
- `ROBOT_HEADS_LICENSE.txt`: licencia MIT del código integrado.

## Validaciones
- Bundle se generó con éxito mediante GitHub Actions usando npm; compilador pasó `node --check`.
- Contratos de interacción y montaje de Goxy probados con JavaScript simulado.
- **Pendiente revisión en Safari iPhone físico** (reflejos, arrastre de dedo, recorte de antena, rendimiento) antes de aprobar visual.
- Tests genéricos de GOXION y el flujo completo de autenticación se deben verificar antes de activar la mascota en Soporte oficial.

## Sin cambios oficiales
No se modifica `ayuda.html`, `admin.html`, `index.html`, el motor financiero ni Supabase. **No hay llamadas a Groq, API de IA, correo ni solicitudes a Admin** en esta fase.
