import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const port=4861, url='http://127.0.0.1:'+port+'/preview/admin-v4/index.html';
const widths=[280,320,360,375,390,430,600,768,830,831,1024,1440];
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const successes=[],errors=[];
mkdirSync('artifacts/admin-v4',{recursive:true});
async function waitServer(){
  for(let i=0;i<85;i++){
    try{const res=await fetch(url);if(res.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,140));
  }
  throw Error('local preview unavailable');
}
async function dimensions(page,label,stage){
  const result=await page.evaluate(()=>{
    const r=(el)=>{const x=el.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height}};
    const shown=(el)=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
    const navElements=[...document.querySelectorAll('.bottom-item,.rail-item')].filter(shown);
    const nav=navElements.map(r);
    const selected=navElements.filter(el=>el.classList.contains("selected")).map(el=>el.dataset.nav);
    const actionRows=[...document.querySelectorAll('.screen:not([hidden]) .queue-entry,.screen:not([hidden]) .operation-item,.screen:not([hidden]) .folio,.screen:not([hidden]) .date-entry')].filter(shown).map(r);
    const active=document.querySelector('.screen:not([hidden])');
    const logo=document.querySelector(window.innerWidth<=830?'.wordmark img':'.rail-logo img');
    return {width:window.innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      nav,selected,actionMin:actionRows.length?Math.min(...actionRows.map(x=>x.height)):null,
      logoLoaded:logo.complete&&logo.naturalWidth>0,
      active:active?.id||null};
  });
  assert(result.logoLoaded,label+' '+stage+' original logo missing');
  assert(result.documentWidth<=result.width+1,label+' '+stage+' horizontal overflow '+result.documentWidth+' > '+result.width);
  assert(result.bodyWidth<=result.width+1,label+' '+stage+' body overflow '+result.bodyWidth);
  assert.equal(result.nav.length,4,label+' '+stage+' nav count');
  assert.deepEqual(result.selected,[result.active.replace('screen-','')],label+' '+stage+' wrong active navigation');
  for(const n of result.nav){
    assert(n.height>=44,label+' '+stage+' nav smaller than 44px');
    assert(n.left>=-1&&n.right<=result.width+1,label+' '+stage+' nav outside viewport');
  }
  if(result.actionMin!==null)assert(result.actionMin>=43,label+' '+stage+' actionable row below 44px');
}
async function settle(page){
  await page.evaluate(async()=>{
    const moving=document.getAnimations();
    await Promise.all(moving.map(anim=>anim.finished.catch(()=>{})));
  });
}
async function waitHash(page,hash){
  await page.waitForFunction(h=>{
    if(window.location.hash!==h)return false;
    const route=h.split("/").filter(Boolean);
    const view=route[1];
    const section=document.getElementById('screen-'+view);
    if(!section || section.hidden)return false;
    if(view==='clientes'){
      const directory=document.getElementById('client-directory');
      const detail=document.getElementById('client-detail');
      const hasId=route.length>=3;
      if(hasId && (!directory.hidden||detail.hidden))return false;
      if(!hasId && (directory.hidden||!detail.hidden))return false;
      if(hasId && route[3]){
        const selected=document.querySelector('[data-detail-tab="'+route[3]+'"].selected');
        if(!selected)return false;
      }
    }
    return true;
  },hash);
  await settle(page);
}
async function run(type,name){
  const browser=await type.launch({headless:true});
  try{
    for(const width of widths){
      const label=name+'/'+width;
      const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
      const jsErrors=[];
      page.on('pageerror',e=>jsErrors.push(e.message));
      try{
        const res=await page.goto(url,{waitUntil:'domcontentloaded'});
        assert(res?.ok(),label+': HTML failed');
        await page.locator('.queue-entry').first().waitFor();
        await settle(page);
        assert.equal(await page.locator('.queue-entry').count(),3,label+' queue size');
        assert.equal(await page.locator('.date-entry').count(),4,label+' agenda count');
        await dimensions(page,label,'home');
        const photo=name==='Chromium'&&[280,390,1440].includes(width);
        if(photo)await page.screenshot({path:'artifacts/admin-v4/inicio-'+width+'.png',fullPage:true});
        await page.locator('a[data-nav="clientes"]:visible').first().click();
        await waitHash(page,'#/clientes');
        assert.equal(await page.locator('.folio').count(),4,label+' clients count');
        await dimensions(page,label,'clients');
        if(photo)await page.screenshot({path:'artifacts/admin-v4/clientes-'+width+'.png',fullPage:true});
        await page.locator('#client-search').fill('Sofia');
        assert.equal(await page.locator('.folio').count(),1,label+' accent-search');
        await page.locator('#client-search').fill('');
        await page.locator('[data-client-filter="atencion"]').click();
        assert.equal(await page.locator('.folio').count(),3,label+' attention filter');
        await page.locator('[data-client-filter="corriente"]').click();
        assert.equal(await page.locator('.folio').count(),1,label+' current filter');
        await page.locator('[data-client-filter="todos"]').click();
        await page.locator('a.folio[href*="GX-1042"]').click();
        await waitHash(page,'#/clientes/GX-1042/resumen');
        assert(await page.locator('#client-directory').evaluate(e=>e.hidden),label+' directory not hidden');
        assert(await page.locator('#client-detail').isVisible(),label+' dossier not visible');
        await dimensions(page,label,'dossier');
        await page.locator('a[data-detail-tab="servicios"]').click();
        await waitHash(page,'#/clientes/GX-1042/servicios');
        const rows=page.locator('.service-block');
        assert.equal(await rows.count(),2,label+' commercial service count');
        assert.equal(await rows.first().locator('.access-row').count(),2,label+' X2 access count');
        assert.equal(await rows.first().locator('h3').textContent(),'Google One',label+' X2 header');
        const accessDates=await rows.first().locator('.access-date').allTextContents();
        assert.deepEqual(accessDates,['15 NOV','23 NOV'],label+' two independent dates');
        const measure=await rows.first().locator('.access-row').first().evaluate(el=>{
          const a=el.querySelector('.access-label').getBoundingClientRect();
          const b=el.querySelector('.access-date').getBoundingClientRect();
          return {labelWidth:a.width,labelRight:a.right,dateLeft:b.left};
        });
        assert(measure.labelWidth>=75,label+' service access label collapsed '+JSON.stringify(measure));
        assert(measure.labelRight<=measure.dateLeft+1,label+' date overlap '+JSON.stringify(measure));
        await dimensions(page,label,'services');
        if(photo)await page.screenshot({path:'artifacts/admin-v4/servicios-'+width+'.png',fullPage:true});
        await page.locator('.return-link').click();
        await waitHash(page,'#/clientes');
        assert(await page.locator('#client-directory').isVisible(),label+' cannot return from dossier');
        await page.locator('a[data-nav="operaciones"]:visible').first().click();
        await waitHash(page,'#/operaciones');
        assert.equal(await page.locator('.operation-item').count(),3,label+' pending ops count');
        await page.locator('[data-ops-filter="solicitudes"]').click();
        assert.equal(await page.locator('.operation-item').count(),2,label+' requests count');
        await page.locator('[data-ops-filter="actividad"]').click();
        assert.equal(await page.locator('.operation-item').count(),1,label+' activity count');
        await page.locator('[data-ops-filter="pendientes"]').click();
        await dimensions(page,label,'ops');
        if(photo)await page.screenshot({path:'artifacts/admin-v4/operaciones-'+width+'.png',fullPage:true});
        await page.locator('a[data-nav="gestion"]:visible').first().click();
        await waitHash(page,'#/gestion');
        assert.equal(await page.locator('.module').count(),4,label+' management modules');
        await dimensions(page,label,'management');
        assert.equal(jsErrors.length,0,label+' JavaScript errors '+jsErrors.join(' / '));
        successes.push(label);
      }catch(e){errors.push(label+': '+(e.stack||e));}
      finally{await page.close();}
    }
  }finally{await browser.close();}
}
try{await waitServer();await run(chromium,'Chromium');await run(webkit,'WebKit');}
finally{server.kill('SIGTERM');}
console.log('GOXION TURNO: '+successes.length+' / 24 responsive browser scenarios PASS');
if(errors.length){console.error(errors.join('\n\n'));process.exitCode=1;}
else console.log('GOXION ADMIN V4 QA PASS');
