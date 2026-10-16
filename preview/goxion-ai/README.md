# GOXION · Goxy F12 · Recuperación de acceso y ficha WhatsApp consentida

> **Documento canónico para nuevos chats y próximos cambios:** [GOXY_CONTINUIDAD_Y_RUTA_2026-10-15.md](../../docs/GOXY_CONTINUIDAD_Y_RUTA_2026-10-15.md). Contiene estado comprobado del PR #120, CI, reglas aprobadas, seguridad, fases anteriores, QA F12 pendiente y pasos de continuidad. **No confundir merge/despliegue beta con aceptación en iPhone ni con Soporte oficial.**

## Vista beta
https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f12

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

## Refinamiento F7.3 · solicitado y aprobado como dirección visual
- Se **retira el recuadro independiente «Tus plataformas»** situado al abrir el chat; no se crea una tarjeta extra ni se repiten opciones.
- Cuando el cliente pregunta por soporte o selecciona el inicio de una guía, Goxy muestra en la propia conversación el encabezado **«Tus plataformas activas»**, las plataformas detectadas como **cápsulas tradicionales del chat** y **«Consultar otras plataformas»**, siguiendo la presentación F7.2 ya usada dentro del diálogo (captura aprobada como referencia).
- El catálogo personal continúa cargándose al abrir el chat con la vista de Mi Espacio. Primero se intenta la lectura síncrona ya hidratada, con respaldo de la consulta autenticada previa solamente cuando falta el estado. Sin enviar nombres de clientes, correos, PIN, saldos ni servicios al proveedor de IA.
- El resto de las plataformas siguen accesibles desde las opciones del chat, con retorno a las contratadas; los estados, el botón y la zona de caricias no cambian.
- Tests simulados comprueban específicamente que no existe la tarjeta, que solo aparece **un menú contextual** al pedir ayuda y que sigue pudiendo consultarse una plataforma no contratada.
- F7.3 solo modifica archivos bajo `preview/goxion-ai/`; **el Soporte oficial continúa intacto**.

## F8 · Conversación directa, con controles de seguridad
- Con el servidor de IA activado, el cliente pulsa **Usar IA → ViX/Netflix/otra plataforma → escribe su consulta**. Se elimina el paso obligatorio de escoger primero una situación específica. No se sustituye el flujo de guías manuales, que permanece disponible.
- El servidor valida la marca contra las nueve plataformas con soporte registrado y construye un contexto limitado **exclusivamente con artículos aprobados**. También conserva el modo anterior que recibe una guía concreta, para asegurar compatibilidad.
- Si falta la clave privada `GROQ_API_KEY`, el panel informa «IA pendiente de activación»; no fabrica respuestas ni realiza solicitudes al proveedor. Una sesión de cliente no equivale a una cuenta en Groq.
- El cliente nunca envía a Groq información financiera, identidades, correos, PIN, números de cuenta ni credenciales. El modelo solo recibe plataforma, artículos públicos y pregunta filtrada; gestión de códigos y autorizaciones se deriva a humano.
- Control servidor: validación HMAC de sesión GOXION, estado del cliente, quota de 8/24 h y 20 segundos entre llamadas. Conversaciones no se almacenan.
- Pruebas: `node preview/goxion-ai/check.mjs`, `node scripts/goxy-f8-context.test.mjs`, `node --test scripts/goxy-f7-security.test.mjs`, `node scripts/goxy-knowledge-sync.mjs`.
- Activación única por administrador: generar clave en GroqCloud y guardarla directamente en **Supabase → Edge Functions → Secrets** bajo `GROQ_API_KEY`; no enviarla por ChatGPT ni subirla a GitHub. El cambio surte efecto automáticamente sin volver a publicar la Edge Function. Después validar respuesta real en la beta y auditar límites/privacidad antes de integrarla al Soporte oficial.

**Estado:** Edge Function `goxy-ai-beta` versión 3 desplegada; proveedor no comprobado aún con una clave real. No afirmar que una consulta fue respondida con IA hasta esa prueba de extremo a extremo.

## F8.1 · Activación verificada y cupo visible
- Tras iniciar sesión, Goxy pregunta al backend si **Groq acepta la clave y ofrece el modelo configurado** mediante el endpoint de modelos. Este chequeo no genera respuestas ni consume la cuota de preguntas de GOXION.
- Si la clave es incorrecta, el modelo no está disponible o Groq falla, el chat comunica que la IA aún no está operativa, en lugar de anunciarla disponible únicamente por existir un secreto.
- Al obtener una respuesta real, el pie existente del chat muestra **consultas de IA restantes dentro de las 24 horas móviles**, sin añadir tarjetas ni cajas dentro de otras.
- El backend usa `reasoning_effort: low` con GPT-OSS 20B para limitar uso innecesario de razonamiento y deja una respuesta corta.
- **Cuota sin cambios**: 8 llamadas por cliente en una ventana móvil de 24 h, mínimo 20 segundos entre llamadas. Las guías oficiales y el asesor permanecen disponibles sin consumir preguntas de IA.
- El proveedor también impone sus límites compartidos por organización/proyecto (solicitudes y tokens); ver `https://console.groq.com/docs/rate-limits`. No es correcto multiplicar el límite individual e interpretarlo como capacidad garantizada.
- Pruebas: `node --test scripts/goxy-f8-1-provider.test.mjs`, `node preview/goxion-ai/check.mjs`, las regresiones de F7 y F8.
- Pendiente **prueba real desde una sesión de cliente** para confirmar que la clave recién guardada genera una respuesta; las herramientas actuales permiten leer/desplegar Edge Functions, no leer Secret values ni suplantar una sesión.

## F9 · Arquitectura híbrida para evitar respuestas repetidas y cuotas desperdiciadas
**Motivación:** el usuario probó el flujo ViX con consultas "Ya coloqué el código pero no responde" y "Qué puedes hacer". El contador se descontó dos veces aunque las respuestas fueron genéricas. La causa era que el backend enviaba al modelo únicamente la pregunta actual y un prompt que impedía conversaciones naturales, sin herramientas privadas.

### Orquestación actual
1. **Sin IA:** saludo/capacidades y pasos de guías existentes. El render de guías tarda ~1,3 segundos en vez de simular una búsqueda de casi 4 segundos.
2. **Sin IA, con servidor autenticado:** tareas/misiones activas del propio cliente (fuente `gamificacion` + `cliente_misiones_progreso`) y promociones públicas activas (fechas de `promociones_catalogo`). Nunca se envían al proveedor; no se registran conversaciones ni se descuenta la cuota de Groq.
3. **Intervención humana sin IA:** códigos de vinculación ya introducidos que requieren autorización, contraseñas y gestiones que Goxy no puede ejecutar. Solo se reutiliza el contacto humano de Ayuda, nunca las credenciales.
4. **Groq opcional:** preguntas adicionales sobre plataforma/guía cuando el cliente elige ese modo. Historial en memoria de hasta tres pares (6 mensajes), filtrado y acotado, no persistido; se borra al cerrar el chat o cambiar de plataforma. El prompt conserva el contexto y pide una aclaración útil antes de repetir un saludo genérico.

### Estado financiero: límite deliberado
No se presentan importes ni próxima fecha como cifras calculadas por Goxy. GOXION B2 utiliza calendario individual/multifecha, abonos, promociones, mora y prórrogas. Las tablas `goxion_b2_cargos` no están materializadas para la mayoría de las cuentas, de modo que extraer un total con cálculos nuevos sería potencialmente erróneo. Mientras no exista un **lector de proyección oficial compartido con Index/Ayuda**, el botón abre Mi Espacio → Ver estado de cuenta. No se altera ni reescribe el motor de cobro para F9.

### Privacidad y seguridad
- `mode:account` validado en `goxy-ai-beta`: firma HMAC, expiración, cliente activo y lista blanca de temas. Solo consultas SELECT de su propio registro/ catálogo público; nunca acciones financieras, PIN, usuario, correo ni claves.
- `mode:chat` reutiliza cuota de 8/24 h y espera de 20 s; no es un límite global de todos los clientes. Groq aplica su propia cuota de proveedor de forma agregada.
- `history` se filtra en cliente **y servidor**, máximo 6 mensajes, sin roles `system` introducidos desde navegador ni secuencias de datos confidenciales.
- La interfaz oficial de Soporte, Index, Admin, tabla financiera y otras Edge Functions **no se modifican**.

### QA
- `node preview/goxion-ai/check.mjs`: gestos, caricias con scroll, guías, contrato de IA, memoria breve, consulta de misiones sin IA y código humano sin IA.
- `node --test scripts/goxy-f9-hybrid.test.mjs`: estado de misiones y progreso, vigencia de ofertas, retorno financiero sin inventar, sanitización del historial, cero consumo IA en consultas propias.
- En beta, probar texto normal y una cuenta de prueba con misiones; validar que la cuota de IA no baje hasta pulsar IA expresamente.
- Próximo hito: integrar con lectura del **mismo cálculo oficial de próximo vencimiento y monto** cuando esté disponible como función read-only validada.

## F10 · Hallazgos de video Safari 15-oct 12:29
- El video aún enseñaba mensajes F8.1, pese a que F9 había sido fusionada: sin despliegue confirmado de Pages posterior. **No atribuir al código F9 comportamientos de una versión antigua publicada.** Invalidación de caché del HTML/JS/CSS con `?v=f10`.
- El iPhone hace zoom al enfocar porque `.gxai-message-input` tenía **12 px**. Ahora usa **16 px** sin tocar los inputs globales de GOXION.
- En Safari dentro de un iframe, abrir el teclado reduce `parent.visualViewport.height` pero no necesariamente el `100dvh` del documento hijo; por eso el compositor quedaba debajo del teclado. El modal adopta las medidas del `visualViewport` visible (padre o hijo), se reajusta en `resize/scroll/focus/blur`, limita el alto y minimiza el pie mientras hay teclado. Al cerrar el chat, se restablece el estado y los estilos. No se cambia el CSS global de Ayuda.
- Para preguntas **«¿Qué puedo hacer?»** y «¿Qué puedo hacer con la misión de referidos?» se usa respuesta gratuita/contexto oficial, no se vuelve automáticamente al menú de plataformas ni se gasta Groq. Se consulta la misión por texto dentro de las tareas vigentes del cliente y se señala si está pendiente/completada, sin inventar condiciones o compartir datos privados.
- Cuando un código es rechazado, el bot diferencia el síntoma y pregunta por el **mensaje de error**, pero jamás pide, recibe o valida el código. Solo la autorización final se escala al asesor.
- El prompt de Groq sigue usando únicamente guías autorizadas, pero prioriza un diagnóstico claro y contexto de la conversación por encima de respuestas de rechazo genéricas.
- El importe de vencimiento permanece reservado al cálculo financiero de Mi Espacio; F10 no duplica el motor B2.
- Validación: prueba mock de chat y viewport del iPhone PASS; seis pruebas de la capa autenticada PASS; Edge Function beta v7 ACTIVE. **Revisión real con Safari en iPhone pendiente**, igual que la comprobación final del proveedor con el nuevo prompt.

## F11 · IA automática sin botón visible
**Decisión de producto:** «Usar IA» era una herramienta de prueba, no un paso que debe hacer el cliente. El cliente escribe en un único chat de Goxy y un **enrutador determinista del navegador** clasifica antes de consultar Groq. El enrutador no usa tokens, no envía contexto privado y no genera costos del modelo.

- **Gratuito, inmediato:** saludo, capacidades, misiones, promociones, próximas fechas (remisión al estado de cuenta oficial), guías conocidas, selección de servicio y autorización/códigos que corresponden a un asesor. Los códigos nunca se solicitan.
- **Falta contexto:** si el usuario escribe «Tengo un problema con Netflix», Goxy pregunta por el síntoma y muestra opción para consultar guías, sin descontar preguntas ni abrir la IA.
- **Guía conocida:** primero se presenta la guía oficial sin IA. La cápsula «Ya intenté esto y sigo con el problema» activa diagnóstico adicional automáticamente solo si es realmente una cuestión técnica. Los procedimientos que precisan autorizar códigos pasan a humano sin llamada a Groq.
- **Falla no cubierta:** si hay plataforma conocida y el usuario describe un problema concreto (por ejemplo «Se congela al reproducir»), Goxy puede consultar automáticamente Groq; la conversación posterior conserva su historia breve. No existe botón para habilitar IA.
- **Si la IA está desconectada o se agota:** sigue disponible la solución gratuita y el asesor; no se inventan respuestas ni se cargan costos adicionales.
- **Visual y velocidad:** Goxy conserva los tres puntos de análisis en búsquedas y llamadas reales. Las respuestas locales no esperan a la IA solo para simular procesamiento. Estado de asistencia avanzado reducido; CTA de IA oculta y no enfocable.
- **Seguridad/cupos:** se conservan token HMAC, validación de cliente en backend, las ocho consultas por cliente/24h, pausa de 20 s, lista blanca de plataformas y filtrado de mensajes e historial en servidor. No se tocó el motor financiero ni el Soporte oficial.
- **Calidad:** se distingue explícitamente entre una *guía con botón de asesor* y una *autorización que solamente puede hacer el asesor*. En el catálogo original todas las guías ofrecen asesor, así que usar ese marcador como veto universal bloquearía por error la IA para todos los problemas.

Pruebas F11: `node preview/goxion-ai/check.mjs` cubre pregunta ambigua, síntoma → IA, seguimiento con memoria, guía con autorización → humano y cero IA, guía técnica → aclaración automática, navegación sin gasto, cuenta sin IA, scroll/caricias y teclado Safari. Verificar en Safari físico antes de pasar a Ayuda oficial.

## F12 · WhatsApp que envía el cliente, sin bandeja en Admin
El cliente debe pulsar **Confirmar y abrir WhatsApp** y después **Enviar** dentro de WhatsApp. El enlace se prepara desde el número de soporte ya existente en Ayuda, `NUMERO_GOXION`. `wa.me` **no envía notificaciones automáticamente** y Goxy nunca debe anunciar que el mensaje se envió; no existe doble envío a Admin.

- **Acceso sin IA:** cuando una plataforma contratada (ej. ViX) solicita contratar Premium, Goxy comprueba la contratación en Mi Espacio, pide distinguir correo/contraseña frente a QR. Si es QR, pide el tipo de dispositivo (Smart TV, Fire TV, Roku, móvil, PC u otro) antes de preparar la solicitud para el asesor.
- **Correo o PIN:** los accesos autorizados se consultan en las tarjetas oficiales de Mi Espacio. Goxy lleva a la tarjeta concreta sin pedir, escribir ni copiar al chat el PIN o la contraseña. Si hay actualización de contraseña pendiente, abre el aviso original conservando la confirmación y la regla de una sola vista.
- **Ficha de WhatsApp:** incluye nombre/ID de cliente de la sesión actual, plataforma afectada, correo de acceso asociado si existe, diagnóstico estructurado, comprobaciones y acción requerida. **El cliente ve el texto íntegro antes de compartirlo**, puede cancelar, y la URL se construye únicamente en el clic de confirmación. Nunca incluir PIN, contraseña, código QR, código alfanumérico, token, ni transcripción completa.
- **Límite de privacidad:** para el correo de servicio, el consentimiento consiste en la revisión explícita del texto y el clic de confirmación. Ese valor solo procede del estado de Mi Espacio autenticado y no se envía a Groq ni se persiste en registros de Goxy. El WhatsApp oficial recibe el mensaje únicamente cuando el cliente lo envía.
- Si cambia la sesión después de preparar la ficha, se invalida; las referencias y servicio se comprueban de nuevo antes de abrir el enlace.
- No se crean tablas ni funciones financieras. **Solo cambia `preview/goxion-ai/`**: Ayuda oficial, Admin, Index, motor financiero B2, cuotas de Groq y servicio de IA continúan intactos.

### Pruebas
`node preview/goxion-ai/check.mjs` cubre acceso ViX QR, dispositivo, vista previa sin envío automático, cancelación, apertura de WhatsApp solo tras confirmación, datos del cliente correcto, sesión cambiada, rutas a PIN/contraseña oficial y regresiones F11, animaciones y teclado Safari. Queda pendiente una comprobación visual real en iPhone con cliente de prueba y la recepción efectiva en WhatsApp.


## F13 · Información financiera oficial y conversación con ritmo natural (beta, pendiente de aceptación)
- **Sin rehacer Goxy**: el chat conserva F1–F12, gestos, PIN de vista única y ficha WhatsApp consentida. Solo `preview/goxion-ai/` tiene cambios de ejecución.
- **Pagos B2**: `goxy-payment-read.js` usa exclusivamente el endpoint oficial autenticado `estado-financiero-b2-beta` con `accion:"mi_estado"`. Presenta los cargos vigentes que la misma cotización B2 entrega a Index: servicio, ordinal real de perfil, fecha efectiva (incluido acuerdo pactado), importe ya calculado, total pendiente y próximas fechas. Si el ciclo no está conciliado, se bloquea la presentación de cantidades. No se calculan beneficios, mora o descuentos nuevos.
- **Fecha única**: lee `estado_financiero` oficial, fecha_corte y total_actual **en pesos**, sin repartir arbitrariamente entre servicios. El estado pagado se distingue; si el servidor no confirma fuente/fecha/importe, no se inventan cifras.
- **Consulta flexible**: «Cuánto debo», «próximo vencimiento», «cuánto de ViX»; cápsulas «Próximo vencimiento», «Todo junto», plataformas cuando corresponda y perfiles identificados con fecha. «Realizar mi pago» llama al `irAlTicket()` original de Mi Espacio, que mantiene la ruta B2/fecha única y sus verificaciones; Goxy no cobra ni crea comprobantes.
- **Misiones**: preguntar por «misión ver catálogo» o continuar «¿qué hago en ver catálogo?» conserva el tema de misiones; para la tarea de Catálogo existente muestra indicación concreta **abrir la pestaña Catálogo**, sin enviarlo a soporte de plataformas ni gastar IA.
- **Presentación**: indicador de tres puntos algo mayor y animado; burbujas/respuestas locales y opciones entran con retraso visual breve, accesible con movimiento reducido. Las consultas al servidor mantienen su animación mientras se validan.
- **Cuota IA**: continúa la política real **8 consultas/24 h móviles** y al menos **20 s entre solicitudes aceptadas**, sin modificar SQL ni Edge. El navegador mantiene una espera visual para el siguiente turno, permite sustituir la pregunta por el último texto y solo reintenta automáticamente un **RATE_LIMIT corto** (máx. ~35 s y un reintento). No retiene mensajes durante un bloqueo largo o cupo agotado. Consultas de pagos, misiones y saludos interrumpen la cola y no gastan Groq. Cierre de sesión y cierre de chat cancelan timers y peticiones.
- **Pruebas**: contrato JS/DOM simulado con **179 aserciones PASS** mediante ejecución aislada del harness existente sobre los fuentes F13; proyección B2 de dos perfiles/fechas y fecha única verificadas. Falta revisión Safari física, servidor con cuenta autorizada real y prueba de navegación a Index. No sustituye la aceptación F12 pendiente ni modifica el Soporte oficial.

## F14 · Prórroga, proyección por fecha, lealtad e iOS (beta, sin aceptación física)
- **Capturas y video 15/oct:** «Y si no puedo pagarlo?» después de consultar fecha/importe se desviaba a lista de plataformas. El video de Safari confirma un segundo problema: al desplegar el teclado el chat se comprime y aparece el contenido trasero al desplazarse.
- **Intención contextual:** conserva si la conversación anterior fue de cobros, identifica las expresiones «no puedo pagarlo», «no voy a poder pagar», «si pago hasta...», «¿cuánto de mora?» y dudas de lealtad; todas se atienden sin Groq ni cuota diaria.
- **Prórroga oficial:** `goxy-payment-read.js` consulta solamente `estado-financiero-b2-beta / mi_prorroga`, con token del cliente. Distingue elegible, acuerdo ya pactado y no disponible. La tarjeta menciona límite 5 días, una por período, efecto sobre mora y lealtad. Botón «Solicitar prórroga» invoca únicamente el control existente de Mi Espacio si sigue visible y elegible; Goxy no pacta por sí mismo, ni evita las guardas del servidor.
- **Simulación futura:** la Edge Function `goxy-ai-beta`, versión 8 desplegada en Supabase, tiene `mode:"forecast"`. Verifica HMAC/sesión/cliente activo, acepta solo fecha válida de hoy a 45 días y consulta RPC **read-only oficiales**, nunca formula propia: `goxion_estado_financiero(p_hoy)` para fecha única, o `goxion_b2_cotizar_ciclo(p_hoy)` para B2. No cambia saldos ni consume cuota Groq. Compara período/cotización y evita cifras cruzando a otro período en fecha única. El importe proyectado asume que no hay otro pago, y NO equivale a saldo definitivo. La proyección B2 **no certifica el cargo futuro de reactivación**; se explica expresamente ese límite, no se inventa el 20%.
- **Políticas:** el cargo adicional del 20% se llama *reactivación* por atraso superior a 15 días, no cancelación, y solo aparece como cantidad cuando lo confirma el motor oficial. Lealtad: máxima tasa y requisitos proceden de `estado_financiero.reglas.lealtad`, no se estima cantidad futura con descuentos incompatibles.
- **Fecha en lenguaje natural:** entiende ISO, día/mes/año, «el 31 de octubre», «en 5 días», «mañana»; si es ambigua, ofrece selector nativo y validación 45 días. Ningún campo de fecha se utiliza como ID ni autoriza operaciones.
- **Pantalla y teclado iPhone:** elimina el cálculo doble del viewport iframe/padre; el modal con teclado usa toda la altura visible útil. Congela desplazamiento de `body` guardando/restaurando la posición original; backdrop más opaco, scroll vertical permitido dentro del chat, navegación/cierre de modal sin fugas. Conserva fuente input de 16 px y gestos aprobados.
- **QA preliminar**: 191 aserciones PASS sobre fuentes de la beta (DOM simulado), cubren F1-F13, extensión elegible/usada, proyección por fecha, lealtad y bloqueo/restauración scroll. Falta Safari físico, consulta real con cliente autorizado, verificación financiera de fechas cruzadas y aceptación del usuario; mocks no equivalen a producción validada.

## F15 · Rectificaciones a partir de tres capturas (15/oct/2026)
- **Garantía comercial y reactivación**: los términos de Ayuda, en `modal-garantia`, contemplan mora de 5% diario hasta 50% y cargo administrativo de 20% sobre saldo adeudado después del umbral por inactividad sin reporte. El Index oficial evalúa más de 15 días de atraso o suspensión. La proyección B2 actual calcula mora pero **no devuelve reactivación como partida**: Goxy advierte cuándo podría aplicarse y abre la garantía comercial publicada, sin sumar un cargo hipotético al saldo confirmado. **Pendiente financiero**: si se pretende mostrar un monto exacto de reactivación B2 futuro, implementarlo primero en la fuente oficial/contrato del motor, con pruebas de calendario individual, protección de prórroga y abonos. No duplicar el cálculo en Goxy.
- **Contraseñas**: la ruta local detecta «¿Cuál es la contraseña de ViX?» además de contraseñas olvidadas/nuevas. No usa IA ni revela secretos. Si existe aviso pendiente, envía a la vista oficial con confirmación y revelación única. Si no existe, explica que la revelación no se repite y propone asesor humano para recuperar acceso, sin afirmar que conoce la contraseña.
- **Precio de contratación**: «Si contrato Disney cuánto pagaría mensual» no debe disparar Groq ni agotamiento de cuota; lleva a Catálogo/promociones donde se confirma plan, disponibilidad y tarifa final. No inventar importes fuera del motor comercial.
- **Picker móvil**: selector iOS de fecha futura y botón «Calcular importe» en una sola columna grid minmax(0,1fr) con anchura y límites explícitos; evita superposición horizontal.
- **Cache**: index.html F15 invalida `goxy-access-routing.js`, `mascota.js`, `mascota.css`, `goxy-payment-read.js`; flujo F14 servidor permanece activo.
- **QA aislado**: 200 aserciones PASS simuladas sobre las fuentes de F15 (regresiones anteriores + contraseña, consulta comercial, explicación condicionada 20%, enlace a garantía comercial y CSS). Falta Safari físico y aceptación de usuario. No se modificaron Index/Ayuda oficiales ni SQL/Edge financieros.

## F16 · Selector de fecha compacto en una sola fila (15/oct/2026)
- **Motivo:** tras F15, el usuario confirma que los demás flujos funcionan pero el calendario y el botón quedaron uno debajo del otro. Pide mantenerlos **juntos**, asimétricos, enmarcados y proporcionalmente compactos, con la pregunta separada arriba.
- **Solución acotada:** `showForecastDate()` crea un `label` accesible independiente, un `input[type=date]` nativo y el botón «Calcular importe», en ese orden. CSS consolidado de F14/F15 en un único grid 1.6fr:1fr, espacio horizontal 9 px, fila del título completa, controles de 46 px, radios 16 px y ajustes leves a anchos ≤360 px. Un panel previo se retira antes de abrir otro para evitar duplicidad. Sin cambiar la lógica/fecha mínima/máxima.
- **QA:** 212 aserciones de regresión simuladas PASS en los fuentes F16; prueba visual adicional en Chromium móvil de referencia a 320, 355, 375, 390 y 430 CSS px: igual altura, ambos controles alineados en Y, sin solapes, CTA sin overflow y sin scroll horizontal. **Pendiente:** revisión final en Safari físico del usuario (el picker nativo iOS puede variar). No se tocó el backend, cálculos B2, login, promociones ni componentes oficiales.

## F17 · Corrección raíz del selector de fecha iPhone (15/oct/2026)
- **Error observado en F16:** el selector de fecha nativo Safari desbordaba su propia pista de grid: el borde se montaba sobre «Calcular importe» y el texto aparecía pegado arriba, pese a `min-width:0`. El usuario confirmó el problema mediante captura de Safari.
- **Corrección estructural, no otros márgenes:** reemplazamos el campo nativo como elemento de layout por un contenedor `gxai-date-slot` con anchura y alto finitos, `overflow:hidden` y su fecha visible centrada vertical y horizontalmente. `input[type=date]` sigue existiendo como área interactiva real con opacidad 0 y posicionamiento absoluto dentro del contenedor; el usuario toca directamente el input nativo y recibe el picker de Safari. `input/change` sincronizan el rótulo visual desde su valor ISO. Accesibilidad conservada por label/id y aria-label; sin datos privados.
- **Una sola fila:** título arriba, controles en segunda fila con proporción 1.57:1, separación 10px (7px ≤360), idéntica altura 46px, sin ancho intrínseco del WebKit. No se alteraron cálculos de pago ni la fecha seleccionada.
- **QA:** 219 comprobaciones simuladas PASS y verificación independiente con navegador Chromium móvil sobre layout equivalente a 320/355/375/390/430 CSS px: gap 7–10px sin superposición, alineación Y exacta, rótulo centrado y scroll horizontal 0. **Pendiente:** aceptación visual real del usuario en Safari iPhone. No se afirma que una prueba Chromium sustituya Safari.
