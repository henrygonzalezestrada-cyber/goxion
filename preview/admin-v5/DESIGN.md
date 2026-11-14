# GOXION Nexo · Rediseño Admin V5 (estudio visual)

**Estado:** concepto interactivo en revisión, no aprobado ni integrado.
**Base:** dos videos de referencia que el propietario compartió: *Dashboard V22* y *Dashboard V28* de Code XR.

## Lo que se toma de cada referencia

- **V22:** superficies verde bosque, capas claras traslúcidas, menta y durazno; variedad proporcional entre módulos; transición cuidada entre estados.
- **V28:** menú lateral cromáticamente reconocible, área de trabajo blanca, indicadores y gráficas compactas; lectura de datos y navegación en varios módulos.
- **NO** se copian pantallas ni gráficas arbitrarias, ni se reconstruye como una aplicación de escritorio metida dentro del iPhone.

## Intención artística

**GOXION Nexo: un escritorio con profundidad y carácter**, donde la sensación de movimiento viene de interacciones y el contraste entre materiales está ligado al flujo de trabajo.

- Base bosque verde / superficies mint translúcidas / durazno y lavanda para estados semánticos.
- Identidad oficial reutilizada desde `../../Logo%20individual.png`, sin reinterpretar el logotipo.
- Tipografía Bricolage Grotesque para jerarquía y Manrope para la interfaz.
- Retícula desktop 12 columnas, distribución asimétrica e iPhone con paneles apilados y navegación inferior semiflotante.
- Home: cola de 3 asuntos abierta, agenda de 4 accesos, dos accesos a categorías y gráfico ilustrativo por fecha.
- Clientes: fichas compactas con estado, servicio comercial, cantidad de accesos, fecha y monto de muestra.
- Expediente: integrado en Clientes, con Resumen, Servicios, Beneficios, Cuenta.
- B2 X2: un solo Google One con dos accesos fechados 15/23 NOV; no se divide el contrato ni se crean fechas financieras.
- Operaciones: filtros y enlace al expediente; la cancelación aprobada se distingue expresamente de una baja efectiva.
- Gestión: módulos informativos sin botones falsos.

## Movimiento y accesibilidad

- Progresión entre rutas basada en View Transitions API cuando está soportada y cambio directo cuando no.
- Microinteracciones de hover, tap y llenado de barras; ninguna animación de ornamento permanente.
- Fallback `prefers-reduced-motion`.
- Controles nativos, foco visible, escape para volver desde expediente, estados de filtros con `aria-pressed`.
- Validación en 280/320/360/375/390/430/600/760/761/900/1120/1440, en Chromium y WebKit, con capturas después de que finalizan las animaciones.

## Aislamiento

Todo es de **datos ficticios**. El prototipo no llama a Supabase, no importa funciones del producto, no obtiene secretos, no ejecuta pagos/cancelaciones/coberturas.
Los archivos `admin.html`, Index, Ayuda, controladores B2, V1, Edge y datos siguen intactos.

## Principios de skills aplicados

- Frontend Design de Anthropic: dirección específica, composición no genérica, personalidad en tipografía, jerarquía, color y trabajo real.
- Impeccable: crítica de composición, jerarquía, densidad, motion y pulido responsivo.
- UI UX Pro Max: sistema de diseño, controles semánticos, objetivos táctiles y breaks mobile-first.
- Vercel: controles reales, estados/foco/teclado, a11y, reducción de movimiento.
- Taste: calibración consciente de varianza, densidad y movimiento.

**Aplicación manual** de sus reglas y verificación mediante QA propia; no se afirma haber ejecutado las CLI originales.

## Decisión pendiente

Esta variante no debe reemplazar al Admin sin aprobación visual en iPhone, auditoría de integridad, mapa de controladores existentes, PRs de integración gradual y rollback.


## V5.1 — pulido aprobado de la dirección visual (14/nov/2026)

Se conserva la identidad V22/V28 adoptada en V5. Se refina la experiencia; no se reescribe el producto.

### Header
- Se sustituye la franja superior por una cápsula flotante semitransparente estilo Liquid Glass, con blur, borde y reflejos cuidados.
- Logo oficial + texto **Producción Admin**, acompañado de **Vista demo** para distinguir esta simulación del Admin real.
- La cápsula reacciona discretamente al desplazamiento y se mantiene dentro del ancho de 280 px.

### Tarjetas — foco operativo
- Resumen visible: nombre, folio, estado, servicios (incluido multiplicador X2), próxima fecha, aviso temporal e importe.
- Los estados tienen códigos semánticos: vencido = rosa cálido; por vencer = durazno; en revisión = lavanda; al corriente = menta. Texto y contraste se modifican junto al color.
- Altura compactada. Las fichas no intentan ser el expediente entero.
- **Simulador de prueba sin backend:** el control Cambiar fecha recorre 14, 15, 18, 28 y 29 de noviembre de 2026. El estado de GX-1042 cambia de Por vencer a Vence hoy y luego Vencido. Un anuncio accesible indica el resultado.
- **No es tiempo real de producción**: al integrar deberá obtener estados, fechas y montos del motor canónico GOXION, nunca de cálculos paralelos implementados por esta demo.

### Expediente
- Cabecera condensada, estado visible y pestañas Resumen, Servicios, Beneficios y Cuenta.
- Resumen de tres datos clave más estado/servicios y enlace directo a accesos, con distribución adaptativa para reducir scroll.
- B2 X2 conserva un servicio comercial único, con dos accesos y fechas distintas; sin controladores financieros nuevos.

### Microinteracciones y QA
- View Transitions con fallback y transición de elemento compartido tarjeta-expediente; el encabezado de vidrio responde suavemente al scroll.
- Estados animados al cambiar fecha de prueba, sin loops decorativos. Preferencia de movimiento reducido respetada.
- Pruebas Chromium/WebKit 280–1440 px con revisión de cápsula, filtros, estados y desbordamientos; Safari físico pendiente.

### Aislamiento
No se editan admin.html, código real de Admin, B2, pagos, cancelaciones, Index, Ayuda, Supabase ni Edge. PR de diseño sigue en borrador; no aprobar integración sin comprobaciones reales.


## V5.2 — Depuración de experiencia a partir de auditoría de skills (14/nov/2026)

**Propósito:** recuperar la limpieza de la V5, conservar la cápsula y la familia V22/V28 y eliminar ruido agregado en V5.1. No es un rediseño de identidad nuevo.

### Matriz de revisión y acciones verificables

| Guía / principio | Problema V5.1 | Cambio V5.2 | Comprobación |
| --- | --- | --- | --- |
| Anthropic Frontend Design / personalidad específica | «Todo fluye» y decoración genérica | «Hoy en GOXION», menos adornos, color de marca como acento | Revisión manual Inicio y captura de 390px |
| Impeccable Distill / una idea por elemento | Categoría triplicada en Operaciones y gráfico que repetía fechas | Sin icono de tipo ni chip por operación; actividad en un solo título + cliente. Gráfico redundante eliminado; menos notas explicativas | QA comprueba ausencia de elementos y texto repetidos |
| Impeccable Operate / decisión visible | Filas describen la demo, no la acción | Título, cliente y siguiente paso concreto; solicitudes abre filtro contextual | QA de contenido de filas y navegación |
| UI UX Pro Max / jerarquía y densidad | Fichas y expediente con iniciales y datos repetidos | Tarjeta nombre, estado, servicios, fecha, importe; sin avatar redundante. Expediente presenta servicio del próximo acceso, no fecha duplicada | QA de elementos visibles y B2 X2 |
| Vercel Guidelines / móvil y accesibilidad | Input de 12px causaba zoom Safari; etiquetas diminutas | Input 16px, filtros táctiles >=44px, controles y filas con contraste reforzado | QA 280–1440px + computed-style input |
| Taste Skill / menos efectos genéricos | Animación de entrada sobre cada vista + ViewTransition | Eliminar doble animación, conservar continuidad cliente ↔ expediente y micro-feedback de estados | Revisión de movimiento + reduced-motion |

### Contrato de información

- Inicio contiene una sola lista de fechas de acceso; ya no duplica esas fechas en una mini gráfica.
- Operaciones muestra un único identificador semántico por asunto: **qué ocurrió**, **quién** y **qué sigue**. Los filtros aportan la categoría; el color de una barra estrecha distingue visualmente el tipo sin volver a escribirlo.
- Tarjetas muestran solo nombre, folio, estado, servicios, siguiente fecha/fecha vencida e importe. Sin segundo identificador mediante avatar de iniciales. El detalle vive en el expediente.
- El resumen del expediente no repite dos veces la misma fecha; muestra el servicio y acceso asociados a ella. La vista Servicios conserva el contrato B2 X2 con dos fechas.
- La etiqueta «Vista demo» en la cápsula comunica que todos los datos son ficticios. No se repite un descargo de responsabilidad en cada panel.

### Límite de verificación

Los tests automatizados solo cubren estructura, navegación, ajuste y ausencia de duplicación; **no prueban estética ni tiempo real**. La integración del Admin auténtico requiere leer estados de los controladores y fuentes oficiales y autorización explícita del propietario, sin motores financieros nuevos.
