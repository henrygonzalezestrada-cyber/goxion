# GOXION · Integración B2 — criterios de cierre visual y próxima fase

**13/oct/2026 · Rama:** `feature/b2-espejo-index-ayuda-20261013` · **PR:** #97 (borrador)

## Cierre visual acordado — Mi Espacio (Ayuda)

El modal de prórroga es parte de la interfaz **oficial existente** y debe conservar la paleta cian–morado, cristal semitransparente con blur, tipografía, transiciones y botón redondo cian con X oscura. No reconstruir una apariencia genérica. Estos criterios son bloqueantes para pasar la beta a oficial:

1. **Bloquear scroll de fondo en iOS Safari y Chrome.** Al abrir el diálogo se fija el documento en su posición actual, se intercepta el gesto táctil que alcanzaría la página base y se restaura el scroll exacto al cerrar, incluido Escape. El propio diálogo solo se desplaza cuando su contenido realmente excede la pantalla. Probar tamaños 320, 390 y 768 px.
2. **Sin contorno de foco automático.** Se coloca el foco accesible en el contenedor sin dibujar un recuadro inicial. Los controles SÍ conservan foco visible al navegar por teclado. No abrir teclado ni preseleccionar la X.
3. **Calendario alineado.** `Nueva fecha de pago` y selector permanecen en la misma fila, con alturas, alineación vertical y márgenes proporcionales; no arrastrar el selector hacia abajo ni crear otra cápsula. Fechas fuera de 1–5 días bloqueadas por el motor financiero y por la IU; mensaje rojo, ninguna cotización caduca y confirmar deshabilitado.
4. **Importe de incumplimiento como protagonista editorial.** Texto del riesgo arriba, importe principal visible y alineado a la izquierda; mora retroactiva y pérdida de lealtad bajo el importe como dos filas de texto/valor alineadas por columnas, sin cajas secundarias. Evitar centrado accidental, recuadros innecesarios, resplandores exagerados y separadores gratuitos.
5. **CTA «¿No puedes realizar tu pago hoy?» sin subrayado ni pseudoelemento lineal**. Mantener el enlace limpio en la tarjeta original debajo de «Ver Estado de Cuenta». Tras aceptar, la fecha aparece UNA sola vez y «Acuerdo pactado» como distintivo mínimo.

**No alterar** Index ni Ayuda oficiales hasta revisión del usuario; las rutas `/preview/integracion-b2/` son simulaciones con operaciones de escritura bloqueadas. Conservar Programa GOXION, descuento de lealtad, corazones/estrella, promociones, cupones, moras, cobros y estructura principal de Index. La integración final requiere auditoría financiera real.

## Siguiente fase — Admin y Discord (NO implementada todavía)

Cuando el cliente acepte una prórroga **válida** desde Mi Espacio, la aprobación continuará siendo **automática y transaccional**. Admin NO debe aprobarla.

- **Evento persistente y único** `prorroga_activada`, publicado solo al confirmar la transacción (sin detonar por abrir modal, cotizar o reintentar). Identificador idempotente por acuerdo/ciclo/cliente. Nunca publicar credenciales, PIN, tokens o datos bancarios en Discord.
- **Notificación Discord** usando el mecanismo oficial existente: cliente, identificador de acceso o grupo, vencimiento original, fecha pactada, estatus, sello horario y resumen no sensible. Usar cola/outbox y reintentos; el fallo de Discord no debe revertir ni duplicar el acuerdo.
- **Notificación en Admin** en el módulo de notificaciones existente (sin construir otro sistema paralelo). Estado leído/no leído y vínculo directo al cliente; idempotencia para evitar avisos duplicados.
- **Distintivo en tarjeta del cliente**: «Prórroga hasta DD/MM» o «Acuerdo activo», ligero pero visible; al cumplir vuelve a normal, al incumplir se refleja mora/racha perdida. En vista de detalle debe aparecer la fecha original, la nueva, los accesos afectados y auditoría.
- **Calendarios**: conservar selector de fecha(s) de cobro ya existente en Admin, evitar duplicarlo. Revalidar multifecha, cliente de fecha única y servicios del mismo vencimiento. No modificar fechas manualmente al activar un acuerdo.
- **Seguridad:** sólo las fuentes de verdad servidoras pueden confirmar acuerdos; monitorizar fallos, expiración y duplicados; comprobar el día 15 y períodos multifecha antes de liberar.

## Puertas de liberación

1. Pruebas visuales móviles y aprobación explícita.
2. Pruebas de index ↔ ayuda conservando todos los estilos originales.
3. Validación de montos reales individuales/consolidados con cupones, promociones, descuentos especiales, racha, pagos aprobados y mora.
4. Activación gradual y reversible, cuentas existentes intactas. Admin/Discord corresponde a etapa independiente posterior, no condiciona el cierre visual de las betas.

Este documento es un registro de decisiones, no evidencia de que Admin/Discord se haya integrado.
