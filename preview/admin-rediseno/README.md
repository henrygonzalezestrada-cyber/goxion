# Espejo — Rediseño Admin GOXION

**Estado:** ESPEJO (preview local). No es la oficial. No se ha hecho push ni
beta. La oficial (`admin.html`) no se tocó. El motor no se tocó.

**Origen:** propuesta `~/workspace/goxion-analysis/PROPUESTA-ADMIN-REDISENO-2026-11-11.md`
(682 líneas), aprobada por Henry 2026-11-11 23:24 ("Vamos a romper esa regla"),
con corrección 23:25: **ya no quiere la barra flotante inferior**.

**Archivos:**
- `admin.html` — copia reorganizada de la oficial (mismos IDs, mismos 43 scripts
  en el mismo orden, + sandbox adaptado + CSS/JS propios del espejo).
- `admin-rediseno.css` — identidad nueva + layout + animaciones §6.
- `admin-rediseno.js` — solo espejo: bandeja de decisiones, conteo animado,
  campana como hoja, "ver más", refrescos, pull-to-refresh.
- `admin-sandbox.js` — adaptado de `preview/integracion-b2/admin-sandbox.js`
  (ruta nueva + `b2_cotizar_ciclo` permitido, solo lectura).

**v2 (2026-11-12):** reconstrucción completa desde v1 tras el rechazo visual
de Henry (00:04, "no veo el cambio que pedí... se ve sumamente igual") y su
corrección 00:12 ("No las mismas animaciones, hay que llevar este trabajo al
siguiente nivel"). Ver la sección **v2** abajo. La v1 queda como referencia
histórica en §2/§6.

## v2 — Reconstrucción tras el rechazo (2026-11-12 00:12)

### Identidad nueva ("Papel")
- **Paleta:** fondo `#f3f0e8` (papel cálido), superficie `#ffffff`,
  superficie-2 `#eae6d9`, tinta `#1b1812`, muted `#6e6759`, línea `#e2dccb`;
  primario verde `#0b6e4f` (brillante `#0e9f6e`, suave `#e3f2ea`); ámbar
  `#b45309`, rojo `#d92d20`, violeta `#6d28d9` solo como señal. Sombras
  cálidas suaves, sin glow neón.
- **Tipografía:** Sora 600/700/800 en display, cifras e importes; sans del
  sistema en cuerpo. La oficial y la v1 usaban Rajdhani.
- **Espaciado:** radios 20 px tarjetas / 14 px controles; encabezado
  compacto 132/137/141 px por breakpoint; Inicio centrado a 760 px en
  escritorio (dos columnas: decidir+cobrar / feed+negocio).
- **A primera vista:** fondo claro cálido vs negro `#030305` de la oficial;
  verificado lado a lado a 390 px (capturas en `/tmp/gx2-v2/`).

### Sistema de iconos
- Un sprite SVG inline oculto con **37 símbolos** (`#gx2-ic-*`), rejilla
  24 px, trazo 1.8, extremos y uniones redondos, `currentColor`: home,
  users, layers, sliders, bell, search, plus, check, x, chevron-down/right/
  left, clock, alert, refresh, filter, power, eye, message, calendar,
  shield, target, key, spark, grid, star, mail, doc, card, trash,
  check-square, zap, arrow-right, arrow-up-right, info, lock, flask.
- Sustituye **todos** los emoji/símbolos estáticos del HTML (🔔 ⌂ 👥 ◎ ⌘ ⏻
  ⌕ ⌁ 🎯 ✦ 🛡 ✉ 🔐 ✨ ⚠️ 👁 ✓ ☑ ⌫ ↻ ↺ ▦ ◇ ＋ × ‹ →): 0 glifos restantes
  en el HTML estático (verificado por grep); 63 usos `<use>`.
- Contenido dinámico de los 43 scripts: `admin-rediseno.js`
  (`gx2WatchIcons`) sustituye ⛔ 🔔 ✓ ⚠ ◷ 🧪 ⚠️ ⏳ 👁 por el mismo SVG,
  con MutationObserver + debounce 150 ms, solo en los contenedores que
  mutaron (ficha, lista de clientes, bandeja de Operaciones,
  notificaciones, próximos vencimientos, catálogo, promociones);
  idempotente (el SVG es un elemento, no texto).

### Organización (antes → después, Inicio)
| Antes (v1 / oficial) | Después (v2) |
|---|---|
| HOY → Tu veredicto → COBRO → NEGOCIO → PANORAMA | Decide ahora (héroe) → Feed de decisiones → Cobrar → Panorama |
| "Qué requiere tu atención" | "Decide ahora" |
| Centro de decisión como tarjeta grande, 4 chips en fila con scroll horizontal | Tira compacta: total en píldora verde + 4 chips en 2×2 en teléfono (nada escondido), 1×4 en escritorio |
| Bandeja de decisiones como una sección más | El feed ES la pantalla: "Qué decides ahora", tarjetas con borde de color por tipo + píldora de tipo con icono |
| Hoy/vencidos arriba del todo | Dentro de "Cobrar", junto a Próximos vencimientos (5 + "ver más") |
| Negocio/panorama abierto en escritorio, plegado en teléfono (v1 lo dejaba abierto por `open=""`) | Plegado por defecto en ambas (`open=""` quitado): "Finanzas y panorama" se abre a demanda |
| Barra inferior móvil (oficial) / segmentada (v1) | Segmentada sticky (se mantiene; Henry rechazó la barra inferior) |

### Animaciones v2 (explícitas — reemplazan la §6 v1 por corrección de Henry)
| Elemento | Valores | Patrón adaptado |
|---|---|---|
| Héroe "Decide ahora" | entrada 420 ms `cubic-bezier(0.16,1,0.3,1)` (expo), translateY(12px) + opacidad | Entrada de héroe (primero el contexto, luego el contenido) |
| Tarjetas del feed | 360 ms expo, stagger con presupuesto: desfase = (500−360)÷(n−1) ms por tarjeta, total máx. 500 ms | Entrada escalonada coreografiada (el conjunto entra como uno) |
| Decisión destacada (veredicto) | 500 ms muelle `linear(0, 0.18, 0.42, 0.72, 0.95, 1.06, 1.04, 1.01, 0.99, 1)` + fallback `cubic-bezier(0.34,1.56,0.64,1)` | Spring (overshoot leve, nunca rebote exagerado) |
| Cambio de pestaña | saliente 160 ms ease-out (translateY −8px + opacidad), entrante 300 ms expo con 60 ms de solape | Transición de pestañas con solape |
| Presión táctil (botones, chips, tarjetas) | bajar 80–100 ms lineal a scale 0.95 (0.97 en segmentada/píldoras), soltar 240 ms muelle | Micro-interacción que responde al gesto |
| Pop de badge | 280 ms `cubic-bezier(0.34,1.56,0.64,1)` (ease-back), solo scale | Pop de contador al decidir |
| Check-pop al aprobar/atender | 420 ms ease-back (1 → 1.35 → 0.9 → 1.08 → 1) + 6 partículas verdes 520 ms ease-out, radio 26 px | Confirmación con celebración mínima (solo el primer toque que cambia estado) |
| Contadores | easeOutExpo 600 ms (Δ < $20) / 900 ms (Δ ≥ $20), desde el valor anterior, nunca desde 0, sin animar si Δ < $1, máx. 1 a la vez | Contador vivo (el número viaja desde donde estaba) |
| Skeleton → contenido | esqueleto atenúa 160 ms, contenido entra 360 ms expo + 80 ms de desfase, mismo hueco | Morph skeleton→contenido (el contenido ocupa el hueco del esqueleto) |
| Hojas inferiores | entrar 500 ms (grande) / 320 ms (pequeña) `cubic-bezier(0.32,0.72,0,1)` (curva de cajón iOS), salir 300 ms (60% de la entrada), fondo atenúa 200 ms | Sheet de iOS (entrar lento, salir más rápido) |
| Arrastre de hoja | resistencia 0.55, descartar a >120 px o >0.5 px/ms, retorno con muelle 320 ms | Arrastre con resistencia (la hoja sigue el dedo y vuelve si no se suelta lejos) |
| Toast | entrar 320 ms ease-back, visible 2600 ms, salir 200 ms; reubicado como banda bajo el encabezado | Toast de confirmación (nunca tapa el encabezado) |
| Iconos | morph 220 ms al cambiar de estado | Icono que se transforma en vez de aparecer/desaparecer |
| Error | shake 400 ms `cubic-bezier(0.77,0,0.175,1)` | Shake de error (solo en error real) |
| Ambiental (máx. 2–3 a la vez) | punto LIVE 1500 ms, shimmer de esqueleto 1600 ms lineal, respiro total 500 ms una vez al cambiar | Movimiento ambiental con sentido |
| Movimiento reducido | solo opacidad 200 ms, stagger 0, sin shimmer/pulso/partículas | `prefers-reduced-motion: reduce` |

Reglas globales: solo transform/opacity (nunca layout/width); entradas solo
en la primera pintura; sin overshoot en acciones de alta frecuencia
(filtros, pestañas, aprobar en lote: presión 0.97 + retorno 150 ms);
`linear()` con fallback cubic-bezier (Safari 17.2+); View Transitions solo
como mejora progresiva, nunca el mecanismo principal.

### Defectos de la v1 corregidos (y cómo se verificó cada uno)
| Defecto v1 | Corrección v2 | Verificación |
|---|---|---|
| Misma identidad neón oscura | Identidad "Papel" completa (paleta, Sora, espaciado) | Lado a lado 390 px: fondo `rgb(243,240,232)` vs oficial `rgb(3,3,5)`; capturas `/tmp/gx2-v2/` |
| Iconos emoji/símbolo | Sprite SVG de 37 símbolos + intercambiador dinámico | grep: 0 glifos en HTML estático; 63 `<use>`; verificador Playwright |
| Mismo orden de secciones | Inicio = Decide ahora → Feed → Cobrar → Panorama | Orden de nodos en el HTML + captura |
| Animaciones = §6 tal cual | Sistema diferenciado con muelle, stagger con presupuesto, morph, arrastre, check-pop (tabla de arriba) | Valores en `admin-rediseno.css` §14 y `admin-rediseno.js`; esqueletos visibles en captura |
| Bandeja sin sesión = recuadro punteado roto | Estado vacío diseñado: tarjeta blanca, icono candado, título "Sin sesión Admin" + cuerpo | Captura 390 px; estilo computado `border-style: solid`, fondo blanco |
| "Sesión expirada" tapa el encabezado | Toast reubicado como banda bajo el encabezado sticky (`top: calc(var(--gx2-head-h) + 8px)`, `!important` contra los estilos inline de `31-admin-realtime.js`) | CSS verificado por lectura; **sin verificar en vivo**: el toast solo se dispara con Realtime y sesión |
| "+ Nuevo cliente" no se veía en teléfono | Estaba en el código (sin `desktop-only`); era el fallo de pintado. En v2 se verifica su caja | Playwright 390 px: botón visible en x=234, y=156, 146×44 px, dentro del viewport |
| Contenido a veces no pinta al cambiar de sección | Envoltorio de `goAdminTab` con salida 160 ms + solape 60 ms; las 4 pestañas pintan con altura > 0 | Playwright: `tab-clientes` h=191, `tab-operaciones` h=207, `tab-gestion` h=689, todas activas con hijos |
| Píldora "0 pendientes" y chip "Registros" oscuros (restos neón de admin.css) | Píldora verde suave + chip de arena (`!important` contra los `!important` de admin.css) | Estilo computado: total `rgb(227,242,234)`/verde; Registros `rgb(243,240,232)`; re-captura 390/1440 |
| Chips del héroe con scroll horizontal en teléfono (Registros escondido) | Rejilla 2×2 en ≤840 px, 1×4 en escritorio | Estilo computado: 2 columnas de 166 px a 390, 4 a 1440; los 4 chips visibles |
| Eyebrow "Tu veredicto" duplicaba el título | Eyebrow "Decisiones" | Captura 390 px |

### Fallo de pintado — hallazgo
El fallo intermitente (contenido que no pinta al cambiar de sección) existe
en la oficial también (reportado 2026-11-12 00:08, en ambas páginas). En el
espejo, el envoltorio de pestaña con salida+solape lo mitiga en la pasada de
verificación (4/4 pestañas pintan). La causa raíz en la oficial no se
investigó más allá: el espejo no toca el código que pinta las secciones
(43 scripts intactos). Si reaparece con sesión, es preexistente de la
oficial, no del espejo.

### Pendiente / sin verificar en v2
- Con sesión Admin real (datos vivos, tarjetas reales del feed, contadores
  con importes reales, revisión B2, Realtime, toast de sesión expirada en
  vivo): solo con la sesión de Henry en Safari; la beta en Pages es el paso
  que lo verifica.
- Sora no cargó en el entorno headless (Google Fonts bloqueado:
  `ERR_TUNNEL_CONNECTION_FAILED`); la tipografía se verificó con la sans
  de reserva. En Safari se ve Sora de verdad.
- El cajón de notificaciones aparece en capturas `fullPage` de Playwright
  por un artefacto de costura con elementos `fixed`; en uso normal está
  oculto (`translateY(105%)`, sin clase `show`, verificado a 844 y 1250 px
  de alto) y nunca se abre solo.
- Animaciones con datos reales (morph con tarjetas reales, check-pop al
  aprobar de verdad, contadores con Δ reales): solo con sesión; en
  headless se verificaron las clases, los valores y las entradas de
  esqueletos.

## 1. Decisión de navegación (corrección de Henry 23:25)

**Elegida: pestañas segmentadas sticky bajo el encabezado compacto.**
El encabezado queda en una línea (marca, campana, Sincronizado, LIVE) y justo
debajo, fija al hacer scroll, una control segmentada con los 4 destinos
(Inicio / Clientes / Operaciones / Gestión) + badge de pendientes en
Operaciones. Es 1 toque, nada escondido, no roba espacio inferior, y es el
mismo producto en teléfono y escritorio (resuelve §10.1.1).

**Por qué gana a la barra inferior:** la barra roba ~56 px + safe area en
permanencia, puede tapar el último elemento de una lista (riesgo §10.2), y es
el patrón TikTok literal que Henry pidió no copiar. La segmentada pierde solo
alcance del pulgar para cambiar de sección, pero eso pasa pocas veces por
sesión; los toques frecuentes (aprobar, marcar pagado, decidir) viven en las
tarjetas y hojas, que sí están a altura del pulgar.

**Descartadas:**
- Cajón lateral (hamburguesa): esconde la navegación, 2 toques, viola "nada
  súper escondido".
- Hub de acciones: añade un toque para ir de una sección a otra (hay que
  volver a Inicio primero).
- Encabezado compacto con accesos rápidos: no resuelve solo el cambio de
  sección; colapsa en la segmentada.

**Consecuencia:** la barra inferior móvil actual (`.gx-mobile-nav` con FAB
central) se elimina del espejo. El FAB era la 3ª copia de "Nuevo cliente"
(ver §3).

## 2. Decisiones §10.1 (opción recomendada usada; Henry corrige en revisión)

1. **Barra inferior en escritorio:** no aplica — la segmentada es la misma en
   ambas pantallas.
2. **Catálogo en barra o en Gestión:** en Gestión (la barra tiene 4 destinos).
3. **Tipografía (v2):** Sora 600/700/800 en display y cifras + sans del
   sistema en cuerpo. La v1 usaba Rajdhani; la v2 cambia a Sora como parte
   de la identidad nueva (ver §v2). No Poppins (tres experiencias
   distintas).
4. **Qué tan atrevida la identidad:** (b) NUEVA Y FRESCA, decidida por
   Henry. **v2 ("Papel"):** fondo `#f3f0e8`, superficie blanca, tinta
   `#1b1812`, primario verde `#0b6e4f`, radios 20 px en tarjetas. La v1 era
   neón oscuro (fondo `#030305`, cian y morado) y Henry la rechazó por
   verse igual a la oficial (ver §v2).
5. **"Nuevo cliente" en teléfono:** botón fijo en el encabezado de Clientes,
   siempre visible (no flotante).
6. **Panel de negocio plegado por defecto en teléfono:** cerrado (ya era el
   comportamiento vía `14-admin-mobile-controller.js`; se conserva).

## 3. Duplicados de interfaz unificados (Henry: "si se repite, unificarlo")

| Duplicado | Qué se hizo |
|---|---|
| "＋ Nuevo cliente" ×3 (Resumen, Clientes, FAB móvil) | UNO solo: el de Clientes, siempre visible. Se quitaron el de Resumen y el FAB. Misma función `agregarNuevoCliente()`; los botones no tenían ID. |
| "Guardar ajustes" ×3 (encabezado Ajustes, vista App, vista Alertas) | UNO solo: el del encabezado de Ajustes, siempre visible y con encabezado sticky para que siga a la mano dentro de App/Alertas. Misma función `gxSaveSettings()`; sin ID. |
| Contadores sueltos en Inicio (En revisión, Solicitudes) | Se quitaron de la parrilla de prioridades; esos datos ya viven en el centro de decisión. Los IDs `gx-count-review` y `gx-count-requests` se conservan como nodos ocultos para que los `set()` del JS sigan aterrizando. |
| Contadores del mismo dato en varios sitios (revisión, vencidos, registros, totales) | Se presentan una sola vez por pantalla (2-up hoy/vencidos; centro de decisión; píldoras de Clientes). Todos los IDs se conservan en el DOM: los que se muestran se reubicaron, los que no se muestran quedan ocultos. Ningún `set()` queda huérfano. |

**Conservados por no ser duplicados (aunque lo parezcan):**
- "+ Servicio" escritorio vs móvil: dos funciones distintas
  (`addGlobalService` abre el constructor; `gxAddCatalogServiceMobile` abre
  el editor móvil). Son variantes responsive, solo una visible a la vez.
- Trato Justo individual (modal) vs masivo (panel Ajustes): dos controladores
  y dos alcances distintos.
- Catálogo tabla escritorio vs lista móvil: el JS elige por `isMobile()`.
- Dos búsquedas de clientes: dos listas y dos funciones de filtrado.
- Promotions Studio v1 (25) vs v2 (29): 29 sombrea a 25 en JS; no se toca.
- Decisiones en Inicio vs bandeja Operaciones vs cajón de notificaciones:
  tres vistas del mismo estado con propósitos distintos (decidir / seguir /
  notificar). La bandeja de Inicio y la de Operaciones comparten la misma
  fuente de datos (ver §5).

## 4. Qué cambió de estructura (y qué NO)

**Cambió (solo capa visual):**
- Navegación: chips arriba + barra inferior móvil → segmentada sticky.
- Inicio reordenado: veredicto protagonista, bandeja de decisiones como feed,
  cobros hoy/vencidos en 2 columnas, próximos vencimientos con "ver más",
  negocio y panorama plegados en teléfono.
- Operaciones y Gestión son pestañas reales también en escritorio. En la
  oficial, `.gx-mobile-workspace` se oculta en escritorio y los chips de
  Operaciones/Gestión activan secciones vacías; Catálogo y Ajustes no tenían
  vía visible en escritorio. El espejo corrige eso (es un arreglo, no solo
  cosmética; Henry lo valida en la revisión).
- Escritorio ≥1280: la oficial usa una rejilla de 2 columnas con la barra
  lateral de navegación en la columna 1 (210 px). El espejo vuelve el shell
  a bloque para que el encabezado segmentado ocupe todo el ancho; sin esto,
  el encabezado caía en la columna estrecha y el contenido quedaba
  desplazado a la derecha (detectado y corregido en la verificación local).
- Gestión reordenada por frecuencia: Catálogo, Beneficios, Accesos,
  Experiencia, Sistema.
- Campana: en teléfono abre el cajón de notificaciones como hoja inferior
  (en la oficial, `14` redirige el toque móvil a Operaciones).
- Overlays unificados como hojas inferiores en teléfono (ficha y pago ya lo
  eran; el cajón de notificaciones pasa de lateral a inferior).
- Carga con esqueletos en vez de texto/spinner en las 4 listas principales.
- Botones de refresco visibles en Clientes y Operaciones; pull-to-refresh
  como gesto secundario en esas listas.

**NO cambió:**
- Ninguna función del inventario (§1 de la propuesta) se pierde; ninguna se
  inventa. Todos los IDs de la oficial están en el espejo (286 verificados
  por script, ver §7).
- Ningún flujo: revisión de comprobante antes de aprobar, guard contra doble
  cobro, pago incompleto con pacto de fecha, activación B2 individual,
  registro con código de un solo uso, cancelaciones, incidencias.
- Orden de carga de los 43 scripts y nombres de funciones globales. Los
  wrappers no se tocan.
- El orden de "Editar acceso" y la regla de mostrar el servicio una sola vez.
- El motor financiero, triggers, Edge Functions y base de datos.

**Desviaciones honestas respecto a la propuesta:**
- El cajón de filtros de Clientes NO se convirtió en hoja inferior: vive
  dentro del panel de comandos (sticky con blur), y sacarlo como hoja fija
  requeriría mover el nodo y reescribir su apertura (riesgo para el cableado
  de filtros). Queda como panel expansible, mejorado visualmente; abre con
  1 toque bajo el buscador, a altura del pulgar, y se cierra con el mismo
  botón. Nada escondido.
- Los botones del centro de decisión (Pagos/Cancelaciones/Soporte) filtran
  la bandeja de Inicio en vez de saltar a Operaciones (así lo pide §4.2.2).
  El salto a Operaciones sigue a 1 toque ("Ver todas en Operaciones" y la
  pestaña segmentada). "Registros" sigue abriendo el control de registro,
  como hoy (no hay categoría "registros" en la bandeja: los registros viven
  en su propio overlay).
- Próximos vencimientos: 5 visibles + "ver más" (la oficial muestra 6 sin
  "ver más"; el cambio es solo presentación).

## 5. La bandeja de decisiones (cómo funciona sin duplicar el motor)

No existe un feed por ítem en la oficial: el centro de decisión solo pinta
contadores y `14.buildOps` pinta la lista solo en Operaciones. El espejo
añade `admin-rediseno.js`, que reimplementa **la presentación** de
`buildOps` (misma fuente: `clientesDict` + `gxAdminNotifications` +
`gxClassifyAdminNotification`; mismo orden; mismos filtros) y pinta las
tarjetas en `#gx-decision-feed`. Las acciones son las mismas funciones
globales (`gxOpenClientFocus`, `gxMarkNotificationRead`,
`gxDeleteNotification`, `gxCancellationButtons`). Es un fork de
presentación, documentado: si `14` cambia su construcción de filas, este
fork debe revisarse. La tarjeta de revisión muestra el importe mensual del
cliente en grande (dato que ya vive en `estado_cuenta`).

## 6. Animaciones implementadas (v2 — explícitas; la §6 v1 quedó
superseded por la corrección de Henry 2026-11-12 00:12: "No las mismas
animaciones, hay que llevar este trabajo al siguiente nivel")

Ver la tabla completa en la sección **v2** arriba (elemento, valores y
patrón adaptado de cada animación). Resumen del sistema diferenciado (no
una curva para todo): héroe 420 ms expo; feed 360 ms expo con stagger de
presupuesto (500−360)÷(n−1); veredicto con muelle `linear()` + fallback;
pestañas con solape de 60 ms; presión en dos fases (bajar 80–100 ms lineal,
soltar 240 ms muelle); check-pop 420 ms + 6 partículas 520 ms; contadores
easeOutExpo 600/900 ms desde el valor anterior, nunca desde 0; morph
skeleton→contenido (160 ms fuera + 360 ms dentro); hojas con curva de
cajón iOS (500/320 ms entrar, 300 ms salir) + arrastre con resistencia
0.55; toast como banda bajo el encabezado; ambiental máx. 2–3 a la vez.
Solo transform y opacity; nunca `transition: all`; nunca propiedades de
layout. Con `prefers-reduced-motion`: solo opacidad y color, sin
desplazamiento; el conteo pone el valor final directo; el esqueleto es
estático.

## 7. §10.3 resuelto

- **Calendario beta:** no es fase sombra; es una fila visible en Servicios
  de la ficha ("Fechas de renovación" → diálogo con iframe). Se conserva
  tal cual: el espejo no mueve el contenido de Servicios, así que el
  selector de inyección (`#gx-focus-body [data-gx-section="services"]
  .gx-accordion-content`) y el diálogo `#gx-calendar-dialog` siguen
  funcionando.
- **Ficha en "Cobro" para B2:** reproducida tal cual (cáscara, overview,
  encabezado B2 condicional, orden de la pestaña Cobro, modal con
  evidencia-antes-de-aprobar, guard C2). Los archivos no se tocaron.
- **Opiniones:** overlay dentro de Admin (`#gx-rb-admin-host`, creado por
  `assets/js/opiniones/admin.js`); no es la superficie aparte de
  `preview/opiniones/`. Se conserva.
- **Divergencia B2 (§1.10):** RESUELTA. El espejo carga los 43 scripts
  reales (incluidos `35-admin-b2-f3-review.js`, `33-b2-f5-review-router.js`
  y `34-admin-recordatorios-inteligentes.js` + `admin-recordatorios.css`) y
  su sandbox permite `b2_cotizar_ciclo` (solo lectura), así que la sección
  "Cobro B2" de la ficha y el encabezado B2 cargan idénticos a la oficial.
  Además, el sandbox del espejo permite TODA la lectura del Admin (cuentas
  `listar`, cancelaciones `listar`, credenciales `listar`, registro
  `resumen`, accesos `modelo`/`diagnostico`, promociones `listar`, ajustes
  `obtener_stock_manual`, inventario), no solo datos + B2 como el sandbox
  F3. Las escrituras siguen bloqueadas (ver abajo).

**Limitaciones conocidas (fail-closed por diseño, no bugs):** el espejo es
de REVISIÓN. Todo lo que se puede LEER funciona igual que en la oficial;
todo lo que ESCRIBE está bloqueado por el sandbox y falla con el error real
visible (PR #201):
- "Atendida" / "Eliminar" en notificaciones (`admin-operaciones`:
  `marcar_notificaciones_leidas`, `eliminar_notificaciones`) → alerta
  "No se pudo marcar la solicitud como atendida." / "No se pudo eliminar
  la notificación." (la oficial sí lo persiste).
- Botones de cancelación (`cancelaciones-admin`: `resolver`,
  `hacer_efectiva`), cuentas (`crear`/`editar`/`asignar`/`desasignar`/
  `sugerir_pin`/`asignacion_inteligente`), credenciales (`publicar`),
  registro (`resolver_solicitud`/`vincular_existente`/`eliminar_registro`/
  `preparar_activacion`/`regenerar_activacion`/`cancelar_activacion`/
  `liberar_telefono`/`actualizar_cliente`), pago (`rechazar_pago`,
  `marcar_notificaciones_leidas`), ajustes (`guardar_stock_manual`/
  `guardar_referido`/`reiniciar_misiones_cliente`/`nueva_ronda_cupon`) y
  referidos (`desactivar_referido`).
- Para clientes de fecha única, `35` restaura el modal global y el botón
  ✓ Aprobar aparece habilitado, pero el sandbox deniega la escritura (403
  con el error real visible). Es el comportamiento diseñado del espejo:
  revisión sí, aprobación no. En la oficial sí se puede aprobar.
- Sin sesión Admin, la bandeja de decisiones muestra "Sin sesión Admin:
  inicia sesión para cargar las decisiones." en vez de esqueletos eternos
  (las demás listas muestran el estado vacío de la oficial).

Por tanto: **el espejo es idéntico en lectura y navegación, no en
escritura.** No se presenta como "idéntico en funciones" sin este matiz.
- **Comunicaciones:** página aparte (`comunicaciones.html`), entrada desde
  Gestión → Experiencia; sin cambio.

## 8. Verificación

- **IDs (v2):** los 286 IDs de la oficial están en el espejo + 43 nuevos
  propios del espejo (37 símbolos del sprite SVG `gx2-ic-*` +
  `gx-decision-feed`, `gx2-nav-ops-badge`, `gx2-decision-feed-section`,
  `gx2-feed-filter-label`, `gx2-upcoming-more`, `gx2-ptr-indicator`). Sin
  duplicados (verificado por script, 2026-11-12).
- **v2 — verificación headless (Playwright/Chromium, sin sesión Admin,
  2026-11-12):** espejo 390 px y 1440 px sin overflow horizontal; fondo
  papel `rgb(243,240,232)` vs oficial `rgb(3,3,5)`; estado vacío diseñado
  ("Sin sesión Admin", borde sólido, fondo blanco); panel de negocio
  plegado; 63 usos SVG / 37 símbolos; 0 glifos emoji en el HTML estático;
  las 4 pestañas pintan (Clientes h=191, Operaciones h=207, Gestión
  h=689); "+ Nuevo cliente" visible a 390 px (x=234, y=156, 146×44);
  total "0 pendientes" en píldora verde suave y chip "Registros" en arena
  (estilo computado); 4 chips del héroe visibles en 2×2 a 390 px y en
  1×4 a 1440 px; 0 `pageerror` del código propio. Errores de consola
  observados: solo del script oficial `21-admin-smart-operations-controller.js`
  ("Admin F3 beta: esta operación no está habilitada" / Failed to fetch,
  sin sesión y sin red — no del espejo). CDN bloqueado en la VM
  (Supabase jsDelivr, Google Fonts Sora/Rajdhani:
  `ERR_TUNNEL_CONNECTION_FAILED`). Capturas en `/tmp/gx2-v2/`
  (`v2-mirror-390-inicio.png`, `v2b-mirror-390-inicio.png`,
  `v2-mirror-1440-inicio.png`, `v2-official-390-inicio.png`,
  `v2-mirror-390-tab-*.png`).
- **Scripts:** [sandbox] + los 43 `<script src>` de la oficial en el mismo
  orden exacto + el JS propio del espejo al final (verificado por diff).
- **Servidor local + navegador (Playwright/Chromium, sin sesión Admin):**
  - 390 / 360 / 768 / 1440 px: sin overflow horizontal; segmentada
    visible con 4 destinos; cambio de pestaña verificado (clic en
    Clientes → `tab-clientes` activa); Gestión reordenada (Catálogo,
    Beneficios, Accesos, Experiencia, Sistema); 1 botón "Nuevo cliente"
    y 1 "Guardar ajustes"; Operaciones visible en escritorio (`block`);
    panel de negocio cerrado en teléfono y abierto en escritorio.
  - Encabezado sticky verificado: tras desplazar 600 px, el encabezado
    sigue en `top: 0` en 390 / 768 / 1024 / 1440 / 1920 px. Alturas
    medidas: 132 px (teléfono), 137 px (tablet), 141 px (escritorio);
    `--gx2-head-h` usa esos valores por breakpoint.
  - Corrección aplicada tras la primera pasada: el encabezado caía en la
    columna lateral de 210 px de la rejilla de escritorio ≥1280 (la
    oficial la usa para su barra lateral); el espejo vuelve el shell a
    bloque en ≥1280. Re-verificado: encabezado a ancho completo y
    contenido centrado.
  - Segunda corrección: en teléfonos ≤420 px la barra superior rebosaba
    12 px (el estado "Sincronizado", que la oficial oculta en móvil, no
    cabía junto a campana + LIVE + salir). Se oculta ≤420 px y reaparece
    ≥421 px. Re-verificado: la barra cabe en 360 / 390 / 420 / 421 / 768
    / 1440 px.
  - Sin errores de página del espejo (0 `pageerror` del JS/CSS propio).
    Los errores de consola observados son: (a) el CDN de Supabase y
    Google Fonts no cargan en este entorno (`ERR_TUNNEL_CONNECTION_FAILED`
    — sin salida externa; la oficial fallaría igual aquí), por lo que la
    capa de datos no se inicializó y las listas muestran su estado vacío;
    (b) denegaciones 403 del sandbox a lecturas que el sandbox F3 no
    cubría — resueltas ampliando `allowRead` (ver §7); con sesión, esas
    lecturas pasan.
- **Pendiente / no verificado en local:** el comportamiento con sesión
  Admin real (datos vivos, revisión B2 de un comprobante real, guard C2 en
  vivo, Realtime sin cerrar hojas, conteo animado con importes reales,
  feed con tarjetas reales) solo se puede comprobar con la sesión de
  Henry en Safari; el espejo local sin sesión muestra la cáscara, los
  esqueletos y el estado "sin sesión". La beta en Pages es el paso que lo
  verifica.
