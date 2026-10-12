# GOXION · Guía para cualquier asistente que trabaje en el repositorio

**Antes de proponer, editar o integrar cambios, leer en este orden:**

1. `docs/GOXION_VISUAL_CONTRACT.md` — identidad de Admin, Ayuda/Mi Espacio e Index, retículas y QA responsive.
2. `docs/ADMIN_FUNCTION_REGISTRY.md` — funciones existentes, propietarios, flujos y prohibiciones de duplicación.
3. `docs/CALENDARIO_FINANCIERO.md` y `docs/GOXION_MULTI_DATE_ROADMAP.md` cuando el trabajo se refiera a fechas, obligaciones o pagos.
4. Los HTML/CSS/JS **reales del módulo que se va a modificar**, antes de decidir componentes o estilos.
5. `README.md` y `package.json` para el flujo de revisión y pruebas.

## Invariantes de trabajo

- **Tres experiencias, no una plantilla compartida.** Admin: operaciones; Ayuda: cliente/descubrimiento/Mi Espacio; Index: estado de cuenta/pagos. No copiar estructuras, CSS ni tipografías entre ellas. El motor de negocio sí es compartido.
- Conservar la arquitectura actual y los flujos aprobados. No reorganizar Admin por cuarta vez ni crear formularios repetidos para operaciones ya existentes.
- Reusar el motor financiero oficial, seguridad y persistencia del backend. Admin ya puede **guardar fechas por acceso X2** con auditoría, pero el cálculo monetario continúa en **simulación**: no presentarlo como deuda real del cliente ni como cobro acreditable.
- **Compactación inteligente:** campos cortos relacionados juntos si caben; componentes largos a ancho completo. Ocultar información secundaria detrás de un control explícito. Los cambios de estado nunca deben desorientar ni sacar al usuario de donde estaba.
- Antes de entregar una interfaz, verificar con pruebas responsive y funcionales. No declarar aprobado un resultado que no se comprobó en Safari real.
- Corregir el componente dueño del problema y agregar regresión; evitar CSS global de último minuto y duplicación de handlers.
- Mantener los cambios limitados al alcance solicitado; documentar cualquier dependencia necesaria.

## Continuidad entre chats

Este archivo y los documentos enlazados constituyen la referencia **persistente** del proyecto. En una conversación nueva, indicar: «Abre el repo GOXION, lee AGENTS.md y el contrato visual antes de trabajar». El asistente debe volver a leerlos; los nuevos chats no cargan automáticamente archivos externos.
