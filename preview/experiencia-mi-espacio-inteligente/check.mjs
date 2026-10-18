import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {chromium,webkit} from 'playwright';
const dir='preview/experiencia-mi-espacio-inteligente/';
const html=readFileSync(dir+'index.html','utf8');
const official=readFileSync('ayuda.html','utf8');
assert(!html.includes('id="gx-smart-focus"'),'Redundant priority card must not exist');
assert(html.includes('id="gx-smart-notif-button"'),'Missing real Ayuda bell class');
assert(html.includes('class="gx-client-notif-sheet"'),'Missing Ayuda notification sheet');
assert(html.includes('src="./notice-demo.js?v=e1b1v6"'),'Missing isolated animation');
assert(html.includes('src="./mission-mirror.js?v=e1b1v6"'),'Missing native mission mirror');
assert(html.includes('id="gx-smart-toggle"'),'Missing mirror control');
assert(html.includes('id="gx-smart-lab"')&&html.includes('hidden>'),'Lab must start collapsed');
assert(html.includes('id="gx-smart-card-heading"'),'Missing contextual heading in original card');
assert(html.includes('id="gx-smart-card-description"'),'Missing contextual description');
assert(html.includes('id="dash-billing-card"')&&html.includes('id="referral-section-container"'));
assert(html.includes(official.slice(official.indexOf('id="view-dashboard"'),official.indexOf('id="view-dashboard"')+45)));
assert(!/(?:localStorage|sessionStorage|X-Client-Token|supabase-js|goxy-ai|estado-financiero-b2-beta)/i.test(html),
 'Live runtime or user data leaked');
assert(!/\son[a-z]+\s*=/i.test(html),'Unsafe official click event');
const context={};
runInNewContext(readFileSync(dir+'priority-engine.js','utf8'),context);
const evaluate=context.GOXION_SMART_PRIORITY.evaluate;
const service=(id,due,cents,more={})=>({id,name:'Servicio '+id,due,cents,status:'pending',...more});
const when='2026-10-17';
function match(s,code){assert.equal(evaluate(s,when).code,code)}
match({services:[]},'onboard');
match({services:[service('a','2026-10-20',8900)]},'soon');
match({services:[service('a','2026-10-17',7900)]},'today');
match({services:[service('a','2026-10-16',8900)]},'overdue');
match({services:[service('a','2026-10-20',8900)],review:{status:'pending',serviceIds:['a']}},'review');
match({services:[service('a','2026-10-16',8900)],review:{status:'pending',serviceIds:['a']}},'review');
match({services:[service('a','2026-10-16',8900),service('b','2026-10-16',4500)],
 review:{status:'pending',serviceIds:['a']}},'overdue');
match({services:[service('a','2026-10-20',8900)],review:{status:'correction',serviceIds:['a']}},'correction');
match({services:[service('a','2026-10-17',7900,{extension:{state:'active',agreedDate:'2026-10-21'}})]},'extension');
match({services:[service('a','2026-11-20',8900)],missions:{active:true,done:2,total:3}},'mission');
match({services:[service('a','2026-10-15',8900,{status:'paid'})]},'clear');
const multi=evaluate({services:[service('a','2026-10-20',4500),service('b','2026-11-06',4900)]},when);
assert.equal(multi.next.amount,'$45.00');assert.equal(multi.next.count,1);
assert.equal(multi.schedule.length,2);
const same=evaluate({services:[service('a','2026-10-20',4500),service('b','2026-10-20',4900)]},when);
assert.equal(same.next.amount,'$94.00');assert.equal(same.next.count,2);
const missing=evaluate({services:[service('a','2026-10-20',null)]},when);
assert.equal(missing.next.amount,'importe por confirmar');
console.log('E1/B1 priority matrix PASS: due-group, multifecha, review isolation, prórroga, tasks');
const port=4251,base='http://127.0.0.1:'+port+'/'+dir+'index.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<65;i++){try{if((await fetch(base)).ok)return}catch{}await sleep(130)}throw Error('server unavailable')}
const expectations={
 upcoming:{code:'soon',heading:'PRÓXIMO VENCIMIENTO',hero:'20 de octubre',amount:'$89.00'},
 multi:{code:'soon',heading:'PRÓXIMO VENCIMIENTO',hero:'20 de octubre',amount:'$45.00'},
 review:{code:'review',heading:'ESTADO DE TU COMPROBANTE',hero:'En revisión',badge:'Comprobante recibido'},
 correction:{code:'correction',heading:'COMPROBANTE CON OBSERVACIÓN',hero:'Requiere corrección'},
 overdue:{code:'overdue',heading:'PAGO PENDIENTE',hero:'16 de octubre'},
 extension:{code:'extension',heading:'ACUERDO PACTADO',hero:'21 de octubre'},
 mission:{code:'mission',heading:'TU PRÓXIMA FECHA DE PAGO',hero:'20 de noviembre'},
 clear:{code:'clear',heading:'ESTADO DE TUS SERVICIOS',hero:'Al corriente'},
 new:{code:'onboard',heading:null,hero:null}
};
async function exercise(name,engine){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const errors=[],forbidden=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(/supabase|discord|goxy|notificaciones-cliente|estado-financiero|\/functions\/v1\//i.test(r.url()))forbidden.push(r.url())});
   await page.route('**/fonts.googleapis.com/**',r=>r.abort());
   await page.route('**/fonts.gstatic.com/**',r=>r.abort());
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.GOXION_SMART_BETA?.isolated===true&&window.GOXION_SMART_NOTICE?.isolated===true&&window.GOXION_SMART_MISSIONS?.isolated===true,{timeout:5500});
   assert(await page.locator('#gx-smart-lab').evaluate(el=>el.hidden),'La vista espejo debe iniciar limpia');
   assert.equal(await page.locator('#gx-smart-container #gx-smart-lab').count(),0,'Laboratorio no puede ocupar flujo Mi Espacio');
   assert.equal(await page.locator('#gx-smart-notif-button.gx-client-notif-launch').count(),1);
   await page.locator('#gx-smart-toggle').click();
   assert(!(await page.locator('#gx-smart-lab').evaluate(el=>el.hidden)),'El laboratorio debe abrirse');
   assert.equal(await page.locator('#gx-smart-focus').count(),0,
    'No debe existir una tarjeta superior de notificaciones prioritarias');
   assert.equal(await page.locator('#dash-billing-card').count(),1);
   assert.equal(await page.locator('#gx-smart-card-heading').count(),1);
   assert.equal(await page.locator('.gx-gixy-message').count(),0,
    'La beta Gixys aprobada permanece independiente');
   for(const [key,expect] of Object.entries(expectations)){
    await page.selectOption('#gx-smart-scenario',key);
    assert.equal(await page.locator('#dash-billing-card').getAttribute('data-code'),expect.code,name+' '+width+' '+key);
    const isHidden=await page.locator('#dash-billing-card').evaluate(el=>el.hidden);
    assert.equal(isHidden,key==='new',name+' '+width+': card visibility '+key);
    if(expect.heading){
     assert.equal(await page.locator('#gx-smart-card-heading').textContent(),expect.heading);
     assert.equal(await page.locator('#dash-date').textContent(),expect.hero);
    }
    if(expect.amount)assert((await page.locator('.gx-account-capsule-label').textContent()).includes(expect.amount));
    if(key!=='new'){
     assert.equal(await page.locator('#dash-badge .time-badge').count(),1,
      name+' '+width+' '+key+': native Ayuda status capsule missing');
    }
    if(key==='review')assert.equal(await page.locator('#dash-badge .badge-review').count(),1);
    if(key==='extension')assert.equal(await page.locator('#dash-badge .time-badge.badge-ok.gx-prorroga-state').count(),1);
    if(key==='multi'){
     const sched=await page.locator('.gx-smart-schedule__row').allTextContents();
     assert.equal(sched.length,2);assert(sched[0].includes('45')&&sched[1].includes('49'));
     assert(!(await page.locator('.gx-account-capsule-label').textContent()).includes('94'));
    }
    if(key==='review'||key==='correction'){
     assert.equal(await page.locator('.gx-account-capsule-label').textContent(),'Consultar comprobante');
     assert(!/corte|octubre|pago próximo/i.test(await page.locator('#dash-billing-card').textContent()),
       'Comprobante en revisión no debe anunciar una fecha ajena al estado');
     assert(!(await page.locator('#gx-smart-card-description').evaluate(el=>el.hidden)),
       'Falta explicación de comprobante');
    }
    if(key==='extension')assert((await page.locator('.gx-smart-schedule').textContent()).includes('Pactado'));
    if(key==='mission'){
     assert.equal(await page.locator('#gx-smart-mission-card.gx-gamif-card-mission').count(),1);
     assert.match(await page.locator('#gx-smart-mission-card').textContent(),/2 de 3/);
     assert(await page.locator('#gx-smart-preview-alert').isEnabled(),'Mission must have meaningful action');
     assert.equal(await page.locator('#gx-smart-preview-alert').textContent(),'Ver misión pendiente'); 
     await page.locator('#gx-smart-preview-alert').click();
     assert(!(await page.locator('#gamif-expanded-coupon').evaluate(el=>el.hidden)),
      'Mission demo must open original Ayuda expanded section');
     assert.equal(await page.locator('#gamif-expanded-coupon .mission-item').count(),3);
     assert.equal(await page.locator('#gx-smart-notif-button.gx-has-new').count(),0,
      'Pending mission must not fabricate urgent notification');
     await page.locator('#gamif-expanded-coupon .btn-gamif-close').click();
     assert(await page.locator('#gamif-grid').isVisible(),
      'Original cards must be restored after mission closes');
     assert(!/misiones/i.test(await page.locator('#gx-smart-card-heading').textContent()),
       'No usar tarjeta financiera como recordatorio de misiones');
    }
    if(key==='clear')assert(!/corte/i.test(await page.locator('#dash-billing-card').textContent()));
    const m=await page.evaluate(()=>({width:document.documentElement.clientWidth,
     scroll:document.documentElement.scrollWidth,
     card:document.getElementById('dash-billing-card').getBoundingClientRect(),
     selector:document.querySelector('.gx-smart-lab').getBoundingClientRect()}));
    assert(m.scroll<=m.width+2,name+' '+width+' '+key+': overflow '+m.scroll+'/'+m.width);
    assert(m.selector.width>190&&m.selector.left>=-1&&m.selector.right<=m.width+1,
      name+' '+width+' '+key+': selector outside viewport');
    assert(m.selector.height<290,name+' '+width+' '+key+': laboratory controls too tall');
   }
   await page.selectOption('#gx-smart-scenario','review');
   // Mission inspection can scroll the document. Return to the natural
   // dashboard view before asserting an ON-SCREEN source → bell animation;
   // off-screen source must instead use the safe, motion-free handoff.
   await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
   await page.waitForTimeout(90);
   const before=await page.locator('#dash-billing-card').boundingBox();
   assert(await page.locator('#gx-smart-preview-alert').isEnabled(),'Review notice enabled');
   await page.locator('#gx-smart-preview-alert').click();
   assert.equal(await page.locator('.gx-smart-notice-surface').count(),1,'Overlay must be inside original card');
   assert.equal(await page.locator('.gx-smart-notice-surface').evaluate(el=>el.parentElement.id),'dash-billing-card');
   assert.equal(await page.locator('#gx-smart-card-heading').textContent(),'ESTADO DE TU COMPROBANTE','Underlying state must persist');
   await page.waitForTimeout(3130);
   // New motion exists ONLY while the event travels; it is a curved, two-layer
   // signal path, not a floating capsule/dot. Its source and destination are in
   // viewport coordinates, and it never inserts an element into the dashboard.
   const signal=page.locator('.gx-smart-notice-stream');
   assert.equal(await signal.count(),1,'Notice needs a transient optical path');
   assert.equal(await page.locator('.gx-smart-notice-stream-line').count(),1);
   assert.equal(await page.locator('.gx-smart-notice-stream-halo').count(),1);
   assert.equal(await signal.evaluate(el=>el.parentElement.tagName),'BODY',
    'Motion layer must not affect card layout');
   const skin=page.locator('.gx-smart-notice-stream-line');
   const d=await skin.getAttribute('d');
   assert(/^M .* L .* Z$/.test(d),'Organic ribbon must have a filled, tapered silhouette; got '+JSON.stringify(d?.slice(0,120)));
   assert.equal(await page.locator('.gx-smart-notice-stream-sheen').count(),1,
    'Ribbon should include a restrained internal highlight');
   assert.equal(await page.locator('.gx-smart-notice-flight,.gx-smart-notice-spark').count(),0,
    'No flying capsules or generic dots');
   await page.waitForFunction(previous=>{
    const current=document.querySelector('.gx-smart-notice-stream-line')?.getAttribute('d');
    return Boolean(current)&&current!==previous;
   },d,{timeout:700});
   const d2=await skin.getAttribute('d');
   assert.notEqual(d,d2,'Ribbon geometry must evolve every frame instead of sliding a fixed line');
   await page.waitForTimeout(1390);
   assert.equal(await page.locator('.gx-smart-notice-surface').count(),0,'Transient notice must clear');
   assert.equal(await signal.count(),0,'Signal layer must be removed after delivery');
   assert(await page.locator('#gx-smart-notif-button').evaluate(el=>el.classList.contains('gx-has-new')),'Notice must arrive at bell');
   const after=await page.locator('#dash-billing-card').boundingBox();
   assert(Math.abs(before.y-after.y)<1&&Math.abs(before.height-after.height)<1,
    name+' '+width+': notice altered dashboard layout');
   await page.locator('#gx-smart-notif-button').click();
   assert(await page.locator('#gx-smart-notif-sheet').evaluate(el=>el.classList.contains('show')),
    'Notification sheet must open');
   assert.match(await page.locator('#gx-smart-notif-list').innerText(),/comprobante está en revisión/i);
   await page.locator('#gx-smart-notif-close').click();
   assert(!(await page.locator('#gx-smart-notif-sheet').evaluate(el=>el.classList.contains('show'))));
   await page.locator('#dash-billing-card .gx-account-capsule').click();
   assert.match(await page.locator('#gx-smart-toast').innerText(),/comprobante es ficticio/i);
   await page.selectOption('#gx-smart-scenario','new');
   assert(!(await page.locator('#gx-smart-preview-alert').isEnabled()),'No fabricated notice when no event');
   await page.locator('#dash-onboarding-card button').click();
   assert.match(await page.locator('#gx-smart-toast').innerText(),/deshabilitado/i);
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
   assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log(name+' E1/B1: 6 widths x 9 states, native Ayuda capsules/missions + elastic silk ribbon → bell PASS');
 }finally{await browser.close()}
}
try{await ready();await exercise('Chromium',chromium);await exercise('WebKit',webkit);console.log('E1/B1 BETA PASS');}
finally{server.kill('SIGTERM')}
