/* GOXION centered sticky navigation LAB smoke. Run from repo root:
   node preview/experiencia-mi-espacio-inteligente/check-adaptive-nav.mjs
   Requires Playwright with Chromium + WebKit browsers installed. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';

const dir='preview/experiencia-mi-espacio-inteligente/';
const html=readFileSync(dir+'morph-v2.html','utf8');
const js=readFileSync(dir+'adaptive-top-nav.js','utf8');
const css=readFileSync(dir+'adaptive-top-nav.css','utf8');
const isOneNav=(html.match(/<nav\b/g)||[]).length===1;
assert(isOneNav,'Use exactly the same nav at every scroll position');
for(const id of ['gxn-nav','gxn-profile-trigger','gxn-bell'])assert(html.includes('id="'+id+'"'));
for(const target of ['space','catalog','support'])assert(html.includes('data-gxn-target="'+target+'"'));
assert(!html.includes('id="gxn-nav-slot"')&&!html.includes('id="gxn-nav-target"'));
assert.match(css,/position:sticky;top:calc\(8px \+ env\(safe-area-inset-top,0px\)\)/);
assert.match(css,/background:rgba\(8,8,12,.371\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(js,/addEventListener\('scroll',scheduleScroll,\{passive:true\}\)/);
assert.match(js,/setMode\('compact'\)/);
assert.match(js,/setMode\('expanded'\)/);
assert(!/dockGoal|paint\(\)|gxn-strip|setDocked\(|cloneNode|top\.offsetHeight/.test(js));
assert(!/localStorage|sessionStorage|fetch\(/.test(js),'No backend or profile storage in preview');
assert.match(html,/--gx-close-disc:35px;--gx-close-x:16px/);
new Function(js);
for(const [,src] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
 if(src.trim())new Function(src);
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
async function verify(name,engine){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/fonts.googleapis.com/**',r=>r.abort());
   await page.route('**/fonts.gstatic.com/**',r=>r.abort());
   await page.goto(base,{waitUntil:'domcontentloaded'});
   const nav=page.locator('#gxn-nav'),shell=page.locator('.shell');
   const shellBox=await shell.boundingBox(),initial=await nav.boundingBox();
   assert.equal(await nav.getAttribute('data-mode'),'expanded');
   assert.equal(await page.locator('nav').count(),1);
   assert.equal(await page.locator('[data-gxn-target]').count(),3);
   assert(Math.abs((initial.x+initial.width/2)-(shellBox.x+shellBox.width/2))<2,'Initial capsule must be centered');
   const originalPosition=initial.y;
   const remaining=await page.evaluate(()=>{
    const el=document.getElementById('gxn-nav');const cs=getComputedStyle(el);
    return {position:cs.position,background:cs.backgroundColor,blur:cs.backdropFilter||cs.webkitBackdropFilter,
      height:el.getBoundingClientRect().height,marginBottom:parseFloat(cs.marginBottom)};
   });
   assert.equal(remaining.position,'sticky');
   assert(/rgba/.test(remaining.background)&&/blur/.test(remaining.blur),'Approved crystal material');
   await page.evaluate(()=>window.scrollTo(0,450));
   await page.waitForFunction(()=>document.getElementById('gxn-nav').dataset.mode==='compact');
   await page.waitForTimeout(460);
   const compact=await page.evaluate(()=>{
    const nav=document.getElementById('gxn-nav'),box=nav.getBoundingClientRect(),cs=getComputedStyle(nav);
    const buttons=[...nav.querySelectorAll('.gxn-tab')].map(el=>{
      const b=el.getBoundingClientRect(),style=getComputedStyle(el);
      return {width:b.width,height:b.height,radius:parseFloat(style.borderTopLeftRadius)};
    });
    return {left:box.left,top:box.top,width:box.width,height:box.height,marginBottom:parseFloat(cs.marginBottom),buttons};
   });
   assert(compact.top>=0&&compact.top<40,'Sticky capsule stays at top');
   assert(compact.width<=174,'Compact capsule is genuinely smaller');
   assert(Math.abs((compact.left+compact.width/2)-(shellBox.x+shellBox.width/2))<2,'Compact capsule remains centered');
   assert(compact.buttons.every(x=>Math.abs(x.width-x.height)<=1&&x.width>=44&&x.radius>=x.width/2-1),
    'Every compact option is a true round target of at least 44px');
   assert(Math.abs((compact.height+compact.marginBottom)-(remaining.height+remaining.marginBottom))<=1.5,
    'Compaction must not shift the feed content');
   const topControls=await page.evaluate(()=>{
    const bell=document.getElementById('gxn-bell'),logo=document.querySelector('.gxn-wordmark');
    return {bellRight:bell.getBoundingClientRect().right,logoBottom:logo.getBoundingClientRect().bottom};
   });
   assert(topControls.logoBottom<0,'Logo scrolls away without being duplicated in the sticky pill');
   assert(topControls.bellRight>0);
   await page.evaluate(()=>window.scrollTo(0,340));
   await page.waitForFunction(()=>document.getElementById('gxn-nav').dataset.mode==='expanded');
   await page.waitForTimeout(460);
   const afterReverse=await nav.boundingBox();
   assert(afterReverse.width>compact.width+30,'Reverse gesture expands the same centered capsule');
   assert(Math.abs((afterReverse.x+afterReverse.width/2)-(shellBox.x+shellBox.width/2))<2);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForTimeout(460);
   assert.equal(await nav.getAttribute('data-mode'),'expanded');
   const restored=await nav.boundingBox();
   assert(Math.abs(restored.y-originalPosition)<2,'Returning to top restores original location');
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
   await page.waitForTimeout(450);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert(overflow<=1,'No horizontal overflow at '+width);
   assert.deepEqual(errors,[],name+' '+width+' page errors');
   await page.close();
   console.log('Centered sticky nav '+name+'/'+width+' PASS');
  }
 }finally{await browser.close()}
}
try{
 await waitForServer();
 await verify('Chromium',chromium);
 await verify('WebKit',webkit);
 console.log('GOXION centered sticky capsule browser smoke PASS');
}finally{server.kill('SIGTERM')}
