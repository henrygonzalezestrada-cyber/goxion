# GOXION · Referencias verificadas para próxima mejora de Admin
**Investigación:** 11 de noviembre de 2026. **Estado:** referencias, no implementación. No cambiar Admin, Index ni Ayuda durante la consolidación financiera.

## Repositorios populares estudiados
Las estrellas son cifras aproximadas consultadas directamente en GitHub el 11/nov/2026; cambian con el tiempo.

| Proyecto | Estrellas aprox. | Stack / licencia | Qué estudiar para GOXION |
| --- | ---: | --- | --- |
| [AdminLTE](https://github.com/ColorlibHQ/AdminLTE) | 45 689 | Bootstrap 5, MIT | Navegación lateral organizada, tablas densas, panel de operación y pruebas responsive/accesibilidad; UI HTML adaptable sin instalar React. |
| [Tabler](https://github.com/tabler/tabler) | 42 047 | Bootstrap 5, MIT | Componentes compactos, tarjetas y jerarquía de métricas, variantes light/dark, responsive y iconografía clara. |
| [react-admin](https://github.com/marmelab/react-admin) | 26 990 | React/Material UI, MIT | Separar proveedor de datos, autorización, listados, formularios y filtros de la presentación; útil como patrón arquitectónico, **no** requiere migrar el proyecto a React. |
| [shadcn-admin](https://github.com/satnaing/shadcn-admin) | 16 665 | React/Vite, MIT | Composición limpia, accesibilidad, estados, sidebar, diseño responsive, manejo de componentes y consistencia del sistema visual. |
| [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | 7 257 | Next.js/shadcn/ui, MIT | Tablas funcionales con búsqueda, filtro, paginación, formularios con validación y navegación guiada por permisos. **No** adoptar necesariamente su stack. |

Fuentes: README y metadatos de los cinco repositorios de GitHub anteriores. No se han copiado componentes ni dependencias.

## Ideas recomendadas para la futura propuesta de Admin

1. **Jerarquía operativa:** resumen financiero fiable arriba; vencimientos, acciones que requieren aprobación y estados de clientes claramente diferenciados. Ningún dato de deuda se calcula en JavaScript; procede del motor financiero único.
2. **Listados inteligentes:** búsqueda, filtros por activo/cancelado/en revisión/pagado, ordenamiento estable, continuidad de contexto y distinción visual de los históricos. Revisar el patrón de Tabler y AdminLTE sin copiar su estructura completa.
3. **Detalles progresivos:** mostrar primero datos necesarios, expandir auditoría, historial y acciones avanzadas solo al solicitarlas; no saturar tarjetas.
4. **Estados fiables:** obligaciones pagadas y pendientes con fecha y origen explícitos; los importes de B2 deben corresponder a su cargo y no a una mensualidad heredada.
5. **Accesibilidad y QA:** controles nativos, semántica, confirmaciones en operaciones financieras, teclado, contraste y prueba iOS/Capacidades de toque.
6. **Datos separados de vista:** seguir el patrón Data Provider de react-admin, sin convertir GOXION en una app React. El backend entrega un único contrato de clientes, cobros, servicios y permisos, y Admin solo lo presenta.

## Restricciones de GOXION que prevalecen sobre estas referencias
- Leer antes: `AGENTS.md`, `docs/GOXION_VISUAL_CONTRACT.md` y `docs/ADMIN_FUNCTION_REGISTRY.md`.
- Conservar **Rajdhani en Admin**, su identidad operativa, navegación y ficha aprobada. No hacer una cuarta reorganización.
- Index tiene identidad visual y animaciones aprobadas por separado; **no tocarlas** por inspiración externa.
- No agregar frameworks al proyecto por moda; evaluar peso, mantenibilidad y compatibilidad con HTML/JS existente.
- No copiar bloques CSS, logos ni pantallas de terceros sin revisar licencias y atribuciones de dependencias.
- El futuro rediseño solo comenzará después de la verificación del motor financiero en QA/producción, en un PR diferente.

## Proceso para retomar este tema en otro chat

1. Abrir GitHub `goxion` y este documento, y el contrato visual.
2. Auditar visual y funcionalmente el **Admin realmente desplegado**, incluidos errores en cliente B2 y cancelaciones.
3. Preparar propuestas concretas con capturas de referencia **propias**, no copiar repositorios.
4. Acordar alcance `qué cambia / qué queda intacto` y pruebas de regresión.
5. Implementar un módulo de Admin por vez en rama separada, probando 280/320/360/375/390/430/768 px y Safari iOS físico, antes de publicar.

**No se realizó ninguna modificación visual al elaborar esta investigación.**
