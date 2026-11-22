# GOXION — Auditoría visual del feed: Lealtad, Referidos y Misiones
**Fecha:** 22/nov/2026  
**Estado:** diagnóstico aplicado a una **nueva propuesta de laboratorio**, pendiente de evaluación visual y aprobación; NO integrado a producción.  
**Origen:** captura real del laboratorio en iPhone aportada por el usuario en la conversación, comparada con la página oficial y referencias externas.

## Alcance e invariantes

1. Preservar sin alteración la tarjeta principal `Compacta centrada`, cristal neutro 15% del control y CTA 8%, y el saludo superior con sus animaciones, conforme a `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`.
2. Preservar lógica real y estados de clientes, pagos, rachas, referidos, misiones, cupón y acciones; este trabajo es de experiencia visual, no reglas de negocio.
3. Laboratorio `preview/experiencia-mi-espacio-inteligente/morph-v2.html`: **datos ficticios y acciones demostrativas**; no se confunde con `ayuda.html` ni con una integración productiva.

## Diagnóstico comparativo: pantalla y código

| Elemento | Lo rescatable | Problema exacto | Ruta |
| --- | --- | --- | --- |
| Fila triple | Accesos reconocibles de un vistazo | 3 marcos/glass simultáneos, jerarquía idéntica y texto secundario de 9–10px; la estética resulta genérica | `morph-v2.html`: `.gxb-row`, `.gxb-tile`, `.gxb-label`, `.gxb-unit` |
| Emoji compacto | Color y contraste a opacidad completa | Se representa como decorado estático `::before` arriba a la derecha, sin relación con la transformación | `.gxb-tile::before` |
| Progreso | Tres barras, entrada escalonada y destello | Misma gramática y gradiente para beneficios de naturalezas distintas; no es una animación ligada a un cambio de estado confirmado | `.gxb-mini-progress` y `.gxb-progress` |
| Expansión | Solo un panel se ve a la vez | **La fila permanece visible** y se agrega un segundo rectángulo completo debajo: doble representación del beneficio y glass sobre glass; no es morph | `#gxb-panel` y `present()` |
| Emoji expandido | Grande y abajo a la derecha según la petición | Aparece cortado contra la esquina y bajo la nota técnica de demostración, sin animación espacial desde el emoji de origen | `.gxb-panel::before` |
| Información | Una estructura básica y barra | Mucha explicación repetida, pequeño texto gris, título alto y términos dentro de la tarjeta en vez de ofrecer información escalonada | `examples.loyalty/referral/mission` |
| Fondo y efectos | Onda aprobada como ADN GOXION | El haz cruza el texto del detalle y la transparencia de varias superficies amplifica brillos de manera desigual; requiere jerarquía de capas, no cambiar la onda principal | material `.gxc-surface` en interacción con el fondo |
| Demo | Permite 12 estados | Botón fijo `Probar estados` se superpone visualmente a la sección `Tus servicios` en captura; ese artefacto de prueba impide evaluar la composición real | `.demo-toggle{position:fixed}` |
| Tamaño táctil | Toda tarjeta compacta es pulsable | El cierre expandido declara 36x36px, menos de los 44x44pt que Apple recomienda como referencia para iPhone | `.gxb-dismiss` |

### Qué ya estaba mejor resuelto en el código oficial

- `assets/js/ayuda/05-gamification-shared-morph-js.js`: la apertura `gxOpenShared()` **oculta la cuadrícula**, mide la tarjeta origen y el panel destino, construye un fantasma animado y mueve un emoji flotante hasta el contenido expandido. `gxCloseShared()` recorre el camino inverso, controla alturas y mediciones para evitar saltos en Safari. **No copiar solo el CSS, reutilizar/adaptar esa lógica probada**.
- `assets/js/ayuda/01e-client-dashboard.js`: el UI oficial es dependiente de estados reales: referido inexistente/activo/listo/reclamado, servicios y meses validados, tareas completadas/pendientes/reclamadas; cuenta con copiar y compartir, consultar reglas, realizar misiones y aplicar recompensas. El prototipo actual de ejemplo NO representa toda esa riqueza.
- `ayuda.html`: Lealtad vive actualmente dentro de la tarjeta de corte. Para llevarla al nuevo módulo visual se debe trasladar su presentación (`loyalty-count`, `loyalty-bar`, `loyalty-msg`) y conservar las fuentes y el cálculo originales.
- `assets/css/ayuda.css`: la oficial tiene buena base visual pero **múltiples capas CSS para `.gx-gamif-card` y reglas `!important` repetidas**. No migrar copiando indiscriminadamente esos bloques; centralizar los estilos nuevos en selectores específicos y comprobar la cascada.

## Dirección de diseño propuesta (aún pendiente de aprobación)

**Concepto:** tres unidades compactas en una fila con **una sola superficie expandida que toma su lugar**, no una fila más otra tarjeta. La transición física de la unidad elegida hacia el panel hace que el usuario identifique la continuidad. Al cerrar, el panel vuelve a su punto de origen y reaparecen las tres unidades. No crear una vista paralela.

**Compactas:** conservar título, valor útil y emoji con color sólido en esquina derecha. Tipografía intencional: nombre aprox. 11–12px, dato principal 22–25px, contexto legible aprox. 10–11px, sin reducir arbitrariamente hasta 8–9px. Evitar tres contornos brillantes permanentes: usar superficies discretas y foco claro para estado seleccionado, sin nuevo contenedor envolviendo las tres.

**Cada beneficio dice algo diferente:**
- Lealtad: racha `3/4`, siguiente nivel y un progreso coherente.
- Referidos: usar estado del invitado, validez del referido y servicios/meses. Sin invitado: mostrar acción `Invitar`, NO progreso inventado `0/3`.
- Misiones: pendientes, recompensa posible, y estado del botón de reclamar; sin misiones: estado vacío claro, no `0/0`.

**Contenido expandido:** jerarquía en 3 zonas — (1) título y estado, (2) dato/progreso o tareas priorizadas, (3) acción importante. Las reglas largas se consultan en un enlace secundario; no llenar el panel con párrafos ni notas de laboratorio cuando el modo demostración no es el foco.

**Emojis:** compacto a color completo y con ubicación consistente; al abrir, **el mismo emoji viaja** a la esquina inferior derecha del panel, grande pero protegido contra clipping que distraiga y contra el texto. No dos emojis independientes apareciendo/desapareciendo.

**Movimiento intencional:**
- 100–150ms respuesta al toque;
- ~400–480ms transición compartida de geometría/emoji (FLIP/ghost ya existente); inversa al cerrar;
- ~80–130ms de desfase para contenido una vez estable la superficie;
- ~700–950ms progreso cuando el estado realmente se revela o cambia;
- celebración acotada solo ante `listo para reclamar`, sin bucles decorativos constantes.
- Preferir `transform` y `opacity`; cancelar animaciones interrumpidas y restablecer estilos finales; respetar `prefers-reduced-motion`.

**Fondo:** mantener cristal neutro aprobado, pero una sola superficie de detalle y una protección local de contraste para que la onda no atraviese literalmente el texto. **No apagar o rediseñar la onda principal aprobada**.

**Demo:** retirar `Probar estados` de la zona fotografiable y mostrarlo como herramienta separada/fácil de ocultar; no dejar que oculte `Tus servicios`. Validar la composición del feed con la vista completa, no solo el módulo aislado.

## Umbrales antes de proponer integración oficial

- Capturas y prueba visual real en 320, 375, 390 y 430 CSS px de ancho, retrato, con texto largo y tamaño ampliado.
- Apertura y cierre de cada uno de los tres, incluyendo cambio rápido, toque durante transición, scrolling y retorno; nada duplicado o saltando.
- Misiones: sin tareas, tareas pendientes, terminadas, premio disponible y reclamado.
- Referidos: sin referido, referido activo sin condiciones, parcial, listo y reclamado. Ver que copiar, compartir y consultar condiciones permanezcan.
- Lealtad: 0, 3/4, 4/4, 9+, racha reiniciada, y separación respecto del calendario/cobro.
- Progreso y porcentaje visibles sin animación cuando `prefers-reduced-motion` está habilitado.
- Sin superposición de CTA flotante de pruebas sobre otros apartados; contraste de texto adecuado sobre la onda dinámica.
- No introducir regresiones en encabezado/saludo/tarjeta principal aprobada.
- **No afirmar validación Safari física sin ejecutarla**.

## Principios externos estudiados

1. Vercel Web Interface Guidelines: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` — controles semánticos, foco visible, etiquetas, transiciones de `transform`/`opacity`, animaciones interrumpibles, accesibilidad y contenido adaptable.
2. Motion (shared layout): `https://motion.dev/docs/react-layout-animations` — continuidad espacial entre disparador y destino, animación compartida, estabilidad de geometría. **Patrón conceptual, no implica introducir React/Motion al HTML nativo**.
3. Motion Primitives: `https://motion-primitives.com/docs/morphing-dialog` y `https://motion-primitives.com/docs/morphing-popover` — transformación de un control a un contenido contextual.
4. Apple HIG: `https://developer.apple.com/design/human-interface-guidelines/disclosure-controls`, `https://developer.apple.com/design/human-interface-guidelines/buttons` y `https://developer.apple.com/design/human-interface-guidelines/materials` — detalle bajo demanda, objetivo táctil y claridad sobre materiales translúcidos.
5. Nielsen Norman Group: `https://www.nngroup.com/articles/progressive-disclosure/` — primero información esencial; secundarios bajo demanda.
6. web.dev: `https://web.dev/articles/animations-guide` — rendimiento en composición, priorizando `transform`/`opacity`.

## Decisión hasta ahora

- **Conservar:** idea de las 3 unidades en fila, iconos vivos a color, barras de progreso, celebración por recompensa y material coherente con GOXION.
- **Rehacer:** arquitectura del panel, transición real al expandir/colapsar, copy e información del panel, contraste local, altura y cierre táctil, y demo UI superpuesta.
- **No hacer:** seguir sumando sombras, gradientes y keyframes al componente actual; no introducir nuevas dependencias en producción; no tocar ni la tarjeta principal aprobada ni `ayuda.html` hasta validar la nueva dirección.

## Iteración experimental aplicada — 22/nov/2026

**Commit de laboratorio:** `1a65bd4c918735a6b22410c4b2fa09296c045875`  
**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`  
**URL de la vista:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=1a65bd4

Se implementó una propuesta para comparar, **aún no aprobada**:

- Fila triple con etiquetas más legibles, menos bordes/brillos permanentes, emoji compacto a color completo y barras breves.
- Al abrir **se reemplaza** la fila por un solo panel, no se agrega el mismo contenido en otra tarjeta debajo.
- Superficie y emoji comparten un movimiento geométrico de aprox. 455ms; cierre inverso. Las coordenadas del emoji se capturan antes de ocultar su origen para evitar pérdida de medidas; el contenido aparece después del movimiento.
- Emoji ampliado en la esquina inferior derecha, dentro del panel; zona inferior reservada para no interferir con botones y texto.
- Se redujo el texto visible y se trasladaron condiciones largas a un botón secundario que realmente las despliega. El botón de cierre mide 44x44px.
- El panel visual de prueba `Probar estados · Laboratorio` se movió al pie del documento, fuera del viewport del feed, y se volvió desplazable en móvil. Incluye simulación de Referidos sin invitado / activo / listo / reclamado y Misiones listas.
- No hay consulta a servicios ni acciones financieras; la copia de invitación genera únicamente texto explícitamente de demostración.
- La tarjeta `Compacta centrada` aprobada, su cristal, saludo, textos y animaciones se conservaron; **no se modificó** `ayuda.html`.

**Validaciones hechas:** sintaxis de JavaScript, balance de llaves CSS, presencia de los 12 escenarios de la tarjeta, conservación literal de selectores y funciones fundamentales del hero/saludo, y publicación GitHub Pages exitosa para el commit. **No afirmar validación real en Safari/iPhone ni aprobación de diseño hasta recibir feedback del usuario.**

La versión debe evaluarse particularmente en iPhone: apertura de cada módulo, cierre inverso, emoji compartido, scroll/posibles saltos al reflujo, estado listo y legibilidad. Si visualmente no supera a la oficial, NO integrar.

## Iteración visual — emojis alineados y cristal restituido (pendiente de aprobación)

- **Commit de laboratorio:** `4814c267ea20172b8651017675c25046ea690fa5`.
- Las compactas bajan de `min-height:128px` a `110px` (con mínimos adaptativos para pantallas estrechas).
- ⭐, 🎁 y 🎯 ahora comparten **la misma fila horizontal de 3/4, 1/3 o 2/3**, en lugar de ocupar una franja superior propia. El dato y los textos se dibujan por encima del emoji cuando se aproximan en anchos estrechos, preservando legibilidad.
- Se conserva el preset de profundidad **Neutro 15% del regulador**, equivalente al material real `rgba(8,8,12,.371)` con `blur(11.75px)`. El panel ampliado dejó de tener un degradado opaco `rgba(...,.89/.79)`, y la superficie durante el morph utiliza ahora el mismo cristal.
- El emoji del panel crece a `clamp(136px,38vw,165px)`, opacidad `.68` y queda integrado en **esquina inferior derecha**, con contenido/CTA por encima para evitar pérdidas de lectura.
- Se conservan la transformación compartida entre compacta/extendida, saludo, tarjeta principal aprobada, los escenarios y las acciones demostrativas.
- **Importante:** cambios experimentales de presentación, NO integrados en `ayuda.html`; pendientes de prueba visual en Safari móvil antes de dar el diseño por aprobado.
