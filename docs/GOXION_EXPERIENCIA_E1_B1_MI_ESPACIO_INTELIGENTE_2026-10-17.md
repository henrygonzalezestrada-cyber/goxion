# GOXION · Experiencia del cliente · Etapa 1 / Bloque 1
## Mi Espacio inteligente — beta de prioridades (17/oct/2026)
**Estado: EN REVISIÓN; NO APROBADO NI AUTORIZADO PARA PRODUCCIÓN.**

### Objetivo aprobado para elaborar beta
El cliente encuentra **una única indicación relevante** según su situación, sin añadir avisos redundantes, ni rediseñar módulos oficiales, ni desplazar contenido por elementos decorativos. No confundir Gixys V9 (ya aprobado visualmente y congelado) con este bloque de información contextual; Gixys permanecerán en `preview/gixys-mi-espacio-espejo/?v=9`, sin cambiar.

### Qué se implementó
- Beta espejo: `preview/experiencia-mi-espacio-inteligente/`. `build.mjs` extrae navegación y panel originales de `ayuda.html`, elimina sus handlers y scripts activos, y añade una franja cristal de **prioridad contextual** bajo el saludo. El resto de Mi Espacio reutiliza sus clases y estilos oficiales, sin duplicar el motor real.
- Selector compacto de **9 escenarios ficticios**: próximo pago; varios servicios con distintas fechas; comprobante en revisión; corrección de comprobante; vencido; prórroga acordada; misión pendiente; al corriente; cliente sin servicios.
- Acción contextual que guía a estado de cuenta, misión o aviso; **todo es simulación local, sin acciones reales ni navegar a cobros**.
- Motor puro `priority-engine.js` que jerarquiza estados, distingue `review.serviceIds` para no volver a pedir pago del comprobante bajo revisión, respeta fecha pactada de una prórroga y no suma servicios con fechas diferentes. Para el mismo día sí agrupa importes ficticios. No presenta importes si no están confirmados.
- Muestra el próximo importe específico, no la suma mensual multifecha. Módulos de lealtad, servicios y misiones conservan jerarquía pero solo reciben textos y datos sintéticos.
- Ninguna función productiva, controlador cliente, Supabase, Goxy, backend financiero, Index o Admin fue editado.

### Matriz funcional / cómo evaluar
1. **Pago próximo:** una indicación discreta y CTA hacia la fecha de cobro, sin alterar monto total mensual de ninguna cuenta real.
2. **Varias fechas:** Servicio A 20/oct $45, Servicio B 6/nov $49. La prioridad muestra **$45 en octubre**; el calendario da ambas fechas sin sumarlas a $94. La agrupación de $94 solo sería correcta si vencieran el mismo día.
3. **En revisión:** confirmar recepción del comprobante y consultar estado. No mostrar botón de repetir pago para ese servicio.
4. **Con observación:** comunicar que necesita una corrección y dirigir a la indicación.
5. **Vencido:** señalar servicio afectado y remitir al estado de cuenta para mora real, sin fabricar deuda.
6. **Prórroga:** fecha nueva pactada visible y sin aplicar mora ficticia.
7. **Misión pendiente:** cuando no hay pagos urgentes, mostrar el progreso y enlazar al módulo ya existente.
8. **Al corriente:** mensaje tranquilo, sin crear una urgencia artificial.
9. **Cliente nuevo:** orientar al catálogo ya existente, sin reclamar promo ni crear pedido en beta.

### Contrato técnico para la eventual integración
- La beta NO define nuevas condiciones financieras. En oficial, leer exclusivamente `estado_financiero_b2_beta / calendario_financiero` confirmados y el estado de comprobantes ya existente; nunca calcular mora, reactivar servicios, emitir cupones ni duplicar descuentos desde un nuevo motor.
- Prioridad por obligación, no por cuenta completa; para clientes multifecha se calculan fecha y pago **por el conjunto que vence ese día**; comprobantes en revisión excluyen solo obligaciones incluidas, no pagos de otros servicios.
- Gixys serían compañeros ocasionales y funcionales, **no aparecen constantemente** y **no reemplazan** a Goxy; su integración en este bloque permanece separada hasta que el usuario apruebe el conjunto completo.
- No introducir nuevos contenedores que saturen visualmente el dashboard; no scroll horizontal, no datos inventados o mensajes engañosos. El orden y la jerarquía quedan abiertos al feedback.
- Antes de oficial: diseñar contrato de eventos confiables, validar estados de pago contra B2, revisar reconciliación, prórrogas, lealtad y promos, y hacer QA global; requerir autorización explícita **para el lanzamiento conjunto de todas las mejoras**.
- Bloques posteriores: explicación financiera y comprobantes; Gixys y Goxy contextuales; misiones/lealtad/notificaciones; secreto 5% real con reglas en motor existente; avisos preventivos.

### Control de calidad
`check.mjs` prueba estados de decisión, diferentes fechas vs misma fecha, bloqueo de pagos bajo revisión, error cerrado ante importe desconocido, Chrome/WebKit a 280/320/360/390/430/768, 9 escenarios por ancho, foco táctil, aislamiento, ausencia de scroll lateral, sin requests privados ni datos persistidos.
No afirmar que las pruebas pasaron hasta que CI confirme éxito.

**Bloque 1 EN REVISIÓN DEL USUARIO; no fusionar esta beta con una integración oficial, ni tratar su aprobación como permiso de producción.**
