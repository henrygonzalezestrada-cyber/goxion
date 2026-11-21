> **DOCUMENTO HISTÓRICO.** Esta versión correspondía al piloto o a una etapa previa. El estado oficial y las reglas desplegadas están en [Lanzamiento general del 21/11/2026](./LEGAL_V2_LANZAMIENTO_GENERAL_2026-11-21.md).\n\n# GOXION — Restricción por rechazo de términos · piloto Cliente Prueba

Fecha de despliegue: 20 de noviembre de 2026.
Ámbito: **exclusivamente Cliente Prueba** (`091e79b7-c60b-4d50-bb98-a047bfc0dbb4`).
No ejecutar pruebas con Luis ni desactivar clientes reales.

## Regla

- Términos 2.0 publicados para todas las cuentas. La **lógica de restricción** solo se activa para Cliente Prueba.
- Sin decisión o aceptado: comportamiento comercial previo.
- Rechazado: bloquear desde servidor las mutaciones de Mi Espacio y el flujo de cancelaciones; no nuevas renovaciones, cupones, beneficios o cancelaciones. Mientras haya cobertura activa verificada conserva vista de accesos y estado de cuenta. Catálogo oculto en UI.
- Cobertura vencida: a partir del día natural posterior a la mayor `cobertura_hasta` de los **accesos activos de servicios activos**, zona `America/Merida`, aparece pantalla restringida sin navegación, con `Revisar y aceptar términos`, `Cerrar sesión`, `Comprobantes y aclaraciones`.
- Una cobertura faltante/no verificada, servicio activo sin acceso activo o comprobante en revisión **no permite dar por agotado** el periodo; requiere conciliación manual. Los calendarios de servicios ya inactivos son históricos y no extienden la cobertura.
- Los tokens existentes siguen siendo de 30 días; las verificaciones y prohibiciones son del servidor, no únicamente de CSS.
- Admin lista una única alerta de baja pendiente cuando se cumplen las condiciones. El operador debe confirmar explícitamente la **baja interna**. Se desactivan `cliente_servicios` y `cliente_accesos` solo de Cliente Prueba, en una transacción, preservando historiales y anotando `goxion_legal_bajas_piloto`.
- La eliminación de accesos en Netflix/YouTube/otras plataformas sigue **manual**. No hay botones de reactivación automática.
- Si acepta antes de la baja, desaparece la alerta. Si acepta después, podrá contratar de nuevo, pero la baja interna no se revierte.

## Componentes instalados

**Supabase**
- RPC `public.goxion_legal_piloto_estado(uuid)`: lectura por service role, reconocimiento de decisión, calendarios verificados, comprobantes y servicios activos; `SECURITY INVOKER`, ejecución revocada a `anon` y `authenticated`.
- RPC `public.goxion_legal_piloto_finalizar(uuid)`: operación transaccional y repetible por Admin autenticado y protegida por service role, rechaza cualquier UUID ajeno a Cliente Prueba.
- Tabla RLS `public.goxion_legal_bajas_piloto`: registro auditable de baja interna.
- `legal-consent-v2` v5, `mi-espacio` v19, `cancelaciones-cliente` v5, `credenciales-cliente` v5, `accesos-cliente-beta` v4, `admin-operaciones` v12.

**Mi Espacio**
- `assets/js/ayuda/21-legal-v2-documents.js`: emite evento `goxion:legal-state` tras estado o decisión.
- `assets/js/ayuda/22-legal-access-pilot.js` y `assets/css/goxion-legal-access-pilot.css`: pantalla restringida, vista de historial y deshabilitación de navegación comercial.
- Cargado en `ayuda.html` con caché versionada.

**Admin**
- `assets/js/admin/36-admin-legal-bajas-pilot.js` y `assets/css/admin-legal-bajas-pilot.css`: tarjeta integrada en Operaciones y señal breve en Resumen. Confirmación doble, nunca eliminación física externa.
- Cargado en `admin.html`.

## Pruebas ya ejecutadas sin alterar datos definitivos

1. Consulta real confirmó: Cliente Prueba tiene un servicio/acceso activo (Crunchyroll), con cobertura verificada 15/11/2026. Sus otros dos calendarios corresponden a servicios y accesos **inactivos**, y no deben prolongar el acceso.
2. Transacción `BEGIN ... ROLLBACK`: rechazo temporal produjo `fase=restringido`, `baja_pendiente=true`, cobertura máxima 15/11.
3. Transacción `BEGIN ... ROLLBACK`: activación temporal de tres coberturas diferentes produjo `fase=rechazado_vigente` con máxima cobertura 20/12/2026, sin alerta de baja.
4. Transacción `BEGIN ... ROLLBACK`: baja interna simulada desactivó servicios y accesos sin persistir el cambio.
5. Verificada sintaxis JavaScript, balance de CSS, inclusión de scripts y estado ACTIVE de Edge Functions.
6. Verificado que roles públicos no tienen permiso EXECUTE sobre las funciones RPC.
7. No se creó rechazo real para Cliente Prueba y no se confirmó ninguna baja.

## Pendiente antes de habilitar a clientes reales

- Recorrido de navegador de Cliente Prueba: rechazo, renovaciones bloqueadas, periodo vigente y vencido, lectura de historial, aceptación y cancelación del aviso, operación confirmada en Admin.
- Auditar los demás endpoints comerciales transaccionales antes de ampliar el piloto; las rutas incluidas garantizan la restricción de los flujos enumerados, **no** se presume una cobertura universal sobre todas las integraciones.
- Nunca desplegar restricciones a clientes reales sin verificar reconciliación de pagos/cobertura, rutas de soporte y revocación de operaciones.
