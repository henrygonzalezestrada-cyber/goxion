/* E2/B3: build a separate experience from V9 without changing its visuals. */
import fs from 'node:fs';
const src='preview/gixys-mi-espacio-espejo/';
const dst='preview/experiencia-b3-goxy-gixys/';
fs.mkdirSync(dst,{recursive:true});
let html=fs.readFileSync(src+'index.html','utf8');
for(const [a,b] of [
 ['./companions.css?v=9','../gixys-mi-espacio-espejo/companions.css?v=9'],
 ['./mirror.css?v=9','../gixys-mi-espacio-espejo/mirror.css?v=9'],
 ['./companions.js?v=9','../gixys-mi-espacio-espejo/companions.js?v=9'],
 ['./mirror.js?v=9','./b3-mirror.js?v=1']
]){
 if(!html.includes(a))throw Error('V9 asset moved: '+a);
 html=html.replace(a,b);
}
html=html.replace('data-gx-mirror="true"','data-gx-mirror="true" data-gx-b3="true"');
html=html.replace('<title>GOXION · Mi Espacio · Beta espejo</title>','<title>GOXION · Goxy y Gixys · Bloque 3</title>');
html=html.replace('</head>','<link rel="stylesheet" href="./b3.css?v=1"></head>');
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
fs.writeFileSync(dst+'index.html',html);
let mirror=fs.readFileSync(src+'mirror.js','utf8');
const old='const emit=(key,active)=>document.dispatchEvent(new CustomEvent("gx-mirror:"+key,{detail:{active}}));';
if(!mirror.includes(old))throw Error('V9 event source changed');
mirror=mirror.replace(old,'const emit=(key,active)=>window.GOXION_B3_ROUTER.emit(key,active);');
const oldNav='btn.addEventListener("click",()=>notes("Esta beta muestra únicamente Mi Espacio. Catálogo y Soporte siguen sin cambios."));';
if(!mirror.includes(oldNav))throw Error('V9 navigation changed');
mirror=mirror.replace(oldNav,'btn.addEventListener("click",()=>{if(btn.id==="btn-tab-soporte")window.GOXION_B3_ROUTER.handoff();else notes("La beta conserva Catálogo sin modificaciones.");});');
mirror=mirror.replace('version:"Fase 2 beta"','version:"E2/B3 V1 · Gixys V9 intacta"');
fs.writeFileSync(dst+'b3-mirror.js',mirror);
console.log('B3 mirror generated from V9: only event routing and beta lab added');
