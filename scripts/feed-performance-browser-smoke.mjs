import {chromium,webkit} from 'playwright';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const root='preview/mi-espacio-v2/';
const file=p=>readFileSync(p,'utf8');
const html=file('ayuda-espejo-feed-v2.html').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
// Use a real local origin; never reach the production API. Broken image fallbacks
// in the candidate can repeatedly request the same missing asset, so return a
// valid image fixture rather than a 404 and wait only for the DOM.
const image='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="transparent"/></svg>';
const server=createServer((req,res)=>{
 if(req.url==='/ayuda-espejo-feed-v2.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)}
 else{res.writeHead(404);res.end()}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin='http://127.0.0.1:'+server.address().port;
const fixture=origin+'/ayuda-espejo-feed-v2.html';
try{
const engines=process.env.GOXION_TEST_CHROMIUM?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
for(const [name,engine] of engines){
 const browser=await engine.launch({headless:true,...(process.env.GOXION_TEST_CHROMIUM?{executablePath:process.env.GOXION_TEST_CHROMIUM,args:['--no-sandbox']}: {})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let services=[{id:'s1',nombre:'Netflix',monto:100,activo:true}],requests=[],delayMain=150;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.href===fixture)return route.continue();
   if(url.origin===origin&&url.pathname.startsWith('/api/')){
    const endpoint=url.pathname.split('/').at(-1),token=route.request().headers()['x-client-token'];
    requests.push(endpoint);
    if(endpoint==='mi-espacio'&&delayMain)await new Promise(r=>setTimeout(r,delayMain));
    const response={ok:true,cliente:{id:'customer-'+token,nombre:'Cliente '+token,estado:'pagado'},servicios:services,pagos:[],gamificacion:null,misiones_progreso:[],referidos:[],solicitudes:[],entregas:[],novedades:[],accesos:[],estado_cuenta:{estado:'pagado',esta_pagado_periodo:true}};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(response)});
   }
   if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:image});
   return route.abort();
  });
  await page.goto(fixture,{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:file('assets/css/ayuda.css')});
  await page.addStyleTag({content:file(root+'official-feed.css')});
  await page.evaluate(()=>{
   document.body.classList.remove('no-scroll','gx-v2-handoff-active');document.getElementById('gx-v2-handoff').hidden=true;
   localStorage.setItem('fixture-token','A');window.getCurrentClientKey=()=>localStorage.getItem('fixture-token')?'customer-'+localStorage.getItem('fixture-token'):'';
   window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:'fixture-token'},SUPABASE_ORIGIN:location.origin,endpoint:x=>location.origin+'/api/'+x};
   window.GOXY_ROBOT={mount(){}};
   window.switchTab=(name,opts)=>{
    window.lastNavigate={name,opts};
    for(const el of document.querySelectorAll('.view'))el.classList.remove('active');
    for(const id of ['view-inicio','view-dashboard','view-catalogo','view-soporte'])document.getElementById(id).classList.remove('active');
    document.getElementById(name==='inicio'?'view-dashboard':'view-'+name).classList.add('active');
   };
   window.cerrarSesion=()=>{localStorage.removeItem('fixture-token');window.dispatchEvent(new Event('goxion:client-logout'))};
   window.scrollLog=[];
   Element.prototype.scrollIntoView=function(){window.scrollLog.push(this.id||this.dataset.service||this.className)};
   switchTab('inicio');
  });
  for(const path of [root+'feed-reads.js',root+'v2-data.js',root+'feed-continuity.js',root+'official-feed-runtime.js',root+'official-feed-host.js'])await page.addScriptTag({content:file(path)});
  await page.waitForFunction(()=>window.GOXION_V2_CLIENT_ID==='customer-A');
  await page.waitForFunction(()=>!document.getElementById('gxi-shell').hidden);delayMain=0;
  const dest=(action,ref='')=>page.evaluate(({action,ref})=>window.GOXION_V2_NOTIFICATION_DESTINATION(action,ref),{action,ref});
  assert.equal(await dest('services'),true);
  await page.waitForFunction(()=>window.scrollLog.at(-1)==='gxs-list');
  assert.equal(await dest('service','s1'),true);
  await page.waitForFunction(()=>document.querySelector('[data-service="s1"]').classList.contains('is-open'));
  assert.equal(await page.evaluate(()=>window.scrollLog.at(-1)),'s1');
  await dest('catalog');await page.waitForFunction(()=>document.getElementById('view-catalogo').classList.contains('active'));
  await dest('referral');await page.waitForFunction(()=>document.getElementById('gxb-panel').dataset.benefit==='referral'&&!document.getElementById('gxb-panel').hidden);
  await dest('coupon');await page.waitForFunction(()=>document.getElementById('gxb-panel').dataset.benefit==='mission'&&!document.getElementById('gxb-panel').hidden);
  // Missing ID fetches once, then resolves the actual service when it appears.
  services=[...services,{id:'s2',nombre:'Disney+',activo:true}];await dest('service','s2');
  await page.waitForFunction(()=>document.querySelector('[data-service="s2"]')?.classList.contains('is-open'));
  // Superseding a pending destination cannot pull the user away from their new section.
  delayMain=100;await dest('service','unknown');await dest('catalog');
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.lastNavigate.name),'catalogo');
  assert.notEqual(await page.evaluate(()=>window.scrollLog.at(-1)),'gxs-list');
  // Reauthentication with same tab and a different token cannot keep prior open service.
  await page.evaluate(()=>{localStorage.setItem('fixture-token','B');switchTab('inicio');window.dispatchEvent(new Event('goxion:client-ready'))});
  await page.waitForFunction(()=>window.GOXION_V2_CLIENT_ID==='customer-B');
  assert.equal(await page.locator('.gxs-card.is-open').count(),0);
  await page.evaluate(()=>cerrarSesion());
  assert.equal(await page.locator('.gxs-card').count(),0);
  assert.equal(await page.locator('#gxi-shell').evaluate(el=>el.hidden),true);
  assert.deepEqual(errors,[]);
  // Instrument WebGL draw work, not appearance: reduced motion gets one static frame.
  await page.evaluate(()=>{
   window.draws=0;const gl=new Proxy({createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,drawArrays:()=>window.draws++},{get:(obj,k)=>obj[k]||(()=>0)});
   const canvas=document.getElementById('gx-wave-canvas');canvas.getContext=()=>gl;
  });
  await page.addScriptTag({content:file('assets/js/ayuda/06-wave-background.js')});
  await page.waitForFunction(()=>window.draws===1);
  await page.waitForTimeout(140);assert.equal(await page.evaluate(()=>window.draws),1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>window.draws>3);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);const current=await page.evaluate(()=>window.draws);
  await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.draws),current);
  console.log(name+': contextual routes, session isolation, no stale navigation and reduced-motion frame budget OK');
 }finally{await browser.close()}
}
}finally{await new Promise(resolve=>server.close(resolve))}
