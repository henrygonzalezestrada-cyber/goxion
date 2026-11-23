/* GOXION · Pruebas visuales aisladas (NO acceden a cuentas reales).
   Los estados ficticios viven exclusivamente dentro del navegador de CI.
   La página entregada no incluye fixtures ni controles de escenarios. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium,webkit} from "playwright";
const PORT=4266, origin="http://127.0.0.1:"+PORT;
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{
 env:{...process.env,PORT:String(PORT)},stdio:"ignore"
});
async function serverReady(){
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+"/preview/mi-espacio-espejo/index.html")).ok)return;}catch(_){}
  await nap(100);
 }
 throw Error("Servidor local no disponible");
}
async function test(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,320,280]){
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:"reduce"});
   await page.route("**/*",route=>{
    const url=route.request().url();
    if(url.startsWith(origin))return route.continue();
    return route.abort();
   });
   await page.goto(origin+"/preview/mi-espacio-espejo/index.html",{
    waitUntil:"domcontentloaded",timeout:30000
   });
   await page.locator("#gx-mirror-priority").waitFor({state:"attached",timeout:10000});
   const basic=await page.evaluate(()=>{
    const find=s=>document.querySelector(s);
    return {
     noDemo:!document.querySelector("#demo-panel,#gxb-lab-toggle,#gxs-lab-controls"),
     navCount:document.querySelectorAll("#goxion-main-nav").length,
     navSticky:getComputedStyle(find("#goxion-main-nav")).position==="sticky",
     oldStickyHidden:getComputedStyle(find("#sticky-client-bar")).display==="none",
     releaseHidden:getComputedStyle(find(".goxion-release-version")).display==="none",
     legal:!!document.getElementById("modal-terminos"),
     originalCredentials:!!document.getElementById("header-action-btn"),
     officialServices:!!document.getElementById("dash-services")
    };
   });
   for(const [key,value] of Object.entries(basic)){
    assert(value===true||value===1,name+"/"+width+": "+key+"="+value);
   }
   await page.evaluate(()=>{
    document.body.classList.remove("no-scroll");
    globalClientesData={qa:{
      nombre:"QA",folio:"QA-LOCAL",
      estado_cuenta:{estado:"revision",lealtad:{pagos_efectivos:3,racha_reiniciada_virtual:false}},
      pago_revision_estado:"revision",pago_en_revision:true
    }};
    window.goxionCurrentClientKey="qa";
    document.getElementById("view-dashboard").classList.add("active");
    document.getElementById("dash-onboarding-card").hidden=true;
    document.getElementById("dash-date").textContent="15 de diciembre";
    document.getElementById("loyalty-count").textContent="3/4 Pagos";
    document.getElementById("loyalty-msg").textContent="Acumula 4 pagos consecutivos.";
    document.getElementById("referral-section-container").innerHTML=
      '<div id="gamif-grid" class="gamification-grid">'+
      '<div class="gamif-btn gx-gamif-card gx-gamif-card-ref" data-watermark="🎁" onclick="openGamif(\'referral\')"><div class="gx-gamif-card-status">En progreso</div></div>'+
      '<div class="gamif-btn gx-gamif-card gx-gamif-card-mission" data-watermark="🎯" onclick="openGamif(\'coupon\')"><div class="gx-gamif-card-status">Dos completadas</div></div></div>'+
      '<div id="gamif-expanded-referral" class="gamif-expanded-container"></div>'+
      '<div id="gamif-expanded-coupon" class="gamif-expanded-container"></div>';
   });
   await nap(300);
   const review=await page.evaluate(()=>({
    title:document.getElementById("gx-mirror-priority-title").textContent,
    clock:document.getElementById("gx-mirror-priority-icon").dataset.icon,
    loyalty:document.getElementById("gx-mirror-loyalty-value").textContent,
    emoji:document.getElementById("gx-mirror-loyalty-emoji").textContent,
    realBadgeCount:document.querySelectorAll("#gx-client-notif-badge").length,
    goxyCount:document.querySelectorAll("#gx-mirror-goxy").length,
    greeting:document.getElementById("gx-mirror-greeting")?.getAttribute("aria-label")
   }));
   assert.equal(review.title,"Estamos revisando tu comprobante",name+"/"+width+" review title");
   assert.equal(review.clock,"clock",name+"/"+width+" clock");
   assert.equal(review.loyalty,"3/4",name+"/"+width+" loyalty");
   assert.equal(await page.locator("#gamif-grid .gxb-tile").count(),3,name+"/"+width+" compactas aprobadas");
   assert.equal(await page.locator("#gamif-grid .gxb-live-visual").count(),2,name+"/"+width+" cards oficiales estilizadas");
   const row=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll("#gamif-grid > .gxb-tile")].map(x=>x.getBoundingClientRect());
    return {count:cards.length,oneLine:cards.length===3&&cards.every(r=>Math.abs(r.top-cards[0].top)<4),widths:cards.map(r=>r.width)};
   });
   assert(row.oneLine,name+"/"+width+" tres beneficios deben compartir la misma fila: "+JSON.stringify(row));
   assert(row.widths.every(w=>w>50),name+"/"+width+" compactas sin colapso horizontal");
   const clean=await page.evaluate(()=>{
    const root=document.getElementById("gamif-grid");
    const a=root.querySelector(".gx-gamif-card-ref");
    const b=root.querySelector(".gx-gamif-card-mission");
    const old=a.querySelector(".gx-gamif-card-status");
    return {refSize:a.getBoundingClientRect().height,
      missionSize:b.getBoundingClientRect().height,
      originalHidden:getComputedStyle(old).display==="none",
      noOverflow:document.documentElement.scrollWidth<=innerWidth+1};
   });
   assert(clean.originalHidden,name+"/"+width+" sin textos legados visibles");
   assert.equal(await page.locator("#gamif-grid .gx-gamif-card-ref .gxb-label").textContent(),"Referidos",name+"/"+width+" etiqueta real");
   assert.equal(await page.locator("#gamif-grid .gx-gamif-card-mission .gxb-label").textContent(),"Misiones",name+"/"+width+" etiqueta real");
   assert(clean.noOverflow,name+"/"+width+" desbordamiento horizontal");
   assert(clean.refSize>=120&&clean.refSize<180,name+"/"+width+" altura de tarjeta compacta");
   assert(clean.missionSize>=120&&clean.missionSize<180,name+"/"+width+" altura de Misiones");
   assert.equal(review.emoji,"⭐",name+"/"+width+" star");
   assert(review.realBadgeCount<=1,name+"/"+width+" duplicate notification badge");
   assert.equal(review.goxyCount,1,name+"/"+width+" avatar Goxy único");
   assert.equal(review.greeting,"Hola, QA",name+"/"+width+" saludo auténtico");
   await page.locator("#gx-mirror-loyalty").click();
   assert.equal(await page.locator("#gx-mirror-loyalty-expanded").isVisible(),true,name+"/"+width+" loyalty detail");
   await page.locator("#gx-mirror-loyalty-expanded .gxb-dismiss").click();
   await page.evaluate(()=>{
    globalClientesData.qa.estado_cuenta.estado="pagado";
    globalClientesData.qa.estado_cuenta.lealtad.racha_reiniciada_virtual=true;
    globalClientesData.qa.pago_revision_estado="";
    globalClientesData.qa.pago_en_revision=false;
    document.getElementById("loyalty-count").textContent="0/4 Pagos";
   });
   await nap(250);
   assert.equal(await page.locator("#gx-mirror-priority-icon").getAttribute("data-icon"),"check",name+"/"+width+" confirmation");
   assert.equal(await page.locator("#gx-mirror-loyalty-emoji").textContent(),"💔",name+"/"+width+" lost streak");
   // El click del acordeón puede mover el scroll: generar desplazamiento
   // real desde arriba, en vez de asumir que y=450 siempre implica bajar.
   await page.evaluate(()=>{
    const filler=document.createElement("div");filler.style.height="2400px";document.body.append(filler);
    window.scrollTo(0,0);window.dispatchEvent(new Event("scroll"));
   });
   await nap(100);
   await page.evaluate(()=>{window.scrollTo(0,550);window.dispatchEvent(new Event("scroll"));});
   await nap(450);
   const nav=await page.locator("#goxion-main-nav").boundingBox();
   const max=width<=320?158:160;
   assert(nav&&Math.abs(nav.width-max)<3,name+"/"+width+" compact width "+nav?.width);
   await page.close();
  }
 }finally{await browser.close();}
}
try{
 await serverReady();
 for(const [name,engine] of Object.entries({chromium,webkit})){
  await test(engine,name);
  console.log(name+": 390/320/280 px · navegación, estados, lealtad y sin escenarios visibles: OK");
 }
}finally{server.kill("SIGTERM");}
