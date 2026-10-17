# GOXION · Gixys · Fase 6: burbuja de escritura progresiva y reacción sin rebote

Fecha: 16/oct/2026. Rama: `beta/gixys-typewriter-dialogos-20261016`. Partimos de la V5 aprobada como dirección estética, no de una integración oficial.

## Solicitud textual del usuario
- El globo no debe desplegar instantáneamente toda la frase. El mensaje debe **escribirse a ritmo moderado**, y el globo **crecer con lo escrito**, tanto en ancho como cuando envuelve renglones.
- Ampliar frases con referencias a **Goxy** como figura principal y a los **Gixys como sus asistentes/pequeño equipo**, sin inventar promesas comerciales, voz propia ni roles de soporte inteligente.
- **Eliminar rebotes al tocarlos**. El toque provoca una reacción del personaje usando la animación original de `bot-avatars@0.2.2` y luego inicia una frase nueva. No introducir física artificial ni spin.
- **Bloqueo de interacción** durante escritura + breve recuperación para evitar superposición de timers, doble toque, retrasos y animaciones trabadas.

## Decisiones implementadas en beta
- Escritura incremental con un solo timer cancelable por frase, **42 ms por carácter**, más una entrada pausada de 190 ms. Respeto de `prefers-reduced-motion`: texto completo inmediatamente.
- Globo GOXION de ancho/alto **calculados del texto realmente visible**, con transición numérica pequeña y techo acotado dentro de la huella espacial preaprobada. Conserva cristal y cola; no aparece otra tarjeta.
- Texto visible progresivo marcado `aria-hidden`, frase completa en una región accesible `aria-live` solo cuando cambia la frase; así no se leen letras individuales por un lector de pantalla.
- Durante escritura, el botón de Gixy está deshabilitado; al terminar hay un cooldown de **240 ms**, y los toques adicionales se ignoran mediante ref síncrona. No se guarda una cola.
- Cada toque aceptado cambia a otra frase; la reacción usa exclusivamente el estado `working` del motor original durante **610 ms** y vuelve al estado `default`.
- Al completar escritura, espera **2.9 s** para leer; en animación existe un watchdog de 10 s; cierre manual mantiene salida limpia. En una nueva frase se cancela toda escritura anterior.
- Nuevos lemas exclusivos para Hex, Circle y Square: «¡Soy Hex, del equipo de Goxy!», «Goxy nos enseñó a cuidar tu confianza», «Goxy nos pidió estar atentos», etc. Solo ficción de marca, nunca afirmaciones sobre cupones/pagos.
- Circle conserva la colocación contextual corregida en `#loyalty-msg`. Sigue pendiente alinear el corazón de forma definitiva cuando llegue la aprobación de integración oficial.

## QA
- El archivo `preview/gixys-mi-espacio-espejo/check.mjs` verifica en Chromium y WebKit: letra progresiva, expansión real, bloqueo ante 14 toques simulados rápidos, cambios de frases, 3 toques sucesivos sin trabarse, 7 anchos (280-768px), ausencia de solape y de peticiones privadas.
- Datos exclusivamente ficticios; no modificar `ayuda.html`, `index.html`, Admin, Supabase ni los controladores oficiales.
- **Siguiente paso**: prueba física del usuario en Safari iPhone; no declarar esta nueva fase aprobada automáticamente.
