/* GOXION · Experiencia E1/B1. Mirror extracted from Ayuda official.
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
const marker='<div id="dash-payment-review-alert"></div>';
if(!dashboard.includes(marker))throw Error('Falta punto de inserción');
dashboard=dashboard.replace(marker,[
'<section class="gx-smart-focus" id="gx-smart-focus" aria-live="polite" aria-label="Lo importante de tu espacio">',
'<div class="gx-smart-focus__top"><span class="gx-smart-focus__dot" aria-hidden="true"></span><span id="gx-smart-eyebrow">TU PRIORIDAD</span><span class="gx-smart-focus__type" id="gx-smart-type">INFORMACIÓN</span></div>',
'<h2 id="gx-smart-title">Revisando tu situación</h2>',
'<p id="gx-smart-description">Mostramos solamente la acción más relevante.</p>',
'<button type="button" class="gx-smart-focus__action" id="gx-smart-action"><span id="gx-smart-action-label">Ver detalles</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h13m-6-6 6 6-6 6"/></svg></button>',
'</section>',marker].join('\n'));
const html="<!doctype html>\n<html lang=\"es-MX\" data-gx-smart-beta=\"true\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#030305\">\n<title>GOXION · Mi Espacio inteligente · E1/B1 Beta</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link href=\"https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"../../assets/css/ayuda.css\">\n<link rel=\"stylesheet\" href=\"../../assets/css/realtime-client-notifications.css\">\n<link rel=\"stylesheet\" href=\"./smart.css?v=e1b1\">\n</head>\n<body class=\"gx-smart-body\" data-visual-only=\"true\">\n<header class=\"app-header\" style=\"width:100%;max-width:580px;padding-left:20px;padding-right:20px;margin:0 auto 10px\">\n<img alt=\"GOXION\" class=\"app-logo\" src=\"../../logo2.PNG\">\n<div class=\"gx-smart-header-actions\">\n<span class=\"gx-smart-bell\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/></svg></span>\n<span class=\"gx-smart-auth\">Mi Espacio</span>\n</div>\n</header>\n<div class=\"bg\" aria-hidden=\"true\"></div>\n<div class=\"container\" id=\"gx-smart-container\">\n<div class=\"gx-smart-demo-note\" role=\"note\"><span class=\"gx-smart-demo-led\"></span><span>BETA · Datos ficticios · Sin cuentas ni cobros reales</span></div>\n<section class=\"gx-smart-lab\" aria-label=\"Simular situación del cliente\">\n<div class=\"gx-smart-lab__heading\"><span>ESCENARIO DEL CLIENTE</span><span class=\"gx-smart-lab__mark\">LABORATORIO</span></div>\n<div class=\"gx-smart-select-wrap\"><select id=\"gx-smart-scenario\" aria-label=\"Elegir escenario de prueba\">\n<option value=\"upcoming\">Pago próximo</option>\n<option value=\"multi\">Varias fechas de pago</option>\n<option value=\"review\">Comprobante en revisión</option>\n<option value=\"correction\">Comprobante con observación</option>\n<option value=\"overdue\">Servicio vencido</option>\n<option value=\"extension\">Acuerdo de prórroga</option>\n<option value=\"mission\">Misión pendiente</option>\n<option value=\"clear\">Todo al corriente</option>\n<option value=\"new\">Cliente sin servicios</option>\n</select><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m6 9 6 6 6-6\"/></svg></div>\n<p class=\"gx-smart-lab__note\">Cambia el escenario y observa cómo Mi Espacio prioriza la información, sin mover ni duplicar los módulos existentes.</p>\n</section>\n<!-- OFFICIAL_NAV -->\n<!-- OFFICIAL_DASHBOARD -->\n</div>\n<div class=\"gx-smart-toast\" id=\"gx-smart-toast\" role=\"status\" aria-live=\"polite\" hidden></div>\n<script src=\"./priority-engine.js?v=e1b1\"></script>\n<script src=\"./smart-demo.js?v=e1b1\" defer></script>\n</body></html>";

const built=html.replace('<!-- OFFICIAL_NAV -->',nav).replace('<!-- OFFICIAL_DASHBOARD -->',dashboard);
if(built.includes('<!-- OFFICIAL_NAV -->')||built.includes('<!-- OFFICIAL_DASHBOARD -->'))throw Error('Reemplazo incorrecto');
fs.mkdirSync('preview/experiencia-mi-espacio-inteligente',{recursive:true});
fs.writeFileSync('preview/experiencia-mi-espacio-inteligente/index.html',built);
console.log('Mi Espacio E1/B1 desde Ayuda:',dashboard.length,'bytes');
