# GOXION · Propuesta revisada de pagos, prórrogas y garantía

**Estado: BORRADOR NO VIGENTE.** Decisiones comerciales en revisión; no habilita cobros, bajas, reintegros ni modificaciones de contratos. Requiere validación jurídica y pruebas financieras.

## Parámetros solicitados el 17 de noviembre de 2026

| Regla | Propuesta |
|---|---|
| Mora | 2.5% diario simple sobre saldo vencido del servicio afectado; máximo 25% (10 días de cálculo) |
| Retiro por silencio | Desde el sexto día natural posterior al vencimiento, **solo servicio vencido** |
| Solicitud de prórroga | Hasta el tercer día natural posterior al vencimiento |
| Fecha máxima propuesta | Décimo día natural posterior al vencimiento original |
| Cargo adicional de reactivación | Eliminar 20% |
| Garantía por fallas atribuibles a GOXION | 5% de descuento por día completo sin servicio, máximo 50% de la cuota del servicio afectado |
| Garantía sin solución | Ofrecer restitución del servicio, sustitución equivalente, reembolso proporcional o saldo a favor elegido por el cliente, sin duplicar compensaciones |

**Inconsistencia que exige decisión:** si el servicio se retira desde el sexto día por falta de comunicación, la mora solo puede devengarse durante los días en que la obligación y la base de cálculo sean exigibles, y no se deben generar cargos futuros artificiales por un servicio retirado. El 25% es un **tope**, no un cobro automático al retirar. Si se pretende 25% en cinco días, sería 5% diario; si se pretende un periodo de diez días, 2.5% diario. La opción propuesta es 2.5%.

**Ejemplo 15:** vence el 15; puede pedir prórroga del 15 al 18; nueva fecha máxima 25. Sin pago, solicitud o comunicación, revisión para retirar **solo** servicio vencido desde el 21. Antes de retirar verificar comprobantes pendientes, abonos, incidencias del proveedor y mensajes de soporte. La solicitud pendiente bloquea preventivamente la baja hasta resolución, pero no constituye aprobación.

**Garantía:** el 5% diario se calcula sobre la cuota del servicio que falló, no sobre todos los servicios. Una falla de 15 días sobre una cuota de $200 representa una proporción de servicio no prestado de $100 en un ciclo de 30 días; el descuento máximo del 50% también sería $100. **No sumar $100 de descuento y otros $100 de reembolso por los mismos días**. Si el servicio no se restablece, ofrecer alternativa equivalente con consentimiento, o reembolso de la parte no prestada y no compensada, o crédito elegido por el cliente. Revisar las obligaciones de reembolso aplicables conforme a la legislación mexicana, que pueden prevalecer sobre límites contractuales de descuento.

## Cláusulas preliminares

**Vencimientos independientes.** Cada servicio o unidad contratada tiene su fecha y obligación de pago propia. La falta de pago de uno no altera los demás que estén al corriente.

**Prórroga.** Desde el vencimiento y hasta tres días naturales posteriores, el cliente puede solicitar una prórroga cuya fecha máxima sea diez días naturales después del vencimiento original. El envío no equivale a aprobación. Toda solicitud se registra, revisa y resuelve expresamente. Mientras esté pendiente, no se ejecutará una baja automática por silencio.

**Mora.** La mora se calcula exclusivamente sobre saldos vencidos y exigibles, con desglose individual. Se propone 2.5% diario simple con máximo del 25%, sujeto a revisión de proporcionalidad legal. La baja no genera una penalización adicional. La deuda legalmente exigible no desaparece por la baja, pero tampoco se acumulan recargos por servicios no prestados.

**Retiro.** A partir del sexto día natural de atraso, tras aviso y verificación de ausencia de pago, comunicación, comprobante en revisión y solicitud o prórroga pendiente, GOXION podrá iniciar la baja del **servicio afectado**. No se borran obligaciones, pagos, cobertura ni historial. La comunicación registrada requiere atención humana antes de actuar.

**Nueva contratación.** Para contratar nuevamente se informará por separado cualquier saldo anterior legalmente exigible, los recargos permitidos efectivamente generados y el costo del nuevo periodo. No existe penalización administrativa del 20% ni se duplica el cobro de mensualidades. No condicionar indebidamente derechos del consumidor.

**Garantía de continuidad y protección del cliente** (nombre propuesto para sustituir «Trato Justo»). Por cada día completo de interrupción imputable a GOXION se reconoce un descuento del 5% de la cuota del servicio afectado, hasta 50% en la modalidad de descuento. Si no se restablece, se ofrecerá solución equivalente consentida o reembolso proporcional de la parte no prestada, o saldo a favor si el cliente lo prefiere, evitando duplicidades y sin limitar derechos irrenunciables de reembolso.

**Vigencia y transparencia.** Versión, fecha efectiva, comunicación previa y aceptación verificable; no cambios retroactivos perjudiciales.

## Cambios técnicos pendientes — NO EJECUTADOS

1. Motor financiero global y B2: mora 5%/50% vigente debe migrarse con pruebas a la tasa aprobada, sin alterar saldos históricos ni periodos ya cerrados.
2. Prórroga automática B2 actualmente permite solo vencimiento original y hasta cinco días. El formulario tardío de PR #221 es aviso de soporte, **no** extensión financiera aprobada. Alinear reglas y UI antes de publicarlo como política de diez días.
3. El PR #221 todavía limita fecha tardía a siete días; deberá ampliarse a diez tras aprobación del flujo backend y términos.
4. Retiro desde sexto día: crear evaluación autenticada por servicio, verificación de comunicación, suspensión/baja reversible y auditoría; no borrar registros ni cortar servicios al corriente.
5. Garantía: conservar 5%/día y 50% de descuento; implementar flujo de incidentes, alternativa equivalente y reembolso/crédito sin duplicidad, con cálculo de días realmente no prestados.
6. Eliminar referencia a 20% de reactivación y regla de quince días en `ayuda.html` y cualquier proyección que la repita, solo al publicar el reemplazo coordinado.
7. Verificar la interacción con lealtad, pagos en revisión, parcialidades, calendarios distintos, garantías y saldos a favor.

## Puerta de publicación

Revisión jurídica de tasa, condiciones de suspensión, reembolso y consumidor; confirmación de negocio sobre mora tras prórroga; pruebas integrales y aceptación explícita de la versión final.
