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


## Revisión de salida · 25 nov 19:38
Capturas del usuario: aviso técnico legado visible en Catálogo y Soporte tras cambiar perfil. Origen localizado: cargarCatalogo en 01f-catalog-orders.js reescribe el banner dinámico. F3: exclusión por flag explícito del candidato, ocultación inicial, limpieza del contenido; se mantiene manejo de error de sincronización independiente. Oficial conserva su ruta histórica hasta promoción. Sin cambios a alertas de Admin ni registros de clientes.

Auditoría inicial estática de 7b7b97b774703d1859e630006e4a35b3fb810d6b: 47 scripts oficiales, 59 candidato; 46 reutilizados, única sustitución 17-b2-prorroga-oficial.js → official-feed-prorroga.js. Referencias locales de scripts comprobadas presentes (los externos no se certifican). El candidato conserva lectura principal mi-espacio y siete lecturas complementarias: cancelaciones, credenciales, novedades, estado de cuenta, accesos, financiero B2 e historial. Mutaciones reutilizan sus controladores. Esto es inventario de conexión, no validación de ejecución ni de permisos. Run 45736855611: pasan Goxy F17, diagnóstico, feedback mock, identidad, Opiniones, realtime y carrito; fallan integridad, hero resolución, browser smoke y modal headers. Prioridad: revisar esos errores, ejecutar matriz de paridad por flujo, luego regresión de sesión y degradación Goxy, después aceptación en Safari del candidato. No declarar listo por aprobación visual.

Goxy: consulta real de metadata QA 25 nov, goxy-ai-qa ACTIVE versión 1, sin interpret/feedbackReady/verified_route. El despliegue anterior fue bloqueado por controles de seguridad; no reintentar ni eludir. Verificar degradación sin IA y conservar rutas estables. Aplazar activación avanzada hasta disponer de procedimiento autorizado y pruebas. No se cambian claves ni funciones.

## Anuncio de lanzamiento (pendiente diseño/validación)
Un único pop-up editorial tipo «Novedades de GOXION», por cuenta/versión/dispositivo, sólo tras sesión válida y sin competir con términos ni otras superficies. Apertura breve premium, portada con marca y mensaje protagonista; 4–5 capítulos visuales con iconos/recursos reales de interfaz: Mi Espacio inteligente (estados y burbujas), beneficios/ahorro, servicios y pagos, Catálogo/carrito, Soporte con Goxy personalizable y Opiniones. Sin scroll automático ni texto interminable; navegación voluntaria, progreso discreto, CTA Explorar Mi Espacio y X canónica. Respetar reduced-motion, foco, móvil, no prometer IA experimental. Reusar controlador de elegibilidad y cierre existente, versión nueva sólo para lanzamiento autorizado; no activarlo durante aceptación ni en oficial anticipadamente. Validar en el mismo candidato, no en laboratorio nuevo.


## Bloque estabilidad A · 25 nov 23:30
Candidato/aceptación: continuidad por pestaña en memoria al tocar cápsula; no reiniciar perfil idéntico por evento client-ready; Historial evita reconstrucción si su contenido no cambia y restaura foco cuando cambia. Conservar sólo historial y cancelaciones pendientes no sensibles cuando falla su lectura, por misma cuenta en memoria; nunca reutilizar PIN/accesos/entregas ni valores financieros. Estado financiero incompleto muestra sincronización, no calcula saldo. Aviso discreto de última información si error parcial/total, recuperación online y limpieza de secretos; 401 invalida sesión. QA recibe alertas de su API aislada igual que candidato. Se conserva lectura principal antes de siete lecturas complementarias concurrentes; optimización selectiva de peticiones pendiente del mapa de dependencias. Prueba focal añadida; CI y Safari pendientes. Oficial y datos reales sin cambios.
