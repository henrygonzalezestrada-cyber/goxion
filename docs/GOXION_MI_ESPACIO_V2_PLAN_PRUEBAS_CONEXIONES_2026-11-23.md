# GOXION Mi Espacio · fase de conexiones oficiales

23 de noviembre de 2026. El usuario aprobó las correcciones visuales principales del espejo. Se congela su ADN visual; la aprobación de apariencia no equivale a paridad funcional certificada. No agregar selectores de escenarios al feed ni tocar ayuda.html durante las pruebas.

## Estrategia

- Nivel A: pruebas de interfaz y contratos con datos sintéticos aislados (sin escrituras a producción).
- Nivel B: pruebas end-to-end con la misma implementación de controladores, APIs y base de datos en entorno aislado de preproducción, preferentemente rama/proyecto Supabase con datos sintéticos. Probar estados raros mediante fechas/operaciones de prueba controladas, nunca alterar reloj global de producción.
- Nivel C: cliente de prueba existente, únicamente después de confirmar identidad inequívoca, respaldar estado, comprobar que está aislado de facturación real, credenciales compartidas, usuarios reales y notificaciones externas. Si no puede aislarse, no hacer pruebas transaccionales en producción. Generar cambios por las operaciones oficiales del Admin y del cliente, no por update manual de flags. Pruebas negativas y reversión; limpiar registros de prueba sin borrar histórico real.
- No activar ENABLE_WRITES globalmente en espejo público ni implementar permisos de prueba sólo en frontend. Mantener control server-side y usar backend de pruebas para operaciones con efectos reales.

## Matriz de aceptación

| Orden | Recorrido | Evidencia esperada |
|---|---|---|
| 1 | Al corriente, cliente nuevo, próximo vencimiento, vencido, suspendido | Hero y saludo correctos; CTA oficial; no datos inventados. |
| 2 | Comprobante de prueba, revisión, rechazo, pago incompleto, acreditación | Transiciones oficiales; importes, fechas y notificaciones; sin pagos reales. |
| 3 | Solicitar y aprobar prórroga; expiración por fecha de prueba | Acuerdo confirmado, vencimiento correcto y estado posterior. |
| 4 | Dos fechas B2; pago de una obligación; consolidar al cancelar último servicio de una fecha | No duplicar cargo; conservar otra obligación y ruta oficial. |
| 5 | Cancelación, oferta de retención, aceptar/rechazar, baja efectiva | Servicio sólo desaparece al efectuar la baja; Admin y cliente consistentes. |
| 6 | Misiones, cupón, referido, lealtad (incluida pérdida de racha) | Registro oficial; confeti sólo tras confirmación; idempotencia. |
| 7 | Credenciales sintéticas, PIN, invitaciones, soporte contextual | Autorización, múltiples accesos y entrega única; sin exposición de secretos. |
| 8 | Historial, ahorro, contador y acciones de notificaciones, actualización entre sesiones | Datos reales de prueba, persistencia, gestos, reconexión. |
| 9 | Catálogo, Soporte, inicio público, documentos, Safari móvil | Sin regresiones ni dependencias legacy innecesarias. |

## Publicación

Sólo promover exactamente la versión probada; comparar diffs con oficial, eliminar dependencia legacy sólo después de sustituir funcionalmente sus controladores, realizar regresiones, preparar reversión. No prometer cero errores; no reconstruir la interfaz al lanzar.

## Ahorro

Disney+ Premium 4K $339 MXN/mes (https://www.disneyplus.com/es-mx). Google One 2 TB, oferta pública Google AI Plus $199 MXN/mes (https://apps.apple.com/mx/app/google-one/id1451784328). Referencia de capacidad, no equivalencia de funciones IA ni almacenamiento individual. No tocar tarifas de clientes. Mostrar «de ahorro estimado al mes» y aclarar contratación directa y cobertura parcial; mantener metodología accesible.
