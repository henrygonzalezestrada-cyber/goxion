# GOXION Admin V7.1 - Refinamiento visual y de movimiento

Estado: propuesta aislada, PR en borrador. NO modifica el Admin productivo.

## Se conserva la utilidad de V7
Inicio con cancelaciones, registros, ingresos, egresos y vencimientos.
Clientes: nombre, folio, servicios, estado, fecha e importe compactos.
Expediente: X2 es un servicio comercial y dos accesos con fechas distintas.
Operaciones: bandeja, filtros, detalle contextual y hoja móvil.
Gestión, navegación de cuatro destinos y campana de notificaciones.
Todos los registros, fechas, importes y avisos siguen siendo ficticios.

## Refinamiento
1. Elementos sin encapsulados redundantes: logo, campana, iconos y flechas quedan libres de bordes o fondos interiores injustificados. Las superficies de contenido y los controles con estado conservan sus agrupaciones.
2. Movimiento: un único indicador activo se desplaza en navegación móvil y escritorio. View Transitions para continuidad entre pantallas y expediente, con fallback.
3. Tarjetas vivas: simulación de fecha modifica estados y tonos sobre el mismo nodo, sin reconstruir la lista ni perder interacciones.
4. Detalle y notificaciones: entrada vinculada a la acción del usuario. Sin bucles decorativos.
5. Mantener la densidad y respetar accesibilidad, foco y preferencia de movimiento reducido.

## QA
24 escenarios por 12 tamaños x Chromium/WebKit. Comprobar la geometría, la ausencia de errores, filtros, X2, notificaciones, índice de navegación, ausencia de cajas redundantes y continuidad del nodo de tarjeta.
No equivale a validación de datos reales ni a revisión física en Safari.
No modificar admin.html, pagos, cancelaciones, Supabase, Edge, ni funciones canónicas.
