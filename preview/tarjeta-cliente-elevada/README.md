# Espejo — Tarjeta de cliente elevada (GOXION Admin)

**Estado:** ESPEJO (preview). No es la oficial. La oficial (`admin.html`) no se
tocó. El motor no se tocó. Nada escribe: los botones muestran su estado
visual y un aviso, sin llamar a Supabase.

**Origen:** inventario `~/workspace/goxion-analysis/TARJETAS-CLIENTE-INVENTARIO-2026-11-13.md`
(5 hallazgos) y propuesta aprobada por Henry 2026-11-13 16:49 ("Sí, haz el espejo").

**Archivos:**
- `index.html` — cáscara: encabezado, lista de 3 tarjetas demo, hoja inferior
  (ficha), modal de revisión de comprobante, toast.
- `tarjeta.css` — piel del Admin oficial + sistema de animación "Asentamiento".
- `tarjeta.js` — datos demo ficticios + render + interacciones solo visuales.
- `README.md` — este documento.

## Datos demo (ficticios; sin nombres, PINs, teléfonos ni CLABE reales)
- **Daniela R. · GX-2026-0142** — B2 medio pagado: ciclo $98.00, cargo 6 nov
  $49.00 liquidado, cargo 30 nov $49.00 pendiente → resto **$49.00**.
  Demuestra el hallazgo 1 corregido: la cifra grande es el resto, no el total global.
- **Jorge P. · GX-2026-0157** — fecha única al corriente: YouTube $79.00,
  descuento lealtad 6% −$4.74, pagado → resto **$0.00** ("Mensualidad cubierta").
- **Mariana S. · GX-2026-0163** — comprobante $208.00 en revisión (faltan
  $10.40 de mora), cancelación pendiente de Disney+, 1 acceso sin configurar.
  Demuestra Atención con 3 pendientes y el modal "Revisar ahora".

## Orden aprobado (implementado tal cual)
Tarjeta cerrada: nombre + folio + badge → cifra correcta (resto, con
base/descuentos/abonos/mora en una línea) → frase + fecha → señales de
pendiente → servicios con estado + progreso real (referido 2/3, misiones
Ronda 2) → WhatsApp siempre a la mano.
Ficha: Atención primero → Cobro (una sola cifra + desglose + Marcar pagado
visible + descuentos en una sola lista) → Servicios → Beneficios (una sola
lista) → Cuenta y accesos.

## Decisiones de reconciliación (documentadas, no improvisadas)
1. **"Accesos y claves" en un solo sitio:** la sección 5 se llama "Cuenta y
   accesos" y contiene identidad + PIN del cliente + los bloques de claves
   de cada servicio (perfil, PIN, cuenta madre, contraseña). "Editar acceso"
   en Servicios no abre un segundo editor: desplaza hasta el bloque de ese
   servicio y lo resalta. Así ninguna clave vive en dos sitios.
2. **Descuentos:** Cobro muestra el efecto en dinero (una sola lista de
   descuentos aplicados este periodo). Beneficios muestra los programas
   (lealtad, referido, misiones, programados). No hay dos listas editables
   del mismo concepto.
3. **Cifra única:** la meta de la ficha muestra estado + fecha, SIN importe.
   El importe vive solo en Cobro (una vez). En la tarjeta cerrada la cifra
   grande aparece una vez; la línea de ajuste muestra los componentes
   (base/descuentos/abonos/mora), no el total repetido.
4. **Sin menú rápido "⋯":** no existe en la oficial (nunca se renderiza);
   no se construyó.
5. **Sin tira de resumen en la ficha:** repetía la cabecera; se quitó.
6. **Sin emojis como iconos:** sprite SVG inline (24 símbolos), 0 glifos
   emoji en el HTML/JS estático (verificado por grep).
7. **Anti pintado intermitente:** las 5 secciones de la ficha están siempre
   en el DOM, apiladas; la navegación desplaza (`scrollIntoView`), nunca
   oculta/muestra. No hay `content-visibility`, no hay toggling de `display`
   entre secciones. La única aparición/desaparición es la hoja y el modal
   (transform + opacidad + visibility con retardo).

## Piel
La del Admin oficial, tal cual: fondo `#030305`, tarjeta `#0a0a0f`,
verde `#00ff9d`, morado `#bc13fe`, cian `#00f2fe`, rojo `#ff003c`,
ámbar `#f8e800`, muted `#8892b0`, Rajdhani, cristal/blur. Misma piel,
otro acomodo: el cambio se lee como ORDEN, no como maquillaje.

## Animaciones — sistema "Asentamiento" (distinto del espejo v2)
Base: reglas Emil Kowalski (ease-out `cubic-bezier(0.23,1,0.32,1)`, entrar
desde scale 0.95 + opacidad, solo transform/opacity, presión 0.97 en 120 ms,
micro-interacciones <300 ms). Diferencias deliberadas con v2:
- **Sin muelles** (`linear()`/overshoot): todo se asienta con ease-out puro.
- **Sin partículas, sin check-pop, sin conteo animado**: la cifra de Cobro
  se asienta (scale 1.04 → 1, 240 ms) en vez de contar.
- **Cascada por prioridad**: al abrir la ficha, las secciones entran en el
  orden de la información — Atención lidera (0 ms), Cobro (+60), Servicios
  (+120), Beneficios (+180), Cuenta (+240). La animación sigue el orden,
  no al revés.
- **Atención pulsa una sola vez** al abrir (opacidad, 600 ms, un ciclo).
- **Hoja**: entrar 320 ms, salir 240 ms (más rápida, como iOS).
- **Barras de progreso con `transform: scaleX`**, nunca `width`.
- **Toast como banda bajo el encabezado** (nunca lo tapa), 2600 ms.
- `prefers-reduced-motion`: solo opacidad, stagger 0.

## Verificación local (Playwright/Chromium, 390 px, 2026-11-13)
44 comprobaciones, **44 PASS** (`TODO VERIFICADO`, script `verify-tarjeta.mjs`,
capturas en `/tmp/tarjeta-elevada/`):
- (i) cifra B2 = resto **$49.00** (no el total global $98.00); línea de ajuste
  con base/descuentos/abonos/mora.
- (ii) "Marcar pagado · $49.00" visible en Cobro (360×39 px); al pulsarlo
  pasa a estado visual "Marcado (demo)" + toast de aviso, sin escribir.
- (iii) Atención es la primera sección al abrir (orden DOM y posición:
  Atención arriba, Cobro después).
- (iv) Sin duplicados: 1 cifra grande, 1 badge, 1 frase+fecha por tarjeta;
  1 sola cifra en Cobro; la meta de la ficha no lleva importe.
- (v) Chips con progreso real: referido 2/3, misiones Ronda 2, lealtad 12 pagos.
- (vi) Sin pintado intermitente: las 5 secciones pintan (h>0, opacidad 1)
  en 3 ciclos completos de abrir/cerrar y navegar; sin overflow horizontal.
- Tarjeta C: 3 señales de pendiente; modal "Revisar ahora" con $208.00 y
  decisión demo con estado visual. 0 errores de página del espejo
  (el único fallo de red es el CDN de Google Fonts, bloqueado en la VM).
- 0 glifos emoji en el texto renderizado y en los archivos del espejo.

## Límites honestos (sin verificar en local)
- Rajdhani no carga en el entorno headless (Google Fonts bloqueado); se
  verifica con la sans de reserva. En Safari se ve Rajdhani de verdad.
- Sin sesión Admin real: los datos son ficticios y fijos; el comportamiento
  con clientes reales solo se comprueba con la sesión de Henry en Safari.
- Las acciones (Marcar pagado, Revisar ahora, WhatsApp, lealtad, PIN,
  contraseñas) son solo visuales por diseño: muestran estado + aviso.
