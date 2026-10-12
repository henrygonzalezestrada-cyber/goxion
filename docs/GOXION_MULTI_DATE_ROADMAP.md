# GOXION · Hoja de ruta de renovaciones independientes

**Corte de análisis:** 11/oct/2026. **Etapa real:** persistencia de calendarios por acceso en Admin, cálculos y guardado auditado; Ayuda/Index aún no usan obligaciones financieras separadas. **No** actualizar el estado de cuenta cliente basándose en IDs virtuales o importes calculados en el navegador.

## Contrato de producto acordado

- Mayoría de los clientes: una fecha heredada, habitualmente **día 15**, sin cambios visibles ni de cobro.
- Excepción: servicios (incluso dos perfiles de un mismo X2) pueden tener fechas y cobertura pagada diferentes.
- La ficha de Admin permite cambiar fechas exactas, confirmar cobertura y —si se solicita— estimar unión de fechas con prorrateo justo. No meter formularios en varias fases ni otro encabezado.
- Cliente en Ayuda: resumen breve con **«Próximo a vencer»** cuando existan varias fechas verificadas; si no, conserva la tarjeta habitual. Cliente en Index: **el mismo estado de cuenta** muestra próximo vencimiento, el resto y selección «pagar próximo» / «todo junto».
- «Unificar fechas» es una **operación financiera**, no un simple cambio de texto o día. Debe explicar la diferencia a favor/en contra y requerir autorización/confirmación.
- Separar **ver/simular**, **solicitar cambio**, **confirmar obligación** y **acreditar pago**. Reportar comprobante no equivale a aprobarlo.

## Lo que ya existe (verificado en repositorio)

- `docs/edge/estado-financiero/calendario-beta.mjs`: cálculo independiente simulado de X2 con IDs virtuales; no equivalen a líneas persistidas.
- `docs/edge/estado-financiero/index.ts`: `simular_calendario_beta` exige **token de Admin**. Con `X-Client-Token` solo expone `mi_estado` y su total financiero **oficial**.
- `assets/js/core/financial-engine.js`: `GOXION_FINANCIAL.clientState()` y `adminState()` son fuentes compartidas oficiales; `selectCompatibleState` preserva compatibilidad.
- `assets/js/index/01-index-supabase-layer.js` y `02-02-inline.js`: estado de cuenta existente. **La visual de Index todavía sigue un período global**, no un calendario de obligaciones independientes.
- `assets/js/ayuda/01e-client-dashboard.js` y `02-client-supabase-layer.js`: Mi Espacio y estado de cuenta del cliente; no conectar acceso de Admin aquí.
- `assets/js/core/financial-actions.js`: operaciones de pago centralizadas. `docs/ADMIN_FUNCTION_REGISTRY.md` mantiene propietarios.

## Orden para avanzar sin rehacer pantallas

| Fase | Trabajo | Resultado para validar | Prohibiciones |
|---|---|---|---|
| **A. Persistencia y autorización** ✅ estructura y guardado base; aún falta conciliación comercial | Definir obligaciones por **contrato + unidad/perfil**, importe real (no asumido 50/50), próxima fecha, cobertura pagada, recurrencia mensual, cambio y auditoría; migración retrocompatible | Consultas de obligaciones con historial y cobertura coherentes; cliente heredado intacto | No mutar `cliente_servicios` a ciegas, no confiar en nombre `(x2)` como esquema final, no guardar operaciones desde JS |
| **B. Motor y pagos** | Integrar cálculo a `estado-financiero` y aplicación transaccional/idempotente a `acciones-financieras`; pagos por vencimiento y conjunto, créditos/prorrateo, mora/descuentos, suspensiones | Pruebas de total exacto y no doble cobro con fechas 5/15/30/31, meses cortos, X2, saldo a favor y pago parcial | No permitir pagar un período dos veces ni redondear centavos por separado |
| **C. Contrato cliente de lectura** | Extender endpoint autenticado **`mi_estado`** u otro contrato autorizado del mismo propietario con próximos vencimientos por obligación | El propio cliente ve SOLO su calendario confirmado, sin datos de otros clientes ni IDs técnicos | Nunca exponer `simular_calendario_beta` administrativo ni leer el catálogo de clientes por URL |
| **D. Index primero** | Integrar un pequeño resumen de próximos vencimientos y selector de importe sobre la **interfaz Index existente**; flujo de comprobante se conserva | Capturas móvil: una fecha igual que hoy; varias fechas, pago próximo/todo junto sin duplicaciones | No reemplazar hero, fondo, tarjetas, barra fija o métodos de pago; no crear Index por servicio |
| **E. Ayuda después** | Mostrar en tarjeta principal el próximo importe y fecha; texto «Próximo a vencer» si realmente aplica, acceso a Index actual; evitar cerrar tarjeta al actualizar | Comparación de capturas antes/después; scroll, pestañas y realtime preservados | No implementar segunda calculadora ni rediseñar catálogo, carrito, misiones o registro |
| **F. Piloto y cierre** | Probar primero con pocos clientes con calendarios dispares y X2; auditar datos y recepción de pagos; aprobar visual y backend | Validación de casos y rollback documentado | No habilitar masivamente por defecto |


**Cierre de fase A (implementado):** `goxion_calendario_accesos` vincula cada fecha con `cliente_accesos.id`, guarda estado borrador/verificado y auditoría; la Edge `estado-financiero` incluye `guardar_calendario_beta` bajo token Admin. No se tocaron clientes ni importes históricos y no se ejecutó ningún pago. **Fase B sigue pendiente**: obligaciones, promociones, mora, saldos a favor y aplicación idempotente de pagos aprobados. No saltarse B para mostrar importes reales en Index.

## Riesgos que no deben ocultarse

- El simulador divide importes X2 de forma aritmética; **esto no demuestra la tarifa real ni su cobertura individual**. Verificación obligatoria antes de persistir.
- Elegir un día no indica si el período ya está pagado. La **cobertura confirmada** manda sobre la simulación.
- La función cliente `mi_estado` hoy no entrega obligaciones individuales. Exponer el calendario administrativo sería una filtración y además un error de negocio.
- Se necesita definir imputación del comprobante a obligación(es), manejo de remanentes/créditos, retardo y lealtad antes de acciones reales.
- Las correcciones visuales pendientes de Admin no bloquean documentar el trabajo; sí deben quedar registradas como deuda visual, sin presentarlas como cerradas.

## Criterios mínimos de aceptación

- El cliente con una sola fecha conserva monto y CTA actuales.
- En X2 dos fechas no duplican el total contratado ni adelantan deuda ya pagada.
- Unificar mantiene períodos cubiertos y explica prorrateo **solo después** de cálculo verificable en backend.
- Suspensión y estado pagado/revisión respetados.
- Sin revelar importes o servicios ajenos; tokens por rol.
- Sin salto de pestaña, cierre de tarjetas, modal superpuesto, scrolling horizontal o importes diferentes entre Admin, Ayuda e Index.
- Validaciones estáticas, motor, integración y Safari real antes de declarar oficial.

**Próxima intervención de código:** empezar **A + B** en una beta/PR limitada al modelo de obligaciones y cálculos, antes de tocar visual de Index o Ayuda.
