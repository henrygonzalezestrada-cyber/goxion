# GOXION · Inventario de normalización de nombres (12/nov/2026)

**Estado:** auditoría parcial verificada en producción y GitHub; no constituye autorización para borrar. Política: `docs/ENGINEERING_HYGIENE_POLICY.md`.

| Componente | Estado comprobado | Tratamiento |
|---|---|---|
| Motor de obligaciones y aprobación V1 | OFICIAL, en producción; PR #204 | Fuente única de aprobación, sin nuevo escritor |
| `acciones-financieras` | OFICIAL, activa (v12) | Conservar |
| `acciones-financieras-b2-beta` | **ACTIVO, nombre heredado** (v12), consumido desde Admin | Migrar consumidores a un nombre canónico después de pruebas y mantener alias temporal; **no borrar** |
| `estado-financiero-b2-beta` | ACTIVO, nombre heredado (v8) | Auditar consumidores Index/Admin y distinguir alias de motor |
| `comprobantes-b2-beta` | ACTIVO, nombre heredado (v4) | No eliminar; tiene comprobantes reales |
| `periodo-cobro-beta`, `admin-operaciones-beta` | ACTIVOS, herencia; escritores antiguos bloqueados por release V1 | Confirmar consumidores; alias no debe acreditar dinero |
| `login-goxion-beta`, `mi-espacio-beta`, `inventario-beta`, `admin-ajustes-beta` y otras Edge beta | AÚN DESPLEGADAS; uso/consumidores no verificados | NO deducir desuso por el sufijo. Inventariar referencias y tráfico antes de retirar |
| `goxion_aprobar_pago_periodo_atomico`, `goxion_registrar_pago_parcial_atomico` | HISTÓRICAS, `service_role` sin permiso EXECUTE | Documentar y mantener bloqueadas hasta comprobar dependencias |
| `goxion_b2_aprobar_abono`, `goxion_b2_aprobar_comprobante` | HISTÓRICAS, `service_role` sin permiso EXECUTE | Mantener bloqueadas, con rollback documentado |
| `QA_ADM_` | Política prohíbe nuevas referencias productivas | Buscar y depurar solo dentro del código activo, archivar fuentes anteriores |
| `preview/`, migraciones de octubre, demos | HISTÓRICO o QA; algunas pantallas siguen sirviendo como laboratorio | Nunca promover copiando código viejo; marcar encabezado y actualizar referencias |

## Regla operativa

No realizar una eliminación masiva. Para cada ruta: buscar consumidores, verificar tráfico/roles, introducir nombre oficial (sin sufijo), probar equivalencia, redirigir el alias sin segundo escritor, bloquear acceso viejo y finalmente retirarlo con respaldo. Un alias activo no es un componente de pruebas.

## Verificaciones de esta auditoría

- Producción (conteo SQL exacto): 21 clientes, **41 pagos** (el último del Cliente Prueba, generado antes de esta rama), 2 regímenes B2 activos; 0 grupos duplicados por cliente/periodo entre pagos con estado `pagado`; funciones de pago antiguas sin permiso de ejecución para `service_role`.
- PR #204 y PR #205 fusionados; la política de higiene ya existe en `main`.
- Producción: **51 Edge activas**, de las cuales **23 terminan en `-beta`** y una usa el sufijo `-preview`. **La limpieza de nombres no está concluida**.
- Auditoría de funciones SQL `public`: **0 funciones activas contienen el identificador `QA_ADM_`**. El código histórico fuera de `public` y las funciones Edge requieren auditoría independiente.

### Inventario exacto de las 23 Edge con sufijo `-beta` aún activas

```text
login-goxion-beta                 mi-espacio-beta
notificar-goxion-beta             admin-ajustes-beta
inventario-beta                   inventario-publico-beta
admin-datos-beta                  admin-operaciones-beta
admin-campos-beta                 periodo-cobro-beta
trato-justo-beta                  accesos-admin-beta
cuentas-plataforma-admin-beta     credenciales-admin-beta
estado-cuenta-beta                accesos-cliente-beta
promociones-admin-beta            beneficios-admin-beta
acciones-financieras-b2-beta      estado-financiero-b2-beta
comprobantes-b2-beta              b2-f4-discord-beta
goxy-ai-beta
```

Este inventario confirma **despliegue**, no uso ni equivalencia. El sufijo no demuestra que sea código basura; clasificar consumidores antes de borrar.

**Pendientes antes del cierre:** consumidores reales, tráfico, permisos, coincidencia de SHA de fuente Edge/SQL, pruebas de regresión de los clientes activos, cambio de nombre con alias de solo encaminamiento y limpieza de referencias. No borrar tablas ni recibos históricos.
