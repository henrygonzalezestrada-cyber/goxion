# GOXION · Gixys · Fase 5 · Pulido fino, Circle y frases

Fecha: 16/oct/2026. Rama de prueba: `beta/gixys-fino-lealtad-frases-20261016`.
Origen: V4 interactiva del PR #135. Video de revisión del usuario: `ScreenRecording_10-16-2026 20-05-30_1.mp4` (compartido en chat; no guardar video en repositorio).

## Observaciones confirmadas
- **V4 NO está aprobada visualmente:** rebotes bruscos, giros y salto obligatorio tras cuatro toques dan sensación genérica, no premium. Evitar añadir más efectos para disimular.
- **Fallo real de Circle/lealtad:** al pulsar el corazón el progreso cambia, pero Circle no aparece junto a su dato. El posicionador rechazaba el espacio o caía fuera del módulo.
- **Petición nueva:** cuando el cliente toca un Gixy, mostrar una frase original, corta, inspirada en GOXION, sin boca, narración por voz o segundo chat. El contenido no puede prometer un descuento o aplicación de cupón no confirmado.

## Solución de esta beta aislada
- Renderer `bot-avatars@0.2.2` original, material Plastic, solo ojos. Sin sustitución por Canvas propio.
- **Circle dentro de lealtad**, sustituyendo temporalmente la línea secundaria con un área de lectura extendida durante unos segundos, sin tapar botón de cuenta, indicador de pago ni fecha. El corazón sigue PulseHeart original. Conservar pendiente su alineación definitiva al integrar oficialmente.
- El toque del Gixy produce un microgesto de inclinación de unos cinco grados y desplazamiento breve de cinco píxeles; **sin cuatro-toques-disparado, rebotes contra las esquinas ni spin de salida**. Tras tocarlo se renueva brevemente el tiempo para poder leer la frase.
- Globo discretamente esmerilado, bordes suaves, entrada corta y salida en desvanecimiento. Una escena activa, salida manual tocando texto y apagado automático.
- Frases originales por contexto: «En GOXION, cada logro cuenta», «En GOXION, la constancia tiene premio», «GOXION: siempre un paso adelante», etc. No son citas de personajes o promociones contractuales.
- Todos los eventos y cifras siguen siendo ficticios y locales a la beta; ni pagos ni lealtad ni datos reales se mutan.

## QA y criterio de cierre
Tests exclusivos Chromium/WebKit en siete anchuras: Circle dentro de `#loyalty-msg` sin tapar el botón, activación contextual, tres animaciones aprobadas intactas, actualización de frase al tocar, gesto físico leve, varios toques sin forzar salida, cierre/manual/auto, no overflow ni llamadas privadas.

Estado: pendiente de validación visual del usuario en Safari iPhone. **No llevar esta fase a Ayuda oficial sin su aprobación expresa.**
