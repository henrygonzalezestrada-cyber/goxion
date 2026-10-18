import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {chromium,webkit} from 'playwright';
const dir='preview/experiencia-mi-espacio-inteligente/';
const html=readFileSync(dir+'index.html','utf8');
const official=readFileSync('ayuda.html','utf8');
assert(html.includes('id="gx-smart-focus"'),'Focus not built');
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
 upcoming:{code:'soon',title:'Tu próximo pago se acerca',amount:'$89.00'},
 multi:{code:'soon',title:'Tu próximo pago se acerca',amount:'$45.00'},
 review:{code:'review',title:'Tu comprobante está en revisión'},
 correction:{code:'correction',title:'Hay una observación en tu comprobante'},
 overdue:{code:'overdue',title:'Un servicio necesita revisión'},
 extension:{code:'extension',title:'Tu nueva fecha está registrada'},
 mission:{code:'mission',title:'Te falta poco para completar tus misiones'},
 clear:{code:'clear',title:'Tu espacio está al corriente'},
 new:{code:'onboard',title:'Tu espacio ya está listo'}
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
   await page.waitForFunction(()=>window.GOXION_SMART_BETA?.isolated===true,{timeout:5500});
   assert.equal(await page.locator('#gx-smart-focus').count(),1);
   assert.equal(await page.locator('#dash-billing-card').count(),1);
   assert.equal(await page.locator('.gx-gixy-message').count(),0,'Gixys approved beta must remain independent');
   for(const [key,expect] of Object.entries(expectations)){
    await page.selectOption('#gx-smart-scenario',key);
    const code=await page.locator('#gx-smart-focus').getAttribute('data-code');
    assert.equal(code,expect.code,name+' '+width+' '+key);
    assert.equal(await page.locator('#gx-smart-title').textContent(),expect.title);
    if(expect.amount)assert((await page.locator('.gx-smart-focus').textContent()).includes(expect.amount));
    if(key==='multi'){
     const sched=await page.locator('.gx-smart-schedule__row').allTextContents();
     assert.equal(sched.length,2);assert(sched[0].includes('45')&&sched[1].includes('49'));
     assert(!(await page.locator('.gx-account-capsule-label').textContent()).includes('94'));
    }
    if(key==='review'||key==='correction'){
     assert(!/pagar ahora|realizar otro pago/i.test(await page.locator('#gx-smart-action').textContent()));
    }
    if(key==='extension')assert((await page.locator('.gx-smart-schedule').textContent()).includes('Pactado'));
    const m=await page.evaluate(()=>({width:document.documentElement.clientWidth,
     scroll:document.documentElement.scrollWidth,
     focus:document.getElementById('gx-smart-focus').getBoundingClientRect(),
     control:document.querySelector('#gx-smart-scenario').getBoundingClientRect()}));
    assert(m.scroll<=m.width+2,name+' '+width+' '+key+': overflow '+m.scroll+'/'+m.width);
    assert(m.focus.width>190&&m.focus.left>=-1&&m.focus.right<=m.width+1,
      name+' '+width+' '+key+': focus outside viewport');
   }
   await page.selectOption('#gx-smart-scenario','mission');
   await page.locator('#gx-smart-action').click();
   assert.equal(await page.locator('#gx-smart-mission-card').count(),1);
   await page.selectOption('#gx-smart-scenario','new');
   await page.locator('#gx-smart-action').click();
   assert.match(await page.locator('#gx-smart-toast').innerText(),/laboratorio|protegido|deshabilitado/i);
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
   assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log(name+' E1/B1: 6 widths x 9 customer states, no backend/overflow PASS');
 }finally{await browser.close()}
}
try{await ready();await exercise('Chromium',chromium);await exercise('WebKit',webkit);console.log('E1/B1 BETA PASS');}
finally{server.kill('SIGTERM')}
