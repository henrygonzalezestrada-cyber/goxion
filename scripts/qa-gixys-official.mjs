import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
const source=fs.readFileSync('assets/js/ayuda/21-gixys-official.src.jsx','utf8');
const html=fs.readFileSync('ayuda.html','utf8');
assert(html.includes('id="goxion-gixys-official"'),'Official loader missing');
assert(html.includes('gixys-official.css'),'Official scoped style missing');
assert(!source.includes('setItem(')&&!source.includes('localStorage'),'Adapter must never write identity/reward data');
assert(fs.statSync('assets/js/ayuda/21-gixys-official.bundle.js').size>30000,'Original renderer bundle missing');
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:'4217'},stdio:'ignore'});
const url='http://127.0.0.1:4217/preview/gixys-oficial-qa/index.html';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<70;i++){try{if((await fetch(url)).ok)return}catch{}await pause(150)}throw Error('server unavailable')}
async function exercise(browserName,launcher){
 const b=await launcher.launch({headless:true});
 try{
  for(const width of [320,390,430]){
   const page=await b.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const failures=[],privateCalls=[];
   page.on('pageerror',e=>failures.push(e.message));
   page.on('request',r=>{if(/supabase\.co|discord\.com|notificaciones-cliente/i.test(r.url()))privateCalls.push(r.url())});
   await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#gx-mirror-heart').count(),0,'Gixys visible without login');
   assert.equal(await page.locator('.gx-gixy-message').count(),0,'Companion visible to guest');
   await page.evaluate(()=>{
    window.goxionCurrentClientKey='demo';
    window.globalClientesData={demo:{nombre:'Cliente de prueba',gamificacion:{
      misiones_activas:true,tareas:'Misión A\nMisión B\nMisión C',
      progreso:[{mision_index:0},{mision_index:1}]}}};
    window.unreadCount=0;
    window.GOXION_CLIENT_NOTIFICATIONS={getUnread:()=>window.unreadCount};
    window.dispatchEvent(new Event('goxion:client-ready'));
   });
   await page.locator('#gx-mirror-heart .pulse-heart').waitFor({timeout:3000});
   assert.equal(await page.locator('#loyalty-count').textContent(),'3/4 Pagos');
   const area=await page.evaluate(()=>{
    const ids=['dash-billing-card','loyalty-msg','referral-section-container'];
    return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();
      return [id,{top:r.top,height:r.height}]}));
   });
   await page.locator('#gx-mirror-heart .pulse-heart').click();
   await page.locator('.gx-gixy-message[data-kind="loyalty"]').waitFor({timeout:2500});
   await page.waitForTimeout(350);
   const after=await page.evaluate(()=>{
    const ids=['dash-billing-card','loyalty-msg','referral-section-container'];
    return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();
      return [id,{top:r.top,height:r.height}]}));
   });
   for(const id of Object.keys(area))for(const dim of ['top','height'])
    assert(Math.abs(area[id][dim]-after[id][dim])<1.5,
      browserName+' '+width+': Gixy moves '+id+'.'+dim);
   assert.equal(await page.locator('#loyalty-count').textContent(),'3/4 Pagos',
      'Heart must not simulate actual loyalty payments');
   await page.evaluate(()=>{
    window.unreadCount=1;document.getElementById('gx-client-notif-badge').textContent='1';
   });
   await page.locator('.gx-gixy-message[data-kind="notification"]').waitFor({timeout:2500});
   await page.evaluate(()=>{
    window.globalClientesData.demo.gamificacion.progreso.push({mision_index:2});
    document.querySelector('.gx-gamif-card-status').textContent='3 de 3 completadas';
   });
   await page.locator('.gx-gixy-message[data-kind="mission"]').waitFor({timeout:2500});
   assert.equal(await page.locator('.gx-gixys-secret').count(),0,'No fictitious discount in official');
   assert.equal(await page.locator('.gx-gixys-progress').getAttribute('data-found'),'0',
     'Real rewards must not inherit demo progress');
   const layout=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    overlay:getComputedStyle(document.getElementById('gx-gixys-message-root')).position,
    hasDemoText:document.body.textContent.includes('5 % OFF')
   }));
   assert(layout.scroll<=layout.width+2&&layout.overlay==='fixed'&&!layout.hasDemoText,
      'Official viewport/discount guard '+JSON.stringify(layout));
   await page.evaluate(()=>window.dispatchEvent(new Event('goxion:client-logout')));
   await page.waitForTimeout(80);
   assert.equal(await page.locator('.gx-gixy-message').count(),0,'Gixys survive logout');
   assert.equal(failures.length,0,'Runtime errors '+failures.join(' / '));
   assert.deepEqual(privateCalls,[],'Official Gixys must not call financial/notification APIs themselves');
   await page.close();
  }
  console.log(browserName+' official integration / no layout shift / event guards PASS');
 }finally{await b.close()}
}
try{await ready();await exercise('Chromium',chromium);await exercise('WebKit',webkit);console.log('OFFICIAL GIXYS INTEGRATION PASS')}
finally{server.kill('SIGTERM')}
