/* E2/B3: build a separate experience from V9 without changing its visuals. */
import fs from 'node:fs';
const src='preview/gixys-mi-espacio-espejo/';
const dst='preview/experiencia-b3-goxy-gixys/';
fs.mkdirSync(dst,{recursive:true});
let html=fs.readFileSync(src+'index.html','utf8');
for(const [a,b] of [
 ['./companions.css?v=9','../gixys-mi-espacio-espejo/companions.css?v=9'],
 ['./mirror.css?v=9','../gixys-mi-espacio-espejo/mirror.css?v=9'],
 ['./companions.js?v=9','./companions-v3.js?v=3'],
 ['./mirror.js?v=9','./b3-mirror.js?v=1']
]){
 if(!html.includes(a))throw Error('V9 asset moved: '+a);
 html=html.replace(a,b);
}
html=html.replace('data-gx-mirror="true"','data-gx-mirror="true" data-gx-b3="true"');
html=html.replace('</head>','<link rel="stylesheet" href="./companions-v3.css?v=3"></head>');
html=html.replace('<title>GOXION · Mi Espacio · Beta espejo</title>','<title>GOXION · Goxy y Gixys · Bloque 3</title>');
// Import the EXACT E1/B1 V6 notice stylesheet and script; no recreated ribbon.
fs.copyFileSync('preview/experiencia-mi-espacio-inteligente/smart.css',dst+'b3-notice.css');
html=html.replace('</head>',
 '<link rel="stylesheet" href="./b3-notice.css?v=2"><link rel="stylesheet" href="./b3.css?v=2"></head>');
html=html.replace('class="gx-mirror-body"','class="gx-mirror-body gx-smart-body"');
html=html.replace('<button id="gx-client-notif-launch"',
 '<button id="gx-client-notif-launch" aria-haspopup="dialog"');

const tray=[
 '<div class="gx-b3-lab" id="gx-b3-lab">',
 '<button class="gx-b3-lab-toggle" type="button" id="gx-b3-toggle" aria-expanded="false" aria-controls="gx-b3-controls">Probar situaciones <span aria-hidden="true">⌄</span></button>',
 '<div class="gx-b3-controls" id="gx-b3-controls" hidden>',
 '<div class="gx-b3-heading">Goxy coordina · Gixys acompañan</div>',
 '<p>Eventos ficticios. Sin pagos, cupones ni notificaciones reales.</p>',
 '<div class="gx-b3-buttons">',
 '<button type="button" data-gx-b3-test="notification">Aviso recibido</button>',
 '<button type="button" data-gx-b3-test="loyalty">Lealtad alcanzada</button>',
 '<button type="button" data-gx-b3-test="mission">Misión completada</button>',
 '</div><button type="button" class="gx-b3-reset" data-gx-b3-test="reset">Reiniciar prueba</button>',
 '</div></div>',
 '<script src="./b3-router.js?v=1" defer></script>'
].join('\n');
const anchor='<script src="./b3-mirror.js?v=1" defer></script>';
if(!html.includes(anchor))throw Error('Missing mirror asset');
html=html.replace(anchor,tray+'\n'+anchor);

/* E1/B1's native overlay and notification sheet (from its accepted V6).
 * Kept structurally the same, with IDs adapted to B3's real bell.
 * The closed lab nodes serve only the original B1 notice module.
 */
const hiddenB1='<button id="gx-smart-toggle" hidden type="button"></button>'+
 '<section id="gx-smart-lab" hidden><select id="gx-smart-scenario"></select>'+
 '<button id="gx-smart-preview-alert" type="button" disabled hidden></button></section>';
const noticeUI=[
 '<div class="gx-client-notif-overlay" id="gx-smart-notif-overlay" aria-hidden="true"></div>',
 '<section class="gx-client-notif-sheet" id="gx-smart-notif-sheet" role="dialog" aria-modal="true" aria-label="Notificaciones de ejemplo" aria-hidden="true" inert>',
 '<div class="gx-client-notif-handle" aria-hidden="true"></div>',
 '<header class="gx-client-notif-head"><span aria-hidden="true"></span><strong class="gx-client-notif-head-title">Notificaciones</strong>',
 '<button type="button" class="gx-client-notif-close" id="gx-smart-notif-close" aria-label="Cerrar notificaciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>',
 '</header><div class="gx-client-notif-list" id="gx-smart-notif-list"></div></section>',
 '<div class="gx-smart-toast" id="gx-smart-toast" role="status" aria-live="polite" hidden></div>'
].join('\n');
const insertion='<script src="./b3-router.js?v=1" defer></script>';
if(!html.includes(insertion))throw Error('missing B3 script hook');
html=html.replace(insertion,hiddenB1+'\n'+noticeUI+'\n'+
 '<script src="../experiencia-mi-espacio-inteligente/priority-engine.js?v=e1b1v6"></script>\n'+
 '<script src="./b3-policy.js?v=2" defer></script>\n'+
 '<script src="./b3-notice.js?v=2" defer></script>\n'+
 '<script src="./b3-router.js?v=2" defer></script>');
html=html.replace(
 '<button type="button" data-gx-b3-test="notification">Aviso recibido</button>',
 [
 '<div class="gx-b3-group-label">Avisos prioritarios · Bloque 1</div>',
 '<button type="button" data-gx-b3-priority="correction">Comprobante con observación</button>',
 '<button type="button" data-gx-b3-priority="overdue">Pago vencido</button>',
 '<button type="button" data-gx-b3-priority="review">Comprobante en revisión</button>',
 '<button type="button" data-gx-b3-priority="extension">Prórroga registrada</button>',
 '<div class="gx-b3-group-label">Avisos ordinarios</div>',
 '<button type="button" data-gx-b3-priority="soon">Pago próximo (sin animación)</button>',
 '<button type="button" data-gx-b3-priority="clear">Sin novedades (sin animación)</button>'
 ].join('\n')
);
html=html.replace('<script src="./b3-mirror.js?v=1" defer></script>','<script src="./b3-mirror.js?v=2" defer></script>');
/* Use V6's ACTUAL 1,170ms silk-stream draw and the same notification sheet
 * handoff: source is copied, never redrawn or reimplemented from screenshots.
 */
const b1=fs.readFileSync('preview/experiencia-mi-espacio-inteligente/notice-demo.js','utf8');
let notice=b1.replace("hasAttribute('data-gx-smart-beta')","hasAttribute('data-gx-b3')");
notice=notice.replaceAll("'gx-smart-notif-button'","'gx-client-notif-launch'")
 .replaceAll("'gx-smart-notif-count'","'gx-client-notif-badge'");
const delivered=" bellCount(true);\n bell.classList.remove('gx-ringing');";
if(!notice.includes(delivered))throw Error('B1 bell impact hook has changed');
notice=notice.replace(delivered,
 " bellCount(true);\n document.dispatchEvent(new CustomEvent('gx-b3:notice-delivered',{detail:{code:window.GOXION_SMART_BETA?.getScenario()}}));\n bell.classList.remove('gx-ringing');");
const read="if(stored){list.querySelector('.gx-client-notif-item')?.classList.remove('unread');bellCount(false)}";
if(!notice.includes(read))throw Error('B1 read hook has changed');
notice=notice.replace(read,
 "if(stored){list.querySelector('.gx-client-notif-item')?.classList.remove('unread');bellCount(false);document.dispatchEvent(new Event('gx-b3:notice-read'))}");
fs.writeFileSync(dst+'b3-notice.js',notice);

fs.writeFileSync(dst+'index.html',html);
let mirror=fs.readFileSync(src+'mirror.js','utf8');
const old='const emit=(key,active)=>document.dispatchEvent(new CustomEvent("gx-mirror:"+key,{detail:{active}}));';
if(!mirror.includes(old))throw Error('V9 event source changed');
mirror=mirror.replace(old,'const emit=(key,active)=>window.GOXION_B3_ROUTER.emit(key,active);');
const oldNav='btn.addEventListener("click",()=>notes("Esta beta muestra únicamente Mi Espacio. Catálogo y Soporte siguen sin cambios."));';
if(!mirror.includes(oldNav))throw Error('V9 navigation changed');
mirror=mirror.replace(oldNav,'btn.addEventListener("click",()=>{if(btn.id==="btn-tab-soporte")window.GOXION_B3_ROUTER.handoff();else notes("La beta conserva Catálogo sin modificaciones.");});');
mirror=mirror.replace('fetch("./missions-demo.html"','fetch("../gixys-mi-espacio-espejo/missions-demo.html"');
mirror=mirror.replace('version:"Fase 2 beta"','version:"E2/B3 V1 · Gixys V9 intacta"');

const start=mirror.indexOf('const bell=$("gx-client-notif-launch"),badgeCount=$("gx-client-notif-badge");');
const stop=mirror.indexOf('const services=$("dash-services"),history=$("dash-history");',start);
if(start<0||stop<0)throw Error('V9 notification event wiring changed');
mirror=mirror.slice(0,start)+
 "// Native B1 V6 notification and bell now own the priority journey.\n"+
 "document.addEventListener('gx-b3:notice-read',()=>emit('notification',false));\n"+
 mirror.slice(stop);

fs.writeFileSync(dst+'b3-mirror.js',mirror);
console.log('B3 mirror generated from V9: only event routing and beta lab added');
