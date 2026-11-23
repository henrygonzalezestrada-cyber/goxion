/* GOXION · espejo conectado: fidelidad al diseño aprobado y
   contrato de integridad de la página oficial, sin clientes reales. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root=process.cwd();
const load=p=>fs.readFileSync(path.join(root,p),"utf8");
const source=load("ayuda.html");
const mirror=load("preview/mi-espacio-espejo/index.html");
const css=load("preview/mi-espacio-espejo/mirror.css");
const approved=load("preview/mi-espacio-espejo/approved-visual.css");
const lab=load("preview/experiencia-mi-espacio-inteligente/morph-v2.html");
const js=load("preview/mi-espacio-espejo/mirror.js");
let normalized=mirror
 .replace(' data-gx-mirror="client"',"")
 .replace('<base href="../../">\n<meta name="robots" content="noindex,nofollow"/>\n',"")
 .replace('<link rel="stylesheet" href="./preview/mi-espacio-espejo/mirror.css?v=mi-espacio-espejo-1"/>\n',"")
 .replace('<link rel="stylesheet" href="./preview/mi-espacio-espejo/approved-visual.css?v=approved-20261123"/>\n',"")
 .replace('<script src="./preview/mi-espacio-espejo/mirror.js?v=mi-espacio-espejo-2"></script>\n',"");
const original=source.replace(/<\/script>\\n(?=\s*<script)/g,"</script>");
assert.equal(normalized,original,"No modificar HTML oficial fuera de los tres enlaces aislados.");
const sources=[...source.matchAll(/<script\b[^>]+src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
assert.equal(sources.length,47,"Contrato de scripts oficiales actualizado, revisar manualmente.");
for(const src of sources)assert(mirror.includes('src="'+src+'"'),"Script oficial perdido: "+src);
for(const id of [
 "goxion-main-nav","view-dashboard","dash-billing-card","dash-date","dash-badge",
 "dash-history","dash-services","referral-section-container","loyalty-count",
 "loyalty-bar","loyalty-msg","dash-onboarding-card","header-action-btn"
]){
 assert.equal((mirror.match(new RegExp('\\bid="'+id+'"',"g"))||[]).length,1,"ID duplicado/perdido: "+id);
}
for(const literal of [
 "Probar estados","Situación de prueba","Simular recompensa lista",
 "gxb-lab-toggle","gxs-lab-controls","GOXION_MORPH_V2","Mario · Mi Espacio",
 "Datos ficticios","Probar situaciones"
])assert(!mirror.includes(literal),"UI de laboratorio filtrada: "+literal);
assert(mirror.includes('<base href="../../">'),"La subruta no resuelve la raíz.");
assert(mirror.includes('content="noindex,nofollow"'),"Falta noindex.");
assert(!/<\/script>\\n(?=\s*<script)/.test(mirror),"El salto literal visible no debe filtrarse.");
assert(/#sticky-client-bar\s*\{display:none!important\}/.test(css),"Eliminar visualmente barra vieja.");
assert(css.includes("position:sticky!important"),"Cápsula nueva sticky.");
assert(css.includes("rgba(0,242,254,.42)"),"Cian activo V4.3.");
assert(css.includes("width:min(160px,100%)"),"Compacta V4.3.");
assert(!/#gamif-grid\s*\{[^}]*display:grid!important/.test(css),"No bloquear el morph real con important.");
for(const needle of [
 '.focus[data-layout="compact"]{min-height:242px',
 '.gxb-tile{position:relative;isolation:isolate;overflow:hidden;min-width:0;min-height:121px',
 '.gxb-label{position:relative;z-index:2;font-size:11.5px',
 '.gxb-number{position:relative;z-index:2;font-weight:700',
 '.gxb-unit{position:relative;z-index:2;font-size:10.5px',
 '.gxb-panel{position:relative;isolation:isolate;overflow:hidden',
 '.gxb-panel-emoji{position:absolute;z-index:0;bottom:3px',
 '.glass-beam{position:absolute;left:-59%'
]){
 assert(lab.includes(needle),"El laboratorio cambió/ya no tiene el contrato: "+needle);
 assert(approved.includes(needle),"El espejo no respeta el CSS exacto: "+needle);
}
assert(approved.includes("gx-focus-clock 6s linear infinite"),"Reloj continuo aprobado.");
assert(approved.includes("prefers-reduced-motion:reduce"),"Respetar movimiento reducido.");
assert(js.includes('bottom.append(realCTA)'),"CTA oficial no reutilizado.");
assert(js.includes('grid.classList.add("gxb-row")'),"Tres beneficios no usan layout aprobado.");
assert(js.includes('card.classList.add("gxb-tile","gxc-surface")'),"Cards reales no usan jerarquía aprobada.");
assert(js.includes("refreshBenefits(client,grid)"),"Referidos/Misiones no se conectan al estado real.");
assert(js.includes("racha_reiniciada_virtual===true"),"Corazón roto debe tener confirmación real.");
assert(js.includes("irAlTicket"),"Cuenta original no vinculada.");
assert(js.includes('window.addEventListener("scroll",onScroll,{passive:true})'),"Scroll pasivo.");
assert(!/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|supabase\.from|\.insert\(/.test(js),"Adaptador visual no puede consultar/escribir backend.");
assert(!/Probar estados|Simular|Casone|Mario/.test(js),"No incorporar UI de escenarios.");
new vm.Script(js,{filename:"preview/mi-espacio-espejo/mirror.js"});
for(const [name,style] of [["mirror",css],["aprobado",approved]]){
 assert.equal((style.match(/\{/g)||[]).length,(style.match(/\}/g)||[]).length,"CSS desbalanceado: "+name);
}
console.log("GOXION espejo: HTML intacto, 47 scripts, módulos reales y fidelidad literal del Hero/beneficios: OK.");
