import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4217,root='http://127.0.0.1:'+port+'/preview/experiencia-b3-goxy-gixys/';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
 env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<65;i++){try{if((await fetch(root+'index.html')).ok)return}catch{}await sleep(160)}
 throw Error('B3 mirror server unavailable');
}
async function verify(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  const privateRequests=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  page.on('request',r=>{if(/supabase.co|discord.com|groq|goxy-ai-beta|auth\/v1|rest\/v1/i.test(r.url()))privateRequests.push(r.url())});
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(root+'index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GOXION_GIXYS_ESPEJO_ENGINE?.shading==='plastic'
    &&window.GOXION_B3_ROUTER?.isolated,{timeout:14000});
  assert.equal(await page.locator('#gx-gixys-message-root').count(),1);
  assert.equal(await page.locator('#dash-billing-card').count(),1);
  assert.equal(await page.locator('#gx-b3-controls').evaluate(x=>x.hidden),true);
  assert.deepEqual(await page.evaluate(()=>window.GOXION_B3_ROUTER.stats()),{
   notification:0,loyalty:0,mission:0
  });
  assert.equal(await page.locator('.gx-gixy-message').count(),0,'Do not invent an event at page load');
  assert.equal(await page.locator('#gx-mirror-heart .pulse-heart').count(),1,'V9 original heart missing');
  for(const width of [280,320,360,375,390,430,768]){
   await page.setViewportSize({width,height:844});
   await page.waitForTimeout(80);
   const dims=await page.evaluate(()=>({
    sw:document.documentElement.scrollWidth,
    vw:document.documentElement.clientWidth,
    dashboard:document.querySelectorAll('#dash-billing-card').length
   }));
   assert(dims.sw<=dims.vw+2,name+' '+width+' overflow: '+JSON.stringify(dims));
   assert.equal(dims.dashboard,1,'Duplicate billing card');
  }
  await page.setViewportSize({width:390,height:844});
  // Demo event validation: malicious/early event does NOT summon a Gixy.
  assert.equal(await page.evaluate(()=>window.GOXION_B3_ROUTER.emit('loyalty',true)),false);
  assert.equal(await page.evaluate(()=>window.GOXION_B3_ROUTER.emit('mission',true)),false);
  assert.equal(await page.evaluate(()=>window.GOXION_B3_ROUTER.emit('notification',true)),false);
  assert.equal(await page.locator('.gx-gixy-message').count(),0);
  async function trial(kind){
   await page.locator('#gx-b3-toggle').click();
   await page.locator('[data-gx-b3-test="'+kind+'"]').click();
   await page.waitForFunction(type=>window.GOXION_B3_ROUTER.stats()[type]===1,
    kind,{timeout:8000});
   await page.locator('.gx-gixy-message[data-kind="'+kind+'"]').waitFor({timeout:7000});
   assert.equal(await page.locator('#gx-b3-controls').evaluate(x=>x.hidden),true,
    'Lab must close before Gixy appears');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.gxB3LastEvent),kind);
   assert.equal(await page.evaluate(type=>window.GOXION_B3_ROUTER.emit(type,true),kind),false,
    'Duplicate event should not summon the same Gixy');
  }
  await trial('notification');
  await page.locator('#gx-client-notif-launch').click(); // read, sends deactivation
  await page.locator('.gx-gixy-message').waitFor({state:'detached',timeout:4500});
  await trial('loyalty');
  await page.waitForTimeout(1500);
  // Gixy V9 already has a single scene; a new verified mission takes its place.
  await trial('mission');
  const card=await page.locator('#dash-billing-card').evaluate(el=>{
   const r=el.getBoundingClientRect();return [r.x,r.width]
  });
  assert(card[1]>180);
  const routed=await page.evaluate(()=>{
   const previous=window.open;let call;
   window.open=(...args)=>{call=args;return null};
   try{window.GOXION_B3_ROUTER.handoff()}finally{window.open=previous}
   return call;
  });
  assert.deepEqual(routed,['../../ayuda.html','_blank','noopener,noreferrer'],
   'Only the real Goxy Soporte may be opened, without customer data');
  assert.deepEqual(privateRequests,[],name+' private request in beta');
  assert.deepEqual(errors,[],name+' browser errors');
  await page.close();
  console.log(name+' E2/B3 PASS — V9 preserved, 7 widths, 3 real demo event transitions, Goxy handoff, 0 private calls');
 }finally{await browser.close()}
}
try{await ready();await verify(chromium,'Chromium');await verify(webkit,'WebKit');console.log('GOXION E2/B3 BETA PASS')}
finally{server.kill('SIGTERM')}
