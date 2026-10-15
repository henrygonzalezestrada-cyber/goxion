# GOXION · Goxy F5 · estados conversacionales con animaciones reales

## Objetivo
Se sustituyó el SVG plano de la primera beta por la implementación original de **[robot-heads](https://github.com/fayazara/robot-heads)** (v0.3.0, Fayaz Ahmed, licencia MIT). La cabeza es el modelo **TV rectangular real**, renderizado en **Canvas 2D** con geometría, luces, reflejos, pantalla LED y movimiento; exactamente el tipo de tecnología de la referencia visual.

La experiencia de GOXION **no se convirtió a React**. Solo el robot tiene un pequeño montaje encapsulado con React, y sus dependencias están incluidas en un archivo JavaScript estático de la beta.

## Abrir
`https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f5`

- Abre `../../ayuda.html` original en iframe **de mismo origen**; no duplica páginas oficiales.
- Sección Soporte y sesión ya existentes. La capa de bloqueo de clientes sin sesión permanece en su lugar.
- Reemplaza solo la cuadrícula de plataformas dentro de `smart-support-card`; mantiene FAQ, comentarios, asesor humano, pagos y catálogo existentes.

## Estados y juego
- **Idle:** cabeza original con LEDs de color blanco frío, parpadeo, giro y antena.
- **Toque:** ciclo de siete gestos distintos del motor original: `happy`, `searching`, `listening`, `working`, `thinking`, `speaking` y `sleeping`; sin repetir el mismo estado consecutivamente. Se intercepta el `poke()` nativo del componente para que no imponga siempre `happy`. No abre chat.
- **Deslizar/caricia:** se conserva el detector Pointer Events, con corazones y rubor sobre el robot; el render original muestra su animación `happy`. No abre chat.
- **Botón «Hablar con Goxy»:** acceso único al chat de demostración; se eliminó el globo de conversación (y sigue sin flecha). Conserva su cápsula, línea animada cian/morado, tres puntos pulsantes y centrado del texto.
- **Chat F5:** usa el render original con máquina de estados explícita `idle`, `listening`, `thinking`, `searching`, `working`, `speaking`, `happy`, `error`. Cada etapa muestra la expresión LED correspondiente, una etiqueta discreta bajo Goxy y, mientras procesa, tres puntos de carga.
- **Pruebas guiadas:** acceso, información de cuenta, solicitud de códigos y un error simulado. Nada crea tickets ni consulta cuentas.
- **Mensajes escritos:** campo de prueba (máximo 240 caracteres), respuesta de demostración local; no se usa IA ni almacenamiento externo. No abre el teclado automáticamente al entrar.
- **Flujo seguro:** evita conversaciones superpuestas; cancela temporizadores, animaciones de carga y respuestas pendientes cuando se cierra el chat, se cambia de vista o caduca la sesión.
- Respeta `prefers-reduced-motion`, accesibilidad y comportamiento táctil de iPhone.

## Archivos
- `index.html`: carga `goxy-heads.bundle.js` desde **la misma carpeta/origen**, antes de `mascota.js`.
- `goxy-heads.bundle.js`: build estático minificado del paquete real y React. No necesita CDN.
- `goxy-heads-entry.js`: adaptador React aislado; observa `data-mood` para sincronizar estados.
- `package.json`: versiones fijadas de `robot-heads@0.3.0`, React y esbuild. Para regenerar, ejecutar `npm install --no-audit --no-fund` y `npm run bundle` dentro de esta carpeta y subir el bundle.
- `mascota.js`: lógica de caricias, gestos y chat existente, sin cambios de negocio.
- `mascota.css`: estilos del Canvas y ADN visual GOXION.
- `check.mjs`: prueba simulada de los siete gestos F4, estados F5, error, redacción de mensaje local, cancelación, pérdida de sesión, motion reducido y CTA.
- `ROBOT_HEADS_LICENSE.txt`: licencia MIT del código integrado.

## Validaciones
- Bundle se generó con éxito mediante GitHub Actions usando npm; compilador pasó `node --check`.
- Contratos de interacción probados con JavaScript simulado: toques y caricias F4; apertura y saludo, estados de búsqueda y respuesta, error, entrada local, cancelación al cerrar, expiración de sesión, movimiento reducido.
- **Pendiente revisión en Safari iPhone físico** (reflejos, arrastre de dedo, recorte de antena, rendimiento) antes de aprobar visual.
- Tests genéricos de GOXION y el flujo completo de autenticación se deben verificar antes de activar la mascota en Soporte oficial.

## Sin cambios oficiales
No se modifica `ayuda.html`, `admin.html`, `index.html`, el motor financiero ni Supabase. **No hay llamadas a Groq, API de IA, correo ni solicitudes a Admin** en esta fase.

## Próxima fase
Cuando F5 esté aprobada en Safari, construir el **orquestador seguro de soporte** con base de problemas verificados por plataforma. Sólo entonces enlazar funciones autorizadas del cliente a través de backend, sin exponer contraseñas, PIN ni claves en JavaScript. La IA gratuita se integrará después, con límites de uso y un procedimiento claro de escalamiento humano.

**No usar estas respuestas simuladas para decisiones reales del cliente.** F5 únicamente demuestra la experiencia y los estados de Goxy.
