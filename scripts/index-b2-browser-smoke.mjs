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
  assert.equal(await page.locator(".gx-b2-breakdown").count(),1,"Desglose oficial visible");checks++;
  assert.equal(await page.locator(".services-container + #b2-calendar + .gx-b2-breakdown").count(),1,
    "Desglose debe seguir al calendario");checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/Subtotal/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/Descuento de lealtad/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$49\.00/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$2\.94/);checks++;
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$46\.06/);checks++;
  assert.equal(await page.locator(".gx-b2-beta-banner,[data-b2-scenario],.gx-b2-scenario").count(),0,"No debug controls");checks++;
  assert.equal(await page.getByText("CAMBIAR ESCENARIO DE DEMOSTRACIÓN").count(),0);checks++;
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
  assert.equal(await page.locator(".gx-b2-ico,.gx-b2-mark").count(),0,"No mostrar barras ni puntos");checks++;
  assert.equal(await page.locator(".gx-b2-row.is-next").evaluate(el=>getComputedStyle(el,"::before").content),"none","Sin línea ::before");checks++;
  assert.equal(await page.locator(".gx-b2-next-tag").evaluate(el=>getComputedStyle(el).borderLeftWidth),"0px","Distintivo sin borde");checks++;
  assert.match(await page.locator(".gx-b2-next-tag").textContent(),/PRÓXIMO/);checks++;
  await page.locator('[data-b2-mode="todo"]').click();
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$92\.12/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$98\.00/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$5\.88/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown-context").textContent(),/Todos los servicios/);checks++;
  assert.equal(await page.locator('[data-b2-mode="abono"]').count(),0,"Abono no debe estar en la selección principal");checks++;
  assert.equal(await page.locator("[data-b2-alternatives]").count(),0);checks++;
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("prorroga"));
  assert.match(await page.locator(".total-amount").innerText(),/\$92\.12/);checks++;
  assert.match(await page.locator(".gx-b2-prorrogated").textContent(),/Acuerdo pactado/);checks++;
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("prorroga-incumplida"));
  assert.match(await page.locator(".total-amount").innerText(),/\$107\.80/);checks++;
  assert.equal(await page.locator(".gx-b2-row.is-late").count(),1);checks++;
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("vencido"));
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/Mora acumulada/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$2\.45/);checks++;
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$100\.45/);checks++;
  assert.match(await page.locator(".total-amount").innerText(),/\$100\.45/);checks++;
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("primero-pagado"));
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$49\.00/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$2\.94/);checks++;
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$46\.06/);checks++;
  assert.match(await page.locator(".total-amount").innerText(),/\$46\.06/);checks++;
  await page.locator("#b2-toggle").click();
  assert.equal(await page.locator("#b2-toggle").getAttribute("aria-expanded"),"false");checks++;
  await page.locator("#b2-toggle").click();
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("parcial"));
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/Pagos parciales aprobados/);checks++;
  assert.match(await page.locator(".gx-b2-breakdown").textContent(),/\$20\.00/);checks++;
  assert.match(await page.locator("#b2-selected-total").textContent(),/\$26\.06/);checks++;
  await page.evaluate(()=>window.GOXION_B2_PREVIEW.makeDemo("puntual"));
  await page.locator('[data-b2-mode="proximo"]').click();
  const pay=page.locator(".gx-payment-primary");
  await pay.click();
  assert.equal(await page.locator("#payment-modal").getAttribute("aria-hidden"),"false");checks++;
  assert.doesNotMatch(await page.locator(".gx-payment-upload-kicker").textContent(),/VISTA PREVIA|DEMO|PRUEBA/);checks++;
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