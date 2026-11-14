# GOXION Turno — dirección V4

**Estado:** prototipo V4, no aprobado.  
**Modo:** Operate (administrador del sistema, uso frecuente desde iPhone).  
**Rama:** design/admin-v4-turno-experimental-20261114.  
**Sustitución visual:** no hereda V3/V3.2, no modifica Admin productivo.

## Problema, intención y diferenciador

La persona que administra GOXION necesita decidir si revisa un comprobante, hace efectiva una cancelación ya aprobada, atiende soporte y comprende fechas independientes por acceso. Los prototipos 01–V3.2 quedaron estéticamente intercambiables, con métricas repetidas, letras técnicas, brillos/órbitas y demasiada decoración. Esta dirección **deriva su forma de esos trabajos**, no de un estilo SaaS.

**Concepto:** una mesa de decisiones con una cinta de fechas. Los expedientes son **fichas de suscripción** donde nombre, servicios, próxima fecha y monto son el objeto principal. No copiar literalmente tickets de metro, instrumentos ni pantallas terminal.

**Símbolo original:** \`Logo individual.png\`; no generar o sustituir marca.

## Exploraciones descartadas antes del primer corte

- «Comando neón»: pantallas negras con un acento fluorescente y tableros numéricos → se acerca a la V3 y a un tema genérico gaming/AI.
- «Periódico de gestión»: hairlines, números 01–04, cabeceras etiquetadas → reproduce lenguaje editorial de la V3, no el trabajo.
- «Tarjetas flotantes SaaS»: misma superficie redondeada, sombra y color para cada módulo → exceso de contenedores y poca jerarquía.
- «Calendario como app aparte»: editor de fechas independiente → rompe continuidad del Admin y duplica B2.

## Tokens del mundo visual

| Rol | Valor | Por qué |
|---|---|---|
| Ink | #1D2540 | autoridad, precisión y contraste estable |
| Paper | #FFFFFF | lectura densa, nombres y datos |
| Ground | #F0F2F4 | separación de secciones sin tarjetas de fondo |
| Coral | #FF7C5D | acción prioritaria, sin semáforos falsos |
| Iris | #594ED8 | acción secundaria y vínculo con la marca |
| Mint | #C5ECDF | selección y estado tranquilo, no aleteo decorativo |

Tipografía: **Barlow Condensed** para fechas, nombres de cliente, encabezados y números de trabajo; **Instrument Sans** para texto y controles. No monospace cosmético, no all-caps repetitivo, no degradado sobre texto.

## Gramática de layout

- **Inicio:** título breve, banda de trabajo compacta con acción, a la izquierda la cola y a la derecha una cinta de fechas individuales. En móvil las dos columnas se apilan: primero lo que requiere acción, luego las fechas.
- **Clientes:** fichas como documentos operativos, cada una con nombre, servicios (Google One ×2 aparece una vez), vencimiento y total de muestra. Los estados no dependen solo de color. El enlace abre el expediente en el mismo espacio.
- **Expediente:** misma superficie; cuatro vistas, sin ventana anidada. B2 aparece como **accesos de un contrato** con fechas independientes.
- **Operaciones:** una lista de asuntos, no cuatro módulos replicados; categorías filtran, se mantiene el enlace al mismo expediente. Aprobar ≠ Hacer efectiva; aquí no existen controles de modificación productiva.
- **Gestión:** índice honesto, no botones que prometen acciones sin conectar.

## Movimiento

Un solo gesto principal: el contenido nuevo aparece con un **barrido horizontal breve** al navegar. Filtrado y cambio de ficha reciben realimentación táctil/hover; no hay animaciones autónomas, orbitas, partículas ni tarjetas hero. \`prefers-reduced-motion\` desactiva todo. No se exige movimiento para comprender estados.

## Salvaguardas

- Los datos y montos son ficticios; ninguna API, sesión o Supabase.
- B2, V1, cancelación efectiva, beneficios, Index y Ayuda no se reimplementan ni modifican.
- No declara operativos los cortes B2 aún pendientes de integración oficial.
- Un servicio comercial X2 se muestra una vez y sus accesos por separado dentro de él.
- QA en Chromium y WebKit, 280–1440 px, sin scroll horizontal y con pruebas para fecha/servicio/ficha/filtros. Safari físico y validación estética por propietario pendientes.
- El trabajo sobre \`main\` se limita, si se aprueba el procedimiento, a una **ruta de preview** dentro de \`preview/admin-v4/\`, nunca \`admin.html\`.

## Uso de skills

Se consultaron fuentes originales para esta tarea: Frontend Design (Anthropic), Impeccable (modo Operate, new-work y craft floor), UI UX Pro Max (sistema de tokens y restricciones), Web Interface Guidelines (Vercel) y Taste Skill (control de varianza, movimiento y densidad). **No se afirma haber ejecutado las CLI locales** de Impeccable o UI UX Pro Max: se aplicó su guía manualmente y el resultado pasa una QA de navegador propia. No existe una certificación automática de esas cinco herramientas.
