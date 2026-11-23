# GOXION · Mi Espacio — espejo conectado (23/nov/2026)

**Estado:** PREPARADO PARA REVISIÓN; **NO** reemplaza `ayuda.html` ni certifica QA completo de Safari/servicios. El origen del espejo es la **misma página oficial**: `preview/mi-espacio-espejo/index.html` conserva los **47 scripts oficiales** de `ayuda.html` y añade `mirror.css`, `approved-visual.css` (geometrías tomadas literalmente del laboratorio) y `mirror.js` (adaptador visual).

**URL:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/mi-espacio-espejo/index.html

## Qué está implementado en el espejo
- **Única navegación real** `#goxion-main-nav`: sticky V4.3 (160×56 en compacto, 158×56 en ≤320 px), ítem activo 14.5px/700, borde cian solo activo, expansión por dirección de scroll. **Se reutiliza `switchTab`; no se crea una segunda barra ni un segundo controlador.**
- **Se oculta únicamente la barra visual vieja `#sticky-client-bar`**, dejando el nodo en DOM porque el código oficial de sesión la referencia; no se rompe el handler.
- **Saludo con jerarquía exacta del laboratorio vigente**, nombre obtenido de la sesión real, frases cada 13 s y entrada por palabras. El saludo oficial permanece en DOM oculto para preservar su controlador.
- **Hero con geometría y material directamente extraídos del laboratorio aprobado**, contextual desde los datos reales `globalClientesData[getCurrentClientKey()]`, `estado_cuenta` y estado de comprobante, con CTA `irAlTicket()` original reubicado, sin un segundo botón de negocio. Solo el reloj tiene animación continua de 6 s; el resto son animaciones al cambiar. Se mantiene la alerta oficial de observaciones. El onboarding oficial permanece operativo.
- **Tres compactas con la estructura aprobada (`gxb-row`, `gxb-tile`, `gxb-emoji`, medidor)**: Lealtad en fila con Referidos/Misiones oficiales; el valor sale de `#loyalty-count`, con ⭐ o 💔 solo cuando `racha_reiniciada_virtual===true`; el detalle muestra `#loyalty-msg` auténtico. `#gamif-grid` sigue siendo generado por el Dashboard oficial; `openGamif`, `reclamarMesGratis`, `toggleMission`, `reclamarCuponSilencioso`, confeti y progreso siguen siendo oficiales.
- **Servicios y pagos reales:** se conservan `#dash-services` y `#dash-history` sin sustituir handlers ni inventar movimientos. Se trasladó la jerarquía de logo/nombre/estado, círculos de cierre 35/16 y ritmo de filas. Las vistas ampliadas de servicios requieren verificación final.
- **Campana y Goxy oficiales:** la campana conserva su contador y avisos reales. Se añade un avatar único Goxy de 42px, su renderer original y acceso al chat oficial; menú con sesión auténtica. La función «Mi perfil» y fotografía persistente siguen pendientes de un flujo real, por lo que no se muestran opciones ficticias.
- **Pie de página:** conserva horario y legal; composición más compacta, sin versión pública `v1.3.0`, y se corrige el carácter literal `\\n` heredado sin editar la fuente oficial.
- **0 datos de ejemplo en el HTML servido, 0 controles de simulación y 0 cálculos financieros/clientes nuevos en el adaptador.** Los estados sintéticos usados en CI existen solo en el script de pruebas y jamás en la interfaz de GitHub Pages.

### Corrección de fidelidad (23/nov/2026)

El primer espejo era un skin aproximado: Referidos/Misiones mostraban estructura antigua y Hero reconstruido a mano. Después de la observación del usuario, se sustituyó por estructura compacta y CSS extraídos del laboratorio aprobado, con medidas, tipografía, emojis, barras, cristal y gestos, y datos procedentes de controladores oficiales. Los elementos antiguos permanecen solo como soporte de eventos/handlers dentro del DOM, ocultos visualmente.

### Corrección posterior por comparación de grabaciones · 23/nov/2026

Se detectó una colisión real: `assets/css/ayuda.css` conserva `#gamif-grid{grid-template-columns:1fr 1fr!important}` para móvil. El espejo tenía tres columnas sin `!important`, por lo que el CSS heredado ganaba y disponía las tres compactas en 2+1. Corregido **solo** en `approved-visual.css`; no forzar `display:grid!important` porque `openGamif/closeGamif` deben poder esconder el grid durante el morph.

En `mirror.css`, la campana auténtica ahora alterna círculo 44px sin mensajes / cápsula 74px con avisos y respeta el estado invitado sin romper contador, timbre ni hoja de notificaciones. Etiquetas de novedades redundantes de los servicios: visualmente ocultas en la compacta (permanecen accesibles en DOM), reemplazadas por punto discreto; estados reales y detalle de cada acción siguen intactos. Subtítulos estáticos duplicados del Dashboard ocultos. En `mirror.js` se observa la sustitución de tarjetas oficiales por cliente y se mantiene exclusividad con el detalle de Lealtad.

Recursos del espejo versionados `fidelity-20261123-v3` para evitar caché antigua. CI de navegador usa Ubuntu 24.04 para compatibilidad con Playwright 1.56.1. **La comparación visual de un cliente real en Safari aún debe revisarse; estas correcciones no autorizan publicación en `ayuda.html`.**

**La fidelidad por código no es prueba visual de Safari.** No certificar todavía el espejo para publicación oficial. Ahorro e historial mixto continúan sin fuente confiable suficiente para incorporarlos sin inventar información.

## Bloqueos para publicación oficial
1. **Ahorro:** la cifra de ejemplo del laboratorio ($248) NO tiene fuente financiera comprobada en la experiencia oficial. No se incluye hasta validar fórmula y procedencia.
2. **Historial de movimientos mixto:** se pueden confirmar pagos, pero no existe todavía fuente histórica completa verificada para cada alta/renovación/baja. Por eso se conserva **Historial de pagos**, sin crear movimientos fantasma.
3. **«Mi perfil» y fotografía persistente:** el avatar Goxy ya está integrado visualmente con la API oficial, pero no se inventa el formulario/guardado de perfil.
4. **Revisión visual real de Hero / gamificación / Servicios** en dispositivo físico y compatibilidad de los nuevos estilos con las vistas expandidas de acceso y cancelación.
5. **Revisión de PR #231** de Servicios antes de adaptar su diseño a producción; la rama estaba divergente. No fusionar sin reconciliación.
6. **Aceptación de publicación productiva**: `ayuda.html` permanece sin editar, y ningún endpoint Supabase/Edge/Index/Admin se cambió.

## Pruebas
- Integridad estructural, rutas base, scripts oficiales, fuentes, IDs únicos, ausencia de fixtures y sintaxis JS comprobadas contra GitHub.
- `node scripts/mi-espacio-espejo-smoke.mjs` — CI de contrato.
- `node scripts/mi-espacio-espejo-browser.mjs` — smoke aislado Chromium/WebKit a 390/320/280 px, con red externa bloqueada y sin credenciales, registrado en `.github/workflows/mi-espacio-espejo.yml`.
- **No afirmar que el CI o las pruebas WebKit/Safari reales pasaron hasta consultar resultados.** Tampoco validar pagos reales o seguridad de contraseñas con estados inyectados.

## Cuidado al probar
El espejo usa la **misma sesión y las mismas acciones de negocio** de la oficial. Los botones de soporte, misiones, compras, credenciales, cancelaciones o pagos **no son de juguete**: cualquier acción confirmada puede afectar datos reales. Revisar visualmente con cuenta controlada; para pruebas de efectos usar cuentas de prueba y métodos aprobados.

## Rollback
Eliminar `preview/mi-espacio-espejo/` y su CI específico. `ayuda.html` nunca se reemplazó, por lo que no se requiere restauración productiva.