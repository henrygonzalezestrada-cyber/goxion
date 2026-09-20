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
