import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4199,base='http://127.0.0.1:'+port+'/preview/gixys-original-v3/index.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return;}catch{}await wait(150);}throw Error('preview server not ready')}
async function exercise(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2});
  const errors=[],privateCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/supabase.co|groq|discord.com|wa\.me|api\.whatsapp/i.test(r.url()))privateCalls.push(r.url());});
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.GOXION_ORIGINAL_BETA?.renderer==='bot-avatars@0.2.2',{timeout:30000});
  assert.equal(await page.locator('.stage').count(),3);
  assert.equal(await page.locator('.stage .gixy-float').count(),3);
  assert.equal(await page.locator('canvas').count(),6);
  assert.equal(await page.locator('.spring-check').count(),0);
  assert.equal(await page.locator('.pulse-heart').count(),1);
  assert.equal(await page.locator('.bell-toggle').count(),0);
  assert.equal(await page.locator('#mission-btn').count(),1);
  assert.equal(await page.locator('.stage[data-scene=notification] .bell').count(),1);
  assert.equal(await page.locator('.material-bar button').last().getAttribute('aria-pressed'),'true','Plastic must be default');
  assert.equal(await page.locator('.gixy-slot').count(),0);
  for(const width of [280,320,360,375,390,430,768]){
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(110);
    const pos=await page.evaluate(()=>{
      const cw=document.documentElement.clientWidth,sw=document.documentElement.scrollWidth;
      const stages=[...document.querySelectorAll('.stage')].map(card=>{
        const anchor=card.querySelector('.gixy-float').getBoundingClientRect();
        const title=card.querySelector('h2').getBoundingClientRect();
        return {anchor,title:{left:title.left,right:title.right,top:title.top,bottom:title.bottom}};
      });
      return {cw,sw,stages};
    });
    assert(pos.sw<=pos.cw+2,name+' '+width+': overflow '+pos.sw+'/'+pos.cw);
    for(const s of pos.stages){
      const a=s.anchor,b=s.title;
      const ox=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
      const oy=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      assert(!(ox>10&&oy>10),name+' '+width+': Gixy covers heading');
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mission-btn').click();
  assert.equal(await page.locator('#mission-btn').isDisabled(),true);
  assert.equal(await page.locator('.stage[data-scene=mission] .progress').getAttribute('aria-valuenow'),'3');
  const check=await page.locator('#mission-btn .action-icon').evaluate(el=>({
    animation:getComputedStyle(el).animationName,
    color:getComputedStyle(el).backgroundColor
  }));
  assert.match(check.animation,/gx-check-pop/,'The approved V1 mission spring-check motion is missing');
  await page.locator('.stage[data-scene=mission] .quiet-btn').click();
  assert.equal(await page.locator('.stage[data-scene=mission] .progress').getAttribute('aria-valuenow'),'2');
  await page.locator('.stage[data-scene=loyalty] .pulse-heart').click();
  assert.equal(await page.locator('.stage[data-scene=loyalty] .pulse-heart').getAttribute('aria-pressed'),'true');
  await page.locator('.stage[data-scene=notification] .notification-action').click();
  assert.equal(await page.locator('.stage[data-scene=notification] .bell').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.stage[data-scene=notification] .notification-toast').count(),1);
  const bell=await page.locator('.stage[data-scene=notification] .bell svg').evaluate(el=>getComputedStyle(el).animationName);
  assert.match(bell,/gx-bell-ring/,'The approved V1 bell swing is missing');
  await page.locator('.stage[data-scene=notification] .bell').click();
  assert.equal(await page.locator('.stage[data-scene=notification] .notification-toast').count(),0);
  assert.equal(await page.locator('.stage[data-scene=notification] .notification-action').isDisabled(),true);
  await page.locator('.stage[data-scene=notification] .quiet-btn').click();
  assert.equal(await page.locator('.stage[data-scene=notification] .notification-action').isEnabled(),true);
  await page.locator('.material-bar button').first().click();
  assert.equal(await page.locator('.material-bar button').first().getAttribute('aria-pressed'),'true');
  await page.locator('.material-bar button').last().click();
  assert.equal(await page.locator('.material-bar button').last().getAttribute('aria-pressed'),'true');
  await page.locator('.studio [aria-pressed]').last().click();
  assert.equal(await page.locator('.studio [aria-pressed]').last().getAttribute('aria-pressed'),'true');
  await page.waitForTimeout(1500);
  const alpha=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>{
    const ctx=c.getContext('2d');if(!ctx||!c.width||!c.height)return 0;
    let hits=0;
    for(let x=.2;x<=.8;x+=.15)for(let y=.2;y<=.8;y+=.15)
      if(ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data[3]>12)hits++;
    return hits;
  }));
  const fidelity=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>({
    ratio:c.width/Math.max(1,c.getBoundingClientRect().width),
    cssWidth:c.getBoundingClientRect().width,
    bitmapWidth:c.width
  })));
  assert(fidelity.every(v=>v.ratio>=1.5),'Gixys must render at >=1.5x effective pixel density: '+JSON.stringify(fidelity));
  assert(alpha.every(x=>x>0),name+': empty original canvas '+alpha);
  assert.deepEqual(errors,[],name+': Javascript errors');
  assert.deepEqual(privateCalls,[],name+': private requests');
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.route('**/fonts.googleapis.com/**',r=>r.abort());
  await reduced.route('**/fonts.gstatic.com/**',r=>r.abort());
  await reduced.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await reduced.waitForFunction(()=>!!window.GOXION_ORIGINAL_BETA,{timeout:30000});
  assert.equal(await reduced.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  await reduced.locator('#mission-btn').click();
  assert.equal(await reduced.locator('.stage[data-scene=mission] .progress').getAttribute('aria-valuenow'),'3');
  await reduced.close();
  await page.close();
  console.log(name+' · original bot-avatars, React Bits, seven sizes, controls, reduced motion PASS');
 }finally{await browser.close();}
}
try{await boot();await exercise(chromium,'Chromium');await exercise(webkit,'WebKit');console.log('GOXION plastic renderer + V1 mission/bell + PulseHeart original PASS');}
finally{server.kill('SIGTERM');}
