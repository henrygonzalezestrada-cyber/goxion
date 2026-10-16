# GOXION · Gixys beta V3 · Renderer original

**Estado:** beta aislada. No contiene datos de clientes ni modifica `ayuda.html`, `index.html`, `admin.html` o Supabase.

## Qué cambió de verdad

Esta versión NO utiliza `gixy-engine.js` ni recreaciones propias de la física de los botones. El avatar es el **BotAvatar original** de `bot-avatars@0.2.2`. Las interacciones son **PulseHeart original** (versión React/CSS, React Bits), empaquetadas con sus dependencias y con CSS de GOXION solo para composición.

- Bot Avatars: [Libraries.dev](https://libraries.dev/bots), [repo oficial](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/bot-avatars), MIT © 2026 Jakub Antalik. Se conserva su renderer de volumen en 2D Canvas con cuerpo iluminado y profundidad. Formas `hexagon`, `square` y `circle`, `face="eyes"`, material seleccionable Fabric/Plastic, colores GOXION, interacciones originales.
- React Bits: [repositorio original](https://github.com/DavidHDev/react-bits), referencia inmóvil `d9085a5d6cb62a1c7512d8fa05a4f966736b575c`, componente `PulseHeart`. © 2026 David Haz. MIT + Commons Clause. Permitido como parte de una app o producto; no revender, sublicenciar ni redistribuir componentes independientes. Ver [licencia](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
- Animación de corazón **rojo original #ff4d6d**.
- Misiones, lealtad y aviso siguen siendo **simulaciones**, en un entorno encapsulado separado del panel de clientes. No cambian progreso, descuentos, pagos ni mensajes.

## Cómo se compila

Workflow exclusivo de branch `.github/workflows/goxion-gixys-original-v3.yml`. Instala versiones pinneadas de React, bot-avatars y esbuild; descarga desde el commit fijo de React Bits los archivos JSX/CSS originales (no guardados como librería reutilizable dentro del proyecto), crea `app.js` + `app.css` y solo los guarda en la rama beta cuando pasa la QA en Chromium y WebKit.

Las licencias anteriores se conservan como avisos legales para los componentes integrados. **No distribuir los bundles como librería de terceros**.

## Validaciones

- Existen 6 instancias reales de BotAvatar y 3 módulos React Bits (sin clones).
- Los canvas originales tienen píxeles dibujados: no son placeholders.
- Click/tap checklist V1, campana V1 y Pulse Heart; 280, 320, 360, 375, 390, 430 y 768 px sin overflow horizontal ni título tapado por el acompañante.
- Movimiento reducido, ausencia de solicitudes a endpoints privados y ausencia de errores JS.
- Pendiente: prueba física en Safari iPhone y decisión visual del usuario. **No integrar en Ayuda sin aprobación.**

El fallo histórico de Browser smoke de Soporte ([#128](https://github.com/henrygonzalezestrada-cyber/goxion/issues/128)) es independiente.

## Ajustes V4 (16/oct/2026)

- **Plastic** queda seleccionado por defecto para los seis Gixys. `Fabric` permanece solo como opción de comparación, sin modificar las formas ni los movimientos del motor original `bot-avatars@0.2.2`.
- Recuperamos **exactamente la lógica de toque, impulsos de palomita y campana** de la primera beta `preview/gixys-micro-v1`, no los componentes SpringCheck y BellToggle de React Bits.
- Conservamos **Pulse Heart de React Bits**, incluido el color rojo `#ff4d6d`.
- El build ya únicamente descarga y empaqueta el código original de Pulse Heart. Nada se integra a Ayuda, Index o Admin.
- QA V4 verifica acabado Plastic por defecto, resolución de Canvas >= 1.5x, las animaciones CSS V1, los seis avatares y siete anchos móviles.
