# GOXION · Gixys / Fase 4: escena premium e interacción táctil

Fecha: 16/oct/2026. **Estado: beta aislada, a validar visualmente por el usuario en Safari iPhone.**
Rama: `beta/gixys-escena-premium-interactiva-20261016`.
Continuidad: PR #132 (V4 aprobada), PR #133 (espejo Mi Espacio), PR #134 (diálogos por evento).

## Motivo
El usuario señaló que los Gixys de la beta anterior se ubicaban demasiado lejos de su contexto y que la burbuja se veía genérica. Quiere una escena expresiva, con globo naciendo del Gixy y desvaneciéndose al salir, reacción física ante toques consecutivos inspirada en el comportamiento del globo de Gus en Brawl Stars, y salida mediante un salto.

## Contrato de esta beta
- El render sigue usando **bot-avatars@0.2.2** original en Plastic, solo ojos. No dibujar un sustituto, ni modificar el motor de Goxy.
- **Tres ubicaciones predefinidas por contexto** (misiones/lealtad/notificaciones), con variación pequeña por aparición; sin búsquedas de huecos por toda la pantalla. Un ancla principal por módulo; notificaciones pueden usar saludo como respaldo si la cabecera está fuera de vista. Ninguna ubicación debe cubrir controles clave. Si no cabe, **no se presenta** el consejo.
- Globo **único**, semitransparente premium con cristal, relieve sutil y cola conectada al personaje. Entra desde el avatar (escala, breve desplazamiento y desenfoque), desaparece mediante desvanecimiento.
- **Toques en el personaje**, no en toda la tarjeta: primer toque, impulso; siguientes, rebote elástico con límites invisibles; cuarto toque, salto y salida. Tocar el mensaje también lo cierra. A los 5 segundos sin interacción, globo se desvanece y Gixy sale saltando.
- Solo una escena activa, sin diálogos arbitrarios ni voz. Debe hablar únicamente en eventos sintéticos confirmados de la beta: misión completada, lealtad avanzada, notificación recibida.
- Respetar `prefers-reduced-motion`, accesibilidad del botón táctil, anchuras 280–768 y compatibilidad WebKit/Chromium.
- No reintroducir tarjetas detrás de campana/Gixy ni alterar la retícula de Mi Espacio. La corrección definitiva de alineación de PulseHeart queda pendiente para integración oficial.

## Aislamiento y riesgos
Solo cambiar código bajo `preview/gixys-mi-espacio-espejo/`, su workflow exclusivo y esta documentación. Datos sintéticos. No scripts de login, finanzas, pedidos, cupones o comunicaciones reales. En producción, los textos relativos a descuento/cupón deberán provenir de fuentes autorizadas del motor financiero y nunca prometer aplicación o permanencia no verificada.

## QA y próximos pasos
- Verificar Globe CSS (aparición/desvanecimiento), 3 zonas, no colisiones, toque → animación, 4 toques → salto, cierre, no overflow y sin conexiones privadas.
- Comprobar físicamente en iPhone Safari y pedir aprobación del usuario antes de implementar en Ayuda oficial.
- Tras aprobación, integrar por eventos ya existentes; no crear un segundo sistema de avisos o soporte.
