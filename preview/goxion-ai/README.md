# GOXION · Goxy F6 · Guías reales de soporte + scroll natural

## Vista beta
https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f6

## Correción táctil solicitada
- **Deslizar hacia arriba/abajo sobre Goxy desplaza la página normalmente**. CSS `touch-action:pan-y` también cubre el Canvas generado por robot-heads.
- Ya no se realiza `setPointerCapture()` ni `preventDefault()` en `pointerdown`.
- El corazón solo se activa al mover el dedo claramente **en horizontal** (al menos 24 px y predominio sobre vertical). Los desplazamientos verticales no cuentan como toques ni caricias, tampoco cuando Safari los entrega en el último evento.
- Se conserva la interacción de toques, teclas, las siete expresiones de F4 y las animaciones originales.

## Fase 3 · Guías de ayuda reales (sin IA)
La **fuente única** es `assets/js/ayuda/data/support-issues.js`, cargada ya por `ayuda.html`. No hay ninguna copia de textos en la beta ni se modifica ese archivo.

Flujo: el cliente, ya autenticado, abre el chat → selecciona plataforma → selecciona situación → Goxy muestra **los pasos realmente definidos por GOXION** → ofrece el **contacto humano preexistente** si se necesita autorización.

- Plataformas con guías actuales: Netflix, Disney+, Max, Prime Video, YouTube, ViX, Crunchyroll, Microsoft y Google One.
- Goxy entiende los nombres de plataformas y temas comunes en el mensaje escrito (p. ej., «Netflix actualizar hogar»). Si el problema es ambiguo, muestra opciones; nunca inventa guías no disponibles.
- La guía se convierte a **texto plano** para no inyectar etiquetas HTML en la conversación.
- **No solicita ni guarda** correos de acceso, contraseñas, PIN, códigos de verificación ni datos personales. No usa `sendSmartWA()`, ya que la implementación anterior adjunta información de la cuenta.
- Para una intervención humana, el usuario debe tocar `Hablar con asesor humano`; se reusa el botón oficial `.direct-contact-box button` en Ayuda. No se crea una segunda integración con WhatsApp ni un ticket fantasma.
- Ante consultas de pagos, mora, cupones y saldo, explica que deben consultarse en **Mi Espacio** y ofrece ir a la vista ya existente. No hace cálculos financieros.
- Siguen funcionando los estados `listening`, `thinking`, `searching`, `speaking`, `happy`, `error`. La prueba del error sigue siendo simulada.

## Arquitectura y seguridad
- Todo permanece **exclusivamente en `preview/goxion-ai/`**; no se modifica el Soporte oficial, Admin, Index, Supabase ni motor financiero.
- Nuevo `goxy-support-knowledge.js` es un adaptador de solo lectura a `window.GOXION_DATA.supportIssues`; se carga después de `ayuda.html` y antes de `mascota.js`.
- `mascota.js` mantiene un solo orquestador de estados y añade opciones dinámicas de plataforma, problema y derivación, sin duplicar el soporte anterior.
- Sesión de Mi Espacio sigue siendo requisito; la validación de backend será indispensable **antes de permitir a Goxy consultar datos privados**.
- Sin IA, claves API, escrituras, recolección de códigos ni peticiones de red nuevas.

## QA y continuidad
`node preview/goxion-ai/check.mjs` (o `npm test` desde esa carpeta) comprueba:

- Scroll vertical vs caricia horizontal, sin capturar ni bloquear el puntero.
- Guías reales de Netflix/Disney+/Prime, instrucciones convertidas a texto, no inventar situaciones.
- Selección de marca → problema → guía → derivación oficial.
- «Cambiar de plataforma», texto libre y acceso a Mi Espacio.
- Estados anteriores F5, cancelación de respuestas, pérdida de sesión, foco y accesibilidad.

**Aún debe revisarse físicamente en Safari iPhone** que un deslizamiento vertical sobre la cabeza desplaza la página y uno horizontal produce corazones, antes de dar por cerrado el comportamiento táctil.

Próxima fase: orquestador más amplio y backend autorizado para consultas privadas, luego IA con restricciones de uso y escalamiento humano; no asumir permisos por el mero hecho de estar autenticado en JavaScript.
