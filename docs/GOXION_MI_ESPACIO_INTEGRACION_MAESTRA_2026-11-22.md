# GOXION · Mi Espacio — expediente maestro de avance e integración coordinada

> **PUNTO DE REANUDACIÓN ACTUAL (23/NOV/2026):** [`GOXION_MI_ESPACIO_REANUDACION_2026-11-23.md`](GOXION_MI_ESPACIO_REANUDACION_2026-11-23.md). **La navegación V4.3 fue validada visualmente por el usuario** («Mucho mejor»). Esto no implica que la página oficial esté integrada ni que Safari o conexiones reales hayan pasado QA. Último laboratorio: https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=1164984. **Este aviso y la bitácora V4.3 prevalecen sobre notas históricas V1–V4.2.**


**Corte documental:** 22 de noviembre de 2026, después de la revisión «Filtrar» sin flecha del Historial de movimientos.  
**Propósito:** entregar el rediseño completo del feed de forma coordinada cuando el usuario autorice la integración **oficial**, sin perder las aprobaciones del laboratorio ni duplicar lógica de negocio.  
**Estado real:** **laboratorio de diseño en GitHub Pages**; la mayoría de los componentes nuevos **NO están implementados en `ayuda.html` de producción**. Existe una rama de integración parcial de Servicios **sin fusionar**. **Este documento NO es autorización de despliegue**.  
**Repositorio:** `henrygonzalezestrada-cyber/goxion`, rama de referencia visual `main`.

> **Leer esto primero en otra sesión.** En caso de contradicción entre textos antiguos de continuidad y este corte, este expediente es el **índice de estado e integración más reciente**. Para medidas y microcomportamientos, consultar los **contratos específicos enlazados abajo**; no reemplazarlos con resúmenes. Cada edición futura debe actualizar este expediente junto con su contrato de componente. No suponer que una captura de laboratorio prueba una conexión real.

## CONTRATO DE PRESERVACIÓN OBLIGATORIA · Interacciones oficiales (23/nov/2026)

**Nueva auditoría real del código oficial ante dudas del usuario:** [`GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md`](GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md). Este documento es **vinculante para la integración**: inventaría confeti de misiones/cupones/referidos, toast y secuencia de checkbox, progreso y CTA de reclamo, campana real con contador sin leer y `99+`, ringing por nuevas notificaciones, swipe/borrar/deshacer/marcar leídos, realtime y sesión; también gamificación, morph de tarjetas, navegación, PIN/credenciales, soporte, Catálogo, Goxy asistente real y bienvenida. **Conservar la funcionalidad/feedback, no necesariamente copiar la estética antigua.**

**Diferencia crítica:** el laboratorio `morph-v2.html` contiene **campana ilustrativa sin contador real** y misiones de ejemplo, por tanto la integración oficial debe **reusar** `#gx-client-notif-launch`/`#gx-client-notif-badge` y `goxionMissionAPI`, `lanzarConfeti`, `marcarMisionVisual` y los handlers originales, en vez de copiar los mocks. Recompensas solo tras confirmación; usuario no debe perder ningún flujo antiguo. **No marcar listo el lanzamiento sin aprobar pruebas de regresión del contrato.** Esta auditoría fue documental: `ayuda.html` y el laboratorio NO se editaron.

---

## Última iteración V4.3 · contraste de cápsula activa (23/nov/2026)

El usuario autorizó replicar **el principio de contraste del control oficial** sin copiar su borde al 80%: texto de la etiqueta activa `14.5px/700` (antes 12px/650), borde cian activo `rgba(0,242,254,.42)` al ampliar y `.25` al compactar, `border-color` animado discretamente. CSS commit **`21280ac555e44d16ffbcd90bd09e970697fcc116`**, HTML anticaché **`11649842c0ace57581197ac1c504a6166739198c`**. Se conservaron los 9px proporcionales de V4.2, cristal, círculos táctiles, Goxy y el resto del feed. Solo laboratorio, sin implementación oficial.

**Probar:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=1164984

---

## Última corrección V4.2 · aire proporcional con saludo (22/nov/2026)

La cápsula V4.1 estaba aprobada salvo por **el espacio inferior excesivo**. Se restauró simetría: margen superior **9px**, inferior **9px**, sin alterar el saludo aprobado ni su reserva de dos líneas. CSS commit `1c5a45cf869c5c8927d9382d9904b2d568cdb853`; caché de HTML `56c6d11aa6f93b6420f8ec9dfdd6862b2e29c8bb`. En compacto se compensa margen: 29px normal / 27px <=355px, manteniendo espacio total sin saltos. Ver [contrato de navegación](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md), V4.2. **Solo laboratorio**, sin edición de `ayuda.html`.

**Vista:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=56c6d11

---

## Último pulido V4.1 · cápsula compacta y emojis (22/nov/2026)

V4 centrada y sticky conservada. **Aplicado al laboratorio** (HTML `65b6ad03d87b7c5a029c91a9f5ad6ed699796dd4`): compacta **160×56px** o **158×56px** en <=320px, botones **44×44px**, emojis **19px** centrados en cuadro fijo 24×24px (sin fila fantasma de etiqueta), activo con microhalo cian muy tenue, separación con saludo +4px y margen compensatorio para que el feed no salte. CSS final `adaptive-top-nav.css` commit `03fa1c8d7afbfea2ed615498e475f50e241e80a1`. Solo laboratorio; **no modifica navegación JS, Goxy, feed o versión oficial**. Detalle en [contrato de navegación](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md), sección V4.1. QA visual iPhone pendiente.

---

## Navegación V4 en laboratorio — cápsula centrada y sticky (última decisión, 22/nov/2026)

Tras recuperar y probar la V3 anterior a Muse, el usuario optó por **simplificar la navegación** para reducir riesgos. **La V4 sustituye el traslado de la cápsula a la esquina**: conserva una única nav y los tres destinos estilo oficial, pero utiliza **`position: sticky` y centrado nativo** dentro del feed, compactando solo su tamaño y restaurándolo al deslizar de regreso. El encabezado con logo, campana y Goxy no se transforma en una barra adicional ni viaja a la esquina: **desaparece de la vista con el scroll normal**.

**Laboratorio:** HTML `morph-v2.html` commit `cb19d3ab3750e9e8835fb33000cfdaf2b80ee48d`; CSS `adaptive-top-nav.css` commit `2e5007c1d804e8ba989f39447394429a0dbdc668`; JS `adaptive-top-nav.js` commit `876946a90b7e06fc892148203d334364143ad402`. **El nuevo contrato prevalente está en la sección 11 de** [`GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md`](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md). Medidas: nav compacta 172×60 px (160×60 en <=320 px), targets redondos 46px (44px en <=320), cristal `rgba(8,8,12,.371)` con blur 11.75px; botones oficiales conservan el morph con etiqueta activa en expandida. Umbrales con histéresis, transición CSS que siempre completa su ciclo. No se mueve `scrollY` ni se reubica el elemento lateralmente.

**Regresión:** 15 comprobaciones estáticas y 18 simulaciones de comportamiento satisfactorias. Smoke WebKit/Chromium actualizado, **no ejecutado**; pendiente evaluación visual en Safari físico. Ningún cambio en los módulos de Hero, Beneficios, Ahorro, Servicios, Historial, Catálogo ni archivos oficiales. Goxy y menú siguen simulados; personalización de color y foto persistente pendientes.

**Vista V4:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=cb19d3a

**Advertencia histórica:** los párrafos que siguen sobre V3, o sobre «una sola cápsula que se mueve a la esquina», documentan la decisión anterior y **NO son el diseño vigente**. No restaurarlos ni copiar el código de la V3 por error; guardar como respaldo únicamente.

---

## Restauración de laboratorio tras cambio de Muse (22/nov/2026)

**Estado vigente:** recuperada la V3 anterior al cambio no aprobado `c8f3efa0782b5cfe403cec90cbff75e05ebb9191`. Se restauraron **solo los tres archivos que Muse modificó** (`morph-v2.html`, `adaptive-top-nav.css`, `adaptive-top-nav.js`) desde el punto de control `27ecb20ef481503eaec3bacd9555e8d8c90a81a4`. El HTML tiene únicamente un ajuste posterior de `?v=restore-...` para evitar archivos antiguos en caché. **No hay cambios oficiales.** Mantener la cápsula V3 independiente, con **un solo movimiento y expansión al deslizar de vuelta**, Goxy y el Hero/beneficios tal cual estaban. No usar la «franja única» que introdujo Muse como referencia de diseño. Registro completo y SHAs: [contrato de navegación](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md).

**URL para retomar:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=cb19d3a

---

## ÚLTIMO ESTADO de navegación · V3 (22/nov/2026)

El usuario rechazó la V2 porque la cápsula se ocultaba y aparecía un dock diferente por encima. El nuevo requisito implementado en laboratorio es **un único elemento `#gxn-nav` que se desplaza y transforma en una sola interacción**, desde su posición debajo del encabezado hacia el hueco izquierdo del logo, desapareciendo este durante el mismo recorrido. Si el scroll se detiene a medias, **termina su ciclo sin mover `scrollY`**; al regresar hacia abajo se amplía en la esquina y vuelve a su posición original al llegar arriba. No volver a una animación de desaparición/reaparición.

**Investigación específica y origen técnico:** se revisó `assets/js/index/05-index-header-morph.js` **oficial**, que combina seguimiento amortiguado de un progreso y asentamiento a extremos; para Mi Espacio se toman esos principios pero NO el salto de scroll financiero. Contrato canónico y registro de prueba: [`GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md`, sección 10](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md).

**V3 publicada SOLO en laboratorio:** `morph-v2.html` commit `ab31bd8e3e16cbb17756114e4f9dabe95431018c`; `adaptive-top-nav.css` commit `26eb0039433d60bcd920cd4892037d175e97bcab`; `adaptive-top-nav.js` commit `800e8f2136a74fba88d13ec132a69745040ccad6`. Mide un slot de origen y un punto destino fijo, reubica la misma cápsula con `translate3d` y cambia anchura, altura y círculos de manera coherente. El dock queda a la izquierda (158–174px cerrado, hasta 246px ampliado). **Cristal neutro**, 44–46px círculos en compacto, morph del activo preservado. Margen con saludo reducido de 39px a 15px.

**Pruebas:** 12 estados simulados de scroll y layout pasaron, 4 scripts inline válidos, CSS sin reglas del dock anterior; browser smoke Chromium/WebKit actualizado pero todavía **NO ejecutado en navegador real**. Goxy y menús siguen siendo demostrativos. `ayuda.html` y handlers oficiales intactos. **No declarar QA visual o fluidez iPhone aprobados hasta revisar la V3 real.**

**Vista de revisión:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=4efbd59

---

## Navegación anterior V2 · referencia histórica reemplazada por V3

Tras video real de iPhone el usuario **rechazó el contenedor superior que unificaba logo, navegación, campana y Goxy**: se veía oscuro, opaco, ancho y con círculos deformados. **V2 en laboratorio** lo sustituye por **tres grupos independientes** sobre el contenido: logo individual, **mini cápsula central translúcida** y controles de campana/Goxy, sin un fondo envolvente. Mantener el morph del destino activo heredado de la navegación oficial y radios circulares estrictos para las opciones inactivas. Valores: cristal `rgba(8,8,12,.371)` + `blur(11.75px)`; mini cápsula aprox. 182×60px, ítems de 48px (44–46px en pantallas estrechas); cápsula inicial usa 56px (54px en móvil estrecho). Pinned assets en `morph-v2.html` commit **`d2237f1cc726460ab5114d8ff2c8704a69eafb30`**, CSS `9597943f956fda0c719c0a5a6fd292dd9057747b`, JS `8b25d104ae1453176c931b205363357db4b0d6a6`.

**Detalles técnicos:** el dock no se fusiona en `#sticky-client-bar` oficial ni se publica todavía. No usar `top.offsetHeight` ni forzar layout sincrónico durante desplazamiento. El smoke V2 prueba círculos, material y solapes a 280–768px pero **no ha sido ejecutado en un browser real aún**. Goxy mantiene avatar original; **personalizar su color** es una idea de backlog posterior, no una función implementada. Documento canónico actualizado: [`GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md`](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md) sección 9.

**Enlace V2:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=ab31bd8

---

## Nueva línea en laboratorio V1 — encabezado y cápsula adaptable (pendiente de aprobación)

**Solicitud del 22/nov/2026:** el usuario pidió **implementar en el laboratorio**, manteniendo la expansión del ítem activo de la navegación oficial y sumando: cápsula superior compacta al avanzar en scroll, expansión al volver por el contenido, logo contextual, emojis, campana y avatar predeterminado con el rostro original de Goxy, menú «Mi perfil / Salir» y foto de prueba local.

**Ahora existe en `main` únicamente como prototipo**, no conectado a cuentas. Referencia de implementación y análisis: [`GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md`](GOXION_NAV_SUPERIOR_ANALISIS_CONCEPTO_2026-11-22.md), sección 8. Archivo `morph-v2.html` commit **`cdfb36d2b62416b5e4e01741b19de962f11f26ec`**, CSS `adaptive-top-nav.css` commit `775acbb98567e5733e7258625740d6f57547eef5`, JS `adaptive-top-nav.js` commit `a72fa20ab9cdb5738bcc98cb0f103a048b68e2bd`. Smoke browser `check-adaptive-nav.mjs` añadido, pero no ejecutado físicamente. **No está aprobado en Safari real**.

**Contrato funcional futuro:** una sola nav / tres destinos; conservar `switchTab`, `#gx-client-notif-launch` real, login morph, `cerrarSesion()` y coordinar `#sticky-client-bar`. **No hay API de fotos confirmada:** el laboratorio permite seleccionar una imagen local sin persistir; producción requiere almacenamiento autenticado seguro. No copiar los diálogos demo como funciones reales. No alterar Hero, Beneficios, Ahorro, Servicios, Historial y Catálogo.

---

## 1. Accesos y puntos de restauración

| Recurso | Fuente |
| --- | --- |
| Laboratorio **vigente** del feed | [Abrir GOXION Mi Espacio, versión de prueba](https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=d2237f1) |
| Archivo editable del laboratorio | `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en `main`; última iteración visual conocida: **`cdfb36d2b62416b5e4e01741b19de962f11f26ec`** (nav adaptativa en laboratorio, no publicada); **los componentes originales previos** estaban fijados en `37388f559cad5f7c78d2a753ec515fd141ae0c93` |
| Contrato visual compartido por componente | [`GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md`](GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md) |
| Hero/saludo exacto aprobado e inmutable | [`GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`](GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md), commit **`f33e8572c07377f4811080a87c7cb1b483983b34`**, rama de respaldo `approved/mi-espacio-hero-compacta-centrada-20261122` |
| Lealtad/Referidos/Misiones | [`GOXION_AUDITORIA_BENEFICIOS_FEED_2026-11-22.md`](GOXION_AUDITORIA_BENEFICIOS_FEED_2026-11-22.md) + [continuidad exhaustiva](GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md) |
| Servicios conectado **propuesto, no publicado** | [PR borrador #231](https://github.com/henrygonzalezestrada-cyber/goxion/pull/231), rama `feature/mi-espacio-servicios-conectados-20261122`, [contrato de la rama](https://github.com/henrygonzalezestrada-cyber/goxion/blob/feature/mi-espacio-servicios-conectados-20261122/docs/GOXION_SERVICIOS_CONEXION_VISUAL_V1_2026-11-22.md) |
| Historial de movimientos: visual + fuentes | [`GOXION_HISTORIAL_MOVIMIENTOS_DISENO_Y_FUENTES_2026-11-22.md`](GOXION_HISTORIAL_MOVIMIENTOS_DISENO_Y_FUENTES_2026-11-22.md) |
| Página oficial sin reemplazar | `ayuda.html`, DOM `#view-dashboard`, `#dash-services`, `#dash-history`; fuente funcional `assets/js/ayuda/01e-client-dashboard.js`, capa de datos `assets/js/ayuda/02-client-supabase-layer.js`, CSS `assets/css/ayuda.css` |
| Guardas técnicas de integración | [`AGENTS.md`](../AGENTS.md), [`ENGINEERING_HYGIENE_POLICY.md`](ENGINEERING_HYGIENE_POLICY.md), [`FINANCIAL_ERROR_CATALOG.md`](FINANCIAL_ERROR_CATALOG.md), [`GOXION_HIBRIDO_RENOVACIONES_V2.md`](GOXION_HIBRIDO_RENOVACIONES_V2.md) |

**Control de obsolescencia:** justo antes de implementar, leer los archivos vigentes y comparar sus hashes/commits con este inventario. Si cambió `main` o el laboratorio, actualizar este corte; no asumir que los identificadores de 22/nov describen el código futuro.

## 2. Avance y estado real por módulo

| Área en orden de feed | Lo que está decidido / visible en el laboratorio | Estado de producción y siguiente acción |
| --- | --- | --- |
| **Encabezado, saludo y hero** | «Compacta centrada», composición limpia, títulos/iconos dinámicos, saludo superior con reserva de **2 líneas**, entrada por palabras y rotación de frases no urgentes cada **13 s**. Material neutro: control **15% de profundidad** (NO alfa CSS 0.15) y CTA **8%**. **No añadir** rótulo GOXION flotante. | **Diseño del hero aprobado y congelado.** Conectar estados oficiales del cliente, nombre seguro, CTA, períodos y comportamientos sin reimplementar finanzas; validar Safari. No rediseñar. |
| **Lealtad** | Compacta en una fila de tres beneficios; emoji estrella a color junto a la métrica; expandida con título real, contraste, emoji grande en esquina inferior, barra animada, reglas mediante botón SVG de información y microsuperficie más oscura para lectura. | Laboratorio avanzado / criterios visuales revisados; falta integración de su lógica real y prueba final de todos los estados. Mantener los flujos de racha, beneficios y reglas existentes. |
| **Referidos** | Misma familia visual de compactas y expansión; estados sin referido, parcial, cumplido y reclamado; barra de progreso **solo si hay progreso real**, CTA de invitación con icono de información a la derecha y condiciones bajo demanda. | Laboratorio avanzado; al integrar, preservar enlaces, referidos reales y reglas de validación por meses. No mostrar avance ficticio. |
| **Misiones** | Tercera compacta alineada; barra de avance animada y checkbox con microanimación, detalles de tareas y recompensa. **Los separadores de tareas son funcionales y se conservan**. | Laboratorio avanzado; reconectar misiones y recompensas reales; verificar los estados inicial, parcialmente completo y completo. |
| **Ahorro del cliente** | Una superficie neutra con logos reales flotantes y profundidad, número grande y contador animado, **una frase** de contexto. Respetar los tamaños, solapes y márgenes ya pulidos. | **Solo visual ilustrativa hasta validar cálculo y fuente.** La cifra `$248` del laboratorio es un ejemplo, **no** ahorro acreditado del cliente. No prometer importes reales ni crear otro cálculo financiero. |
| **Tus servicios** | Lista de plataformas compactas, logo/nombre/estado, expansión que mantiene accesos y acciones; verde correcto, ámbar pendiente, naranja incidencia/baja autorizada no efectiva, rojo rechazo/alerta. Avisos cortos y segunda novedad bajo demanda. **No hay línea decorativa bajo el logo.** | Laboratorio avanzado; PR #231 prepara CSS y control de prioridad sobre los **handlers originales**. No fusionado, sin QA real. Se deben conservar PIN de perfil, PIN GOXION separado, credenciales de una sola consulta, cancelaciones, invitaciones, soporte y alertas. |
| **Historial de movimientos** | **Último módulo de esta reorganización**, reemplazará (no duplicará) `Historial de pagos`; una sola superficie de cristal, filas separadas por líneas **funcionales neutras**, tres inicialmente y más bajo demanda; categorías Todos/Pagos/Servicios. Botón **Filtrar**: **una sola píldora de cristal 8% con icono estático**, sin flecha ni X; texto cambia a Pagos/Servicios; filas con flecha exacta de Servicios, convertida en X al abrir. | Laboratorio con **7 movimientos ficticios**. Pagos históricos ya están conectados en oficial; falta fuente auditada de alta/renovación/baja efectiva. No llamar «renovación» a cada pago ni convertir una aprobación de cancelación en baja efectiva. El módulo no está en producción. |
| **Catálogo / navegación / otras áreas** | El laboratorio incluye tarjetas de catálogo **demostrativas** y controles de prueba. La navegación/soporte/catálogo oficiales conservan su propia lógica y patrones. | **Fuera del rediseño de integración del feed**, salvo adaptación visual que autorice el usuario. No copiar los ejemplos de Catálogo ni los simuladores al cliente. **Novedades V4** y Términos y condiciones ya tienen flujos separados; no duplicarlos ni reiniciar su presentación sin requerimiento. |

**Sobre «aprobado»:** el usuario ha validado y pulido la **dirección visual** de los módulos; esto NO es una aprobación de conectividad ni un pase automático a producción. El hero sí tiene un contrato explícito de diseño congelado. Historial y Servicios requieren QA visual final en el iPhone antes de lanzarse.

## 3. Identidad de diseño: acuerdos que no pueden romperse

1. **ADN común sin uniformar indebidamente.** Material base de las superficies del laboratorio: `.gxc-surface`, fondo neutro `rgba(8,8,12,.371)` con blur aprox. `11.75px`. Mantener el control aprobado de profundidad del hero, opacidad de botones y el trabajo sobre márgenes, tamaños y legibilidad. No crear un «arcoíris» ni encapsular cada línea en otro cristal.
2. **Cierre común donde corresponde:** círculo cian `#79e6fc` diámetro **35px**, glifo X oscuro **16px**, target **44×44px**. En Servicios, beneficios y **filas abiertas del Historial** se respetan los tamaños; las flechas de Servicios y filas del Historial comparten **el mismo path SVG**, no solo el mismo `width`. No cambiar el positionamiento aprobado por una regla global.
3. **Excepción intencional: filtro del Historial.** `Filtrar` es un botón de acción completo: **no usa flecha, no se transforma en X**, y conserva su etiqueta al abrir; tras elegir categoría la etiqueta indica Pagos/Servicios. El botón de cristal cambia apenas de tono para selección. Las cápsulas Todos/Pagos/Servicios aparecen ancladas al título sin aire excesivo, con targets 44px.
4. **Líneas: distinguir función.** No añadir la línea de color debajo del logo de Servicios; **sí conservar** las barras de progreso informativas de beneficios, divisiones entre tareas y las líneas neutras que separan filas del Historial. No extrapolar el veto de líneas de Servicios al resto.
5. **Divulgación progresiva.** Compacta comunica el dato más útil; expandida muestra el detalle. En Servicios no repetir estado en encabezado+aviso+texto; novedades secundarias ocultan detalle hasta pedirlo; en Historial filtrar y expandir no deben insertar bloques de texto grandes por defecto.
6. **Movimiento premium con sentido:** barras/sweep en Lealtad/Misiones, emojis expresivos, check de Misiones, morph en tarjetas, logos flotantes y contador en Ahorro. Respetar `prefers-reduced-motion`; no introducir efectos que roben atención ni quitar animaciones funcionales.
7. **Mobile first:** diseño real de iPhone, márgenes consistentes, targets táctiles al menos 44px cuando es posible, no encimar botones, visibilidad de foco/VoiceOver, no aumentar densidad de información injustificadamente.
8. **Estilo visual personal:** moderno, limpio, cristal artístico con contrastes medidos; ningún logo ficticio «AG» o rótulo flotante GOXION dentro del hero. No reemplazar la UI aprobada por una nueva interpretación genérica o una interfaz paralela.

## 4. Contratos operativos y fuentes: NO crear otra fuente de verdad

| Contrato | Dueño oficial actual | Regla de integración |
| --- | --- | --- |
| Identidad, sesión, perfil, permisos | `ayuda.html` + capa cliente `assets/js/ayuda/02-client-supabase-layer.js` + autenticación oficial | Reutilizar el acceso con token cliente y restricciones vigentes; no hacer una página alternativa ni incluir perfiles reales en fixtures. |
| Estado financiero, fecha principal y ciclos B2 | Edge `mi-espacio`, `estado-cuenta-beta` y motor V1/B2 vigentes | La UI **lee** el resultado servidor. No recalcular deuda, mora, cobertura, abonos ni saldo a partir de JS decorativo. No confundir **cobertura pagada** con **próxima renovación**. Las dos fechas no deben bloquearse por sumar servicios. |
| Historial de pagos | `data.pagos` → `cliente.historial_pagos` en la capa cliente; `gxPaymentHistoryMeta` en `01e-client-dashboard.js` | Mantener `id`, periodo, fecha, monto, estado, puntualidad y `lealtad_efecto`. No mezclar pagos enviados o incompletos con pagos acreditados. Usar esto como entrada de pagos al nuevo historial. |
| Accesos, perfiles y datos de plataforma | `cliente.servicios`, `cliente_accesos`, `gxToggleServiceCard`, `gxRevealServicePin` | Conservar mostrar/ocultar PIN de **perfil**, copiar correo, múltiples perfiles, invitaciones y soporte. No confundir con PIN de autenticación GOXION. |
| Contraseña nueva / entrega protegida | `credenciales-cliente` + `gxRevealCredential` | El PIN GOXION real se valida por flujo oficial; contraseña **una sola consulta**. No incluir contraseñas, PIN ni correos privados en Historial, laboratorios, analíticas o persistencia local adicional. |
| Cancelaciones y retención | `cancelaciones-cliente`, `s.cancelacion`, `gxSubmitServiceCancellation`, lógica oficial de retención | Distinción **solicitada → aprobada/rechazada → efectiva**. Servicio visible hasta baja efectiva, y desaparece de tarjetas cuando el servidor lo confirma; mantener acceso al historial pasado. No inventar evento «baja efectiva» porque la solicitud fue aprobada. |
| Novedades y alertas | `novedades-cliente`, `s.novedades`, `combinedNotices`, `gxAcknowledgeServiceNotices`, `gxServiceHasAlert` | Conservar prioridad original del servidor, avisos acumulados, `+N`, acuse y estados de incidencia. No duplicar credenciales protegidas como texto plano. |
| Beneficios (Lealtad/Referidos/Misiones) | Lecturas y acciones oficiales del cliente, configuraciones gamificación/referidos y motor de recompensas | No perder condiciones, ventanas de meses, cupones, validación de hitos ni reglas de pago; no calcular recompensas por UI. |
| Ahorro comparativo | **Requiere fuente y fórmula real verificadas** | La muestra del laboratorio no basta. No afirmar un ahorro monetario real sin comparación oficial, metodología clara y precios de referencia fiables. |
| Eventos no monetarios del Historial | **Aún NO existe un feed cliente unificado, completo y verificado** de altas, renovaciones y bajas efectivas | Contrato futuro de lectura: IDs únicos, fecha efectiva validada, tipo, fuente, cliente autorizado, operación de origen y deduplicación. **No escribir eventos desde la UI** ni inferirlos del primer pago o de ausencia de un servicio activo. |

**Seguridad y privacidad:** usar datos ilustrativos únicamente en laboratorio; al integrar, textContent/escaping, no inyectar HTML no confiable, no exponer credenciales ni endpoints privilegiados; no copiar tokens ni información de clientes en documentación o tests. Actualizar UI a partir de estado oficial autenticado y actualizaciones en tiempo real donde existan.

## 5. Hoja de integración coordinada: preparar por partes, publicar como una sola versión

**Principio:** el usuario quiere ver la experiencia completa **integrada de forma cohesiva**. Eso NO exige hacer un único commit sin pruebas. Construir una **rama de integración nueva basada en el `main` más reciente**, aplicar cambios por componente en commits revisables y publicar **solo tras QA funcional y aprobación explícita**; si se desea un lanzamiento conjunto, hacerlo con un PR final integrado.

### Fase 0 · Baseline y protección (antes de editar)
- [ ] Confirmar aprobación explícita del usuario para comenzar **integración oficial**. El pedido actual es **documentar**, no implementar.
- [ ] Actualizar `main`, anotar SHA, respaldar estado de `ayuda.html` y código oficial. Crear rama `feature/mi-espacio-feed-integracion-<fecha>`.
- [ ] Verificar este expediente y los contratos del Hero, beneficios, Servicios, Historial; comparar commit inmutable del hero y último laboratorio.
- [ ] Revisar `AGENTS.md`, política de limpieza, regulaciones de backend, criterios de error financiero y rutas únicas actuales.
- [ ] Mantener el sitio productivo intacto mientras se trabaja; usar preview autenticado de rama para pruebas, no el laboratorio ficticio como fuente de verdad.

### Fase 1 · Reutilizar las funciones originales
- [ ] Mantener **`ayuda.html`** como pantalla oficial y `#view-dashboard` como raíz, **`01e-client-dashboard.js`** como propietario de la experiencia y `02-client-supabase-layer.js` como fuente de datos.
- [ ] Mapear **cada CTA del laboratorio → handler oficial**, incluyendo foco, soporte, ver credencial, PIN, copia, cancelación, condiciones de beneficios, navegación y avisos. No se permite un CTA ilustrativo sin implementación real en producción.
- [ ] Conservar los estados del hero y el saludo del contrato congelado; usar datos reales del servidor y todos los estados de falla/revisión/prórroga/sin servicios/dos fechas.
- [ ] Migrar el aspecto de Lealtad/Referidos/Misiones, manteniendo la lógica oficial de recompensas. Asegurar que las barras progresan desde datos, no fixtures.
- [ ] Validar la fuente/semántica de **Ahorro**; ocultar importe o usar un estado no monetario aprobado si no hay método verificable. **Nunca trasladar $248 ficticios**.
- [ ] Integrar **Servicios** con sus acciones actuales, no recrear un controlador. Tomar PR #231 **como referencia**, no fusionarlo a ciegas.
- [ ] Integrar **Historial de movimientos** sustituyendo `#dash-history` **una vez**: pagos con datos oficiales + otros eventos **solo con datos históricos completos y verificados**. Sin fuente, mostrar únicamente categorías existentes y ajustar texto/filtrado sin inventar altas o renovaciones.
- [ ] Mantener funcionando el Catálogo, Soporte, Novedades V4, legales y resto de navegación oficial; nunca copiar simuladores ni `Probar situaciones` a producción.

### Fase 2 · Estado de PR #231 y reconciliación
**Comprobación del 22/nov/2026 mediante comparación `main...feature/mi-espacio-servicios-conectados-20261122`:** rama **divergente, 10 commits adelantada y 27 atrasada** respecto a `main`; solo presenta diferencias propias en `assets/js/ayuda/01e-client-dashboard.js`, `assets/css/ayuda.css` y su documentación. Esto es un **snapshot**, puede cambiar.

- [ ] **No fusionar #231 directamente.** Revisar su diff, actualizar contra el `main` vigente y traer únicamente las decisiones/estilos comprobados al PR maestro.
- [ ] Resolver conflictos de cambios posteriores de `main` antes de pruebas; retener el código oficial de cancelaciones, credenciales, notificaciones y pagos.
- [ ] Evitar duplicar estilos viejos y nuevos en cascada. Limpiar CSS obsoleto al sustituir un componente, sin afectar otras pantallas.
- [ ] Mantener el origen del diseño del laboratorio en `preview/`, sin importar a oficial dependencias de `demo-panel`, `scenario`, `gxs-demo-case`, ejemplos falsos, métricas fingidas o enlaces de prueba.

### Fase 3 · Pruebas obligatorias ANTES de fusionar el PR maestro
**Técnicas/CI disponibles en `package.json`:** `npm run verify` (incluye integridad/contrato visual, calendarios y finanzas, entre otros), `npm run test:smoke`, `npm run test:realtime` y `npm run test:modales:estandar`. Estos comandos **se documentan, no se ejecutaron en este corte**. Usar CI vigente y añadir smoke específico del feed conectado y acceso real en Safari.

- [ ] **Diseño y accesibilidad:** iPhone Safari físico 280 / 315 / 360 / 375 / 390 / 430 px y tableta 768px; zoom, VoiceOver, teclado/foco, botón 44px, texto largo, total MXN grande, scroll, reconexión, movimientos reducidos y microanimaciones. Comparar hero, compactas y ampliadas con el laboratorio de referencia; no saltos al navegar ni botón X desproporcionado.
- [ ] **Estados de hero/cuenta:** al corriente; por vencer; vencido; comprobante enviado, aceptado, rechazado, incompleto; revisión; prórroga solicitada/aprobada; cliente con 0/1/2/n servicios; sesión expirada, offline y realtime.
- [ ] **B2/híbrido:** cliente con corte 15 y nuevo servicio el 20, dos fechas independientes, cancelación de una sola plataforma, pago global y comprobante, cálculos **sin doble cobro**; cobertura y renovación diferenciadas; inconsistencias FIN-* explicadas y no forzadas.
- [ ] **Servicios:** activo, incidencia, invitación pendiente, 2 perfiles, PIN por perfil, actualización y PIN GOXION para ver contraseña **solo una vez**, nueva contraseña, cancelación solicitada/aprobada/rechazada, retención, baja efectiva (desaparece del cliente y Admin cuando servidor confirme), novedades simultáneas y priorizadas, `+N`, soporte y permisos.
- [ ] **Beneficios:** lealtad 0/parcial/completa, referidos 0/parcial/listo/reclamado, misiones 0/alguna/todas, checklist, CTA/código de invitación, condiciones bajo demanda, cadencia de animaciones y reduced-motion.
- [ ] **Ahorro:** 0–1–2–3–4+ servicios, logos y contador sin colisiones, cifras largas, fuente real verificable, ausencia de ahorro cuando no pueda calcularse.
- [ ] **Historial:** sin pagos, solo pagos, mezcla verificada, 3 visibles + expandir, filtro Todos/Pagos/Servicios, botón sin flecha ni X que cambia nombre a Pagos/Servicios, detalle de fila con flecha→X estándar; orden, periodo/fecha, moneda, de-duplicación, cancelación pendiente vs baja efectiva, conservación de movimientos tras baja.
- [ ] **Regresión fuera del feed:** alta/baja/renovación, Admin operaciones y tarjetas, Index, legales, soporte, inventario/catálogo, avisos, navegación, notificaciones, sesión y actualizaciones entre dispositivos.
- [ ] No aprobar despliegue por solo pasar syntax/DOM simulados: requieren pruebas autenticadas, datos de prueba controlados, revisión visual real y verificación de fuentes.

### Fase 4 · Publicación y reversión
- [ ] Capturar evidencia visual y funcional, checklist de aprobación y versiones del backend que se consumen. **Solicitar aceptación expresa del usuario** del release final.
- [ ] Publicar mediante **un solo PR integrado y revisado**, sin mantener dos UIs activas, estilos duplicados ni rutas financieras paralelas. No cambiar contratos/SQL/Edge solo por maquillar el feed.
- [ ] Registrar SHA antes y después, URL oficial sin parámetros de simulación y plan de rollback: revertir PR/commit(s) visuales, restaurar los consumidores originales, comprobar que datos y pagos no se mutaron.
- [ ] Ejecutar smoke post despliegue con cuenta de prueba y confirmar Safari móvil, sin errores de consola ni saldo incorrecto.
- [ ] Marcar archivos de prueba y documentación como laboratorio/histórico, no «beta» que confunda con oficial; cerrar PRs antiguos solo después de reconciliar su contenido.
- [ ] Actualizar este expediente, `AGENTS.md`, contratos de componentes y notas de continuidad con lo **realmente** publicado y lo todavía pendiente.

## 6. Lista de bloqueos explícitos / NO afirmar completado

1. **No hay integración completa publicada:** no confundir avances del laboratorio y PR #231 con una nueva `ayuda.html` oficial.
2. **Rama de Servicios divergente:** necesita reconciliación con `main` y pruebas antes de fusión.
3. **Historial mixto incompleto:** existen pagos reales, pero aún no se verificó una fuente completa de altas, renovaciones confirmadas y bajas efectivas, sus fechas y permisos.
4. **Ahorro es ilustrativo hasta confirmar modelo de cálculo:** prohibido cargar número falso al panel cliente.
5. **Novedad PIN automático de perfil** en laboratorios fue una simulación, no prueba de que exista el evento oficial correspondiente.
6. **B2 renovaciones híbridas:** el documento oficial advierte pendientes para altas/bajas durante ciclo B2 activo; no maquillar esos huecos con interfaces de ejemplo ni alterar motor.
7. **QA de Safari y estado de cuentas:** no declarar validación productiva de una nueva UI por tests estáticos o una captura del laboratorio.
8. **El usuario no pidió desplegar nada todavía.** No fusionar, actualizar `ayuda.html`, `admin.html`, `index.html`, Edge/Supabase o credenciales por el solo hecho de escribir este expediente.

## 7. Protocolo para retomar mañana / en otro chat

1. Leer **`AGENTS.md` → este expediente maestro → contrato del hero → contrato visual por componente → continuidad → contrato de historial → PR #231 y su documentación**.
2. Abrir el laboratorio vigente y confirmar su estado actual y última versión contra GitHub. **No usar una captura antigua como si fuera la versión actual.**
3. Comunicar al usuario la **diferencia entre diseño revisado, conexión pendiente y producción**. Preguntar solo por decisiones visuales realmente abiertas; no volver a pedir detalles ya establecidos.
4. Trabajar sobre **un único branch de integración a partir del último main**, con cambios de alcance estrecho y revisión de regresión en cada commit. Evitar diagnósticos largos que retrasen resultados, pero no saltarse las pruebas.
5. Ante cualquier propuesta nueva, verificar qué función original reemplaza, qué datos reales usa, si duplica información, cómo vuelve atrás y si preserva los otros componentes.
6. Si el usuario decide integrar «todo de golpe», preparar primero los cortes de migración y una batería de pruebas, y luego **hacer una entrega coherente**, no un reemplazo directo del archivo ilustrativo.

---

**Resumen de una frase para handoff:** GOXION Mi Espacio tiene hero/saludo congelados en diseño, beneficios y ahorro pulidos, Servicios con estados y funciones ilustrados, e Historial de movimientos final con filtro de cristal sin flecha y filas que usan la X compartida; **todo converge en el laboratorio `morph-v2.html`, pero la conexión oficial todavía está pendiente y debe planearse sin tocar pagos, seguridad ni eventos históricos sin fuente verificable**.
