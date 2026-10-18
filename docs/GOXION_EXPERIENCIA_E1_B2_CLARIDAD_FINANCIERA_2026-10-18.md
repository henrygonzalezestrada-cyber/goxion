# GOXION · Experiencia del cliente · E1/B2 — Claridad financiera y comprobantes
**Fecha:** 18/oct/2026 · **Estado:** primera beta en espejo para revisión, NO aprobada · **Bloque anterior:** E1/B1 V6 APROBADO visualmente por el propietario.

## Propósito
Responder sin ambigüedad «qué debo pagar», «cuándo vence», «por qué ese importe» y «qué pasó con mi comprobante». No desplegar un nuevo motor financiero: F0–F5 B2 ya existen (ver \`docs/GOXION_ESTADO_Y_LECCIONES_2026-10-14.md\`). Es una fase de presentación y claridad del autoservicio.

## Recorrido obligatorio y propiedad visual
1. **Mi Espacio / Ayuda:** mantener 100 % la tarjeta dinámica, Gixys sin integrar prematuramente, campana, misiones, cápsulas y ribbon V6 del E1/B1 aprobado. Resumir siguiente obligación auténtica y su fecha; enlazar desde la cápsula de estado de cuenta existente, sin mostrar total de todo el período como próxima cuota.
2. **Index:** reutilizar sus propios componentes: \`.sticky-area\`, \`.balance-hero\`, \`.time-badge\`, \`.services-container\`, \`.breakdown-box\`, y CTA «Ya realicé mi pago». El detalle financiero y reporte pertenecen a Index; no convertir Ayuda en otra pantalla de pago.
3. **Estados del comprobante:** «Recibido/en revisión» no es «Acreditado»; sin dobles invitaciones de pago. «Observado» señala que falta corrección. «Aprobado» actualiza únicamente las obligaciones cubiertas y desplaza el próximo pendiente.
4. **B2 multifecha:** agrupar obligaciones con la misma fecha efectiva y distinguir «próximo», «todo junto» y «servicio individual». Prórroga válida desplaza fecha; mora solo desde valor confirmado del motor. Desglose usa importes oficiales y conceptos servidor; lealtad, abonos y descuentos conciliados.
5. **Fallo cerrado:** si no existe cotización autenticada y conciliada, no mostrar una cifra inventada ni permitir reporte global potencialmente incorrecto. Cliente de fecha única sigue con su circuito actual.
6. **No rediseñar Admin ni tocar su CSS.** Ayuda usa Poppins/CSS propios; Index Poppins/Index CSS y jerarquía ya aprobada. Sin bloques genéricos, sin scroll horizontal, sin contadores o IDs técnicos expuestos.

## Beta de revisión
\`preview/experiencia-financiera-espejo/index.html\` toma el DOM de Ayuda del espejo B1 V6 aprobado. Al pulsar la cápsula de estado abre \`estado.html\`, que representa Index usando \`assets/css/index.css\` oficial y datos de \`fixtures.js\` inventados, auditados en centavos. El laboratorio flotante está cerrado por defecto. **No hay llamadas de red a Supabase, clientes.json ni Discord; no se guardan CLABEs, tokens, cupones ni datos reales; no se envían comprobantes.** El control «Simular comprobante recibido» es una transición visual sin operación ni acreditación.

Escenarios: pago sencillo, fechas distintas, vencimiento compartido, primer servicio liquidado, abono ya aprobado, recibido/en revisión, observado, vencido con mora **prefijada ficticia**, prórroga, liquidado, sin cotización y sin servicios. Las cifras solo demuestran jerarquía: no son oferta, cuenta real ni cálculo habilitado para el cliente.

## Criterios de aceptación
- Revisar en Safari iPhone **Ayuda → Index**, sin comparar solo tarjetas sueltas.
- 280/320/360/375/390/430/768 px, pantalla y modal sin desplazamiento lateral ni control oculto; atención al encabezado fijo y al botón de pago.
- Comprobar: primera cuota no confunde con total, segunda obligación aparece al liquidar primera, estado de comprobante se entiende, saldo no verificado bloquea, prórroga no presenta mora inventada.
- QA automatizada Chromium/WebKit y ausencia de efectos secundarios. **La prueba de navegador no equivale a aceptación de calidad visual en el iPhone real.**
- La beta puede ajustarse y cerrarse visualmente sin lanzar producción. El Issue #142 conserva el embargo de despliegue conjunto de todas las mejoras hasta instrucción final expresa.

## V2 · Pulido visual solicitado (18/oct/2026)
El usuario revisó la beta original y confirmó que los flujos de cobro y comprobantes funcionan, pero señaló exceso de texto y un aspecto demasiado genérico. **No es aprobación de B2.** Esta variante modifica exclusivamente la comunicación del estado del comprobante dentro del espejo de Index: barra de progreso animada y accesible, etapas Recibido / Revisión / Validado, estado de corrección identificado sin fingir que el pago avanzó, encabezado y microcopy compactos, transición con `prefers-reduced-motion`. Sin cambios de cifras, plazos, selección financiera, cobros ni página oficial. Mantener V1 hasta publicar V2 de beta con suite Chromium/WebKit confirmada. Nueva revisión visual en iPhone pendiente.
