# GOXION · Historial de movimientos — contrato visual y de datos

**Fecha:** 22 de noviembre de 2026. **Ámbito:** último módulo del feed «Mi Espacio».
**Estado:** propuesta de diseño en laboratorio, pendiente de evaluación visual del usuario. **Ningún cambio productivo en `ayuda.html`**, backend, pagos o servicios.

## Por qué sí tiene sentido

Se descartó la tarjeta separada «Próximos movimientos» porque repetiría lo que ya muestran Hero, Estado de cuenta, Servicios, Misiones, Lealtad, Referidos y notificaciones. **«Historial de movimientos» tiene otro propósito:** preservar una cronología consultable de **hechos registrados**; qué pasó, cuándo y cuál fue su resultado, incluso si un servicio ya no está activo. La UI de estado sigue mostrando el presente; el historial conserva el pasado.

**Propuesta de alcance:** pagos acreditados o con registro verificable; altas de servicio confirmadas; renovaciones/continuidad de cobertura **realmente confirmadas**; solicitudes de cancelación registradas y bajas efectivas, distinguiendo sus momentos. No mostrar promesas, vencimientos futuros o alertas pendientes como eventos ya consumados. Otros movimientos solo si existe contrato de evento confiable.

## Inventario de fuentes existentes y faltantes

| Categoría | Fuente real confirmada por código | Regla de integración |
| --- | --- | --- |
| Pagos | `assets/js/ayuda/02-client-supabase-layer.js` mapea `data.pagos` a `historial_pagos` con `id`, `fecha` (periodo), `fecha_pago`, `monto`, `estado`, `puntual`, `lealtad_efecto` y `racha_resultado` | Reusar el historial oficial y la lógica `gxPaymentHistoryMeta` de `01e-client-dashboard.js`. No confundir pago enviado, en revisión y acreditado. Evitar conteos y cobros duplicados. |
| Solicitudes de cancelación | `data.cancelaciones` del endpoint `cancelaciones-cliente` llega en el fetch de la capa cliente | Usar fecha de solicitud y resolución **solo cuando estén confirmadas**. Hoy el dashboard agrupa la solicitud más reciente por **servicio activo**, lo cual no garantiza conservar visibles eventos de servicios ya dados de baja. |
| Baja efectiva | El módulo de Servicios deja de mostrar el servicio una vez retirado del listado activo; contrato híbrido ordena conservar los comprobantes y el historial | Requiere marca fiable de baja efectiva/fecha y autorización para el historial; no inferirla por ausencia de servicio ni reemplazarla por la aprobación de una solicitud. |
| Alta de servicio | `data.servicios` se mapea a tarjetas por nombre, acceso, monto, etc. **No se expone fecha de alta en el objeto actual del dashboard** | Solicitar/consumir evento histórico persistido de alta (ID/timestamp/servicio). No inferir fecha a partir del primer pago. |
| Renovación | B2 dispone de datos de calendario y cobertura en lógica financiera, pero `GOXION_HIBRIDO_RENOVACIONES_V2.md` advierte **cobertura pagada ≠ próxima renovación**; no hay evento de renovación confirmado en la respuesta utilizada por el dashboard | Solo mostrarla cuando una operación de renovación tenga evidencia histórica real. **No generar renovaciones por cada pago** ni por proyección de corte, porque se duplicaría el mismo evento o se comunicaría cobertura no acreditada. |

**Contrato recomendado del evento de lectura (propuesto, NO existente):** `id` estable; `tipo` normalizado; `ocurrio_at`/fecha efectiva validada; `titulo` y resumen seguros; `servicio_id` opcional; `operacion_id` para deduplicación; `estado_final` cuando aplique; datos monetarios y `moneda` solo para eventos financieros; `fuente` trazable; acceso autenticado por la sesión del cliente. Misma transacción no produce doble elemento solo por reflejarse en varios módulos. No incluir contraseñas, PIN, correos o datos ajenos. No introducir escritor nuevo ni alterar el motor financiero.

## Prototipo visual

**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en `main`.
**Commits iniciales:** `ab9a8e9fbf3ccac0fab5d5a9288192483f9cba69` (módulo) y `73624b2f59fc86b62f6f18d908a22a0937164ae8` (alineación/foco).

- Sección «Historial de movimientos» **después de Servicios** y antes de la comparativa de Catálogo del laboratorio; reemplazaría el viejo Historial de pagos al integrar a la página real, **nunca convivirían ambos**.
- **Una sola superficie de cristal** idéntica al material aprobado `rgba(8,8,12,.371)` / blur 11.75px; filas horizontales limpias, iconografía funcional discreta y fecha bajo cada movimiento. Sin tarjetas de cristal por fila ni líneas coloreadas ornamentales; separadores neutros entre filas solo para organizar.
- **Tres entradas iniciales**; acción «Ver todos los movimientos» expande y «Mostrar menos» contrae. Filtro a demanda «Todos / Pagos / Servicios». Detalle breve dentro de la misma fila, abierto bajo demanda sin crear un modal.
- **7 operaciones ficticias** de pago, alta, renovación, solicitud de baja y baja efectiva, claramente marcadas «Ejemplo visual · Movimientos ficticios». No hay conexión a cuentas reales ni mutaciones de estado.
- Interacción accesible: botones nativos, atributo `aria-expanded`, `aria-controls`, foco preservado al expandir filas, altura táctil superior a 44px. Movimiento decorativo mínimo; respetar `prefers-reduced-motion`.

## Revisión visual contra la captura real del usuario (22/nov/2026)

**Imagen de referencia:** captura de iPhone tomada en Safari desde GitHub Pages y compartida por el usuario. El usuario valoró la idea y los controles, pero pidió comparar jerarquía, densidad, márgenes y separadores con el feed aprobado; no corregir por inercia ni aplicar reglas de Servicios de modo global.

**Veredicto:** la solución base está lograda, **no rediseñarla**. Una sola superficie de cristal para movimientos, iconografía por categoría, fecha secundaria, tres filas por defecto y detalles bajo demanda; la diferencia de carácter respecto a beneficios y ahorro es funcional. La tarjeta está visualmente sobria y cabe en el ADN del feed.

**Criterio sobre separadores:** **conservarlos**, porque en esta lista distinguen eventos repetidos y facilitan escanear cada fila. A diferencia de la línea artificial bajo el logo de Servicios, aquí son estructurales. Guías de referencia: Apple [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables); Material [Dividers](https://m1.material.io/components/dividers.html) (uso justificado y moderado); NN/g [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (opciones secundarias bajo demanda). No adoptar una prohibición de rayas universal.

**Ajustes limitados aplicados al laboratorio, commit `3d9eca2a83108364b858c10fb43f4840b405b611`:**

- Servicios → Historial: margen superior local **27px → 19px**, sin cambiar márgenes de Hero, Lealtad, Referidos, Misiones, Ahorro, Servicios o Catálogo.
- Las líneas entre filas se conservan **neutras, de 1px, alfa .07**, ahora con **inset alineado al inicio de la columna de texto** en lugar de atravesar la franja de iconos. Adaptación exacta para <=380 y <=315px. Son separadores funcionales dentro de la lista, no líneas decorativas ni un borde extra por fila.
- El control de filtro superior usa **«Filtrar»** en estado «Todos» colapsado; al expandirse dice **«Cerrar»** y solo entonces aparecen las opciones **Todos / Pagos / Servicios**. Cuando hay un filtro activo y cerrado, muestra **«Pagos» o «Servicios»**. Así no hay «Todos» repetido a la vez; `aria-expanded` y `aria-label` comunican el filtro real.
- El texto «Alta confirmada» debajo de «Microsoft 365 agregado»/«Netflix agregado» era redundante; se elimina y queda solo la fecha como dato secundario. Los otros tipos siguen incluyendo contexto útil (mes o plataforma).
- Acción de expansión: **«Ver N movimientos más»**, conteo derivado del filtro activo, en lugar de repetir el encabezado con «Ver todos los movimientos». Al expandir: «Mostrar menos». Ninguna fila perdió fecha, icono, resumen o monto.

**Invariantes revisados:** cristal neutro, iconos, contraste, tres entradas, datos ficticios, lista responsive, filtro opcional, foco y contenido accesible, X común 35/16 de las otras tarjetas. No se afectaron las acciones ni el backend ni se fusionó la rama oficial de Servicios. **Validación de sintaxis no sustituye QA visual física en Safari**.

- **Ajuste de conteo en la segunda revisión**: commit `3e48c16a3a107e080891f70caabb77403d00f4ee` conserva «Ver 1 movimiento más» en singular y «Ver N movimientos más» en plural. Validado junto con el resto de los casos de fuente ficticia.

## Consistencia de filtros y controles con Servicios — 22/nov/2026

**Solicitud y decisión:** acercar los filtros al título «Historial de movimientos» para eliminar el aire visual excesivo; asegurar que las flechas de expansión se convierten en la misma X cian de Servicios; convertir las cápsulas de filtro al material translúcido aprobado, sin añadir ornamentos. Se conservan las líneas divisorias funcionales entre movimientos.

**Aplicado en el laboratorio** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `5f78c8ed479c8ca7b926238c3853e0daa934ef78`:

- El encabezado `gxm-head` es una retícula: título a la izquierda; botón de filtro a la derecha; opciones `Todos / Pagos / Servicios` **dentro del mismo encabezado** y ancladas a su margen izquierdo en iPhone. La fila de opciones está a solo 2px del eje vertical de cabecera; `gxm-head` reduce su margen inferior a 8px. En anchuras desde 680px los tres filtros pueden compartir línea con el título, sin forzar ese acomodo en un iPhone.
- **Mismo control que Servicios (no un parecido aproximado):** se reutilizan las clases `.gxs-icon`, `.gxs-chevron`, `.gxs-x` de `gxs-services` para la flecha y X de filas y para el control que expande las opciones. En abierto, disco cian `#79e6fc` de **35px**, glifo oscuro de **16px**, área de interacción **44px**; en cerrado, una flecha discreta sin círculo cian. `aria-expanded` permanece en el botón del filtro y en cada fila, no se duplican acciones ni botones para abrir/cerrar.
- Los botones de categoría comparten `background:rgba(255,255,255,.08)`, radio de cápsula y texto sobrio con los CTA de GOXION. El seleccionado usa un tinte cian de alfa `.145`, sin bordes brillantes, sombras nuevas ni superficies anidadas. El tamaño táctil es 44px y se conserva el foco visible.
- Se preservaron cuatro scripts inline sin errores de sintaxis, balance de encabezados y secciones, filtro por categoría, textos, siete fixtures y detalles desplegables. Comparación del contenido fuera del bloque `gxm-*` con commit anterior `3e48c16a3a107e080891f70caabb77403d00f4ee`: **sin modificaciones a Hero, Lealtad, Referidos, Misiones, Ahorro, Servicios o Catálogo.**
- **Pendiente:** inspección visual del resultado exacto en Safari/iPhone, especialmente a 280–315px y al combinar un importe largo con el objetivo táctil de 44px. No se modificó `ayuda.html`, no hay datos reales en la simulación ni fusión de PR #231.

## Calidad, migración y guardas

1. Validar con el usuario el concepto visual en Safari real antes de considerar aprobación.
2. **Antes de integración productiva**, verificar las fuentes reales y los timestamps de todos los eventos (altas, renovaciones, bajas efectivas); si una categoría aún no está disponible, ocultarla sin inventar eventos o estados.
3. Reusar `historial_pagos` ya ordenado, `gxPaymentHistoryMeta`, los contratos de cancelación y el motor de ciclos oficial. **Jamás crear otro cálculo financiero en el navegador**.
4. Verificar permisos por cliente, paginación, orden, deduplicación y fecha efectiva; no presentar como 'renovación' un pago, una proyección o una cobertura vigente.
5. Probar en 280, 315, 360, 375, 390, 430 y 768px, además de Safari iPhone: textos largos, cifras MXN, sin movimientos, solo pagos, solo servicios, muchas entradas, filtros, focus/VoiceOver y reconexión.
6. Las tarjetas de Hero/saludo, Lealtad, Referidos, Misiones, Ahorro, Servicios y el Catálogo se mantienen intactas durante esta propuesta. No fusionar automáticamente PR #231 de Servicios ni cambiar `ayuda.html`.

**Decisión pendiente:** evaluar el laboratorio, confirmar si el usuario aprueba este diseño y después definir la fuente histórica de los servicios faltantes antes de la implementación oficial.
