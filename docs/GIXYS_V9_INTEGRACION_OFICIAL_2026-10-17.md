# GOXION · Gixys V9 aprobados · integración en Ayuda oficial
Fecha: 17/oct/2026. Aprobación visual expresa del usuario: «Súper, ahora sí. Aprobado». Beta aprobada: [PR #140](https://github.com/henrygonzalezestrada-cyber/goxion/pull/140), URL `preview/gixys-mi-espacio-espejo/?v=9`.

## Decisiones vinculantes
- V9 es el acabado aprobado: `bot-avatars@0.2.2` original Plastic, solo ojos; Gixys como una familia de tres sin nombres diferenciados, globos de escritura equilibrada, partículas cuidadas y situaciones contextuales.
- Nunca desplazar o ampliar contenido para hacer lugar al Gixy. Portal `position:fixed` de tamaño cero, con controles nativos del usuario intocables, sin reflujo ni scroll lateral.
- Pulsar el corazón no crea ni adelanta pagos, porcentajes ni nivel. Corazón React Bits PulseHeart original (28px dentro de objetivo 44px) únicamente proporciona reacción visual contextual. `#loyalty-count` sigue siendo la única fuente visible de progreso financiero.
- Gixy de misión se muestra solo cuando `gamificacion.progreso` del cliente autenticado pasa a completo tras una actualización confirmada; no al abrir el panel ni en cargas históricas ya completadas.
- Gixy de notificación se muestra solo al incrementar el recuento de no leídas después de establecer la sesión, no por la carga inicial de avisos. Los Gixys no llaman a Supabase/Discord ni exponen tokens.
- En Beta, el Easter egg del 5% es **exclusivamente simulado**. **En oficial queda apagado:** ninguna tarjeta que prometa 5% de prueba se muestra al cliente y no se asignan cupones. Mantener el concepto de juego y el acabado V9 para habilitarlo únicamente tras definir elegibilidad, vencimiento, combinabilidad de promociones/registros/lealtad, unicidad por cliente y validez desde backend transaccional; no crear un segundo motor financiero.
- Goxy, Admin, Index y el backend no se modificaron.

## Arquitectura y pruebas
- Fuente aprobada reutilizable `preview/gixys-mi-espacio-espejo/src/companions.jsx`: exporta `Messages` para evitar duplicar motores React/Canvas, con bandera `official` que apaga la recompensa ficticia y usa textos seguros.
- Adaptador sin datos propios `assets/js/ayuda/21-gixys-official.src.jsx` escucha `goxion:client-ready`, `goxion:client-logout`, `goxion:client-space:updated`; monta/desmonta contexto, sin escribir en pagos. Monta PulseHeart en la etiqueta existente sin tocar el contador.
- CSS `assets/css/gixys-official.css` proviene de estilos V9 aprobados con aislamiento sobre clases `gx-gixy*` y `body.gx-gixys-official`. No reusa las clases `gx-mirror-body` de datos falsos.
- Compilación: `.github/workflows/goxion-gixys-official.yml`, React 18, bot-avatars@0.2.2, PulseHeart original fijado a commit `d9085a5d`, con esbuild. Publica artefactos compilados solo al pasar QA.
- `scripts/qa-gixys-official.mjs` sobre `preview/gixys-oficial-qa/index.html`: Chromium/WebKit y widths 320/390/430, invitado sin asistente, sesión presente, corazón sin alterar progreso, evento real de notificación, misión completada únicamente por progreso, ninguna recompensa ficticia, logout seguro, cero llamadas privadas y cero desplazamiento.

## Rollback
Quitar de `ayuda.html` las tres inclusiones (dos CSS + un script) o revertir exclusivamente el commit de integración. No revertir motor financiero, Goxy ni index. Hacer seguimiento visual post-lanzamiento en Safari real; el QA automatizado no sustituye la revisión física.

## Estado
Visual V9 aprobado. QA de integración superado en Chromium/WebKit. La integración oficial se realiza con el easter egg financiero deshabilitado.
