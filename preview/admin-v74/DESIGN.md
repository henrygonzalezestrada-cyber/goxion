# GOXION Admin V7.4 — Profundidad, contraste y morph

**Vista estática interactiva; no modificar ni integrar el Admin productivo.** Conserva Inicio operativo, Clientes compactos, Operaciones con filtros, campana, Gestión y contrato X2 de fechas separadas de V7.3.

## Cambios basados en dos capturas reales de iPhone (15/nov/2026)

### 1. Cabecera blanca del expediente
La clase heredada `.detail-heading` llevaba `background:#fff` de una demo clara, mientras los títulos del tema oscuro pasaron a `#f3f6ff`. Resultado: **texto casi invisible sobre un fondo blanco**. El CSS V7.4 sobrescribe específicamente `#detail-identity .detail-heading` con una superficie azul oscura elevada, nombres y folios claros, y la insignia de estado con contraste. Además, el antiguo color inline oscuro del estado se reemplazó por colores semánticos claros.

### 2. Acciones Operaciones
El detalle tenía un enlace `Abrir expediente` de ancho completo y un botón de seguimiento en otra fila con un tamaño distinto. Se sustituyeron por un único `.ops-actionbar` que muestra `Marcar revisado / Reabrir` y `Expediente` en **60/40**, mismo alto y alineados. En <=360px el secundario dice `Ficha` para no cortar texto. Si solo hay una acción, ocupa una sola columna. El texto que distingue acción demo de baja efectiva se mantiene, pero no es una segunda caja.

### 3. Material / elevación
Se consultaron las guías actuales de Material Design 3 y MDN sobre View Transitions. Se adoptan **tres niveles de elevación tonal**, combinando tonalidades de azul medianoche, bordes de luz moderados y sombras discretas, sin iconos encapsulados ni tarjetas enormes. Paneles, tarjetas de cliente, indicadores y hoja de operaciones reciben elevación proporcional; ninguna decoración en bucle. La versión anterior era demasiado homogénea entre fondo y superficie.

### 4. Acentos e identidad GOXION
Se conserva negro, cian `#00f2fe` y magenta/violeta `#bc13fe` del contrato visual. Acentos visibles en métricas de marca, encabezado, navegación seleccionada, enlaces, botones e interacción, sin convertir todos los estados financieros a magenta. El logotipo mantiene la imagen oficial; GOXION aumenta a ~22px, con `Admin · Vista demo` más pequeño.

### 5. Morph selectivo
Se pulió la transición compartida entre tarjeta y expediente usando View Transitions, con duración/easing focal. La hoja móvil de Operaciones aparece mediante `clip-path` y escala/traslación contenidas; los cambios de pestaña del expediente se animan suavemente. Feedback de seguimiento en la misma zona. Respetar `prefers-reduced-motion`. Evitar transiciones globales de página, que habían creado superposiciones en versiones anteriores.

## Contrato de QA
- 12 viewports de 280–1440px × Chromium y WebKit; además dos smoke tests con movimiento habilitado.
- Cabecera del expediente oscura legible (contraste de título/folio), separación tonal y sombras presentes.
- Dos botones en una misma fila, proporción entre 54–66% para la acción principal, sin desbordamiento de texto en 280px.
- Mantener filtros, contadores reactivos, notificaciones, estado vencido y X2 con dos fechas.
- Comprobar el morph de hoja y pestañas; accesibilidad de foco y movimiento reducido.

Todo es visual y solo afecta `preview/admin-v74/`, la QA y el workflow. No se alteran `admin.html`, Index, Ayuda, Supabase, Edge, motor B2, pagos ni cancelaciones reales. Los datos son ficticios.

## Hallazgos de revisión visual posterior a primera QA

1. **Acceso 2 de Google One todavía claro:** la regla heredada `.access:nth-child(even){background:#f3f0fd}` era más específica que el estilo oscuro `.access{background:...}`. Se corrigió con `.contract .access:nth-child(even)` en fondo azul/violeta oscuro y texto contrastante; añadido test WebKit/Chromium para detectar la regresión.
2. **Doble animación de transparencia:** el panel de Operaciones hacía morph y sus hijos también aplicaban un fade, provocando texto momentáneamente apagado. Se retiraron animaciones redundantes de sus hijos, conservando el morph del panel como una sola transición. En reduced-motion se eliminan ambos efectos.
3. **Capturas fieles:** la prueba espera a que finalicen las animaciones tras pulsar el seguimiento antes de capturar el detalle; así las capturas reflejan el estado estable, no un frame intermedio.
