import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const PORT=4853;
const URL='http://127.0.0.1:'+PORT+'/preview/admin-v3/index.html';
const widths=[280,320,360,375,390,430,600,768,881,1024,1280,1440];
const successful=[],failures=[];
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
mkdirSync('artifacts/admin-v3',{recursive:true});
async function waitServer(){
  for(let i=0;i<80;i++){
    try{const r=await fetch(URL);if(r.ok)return;}catch{}
    await new Promise(done=>setTimeout(done,130));
  }
  throw Error('Preview server not available');
}
function overlap(a,b){
  return Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
}
async function verifyLayout(page,label,stage){
  const d=await page.evaluate(()=>{
    const box=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const visible=(el)=>el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
    const dock=[...document.querySelectorAll('.dock-link')].filter(visible).map(box);
    const rail=[...document.querySelectorAll('.nav-link')].filter(visible).map(box);
    const targets=[...document.querySelectorAll('.view:not([hidden]) .client-card,.view:not([hidden]) .activity-row,.view:not([hidden]) .ops-row,.view:not([hidden]) .filter-pill')].filter(visible).map(box);
    const logo=document.querySelector(innerWidth<=880?'.mobile-brand img':'.side-brand img');
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      dock,rail,minTarget:targets.length?Math.min(...targets.map(r=>r.height)):null,
      logo:logo.complete&&logo.naturalWidth>0};
  });
  assert(d.logo,label+' '+stage+' official logo unavailable');
  assert(d.scrollWidth<=d.width+1,label+' '+stage+' document overflow '+d.scrollWidth);
  assert(d.bodyWidth<=d.width+1,label+' '+stage+' body overflow '+d.bodyWidth);
  const nav=d.dock.length?d.dock:d.rail;
  assert.equal(nav.length,4,label+' '+stage+' navigation count');
  for(let i=0;i<nav.length;i++){
    assert(nav[i].height>=44,label+' '+stage+' nav item too small '+i);
    assert(nav[i].left>=-1&&nav[i].right<=d.width+1,label+' '+stage+' nav offscreen '+i);
    for(let j=i+1;j<nav.length;j++)assert(!overlap(nav[i],nav[j]),label+' '+stage+' nav collision');
  }
  if(d.minTarget!==null)assert(d.minTarget>=43,label+' '+stage+' target too small '+d.minTarget);
  if(d.dock.length)assert(d.dock.every(b=>b.bottom>=800),label+' '+stage+' mobile nav not bottom aligned');
}
async function nav(page,to){
  await page.locator('[data-route="'+to+'"]:visible').first().click();
  assert(!(await page.locator('#view-'+to).evaluate(e=>e.hidden)),'section '+to+' hidden');
}
async function run(type,name){
  const browser=await type.launch({headless:true});
  try{
    for(const width of widths){
      const label=name+' '+width+'px';
      const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        const res=await page.goto(URL,{waitUntil:'load'});
        assert(res?.ok(),label+' page not served');
        await page.locator('#home-queue .activity-row').first().waitFor();
        assert.equal(await page.locator('#home-queue .activity-row').count(),3,label+' home queue count');
        await verifyLayout(page,label,'home');
        if(name==='chromium'&&(width===390||width===1280))await page.screenshot({path:'artifacts/admin-v3/home-'+width+'.png',fullPage:true});
        await nav(page,'clients');
        assert.equal(await page.locator('#client-grid .client-card').count(),4,label+' clients count');
        await verifyLayout(page,label,'clients');
        await page.locator('#client-search').fill('Sofia');
        assert.equal(await page.locator('#client-grid .client-card').count(),1,label+' search without accents');
        await page.locator('#client-search').fill('');
        await page.locator('[data-client-filter="attention"]').click();
        assert.equal(await page.locator('#client-grid .client-card').count(),3,label+' attention filter');
        await page.locator('[data-client-filter="all"]').click();
        await page.locator('#client-grid .client-card').first().click();
        assert(await page.locator('#client-directory').evaluate(el=>el.hidden),label+' directory still visible');
        assert(!(await page.locator('#client-workspace').evaluate(el=>el.hidden)),label+' dossier hidden');
        await verifyLayout(page,label,'dossier');
        await page.locator('[data-detail="services"]').click();
        const t=await page.locator('#dossier-content').innerText();
        assert(t.includes('Acceso 1')&&t.includes('Acceso 2')&&t.includes('15 NOV')&&t.includes('23 NOV'),label+' B2 illustration');
        assert.equal((t.match(/YouTube Premium/g)||[]).length,1,label+' duplicated service header');
        await verifyLayout(page,label,'services');
        if(name==='chromium'&&(width===390||width===1280))await page.screenshot({path:'artifacts/admin-v3/dossier-'+width+'.png',fullPage:true});
        await page.locator('#client-back').click();
        assert(!(await page.locator('#client-directory').evaluate(el=>el.hidden)),label+' directory not restored');
        await nav(page,'operations');
        assert.equal(await page.locator('#ops-list .ops-row').count(),3,label+' pending operations');
        await page.locator('[data-op-filter="requests"]').click();
        assert.equal(await page.locator('#ops-list .ops-row').count(),2,label+' request filter');
        await verifyLayout(page,label,'operations');
        if(name==='chromium'&&(width===390||width===1280))await page.screenshot({path:'artifacts/admin-v3/operations-'+width+'.png',fullPage:true});
        await nav(page,'management');
        assert.equal(await page.locator('.management-index article').count(),4,label+' management items');
        await verifyLayout(page,label,'management');
        assert.equal(errors.length,0,label+' JavaScript: '+errors.join('; '));
        successful.push(label);
      }catch(error){failures.push(label+': '+(error.stack||error));}
      finally{await page.close();}
    }
  }finally{await browser.close();}
}
try{await waitServer();await run(chromium,'chromium');await run(webkit,'webkit');}
finally{server.kill('SIGTERM');}
console.log('Admin V3 / '+successful.length+' browsers and viewport cases passed');
if(failures.length){
  console.error(failures.join('\n\n'));
  process.exitCode=1;
}else console.log('GOXION ADMIN V3 QA PASS');
