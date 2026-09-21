# GOXION modern-v2 · Estado de modernización

## Completado

- Rama nueva creada directamente desde `main`.
- Baseline visual 1:1 comprobado.
- CSS inline extraído sin modificar reglas.
- JavaScript inline extraído en módulos manteniendo orden.
- Ayuda: 14 controladores separados.
- Index: 3 controladores separados.
- Admin: 29 controladores separados.
- Núcleo común de Supabase/endpoints/tokens.
- Configuración comercial centralizada.
- Contratos de dominio para editor.
- Datos de soporte separados de lógica.
- Motor Motion 13.4 con fallback WAAPI.
- Mi Espacio: geometría de morph delegada a Motion.
- Soporte: FLIP y altura delegados a Motion.
- Navegación oficial preservada en CSS puro.
- CI de paridad visual/estructural.
- CI evita reintroducir URLs/token hardcodeados.
- Preview estático aislado de producción.

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

- CI queda verde;
- Railway sirve los tres HTML;
- no existen errores de sintaxis;
- no existen endpoints duplicados fuera del core;
- el preview conserva paridad visual;
- las acciones reales se validan sólo con cliente de prueba;
- `main` permanece intacta.
