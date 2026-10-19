# GOXION · Railway · Espejo funcional B4
**Entorno:** ficticio, aislado, autenticación de demo por cookie aleatoria `HttpOnly`. Esta beta NO llama a Supabase, no cobra, no registra cupones ni toca datos de clientes.

## Experiencia que se prueba
La página usa el espejo de Mi Espacio construido con **el HTML/CSS oficial de Ayuda** y los **Gixys Plastic V7** ya aprobados; conserva la animación de aviso importante E1/B1 y acceso existente a Goxy. Añade datos realistas ficticios (2 perfiles individuales, 1 combo promocional y 1 cuenta completa), historial ficticio y un estado de cuenta navegable. La pestaña Catálogo muestra servicios de prueba. La pestaña Soporte y el botón «Preguntar a Goxy» abren Ayuda oficial en otra pestaña por decisión explícita del usuario, ya que Railway tiene un origen separado; no se transfiere ningún dato del expediente ficticio. En la beta no se autentica ni lee un cliente.

Abrir el botón **«Simular mi cuenta»** y realizar las acciones en orden deseado:
1. Recibir aviso prioritario → tocar Gixy de la campana.
2. Confirmar hito de lealtad de un pago histórico aprobado → animación original de corazón y tocar Gixy.
3. Completar misión → tocar Gixy de misión → **una sola reserva** de cupón secreto 5%.
4. Ver estado de cuenta: descuentos ficticios de lealtad, Misiones, descuento especial y 5% Gixys acumulables para **perfiles individuales**. El combo promocional y cuenta completa quedan excluidos. El 5% no se consume hasta confirmar pago.
5. Confirmar pago; después avanzar de período. Si se descubre el 5% *después* de haber pagado el período actual, se reserva para el siguiente período elegible.
6. Activar o quitar promoción simulada de Netflix para comprobar que la base elegible del 5% no incluye servicios promocionados. «Reiniciar datos» limpia sólo este expediente de demo.

## Contrato de demo (no confundir con backend real)
- Server Node estándar `server.mjs`: `/api/b4/state` (GET) y `/api/b4/action` (POST), prohibición de `touch` si el evento contextual no está autorizado, IDs de sesión aleatorios, no-duplicación de tres encuentros, único cupón/reserva/consumo, estados persistibles por JSON aislado.
- `GX_B4_DATA_DIR` controla almacenamiento de ejemplo. Se recomienda volumen montado en Railway para conservar avance tras un redeploy.
- Los montos son **ejemplos ilustrativos de API simulada**, no cálculos oficiales: **no** se están invocando `acciones-financieras` ni los RPC protegidos; no hay comprobantes reales. La convivencia aprobada 5% + lealtad + cupón Misiones + descuento especial y exclusión de promociones/cuentas completas sí se valida en la API.
- Guardas CI: QA por Chromium/WebKit 280–768, ciclo completo de descubrimiento/reserva/aplicación, persistencia tras refresh, doble toque, sesiones separadas y no conexiones privadas.

## Producción prohibida
La rama es **beta independiente**, sin merge hacia `main`, `ayuda.html`, `index.html`, Admin o Supabase. Issue #142 mantiene bloqueo de lanzamiento del paquete.
El salto de API simulada a motor real requiere integración autenticada con `beneficios_programados`, `beneficio_aplicaciones`, `goxion_estado_financiero` y `acciones-financieras`, atomismo por obligación/ciclo, comprobante aprobado, prórroga/mora, compatibilidad con promociones y QA de no doble descuento. No fingir que esos movimientos existen en Railway.
