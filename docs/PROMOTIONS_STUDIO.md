# GOXION · Promotions Studio v2

## Estado actual

- **Bloque A · P1 + P2:** motor universal de campañas + Promotions Studio.
- **Bloque B · P3:** adquisición promocional inmutable + ejecución económica multi-plataforma + stacking.
- **Ayuda:** todavía no muestra ni permite contratar promociones; su experiencia visual sigue reservada para el bloque dedicado.

## 1. Campaña ≠ adquisición

Una campaña en `promociones_catalogo` es una plantilla comercial editable.

Cuando un cliente contrata, P3 crea un contrato separado en `promocion_adquisiciones`. Ese contrato congela:

- mecánica;
- revisión de campaña;
- nombre y título público;
- audiencia/segmentación;
- reglas de acumulación;
- plataformas;
- precios normales;
- precios efectivos;
- ahorro;
- duración;
- periodo inicial/final.

Por lo tanto, editar, pausar o eliminar lógicamente una campaña **no modifica adquisiciones existentes**.

## 2. Mecánicas

### Precio temporal
Una plataforma queda a un precio fijo durante N periodos.

### Porcentaje
Se congela el precio resultante del porcentaje al momento de la adquisición.

### Combo
Dos o más plataformas se agregan como servicios normales. P3 reparte el precio promocional proporcionalmente entre los componentes y conserva la suma exacta.

### Add-on
La plataforma disparadora conserva su precio normal. Sólo los complementos reciben el precio promocional.

## 3. Servicios siempre a precio normal

P3 nunca modifica `servicios.precio`.

Al adquirir:

1. reutiliza el `cliente_servicios` activo si ya existe;
2. reactiva uno compatible si estaba inactivo;
3. crea el servicio si no existía;
4. guarda el precio normal real como snapshot;
5. aplica la promoción como descuento financiero separado.

Cuando la promoción termina, el servicio continúa automáticamente con su monto normal porque nunca fue reescrito con el precio promocional.

## 4. Tablas P3

### `promocion_adquisiciones`
Contrato principal inmutable.

### `promocion_adquisicion_items`
Fotografía de cada plataforma y su precio normal/efectivo. Incluye `afecta_precio` para distinguir, por ejemplo, el disparador de un Add-on.

### `promocion_adquisicion_aplicaciones`
Registra cada periodo pagado que consumió una adquisición.

Las tablas heredadas `cliente_servicio_promociones` y `promocion_aplicaciones` se conservan únicamente como compatibilidad histórica. El trigger automático heredado ya no crea nuevas asignaciones.

## 5. Elegibilidad

`goxion_promocion_elegibilidad()` valida antes de adquirir:

- campaña activa;
- publicada;
- adquisición habilitada;
- vigencia;
- nuevos/actuales;
- tener/no tener una plataforma;
- Lealtad Nivel 1;
- Lealtad Nivel 2.

La adquisición vuelve a validar todo dentro de la misma operación atómica.

## 6. Idempotencia y conflictos

Cada adquisición recibe un `operation_id` único.

Repetir accidentalmente la misma operación devuelve la adquisición existente en vez de duplicarla.

Una plataforma con descuento no puede quedar ligada simultáneamente a dos adquisiciones activas que modifiquen su precio.

En Add-on, el disparador no bloquea otras promociones porque `afecta_precio=false`.

## 7. Stacking ejecutable

El snapshot `acumulacion_snapshot` ya no es metadata decorativa.

P3 hace cumplir:

- **Lealtad:** excluye del cálculo la base promocional marcada como no acumulable.
- **Trato Justo:** ignora compensaciones de plataformas promocionadas cuando la campaña lo bloquea.
- **Beneficios programados:** limita monto/porcentaje a la base elegible.
- **Bienvenida:** usa una base independiente de los demás beneficios programados.

Los servicios no promocionados siguen siendo elegibles aunque otra plataforma del cliente tenga una campaña no acumulable.

## 8. Consumo

`goxion_consumir_promociones_on_pago()` consume la adquisición cuando existe un pago con estado `pagado` para ese periodo.

Cada periodo se registra una sola vez.

Al alcanzar `periodos_totales`:

- la adquisición pasa a `finalizada`;
- sus items dejan de estar activos;
- los servicios permanecen activos a precio normal.

Cancelar una adquisición también detiene el descuento, pero no elimina los servicios.

## 9. Promotions Studio

Admin puede configurar:

- precio temporal;
- porcentaje;
- combo;
- add-on;
- duración;
- vigencia;
- audiencia;
- stacking;
- publicación;
- **Aceptar adquisiciones**.

`Publicada` y `Aceptar adquisiciones` son controles distintos.

Una campaña puede estar publicada para previsualización futura sin permitir contratación. Para abrir adquisiciones ambas condiciones deben estar activas.

## 10. Gateway financiero

Frontend:

`GOXION_FINANCIAL_ACTIONS.acquirePromotion()`

→ Edge Function `acciones-financieras`

→ elegibilidad

→ RPC `goxion_adquirir_promocion()`

→ snapshot + servicios + estado financiero refrescado.

Cancelación:

`GOXION_FINANCIAL_ACTIONS.cancelPromotionAcquisition()`

→ `goxion_cancelar_adquisicion_promocional()`.

## 11. Invariantes de P3

- nunca modificar `servicios.precio`;
- nunca leer el precio actual de la campaña para recalcular una adquisición histórica;
- editar campaña no altera snapshot;
- pausar campaña sólo cierra nuevas adquisiciones;
- pago consume exactamente un periodo;
- finalizar promoción no elimina servicios;
- Ayuda permanece sin cambios hasta su bloque visual.
