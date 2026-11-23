/* QA aislada del movimiento de marca, sin sesión/cliente/red de producción. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
const css=fs.readFileSync('preview/mi-espacio-v2/official-feed-intro.css','utf8');
const js=fs.readFileSync('preview/mi-espacio-v2/official-feed-intro.js','utf8');
const base='<html><body class="gx-v2-private-visible"><div id="gx-v2-shared-header"><img class="gxn-wordmark" alt="GOXION" style="width:132px;height:36px;display:block" src="data:image/svg+xml,%3Csvg%20xmlns=%22http%3A//www.w3.org/2000/svg%22%20width=%22132%22%20height=%2236%22/%3E"></div><div class="view-section active" id="view-dashboard"><div id="gx-v2-feed"><div id="gx-v2-sync"></div></div></div><div id="view-catalogo"></div><div id="view-soporte"></div></body></html>';
for(const [type,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 const browser=await type.launch({headless:true});
 try{
  const moving=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const errors=[];moving.on('pageerror',e=>errors.push(e.message));
  await moving.setContent(base,{waitUntil:'domcontentloaded'});
  await moving.addStyleTag({content:css});
  await moving.addScriptTag({content:js});
  await moving.locator('#gx-v2-handoff').waitFor({state:'visible',timeout:2500});
  assert.equal(await moving.locator('body').evaluate(el=>el.classList.contains('gx-v2-handoff-active')),true,label+' wordmark oculto durante vuelo');
  await moving.waitForTimeout(560);
  assert.equal(await moving.locator('.gx-v2-handoff-wait').isVisible(),true,label+' mostrar barra solo al superar umbral');
  await moving.evaluate(()=>window.dispatchEvent(new Event('goxion:v2-feed:rendered')));
  await moving.locator('#gx-v2-handoff').waitFor({state:'hidden',timeout:4000});
  assert.equal(await moving.locator('body').evaluate(el=>el.classList.contains('gx-v2-handoff-active')),false,label+' wordmark oficial visible tras vuelo');
  await moving.evaluate(()=>{
   const sheet=document.createElement('section');sheet.id='gx-client-notif-sheet';
   const close=document.createElement('button');close.className='gx-client-notif-close';close.onclick=()=>{window.__qaClosed=(window.__qaClosed||0)+1};
   close.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg>';
   sheet.append(close);document.body.append(sheet);
  });
  await moving.locator('.gx-v2-notif-cross').waitFor({state:'attached',timeout:1500});
  const cross=await moving.evaluate(()=>{
   const x=document.querySelector('.gx-v2-notif-cross'),a=getComputedStyle(x,'::before'),b=getComputedStyle(x,'::after');
   document.querySelector('#gx-client-notif-sheet button').click();
   return {a:a.width+' x '+a.height,b:b.width+' x '+b.height,angleA:a.transform,angleB:b.transform,closed:window.__qaClosed};
  });
  assert.equal(cross.a,cross.b,label+' X simétrica');
  assert.notEqual(cross.angleA,cross.angleB,label+' diagonales contrarias');
  assert.equal(cross.closed,1,label+' conservar acción original del botón');
  assert.deepEqual(errors,[],label+' sin excepciones JS');
  await moving.close();
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.setContent(base,{waitUntil:'domcontentloaded'});
  await reduced.addStyleTag({content:css});await reduced.addScriptTag({content:js});
  await reduced.waitForTimeout(140);
  assert.equal(await reduced.locator('#gx-v2-handoff').isVisible(),false,label+' reduce-motion sin vuelo');
  await reduced.close();
  const guest=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await guest.setContent(base.replace('class="gx-v2-private-visible"','').replace('class="view-section active"','class="view-section"'),{waitUntil:'domcontentloaded'});
  await guest.addStyleTag({content:css});await guest.addScriptTag({content:js});
  await guest.waitForTimeout(140);
  assert.equal(await guest.locator('#gx-v2-handoff').isVisible(),false,label+' portada pública sin modificación');
  await guest.close();
  console.log('OK '+label+': vuelo 620ms, barra condicional, wordmark oficial, X y reducir movimiento');
 }finally{await browser.close()}
}
