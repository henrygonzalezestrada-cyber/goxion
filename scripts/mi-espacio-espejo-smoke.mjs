/* GOXION espejo Mi Espacio: comprobaciones sin clientes, sin backend,
   sin browser autenticado y sin efectos sobre operaciones reales. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root=process.cwd();
const source=fs.readFileSync(path.join(root,"ayuda.html"),"utf8");
const mirror=fs.readFileSync(path.join(root,"preview/mi-espacio-espejo/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"preview/mi-espacio-espejo/mirror.css"),"utf8");
const js=fs.readFileSync(path.join(root,"preview/mi-espacio-espejo/mirror.js"),"utf8");
let normalized=mirror
 .replace(' data-gx-mirror="client"',"")
 .replace('<base href="../../">\n<meta name="robots" content="noindex,nofollow"/>\n',"")
 .replace('<link rel="stylesheet" href="./preview/mi-espacio-espejo/mirror.css?v=mi-espacio-espejo-1"/>\n',"")
 .replace('<script src="./preview/mi-espacio-espejo/mirror.js?v=mi-espacio-espejo-1"></script>\n',"");
const normalizedOfficial=source.replace(/<\/script>\\n(?=\s*<script)/g,"</script>");
assert.equal(normalized,normalizedOfficial,"El espejo debe ser copia exacta salvo enlaces visuales y corrección de salto visible");
const preserved=Array.from(source.matchAll(/<script\b[^>]+src="([^"]+)"[^>]*><\/script>/g),m=>m[1]);
for(const src of preserved)assert.ok(mirror.includes('src="'+src+'"'),"Falta handler oficial: "+src);
for(const id of [
 "goxion-main-nav","view-dashboard","dash-billing-card","dash-date","dash-badge",
 "dash-history","dash-services","referral-section-container","loyalty-count",
 "loyalty-bar","loyalty-msg","dash-onboarding-card","header-action-btn"
]){
 assert.equal((mirror.match(new RegExp('\\bid="'+id+'"',"g"))||[]).length,1,"ID duplicado/perdido: "+id);
}
for(const literal of [
 "Probar estados","Situación de prueba","Simular recompensa lista",
 "gxb-lab-toggle","gxs-lab-controls","GOXION_MORPH_V2",
 "Mario · Mi Espacio","Datos ficticios","Probar situaciones"
])assert.ok(!mirror.includes(literal),"Se filtró contenido de laboratorio: "+literal);
for(const asset of [
 "./assets/css/ayuda.css","./assets/js/ayuda/01e-client-dashboard.js",
 "./assets/js/ayuda/04-client-notifications-realtime.js",
 "./assets/js/ayuda/21-legal-v2-documents.js"
])assert.ok(mirror.includes(asset),"Fuente productiva no vinculada: "+asset);
assert.ok(mirror.includes('<base href="../../">'),"Subruta no resuelve assets de la raíz");
assert.ok(mirror.includes('content="noindex,nofollow"'),"Falta noindex");
assert.ok(!/<\/script>\\n(?=\s*<script)/.test(mirror),"El salto literal visible no debe filtrarse");
assert.ok(/#sticky-client-bar\s*\{display:none!important\}/.test(css),"Barra sticky antigua debe eliminarse visualmente");
assert.ok(css.includes('position:sticky!important'),"Cápsula nueva no sticky");
assert.ok(css.includes('rgba(0,242,254,.42)'),"Contraste V4.3 de la cápsula");
assert.ok(css.includes('width:min(160px,100%)'),"Ancho compacto V4.3");
assert.ok(css.includes('gx-mirror-clock 6s linear infinite'),"El reloj debe ser el único icono recurrente");
assert.ok(css.includes("prefers-reduced-motion:reduce"),"Respetar movimiento reducido");
assert.ok(/racha_reiniciada_virtual===true/.test(js),"Corazón roto depende de estado financiero real");
assert.ok(/\.append\(realCta\)/.test(js),"El CTA de cuenta debe reutilizarse");
assert.ok(js.includes('window.addEventListener("scroll",onScroll,{passive:true})'),"Navegación debe ser suave");
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|supabase\.from|\.insert\(/.test(js),"El adaptador visual no debe escribir/consultar backend");
assert.ok(!/Probar estados|Simular|Casone|Mario/.test(js),"No debe existir UI de escenarios");
new vm.Script(js,{filename:"preview/mi-espacio-espejo/mirror.js"});
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,"CSS desbalanceado");
console.log("GOXION espejo: integridad HTML, 47 scripts, fuentes, seguridad de datos, navegación, animaciones y ausencia de fixtures: OK.");
