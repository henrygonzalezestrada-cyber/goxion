# GOXION · Guía para cualquier asistente que trabaje en el repositorio

**Antes de proponer, editar o integrar cambios, leer en este orden:**

1. `docs/GOXION_VISUAL_CONTRACT.md` — identidad de Admin, Ayuda/Mi Espacio e Index, retículas y QA responsive.
2. `docs/ADMIN_FUNCTION_REGISTRY.md` — funciones existentes, propietarios, flujos y prohibiciones de duplicación.
3. `docs/CALENDARIO_FINANCIERO.md` y `docs/GOXION_MULTI_DATE_ROADMAP.md` cuando el trabajo se refiera a fechas, obligaciones o pagos.
   - Para modificar el estado de cuenta, consultar también `docs/INDEX_CALENDARIO_VISUAL_BASELINE.md` y los módulos reales de Index.
4. Los HTML/CSS/JS **reales del módulo que se va a modificar**, antes de decidir componentes o estilos.
5. `README.md` y `package.json` para el flujo de revisión y pruebas.

## Invariantes de trabajo

- **Tres experiencias, no una plantilla compartida.** Admin: operaciones; Ayuda: cliente/descubrimiento/Mi Espacio; Index: estado de cuenta/pagos. No copiar estructuras, CSS ni tipografías entre ellas. El motor de negocio sí es compartido.
- Conservar la arquitectura actual y los flujos aprobados. No reorganizar Admin por cuarta vez ni crear formularios repetidos para operaciones ya existentes.
- Reusar el motor financiero oficial, seguridad y persistencia del backend. Admin ya puede **guardar fechas por acceso X2** con auditoría, pero el cálculo monetario continúa en **simulación**: no presentarlo como deuda real del cliente ni como cobro acreditable.
- **Compactación inteligente:** campos cortos relacionados juntos si caben; componentes largos a ancho completo. Ocultar información secundaria detrás de un control explícito. Los cambios de estado nunca deben desorientar ni sacar al usuario de donde estaba.
- Antes de entregar una interfaz, verificar con pruebas responsive y funcionales. No declarar aprobado un resultado que no se comprobó en Safari real.
- Corregir el componente dueño del problema y agregar regresión; evitar CSS global de último minuto y duplicación de handlers.
- Mantener los cambios limitados al alcance solicitado; documentar cualquier dependencia necesaria.

## Continuidad entre chats

Este archivo y los documentos enlazados constituyen la referencia **persistente** del proyecto. En una conversación nueva, indicar: «Abre el repo GOXION, lee AGENTS.md y el contrato visual antes de trabajar». El asistente debe volver a leerlos; los nuevos chats no cargan automáticamente archivos externos.


- **Pagos parciales B2:** el cliente todavía NO puede pedir ni acreditar un abono desde Index. Admin sí marca comprobantes incompletos por saldo restante y dispone de acuerdo de fecha. Las nuevas tablas `goxion_obligaciones_sombra`, `goxion_abonos_sombra`, `goxion_imputaciones_sombra` y `goxion_b2_auditoria` son solo de preparación, sin cargos. Una solicitud no evita mora automáticamente; leer `docs/GOXION_MULTI_DATE_ROADMAP.md` antes de cualquier integración.


## Paso B2 · Pago parcial administrativo transaccional (12/oct/2026)

**Hecho y desplegado en producción (gateway `acciones-financieras` v7):** se versionó su código en `docs/edge/acciones-financieras/index.ts`, que antes solo estaba desplegado en Supabase. La acción preexistente `registrar_pago_parcial` conserva **el mismo contrato de Admin** (cliente, saldo restante, período esperado, respuesta `resultado.pago_parcial`), pero reemplaza sus tres escrituras sucesivas por `public.goxion_registrar_pago_parcial_atomico`, migración `supabase/migrations/202610120005_pago_parcial_atomico_legacy.sql`.

La RPC bloquea al cliente para serializar operaciones, lee el estado oficial después de adquirir el bloqueo, verifica período y saldo actual, desactiva el parcial anterior, inserta el nuevo y actualiza el estado de revisión **en una sola transacción**. Acepta `operation_id` único (puede ser generado por el gateway o pasarse como `clave_idempotencia`) para devolver un reintento equivalente sin volver a abonar. Un parcial no puede superar el saldo, ni repetir el mismo período activo; los índices únicos complementan las guardas. La función está revocada para `public`/`anon`/`authenticated` y solo la ejecuta `service_role` desde Edge con `X-Admin-Token`.

**Verificaciones alcanzadas:** 19 guardas de código + 19 casos simulados del gateway = 38; la RPC se probó con una transacción que terminó en `ROLLBACK` (idempotencia, saldo, periodo, propiedad), sin registros persistidos. Después del despliegue: 22/22 estados oficiales, 0 divergencias, 28 pagos originales y 0 `pagos_parciales` en producción. Código en GitHub idéntico a Edge v7.

**Limitación que NO debe confundirse con pago B2 habilitado:** esta mejora aplica al *pago parcial del período global* que administra GOXION; no acredita obligaciones por acceso. Tampoco conecta una solicitud de abono de Index ni cambia mora por vencimiento, cupones o descuentos distribuidos. La validación adicional de mora después de un abono aprobado no se pudo ejecutar sobre cuenta real por una restricción de seguridad del entorno; queda como requisito explícito para activar autoservicio. Se conservan sin cambios Index, Ayuda y la aprobación habitual de pago completo.

**Próximo bloque seguro:** completar motor de obligaciones por ciclo con beneficios elegibles, y diseñar flujo autenticado de propuesta/comprobante → revisión de Admin → imputación idempotente de **pago aprobado** → recálculo por vencimiento. No llamar a `goxion_solicitar_abono_sombra` desde la web pública antes de esa integración y validación.

- **B2 imputación de comprobantes (12/oct/2026):** el gateway `acciones-financieras` v8 ofrece a Admin `preparar_imputacion_sombra`, protegida por token y RPC `goxion_preparar_imputacion_sombra`; acepta solo comprobantes `pagado` del mismo cliente y mes, importe dentro de límites, con idempotencia y auditoría. **Siempre `acreditada:false`**, nunca es un pago real. Los períodos históricos en español se normalizan sin migrar `pagos`. Ver `docs/GOXION_MULTI_DATE_ROADMAP.md`; no activar cobro independiente en Index ni duplicar gateway.
