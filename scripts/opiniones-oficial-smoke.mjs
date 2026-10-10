import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const port=4215,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
  env:{...process.env,PORT:String(port)},stdio:'ignore'
});
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(page,fn,timeout=13000){
  const stop=Date.now()+timeout;
  while(Date.now()<stop){
    if(await page.evaluate(fn).catch(()=>false))return;
    await nap(100);
  }
  throw Error('Estado de Opiniones oficiales no alcanzado');
}
function row(id,rating,txt,status='published',consent=true){
  return {id,rating,text:txt,author:'Cliente G.',consent,verified:true,status,
    date:new Date().toISOString(),reply:'',reviewedAt:null};
}
try{
  let ready=false;
  for(let i=0;i<85;i++){
    try{if((await fetch(origin+'/ayuda.html')).ok){ready=true;break}}catch{}
    await nap(100);
  }
  assert(ready,'No inicia servidor de pruebas');
  for(const [name,engine] of Object.entries({chromium,webkit})){
    const browser=await engine.launch({headless:true});
    try{
      const published=[
        row('11111111-1111-4111-8111-111111111111',5,'Excelente atención GOXION, muy fácil de navegar.'),
        row('22222222-2222-4222-8222-222222222222',4,'La experiencia es sencilla y el catálogo es claro.')
      ];
      const pending=row('33333333-3333-4333-8333-333333333333',5,'La ayuda fue amable y respondió mis dudas.','pending');
      let all=[...published,pending],submission=0,adminActions=0,missionCompletes=0;
      const handler=async route=>{
        const url=route.request().url();
        let body={};try{body=JSON.parse(route.request().postData()||'{}')}catch{}
        const h=route.request().headers();
        if(url.includes('/mi-espacio')&&body.modo==='completar_mision_tipo'){
          assert.equal(h['x-client-token'],'test-client-token','Misión solo con sesión de cliente');
          assert.equal(body.tipo,'FEEDBACK','Solo completar misión de opinión');
          assert(submission>0,'Prohibido completar misión sin haber guardado la opinión');
          missionCompletes++;
          return route.fulfill({status:200,contentType:'application/json',
            body:JSON.stringify({ok:true,completadas:[0],progreso:[{mision_index:0}]})});
        }
        if(!url.includes('/opiniones-goxion')){
          return route.fulfill({status:401,contentType:'application/json',body:'{"ok":false}'});
        }
        if(body.modo==='publicas'){
          return route.fulfill({status:200,contentType:'application/json',
            body:JSON.stringify({ok:true,opiniones:all.filter(r=>r.status==='published'&&r.consent)})});
        }
        if(body.modo==='enviar'){
          assert.equal(h['x-client-token'],'test-client-token');
          assert.equal(body.rating,5);
          assert.equal(body.consent,true);
          assert(body.text.length>=12);
          submission++;
          return route.fulfill({status:200,contentType:'application/json',
            body:JSON.stringify({ok:true,opinion:row('44444444-4444-4444-8444-444444444444',5,body.text,'pending')})});
        }
        if(body.modo==='admin_listar'){
          assert.equal(h['x-admin-token'],'test-admin-token');
          return route.fulfill({status:200,contentType:'application/json',
            body:JSON.stringify({ok:true,opiniones:all})});
        }
        if(body.modo==='admin_accion'){
          assert.equal(h['x-admin-token'],'test-admin-token');
          const review=all.find(x=>x.id===body.id);
          assert(review,'No se puede moderar una opinión inexistente');
          adminActions++;
          if(body.accion==='publicar')review.status='published';
          else if(body.accion==='ocultar')review.status='hidden';
          else if(body.accion==='responder')review.reply=body.respuesta;
          else throw Error('Acción inesperada');
          return route.fulfill({status:200,contentType:'application/json',
            body:JSON.stringify({ok:true,opinion:review})});
        }
        return route.fulfill({status:400,contentType:'application/json',body:'{"ok":false}'});
      };
      const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
      page.on('dialog',d=>d.dismiss().catch(()=>{}));
      await page.route('**/functions/v1/**',handler);
      await page.goto(origin+'/ayuda.html',{waitUntil:'domcontentloaded',timeout:30000});
      await until(page,()=>!!window.GOXION_REVIEWS&&typeof window.openFeedbackModal==='function');
      await page.evaluate(()=>window.GOXION_REVIEWS.refreshPublished());
      await until(page,()=>document.querySelectorAll('.gx-rb-marquee-group:first-child .gx-rb-quote').length===2);
      assert.equal(await page.locator('.gx-rb-marquee-group').count(),3);
      assert.equal(await page.locator('#view-inicio .gx-rb-review-identity strong').first().innerText(),'Cliente G.');
      const first=await page.locator('.gx-rb-neon-star-line').count();
      assert.equal(first,1,'Silueta original montada');
      await page.evaluate(()=>{
        localStorage.setItem(window.GOXION_CORE.STORAGE.CLIENT_TOKEN,'test-client-token');
        window.getCurrentClientKey=()=> 'opiniones-mission-test';
        globalClientesData['opiniones-mission-test']={
          nombre:'Cliente de prueba',folio:'TEST-01',
          gamificacion:{progreso:[]}
        };
        const mission=document.createElement('div');
        mission.id='mission-0';
        mission.className='mission-item locked';
        mission.innerHTML='<span class="mission-checkbox">🔒</span>';
        document.body.appendChild(mission);
      });
      await page.evaluate(()=>window.openFeedbackModal(0,'TEST-01'));
      await until(page,()=>document.querySelector('#modal-feedback')?.classList.contains('show'));
      const initialStyle=await page.locator('#gx-rb-submit').evaluate(b=>{
        let c=getComputedStyle(b);return {bg:c.backgroundImage,color:c.color};
      });
      await page.locator('#gx-rb-submit').evaluate(b=>b.click());
      await until(page,()=>document.getElementById('gx-rb-error')?.textContent.length>0);
      assert.equal(submission,0,'No guardar formulario vacío');
      assert.equal(missionCompletes,0,'La misión debe continuar pendiente si falla la validación');
      await page.locator('.gx-rb-star[data-score="5"]').evaluate(b=>b.click());
      await page.locator('#gx-rb-text').fill('GOXION es confiable y su equipo responde muy rápido.');
      await page.locator('.gx-rb-consent').evaluate(e=>e.click());
      await page.locator('#gx-rb-submit').evaluate(b=>b.click());
      await until(page,()=>document.querySelector('.gx-rb-emblem')?.classList.contains('gx-rb-morph-done'));
      assert.equal(submission,1);
      assert.equal(missionCompletes,1,'Solo una misión FEEDBACK completada tras guardar');
      assert.equal(await page.locator('#mission-0.done').count(),1,
        'La misión pendiente debe transformarse en completada visualmente');
      assert.equal((await page.locator('#gx-rb-submit').innerText()).trim(),'Listo');
      assert.equal(await page.locator('#gx-rb-submit svg').count(),0);
      const finalStyle=await page.locator('#gx-rb-submit').evaluate(b=>{
        let c=getComputedStyle(b);return {bg:c.backgroundImage,color:c.color};
      });
      assert.deepEqual(finalStyle,initialStyle,'El CTA conserva el mismo acabado azul/cian');
      await page.locator('#gx-rb-submit').evaluate(b=>b.click());
      await until(page,()=>!document.querySelector('#modal-feedback')?.classList.contains('show'));
      await page.evaluate(()=>window.openFeedbackModal());
      assert.equal(await page.locator('.gx-rb-emblem.gx-rb-morph-done').count(),0);
      await page.close();

      const admin=await browser.newPage({viewport:{width:390,height:844}});
      admin.on('dialog',d=>d.dismiss().catch(()=>{}));
      await admin.route('**/functions/v1/**',handler);
      await admin.goto(origin+'/admin.html',{waitUntil:'domcontentloaded',timeout:30000});
      await until(admin,()=>!!window.GOXION_REVIEWS&&typeof window.gxOpenOpinionsAdmin==='function');
      assert.equal(await admin.locator('button[onclick="gxOpenOpinionsAdmin()" ]').count(),1,'Acceso a Opiniones dentro de Gestión');
      await admin.evaluate(()=>localStorage.setItem(window.GOXION_CORE.STORAGE.ADMIN_TOKEN,'test-admin-token'));
      await admin.evaluate(()=>window.gxOpenOpinionsAdmin());
      await until(admin,()=>document.querySelector('#gx-rb-stat-pending')?.textContent==='1');
      assert.equal(await admin.locator('.gx-rb-admin-overlay').evaluate(e=>e.hidden),false);
      await admin.locator('.gx-rb-admin-card [data-action="publish"]').evaluate(b=>b.click());
      await until(admin,()=>document.querySelector('#gx-rb-stat-public')?.textContent==='3');
      assert.equal(adminActions,1);
      await admin.locator('#gx-rb-admin-close').evaluate(b=>b.click());
      assert.equal(await admin.locator('.gx-rb-admin-overlay').evaluate(e=>e.hidden),true);
      await admin.close();
      console.log(name+': carrusel, misión FEEDBACK verificada tras guardar, estrella→check y moderación Admin OK');
    }finally{await browser.close()}
  }
}finally{server.kill('SIGTERM')}
console.log('GOXION Opiniones oficial · smoke sin escritura a producción OK');
