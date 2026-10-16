# GOXION · Goxy — estado verificado, decisiones, lecciones y ruta de continuidad

> **Documento de traspaso para abrir un CHAT NUEVO sin perder el contexto. Corte: 15 de octubre de 2026, después del merge del PR #120.**
> **Repositorio:** https://github.com/henrygonzalezestrada-cyber/goxion — rama oficial `main`.
> **Beta actual de Goxy:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/?v=f12
> **IMPORTANTE:** F12 está **fusionada y desplegada en GitHub Pages como BETA AISLADA**, pero **NO aprobada para sustituir el Soporte oficial**. Faltan pruebas reales en Safari y de envío/recepción de WhatsApp. La última ejecución de integridad terminó con fallo en el paso general «Browser smoke». La verificación estática/integridad y otras suites pasaron; **no afirmar que el fallo general fue causado por Goxy sin leer sus logs**.
>
> **Principio de fuente de verdad:** repositorio `main` + Edge Function realmente desplegada + datos oficiales del backend > este documento fechado > README y planes antiguos > capturas. Revisar antes de afirmar que algo está publicado.

## 0. Instrucciones inmediatas al próximo asistente

1. Leer este documento COMPLETO; después `AGENTS.md`, `docs/GOXION_ESTADO_Y_LECCIONES_2026-10-14.md`, `docs/GOXION_VISUAL_CONTRACT.md` y `preview/goxion-ai/README.md`. Esas referencias no reemplazan la inspección del código vigente.
2. Confirmar con el conector de **GitHub** el HEAD actual de `main`, PR #120, issue #119, últimas ejecuciones de **GOXION · Integrity** y **pages build and deployment**, y código bajo `preview/goxion-ai/`. Confirmar con **Supabase** la versión/estado de `goxy-ai-beta` antes de intervenir.
3. **Continuar desde F12, NO recrear F1–F11.** Última entrega concreta: consentimiento y ficha WhatsApp lista, diagnóstico Premium/QR, enrutamiento a Mi Espacio; todo en **beta solamente**.
4. Si el usuario pide una corrección o nueva función, **aplicarla directamente al repositorio** con herramientas conectadas; no responder solo con bloques para copiar y pegar cuando el conector GitHub permita editar. Crear rama aislada, hacer pruebas, PR, revisar archivos cambiados y publicar beta únicamente cuando corresponda. Comprobar el despliegue de Pages antes de afirmar que el enlace está actualizado.
5. **No tocar** `ayuda.html` oficial, `index.html` de clientes, `admin.html`, tablas financieras, acciones B2 ni otras experiencias, salvo autorización explícita y posterior al cierre de beta.
6. El siguiente objetivo NO es rediseñar a Goxy: **hacer la aceptación real F12** y corregir cualquier falla de navegación, seguridad, WhatsApp, pantalla/teclado iPhone o claridad del diálogo. El usuario quiere **el cliente pulsa «Enviar»** dentro de WhatsApp; no pidió envíos automáticos mediante WhatsApp Business API.
7. Cuando se cierre un paso importante, actualizar aquí su resultado real, incluyendo PR/commit, pruebas, capturas, pendientes. No dar por aprobada una fase sin aceptación del usuario.

## 1. Visión de producto y decisiones aprobadas

**GOXION** gestiona múltiples servicios de streaming y cuentas/beneficios. **Goxy** es su mascota-robot interactiva y asistente del cliente dentro de **Mi Espacio → Soporte**; en una fase futura el usuario quiere que conviva en otras áreas y acompañe tareas, **pero NO implementar ese alcance todavía**.

### Comportamiento objetivo (irrenunciable)

- Un solo chat natural: el cliente **no activa manualmente la IA**. Goxy clasifica la intención **sin llamar al modelo**. Primero resuelve con guías y lectura autorizada de GOXION; si es ambiguo, pide una aclaración; si una guía técnica no basta, puede consultar Groq automáticamente; si requiere autorización de cuenta, deriva a humano directamente.
- No quedar atrapado en menús rígidos ni contestar siempre con un texto predefinido. Debe ser útil: comprender lo que ya intentó el cliente, explicar un siguiente paso concreto y **no repetir preguntas** que Goxy ya hizo.
- **La IA es una herramienta interna de Goxy**, no una promesa de resolver operaciones que el modelo no puede ejecutar. El estado de cuenta y los datos sensibles vienen de las fuentes oficiales, no de adivinanzas del modelo.
- Reducir costo: saludos, «¿Qué puedes hacer?», plataformas contratadas, guías conocidas, consultar misiones/promos, recuperar acceso y preparar derivaciones no gastan cuota de Groq.
- **Handoff humano ágil por WhatsApp:** antes de derivar, Goxy recopila **plataforma, cuenta afectada, síntoma, tipo de dispositivo, comprobaciones realizadas, correo de acceso asociado** (si disponible y con consentimiento del cliente). Presenta una **ficha completa** y el cliente pulsa **«Confirmar y abrir WhatsApp»**; en WhatsApp pulsa **«Enviar»**. El administrador recibe directamente ese mensaje sin entrar a Admin ni volver a preguntar lo mismo. Si el cliente cancela, no abrir WhatsApp.
- WhatsApp es un **canal de excepción** cuando hay acciones que necesitan humano. El objetivo a largo plazo es resolver cada vez más en Goxy; no crear un flujo donde todo derive inmediatamente a WhatsApp.
- Nunca pedir PIN, contraseña, token o códigos de vinculación/verificación en el chat. **No poner credenciales en la ficha, en prompts de Groq, en URLs de WhatsApp, en logs ni en el historial de IA**. El correo del servicio, cuando es necesario para soporte, aparece en la ficha **visible y consentida**.
- **PIN y credenciales:** permitir al cliente llegar con Goxy a su tarjeta oficial de Mi Espacio (correo/nombre de perfil y control «Mostrar PIN»). Para contraseña cambiada, navegar al aviso existente que pide confirmar PIN de GOXION y permite **una sola visualización**. No reproducir ni guardar contraseñas o PIN dentro del diálogo Goxy.
- Diseño consistente: negro profundo, cristal/blur equilibrado, morado-cian, Poppins en Ayuda, animaciones del robot sin saturación, sin cajas dentro de cajas, minimización de scroll y sin scroll horizontal. El usuario **aprobó** las plataformas como **cápsulas tradicionales dentro de la conversación** («Tus plataformas activas» + «Consultar otras plataformas»), NO dentro de un recuadro «Tus plataformas» adicional al abrir.

### Ejemplos que motivaron las correcciones

- «ViX me pide contratar Premium» estando contratado: probablemente se cerró la sesión. Goxy debe preguntar si hay opción **correo/contraseña** o **solo QR**; si hay login normal, guiar hacia la tarjeta de credenciales; si solo QR, pedir dispositivo (Smart TV, Fire TV, Roku, móvil, PC, otro), explicar que requiere asesor y preparar ficha.
- Usuario escribió «Bixby»: **no equiparar automáticamente a ViX**, ya que Bixby también es un asistente del teléfono. Preguntar cuál quiso decir.
- «Ya puse el código y no responde»: no gastar IA ni pedir el código; distinguir el síntoma y derivar para autorización. Primero aprovechar lo que se sabe del caso.
- «Olvidé el PIN del perfil»: enlazar con la función oficial «Mostrar PIN» sin revelar el valor en la conversación.
- «Cambiaron mi contraseña»: comprobar si hay aviso de contraseña nueva pendiente y enlazar con el **proceso de visualización única**; si no existe, ofrecer asesor.
- El usuario consumió 8 consultas mientras probaba distintas versiones. La cuota usa **ventana móvil de 24 horas**, no se reinicia en cada despliegue ni necesariamente a medianoche. El reinicio/control de la cuota beta independiente sigue pendiente.

## 2. Estado real comprobado al cierre (15/oct/2026)

| Componente | Estado | Evidencia / límite |
|---|---|---|
| Fases anteriores hasta F11 | Fusionadas en `main` como funciones beta | PR #104, #105, #112–#118; revisiones posteriores prevalecen |
| **F12**: acceso guiado + ficha WhatsApp con consentimiento | **Fusionada en `main`**, beta publicada; **aceptación física pendiente** | [PR #120](https://github.com/henrygonzalezestrada-cyber/goxion/pull/120), merge `0d926751dcd8a4522395e1ecedac552208d724be` |
| GitHub Pages F12 | **SUCCESS** en `main` | ejecución `38811987801` (la URL `?v=f12` debe abrir el nuevo loader) |
| CI `GOXION · Integrity` del merge F12 | **FAILURE** en **Browser smoke** | ejecución `38811988868`; «Verify repository integrity», Opiniones beta/oficial, Realtime y Cart pasaron. No atribuir a Goxy sin inspección |
| Regresión específica de Goxy | **PASS** según PR #120, con DOM simulado | `node preview/goxion-ai/check.mjs`; **no sustituye Safari real** |
| Servicio IA en Supabase | `goxy-ai-beta` **ACTIVE, v7** | proyecto ID `hmpevcwodcgbkviarfic`; confirmado mediante el conector; Goxy F12 **no cambió** el backend |
| Proveedor Groq | clave `GROQ_API_KEY` configurada por el usuario en Supabase; respuestas reales observadas en pruebas F8 | No leer/exponer clave. Comprobar vigencia/modelo desde status seguro |
| Autorización producción de Soporte | **NO** | `ayuda.html` oficial sigue intacto; Goxy sigue en `preview/goxion-ai/` |
| Ficha WhatsApp | Implementada en beta; **no recepción real comprobada** | `wa.me` abre borrador solo con confirmación; el cliente debe enviarlo |
| Fechas e importes B2 exactos desde Goxy | **NO IMPLEMENTADO** | dirigir a estado de cuenta oficial; nunca calcular aparte |
| Extender Goxy a otras áreas | **FUTURO** | idea del usuario, sin tareas aprobadas actualmente |

**Issue de F12:** [#119](https://github.com/henrygonzalezestrada-cyber/goxion/issues/119) sirve como especificación y checklist; su estado debe revisarse antes de cerrarlo (puede seguir abierto aunque el PR #120 esté fusionado).

**Importante:** el archivo `preview/goxion-ai/README.md` es acumulativo e incluye párrafos de fases antiguas («IA pendiente» o contacto original). Interpretar cada fase por su fecha y preferir el código actual + este resumen para distinguir lo vigente.

## 3. Cronología resumida — qué NO reconstruir

- **F1–F2:** Goxy robot inspirado en robot-heads, comportamiento visual, gesto de tocar, varias expresiones (feliz, sorpresa, guiño, amor, etc.), caricias y corazones. El robot no abre el chat por sí solo; CTA **«Hablar con Goxy»**. Estilos GOXION. Betas aisladas.
- **F3–F6:** integración gradual de guías oficiales del soporte, animaciones, interacción móvil/Tamagotchi y corrección crítica: deslizar verticalmente sobre Goxy **debe permitir desplazar la página**; la caricia horizontal sí activa reacción. No interceptar touch vertical ni hacer `setPointerCapture` agresivo.
- **F7–F7.3:** puente seguro a IA y reconocimiento de plataformas contratadas por cliente; atención a combos multimarcas, cambio de sesión y privacidad. Se eliminó la tarjeta duplicada de «Tus plataformas»; conservar SOLO cápsulas dentro del chat, más «Consultar otras plataformas».
- **F8–F8.1:** `goxy-ai-beta` usa Groq de servidor; preguntas por plataforma, sin obligar a seleccionar siempre una guía. Verificación del proveedor/modelo real; indicador de cuota restante después de respuestas.
- **F9:** soporte híbrido: saludos/guías y lectura autenticada de misiones/promociones sin IA; memoria breve de los turnos de IA; mejor continuidad, derivación de códigos a humano. **No conectar aquí saldos B2 con cálculos nuevos**.
- **F10:** soluciones concretas por síntoma y misión; campo de escritura de **16 px** (evitar zoom de Safari iPhone), ajuste del modal al `visualViewport` del iframe/padre cuando aparece teclado. Mantener input visible, scroll natural.
- **F11:** **desapareció el botón «Usar IA»**. Enrutador local gratuito: pedir contexto si consulta ambigua, primera guía gratuita, Groq solo en necesidad técnica, humano en autorizaciones, no gastar cuota por saludo o código.
- **F12:** tras aprobación del usuario **«Sí, que el cliente solo pulse enviar»**, se creó recuperación de acceso (Premium, correo/contraseña vs QR, dispositivo), navegación a Mi Espacio y ficha previsualizable. En el clic confirmado abre WhatsApp oficial, donde el usuario pulsa Enviar. PR #120 ya merged. **Aún no aprobada en iPhone**.

## 4. Mapa real de código y propietarios

### Beta aislada — `preview/goxion-ai/`

| Archivo | Responsabilidad actual |
|---|---|
| `index.html` | Host beta, iframe **same-origin** de `../../ayuda.html`; inyecta CSS, knowledge, contexto, router, ficha, puente AI y mascota, luego cambia a Soporte; caché `goxy-f12` |
| `mascota.js` | Robot y chat; animaciones/tacto; clasificación F11, priorización de cuenta, diagnóstico F12, aclaraciones, UI, ficha previa, consentimiento y apertura WhatsApp; historial IA efímero |
| `mascota.css` | Cristal/colores, chat, modal/teclado iPhone, caricias; estilo scoped bajo `#view-soporte` |
| `goxy-heads-entry.js` | Render/entrada visual del robot, identidad y gestos originales |
| `goxy-support-knowledge.js` | Adaptador de **una sola fuente oficial**: `assets/js/ayuda/data/support-issues.js`; plataformas, búsqueda de guía e instrucciones, sin copiar precios ni credenciales |
| `goxy-client-context.js` | Usa estado autenticado de Mi Espacio: `globalClientesData`, `getCurrentClientKey()`, `GOXION_CORE.getClientToken()`, `goxionReloadPrivateClientView()`; lista blanca de marcas, servicios, referencias de tarjeta y **correo de acceso asociado solo para ficha consentida** |
| `goxy-access-routing.js` | Diagnóstico local gratuito de Premium, QR, PIN, contraseña nueva; navegación a las tarjetas originales de Mi Espacio |
| `goxy-whatsapp-handoff.js` | Genera ficha textual **sin PIN/clave/código** y enlace `https://wa.me/<NUMERO_GOXION>?text=...`. No envía automáticamente |
| `goxy-ai-client.js` | Puente browser→Edge Function; envía pregunta/guía/historial breve filtrado, o consultas de cuenta con lista blanca; **ninguna clave de Groq en browser** |
| `check.mjs` | Regresiones del robot/chat, sesión, WhatsApp, iOS, guías, IA híbrida (DOM simulado) |
| `README.md` | Manual histórico con secciones F1–F12; leer última sección vigente, no asumir que todo el texto antiguo describe UX actual |

### Componentes oficiales **solo para reutilizar**, no modificar por inercia

- `ayuda.html`, `assets/js/ayuda/01a-shared-state.js` y `assets/js/ayuda/01e-client-dashboard.js`: Mi Espacio, identificación de cliente, tarjetas por servicio y funciones `gxToggleServiceCard` / `gxServiceView`, `gx-credential-notice-* `, `gx-service-card-* `, control oficial **Mostrar PIN** y visualización única de contraseñas actualizadas con confirmación de PIN GOXION.
- `NUMERO_GOXION` proviene del estado oficial de Ayuda (`GXCORE.BUSINESS.WHATSAPP`); **no inventar ni hardcodear otro número**. El antiguo `sendSmartWA()` adjunta campos no apropiados; no reutilizarlo para Goxy.
- `assets/js/ayuda/data/support-issues.js`: guías oficiales, sin duplicar el catálogo en F12.
- `supabase/functions/goxy-ai-beta/index.ts` y `knowledge.json`: servicio independiente, Groq `openai/gpt-oss-20b` del lado servidor; valida sesión/estado, filtra mensaje, ofrece status/consultas read-only/chat. Versión activa verificada: **7**.
- `supabase/migrations/202610150001_goxy_ia_beta_cuota.sql`: función de cuota `goxy_ai_beta_take_quota`. **8 consultas por cliente durante 24 h móviles**, al menos 20 segundos entre intentos. Límite por cliente GOXION separado de límites globales/tokens del proveedor Groq.
- `scripts/goxy-f7-security.test.mjs`, `scripts/goxy-f8-context.test.mjs`, `scripts/goxy-f8-1-provider.test.mjs`, `scripts/goxy-f9-hybrid.test.mjs`: pruebas de seguridad/contratos de etapas anteriores; incluirlas en regresión cuando se toque backend.

## 5. Flujos F12 concretos y qué comprobar

### A. «Me pide contratar Premium» en servicio ya contratado
1. Confirmar **servicio del cliente actualmente autenticado**. Si escribió «Bixby», preguntar si se refiere a ViX o al asistente del teléfono; no asumir.
2. Si contratado, preguntar si aparece login con **correo/contraseña** o **únicamente QR/código**.
3. Si correo disponible: ofrecer abrir tarjeta original del servicio en Mi Espacio; mostrar datos allí, no en chat. No pedir contraseña.
4. Si QR: preguntar **tipo de dispositivo** (Smart TV/Fire TV/Roku/móvil/PC/otro); identificar causa y preparar derivación a asesor sin invocar Groq.
5. Si hay varias cuentas de ViX u otro servicio, **preguntar cuál**; nunca seleccionar la primera arbitrariamente.

### B. PIN, perfil y contraseña
- «¿Dónde está mi PIN?» → abrir tarjeta oficial y control Mostrar PIN. Si falta un dato, informar, no inventar.
- «Hay una nueva contraseña» → Goxy comprueba si existe entrega pendiente y **enlaza al aviso oficial**, preservando su confirmación y la política de una sola visualización.
- Si no hay actualización pendiente: informar sin afirmar que no existe contraseña, y ofrecer asesor.
- **No copiar secretos** de Mi Espacio al chat, WhatsApp, Groq o almacenamiento nuevo. No simular revelación de una sola vista desde un popup de Goxy.

### C. Ficha WhatsApp
1. Sólo cliente autenticado; referencia al servicio y, si hay varias cuentas, selección explícita.
2. Preparar resumen con datos verificables: **cliente, referencia, plataforma, servicio afectado, correo de acceso asociado, síntoma, dispositivo y comprobaciones**. No copiar transcripción libre completa ni inventar acciones intentadas.
3. Vista previa visible para cliente. El cliente elige **«Confirmar y abrir WhatsApp»** o **Cancelar**. Cancelar no abre el enlace.
4. Revalidar sesión antes del clic. Abrir `wa.me` únicamente después de confirmación. **El cliente todavía debe pulsar ENVIAR en WhatsApp**: un enlace no notifica automáticamente. Jamás decir «enviado» solo por abrir la app.
5. Confirmar que llega al WhatsApp de GOXION y permite responder rápido sin volver a preguntar correo y contexto. No crear bandeja Admin para esa notificación: el usuario decidió WhatsApp por practicidad.
6. Auditar uso de identificador y correo: son datos de contacto de un servicio, no deben compartirse **sin mostrar íntegramente la ficha**; revisar que ninguna referencia/secreto extra escape por error.

## 6. Seguridad y arquitectura: restricciones estrictas

- **No enviar jamás a Groq ni a WhatsApp:** password, PIN de perfil, PIN GOXION, códigos QR, tokens, códigos de verificación, datos financieros confidenciales, historial completo o credenciales de terceros. Si la aplicación requiere ver un secreto, que sea exclusivamente dentro del control oficial de Mi Espacio.
- **Goxy no autoriza**, no cambia contraseñas, no inicia sesión por el usuario, no realiza cobros ni modifica obligaciones. Consulta y guía con scopes limitados.
- El cliente y plataforma deben venir de **sesión autenticada**; no recibir `cliente_id` libre desde UI en funciones privilegiadas.
- Cambiar de cliente o cerrar sesión debe invalidar contexto y ficha anterior. Conservar historial de IA solamente en memoria efímera del chat actual, filtrado; no persistir conversaciones privadas.
- El mensaje `wa.me` prellenado viaja en URL hacia WhatsApp tras consentimiento explícito; minimizar campos al mínimo necesario. Confirmar que el número corresponde al soporte oficial vigente.
- No activar IA para decidir si se necesita IA: **la clasificación es gratis, local o determinista del backend**.
- El estado de cuenta B2 tiene **calendarios multifecha, abonos, lealtad, promociones, mora y prórrogas**. Goxy todavía NO devuelve automáticamente montos/fechas exactos; remite a **Mi Espacio → Ver estado de cuenta**. Cuando se programe lectura, **reusar el proyector financiero oficial**, nunca recálculos independientes.
- No exponer `GROQ_API_KEY` en GitHub, clientes, chat o consola pública. Solo secreto de Edge Function de Supabase; jamás enviar claves al asistente.
- Si se necesita envío WhatsApp automático en el futuro, requerirá **WhatsApp Business Platform/proveedor, opt-in, backend y controles**; el usuario decidió expresamente **NO necesitarlo ahora**.

## 7. QA móvil y fallos históricos que no se deben repetir

1. **Safari zoom:** input de 12 px causaba zoom al enfocar. F10 lo dejó **≥16 px**; no retroceder.
2. **Teclado tapa el composer:** dentro de iframe la altura `100dvh` no siempre refleja el teclado; Goxy sincroniza con `parent.visualViewport`. Validar Safari físico, cierre teclado, orientación, chat largo, safe area, scroll y no scroll lateral.
3. **Caricias bloquean scroll:** mantener `touch-action:pan-y` y clasificación de caricias **horizontales**; no bloquear gestos verticales.
4. **Tarjeta duplicada «Tus plataformas»:** eliminada en F7.3. Sólo cápsulas propias en el diálogo y opción para otras.
5. **Guías repetitivas/IA sin memoria:** F9 conserva contexto de pocos turnos IA y prioriza diagnóstico útil. No reintroducir respuestas genéricas ni obligar a activar un modo IA.
6. **Contactar humano demasiado pronto:** tener el botón de asesor en toda guía **no significa** que toda guía requiera autorización. Escalar sin IA solo acciones que un humano debe ejecutar (vinculaciones, autorizaciones); guías técnicas pueden requerir explicación de IA.
7. **Despliegue viejo por caché:** incrementos `?v=fN` y query de assets. **No confundir merge en `main` con actualización de Pages**. Verificar workflow Pages finalizado y que `index.html` refiera la versión correcta.
8. **Falsos éxitos:** pruebas con mocks NO prueban Groq real, WhatsApp recibido ni Safari físico. Resaltar pendientes reales.
9. **CI genérico:** algunas ejecuciones fallaron en `Browser smoke` mientras QA específico Goxy/integridad pasaba. No ocultarlo ni culpar a Goxy sin logs.
10. **Evitar tres días por una corrección:** primero inspeccionar módulo dueño, guías reales, estado de sesión, contrato visual y tests. Cambios atómicos en rama beta, revisar diff, pruebas focalizadas, PR y feedback del usuario; no reinventar un motor ni rediseñar toda Ayuda/Admin.

## 8. Próxima ruta de ejecución (orden sugerido)

### P0 — Cerrar y aceptar F12 (NO empezar una nueva fase visual antes)
- [ ] Abrir **beta F12 actual** en Safari iPhone con cliente de prueba autenticado; comprobar que carga la versión nueva y mantiene el buen comportamiento de F11.
- [ ] Test con **ViX contratado → «Premium» → «solo QR» → dispositivo → asesor → elegir cuenta correcta → vista previa → confirmar → abrir WhatsApp → pulsar Enviar** y verificar recepción en el WhatsApp de GOXION.
- [ ] Test con **correo/contraseña disponible**, varias cuentas ViX, cambio de cliente, sesión caducada y cancelación; ninguna filtración de PIN o de otras cuentas.
- [ ] Test **olvidé PIN**: enlazar a tarjeta y control oficial. Test **contraseña actualizada**: conserva PIN de confirmación y una sola vista sin presentar secreto en chat.
- [ ] Test **cupo agotado** (8/24h): todo el diagnóstico local + ficha WhatsApp deben seguir disponibles sin Groq.
- [ ] Revisar logs y causa real del **Browser smoke FAIL** del workflow de PR #120; separar falla histórica WebKit splash si es ajena. Exigir pruebas focalizadas verdes y reportar CI general claramente.
- [ ] Auditoría de contenido de ficha: cliente/servicio correctos, correo solo tras consentimiento; no claves, PIN, códigos, transcripción completa, ni repetición del problema. Revisar cambio de servicio *después de preparar* la ficha.
- [ ] Tras aprobación del usuario: marcar F12 cerrada y documentar versión exacta. **No fusionar en Ayuda/Soporte oficial sin instrucción explícita.**

### P1 — Robustez de soporte híbrido y ahorro de IA
- [ ] Construir catálogo adicional de diagnósticos frecuentes desde casos reales (sesiones cerradas, QR, apps que piden Premium, errores de reproducción) con un paso útil y pregunta de confirmación; sin reglas genéricas que bloqueen toda IA.
- [ ] Ofrecer **cupo de pruebas aislado** para admins/testers, sin gastar las 8 preguntas de clientes ni debilitar producción. Diseñar con cuota separada y autorización, no reinicios manuales improvisados de consumo histórico.
- [ ] Medir porcentaje de consultas resueltas sin Groq, escaladas, rechazadas por cuota y necesitadas de humano **sin guardar PII ni conversaciones sensibles**.
- [ ] En caso de reporte de clave/modelo, volver a verificar `status` seguro del backend; no afirmar que IA funciona únicamente porque existe el secreto.

### P2 — Información oficial más amplia, solo lectura
- [ ] Integrar la **misma** lectura/proyección B2 que alimenta el próximo cobro en Index/Mi Espacio: importe, fecha próxima, calendarios multifecha, descuentos, mora y acuerdo. No usar `total mensual` cuando el cobro próximo es individual.
- [ ] Misiones y promos: fortalecer elegibilidad, vigencia y contexto particular del cliente; ya existe lectura básica en `goxy-ai-beta` sin Groq.
- [ ] Otras tareas y ubicaciones de Goxy: el usuario anunció idea futura, **esperar requisitos específicos** antes de diseñar.

## 9. Instrucciones de estilo y trabajo con el usuario

- Idioma: **español mexicano**, cercano, profesional, claro; resumir resultados sin extensas explicaciones de funciones si el usuario solo quiere probar.
- Prefiere **cambios aplicados por el asistente directamente en GitHub**, no fragmentos o instrucciones para que él pegue manualmente. Ya están conectados GitHub y Supabase para trabajar; conexión/permiso debe verificarse en cada sesión.
- Estética: premium de GOXION, cristal y blur, morado/cian, evitando recuadros dentro de recuadros, contornos gruesos, scroll excesivo y elementos descuadrados; priorizar densidad informativa cuidada.
- Evitar decir «hecho» por un PR abierto, «publicado» por mera fusión, «funciona» por prueba con mocks o «WhatsApp enviado» por abrir el enlace. Diferenciar **desarrollado / mergeado / Pages deploy SUCCESS / probado en dispositivo / aceptado**.
- Preparar beta, enlace directo con versión correcta y PR, describir **qué probar específicamente** en Safari. Reaccionar al feedback; no reabrir diseños/gestos aprobados sin necesidad.
- Mantener ruta escrita y lecciones para futuros chats; actualizar este documento luego de cada cierre mayor.

## 10. Texto exacto sugerido para comenzar el próximo chat

> **Continuemos GOXION / Goxy desde el último estado real.** Repositorio `henrygonzalezestrada-cyber/goxion`. Antes de editar, abre y lee COMPLETO `docs/GOXY_CONTINUIDAD_Y_RUTA_2026-10-15.md`, `AGENTS.md`, el contrato visual y los archivos actuales de `preview/goxion-ai/`. Goxy F12 está fusionada mediante PR #120 y publicada **solo en beta**, pero no aprobada aún en Safari físico; Issue #119. El objetivo inmediato es validar/corregir F12 (Premium/QR, múltiples servicios, PIN/contraseña por vistas oficiales y ficha WhatsApp revisable; el CLIENTE pulsa Enviar). NO toques Soporte oficial ni B2. Usa los conectores GitHub/Supabase, implementa tú los cambios, haz QA de regresión y confirma GitHub Pages antes de entregarme la URL. Muéstrame qué queda pendiente sin asumir que mocks equivalen a pruebas reales.


---

## 11. Continuación F13 — revisión de capturas y evolución de la beta (15/oct/2026)
**Contexto:** el usuario probó la beta F12 en Safari y mostró cuatro capturas con: pago que devolvía solo «ve a Mi Espacio»; pregunta sobre la misión «ver catálogo» que terminaba en menú de plataformas; seguimiento de la misión con respuesta demasiado genérica; y consulta técnica rápida que producía «Goxy necesita una pequeña pausa» tras Groq. Solicitó que Goxy se convierta en interfaz de consulta útil y natural, sin reescribir el proyecto.

**Implementación F13 aislada (rama `beta/goxy-f13-pagos-dialogo-cooldown`):**
- Lectura financiera cliente **solo lectura y autenticada** desde `estado-financiero-b2-beta` / `mi_estado`: fuente oficial compartida por Index/Mi Espacio. B2: fecha efectiva por cargo, nombre y ordinal del perfil, importe exacto en centavos, total pendiente validado contra la cotización, elección próximo/todos/plataforma/perfil. Fecha única: `estado_financiero` con fecha_corte y `total_actual` en pesos. Sin motor nuevo, sin pagos ni cifras extrapoladas.
- Botón **Realizar mi pago** llama a la función `irAlTicket()` original, no construye rutas manuales ni omite comprobaciones de régimen financiero. No supone pago realizado.
- Seguimiento contextual de misiones; la misión del catálogo sigue el contrato de la pestaña `catalogo` ya implementado, no una guía de plataforma.
- Burbujas y opciones con aparición visual progresiva/indicador animado, sin bloquear Safari ni movimiento reducido.
- Para respuestas Groq, consulta en espera y última pregunta gana; no se obliga a reescribir ni se malgasta solicitud durante la espera de 20 s. Si llega `RATE_LIMIT` transitorio con `retry_after` corto, un reintento programado; si es largo, se muestra fallback gratuito. No modifica la cuota de 8/24 h en servidor.
- Archivos de ejecución F13: `preview/goxion-ai/goxy-payment-read.js` (nuevo), `mascota.js`, `mascota.css` e `index.html`; ampliar `check.mjs`.
- Verificación preliminar **PASS**: 179 aserciones ejecutadas sobre el mismo harness JavaScript con DOM simulado en runtime aislado y prueba específica del lector financiero (dos vencimientos de ViX + fecha única); los montos de prueba no son cuentas reales. F12 permanece tal como estaba.
- **F13 NO está aceptada en Safari físico**. No considerar que las cuatro capturas previas demuestren las nuevas funciones. Antes de cualquier integración oficial, comprobar en sesión real: «próxima mensualidad», «todo junto», «ViX perfil 1/2», fecha única, saldo B2 en revisión, redirección a Index, misión catálogo, último mensaje mientras espera Groq, 8/24 h, cerrar chat/cambiar cliente y privacidad.

**No concluir que la UI oficial cambió:** las modificaciones son de la beta. Documentar PR/merge/Pages/CI al publicarse. Mantener pendiente Issue #119 de aceptación F12. El fallo histórico de CI `Browser smoke` de F12 fue un timeout de splash de Ayuda en WebKit, sin prueba de que Goxy lo originara.

---

## 12. Goxy F14 — intención financiera, pronóstico oficial e iOS (15/oct/2026)
**Origen:** feedback con 2 capturas y video de ~108 segundos en Safari iPhone. Después de la consulta «próximo pago: 15 de octubre, $353», al preguntar «Y si no puedo pagarlo?» Goxy desplegaba plataformas de soporte. Con teclado activo, el chat se veía demasiado pequeño y permitía mover el fondo.

**Acuerdos vigentes:**
- Goxy debe explicar la prórroga, comprobar `mi_prorroga` del cliente y mostrar cuándo procede o cuándo ya se utilizó. No puede prometer disponibilidad sin leer el servidor; una por cliente/período, únicamente el día de vencimiento original y máximo +5 días, con consecuencias de incumplimiento.
- Debe responder qué pasaría si el cliente paga en una fecha futura con una **simulación del motor** y no con reglas sueltas. El 20% tras más de 15 días corresponde a **reactivación**, no a «cancelación». Requiere proyección confirmada; fechas de un período distinto pueden bloquearse.
- El nivel máximo de lealtad es el definido por las reglas oficiales (6% a nueve pagos puntuales, cuando elegible), no un descuento sobre cualquier promoción.
- Reducir el desplazamiento del fondo y adaptar el chat al teclado del iPhone sin bloquear su scroll interno.

**Cambios F14 aislados:**
- Rama `beta/goxy-f14-finanzas-chat-ios-20261015`: `mascota.js`, `mascota.css`, `goxy-payment-read.js`, `goxy-ai-client.js`, `index.html`, `check.mjs`, Goxy Edge `supabase/functions/goxy-ai-beta/index.ts`. No toca `ayuda.html`, Index, Admin ni motores SQL.
- `goxy-ai-beta` v8 ya desplegada como beta en Supabase, con nueva lectura `mode:"forecast"` read-only tras HMAC y cuenta activa. Los RPC oficiales permiten `p_hoy`: `goxion_estado_financiero` para fecha única y `goxion_b2_cotizar_ciclo` para régimen B2. Se verifica fecha hasta 45 días adelante, cotización y período, sin IDs libres ni claves en navegador, sin escrituras ni consumo de cuota Groq.
- Para B2 la cotización no devuelve reactivación como partida: informar que está **sin confirmar**, no inferir 20% ni cero. Para fecha única, mostrar la reactivación únicamente si `cargos.reactivacion` viene validada del proyector oficial.
- El usuario permanece en Goxy para explicaciones; para activar prórroga se invoca la UI oficial de Mi Espacio y para pagos el `irAlTicket()` original. Goxy nunca activa acuerdos ni cobra.
- Detectar mensajes elípticos en el contexto de pagos (especialmente «Y si no puedo pagarlo?»), pedidos de simulación futura y lealtad. Reutilizar límites de visibilidad F12, no compartir PINs ni datos con Groq.
- Bloqueo restaurable del scroll de fondo en Safari mediante `body` fijo; modalidad teclado usa viewport visual del padre sin doble reducción; el scroll del chat permanece vertical.
- Pruebas locales con **191 aserciones** en DOM simulado PASS: escenarios elegible/usada, fecha futurible, lealtad, bloqueo y restauración del scroll, regresiones F13 y WhatsApp F12. No hay aún confirmación física ni comparación con saldos reales.
- **Próxima aceptación:** pruebas en Safari real con cliente de una fecha (pago 15/Oct) y B2 varias fechas: preguntas sobre prórroga, fecha futura (en mismo mes y cruzando), valor máximo de lealtad, teclado y desplazamiento. Cuando el usuario lo apruebe, marcar F14 cerrada. **No fusionar Soporte oficial sin aprobación explícita.**

---

## 13. GOXY F15 — tres capturas posteriores a F14 (15/oct/2026)
Feedback real: el simulador B2 de mora explicó `$122.50` y `$24.50` pero no pudo informar el 20%; un selector de fecha estaba descuadrado (el botón se montaba sobre el calendario); y dos consultas gratuitas («si contrato Disney cuánto pagaría» / «cuál es la contraseña de ViX») consumieron ruta IA y mostraron pausa repetida. El usuario confirmó que todo lo demás de F14 se siente más fluido y está bien.

La política publicada en `ayuda.html` en la sección Garantía Comercial contempla: mora 5% diario máx. 50%; baja/cancelación por 15 días de inactividad sin reporte con 20% administrativo sobre saldo adeudado. El Index actual usa condición `diasAtraso>15 || suspendido` y la etiqueta «reactivación». Sin embargo el RPC `goxion_b2_cotizar_ciclo` todavía NO expone la reactivación en B2: **no prometer una cifra ni sumarla a la deuda ficticiamente**. F15 muestra explicación condicional clara y acción de abrir los términos; para dar importe exacto se necesitará fuente financiera compartida con importe de reactivación por cargo.

Se ajustó F15 en beta: el detector reconoce preguntas amplias de contraseña y redirige a notificación de vista única o asesor según elegibilidad de datos; pregunta de precio abre Catálogo sin Groq; date picker y CTA ahora usan grid vertical para evitar el desborde con fecha nativa iOS; strings F15 evitan caché de Safari. QA de 200 aserciones de DOM simulado pasó. Siguen intactos los bloques oficiales, controles de privacidad y cuotas del servidor.

**Pendiente:** confirmar visualmente en Safari real y la ausencia de pausas en las consultas locales; no integrar soporte oficial sin aceptación. Todo lo aprobado en F14 se conserva. No modificar el motor B2 para «resolver» un texto de Goxy: preparar primero la integración contable si se exige la cantidad exacta.

---

## 14. F16 · Una fila con fecha y CTA, visual proporcionado (15/oct/2026)
El usuario envió captura de F15 y pidió **no entregar código para aplicación manual**, sino aplicar el cambio directamente a GitHub, respetando el ritmo visual del chat: pregunta arriba y dos controles alineados en una sola fila, con campo de fecha más ancho y botón compacto. Causa: reglas CSS contrapuestas acumuladas de F14 y F15 y `label` con picker anidado que ocupaba una columna completa.
- Rama `beta/goxy-f16-date-row-framing-20261015`: CSS de calendario consolidado y DOM del panel reorganizado; grid asimétrico 1.6:1, alturas iguales 46 px, separación vertical de 9 px, márgenes compactos, título independiente accesible por `htmlFor`, selector nativo iOS intacto, ajuste móvil ≤360 px. Solo archivos de beta, pruebas y documentación.
- Verificación: 212 aserciones simuladas PASS del harness de Goxy. Inspección adicional de geometría/render de referencia en Chromium 320/355/375/390/430 px con fila compartida, sin desbordamiento horizontal ni solape del texto. No se afirma prueba real en Safari/iPhone hasta recibir validación del usuario.
- No tocar lógica financiera, UI oficiales o fuentes de pagos. Evitar superponer nuevos bloques CSS para el mismo selector cuando se corrija un encuadre; sustituir reglas contradictorias y validar a varios anchos antes de entregar.

---

## 15. F17 · Arreglar causa raíz de date input Safari sin más prueba-y-error (15/oct/2026)
**Captura F16:** aunque grid declaraba dos columnas 1.6:1 y pasaban los tests DOM, WebKit expandía el campo de fecha nativo y montaba su borde sobre el CTA, con texto verticalmente desalineado. Esta falla explica por qué cambios de porcentajes/espaciados F14–F16 no resolvieron el problema. El usuario pidió frenar el retrabajo estético.

**Ruta correcta F17:** campo nativo `input[type=date]` absoluto dentro de `gxai-date-slot` limitado por su grid y overflow hidden, con rótulo de fecha visible en `span` centrado mediante CSS grid/place-items. El picker sigue siendo nativo y es el propio input quien recibe interacción, sin `showPicker()` programático ni simular fechas. `input/change` actualizan rótulo; `label/aria-label` mantiene accesibilidad. Mantener título arriba y CTA a la derecha, controles de 46px y margen horizontal explícito, con caché F17.
**QA:** 219 aserciones simuladas PASS sobre fuentes de rama, + verificación geométrica real en Chromium a 320/355/375/390/430px con separación 7–10px, altura igual, centraje de rótulo y ausencia de scroll horizontal. No afirmar prueba real Safari iPhone hasta verificación del usuario. No cambiar cálculos SQL/Edge, cobros, Admin, Ayuda ni Index.
