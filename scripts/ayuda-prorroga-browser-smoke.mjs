import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const link=new URL("../preview/ayuda-prorroga/index.html?demo=1",import.meta.url).href;
let count=0;
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1});
   let errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("https://**/*",route=>route.fulfill({status:200,body:"",contentType:"text/plain"}));
   await page.goto(link,{waitUntil:"domcontentloaded"});
   const button=page.locator(".gx-prorroga-entry");
   await button.waitFor({timeout:10000});
   assert.equal(await button.innerText(),"¿No puedes realizar tu pago hoy?");count++;
   assert.equal(await page.evaluate(()=>document.querySelector(".gx-account-capsule").nextElementSibling.classList.contains("gx-prorroga-entry")),true);count++;
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);count++;
   await button.click();
   const dialog=page.locator("#gx-prorroga-dialog");
   await dialog.waitFor();
   assert.equal(await dialog.getAttribute("open"),"");count++;
   assert.equal(await page.locator("[data-gx-day]").inputValue(),"2026-10-18");count++;
   assert.match(await page.locator("[data-gx-protected]").textContent(),/\$46\.06/);count++;
   assert.match(await page.locator("[data-gx-missed]").textContent(),/\$58\.80/);count++;
   assert.match(await page.locator("[data-gx-mora]").textContent(),/\$9\.80/);count++;
   assert.equal(await page.locator("[data-gx-activate]").isDisabled(),true);count++;
   await page.locator("[data-gx-day]").fill("2026-10-20");
   assert.match(await page.locator("[data-gx-missed]").textContent(),/\$63\.70/);count++;
   await page.locator("[data-gx-accept]").check();
   assert.equal(await page.locator("[data-gx-activate]").isEnabled(),true);count++;
   await page.locator("[data-gx-activate]").click();
   await dialog.waitFor({state:"detached",timeout:4000});
   assert.equal(await page.locator(".gx-prorroga-entry").count(),0);count++;
   assert.equal(await page.locator(".gx-prorroga-active").count(),0,"No duplicar la fecha en otro bloque");count++;
   assert.match(await page.locator("#dash-date").textContent(),/20 de octubre/);count++;
   assert.equal(await page.locator("#dash-date-label").textContent(),"Nueva fecha de pago");count++;
   assert.equal(await page.locator("#dash-badge").textContent(),"Acuerdo pactado");count++;
   assert.equal(await page.locator(".gx-account-capsule").count(),1);count++;
   assert.equal(await page.locator("#dash-billing-card .gx-prorroga-entry").count(),0);count++;
   assert.equal(await page.locator("#dash-billing-card .gx-prorroga-active").count(),0);count++;
   assert.equal(await page.locator("#dash-billing-card").getByText("Nivel de lealtad").count(),0);count++;
   assert.deepEqual(errors,[],"Errores "+engine.name()+" "+width);count++;
   await page.close();
  }
 }finally{await browser.close();}
}
console.log("GOXION Mi Espacio · Prórroga automática "+count+" PASS Chromium/WebKit");