# GOXION · Patrón único para encabezados y cierre de modales

**Regla duradera aprobada:** tomar como referencia el control de cierre del acceso a Mi Espacio. En toda ventana con X debe usarse el **mismo círculo cian y el mismo trazo negro**. Si el diálogo tiene título, estado, subtítulo o acciones alineadas junto al cierre, ese encabezado permanece inmóvil; el contenido se desplaza **debajo**. Nunca mover ni tapar la X al desplazar listas, tarjetas o carruseles.

## Tokens canónicos
Archivo único `assets/css/goxion-modal-headers.css`, cargado después de los estilos locales en `index.html` y `ayuda.html`. Diámetro 34px, X de dos trazos de 16px y 2.5px de grosor, cian `#00f2fe`, trazo `#030305`, altura y anchura equivalentes, círculo completo, foco accesible y estados de pulsación discretos. La cruz se dibuja en CSS y no depende de fuentes, glifos ×, emoji ni SVG distintos por módulo.

## Arquitectura: encabezado y scroll separados
- **Index / transferencia:** `gx-bank-static-head` incluye concepto, título, importe y X; `gx-bank-scroll` conserva el carrusel de bancos, puntos y gestos de deslizamiento horizontal.
- **Index / comprobante:** `gx-payment-static-head` incluye título e X; `gx-payment-scroll` mantiene carga, vista previa y envío. No se tocó el mecanismo de pago.
- **Ayuda / notificaciones:** el encabezado existente, título, acciones de leído/eliminar y X quedan fuera de `gx-client-notif-list`; conservar deslizar notificaciones y marca de lectura.
- **Ayuda / Goxy:** `gxai-chat-head` sigue independiente de `gxai-chat-scroll`; su título, estado y cerrar permanecen visibles incluso con chat largo y teclado abierto.
- **Acceso / Mi Espacio:** control anclado sobre el formulario; la cabecera de login/activación es sticky y el formulario se puede desplazar sin perder su encabezado.
- **Términos, garantía, lealtad, referidos y comentario clásico:** ahora usan `gx-dialog-legacy-head` más `gx-dialog-legacy-scroll` y botones reales accesibles (no elementos span).
- **Anuncio de novedades, carrito, registro de bienvenida, prórrogas y comentarios nuevos:** se iguala el control sin reescribir sus animaciones de navegación y gestos; el scroll conserva el componente original. La barra de opiniones queda sticky dentro del scroll.
- La implementación utiliza selectores **acotados a cada modal**; no se cambia cualquier botón, ni los iconos de tarjetas, ni las X en otros contextos.

## Reglas que NO debemos repetir
1. No añadir tamaños distintos de X en cada CSS local. Cambiar el token global, no diez archivos.
2. No fijar la X respecto al documento: se ancla al encabezado de su propio diálogo.
3. No aplicar `overflow:auto` a toda la ventana con X absoluta si hay listas largas: separar un `header` no desplazable y una región `overflow-y:auto; min-height:0` con `overscroll-behavior:contain`.
4. No llevar tarjetas, carruseles o controles financieros al encabezado: ahí solo título, estado/acciones de cabecera y cierre.
5. Probar en tamaños iPhone pequeños; no confundir pruebas DOM con aprobación física Safari.

## Verificación y reversibilidad
`npm run test:modales:estandar` corre Chromium y WebKit, comprueba geometría de botones y que la cabecera no cambia su coordenada vertical al desplazar contenido; se ejecuta de forma independiente en el CI. Revisar también `npm run test:goxy:oficial` y los tests de carrito, notificaciones y opiniones para evitar regresiones.

Rollback: revertir la PR global para retirar la hoja única y recuperar la estructura previa de Index y modales informativos en Ayuda. El motor financiero, Supabase, tokens, notificaciones y backend de Goxy no se modifican.
