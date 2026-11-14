# GOXION Admin · Rediseño 2026 — Documento maestro

**Inicio:** 13 de noviembre de 2026 (America/Mexico_City)  
**Estado:** DISEÑO EN REVISIÓN, NO APROBADO  
**Rama:** `design/admin-mobile-first-2026-11`  
**Primer entregable:** `preview/admin-mobile-first/index.html`  
**Producción:** `admin.html` y `main` intactos.

## Decisión excepcional: nueva dirección visual

Por autorización expresa del propietario, se permite un nuevo rediseño del panel **Admin**. Esto excepciona únicamente las instrucciones anteriores de **no reorganizar ni rediseñar Admin**, presentes en `AGENTS.md`, `docs/GOXION_VISUAL_CONTRACT.md` y `docs/ADMIN_FUNCTION_REGISTRY.md`. **Las demás reglas siguen vigentes**, sobre todo propiedad funcional, seguridad, continuidad B2, pruebas, rollback y limpieza técnica. Las instrucciones visuales anteriores no se borran ni se declaran sustituidas hasta que el nuevo diseño sea aprobado y migrado.

## Objetivo

Experiencia de administración **mobile-first, moderna, clara y consistente**, evitando una interfaz dentro de otra. No se construye un sistema nuevo; se rediseña la presentación y navegación del existente.

### Prioridades

1. **Tarjetas de clientes:** conservan identidad, estado, servicios, cobro y acceso al expediente; reciben mayor jerarquía y claridad. Un expediente único con Cobro / Servicios / Beneficios / Cuenta.
2. **Operaciones:** bandeja centrada en decisiones; agrupa Pendientes / Pagos / Solicitudes / Actividad en lugar de ofrecer entradas repetidas o herramientas dispersas.
3. **Calendario B2:** lectura y edición se integrarán visualmente en Servicios, sin iframe de apariencia ajena, motor paralelo ni recalcular importes desde frontend. El contrato funcional actual queda intacto.
4. **Móvil prioritario:** sin barra flotante inferior (decisión previa del propietario); navegación segmentada compacta superior, objetivos táctiles, sin scroll lateral ni modales anidados.
5. **Diseño:** sistema coherente de tipografía, densidad, color, estados y componentes. Evitar neon excesivo, sombras decorativas, métricas inútiles o estética genérica de IA.

## Qué cambia / qué no cambia

| Sí | No |
|---|---|
| Jerarquía, composición, menú, tarjetas, bandeja y estilos de Admin | Lógica financiera de B2, V1, pagos, calendarios, cancelaciones |
| Accesos contextuales y flujo visual más directo | Endpoints Edge, RPC, permisos, datos, Supabase, Index, Ayuda |
| Normalización de componentes redundantes tras identificar dependencia | Nuevos escritores y nuevas reglas comerciales |
| Sustitución de CSS/UI obsoleta con pruebas | Parches CSS sin propiedad ni retirada del legado |

**Múltiples entradas a una operación oficial están permitidas; múltiples implementaciones de la operación no.** Nunca duplicar un motor ni cambiar su resultado para satisfacer una propuesta visual.

## Primer entregable — concepto 01

`preview/admin-mobile-first/index.html` es un **prototipo autónomo, estático y sin conexiones a backend**:
- Datos ficticios de 4 clientes, importes y acciones ilustrativos.
- Interacción de navegación superior, búsqueda, filtros de clientes y Operaciones.
- Detalle en **una sola hoja contextual** con cuatro secciones; calendario por accesos representado en Servicios sin editores funcionales.
- Layout adaptativo para móvil y escritorio; estados visibles y navegación con controles nativos.
- Sin dependencias JavaScript externas; sin almacenamiento ni acceso a API.
- Sin aprobaciones, cancelaciones, credenciales o pagos reales.
- **No reemplaza** el antiguo `preview/admin-rediseno/`; su retirada deberá decidirse cuando haya un diseño aprobado. No se despliega ni modifica el Admin real.

Este concepto busca una dirección diferente tanto del Admin oficial neón oscuro como de la propuesta histórica "Papel" (beige/verde). Usa superficies minerales claras, tinta oscura y acentos azules contenidos. **Aún necesita validación visual del propietario; no asumir aprobación.**

## Método de ejecución acotado

1. Diseñar y probar el primer corte de Inicio, Clientes y Operaciones en esta rama aislada.
2. Obtener decisiones concretas del propietario sobre densidad, paleta, ficha y navegación; corregir una sola vez por observación identificada, sin diagnóstico general repetitivo.
3. Preparar mapa de integración **solo para componentes que cambian**: ID, controlador existente, flujo, función dueña, riesgo.
4. Integrar gradualmente en el Admin real **dentro de esta rama**, sin bifurcar renderizadores de negocio ni incorporar un segundo B2. Probar pruebas de humo y flujos autenticados antes de proponer merge.
5. Registrar CSS/JS obsoleto retirado, permisos, pruebas y rollback. Promover a `main` únicamente tras aceptación explícita y QA.

## Reglas de continuidad

- Leer `AGENTS.md`, `docs/GOXION_VISUAL_CONTRACT.md`, `docs/ADMIN_FUNCTION_REGISTRY.md` y los archivos reales que se editarán.
- Preservar obligatoriamente `docs/GOXION_HIBRIDO_RENOVACIONES_V2.md`, `docs/CANCELACION_EFECTIVA_OFICIAL.md` y la fuente vigente de motor de cobros.
- **No confundir concepto con integración**: las cifras y servicios del preview son completamente ficticios.
- Verificar ancho 280, 320, 360, 375, 390, 430 y 768 px, desktop, teclado, foco, Safari real, sin scroll horizontal. Las pruebas en navegador real **siguen pendientes** para el primer concepto.
- No reabrir diagnósticos financieros resueltos sin evidencia de regresión nueva.
- Proponer un único cambio coherente a la vez. Resolver bloqueadores concretos, no rediagnosticar la plataforma completa.

## Estado e inmediato siguiente

- [x] Regla de rediseño interpretada y protegida del contrato financiero.
- [x] Rama aislada creada desde `main`.
- [x] Primer concepto interactivo construido, sin conexión a datos reales.
- [ ] Validación visual móvil/desktop y revisión de estados.
- [ ] Opinión y aprobación del diseño por propietario.
- [ ] Mapa de integración con controladores reales.
- [ ] Implementación sin duplicación en Admin, QA y eventual PR de integración.

**Siguiente acción:** validar el concepto en móvil, corregir desbordes y someter a revisión de dirección artística. No tocar producción.
