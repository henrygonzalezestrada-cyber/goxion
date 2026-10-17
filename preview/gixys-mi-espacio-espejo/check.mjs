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
  // Gixys never appear just by opening Mi Espacio; a meaningful event is required.
  assert.equal(await page.locator('.gx-gixy-message').count(),0);
  assert.equal(await page.locator('#gx-mirror-hex canvas').count(),0);
  assert.equal(await page.locator('#gx-mirror-circle canvas').count(),0);
  assert.equal(await page.locator('#gx-mirror-square canvas').count(),0);
  assert.equal(await page.locator('.gx-mirror-note').count(),1);
  assert.equal(await page.locator('#gx-client-notif-launch').count(),1);
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[],name+': beta accessed persistence');
  for(const width of [280,320,360,375,390,430,768]){
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(150);
    await page.waitForTimeout(450); // evaluate settled placement, not the entrance spring frame
    const m=await page.evaluate(()=>{
      const visible=[...document.querySelectorAll('.gx-gixy-message__avatar canvas')].map(c=>({
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
  async function assertMessage(kind,phrase){
    await page.locator('.gx-gixy-message[data-kind="'+kind+'"]').waitFor({timeout:3000});
    await page.waitForFunction(()=>{
      const el=document.querySelector('.gx-gixy-message');
      return el?.dataset.typing==='false';
    },null,{timeout:7000});
    const bubble=page.locator('.gx-gixy-message__bubble');
    assert.match(await bubble.locator('.gx-gixy-message__written').innerText(),phrase);
    await page.locator('.gx-gixy-message__avatar').waitFor({state:'visible'});
    const m=await page.evaluate(()=>{
      const stage=document.querySelector('.gx-gixy-message');
      const r=stage.getBoundingClientRect();
      const els=['#gx-client-notif-launch','.app-logo','#goxion-main-nav',
        '#dash-date','#dash-badge','#loyalty-count','#loyalty-bar',
        // While Circle speaks, its existing helper line is deliberately
        // blank and expanded, so it is not content being obscured.
        ...(stage?.dataset.kind==='loyalty'?[]:['#loyalty-msg']),
        '#gamif-expanded-coupon .mission-item .gx-mission-text',
        '#gamif-expanded-coupon .mission-item .mission-checkbox',
        '#gamif-expanded-coupon .gx-mirror-mission-action']
        .flatMap(q=>[...document.querySelectorAll(q)]).filter(el=>el.offsetParent!==null);
      const overlap=els.reduce((sum,el)=>{
        const b=el.getBoundingClientRect();
        return sum+Math.max(0,Math.min(b.right,r.right)-Math.max(b.left,r.left))*
          Math.max(0,Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top));
      },0);
      const avatar=stage.querySelector('canvas');
      return {visible:getComputedStyle(stage).visibility==='visible',
        clientWidth:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        x:r.left,y:r.top,right:r.right,bottom:r.bottom,overlap,
        ratio:avatar?avatar.width/Math.max(1,avatar.getBoundingClientRect().width):0,
        message:stage.dataset.kind,variant:stage.dataset.variant};
    });
    assert(Number((await page.locator('.gx-gixy-message').getAttribute('data-placement')))<=2,
      name+': location outside 3 approved contextual slots');
    const visual=await page.locator('.gx-gixy-message__bubble').evaluate(el=>{
      const styles=getComputedStyle(el);
      return {motion:styles.animationName,bg:styles.backgroundImage,border:styles.borderRadius};
    });
    assert.match(visual.motion,/gx-gixy-quiet-speech/,name+': premium restrained entrance missing');
    assert.match(visual.bg,/gradient/,name+': premium glass speech surface missing');
    assert(m.visible,name+': Gixy oculto, no hay zona libre para '+kind);
    assert(m.overlap<51,name+': Gixy tapa información '+JSON.stringify(m));
    assert(m.x>=0&&m.right<=m.clientWidth+2,name+': Gixy fuera de pantalla');
    assert(m.ratio>=1.5,name+': render Canvas borroso');
    assert(m.scrollWidth<=m.clientWidth+2,name+': scroll horizontal al aparecer');
    return m;
  }
  await page.locator('#gx-client-notif-launch').click();
  await page.locator('.gx-gixy-message[data-kind="notification"]').waitFor({timeout:3000});
  const bubbleEarly=await page.evaluate(()=>{
    const g=document.querySelector('.gx-gixy-message');
    return {chars:Number(g.dataset.visibleChars),typing:g.dataset.typing,
      w:parseFloat(getComputedStyle(g.querySelector('.gx-gixy-message__bubble')).width),
      disabled:g.querySelector('.gx-gixy-message__avatar').disabled};
  });
  assert(bubbleEarly.typing==='true'&&bubbleEarly.disabled,name+': typewriter lock not activated');
  // Hammer the disabled target while writing: never create a second phrase.
  await page.evaluate(()=>{const a=document.querySelector('.gx-gixy-message__avatar');
    for(let k=0;k<14;k++)a.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-touch-count'),'0');
  await assertMessage('notification',/novedad/i);
  const bubbleAfter=await page.locator('.gx-gixy-message__bubble').evaluate(el=>({
    w:parseFloat(getComputedStyle(el).width),h:parseFloat(getComputedStyle(el).height)}));
  assert(bubbleAfter.w>bubbleEarly.w+20,name+': bubble did not expand with written text');
  assert(bubbleAfter.h>=34,name+': bubble collapsed vertically');
  await page.locator('.gx-gixy-message__avatar').isEnabled();
  assert.equal(await page.locator('#gx-client-notif-launch').getAttribute('aria-expanded'),'true');
  await page.waitForFunction(()=>{
    const badge=document.getElementById('gx-client-notif-badge');
    return badge?.textContent==='1'&&badge.getBoundingClientRect().width>=18;
  },null,{timeout:2500}); // wait for the real WebKit morph, not a fixed clock
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'1');
  const badgeSize=await page.locator('#gx-client-notif-badge').evaluate(el=>el.getBoundingClientRect().width);
  assert(badgeSize>=18,name+': contador no visible tras el morph de la campana');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('gx-mirror-notif-active')),true);
  await page.locator('#gx-client-notif-launch').click();
  assert.equal(await page.locator('#gx-client-notif-launch').getAttribute('aria-expanded'),'false');
  await page.locator('.gx-gixy-message').waitFor({state:'detached',timeout:2000});
  await page.locator('#gx-mirror-heart .pulse-heart').click();
  assert.equal(await page.locator('#loyalty-count').innerText(),'4/4 Pagos');
  await assertMessage('loyalty',/lealtad/i);
  const local=await page.evaluate(()=>{
    const circle=document.querySelector('.gx-gixy-message[data-kind="loyalty"]').getBoundingClientRect();
    const info=document.querySelector('#loyalty-msg').getBoundingClientRect();
    const payment=document.querySelector('#dash-billing-card .gx-account-capsule')?.getBoundingClientRect();
    return {dy:Math.abs(circle.top-info.top),inside:circle.bottom<=info.bottom+8,
      coversButton:payment?!(circle.bottom<=payment.top||circle.top>=payment.bottom):false};
  });
  assert(local.dy<10&&local.inside&&!local.coversButton,
    name+': Circle fuera de su sección o encima del cobro: '+JSON.stringify(local));
  await page.locator('.gx-gixy-message__avatar').click();
  await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7000});
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy/i);
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-touch-count'),'1');

  await page.locator('#gx-mirror-mission-card').click();
  await page.waitForTimeout(1200);
  // Hex must NOT appear merely because the missions panel was opened.
  assert.equal(await page.locator('.gx-gixy-message[data-kind="mission"]').count(),0);
  await page.locator('#gx-mirror-complete-btn').click();
  const firstMission=await assertMessage('mission',/misiones/i);
  assert.equal(await page.locator('#gx-mirror-mission-status').innerText(),'Recompensa lista · Simulación');
  assert.equal(await page.locator('#gx-mirror-complete-btn').isDisabled(),true);
  assert.equal(await page.locator('#gx-mirror-complete-btn .gx-mirror-action-icon').evaluate(el=>getComputedStyle(el).animationName),'gx-mirror-check-pop');
  await page.locator('.gx-gixy-message__avatar').click();
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-touch-count'),'1');
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-typing'),'true');
  assert.equal(await page.locator('.gx-gixy-message__avatar').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7000});
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy/i);
  await page.locator('.gx-gixy-message__avatar').waitFor({state:'visible'});
  await page.locator('#gx-mirror-retry').click();
  assert.equal(await page.locator('#gx-mirror-complete-btn').isEnabled(),true);
  await page.locator('.gx-gixy-message').waitFor({state:'detached',timeout:2000});
  // Second completion is allowed after the deduplication window; placement rotates.
  await page.waitForTimeout(2600);
  await page.locator('#gx-mirror-complete-btn').click();
  const secondMission=await assertMessage('mission',/recompensa/i);
  assert.notEqual(secondMission.variant,firstMission.variant,'Gixys must vary placement between events');
  assert(Math.abs(secondMission.x-firstMission.x)+Math.abs(secondMission.y-firstMission.y)>=3,
    name+': Gixy positions must actually vary while staying safe');
  // Repeated touches after each completed sentence work; incomplete phrases
  // cannot be overwritten or queued by impatient tapping.
  for(let i=0;i<3;i++){
    await page.locator('.gx-gixy-message__avatar').click({timeout:2500});
    assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-typing'),'true');
    await page.evaluate(()=>{
      const a=document.querySelector('.gx-gixy-message__avatar');
      for(let t=0;t<5;t++)a.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    });
    await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7000});
    await page.waitForFunction(()=>!document.querySelector('.gx-gixy-message__avatar')?.disabled,null,{timeout:2000});
  }
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-phase'),'shown');
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-touch-count'),'3');
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy|GOXION|Gixys/i);
  await page.locator('.gx-gixy-message__bubble').click();
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-phase'),'fade');
  await page.locator('.gx-gixy-message').waitFor({state:'detached',timeout:2000});
  await page.locator('#gx-mirror-retry').click();
  await page.locator('#gx-mirror-close-missions').click();
  await page.waitForTimeout(900);
  assert.deepEqual(errors,[],name+': javascript runtime errors');
  assert.deepEqual(privateCalls,[],name+': attempt to access private endpoints');
  assert.equal(await page.locator('.gx-gixy-message').count(),0,'Gixy should be gone after its exit');
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
