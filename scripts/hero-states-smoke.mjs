import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const [name,engine] of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://hero.test/**',r=>{const path=new URL(r.request().url()).pathname.slice(1);if(path==='')return r.fulfill({contentType:'text/html',body:readFileSync('preview/mi-espacio-v2/hero-states-lab.html','utf8')});if(path.endsWith('.js')||path.endsWith('.css'))return r.fulfill({contentType:path.endsWith('.js')?'text/javascript':'text/css',body:readFileSync(path,'utf8')});return r.abort()});
 await p.goto('https://hero.test/');const card=p.locator('#focus'),panel=p.locator('.gx-state-panel');
 assert.equal(await panel.isVisible(),true);const h=await card.evaluate(e=>e.getBoundingClientRect().height);
 await p.waitForFunction(()=>document.querySelector('.gx-state-panel').hidden,{},{timeout:10000});
 assert.equal(await p.locator('.gx-state-bubble').count(),2);assert.equal(await card.evaluate(e=>e.getBoundingClientRect().height),h);
 await p.locator('[data-state-id="global"]').click();assert.equal(await panel.isVisible(),true);
 await p.waitForTimeout(5200);assert.equal(await panel.isVisible(),true);
 await panel.getByRole('button',{name:'Volver a mi estado'}).click();
 await p.locator('#lab-more').click();assert.equal(await p.locator('.gx-state-bubble').count(),3);
 await p.locator('.gx-state-more').click();assert.equal(await p.locator('.gx-state-overflow-item').count(),3);
 await panel.getByRole('button',{name:'Volver a mi estado'}).click();
 await p.locator('#lab-resolve').click();await panel.waitFor({state:'visible',timeout:5000});assert.equal(await panel.isVisible(),true);assert.ok((await panel.innerText()).includes('Incidencia finalizada'));
 await panel.getByRole('button',{name:'Entendido'}).click();assert.equal(await p.locator('[data-state-id="global"]').count(),0);
 assert.equal(await card.evaluate(e=>e.getBoundingClientRect().height),h);
 // A missing response or a closed alert for another platform is not resolution.
 const result=await p.evaluate(()=>{
  const v2={cliente:{id:'synthetic'},alertas:{id:'a2',activa:true,plataforma:'Todos los servicios',falla:'intermitencia'},servicios:[]};
  ctl.reset();ctl.update(v2,'review');
  ctl.update({...v2,alertas:null},'review');
  const missing=document.querySelector('.gx-state-panel').hidden;
  ctl.update(v2,'review');ctl.update({...v2,alertas:{...v2.alertas,activa:false,plataforma:'Netflix'}},'review');
  const different=document.querySelector('.gx-state-panel').hidden;
  ctl.reset();ctl.update(v2,'review');ctl.update({...v2,alertas:{...v2.alertas,activa:false}},'review');
  const panel=document.querySelector('.gx-state-panel');
  const resolved=!panel.hidden&&panel.querySelector('.focus-title').textContent==='Incidencia finalizada';
  panel.querySelector('.focus-action:last-child').click();
  ctl.update({...v2,alertas:{...v2.alertas,activa:false}},'review');
  const repeat=panel.hidden;
  return {missing,different,resolved,repeat};
 });
 assert.deepEqual(result,{missing:true,different:true,resolved:true,repeat:true});
 await p.locator('#lab-reset').click();assert.equal(await p.locator('.gx-state-bubble').count(),0);
 assert.deepEqual(errors,[]);
 console.log(name+' · hero temporal, dos burbujas, overflow y cierre OK');
 }finally{await b.close()}
}