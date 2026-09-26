# GOXION · Promotions Studio v2

## Bloque A · P1 + P2

Promotions Studio convierte el módulo previo de “precio especial por plataforma” en un motor comercial universal sin modificar el precio base de `servicios`.

## Mecánicas

- `precio_fijo`: una plataforma con precio temporal durante N periodos.
- `porcentaje`: una plataforma con descuento porcentual; el backend congela el precio promocional calculado al guardar la campaña.
- `combo`: dos o más plataformas por un precio conjunto.
- `addon`: una plataforma disparadora permite añadir uno o más complementos por un precio adicional.

## Separación del dominio

1. `promociones_catalogo` representa la campaña y su configuración comercial.
2. `promocion_items` representa las plataformas que componen la oferta y el rol de cada una.
3. `cliente_servicio_promociones` sigue siendo la capa histórica actual de asignación; el Bloque B/P3 evolucionará la adquisición para congelar todas las condiciones de la oferta aceptada.
4. `promocion_aplicaciones` registra consumo por periodo.
5. `servicios.precio` nunca se modifica por una promoción.

## Seguro de adquisición

La columna `adquisicion_habilitada` permanece en `false` durante P1/P2.

El trigger heredado `goxion_asignar_promocion_on_servicio()` ahora sólo puede autoasignar cuando se cumplen simultáneamente:

- mecánica `precio_fijo`;
- `publicada=true`;
- `adquisicion_habilitada=true`;
- `activa=true`;
- campaña dentro de su ventana;
- precio promocional menor al monto del servicio.

La Edge Function de Promotions Studio fuerza `adquisicion_habilitada=false` al guardar. El Bloque B/P3 será el único responsable de habilitar adquisición después de implementar su contrato inmutable.

## Metadata preparada para Ayuda / Mi Espacio

- `titulo_publico`
- `descripcion_publica`
- `badge`
- `mostrar_precio_anterior`
- `oferta_flash`
- `mostrar_contador`
- `destacada`
- `notificar_cliente`
- `publicada`
- `prioridad`

Esto no define todavía el diseño final de Ayuda. Sólo establece una fuente comercial que la futura UI consumirá.

## Audiencia

`audiencia` soporta:

- todos;
- nuevos;
- actuales;
- con una plataforma;
- sin una plataforma;
- Lealtad Nivel 1 o superior;
- Lealtad Nivel 2.

Las condiciones extensibles se guardan en `segmentacion`.

## Compatibilidad / stacking

`acumulacion` permite configurar compatibilidad futura con:

- lealtad;
- Trato Justo;
- beneficios programados;
- bienvenida.

P1/P2 persiste esta intención. P3 deberá convertirla en reglas ejecutables del contrato adquirido y del motor financiero.

## Escrituras

Admin no escribe tablas directamente.

`GOXION_FINANCIAL_ACTIONS.savePromotion()`
→ `acciones-financieras`
→ `promociones-admin-beta`
→ `goxion_guardar_promocion_v2()`.

La RPC guarda cabecera e items de forma atómica y aumenta `revision` cuando se edita una campaña.

## Promotions Studio en Admin

El panel incorpora:

- resumen de campañas;
- búsqueda y filtros;
- constructor adaptable por mecánica;
- selector múltiple para combos;
- disparador + complementos para add-ons;
- vigencia independiente de duración;
- segmentación;
- configuración de stacking;
- metadata futura de publicación/notificación;
- duplicado, pausa y eliminación segura;
- preview lógico administrativo.

La preview de Admin no es el diseño final del cliente.

## Estado al cierre de Bloque A

P1/P2 debe considerarse listo únicamente cuando:

- esquema y Edge Function estén verificados;
- las cuatro mecánicas puedan guardarse;
- el Studio pase integridad/smoke test;
- ninguna campaña pueda autoasignarse;
- Ayuda permanezca sin cambios.

El siguiente bloque funcional es P3: adquisición promocional inmutable y ejecución económica de combos/add-ons/stacking.
