# GOXION · Catálogo de errores financieros para Admin y soporte

El mensaje de pantalla debe tener **explicación en español + qué hacer + código estable**. La operación real se valida en Supabase; este catálogo no autoriza forzar pagos ni saldos. Para compartir un incidente con otra IA, enviar código, acción, fecha, versión y estado de cuenta sin secretos.

| Código visible | Significado | Acción del administrador / pista técnica |
|---|---|---|
| `FIN-PARCIAL-001` | Falla al preparar un registro de parcialidad, por ejemplo `record "v_parcial" is not assigned yet`. | Comprobar que la función productiva use `jsonb` inicializado a `null` en el cierre completo; verificar `public.goxion_motor_admin_mensual_v1` y reintentos con ROLLBACK. |
| `FIN-SALDO-409` | El monto ingresado o el saldo restante ya no coincide con la cotización. | Recargar ficha, comparar importe en centavos y período; no reutilizar una operación con importe distinto. |
| `FIN-PERIODO-409` | Período o fecha de snapshot cambiaron. | Recargar estado, comprobar `periodo_pendiente` y liquidación anterior. |
| `FIN-COMPROBANTE-409` | El comprobante no concilia con su cargo o su evidencia. | Revisar carga de evidencia, cliente, cargo, importe y estado `reportado/aprobado`. |
| `FIN-REVISION-409` | Existe revisión pendiente de un pago global. | Resolverla antes de cambiar a B2; no crear un cargo paralelo. |
| `FIN-CALENDARIO-409` | Calendarios insuficientes **o** fechas de cobertura abonada confundidas con próximos vencimientos del periodo. | Verificar accesos activos, cobertura pagada, `dia_corte`, próxima renovación, periodo global y pagos existentes. No cambiar coberturas para forzar el botón; usar la proyección SQL del motor híbrido cuando el corte controlado esté desplegado. |
| `FIN-SERVICIO-COMPROMETIDO-409` | Intento de cancelar un contrato mientras su ciclo B2 ya tiene comprobantes, abonos, prórrogas, eventos o beneficios asociados. | No repetir ni borrar filas. Resolver el compromiso financiero o programar cancelación futura; usar el motor oficial. |
| `FIN-SERVICIO-ULTIMO-409` | Se pretende quitar el último servicio del cliente. | Gestionar la suspensión o baja de cuenta conservando historial. |
| `FIN-SERVICIO-CICLOS-409` | Hay obligaciones pendientes en distintos periodos B2. | Conciliar primero todos los ciclos; no eliminar su historial. |
| `FIN-CONCILIACION-409` | Suma, base, descuento, mora o vencimiento difieren del motor oficial. | Detener aprobación y comparar contrato/obligaciones; no forzar el saldo. |
| `FIN-AUTORIZACION-401` | Sesión administrativa expirada o no autorizada. | Volver a iniciar sesión; nunca pedir ni enviar tokens a soporte. |
| `FIN-DATOS-400` | Campos inválidos o incompletos. | Revisar cliente, importe, período y datos de la operación. |
| `FIN-INTERNO-500` | Error no clasificado o fallo de servidor. | Confirmar en Admin si la operación quedó registrada antes de reintentar; inspeccionar logs con fecha, ruta y operación. |

## Modelo para copiar a soporte o una IA

```text
GOXION · incidencia financiera
Fecha/hora y zona: ...
Pantalla y operación: Admin → Validación de pago → Aprobar / Pago incompleto / Rechazar
Código: FIN-...
ID de operación (si aparece): ...
Cliente: folio o identificador no sensible ...
Saldo mostrado y período (sin datos bancarios): ...
¿Apareció recibo después de refrescar?: sí/no
Resultado esperado: ...
Resultado observado: ...
```

**Nunca pegar contraseñas, llaves Supabase, tokens HMAC, datos bancarios ni evidencias privadas.**

## Incidente del 12 de noviembre de 2026

- `FIN-PARCIAL-001`: una función productiva utilizaba `v_parcial record` sin asignación en la rama de pago completo. Se corrigió inicializando un objeto JSON para el resultado opcional y probando parcial → cierre → replay con `ROLLBACK` sobre Cliente Prueba; su saldo no fue modificado por las pruebas.
- Cliente Prueba: revisión del plan B2 de producción devolvió `ESTABLE_FECHA_UNICA`: un servicio/acceso activo, un calendario verificado y un comprobante global en revisión. No se activa B2 sin dos fechas confirmadas reales y resolución de la revisión.
- El nombre `acciones-financieras-b2-beta` sigue siendo una ruta productiva activa; el cambio de nombre se debe tratar como migración compatible, no borrado manual.
