import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const uri=new URL("../preview/index-b2/index.html?cliente=b2-demo&demo=1",import.meta.url).href;
const widths=[320,390,768];
let checks=0;
for (const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1});
  const pageErrors=[];
  page.on("pageerror",e=>pageErrors.push(String(e)));
  // Beta demo nunca depende de servicios externos.
  await page.route("https://**/*",route=>route.fulfill({status:200,body:"",contentType:"text/plain"}));
  await page.goto(uri,{waitUntil:"domcontentloaded"});
  await page.locator("#b2-calendar").waitFor({timeout:12000});
  await page.waitForTimeout(120);
  assert.match(await page.locator(".total-amount").innerText(),/\$92\.12/);checks++;
  assert.equal(await page.locator(".services-container .gx-b2-service-flag").count(),1);checks++;
  assert.match(await page.locator(".services-container .gx-b2-service-flag").textContent(),/PRÓXIMO/);checks++;
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(over<=1,"Overflow "+engine.name()+" "+width+": "+over);checks++;
  assert.equal(await page.evaluate(()=>
    document.querySelector(".services-container")?.nextElementSibling?.id==="b2-calendar"
  ),true,"Calendario debe aparecer DESPUÉS de servicios");checks++;
  await page.locator("#b2-toggle").click();
  assert.equal(await page.locator("#b2-toggle").getAttribute("aria-expanded"),"true");checks++;
  assert.equal(await page.locator(".gx-b2-row.is-next").count(),1);checks++;
  assert.match(await page.locator(".gx-b2-next-tag").textContent(),/PRÓXIMO/);checks++;
  await page.locator('[data-b2-mode="todo"]').click();
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$92\.12/);checks++;
  assert.equal(await page.locator('[data-b2-mode="abono"]').count(),0,"Abono no debe estar en la selección principal");checks++;
  assert.equal(await page.locator("#b2-help").isVisible(),false);checks++;
  await page.locator("[data-b2-alternatives]").click();
  await page.locator("#b2-partial").fill("20.00");
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$20\.00/);checks++;
  assert.match(await page.locator("[data-b2-mora]").textContent(),/\$0\.00/);checks++;
  assert.match(await page.locator("[data-b2-restante]").textContent(),/\$26\.06/);checks++;
  assert.match(await page.locator("[data-b2-beneficio]").innerText(),/\$2\.94/);checks++;
  assert.match(await page.locator("[data-b2-diaria]").textContent(),/\$1\.45/);checks++;
  assert.equal(await page.locator(".gx-b2-help-link").getAttribute("href"),"./ayuda.html");checks++;
  await page.locator('[data-b2-scenario="vencido"]').click();
  assert.match(await page.locator(".total-amount").innerText(),/\$100\.45/);checks++;
  assert.equal(await page.locator(".gx-b2-row.is-late").count(),1);checks++;
  assert.match(await page.locator(".services-container .gx-b2-service-flag").textContent(),/VENCIDO/);checks++;
  assert.match(await page.locator(".gx-b2-next-tag").textContent(),/VENCIDO/);checks++;
  await page.locator("[data-b2-alternatives]").click();
  assert.match(await page.locator("[data-b2-mora]").textContent(),/\$2\.45/);checks++;
  assert.match(await page.locator("[data-b2-beneficio]").innerText(),/\$0\.00/);checks++;
  assert.match(await page.locator("[data-b2-restante]").textContent(),/\$31\.45/);checks++;
  assert.match(await page.locator("[data-b2-diaria]").textContent(),/\$1\.45/);checks++;
  await page.locator('[data-b2-scenario="primero-pagado"]').click();
  assert.match(await page.locator(".total-amount").innerText(),/\$46\.06/);checks++;
  await page.locator("#b2-toggle").click();
  assert.equal(await page.locator("#b2-toggle").getAttribute("aria-expanded"),"false");checks++;
  await page.locator("#b2-toggle").click();
  await page.locator('[data-b2-scenario="puntual"]').click();
  await page.locator('[data-b2-mode="proximo"]').click();
  const pay=page.locator(".gx-payment-primary");
  await pay.click();
  assert.equal(await page.locator("#payment-modal").getAttribute("aria-hidden"),"false");checks++;
  assert.match(await page.locator(".gx-payment-upload-kicker").textContent(),/VISTA PREVIA/);checks++;
  assert.equal(await page.evaluate(()=>window.GOXION_B2_PREVIEW.report?.monto_centavos),4606);checks++;
  // El formulario de demostración se cierra sin enviar archivos ni solicitudes.
  await page.locator(".close-modal").click();
  assert.equal(await page.locator("#payment-modal").getAttribute("aria-hidden"),"true");checks++;
  assert.deepEqual(pageErrors,[],"Page errors on "+engine.name()+"/"+width);
  await page.close();
 }
 }finally{await browser.close();}
}
console.log("GOXION Index B2 visual · "+checks+" controles Chromium/WebKit PASS");