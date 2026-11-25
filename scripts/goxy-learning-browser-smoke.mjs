// Isolated browser interaction test. No API calls, no real accounts, no public test page.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const js=readFileSync('preview/goxion-ai/goxy-feedback.js','utf8');
const css=readFileSync('preview/goxion-ai/mascota.css','utf8');
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await page.route('**/*',r=>r.abort());
  await page.setContent('<html data-gx-support-v3><body><div id="view-soporte"><div class="gxai-bubble" id="answer">Respuesta de prueba</div></div></body></html>');
  await page.addStyleTag({content:css});await page.addScriptTag({content:js});
  await page.evaluate(()=>{
   window.requests=[];window.current=true;window.rejectVote=false;
   window.GOXY_FEEDBACK.attach({doc:document,node:document.querySelector('#answer'),topic:'support',source:'local',
    send:async payload=>{window.requests.push(payload);return window.rejectVote?{ok:false,code:'FEEDBACK_UNAVAILABLE'}:{ok:true,vote:payload.vote};},
    isCurrent:()=>window.current,reducedMotion:()=>false});
  });
  const up=page.getByRole('button',{name:'Respuesta útil',exact:true}),down=page.getByRole('button',{name:'Respuesta no útil',exact:true});
  await up.click();
  assert.equal(await up.getAttribute('aria-pressed'),'false','No confirmar antes de animación');
  await page.waitForFunction(()=>document.querySelector('[data-vote="1"]').getAttribute('aria-pressed')==='true');
  assert.equal(await up.locator('svg').getAttribute('fill'),'currentColor');
  await down.click();
  await page.waitForFunction(()=>document.querySelector('[data-vote="-1"]').getAttribute('aria-pressed')==='true');
  assert.equal(await up.getAttribute('aria-pressed'),'false');
  const reason=page.getByRole('button',{name:'No entendió',exact:true});
  await reason.click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.gxai-feedback-reason')).some(e=>e.textContent==='No entendió'&&e.getAttribute('aria-pressed')==='true'));
  await down.click();await page.waitForFunction(()=>document.querySelector('[data-vote="-1"]').getAttribute('aria-pressed')==='false');
  assert.equal(await reason.isVisible(),false);
  await page.evaluate(()=>{window.rejectVote=true;});await up.click();
  await page.waitForFunction(()=>document.querySelector('.gxai-feedback-status').textContent.includes('No se guardó'));
  assert.equal(await up.getAttribute('aria-pressed'),'false');
  const sent=await page.evaluate(()=>window.requests);
  assert.deepEqual(sent.map(x=>x.vote),[1,-1,-1,0,1]);
  assert.equal(sent[2].reason,'understanding');assert.equal(new Set(sent.map(x=>x.responseId)).size,1);
  assert.ok(sent.every(x=>Object.keys(x).sort().join(',')==='reason,responseId,source,topic,vote'));
  await page.evaluate(()=>{window.current=false;});await down.click();
  assert.equal(await page.evaluate(()=>window.requests.length),5,'No writes after session change');
  console.log(name+' Goxy vote interaction mock: PASS');
 }finally{await browser.close();}
}
