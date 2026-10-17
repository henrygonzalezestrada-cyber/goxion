# GOXION · Gixys · Fase 7: escritura estable y secreto de tres encuentros
Fecha: 16/oct/2026. Rama `beta/gixys-easteregg-typing-v7-20261016`. PR de referencia: #137 (V6).

## Hallazgos del video de Safari
El globo de V6 reacomodaba palabras y cambiaba de ancho casi en cada carácter; el usuario percibía la animación como defectuosa. Los tres personajes parecían excesivamente serios. El usuario decidió que todos se presentan simplemente como **Gixys**, sin Hex, Circle ni Square en sus frases ni nombres visibles, y pidió humor como «Soy Gixy dos... ¿o tres? No recuerdo».

## Entrega en esta beta
- Se calculan los cortes de línea **antes de escribir** (medición de texto Poppins y división por palabras). El contenido usa saltos explícitos con `white-space: pre-wrap`; nada de reflow caprichoso en cada letra. El cristal crece por **bloques de palabras**, con tamaño y alto delimitados. Conserva la máquina de escribir a ~39ms/carácter, bloqueo contra toque rápido, accesibilidad y apagado seguro.
- Los Gixys usan formas diferentes únicamente como tipo **interno** del renderizador original Plastic, nunca como nombres. Se sumaron expresiones simpáticas y chistes relacionados con Goxy y GOXION; continúan siendo asistentes contextuales sin voz ni chatbot propio.
- **Easter egg 5%:** tres encuentros **distintos** con Gixys en contextos de aviso, lealtad y misión. Primer saludo: pista suave acerca de un secreto de Goxy. Segundo: «¡Dos saludos! Te falta encontrar al otro Gixy». Tercero: sorpresa visual del **5% OFF de demostración**, únicamente al terminar de escribir la frase. Repetir toques en un mismo Gixy no suma nuevas pistas. El avance dura solo durante la sesión de la página; no hay localStorage, cookies, cuentas, claves reales o saldo creado.
- La recompensa es **ficticia y no canjeable**, claramente marcada: no se genera, asigna ni aplica cupón a cuentas o pagos, ni se llama a Supabase, Admin o Discord. Un único panel de demostración, con cierre manual o automático.
- QA Chromium y WebKit: 7 tamaños, ausencia de overflow, líneas estables y nítidas, frases sin nombres individuales, bloqueo de toques, progresión 1/3→2/3→3/3, no desbloqueo prematuro, recompensa solo demo.

## Antes de cualquier lanzamiento real del 5%
**Pendiente de definir y validar con el usuario**: elegibilidad exacta, período de aplicación, reglas de acumulación con promociones/cupones/registro -10%, vigencia, límite por cliente/período, tratamiento de cuentas completas, perfiles individuales, clientes suspendidos y antiautomatización. GOXION distingue perfiles y promociones: **no suponer que el 5% se acumula**. El backend debe gestionar inventario/campaña, emitir un cupón único con asignación autorizada, unicidad por cliente, idempotencia, auditoría, límites, expiración, y cálculo atómico del beneficio sin dejar que frontend pueda falsificarlo. La UI solo muestra resultados confirmados por servidor.
Los eventos de lealtad/misiones deben provenir del motor real; **no exigir pagos o compras ficticias para avanzar**, la mecánica real debe ser accesible con eventos legítimos.

## Continuidad
- GOXION oficial `ayuda.html`, `index.html`, Admin y Goxy **intactos**.
- Esperar revisión manual en Safari/iPhone y aprobación visual; hasta entonces, la Fase 7 es solo una beta aislada.
- Fase futura: diseño de elegibilidad + API segura + integración con el motor de promociones existente; evitar crear un segundo subsistema.
