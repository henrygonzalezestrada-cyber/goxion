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
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(over<=1,"Overflow "+engine.name()+" "+width+": "+over);checks++;
  await page.locator("#b2-toggle").click();
  assert.equal(await page.locator("#b2-toggle").getAttribute("aria-expanded"),"true");checks++;
  await page.locator('[data-b2-mode="todo"]').click();
  assert.match(await page.locator("#b2-selected-total").innerText(),/\$92\.12/);checks++;
  await page.locator('[data-b2-mode="abono"]').click();
  await page.locator("#b2-partial").fill("20.00");
  assert.match(await page.locator("#b2-selected-total").innerText(),/\$20\.00/);checks++;
  await page.locator('[data-b2-scenario="vencido"]').click();
  assert.match(await page.locator(".total-amount").innerText(),/\$100\.45/);checks++;
  assert.equal(await page.locator(".gx-b2-row.is-late").count(),1);checks++;
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