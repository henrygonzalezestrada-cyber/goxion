import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4217,root='http://127.0.0.1:'+port+'/preview/experiencia-b3-goxy-gixys/';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
 env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<70;i++){try{if((await fetch(root+'index.html')).ok)return}catch{}await sleep(170)}
 throw Error('B3 mirror unavailable');
}
async function verify(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  const errors=[],privateRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/supabase.co|discord.com|groq|goxy-ai-beta|auth\/v1|rest\/v1/i.test(r.url()))
   privateRequests.push(r.url())});
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(root+'index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GOXION_GIXYS_ESPEJO_ENGINE?.shading==='plastic'
   &&window.GOXION_B3_ROUTER?.isolated
   &&window.GOXION_B3_PRIORITY?.usesE1B1PriorityEngine
   &&window.GOXION_SMART_NOTICE?.isolated,{timeout:16000});
  assert.equal(await page.locator('#dash-billing-card').count(),1,'No cloned main card');
  assert.equal(await page.locator('#gx-gixys-message-root').count(),1,'Gixys V9 remains mounted');
  assert.equal(await page.locator('.gx-gixy-message').count(),0,'No unearned Gixy');
  assert.equal(await page.locator('#gx-b3-controls').evaluate(el=>el.hidden),true);
  assert.deepEqual(await page.evaluate(()=>window.GOXION_B3_ROUTER.stats()),
    {notification:0,loyalty:0,mission:0});
  assert.equal(await page.locator('#gx-mirror-heart .pulse-heart').count(),1);
  assert.equal(await page.locator('#gx-smart-notif-sheet').count(),1);
  assert.equal(await page.locator('.gx-smart-notice-surface').count(),0);
  assert.equal(await page.locator('#gx-smart-toggle').evaluate(el=>el.hidden),true);
  assert.equal(await page.evaluate(()=>window.GOXION_GIXYS_ESPEJO_ENGINE.smoothPortalScrollV3),true);
  const source=fs.readFileSync('preview/experiencia-b3-goxy-gixys/src/companions.jsx','utf8');
  assert(source.includes("circle:'#ff83ab'")&&source.includes("hexagon:'#8663ff'"));
  for(const width of [280,320,360,375,390,430,768]){
   await page.setViewportSize({width,height:844});
   await page.waitForTimeout(100);
   const dim=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,bills:document.querySelectorAll('#dash-billing-card').length}));
   assert(dim.scroll<=dim.width+2,name+' '+width+' horizontal overflow '+JSON.stringify(dim));
   assert.equal(dim.bills,1);
   const positions=await page.evaluate(()=>{
     const h=document.getElementById('dynamic-greeting-text'),b=document.getElementById('dash-billing-card');
     const original=h.innerHTML;
     h.innerHTML='¡Hola, Cliente! 👋';const one=b.getBoundingClientRect().top;
     h.innerHTML='¡Hola,<span style="display:block">Cliente! 👋</span>';
     const two=b.getBoundingClientRect().top;
     h.innerHTML=original;return {one,two};
   });
   assert(Math.abs(positions.one-positions.two)<1,
      name+' '+width+' two-line greeting moved card: '+JSON.stringify(positions));
  }
  await page.setViewportSize({width:390,height:844});
  // A malicious/early event must not summon a Gixy.
  for(const k of ['notification','loyalty','mission'])
   assert.equal(await page.evaluate(kind=>window.GOXION_B3_ROUTER.emit(kind,true),k),false);
  // Ordinary notices must not interrupt the customer's financial hero.
  for(const code of ['soon','clear']){
   await page.locator('#gx-b3-toggle').click();
   await page.locator('[data-gx-b3-priority="'+code+'"]').click();
   assert.equal(await page.evaluate(c=>window.GOXION_B3_PRIORITY.scenarios[c].important,code),false);
   assert.equal(await page.locator('.gx-smart-notice-surface').count(),0);
   assert.equal(await page.locator('.gx-gixy-message').count(),0);
  }
  async function testPriority(code,wantsGixy){
   const before=await page.evaluate(()=>window.GOXION_B3_ROUTER.stats().notification);
   await page.locator('#gx-b3-toggle').click();
   await page.locator('[data-gx-b3-priority="'+code+'"]').click();
   await page.locator('.gx-smart-notice-surface.gx-smart-notice-visible').waitFor({timeout:5000});
   assert.equal(await page.locator('.gx-smart-notice-surface').count(),1,
    'One existing B1 optical overlay, never a second card');
   await page.waitForFunction(c=>window.GOXION_B3_PRIORITY.played().includes('demo:'+c)
     &&!window.GOXION_B3_PRIORITY.inProgress(),code,{timeout:14000});
   assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'1');
   assert.equal(await page.locator('#gx-smart-notif-list .gx-client-notif-item').count(),1);
   const decision=await page.evaluate(c=>window.GOXION_B3_PRIORITY.scenarios[c],code);
   assert.equal(decision.important,true);
   assert.equal(await page.evaluate(c=>window.GOXION_B3_PRIORITY.eligible(c),code),false);
   const after=await page.evaluate(()=>window.GOXION_B3_ROUTER.stats().notification);
   assert.equal(after,wantsGixy?before+1:before,
    code+' Gixy mismatch: extra/absent character');
   if(wantsGixy){
    await page.locator('.gx-gixy-message[data-kind="notification"].is-visible').waitFor({timeout:6000});
    const geometry=await page.evaluate(()=>{
      const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();
        return r?{left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),
          width:Math.round(r.width),height:Math.round(r.height)}:null};
      return {gixy:box('.gx-gixy-message[data-kind="notification"]'),bell:box('#gx-client-notif-launch'),
        header:box('.app-header'),logo:box('.app-logo'),notice:box('.gx-mirror-note'),
        nav:box('#goxion-main-nav'),greeting:box('#dynamic-greeting-text'),
        placement:document.querySelector('.gx-gixy-message[data-kind="notification"]')?.dataset.placement,
        noteVisibility:getComputedStyle(document.querySelector('.gx-mirror-note')).visibility};
    });
    // A notification must appear close to its own bell, not the greeting.
    // The optional Goxy action must remain fully tappable without covering nav.
    if(geometry.gixy && geometry.bell && page.viewportSize().width>=320){
      assert.equal(await page.locator('.gx-gixy-message[data-kind="notification"]').evaluate(el=>el.classList.contains('gx-b3-near-bell')),true,
        name+' '+code+' should choose the bell-local slot: '+JSON.stringify(geometry));
      assert(geometry.gixy.top>=geometry.bell.bottom+2 &&
        geometry.gixy.top<=geometry.bell.bottom+28,
        name+' '+code+' Gixy too far from bell: '+JSON.stringify(geometry));
      assert(geometry.gixy.bottom+4<=geometry.nav.top,
        name+' '+code+' Gixy overlaps navigation: '+JSON.stringify(geometry));
    }
    console.log('B3 V5 BELL DISTANCE '+name+' '+code+' '+(geometry.gixy.top-geometry.bell.bottom)+'px');
    // B3 V4 restores the exact V9 arrival, without a top:0 slide.
    const entrance=await page.locator('.gx-gixy-message[data-kind="notification"]')
      .evaluate(el=>{
        const tracking=el.classList.contains('gx-b3-scroll-following');
        if(tracking)el.classList.remove('gx-b3-scroll-following');
        const transitions=getComputedStyle(el).transitionProperty.split(',').map(s=>s.trim());
        if(tracking)el.classList.add('gx-b3-scroll-following');
        return {
          transitions,
          avatar:getComputedStyle(el.querySelector('.gx-gixy-message__avatar')).animationName,
          bubble:getComputedStyle(el.querySelector('.gx-gixy-message__bubble')).animationName
        };
      });
    assert(!entrance.transitions.includes('top'),
      'Do not animate initial position from top:0: '+JSON.stringify(entrance));
    assert(entrance.avatar.includes('gx-gixy-gentle-arrival'),
      'Restore native V9 Gixy entrance: '+JSON.stringify(entrance));
    assert(entrance.bubble.includes('gx-gixy-quiet-speech'),
      'Restore native V9 bubble entrance: '+JSON.stringify(entrance));
    await page.waitForFunction(()=>document.querySelector('.gx-gixy-message[data-kind="notification"]')?.classList.contains('gx-b3-scroll-following'),null,{timeout:2000});
    assert((await page.locator('.gx-gixy-message[data-kind="notification"]').evaluate(el=>getComputedStyle(el).transitionProperty)).includes('top'),
      'V3 smooth scroll must resume after V9 entrance');
    await page.locator('.gx-gixy-message[data-kind="notification"] .gx-b3-goxy-cta').waitFor({timeout:4500});
    const supports=await page.locator('.gx-gixy-message[data-kind="notification"] .gx-b3-goxy-cta')
      .evaluate(el=>getComputedStyle(el).pointerEvents);
    assert.equal(supports,'auto');
    const nearCTA=await page.evaluate(()=>{
      const message=document.querySelector('.gx-gixy-message[data-kind="notification"]');
      const action=message?.querySelector('.gx-b3-goxy-cta');
      const nav=document.querySelector('#goxion-main-nav');
      if(!message||!action||!nav)return null;
      const a=action.getBoundingClientRect(),n=nav.getBoundingClientRect();
      return {near:message.classList.contains('gx-b3-near-bell'),
        action:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},
        nav:{top:n.top,bottom:n.bottom}};
    });
    assert(nearCTA?.near,'CTA must accompany the bell-local Gixy');
    assert(nearCTA.action.bottom<=nearCTA.nav.top-2,
      'Goxy action covers navigation: '+JSON.stringify(nearCTA));
    assert(nearCTA.action.right<=page.viewportSize().width-8,
      'Goxy action extends beyond viewport: '+JSON.stringify(nearCTA));
    await page.evaluate(()=>{window.__goxyOpened=null;window.open=(...args)=>{
     window.__goxyOpened=args;return null
    }});
    await page.locator('.gx-gixy-message[data-kind="notification"] .gx-b3-goxy-cta').click();
    assert.deepEqual(await page.evaluate(()=>window.__goxyOpened),
     ['./goxy-handoff.html','_blank','noopener,noreferrer']);
    assert.equal(await page.locator('#gx-smart-notif-list .gx-b3-notice-action .gx-b3-goxy-cta').count(),1);
    const diff=await page.locator('.gx-gixy-message[data-kind="notification"]')
     .evaluate(el=>Math.abs(el.querySelector('.gx-b3-goxy-cta').getBoundingClientRect().left-
       el.querySelector('.gx-gixy-message__bubble').getBoundingClientRect().left));
    assert(diff<3,code+' Goxy CTA starts away from bubble: '+diff);
    await page.evaluate(()=>window.__b3Canvas=document.querySelector(
      '.gx-gixy-message[data-kind="notification"] canvas'));
    await page.evaluate(()=>window.scrollBy(0,150));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>document.querySelector(
      '.gx-gixy-message[data-kind="notification"] canvas')===window.__b3Canvas),true,
      'Scroll must not remount the Plastic avatar');
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForFunction(()=>{
      const el=document.querySelector('.gx-gixy-message[data-kind="notification"] .gx-gixy-message__avatar');
      return !!el&&!el.disabled;
    },null,{timeout:9000});
    await page.locator('.gx-gixy-message[data-kind="notification"] .gx-gixy-message__avatar').click();
    await page.waitForTimeout(260);
    assert.equal(await page.locator('.gx-b3-goxy-cta').count(),0,
      'Engaging with a Gixy must remove the Goxy button');
   }else{
    assert.equal(await page.locator('#gx-smart-notif-list .gx-b3-notice-action').count(),0);
   }
   // Simulating the SAME server event twice never replays the card/bell.
   assert.equal(await page.evaluate(c=>window.GOXION_B3_PRIORITY.replay(c),code),false);
   await page.locator('#gx-client-notif-launch').click();
   await page.locator('#gx-smart-notif-sheet.show').waitFor({timeout:2000});
   assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'');
   await page.locator('#gx-smart-notif-close').click();
   await page.locator('#gx-smart-notif-sheet.show').waitFor({state:'detached',timeout:2000});
  }
  await testPriority('review',false);
  await testPriority('extension',false);
  await testPriority('correction',true);
  await testPriority('overdue',true);
  // Native V9 loyalty/mission behavior remains unchanged.
  for(const kind of ['loyalty','mission']){
   await page.locator('#gx-b3-toggle').click();
   await page.locator('[data-gx-b3-test="'+kind+'"]').click();
   await page.waitForFunction(k=>window.GOXION_B3_ROUTER.stats()[k]===1,kind,{timeout:9000});
   await page.locator('.gx-gixy-message[data-kind="'+kind+'"]').waitFor({timeout:7000});
   assert.equal(await page.locator('.gx-gixy-message[data-kind="'+kind+'"] .gx-b3-goxy-cta').count(),0,
    'Celebrations should never offer an irrelevant Goxy CTA');
  }
  const direct=await fetch(root+'goxy-handoff.html');
  assert.equal(direct.status,200);
  const wrapper=await direct.text();
  assert(wrapper.includes('src="../../ayuda.html"'),'Must reuse the real official Goxy in Ayuda');
  assert(wrapper.includes("switchTab('soporte')"),'Direct handoff must actually select Soporte');
  assert(!/supabase\.co|clientId=|access_token=|pin=/i.test(wrapper),
   'Do not transmit client secrets or invent a chatbot');
  assert.deepEqual(privateRequests,[],name+' beta requested private APIs');
  assert.deepEqual(errors,[],name+' browser errors: '+errors.join(', '));
  await page.close();
  console.log(name+' E2/B3 V5 PASS · smooth native portal, stable greeting, distinctive Gixys, seven widths');
 }finally{await browser.close()}
}
try{await ready();await verify(chromium,'Chromium');await verify(webkit,'WebKit');console.log('GOXION E2/B3 COMPLETE BETA PASS')}
finally{server.kill('SIGTERM')}
