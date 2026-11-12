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
3. **Tipografía:** Rajdhani en display y cifras + sans del sistema en cuerpo
   (§7.1 de la propuesta). No Poppins (tres experiencias distintas).
4. **Qué tan atrevida la identidad:** (b) NUEVA Y FRESCA, decidida por Henry:
   fondo #030305, cian y morado de marca conservados, acento ámbar nuevo para
   urgencia, radios 20 px en tarjetas, jerarquía y motion nuevos.
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

## 6. Animaciones implementadas (§6, explícitas)

Easing único de entrada `cubic-bezier(0.23, 1, 0.32, 1)`; solo transform y
opacity; nunca `transition: all`; nunca propiedades de layout.

| Animación | Implementación |
|---|---|
| Cambio de pestaña | `.tab-content.active`: `gx2TabIn` 250 ms, translateY(8px) + opacidad |
| Entrada de tarjetas del feed | `gx2CardIn` 300 ms, stagger ~40 ms, máx. 6, desde translateY(8px) + scale(.98) + opacidad 0 (nunca desde scale(0)) |
| Apertura de hoja inferior | `gx2SheetIn` 300-350 ms (ficha, pago, notificaciones); fondo atenúa con opacidad 200 ms |
| Cierre de hoja | 200 ms ease-in (la ficha y el pago usan la transición de cierre del sistema; el cajón de notificaciones usa 200 ms ease-in al quitar `.show` vía el wrapper de campana) |
| Presión táctil | `:active` scale(0.97), 100-160 ms, en todos los botones |
| Conteo animado de importes | 600-800 ms ease-out, solo en la primera pintura con datos (KPIs, total de pendientes, hoy/vencidos); los cambios por Realtime no se animan |
| Pop de badge | 150 ms, solo scale, cuando el cambio sigue a una decisión de Henry (ventana de 2 s tras aprobar/atender/eliminar) |
| Skeleton | pulso de opacidad 1.2 s entre dos grises; sin shimmer |
| LIVE ambiental | punto LIVE respira 2 s, opacidad |
| Cambio de filtro | píldora activa por opacidad/escala 200 ms; la lista re-entra escalonada (máx. 6) |

**Movimientos ambientales a la vez:** 3 como máximo (LIVE, conteo al entrar,
pop al decidir). Con `prefers-reduced-motion`: solo opacidad y color, sin
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

- **IDs:** los 286 IDs de la oficial están en el espejo + 6 nuevos propios
  del espejo (`gx-decision-feed`, `gx2-nav-ops-badge`,
  `gx2-decision-feed-section`, `gx2-feed-filter-label`,
  `gx2-upcoming-more`, `gx2-ptr-indicator`). Sin duplicados.
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
