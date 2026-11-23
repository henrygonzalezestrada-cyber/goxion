# GOXION · Auditoría de paridad visual y funcional (23 nov 2026)

**Alcance**: espejo `ayuda-espejo-feed-v2.html`, laboratorio `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, CSS de navegación adaptativa, controladores de lectura V2 y controladores oficiales. Grabación de 11.57 s: recargas de Casone, dos pantallas de carga sucesivas, saludo «Hola, Casone» (estado vencido), cifra de ahorro animada. El caso Alondra y la X fueron reportados por el usuario; no se consultaron datos privados adicionales. No es un certificado de inspección píxel a píxel ni una prueba en iPhone físico.

## A. Diferencias verificadas y correcciones de esta entrega

| Componente | Laboratorio / acuerdo | Espejo anterior | Corrección / evidencia |
|---|---|---|---|
| Arranque | Logo único que viaja a la cabecera (acuerdo posterior al laboratorio) | splash oficial + overlay V2 | Un único nodo estático desde primer pintado; adaptador de hideSplash sólo en espejo. Barra aparece tras 480 ms de espera privada, sin mover el logo; termina al render real, con salida de seguridad. |
| Saludo | Estado urgente: «Hola, [nombre]». Tranquilo: Hola / Qué gusto / Bienvenido, cada 13 s; animación por palabra. | Parámetro urgent sin uso, siempre Hola. | Ciclo original restaurado, pausa si no está en el feed o página oculta; limpieza al cerrar sesión. |
| X de avisos | Mismo SVG de gxb-dismiss, disco 35, X 16, diana 44. | CSS global dibujaba ::after adicional a los trazos del parche. | Clonar el SVG de gxb-dismiss, desactivar ambos pseudoelementos, mismo trazo 2.5 y geometría. Mismo botón oficial. |
| Ahorro / logos | 0 oculto; 1–4 logos; 5–7: cuatro y +N. | Visualización ligada a referencias monetarias; una marca comparable implicaba un logo grande. | Iconografía desde todas las marcas contratadas; importe sólo de referencias verificadas. No inventar precios. Si no hay comparación positiva, no se afirma ahorro. |
| Ahorro / movimiento | Levitación lenta, sombras por profundidad, movimiento al estar visible; número 1050/760 ms. | CSS copiado pero keyframes dentro de @scope; no garantizaba registro en WebKit. | Registro global de keyframes de la misma curva; animación limitada al feed visible, reduce motion y pausa. Actualizar cifra al estar fuera de vista. |
| Hero / morph | Icono cambia por estado, reloj continuo; pausar al ocultar documento. | No se inicializaba la animación puntual, morph podía reiniciarse al refrescar. | Inicio de animación de cambio, no repetir forma idéntica, pausa por visibilidad. Se añade estado de cancelación si hay solicitud real activa. Onboarding usa criterio oficial, no cualquier cuenta sin servicios. |
| Historial | Mantener detalle abierto por ID, filtro activo, mostrar número de movimientos restantes. | Refresh reconstruía las filas cerradas y botón genérico. | Estado abierto conservado; indicador de filtro; número de restantes. |
| Beneficios | Morph, emoji fijo al mostrar condiciones, barra y checks animados. | Actualización de datos reescribía el panel incluso sin cambios. | Evitar reescritura si los datos del panel son idénticos, incluidas misiones. Pausa al ocultar documento. |

## B. Elementos del laboratorio presentes, revisión visual aún necesaria

- Material neutro .371/11.75px, hero mismo valor activo, saturación y bordes, botones, dimensiones de X; estructura y reglas CSS se preservan. Comparar valores *computados* y capturas 390/320/280 con Safari real; no confundir CSS declarado con render comprobado.
- Hero: estados de atención, incompleto, suspendido, vencido, revisión, prórroga, al corriente, nuevo; el CTA no convierte toda la tarjeta en botón y llama irAlTicket. Comparar precedencia ante combinación de estados y textos de cada estado. Confirmar fecha/importe, múltiples fechas B2, prórroga efectiva y estados del calendario desde cotización oficial. **No** deducir estado financiero de la suma de servicios.
- Beneficios: tres tarjetas en fila, morph de expansión/cierre, contraste, emoji compacto y watermark, condiciones con bloqueo de posición, progreso, checks. Estados declarados: lealtad activa/perdida, referido none/active/ready/claimed, misión activa/ready/claimed. La exactitud de sus cifras, reinicio B2, niveles, cupones y celebraciones requiere paridad con fuente oficial.
- Navegación: misma cápsula y cabecera, compactación y transición. Confirmar identidad de nodo, scroll, cambios rápidos y retorno; motor original de navegación.
- Servicios: lista real, logos, estado, expansión/colapso y X. Los casos de laboratorio con CTA específico (nueva contraseña, PIN actualizado, invitación, pausa, solicitud/aprobación/rechazo de cancelación, avisos simultáneos) no están completamente representados. El renderer usa un único aviso por precedencia y una sola entrada de accesos. No darlo por completo.
- Historial: iconos, filtros, expansión. Los movimientos de pago y altas/cancelaciones con fecha respaldada se muestran; renovaciones y beneficios reales requieren fuente de eventos y deduplicación. No llamar acreditado a un pago sin confirmación oficial. No copiar ejemplos.
- Fondo: se conserva onda de la oficial; excluidos haz y órbita experimentales. No reintroducir controles de escenarios, ejemplos, precios ilustrativos ni luces descartadas.
- Goxy y notificaciones: motor oficial permanece; validar que el avatar nuevo reproduce funciones reales, que no hay instancia duplicada del asistente y que contador, gestos, lectura, eliminación y deshacer funcionan en todas las vistas. La geometría de X se comprueba con estilos globales cargados, no sólo con un DOM aislado.

## C. Inventario de conexiones oficiales (fase siguiente; NO marcar como completas)

| Grupo | Prueba/implementación requerida |
|---|---|
| Datos de cuenta y B2 | Cotejar adaptador con estado-financiero-b2-beta y estado de cuenta oficial. Importes, fechas, pago incompleto, comprobante rechazado/en revisión, prórroga aprobada y calendario sin estado cobrable. |
| Cancelaciones y retención | Vincular CTA nuevos con solicitud, oferta de retención, aceptar/rechazar, carga/éxito/error y seguimiento. Sólo baja efectiva elimina el servicio. |
| Credenciales y accesos | Restaurar PIN de GOXION, consulta única de contraseña, invitaciones, novedades, múltiples accesos y soporte contextual; validar autorización antes de revelar datos. |
| Lealtad, referidos y misiones | Motor de racha real (incluido reinicio por mora B2), niveles 4 y 9; referencia válida, cupón, completar misión, confeti únicamente tras validación oficial. No activar mutaciones parciales. |
| Historial y actualización | Fuentes de renovaciones/beneficios, importes y estados; refrescar sin perder interacción; probar cambios concurrentes y reconexión. |
| Módulos intactos | Portada, acceso, Catálogo, carrito, Soporte y documentos. Sólo cabecera compartida y carga autorizadas. Probar sus recorridos originales, no duplicar el motor. |

## D. Criterios de aceptación

1. Escenarios 0–7 marcas y combinaciones de estados hero, con datos de prueba **exclusivamente en CI**, sin botones de escenario en el espejo.
2. Comparación de material y geometría, logo único, X exacta con reglas globales oficiales, ciclos de saludo, visibilidad, morph, historial y cápsula. Chromium y WebKit; prueba real iPhone pendiente.
3. Paridad transaccional con cuentas controladas; retirar HTML legado oculto y rutas provisionales sólo cuando exista sustituto funcional validado.
4. Congelar versión candidata, comparar con oficial y promover **exactamente** archivos probados. Sin segunda reconstrucción del diseño. Reversión preparada.
5. `ayuda.html` y controladores compartidos intactos durante esta fase. `ENABLE_WRITES=false` hasta validar las conexiones; no considerar la UI lista por pasar una comprobación estática.
