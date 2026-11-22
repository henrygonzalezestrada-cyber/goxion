/* GOXION adaptive upper nav LAB smoke. Run from repo root:
   node preview/experiencia-mi-espacio-inteligente/check-adaptive-nav.mjs
   Requires installed Playwright browsers. This file is a test, not production code. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';

const dir='preview/experiencia-mi-espacio-inteligente/';
const html=readFileSync(dir+'morph-v2.html','utf8');
const js=readFileSync(dir+'adaptive-top-nav.js','utf8');
const css=readFileSync(dir+'adaptive-top-nav.css','utf8');
assert.match(html,/id="gxn-top"/);
assert.match(html,/id="gxn-nav"/);
assert.equal((html.match(/<nav\b/g)||[]).length,1,'Only one navigation DOM is allowed');
assert.match(html,/id="gxn-profile-trigger"/);
assert.match(html,/data-gxn-target="space"/);
assert.match(html,/data-gxn-target="catalog"/);
assert.match(html,/data-gxn-target="support"/);
assert.match(js,/frame=requestAnimationFrame\(tick\)/);
assert.match(js,/const RANGE=158, SNAP_IDLE_MS=175/);
assert(!/setDocked\(|dataset\.docked|\.cloneNode\(/.test(js),'The same nav must morph without a dock swap');
assert.match(js,/addEventListener\('scroll',scheduleScroll,\{passive:true\}\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert(!/localStorage|sessionStorage|fetch\(/.test(js),'No client data or backend in the lab');
assert.match(html,/--gx-close-disc:35px;--gx-close-x:16px/);
new Function(js);
for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
 if(script.trim())new Function(script);
}
const port=4276,base='http://127.0.0.1:'+port+'/'+dir+'morph-v2.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){
 for(let i=0;i<80;i++){
  try{if((await fetch(base)).ok)return}catch{}
  await sleep(130);
 }
 throw new Error('Preview server unavailable');
}
async function exercise(name,engine){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/fonts.googleapis.com/**',r=>r.abort());
   await page.route('**/fonts.gstatic.com/**',r=>r.abort());
   await page.goto(base,{waitUntil:'domcontentloaded'});
   const nav=page.locator('#gxn-nav'),slot=page.locator('#gxn-nav-slot');
   const original=await nav.boundingBox(),slotRect=await slot.boundingBox();
   assert(original&&slotRect,'The real nav and its original slot must be measurable');
   assert(Math.abs(original.x-slotRect.x)<2&&Math.abs(original.y-slotRect.y)<2,
    'At origin the SAME capsule must align with its flow slot');
   assert.equal(await page.locator('nav').count(),1);
   assert.equal(await page.locator('[data-gxn-target]').count(),3);
   const stageHeight=await page.locator('#gxn-stage').evaluate(el=>el.getBoundingClientRect().height);
   await page.evaluate(()=>window.scrollTo(0,105));
   await page.waitForTimeout(900);
   assert.equal(await nav.getAttribute('data-nav-label'),'off');
   assert(Math.abs(await page.evaluate(()=>window.scrollY)-105)<1,'Do not snap the page scroll');
   const compact=await page.evaluate(()=>{
    const pill=document.getElementById('gxn-nav'),brand=document.querySelector('.gxn-brand');
    const b=pill.getBoundingClientRect(), css=getComputedStyle(pill);
    return {
     width:b.width,height:b.height,left:b.left,top:b.top,
     glass:css.backgroundColor,blur:css.backdropFilter||css.webkitBackdropFilter,
     logoOpacity:parseFloat(getComputedStyle(brand).opacity),
     circles:[...pill.querySelectorAll('.gxn-tab')].map(el=>{
      const r=el.getBoundingClientRect(), c=getComputedStyle(el);
      return {w:r.width,h:r.height,radius:parseFloat(c.borderTopLeftRadius)};
     })
    };
   });
   assert(compact.width<=185&&compact.width>=155,'Compact pill should be 155–185px');
   assert(compact.height<=60,'No surrounding toolbar');
   assert(compact.top>=0&&compact.top<=50,'Capsule settles in the top corner');
   assert(Math.abs(compact.left-slotRect.x)<4,'Capsule aligns with content left edge');
   assert(compact.logoOpacity<.05,'The logo yields to the SAME capsule');
   assert(compact.circles.every(c=>Math.abs(c.w-c.h)<1.2&&c.radius>=c.h/2-1),
    'All compact destinations must remain circles');
   assert(/rgba/.test(compact.glass)&&!/0\.84/.test(compact.glass),'Approved translucent material');
   assert(/blur/.test(compact.blur),'Glass blur must be visible');
   await page.evaluate(()=>window.scrollTo(0,720));
   await page.waitForTimeout(400);
   await page.evaluate(()=>window.scrollTo(0,615));
   await page.waitForTimeout(700);
   const expanded=await nav.boundingBox();
   assert(expanded.width>compact.width+30,'Reverse scroll expands the SAME navigation');
   assert.equal(await page.locator('[data-gxn-target]').count(),3);
   assert.equal(await page.locator('#gxn-stage').evaluate(el=>el.getBoundingClientRect().height),stageHeight);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForTimeout(750);
   const restored=await nav.boundingBox(),home=await slot.boundingBox();
   assert(Math.abs(restored.x-home.x)<2&&Math.abs(restored.y-home.y)<2,
    'Nav returns to its actual original position');
   await page.locator('#gxn-profile-trigger').click();
   assert.equal(await page.locator('#gxn-profile-menu').evaluate(el=>el.hidden),false);
   await page.locator('#gxn-profile-open').click();
   assert.equal(await page.locator('#gxn-profile-editor').evaluate(el=>el.hidden),false);
   await page.locator('#gxn-profile-trigger').click();
   await page.locator('#gxn-bell').click();
   assert.equal(await page.locator('#gxn-notice-menu').evaluate(el=>el.hidden),false);
   await page.locator('#gxn-notice-close').click();
   await page.locator('[data-gxn-target="catalog"]').click();
   assert.equal(await page.locator('[data-gxn-target="catalog"]').getAttribute('aria-current'),'page');
   await page.locator('[data-gxn-target="support"]').click();
   assert.equal(await page.locator('#gxn-support-dialog').evaluate(el=>el.open),true);
   await page.locator('#gxn-support-dialog [data-gxn-close-dialog]').click();
   assert.equal(await page.locator('[data-gxn-target="catalog"]').getAttribute('aria-current'),'page');
   await page.locator('[data-gxn-target="space"]').click();
   await page.waitForTimeout(750);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert(overflow<=1,'Horizontal overflow '+overflow+'px at '+width);
   assert.deepEqual(errors,[],name+'/'+width+' page errors');
   await page.close();
   console.log('Adaptive nav '+name+'/'+width+' PASS');
  }
 }finally{await browser.close()}
}
try{
 await waitForServer();
 await exercise('Chromium',chromium);
 await exercise('WebKit',webkit);
 console.log('Adaptive nav physical-browser smoke PASS');
}finally{server.kill('SIGTERM')}
