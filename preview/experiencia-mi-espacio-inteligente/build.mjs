/* GOXION · Experiencia E1/B1. Published as one isolated reviewable beta. Mirror extracted from Ayuda official.
 * No sessions, billing runtime, orders or real user data.
 */
import fs from 'node:fs';
const official=fs.readFileSync('ayuda.html','utf8');
const start='<div class="view-section" id="view-dashboard">';
const end='<div class="view-section" id="view-catalogo">';
const i=official.indexOf(start),j=official.indexOf(end,i);
if(i<0||j<=i)throw Error('Movieron estructura oficial de Mi Espacio');
let dashboard=official.slice(i,j);
const anchor='<div class="glass-card tab-container" id="goxion-main-nav">';
const ns=official.indexOf(anchor);
const ne=official.indexOf('<div class="view-section" id="view-inicio">',ns);
if(ns<0||ne<=ns)throw Error('Movieron navegación oficial');
let nav=official.slice(ns,ne);
const strip=s=>s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
dashboard=strip(dashboard);
nav=strip(nav);
if(/<(script|iframe|form)\b/i.test(dashboard+nav))throw Error('HTML activo inesperado');
// Reuse the ALREADY EXISTING billing card; never introduce a second
// "priority" card above it. This is a contextual presentation, not alerts.
const label='<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); text-align: center;">Tu próxima fecha de corte</div>';
if(!dashboard.includes(label))throw Error('Movieron encabezado de tarjeta financiera');
dashboard=dashboard.replace(label,
 '<div id="gx-smart-card-heading" class="gx-smart-card-heading">PRÓXIMO VENCIMIENTO</div>');
const badge='<div id="dash-badge" style="text-align: center;"></div>';
if(!dashboard.includes(badge))throw Error('Movieron indicador financiero');
dashboard=dashboard.replace(badge,badge+
 '<p id="gx-smart-card-description" class="gx-smart-card-description" hidden></p>');
const html="<!doctype html>\n<html lang=\"es-MX\" data-gx-smart-beta=\"true\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#030305\">\n<title>GOXION · Mi Espacio · Espejo E1/B1</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link href=\"https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"../../assets/css/ayuda.css\">\n<link rel=\"stylesheet\" href=\"../../assets/css/realtime-client-notifications.css\">\n<link rel=\"stylesheet\" href=\"./smart.css?v=e1b1v6\">\n</head>\n<body class=\"gx-smart-body\" data-visual-only=\"true\">\n<header class=\"app-header\" style=\"width:100%;max-width:580px;padding-left:20px;padding-right:20px;margin:0 auto 10px\">\n<img alt=\"GOXION\" class=\"app-logo\" src=\"../../logo2.PNG\">\n<div class=\"gx-header-actions gx-smart-header-actions\">\n<button id=\"gx-smart-notif-button\" class=\"gx-client-notif-launch\" type=\"button\" aria-label=\"Abrir notificaciones del ejemplo\" aria-haspopup=\"dialog\" aria-expanded=\"false\">\n<span class=\"gx-client-notif-icon\" aria-hidden=\"true\"><svg class=\"gx-client-notif-bell\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\" class=\"gx-client-notif-clapper\"/></svg></span>\n<span class=\"gx-client-notif-badge\" id=\"gx-smart-notif-count\" aria-hidden=\"true\">1</span>\n</button>\n<span class=\"header-action-btn gx-auth-root gx-client-session-active gx-smart-auth\" aria-label=\"Mi Espacio, vista de ejemplo\"><span class=\"gx-auth-pill-label\"><span id=\"header-btn-text\">Mi Espacio</span></span></span>\n</div>\n</header>\n<div class=\"bg\" aria-hidden=\"true\"></div>\n<div class=\"container\" id=\"gx-smart-container\">\n<!-- OFFICIAL_NAV -->\n<!-- OFFICIAL_DASHBOARD -->\n</div>\n<button class=\"gx-smart-lab-trigger\" id=\"gx-smart-toggle\" aria-expanded=\"false\" aria-controls=\"gx-smart-lab\" type=\"button\"><span class=\"gx-smart-lab-led\"></span>Probar escenarios</button>\n<section class=\"gx-smart-lab\" id=\"gx-smart-lab\" aria-label=\"Laboratorio de escenarios, solo beta\" hidden>\n<p class=\"gx-smart-lab-title\">VISTA ESPEJO DE AYUDA <span>· DATOS FICTICIOS</span></p>\n<label for=\"gx-smart-scenario\" class=\"gx-smart-lab__heading\">Situación simulada</label>\n<div class=\"gx-smart-select-wrap\"><select id=\"gx-smart-scenario\" aria-label=\"Elegir escenario de prueba\">\n<option value=\"upcoming\">Pago próximo</option><option value=\"multi\">Varias fechas de pago</option>\n<option value=\"review\">Comprobante en revisión</option><option value=\"correction\">Comprobante con observación</option>\n<option value=\"overdue\">Servicio vencido</option><option value=\"extension\">Acuerdo de prórroga</option>\n<option value=\"mission\">Misión pendiente</option><option value=\"clear\">Todo al corriente</option>\n<option value=\"new\">Cliente sin servicios</option>\n</select><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m6 9 6 6 6-6\"/></svg></div>\n<button class=\"gx-smart-notice-test\" id=\"gx-smart-preview-alert\" type=\"button\" disabled>Reproducir aviso importante</button>\n<p class=\"gx-smart-lab-foot\">Solo se reproduce con eventos importantes simulados. Sin iniciar sesión ni efectuar cobros.</p>\n</section>\n<div class=\"gx-client-notif-overlay\" id=\"gx-smart-notif-overlay\" aria-hidden=\"true\"></div>\n<section class=\"gx-client-notif-sheet\" id=\"gx-smart-notif-sheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Notificaciones de ejemplo\" aria-hidden=\"true\" inert>\n<div class=\"gx-client-notif-handle\" aria-hidden=\"true\"></div>\n<header class=\"gx-client-notif-head\">\n<span aria-hidden=\"true\"></span><strong class=\"gx-client-notif-head-title\">Notificaciones</strong>\n<button type=\"button\" class=\"gx-client-notif-close\" id=\"gx-smart-notif-close\" aria-label=\"Cerrar notificaciones\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button>\n</header>\n<div class=\"gx-client-notif-list\" id=\"gx-smart-notif-list\"><div class=\"gx-client-notif-empty\"><strong>Sin avisos nuevos</strong><small>En esta demostración aún no se ha reproducido ningún aviso.</small></div></div>\n</section>\n<div class=\"gx-smart-toast\" id=\"gx-smart-toast\" role=\"status\" aria-live=\"polite\" hidden></div>\n<script src=\"./priority-engine.js?v=e1b1v6\"></script>\n<script src=\"./smart-demo.js?v=e1b1v6\" defer></script>\n<script src=\"./notice-demo.js?v=e1b1v6\" defer></script>\n<script src=\"./mission-mirror.js?v=e1b1v6\" defer></script>\n</body></html>";

const built=html.replace('<!-- OFFICIAL_NAV -->',nav).replace('<!-- OFFICIAL_DASHBOARD -->',dashboard);
if(built.includes('<!-- OFFICIAL_NAV -->')||built.includes('<!-- OFFICIAL_DASHBOARD -->'))throw Error('Reemplazo incorrecto');
fs.mkdirSync('preview/experiencia-mi-espacio-inteligente',{recursive:true});
fs.writeFileSync('preview/experiencia-mi-espacio-inteligente/index.html',built);
console.log('Mi Espacio E1/B1 desde Ayuda:',dashboard.length,'bytes');
