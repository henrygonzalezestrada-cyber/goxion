# GOXION

Aplicación web de GOXION para clientes, soporte y administración.

## Producción

- `index.html` — entrada principal / router de cliente.
- `ayuda.html` — Mi Espacio, catálogo, soporte, pagos, registro y activación.
- `admin.html` — panel administrativo.

Sitio oficial: https://henrygonzalezestrada-cyber.github.io/goxion/

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
