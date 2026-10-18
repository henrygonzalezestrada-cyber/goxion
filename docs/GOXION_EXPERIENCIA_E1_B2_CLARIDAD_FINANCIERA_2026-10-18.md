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


## Revisión E1/B2 · V2 · Feedback 18/oct/2026
El propietario probó la primera beta, confirmó que **todo funciona**, pero **NO aprobó el bloque** por textos excesivos que dan sensación de maqueta genérica. Solicitó animaciones con sentido, como barras de progreso. Mantener importes, estados, rutas y cálculos ficticios actuales; mejorar solo comunicación visual. **No reabrir E1/B1 V6, ya aprobado.**

En V2:
- Estado del comprobante compacto con línea/timeline de tres etapas (recibido → revisión → aprobación). En revisión, la barra solo avanza hasta la etapa actual: **no promete ni simula aprobación**. Observado mantiene la etapa de corrección destacada con ámbar, sin marcarla completada. Aprobado solo cuando el escenario está realmente validado. Barras representan etapas de revisión, no duración o probabilidad.
- Mensajes cortos: recibido «Ya lo tenemos. No lo envíes de nuevo.»; observado «Revisa el comprobante para continuar.»; aprobado «Este pago ya se aplicó. Tu siguiente fecha sigue vigente.» La jerarquía comunica con tipografía y animación breve, evitando párrafos artificiales.
- Un indicador de servicios liquidados aparece **solo** cuando existe al menos uno pagado y otro pendiente. Numerador/denominador exactos: p.ej. 1 de 2. No confundir con porcentaje de pago parcial ni con lealtad. No se crea tarjeta extra.
- Recursos de preview versionados en e1b2v2, transparencia de demo intacta, reduced motion, sin tocar index.css ni el Index real, backend ni datos de clientes.

**Criterios de QA nuevos:** se comprueban las tres etapas, la distinción revisión/corrección/aprobación, el contador 1/2, imports fiables, laboratorios ocultos y ausencia de llamadas privadas. Aún requiere prueba/aceptación visual del propietario en iPhone; únicamente tras su aceptación se cerrará E1/B2.

## Index Remaster · R1 + R2 + R3 integradas (18/oct/2026)
**Decisión del propietario:** unificar auditoría R1, remaster R2 y beta R3 en una entrega; R4 será solo el pulido visual final. E1/B1 V6 sigue aprobado, E1/B2 aún no.

### R1 — auditoría y dueños
- Index oficial no es HTML estático: index.html carga assets/css/index.css y assets/js/index/02-02-inline.js, que genera .sticky-area, .balance-hero, .scrollable-content, .card-info, servicios, desglose, lealtad y acciones. No montar un segundo encabezado: reutilizar el existente.
- B2 multifecha real usa preview/integracion-b2/index.html con b2-bridge.js/index-adapter.js, cotizaciones confiables, calendarios por cargo, selección próximo/todo/individual y prueba/aprobación de comprobantes; NO tocar esa lógica o recalcular moras, descuentos, prórrogas, lealtad ni abonos en el remaster.
- El video del propietario evidenció duplicación de revisión/recibido/observación en cabecera, calendario, tarjeta de comprobante y nota inferior. También exceso de superficies de cristal y hero sobredimensionado al desplazar.

### R2 — diseño en espejo sin cambiar negocio
- Una sola .sticky-area y un solo importe real del caso simulado: scroll gradual comprime el hero de 130 a 43 px, el importe de 52 a 26 px, mueve la cápsula a la izquierda y la cantidad a la derecha, preservando gradiente oscuro, sticky, safe-area y reduced-motion. No crear header flotante duplicado.
- Estado principal único en cápsula breve; progreso de comprobante se ubica inmediatamente debajo del hero y solo ilustra etapas. «En revisión» no vuelve a aparecer como advertencia repetida al final; «Requiere corrección» no se presenta como aprobado; el importe siguiente sigue independiente del total del periodo.
- Identidad y lealtad pasan a filas con separadores finos; servicios conservan una superficie cristal, calendario y desglose son flujo continuo sin cajas anidadas. Se mantienen CTA, control expandible y acciones de selección.
- Transiciones intencionales: scroll acoplado con inercia discreta, actualización del número sin interferir con su posición, aparición breve del resultado desglosado, timeline de comprobante sobrio sin pulsos eternos. No copiar estilos de Admin.

### R3 — beta protegida y pruebas
- Solo vista aislada preview/experiencia-financiera-espejo/estado.html, estado.css, estado.js y check.mjs + este documento. Fixtures falsos en centavos, sin sesiones, información privada, banco, backend ni cobros. Ayuda B1 intacta.
- QA dedicada en Chromium y WebKit: siete anchos 280/320/360/375/390/430/768, doce estados incluyendo fechas múltiples e iguales, parcial confirmado, mora, prórroga, revisión/observación, aprobado, sin saldo, sin servicios; exactitud de importes/selecciones, no overflow, scroll morph real reversible, cero cambios de backend. Safari físico a confirmar por el dueño.
- Index oficial, flujo bancario Nu/Revolut/CLABE, modal/upload seguro y motor B2 quedan intactos. Cualquier futura integración oficial exige auditoría de esos puntos sobre código dinámico antes de aplicar el diseño.

**R4 pendiente:** revisión visual final del dueño (morph, estado y ledger) y solo correcciones de acabado. No fusionar estas mejoras en Index/Ayuda oficial hasta aprobación del paquete y autorización final del Issue #142.
