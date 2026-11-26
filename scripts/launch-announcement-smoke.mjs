/* GOXION · flujo de novedades en navegador con sesión/cola legal simuladas.
   Sin llamadas externas, credenciales, mutaciones de negocio ni HTML público de pruebas. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { chromium, webkit } from "playwright";

const cwd=process.cwd(), script="/assets/js/ayuda/20-release-announcement.js",
 css="/assets/css/goxion-release-v2.css", logo="/Logo individual.png";
const oldVersion="nov2026-novedades-apiladas-v2-todos";
const version="nov2026-mi-espacio-lanzamiento-v1";
const oldSeen="gx-release-seen:"+oldVersion+":test-account";
const seen="gx-release-seen:"+version+":test-account";
const dir=process.env.GX_LAUNCH_SCREENSHOTS||"";
for(const name of ["ayuda-espejo-feed-v2.html","ayuda-aceptacion-v2.html"]){
 const html=await readFile(resolve(cwd,name),"utf8");
 assert.match(html,/<html[^>]+data-gx-release-launch="off"/);
 assert.equal((html.match(/20-release-announcement\.js\?/g)||[]).length,1,"un controlador por página");
}
const official=await readFile(resolve(cwd,"ayuda.html"),"utf8");
assert.doesNotMatch(official,/<html[^>]+data-gx-release-launch="enabled"/);
const allowed=new Map([[script,"text/javascript"],[css,"text/css"],[logo,"image/png"]]);
const fixture=(params)=>{
 const enabled=params.get("edition")==="enabled",scenario=params.get("scenario")||"accepted";
 const account=params.get("account")==="b"?"test-account-b":"test-account";
 // Las variables se limitan a constantes de prueba; no hay endpoints reales.
 return `<!doctype html><html lang="es" ${enabled?'data-gx-release-launch="enabled"':'data-gx-release-launch="off"'}><head>
 <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
 <link rel="stylesheet" href="${css}"><style>html,body{margin:0;background:#030305;color:white;font:16px system-ui}#account{padding:30px}#behind{position:absolute;top:30px;left:30px}</style></head><body>
 <main id="account"><button id="behind">Mi Espacio</button><section id="view-dashboard"></section></main><div id="pre-inert" inert>Anteriormente inerte</div>
 <script>
 window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:"fixture-session"}};
 window.fixtureAccount=${JSON.stringify(account)};
 window.fixtureState={estado:${JSON.stringify(scenario==="pending"?"pendiente":scenario==="rejected"?"rechazado":"aceptado")},deferido:false,modalAbierto:false};
 window.fixtureAccess={restringido:${scenario==="restricted"},bloquea_operaciones:${scenario==="restricted"||scenario==="rejected"}};
 window.GOXION_LEGAL_V2={getQueueStatus:()=>window.fixtureState,getAccessState:()=>window.fixtureAccess};
 window.getCurrentClientKey=()=>window.fixtureAccount;
 window.globalClientesData=${scenario==="missing-profile"?"{}":"{[window.fixtureAccount]:{}}"};
 if(${scenario!=="anonymous"})localStorage.setItem("fixture-session","synthetic");
 else localStorage.removeItem("fixture-session");
 window.switchTab=name=>{window.routeCalled=name;document.querySelector("#view-dashboard").classList.add("active")};
 document.getElementById("behind").focus();
 </script><script src="${script}"></script></body></html>`;
};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,"http://localhost");
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
const openFixture=async(context,{edition="enabled",scenario="accepted",account="a"}={})=>{
 const p=await context.newPage();
 await p.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const errors=[];p.on("pageerror",e=>errors.push(String(e)));
 await p.goto(base+"/fixture?"+new URLSearchParams({edition,scenario,account}));
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
 await page.waitForTimeout(600);
 const rect=await page.locator(".gx-launch-card").boundingBox();
 assert.ok(rect);
 const screenshot=await page.screenshot(dir?{path:resolve(dir,name+".png")}:{});
 const pixel=rgbAt(screenshot,Math.round(rect.x+12),Math.round(rect.y+80));
 assert.ok(pixel.every((v,i)=>Math.abs(v-[21,21,28][i])<=6),"La portada no fue pintada por el navegador: "+JSON.stringify(pixel));
}
const assertGeometry=async(p)=>{
 const result=await p.evaluate(()=>{
  const card=document.querySelector(".gx-launch-card"),content=document.querySelector(".gx-launch-content"),header=document.querySelector(".gx-launch-header"),footer=document.querySelector(".gx-launch-footer"),next=document.querySelector(".gx-launch-next"),close=document.querySelector(".gx-launch-close"),disk=close.querySelector("span");
  const c=card.getBoundingClientRect(),h=header.getBoundingClientRect(),f=footer.getBoundingClientRect(),n=next.getBoundingClientRect(),hit=close.getBoundingClientRect(),disc=disk.getBoundingClientRect(),txt=content.getBoundingClientRect();
  return {fits:c.width<=innerWidth&&c.height<=innerHeight&&c.left>=0&&c.top>=0&&c.right<=innerWidth+.5&&c.bottom<=innerHeight+.5,
   actionVisible:n.left>=c.left&&n.right<=c.right+.5&&n.bottom<=c.bottom+.5&&n.height>=44,
   dimensions:Math.round(hit.width)===44&&Math.round(disc.width)===35,ordered:h.bottom<=txt.top+1&&txt.bottom<=f.top+1,
   overflow:content.scrollWidth>content.clientWidth+1,docOverflow:document.documentElement.scrollWidth>innerWidth+1,
   progress:document.querySelector(".gx-launch-progress").getAttribute("aria-valuenow")};
 });
 assert.equal(result.fits,true,JSON.stringify(result));assert.equal(result.actionVisible,true,JSON.stringify(result));
 assert.equal(result.dimensions,true);assert.equal(result.ordered,true);assert.equal(result.overflow,false);assert.equal(result.docOverflow,false);
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
   for(const scenario of ["anonymous","missing-profile","rejected","restricted","pending"]){
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
   await p.locator(".gx-launch-close").focus();await p.keyboard.press("Shift+Tab");
   assert.equal(await p.evaluate(()=>document.activeElement.className),"gx-launch-next");
   await p.keyboard.press("ArrowRight");assert.match(await title(p),/de un vistazo/);
   await p.locator(".gx-launch-back").click();assert.match(await title(p),/Más inteligente/);
   for(let i=0;i<6;i++){
    await assertGeometry(p);
    assert.equal(await p.locator(".gx-launch-progress").getAttribute("aria-valuenow"),String(i+1));
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
   await p.locator(".gx-launch-close").click();await p.locator("#gx-release-overlay").waitFor({state:"hidden"});
   assert.equal(await p.evaluate(()=>localStorage.getItem("gx-release-seen:nov2026-mi-espacio-lanzamiento-v1:test-account-b")),null);
   await p.evaluate(()=>window.GOXION_RELEASE_202610.refresh());await notOpen(p);
   await p.close();
   // Nueva pestaña: X pospuso, no marcó visto. Logout libera overlay y no consume.
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
   assert.equal(obj.errors.length,0);await responsive.close();
   console.log(name+": PASS activación deshabilitada, sesión/cola, seis capítulos y retroceso, foco, X/reintento, visto por cuenta, logout, reduced-motion, 8 tamaños");
  }finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}
