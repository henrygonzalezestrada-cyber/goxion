# GOXION · Historial de movimientos — contrato visual y de datos

**Fecha:** 22 de noviembre de 2026. **Ámbito:** último módulo del feed «Mi Espacio».
**Estado:** propuesta de diseño en laboratorio, pendiente de evaluación visual del usuario. **Ningún cambio productivo en `ayuda.html`**, backend, pagos o servicios.

## Por qué sí tiene sentido

Se descartó la tarjeta separada «Próximos movimientos» porque repetiría lo que ya muestran Hero, Estado de cuenta, Servicios, Misiones, Lealtad, Referidos y notificaciones. **«Historial de movimientos» tiene otro propósito:** preservar una cronología consultable de **hechos registrados**; qué pasó, cuándo y cuál fue su resultado, incluso si un servicio ya no está activo. La UI de estado sigue mostrando el presente; el historial conserva el pasado.

**Propuesta de alcance:** pagos acreditados o con registro verificable; altas de servicio confirmadas; renovaciones/continuidad de cobertura **realmente confirmadas**; solicitudes de cancelación registradas y bajas efectivas, distinguiendo sus momentos. No mostrar promesas, vencimientos futuros o alertas pendientes como eventos ya consumados. Otros movimientos solo si existe contrato de evento confiable.

## Inventario de fuentes existentes y faltantes

| Categoría | Fuente real confirmada por código | Regla de integración |
| --- | --- | --- |
| Pagos | `assets/js/ayuda/02-client-supabase-layer.js` mapea `data.pagos` a `historial_pagos` con `id`, `fecha` (periodo), `fecha_pago`, `monto`, `estado`, `puntual`, `lealtad_efecto` y `racha_resultado` | Reusar el historial oficial y la lógica `gxPaymentHistoryMeta` de `01e-client-dashboard.js`. No confundir pago enviado, en revisión y acreditado. Evitar conteos y cobros duplicados. |
| Solicitudes de cancelación | `data.cancelaciones` del endpoint `cancelaciones-cliente` llega en el fetch de la capa cliente | Usar fecha de solicitud y resolución **solo cuando estén confirmadas**. Hoy el dashboard agrupa la solicitud más reciente por **servicio activo**, lo cual no garantiza conservar visibles eventos de servicios ya dados de baja. |
| Baja efectiva | El módulo de Servicios deja de mostrar el servicio una vez retirado del listado activo; contrato híbrido ordena conservar los comprobantes y el historial | Requiere marca fiable de baja efectiva/fecha y autorización para el historial; no inferirla por ausencia de servicio ni reemplazarla por la aprobación de una solicitud. |
| Alta de servicio | `data.servicios` se mapea a tarjetas por nombre, acceso, monto, etc. **No se expone fecha de alta en el objeto actual del dashboard** | Solicitar/consumir evento histórico persistido de alta (ID/timestamp/servicio). No inferir fecha a partir del primer pago. |
| Renovación | B2 dispone de datos de calendario y cobertura en lógica financiera, pero `GOXION_HIBRIDO_RENOVACIONES_V2.md` advierte **cobertura pagada ≠ próxima renovación**; no hay evento de renovación confirmado en la respuesta utilizada por el dashboard | Solo mostrarla cuando una operación de renovación tenga evidencia histórica real. **No generar renovaciones por cada pago** ni por proyección de corte, porque se duplicaría el mismo evento o se comunicaría cobertura no acreditada. |

**Contrato recomendado del evento de lectura (propuesto, NO existente):** `id` estable; `tipo` normalizado; `ocurrio_at`/fecha efectiva validada; `titulo` y resumen seguros; `servicio_id` opcional; `operacion_id` para deduplicación; `estado_final` cuando aplique; datos monetarios y `moneda` solo para eventos financieros; `fuente` trazable; acceso autenticado por la sesión del cliente. Misma transacción no produce doble elemento solo por reflejarse en varios módulos. No incluir contraseñas, PIN, correos o datos ajenos. No introducir escritor nuevo ni alterar el motor financiero.

## Prototipo visual

**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en `main`.
**Commits iniciales:** `ab9a8e9fbf3ccac0fab5d5a9288192483f9cba69` (módulo) y `73624b2f59fc86b62f6f18d908a22a0937164ae8` (alineación/foco).

- Sección «Historial de movimientos» **después de Servicios** y antes de la comparativa de Catálogo del laboratorio; reemplazaría el viejo Historial de pagos al integrar a la página real, **nunca convivirían ambos**.
- **Una sola superficie de cristal** idéntica al material aprobado `rgba(8,8,12,.371)` / blur 11.75px; filas horizontales limpias, iconografía funcional discreta y fecha bajo cada movimiento. Sin tarjetas de cristal por fila ni líneas coloreadas ornamentales; separadores neutros entre filas solo para organizar.
- **Tres entradas iniciales**; acción «Ver todos los movimientos» expande y «Mostrar menos» contrae. Filtro a demanda «Todos / Pagos / Servicios». Detalle breve dentro de la misma fila, abierto bajo demanda sin crear un modal.
- **7 operaciones ficticias** de pago, alta, renovación, solicitud de baja y baja efectiva, claramente marcadas «Ejemplo visual · Movimientos ficticios». No hay conexión a cuentas reales ni mutaciones de estado.
- Interacción accesible: botones nativos, atributo `aria-expanded`, `aria-controls`, foco preservado al expandir filas, altura táctil superior a 44px. Movimiento decorativo mínimo; respetar `prefers-reduced-motion`.

## Calidad, migración y guardas

1. Validar con el usuario el concepto visual en Safari real antes de considerar aprobación.
2. **Antes de integración productiva**, verificar las fuentes reales y los timestamps de todos los eventos (altas, renovaciones, bajas efectivas); si una categoría aún no está disponible, ocultarla sin inventar eventos o estados.
3. Reusar `historial_pagos` ya ordenado, `gxPaymentHistoryMeta`, los contratos de cancelación y el motor de ciclos oficial. **Jamás crear otro cálculo financiero en el navegador**.
4. Verificar permisos por cliente, paginación, orden, deduplicación y fecha efectiva; no presentar como 'renovación' un pago, una proyección o una cobertura vigente.
5. Probar en 280, 315, 360, 375, 390, 430 y 768px, además de Safari iPhone: textos largos, cifras MXN, sin movimientos, solo pagos, solo servicios, muchas entradas, filtros, focus/VoiceOver y reconexión.
6. Las tarjetas de Hero/saludo, Lealtad, Referidos, Misiones, Ahorro, Servicios y el Catálogo se mantienen intactas durante esta propuesta. No fusionar automáticamente PR #231 de Servicios ni cambiar `ayuda.html`.

**Decisión pendiente:** evaluar el laboratorio, confirmar si el usuario aprueba este diseño y después definir la fuente histórica de los servicios faltantes antes de la implementación oficial.
