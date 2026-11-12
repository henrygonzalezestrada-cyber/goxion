# GOXION · Política obligatoria de cambios y limpieza técnica

**Vigente desde el 12 de noviembre de 2026.** Se aplica a personas y asistentes de IA en el repositorio público, motor financiero privado, Supabase y Edge. Referencia obligatoria: `AGENTS.md`.

## Regla de oro

**Una sustitución solo está terminada cuando el código nuevo funciona, el anterior ya no participa, todos sus consumidores se actualizaron y existe evidencia de prueba y reversión.** No basta con hacer que un botón funcione. No se permiten rutas financieras duplicadas ni archivos `beta` que se confundan con la fuente productiva.

## Procedimiento mínimo para cada cambio

1. **Identificar al propietario actual:** buscar HTML/JS, Edge, RPC, triggers, tablas, CI, consumidores, permisos y archivos en el repo público/privado. Escribir en el PR qué reemplaza exactamente y qué NO reemplaza.
2. **Respaldar antes de sustituir:** guardar versión de SQL/Edge afectada fuera del runtime en `docs/rollback/<fecha>/` con instrucciones de restauración; no guardar secretos, tokens ni datos personales.
3. **Implementar una sola ruta autorizada:** Admin autentica; Edge usa `service_role` internamente; el motor común verifica saldo/obligación/idempotencia y conserva recibos, promociones, mora y lealtad. No crear escritores paralelos como alternativa silenciosa.
4. **Retirar lo obsoleto en el mismo cambio o registrar su bloqueo explícito:** sustituir referencias de código, pruebas, registros, documentación y nombres; si aún hay consumidores, mantener alias de compatibilidad de SOLO enrutamiento, sin segundo escritor, con fecha y criterio verificable de retiro.
5. **Probar antes y después:** QA, reintentos, pagos parciales y completos, B2, concurrencia si hay dinero, errores de saldo, roles de acceso, 21/21 saldos y cero cambios en recibos cuando la prueba es reversible. No promover cambios financieros a producción por pruebas estáticas exclusivamente.
6. **Publicar con control:** primero SQL protegido, después Edge oficial; validar API con sesión real de operador cuando sea posible. Si la prueba no está hecha, documentar el límite; no anunciar 100% ni ocultar fallos.
7. **Mantener las tres superficies intactas visualmente:** Index, Admin y Ayuda conservan identidad, CSS, animaciones y organización salvo cambio visual autorizado. No usar arreglos visuales para resolver un bug financiero.
8. **Errores comprensibles:** toda operación que falle devuelve un `codigo` estable y texto en español con acción concreta; el frontend NO imprime directamente trazas SQL, variables internas, tokens ni excepciones crudas. Conservar identificador de operación y catálogo técnico para soporte.
9. **Actualización de documentación y CI obligatoria:** en el mismo PR actualizar `AGENTS.md` si cambia la arquitectura, `docs/ADMIN_FUNCTION_REGISTRY.md`, los tests y el inventario de componentes. No cerrar el PR si apuntan a escritores que ya están retirados.

## Nombres beta y rutas históricas

- **Prohibido crear componentes `-beta`, `_qa`, `preview` o `legacy` como nombre definitivo de una ruta nueva de producción.** Un prototipo vive en el espacio de prototipos; su promoción implica nombre estable, actualización de todos los consumidores y retiro controlado del alias.
- **Excepción heredada documentada:** `acciones-financieras-b2-beta` sirve actualmente comprobantes reales del Admin productivo, aunque conserva un nombre histórico. **No borrarlo ni renombrarlo sin migrar primero** todos los consumidores de Admin y comprobar sus sesiones, CORS, RPC y evidencia financiera. Su estado es `ACTIVO / NOMBRE PENDIENTE DE NORMALIZAR`, no `CÓDIGO DE PRUEBAS`.
- Otras rutas beta pueden tener usuarios reales. No borrar por coincidencia de nombre. Clasificar cada una como **ACTIVO**, **ALIAS DE TRANSICIÓN**, **BLOQUEADO** o **ARCHIVO** mediante búsqueda de dependencias y verificación de tráfico.
- Los escritores SQL históricos `goxion_aprobar_pago_periodo_atomico`, `goxion_registrar_pago_parcial_atomico`, `goxion_b2_aprobar_abono` y `goxion_b2_aprobar_comprobante` fueron revocados a `service_role` tras el corte V1. Permanecen como **legado bloqueado**, no como ruta vigente. Su eliminación física requiere evaluación de dependencias y restauración segura; nunca borrar pagos/recibos históricos.
- **Ningún identificador `QA_ADM_` o mensaje de prototipo debe quedar dentro de una función SQL productiva nueva**. El hotfix de aprobación mensual V1 de 2026-11-12 sustituye esos identificadores por `MOTOR_ADMIN_`.

## Criterios para cerrar un PR de sustitución

- [ ] Consumidores, nombre canónico y permisos documentados.
- [ ] Fuente productiva nueva coincide con la desplegada.
- [ ] Ruta antigua deshabilitada o alias sin escritura, y retiro registrado.
- [ ] Códigos de error y catálogo actualizados.
- [ ] Pruebas funcionales y reversibles reproducibles, sin cobros ficticios persistentes.
- [ ] Sin regresiones en Admin/Index/Ayuda ni en comportamiento Safari.
- [ ] Backups y rollback, auditoría de saldos y constancia de lo que **no** pudo comprobarse.

**No alterar la historia:** los documentos y migraciones `beta`/`legacy` antiguos permanecen como evidencia de etapas pasadas; solo se marcan como históricos y se evitan como fuente actual. El inventario vigente y los flujos reales tienen precedencia sobre informes de 2026-10.
