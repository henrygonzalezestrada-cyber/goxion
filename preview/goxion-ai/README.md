# GOXION · Goxy F4 · siete gestos reales y CTA simplificado

## Objetivo
Se sustituyó el SVG plano de la primera beta por la implementación original de **[robot-heads](https://github.com/fayazara/robot-heads)** (v0.3.0, Fayaz Ahmed, licencia MIT). La cabeza es el modelo **TV rectangular real**, renderizado en **Canvas 2D** con geometría, luces, reflejos, pantalla LED y movimiento; exactamente el tipo de tecnología de la referencia visual.

La experiencia de GOXION **no se convirtió a React**. Solo el robot tiene un pequeño montaje encapsulado con React, y sus dependencias están incluidas en un archivo JavaScript estático de la beta.

## Abrir
`https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f4`

- Abre `../../ayuda.html` original en iframe **de mismo origen**; no duplica páginas oficiales.
- Sección Soporte y sesión ya existentes. La capa de bloqueo de clientes sin sesión permanece en su lugar.
- Reemplaza solo la cuadrícula de plataformas dentro de `smart-support-card`; mantiene FAQ, comentarios, asesor humano, pagos y catálogo existentes.

## Estados y juego
- **Idle:** cabeza original con LEDs de color blanco frío, parpadeo, giro y antena.
- **Toque:** ciclo de siete gestos distintos del motor original: `happy`, `searching`, `listening`, `working`, `thinking`, `speaking` y `sleeping`; sin repetir el mismo estado consecutivamente. Se intercepta el `poke()` nativo del componente para que no imponga siempre `happy`. No abre chat.
- **Deslizar/caricia:** se conserva el detector Pointer Events, con corazones y rubor sobre el robot; el render original muestra su animación `happy`. No abre chat.
- **Botón «Hablar con Goxy»:** acceso único al chat de demostración; se eliminó el globo de conversación (y sigue sin flecha). Conserva su cápsula, línea animada cian/morado, tres puntos pulsantes y centrado del texto.
- **Chat:** estados nativos originales `listening`, `thinking`, `speaking` y `happy`, sin respuestas reales de IA todavía.
- Respeta `prefers-reduced-motion`, accesibilidad y comportamiento táctil de iPhone.

## Archivos
- `index.html`: carga `goxy-heads.bundle.js` desde **la misma carpeta/origen**, antes de `mascota.js`.
- `goxy-heads.bundle.js`: build estático minificado del paquete real y React. No necesita CDN.
- `goxy-heads-entry.js`: adaptador React aislado; observa `data-mood` para sincronizar estados.
- `package.json`: versiones fijadas de `robot-heads@0.3.0`, React y esbuild. Para regenerar, ejecutar `npm install --no-audit --no-fund` y `npm run bundle` dentro de esta carpeta y subir el bundle.
- `mascota.js`: lógica de caricias, gestos y chat existente, sin cambios de negocio.
- `mascota.css`: estilos del Canvas y ADN visual GOXION.
- `check.mjs`: regresión de los siete gestos nativos, caricias lentas/rápidas, CTA sin globo, único acceso al chat, sesión y movimiento reducido.
- `ROBOT_HEADS_LICENSE.txt`: licencia MIT del código integrado.

## Validaciones
- Bundle se generó con éxito mediante GitHub Actions usando npm; compilador pasó `node --check`.
- Contratos de interacción y montaje de Goxy probados con JavaScript simulado, incluyendo siete gestos diferentes, uso de teclado y prueba de que la mascota no abre el chat.
- **Pendiente revisión en Safari iPhone físico** (reflejos, arrastre de dedo, recorte de antena, rendimiento) antes de aprobar visual.
- Tests genéricos de GOXION y el flujo completo de autenticación se deben verificar antes de activar la mascota en Soporte oficial.

## Sin cambios oficiales
No se modifica `ayuda.html`, `admin.html`, `index.html`, el motor financiero ni Supabase. **No hay llamadas a Groq, API de IA, correo ni solicitudes a Admin** en esta fase.

## Próxima fase
Una vez aprobada visualmente F4, incorporar estados de conversación controlados por eventos (`listening`, `thinking`, `searching`, `speaking`, `happy`, `error`) antes de conectar una IA. Esta fase F4 **no realiza solicitudes a APIs** ni altera los procesos financieros.
