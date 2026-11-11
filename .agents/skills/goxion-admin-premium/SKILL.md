---
name: goxion-admin-premium
description: Auditoría y mejoras visuales premium del Admin existente de GOXION sin estética genérica de IA ni cambios al motor financiero. Usar cuando se revise, diseñe o codifique la interfaz administrativa.
---

# GOXION Admin · Premium Design

## Activación y límites

Esta guía es **específica de GOXION**, no un reemplazo del contrato visual. Antes de editar, revisar `AGENTS.md`, `docs/GOXION_VISUAL_CONTRACT.md`, `docs/ADMIN_FUNCTION_REGISTRY.md`, `admin.html`, `assets/css/admin.css`, `assets/js/admin/`.

- No tocar producción ni API financiera durante una tarea visual.
- El frontend NO calcula dinero, descuenta pagos ni determina el régimen B2. Consume un único estado financiero autorizado por el backend.
- Respetar la navegación, ficha, patrones de interacción y tipografía Rajdhani de Admin; mantener las tres experiencias diferenciadas.
- No reorganizar la aplicación por inspiración externa sin una propuesta explícitamente aceptada.
- No tocar CSS de Index/Ayuda ni cambiar animaciones aprobadas en Index.

## Método obligatorio en siete pasos

1. **Auditar antes de construir.** Identificar el problema real con código, jerarquía y pantallas existentes. Registrar qué elementos conservar y qué obstáculos tiene el usuario.
2. **Diseñar para tareas.** Primero aprobar pagos, consultar vencimientos, distinguir servicios vigentes/históricos, resolver cancelaciones y encontrar clientes. Cada visual debe apoyar una decisión; no decoración por decoración.
3. **Dirección intencional.** Elegir un concepto visual que tenga sentido para la operación de GOXION; definir escala tipográfica, densidad, espaciado, color semántico, estados, sombras, bordes y uso de iconos. No copiar exactamente AdminLTE, Tabler u otra plantilla.
4. **Evitar lo genérico de IA.** Descartar hileras de tarjetas idénticas sin jerarquía, gradientes morados por defecto, brillo excesivo, badges en cada esquina, glassmorphism indiscriminado, íconos emoji por decoración, títulos vacíos y animación idéntica en todos los módulos. Mantener lo que ya pertenece a la marca si aporta valor.
5. **Detalles funcionales.** Mostrar saldos con período y fuente verificados, estados pendientes/liquidados explícitos, información histórica separada, vacíos guiados, errores accionables, validación de formularios, confirmaciones antes de operaciones irreversibles y atención a estados de carga.
6. **Movimiento con motivo.** Animar respuestas a interacciones, no llenar la interfaz de desplazamientos/revelados. Mantener foco/scroll y evitar parpadeos en actualizaciones realtime. No usar easing/duración arbitrarios; establecer una escala coherente y respetar `prefers-reduced-motion`. No obstaculizar tareas críticas.
7. **Criticar y comprobar.** Revisar capturas, flujo de teclado, contraste, objetivos táctiles, tamaños 280/320/360/375/390/430/768 px, iOS Safari, teclado virtual, `safe-area`, modal, tabla y estados exitoso/error. Comparar antes/después y rechazar cambios si degradan claridad o comportamiento.

## Preguntas de revisión

- ¿Un administrador encuentra inmediatamente el saldo correcto de cada vencimiento?
- ¿Se distingue sin ambigüedad el servicio vigente del cancelado, con su historial a salvo?
- ¿Puedo justificar cada color, borde, imagen, animación y tarjeta por una necesidad real?
- ¿El nuevo Admin todavía se reconoce como GOXION o parece otra plantilla?
- ¿La vista sirve igual con datos reales largos, sin conexión, error, lista vacía, móvil estrecho y lector de pantalla?
- ¿Los cambios dejan intactos Index, Ayuda y el motor financiero?

## Salida esperada de una tarea futura

Primero describir **problemas observados, dirección estética, alcance exacto y riesgos**; después implementar cambios pequeños y verificables en rama aparte; terminar con evidencia de pruebas y lo que NO fue comprobado. No afirmar que un diseño es "premium" como sustituto de evidencia visual/funcional.

## Bibliografía de referencia

Consultar `docs/ADMIN_SKILLS_PREMIUM_2026-11-11.md` para las fuentes verificadas (Impeccable, UI/UX Pro Max, frontend-design, Hallmark, Taste Skill, Emil Kowalski, Vercel). Son fuentes de principios; se debe revisar cualquier código de terceros antes de ejecutarlo.
