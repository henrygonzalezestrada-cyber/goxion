# GOXION Next

Modernización paralela de la interfaz de GOXION.

## Principios

- Producción actual no se modifica durante la migración.
- `ayuda.html`, `admin.html` e `index.html` siguen siendo la referencia funcional.
- Se conservan los contratos actuales de Supabase.
- Primero UI local/read-only; después lecturas reales; las escrituras se migran al final.
- Los componentes aprobados reemplazan a la implementación anterior, evitando cadenas de overrides.
- Motion se usa para layout, presencia, springs y gestos; CSS sigue resolviendo transiciones simples.
- Animate UI se incorpora como código adaptado al sistema visual GOXION, no como estética genérica.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Motion
- Animate UI (componentes seleccionados, añadidos progresivamente)

## Fase 0 — lista

Contratos de Edge Functions inventariados desde los tres archivos oficiales.

## Fase 1 — actual

Prototipo de Catálogo:
- Highlight compartido entre filtros.
- Layout animation.
- AnimatePresence.
- Reduced motion global.
- Sin llamadas reales a Supabase.

## Próximo paso

Construir el shell real de Ayuda y migrar primero:
1. Catálogo.
2. Mi Espacio.
3. Activación.
4. Servicios / beneficios.
5. Soporte.

Después se aborda Index y finalmente Admin, preservando sus contratos.


## Punto de control · 20 sep 2026

Ya migrado y validado en `goxion-next`:

- Shell real de Ayuda con navegación Inicio / Catálogo / Soporte.
- Motion para presencia, layout, morphing y transiciones principales.
- Mi Espacio conectado a `login-goxion` + `mi-espacio`.
- Restauración y cierre de sesión con `goxion_client_token`.
- Dashboard inicial de cliente con datos reales en modo lectura.
- Registro nuevo conectado a `registro-goxion`, conservando estados:
  `new`, `existing`, `review`, `already_requested`.
- Notificación administrativa del registro nuevo mediante `notificar-goxion`.
- Activación completa conectada a `activar-cuenta-goxion`:
  GOXION ID + código de 6 dígitos → PIN de 4 dígitos → espacio activo.
- Catálogo público conectado a datos reales de `mi-espacio` (`modo: publico`)
  y disponibilidad de `inventario-publico`.
- Personalización del catálogo cuando existe sesión (servicios ya contratados
  y recomendaciones básicas).
- Escrituras sensibles de Mi Espacio (pagos, cupones, cancelaciones,
  modificaciones de servicio) siguen bloqueadas hasta su migración específica.

Todos los commits de este punto de control pasan `npm run build` en GitHub Actions.
`main` sigue siendo producción/referencia y no se modifica durante la migración.

### Siguiente bloque

1. Completar Mi Espacio visual con estado de cuenta, historial, lealtad,
   beneficios y accesos reales.
2. Migrar Soporte con contexto real de sesión.
3. Revisar la fidelidad visual de Ayuda contra la versión oficial aprobada.
4. Después migrar Index y, por último, Admin por módulos.
