# GOXION · Promotions Studio v2

## Estado actual

Promotions Studio es la consola administrativa de campañas que alimenta el motor real de promociones de GOXION. Ya no es sólo una maqueta de Bloque A: el formulario de Admin está alineado con el contrato vigente de Supabase y con el catálogo promocional consumido por Ayuda.

## Mecánicas soportadas

- `precio_fijo`: una plataforma por un **precio total de campaña** durante N periodos. Ejemplo: $45 × 3 = $135 normal; promoción de 3 periodos por $99.
- `porcentaje`: una plataforma con descuento porcentual aplicado en cada periodo.
- `combo`: dos o más plataformas por un **precio total de campaña** durante N periodos.
- `addon`: una plataforma disparadora permite sumar uno o más complementos con precio especial por periodo.

## Flujo de escritura

Admin no escribe tablas directamente.

`Promotions Studio`
→ `GOXION_FINANCIAL_ACTIONS.savePromotion()`
→ `acciones-financieras`
→ `promociones-admin-beta`
→ `goxion_guardar_promocion_v2()`.

La RPC guarda cabecera e items de forma atómica y aumenta `revision` cuando se edita una campaña.

## Precio multi-periodo

Para `precio_fijo` y `combo`, `precio_promocional` representa el total comercial de toda la duración, no el cargo de un solo mes. La validación compara contra `precio base × duracion_periodos`.

Al adquirir, GOXION distribuye ese total entre los periodos. Los centavos que no dividan exactamente se corrigen en el último periodo, de modo que la suma cobrada coincida exactamente con el precio anunciado.

Ejemplo: Prime Video $45 × 3 = $135. Una campaña “3 meses por $100” cobra $33.33, $33.33 y $33.34; ahorro total $35.

`porcentaje` y `addon` conservan semántica por periodo.

## Publicación y adquisición

Son controles distintos:

- `publicada=true`: permite que la campaña sea visible para el catálogo promocional cuando además está activa y dentro de vigencia.
- `adquisicion_habilitada=true`: permite que una campaña publicada pueda ofrecer contratación a clientes elegibles.
- Admin no puede enviar adquisición habilitada si la campaña no está publicada.
- Al quitar Publicada desde el Studio, el control de adquisición se desactiva y se limpia en el formulario.
- El backend vuelve a validar esta dependencia y rechaza adquisiciones abiertas sobre campañas no publicadas.

Esto permite preparar una campaña en tres estados prácticos: borrador privado, publicada sólo para mostrar, o publicada y contratable.

## Datos del dominio

1. `promociones_catalogo` guarda la campaña, audiencia, vigencia y reglas comerciales.
2. `promocion_items` guarda las plataformas y su rol dentro de la oferta.
3. `promocion_adquisiciones` congela la fotografía comercial aceptada por un cliente.
4. `promocion_adquisicion_items` congela precios efectivos y ahorro por plataforma.
5. `cliente_servicio_promociones` conserva compatibilidad con promociones heredadas.
6. `servicios.precio` permanece como precio base y no se reescribe por una campaña.

## Audiencia

`audiencia` soporta:

- todos;
- nuevos;
- actuales;
- con una plataforma;
- sin una plataforma;
- Lealtad Nivel 1 o superior;
- Lealtad Nivel 2.

Las condiciones adicionales viven en `segmentacion`.

## Compatibilidad

`acumulacion` controla la convivencia con:

- lealtad;
- Trato Justo;
- beneficios programados;
- bienvenida.

La adquisición guarda una fotografía inmutable de estas reglas para que una edición posterior de la campaña no altere contratos ya aceptados.

## Catálogo / Ayuda

`promociones-catalogo` sólo entrega campañas publicadas, activas y dentro de vigencia. Para clientes autenticados también calcula elegibilidad y devuelve adquisiciones existentes.

Ayuda consume, entre otros:

- título y descripción pública;
- badge;
- mecánica;
- precio normal y promocional;
- ahorro;
- duración;
- items incluidos;
- prioridad y destacada;
- precio anterior;
- oferta flash;
- contador;
- elegibilidad;
- adquisición habilitada.

## Protecciones comprobadas

- El precio base de `servicios` no cambia al crear una promoción.
- Guardar, pausar y eliminar pasan por el gateway financiero.
- Una campaña no publicada no puede habilitar adquisición.
- La prueba de navegador valida las cuatro mecánicas y el payload real del formulario.
- El smoke test comprueba que Admin envía `publicada=true` y `adquisicion_habilitada=true` al gateway cuando ambos controles están habilitados.
- Las pruebas reales de integración han validado precio fijo, porcentaje, combo, publicación en Ayuda y adquisición con snapshot financiero.

## Criterio de integración

Promotions Studio se considera listo para integrarse a `main` cuando:

1. `npm run verify` termina correctamente.
2. Chromium y WebKit completan el smoke test.
3. El formulario expone Publicada y Adquisición habilitada con dependencia explícita.
4. El payload usa `audiencia` correctamente.
5. La rama no modifica precios base ni crea datos persistentes de prueba.
