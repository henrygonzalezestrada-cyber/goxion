# GOXION · Beta conjunta: Bloque A + Fase 1 Gixys

**Estado:** laboratorio visual funcional, aislado y todavía no aprobado en Safari físico. Entrada: [index.html](index.html).

## Alcance y relación

**Bloque A** define las microinteracciones de Misiones, Lealtad y Notificaciones. **Fase 1** define las formas, colores y personalidad animada de los Gixys. Se realizan en la misma beta para evitar un doble rediseño.

| Contexto | Prueba | Gixy | Origen funcional para una integración futura |
| --- | --- | --- | --- |
| Misiones | Barra 2/3→3/3, palomita elástica y reinicio | Hex | 01e-client-dashboard.js, 05-gamification-shared-morph-js.js y progreso real de gamificacion |
| Lealtad | Corazón con dos pulsos, barra 3/4→4/4 y reinicio | Circle | Estado financiero oficial y barra loyalty-bar; jamás acreditar pagos en frontend |
| Notificaciones | Campana, aviso, descarte, leído y reinicio | Square | 04-client-notifications-realtime.js y bandeja ya existente |

**Los números, las acciones y los mensajes son simulaciones visuales**, no operaciones de una cuenta real. La beta no lee tokens, contraseñas, clientes, notificaciones o estados financieros. No utiliza Supabase, Groq, WhatsApp ni Discord.

## Contrato Gixys v1

- Goxy conserva todo su protagonismo, renderizador y animación de carga actuales.
- Hex (morado): misiones; Square (cian azulado): avisos; Circle (lavanda): lealtad.
- Mismo cuerpo redondeado, sombreado volumétrico y ojos, con estados compartidos idle, working, sleeping y celebración temporal al tocar.
- Gixys en acciones puntuales, sin invadir el estado de cuenta ni añadir otra conversación o asistente IA.
- Implementación **original de Canvas 2D**, inspirada en las formas mostradas en libraries.dev/bots, no una copia ni instalación del paquete externo. La comparación física y de suavidad con la referencia original sigue pendiente.
- Animaciones de reposo discretas y reacciones cortas; no mantener seis elementos saltando constantemente.

## Fronteras de producción

- Toda la implementación queda bajo la carpeta preview/gixys-micro-v1/; no se cambian Ayuda, Index, Admin, Supabase ni fuentes compartidas.
- No se modifica el morph aprobado de Misiones; el próximo paso solo engancharía un evento **confirmado** del módulo propietario.
- No instalar React ni duplicar componentes de notificaciones/lealtad ni alterar el diseño de la X cian.
- CSS adaptado a GOXION: Poppins, negro profundo, cristal/blur sobrio, morado y cian.
- Canvas se pausa fuera de vista y en segundo plano; respeta prefers-reduced-motion. Controles de prueba tienen nombres accesibles.

## QA pendiente antes de cualquier integración oficial

1. Comprobar el preview físicamente en Safari iPhone, principalmente 280, 320, 360, 375, 390, 430 y 768 px; revisar scroll lateral y recortes.
2. Probar cada acción y Repetir animación. Confirmar que una acción doble no duplica la simulación ni deja estados incongruentes.
3. Probar cambios Reposo/Activo/Descanso, toque y seguimiento de ojos de los tres Gixys; contrastar la naturalidad con la biblioteca original.
4. Activar reducción de movimiento, VoiceOver, teclado y segundo plano. Medir fluidez en iPhone.
5. Una vez aprobado, integrar de manera localizada en Misiones, Lealtad y Notificaciones mediante sus controladores oficiales, sin crear estados, beneficios o avisos ficticios.
6. El fallo previo de Browser smoke de Soporte está documentado en [issue #128](https://github.com/henrygonzalezestrada-cyber/goxion/issues/128); es un problema independiente de esta beta.

**La fase 2 (integración en Ayuda oficial) NO está autorizada por la existencia de esta beta.**
## V2 · Correcciones aprobadas para evaluar (16/oct/2026)

- Gixys **sin boca** en ningún estado: expresiones con ojos, párpados, miradas y postura.
- Cuerpo con iluminación móvil, giro en profundidad, compresión, inclinación y salto; imitamos el comportamiento de la referencia sin instalar React ni cambiar Goxy. No afirmar fidelidad idéntica a la biblioteca hasta inspección física.
- En los tres escenarios los Gixys son **capas flotantes absolutas** sobre una zona lateral libre, no parte de una fila de contenido; el espacio de texto se calcula para que no se solapen.
- Corazón de lealtad restaurado a rojo rosa `#ff4d6d` original de Pulse Heart; conserva sus latidos.
- Botón del laboratorio dice «Probar llegada de un aviso» y deja de usar el símbolo confuso. En producción será un evento real, no un botón extra.
- Pruebas extendidas: 7 anchos, no solapamiento, color del corazón, 3 overlays y los flujos existentes. Pendiente aceptación visual real en Safari.

**No se habilitó ninguna integración productiva con clientes.**
