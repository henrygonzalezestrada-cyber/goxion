import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const port=4985,url="http://127.0.0.1:"+port+"/preview/admin-v73/index.html";
const widths=[280,320,360,375,390,430,600,760,761,900,1100,1440];
const pass=[],errors=[];
mkdirSync("artifacts/admin-v71",{recursive:true});
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{stdio:"ignore",env:{...process.env,PORT:String(port)}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return}catch{}await sleep(120)}throw Error("Preview HTTP unavailable")}
async function settle(page){await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2200))]);if(window.__goxionV71TransitionFinished)await window.__goxionV71TransitionFinished.catch(()=>{});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})}
async function route(page,hash){
 await page.waitForFunction(expected=>{
   if(location.hash!==expected)return false;
   const p=expected.replace("#/","").split("/"),view=document.getElementById("view-"+p[0]);
   if(!view||view.hidden)return false;
   if(p[0]==="clientes"){const directory=document.getElementById("client-directory"),detail=document.getElementById("client-detail");if(!!p[1]!==!!directory.hidden)return false;if(!!p[1]!==!detail.hidden)return false;if(p[2]&&!document.querySelector('.detail-tab.is-active[href*="'+p[2]+'"]'))return false}
   if(p[0]==="operaciones"&&p[2]&&!document.getElementById("ops-detail").classList.contains("has-detail"))return false;
   return true;
 },hash);
 await settle(page);
}
async function geometry(page,tag){
 const d=await page.evaluate(()=>{
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=="hidden";
  const boxes=[...document.querySelectorAll(".client-card,.metric,.headbrand,.head-actions,.ops-item,.detail-stat")].filter(visible).map(el=>{const r=el.getBoundingClientRect();return {name:el.className,l:r.left,r:r.right,h:r.height}});
  const nav=[...document.querySelectorAll("[data-nav]")].filter(visible);
  return {width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,nav:nav.length,navActive:nav.filter(x=>x.classList.contains("is-current")).map(x=>x.dataset.nav),
    view:document.querySelector(".view:not([hidden])")?.id,boxes,searchSize:parseFloat(getComputedStyle(document.getElementById("search")).fontSize),
    brandRect:document.querySelector(".headbrand").getBoundingClientRect().toJSON(),
   brandBg:getComputedStyle(document.querySelector(".headbrand")).backgroundColor,
   brandBorder:getComputedStyle(document.querySelector(".headbrand")).borderTopWidth,
   activeNavIndex:getComputedStyle(document.querySelector(innerWidth<=760?".dock":".rail-links")).getPropertyValue("--active-nav").trim(),
   bellBg:getComputedStyle(document.querySelector(".icon-button")).backgroundColor};
 });
 assert(d.scroll<=d.width+1,tag+" scroll overflow "+d.scroll+"/"+d.width);
 assert(d.body<=d.width+1,tag+" body overflow "+d.body+"/"+d.width);
 assert.equal(d.nav,4,tag+" nav count");
 assert.deepEqual(d.navActive,[d.view.replace("view-","")],tag+" nav active");
 assert(d.searchSize>=16,tag+" Safari search input");
 assert(d.brandRect.right<=d.width+1,tag+" brand outside");
 assert.equal(d.brandBg,"rgba(0, 0, 0, 0)",tag+" logo should be unboxed");
 assert.equal(d.brandBorder,"0px",tag+" logo has redundant border");
 assert.equal(d.activeNavIndex,String(["inicio","clientes","operaciones","gestion"].indexOf(d.view.replace("view-",""))),tag+" sliding navigation index");
 assert.equal(d.bellBg,"rgba(0, 0, 0, 0)",tag+" bell has redundant decorative container");
 for(const b of d.boxes)assert(b.l>=-1&&b.r<=d.width+1,tag+" surface out of bounds "+JSON.stringify(b));
}
async function run(browserType,name){
 const browser=await browserType.launch({headless:true});
 try{
  for(const width of widths){
   const tag=name+" "+width;const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:width===390?"no-preference":"reduce"});
   const jsErrors=[];page.on("pageerror",e=>jsErrors.push(e.message));const shot=name==="Chromium"&&[320,390,1440].includes(width);
   try{
    const response=await page.goto(url,{waitUntil:"domcontentloaded"});
    assert(response?.ok(),tag+" HTML unavailable");await page.locator(".metric").first().waitFor();await settle(page);
    assert.equal(await page.locator(".metric").count(),4,tag+" operational KPIs");
    const rootStyle=await page.evaluate(()=>({background:getComputedStyle(document.documentElement).backgroundColor,colorScheme:getComputedStyle(document.documentElement).colorScheme}));
    assert.equal(rootStyle.background,"rgb(8, 10, 18)",tag+" GOXION dark base");
    assert.equal(rootStyle.colorScheme,"dark",tag+" system controls dark");
    assert.equal(await page.locator("#metric-cancellations").innerText(),"02",tag+" cancellation count from fixtures");
    assert.equal(await page.locator("#metric-registrations").innerText(),"05",tag+" registrations count from fixtures");
    assert.equal(await page.locator("#metric-income").innerText(),"$12,480",tag+" derived income");
    assert.equal(await page.locator("#metric-expense").innerText(),"$3,150",tag+" derived expenses");
    assert.equal(await page.locator("#priority-count").innerText(),"4",tag+" priority count before action");
    assert.equal(await page.locator("#home-priorities .home-row").count(),4,tag+" actionable list");
    await geometry(page,tag+" home");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/home-"+width+".png",fullPage:true});
    await page.locator(".metric-coral").click();await route(page,"#/operaciones/cancelaciones");
    const layoutCheck=await page.evaluate(()=>{
      const main=getComputedStyle(document.getElementById("main"));
      const rail=document.getElementById("ops-filters");
      const positions=[...rail.querySelectorAll(".op-filter")].map(x=>Math.round(x.getBoundingClientRect().top));
      return {outline:main.outlineStyle,display:getComputedStyle(rail).display,positions,border:getComputedStyle(document.querySelector(".ops-item")).borderBottomWidth};
    });
    assert.equal(layoutCheck.outline,"none",tag+" no blue focus frame");
    assert.equal(layoutCheck.display,"flex",tag+" one horizontal filter row");
    assert(Math.max(...layoutCheck.positions)-Math.min(...layoutCheck.positions)<=2,tag+" filters not wrapping");
    assert.equal(layoutCheck.border,"0px",tag+" no excessive dividers");
    const opCount=await page.locator(".ops-item").count();
    if(opCount!==2)console.error("DIAGNOSTICO V72",tag,JSON.stringify(jsErrors),"filters:",await page.locator("#ops-filters").innerText(),"list:",(await page.locator("#ops-list").innerText()).slice(0,300),"head:",await page.locator("#ops-head-count").innerText());
    assert.equal(opCount,2,tag+" cancellation filter");
    assert.equal(await page.locator(".operation-layout").evaluate(el=>el.classList.contains("with-detail")),false,tag+" no empty detail pane");
    if(width>760)assert.equal(await page.locator(".ops-detail").isVisible(),false,tag+" hide empty desktop pane");
    await geometry(page,tag+" cancellations");
    await page.locator(".ops-item").first().click();await route(page,"#/operaciones/cancelaciones/op-c1");
    assert(await page.locator("#ops-detail").isVisible(),tag+" operation detail");
    assert.equal(await page.locator(".operation-layout").evaluate(el=>el.classList.contains("with-detail")),true,tag+" layout switches to detail");
    assert((await page.locator("#ops-detail").innerText()).includes("hacer efectiva"),tag+" effective cancellation distinction");
    const followup=page.locator("#ops-detail [data-followup='op-c1']");
    assert.equal(await followup.count(),1,tag+" one-tap operational follow-up");
    assert((await page.locator(".followup-work").innerText()).includes("no ejecuta cobros ni cancelaciones"),tag+" demo action disclaimer");
    await followup.click();
    assert.equal(await page.locator("#priority-count").innerText(),"3",tag+" reactive Home priorities");
    assert.equal(await page.locator("#ops-head-count").innerText(),"3 por resolver",tag+" reactive Operations counter");
    assert.equal(await page.locator("#ops-detail [data-followup='op-c1']").getAttribute("aria-pressed"),"true",tag+" reversible follow-up action");
    assert.equal(await page.locator("#notification-count").innerText(),"2",tag+" notification update");
    await page.locator("#ops-detail [data-followup='op-c1']").click();
    assert.equal(await page.locator("#priority-count").innerText(),"4",tag+" undo restores priorities");
    assert.equal(await page.locator("#ops-head-count").innerText(),"4 por resolver",tag+" undo restores operations");
    assert.equal(await page.locator("#notification-count").innerText(),"3",tag+" undo restores auto-read notice");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/operation-detail-"+width+".png",fullPage:true});
    await page.locator("#ops-detail a[aria-label='Cerrar detalle']").click();await route(page,"#/operaciones/cancelaciones");
    await page.locator("a.op-filter[href*='ingresos']").click();await route(page,"#/operaciones/ingresos");
    const activeTabVisible=await page.evaluate(()=>{
      const rail=document.getElementById("ops-filters").getBoundingClientRect();
      const tab=document.querySelector("#ops-filters .op-filter.is-active").getBoundingClientRect();
      return tab.left>=rail.left-1&&tab.right<=rail.right+1;
    });
    assert(activeTabVisible,tag+" selected filter stays visible");
    assert.equal(await page.locator(".ops-item").count(),3,tag+" incomes");
    await page.locator("a.op-filter[href*='egresos']").click();await route(page,"#/operaciones/egresos");
    assert.equal(await page.locator(".ops-item").count(),2,tag+" expenses");
    await page.locator("a.op-filter[href*='pendientes']").click();await route(page,"#/operaciones/pendientes");
    assert.equal(await page.locator(".ops-item").count(),4,tag+" unresolved");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/operations-"+width+".png",fullPage:true});
    await page.locator("a[data-nav='clientes']:visible").first().click();await route(page,"#/clientes");
    assert.equal(await page.locator(".client-card").count(),4,tag+" customers");
    assert.equal(await page.locator(".client-card .client-money").count(),4,tag+" important amount visible");
    assert.equal(await page.locator(".client-card .client-date").count(),4,tag+" important date visible");
    await geometry(page,tag+" clients");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/clients-"+width+".png",fullPage:true});
    await page.locator("#search").fill("Sofia");
    assert.equal(await page.locator(".client-card").count(),1,tag+" accentless search");
    await page.locator("#search").fill("");
    const oldCard=page.locator('.client-card[data-id="GX-1042"]');
    const originalNode=await oldCard.elementHandle();
    await page.locator("#date-step").click();await page.locator("#date-step").click();
    assert(await originalNode.evaluate(node=>node.isConnected),tag+" dynamic date must not rebuild cards");
    assert.equal(await page.locator('.client-card[data-id="GX-1042"]').getAttribute("data-state"),"late",tag+" overdue state");
    assert((await page.locator('.client-card[data-id="GX-1042"] .client-date-label').innerText()).includes("VENCIÓ"),tag+" date label");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/overdue-"+width+".png",fullPage:true});
    await page.locator("a[data-nav='inicio']:visible").first().click();await route(page,"#/inicio");
    assert.equal(await page.locator(".upcoming").count(),2,tag+" upcoming dates update with sample time");
    await page.locator("a[data-nav='clientes']:visible").first().click();await route(page,"#/clientes");
    await page.locator("[data-filter='atencion']").click();
    assert.equal(await page.locator(".client-card").count(),3,tag+" attention filter");
    await page.locator("[data-filter='todos']").click();
    await page.locator('.client-card[data-id="GX-1042"]').click();await route(page,"#/clientes/GX-1042/resumen");
    assert.equal(await page.locator("#detail-identity").evaluate(node=>node.style.viewTransitionName),"active-client",tag+" selected client detail morph");
    await page.locator('a.detail-tab[href*="servicios"]').click();await route(page,"#/clientes/GX-1042/servicios");
    assert.equal(await page.locator(".contract").count(),2,tag+" commercial services");
    assert.equal(await page.locator(".contract").first().locator(".access").count(),2,tag+" X2 access count");
    assert.deepEqual(await page.locator(".contract").first().locator("time").allTextContents(),["15 NOV","23 NOV"],tag+" X2 independent access dates");
    await geometry(page,tag+" dossier");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/services-"+width+".png",fullPage:true});
    await page.locator("a[data-nav='inicio']:visible").first().click();await route(page,"#/inicio");
    await page.locator("#notifications-button").click();
    assert.equal(await page.locator(".notice-row").count(),3,tag+" notifications visible");
    await page.locator("#mark-read").click();
    assert(await page.locator("#notification-count").isHidden(),tag+" notification read state");
    await page.locator("#notify-close").click();
    await page.locator("a[data-nav='gestion']:visible").first().click();await route(page,"#/gestion");
    assert.equal(await page.locator(".manage-item").count(),4,tag+" management");
    await geometry(page,tag+" management");
    if(shot)await page.screenshot({path:"artifacts/admin-v73/management-"+width+".png",fullPage:true});
    assert.deepEqual(jsErrors,[],tag+" console");
    pass.push(tag);
   }catch(e){errors.push(tag+": "+(e.stack||e))}
   finally{await page.close()}
  }
 }finally{await browser.close()}
}
try{await ready();await run(chromium,"Chromium");await run(webkit,"WebKit")}
finally{server.kill("SIGTERM")}
console.log("GOXION ADMIN V7.3 "+pass.length+"/24 viewport scenarios passed");
if(errors.length){console.error("FAILURES:\n"+errors.join("\n\n"));process.exitCode=1}
else console.log("GOXION V7.3 BRAND PALETTE QA PASS");
