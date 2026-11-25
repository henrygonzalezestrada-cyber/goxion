import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/opiniones/ayuda.js','utf8'),css=readFileSync('assets/css/opiniones.css','utf8')+'\n'+readFileSync('preview/mi-espacio-v2/support-refinement.css','utf8');
for(const [name,engine] of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 try{
 const page=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.route('**/*',r=>r.abort());
 await page.setContent('<html data-gx-support-v3><body><div id="view-inicio"></div><div id="view-soporte"><div class="glass-card gx-support-access gx-support-opinion"><div><h3>Tu opinión <span>cuenta</span></h3><p>Cuéntanos cómo ha sido tu experiencia.</p></div><span class="gx-support-art">⭐</span><button class="gx-support-cta" onclick="openFeedbackModal()">Dejar una opinión</button></div></div><div id="modal-feedback" style="display:none"></div></body></html>');
 await page.addStyleTag({content:css});
 await page.evaluate(()=>{window.calls=[];window.missions=0;window.reject=true;window.emoji=document.querySelector('.gx-support-art');window.card=document.querySelector('.gx-support-opinion');
 window.GOXION_REVIEWS={starSvg:'<svg viewBox="0 0 24 24"><path d="M12 1 15 9 23 9 17 15 19 23 12 18 5 23 7 15 1 9 9 9Z"/></svg>',load:()=>[],subscribe(){},refreshPublished:async()=>{},add:async p=>{window.calls.push(p);await new Promise(r=>setTimeout(r,120));if(window.reject)throw Error('Error simulado');return {consent:p.consent};}};
 window.completarMisionInteligente=async()=>{window.missions++;throw Error('Misión simulada no disponible');};});
 await page.addScriptTag({content:js});
 const card=page.locator('.gx-support-opinion'),open=card.locator('.gx-support-cta');
 const original=await card.evaluate(e=>e.getBoundingClientRect().height);
 await open.click();
 assert.equal(await page.evaluate(()=>window.card===document.querySelector('.gx-support-opinion')&&window.emoji===document.querySelector('.gx-support-art')),true);
 assert.equal(await page.locator('#modal-feedback #gx-rb-form').count(),0);
 assert.equal(await card.locator('#gx-rb-form').isVisible(),true);
 assert.ok(await card.evaluate(e=>e.getBoundingClientRect().height)>original);
 await card.locator('[data-score="1"]').click();assert.equal(await card.locator('.is-lit').count(),1);
 await card.locator('#gx-rb-text').fill('Prueba de experiencia de aceptación.');
 await card.locator('#gx-rb-submit').click();
 await page.waitForFunction(()=>document.querySelector('#gx-rb-error').textContent==='Error simulado');
 assert.equal(await card.locator('#gx-rb-text').inputValue(),'Prueba de experiencia de aceptación.');
 assert.equal(await page.evaluate(()=>window.missions),0);
 await page.evaluate(()=>window.reject=false);
 await card.locator('#gx-rb-submit').click();
 await page.waitForFunction(()=>document.querySelector('.gx-rb-inline').classList.contains('gx-rb-complete'));
 assert.equal(await page.evaluate(()=>window.missions),1);
 assert.equal(await card.locator('#gx-rb-submit').innerText(),'Listo');
 assert.equal(await card.locator('.gx-rb-emblem.gx-rb-morph-done').count(),1);
 await card.locator('#gx-rb-submit').click();
 assert.equal(await card.locator('#gx-rb-form').isVisible(),false);
 assert.equal(await card.locator('.gx-support-cta').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.calls.length),2);
 await open.click();assert.equal(await card.locator('#gx-rb-text').inputValue(),'');
 await card.locator('#gx-rb-close').click();
 assert.equal(await card.locator('#gx-rb-form').isVisible(),false);
 console.log(name+' Opiniones inline · identidad de tarjeta, error, confirmación y reapertura OK');
 }finally{await b.close();}
}
