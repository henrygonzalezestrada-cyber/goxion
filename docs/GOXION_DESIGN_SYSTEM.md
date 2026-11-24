# GOXION · Sistema de diseño y movimiento
**Manual operativo v1.0 · 23/nov/2026 · Estándar de trabajo vigente**

Este manual consolida las decisiones aprobadas del laboratorio de Mi Espacio y su espejo real. Es lectura obligatoria antes de diseñar, cambiar o revisar una tarjeta, módulo, botón, icono, estado o animación. No autoriza rediseños ni publicación oficial.

## 1. Fuentes canónicas y alcance

- Referencia visual de laboratorio: [morph-v2.html](../preview/experiencia-mi-espacio-inteligente/morph-v2.html); conservar los contratos de cada componente.
- Candidato único conectado: [ayuda-espejo-feed-v2.html](../ayuda-espejo-feed-v2.html); CSS [official-feed.css](../preview/mi-espacio-v2/official-feed.css), runtime [official-feed-runtime.js](../preview/mi-espacio-v2/official-feed-runtime.js), host e intro del mismo directorio. No reconstruir desde capturas.
- [Commit inmutable de promoción aprobada](https://github.com/henrygonzalezestrada-cyber/goxion/commit/c7f96a9bc1d6d9db8b2042ce1c608bb3de724124). Usuario: «A eso me refería, que bien se ve ✨». Aprobación visual de esa composición; no equivale a aprobación de toda la integración ni a QA completo.
- [Hero aprobado](GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md), [contrato por componente](GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md), [interacciones oficiales](GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md), [aceptación del candidato](GOXION_MI_ESPACIO_V2_ACEPTACION_AISLADA_2026-11-23.md), [contrato transversal](GOXION_VISUAL_CONTRACT.md).
- Los valores exactos siguientes son de **Mi Espacio**. Admin e Index comparten los principios de calidad, semántica y movimiento, pero conservan su identidad, tipografía, geometría y funciones aprobadas; no copiar CSS entre experiencias.
- Si un documento histórico contradice una aprobación posterior, prevalece la decisión más reciente confirmada y su código. Los contratos financieros/seguridad prevalecen sobre cualquier preferencia estética.

## 2. Principios no negociables

1. Limpieza ≠ monotonía. Una experiencia sobria en el día a día, expresiva en recompensas, hitos y cambios reales. Contraste dirigido, no arcoíris.
2. Una superficie por propósito. No encapsular todos los textos, ni anidar tarjetas de cristal por reflejo. Separadores solo cuando organizan información.
3. Una jerarquía de lectura: objetivo → dato protagonista → contexto necesario → acción. No colocar un kicker que repite el título. No eliminar un título que sí aporta significado. No mostrar estado/título/aviso duplicado.
4. Divulgación progresiva: mostrar lo indispensable primero, detalles bajo demanda; si el usuario inicia otro flujo, transformar el contenido en el mismo contenedor en lugar de apilar formularios.
5. Mantener encabezado, identidad y referencias espaciales al cambiar de etapa. Permitir volver/cerrar. No perder scroll ni foco por sincronización.
6. No reducir tipografía ni deformar botones para forzar una fila; usar ancho real disponible, wrapping razonable y crecimiento natural. Si cabe, alinear acciones relacionadas en una sola fila.
7. No eliminar efectos aprobados por buscar limpieza. No introducir efectos porque sí. Cada recurso cumple una función, tiene un dueño y una referencia.
8. Datos reales y controles reales; nunca presentar una simulación, un estado pendiente o un cálculo no confirmado como éxito.
9. Diseñar y probar sobre la base existente antes de proponer otra interfaz. No rediseñar lo aprobado ni abrir prototipos paralelos innecesarios.

## 3. Tokens y componentes base de Mi Espacio

Valores leídos del CSS del candidato aprobado y contrastados con el laboratorio. Reusar clases/tokens existentes; esta tabla es referencia, no un nuevo stylesheet global.

| Elemento | Contrato |
| --- | --- |
| Tipografía | Poppins; fallback system-ui |
| Fondo | #030305; onda y haz existentes, detrás del contenido |
| Texto principal / secundario | #f5f8ff / #a8b5c9; secundarios legibles, nunca bajar opacidad indiscriminadamente |
| Cristal neutro | rgba(8,8,12,.371), blur 11.75px, saturate(1), borde rgba(255,255,255,.035); el regulador 15% NO es alfa CSS 15% |
| Sombra del cristal | 0 15px 36px rgba(0,0,0,.23), inset 0 1px rgba(255,255,255,.05) |
| Tarjeta servicio | radio 22px; encabezado min-height 78px; padding 12px 13px; gap 12px; logo 47×47px/radio 13px |
| Servicio <=380px | logo 43×43px, encabezado min-height 75px/padding 11px/gap 10px; cuerpo padding 0 13px 15px |
| Nombre / estado de servicio | 14px/700 y 10.5px/600; estado con texto y punto, no solo color |
| Cuerpo de servicio | padding 3px 16px 17px; altura flexible |
| CTA cápsula | min-height 38px, padding 8px 15px (gxs-pill 9px 15px), radio 999px, blanco rgba(255,255,255,.08), border:0, box-shadow:none, sin blur adicional ni gradiente |
| CTA texto | 11px/600, line-height 1.15; cian #7ee1e7 o acento semántico del beneficio; ancho por contenido |
| Secundario ghost | min-height 38px, padding 8px 4px, fondo transparente, sin borde, #c1cfe0, 11px/600 |
| Cierre X | disco cian #79e6fc de 35px; glifo oscuro #071c29 de 16px, trazo 2.5px redondeado; objetivo táctil 44×44px |
| Info/acciones de icono | 44×44px, sin recuadro adicional por defecto; etiqueta accesible |
| Foco | contorno cian visible para teclado; no suprimir focus-visible |
| Logo header | 132px ancho / 36px alto, 118px <=355px, 108px <=320px; misma escala antes y después del login |
| Cápsula nav | una sola instancia pública/privada; Inicio/Mi Espacio según sesión; compacta 160×56px (158px <=320px); círculos 44px, activo expandido 14.5px/700, borde cian .42/.25 según estado |

**X:** compartir el contrato visual, no obligar a mover la ubicación ya aprobada de cada módulo. La flecha de expansión se transforma en X en su misma posición. No usar X como filtro ni crear cierres duplicados. No confundir área táctil con disco visible. Las cápsulas visuales de 38px pueden crecer con texto y deberán tener objetivos táctiles suficientemente separados (preferir zona de interacción de 44px si no cambia el aspecto).

**Jerarquía de acciones:** un CTA dominante por etapa; secundario más silencioso. Si ambas decisiones son relevantes, ambas visibles y legibles, sin obstáculos ni falsa urgencia. En cancelación no heredar rojo de la interfaz antigua; rojo reservado para errores/alertas críticas reales. No añadir bordes, sombras o píldoras a cada elemento. El borde cian de selección en navegación es una excepción explícita y funcional. No usar reglas genéricas que afecten al morph de operación.

## 4. Color, contraste y tipografía

| Acento | Propósito |
| --- | --- |
| Cian #36dbe8 / #7ee1e7 | Interacción, selección, CTA, información contextual |
| Morado #8067f5, #a78bfa, #ded2ff | Beneficios, recompensas, expresión artística localizada |
| Verde #65d3a2 / #8ee2b9 | Activo, éxito confirmado, ahorro cuantificado |
| Ámbar #e7bd7f | Revisión, espera, aviso no crítico |
| Rojo/rosa de error | Fallo confirmado o alerta crítica, no simple navegación o cancelación |
| Blanco #f5f8ff | Títulos, dato principal, precio final |
| Gris azulado | Contexto secundario y precio previo tachado |

No tintar toda la tarjeta neutra para aplicar un acento. Contraste en el elemento protagonista (texto, icono, barra, luz localizada), con fondo lo bastante oscuro para leer. Mantener contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande y controles relevantes según criterio aplicable); verificar sobre el fondo real animado, no solo colores planos. Color nunca como único indicador. No reducir opacidad del texto para resolver una superficie de lectura; usar una microsuperficie más oscura cuando haga falta, sin mover el emoji ni encerrar todo. Una sola tipografía jerárquica y un título significativo, sin rótulos pequeños repetidos.

## 5. Contrato de movimiento

Los rangos son pautas para nuevos componentes, no instrucciones para retocar animaciones aprobadas. Microinteracciones 120–220ms, transformación local 240–320ms, expansión de tarjeta existente ~460ms, celebraciones/revelación 500–900ms según secuencia. Curvas naturales (p. ej. cubic-bezier(.22,.82,.24,1)); rebote moderado solo cuando aporta significado. Priorizar transform/opacity y medir coste de layout, máscaras y background-position; los cambios de altura se limitan al contenedor afectado. No introducir dependencias si CSS/WAAPI y controladores actuales resuelven el caso. No presentar tiempos de animación como progreso de red.

| Tipo | Cuándo | Regla |
| --- | --- | --- |
| Estado | Activo→revisión→confirmado | Transformar icono/contenido cuando cambie el dato real |
| Apertura/cierre | Detalle, acceso, módulo | Mantener ancla, animar altura con límites, evitar saltos y scroll forzado |
| Acción remota | Solicitud, reclamo, pago | Feedback inmediato; bloqueo de doble envío; barra→palomita solo cuando la operación real lo merece y el servidor confirma; error recuperable |
| Oferta/logro | Beneficio elegible confirmado | Revelación escalonada; énfasis visual localizado; sin retrasar la acción |
| Movimiento continuo | Reloj, progreso abierto, iluminación promocional aprobada | Solo cuando aporta significado/identidad; discreto, pausable cuando corresponda y sin bucles de iconos generales |
| Movimiento por evento | Campana, checkbox, lealtad, referidos | Animar en cambio real, no constantemente |
| Mascota Goxy | Interacción contextual | Conservar comportamiento expresivo aprobado, sin clonar controlador |

**Morphicons — referencia prioritaria de iconografía dinámica:** [sitio](https://www.morphicons.com/), [documentación](https://www.morphicons.com/docs), [repositorio](https://github.com/guillermolg00/morphicons). Estudiar interpolación SVG, continuidad de forma, alineación, resorte y manejo de interrupciones. Aplicar a pares semánticos como flecha↔X, play↔pause, campana al recibir novedades, estado→check, estrella→corazón roto si la racha se rompe. Mantener caja óptica, stroke, color, accesibilidad y tamaño común; no animar logos de marcas ni todos los iconos en bucle. El reloj es la excepción habitual de icono continuamente animado. Evaluar SVG nativo/WAAPI primero; si una librería aporta valor medible, revisar licencia, peso, compatibilidad Safari, teardown, rendimiento y versión fijada antes de introducirla. **Referencia de aprendizaje, no dependencia instalada ni autorización de alterar iconos aprobados.**

**Implementación:** estados explícitos; una animación por evento confirmado; cancelar/revertir al interrumpir; reusar nodo/estado cuando llegan datos; detener loops cuando el componente no está visible y limpiar al cerrar sesión; no reiniciar por cada refresh. No usar timers artificiales para hacer parecer que se procesó una operación. Fallback estático si WAAPI o CSS avanzado no está disponible. Respetar prefers-reduced-motion tanto en CSS como JS; controles de pausa para movimiento ambiental persistente y lectura equivalente sin animación. Mantener acciones accesibles durante la apertura, excepto las bloqueadas por operación real. No mostrar éxito sin servidor.

## 6. Patrón aprobado: promoción de retención

La referencia es el commit c7f96a9bc1d6d9db8b2042ce1c608bb3de724124, aprobado visualmente por el usuario. No reconstruirlo ni añadir decoración por inercia.
- Un título principal «¡Tenemos algo para ti!», luego porcentaje grande iridiscente (51–78px según ancho), contexto «en tu próximo pago», precio anterior tachado cuando verificable, precio final blanco (25–33px), ahorro verde con microsuperficie .09; condiciones claras y dos acciones con cápsula/ghost.
- Reveal desde el centro en capas; expansión moderada del porcentaje, destellos cian/morado transitorios, precio escalonado, microentrada del ahorro. La secuencia termina aproximadamente a los 910ms (último destello).
- Luz localizada ambiental 6s, reflejo iridiscente 7s, pausa común, reduced-motion; no repetir reveal por actualización. El reflejo usa background-position y exige medir rendimiento en Safari, no afirmar que todo es compositor.
- No confeti permanente, borde luminoso alrededor de toda la tarjeta, falsas cuentas regresivas, ruido de texto, ni degradados en todos los botones.
- La oferta no modifica el derecho a cancelar. Rechazar/continuar es visible, sin obstáculos; términos esenciales visibles antes de aceptar. Importes y elegibilidad de fuente oficial, sin incentivos inventados.

## 7. Contratos por módulo (no homogenizar)

- Hero/saludo: congelados según contrato específico. Mantener estados, animación por palabras, rotación contextual, reserva para dos líneas, CTA al 8%.
- Lealtad/referidos/misiones: tres compactas en una fila si caben; emojis a color al 100% en compactas, watermark grande abajo en ampliada; contraste tipográfico; barra animada cuando aporta avance real, checkbox animado y confeti al confirmar; microsuperficie de info sin mover emoji. Mantener altura 300px aprobada de ampliadas. No celebrar estados ficticios.
- Ahorro: logos flotantes, profundidad y contador animado; cifra protagonista, una frase explicativa; datos verificados.
- Servicios: nombre/logo/estado; evitar raya ornamental bajo logo; accesos, opciones y cancelación son etapas excluyentes. Accesos múltiples, novedades simultáneas, PIN/contraseña protegidos. Solicitud, revisión, aprobación y baja efectiva distintas. Al hacerse efectiva, retirar servicio activo, conservar historial.
- Historial: una superficie con filas, separadores funcionales, filtro cápsula sin flecha/X, filas flecha→X; tres entradas iniciales y expansión a demanda. Solo hechos confirmados.
- Navegación: misma cápsula en inicio y sesión, compacto/expandido según scroll; logo sin cambio de escala. Mantener notificaciones, badge real y Goxy.
- Admin e Index: leer contrato transversal y fuente vigente; aplicar principios sin transferir geometrías de cliente. Mantener funciones originales, no clonar flujos.

## 8. Biblioteca de aprendizaje obligatoria según tarea

Consultar referencias primarias antes de inventar una interacción nueva; estudiar patrón y adaptar al ADN GOXION, no copiar interfaz completa ni instalar todos los paquetes.

| Fuente | Qué aprender |
| --- | --- |
| [Apple HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/) y [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Jerarquía, familiaridad, márgenes, safe areas |
| [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Movimiento con intención, accesibilidad, reducción |
| [Nielsen Norman Group — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Detalle bajo demanda, menos carga cognitiva |
| [Morphicons](https://www.morphicons.com/docs) / [GitHub](https://github.com/guillermolg00/morphicons) | Morphing SVG semántico y continuidad |
| [Motion](https://motion.dev/docs/animate), [stagger](https://motion.dev/docs/stagger), [timeline](https://motion.dev/docs/timeline-sequences), [view animations](https://motion.dev/docs/animate-view) | Resorte, secuencias, interrupciones, layout transitions |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Grupos animados, texto, revelación y microinteracciones |
| [Animate UI — Collapsible](https://animate-ui.com/docs/primitives/radix/collapsible) y [Radix UI](https://www.radix-ui.com/primitives/docs/components/collapsible) | Expansión coordinada y primitivas accesibles |
| [Material Motion](https://developer.android.com/codelabs/material-motion-android) | Continuidad de contenedor y transición entre estados |
| [GitHub Primer — Motion and animation](https://primer-docs-preview.github.com/accessibility/design-guidance/motion-and-animation/) | Distinguir movimiento informativo de decorativo |
| [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide) | Renderizado, transform/opacity y medición |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Contraste, teclado, targets, pausa y accesibilidad |

Estas fuentes son referencias técnicas externas, no pruebas de que GOXION las importe. Si se incorpora una nueva técnica, anotar URL, principio aprendido, aplicación concreta y resultado de prueba. No citar repositorios por popularidad sin estudiar su código/documentación.

## 9. Puerta de calidad antes de entregar una tarjeta o módulo

- [ ] Leí AGENTS, este manual y contrato del componente; identifiqué versión aprobada y propietarios de datos/handlers.
- [ ] Definí propósito, jerarquía, estados y qué queda intacto; reutilicé clases/tokens en vez de aproximarlos.
- [ ] Revisé X 35/16/44, cápsulas 38/.08/sin borde, secundario, márgenes, alineación y texto.
- [ ] Hay un título útil, sin duplicados, superficies anidadas sin propósito ni botones deformados; contraste medido con fondo real.
- [ ] Animación con propósito, interrupción, fallback, pausa/reduced-motion, sin bucles innecesarios; no pierde scroll, foco, datos ni controles al sincronizar.
- [ ] Probé 280/320/360/375/390/430/768px y Safari iOS; sin overflow, recortes, superposición, saltos de altura, scroll bloqueado o pulsaciones inertes.
- [ ] Probé cerrado/abierto, texto largo, vacío, carga, éxito real, error/reintento, doble toque, reconexión, sesión expirada, actualización realtime. Revisé teclado/VoiceOver y contraste.
- [ ] No modifiqué otra experiencia ni reglas financieras/seguridad para resolver apariencia; sin fixtures visibles ni archivos basura.
- [ ] Informé qué se verificó realmente (código, navegador, usuario, backend, CI); no equiparé comprobación estática con aceptación integral.
- [ ] Registré commit, referencia visual, cambios aprobados y pendientes; si es Mi Espacio, actualicé el mismo espejo, no creé otro candidato.

**Publicación:** el espejo es el único candidato; tras autorización explícita y QA relevante, promover esa implementación exacta a ayuda.html con respaldo y limpieza documentada. No reintegrar desde cero. Ningún cambio en producción por este manual.

## 10. Mantenimiento

Este manual evoluciona mediante decisiones aprobadas. Ante una excepción, documentar qué componente, por qué, medida exacta y evidencia; no convertir una excepción local en regla global. Registrar cambios en un solo documento canónico y enlazar desde AGENTS y contratos existentes. Evitar manuales paralelos. Estado inicial: promoción y geometría visual aprobadas por el usuario; pruebas generales y promoción oficial siguen pendientes según el expediente de aceptación.
