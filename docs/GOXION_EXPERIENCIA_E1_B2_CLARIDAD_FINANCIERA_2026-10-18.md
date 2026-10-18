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

## R4 — último pulido visual solicitado · 18/oct/2026
El propietario aprobó la dirección visual R1–R3 y **el morph del importe**; pidió cerrar R4 como una sola beta antes de decidir la aprobación del Bloque 2.

### Correcciones finales acotadas
- **Morph de cabecera:** conservar el movimiento ya aprobado y recolocar el precio **a la izquierda** y la cápsula del estado **a la derecha** durante el scroll compacto. Ambos deben formar un par de tamaño contenido, con separación pequeña calculada por ancho real del texto y sin desbordarse a 280 px. La versión expandida conserva precio grande y cápsula inferior como en Index.
- **Seguimiento del comprobante:** mantenerlo arriba sin tarjeta extra y representar recepción → análisis → decisión con un único recorrido de luz curva y tres estaciones vectoriales. El trazo se completa hasta la etapa REAL, no representa tiempo ni probabilidad; revisión solo hasta el centro, observación mantiene el último nodo en ámbar sin aprobación y aprobado ilumina el recorrido completo. Textos muy breves; no repetir estado arriba, dentro y abajo.
- **Restaurar dos tarjetas útiles:** identidad (titular, folio y periodo) y desglose conciliado se muestran de nuevo en cristal premium ligero. Calendario continúa integrado con divisores finos y funcionalidad intacta; NO regresar a cajas anidadas en cada sección.
- **Lealtad protagonista:** un SVG vectorial de estrella dorada en un halo suave rodeado por anillo con llenado animado en relación con la racha explícita de ejemplo (3 de 4, 7 de 9, etc.). Mostrar una cifra de racha solo si viene de **un estado confiable explícito**; la beta usa metadatos SIMULADOS en fixtures.js, separados del dinero y claramente etiquetados como ilustrativos. Cuando la racha se pierde, sustituir la estrella por corazón roto vectorial y motivo breve; NO mostrar progreso circular. Si no hay estado de racha, ocultar todo el indicador. La integración oficial tendrá que vincularlo con el dueño de lealtad del servidor; nunca inferir pagos puntuales de servicios, recargos, abonos o porcentajes.
- Animaciones suaves, sin pulso agresivo ni cápsulas extra. Respetar reduced-motion y desplazamiento reversible. Mantener los 12 escenarios financieros y 7 anchos en Chromium + WebKit; agregar verificaciones del orden y proximidad precio/cápsula, las dos tarjetas recuperadas, ruta con SVG curvo, rama de racha perdida, ausencia de progreso inventado y accesibilidad ARIA del anillo.

### Resguardos de alcance
- Solo archivos dentro de preview/experiencia-financiera-espejo/ y esta nota. **Index, Ayuda, Admin, Supabase, endpoints financieros, pagos, comprobantes reales y Goxy/Gixys no se tocan**.
- El Bloque 2 permanece **PENDIENTE DE OK DEL PROPIETARIO** sobre esta beta R4; B1 V6 sigue aprobado. Sin despliegue global hasta Issue #142 y autorización expresa.

## R5 — segunda revisión visual del remaster · 18/oct/2026
Propietario: el morph funciona y gusta, pero señala aire entre «Estado de cuenta» y el contenido, dos tarjetas con tinte azul incorrecto, recorrido de estados de pago insatisfactorio y estrella/corazón poco profesionales; pidió investigar animate-ui.com y **usar los componentes reales sin imitarlos**.

### Auditoría de referencias y compatibilidad
- Animate UI: https://animate-ui.com/docs ; componentes originales React 19 + Motion, copiados desde el registro de icons v2 `imskyleen/animate-ui` en `apps/v2/registry/icons/{star,clock,circle-check,circle-x,file-check}/index.tsx` sin cambios. Componentes montados en isla independiente dentro de una página vanilla. *No copiar visualmente un icono CSS inventado.*
- Progreso: usar el **Progress.Root/Track/Indicator real** de `@animate-ui/react/primitives/base-ui/progress` con transiciones spring de su API y estados semánticos de la cotización; revisión 2/3 ≠ porcentaje de aprobación. No usar nodos curvos/estaciones dibujadas propias.
- Lealtad: `Star` original Animate UI animado con Motion y anillo vectorial Motion asociado a avances *explícitos* ficticios; cuando hay pérdida mostrar `HeartCrack` genuino de lucide-react (porque Animate UI no tiene ese icono en su catálogo), sin dibujarlo a mano ni usar emoji. El ícono de pérdida no representa porcentaje.
- Licencia original MIT + Commons Clause y procedencia están en `preview/experiencia-financiera-espejo/animate-ui-src/NOTICE.md`; no redistribuir módulos como componentes individuales vendibles, solo embebidos en esta web.
- Index NO es React: se mantiene la página base `assets/css/index.css` y su `estado.js` vanilla, y solo se monta `animate-ui-native.bundle.js` compilado para las dos secciones visibles. Bundle independiente, autopublicado, sin CDN de React o peticiones externas ni migración de negocio a React.
- Cristal de Ayuda AUTÉNTICO: `assets/css/ayuda.css` define `--card-glass: rgba(8,8,12,.25)` + `backdrop-filter: blur(10px)` + `border:1px solid rgba(255,255,255,.08)` + sombra `0 10px 30px rgba(0,0,0,.4)` + radio `20px`. Solo se trasladan esas variables a las tarjetas de identidad, servicios y desglose; la transparencia produce interacción con las luces del fondo a través del blur, NO se aplica un tinte azul ni se copia toda la hoja de Ayuda.
- Encabezado: mantener el morph R3–R4 aprobado, pero reducir alto expandido y separación entre título/importe/resto en su mismo DOM; no hacer una nueva barra flotante.

### Integración y QA
- No tocar Index oficial, Ayuda oficial, motor de pagos B2, Supabase, credenciales ni datos personales. Las cifras son fixtures sintéticos conciliados en centavos; su racha es metadato de ejemplo, no inferencia financiera.
- El workflow de beta instala React/Motion/@animate-ui/react, compila la isla **autocontenida** y comprueba 7 anchos × 12 estados en Chromium/WebKit antes de guardar el bundle como recurso estático. No se publica una beta sin pasar las dos suites.
- Bloque 1 V6 aprobado; Bloque 2 **aún pendiente de aprobación visual**. Esta es una nueva iteración específica de R4, no una fase funcional o un cambio de negocio. No activar oficial hasta autorización final (Issue #142).

## R5.1 · Último ajuste del encabezado (18/oct/2026)
El propietario aprobó **toda la estética y funcionamiento de R5** y solicitó un solo ajuste preciso: cuando desaparece la subetiqueta del importe (“Próximo pago”/“Importe pendiente”), el monto y la cápsula deben aprovechar mejor el espacio debajo de “Estado de Cuenta”. No cambiar el tamaño del importe, su distribución horizontal, los estados, Animate UI, cristal, tarjetas, lealtad ni la lógica financiera.

Se añade únicamente una recuperación progresiva de hasta **7 px** cuando el subtítulo desaparece durante el scroll. El estado expandido permanece idéntico; el ajuste desplaza **monto y cápsula juntos** y reduce la reserva de altura del hero, sin crear saltos ni dejar otro espacio vacío. Se prueba la geometría de ambos estados en Chromium y WebKit, siete anchos y doce escenarios; el equipo financiero original sigue intacto. R5.1 beta pendiente de la última aprobación del propietario; **nada en Index oficial** hasta cierre global autorizado por Issue #142.


## Cierre visual E1/B2 · Flecha real de Ayuda (18/oct/2026)

Tras aprobar explícitamente el remaster Index R5 y la mejora R5.1 del espacio del encabezado, el propietario pidió una sola última corrección: **sustituir la flecha de «Calendario de pagos» por la misma flecha transformable de Ayuda**; confirmó «Así es» y su intención de dar por concluido el Bloque 2 con ella.

### Fuente exacta y contrato
- Source of truth: `assets/js/ayuda/09-morphicons-production-script.mjs` y `assets/css/ayuda.css`. El icono no gira por CSS: **Morphicons 1.5.0** transforma el trazo SVG mismo con `createMorph(path, initial, {reducedMotion:"user"})`, y transición `morphTo(icon,"snappy")`.
- Formas idénticas a Ayuda: abajo `M6 9l6 6 6-6` y arriba `M6 15l6-6 6 6`, viewBox `0 0 24 24`, tamaño 21×21, stroke 2.45 redondeado, cian `#62ecff` cerrado y violeta `#9b91ff` abierto. La apertura/cierre sigue controlada por `aria-expanded` del botón original; no cambia el calendario ni su lógica.
- Se incorpora el mismo paquete `morphicons@1.5.0/dom` al bundle estático **solo del preview**; sin CDN nuevo, sin reescribir Animate UI ni crear un icono aproximado. Las pruebas validan el morph real del path, acceso por teclado/lector, cero rotación falsa, ida y vuelta en múltiples anchos.
- **No tocar más nada**: conservados R5.1, precios, fechas múltiples, comprobantes, descuentos, mora, lealtad, identidad, cristal, scroll y CTA. Ningún cambio en `index.html` oficial ni `ayuda.html`, Admin o motor B2.

**Hito:** E1/B2 aprobado visualmente por el propietario sujeto a completar esta corrección comprobada. Se registra el cierre al pasar QA Chromium + WebKit y publicar únicamente el espejo. **Aprobación visual no significa lanzamiento oficial**: el embargo del paquete integral sigue bajo Issue #142.
