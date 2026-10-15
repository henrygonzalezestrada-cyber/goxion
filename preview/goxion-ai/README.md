# GOXION · Goxy F7.2 · Plataformas contratadas primero + IA con estado visible

## Vista beta
https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f7-2

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

## Fase 4 · Conexión de IA aislada
Se añadió un puente cliente sin secretos y una nueva Supabase Edge Function `goxy-ai-beta` con validación HMAC del token, validación del estado del cliente, cuota transaccional de 8 preguntas/24 h y protección contra envío accidental de PIN/correos/códigos.

**La IA requiere una clave `GROQ_API_KEY` configurada en Supabase.** Si no existe, Goxy muestra «IA pendiente de activación» y las guías/canal humano siguen funcionando. Las preguntas con IA solo se habilitan al elegir primero una situación oficial; no consulta ni modifica datos privados de Mi Espacio.

Documento de arquitectura y pasos de activación: [GOXY F7 Gateway IA Beta](../../docs/GOXY_F7_GATEWAY_IA_BETA.md).

## Ajuste F7.1 · Por qué parecía la misma beta
- La F7 añadió backend, pero ocultó el uso de la IA después de elegir guía y el botón no activaba explícitamente un modo de respuesta.
- **Ahora se muestra un panel visible en el chat** con estado real del endpoint autenticado: comprobando, disponible, pendiente de clave o error de conexión.
- Solo cuando el backend confirma `configured:true`, se habilita el botón **Usar IA**. Guía al cliente hacia la plataforma y la situación oficial.
- Tras elegir la guía, el botón **Preguntar con IA** activa el modo de pregunta para esa guía. Se puede mencionar la plataforma en la pregunta sin rebotar al listado de guías.
- Si falta `GROQ_API_KEY`, se informa claramente que iniciar sesión no es suficiente y que las guías siguen funcionando. No se simula conversación IA.
- No se toca `ayuda.html`, Admin, Supabase ni el motor financiero. Se invalidó la caché del CSS/JS en Safari mediante `?v=goxy-f7-1`.

## F7.2 · Contexto mínimo de servicios para orientar primero al cliente
- Al abrir el chat, **Tus plataformas** se rellena automáticamente con los nombres de plataformas que el cliente tiene activas en Mi Espacio, usando `globalClientesData[getCurrentClientKey()].servicios` en el mismo documento y solo si hay sesión válida.
- Si el estado de la vista todavía no está disponible, se reusa la función autenticada existente `goxionReloadPrivateClientView()` como respaldo. El objeto privado se proyecta inmediatamente a una **lista de marcas públicas**, sin conservar ni enviar correo, PIN, perfil, nombre, folio, saldos ni accesos.
- Se detectan todas las marcas de un combo (`HBO Max + Prime Video` → Max y Prime Video), se deduplican y se ordenan de acuerdo con las plataformas registradas en el catálogo de soporte.
- **Atajos visibles desde que abre el chat**, además de la lista prioritaria al pulsar «Tengo un problema de acceso» o «Usar IA». La opción **«Explorar otras plataformas»** da acceso a las que el cliente no tiene contratadas.
- Cliente sin servicios o temporalmente sin datos: mensaje claro y navegación por todas las plataformas. No se muestra información de una sesión anterior.
- La IA permanece pendiente sin `GROQ_API_KEY` en Supabase; estas mejoras **no dependen de esa clave**.
- Todo queda aislado en `preview/goxion-ai/`: ni `ayuda.html`, ni `mi-espacio`, ni tablas financieras, ni la Edge Function cambian.
- Validación: `node preview/goxion-ai/check.mjs` prueba combos, deduplicación, cambio de sesión, privacidad, listados propios/otros, gestos Safari, guías y modos de IA.
