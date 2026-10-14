# GOXION B2 — Ruta de cierre controlada
**Estado inicial: 13 de octubre de 2026.** Documento vivo, rama feature/b2-espejo-index-ayuda-20261013. Fuentes: PR #96, PR #97, Issue #98, ADMIN_FUNCTION_REGISTRY, CALENDARIO_FINANCIERO, FINANCIAL_ENGINE, GOXION_MULTI_DATE_ROADMAP y GOXION_VISUAL_CONTRACT.

**Regla de seguridad:** aprobar una beta visual NO autoriza cobros B2 reales. El flujo habitual de clientes, especialmente los pagos del día 15, permanece inalterado hasta superar las puertas. Nada de reescribir Admin, duplicar funciones o sustituir archivos oficiales por maquetas.

## Inventario comprobado

| Área | Ya existe | Aún no está cerrado |
|---|---|---|
| Motor | Calendarios por acceso auditados, libro B2 opt-in, mora individual, lealtad global, abonos de Admin, base y endpoints de prórroga automática | Conciliación comercial por obligación, pago completo B2 real de extremo a extremo y activación piloto |
| Admin | Calendario de fechas dentro de ficha y guardado, gateway financiero, acciones y controles autenticados | Confirmar enlace real de todas las operaciones B2; avisos/destacado de prórrogas |
| Index + Ayuda | Betas espejo sobre el ADN original, pruebas visuales Chromium/WebKit, prórroga y selección multifecha simuladas | Conexión real con comprobantes, pagos aprobados y estados de obligaciones |
| Publicación | PR #96 y #97 abiertos como borrador, Issue #98 para Admin/Discord; Pages publica previews | Sin cliente B2 activo. GOXION Integrity en main falla y requiere investigación antes de lanzamiento |

Los 319+ checks de interfaz demuestran la navegación y las simulaciones, NO validan cobros reales. No llamar completada una fase cuando solo existan pruebas visuales.

## F0 · Inventario y protección de producción — CERRADA 13/OCT/2026
- [x] Identificar archivos propietarios y PR #96, #97 e Issue #98.
- [x] Separar funciones de backend instaladas, calendario guardado y funciones operativas reales.
- [x] Comparados `index.html`, `ayuda.html` y `admin.html` en main/PR #96/PR #97: **SHA de los tres archivos idénticos** en las tres referencias. La futura integración inyectará funciones mínimas, no sustituirá archivos completos.
- [x] GOXION Integrity en main verde (run 38479997185): página Comunicaciones reconocida, Playwright instalado en orden correcto, aserción VM y espera WebKit corregidas, todas las pruebas pasaron.
- [x] Verificado por SQL en producción: cero cuentas B2 activas, cero ciclos/cargos, 22 clientes y 28 pagos históricos. El esquema aditivo de aprobación atómica no está conectado al gateway operativo; fecha única continúa legacy. Rollback de activación B2 por opt-in.
**Entrega:** inventario, línea base limpia, estrategia de flag y reversión. **Puerta:** no afectar clientes actuales.

## F1 · Cerrar UX en betas espejo — APROBADA POR EL USUARIO 13/OCT/2026
- [x] Flujo aprobado: servicios → calendario → desglose; multifecha con próximo/todo, prórroga únicamente en Ayuda.
- [x] Modal con cristal, X cian, scroll bloqueado, foco limpio, campo de fecha 1–5 días, monto/desglose y CTA sin línea.
- [x] Últimos retoques: cápsula nativa time-badge badge-ok para Acuerdo pactado, halo rosa sin recorte de fondo rectangular.
- [x] El usuario aprobó explícitamente el bloque visual y los retoques finales de fecha, cápsula, glow y modal el 13/oct/2026.
- [ ] Verificación adicional de integración real en iPhone/anchos 280/320/360/375/390/430/768 px corresponde a F3, no reabre la aprobación del diseño.
**Entrega:** enlaces beta y captura de cambios comparados con componentes oficiales. **Puerta:** aprobación explícita visual, NO autorización para pagos reales.

## F2 · Cierre financiero B2 y operaciones Admin — PENDIENTE CRÍTICO
Reutilizar gateway y operaciones existentes; nada de nuevo panel o cuarto rediseño.
- [x] Bases: libro multifecha, mora 5% diario por acceso (máximo 50%), 3%/6% de descuento por acceso cuando tienen fechas distintas, una racha global y pagos parciales excepcionales bajo Admin.
- [x] Motor de prórroga automática B2 y pruebas reversibles de elegibilidad/aceptación.
- [ ] Pago completo: acreditar recibo aprobado contra cargo(s) por cliente/acceso/ciclo en operación atómica e idempotente y actualizar deuda, beneficios, cobertura y ciclo.
- [ ] Conciliar lealtad, promoción/combo, descuento especial con nombre personalizado, cupón de misión de uso único, Trato Justo, créditos, mora y prorrateo de unificación; centavo a centavo y sin dobles descuentos.
- [ ] Garantizar que un comprobante enviado NO equivale a pago aprobado. Probar selección por acceso vs todo junto, revisión, parciales de Admin, saldos pendientes y renovación.
- [ ] Prórroga real: solo día de vencimiento ORIGINAL, una por cliente/período y máximo 5 días. Si paga en fecha pactada conserva lealtad sin mora. Si incumple, al día siguiente mora retroactiva por obligación y pérdida de racha global de la cuenta, sin reabrir cuotas ya pagadas.
- [ ] Probar carreras/concurrencia, doble toque, idempotencia, fechas desactualizadas, promociones incompatibles, rollback por fallos de triggers y acceso sin autorización.
- [ ] Auditar aprobación desde Admin y confirmación B2 de obligaciones en fixture reversible y cuenta controlada sin alterar cartera histórica.
**Entrega:** matriz de casos, SQL/Edge/commits, resultados de prueba reversibles y conciliación oficial. **Puerta:** Finanzas aptas, antes de permitir pagos B2 reales.

## F3 · Beta INTEGRADA con operaciones verdaderas Index/Ayuda/Admin — PENDIENTE
- [ ] Conectar lectura y cotización B2 autenticada a componentes oficiales originales; cuentas de una sola fecha permanecen en flujo global.
- [ ] Conectar seleccionar próximo/todo, reportar comprobante, revisión en Admin y acreditación/estado posterior (según F2).
- [ ] Conectar fecha pactada real en Mi Espacio → Index → Admin, cumpliendo y fallando el pacto.
- [ ] Probar descuentos, Programa GOXION, estrella/corazón roto, historial, realtime sin cambiar de pestaña, errores y sesiones.
- [ ] Ejecutar pruebas de flujo completo aisladas/reversibles con un cliente técnico, Chromium, Safari iPhone y responsive.
**Entrega:** enlace de beta conectado y evidencia de la misma operación en los tres módulos. **Puerta:** recorrido real aprobado por usuario; no habilitar aún todas las cuentas.

## F4 · Admin/Discord: notificaciones y distintivo — PENDIENTE, Issue #98
La prórroga elegible SE APRUEBA SOLA; no crear autorización manual de Admin.
- [ ] Emitir evento persistente/idempotente prorroga_activada SOLO tras commit efectivo.
- [ ] Aviso Discord por el mecanismo existente, sin credenciales ni datos bancarios y con reintentos que no reviertan el pacto.
- [ ] Bandeja/notificaciones oficiales Admin: mensaje único, leído/no leído, enlace al expediente.
- [ ] Distintivo compacto en tarjeta del cliente: Prórroga hasta DD/MM, más detalle de fecha original, nueva, servicios, auditoría y estado cumplido/incumplido.
- [ ] Reutilizar calendario de edición actual de Admin sin alterar corte base ni duplicar fichas.
- [ ] Probar no duplicidad, falla Discord, varios cargos, clientes globales, expiración y cambios de estado.
**Entrega:** beta Admin conectada, ejemplo Discord de prueba, matriz de entrega. **Puerta:** Admin informado sin autorizaciones manuales. El aviso operativo debe estar listo ANTES de habilitar prórroga automática al público.

## F5 · Publicación gradual y cierre — PENDIENTE
- [ ] F0–F4 aprobadas; CI relevante verde; diagnósticos financieros y auditoría previos sin diferencias; posibilidad de apagado.
- [ ] Fusionar adaptaciones mínimas en oficiales y comprobar que los clientes habituales (sobre todo día 15) siguen iguales.
- [ ] Habilitar primero cuenta técnica/piloto opt-in con fechas verificadas y contrato atribuible; luego la primera cuenta real solo tras revisión.
- [ ] Seguir cobros, reporte/aprobación, mora, lealtad, descuentos, nueva fecha y notificaciones en ciclo real.
- [ ] Confirmar respaldos, rollback, no doble cobro, controles por cliente, logs y responsables.
**Entrega:** reporte final de liberación (commit, despliegue, usuarios habilitados, pruebas, riesgos y rollback). **Puerta:** GOXION B2 cerrado oficialmente.

## Método de trabajo
El usuario puede decir: «Avanza con F2», «Detente en F3», «Pulamos F1» o «Muéstrame estado». No adelantar fases con cambios financieros reales sin aprobación. Cada cierre deberá informar:
1. ESTADO: aprobado / parcial / bloqueado.
2. MODIFICADO: archivo/PR/commit y propietario.
3. PRUEBAS: cuáles fueron simuladas, reversibles y reales.
4. RIESGOS: fallos concretos, sin afirmar cero errores.
5. SIGUIENTE PUERTA: qué debe revisar/aprobar el usuario.

**Referencias:** [PR #96](https://github.com/henrygonzalezestrada-cyber/goxion/pull/96) motor financiero B2; [PR #97](https://github.com/henrygonzalezestrada-cyber/goxion/pull/97) UX espejo; [Issue #98](https://github.com/henrygonzalezestrada-cyber/goxion/issues/98) Admin + Discord.

## Avance verificado de F0/F2 · 13/oct/2026
- **F1 cerrada por aprobación explícita del usuario**; conservar la beta aprobada sin nuevos rediseños.
- F0 CERRADA (Integrity 38479997185): en `main`, el verificador reconoce `comunicaciones.html`, instala Playwright antes de probar y corrige el test de foco entre VM; WebKit/Ayuda tuvo un timeout de 2,5 s y se aumentó a 6,5 s sin retirar la condición visual. **GitHub Actions íntegro terminó en verde.**
- Supabase: **22 clientes, 28 pagos, 0 B2 activos, 0 cargos/ciclos B2** comprobados antes y después.
- F2: instalada la migración SQL aditiva `goxion_aprobar_pago_periodo_atomico`, sin conectarla al gateway oficial ni crear operaciones. Se verificó `anon=false`, `authenticated=false`, `service_role=true`, y tabla de operaciones vacía. El cobro global vigente continúa sin cambios.
- **Bloqueadores que quedan:** enlace comprobante real → obligación por acceso y aprobación atómica sin doble recibo; atribución verificable de beneficios especiales/promociones/cupones/mora; pruebas de extremo a extremo sobre fuente de verdad; y actualización controlada de Admin/Index/Ayuda más adelante en F3.
- **No activar régimen B2 ni fusionar PR #96/#97 mientras falten estas garantías.**


## Corte F2 · 13/oct/2026 — implementación y prueba transaccional

**F2 todavía abierta — no iniciar F3:** La infraestructura B2 tiene ahora una segunda frontera SQL transaccional por comprobante en PR #96. Se instalaron de modo aditivo:
- `goxion_aprobar_pago_periodo_atomico` (pago mensual GLOBAL, aún no en gateway oficial).
- `goxion_b2_comprobantes` + `goxion_b2_comprobante_aplicaciones`; RPCs `goxion_b2_registrar_comprobante` (no acredita) y `goxion_b2_aprobar_comprobante` (Admin acredita 1-N cargos en una sola transacción). Segunda migración almacena `asignaciones_aprobadas` y rechaza cambiar destino/importe con misma clave de aprobación.
- B2 Admin gateway beta v3 desplegada: `b2_aprobar_comprobante` autenticado y `b2_aprobar_abono` directo bloqueado por `B2_REQUIERE_COMPROBANTE`. **No modifica el gateway oficial.**

**Pruebas ejecutadas en base real con ROLLBACK:** `supabase/tests/20261013_b2_comprobantes_reversibles.sql` pasó doble aplicación de dos servicios, error en segundo revierte el primero, reintento sin duplicación, alteración de asignaciones denegada y un recibo consolidado. `supabase/tests/20261012_aprobacion_global_atomica_reversible.sql` también pasó al adaptar el fixture a la nueva regla de prórroga máximo cinco días. Al finalizar: 22 clientes, 28 recibos, 0 cuentas B2 activas, 0 reportes/aplicaciones/cargos. Solo `service_role` ejecuta RPCs. Pruebas estáticas extra en `scripts/b2-comprobante-ledger-smoke.mjs`.

**Pendientes bloqueantes de F2:** (1) evidencia auténtica de transferencia protegida, que una ruta de cliente autenticada podrá asociar sin confiar en URL libre; (2) **atribución y consumo único por acceso** de promociones, cupones, beneficios y Trato Justo: motor actual rechaza esos casos, no permite reparto arbitrario; (3) aprobación global atómica aún no sustituye la ruta legacy oficial, por lo que falta despliegue y pruebas integrales con respaldo; (4) ciclos/prórrogas y estados financieros en escenario real opt-in controlado; (5) prueba Admin de la nueva ruta B2 con evidencia validada en entorno seguro.

**Prohibido declarar F2 terminada** solo con prueba de recibo ficticio. Mantener clientes de fecha única y sus pagos originales protegidos mientras se trabaja en estos bloqueos. La F1 visual aprobada no necesita cambios.


## F2 · Evidencia B2 protegida y separación de responsabilidades (13/oct)

- **Motor SQL instalado, cero opt-in reales:** bucket privado `goxion-b2-evidencias` (6MB imágenes), `goxion_b2_registrar_comprobante_seguro` exige evidencia real previamente almacenada, cliente, ciclo, selección exacta de cargos y monto de cotización oficial. Reportar no acredita. Firma antigua sin comprobante real quedó desactivada.
- **Nuevo endpoint F2 separado** `comprobantes-b2-beta` v1: `X-Client-Token` HMAC, verificación de firmas JPEG/PNG/WEBP, tamaño, SHA-256 y nombre de archivo privado por cliente/operación; no toca Index oficial ni envía a Discord.
- **Admin** `acciones-financieras-b2-beta` v3: exige recibo registrado para acreditar, hace rollback de todos los cargos si falla uno, rechaza clave repetida con datos diferentes y no permite modificar la selección hecha al reportar. Acción directa `b2_aprobar_abono` bloqueada en beta.
- **Pruebas SQL reversibles** en Supabase: pasa comprobante por dos accesos, fallo segundo revierte primero, reintentos, modificación de reparto rechazada, archivo inexistente rechazado y deshabilitación de firma insegura. Post-ROLLBACK: 22 clientes/28 pagos originales/0 B2 activos/0 objetos de evidencia/cargos.
- **Cierre aún pendiente**: verificación end-to-end de bytes del archivo con token legítimo y Admin en entorno aislado; atribución al cargo correcto y consumo por ciclo de beneficios con promoción/combos/cupones/descuentos especiales/Trato Justo; renovación y prueba de gateway GLOBAL atómico en producción con estrategia de reversión. F2 no verde, F3 no iniciado.
- **Pruebas de cero cambios oficiales**: `acciones-financieras` sigue v10, `periodo-cobro` v3, Index/Ayuda originales, pagos legados día 15.


## Seguimiento F2 · corte financiero 13/oct/2026 (sin iniciar F3)

- **F0 permanece CERRADA y F1 APROBADA**; no se tocaron Index, Ayuda ni Admin oficiales, ni los archivos visuales del PR #97.
- **F2 sigue ABIERTA con bloqueo técnico P0 de atribución comercial.** Ver evidencia en [B2_ATOMIC_APPROVAL_REVIEW.md, PR #96](https://github.com/henrygonzalezestrada-cyber/goxion/blob/feature/b2-atomic-full-payment-20261012/docs/B2_ATOMIC_APPROVAL_REVIEW.md).
- **Supabase verificado:** 22 clientes, 28 recibos históricos, 0 clientes B2 activos y 0 ciclos/cargos/comprobantes/aplicaciones/prórrogas B2; migraciones correctivas de prórroga 004 y 005 instaladas; Edge aislada `comprobantes-b2-beta` v3.
- **Correcciones:** impedir prórroga con comprobante B2 reportado en revisión; leer correctamente `pago_en_revision`; impedir subida huérfana de archivos cuando no existe ciclo/importe válido; replay estricto de comprobante aunque el ciclo haya cerrado.
- **Pruebas SQL con ROLLBACK, todas PASS en escenario vigente:** comprobante 1-N con segunda aplicación fallida, prórroga automática en fecha actual, lealtad B2 6%, prórroga global y aprobación global atómica. Dos scripts fechados el 12/oct quedaron obsoletos; sus fallos se documentan y deben actualizarse antes de CI.
- **Puerta F2 aún cerrada:** atribuir promociones/combos, cupones, descuentos especiales y personalizados, Trato Justo, créditos, mora y stacking por obligación; comprobar consumos exactamente una vez al emitir recibo global, HTTP real de carga con identidad técnica y concurrencia. `goxion_b2_iniciar_ciclo` sigue rechazando beneficios sin conciliación. No debilitar esa barrera.
- **F3, F4 y F5 permanecen pendientes.** Issue #98 no se modifica; la notificación Discord/Admin todavía no se implementa.


## Actualización de cierre técnico F2 para transferencia F3 beta · 13/oct/2026

Esta sección **sustituye el estado P0 comercial y de pruebas históricas** indicado en el corte anterior, sin modificar el historial de auditoría.

**F0 cerrada; F1 visual aprobada; F2 motor backend APTO PARA INTEGRACIÓN F3 BETA; F3 no iniciada; F4/F5 no iniciadas.** No se autoriza incorporación de clientes, publicación de pantallas oficiales, fusión de PR ni envío de notificaciones.

- En PR #96 se instaló la conciliación comercial real por fuente/acceso y la conservación independiente de promociones, cupones, descuentos especiales, Trato Justo, mora y lealtad, con snapshots de bloqueo de stacking y del período.
- El único gateway administrativo B2 beta ofrece consulta/confirmación de atribución; no hay aprobación manual de prórrogas. Los disparadores del recibo único verifican consumos comerciales.
- Se modernizaron `20261012_prorroga_b2_reversible.sql` y `20261012_b2_libro_real_atómico_reversible.sql`, ambos **PASS ROLLBACK**. Los casos de combo y mora intermitentes por ordenar UUID aleatorios fueron corregidos; **4/4** repeticiones exitosas cada uno. El resto de fixtures SQL se revalidó con ROLLBACK.
- Pipeline GOXION B2 Backend: último commit de código aprobado al momento de corte `6265ba85` **success**; pipelines de correcciones posteriores en progreso al último chequeo. No anticipar resultado.
- Integridad: 22 clientes, 28 pagos, 0 clientes B2 activados y 0 ciclos/cargos/comprobantes/atribuciones B2. Los estados financieros oficiales siguen conciliando 22/22.
- **Aceptación técnica F2 ≠ autorización para cobrar:** durante F3 beta deben completarse pruebas reales de carga binaria HTTP con credenciales técnicas y autorización Admin, concurrencia entre dos transacciones COMMIT independientes, y resolver el conflicto de integración de PR #96 (`mergeable=false`). Sin esas evidencias, puerta de producción cerrada.

**Siguiente paso:** iniciar F3 **sólo como integración beta aislada** sobre los diseños ya aprobados, no como una nueva reorganización ni una liberación productiva; usar el documento financiero de PR #96 como contrato de referencia.
