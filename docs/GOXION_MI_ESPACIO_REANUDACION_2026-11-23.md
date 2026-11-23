# GOXION · Mi Espacio — REANUDACIÓN CANÓNICA (23/nov/2026)

> **LEER PRIMERO EN CUALQUIER CHAT NUEVO.** Estado vigente al terminar la sesión de diseño del 23/nov/2026. El usuario acaba de decir **«Mucho mejor»** sobre la navegación **V4.3**, tras la actualización de legibilidad y borde cian, y pidió dejar el seguimiento listo. **Este es un punto de continuación, no permiso para cambiar producción.** En caso de contradicciones con V1–V4.2 en documentos históricos, **V4.3 y los contratos de componentes más recientes prevalecen**.

## 1. Qué está aprobado y dónde retomar

**Diseño visual actual:** cápsula superior GOXION **V4.3**, aprobada de manera conversacional por el usuario («Mucho mejor», 23/nov/2026). Esto **no es una prueba automatizada de Safari** ni significa que toda la experiencia esté publicada o conectada.

**URL del laboratorio:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=1164984

- **Repositorio:** `henrygonzalezestrada-cyber/goxion`, rama `main`.
- **HTML principal de laboratorio:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, versión V4.3 en commit `11649842c0ace57581197ac1c504a6166739198c`. Su nombre **morph-v2.html es histórico**: no indica que el diseño esté en V2.
- **CSS de navegación:** `preview/experiencia-mi-espacio-inteligente/adaptive-top-nav.css`, commit `21280ac555e44d16ffbcd90bd09e970697fcc116`.
- **JS de navegación:** `preview/experiencia-mi-espacio-inteligente/adaptive-top-nav.js`, commit `876946a90b7e06fc892148203d334364143ad402` (se conserva desde V4; no se modificó al aprobar V4.3).
- **Archivo productivo `ayuda.html` sigue SIN integrar este rediseño.** Nunca presumir que el laboratorio es funcional con datos auténticos.

## 2. Contrato visual vigente de la navegación V4.3

- **Una sola cápsula** `#gxn-nav`, sin duplicados ni barras paralelas; posición nativa `position: sticky` en el feed, **centrada en la parte superior** al desplazarse. **NO regresa al concepto descartado de trasladarla a la esquina del logo; NO crear una franja oscura común al estilo Muse**.
- En desplazamiento hacia arriba **se compacta**; al deslizar hacia abajo **se amplía sin exigir volver al principio**. Los estados son `data-mode="expanded"/"compact"` con detección de dirección/histéresis; transiciones CSS se completan al detener el gesto sin mover artificialmente `scrollY`.
- Estado compacto: **160×56px** generalmente y **158×56px** hasta 320px de ancho; **3 círculos táctiles 44×44px**, emojis de **19px** centrados en caja fija de **24×24px** y sin otra fila oculta. Etiquetas no visibles en compacto.
- Estado expandido: píldora amplia con **etiqueta de destino activo 14.5px, peso 700** (comparado con los 12px anteriores). Los destinos son **Mi Espacio (👤), Catálogo (🛒), Soporte (🛠️)**. Borde cian en **botón seleccionado** de `rgba(0,242,254,.42)`; en compacto `rgba(0,242,254,.25)`. No colocar borde cian alrededor de toda la barra ni agregar glow exagerado.
- Material neutral: **`rgba(8,8,12,.371)`**, blur 11.75px, efectos discretos; un distintivo leve sobre el destino activo, no arcoíris ni cápsulas anidadas.
- **Respirar sin huecos grandes:** navegación expandida deja **9px por arriba y 9px por abajo**; margen inferior del compacto de **29px** (27px en <=355px) para compensar su menor altura y **evitar saltos del feed**. El saludo conserva la reserva para **dos líneas**, no se baja artificialmente. Este último ajuste de proporción fue explícitamente aprobado con «Así mero».
- Logo, campana y Goxy van en encabezado normal, salen de vista naturalmente con scroll; **no se integran a la cápsula sticky** ni se reemplazan con otra barra.
- Se aprobó el nuevo header/laboratorio, **no se autorizó tocar navegación productiva**.

## 3. Estado del resto del feed — no arrasar lo ya aprobado

Se está rediseñando el feed completo; conservar **Hero**, línea de saludo dinámico, **Lealtad/Referidos/Misiones** en una sola fila de mini-tarjetas expandibles, **Ahorro**, **Servicios**, **Historial de movimientos**, y los elementos de catálogo que ya existen en laboratorio. Material «cristal» coherente pero con contraste medido, emojis visibles en miniaturas, grandes en tarjetas expandidas hacia el sector inferior, barras de progreso animadas y feedback de checkbox; controles de cierre **X uniformes y pequeños**. Evitar duplicar UI, recuadros innecesarios, títulos dobles, microtexto poco legible o espacios vacíos desproporcionados.

Reglas delicadas previas:
- Hero principal **aprobado y congelado** en `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`; no sustituir su material ni reintroducir rótulo flotante «GOXION».
- En Historial, botón **Filtrar** es píldora sin flecha ni X; cuando el cliente selecciona categoría cambia a **Pagos/Servicios**. Las filas del historial sí conservan su gesto flecha→X con jerarquía 35/16.
- Los componentes ya aprobados **no deben reimplementarse ni rediseñarse por iniciativa propia** si el usuario pide trabajar solo sobre otro módulo.
- La foto persistente de avatar y personalización de color de Goxy son **ideas pendientes**, no funciones ya implementadas. La foto del laboratorio solo vive localmente. Goxy real de la página productiva es un asistente, no solo una cara.

**Fuente exhaustiva:** `docs/GOXION_MI_ESPACIO_INTEGRACION_MAESTRA_2026-11-22.md` y `docs/GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md`.

## 4. Funciones oficiales INVIOLABLES al integrar — auditadas pero no conectadas en lab

Leer **`docs/GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md`** antes de cualquier cambio a `ayuda.html`. El usuario expresó temor a que se perdieran detalles al reemplazar el feed. Se verificó por código que los siguientes existen en la **oficial** y **deben sobrevivir** en el rediseño:
- **Misiones:** confirmación real `goxionMissionAPI`; checkbox, feedback de finalización, confeti (`lanzarConfeti`) en tareas realmente completadas, secuencia y ráfagas al terminar todas las misiones, recompensas y CTA; confeti tras reclamos exitosos de cupón o referido, no ante errores ni duplicados.
- **Campana:** conservar `#gx-client-notif-launch` y `#gx-client-notif-badge` reales; contador de **no leídas** con tope `99+`, ringing por novedad auténtica, sheet, marcar como leído, borrar, gesto lateral/deshacer, actualización realtime y limpieza de sesión. **La campana `#gxn-bell` del laboratorio es ilustrativa, sin conexión al contador real: nunca reemplazar la lógica oficial con ese mock.**
- **Otras microinteracciones/producto:** morph en Lealtad/Referidos/Misiones, progreso, Catálogo y carrito reales, Servicios con credenciales/PIN/cancelaciones, Soporte por plataforma, navegación productiva `switchTab`, login/logout reales, Goxy F17 asistente e interacciones táctiles, avisos, términos, sesión, realtime y reglas financieras.
- Los efectos visuales antiguos **pueden refinarse** siguiendo diseño premium; **no se pueden eliminar eventos, estados, protección de permisos, acciones ni feedback** sin autorización. Respetar `prefers-reduced-motion`.

## 5. Trabajo completado, pendientes y QA honesto

**Hecho:**
- Revertidos de forma selectiva los cambios desalineados de Muse; V3 recuperada como respaldo histórico.
- Se construyó y aprobó visualmente V4 sticky centrada; V4.1 mejoró tamaño, emojis, halo; V4.2 restauró aire proporcional; **V4.3 incrementó tipografía y contraste cian y recibió «Mucho mejor».**
- Documentado el contrato de preservación de interacciones productivas.
- Pruebas estáticas de CSS/HTML/JS y comparaciones de integridad de código realizadas en iteraciones previas; **no confundir estas validaciones con una suite de navegador real.**

**Por hacer al reanudar (sin adivinar prioridades):**
1. **Preguntar/recibir el siguiente cambio visual del usuario** y trabajar directamente en el laboratorio, sin tocar módulos no solicitados; no reiniciar el diseño de navegación ya aprobado.
2. Antes de integrar a producción, ejecutar la suite `preview/experiencia-mi-espacio-inteligente/check-adaptive-nav.mjs` en Chromium/WebKit y pruebas Safari iPhone (incluidos anchos estrechos, scroll inverso, texto de 14.5px, login, campana, menús, Goxy y saltos).
3. Si el usuario autoriza explícitamente integración oficial, preservar DOM/handlers y datos de `ayuda.html`; mapear acciones visuales a los módulos reales; ejecutar el contrato de regresión de funciones, QA por cuentas y rollback antes de publicar. **La integración a producción aún NO está autorizada.**
4. Tratar por separado solicitudes futuras sobre avatar persistente/color de Goxy, evitando guardar fotos de prueba en servidores sin diseño de privacidad.

## 6. Archivos de lectura recomendada por orden

1. **Este checkpoint:** `docs/GOXION_MI_ESPACIO_REANUDACION_2026-11-23.md`.
2. **Expediente maestro y decisiones de todos los módulos:** `docs/GOXION_MI_ESPACIO_INTEGRACION_MAESTRA_2026-11-22.md`.
3. **Navegación y alternativas históricas:** `docs/GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md`. **La V4.3 es la última; V1, V2, V3 y V4.0–V4.2 son antecedentes.**
4. **No perder funciones reales:** `docs/GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md`.
5. **Hero congelado:** `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`.
6. **Bitácora de feed:** `docs/GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md`.
7. **Reglas generales de repositorio:** `AGENTS.md`.

**Regla operativa al cambiar de chat:** leer estos documentos/código vigente, implementar solo lo pedido por el usuario directamente en GitHub laboratorio, cache-bust el CSS/JS en el HTML cuando cambie, verificar sintaxis/alcance, registrar breve avance en expediente y entregar URL utilizable. No decir «no tengo acceso» sin antes comprobar el conector GitHub; existe integración de repositorio y ya fue usada repetidas veces.
