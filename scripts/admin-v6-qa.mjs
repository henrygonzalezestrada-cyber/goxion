import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium, webkit } from "playwright";

const port=4980;
const url="http://127.0.0.1:"+port+"/preview/admin-v6-lab/index.html";
const widths=[280,320,360,375,390,430,600,700,701,900,1100,1440];
const out="artifacts/admin-v6";
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{env:{...process.env,PORT:String(port)},stdio:"ignore"});
const passed=[],failures=[];
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function available(){for(let i=0;i<90;i++){try{const r=await fetch(url);if(r.ok)return}catch{}await sleep(160)}throw Error("Preview server unavailable")}
async function settle(page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().map(x=>x.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})}
async function route(page,value){
  await page.waitForFunction((path)=>{
    if(location.hash!==path)return false;
    const p=path.replace("#/","").split("/");const v=document.getElementById("view-"+p[0]);
    if(!v||v.hidden)return false;
    if(p[0]==="clientes"){
      const d=document.getElementById("directory"),e=document.getElementById("dossier");
      if(!!p[1]&&(d.hidden!==true||e.hidden!==false))return false;
      if(!p[1]&&(d.hidden!==false||e.hidden!==true))return false;
      if(p[2]&&!document.querySelector('[data-tab="'+p[2]+'"].selected'))return false;
    }
    return true;
  },value);
  await settle(page);
}
async function geometry(page,name){
  const data=await page.evaluate(()=>{
    const vis=(x)=>x.getClientRects().length>0&&getComputedStyle(x).visibility!=="hidden";
    const box=(x)=>{const r=x.getBoundingClientRect();return [r.left,r.right,r.height]};
    const nav=[...document.querySelectorAll(".rail-link,.dock-link")].filter(vis);
    return {vw:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      nav:nav.map(box),selected:nav.filter(x=>x.classList.contains("active")).map(x=>x.dataset.nav),
      section:document.querySelector(".view:not([hidden])")?.id,glass:box(document.querySelector(".glassbar")),
      cardBoxes:[...document.querySelectorAll(".view:not([hidden]) .client-card")].map(box),
      inputSize:parseFloat(getComputedStyle(document.getElementById("search")).fontSize),
      dateStepHeight:document.querySelector(".date-step").getBoundingClientRect().height,
      statusColors:[...document.querySelectorAll(".client-card")].map(x=>getComputedStyle(x).getPropertyValue("--state-strong").trim())};
  });
  assert(data.scroll<=data.vw+1,name+": horizontal viewport overflow "+data.scroll);
  assert(data.body<=data.vw+1,name+": body overflow "+data.body);
  assert.equal(data.nav.length,3,name+": nav");
  assert.deepEqual(data.selected,[data.section.replace("view-","")],name+": selected nav");
  for(const n of data.nav)assert(n[0]>=-1&&n[1]<=data.vw+1&&n[2]>=44,name+": nav geometry "+n);
  assert(data.glass[0]>=-1&&data.glass[1]<=data.vw+1&&data.glass[2]>=50,name+": glass capsule");
  for(const b of data.cardBoxes)assert(b[0]>=-1&&b[1]<=data.vw+1,name+": card clipped");
  assert(data.inputSize>=16,name+": Safari search zoom risk");
  assert(data.dateStepHeight>=44,name+": date tab touch target");
  if(data.statusColors.length>1)assert(new Set(data.statusColors).size>=3,name+": semantic colors");
}
async function test(browserType,label){
  const browser=await browserType.launch({headless:true});
  try{
    for(const width of widths){
      const mark=label+" / "+width;
      const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:"reduce"});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      const photo=label==="Chromium"&&[320,390,1440].includes(width);
      try{
        const r=await page.goto(url,{waitUntil:"domcontentloaded"});
        assert(r?.ok(),mark+" HTML load");
        await page.locator(".home-date").first().waitFor();
        assert.equal(await page.locator(".home-date").count(),4,mark+" access dates");
        await geometry(page,mark+" home");
        if(photo)await page.screenshot({path:out+"/home-"+width+".png",fullPage:true});
        await page.locator('a[data-nav="clientes"]:visible').first().click();
        await route(page,"#/clientes");
        assert.equal(await page.locator(".client-card").count(),4,mark+" clients");
        assert.equal(await page.locator(".client-card .person-name").count(),4,mark+" names");
        assert.equal(await page.locator(".client-card .money-stack").count(),4,mark+" totals");
        await geometry(page,mark+" clients");
        if(photo)await page.screenshot({path:out+"/clients-"+width+".png",fullPage:true});
        await page.locator('[data-day="2"]').click();
        await page.waitForFunction(()=>document.querySelector('.client-card[data-id="GX-1042"]')?.dataset.state==="late");
        assert.equal(await page.locator('.client-card[data-id="GX-1042"] .client-state span').innerText(),"Vencido",mark+" overdue status");
        assert.equal(await page.locator('.client-card[data-id="GX-1042"] .date-name').innerText(),"VENCIÓ EL",mark+" accurate date label");
        await geometry(page,mark+" overdue");
        if(photo)await page.screenshot({path:out+"/overdue-"+width+".png",fullPage:true});
        await page.locator("#search").fill("Sofia");
        assert.equal(await page.locator(".client-card").count(),1,mark+" accentless search");
        await page.locator("#search").fill("");
        await page.locator('[data-filter="atencion"]').click();
        assert.equal(await page.locator(".client-card").count(),3,mark+" attention filter");
        await page.locator('[data-filter="todos"]').click();
        await page.locator('.client-card[data-id="GX-1042"]').click();
        await route(page,"#/clientes/GX-1042/resumen");
        assert(await page.locator("#dossier").isVisible(),mark+" dossier");
        await geometry(page,mark+" detail");
        await page.locator('[data-tab="servicios"]').click();
        await route(page,"#/clientes/GX-1042/servicios");
        assert.equal(await page.locator(".service-contract").count(),2,mark+" commercial services not duplicated");
        assert.equal(await page.locator(".contract-entry").count(),3,mark+" X2+Netflix access count");
        assert.deepEqual(await page.locator('.service-contract').first().locator("time").allTextContents(),["15 NOV","23 NOV"],mark+" X2 independent dates");
        await geometry(page,mark+" services");
        if(photo)await page.screenshot({path:out+"/services-"+width+".png",fullPage:true});
        await page.locator(".back").click();await route(page,"#/clientes");
        await page.locator('a[data-nav="operaciones"]:visible').first().click();await route(page,"#/operaciones");
        assert.equal(await page.locator(".ops-item").count(),3,mark+" pending ops");
        assert.equal(await page.locator(".ops-item em,.ops-item .service-chip").count(),0,mark+" redundant tags");
        await page.locator('[data-op-filter="solicitudes"]').click();
        assert.equal(await page.locator(".ops-item").count(),2,mark+" requests");
        await page.locator('[data-op-filter="actividad"]').click();
        assert.equal(await page.locator(".ops-item").count(),1,mark+" activity");
        await geometry(page,mark+" operations");
        if(photo)await page.screenshot({path:out+"/operations-"+width+".png",fullPage:true});
        assert.deepEqual(errors,[],mark+" script exceptions");
        passed.push(mark);
      }catch(e){failures.push(mark+": "+(e.stack||e));}
      finally{await page.close();}
    }
  }finally{await browser.close();}
}
try{await available();await test(chromium,"Chromium");await test(webkit,"WebKit");}
finally{server.kill("SIGTERM");}
console.log("GOXION MOTION LAB 06: "+passed.length+" / 24 viewport scenarios passed");
if(failures.length){console.error(failures.join("\n\n"));process.exitCode=1}
else console.log("GOXION V6 DESIGN QA PASS");
