import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Chequeo de límites entre superficies. NO sustituye capturas,
// Safari real ni validación funcional/autenticada.
const read=path=>readFileSync(path,"utf8");
for(const path of [
  "AGENTS.md",
  "docs/GOXION_VISUAL_CONTRACT.md",
  "docs/GOXION_MULTI_DATE_ROADMAP.md",
  "docs/ADMIN_FUNCTION_REGISTRY.md"
]) assert(read(path).length>400,"Falta documento de continuidad: "+path);

const areas=[
  {name:"Admin",html:"admin.html",css:"admin.css",font:"Rajdhani",selector:"gx-client-focus"},
  {name:"Ayuda",html:"ayuda.html",css:"ayuda.css",font:"Poppins",selector:"view-dashboard"},
  {name:"Index",html:"index.html",css:"index.css",font:"Poppins",selector:"app"}
];
for(const area of areas){
 const html=read(area.html);
 const css=read("assets/css/"+area.css);
 assert(html.includes("assets/css/"+area.css),area.name+": falta CSS propio");
 assert(html.includes("assets/js/core/financial-engine.js"),area.name+": falta motor financiero compartido");
 assert(html.includes('id="'+area.selector+'"'),area.name+": cambió identificador esencial");
 assert(css.includes("font-family: '"+area.font+"'")||
        css.includes("font-family:'"+area.font+"'"),
        area.name+": verificar tipografía original");
 for(const other of areas.filter(x=>x.name!==area.name)){
  assert(!html.includes("assets/css/"+other.css),
   area.name+": se importó CSS ajeno ("+other.name+")");
 }
}
const indexHtml=read("index.html"),indexCss=read("assets/css/index.css"),
      indexJS=read("assets/js/index/02-02-inline.js");
assert(indexHtml.includes('id="payment-modal"'),"Index: conservar comprobantes");
for(const sel of [".balance-hero",".total-amount",".glass-card"]){
 assert(indexCss.includes(sel),"Index: falta estructura "+sel);
}
assert(indexJS.includes("function cargarEstadoCuenta()"),"Index: conservar estado de cuenta");
assert(indexJS.includes("pagoActualInfo"),"Index: conservar contexto del pago");

const ayuda=read("ayuda.html");
assert(ayuda.includes('id="gx-promo-showcase"'),"Ayuda: conservar escaparate");
assert(ayuda.includes('id="gx-catalog-curated"'),"Ayuda: conservar catálogo");
assert(ayuda.includes('id="header-action-btn"'),"Ayuda: conservar Mi Espacio");

const edge=read("docs/edge/estado-financiero/index.ts");
const clientAction=edge.indexOf('if(accion==="mi_estado")');
const adminGuard=edge.indexOf('const admin=await verify(');
const simulation=edge.indexOf('if(accion==="simular_calendario_beta")');
assert(clientAction>=0&&adminGuard>clientAction&&simulation>adminGuard,
 "El calendario simulado debe seguir protegido por token Admin");

console.log("GOXION visual contract: identidades aisladas, motor compartido y calendario Admin protegido PASS");
