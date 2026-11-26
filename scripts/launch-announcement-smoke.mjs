/* GOXION · flujo de novedades en navegador con sesión/cola legal simuladas.
   Sin llamadas externas, credenciales, mutaciones de negocio ni HTML público de pruebas. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { chromium, webkit } from "playwright";

const cwd=process.cwd(), script="/preview/mi-espacio-v2/release-announcement.js",
 css="/preview/mi-espacio-v2/release-announcement.css", logo="/Logo individual.png";
const oldVersion="nov2026-novedades-apiladas-v2-todos";
const version="nov2026-mi-espacio-lanzamiento-v1";
const oldSeen="gx-release-seen:"+oldVersion+":test-account";
const seen="gx-release-seen:"+version+":test-account";
const dir=process.env.GX_LAUNCH_SCREENSHOTS||"";
let paletteButtons=[];
for(const name of ["ayuda-espejo-feed-v2.html","ayuda-aceptacion-v2.html"]){
 const html=await readFile(resolve(cwd,name),"utf8");
 assert.ok(html.includes('data-gx-release-launch="'+(name==="ayuda-espejo-feed-v2.html"?"pilot":"off")+'"'));
 assert.match(html,/family=Poppins:/,"el candidato carga la fuente canónica");
 assert.equal((html.match(/release-announcement\.js\?/g)||[]).length,1,"un controlador por página");
 if(name==="ayuda-espejo-feed-v2.html")paletteButtons=html.match(/<button[^>]*data-goxy-color-choice="[^"]+"[^>]*>.*?<\/button>/g)||[];
}
const paletteColors=paletteButtons.map(button=>button.match(/--swatch:(#[0-9a-f]{6})/i)?.[1]);
assert.equal(paletteColors.length,5,"la prueba usa el selector de colores real del espejo");
const official=await readFile(resolve(cwd,"ayuda.html"),"utf8");
assert.doesNotMatch(official,/<html[^>]+data-gx-release-launch="enabled"/);
const intro="/preview/mi-espacio-v2/official-feed-intro.js",introCss="/preview/mi-espacio-v2/official-feed-intro.css";
const robot="/preview/mi-espacio-v2/goxy-heads-mirror.bundle.js",legal="/assets/js/ayuda/21-legal-v2-documents.js";
const allowed=new Map([[robot,"text/javascript"],[legal,"text/javascript"],[intro,"text/javascript"],[introCss,"text/css"],[script,"text/javascript"],[css,"text/css"],[logo,"image/png"]]);
const fixture=(params)=>{
 const edition=params.get("edition")==="pilot"?"pilot":params.get("edition")==="enabled"?"enabled":"off",startup=params.get("startup")==="1",scenario=params.get("scenario")||"accepted";
 const realLegal=scenario==="pending-real";
 const account=params.get("account")==="casone"?"casone":params.get("account")==="b"?"test-account-b":"test-account";
 // Las variables se limitan a constantes de prueba; no hay endpoints reales.
 return `<!doctype html><html lang="es" data-gx-release-launch="${edition}"><head>
 <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
 <link rel="stylesheet" href="${css}">${startup?'<link rel="stylesheet" href="'+introCss+'">':""}<style>html,body{margin:0;background:#030305;color:white;font:16px system-ui}#account{padding:30px}#behind{position:absolute;top:30px;left:30px}#gx-v2-shared-header{position:fixed;left:12px;top:12px;right:12px;height:44px;display:flex;justify-content:space-between;align-items:center}#gxn-avatar{position:relative;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;overflow:hidden;background:#17243d}#gxn-goxy-slot{display:grid;place-items:center;width:46px;height:46px}</style></head><body class="${startup?"gx-v2-private-visible":""}">
 <main id="account"><button id="behind">Mi Espacio</button><section id="view-dashboard" class="${startup?"active":""}"><div id="gx-v2-feed"></div><div id="gx-v2-sync" ${startup?"":"hidden"}></div></section></main><div id="pre-inert" inert>Anteriormente inerte</div>
 <header id="gx-v2-shared-header"><img class="gxn-wordmark" width="34" height="34" src="/Logo individual.png"><span id="gxn-avatar"><span class="gxai-avatar gxn-goxy-real"><span id="gxn-goxy-slot" data-goxy-color="#25887e" data-goxy-paused="false"></span></span></span><div id="gxn-goxy-colors" hidden>${paletteButtons.join("")}</div></header>
 ${startup?'<div id="gx-v2-handoff" hidden><div class="gx-v2-handoff-center"><img class="gx-v2-handoff-mark" src="/Logo individual.png"><div class="gx-v2-handoff-wait" hidden></div></div></div>':""}
 <script>
 window.entryTrace=[];window.localSamples=[];window.flightTrace=false;window.flightSamples=[];window.goxyTrace=false;window.goxyImpactTrace=false;window.goxyFlightColor=null;window.colorTrace=[];window.drawTrace=[];window.goxyArrivedAt=0;window.legalOpenedAt=0;window.releaseLegalAt=0;
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){const slot=this.canvas?.closest?.(".gx-launch-goxy-render");if(slot)window.drawTrace.push({time:performance.now(),color:slot.getAttribute("data-goxy-color")});return clear.apply(this,args)};
 window.addEventListener("goxion:legal-opened",()=>{window.legalOpenedAt=performance.now()});
 window.addEventListener("goxion:release:legal-ready",()=>{window.releaseLegalAt=performance.now()});
 new MutationObserver(()=>{const g=document.querySelector(".gx-launch-goxy-flight .gx-launch-goxy-portrait"),portrait=document.querySelector(".gx-launch-goxy-render"),color=portrait?.getAttribute("data-goxy-color");
 if(color&&window.colorTrace.at(-1)!==color)window.colorTrace.push(color);
 if(!g&&window.goxyTrace&&!window.goxyArrivedAt)window.goxyArrivedAt=performance.now();
 if(g&&g===window.goxyOriginal){window.goxyTrace=true;window.goxyFlightColor=g.querySelector(".gx-launch-goxy-render")?.getAttribute("data-goxy-color");}if(document.querySelector(".gx-launch-goxy-impact"))window.goxyImpactTrace=true;
 const root=document.querySelector("#gx-v2-handoff"),overlay=document.querySelector("#gx-release-overlay");
 if(overlay?.dataset.entry&&window.entryTrace.at(-1)!==overlay.dataset.entry)window.entryTrace.push(overlay.dataset.entry);
 if(overlay?.dataset.entry==="local"&&window.localSamples.length===0){
  const sample=()=>{if(overlay.dataset.entry!=="local")return;const r=overlay.querySelector(".gx-launch-orbit img").getBoundingClientRect();window.localSamples.push({size:r.width,x:r.x+r.width/2,y:r.y+r.height/2,opacity:parseFloat(getComputedStyle(overlay.querySelector(".gx-launch-copy")).opacity)});requestAnimationFrame(sample);};sample();
 }
 if(!window.flightTrace&&root?.classList.contains("is-launch-flight")&&overlay?.dataset.handoff==="flying"&&getComputedStyle(overlay.querySelector(".gx-launch-orbit img")).visibility==="hidden"){
 window.flightTrace=true;const sample=()=>{if(root.hidden||!root.classList.contains("is-launch-flight"))return;const a=root.querySelector("img").getBoundingClientRect(),b=overlay.querySelector(".gx-launch-orbit img").getBoundingClientRect();window.flightSamples.push({size:Math.min(a.width,a.height),x:a.x+a.width/2,y:a.y+a.height/2,tx:b.x+b.width/2,ty:b.y+b.height/2,ts:Math.min(b.width,b.height)});requestAnimationFrame(sample);};requestAnimationFrame(sample);}
 }).observe(document.body,{subtree:true,attributes:true,childList:true});
 window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:"fixture-session"},endpoint:()=>"/legal-fixture"};
 window.fixtureAccount=${JSON.stringify(account)};
 window.fixtureState={estado:${JSON.stringify(["late-legal","very-late-legal"].includes(scenario)?"sin_activar":["pending","deferred"].includes(scenario)?"pendiente":scenario==="rejected"?"rechazado":"aceptado")},deferido:${scenario==="deferred"},modalAbierto:false};
 window.fixtureAccess={restringido:${scenario==="restricted"},bloquea_operaciones:${scenario==="restricted"||scenario==="rejected"}};
 if(!${realLegal})window.GOXION_LEGAL_V2={getQueueStatus:()=>window.fixtureState,getAccessState:()=>window.fixtureAccess};
 window.getCurrentClientKey=()=>window.fixtureAccount;
 window.globalClientesData=${scenario==="missing-profile"?"{}":"{[window.fixtureAccount]:{}}"};
 if(${scenario!=="anonymous"})localStorage.setItem("fixture-session","synthetic");
 else localStorage.removeItem("fixture-session");
 window.switchTab=name=>{window.routeCalled=name;document.querySelector("#view-dashboard").classList.add("active")};
 document.getElementById("behind").focus();
 if(${scenario==="busy"}){const n=document.createElement("div");n.className="gx-auth-sheet show";document.body.append(n);window.addEventListener("load",()=>setTimeout(()=>n.remove(),850));}
 </script><script src="${robot}"></script><script>window.GOXY_ROBOT.mount(document.getElementById("gxn-goxy-slot"))</script><script src="${script}"></script>${realLegal?'<script src="'+legal+'"></script>':""}${startup?'<script src="'+intro+'"></script><script>window.addEventListener("load",()=>{document.querySelector("#gx-v2-sync").hidden=true;window.dispatchEvent(new Event("goxion:client-ready"));window.dispatchEvent(new Event("goxion:v2-feed:rendered"));'+(['late-legal','very-late-legal'].includes(scenario)?'setTimeout(()=>{window.fixtureState={estado:"aceptado",deferido:false,modalAbierto:false};window.dispatchEvent(new Event("goxion:legal-state"));},'+(scenario==='late-legal'?1250:3500)+');':'')+'})</script>':""}</body></html>`;
};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,"http://localhost");
 if(u.pathname==="/legal-fixture"){
  let body="";for await(const chunk of req)body+=chunk;
  assert.equal(req.method,"POST");assert.equal(req.headers["x-client-token"],"synthetic");
  assert.equal(JSON.parse(body).accion,"estado","la oferta jamás escribe aceptación");
  res.writeHead(200,{"Content-Type":"application/json"});return res.end(JSON.stringify({ok:true,habilitado:true,estado:"pendiente",cliente_id:"synthetic",acceso:{fase:"pendiente",restringido:false,bloquea_operaciones:false}}));
 }
 if(u.pathname==="/fixture"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(fixture(u.searchParams));}
 const path=decodeURIComponent(u.pathname);
 if(!allowed.has(path)){res.writeHead(404);return res.end();}
 try{const body=await readFile(resolve(cwd,"."+path));res.writeHead(200,{"Content-Type":allowed.get(path)});res.end(body);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port;
if(dir)await mkdir(dir,{recursive:true});
const waitOpen=async(page)=>{await page.locator("#gx-release-overlay[data-edition=launch]").waitFor({state:"visible",timeout:4000});};
const openFixture=async(context,{edition="enabled",scenario="accepted",account="a",startup="0"}={})=>{
 const p=await context.newPage();
 await p.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const errors=[];p.on("pageerror",e=>errors.push(String(e)));
 await p.goto(base+"/fixture?"+new URLSearchParams({edition,scenario,account,startup}));
 await p.evaluate(()=>window.GOXION_RELEASE_202610.refresh());
 return {page:p,errors};
};
const notOpen=async(p)=>{
 await p.waitForTimeout(470);
 assert.equal(await p.locator("#gx-release-overlay[data-edition=launch]:visible").count(),0,"no debe abrir la nueva edición");
};
const launchState=async p=>p.evaluate(()=>({
 seen:localStorage.getItem("gx-release-seen:nov2026-mi-espacio-lanzamiento-v1:test-account"),
 background:document.querySelector("#account").inert,
 preInert:document.querySelector("#pre-inert").inert,
 bodyLock:document.body.classList.contains("gx-release-v2-body-lock")
}));
const title=async p=>p.locator("#gx-release-v2-title").innerText();
// Validación de pintura real, no basta con un bounding box visible en WebKit.
// PNG estándar de Playwright: RGB/RGBA, 8 bits, sin entrelazar. Reconstituir scanlines.
function rgbAt(png,x,y){
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20),depth=png[24],kind=png[25];
 assert.equal(depth,8);assert.ok(kind===2||kind===6);assert.equal(png[28],0);
 assert.ok(x>=0&&x<width&&y>=0&&y<height);
 const data=[];for(let i=8;i<png.length;){const n=png.readUInt32BE(i),type=png.toString("ascii",i+4,i+8);if(type==="IDAT")data.push(png.subarray(i+8,i+8+n));i+=12+n;}
 const raw=inflateSync(Buffer.concat(data)),bpp=kind===6?4:3,stride=width*bpp;
 let previous=Buffer.alloc(stride),offset=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let j=0;j<=y;j++){
  const filter=raw[offset++],row=Buffer.alloc(stride);
  for(let i=0;i<stride;i++){
   const a=i>=bpp?row[i-bpp]:0,b=previous[i],c=i>=bpp?previous[i-bpp]:0;
   const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;
   assert.ok(Number.isFinite(predictor));row[i]=(raw[offset++]+predictor)&255;
  }
  previous=row;
 }
 return [...previous.subarray(x*bpp,x*bpp+3)];
}
async function captureCover(page,name){
 await page.locator("#gx-release-overlay[data-entry]").waitFor({state:"detached",timeout:2000});
 await page.waitForTimeout(200);
 const rect=await page.locator(".gx-launch-card").boundingBox();
 assert.ok(rect);
 const screenshot=await page.screenshot(dir?{path:resolve(dir,name+".png")}:{});
 const pixel=rgbAt(screenshot,Math.round(rect.x+12),Math.round(rect.y+rect.height-50));
 assert.ok(pixel.every((v,i)=>Math.abs(v-[21,21,28][i])<=8),"La portada no fue pintada por el navegador: "+JSON.stringify(pixel));
 const glow=rgbAt(screenshot,Math.round(rect.x+rect.width/2),Math.round(rect.y+80));
 assert.ok(glow[2]>pixel[2]+24,"Iluminación editorial perceptible y pie neutro: "+JSON.stringify({glow,pixel}));
}
const assertGeometry=async(p)=>{
 const result=await p.evaluate(()=>{
  const card=document.querySelector(".gx-launch-card"),content=document.querySelector(".gx-launch-content"),header=document.querySelector(".gx-launch-header"),footer=document.querySelector(".gx-launch-footer"),next=document.querySelector(".gx-launch-next"),progress=document.querySelector(".gx-launch-progress");
  const c=card.getBoundingClientRect(),h=header.getBoundingClientRect(),f=footer.getBoundingClientRect(),n=next.getBoundingClientRect(),pr=progress.getBoundingClientRect(),txt=content.getBoundingClientRect();
  const type=getComputedStyle(next),pill=getComputedStyle(next,"::before");
  return {canonicalCTA:type.fontFamily.includes("Poppins")&&type.fontSize==="11px"&&type.fontWeight==="600"&&type.borderTopWidth==="0px"&&pill.backgroundColor.replace(/\s/g,"")==="rgba(255,255,255,0.08)"&&n.width>=44,
   centeredProgress:Math.abs((pr.left+pr.right)/2-(c.left+c.right)/2)<1.5&&progress.querySelectorAll("span").length===6,
   fits:c.width<=innerWidth&&c.height<=innerHeight&&c.left>=0&&c.top>=0&&c.right<=innerWidth+.5&&c.bottom<=innerHeight+.5,
   actionVisible:n.left>=c.left&&n.right<=c.right+.5&&n.bottom<=c.bottom+.5&&n.height>=44,
   noSkip:!document.querySelector(".gx-launch-close,.gx-launch-motion"),ordered:h.bottom<=txt.top+1&&txt.bottom<=f.top+1,
   overflow:content.scrollWidth>content.clientWidth+1,docOverflow:document.documentElement.scrollWidth>innerWidth+1,
   progress:document.querySelector(".gx-launch-progress").getAttribute("aria-valuenow")};
 });
 assert.equal(result.fits,true,JSON.stringify(result));assert.equal(result.actionVisible,true,JSON.stringify(result));
 assert.equal(result.canonicalCTA,true,"CTA canónica Poppins 11/600, cristal .08 y objetivo 44px");assert.equal(result.centeredProgress,true,"seis barras centradas");
 assert.equal(result.noSkip,true);assert.equal(result.ordered,true);assert.equal(result.overflow,false);assert.equal(result.docOverflow,false);
};

try{
 for(const [name,engine] of [["chromium",chromium],["webkit",webkit]]){
  let browser;try{browser=await engine.launch({headless:true});}catch(e){throw new Error(name+" no disponible", {cause:e});}
  try{
   const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   // Sin flag nuevo: mantiene el controlador/versión históricos. El visto antiguo no afecta F.
   let obj=await openFixture(ctx,{edition:"off"});
   let p=obj.page;
   await p.evaluate(k=>localStorage.setItem(k,"1"),oldSeen);
   assert.equal(await p.evaluate(()=>window.GOXION_RELEASE_202610.version),oldVersion);
   await notOpen(p);await p.close();
   for(const scenario of ["anonymous","missing-profile","rejected","restricted"]){
    obj=await openFixture(ctx,{scenario});p=obj.page;await notOpen(p);assert.equal(obj.errors.length,0,scenario);await p.close();
   }
   obj=await openFixture(ctx);
   p=obj.page;await waitOpen(p);
   assert.equal(await p.evaluate(()=>window.GOXION_RELEASE_202610.version),version);
   assert.equal(await p.locator(".gx-launch-progress").getAttribute("aria-valuenow"),"1");
   await p.waitForFunction(()=>{const img=document.querySelector(".gx-launch-art img");return img?.complete&&img.naturalWidth>0;});
   assert.equal(await p.locator(".gx-launch-art img").evaluate(el=>el.naturalWidth>0),true,"logo real");
   assert.deepEqual(await launchState(p),{seen:null,background:true,preInert:true,bodyLock:true});
   await p.waitForTimeout(1050);
   assert.match(await title(p),/Más inteligente que nunca/);
   assert.equal(await p.locator("[data-gx-release-clone]").count(),0);
   await assertGeometry(p);
   await captureCover(p,name+"-01-portada");
   // Prioridad de términos: interrumpir sin consumir; luego vuelve la portada.
   await p.evaluate(()=>{fixtureState={estado:"pendiente",deferido:false,modalAbierto:true};window.dispatchEvent(new Event("goxion:legal-opened"));});
   await p.locator("#gx-release-overlay").waitFor({state:"hidden"});
   assert.deepEqual(await launchState(p),{seen:null,background:false,preInert:true,bodyLock:false});
   await p.evaluate(()=>{fixtureState={estado:"aceptado",deferido:false,modalAbierto:false};window.dispatchEvent(new Event("goxion:legal-dismissed"));});
   await waitOpen(p);
   await captureCover(p,name+"-01-reapertura");
   // Foco de teclado y navegación explícita (ningún avance automático).
   await p.locator(".gx-launch-next").focus();await p.keyboard.press("Shift+Tab");
   assert.equal(await p.evaluate(()=>document.activeElement.className),"gx-launch-next");
   await p.keyboard.press("Escape");
   assert.equal(await p.locator("#gx-release-overlay").isVisible(),true,"sin omitir por Escape");
   assert.equal(await p.locator(".gx-launch-progress").getAttribute("aria-valuenow"),"1");
   await p.keyboard.press("ArrowRight");assert.match(await title(p),/de un vistazo/);
   await p.locator(".gx-launch-back").click();assert.match(await title(p),/Más inteligente/);
   for(let i=0;i<6;i++){
    await assertGeometry(p);
    assert.equal(await p.locator(".gx-launch-progress").getAttribute("aria-valuenow"),String(i+1));
    if(i===5)await p.locator(".gx-launch-goxy-render canvas").waitFor({state:"visible",timeout:4000});
    await p.waitForTimeout(400);
    if(dir&&i>0)await p.screenshot({path:resolve(dir,name+"-0"+(i+1)+"-capitulo.png")});
    if(i<5)await p.locator(".gx-launch-next").click();
   }
   assert.equal(await p.locator(".gx-launch-next").innerText(),"Explorar Mi Espacio");
   await p.locator(".gx-launch-next").click();
   await p.locator("#gx-release-overlay").waitFor({state:"hidden"});
   assert.deepEqual(await launchState(p),{seen:"1",background:false,preInert:true,bodyLock:false});
   assert.equal(await p.evaluate(()=>window.routeCalled),"inicio");
   await p.evaluate(()=>window.GOXION_RELEASE_202610.refresh());await notOpen(p);
   assert.equal(obj.errors.length,0);await p.close();
   // Otro cliente en el mismo navegador: no comparte el visto.
   obj=await openFixture(ctx,{account:"b"});p=obj.page;await waitOpen(p);
   await p.keyboard.press("Escape");assert.equal(await p.locator("#gx-release-overlay").isVisible(),true);
   assert.equal(await p.evaluate(()=>localStorage.getItem("gx-release-seen:nov2026-mi-espacio-lanzamiento-v1:test-account-b")),null);
   await p.close();
   // Nueva pestaña: salir del navegador no consume. Logout libera overlay.
   obj=await openFixture(ctx,{account:"b"});p=obj.page;await waitOpen(p);
   await p.evaluate(()=>{localStorage.removeItem("fixture-session");window.dispatchEvent(new Event("goxion:client-logout"));});
   await p.locator("#gx-release-overlay").waitFor({state:"hidden"});
   assert.equal(await p.evaluate(()=>document.body.classList.contains("gx-release-v2-body-lock")),false);
   assert.equal(await p.evaluate(()=>localStorage.getItem("gx-release-seen:nov2026-mi-espacio-lanzamiento-v1:test-account-b")),null);
   assert.equal(obj.errors.length,0);await ctx.close();
   // Geometría en todos los anchos del contrato; reduced-motion sin ciclos.
   const responsive=await browser.newContext({viewport:{width:280,height:568},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
   obj=await openFixture(responsive);p=obj.page;await waitOpen(p);
   for(const [width,height] of [[280,568],[320,568],[360,640],[375,667],[390,844],[430,932],[768,1024],[740,360]]){
    await p.setViewportSize({width,height});
    for(let i=0;i<6;i++){await assertGeometry(p);if(i<5)await p.locator(".gx-launch-next").click();}
    for(let i=0;i<5;i++)await p.locator(".gx-launch-back").click();
   }
   assert.equal(await p.locator(".gx-launch-copy").evaluate(el=>getComputedStyle(el).animationName),"none");
   assert.equal(await p.locator(".gx-launch-motion").isVisible(),false);
   for(let i=0;i<5;i++)await p.locator(".gx-launch-next").click();
   await p.waitForTimeout(1700);
   assert.equal(await p.locator(".gx-launch-goxy-render").getAttribute("data-goxy-color"),"#25887e","movimiento reducido sin demostración de color");
   assert.equal(obj.errors.length,0);await responsive.close();
   // Arranque real del espejo, limitado a cuenta piloto sintética: un solo logo en vuelo.
   const pilotContext=await browser.newContext({viewport:{width:390,height:844}});
   const {page:pilotPage,errors:pilotErrors}=await openFixture(pilotContext,{edition:"pilot",account:"casone",startup:"1",scenario:"late-legal"});
   await waitOpen(pilotPage);
   if(dir){await pilotPage.waitForTimeout(350);await pilotPage.screenshot({path:resolve(dir,name+"-pilot-entrada.png")});}
   await pilotPage.locator("#gx-v2-handoff").waitFor({state:"hidden",timeout:4000});
   assert.equal(await pilotPage.evaluate(()=>window.flightTrace),true,"acople del logo a la tarjeta");
   const flightSamples=await pilotPage.evaluate(()=>window.flightSamples);
   assert.ok(flightSamples.length>=5,"el viaje tiene fotogramas intermedios reales");
   const first=flightSamples[0],last=flightSamples.at(-1);
   assert.ok(last.size-first.size>45,"el logo crece desde carga hasta portada");
   assert.ok(Math.hypot(first.x-last.x,first.y-last.y)>25,"el logo viaja, no sólo aumenta tamaño");
   assert.ok(Math.hypot(last.x-last.tx,last.y-last.ty)<12&&Math.abs(last.size-last.ts)<12,"el destino coincide con el arte final");
   assert.equal(await pilotPage.locator(".gx-launch-orbit img").evaluate(el=>getComputedStyle(el).visibility),"visible");
   assert.equal(await pilotPage.locator("#gx-release-overlay").getAttribute("data-handoff"),null);
   assert.deepEqual(await pilotPage.evaluate(()=>window.entryTrace),["handoff"],"una única entrada especial");
   assert.equal(await pilotPage.locator("#gx-release-overlay").getAttribute("data-entry"),null);
   const logoWidth=(await pilotPage.locator(".gx-launch-orbit img").boundingBox()).width;
   assert.ok(logoWidth>=165&&logoWidth<=182,"logo proporcionado en móvil: "+logoWidth);
   if(dir)await pilotPage.screenshot({path:resolve(dir,name+"-pilot-portada.png")});
   const float=await pilotPage.locator(".gx-launch-orbit img").evaluate(el=>el.getAnimations().find(a=>a.animationName==="gx-launch-cover-breathe")?.effect?.getKeyframes());
   assert.ok(float.some(f=>f.transform==="translateY(-7px)"),"flotación más perceptible, misma proporción");
   await pilotPage.locator(".gx-launch-next").click();
   assert.equal(await pilotPage.locator("#gx-release-overlay").getAttribute("data-accent"),"cyan");
   assert.ok((await pilotPage.locator(".gx-launch-pulso svg").boundingBox()).width>=150);
   assert.equal(await pilotPage.locator(".gx-pulso-row-a").evaluate(el=>getComputedStyle(el).animationPlayState),"running");
   await pilotPage.locator(".gx-launch-next").click();
   assert.ok(parseFloat(await pilotPage.locator(".gx-launch-benefit-icons").evaluate(el=>getComputedStyle(el).fontSize))>=60);
   assert.equal(await pilotPage.locator(".gx-launch-benefit-icons span").first().evaluate(el=>getComputedStyle(el).animationIterationCount),"infinite");
   for(let i=0;i<3;i++)await pilotPage.locator(".gx-launch-next").click();
   await pilotPage.locator(".gx-launch-goxy-render canvas").waitFor({state:"visible",timeout:4000});
   assert.equal(await pilotPage.locator(".gx-launch-goxy-render").getAttribute("data-goxy-color"),"#25887e");
   assert.equal(await pilotPage.locator("#gxn-goxy-slot").getAttribute("data-goxy-paused"),"true");
   const portrait=pilotPage.locator(".gx-launch-goxy-render");
   await pilotPage.waitForFunction(colors=>window.colorTrace.filter(c=>c!=="#25887e"&&!colors.includes(c)).length>=5,paletteColors);
   if(dir)await pilotPage.screenshot({path:resolve(dir,name+"-pilot-mezcla.png")});
   await pilotPage.waitForFunction(colors=>{const c=document.querySelector(".gx-launch-goxy-render")?.getAttribute("data-goxy-color");return c!=="#25887e"&&colors.includes(c);},paletteColors);
   const firstColor=await portrait.getAttribute("data-goxy-color");
   assert.ok(paletteColors.includes(firstColor));
   const trace=await pilotPage.evaluate(()=>window.colorTrace);
   assert.ok(trace.filter(c=>c!=="#25887e"&&!paletteColors.includes(c)).length>=5,"mezcla gradual del color real, no saltos discretos: "+JSON.stringify(trace));
   await pilotPage.waitForTimeout(250);
   if(dir)await pilotPage.screenshot({path:resolve(dir,name+"-pilot-color-1.png")});
   assert.equal(await pilotPage.locator(".gx-launch-progress").getAttribute("aria-valuenow"),"6","navegación manual");
   assert.equal(await portrait.getAttribute("data-goxy-paused"),"false","movimiento permanece activo");
   assert.equal(await portrait.locator("[data-gx-live-shell=true]").count(),1,"un renderer de carcasa viva");
   const drawn=await pilotPage.evaluate(()=>window.drawTrace);
   const mixedDraws=drawn.filter(f=>f.color!=="#25887e"&&!paletteColors.includes(f.color));
   assert.ok(new Set(mixedDraws.map(f=>f.color)).size>=5,"el canvas dibuja material intermedio durante el movimiento: "+JSON.stringify(mixedDraws.slice(0,10)));
   assert.ok(mixedDraws.length>=8,"continúa dibujando entre colores");
   await pilotPage.waitForFunction(({color,colors})=>{const c=document.querySelector(".gx-launch-goxy-render")?.getAttribute("data-goxy-color");return c!==color&&colors.includes(c);},{color:firstColor,colors:paletteColors});
   await pilotPage.waitForTimeout(250);
   if(dir)await pilotPage.screenshot({path:resolve(dir,name+"-pilot-color-2.png")});
   await pilotPage.waitForFunction(colors=>colors.every(c=>window.colorTrace.includes(c))&&document.querySelector(".gx-launch-goxy-render")?.getAttribute("data-goxy-color")==="#25887e",paletteColors,{timeout:16000});
   await pilotPage.waitForTimeout(2350);
   assert.equal(await portrait.getAttribute("data-goxy-color"),"#25887e","una sola demostración y vuelve a su color");
   assert.equal(await pilotPage.locator("#gxn-goxy-slot").getAttribute("data-goxy-color"),"#25887e","no altera preferencia del avatar");
   await pilotPage.locator(".gx-launch-back").click();
   await pilotPage.locator(".gx-launch-next").click();
   await pilotPage.waitForFunction(colors=>{const c=document.querySelector(".gx-launch-goxy-render")?.getAttribute("data-goxy-color");return c!=="#25887e"&&colors.includes(c);},paletteColors);
   await pilotPage.evaluate(()=>{window.goxyOriginal=document.querySelector(".gx-launch-goxy-portrait")});
   // Real renderer, same node flies; no clone and no stale animation.
   await pilotPage.locator(".gx-launch-next").click();
   await pilotPage.locator(".gx-launch-goxy-flight").waitFor({state:"attached",timeout:2000});
   await pilotPage.locator(".gx-launch-goxy-flight").waitFor({state:"detached",timeout:3000});
   await pilotPage.locator(".gx-launch-goxy-impact").waitFor({state:"detached",timeout:3000});
   assert.equal(await pilotPage.evaluate(()=>window.goxyTrace&&window.goxyImpactTrace),true,"Goxy aterrizó en el avatar con onda");
   assert.equal(await pilotPage.evaluate(()=>window.goxyFlightColor),"#25887e","Goxy recupera su color al aterrizar");
   assert.equal(await pilotPage.locator("#gxn-goxy-slot").getAttribute("data-goxy-color"),"#25887e");
   assert.equal(await pilotPage.locator("#gxn-goxy-slot").getAttribute("data-goxy-paused"),"false");
   assert.equal(await pilotPage.locator(".gx-launch-goxy-portrait").count(),0);
   assert.equal(await pilotPage.evaluate(()=>document.body.classList.contains("gx-launch-goxy-active")),false);
   const pilotSeen="gx-release-seen:nov2026-mi-espacio-lanzamiento-pilot-v5:casone";
   assert.equal(await pilotPage.evaluate(k=>sessionStorage.getItem(k),pilotSeen),"1");
   assert.equal(await pilotPage.evaluate(()=>localStorage.getItem("gx-release-seen:nov2026-mi-espacio-lanzamiento-v1:casone")),null);
   await pilotPage.evaluate(()=>{localStorage.removeItem("fixture-session");window.dispatchEvent(new Event("goxion:client-logout"))});
   assert.equal(await pilotPage.evaluate(k=>sessionStorage.getItem(k),pilotSeen),null);
   assert.deepEqual(pilotErrors,[]);
   await pilotContext.close();
   const otherContext=await browser.newContext();
   const {page:otherPage}=await openFixture(otherContext,{edition:"pilot",account:"b",startup:"1"});
   await otherPage.locator("#gx-v2-handoff").waitFor({state:"hidden",timeout:4000});
   await notOpen(otherPage);assert.equal(await otherPage.evaluate(()=>window.flightTrace),false);
   await otherContext.close();
   // Controlador LEGAL REAL, sesión sintética y sólo lectura del estado.
   const pendingContext=await browser.newContext({viewport:{width:390,height:844}});
   const {page:pendingPilot,errors:pendingErrors}=await openFixture(pendingContext,{edition:"pilot",account:"casone",scenario:"pending-real",startup:"1"});
   await waitOpen(pendingPilot);
   await pendingPilot.locator("#gx-v2-handoff").waitFor({state:"hidden",timeout:4000});
   assert.equal(await pendingPilot.evaluate(()=>window.flightTrace),true,"pendiente inicia por Novedades");
   assert.equal(await pendingPilot.evaluate(()=>window.GOXION_RELEASE_202610.holdsLegalOffer()),true);
   await pendingPilot.waitForTimeout(2800);
   assert.equal(await pendingPilot.locator("#gx-legal-consent[open]").count(),0,"legal no compite con portada");
   for(let i=0;i<5;i++)await pendingPilot.locator(".gx-launch-next").click();
   await pendingPilot.locator(".gx-launch-goxy-render canvas").waitFor({state:"visible",timeout:4000});
   await pendingPilot.evaluate(()=>{window.goxyOriginal=document.querySelector(".gx-launch-goxy-portrait")});
   await pendingPilot.locator(".gx-launch-next").click();
   await pendingPilot.locator(".gx-launch-goxy-flight").waitFor({state:"attached"});
   await pendingPilot.locator(".gx-launch-goxy-flight").waitFor({state:"detached"});
   assert.equal(await pendingPilot.locator("#gx-legal-consent[open]").count(),0);
   assert.equal(await pendingPilot.evaluate(()=>document.querySelector("#account").inert),true,"fondo bloqueado hasta separar los avisos");
   await pendingPilot.locator("#gx-legal-consent[open]").waitFor({state:"visible",timeout:5000});
   const timing=await pendingPilot.evaluate(()=>({arrive:window.goxyArrivedAt,release:window.releaseLegalAt,legal:window.legalOpenedAt}));
   assert.ok(timing.arrive>0&&timing.release-timing.arrive>=1700&&timing.legal>=timing.release,"secuencia y espera desde aterrizaje: "+JSON.stringify(timing));
   assert.equal(await pendingPilot.evaluate(()=>document.querySelector("#account").inert),false);
   assert.equal(await pendingPilot.evaluate(()=>window.GOXION_LEGAL_V2.getState()),"pendiente","sin aceptar por el recorrido");
   assert.deepEqual(pendingErrors,[]);await pendingContext.close();
   // Un cliente no piloto continúa con el legal primero.
   const ordinaryContext=await browser.newContext({viewport:{width:390,height:844}});
   const {page:ordinary}=await openFixture(ordinaryContext,{edition:"pilot",account:"b",scenario:"pending-real",startup:"1"});
   await ordinary.locator("#gx-legal-consent[open]").waitFor({state:"visible",timeout:6500});
   assert.equal(await ordinary.locator("#gx-release-overlay[data-edition=launch]").count(),0);
   await ordinaryContext.close();
   // Regresión de la grabación: aceptación diferida o capa transitoria no
   // separan la animación de inicio de la apertura elegible.
   for(const scenario of ["deferred","busy"]){
    const c=await browser.newContext({viewport:{width:390,height:844}});
    const {page:q,errors}=await openFixture(c,{edition:"pilot",account:"casone",scenario,startup:"1"});
    await waitOpen(q);await q.locator("#gx-v2-handoff").waitFor({state:"hidden",timeout:4000});
    assert.equal(await q.evaluate(()=>window.flightTrace),true,scenario);
    assert.deepEqual(await q.evaluate(()=>window.entryTrace),["handoff"]);
    await captureCover(q,name+"-pilot-"+scenario);
    assert.deepEqual(errors,[]);await c.close();
   }
   // Si legal tarda más que la espera segura, el encabezado conserva prioridad;
   // al abrir después, la misma portada tiene su entrada editorial una sola vez.
   const lateContext=await browser.newContext({viewport:{width:390,height:844}});
   const {page:late,errors:lateErrors}=await openFixture(lateContext,{edition:"pilot",account:"casone",scenario:"very-late-legal",startup:"1"});
   await late.locator("#gx-v2-handoff").waitFor({state:"hidden",timeout:4000});
   assert.equal(await late.evaluate(()=>window.flightTrace),false);
   await late.locator("#gx-release-overlay[data-entry=local]").waitFor({state:"visible",timeout:6000});
   await captureCover(late,name+"-pilot-apertura-tardia");
   const local=await late.evaluate(()=>window.localSamples);
   assert.ok(local.length>=5&&local.at(-1).size-local[0].size>40&&Math.abs(local.at(-1).y-local[0].y)>25,"entrada tardía visible con fotogramas reales");
   assert.ok(local.some(f=>f.opacity<.65)&&local.at(-1).opacity>.95,"texto revelado gradualmente");
   await late.locator(".gx-launch-next").click();await late.locator(".gx-launch-back").click();
   assert.equal(await late.locator("#gx-release-overlay").getAttribute("data-entry"),null,"volver a portada no repite entrada");
   assert.deepEqual(lateErrors,[]);await lateContext.close();
   console.log(name+": PASS activación deshabilitada, sesión/cola, seis capítulos y retroceso, foco, sin omisión, cola real, dibujo vivo, visto por cuenta, logout, reduced-motion, 8 tamaños");
  }finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}

