# GOXION Admin V7 — Operativo primero

**Estado:** prototipo visual con datos ficticios, PR de diseño **en borrador**. No hay integración ni conexión al Admin real.

## Qué corrige de V6

| Crítica concreta del propietario | Implementación V7 |
|---|---|
| Títulos exageradamente grandes | Jerarquía corta de 22–28px, sin hero tipográfico ni calendario gigante |
| Tarjetas de clientes demasiado grandes | Tarjetas escaneables (~150–160px), con nombre, estado, servicios, próximo corte/vencimiento e importe, sin línea vertical ni avatar repetido |
| Gran tarjeta principal sin utilidad | Inicio con cancelaciones (2), nuevos registros (5), ingresos (12,480) y egresos (3,150) **ficticios**; los cuatro indicadores abren filtros operativos |
| Cabecera poco útil y siempre visible | Cabecera breve **no sticky**, marca oficial, «Producción Admin · Demo» y campana accesible |
| No se veía Operaciones | Operaciones es el tercer destino claramente visible en desktop y dock móvil, con filtro, lista, detalle contextual y enlace al expediente |
| Mala distribución y comportamiento de operaciones | Bandeja por pendientes, cancelaciones, pagos, registros, ingresos, egresos, soporte y actividad; abre detalle lateral en escritorio y hoja de detalle en móvil, Escape y cierre. Sin duplicar categorías con tres glifos |
| Animaciones genéricas | Estados semánticos interpolados con @property, respuesta táctil y hoja móvil, sin loops; reduce-motion respetado |

## Estructura de producto y diseño

Se mantienen **Inicio, Clientes, Operaciones y Gestión** conforme al registro `docs/ADMIN_FUNCTION_REGISTRY.md`. Gestión es un mapa limitado, sin simular controles de catálogo o pagos inexistentes en esta demo.

- **Inicio**: cuatro números breves, lista de cuatro asuntos con siguiente acción, movimientos recientes, accesos próximos. Operaciones se puede abrir desde cualquier tarjeta o asunto.
- **Clientes**: búsqueda sin acentos, filtros de atención/próximos/al corriente, fecha de prueba con un botón pequeño; las tarjetas no intentan ser el expediente.
- **Expediente**: cuatro secciones Resumen, Servicios, Beneficios y Cuenta. Google One X2 sigue representado como **un contrato con dos accesos 15 y 23 NOV**.
- **Operaciones**: selección por tipo y consulta de detalle sin aprobar, cobrar, cancelar ni escribir datos. Aprobación de cancelación **no** significa cancelación efectiva.
- **Notificaciones**: campana con 3 avisos enlazados a situaciones de la demo, marca lectura **local únicamente** y contador dinámico.
- **Estética**: fondos claros con cian/violeta marca GOXION, pasteles semánticos, componentes densos y una sola fuente de información por etiqueta. No se utiliza barra vertical de estado en fichas.
- **Accesibilidad**: input móvil de 16px, áreas clicables de al menos 40–44px, foco visible, navegación con teclado, `aria-pressed`, `aria-current`, anuncios de estado y reduced motion.

## Datos y límites

Los importes, estados, cantidades, nombres y fechas son **fixtures ficticios**. Los ingresos suman tres movimientos de muestra ($5,900 + $3,290 + $3,290 = $12,480); los egresos dos ($1,700 + $1,450 = $3,150). Son agregados de muestra, **NO** el motor financiero real ni su cálculo canónico.

No hay Supabase, auth, Edge, pagos, RPC, cancelaciones, cuentas reales ni endpoints. No se editan `admin.html`, `assets/js/admin/*`, motor B2/V1, Index, Ayuda o datos. La fuente productiva de clientes, importes, notificaciones y cancelaciones deberá conectarse solo tras autorización y análisis de los controladores existentes, con pruebas de integridad y rollback.

## QA

`scripts/admin-v7-qa.mjs` prueba 12 anchos 280–1440px × Chromium/WebKit, navegación de cuatro áreas, campana, lectura, métricas, filtros de operaciones, detalle, búsqueda, tarjetas dinámicas, X2 y ausencia de overflow. Revisar además capturas reales y Safari físico del propietario. **Los test automatizados no certifican calidad artística.**

## Estado de PR

Este PR es deliberadamente un diseño/preview. No se integra al Admin oficial sin aceptación estética y preparación de una migración funcional gradual.
