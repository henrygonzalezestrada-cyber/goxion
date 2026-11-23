# GOXION · Mi Espacio — espejo conectado (23/nov/2026)

**Estado:** PREPARADO PARA REVISIÓN; **NO** reemplaza `ayuda.html` ni certifica QA completo de Safari/servicios. El origen del espejo es la **misma página oficial**: `preview/mi-espacio-espejo/index.html` conserva todos los scripts del `ayuda.html` vigente y carga únicamente `mirror.css` + `mirror.js` (presentación).

**URL:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/mi-espacio-espejo/index.html

## Qué está implementado en el espejo
- **Única navegación real** `#goxion-main-nav`: sticky V4.3 (160×56 en compacto, 158×56 en ≤320 px), ítem activo 14.5px/700, borde cian solo activo, expansión por dirección de scroll. **Se reutiliza `switchTab`; no se crea una segunda barra ni un segundo controlador.**
- **Se oculta únicamente la barra visual vieja `#sticky-client-bar`**, dejando el nodo en DOM porque el código oficial de sesión la referencia; no se rompe el handler.
- **Saludo oficial y nombre real**, con proporciones del laboratorio; se mantiene su controlador original.
- **Hero contextual desde los datos reales** `globalClientesData[getCurrentClientKey()]`, `estado_cuenta` y estado de comprobante, con CTA `irAlTicket()` original reubicado, sin un segundo botón de negocio. Solo el reloj tiene animación continua de 6 s; el resto son animaciones al cambiar. Se mantiene la alerta oficial de observaciones. El onboarding oficial permanece operativo.
- **Lealtad en fila con Referidos/Misiones oficiales:** el valor sale de `#loyalty-count`, con ⭐ o 💔 solo cuando `racha_reiniciada_virtual===true`; el detalle muestra `#loyalty-msg` auténtico. `#gamif-grid` sigue siendo generado por el Dashboard oficial; `openGamif`, `reclamarMesGratis`, `toggleMission`, `reclamarCuponSilencioso`, confeti y progreso siguen siendo oficiales.
- **Servicios y pagos reales:** se mantienen `#dash-services` y `#dash-history` sin sustituir sus handlers ni inventar movimientos. Solo se aplica refinamiento visual y márgenes.
- **Campana y Goxy oficiales:** se conservan JS y módulos reales; NO se traslada la campana ficticia del laboratorio ni se reconstruye el asistente. Encabezado de avatar Goxy, menú de perfil y foto persistente aún NO integrados en este espejo; hacerlo exige reconciliar flujo de autenticación.
- **Pie de página:** conserva horario y legal; composición más compacta, sin versión pública `v1.3.0`, y se corrige el carácter literal `\\n` heredado sin editar la fuente oficial.
- **0 datos de ejemplo en el HTML servido, 0 controles de simulación y 0 cálculos financieros/clientes nuevos en el adaptador.** Los estados sintéticos usados en CI existen solo en el script de pruebas y jamás en la interfaz de GitHub Pages.

## Bloqueos para publicación oficial
1. **Ahorro:** la cifra de ejemplo del laboratorio ($248) NO tiene fuente financiera comprobada en la experiencia oficial. No se incluye hasta validar fórmula y procedencia.
2. **Historial de movimientos mixto:** se pueden confirmar pagos, pero no existe todavía fuente histórica completa verificada para cada alta/renovación/baja. Por eso se conserva **Historial de pagos**, sin crear movimientos fantasma.
3. **Conexión completa de Goxy en el header**, foto persistente y menú: los componentes del laboratorio eran una simulación de UI. Proteger el login y la sesión oficial tiene prioridad.
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