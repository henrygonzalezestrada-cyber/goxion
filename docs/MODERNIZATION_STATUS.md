# GOXION modern-v2 · Estado de modernización

## Completado

- Rama nueva creada directamente desde `main`.
- Baseline visual 1:1 comprobado.
- CSS inline extraído sin modificar reglas.
- JavaScript inline extraído en módulos manteniendo orden.
- Ayuda: controladores separados y antiguo `01-01-inline.js` segmentado en 7 módulos por responsabilidad.
- Index: 3 controladores separados.
- Admin: 29 controladores separados.
- Núcleo común de Supabase/endpoints/tokens.
- Configuración comercial centralizada.
- Contratos de dominio para editor.
- Datos de soporte separados de lógica.
- Motor Motion 13.4 conservado como infraestructura, sin intervenir en los morphs aprobados de Mi Espacio/Soporte.
- Mi Espacio: morph cápsula ↔ tarjeta preservado con WAAPI nativo por compatibilidad Safari/WebKit.
- Soporte: FLIP y altura restaurados a WAAPI nativo para conservar la cadencia oficial en Safari/WebKit.
- Navegación oficial preservada en CSS puro.
- Gamificación: el check `✅` evita únicamente el shared-element flight en Safari para eliminar el duplicado/ghost; trofeo y demás watermarks conservan su morph.
- CI de paridad visual/estructural.
- Smoke funcional automático en Chromium y WebKit: splash, navegación, Mi Espacio, registro y secciones principales de Admin.
- CI evita reintroducir URLs/token hardcodeados.
- Preview estático aislado de producción.
- El bloque de compatibilidad de Ayuda ya no concentra las 3,964 líneas: estado, registro, recompensas, sesión, dashboard, catálogo y soporte están desacoplados.

## Deliberadamente no cambiado

- DOM visible de las tres páginas.
- CSS aprobado.
- glass/blur/opacidades.
- navegación morphing.
- fondo WebGL/wave.
- geometría visual de tarjetas.
- catálogo dinámico.
- reglas de negocio Supabase.
- Admin operativo.

## Criterio de cierre

La modernización se considera técnicamente estable cuando:

- CI estructural y smoke Chromium/WebKit quedan verdes;
- Railway sirve los tres HTML;
- no existen errores de sintaxis;
- no existen endpoints duplicados fuera del core;
- el preview conserva paridad visual;
- las acciones reales se validan sólo con cliente de prueba;
- `main` permanece intacta.
