/* E1/B2 · two genuine visual dialects (Ayuda → Index), all synthetic.
 * QA: financial invariants, navigation, selected obligations, proof states,
 * safety, responsiveness and no backend in Chromium and WebKit.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const folder='preview/experiencia-financiera-espejo/';
const ayuda=fs.readFileSync(folder+'index.html','utf8');
const index=fs.readFileSync(folder+'estado.html','utf8');
assert(ayuda.includes('data-gx-smart-beta="true" data-gx-b2-preview="true"'));
assert(ayuda.includes('../experiencia-mi-espacio-inteligente/smart.css?v=e1b1v6'));
assert(ayuda.includes('src="./ayuda-b2.js?v=e1b2v1"'));
assert(index.includes('../../assets/css/index.css'));
assert(index.includes('class="sticky-area"')&&index.includes('class="balance-hero"'));
assert(index.includes('class="glass-card services-container"'));
assert(!/supabase|clientes\.json|discord|X-Client-Token/i.test(index));
const port=4267,base='http://127.0.0.1:'+port+'/'+folder;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
 env:{...process.env,PORT:String(port)},stdio:'ignore'});
const nap=t=>new Promise(resolve=>setTimeout(resolve,t));
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'estado.html')).ok)return}catch{}await nap(125)}throw Error('HTTP fixture failed')}
const forbidden=/(?:supabase|clientes\.json|discord|comprobantes-b2-beta|estado-financiero-b2-beta|\/functions\/v1\/)/i;
async function run(name,engine){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const errors=[],leaks=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(forbidden.test(r.url()))leaks.push(r.url())});
   await page.route('**/fonts.googleapis.com/**',r=>r.abort());
   await page.route('**/fonts.gstatic.com/**',r=>r.abort());
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.GOXION_E1B2_AYUDA?.isolated&&window.GOXION_SMART_BETA?.isolated,{timeout:6000});
   assert(await page.locator('#gx-smart-lab').evaluate(el=>el.hidden),'Ayuda lab is hidden');
   await page.locator('#gx-smart-toggle').click();
   await page.selectOption('#gx-smart-scenario','multi');
   assert((await page.locator('.gx-account-capsule-label').textContent()).includes('$45.00'),
    'Ayuda should use the FIRST obligation, not whole period');
   await page.locator('#dash-billing-card .gx-account-capsule').click();
   await page.waitForURL('**/experiencia-financiera-espejo/estado.html?escenario=multi',{timeout:5000});
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX?.isolated,{timeout:5000});
   assert.equal(await page.locator('#gx-b2-hero-amount').textContent(),'$45.00');
   assert.equal(await page.locator('#gx-b2-selected-total').textContent(),'$45.00');
   assert.equal(await page.locator('#gx-b2-calendar-body').evaluate(el=>el.hidden),true);
   await page.locator('#gx-b2-calendar-toggle').click();
   assert.equal(await page.locator('#gx-b2-calendar-row').count(),0);
   assert.equal(await page.locator('[data-charge]').count(),2);
   assert.match(await page.locator('#gx-b2-calendar-list').innerText(),/6 de noviembre/i);
   await page.locator('[data-mode="all"]').click();
   assert.equal(await page.locator('#gx-b2-selected-total').textContent(),'$94.00',
    'Total of period must be secondary and different from next due');
   assert.equal(await page.locator('#gx-b2-hero-amount').textContent(),'$45.00',
    'Hero must not replace next due with entire period');
   await page.locator('[data-charge="b"]').click();
   assert.equal(await page.locator('#gx-b2-selected-total').textContent(),'$49.00');
   await page.locator('#gx-b2-lab-toggle').click();
   const scenarios=[
    ['same_day','$94.00'],
    ['first_paid','$49.00'],
    ['partial','$25.00'],
    ['review','$79.00'],
    ['correction','$79.00'],
    ['overdue','$47.25'],
    ['extension','$79.00'],
    ['clear','$0.00'],
    ['unavailable','—'],
    ['new','$0.00'],
    ['upcoming','$89.00']
   ];
   for(const [scenario,expected] of scenarios){
    await page.selectOption('#gx-b2-scenario',scenario);
    assert.equal(await page.locator('#gx-b2-hero-amount').textContent(),expected,
     name+' '+width+' '+scenario);
    if(scenario==='same_day'){
     await page.locator('#gx-b2-calendar-toggle').click();
     assert.equal(await page.locator('[data-charge]').count(),2);
     assert.equal(await page.locator('#gx-b2-selected-total').textContent(),'$94.00');
    }
    if(scenario==='review'){
     assert((await page.locator('#gx-b2-proof').innerText()).includes('No necesitas enviarlo otra vez'));
     assert.equal(await page.locator('#gx-b2-action').count(),0,
      'Do not ask customer to pay again when already reviewing');
     assert.equal(await page.locator('#gx-b2-proof [role="progressbar"]').getAttribute('aria-valuenow'),'56');
    }
    if(scenario==='correction'){
     assert.match(await page.locator('#gx-b2-proof').textContent(),/Requiere corrección/i);
     assert.equal(await page.locator('#gx-b2-action').textContent(),'Consultar observación');
    }
    if(scenario==='extension'){
     assert.match(await page.locator('#gx-b2-hero-badge').textContent(),/21 de octubre/i);
     assert.equal(await page.locator('#gx-b2-breakdown .surcharge-line').count(),0);
    }
    if(scenario==='first_paid'){
     assert.match(await page.locator('#gx-b2-services').textContent(),/Liquidado/);
     assert.match(await page.locator('#gx-b2-proof').textContent(),/Pago validado/);
    }
    if(scenario==='partial'){
     assert.match(await page.locator('#gx-b2-breakdown').textContent(),/Abono ya aprobado/);
     assert.match(await page.locator('#gx-b2-breakdown').textContent(),/\$20\.00/);
    }
    if(scenario==='overdue')assert.match(await page.locator('#gx-b2-breakdown').textContent(),/\$2\.25/);
    if(scenario==='unavailable'){
     assert.equal(await page.locator('#gx-b2-action').count(),0);
     assert.match(await page.locator('#gx-b2-actions').textContent(),/bloqueado/);
    }
    if(['clear','new'].includes(scenario))assert.equal(await page.locator('#gx-b2-action').count(),0);
    const rect=await page.evaluate(()=>({vw:document.documentElement.clientWidth,full:document.documentElement.scrollWidth}));
    assert(rect.full<=rect.vw+2,name+' '+width+' '+scenario+' horizontal overflow '+rect.full+'/'+rect.vw);
   }
   await page.selectOption('#gx-b2-scenario','upcoming');
   await page.locator('#gx-b2-lab-toggle').click(); // Close floating QA overlay before customer action.
   assert(await page.locator('#gx-b2-lab').evaluate(el=>el.hidden));
   await page.locator('#gx-b2-action').click();
   assert.equal(await page.locator('#gx-b2-demo-modal').evaluate(el=>el.hidden),false);
   await page.locator('#gx-b2-demo-submit').click();
   assert.equal(await page.locator('#gx-b2-demo-modal').evaluate(el=>el.hidden),true);
   assert.equal(await page.locator('#gx-b2-hero-badge').textContent(),'Comprobante recibido · Sin acreditar');
   assert.equal(await page.locator('#gx-b2-action').count(),0);
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
   assert.deepEqual(leaks,[]);assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log(name+' E1/B2 · 7 widths × 12 synthetic states, Ayuda↔Index, next/all, proof, backend blocked PASS');
 }finally{await browser.close()}
}
try{await ready();await run('Chromium',chromium);await run('WebKit',webkit);console.log('E1/B2 BETA PASS')}
finally{server.kill('SIGTERM')}
