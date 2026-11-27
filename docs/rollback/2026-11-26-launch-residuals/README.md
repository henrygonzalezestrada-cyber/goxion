# Rollback · Admin experience + WebKit auth resilience (26/nov/2026)
- Base exacta del sitio: commit c54fd37c38d35dbdd9ccf0bd3d7834271fe712fa. No se sustituye ayuda.html ni motor financiero. Restaurar sólo los paths de la comparación de la rama de reparación; no resetear/forzar main.
- G: controlador original blob 4528b2d597a183ce8f836375e79977db3bf8a922; controlador certificado blob 1a9f1b0df91c14ef39435b9c642be55d168d90ac. Si se reproduce regresión, revertir controlador y versión de caché de espejo/QA, conservar evidencia y no borrar piloto H.
- Edge experiencia-servicio-admin v1 original exacto en este respaldo. Si la corrección falla, desplegar esa fuente sólo en el proyecto afectado con verify_jwt=false (autenticación HMAC interna), nunca revelar ni regenerar secretos. Restaurar JS Admin desde base y cambiar cache-bust. Escritor de compensaciones, validación de reportes y finanzas permanecen intactos. Verificar 401 visitante y 200 sesión Admin legítima después de restaurar. No reenviar/calificar/compensar datos reales para probar.

- Admin operaciones v14 y credenciales cliente v6: respaldo exacto de producción. Si aparece regresión, revertir sólo la función del proyecto afectado; conservar autenticación HMAC interna y repetir guardas 401/lectura autenticada. No revertir motores, datos, Vault ni piloto.

- C9: `15-promotions-catalog-c1-before-c9.js` es la fuente exacta anterior a la corrección de cierre. Revertir sólo ese controlador y el cache-bust correspondiente en los tres HTML si reaparece una regresión; no sustituir el HTML oficial con el espejo. CI focal 45922465017 PASS del smoke original.

- C9 segunda corrección: si hay regresión, restaurar sólo `assets/js/ayuda/15-promotions-catalog-c1.js` y `assets/css/ayuda.css` desde base estable o revertir el commit específico `db6eaa00f3d1ccbae592451ec5174944663cee60`; restaurar sus cache-bust, nunca reset/force ni promover todo el espejo. CI focal 45923415744 y completo 45923415871 PASS 3/3.
