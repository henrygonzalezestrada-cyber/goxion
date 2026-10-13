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

## F0 · Inventario y protección de producción — EN CURSO
- [x] Identificar archivos propietarios y PR #96, #97 e Issue #98.
- [x] Separar funciones de backend instaladas, calendario guardado y funciones operativas reales.
- [ ] Comparar index.html, ayuda.html, admin.html oficiales con las modificaciones propuestas: integrar pequeñas funciones, no copiar la beta sobre el oficial.
- [ ] Diagnosticar/solucionar GOXION Integrity en main (incluido HTML huérfano comunicaciones.html y fallos secundarios de scripts) SIN silenciar pruebas.
- [ ] Verificar bloqueo de activación, plan de rollback, respaldo y protección de cartera de día 15.
**Entrega:** inventario, línea base limpia, estrategia de flag y reversión. **Puerta:** no afectar clientes actuales.

## F1 · Cerrar UX en betas espejo — PENDIENTE DE APROBACIÓN VISUAL
- [x] Flujo aprobado: servicios → calendario → desglose; multifecha con próximo/todo, prórroga únicamente en Ayuda.
- [x] Modal con cristal, X cian, scroll bloqueado, foco limpio, campo de fecha 1–5 días, monto/desglose y CTA sin línea.
- [x] Últimos retoques: cápsula nativa time-badge badge-ok para Acuerdo pactado, halo rosa sin recorte de fondo rectangular.
- [ ] Validación visual definitiva del usuario en iPhone; comprobar de nuevo 280/320/360/375/390/430/768 px, iconos, estados y animaciones.
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
