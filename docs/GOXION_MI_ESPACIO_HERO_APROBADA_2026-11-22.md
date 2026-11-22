# GOXION · Mi Espacio — tarjeta principal aprobada (compacta y centrada)

**Estado:** DISEÑO VISUAL APROBADO EN LABORATORIO · CONGELADO COMO REFERENCIA.
**Aprobación del usuario:** 22/nov/2026 (conversación de diseño de Mi Espacio).
**IMPORTANTE:** esto NO significa que la tarjeta esté integrada ni validada en `ayuda.html` oficial.

## 1. Fuente de verdad: versión exacta

- **Repositorio:** `henrygonzalezestrada-cyber/goxion`.
- **Archivo de trabajo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.
- **Commit inmutable aprobado:** `f33e8572c07377f4811080a87c7cb1b483983b34`.
- **SHA del blob HTML aprobado:** `86b86841aaf5d40b8ebc9b0aed9adb522726fc0b`.
- **Rama de resguardo:** `approved/mi-espacio-hero-compacta-centrada-20261122` (creada apuntando exactamente al commit).
- **Código original fijo:** https://github.com/henrygonzalezestrada-cyber/goxion/blob/f33e8572c07377f4811080a87c7cb1b483983b34/preview/experiencia-mi-espacio-inteligente/morph-v2.html
- **Laboratorio para visualizar:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=f33e857 (el enlace Pages sirve para comparar, pero **puede cambiar con commits posteriores**; el commit anterior es la referencia inmutable).

**Regla de continuidad:** ante dudas o en otro chat, **abrir el código del commit aprobado**. NO reconstruir la tarjeta a partir de descripciones, capturas o memoria. Si el laboratorio evoluciona, esta referencia mantiene el diseño aprobado intacto. No reemplazarla sin una nueva aprobación explícita.

## 2. Composición aprobada: «Compacta centrada»

- La tarjeta **sigue siendo protagonista**, pero menos alta; NO agregar información para rellenar espacio.
- **Título contextual y subtítulo/fecha agrupados a la izquierda** (`.focus-copy`); **icono de estado a la derecha** (`.focus-icon`), sin volverlo volumétrico ni agregar brillo artificial.
- **Acción en cápsula centrada horizontalmente en la parte inferior**, no en el centro vertical de toda la tarjeta (`.focus-bottom` con `justify-content:center`).
- **Lealtad fuera de la tarjeta**, inmediatamente debajo como fila simple y separada. No encerrarla en un segundo cristal ni mezclarla con estados financieros.
- No mostrar leyenda técnica de luz en la vista compacta.
- Mantener la jerarquía de la tarjeta y su adaptación a mensajes de más de una línea, sin recortes.

### Medidas del laboratorio aprobado

| Selector / detalle | Valor aprobado |
| --- | --- |
| `.focus[data-layout="compact"]` | `min-height:242px`, no `height` fija |
| Padding normal | `24px 23px 19px 27px` |
| Filas grid normal | `minmax(127px,1fr) auto` |
| Espacio título / metadato | `gap:9px` |
| Fila acción | `justify-content:center; margin-top:10px` |
| Ancho máximo 380px | `min-height:236px`, padding `22px 18px 17px 20px`, filas `minmax(120px,1fr) auto` |
| Ancho máximo 315px | `min-height:234px`, padding `20px 14px 16px 17px` |
| Separación lealtad en compacta | `.glass-stage[data-layout="compact"] ~ .secondary {margin-top:12px}` |
| Fuente del prototipo | Poppins |
| Bordes/redondeo/onda | Conservar los existentes, no añadir adornos |

**Clave:** las alturas son **mínimos flexibles**. Si un estado exige más espacio, permitir crecimiento del contenido; no forzar un alto fijo ni reducir la letra hasta volverla ilegible.

## 3. Material aprobado, no aproximar

- **Preset:** `neutral`, selector `data-material="neutral"`.
- **Control de profundidad:** **15%** (posición del regulador; **NO** equivale a opacidad CSS 15%). Código: `updateGlass(15)`.
- **Base del cristal:** `rgba(8,8,12,.371)`, calculado por `.29 + .54 * 0.15 = .371`.
- **Desenfoque neutro real aplicado por JS a ese valor:** `(8 + 25*.15).toFixed(1)` = **11.8px**.
- **Cápsula CTA:** **8% de película translúcida blanca**, `background:rgba(255,255,255,.08)`, código `updatePillAlpha(8)`.
- **En la cápsula:** SIN borde, SIN sombra, SIN degradado, SIN brillo/radial, SIN blur adicional; `border:0;box-shadow:none;backdrop-filter:none`. El texto se tiñe de `var(--accent)` según el estado de la cuenta.
- El haz/reflejo y la onda ya aprobados **permanecen detrás de la superficie principal**; no copiar esos efectos a todas las tarjetas.

## 4. Comportamiento que debe conservarse

- **Un único botón real**: `<button class="focus" id="focus">…</button>`; la cápsula `.focus-action` es un `span` visual dentro del botón, NO anidar un segundo botón.
- Estados contextuales, prioridad y sus textos e iconos, incluyendo comprobante rechazado, pago incompleto, suspensión, vencido, revisión, prórroga, cancelación en proceso, doble fecha, próximo corte, al corriente y cliente nuevo.
- Transiciones de mensaje e iconos y variación de acento cromático; animación respetuosa con `prefers-reduced-motion`.
- Saludo con altura estable para evitar saltos cuando cambia entre frases.
- Los **12 escenarios del selector de pruebas** siguen siendo una demostración con datos simulados; la tarjeta del laboratorio NO consulta Supabase y NO realiza pagos.
- Aprobación visual NO equivale a lógica financiera lista: en producción los datos deben proceder de los módulos oficiales de Ayuda/Index y su backend; no duplicar cálculos ni inventar cifras.

## 5. Lo que NO se debe volver a hacer

1. NO volver a la versión alta de ~277px como predeterminada.
2. NO mover de nuevo el CTA al extremo derecho ni incorporarle un segundo borde/efecto «globo».
3. NO meter la lealtad dentro de la tarjeta.
4. NO insertar barras, etiquetas, estadísticas u otros elementos solo para ocupar huecos.
5. NO cambiar el neutral al 15%, CTA al 8%, iconografía o el reflejo sin petición y aprobación nuevas.
6. NO confundir la propuesta de unificación de materiales en otras tarjetas (PR #222) con la integración de esta tarjeta principal.

## 6. Estado de integración y siguiente trabajo

- **Aprobado:** composición **Compacta centrada** y material visual descrito arriba.
- **Conservado en:** commit exacto + rama de resguardo; el laboratorio actual puede seguir recibiendo otras propuestas.
- **Pendiente:** integrar con los **datos reales** del cliente en `ayuda.html` y sus módulos existentes; realizar recorrido de estados y pruebas móviles/Safari antes del despliegue oficial.
- **No modificado por este cierre:** `ayuda.html`, `index.html`, `admin.html`, CSS productivo ni backend.
- El usuario decidió explorar **otras mejoras visuales del feed** ANTES de integrar la tarjeta oficialmente. Eso NO reabre el diseño ya aprobado de esta tarjeta.

### Instrucción para otro chat

> Abre el repositorio `henrygonzalezestrada-cyber/goxion`, lee `AGENTS.md` y `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`. La tarjeta principal de Mi Espacio **ya fue aprobada** en «Compacta centrada», commit `f33e8572c07377f4811080a87c7cb1b483983b34`. Usa **ese código exacto**, NO la rehagas. Sigue con los cambios visuales del feed sin tocarla, o integra esta versión oficialmente solo cuando se solicite, conectando estados reales y validando Safari.

