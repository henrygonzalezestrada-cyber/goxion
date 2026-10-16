# GOXION · Gixys / Microinteracciones · Handoff y Fase 2

Fecha: 16/oct/2026.

## Aprobación expresa del usuario

**Bloque A + Fase 1: APROBADOS** con la beta V4 del [PR #132](https://github.com/henrygonzalezestrada-cyber/goxion/pull/132):
- Gixys Hex/Square/Circle con `bot-avatars@0.2.2`, cara **solo ojos**, color GOXION y acabado **Plastic** como base.
- Motor de animación y saltos originales de Libraries.dev. No crear otro dibujo Canvas simplificado.
- Misiones: **check + botón elástico V1** (no SpringCheck de React Bits).
- Lealtad: **PulseHeart original de React Bits**, rojo `#ff4d6d`.
- Avisos: **campana V1**, movimiento aprobado, sin un recuadro nuevo alrededor del componente.
- Goxy original, sus animaciones de carga y funciones: intactos.
- Los Gixys acompañan **sin ocupar una nueva tarjeta** ni tapar información, preferentemente mediante overlays contextuales.

## Fase 2 · Beta espejo (presente)

Ruta: `preview/gixys-mi-espacio-espejo/`.

- Se genera `index.html` extrayendo `#goxion-main-nav` y `#view-dashboard` directamente de `ayuda.html`, reutilizando `assets/css/ayuda.css`, notificaciones oficiales y el morph compartido existente `05-gamification-shared-morph-js.js`.
- Datos **sintéticos** y anónimos; **no** se cargan controladores de sesión, cuentas, pagos, notificaciones reales, Supabase ni Goxy.
- La notificación usa la **campana existente de la cabecera** y su cápsula actual, sin agregar un recuadro para el efecto.
- La misión conserva el contenedor / tarjeta / detalle de Ayuda, sin módulo duplicado. En pantallas muy estrechas, Hex se muestra en el detalle cuando no cabe en la tarjeta sin tapar texto.
- PulseHeart acompaña el encabezado de lealtad, y Circle solo aparece con un avance. Square solo aparece al recibir un aviso. Son reacciones contextuales, no mascotas en movimiento constante.
- El build recompila el componente original de los Gixys y Pulse Heart con sus licencias originales, sin modificar sus movimientos.
- Antes de publicar la beta: QA de 280, 320, 360, 375, 390, 430 y 768 px, WebKit/Chromium, overlay sin solapamientos, scroll lateral 0, pruebas de toque, no requests al backend.
- **La beta espejo NO equivale a integración oficial**. Queda pendiente inspección humana en Safari iPhone y aprobación del usuario. Solamente después se puede preparar una integración productiva localizada en las funciones dueñas, sin duplicar cálculos y eventos.

## Restricciones de integración posterior

1. No usar el botón simulado para marcar misiones reales; escuchar exclusivamente una confirmación fiable del motor propietario tras persistencia.
2. No transformar Heart en control de progresión manual real; sus reacciones deben depender del progreso calculado en el backend. No conceder pagos ni niveles desde React.
3. No cambiar estados de notificaciones con el efecto visual. Se respeta `04-client-notifications-realtime.js`.
4. No instalar un segundo sistema de navegación, acciones de cobro o asistentes inteligentes.
5. Evitar overlays persistentes encima de importes, progreso, cabecera, X o controles.
6. La calidad y fluidez de la biblioteca es criterio de aprobación, no solamente pasar test técnicos.


## Observaciones del usuario tras probar video iPhone (16/oct/2026) — próximas fases

**Importante: no se solicita modificar esta beta espejo por estas observaciones.** La prueba confirma que el motor Plastic y las apariciones contextuales se ven bien; el objetivo siguiente no es agregar más adornos, sino utilidad.

1. **Corazón de lealtad:** PulseHeart está desalineado respecto a «Nivel de Lealtad» en el espejo actual. Corregir la retícula, centrado horizontal/vertical, medidas y respiración en la **integración real**, después de revisar el encabezado propietario y su comportamiento responsive. No imponer estilos ad hoc en la beta.
2. **Hex / Misiones:** no debe aparecer por abrir el panel de misiones. Debe reaccionar **después de la confirmación de una misión completada** (o después de completar el conjunto), y mostrar un mensaje acorde al progreso actualizado. Ejemplo tras completar una tarea cuando restan dos: «¡Solo te faltan dos misiones para conseguir tu recompensa!». Una aparición breve; no mascota permanente.
3. **Propósito funcional de los Gixys:** pequeños acompañantes especializados de Goxy. Deben **orientar y motivar a través de mensajes contextuales breves** (globos de diálogo ligeros junto al avatar), en lugar de aparecer por animar. Goxy mantiene las conversaciones, soporte experto e IA; los Gixys no crean un segundo chat, no tienen boca y no reproducen voz automáticamente.
4. **Áreas:** Hex → hitos de misiones, tareas pendientes, recompensa confirmada; Circle → avance real de lealtad, pérdida/conservación verificada de beneficio; Square → novedades o alertas reales. Animación original aprobada + mensaje puntual, se ocultan tras una lectura razonable o cierre, no bloquean X, acciones, importes, indicadores ni scroll. Evitar repetición intrusiva de lo mismo en la misma sesión y respetar motion reducido.
5. **Mensajes financieros/promocionales veraces:** los Gixys nunca calculan su propia fecha, monto, % o aplicación de cupones. Deben consultar el estado oficial seguro y las condiciones reales antes de indicar «se aplicará en este período», «se mantiene siempre», etc. Si no hay certeza, decir «Consulta cómo se aplicará tu cupón» o indicar el estado conocido. No inventar descuentos ni afirmar automatismos inexistentes.
6. **Ubicación:** no envolver ni al avatar ni a la campana en un recuadro nuevo; solución flotante y por evento con globos de diálogo discretos sin entorpecer la jerarquía existente.
7. **Paso siguiente propuesto:** diseñar/probar en beta espejo una **capa de mensajes y disparadores deterministas** con escenarios sintéticos (hito de misión, beneficio de lealtad confirmado, notificación). A continuación validar en iPhone y solamente entonces enlazar eventos reales de los controladores existentes en una rama de integración, sin modificar cálculos ni persistencia.

El video de prueba del usuario muestra el corazón en conflicto con el texto «Nivel de Lealtad», y a Hex presente antes de completar la misión: ambas observaciones se consideran deuda explícita de UX, no aceptación tácita de esa ubicación.
