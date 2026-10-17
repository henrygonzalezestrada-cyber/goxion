# GOXION · Gixys · Fase 9: overlay sin desplazamiento + premio Aurora
Fecha: 17/oct/2026. Base: Fase 8, PR #139. Rama: `beta/gixys-overlay-award-aurora-v9-20261017`. Estado: beta aislada, **pendiente de aprobación visual en Safari/iPhone**.

## Lo que corrigió la observación del usuario
1. **Cero desplazamiento del contenido por Gixys.** La beta V8 añadía `min-height:67px` a `#loyalty-msg` al aparecer Circle; eso desplazaba el botón de estado de cuenta y el contenido inferior. Eliminar mutación de clase `gx-loyalty-speaking` y anulaciones de min-height/color. El portal de companions ahora es position:fixed, ancho/alto 0, sin ocupar espacio de layout; escenas individuales siguen position:fixed. Cuando no hay espacio libre junto a lealtad se intenta una ubicación flotante sin reordenar el dashboard; nunca reservar área de contenido para una escena. En demo mantener el texto de lealtad de altura coherente antes/después de cambiar estado.
2. **Celebración anterior rechazada.** La lluvia de rectángulos de V8 se percibió pobre. Sustituida por dos anillos translúcidos y una explosión breve de 14 filamentos luminosos, sin confeti de papel. La recompensa conserva el material glass/Poppins GOXION, no hay una segunda interfaz.
3. **Fuente compartida por el usuario recuperada:** [Colorion CSS Text Effects](https://text-effects.colorion.co/), ~117 efectos de CSS puro bajo MIT. Se eligió [Borealis Aurora Gradient Text Animation](https://text-effects.colorion.co/effects/aurora-gradient-text-animation/). Se **adaptó** la técnica `linear-gradient` + `background-clip:text` + `background-position` a un solo reveal de 3.3s y paleta fija morado/cian (sin hue-rotate ni loop eterno), con fallback accesible y `prefers-reduced-motion`. El número "5 % OFF" sigue legible y se muestra al completar el easter egg.

## Calidad, aislamiento y control
- Tests de cero desplazamiento en geometría del dashboard/loyalty/cobro frente a aparición, pruebas Chromium y WebKit en 7 anchos, no peticiones privadas, no overflow, expresividad original de Gixys y secreto de 3 distintos.
- Mantener material Plastic y ojos de librería original `bot-avatars@0.2.2`; el corazón original PulseHeart, misiones/bell morph y Goxy siguen intactos.
- **Cupón 5% ficticio en beta.** No se emiten códigos, descuentos, movimientos ni se modifican precios. Antes de activación real: definir campaña y reglas para combinar/promociones/registro/lealtad, vigencia, un solo beneficio por cliente, control idempotente y validación de servidor. No crear segundo motor financiero.
- No editar `ayuda.html`, `index.html`, `admin.html`, motor financiero ni Goxy. El flujo de CI de esta rama construye y prueba assets aislados.

## Pendiente
Esperar validación visual del usuario en iPhone. Ajustar colocación flotante si reporta cualquier solape. No integrar en oficial sin aprobación explícita.
