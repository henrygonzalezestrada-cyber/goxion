# GOXION Admin V7.3 — Experimento cromático 60 / 30 / 10

**Vista de prueba, no productiva.** Conserva las cuatro áreas, notificaciones, tarjetas compactas, filtros, operaciones, expediente X2 y simulación de la V7.2. No cambia datos reales.

## Problema detectado en la captura aportada (Safari en iPhone)
- El **rectángulo azul exterior** que rodea encabezado, filtros y bandeja de Operaciones no es parte del diseño. El código daba foco programático a `<main tabindex="-1">` tras navegar, y Safari dibujaba el contorno nativo del nodo enfocado. `#main:focus,#main:focus-visible{outline:none}` elimina solo ese contorno de layout; **el foco visible de botones, enlaces y campos se conserva**.
- Las líneas horizontales dentro de la bandeja procedían de `.ops-item{border-bottom:1px ...}`. Se eliminaron en esta variante; filas diferenciadas por alineación, aire, hover y contenido.
- Los ocho filtros en la captura estaban encapsulados en una cuadrícula de 2 × 4 con cajas grandes. En la variante se transformaron en **una sola fila desplazable horizontalmente**, sin cajas repetidas y con subrayado del filtro activo. El render centra el filtro al entrar desde un indicador de Inicio.

## Paleta de marca
Fuente: `docs/GOXION_VISUAL_CONTRACT.md`: Admin `#030305` negro, `#00f2fe` cian y `#bc13fe` morado/magenta. Se eligió un ajuste de los mismos tonos para contraste sobre superficies oscuras:
- **~60% base**: grafito cercano a negro `#080a12`, navegación `#070b15` y espacio negativo para lectura.
- **~30% superficies**: azul medianoche `#141d2d`, `#172438` para paneles, tarjetas y listas. No es un segundo encabezado ni una portada decorativa.
- **~10% acentos**: magenta oficial `#bc13fe`, cian oficial `#00f2fe`, derivados más suaves para estados activos y CTA. No inundar cada tarjeta con neón.

**Nota:** 60/30/10 es una guía de predominio visual, no una medición automática exacta en píxeles. No se fuerza el color semántico de cancelaciones, pagos, vencidos o revisiones a ser igual al color de marca; de lo contrario se pierde información.

## Límites
- Prueba de diseño separada en `preview/admin-v73/`, sin tocar la V7.2 ni `admin.html`, Index, Ayuda, Supabase, Edge, motor financiero o cancelaciones.
- Los avisos, cantidades, usuarios, fechas e ingresos siguen siendo datos ficticios. El botón de seguimiento no ejecuta cancelaciones, aprobaciones ni cobros.
- Pruebas automatizadas: 12 anchos (280–1440 px) × Chromium + WebKit, 24 escenarios. Deben comprobar contorno del main, distribución de filtros, separación de filas, estado activo visible, números vinculados a datos, notificaciones, X2 y ausencia de overflow.
- Revisar capturas y Safari físico antes de aceptar los detalles visuales.
