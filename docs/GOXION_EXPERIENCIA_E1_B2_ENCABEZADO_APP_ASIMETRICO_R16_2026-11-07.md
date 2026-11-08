# GOXION · E1/B2 · R16 — Encabezado compacto tipo app, asimétrico

- Fecha: 2026-11-07 · Rama: `beta/r16-encabezado-app-asimetrico-20261107` · Base: `main` 6b84d52 (R15)
- Alcance: solo `preview/experiencia-financiera-espejo/` (`estado.js`, `estado.css`, `estado.html` bump `?v=e1b2r16v1`, `check.mjs`). Preview solo; no se toca Index oficial, Ayuda, Admin ni motor financiero. Sin secciones nuevas, sin duplicar información.

## Dirección (Henry)

Esto es una APP WEB, no una página web. El encabezado compacto no se reparte en 3 zonas simétricas: la sección izquierda es más grande (precio + píldora), el botón queda angosto y asimétrico a la derecha, el título "ESTADO DE CUENTA" no es necesario en compacto, y la división cabecera/contenido no se remarca: difuminado tipo glass por desenfoque, NO liquid glass.

## Medidas tomadas de Ayuda (página principal)

`ayuda.html` + `assets/css/ayuda.css`:

- Botón "Mi Espacio" del header (`.header-action-btn`, `ayuda.css:128`): fondo `rgba(0,242,254,.10)`, borde `1px rgba(0,242,254,.30)`, texto cian `#00f2fe`, `13 px / 700`, radio `20 px`, padding `8px 16px`, `backdrop-filter: blur(10px)`.
- Botón primario (`.btn-primary`, `ayuda.css:665`): `15 px / 700`, radio `20 px`, padding `16 px`, degradado cian→azul, texto `#000` (en hover `#fff`).
- Botones secundarios de Ayuda (p. ej. "Iniciar sesión"): fondo `rgba(255,255,255,.1)`, borde `rgba(255,255,255,.2)`, texto `#fff`, `14 px`.
- Píldora (`.time-badge`, `ayuda.css:722`): padding `6px 12px`, radio `20 px`, `11 px / 700` (el espejo usa 12 px, su tamaño original, que se conserva).

## Qué cambió

1. **Precio compacto considerable: 34 px visuales** (antes 26 px). `amountSize = 52 − 18·pp`, scale `34/52 ≈ .654`. Intermedio entre reposo (52) y el compacto anterior (26): sigue siendo el número protagonista, sin acercarse a portada; a 390 px "$45.00" mide ~115 px y deja sitio a la píldora y al botón.
2. **Sección izquierda grande y asimétrica.** En compacto (fase 2, `spread` 0.75→1) la píldora se apila DEBAJO del precio, alineada a la izquierda (`badgeTop = amountTop + alto visual del importe + 6 px`, `badgeShift` al borde izquierdo). La píldora sigue a 12 px, sin scale. Su `max-width` se calcula entre el borde izquierdo y el botón (`heroW − btnW − 16 px`); a 390 px "Acción necesaria" cabe entera, a 280 px ellipsis controlado.
3. **Botón "Mi Espacio" angosto, estilo Ayuda, texto BLANCO.** Píldora translúcida cian (`rgba(0,242,254,.10)`, borde `rgba(0,242,254,.35)`), texto `#fff`, `13 px / 700`, radio `20 px`, padding `0 14px` (un poco más angosto que Ayuda para acentuar la asimetría), `blur(10px)`. Alto medido del botón (~31 px), ligeramente mayor que la píldora (~28 px); centrado verticalmente en el bloque izquierdo. Se eligió blanco —y no el cian de Ayuda ni el negro de R14— porque Henry no quiere tipografía negra y el blanco sobre el translúcido oscuro se lee bien; es el tratamiento de los botones secundarios de Ayuda, no un estilo nuevo. Destino sin cambio: `../../ayuda.html`.
4. **Título oculto en compacto, SIN colapsar su fila.** Con el `spread`, la opacidad del título baja a 0 (fade con `spreadV`, antes de que el hero suba sobre su fila), pero la fila NO colapsa en layout: el header queda `min-height:20px` siempre y el hero sube con transform (`--gx-rm-hero-dy = −24·spread`); el clip y el desplazamiento del contenido compensan esos 24 px (`--gx-rm-clip = 116 − heroVH + 24·spread`; desplazamiento `heroVH − heroRestH − 24·spread`). En expandido el título queda, más discreto. El par sigue siendo solo-transform (R12) y el alto del sticky no cambia en ningún p.
   - **Por qué así (regresión R13 encontrada por verificación independiente):** la primera versión colapsaba la fila en layout (`header-h 20→0 px`), y eso encogía la página 24 px. Al bajar al final y soltar, `scrollY` se reclampaba de 233 a 209 — el bug del resorte que R13 había corregido (la aserción R13 "releasing at page bottom must stay down" fallaba a 390 px). Causa raíz: el cambio de alto del sticky en compacto reduce `scrollHeight` justo cuando el scroll está al máximo, así que el navegador reubica `scrollY` hacia arriba. La corrección es no tocar el layout: el título solo se desvanece y el hero sube con transform, como R12.
5. **División sin remarcar.** Verificado: `index.css` no pone borde ni sombra al `.sticky-area`; el fondo del sticky se desvanece a transparente en los últimos 27 px visibles con `backdrop-filter: blur(25px) saturate(1.2)` (glass por desenfoque, NO liquid glass) y el `::after` de fundido está apagado desde R12 (el clip-path lo recortaría). Lo que se desliza por debajo se transparenta borroso, sin línea de corte. Sin cambios de CSS aquí: ya era así; R16 lo deja asentado con regresión.

## Qué se conserva

Morph solo-transform (R12), corrección R10 de la píldora sin solape (repaint + piso `scrollWidth`), asentamiento al soltar solo en la zona del morph (R10/R13), píldora SIN glow (R11), conteo (R8/R9), pulso (R7), respiración de lealtad (R8), blur 25 px y cristal. Expandido idéntico a R15.

## Verificación

- `node --check` (estado.js, check.mjs) OK; `node scripts/verify-integrity.mjs` OK.
- `check.mjs` Chromium PASS 7 anchos × 12 estados, con regresiones R16 (precio compacto ~34 px, píldora apilada a la izquierda debajo del importe, botón blanco 13 px estilo Ayuda a la derecha, título oculto en compacto sin colapsar su fila, título visible en expandido, sticky sin borde ni sombra). **Dos corridas completas consecutivas en PASS** (la segunda para descartar intermitencia), tras corregir la regresión R13 del colapso del título.
- WebKit local: no arranca (faltan `libgstreamer` y otras, igual que R6–R15); validación en Safari físico pendiente de Henry.
- CI por nombre no verificada en esta corrida; no afirmar todo verde.

## Qué debe notar Henry en Safari/iPhone

En reposo todo igual que R15. Al compactar: el precio queda GRANDE a la izquierda con la píldora debajo, el botón "Mi Espacio" angosto a la derecha con texto blanco, sin título y sin línea que marque el corte: lo que sube por debajo se ve borroso y transparente. Debe sentirse app, no página web.
