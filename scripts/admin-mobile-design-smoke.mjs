import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const port=4817;
const origin='http://127.0.0.1:'+port+'/preview/admin-mobile-first/index.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
  env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const widths=[280,320,360,375,390,430,650,768,1024,1440];
const screens=[];
const failures=[];
mkdirSync('artifacts/admin-design',{recursive:true});
const wait=async()=>{
  for(let i=0;i<75;i++){
    try{const r=await fetch(origin);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,150));
  }
  throw Error('Preview server not ready');
};
function overlap(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))>1&&Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))>1}
async function run(browser,label){
  for(const w of widths){
    const page=await browser.newPage({viewport:{width:w,height:844},deviceScaleFactor:1});
    const pageerrors=[];
    page.on('pageerror',e=>pageerrors.push(e.message));
    try{
      const response=await page.goto(origin,{waitUntil:'load'});
      assert(response?.ok(),label+' '+w+': HTML not served');
      const layout=await page.evaluate(()=>{
        const rect=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
        const nav=[...document.querySelectorAll('.tab-btn')];
        const logo=document.querySelector('.brand-logo');
        return {
          vw:window.innerWidth,
          docWidth:document.documentElement.scrollWidth,
          bodyWidth:document.body.scrollWidth,
          nav:nav.map(rect),
          header:rect(document.querySelector('.shell-head')),
          brand:rect(document.querySelector('.brand')),
          demo:rect(document.querySelector('.head-right')),
          logoLoaded:logo.complete&&logo.naturalWidth>0,
          css: getComputedStyle(document.querySelector('.shell-head')).backgroundColor,
          image:logo.getAttribute('src')
        };
      });
      assert(layout.logoLoaded,label+' '+w+': missing official logo');
      assert(layout.docWidth<=w+1,label+' '+w+': document horizontal overflow '+layout.docWidth);
      assert(layout.bodyWidth<=w+1,label+' '+w+': body horizontal overflow '+layout.bodyWidth);
      assert(layout.nav.length===4,label+' '+w+': 4 destinations');
      assert(!overlap(layout.brand,layout.demo),label+' '+w+': brand collides with demo badge');
      for(let i=0;i<layout.nav.length;i++){
        const b=layout.nav[i];
        assert(b.left>=-1&&b.right<=w+1,label+' '+w+': nav item outside viewport '+i);
        assert(b.height>=44,label+' '+w+': touch target below 44px '+i);
        for(let j=i+1;j<layout.nav.length;j++)assert(!overlap(b,layout.nav[j]),label+' '+w+': overlapping navigation buttons '+i+'/'+j);
      }
      if(w<=650){
        assert(layout.nav[0].bottom>=760,label+' '+w+': mobile navigation not bottom-aligned');
      }else{
        assert(layout.nav[0].top<74,label+' '+w+': desktop navigation not inside header');
      }
      await page.locator('[data-tab="clients"]').click();
      assert(await page.locator('#client-list .client-card').count()===4,label+' '+w+': client count incorrect');
      await page.locator('[data-client-filter="review"]').click();
      assert(await page.locator('#client-list .client-card').count()===1,label+' '+w+': filter incorrect');
      await page.locator('[data-client-filter="all"]').click();
      await page.locator('#client-list .client-card').first().click();
      assert(await page.locator('#client-sheet').evaluate(e=>e.open),label+' '+w+': sheet not open');
      await page.locator('[data-detail="services"]').click();
      assert(await page.locator('#sheet-content').innerText().then(x=>x.includes('Acceso 1')&&x.includes('Acceso 2')),label+' '+w+': B2 access detail missing');
      const sheet=await page.locator('.sheet-tabs').boundingBox();
      assert(sheet&&sheet.width<=w+1,label+' '+w+': sheet tabs overflow');
      await page.locator('#close-sheet').click();
      await page.locator('[data-tab="operations"]').click();
      await page.locator('[data-op-filter="requests"]').click();
      assert(await page.locator('#ops-list .ops-item').count()===2,label+' '+w+': operations filter incorrect');
      if((w===390||w===1440)&&label==='chromium'){
        await page.screenshot({path:'artifacts/admin-design/'+label+'-'+w+'.png',fullPage:true});
      }
      assert(pageerrors.length===0,label+' '+w+': pageerrors '+pageerrors.join('; '));
      screens.push(label+' '+w+'px PASS');
    }catch(e){failures.push(label+' '+w+': '+(e.stack||e));}
    finally{await page.close();}
  }
}
try{
  await wait();
  for(const [name,browserType] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await browserType.launch({headless:true});
    try{await run(browser,name)}finally{await browser.close();}
  }
}finally{server.kill('SIGTERM');}
console.log('Admin design tested:',screens.length,'screen sizes/browser combinations');
console.log(screens.join('\n'));
if(failures.length){
  console.error('\nFAILURES:\n'+failures.join('\n\n'));
  process.exitCode=1;
}else console.log('GOXION mobile-first design checks PASS');
