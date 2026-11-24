# GOXION · Ayuda — estado vigente y macroactualización
**24/nov/2026. Fuente de continuidad canónica para Ayuda.** Sustituye los estados e indicaciones antiguas de trabajar en laboratorio; conserva los contratos técnicos y el manual de diseño.

## Inventario vigente
| Estado | Ruta o referencia | Uso |
|---|---|---|
| Oficial actual | `ayuda.html` | No sustituir hasta autorización y cierre de lanzamiento |
| Candidato único | `ayuda-espejo-feed-v2.html` | Base funcional para Catálogo, Goxy y Soporte; Mi Espacio aprobado visualmente |
| Aceptación aislada | `ayuda-aceptacion-v2.html` | Mismos assets de candidato; guard, sesión y datos aislados |
| Histórico oficial | rama `historico-oficial-mi-espacio-20261124` | Restauración/consulta, no publicar como segunda oficial |
| Histórico candidato aprobado | rama `historico-feed-mi-espacio-aprobado-20261124`, commit `d69de74fd09255cb8f2260cd916ba036db9d3c75` | Punto de restauración antes de Catálogo |
| Históricos retirados | `preview/mi-espacio-v2/index.html`, `espejo.html` | Solo aviso/enlace a candidato, sin login, iframe, CSS/JS propios ni acciones |
| Históricos de referencia | `preview/experiencia-mi-espacio-inteligente/`, `preview/mi-espacio-espejo/`, `preview/gixys-mi-espacio-espejo/` | No continuar diseño allí; conservar por referencias y pruebas existentes, nunca fuente vigente |

Retirados del árbol activo: `preview/mi-espacio-v2/v2-app.js`, `v2-notifications.js`, `v2-official-bridge.js`, `v2.css`, `v2-notifications.css`. Recuperables desde respaldo histórico. Los buscadores de referencias no mostraron consumidores activos ajenos a las dos rutas retiradas. Se conserva `v2-data.js` y todos los `official-feed-*`, PulsoIcon, host de compatibilidad, notificaciones originales y controladores compartidos: tienen consumidores reales. No confundir el DOM oculto de compatibilidad con un prototipo abandonado. No eliminarlo hasta migrar y verificar individualmente cada handler que lo consume. Nombres de rutas/archivos activos se normalizarán en la promoción final, no antes, para evitar romper referencias o crear copias intermedias.

## Estado de verificación
35 contratos de presentación aprobados; animaciones confirmadas por usuario en iPhone; evidencia de persistencia y RPC reversible registrada en [aceptación aislada](GOXION_MI_ESPACIO_V2_ACEPTACION_AISLADA_2026-11-23.md). Conexiones de credenciales, comprobantes y compensación examinadas; todavía falta certificación autenticada de extremo a extremo de esos tres recorridos. No declarar lanzamiento certificado. Historial sin fuente independiente de renovaciones; no inventarlas. No tocar datos, Edge, Admin ni Index para esta macroactualización visual.

## Orden autorizado y metodología
1. Congelar feed aprobado y retirar duplicados sin consumidores: hecho.
2. Catálogo en el mismo espejo y aceptación: revisar HTML/CSS/JS actuales; preservar filtros, recomendaciones, stock, precios/planes, promociones, selección, carrito y pedido. Estilos acotados a Catálogo y su carrito, sin tocar layout de Mi Espacio. Conservar handlers e IDs, no crear segundo carrito. Validar estados público/privado y flujos afectados; no enviar pedidos reales desde QA.
3. Goxy: adaptar visualmente, conservar mascotita, conversación, consultas, contexto, escalamiento, rutas y estados.
4. Soporte y elementos compartidos: armonizar solo diferencias comprobadas.
5. Validación final focalizada, incluida aceptación funcional pendiente.
6. Limpiar residuos de los módulos, verificar respaldo oficial al momento del corte y promover el candidato exacto a ayuda.html solo tras autorización.

Leer [manual de diseño](GOXION_DESIGN_SYSTEM.md) antes de intervenir. Ningún laboratorio nuevo; ambos HTML consumen los mismos nuevos assets visuales. Cerrar y limpiar cada módulo antes de pasar al siguiente. No cambiar Admin ni Index. No rediseñar feed aprobado. No usar texto de prueba ni iconos decorativos repetidos. La armonización no exige homogeneizar todos los componentes.
