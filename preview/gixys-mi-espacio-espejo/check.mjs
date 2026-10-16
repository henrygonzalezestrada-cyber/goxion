import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
const path='preview/gixys-mi-espacio-espejo/';
const built=fs.readFileSync(path+'index.html','utf8');
const official=fs.readFileSync('ayuda.html','utf8');
assert(built.includes('id="dash-billing-card"'),'Real billing card missing');
assert(built.includes('id="referral-section-container"'),'Real missions container missing');
assert(built.includes('id="goxion-main-nav"'),'Real navigation missing');
assert(built.includes('id="view-dashboard"'),'Real dashboard missing');
assert(built.includes('href="../../assets/css/ayuda.css"'),'Official CSS missing');
assert(!/src="[^"]*(?:client-supabase|financial-engine|goxy-ai|01e-client-dashboard)/i.test(built),'Production runtime included');
assert(!/\son[a-z]+\s*=/i.test(built),'Original event handlers must be stripped');
assert(!/(?:localStorage|X-Client-Token|anon_key|supabase-js)/i.test(built),'Client secrets or network runtime leaked');
assert(built.includes(official.slice(official.indexOf('<div class="view-section" id="view-dashboard">'),official.indexOf('<div class="view-section" id="view-dashboard">')+50)),'Official markup was not retained');
const port=4206,base='http://127.0.0.1:'+port+'/'+path+'index.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitReady(){for(let i=0;i<90;i++){try{if((await fetch(base)).ok)return;}catch{}await sleep(130);}throw Error('preview server not ready')}
async function exercise(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2});
  const errors=[],privateCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/supabase.co|groq|discord\.com|api\.whatsapp|wa\.me|notificaciones-cliente|acciones-financieras/i.test(r.url()))privateCalls.push(r.url());});
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.GOXION_GIXYS_ESPEJO_ENGINE?.shading==='plastic',{timeout:25000});
  assert.equal(await page.locator('#dash-billing-card').count(),1);
  assert.equal(await page.locator('.gx-gamif-card-mission').count(),1);
  assert.equal(await page.locator('#gx-mirror-heart .pulse-heart').count(),1);
  assert.equal(await page.locator('#gx-mirror-hex canvas').count(),1);
  assert.equal(await page.locator('#gx-mirror-circle canvas').count(),1);
  assert.equal(await page.locator('#gx-mirror-square canvas').count(),1);
  assert.equal(await page.locator('.gx-mirror-note').count(),1);
  assert.equal(await page.locator('#gx-client-notif-launch').count(),1);
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[],name+': beta accessed persistence');
  for(const width of [280,320,360,375,390,430,768]){
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(150);
    const m=await page.evaluate(()=>{
      const visible=[...document.querySelectorAll('#gx-mirror-hex canvas,#gx-mirror-circle canvas,#gx-mirror-square canvas')].map(c=>({
        width:c.width,css:c.getBoundingClientRect().width
      }));
      const card=document.getElementById('gx-mirror-mission-card');
      const text=card.querySelector('.gamif-title').getBoundingClientRect();
      const ava=document.getElementById('gx-mirror-hex').getBoundingClientRect();
      const overlap=Math.max(0,Math.min(text.right,ava.right)-Math.max(text.left,ava.left))
                  *Math.max(0,Math.min(text.bottom,ava.bottom)-Math.max(text.top,ava.top));
      return {viewport:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,overlap,visible};
    });
    assert(m.sw<=m.viewport+2,name+' '+width+': horizontal overflow '+m.sw+'/'+m.viewport);
    assert(m.overlap<25,name+' '+width+': Gixy covers mission text: '+m.overlap);
    assert(m.visible.every(v=>v.width/Math.max(1,v.css)>=1.5),name+' '+width+': blurry canvas: '+JSON.stringify(m.visible));
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#gx-client-notif-launch').click();
  assert.equal(await page.locator('#gx-client-notif-launch').getAttribute('aria-expanded'),'true');
  await page.waitForTimeout(450); // la cápsula real hace morph antes de revelar su contador en Safari
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'1');
  const badgeSize=await page.locator('#gx-client-notif-badge').evaluate(el=>el.getBoundingClientRect().width);
  assert(badgeSize>=18,name+': contador no visible tras el morph de la campana');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('gx-mirror-notif-active')),true);
  await page.locator('#gx-client-notif-launch').click();
  assert.equal(await page.locator('#gx-client-notif-launch').getAttribute('aria-expanded'),'false');
  await page.locator('#gx-mirror-heart .pulse-heart').click();
  assert.equal(await page.locator('#loyalty-count').innerText(),'4/4 Pagos');
  await page.locator('#gx-mirror-mission-card').click();
  await page.waitForTimeout(1200);
  await page.locator('#gx-mirror-complete-btn').click();
  assert.equal(await page.locator('#gx-mirror-mission-status').innerText(),'Recompensa lista · Simulación');
  assert.equal(await page.locator('#gx-mirror-complete-btn').isDisabled(),true);
  assert.equal(await page.locator('#gx-mirror-complete-btn .gx-mirror-action-icon').evaluate(el=>getComputedStyle(el).animationName),'gx-mirror-check-pop');
  await page.locator('#gx-mirror-retry').click();
  assert.equal(await page.locator('#gx-mirror-complete-btn').isEnabled(),true);
  await page.locator('#gx-mirror-close-missions').click();
  await page.waitForTimeout(900);
  assert.deepEqual(errors,[],name+': javascript runtime errors');
  assert.deepEqual(privateCalls,[],name+': attempt to access private endpoints');
  await page.close();
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.route('**/fonts.googleapis.com/**',r=>r.abort());
  await reduced.route('**/fonts.gstatic.com/**',r=>r.abort());
  await reduced.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await reduced.waitForFunction(()=>window.GOXION_GIXYS_ESPEJO_ENGINE?.shading==='plastic',{timeout:25000});
  await reduced.locator('#gx-client-notif-launch').click();
  assert.equal(await reduced.locator('#gx-client-notif-launch').getAttribute('aria-expanded'),'true');
  await reduced.close();
  console.log(name+' mirror original Ayuda + Gixys + mission morph + heart + bell + 7 widths PASS');
 }finally{await browser.close();}
}
try{await waitReady();await exercise(chromium,'Chromium');await exercise(webkit,'WebKit');console.log('GOXION Mi Espacio Gixys mirror PASS');}
finally{server.kill('SIGTERM');}
