/* Build a static mirror from the OFFICIAL Mi Espacio DOM.
 * No official controller, credential, token, API, cookies, or billing flow is included.
 * This is a VISUAL snapshot; tests enforce the absence of client traffic.
 */
import fs from 'node:fs';
const official=fs.readFileSync('ayuda.html','utf8');
const start='<div class="view-section" id="view-dashboard">';
const finish='<div class="view-section" id="view-catalogo">';
const i=official.indexOf(start),j=official.indexOf(finish,i);
if(i<0||j<i)throw Error('Official dashboard anchors changed: update mirror source mapping');
let dashboard=official.slice(i,j);
dashboard=dashboard.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
dashboard=dashboard.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
if(/<(script|iframe|form)\b/i.test(dashboard))throw Error('Unsafe executable element found in dashboard');
const navStart='<div class="glass-card tab-container" id="goxion-main-nav">';
const ns=official.indexOf(navStart),ne=official.indexOf('<div class="view-section" id="view-inicio">',ns);
if(ns<0||ne<ns)throw Error('Official nav anchors changed');
let nav=official.slice(ns,ne).replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
// Guard against executing a newly added script/form in the original nav:
if(/<(script|iframe|form)\b/i.test(nav))throw Error('Unexpected active nav markup');
// Reuse the actual card IDs and hierarchy; do not rewrite the financial or referral UI.
const html=String.raw`<!doctype html>
<html lang="es-MX" data-gx-mirror="true">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#030305">
<title>GOXION · Mi Espacio · Beta espejo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/css/ayuda.css">
<link rel="stylesheet" href="../../assets/css/realtime-client-notifications.css">
<link rel="stylesheet" href="./companions.css?v=1">
<link rel="stylesheet" href="./mirror.css?v=1">
</head>
<body class="gx-mirror-body" data-visual-only="true">
<header class="app-header" style="width:100%;max-width:580px;padding-left:20px;padding-right:20px;margin:0 auto 10px">
<img alt="GOXION" class="app-logo" src="../../logo2.PNG">
<div class="gx-header-actions">
<button id="gx-client-notif-launch" class="gx-client-notif-launch" type="button" aria-label="Probar notificación" aria-expanded="false">
<span class="gx-client-notif-icon" aria-hidden="true"><svg class="gx-client-notif-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path class="gx-client-notif-clapper" d="M10 21h4"></path></svg></span>
<span id="gx-client-notif-badge" class="gx-client-notif-badge">0</span>
</button>
<span class="header-action-btn gx-auth-root gx-client-session-active gx-mirror-auth"><span class="gx-auth-pill-label"><span id="header-btn-text">Mi Espacio</span></span></span>
</div>
<span class="gx-mirror-square" id="gx-mirror-square" data-gx-kind="square" aria-hidden="true"></span>
</header>
<div aria-hidden="true" class="bg"></div>
<div class="container" id="gx-mirror-container">
<div class="gx-mirror-note" role="note"><span class="gx-mirror-led"></span> BETA ESPEJO · Datos de demostración, sin acceso a cuentas reales</div>
${nav}
${dashboard}
</div>
<div class="gx-mirror-toast" id="gx-mirror-toast" role="status" aria-live="polite" hidden></div>
<script>window.animarMisionesCompletadasEnSecuencia=()=>{};</script>
<script src="../../assets/js/ayuda/05-gamification-shared-morph-js.js"></script>
<script src="./companions.js?v=1"></script>
<script src="./mirror.js?v=1" defer></script>
</body></html>`;
// The vendor source is not inserted as an inline script: only approved static assets execute.
fs.writeFileSync('preview/gixys-mi-espacio-espejo/index.html',html);
console.log('Mirror created from official ayuda.html dashboard and nav: '+dashboard.length+' bytes DOM');
