# GOXION · Gixys · Fase 3 (beta espejo): mensajes contextuales

**Fecha:** 16/oct/2026. **Rama:** `beta/gixys-dialogos-contextuales-20261016`. **Base visual:** Fase 2 / PR #133; motor y animaciones aprobadas V4 / PR #132.

## Feedback del cliente y objetivo

El usuario aprueba el **render original Plastic**, expresión solo de ojos, rebotes, aparición por evento y la experiencia de la beta anterior. La **alineación del corazón en lealtad** queda registrada como corrección para la futura integración oficial; **no tocarla aún en beta**.

Los Gixys deben ser pequeños **guías útiles**, no decoración o asistentes de chat alternos a Goxy. La siguiente prueba valida:

1. Aparición **solo por evento confirmado** en la simulación: completar misión, avanzar lealtad, recibir aviso. **Hex NO aparece al abrir Misiones**.
2. Globo de diálogo breve, legible, próximo a la ubicación del evento y a una distancia razonable de su sección. El usuario puede tocar el mensaje para cerrarlo. Los mensajes de prueba se retiran solos tras **5.3 segundos**.
3. Variación orgánica de posición sin aleatoriedad agresiva: hasta **cinco desplazamientos leves** y múltiples candidatos anclados al contexto. Cada evento utiliza una variante; nunca aparecer en una zona sin relación.
4. Detector de colisión con título, botones, barra/fecha de cobro, progreso, contador, controles de navegación y cabecera; si no encuentra una ubicación segura, **no aparece**. No desplazar el contenido ni crear una tarjeta exclusiva para el avatar.
5. Máximo **un Gixy/mensaje** a la vez, reemplazo por la novedad más reciente, bloqueo de emisiones duplicadas de un mismo tipo durante 2.5 segundos y respeto de `prefers-reduced-motion`. No usar `localStorage` ni otros datos del cliente en el laboratorio.
6. Motor de avatar: `bot-avatars@0.2.2` **sin cambios**, `shading="plastic"`, `face="eyes"`, expresividad y física oficiales. Check/botón de Misiones V1, PulseHeart rojo de React Bits y campana de la beta original permanecen igual.
7. Fuente de mensajes **determinista**; **no hay un LLM ni conexión al backend** en esta fase. Ejemplos seguros: «¡Terminaste tus misiones! Revisa tu recompensa», «¡Avanzaste en lealtad! Consulta tu nuevo nivel», «¡Tienes una novedad! Consulta tu campana». Jamás afirmar que un cupón ya se aplicó, que durará para siempre o que existe un pago acreditado sin confirmación oficial del servidor.

## Superficies editadas

- `preview/gixys-mi-espacio-espejo/src/companions.jsx`: presentación efímera, ubicación contextual y bloqueo de duplicados.
- `preview/gixys-mi-espacio-espejo/mirror.css`: globo ligero sin cuadro dedicado ni overlays persistentes.
- `preview/gixys-mi-espacio-espejo/check.mjs`: browser smoke y pruebas de seguridad visual.
- `preview/gixys-mi-espacio-espejo/build-mirror.mjs`: versionado de assets, sin tocar fuentes reales.
- Workflow CI de esta rama: Chromium, WebKit, siete anchos y eventos simulados.

La página espejo extrae el DOM verdadero del dashboard de `ayuda.html`, pero sigue con datos sintéticos, sin sesiones ni llamadas al backend. **La integración oficial de GOXION no está autorizada todavía**.

## Para la integración oficial posterior (solamente tras revisión en Safari iPhone)

- Disparar **Hex** exclusivamente tras persistir el progreso de misiones y leer el nuevo estado; usar número de pendientes real.
- Disparar **Circle** tras confirmar lealtad/beneficio desde fuente oficial; corregir centrado exacto del corazón al alinear cabecera, iconos y progreso.
- Disparar **Square** desde el módulo real `04-client-notifications-realtime.js`; la campana debe permanecer desnuda, sin nuevo contenedor.
- Para cupones: consultar elegibilidad, período, aplicación, pago vigente y condiciones reales. Nunca prometer aplicación automática o permanente si no consta en el motor.
- Conectar a Goxy únicamente cuando haya una razón funcional; los Gixys **no hablan con voz ni abren un chat propio**.

**Estado:** beta en prueba, no afirmar aprobación visual ni publicar en Ayuda oficial hasta validación del usuario.
