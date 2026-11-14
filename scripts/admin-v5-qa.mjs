import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const port=4877,entry='http://127.0.0.1:'+port+'/preview/admin-v5/index.html';
const widths=[280,320,360,375,390,430,600,760,761,900,1120,1440];
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const passed=[],failed=[];
mkdirSync('artifacts/admin-v5',{recursive:true});
async function wait(){
  for(let n=0;n<90;n++){try{const r=await fetch(entry);if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,140));
  }
  throw Error('Local preview server not ready');
}
async function settled(page){
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
}
async function waitRoute(page,to){
  await page.waitForFunction((hash)=>{
    if(location.hash!==hash)return false;
    const parts=hash.replace('#/','').split('/');
    const screen=document.getElementById('screen-'+parts[0]);
    if(!screen||screen.hidden)return false;
    const dossier=document.getElementById('dossier');
    const directory=document.getElementById('directory');
    if(parts[0]==='clientes'){
      if(parts[1]&&(!directory.hidden||dossier.hidden))return false;
      if(!parts[1]&&(directory.hidden||!dossier.hidden))return false;
      if(parts[2]&&!document.querySelector('[data-detail="'+parts[2]+'"].is-active'))return false;
    }
    return true;
  },to);
  await settled(page);
}
async function geometry(page,tag){
  const d=await page.evaluate(()=>{
    const box=(el)=>{const r=el.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};};
    const shown=(el)=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
    const nav=[...document.querySelectorAll('.side-link,.mobile-link')].filter(shown);
    const row=[...document.querySelectorAll('.screen:not([hidden]) .focus-button,.screen:not([hidden]) .renewal-item,.screen:not([hidden]) .mini-panel,.screen:not([hidden]) .customer-card,.screen:not([hidden]) .operation-row,.screen:not([hidden]) .segment')].filter(shown);
    const logo=document.querySelector(innerWidth<=760?'.brand img':'.side-mark img');
    const capsule=document.querySelector('.topbar').getBoundingClientRect();
    const capsuleShell=document.querySelector('.header-shell');
    const capsuleRadius=getComputedStyle(document.querySelector('.topbar')).borderTopLeftRadius;
    const cards=[...document.querySelectorAll('.customer-card')].filter(shown);
    const cardBounds=cards.map(box);
    const cardStateData=cards.map(x=>({state:x.dataset.state,color:getComputedStyle(x).getPropertyValue('--state-ink').trim()}));
    return {vw:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      nav:nav.map(box),active:nav.filter(x=>x.classList.contains('is-selected')).map(x=>x.dataset.nav),
      screen:document.querySelector('.screen:not([hidden])')?.id||null,
      rowMin:row.length?Math.min(...row.map(el=>el.getBoundingClientRect().height)):null,
      logoLoaded:logo.complete&&logo.naturalWidth>0,
      color:getComputedStyle(document.querySelector('.focus-panel')).backgroundColor,
      capsule:box(document.querySelector('.topbar')),capsuleRadius,capsuleHeight:capsule.height,shellPosition:getComputedStyle(capsuleShell).position,
      cardBounds,cardStateData};
  });
  assert(d.logoLoaded,tag+' official brand image unavailable');
  assert(d.documentWidth<=d.vw+1,tag+' document horizontal overflow '+d.documentWidth+' > '+d.vw);
  assert(d.bodyWidth<=d.vw+1,tag+' body horizontal overflow '+d.bodyWidth);
  assert.equal(d.nav.length,4,tag+' number of destinations');
  assert(d.capsule.l>=-1&&d.capsule.r<=d.vw+1,tag+' glass capsule outside viewport');
  assert(d.capsule.h>=49&&d.capsule.h<=59,tag+' glass capsule wrong height: '+d.capsule.h);
  assert(d.capsuleRadius!=='0px',tag+' glass capsule lost rounded corners');
  assert(d.shellPosition==='sticky',tag+' floating capsule is not sticky');
  for(const b of d.cardBounds)assert(b.l>=-1&&b.r<=d.vw+1,tag+' customer card outside screen');
  if(d.cardStateData.length>1){
    const colors=new Set(d.cardStateData.map(c=>c.color));
    assert(colors.size>1,tag+' customers have no state-distinct colors');
  }
  assert.deepEqual(d.active,[d.screen.replace('screen-','')],tag+' active nav');
  if(d.rowMin!==null)assert(d.rowMin>=42,tag+' clickable row below touch target '+d.rowMin);
  for(let i=0;i<d.nav.length;i++){
    const a=d.nav[i];
    assert(a.l>=-1 && a.r<=d.vw+1,tag+' navigation outside viewport '+i);
    assert(a.h>=44,tag+' navigation touch target '+i);
  }
}
async function visit(page,path){await page.locator('a[data-nav="'+path+'"]:visible').first().click();await waitRoute(page,'#/'+path);}
async function scenarios(browserType,name){
  const browser=await browserType.launch({headless:true});
  try{
    for(const width of widths){
      const label=name+' '+width+'px',page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
      const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
      const capture=name==='Chromium'&&[320,390,1440].includes(width);
      try{
        const response=await page.goto(entry,{waitUntil:'domcontentloaded'});
        assert(response?.ok(),label+' page failed to load');
        await page.locator('.renewal-item').first().waitFor();
        await settled(page);
        assert.equal(await page.locator('.renewal-item').count(),4,label+' renewals');
        assert.equal(await page.locator('.rhythm-bar').count(),4,label+' calendar chart');
        await geometry(page,label+' home');
        if(capture)await page.screenshot({path:'artifacts/admin-v5/home-'+width+'.png',fullPage:true});
        await visit(page,'clientes');
        assert.equal(await page.locator('.customer-card').count(),4,label+' customers');
        await geometry(page,label+' customers');
        if(capture)await page.screenshot({path:'artifacts/admin-v5/clients-'+width+'.png',fullPage:true});
        const valeria=page.locator('.customer-card[data-id="GX-1042"]');
        assert.equal(await valeria.getAttribute('data-state'),'due',label+' initial due state');
        assert((await valeria.locator('.customer-state-note').innerText()).includes('Mañana'),label+' due note');
        await page.locator('#advance-demo-date').click();
        await page.waitForFunction(()=>document.getElementById('demo-date-label').textContent==='15 NOV');
        assert.equal(await valeria.getAttribute('data-state'),'due',label+' due today');
        await page.locator('#advance-demo-date').click();
        await page.waitForFunction(()=>document.querySelector('.customer-card[data-id="GX-1042"]')?.dataset.state==='late');
        assert.equal(await valeria.locator('.status-tag').innerText(),'Vencido',label+' dynamic late state label');
        assert((await valeria.locator('.customer-state-note').innerText()).includes('días vencido'),label+' late note');
        await geometry(page,label+' changed state');
        if(capture)await page.screenshot({path:'artifacts/admin-v5/clients-overdue-'+width+'.png',fullPage:true});
        for(let turn=0;turn<3;turn++)await page.locator('#advance-demo-date').click();
        await page.waitForFunction(()=>document.getElementById('demo-date-label').textContent==='14 NOV');
        assert.equal(await valeria.getAttribute('data-state'),'due',label+' back to initial state');
        await page.locator('#search-client').fill('Sofia');
        assert.equal(await page.locator('.customer-card').count(),1,label+' name search without accents');
        await page.locator('#search-client').fill('');
        await page.locator('[data-client-filter="atencion"]').click();
        assert.equal(await page.locator('.customer-card').count(),3,label+' attention');
        await page.locator('[data-client-filter="corriente"]').click();
        assert.equal(await page.locator('.customer-card').count(),1,label+' current');
        await page.locator('[data-client-filter="todos"]').click();
        await page.locator('a.customer-card[href*="GX-1042"]').click();
        await waitRoute(page,'#/clientes/GX-1042/resumen');
        assert(await page.locator('#directory').evaluate(x=>x.hidden),label+' directory must close');
        assert(await page.locator('#dossier').isVisible(),label+' dossier should open');
        await geometry(page,label+' dossier');
        await page.locator('[data-detail="servicios"]').click();
        await waitRoute(page,'#/clientes/GX-1042/servicios');
        const units=page.locator('.service-unit');
        assert.equal(await units.count(),2,label+' one commercial Google One plus Netflix');
        assert.equal(await units.first().locator('h3').innerText(),'Google One',label+' first service');
        assert.equal(await units.first().locator('.access-row').count(),2,label+' X2 access count');
        assert.deepEqual(await units.first().locator('.access-date').allTextContents(),['15 NOV','23 NOV'],label+' separate dates');
        const spacing=await units.first().locator('.access-row').first().evaluate(n=>{
          const a=n.querySelector('.access-label').getBoundingClientRect();
          const b=n.querySelector('.access-date').getBoundingClientRect();
          return {labelWidth:a.width,labelRight:a.right,dateLeft:b.left};
        });
        assert(spacing.labelWidth>75,label+' access label collapsed '+JSON.stringify(spacing));
        assert(spacing.labelRight<=spacing.dateLeft+1,label+' date collision '+JSON.stringify(spacing));
        await geometry(page,label+' services');
        if(capture)await page.screenshot({path:'artifacts/admin-v5/services-'+width+'.png',fullPage:true});
        await page.locator('.back-link').click();
        await waitRoute(page,'#/clientes');
        await visit(page,'operaciones');
        assert.equal(await page.locator('.operation-row').count(),3,label+' pending ops');
        await page.locator('[data-ops-filter="solicitudes"]').click();
        assert.equal(await page.locator('.operation-row').count(),2,label+' requests');
        await page.locator('[data-ops-filter="actividad"]').click();
        assert.equal(await page.locator('.operation-row').count(),1,label+' activity');
        await page.locator('[data-ops-filter="pendientes"]').click();
        await geometry(page,label+' operations');
        if(capture)await page.screenshot({path:'artifacts/admin-v5/operations-'+width+'.png',fullPage:true});
        await visit(page,'gestion');
        assert.equal(await page.locator('.module-card').count(),4,label+' management');
        await geometry(page,label+' management');
        assert.equal(jsErrors.length,0,label+' script errors '+jsErrors.join(' / '));
        passed.push(label);
      }catch(e){failed.push(label+': '+(e.stack||e));}
      finally{await page.close();}
    }
  }finally{await browser.close();}
}
try{await wait();await scenarios(chromium,'Chromium');await scenarios(webkit,'WebKit');}
finally{server.kill('SIGTERM');}
console.log('GOXION NEXO V5 '+passed.length+' / 24 browser x viewport scenarios passed');
if(failed.length){console.error('FAILURES:\n'+failed.join('\n\n'));process.exitCode=1;}
else console.log('GOXION NEXO V5 QA PASS');
