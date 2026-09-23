# GOXION modern-v2 · Arquitectura

## Objetivo

Modernizar GOXION sin rediseñarlo.

La interfaz aprobada en `main` es el contrato visual. La modernización ocurre
por debajo: separación de archivos, configuración común, contratos tipados,
pruebas automáticas y sustitución selectiva de motores de animación.

## Regla principal

**DOM visible + CSS aprobado = protegido.**

El workflow `GOXION modern-v2 · Integrity` compara automáticamente
`ayuda.html`, `index.html` y `admin.html` contra `main`.

Mientras una pieza no sea declarada como refactor intencional:

- el DOM fuera de CSS/JS debe coincidir con `main`;
- el CSS debe coincidir bloque por bloque;
- el JavaScript extraído debe coincidir con el bloque inline original;
- el orden de ejecución debe conservarse.

Los refactors intencionales se registran en `modernization-manifest.json`.

## Estructura

```
/
├─ ayuda.html
├─ index.html
├─ admin.html
│
├─ assets/
│  ├─ css/
│  │  ├─ ayuda.css
│  │  ├─ index.css
│  │  └─ admin.css
│  │
│  └─ js/
│     ├─ core/
│     │  ├─ runtime.js
│     │  ├─ runtime.d.ts
│     │  ├─ motion-engine.mjs
│     │  └─ motion-engine.d.ts
│     │
│     ├─ ayuda/
│     │  ├─ data/
│     │  │  └─ support-issues.js
│     │  ├─ 01-01-inline.js
│     │  ├─ 02-client-supabase-layer.js
│     │  ├─ ...
│     │  └─ 14-ui-harmony-production-script.js
│     │
│     ├─ index/
│     │  ├─ 01-index-supabase-layer.js
│     │  ├─ 02-02-inline.js
│     │  └─ 03-03-inline.js
│     │
│     └─ admin/
│        ├─ 01-01-inline.js
│        ├─ 02-admin-supabase-layer.js
│        ├─ 03-supabase-v3-writes.js
│        ├─ ...
│        └─ 29-admin-beta-22-behavior.js
│
├─ types/
│  └─ goxion-domain.d.ts
│
├─ scripts/
│  ├─ serve-preview.mjs
│  └─ verify-modern-v2.mjs
│
├─ modernization-manifest.json
├─ jsconfig.json
└─ package.json
```

## Núcleo compartido

`assets/js/core/runtime.js` es la única fuente para:

- origen de Supabase;
- nombres de Edge Functions;
- claves de sesión cliente/admin;
- teléfono GOXION;
- datos bancarios;
- canales lógicos de notificación;
- utilidades comunes de request/JSON.

No se deben volver a escribir URLs completas de Supabase dentro de módulos de
Ayuda, Index o Admin. El CI falla si reaparecen.

## Motion

GOXION no adopta el aspecto visual de Animate UI.

Se reutiliza el patrón de animación basado en Motion únicamente cuando mejora
un motor existente sin cambiar:

- geometría;
- keyframes;
- duración;
- easing;
- glass;
- opacidades estables;
- radios;
- composición.

El motor Motion permanece disponible como infraestructura experimental, pero ninguna
interacción aprobada de Mi Espacio o Soporte depende ya de él.

Mi Espacio y Soporte conservan WAAPI nativo. Las pruebas en Safari/WebKit demostraron
que sustituir estos FLIP/alturas por Motion puede alterar la cadencia o la geometría
aprobada, por lo que estos flujos quedan deliberadamente fuera del motor común.

La navegación Inicio/Catálogo/Soporte permanece CSS puro porque ya es la
implementación aprobada y más ligera.

## Ayuda

### Datos editables

`assets/js/ayuda/data/support-issues.js`

Contiene la base de problemas guiados de soporte. Cambiar instrucciones de una
plataforma ya no requiere tocar animaciones ni el dashboard.

### API/Supabase

`02-client-supabase-layer.js` concentra la capa de cliente.

`08-ayuda-beta-26-activation-js.js` mantiene activación/registro.

Ambos consumen `GOXION_CORE`.

### Interacciones

`07-production-interactions-js.js` mantiene navegación aprobada y Mi Espacio.

`01-01-inline.js` queda únicamente como marcador de compatibilidad. Su antiguo
contenido de 3,964 líneas fue segmentado, sin reescribir lógica, en siete
módulos secuenciales: estado compartido, registro, recompensas/referidos,
sesión/experiencia, dashboard/servicios, catálogo/pedidos y soporte. El orden
de ejecución se conserva explícitamente en `ayuda.html`.

## Index

- `01-index-supabase-layer.js`: sesión y adaptación Supabase.
- `02-02-inline.js`: estado de cuenta/pago y presentación oficial.
- Configuración bancaria y teléfono provienen de `GOXION_CORE`.

## Admin

Admin conserva exactamente la UI y el comportamiento oficial. La separación
por scripts permite tocar una función sin editar el archivo de 682k original.

Principales módulos:

- `02-admin-supabase-layer.js`: lectura/sesión.
- `03-supabase-v3-writes.js`: escrituras principales.
- `05-admin-v5-inventory.js`: inventario.
- `07-admin-ops-v2.js`: operaciones.
- `20-admin-security-controller.js`: seguridad/cancelaciones/credenciales.
- `21-admin-smart-operations-controller.js`: cuentas madre/operación inteligente.
- `22-admin-registration-controller.js`: registros y activaciones.
- `23-admin-beta-13-access-controller.js`: accesos.
- `25-admin-beta-19-controller.js`: promociones.
- `28-admin-beta-20-benefits.js`: beneficios.

La configuración Supabase de estos módulos proviene de `GOXION_CORE`.

## Flujo de cambio seguro

1. Crear el cambio sólo en `goxion-modern-v2`.
2. No modificar glass/DOM/CSS salvo que el cambio visual sea intencional.
3. Si un script debe cambiar internamente, registrarlo en
   `modernization-manifest.json`.
4. Ejecutar `npm run verify`.
5. Pasar smoke real en Chromium y WebKit.
6. Usar Railway sólo cuando el tipo de cambio necesite un preview de servidor.
7. Integrar mediante Pull Request y volver a validar sobre `main`.

## Producción

`main` permanece como referencia oficial hasta una aprobación explícita de
migración. Esta rama no debe fusionarse automáticamente.


## Motor financiero

La capa común de cobro se expone mediante la Edge Function `estado-financiero`
y se consume desde `assets/js/core/financial-engine.js`.

El motor financiero opera actualmente en modo oficial. Index, Ayuda y Admin
consumen el mismo contrato para subtotal, lealtad, Trato Justo, beneficios,
promociones, pagos parciales, acuerdos de fecha, mora y reactivación.

Las escrituras financieras principales entran por
`assets/js/core/financial-actions.js` y la Edge Function
`acciones-financieras`. Los backends especializados existentes se conservan
como implementaciones internas cuando siguen aportando lógica estable. Ver
`docs/FINANCIAL_ENGINE.md`.
