# GOXION · Contrato visual de las tres experiencias

**Versión documental:** 11/oct/2026. **Estado:** criterios de continuidad; no sustituye código, capturas aprobadas ni pruebas visuales. Este documento describe las interfaces existentes, no autoriza un rediseño.

## 1. Identidad matriz

| | Admin | Ayuda / Mi Espacio | Index / Estado de cuenta |
|---|---|---|---|
| Trabajo del usuario | Administrar clientes, servicios y operaciones | Descubrir, contratar, consultar servicios y beneficios | Entender exactamente qué pagar, cuándo y cómo reportarlo |
| Fuente de diseño | `admin.html`, `assets/css/admin.css`, `assets/js/admin/` | `ayuda.html`, `assets/css/ayuda.css`, `assets/js/ayuda/` | `index.html`, `assets/css/index.css`, `assets/js/index/` |
| Tipografía identificada en producción | **Rajdhani** | **Poppins** | **Poppins** |
| Fondo y acentos existentes | `#030305`; cian `#00f2fe`; morado `#bc13fe` | `#030305`; cian `#00f2fe`; morado `#7c4dff` | `#030305`; cian `#00f2fe`; morado `#7c4dff` |
| Jerarquía | Ficha, pestañas de Cobro/Servicios/Beneficios/Cuenta, filas operativas, acciones contextuales | Cabecera GOXION, Mi Espacio, promociones y catálogo, tarjetas de cristal, soporte | Importe primero (`.balance-hero`/`.total-amount`), período/estado, detalle, pago y comprobante |
| Lenguaje visual | Herramienta densa y precisa; pocos efectos | Premium, cercano, descubrimiento; vidrio y animaciones discretas | Claro y confiable; fondo de lámpara de lava sutil, vidrio, controles de pago destacados |
| Prohibido | Asistentes de 1/2/3 pasos y otro encabezado GOXION dentro de la ficha | Copiar la cuadrícula/pestañas de Admin o abrir paneles técnicos | Copiar controles administrativos o crear un segundo estado de cuenta paralelo |

**Ojo:** las paletas comparten ADN de marca, pero **las proporciones, estados, tipografías y componentes no son intercambiables**. La base de código comparte `assets/js/core/financial-engine.js`, NO debe compartir las hojas de estilos de cada superficie.

## 2. Admin — identidad operativa aprobada

- Conservar su navegación y la ficha actual; no emprender una cuarta reorganización.
- Mostrar servicio contratado **una sola vez**. X2 comercial = un encabezado compacto; accesos 1/2 y datos técnicos solo después de abrirlo. Nunca un recuadro «MÚLTIPLE» siempre visible.
- En «Editar acceso», el orden aprobado es **perfil + PIN (una fila)**, **cuenta compartida**, **contraseña con botón Gestionar a la derecha**. Un campo de contraseña no debe abrir una página detrás de la ficha sin cerrarla.
- Retícula de campos cortos: `minmax(0,1.6fr) minmax(88px,1fr)` y caída por **ancho del contenedor**; controles de 46 px en esa sección. Correos, nombres extensos, estados y selectores a ancho completo. No suprimir controles esenciales para ahorrar scroll.
- Evitar estados duplicados («Activo» dos veces, «Asignado» junto a la selección ya visible), notas técnicas repetidas y tarjetas anidadas por cada perfil.
- Editar fechas en calendario visible, con botón de restablecer alineado, sin superposición en Safari. Dejar funciones avanzadas plegadas.

## 3. Ayuda / Mi Espacio — identidad del cliente

- Mantener encabezado y acceso a **Mi Espacio**, catálogo/promociones, misiones, notificaciones, opiniones y soporte tal como funcionan; evitar componentes o estructura de Admin.
- El **primer vistazo** debe responder «¿cómo está mi cuenta y qué viene después?»; no debe convertirse en un formulario de pagos ni presentar tablas técnicas o IDs internos.
- Las tarjetas premium usan superficies de cristal, jerarquía Poppins, acento cromático con moderación y movimiento que no obstruya; respetar los efectos y transiciones aprobados del catálogo y carrito.
- Si hay fechas independientes confirmadas: sustituir «Próximo cobro» por **«Próximo a vencer»** en la tarjeta principal SOLO cuando realmente aplique; usar la fecha y el importe de la siguiente obligación. Más fechas: detalle compacto bajo demanda que enlaza al Index **existente**.
- Conservar el lugar del usuario ante refrescos realtime (no regresar al inicio ni cerrar abruptamente tarjetas); no crear una segunda calculadora financiera en Ayuda.
- Una sola fecha: dejar tarjeta y flujo actual sin ruido añadido. No mostrar dos «Acceso 1/2» salvo que el usuario entre al detalle.

## 4. Index — identidad del estado de cuenta

- **No crear otros Index independientes por plataforma**. Se mantiene el mismo `index.html` y su navegación existente.
- Conservar `.sticky-area`, `.balance-hero`, `.total-amount`, `.scrollable-content` y tarjetas `.glass-card`; preservar la lámpara de lava discreta y borde inferior difuminado del bloque fijo.
- Conservar el botón principal «Ya realicé mi pago» y el flujo de selección de cuentas bancarias/copiar CLABE/subir comprobante. Soporte secundario. Ni colores ni morfología de botones deben saltar entre estados.
- Para calendario múltiple confirmado: primero **monto/fecha del próximo vencimiento**, luego calendario/desglose compacto de las otras obligaciones; opciones claras de pagar **próximo**, **todo junto** y, solo con cálculo confiable, **solicitar/unificar fechas** con diferencia proporcional explicada.
- Una sola fecha → apariencia actual. No volver a llenar la pantalla de recuadros por cada servicio o perfil X2. No mostrar simulaciones como cargos reales.

## 5. Regla transversal de calidad visual y comportamiento

1. **Contenido antes de contenedores.** Menos cajas, más filas compactas. Detalle bajo demanda; información sensible a primera vista solo la necesaria.
2. **Proporción antes que compactación.** Dos campos breves pueden convivir si etiquetas, altura, distancia y área táctil caben; si no, apilar por el ancho real del componente.
3. **Propiedad del CSS.** Modificar solo `assets/css/admin.css`, `ayuda.css` o `index.css` para su experiencia. Evitar reglas globales de estilo nuevas que afecten las otras dos.
4. **Estados comprensibles.** Fecha e importe explícitos, fuente oficial, período cubierto, sin duplicación de estados y sin términos como «aplicar plan» o IDs técnicos frente al cliente.
5. **Navegación intacta.** Sin overlays atrapados, botones inertes, foco no deseado, salto de scroll, cierre súbito por eventos realtime ni pérdida de contexto.
6. **Responsive:** revisar **280, 320, 360, 375, 390, 430 y 768 px**, dispositivos táctiles y Safari iOS real antes de anunciar aprobación visual completa. Revisar: scroll horizontal = 0, solapamientos = 0, recorte inesperado = 0, alturas coherentes, safe areas, modales, inputs tipo date, estados expandido/cerrado.
7. **Accesibilidad:** botones nativos, etiquetas, foco visible solo para teclado, objetivos táctiles apropiados, contraste y textos que no dependan solo del color. Evitar `opacity:0` en contenido indispensable.
8. **Regresión:** probar casos de servicio individual, X2, combo, cuenta personal, cuenta compartida, suspensión, pagado, revisión, sin fecha, próximas fechas y sin conexión.
9. **No tocar otras áreas para arreglar una.** No resolver una falla de Index modificando Ayuda o cambiando fórmulas; la fuente de pagos es el motor backend.
10. **Revisión antes de publicar:** captura de vista principal, detalle abierto, campo/selector activo y acción final en móvil; escenarios de éxito/error; scripts estáticos + pruebas autenticadas cuando sean necesarias. Decir claramente qué NO fue probado.

## 6. Flujo obligatorio para cualquier chat o colaborador

- **Leer `AGENTS.md` → contrato visual → registro de funciones → archivos reales y CSS existente.**
- Escribir alcance: «qué cambia / qué queda intacto», propietario del dato, experiencia y riesgos visuales.
- Hacer el cambio mínimo en una beta/PR aislada; nunca tratar prototipos como fuentes oficiales.
- Verificar funcionalidad + visual en los tamaños requeridos antes de pedir validación.
- Actualizar esta documentación al **aprobar** una variante nueva, no dar por aprobado un render únicamente porque compile.
- Antes de modificar componentes establecidos, identificar si el comportamiento lo controla un módulo posterior en el orden de scripts.

## 7. Relación con el proyecto financiero

Consulta `docs/GOXION_MULTI_DATE_ROADMAP.md` y `docs/CALENDARIO_FINANCIERO.md`. **Admin gestiona fechas; Index cobra e informa; Ayuda resume y dirige.** Ninguna interfaz calcula de forma independiente multas, prorateos, descuentos o coberturas. Mientras no haya calendario persistido/autorizado, los tres conservan el flujo financiero oficial actual.

**Fuente del criterio:** inspección del código y decisiones previas. **No es garantía de un test en navegador real** ni especificación pixel-perfect; los nuevos componentes requieren una revisión concreta de capturas.
