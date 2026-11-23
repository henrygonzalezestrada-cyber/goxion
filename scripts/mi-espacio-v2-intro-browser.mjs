/* QA aislada del mismo nodo inicial y de la X real, con CSS global oficial. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
const html=fs.readFileSync('ayuda-espejo-feed-v2.html','utf8');
const css=fs.readFileSync('preview/mi-espacio-v2/official-feed-intro.css','utf8');
const sharedCSS=fs.readFileSync('assets/css/goxion-modal-headers.css','utf8');
const feedCSS=fs.readFileSync('preview/mi-espacio-v2/official-feed.css','utf8');
const js=fs.readFileSync('preview/mi-espacio-v2/official-feed-intro.js','utf8');
const runtime=fs.readFileSync('preview/mi-espacio-v2/official-feed-runtime.js','utf8');
const source=html.slice(html.indexOf('<div id="gx-v2-handoff"'),html.indexOf('<script>',html.indexOf('<div id="gx-v2-handoff"')));
const close=html.match(/<button id="gxb-dismiss"[\s\S]*?<\/button>/)[0];
const base='<html><body class="gx-v2-private-visible gx-v2-client-session">'+source+'<div id="gx-v2-shared-header"><img class="gxn-wordmark" alt="GOXION" style="width:132px;height:36px;display:block"></div><div class="view-section active" id="view-dashboard"><div id="gx-v2-feed"><div id="gx-v2-sync"></div>'+close+'</div></div><div id="view-catalogo"></div><div id="view-soporte"></div><h1 id="greeting"><span class="greeting-line"></span></h1></body></html>';
async function init(page,markup=base){
 await page.setContent(markup,{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:sharedCSS});await page.addStyleTag({content:feedCSS});await page.addStyleTag({content:css});
 await page.addScriptTag({content:js});
}
for(const [type,label] of [[chromium,'Chromium'],[webkit,'WebKit']]){
 const browser=await type.launch({headless:true});
 try{
  const moving=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const errors=[];moving.on('pageerror',e=>errors.push(e.message));
  await init(moving);
  await moving.waitForFunction(()=>document.body.classList.contains('gx-v2-handoff-active'));
  await moving.evaluate(()=>{window.__qaLogo=document.querySelector('.gx-v2-handoff-mark');window.__qaRoot=document.getElementById('gx-v2-handoff')});
  const before=await moving.locator('.gx-v2-handoff-mark').boundingBox();
  await moving.locator('.gx-v2-handoff-wait').waitFor({state:'visible',timeout:2000});
  const after=await moving.locator('.gx-v2-handoff-mark').boundingBox();
  assert.equal(before.y,after.y,label+' la barra no desplaza el símbolo');
  await moving.evaluate(()=>window.hideSplash());
  assert.equal(await moving.locator('#gx-v2-handoff').isVisible(),true,label+' fin de splash oficial no crea corte durante sync');
  await moving.evaluate(()=>{document.getElementById('gx-v2-sync').hidden=true;window.dispatchEvent(new Event('goxion:v2-feed:rendered'))});
  await moving.locator('#gx-v2-handoff').waitFor({state:'hidden',timeout:4000});
  assert(await moving.evaluate(()=>window.__qaRoot===document.getElementById('gx-v2-handoff')&&window.__qaLogo===document.querySelector('.gx-v2-handoff-mark')),label+' mismo nodo desde inicio');
  assert.equal(await moving.locator('body').evaluate(e=>e.classList.contains('gx-v2-handoff-active')),false,label+' logo completo visible');
  await moving.evaluate(()=>{
   const sheet=document.createElement('section');sheet.id='gx-client-notif-sheet';
   const close=document.createElement('button');close.className='gx-client-notif-close';close.onclick=()=>{window.__qaClosed=(window.__qaClosed||0)+1};
   close.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg>';
   sheet.append(close);document.body.append(sheet);
  });
  await moving.locator('[data-gx-v2-close=shared]').waitFor({state:'attached',timeout:1500});
  const icon=await moving.evaluate(()=>{
   const button=document.querySelector('.gx-client-notif-close'),p=button.querySelector('path');
   button.click();
   return {path:p.getAttribute('d'),target:document.querySelector('#gxb-dismiss path').getAttribute('d'),before:getComputedStyle(button,'::before').content,after:getComputedStyle(button,'::after').content,closed:window.__qaClosed};
  });
  assert.equal(icon.path,icon.target,label+' X copiada del feed');
  assert.equal(icon.before,'none',label+' sin diagonal global 1');
  assert.equal(icon.after,'none',label+' sin diagonal global 2');
  assert.equal(icon.closed,1,label+' botón oficial permanece');
  // Probar las funciones de saludo reales, aislando exclusivamente el reloj de 13 segundos.
  const section=runtime.slice(runtime.indexOf('let greetingTimer=0;'),runtime.indexOf('function renderHero(){'));
  await moving.addScriptTag({content:'(()=>{const $=id=>document.getElementById(id),reduced=()=>false,state={lastState:"clear",view:{}};let cb=null,delay=0;const setInterval=(fn,ms)=>{cb=fn;delay=ms;return 1},clearInterval=()=>{cb=null};'+section+';window.__qaGreeting={update:(code)=>{state.lastState=code;updateGreeting("Cliente QA",code)},tick:()=>cb?.(),delay:()=>delay}})()'});
  await moving.evaluate(()=>window.__qaGreeting.update('clear'));
  assert.equal(await moving.locator('#greeting').getAttribute('aria-label'),'Hola, Cliente QA');
  await moving.evaluate(()=>window.__qaGreeting.tick());
  assert.equal(await moving.locator('#greeting').getAttribute('aria-label'),'Qué gusto, Cliente QA');
  await moving.evaluate(()=>window.__qaGreeting.tick());
  assert.equal(await moving.locator('#greeting').getAttribute('aria-label'),'Bienvenido, Cliente QA');
  assert.equal(await moving.evaluate(()=>window.__qaGreeting.delay()),13000);
  await moving.evaluate(()=>{window.__qaGreeting.update('overdue');window.__qaGreeting.tick()});
  assert.equal(await moving.locator('#greeting').getAttribute('aria-label'),'Hola, Cliente QA');
  assert.deepEqual(errors,[],label+' sin excepciones JS');
  await moving.close();
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await init(reduced);
  await reduced.locator('#gx-v2-handoff').waitFor({state:'hidden',timeout:2500});
  await reduced.close();
  const guest=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await init(guest,base.replace('gx-v2-private-visible gx-v2-client-session','').replace('class="view-section active"','class="view-section"'));
  await guest.evaluate(()=>window.hideSplash());
  assert.equal(await guest.locator('#gx-v2-handoff').isVisible(),false,label+' invitado no recibe vuelo');
  await guest.close();
  console.log('OK '+label+': carga única, logo inmóvil al aparecer barra, cierre exacto, saludo de laboratorio');
 }finally{await browser.close()}
}
