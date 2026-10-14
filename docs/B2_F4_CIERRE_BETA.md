# GOXION B2 · F4 — cierre de notificaciones beta
Fecha: 14/oct/2026. Rama: `feature/b2-f4-notificaciones-20261014`, dependiente de F3 PR #99 y motor F2 PR #96.

## Estado acreditado
- Un evento `prorroga_activada` se registra exclusivamente después del INSERT/UPDATE exitoso del acuerdo aprobado; evento y `notificaciones_admin` quedan en la misma transacción, con clave única por acuerdo.
- La campana Admin reutiliza leído/no leído, prioriza los nuevos acuerdos y abre la ficha existente. El encabezado muestra `Prórroga hasta DD/MM/YYYY`; al vencer sin liquidación muestra incumplida; la acreditación puntual genera `prorroga_cumplida` sin crear una segunda activación.
- La entrega a Discord sale de un **outbox**, mediante el webhook de pagos existente y una Edge Function accesible sólo por clave de servicio. No contiene credenciales, PIN ni datos bancarios. Una caída de Discord nunca anula un acuerdo financiero. Admin permite reintento autenticado al abrir la campana.
- La confirmación de envío impide reclamar de nuevo ese evento. **Límite técnico:** si Discord acepta un mensaje pero se pierde la confirmación de la respuesta HTTP antes de actualizar el outbox, una entrega posterior podría repetir el mensaje; el aviso incluye identificador de evento para detectarlo. No prometer exactamente-una-vez entre redes.
- La fecha única heredada mantiene su flujo original; el evento de F4 sólo se engancha al régimen B2 opt-in. Ningún cliente B2 real ha sido activado.

## Evidencia
- QA aislada: tres pruebas SQL reversibles PASS: activación/reintento idempotente, cumplimiento, confirmación de envío sin duplicado. Prueba real HTTP: acceso al dispatcher sin clave = 401; con clave técnica y Discord no configurado = 200 con 1 pendiente de reintento; el acuerdo permanece aprobado y una notificación Admin no leída persiste.
- GitHub Actions `GOXION · B2 F4 Notificaciones Beta`: CI técnico y visual Chromium/WebKit success en commit `21db07e4`. Los siguientes commits posteriores a ese corte requieren consultar sus propios resultados.
- Supabase GOXION principal: migración `b2_f4_eventos_notificaciones_outbox` aplicada, Edge betas `b2-f4-discord-beta` v1, `acciones-financieras-b2-beta` v7, `estado-financiero-b2-beta` v6. **22 clientes, 28 pagos, 0 B2 activados, 0 eventos F4** tras el despliegue.
- Funciones SQL F4: `anon` y `authenticated` carecen de EXECUTE. Las pantallas Index, Ayuda y Admin oficiales no se cambiaron.

## Puerta de salida
F4 backend e integración beta completos; publicar el cliente real es F5. Para F5: integrar de forma atómica las PR #96 (motor), #97 (visual), #99 (F3), y esta rama F4 en un release candidate, resolver conflictos sin tocar la UX aprobada, comprobar visual/login/cobro/notificaciones y habilitar únicamente el opt-in autorizado. No fusionar estos PR directamente a producción en desorden.
