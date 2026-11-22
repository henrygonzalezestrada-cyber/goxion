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
assert.match(js,/requestAnimationFrame\(updateScroll\)/);
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
   const bar=page.locator('#gxn-top');
   const stage=page.locator('#gxn-stage');
   const stageHeight=await stage.evaluate(el=>el.getBoundingClientRect().height);
   assert.equal(await page.locator('nav').count(),1);
   assert.equal(await bar.getAttribute('data-docked'),'false');
   assert.equal(await page.locator('[data-gxn-target]').count(),3);
   await page.evaluate(()=>window.scrollTo(0,730));
   await page.waitForFunction(()=>document.getElementById('gxn-top').dataset.docked==='true');
   assert.equal(await bar.getAttribute('data-size'),'compact');
   assert.equal(await page.locator('[data-gxn-target]').count(),3);
   await page.evaluate(()=>window.scrollTo(0,620));
   await page.waitForFunction(()=>document.getElementById('gxn-top').dataset.size==='expanded');
   assert.equal(await stage.evaluate(el=>el.getBoundingClientRect().height),stageHeight,
    'Do not shift the document when the dock changes state');
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
   await page.waitForFunction(()=>document.getElementById('gxn-top').dataset.docked==='false');
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
