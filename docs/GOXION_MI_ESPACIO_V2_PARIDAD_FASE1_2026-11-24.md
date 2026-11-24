# GOXION · Paridad funcional, fase 1 · 24 nov 2026

Referencia visual: ayuda-espejo-feed-v2.html. Oficial funcional: ayuda.html. No promoción a oficial.
- Misiones: desactivación respetada; ciclo de cupón vigente; acción por tarea y CTA principal; pago, feedback, catálogo, soporte, referidos, compartir, enlaces y actividad manual mediante API existente. Confeti por confirmación del servidor.
- Referidos: enlace real de WhatsApp con folio; compartir/copiar y acreditar tipos oficiales. Se añaden solo dos controles textuales (Realizar y Copiar enlace de invitación) sin nuevos iconos ni superficies.
- Notificaciones: el controlador compartido conserva su fallback oficial y acepta un destino V2 únicamente cuando existe el adaptador de sesión del espejo. Servicio, cupón y referido abren el feed visible.
- Novedades: marcado oficial al abrir servicio 850 ms, no confirmar credenciales de contraseña mediante ese gesto.
- Lealtad: condiciones de niveles 4/9 y 3/6% en detalle existente.
- Recompensas: verificados en producción los triggers goxion_sync_cupon_misiones_beneficio y goxion_sync_referido_beneficio: generan aviso Admin al reservar beneficio. No duplicar con notificarAdmin desde V2; entrega externa adicional de la oficial aún no certificada.
- Pruebas: 35/35 contratos originales, sintaxis JS, pruebas puntuales adicionales de desactivación/ciclo y rutas de tareas. Sin mutar cuentas reales. No se ejecutó navegador real ni aceptación de escrituras. 
- Siguiente fase: fuentes reales del historial, fechas efectivas; luego Admin/Trato Justo y aceptación aislada. Mantener el diseño aprobado. No publicar hasta cerrar puertas de regresión.

## Corrección de presentación aprobada · 24 nov 2026
Rollback visual acotado: se retiran «Copiar enlace de invitación» y los botones independientes «Realizar». Referidos conserva un CTA «Compartir invitación», con menú nativo y alternativa de copia. Misiones conserva filas con Pendiente/Completada; las pendientes son controles de fila completos y el CTA existente continúa la siguiente tarea. Se mantienen las conexiones, validación de servidor, animaciones y demás correcciones de fase 1. No se modifica la oficial.
