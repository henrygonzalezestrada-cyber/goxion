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
