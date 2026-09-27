# GOXION · Ayuda · Promociones C1

## Objetivo

C1 convierte Catálogo en una experiencia de descubrimiento sin mezclar la lógica comercial con la interfaz.

Orden visual:

1. **Promociones protagonistas**
2. **Lo que más conviene**
3. **Descubre más**
4. **Buscador + catálogo completo**

## Deck protagonista

Ayuda muestra hasta tres campañas, ordenadas por:

1. `destacada=true`;
2. `prioridad`;
3. orden entregado por el backend.

El deck usa tres planos:

- frente;
- medio;
- fondo.

La transición automática es lenta y puede controlarse manualmente. El usuario también puede hacer swipe horizontal. Con `prefers-reduced-motion` no se activa la rotación automática.

La tarjeta frontal puede abrir una vista expandida con:

- tipo de promoción;
- título y descripción;
- precio promocional;
- precio normal tachado cuando aplica;
- ahorro;
- duración;
- plataformas incluidas;
- estado de elegibilidad/adquisición.

C1 **no ejecuta una contratación**. La adquisición real se conectará cuando se cierre la experiencia visual.

## Fuente de datos

Edge Function: `promociones-catalogo`.

Sólo devuelve campañas:

- publicadas;
- activas;
- dentro de vigencia;
- con plataformas válidas.

Sin sesión:
- sólo información comercial pública;
- elegibilidad se marca como pendiente de sesión.

Con sesión:
- valida el token GOXION actual;
- ejecuta `goxion_promocion_elegibilidad()`;
- adjunta una adquisición existente cuando corresponde.

## Preview visual

Mientras no existan campañas reales publicadas, la beta puede abrirse con:

`?promoPreview=1`

Ese parámetro genera tres tarjetas demostrativas **sólo en frontend** usando servicios actuales:

- precio temporal;
- combo;
- porcentaje.

No escribe Supabase, no crea promociones y no crea adquisiciones.

## Curaduría

### Populares
Prioriza:

- etiquetas tipo Popular/Top/Favorito;
- recomendaciones actuales de catálogo;
- score de recomendación ya existente.

### Mayor ahorro
Prioriza:

- plataformas que participan en campañas con ahorro;
- etiquetas Promo/Ahorro/Oferta/Descuento.

### Descubre más
Selecciona servicios disponibles que no ocuparon los primeros lugares, con intención de dar exposición sin describirlos como “menos vendidos”.

## Catálogo completo

La cuadrícula existente se conserva.

Las tarjetas actuales, selector de planes, disponibilidad, carrito y morphing no se reimplementan.

Las tarjetas pequeñas de curaduría llevan al usuario a la tarjeta real del catálogo y usan el morph ya aprobado.

## Invariantes

- no modificar el motor financiero;
- no duplicar el catálogo existente;
- no hardcodear campañas reales;
- no ejecutar P3 desde C1;
- ocultar el bloque protagonista cuando no hay campañas;
- si el usuario busca, ocultar temporalmente promociones/curaduría para priorizar resultados;
- conservar accesibilidad, swipe vertical de la página y reduced motion.
