import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const port=4197,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
  env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function dom(page,fn,timeout=12000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(await page.evaluate(fn).catch(()=>false))return;
    await sleep(100);
  }
  throw new Error('Opiniones beta: condición del DOM no alcanzada');
}
async function click(page,selector){
  await page.locator(selector).evaluate(button=>button.click());
}
try{
  let ready=false;
  for(let i=0;i<75;i++){
    try{
      if((await fetch(origin+'/preview/opiniones/admin-opiniones.html')).ok){ready=true;break}
    }catch(_){}
    await sleep(100);
  }
  assert(ready,'Servidor preview no inició');

  for(const [name,engine] of Object.entries({chromium,webkit})){
    const browser=await engine.launch({headless:true});
    try{
      const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
      const marker='Excelente ayuda beta con estrellas animadas y respuesta puntual.';
      const privateMarker='La navegación es correcta, pero este comentario es privado.';
      let realNotifications=0;
      await page.route('**/functions/v1/notificar-goxion',route=>{
        realNotifications++;
        return route.fulfill({status:403,contentType:'application/json',body:'{"ok":false}'});
      });
      await page.goto(origin+'/preview/opiniones/ayuda-opiniones.html',{waitUntil:'domcontentloaded',timeout:30000});
      await dom(page,()=>!!window.GOXION_REVIEWS_BETA&&!!document.getElementById('gx-rb-home'));
      assert.equal(await page.locator('.gx-rb-quote').count(),2);
      assert.equal(await page.locator('.gx-rb-star').count(),5);
      await click(page,'#gx-rb-open');
      await dom(page,()=>document.getElementById('modal-feedback').classList.contains('show'));
      await click(page,'.gx-rb-star[data-score="5"]');
      assert.equal(await page.locator('.gx-rb-star.is-lit').count(),5);
      await page.locator('#gx-rb-text').fill(marker);
      await page.locator('#gx-rb-consent').check({force:true});
      await click(page,'#gx-rb-submit');
      await dom(page,()=>!document.getElementById('gx-rb-success').hidden);
      assert.match(await page.locator('#gx-rb-success-text').innerText(),/después de aprobarla/i);
      assert.equal(realNotifications,0,'La beta no debe notificar a la base real');

      await page.goto(origin+'/preview/opiniones/admin-opiniones.html',{waitUntil:'domcontentloaded'});
      await dom(page,()=>!!document.getElementById('gx-rb-admin-list'));
      assert.equal(await page.locator('#gx-rb-stat-pending').innerText(),'2');
      const pending=page.locator('.gx-rb-admin-card').filter({hasText:marker});
      assert.equal(await pending.count(),1);
      await pending.locator('[data-action="publish"]').click();
      await dom(page,()=>document.getElementById('gx-rb-stat-public').textContent==='3');
      await click(page,'[data-filter="published"]');
      const published=page.locator('.gx-rb-admin-card').filter({hasText:marker});
      assert.equal(await published.count(),1);
      await published.locator('.gx-rb-admin-actions button').filter({hasText:'Responder'}).click();
      await published.locator('.gx-rb-admin-answer input').fill('Gracias por tu experiencia.');
      await published.locator('.gx-rb-admin-answer button').click();
      await dom(page,()=>document.body.innerText.includes('GOXION responde: Gracias por tu experiencia.'));

      await page.goto(origin+'/preview/opiniones/ayuda-opiniones.html',{waitUntil:'domcontentloaded'});
      await dom(page,()=>!!document.querySelector('#gx-rb-track'));
      assert.equal(await page.locator('.gx-rb-quote').count(),3);
      assert.match(await page.locator('#gx-rb-track').innerText(),/Excelente ayuda beta/);
      await click(page,'#gx-rb-open');
      await click(page,'.gx-rb-star[data-score="3"]');
      await page.locator('#gx-rb-text').fill(privateMarker);
      assert.equal(await page.locator('#gx-rb-consent').isChecked(),false);
      await click(page,'#gx-rb-submit');
      await dom(page,()=>!document.getElementById('gx-rb-success').hidden);
      assert.match(await page.locator('#gx-rb-success-text').innerText(),/privada/i);
      await page.goto(origin+'/preview/opiniones/admin-opiniones.html',{waitUntil:'domcontentloaded'});
      await click(page,'[data-filter="private"]');
      const card=page.locator('.gx-rb-admin-card').filter({hasText:privateMarker});
      assert.equal(await card.count(),1);
      assert.equal(await card.locator('[data-action="publish"]').isDisabled(),true);
      assert.equal(realNotifications,0);
      await page.close();
      console.log(name+': estrellas, guardado, moderación, consentimiento, respuesta y cinta OK');
    }finally{await browser.close()}
  }
}finally{server.kill('SIGTERM')}
console.log('GOXION · Opiniones 2.0 beta smoke OK (datos exclusivamente locales)');
