import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {setTimeout as wait} from "node:timers/promises";
import {chromium,webkit} from "playwright";

const base="http://127.0.0.1:4173";
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{stdio:["ignore","pipe","pipe"],env:{...process.env,PORT:"4173"}});
let serverLog="";
server.stdout.on("data",x=>serverLog+=String(x));
server.stderr.on("data",x=>serverLog+=String(x));
let count=0;
const check=(bool,msg)=>{assert(bool,msg);count++};
try{
 let ready=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch(base+"/preview/integracion-b2/index.html");if(r.ok){ready=true;break}}catch{}
  await wait(200);
 }
 check(ready,"Servidor espejo disponible: "+serverLog);
 const originalIndex=readFileSync("index.html","utf8");
 const originalAyuda=readFileSync("ayuda.html","utf8");
 const mirrorIndex=readFileSync("preview/integracion-b2/index.html","utf8");
 const mirrorAyuda=readFileSync("preview/integracion-b2/ayuda.html","utf8");
 for(const original of ["balance-hero","services-container","gx-payment-primary","gx-bank-overlay","payment-modal","loyalty-badge"]){
  check(mirrorIndex.includes(original)||(!originalIndex.includes(original)),
    "Index espejo conserva "+original);
 }
 for(const original of ["dash-billing-card","loyalty-count","loyalty-bar","dash-services","dash-history","referral-section-container","gx-account-capsule"]){
  check(originalAyuda.includes(original)&&mirrorAyuda.includes(original),
    "Ayuda espejo conserva "+original);
 }
 check(mirrorIndex.includes("index-adapter.js"),"Index adaptado sin reescribir original");
 check(mirrorAyuda.includes("ayuda-prorroga.js"),"Modal pactado en Ayuda real");
 check(!originalIndex.includes("preview/integracion-b2"),"Index producción intacto");
 check(!originalAyuda.includes("preview/integracion-b2"),"Ayuda producción intacta");
 const guard=readFileSync("preview/integracion-b2/sandbox-guard.js","utf8");
 check(guard.includes('method!=="GET"')&&guard.includes("403"),"Espejo no escribe datos");
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{
  for(const width of [320,390,768]){
   const context=await browser.newContext({viewport:{width,height:850}});
   await context.route("https://**/*",route=>route.fulfill({status:200,body:"",contentType:"text/javascript"}));
   // Estos módulos ESM también forman parte de la interfaz oficial. Dar
   // un contrato no operativo pero válido evita fallos por CDN sin export.
   await context.route("https://esm.sh/**",route=>route.fulfill({
     status:200,contentType:"text/javascript",body:
       'export const animate=()=>({finished:Promise.resolve(),stop(){},cancel(){},pause(){}});'+
       'export const createMorph=()=>({to(){},play(){},cancel(){},destroy(){}});'
   }));
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/preview/integracion-b2/ayuda.html?demo=1",{waitUntil:"domcontentloaded"});
   await page.locator(".gx-prorroga-entry").waitFor({timeout:12000});
   check(await page.locator("#view-dashboard").isVisible(),"Dashboard original visible "+engine.name()+"/"+width);
   check((await page.locator("#loyalty-count").textContent()).includes("10/10"),
     "Progreso de lealtad oficial "+engine.name());
   check(await page.locator("#dash-services").count()===1,"Servicios originales intactos");
   check(await page.locator(".gx-account-capsule").count()===1,"Botón oficial intacto");
   await page.locator(".gx-prorroga-entry").click();
   const dlg=page.locator("#gx-prorroga-dialog");
   await dlg.waitFor();
   check(await dlg.isVisible(),"Modal prórroga nativo");
   check(await dlg.evaluate(el=>getComputedStyle(el).backdropFilter.includes("blur")),
     "Prórroga usa cristal translucido con blur real");
   check(await dlg.locator("[data-gx-close]").evaluate(el=>{
     const style=getComputedStyle(el);
     return parseInt(style.borderRadius,10)>=16 && style.backgroundColor==="rgb(0, 242, 254)";
   }),"La X usa círculo cian y geometría oficial");
   check(await dlg.locator("[data-gx-close] svg").count()===1,
     "Cerrar usa SVG original, no X genérica");
   check(await dlg.locator("[data-gx-close]").evaluate(el=>document.activeElement!==el),
     "La X no se preselecciona al abrir");
   const field=page.locator("[data-gx-day]");
   check(await field.getAttribute("max")==="2026-11-11","Máximo cinco días expresado en el campo");
   await field.fill("2026-11-20");
   check(await field.getAttribute("aria-invalid")==="true","Fecha fuera de rango marcada en rojo");
   check((await page.locator("#gx-prorroga-date-error").textContent()).includes("5 días"),
     "Límite de cinco días comunicado al cliente");
   check(await page.locator("[data-gx-activate]").isDisabled(),
     "Impedir acuerdo fuera del máximo");
   check(await page.locator("[data-gx-missed]").textContent()==="—",
     "Eliminar cifra obsoleta tras selección inválida");
   await page.locator("[data-gx-accept]").check();
   check(await page.locator("[data-gx-activate]").isDisabled(),
     "Confirmar condiciones no desbloquea una fecha inválida");
   await field.fill("2026-11-09");
   await page.waitForFunction(()=>document.querySelector('[data-gx-missed]')?.textContent?.includes("58.80"));
   check(await field.getAttribute("aria-invalid")==="false","Fecha válida recupera aspecto normal");
   check(await page.locator("#gx-prorroga-date-error").isHidden(),
     "Alerta desaparece tras elegir fecha válida");
   check(await page.locator("[data-gx-activate]").isEnabled(),
     "Aceptar se habilita sólo con fecha y condiciones correctas");
   check((await page.locator("[data-gx-protected]").textContent()).includes("46.06"),"Importe puntual");
   check((await page.locator("[data-gx-missed]").textContent()).includes("58.80"),"Mora retroactiva");
   await page.locator("[data-gx-activate]").click();
   await dlg.waitFor({state:"detached",timeout:5000});
   check((await page.locator("#dash-badge").textContent()).includes("Acuerdo pactado"),
     "Acuerdo aprobado sin Admin");
   check(await page.locator(".gx-prorroga-entry").count()===0,"Sin segunda prórroga");
   check((await page.locator("#dash-date").textContent()).includes("9 de noviembre"),
     "Fecha acordada sin nueva tarjeta");
   await page.reload({waitUntil:"domcontentloaded"});
   await page.locator("#dash-billing-card .gx-prorroga-state").waitFor({timeout:12000});
   check(await page.locator(".gx-prorroga-entry").count()===0,"Acuerdo persiste en sesión");
   await page.locator(".gx-account-capsule").click();
   await page.waitForURL(/\/preview\/integracion-b2\/index\.html\?/,{timeout:8000});
   await page.locator("#b2-calendar").waitFor({timeout:12000});
   check((await page.locator(".total-amount").textContent()).includes("92.12"),"Index oficial con total B2");
   check((await page.locator(".time-badge").textContent()).includes("⏳"),"Index conserva emoji de vencimiento");
   check((await page.locator(".loyalty-desc").textContent()).includes("Nivel 2 Activo"),
     "Conservar leyenda de lealtad original");
   check((await page.locator("#b2-toggle").textContent()).includes("Prórroga hasta"),
     "Index refleja fecha pactada de Ayuda");
   check((await page.locator(".gx-b2-breakdown").textContent()).includes("Subtotal"),
     "Desglose oficial adaptado a multifecha");
   check((await page.locator("#b2-selected-total").textContent()).includes("46.06"),
     "Desglose del próximo cargo");
   await page.locator("#b2-toggle").click();
   await page.locator('[data-b2-mode="todo"]').click();
   check((await page.locator("#b2-selected-total").textContent()).includes("92.12"),
     "Total consolidado");
   check(await page.locator(".gx-b2-beta-banner,[data-b2-scenario]").count()===0,
     "Sin controles de prueba visibles");
   await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("vencido"));
   check((await page.locator(".loyalty-icon").textContent()).includes("💔"),
     "Lealtad perdida utiliza el corazón roto del diseño original");
   await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("prorroga"));
   check((await page.locator(".loyalty-icon").textContent()).includes("⭐"),
     "Estrella GOXION restaurada cuando no hay pérdida de lealtad");
   check(errors.length===0,"Sin errores JS: "+engine.name()+"/"+width+" "+errors.join(" | "));
   await context.close();
  }
  }finally{await browser.close();}
 }
 console.log("GOXION beta espejo · "+count+" verificaciones PASS Index + Ayuda Chromium/WebKit");
}finally{server.kill("SIGTERM")}
