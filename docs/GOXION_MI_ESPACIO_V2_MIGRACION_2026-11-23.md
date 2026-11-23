# GOXION · Mi Espacio V2 — migración desde laboratorio (23-nov-2026)

**Estado:** rama de integración; NO oficial / NO producción / NO apta para publicar hasta cerrar pruebas y completar flujos críticos.

## Fuente de verdad de interfaz
- `preview/experiencia-mi-espacio-inteligente/morph-v2.html` es la referencia aprobada para DOM, composición, superficies, animaciones, estados y microinteracciones; `adaptive-top-nav.css` es el estilo del encabezado/cápsula.
- `preview/mi-espacio-v2/index.html` incluye los estilos visuales **directamente del laboratorio**, quitando todos los controles y scripts de demostración. `v2.css` solo añade presentaciones que el laboratorio no necesitaba (inicio de sesión, mensajes y contenido público). **Prohibido reutilizar** `assets/css/ayuda.css`, `approved-visual.css`, `mirror.css`, `mirror.js` o el antiguo renderizador de tarjetas.
- `v2-app.js` construye las tarjetas de Referidos, Lealtad y Misiones en el DOM aprobado, reutilizando el morph original. Servicio y movimiento siguen las geometrías del laboratorio. No hay dos sistemas visuales paralelos.

## Fuentes de verdad de negocio
- `assets/js/core/runtime.js` se mantiene exclusivamente por su contrato de endpoints y token de cliente; no aporta CSS ni renderizador.
- Sesión vía `login-goxion` y `mi-espacio`; token de cliente guardado con la clave oficial. Datos particulares siempre por Edge Function autenticada; no hay credenciales de `service_role` en cliente.
- Cancelaciones, accesos, novedades, contraseñas y estado de cuenta se obtienen por las Edge Functions oficiales existentes y se anexan al cliente/servicio de la respuesta con su ID original; no se inventan estados.
- El panel de saldo **solo puede mostrar importes confirmados** por la respuesta oficial; por ahora se limita a consulta y no implementa el flujo integral de cobro. Antes de oficializar hay que comparar contra `GOXION_FINANCIAL.selectCompatibleState` para B2/múltiples fechas.
- Misiones y recompensas usan sus operaciones oficiales `completar_mision`, `reclamar_mes_referido`, `reclamar_cupon` de `mi-espacio`; se requieren pruebas de permisos/errores en clientes autorizados.
- Historial incluye pagos registrados y cancelaciones confirmadas, sin fabricar movimientos ni usar datos sintéticos en HTML o JS publicado.
- Notificaciones a través de `notificaciones-cliente` con contador y marcas de lectura. **Pendiente** paridad funcional completa con hoja oficial (acciones profundas, borrar/deshacer, avisos legales, alarmas y sincronización inmediata); no sustituir hasta estar completado.
- Catálogo y soporte son **integraciones básicas**: consulta informativa y enlace a WhatsApp. **Pendiente** transportar funciones de carrito, solicitudes, inventario, promociones, cierres de gestión, chat Goxy y legal. No autorizar reemplazo por esta etapa.

## Ahorro mensual: tabla de referencia
`public.goxion_precios_referencia` creada mediante migración `goxion_precios_referencia_mx_20261123`, con RLS y permiso exclusivo de SELECT público en entradas `activo=true`. NO altera `servicios.precio`, `cliente_servicios.monto`, facturación ni promociones. Campos: `clave`, `plataforma`, `plan`, `precio_mensual_mxn`, `moneda`, `mercado`, `fuente_url`, `fuente_tipo`, `revisado_el`, `notas`, `activo`, `actualizado_el`.

| clave | Plan mensual comparable | MXN |
|---|---|---:|
| netflix-premium | Netflix Premium 4K | 369.00 |
| hbo-max-platino | HBO Max Platino 4K | 299.00 |
| vix-premium | ViX Premium | 149.00 |
| prime-video | Membresía Amazon Prime con anuncios | 129.00 |
| youtube-premium | YouTube Premium individual con Music Premium | 159.00 |
| microsoft-365 | Microsoft 365 Personal mensual | 184.99 |

Las referencias consultadas están guardadas con URL y fecha en cada fila. El catálogo debe ser **revisado cuando cambian los precios**. Si han transcurrido más de 45 días, la entrada queda fuera de los cálculos del cliente; no se muestra una cifra desactualizada como si fuera vigente.

`ahorro estimado = Σ precio individual de referencia comparable − Σ monto contratado en GOXION`, SOLO servicios activos y con correspondencia. Si una plataforma no tiene un precio comparable, se omite y el texto muestra el número cubierto sobre el total. Si no hay entradas comparables o la diferencia no es positiva, se oculta la tarjeta, sin inventar un valor. No implica que la cuenta de perfiles o invitaciones sea equivalente a una suscripción individual completa; agregar aviso claro.

## Pruebas y controles
`scripts/mi-espacio-v2-smoke.mjs` y `scripts/mi-espacio-v2-browser.mjs`; workflow CI `Mi Espacio V2 · Laboratorio fuente unica` en PR. Browser QA usa estados sintéticos **solo en la ejecución del test**, 390/320/280 px y motores Chromium + WebKit. No se guardan datos de prueba en la página, Supabase ni credenciales reales.

### Puertas para autorizar publicación a ayuda.html
1. **Visual:** comparar captura laboratorio V2 a la misma anchura/estado; header, saludo, hero, tres compactas, sus expandidas, barra de progreso animada, checkboxes, ahorro, servicios, historial, pie, Goxy y microinteracciones.
2. **Financiero:** concordancia con motor financiero B2, dos fechas, pago por acceso, pago parcial, comprobante en revisión, rechazo, prórroga; ninguna tarifa recargada incorrectamente.
3. **Operaciones:** servicios y cancelaciones efectivas; solicitud y revisión; credenciales expuestas solo con PIN seguro; soporte, carrito, catálogo, promociones; fidelidad a los flujos oficiales sin UI vieja.
4. **Beneficios:** casos de Referidos con 0/1/2/3 meses y recompensa reclamada, misiones con cupón listo/reclamado, lealtad normal y 💔 únicamente por racha reiniciada efectiva.
5. **Comunicaciones:** campana con 0, 1, 10+ notificaciones; abrir, marcar, eliminar, navegar, legal, nuevas notificaciones, Goxy y sesión en dos dispositivos.
6. **Pruebas móviles:** iPhone Safari, viewport 280–430, orientación, accesibilidad, `prefers-reduced-motion`, sin saltos de layout ni controles de laboratorio visibles.
7. Tras la aprobación, migrar la lógica de negocio sin duplicar componentes visuales, hacer respaldo y desplegar `ayuda.html` de forma controlada con rollback.

## Protección de la vista previa
Las acciones que pueden modificar datos del cliente (reclamar cupón, reclamar mes gratis, acreditar una misión, marcar notificación como leída) están **bloqueadas deliberadamente** con `ENABLE_WRITES=false` en esta rama. La autenticación y las lecturas sí usan los contratos reales. Esta protección debe seguir activa hasta pasar pruebas de negocio, permisos, autenticación y anti-duplicación; las interacciones de expansión, navegación, filtrado y copia sí operan localmente.

## Limitaciones conocidas en esta etapa
La V2 ya muestra componentes aprobados conectados a endpoints reales, pero **no representa paridad completa con `ayuda.html`**. No cambiar producción ni promoverla como lanzamiento final. En particular, no está listo el flujo integral de soporte, catálogo, seguridad de credenciales nuevas, cancelaciones, Goxy/chat, legal, ni todas las notificaciones. Registrar estos bloqueos evita confundir un prototipo conectado con un sistema completamente migrado.
