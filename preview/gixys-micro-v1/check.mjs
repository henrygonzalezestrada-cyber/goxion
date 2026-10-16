import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
const port=4198,base="http://127.0.0.1:"+port;
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{env:{...process.env,PORT:String(port)},stdio:"ignore"});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(base+"/preview/gixys-micro-v1/index.html")).ok)return}catch{}await wait(130)}throw Error("No inició el servidor local");}
async function testBrowser(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},hasTouch:true});
   const errors=[];const unsafe=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",req=>{if(/supabase|discord|wa\.me|groq/i.test(req.url()))unsafe.push(req.url());});
   await page.route("**/fonts.googleapis.com/**",r=>r.abort());
   await page.route("**/fonts.gstatic.com/**",r=>r.abort());
   await page.goto(base+"/preview/gixys-micro-v1/",{waitUntil:"domcontentloaded",timeout:20000});
   await page.waitForFunction(()=>!!window.GOXION_GIXY_LAB);
   assert.equal(await page.locator("canvas[data-gixy]").count(),6,`${name} ${width}: Gixys incompletos`);
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,alpha:[...document.querySelectorAll("canvas[data-gixy]")].map(c=>c.getContext("2d").getImageData(120,120,1,1).data[3])}));
   assert(metrics.scroll<=metrics.inner+1,`${name} ${width}: hay desplazamiento lateral (${metrics.scroll}/${metrics.inner})`);
   assert(metrics.alpha.every(a=>a>0),`${name} ${width}: Gixy sin dibujo`);
   await page.locator("#mission-btn").click();
   assert.equal(await page.locator("#mission-count").innerText(),"3 de 3");
   assert.equal(await page.locator("#mission-progress").getAttribute("aria-valuenow"),"3");
   assert.equal(await page.locator("#mission-reset").isVisible(),true);
   await page.locator("#mission-reset").click();
   assert.equal(await page.locator("#mission-progress").getAttribute("aria-valuenow"),"2");
   await page.locator("#loyalty-btn").click();
   assert.equal(await page.locator("#loyalty-count").innerText(),"4/4 pagos puntuales");
   await page.locator("#loyalty-reset").click();
   assert.equal(await page.locator("#loyalty-progress").getAttribute("aria-valuenow"),"3");
   await page.locator("#notification-btn").click();
   assert.equal(await page.locator("#notification-state").innerText(),"1 aviso sin leer");
   assert.equal(await page.locator("#notification-toast").isVisible(),true);
   await page.locator("#toast-dismiss").click();
   assert.equal(await page.locator("#notification-toast").isVisible(),false);
   await page.locator("#notification-btn").click();
   assert.equal(await page.locator("#notification-state").innerText(),"Aviso leído");
   await page.locator("#notification-reset").click();
   assert.equal(await page.locator("#notification-state").innerText(),"Todo al día");
   await page.locator("[data-state=working]").click();
   assert.equal(await page.locator("[data-state=working]").getAttribute("aria-pressed"),"true");
   await page.locator("[data-state=sleeping]").click();
   assert.equal(await page.locator("[data-state=sleeping]").getAttribute("aria-pressed"),"true");
   await page.locator(".roster canvas.gixy").first().focus();
   await page.keyboard.press("Enter");
   assert.deepEqual(errors,[],`${name} ${width}: errores JavaScript`);
   assert.deepEqual(unsafe,[],`${name} ${width}: petición privada inesperada`);
   await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
  await reduced.route("**/fonts.googleapis.com/**",r=>r.abort());
  await reduced.route("**/fonts.gstatic.com/**",r=>r.abort());
  await reduced.goto(base+"/preview/gixys-micro-v1/");
  assert.equal(await reduced.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),true);
  await reduced.locator("#mission-btn").click();
  assert.equal(await reduced.locator("#mission-count").innerText(),"3 de 3");
  await reduced.close();
  console.log(name+": Gixys Canvas + misiones/lealtad/avisos + reducido + 7 anchos OK");
 }finally{await browser.close();}
}
try{await ready();await testBrowser(chromium,"Chromium");await testBrowser(webkit,"WebKit");console.log("GOXION Beta Gixys/Micro v1: PASS");}
finally{server.kill("SIGTERM");}