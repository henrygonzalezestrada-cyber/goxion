# GOXION · Experiencia del cliente — GUÍA MAESTRA DE CONTINUIDAD
**Corte:** 17/oct/2026. **Carácter:** documento de traspaso y control de decisiones. **PRIORIDAD DE LECTURA AL ABRIR UN NUEVO CHAT.**  
**Repositorio:** https://github.com/henrygonzalezestrada-cyber/goxion  
**Regla más importante:** **Ninguna aprobación individual de fase/beta autoriza tocar producción.** GOXION publicará **todas las mejoras de la lluvia de ideas juntas**, solo tras aprobación explícita del paquete completo. Ver [Issue #142](https://github.com/henrygonzalezestrada-cyber/goxion/issues/142).

## 0. Instrucciones operativas para el próximo chat/agente (leer primero)
1. **Trabajar directamente en GitHub**, tal como históricamente se ha hecho: descubrir y usar el conector GitHub (`mcp__GitHub__fetch_file`, `create_branch`, `update_file`, `create_file`, `create_pull_request`, `merge_pull_request`, etc., según permisos y herramientas realmente disponibles). Revisar el HEAD de `main` y el estado de las ramas/PR **antes** de afirmar nada. Si el conector de escritura no está realmente disponible en el nuevo entorno, comprobar conexiones/herramientas y comunicar la limitación brevemente; **no afirmar que carece de acceso sin verificar**. No prometer acceso garantizado a través de chats.
2. No pedir al usuario que copie/pegue código ni dar tutoriales como sustituto cuando las herramientas permitan editar. El flujo preferido es **inspeccionar → cambio en beta aislada → QA → PR de beta → despliegue verificado → enlace y 2–4 puntos de revisión → aceptación explícita**.
3. Para ahorrar conversación: **respuestas breves**, sin repetir toda la historia, sin listas de opciones interminables; usar este archivo y los documentos especializados como fuente de verdad. Informar solo resultados, bloqueos y la siguiente decisión que necesite el usuario.
4. **No tocar `ayuda.html` oficial, Index, Admin, Goxy oficial, APIs/DB ni motor financiero** para desarrollar esta iniciativa. Tampoco fusionar un PR a producción «porque la beta fue aprobada». Son aceptables PRs de beta que añaden solo archivos `preview/`, workflows de beta y documentación, tras validar su alcance y el despliegue.
5. Conservar los diseños y módulos oficiales, reutilizar sus estructuras y clases, evitar contenedores duplicados, información redundante, scroll innecesario y desplazamientos al mostrar overlays. Responsive en iPhone/Safari/WebKit; pruebas Chromium/WebKit y sin llamadas de datos reales en betas.
6. **No confundir la propuesta recién expuesta por el usuario con una orden de implementarla**: primero discutirla brevemente en su próxima conversación o proporcionar una propuesta muy concreta antes de codificar. No declarar Bloque 1 aprobado hasta su confirmación.
7. Ante discrepancias entre esta guía y el código/decisiones posteriores, prevalecen **instrucciones nuevas del usuario + código HEAD y despliegues comprobados**. Corregir el documento solo después de constatarlo.

## 1. Visión de los personajes — decisión expresa del usuario
- **Goxy = inteligencia central**: conoce GOXION, explica, diagnostica, soluciona situaciones complejas y prepara derivaciones excepcionales al humano (WhatsApp con confirmación del cliente). **No debe aparecer constantemente** ni competir con sus pequeños asistentes. Mantener su propio motor y reglas de privacidad.
- **Gixys = ayudantes de Goxy**: orientan en cada contexto, hacen vivir la página, son divertidos, ocasionales y **funcionales**. Pueden avisar con datos puntuales confirmados, celebrar, acompañar, mostrar pistas y dirigir a Goxy cuando algo sea complejo. **No son otro chatbot ni sustituyen a Goxy.**
- Frase guía: **«Goxy es la inteligencia que resuelve; los Gixys son la vida que acompaña».**
- Apariciones con propósito, no siempre texto o globos. No cubrir controles ni alterar el contenido. Referencias ligeras a Goxy, sin prometer cupón, pagos ni acciones no confirmadas.
- El usuario validó esta **división de responsabilidades**, todavía dentro del plan de nuevas mejoras; no equivale a autorizar publicación.

## 2. Lluvia de ideas general — mapa RECONSTRUIDO, pendiente de ratificación integral
En charla previa se presentó esta matriz; **no tratarla como una ratificación individual definitiva de todos sus nombres/alcances** hasta que el usuario cierre el mapa maestro:
| # | Idea | Decisión reconstruida |
|---|---|---|
| 1 | Mi Espacio anticipa la próxima acción relevante | Aprobada para plan |
| 2 | Acompañamiento contextual (Gixys orientan; Goxy resuelve) | Aprobada para plan, redefinida |
| 3 | Seguimiento claro del comprobante | Aprobada para plan |
| 4 | Seguimiento adicional de incidencias de Soporte por Goxy | **Descartada** |
| 5 | Explicar próximos pagos/fechas/importes/moras | Aprobada para plan |
| 6 | Misiones oportunas | Aprobada para plan |
| 7 | Lealtad emocional y comprensible | Aprobada para plan |
| 8 | Notificaciones útiles y priorizadas | Aprobada para plan |
| 9 | Avisos preventivos de fallas confirmadas para afectados | Aprobada para plan |
| 10 | Recomendaciones personalizadas del catálogo | **Descartada** |

**Importante:** descartar el seguimiento adicional de incidencias (#4) NO implica descartar avisos de fallas (#9). Queda prohibido convertir en función las ideas descartadas sin nueva aprobación.

Etapas globales: **E1 — claridad/autoservicio (1,3,5)**; **E2 — personalización (2,6,7,8)**; **E3 — atención preventiva (9)**; auditoría e **integración conjunta** al final. Propuesta de bloques de ejecución: **B1 Mi Espacio inteligente**, **B2 claridad financiera/comprobantes**, **B3 acompañamiento Gixys-Goxy/misiones/lealtad/avisos**, **B4 recompensas y secreto 5%**, **B5 avisos preventivos**; la partición de B1–B5 es una ruta de ejecución propuesta, no un permiso de lanzamiento. Gixys tuvieron además Bloques A (microinteracciones), B (personajes) y C (contexto).

## 3. Gixys V9 — visual APROBADO, lanzamiento oficial NO autorizado
- Beta congelada: **https://henrygonzalezestrada-cyber.github.io/goxion/preview/gixys-mi-espacio-espejo/?v=9**.
- [PR #140](https://github.com/henrygonzalezestrada-cyber/goxion/pull/140), docs `docs/GIXYS_FASE2_...` a `docs/GIXYS_FASE9_NO_REFLOW_AURORA_2026-10-17.md`.
- Original `bot-avatars@0.2.2`, `shading=plastic`, ojos expresivos; Gixys son un solo equipo sin nombres particulares para clientes. Microinteracciones de misiones (check/botón), PulseHeart rojo React Bits, campana original, globo que se escribe de forma fluida sin reflujo de palabras, alegría/corazones/destellos, posiciones contextuales, **overlay fixed sin desplazar contenido**, premio visual Aurora inspirado en Colorion, no confeti barato.
- Se rechazaron rebotes exagerados, giros, salida automática tras cuatro toques, tarjetas nuevas para Gixys, nombres Hex/Circle/Square visibles, reemplazar Goxy, saturar textos.
- **Falta:** animar corazón **solo cuando la racha/nivel real se alcanza**, confirmado por motor de lealtad (no al mero toque, no por texto ni al recargar). Definir backend y reglas de **secreto 5% real**: elegibilidad, vigencia, exclusiones, combinabilidad con registro −10%, promociones/combos/lealtad, perfiles/cuentas, una vez por cliente/período, integridad y auditoría. Beta = DEMOSTRACIÓN, sin premio auténtico. Conectar misiones/notificaciones solo tras confirmación de estados reales. Revisar junto con el paquete completo.
- **Incidente precedente:** PR #141 publicó prematuramente Gixys en oficial. Reversión [31668eb](https://github.com/henrygonzalezestrada-cyber/goxion/commit/31668eb2725a367cd19b7a948c3b586a0aeedfa2), Pages éxito, beta intacta; **NUNCA repetir este patrón**.

## 4. Trabajo actual — Etapa 1 / Bloque 1: Mi Espacio inteligente
- Objetivo: que **una única información/acción prioritaria** dependa del estado auténtico del cliente, **sin duplicar notificaciones ni acciones**, sin crear otro motor financiero. Leer `docs/GOXION_EXPERIENCIA_E1_B1_MI_ESPACIO_INTELIGENTE_2026-10-17.md`.
- Beta ya creada/publicada en **`preview/experiencia-mi-espacio-inteligente/`**; [PR #143](https://github.com/henrygonzalezestrada-cyber/goxion/pull/143) **fusionado SOLO como beta**, no en `ayuda.html` oficial. URL de revisión: **https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/**.
- Rutas beta: `build.mjs` (extrae DOM real de `ayuda.html`), `priority-engine.js` (lógica pura), `smart-demo.js` (9 escenarios sintéticos), `smart.css`, `check.mjs`, `index.html`. La beta usa datos inventados y simulación local, sin sesión, Supabase, tokens, cobros, mutaciones de cuentas ni Goxy.
- Simulaciones: próximo pago, multifecha, comprobante en revisión, corrección, vencido, prórroga, misión pendiente, al corriente, sin servicios. Próximo cobro por obligación/fecha, no total mensual; revisar comprobante sin insistir en volver a pagar; moras no estimadas por UI sin respaldo.
- QA dedicada de beta **PASS** en GitHub Actions `GOXION · Experiencia E1 B1 · Mi Espacio inteligente Beta` (run `39085827746`), Chromium/WebKit; la integridad general `GOXION · Integrity` del mismo trabajo tuvo run FAIL `39085844951`: **leer log antes de atribuir causa**, no ocultar. Confirmar estado actual de Pages al entregar cambios nuevos.
- **ESTADO VISUAL REAL:** **NO APROBADO**. El usuario probó la beta y dijo que no entiende por qué **aparece otro bloque arriba** (preguntó si eran notificaciones prioritarias), y que la tarjeta existente conserva **«Tu próximo corte» incluso si el escenario no tiene relación con un cobro**. Esto demuestra que el diseño inicial es redundante y no aprovechó el carácter dinámico de la tarjeta principal.
- **IDEA DEL USUARIO — explícitamente NO ES ORDEN, solo a considerar:** Si hay una notificación de importancia, **mostrarla brevemente en la tarjeta principal dinámica**, hacer una transición/animación hacia la campana y luego **restaurar el contenido contextual legítimo** de esa tarjeta. Como alternativa, puede aparecer **algún «Gift»**; por contexto probablemente quiso decir un **Gixy**, pero **confirmar la palabra si fuera relevante, sin asumir**. El objetivo: sin segunda tarjeta añadida ni bloques que saturen; notificación claramente distinguible, breve y sin alterar pagos/fecha.
- La tarjeta `#dash-billing-card` tiene hoy encabezado fijo «Tu próxima fecha de corte»/«Tu próximo corte»; **nunca mostrar ese rótulo cuando el escenario es comprobante, misión, servicio sin pagar o sin servicios si carece de sentido**. Resolver con contenido y encabezado verdaderamente contextuales, evitando múltiples superficies de atención.
- **Siguiente acción recomendada**: proponer **una sola** interacción «tarjeta original → aviso breve → señal visual hacia campana → tarjeta restaura contenido correspondiente», con tiempo y excepciones concretas; validar brevemente la intención/alternativa Gixy antes de implementarla. Luego aplicar **directamente** en la beta E1/B1 con GitHub, actualizar QA (no layout shift, no CTA engañosa, accesibilidad/reduced motion), publicar la beta y pedir revisión visual de 2–4 puntos. Mantener 9 escenarios y matriz base, cambiar su **presentación**, no duplicar cálculos ni levantar tarjetas redundantes. No integrar aún los Gixys reales en esta beta salvo aprobación expresa; pueden reutilizarse más adelante.
- **NO TRAER A PRODUCCIÓN NI DECLARAR B1 APROBADO**: lo último del usuario fue crítica y una idea alternativa, no aprobación.

## 5. Próximas fases y dependencias
1. **Terminar E1/B1**: aprobar jerarquía/contexto/animación integrada y ausencia de duplicación.
2. **E1/B2**: explicación comprensible de pagos (multifecha, próxima obligación, descuentos/mora/prórroga) y comprobantes (recibido/en revisión/aprobado/requiere corrección), reusando B2 existente, sin segundo motor.
3. **E2/B3**: Gixys contextuales (beta V9 ya aprobada visualmente) + Goxy inteligencia central, triggers reales; misiones, lealtad (corazón solo hito real), notificaciones.
4. **E2/B4**: secreto/cupón 5% (normativa y backend) y celebraciones, sin descuentos ficticios en oficial.
5. **E3/B5**: fallas confirmadas y aviso preventivo limitado a clientes afectados, sin habilitar seguimiento adicional de casos descartado.
6. **Auditoría integrada de todas las betas + validación del usuario + única autorización expresa de despliegue conjunto**.

## 6. Líneas rojas visuales y de proyecto
- GOXION: negro, morado/cian, Poppins, tarjetas cristal con blur equilibrado; jerarquía premium sin recuadros dentro de recuadros, densidad informativa inteligente, sin scroll lateral. Mantener títulos/márgenes/medidas coherentes y botón de cierre X circular cian estándar. Nunca tapar controles o desplazar contenidos por overlays.
- «Aprobado» sobre **un bloque** significa aprobar **ese diseño/beta**, no producción. No introducir cambios de fases no discutidas.
- Goxy es central; Gixys orientan y celebran, **no resuelven problemas complejos**. Si se requiere inteligencia, derivar a Goxy con contexto y consentimiento según función.
- Política pagos: fecha multifecha por servicio, próximo importe de obligación correcta, mora/lealtad individuales cuando corresponda, prórrogas según servidor; no recalcular ni inventar importes en front.
- No exponer ni guardar PIN, contraseñas, tokens ni información personal en el laboratorio o en documentos.

## 7. Al iniciar el nuevo chat, mensaje mínimo del usuario
> «Continuemos GOXION desde `docs/GOXION_EXPERIENCIA_CLIENTE_CONTINUIDAD_MAESTRA_2026-10-17.md` y el Issue #142. Estamos en E1/B1. Revisa el código y PR #143 y mis últimos comentarios sobre la tarjeta dinámica, sin añadir otro bloque. Trabaja directamente en GitHub sobre una beta, comprueba QA/Pages y envíame el enlace; nada a oficial hasta aprobación del paquete completo.»

**Límites de verdad:** esta guía registra decisiones conversacionales y hechos GitHub verificados a la fecha, no garantiza conectores disponibles en otras sesiones ni sustituye verificar el HEAD y los despliegues futuros. **El último feedback sobre la tarjeta no está implementado aquí; es el trabajo pendiente.**


## 8. Regla nueva del propietario · Validación en espejo al CERRAR CADA bloque (17/oct)
**Nueva aprobación explícita de método de trabajo**: desarrollar la mejora en beta aislada; antes de pedir cierre visual de **cada** bloque, ofrecer una **vista espejo de la versión oficial de Ayuda/Mi Espacio**, con la estructura/navegación/clases/tipografía y proporciones reales, sin scripts de sesión ni datos productivos. **Una maqueta suelta nunca basta para cerrar un bloque**.

- El laboratorio de estados debe ser **separado de la interfaz que evaluará el cliente**: oculto por defecto y activable con control compacto propio de beta. Mostrar el diseño sin controles de depuración, y permitir abrirlos para recorrer estados ficticios.
- El espejo debe extraer estructura real de \`ayuda.html\` cuando sea posible y cargar **solo CSS de Ayuda**; jamás dar estética operativa de Admin a la experiencia cliente. Preservar campana, tarjetas, lealtad, servicios, jerarquía Poppins, comportamiento responsive y safe areas.
- **Prohibidos visuales genéricos, textos de relleno, widgets tipo dashboard administrativo, cajas adicionales, degradados decorativos que compitan y animaciones que parezcan una plantilla generada por IA.** Las microinteracciones deben tener propósito, continuidad y física sobria; respetar el ADN real de Ayuda.
- No basta con validar la pieza sola: probarla integrada con las áreas vecinas, encabezado, campana, estado de cuenta, misiones y Gixys cuando corresponda. Sin desplazar contenido ni tapar controles. Safari físico: pendiente de revisión del propietario hasta que lo confirme.
- Pruebas por bloque: 280/320/360/375/390/430/768px, Chromium/WebKit, ausencia de scroll horizontal/reflow, sin solicitudes privadas ni persistencia en demo, reduced motion, teclado/cierre/foco, casos excepcionales.
- La aprobación en espejo **aprueba ese bloque**, pero NO autoriza el lanzamiento. Todas las fases siguen bloqueadas para producción hasta integración completa, QA global y autorización final (Issue #142).

### E1/B1 · variante V3 para revisión, NO aprobada
- La notificación importante **no es una segunda tarjeta ni un cálculo del motor**. Se muestra temporalmente como una capa dentro de \`#dash-billing-card\`; se desvanece y comunica mediante un pequeño trayecto visual su registro en la **campana existente de Ayuda**. Debajo permanece el encabezado/fecha/CTA legítimos de ese escenario.
- Únicamente escenarios de evento importante simulado (revisión/observación/vencido/acuerdo) permiten reproducir el aviso; no inventar urgencias en «al corriente», «misión incompleta», «sin servicios» ni «pago futuro». En la futura oficial **solo eventos auténticos persistidos** pueden activar esto; no derivarlos del mero render, texto o recarga.
- La campana y la hoja de ejemplo reutilizan \`gx-client-notif-*\` de Ayuda, sin backend, leído real ni envío. No sustituir el sistema de notificaciones. El laboratorio es flotante, oculto inicialmente, de modo que se puede evaluar la composición de Mi Espacio casi idéntica a Ayuda oficial.
- La propuesta sigue pendiente de aceptación humana. Si el efecto compite con una acción de pago/revisión o se percibe redundante, reducirlo o suprimirlo en ese contexto.


## 9. Corrección E1/B1 V4 solicitada tras probar el espejo (17/oct) · AÚN SIN APROBACIÓN
**Feedback concreto del propietario:** le agrada el enfoque, pero el movimiento hacia notificaciones se percibe rudimentario, «Misión pendiente» parece no hacer nada, y las cápsulas de estados no están visibles. Se exige calidad visual coherente con Ayuda; puede consultarse React Bits, bot-avatars y Colorion para referencias, **sin instalar piezas genéricas ni copiar estética de Admin**.

**Causas encontradas en V3:** la animación desplazaba un punto luminoso casi lineal; la beta deshabilitaba explícitamente el botón de aviso cuando el escenario era misión, a pesar de presentar tarjeta de progreso; y \`smart-demo.js\` escribía texto plano en \`#dash-badge\` en vez de generar las cápsulas nativas \`time-badge badge-*\` del cliente. Además, sustituyó la gamificación real por una tarjeta genérica \`gx-smart-mission\`.

**V4 en beta, por validar en iPhone real:**
- Vuelo de una **microcápsula GOXION** (no un punto luminoso), con trayectoria curva transformada, salida de la tarjeta, llegada a la campana con feedback/ringing nativo y limpieza completa. Respetar \`prefers-reduced-motion\`, scroll y cancelación al cambiar escenario.
- Los estados de la tarjeta recuperan las **cápsulas originales** de Ayuda: \`badge-ok\`, \`badge-review\`, \`badge-today\`, \`badge-overdue\`; prórroga conserva \`gx-prorroga-state\`. No crear componentes nuevos para reemplazarlas.
- «Misión pendiente» **no es una notificación prioritaria**: el control se convierte en «Ver misión pendiente», abre las tarjetas auténticas de gamificación \`gamification-grid/gx-gamif-card\` y su expansión \`gamif-expanded-container\`, con tareas sintéticas. No inventar cupones, completaciones o alertas; el pago sigue representándose donde corresponde. La beta conserva referidos como tarjeta vecina, como sucede en Ayuda.
- Módulo de misión aislado en \`preview/experiencia-mi-espacio-inteligente/mission-mirror.js\`; no toca gamificación productiva ni backend. Este comportamiento **no aprueba automáticamente** los Gixys ni la siguiente etapa.

**Para cerrar B1:** evaluar V4 como espejo completo en Safari iPhone, percepción del vuelo, legibilidad de estados, apertura/cierre de misiones, no reflow, no scroll horizontal y respeto de controles originales. Aprobación de este bloque ≠ autorización de publicación de paquete (Issue #142).


## 10. E1/B1 V5 · ÚNICO cambio solicitado, animación del aviso (18/oct) — PENDIENTE DE VALIDACIÓN
Feedback visual: usuario **aprueba todo lo demás de V4** (cápsulas originales, misión, tarjeta, campana, jerarquía), pero rechaza que **una cápsula física** viaje hacia la campana. No reabrir áreas aceptadas. La propuesta V5 sustituye exclusivamente el proyectil por una **estela óptica de dos capas** (filamento fino + halo sutil) que recorre una trayectoria Bézier desde el texto del aviso a la campana; se absorbe con el mismo efecto nativo de notificaciones, sin dejar un objeto ni rastro permanente. En beta únicamente, sin alterar pago, estados, misión, Gixys, Admin o Ayuda oficial. Contemplar \`prefers-reduced-motion\`, tarjeta fuera de pantalla y cancelación de animación al cambiar escenario. No considerar B1 aprobado hasta revisión visual de V5 en iPhone.
