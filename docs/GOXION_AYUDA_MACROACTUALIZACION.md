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


## Catálogo · diagnóstico del video público/privado (24 nov, 14:53)
El usuario muestra carrusel de promociones con 2 campañas al iniciar sesión y 3 sin sesión, apertura morph de ofertas, curaduría Popular/Mayor ahorro, buscador/filtros, tarjetas de plataforma y carrito. Preservar arte/gradientes promocionales, distribución interna, logos, precios, duración, disponibilidad y morph de apertura/cierre. No neutralizar las promociones. 
- Hallazgo en `15-promotions-catalog-c1.js`: `selectedPromotions()` limita a 3; con exactamente 2 tarjetas, previous y next son el mismo índice y gana is-left. 0 oculta bloque y 1 ya deshabilita auto/controles. El servidor entrega elegibilidad y adquisición; el botón ya bloquea adquisición activa, agotada o no elegible. El video no prueba por sí solo por qué desaparece una campaña del resultado autenticado.
- Propuesta pendiente de aprobación visual: distinguir visibilidad y contratación. Priorizar ofertas elegibles; si el servidor devuelve promoción vigente adquirida, mostrar estado «Ya la tienes» sin recontratación; no reutilizar oferta de un solo uso consumida (ocultar o mostrar estado no elegible según motivo confirmado). No recuperar ofertas ausentes fabricando datos ni cambiar reglas de elegibilidad. 0: quitar sección sin hueco; 1: centrada sin contador, auto ni controles; 2: composición intencional, una vecina que cambia de lado según dirección, sin duplicarla; 3+: deck original de tres planos y resto fuera de vista, indicadores y navegación según total real, soportar cuarta oferta sin recorte fijo. Probar actualización de sesión y cambios de elegibilidad sin saltos ni índice obsoleto.
- Otros refinamientos candidatos: reducir rótulos duplicados de curaduría/listado; armonizar cápsulas de filtros, X y controles de cantidad, cristal de lista/carrito, quitar halo/bordes ornamentales fuera de promociones. Conservar distribución de planes y datos comerciales, carrito único y acciones reales. No intervenir el feed aprobado.
- En este diagnóstico no se cambió código ni se hizo una nueva interfaz. El orden recomendado es resolver deck/eligibilidad visual, después tarjetas comunes y carrito, validación y limpieza.


## Catálogo · comparación A/B/C sobre el candidato (24 nov 2026)
Usuario solicita comparar tres tratamientos promocionales sin acumular cambios; base común para aislar la decisión. Implementación: un único stylesheet `preview/mi-espacio-v2/catalog-refinement.css` y un único controlador existente `assets/js/ayuda/15-promotions-catalog-c1.js`, opt-in mediante `data-gx-catalog-v3` exclusivamente en candidato y aceptación. `?promo=a` (por defecto) pulido conservador; `?promo=b` cristal cromático profundo; `?promo=c` editorial y luz localizada; `?promo=base` restaura tratamiento promocional anterior manteniendo base común. Carga completa del mismo URL cambia una variante excluyente, sin almacenar preferencia ni superponer estilos. No hay nuevas páginas/prototipos ni datos ficticios. Al elegir, conservar sólo la variante aprobada, retirar selector y CSS descartado; base y adaptabilidad comunes permanecen.
- Base: cristal neutro en lista, filtros/planes cápsula, X y cantidades, carrito flotante y ampliado sin halo antiguo; rótulos redundantes ocultos. Mantener posiciones, selección, morph, estructura y datos comerciales. Variantes cambian paleta/luz/badge/título sin reconstruir composición ni animaciones.
- Deck: 0 oculta sección; 1 sin controles/contador; 2 una vecina a lado de dirección; 3+ tres planos visibles y todas las campañas reales navegables, sin corte fijo a tres. Prioriza contratables, conserva estado de oferta adquirida/no elegible devuelto por servidor y bloquea contratación; no inventar campañas omitidas por backend. Rechaza respuesta de sesión anterior y conserva identidad de tarjeta en refresh/morph. No cambia reglas de adquisición ni carrito.
- Pruebas puras del controlador: 62 comprobaciones de posición (0,1,2,3,4,7; direcciones y rama oficial), elegibilidad y sintaxis OK. No son prueba Safari. La aceptación aislada no tiene `promociones-catalogo` en allowlist/endpoint previamente verificado; no fabricar ofertas ni cambiar guard/backend para comparar. Comparar con catálogo real en espejo, sin confirmar compras; verificar disponibilidad de Pages y visualmente iPhone. Oficial no opta por V3; Admin e Index intactos.
- Pendiente: elegir A/B/C y validar base común en móvil; limpiar variantes descartadas, luego Goxy. Mantener pendientes de certificación autenticada de lanzamiento.
