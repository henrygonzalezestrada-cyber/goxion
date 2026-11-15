# GOXION Motion Lab 06 · Experimento visual independiente

**Estado:** propuesta para evaluación, no aceptada ni preparada para integración. Esta no es una nueva interfaz productiva; se prueban **la experiencia de clientes, las renovaciones y la continuidad del movimiento**.

## Dirección artística

El material del usuario (un video que muestra un landing de NOVU LONDON generado por otra IA) demuestra aspiración a **composición editorial, movimiento fluido y acabado de producto**. No se copia ese landing: un Admin requiere información real y decisiones claras.

Se estudió nuevamente la guía oficial de Anthropic Frontend Design; Impeccable (shape, distill, animate, overdrive, critique, polish); Vercel Web Interface Guidelines; UI UX Pro Max; Taste Skill y la guía Apple Materials / Liquid Glass. Se consultaron fuentes públicas; **no se afirma haber instalado ni ejecutado sus CLI locales**.

### Diseño como sistema

- **Identidad visual:** azul-petróleo nocturno, cian, violeta GOXION, menta, durazno y rosa por estado. Bricolage Grotesque para títulos; DM Sans para controles.
- **Firma visual:** el próximo acceso tiene una fecha tipográfica que ocupa el lugar de un widget de métricas; es contenido operativo.
- **Liquid Glass:** exclusivamente para cápsula superior y navegación móvil; no cada superficie.
- **Tarjetas:** nombre, folio, servicios (X2 una sola vez), estado, corte y monto sin avatares duplicados, sin tres íconos para el mismo estado.
- **Dinámica:** fechas ficticias 14, 15, 18, 28 y 29 noviembre. La misma tarjeta cambia de fondo, texto, acento y borde sin desmontarse; selección de calendario y dock se desplazan como un elemento físico.
- **Expediente:** vista completa con cambio de elemento compartido, sin modal anidado; Google One X2 aparece como un solo contrato con dos fechas.
- **Operaciones:** exactamente una fila por asunto, cliente y próximo paso; filtros y color auxiliar sin etiquetas redundantes.

### Verificación y límites

- Prueba local: Chromium, 280, 320, 390, 430, 768, 1024, 1440 px, Inicio, Clientes, Operaciones y Servicios; sin overflow o errores JS; estado Vencido al adelantar la fecha.
- Grabación local de interacción, con fechas y apertura de expediente.
- QA alojada por GitHub Actions: pendiente de ejecución hasta que se registre la PR.
- Aún falta revisión con iPhone real, contraste y comportamiento dinámico de contenidos largos.
- **No hay datos reales**: ni Supabase, sesiones, credenciales, pagos, coberturas, cancelaciones, Edge o controladores. No editar Admin productivo, Index ni Ayuda. El estado real debe provenir de los controladores canónicos en una integración futura y explícitamente aprobada.

## Prueba
`preview/admin-v6-lab/index.html` es autocontenida salvo sus dos archivos de estilo y lógica. El logotipo se toma de la URL pública original y hay sustituto visual de cortesía si falla la carga.

## Revisión de calidad ejecutada

- La primera ejecución remota detectó overflow a 280 px y medición indebida de un control oculto; ambos se corrigieron.
- La segunda ejecución llegó a 22/24; se redujo tipografía exclusivamente para 280 px.
- La siguiente ejecución superó 24/24, pero la **revisión visual** detectó que Syne resultaba demasiado ancha para titulares y precios. La reemplazamos con Bricolage Grotesque, más proporcionada. *Ese hallazgo no habría sido capturado por las pruebas funcionales.*
- La prueba remota con Bricolage Grotesque volvió a aprobar **24/24 en Chromium y WebKit** en la ejecución 43674882541; las nuevas capturas renderizadas de Home, Clientes, Vencidos, Servicios y Operaciones fueron revisadas después del cambio.
- GitHub Pages publicó el laboratorio dentro de `preview/admin-v6-lab/` como ruta independiente. La rama y el PR continúan como demostración y borrador, sin modificar productivo.
- No se ha probado la interfaz en Safari físico del propietario y no hay conexión con estados reales. La suite general de integridad del repositorio sigue siendo un requisito independiente para cualquier integración futura.
