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
  const heartGeometry=await page.evaluate(()=>{
    const h=document.querySelector('#gx-mirror-heart').getBoundingClientRect();
    const label=document.querySelector('.gx-mirror-loyalty-name').getBoundingClientRect();
    const count=document.querySelector('#loyalty-count').getBoundingClientRect();
    const row=document.querySelector('.gx-mirror-loyalty-label').parentElement.getBoundingClientRect();
    return {dy:Math.abs((h.top+h.height/2)-(label.top+label.height/2)),
      overlap:Math.max(0,Math.min(h.right,count.right)-Math.max(h.left,count.left)),
      inside:h.top>=row.top-2&&h.bottom<=row.bottom+2};
  });
  assert(heartGeometry.dy<=3&&heartGeometry.overlap<1&&heartGeometry.inside,
    name+': heart not centered in loyalty row: '+JSON.stringify(heartGeometry));
  // Gixys never appear just by opening Mi Espacio; a meaningful event is required.
  assert.equal(await page.locator('.gx-gixy-message').count(),0);
  assert.equal(await page.locator('#gx-mirror-hex canvas').count(),0);
  assert.equal(await page.locator('#gx-mirror-circle canvas').count(),0);
  assert.equal(await page.locator('#gx-mirror-square canvas').count(),0);
  assert.equal(await page.locator('.gx-mirror-note').count(),1);
  // Guard against every layout shift: fixed-position Gixys may float over
  // empty space, but may NEVER change the location of a real dashboard card.
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(850); // stabilize official dashboard before diffing event geometry
  const baseline=await page.evaluate(()=>{
    const selectors=['#dash-billing-card','#loyalty-msg',
      '#dash-billing-card .gx-account-capsule','#gx-mirror-mission-card'];
    const snap=()=>Object.fromEntries(selectors.map(sel=>{
      const el=document.querySelector(sel),r=el?.getBoundingClientRect();
      return [sel,r?{x:r.x,y:r.y,width:r.width,height:r.height}:null];
    }));
    window.__gixysBaseline=snap();
    return window.__gixysBaseline;
  });
  const assertNoShift=async stage=>{
    const current=await page.evaluate(()=>Object.fromEntries(
      Object.keys(window.__gixysBaseline).map(sel=>{
        const r=document.querySelector(sel)?.getBoundingClientRect();
        return [sel,r?{x:r.x,y:r.y,width:r.width,height:r.height}:null];
      })));
    // A mission morph deliberately changes the mission panel, not the Gixy.
    for(const sel of Object.keys(baseline)){
      if(stage==='mission'&&sel==='#gx-mirror-mission-card')continue;
      const a=baseline[sel],z=current[sel];
      if(!a||!z)continue;
      for(const k of ['x','y','width','height'])
        assert(Math.abs(z[k]-a[k])<=1.5,
          name+': Gixy displaced dashboard '+sel+'.'+k+
          ' at '+stage+': '+a[k]+' -> '+z[k]);
    }
  };

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
    // Stable writing never scrambles or wraps mid-word as characters arrive.
    const lines=await bubble.locator('.gx-gixy-message__written').evaluate(el=>({
      whiteSpace:getComputedStyle(el).whiteSpace,
      scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
      text:el.textContent
    }));
    assert.equal(lines.whiteSpace,'pre-wrap',name+': explicit line boundaries lost');
    assert(lines.scrollHeight<=lines.clientHeight+2,name+': typed content clipped or reflowing');
    assert(!lines.text.split('\n').some(line=>/^(que|de|y|a|el)$/i.test(line.trim())),
      name+': orphan word in speech: '+lines.text);
    assert(m.visible,name+': Gixy oculto, no hay zona libre para '+kind);
    assert(m.overlap<51,name+': Gixy tapa información '+JSON.stringify(m));
    assert(m.x>=0&&m.right<=m.clientWidth+2,name+': Gixy fuera de pantalla');
    assert(m.ratio>=1.5,name+': render Canvas borroso');
    assert(m.scrollWidth<=m.clientWidth+2,name+': scroll horizontal al aparecer');
    return m;
  }
  await page.locator('#gx-client-notif-launch').click();
  await page.locator('.gx-gixy-message[data-kind="notification"]').waitFor({timeout:3000});
  await assertNoShift('notification');
  assert.equal(await page.locator('.gx-gixy-joy__piece').count(),8,'Missing sparks/hearts');
  assert.match(await page.locator('.gx-gixy-joy__piece').first().evaluate(el=>getComputedStyle(el).animationName),
    /gx-gixy-spark-flight/,name+': particle effect missing');
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
  assert(!/\bHex\b|\bSquare\b|\bCircle\b/i.test(
    await page.locator('.gx-gixy-message__written').innerText()),
    name+': individual names must not appear in Gixy dialog');
  const bubbleAfter=await page.locator('.gx-gixy-message__bubble').evaluate(el=>({
    w:parseFloat(getComputedStyle(el).width),h:parseFloat(getComputedStyle(el).height)}));
  assert(bubbleAfter.w>bubbleEarly.w+20,name+': bubble did not expand with written text');
  assert(bubbleAfter.h>=34,name+': bubble collapsed vertically');
  await page.locator('.gx-gixy-message__avatar').click();
  assert.equal(await page.locator('.gx-gixys-progress').getAttribute('data-found'),'1');
  assert.equal(await page.locator('.gx-gixys-secret').count(),0,
    name+': demo coupon was given away after first hello');
  await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7500});
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy/i);
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
  await assertNoShift('loyalty');
  const local=await page.evaluate(()=>{
    const circle=document.querySelector('.gx-gixy-message[data-kind="loyalty"]').getBoundingClientRect();
    const card=document.querySelector('#dash-billing-card').getBoundingClientRect();
    const root=document.querySelector('#gx-gixys-message-root');
    const message=document.querySelector('#loyalty-msg');
    const css=getComputedStyle(root);
    const rect=message.getBoundingClientRect();
    return {fixed:css.position==='fixed',w:root.getBoundingClientRect().width,
      messageVisible:getComputedStyle(message).color!=='rgba(0, 0, 0, 0)',
      distance:Math.min(Math.abs(circle.top-card.bottom),Math.abs(circle.bottom-card.top)),
      top:circle.top,bottom:circle.bottom,width:circle.width,
      messageHeight:rect.height};
  });
  assert(local.fixed&&local.w===0&&local.messageVisible,
    name+': loyalty changes page flow or hides real text: '+JSON.stringify(local));
  assert(local.top>=0&&local.bottom<=844,
    name+': loyalty stage escaped viewport: '+JSON.stringify(local));
  await page.locator('.gx-gixy-message__avatar').click();
  assert.equal(await page.locator('.gx-gixys-progress').getAttribute('data-found'),'2');
  assert.equal(await page.locator('.gx-gixys-secret').count(),0);
  await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7500});
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/dos saludos/i);
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
  assert.equal(await page.locator('.gx-gixys-progress').getAttribute('data-found'),'3');
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-touch-count'),'1');
  assert.equal(await page.locator('.gx-gixy-message').getAttribute('data-typing'),'true');
  assert.equal(await page.locator('.gx-gixy-message__avatar').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('.gx-gixy-message')?.dataset.typing==='false',null,{timeout:7000});
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy/i);
  await page.locator('.gx-gixys-secret').waitFor({state:'visible',timeout:3000});
  assert.match(await page.locator('.gx-gixys-secret').innerText(),/5 % OFF/i);
  assert.equal(await page.locator('.gx-gixys-secret--v9.glass-card').count(),1);
  assert.equal(await page.locator('.gx-gixys-secret__confetti').count(),0,
    name+': cheap paper confetti should be removed');
  assert.equal(await page.locator('.gx-gixys-secret__light').count(),14);
  assert.equal(await page.locator('.gx-gixys-secret__ring').count(),2);
  const appearance=await page.locator('.gx-gixys-secret').evaluate(el=>({
    blur:getComputedStyle(el).backdropFilter,fill:getComputedStyle(el).backgroundImage
  }));
  assert.match(appearance.blur,/blur/,name+': award not glass');
  assert.match(appearance.fill,/gradient/,name+': award not GOXION style');
  assert.match(await page.locator('.gx-gixys-secret__amount').evaluate(el=>getComputedStyle(el).animationName),
    /gx-award-aurora-reveal|gx-award-amount-reveal/,
    name+': missing Colorion-inspired Aurora prize text animation');
  assert.match(await page.locator('.gx-gixys-secret').innerText(),/demostración|ficticio/i);
  for(let tick=0;tick<5;tick++){
    console.log(name+' AWARD_BOX '+tick+' '+JSON.stringify(await page.evaluate(()=>{
      const el=document.querySelector('.gx-gixys-secret'),btn=el.querySelector('button'),root=document.querySelector('#gx-gixys-message-root');
      const info=e=>{const r=e.getBoundingClientRect(),st=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,animation:st.animationName,transform:st.transform,position:st.position}};
      return {panel:info(el),btn:info(btn),root:info(root),
        animations:el.getAnimations({subtree:true}).slice(0,8).map(a=>({name:a.effect?.target?.className||'',state:a.playState}))};
    })));
    await page.waitForTimeout(320);
  }
  await page.locator('.gx-gixys-secret button').click({timeout:3500,force:true});
  assert.equal(await page.locator('.gx-gixys-secret').count(),0);
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
  assert.match(await page.locator('.gx-gixy-message__written').innerText(),/Goxy|GOXION|Gixys|Gixy/i);
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
