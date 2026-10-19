import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4832,base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['preview/b4-rewards-railway/server.mjs'],{
  env:{...process.env,PORT:String(port),GX_B4_DATA_DIR:'/tmp/goxion-b4-ci-'+process.pid},
  stdio:['ignore','pipe','pipe']
});
let last='';child.stderr.on('data',d=>last+=d.toString());child.stdout.on('data',d=>last+=d.toString());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await sleep(150)}
 throw Error('B4 server never started: '+last);
}
function httpClient(){
 let cookie='';
 return {
  async get(){const r=await fetch(base+'/api/b4/state',{headers:{cookie}});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return (await r.json()).state},
  async act(type,extra={}){
   const r=await fetch(base+'/api/b4/action',{method:'POST',
    headers:{'content-type':'application/json',cookie},body:JSON.stringify({type,...extra})});
   cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;
   return {status:r.status,...await r.json()}
  }
 }
}
async function apiChecks(){
 const redirect=await fetch(base+'/preview/experiencia-b3-goxy-gixys/goxy-handoff.html',{redirect:'manual'});
 assert.equal(redirect.status,302);
 assert.equal(redirect.headers.get('location'),'https://henrygonzalezestrada-cyber.github.io/goxion/ayuda.html');
 const x=httpClient(),y=httpClient();
 let s=await x.get();
 assert.equal(s.streak,3);
 assert.equal(s.quote.paid,false);
 assert.equal(s.coupon,null);
 assert.equal((await x.act('touch',{kind:'notification'})).status,409);
 assert.equal((await x.act('milestone')).state.events.loyalty,true);
 assert.equal((await x.act('notification')).state.events.notification,true);
 assert.equal((await x.act('mission')).state.events.mission,true);
 for(const kind of ['notification','notification','loyalty','mission']){
   const r=await x.act('touch',{kind});assert.equal(r.ok,true);
 }
 s=await x.get();
 assert.deepEqual(s.touched,['notification','loyalty','mission']);
 assert.equal(s.coupon.startPeriod,0);
 assert.equal(s.coupon.status,'reserved');
 assert.equal(s.quote.secret,790); // 5% of eligible Netflix $109 + ViX $49
 assert.equal(s.quote.loyalty,474); // 3% of the same eligible base
 assert.equal(s.quote.mission,800);
 assert.equal(s.quote.personal,500);
 assert.equal((await x.act('promo',{active:true})).state.quote.secret,245);
 assert.equal((await x.act('promo',{active:false})).state.quote.secret,790);
 s=(await x.act('pay')).state;
 assert.equal(s.quote.paid,true);
 assert.equal(s.coupon.status,'used');
 assert.equal(s.history[0].secret,790);
 assert.equal((await x.act('pay')).status,409);
 assert.equal((await x.act('touch',{kind:'mission'})).state.coupon.status,'used');
 s=(await x.act('next')).state;
 assert.equal(s.period,1);assert.equal(s.quote.secret,0);
 assert.equal((await y.get()).coupon,null,'separate demo sessions must be isolated');
 await y.act('pay');await y.act('next');
 // Mark the next period paid and then discover: coupon reserved beyond payment.
 await y.act('notification');await y.act('milestone');await y.act('mission');
 for(const kind of ['notification','loyalty','mission'])await y.act('touch',{kind});
 s=await y.get();assert.equal(s.coupon.startPeriod,1);
 assert.equal(s.coupon.status,'reserved');
 assert(s.quote.secret>0);
 const z=httpClient();await z.get();
 await z.act('pay'); // current already paid
 await z.act('notification');await z.act('milestone');await z.act('mission');
 for(const kind of ['mission','notification','loyalty'])await z.act('touch',{kind});
 s=await z.get();assert.equal(s.coupon.startPeriod,1);
 assert.equal(s.quote.secret,0);
 assert(s.nextQuote.secret>0);
 assert.equal((await z.act('next')).state.quote.secret,790);
 assert.equal((await z.act('reset')).state.coupon,null);
 console.log('B4 API PASS: unique reward, period, stacking, exclusions, 3 sessions, replays');
}
async function browserChecks(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page=await context.newPage(),errors=[],privateRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/supabase.co|discord.com|goxy-ai-beta|auth\/v1|rest\/v1/i.test(r.url()))
    privateRequests.push(r.url())});
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR?.getState()?.demo
   &&window.GOXION_B3_ROUTER?.isolated,{timeout:22000});
  await page.waitForSelector('#gx-b4-account');
  // The page is built from official ayuda.html, not a hand-drawn V9 subset.
  assert.equal(await page.locator('html[data-gx-b4-official="true"]').count(),1);
  assert.equal(await page.locator('#view-inicio').count(),1);
  assert.equal(await page.locator('#view-catalogo').count(),1);
  assert.equal(await page.locator('#view-soporte').count(),1);
  assert.equal(await page.locator('#gx-promo-showcase').count(),1);
  assert.equal(await page.locator('#support-platforms-grid .gx-b4-support-choice').count(),4);
  assert.equal(await page.locator('#dash-billing-card').count(),1);
  await page.locator('#btn-tab-catalogo').click();
  assert.equal(await page.locator('#view-catalogo').isVisible(),true,
    'Native official catalogue tab must navigate');
  assert.equal(await page.locator('#catalog-container .gx-b4-official-product').count(),4);
  await page.locator('#btn-tab-soporte').click();
  assert.equal(await page.locator('#view-soporte').isVisible(),true,
    'Native official support tab must navigate');
  await page.locator('#btn-tab-inicio').click();
  assert.equal(await page.locator('#view-dashboard').isVisible(),true,
    'Native official Mi Espacio tab must navigate');
  assert.equal(await page.locator('#gx-gixys-message-root').count(),1);
  const banner=await page.locator('#gx-b4-account').textContent();
  assert(banner.includes('Espejo funcional'));
  for(const width of [280,320,360,375,390,430,768]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(100);
   const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}));
   assert(dims.sw<=dims.w+2,name+' horizontal overflow '+width+' '+JSON.stringify(dims));
  }
  await page.setViewportSize({width:390,height:844});
  // First simulate alert and interact with the native V7 Plastic Gixy.
  await page.locator('#gx-b3-toggle').click();
  await page.locator('#gx-b4-controls [data-b4-action="notification"]').click();
  await page.locator('.gx-gixy-message[data-kind="notification"].is-visible').waitFor({timeout:8500});
  await page.waitForFunction(()=>!document.querySelector('.gx-gixy-message__avatar')?.disabled,{timeout:9000});
  // V7 already verifies hit-target geometry; WebKit's continuously animated
  // canvas can keep Playwright's auto-wait action from becoming "stable".
  // Dispatch the native button click for the event-flow test on WebKit.
  const notificationAvatar=page.locator('.gx-gixy-message[data-kind="notification"] .gx-gixy-message__avatar');
  if(name==='WebKit')await notificationAvatar.evaluate(el=>el.click());
  else await notificationAvatar.click();
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR.getState()?.touched?.includes('notification'),{timeout:5000});
  await page.waitForTimeout(450);
  // Historical payment approval authorizes the real V9 heart transition.
  await page.locator('#gx-b3-toggle').click();
  await page.locator('#gx-b4-controls [data-b4-action="milestone"]').click();
  await page.locator('.gx-gixy-message[data-kind="loyalty"].is-visible').waitFor({timeout:7000});
  await page.waitForFunction(()=>!document.querySelector('.gx-gixy-message[data-kind="loyalty"] .gx-gixy-message__avatar')?.disabled,{timeout:9000});
  // V7 already verifies hit-target geometry; WebKit's continuously animated
  // canvas can keep Playwright's auto-wait action from becoming "stable".
  // Dispatch the native button click for the event-flow test on WebKit.
  const loyaltyAvatar=page.locator('.gx-gixy-message[data-kind="loyalty"] .gx-gixy-message__avatar');
  if(name==='WebKit')await loyaltyAvatar.evaluate(el=>el.click());
  else await loyaltyAvatar.click();
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR.getState()?.touched?.includes('loyalty'),{timeout:5000});
  await page.waitForTimeout(450);
  await page.locator('#gx-b3-toggle').click();
  await page.locator('#gx-b4-controls [data-b4-action="mission"]').click();
  await page.locator('.gx-gixy-message[data-kind="mission"].is-visible').waitFor({timeout:9500});
  await page.waitForFunction(()=>!document.querySelector('.gx-gixy-message[data-kind="mission"] .gx-gixy-message__avatar')?.disabled,{timeout:9000});
  // V7 already verifies hit-target geometry; WebKit's continuously animated
  // canvas can keep Playwright's auto-wait action from becoming "stable".
  // Dispatch the native button click for the event-flow test on WebKit.
  const missionAvatar=page.locator('.gx-gixy-message[data-kind="mission"] .gx-gixy-message__avatar');
  if(name==='WebKit')await missionAvatar.evaluate(el=>el.click());
  else await missionAvatar.click();
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR.getState()?.coupon?.status==='reserved',{timeout:7000});
  const s=await page.evaluate(()=>window.GOXION_B4_MIRROR.getState());
  assert.deepEqual(s.touched,['notification','loyalty','mission']);
  assert.equal(s.quote.secret,790);assert.equal(s.quote.loyalty,474);
  await page.locator('.gx-account-capsule').click();
  await page.locator('#gx-b4-account-sheet:not([hidden])').waitFor();
  const financialBreakdown=await page.locator('#gx-b4-account-lines').textContent();
  assert(financialBreakdown.includes('5% × $158.00'), 'must show base $158 x 5%');
  assert(financialBreakdown.includes('−$7.90'), '5% secret must deduct $7.90');
  assert(financialBreakdown.includes('Descuento especial ficticio'), 'separate $5 special');
  await page.locator('#gx-b4-account-sheet [data-b4-action="close-statement"]').last().click();
  // The original Aurora gift remains, but its copy states demo truthfully.
  await page.locator('.gx-gixys-secret--v9').waitFor({timeout:8000});
  const gift=await page.locator('.gx-gixys-secret--v9').textContent();
  assert(gift.includes('espejo de pruebas')||gift.includes('cupón de prueba'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR?.getState()?.coupon?.status==='reserved',{timeout:10000});
  assert.equal(await page.locator('.gx-gixys-secret--v9').count(),0,'no new reward on refresh');
  await page.locator('.gx-account-capsule').click();
  await page.locator('#gx-b4-account-sheet:not([hidden])').waitFor({timeout:2000});
  assert((await page.locator('#gx-b4-account-lines').textContent()).includes('Cupón Gixys: 5% × $158.00'));
  await page.locator('#gx-b4-payment-in-statement').click();
  await page.waitForFunction(()=>window.GOXION_B4_MIRROR.getState()?.coupon?.status==='used',{timeout:4500});
  assert.equal((await page.evaluate(()=>window.GOXION_B4_MIRROR.getState().quote.paid)),true);
  assert.equal(privateRequests.length,0,'private requests '+privateRequests.join(','));
  assert.deepEqual(errors,[],name+' JS errors '+errors.join('; '));
  console.log(name+' B4 MIRROR PASS: official-like V7, mission, loyalty, coupon, payment, restore, 7 widths');
 }finally{await browser.close()}
}
await ready();
try{
 await apiChecks();
 if(process.env.GX_B4_API_ONLY!=='1'){
  await browserChecks(chromium,'Chromium');
  await browserChecks(webkit,'WebKit');
 }
}catch(err){
 console.error('[B4 TEST SERVER LOG] '+last.slice(-4000));throw err;
}finally{child.kill()}
