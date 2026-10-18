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
const html="<!doctype html>\n<html lang=\"es-MX\" data-gx-smart-beta=\"true\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#030305\">\n<title>GOXION · Mi Espacio inteligente · E1/B1 Beta</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link href=\"https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"../../assets/css/ayuda.css\">\n<link rel=\"stylesheet\" href=\"../../assets/css/realtime-client-notifications.css\">\n<link rel=\"stylesheet\" href=\"./smart.css?v=e1b1v2\">\n</head>\n<body class=\"gx-smart-body\" data-visual-only=\"true\">\n<header class=\"app-header\" style=\"width:100%;max-width:580px;padding-left:20px;padding-right:20px;margin:0 auto 10px\">\n<img alt=\"GOXION\" class=\"app-logo\" src=\"../../logo2.PNG\">\n<div class=\"gx-smart-header-actions\">\n<span class=\"gx-smart-bell\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/></svg></span>\n<span class=\"gx-smart-auth\">Mi Espacio</span>\n</div>\n</header>\n<div class=\"bg\" aria-hidden=\"true\"></div>\n<div class=\"container\" id=\"gx-smart-container\">\n<div class=\"gx-smart-demo-note\" role=\"note\"><span class=\"gx-smart-demo-led\"></span><span>BETA · Datos ficticios · Sin cuentas ni cobros reales</span></div>\n<section class=\"gx-smart-lab\" aria-label=\"Simular situación del cliente\">\n<div class=\"gx-smart-lab__heading\"><span>ESCENARIO DEL CLIENTE</span><span class=\"gx-smart-lab__mark\">LABORATORIO</span></div>\n<div class=\"gx-smart-select-wrap\"><select id=\"gx-smart-scenario\" aria-label=\"Elegir escenario de prueba\">\n<option value=\"upcoming\">Pago próximo</option>\n<option value=\"multi\">Varias fechas de pago</option>\n<option value=\"review\">Comprobante en revisión</option>\n<option value=\"correction\">Comprobante con observación</option>\n<option value=\"overdue\">Servicio vencido</option>\n<option value=\"extension\">Acuerdo de prórroga</option>\n<option value=\"mission\">Misión pendiente</option>\n<option value=\"clear\">Todo al corriente</option>\n<option value=\"new\">Cliente sin servicios</option>\n</select><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m6 9 6 6 6-6\"/></svg></div>\n\n</section>\n<!-- OFFICIAL_NAV -->\n<!-- OFFICIAL_DASHBOARD -->\n</div>\n<div class=\"gx-smart-toast\" id=\"gx-smart-toast\" role=\"status\" aria-live=\"polite\" hidden></div>\n<script src=\"./priority-engine.js?v=e1b1v2\"></script>\n<script src=\"./smart-demo.js?v=e1b1v2\" defer></script>\n</body></html>";

const built=html.replace('<!-- OFFICIAL_NAV -->',nav).replace('<!-- OFFICIAL_DASHBOARD -->',dashboard);
if(built.includes('<!-- OFFICIAL_NAV -->')||built.includes('<!-- OFFICIAL_DASHBOARD -->'))throw Error('Reemplazo incorrecto');
fs.mkdirSync('preview/experiencia-mi-espacio-inteligente',{recursive:true});
fs.writeFileSync('preview/experiencia-mi-espacio-inteligente/index.html',built);
console.log('Mi Espacio E1/B1 desde Ayuda:',dashboard.length,'bytes');
