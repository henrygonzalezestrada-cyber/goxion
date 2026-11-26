// Block G: actual Ayuda/Mi Espacio markup, no client session or external network.
// The old implementation fails the stalled .finished and reduced-motion cases.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, webkit } from 'playwright';

const port=4187, origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
  env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate, description, timeout=2500){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(await predicate())return;
    await sleep(50);
  }
  throw new Error('Timeout: '+description);
}
async function state(page){
  return page.evaluate(()=>{
    const root=document.getElementById('header-action-btn');
    const content=root.querySelector('.gx-auth-inline-content');
    return {
      expanded:root.getAttribute('aria-expanded'),
      overlay:document.getElementById('auth-overlay').classList.contains('show'),
      visible:root.classList.contains('gx-auth-login-visible'),
      flipped:root.classList.contains('gx-auth-flip-card'),
      contentOpacity:getComputedStyle(content).opacity,
      parentRestored:root.parentNode===window.__gAuthParent,
      style:root.getAttribute('style'),
      placeholders:document.querySelectorAll('.gx-auth-pill-placeholder').length,
      chat:document.querySelectorAll('.gxai-chat-layer.gxai-visible').length,
      session:!!localStorage.getItem(window.GOXION_CORE.STORAGE.CLIENT_TOKEN),
      width:root.getBoundingClientRect().width,
      height:root.getBoundingClientRect().height
    };
  });
}
async function checkOpen(page,closed){
  await waitFor(async()=>{const v=await state(page);return v.expanded==='true'&&v.visible&&v.overlay&&v.flipped&&v.contentOpacity==='1'},'login opened and committed');
  const v=await state(page);
  assert.equal(v.placeholders,1);assert.equal(v.parentRestored,false);
  assert.ok(v.width>closed.width+80,'Card has real final geometry');
  assert.ok(v.height>closed.height+100,'Card has real final height');
  assert.equal(v.chat,0);assert.equal(v.session,false);
}
async function checkClosed(page,closed){
  await waitFor(async()=>{const v=await state(page);return v.expanded==='false'&&!v.visible&&!v.overlay&&!v.flipped&&v.placeholders===0&&v.parentRestored},'login closed and restored');
  const v=await state(page);
  assert.equal(v.style,closed.style);
  assert.ok(Math.abs(v.width-closed.width)<=3&&Math.abs(v.height-closed.height)<=3,'Restore the same capsule geometry');
  assert.equal(v.chat,0);assert.equal(v.session,false);
}
async function run(browser,engine,mode,path){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const aiRequests=[];
  try{
    // Every external request is intercepted, never sent to API/AI/CDN; no real account.
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(url.startsWith(origin+'/'))return route.continue();
      if(/functions\/v1\/(goxy-ai|login-goxion)/.test(url))aiRequests.push(url);
      return route.abort();
    });
    await page.goto(origin+'/'+path,{waitUntil:'load'});
    await waitFor(()=>page.evaluate(()=>typeof window.openAuthSheet==='function'&&typeof window.closeAuthSheet==='function'&&!!window.GOXION_CORE),'auth script loaded',8000);
    await page.evaluate(()=>{
      const root=document.getElementById('header-action-btn');window.__gAuthParent=root.parentNode;
    });
    const initial=await state(page);
    assert.equal(initial.expanded,'false');assert.equal(initial.session,false);
    if(mode==='stalled'){
      await page.evaluate(()=>{
        const native=Element.prototype.animate;
        window.__gStalls=0;
        Element.prototype.animate=function(...args){
          const anim=native.apply(this,args);
          if(this.id==='header-action-btn'||this.classList.contains('gx-auth-inline-content')){
            window.__gStalls++;
            Object.defineProperty(anim,'finished',{configurable:true,value:new Promise(()=>{})});
          }
          return anim;
        };
      });
    }
    if(mode==='no-waapi')await page.evaluate(()=>{Element.prototype.animate=undefined});
    if(mode==='raf-stall')await page.evaluate(()=>{
      const native=window.requestAnimationFrame;window.__gRafStalls=0;
      window.requestAnimationFrame=cb=>{window.__gRafStalls++;return -1};
      window.__gRestoreRaf=()=>{window.requestAnimationFrame=native};
    });
    // Exercise actual guest Goxy click on normal path; other cases call same modal.
    if(mode==='normal'){
      await page.evaluate(()=>window.switchTab('soporte'));
      const goxy=page.locator('#smart-support-card.gxai-card .gxai-open');
      await waitFor(()=>goxy.count().then(n=>n===1),'Goxy visitor entry',8000);
      await goxy.evaluate(button=>button.click());
    }else{
      await page.evaluate(()=>{window.openAuthSheet()});
    }
    await checkOpen(page,initial);
    await page.evaluate(()=>{window.closeAuthSheet()});
    await checkClosed(page,initial);
    // Explicit reopen and close detect any stale gxAuthBusy, placeholders or timers.
    await page.evaluate(()=>{window.openAuthSheet()});
    await checkOpen(page,initial);
    if(mode==='stalled'){
      assert.ok(await page.evaluate(()=>window.__gStalls>=4),'actually injected unresolved WAAPI promises');
      // Start recovery resizing and close: stale work may not touch the restored capsule.
      await page.evaluate(()=>{window.openPinRecovery()});
      await sleep(75);
    }
    await page.evaluate(()=>{window.closeAuthSheet()});
    await checkClosed(page,initial);
    if(mode==='raf-stall'){
      assert.ok(await page.evaluate(()=>window.__gRafStalls>0),'actually suspended RAF');
      await page.evaluate(()=>window.__gRestoreRaf());
    }
    await sleep(550);
    await checkClosed(page,initial);
    assert.deepEqual(aiRequests,[],'Guest must not attempt AI/login requests');
    console.log(engine+' '+path+' '+mode+': PASS');
  }finally{await page.close();}
}
try{
  await waitFor(async()=>{try{return (await fetch(origin+'/ayuda.html')).ok}catch{return false}},'local preview',8000);
  const engines=process.env.GX_BLOCK_G_CHROMIUM_EXECUTABLE
    ? [['Chromium',chromium,{executablePath:process.env.GX_BLOCK_G_CHROMIUM_EXECUTABLE}]]
    : [['Chromium',chromium,{}],['WebKit',webkit,{}]];
  for(const [name,engine,options] of engines){
    const browser=await engine.launch({headless:true,...options});
    try{
      // Both approved surfaces use the same controller.
      await run(browser,name,'normal','ayuda.html');
      await run(browser,name,'normal','ayuda-espejo-feed-v2.html');
      await run(browser,name,'stalled','ayuda-espejo-feed-v2.html');
      await run(browser,name,'reduced','ayuda-espejo-feed-v2.html');
      await run(browser,name,'no-waapi','ayuda-espejo-feed-v2.html');
      if(name==='WebKit')await run(browser,name,'raf-stall','ayuda-espejo-feed-v2.html');
    }finally{await browser.close();}
  }
}finally{server.kill('SIGTERM')}
