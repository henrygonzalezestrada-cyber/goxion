# GOXION

Aplicación web de GOXION para clientes, soporte y administración.

## Producción

- `index.html` — entrada principal / router de cliente.
- `ayuda.html` — Mi Espacio, catálogo, soporte, pagos, registro y activación.
- `admin.html` — panel administrativo.

Sitio oficial: https://henrygonzalezestrada-cyber.github.io/goxion/

## Estado actual y punto de partida de cualquier chat

**GOXION B2 fue integrado con activación individual, calendario por perfil, próximo pago destacado y notificaciones.** El cierre F0–F5 y las lecciones aprendidas se documentan en:

**[Estado oficial, lecciones y continuidad (14/oct/2026)](docs/GOXION_ESTADO_Y_LECCIONES_2026-10-14.md)**.

**Antes de proponer nuevas fases o replicar componentes**, consultar ese reporte y `AGENTS.md`. Las hojas de ruta con fecha anterior conservan el valor histórico, pero no describen necesariamente la versión vigente. La rama `main` es producción; activar B2 para una cuenta requiere confirmación individual desde su calendario de Admin, no solo guardar fechas.

## Contratos de continuidad visual y financiera

Antes de cualquier nueva tarea en Admin, Ayuda o Index, leer [AGENTS.md](AGENTS.md) y el [contrato visual GOXION](docs/GOXION_VISUAL_CONTRACT.md). Para fechas independientes, leer también la [hoja de ruta financiera](docs/GOXION_MULTI_DATE_ROADMAP.md). Estos documentos hacen explícitos los criterios acordados y evitan depender del contexto de un chat anterior; el autor debe consultar los archivos reales antes de editar.

## Estructura

```text
/
├─ index.html
├─ ayuda.html
├─ admin.html
├─ assets/
│  ├─ css/                 estilos externalizados por superficie
│  └─ js/
│     ├─ core/             runtime y utilidades compartidas
│     ├─ index/
│     ├─ ayuda/
│     └─ admin/
├─ logos/                  recursos de plataformas
├─ docs/                   arquitectura y documentación
├─ scripts/                validación, smoke tests y servidor preview
├─ types/                  contratos estáticos de dominio
├─ package.json
└─ jsconfig.json
```

## Flujo de trabajo

- `main` es producción.
- Los cambios se desarrollan en una rama separada y entran a `main` mediante Pull Request.
- Cada PR a `main` ejecuta la validación de integridad y smoke tests en Chromium + WebKit.
- `goxion-modern-v2` se conserva mientras siga siendo la fuente del preview de Railway.
- `backup-main-pre-modernization-2026-09-22` conserva el oficial anterior a la modernización.

## Comandos

```bash
npm run verify
npm run test:smoke
npm run serve:preview
```

## Nota de mantenimiento

Los archivos HTML de betas y respaldos históricos no viven en la raíz de producción. Si se necesita recuperar alguno, permanece disponible en el historial de Git y en las ramas de respaldo.

## Mapa de funciones (obligatorio antes de desarrollar)

Antes de añadir una función a Admin, Ayuda, Index o Supabase, consultar [el registro canónico de funciones y dependencias](docs/ADMIN_FUNCTION_REGISTRY.md). Se conserva la navegación e interfaz aprobadas; evitar módulos que dupliquen operaciones ya activas.
