# GOXION · Cierre visual y aceptación final
25 noviembre 2026 · candidato único · sin autorización de promoción aún.

## Referencias
- Candidato: [ayuda-espejo-feed-v2.html](../ayuda-espejo-feed-v2.html).
- [Baseline visual aprobado b4052d1b](https://github.com/henrygonzalezestrada-cyber/goxion/commit/b4052d1b835dd6663f1a09549b7f189f03464467); [manual](GOXION_DESIGN_SYSTEM.md); [histórico](GOXION_AYUDA_MACROACTUALIZACION.md).
- [Pages verificado](https://github.com/henrygonzalezestrada-cyber/goxion/actions/runs/45736159649), [CI última ejecución](https://github.com/henrygonzalezestrada-cyber/goxion/actions/runs/45736159632).

## Alcance congelado
Mi Espacio, Catálogo y Soporte del candidato tal como aprobados; no nuevos rediseños. Conservar controladores y funciones reales. Hero estados secundarios: incidencia global + cancelaciones secundarias; no confundir campana con estados. Goxy identidad aprobada y Opiniones aprobada. No crear laboratorios visuales adicionales; automatización aislada sí, sin escrituras en producción. Admin e Index fuera de rediseño.

## Goxy: independencia del lanzamiento
El bloqueo previo del despliegue QA de goxy-ai-qa no autoriza reintentar o eludir el control. No es requisito para publicar interfaz, avatar, navegación, guías locales, diagnóstico determinista o derivación a asesor, si la degradación se verifica. El cliente consulta status; aiConfigured requiere ok/configured/providerReady; si no, escalateAutomatically usa escalationFallback. Consultas de cuenta/pronóstico deterministas dependen del endpoint existente: verificar sesión y errores, no prometer disponibilidad sin prueba. Producción usa goxy-ai-beta; no reemplazarlo por goxy-ai-qa. Feedback, interpretación semántica nueva, recuperación de rutas supervisadas y visión experimental quedan aislados por flags QA; no anunciar como disponibles. No modificar IA ni activar/desplegar experimentos en esta fase. Preferencia de color local por cuenta/dispositivo; sincronización entre dispositivos pendiente y separable.

## Puertas de salida
| Área | Evidencia / acción pendiente |
| --- | --- |
| Aprobación visual | Usuario aprobó hero F2, identidad Goxy y Opiniones; preservar todos los estados y animaciones del manual |
| Integridad | Revisar fallas vigentes de manifest/referencias/scripts, sin ocultarlas |
| Hero | CI F2 no muestra panel de resolución en smoke. Diagnosticar raíz, comprobar alta, actualización, cierre, reapertura y pérdida de red, sin tocar diseño aprobado. Versión de incidencia no expuesta por API: dedupe local imperfecto si ciclos idénticos no se observan; decidir arreglo o límite explícito antes de publicar |
| Sesiones | Probar acceso/salida, login, navegación pública/privada y ausencia banner en sesión cerrada |
| Cobro y calendarios | Rechazo/acreditación, revisión, vencido, prórroga, pago incompleto, calendario independiente y ruta Index; no transacciones reales innecesarias |
| Servicios | Accesos/PIN protegidos, cancelación/retención/seguimiento, novedades; restablecer pruebas reales sólo con autorización específica |
| Beneficios y catálogo | Lealtad, misiones, referidos, ahorro, compra/carrito (usuario ya validó pedido; no duplicarlo); comprobar regresiones relevantes |
| Soporte y Goxy | Prueba de fallback sin proveedor, rutas de consulta/asesor y ausencia de botones experimentales rotos; CI F17/diagnóstico/identidad pasan, browser smoke legado Soporte falla |
| Opiniones y campana | CI Opiniones y realtime pasan; no reenviar opiniones ni avisos reales para repetir pruebas ya válidas |
| Safari y movimiento | Verificar cierre C9 WebKit y modal-headers; contrastar pruebas antiguas con contrato actual, no eliminar cobertura |
| Publicación | Tras aceptación técnica y autorización expresa, respaldo inmutable de oficial anterior, promover el mismo espejo validado y comprobar sesión/recursos; plan de rollback |

La actualización no debe quedar rehén del aprendizaje de Goxy. Bloquean salida los fallos relevantes de la experiencia que se va a publicar, no el aplazamiento de módulos opcionales. No confundir aprobación de diseño con resultado de pruebas. No se ha publicado oficial ni se ha cambiado base de datos.
