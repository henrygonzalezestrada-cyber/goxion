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
      assert.equal(await page.locator('.gx-rb-marquee-group').count(),3);
      assert.equal(await page.locator('.gx-rb-marquee-group:first-child .gx-rb-quote').count(),2);
      const reviewsGlass=await page.evaluate(()=>{
        const card=document.querySelector('#view-inicio .gx-rb-quote');
        const style=getComputedStyle(card);
        return {
          height:card.getBoundingClientRect().height,
          font:getComputedStyle(card.querySelector('p')).fontSize,
          blur:style.webkitBackdropFilter||style.backdropFilter,
          background:style.backgroundImage
        };
      });
      assert(reviewsGlass.height>=188,'Reseñas con altura protagonista');
      assert(parseFloat(reviewsGlass.font)>=13,'Tipografía más grande');
      assert.match(reviewsGlass.blur,/blur\(22px\)/,'Cristal difuminado real');
      assert.match(reviewsGlass.background,/linear-gradient/);
      // Move section into viewport: animation should advance without a pointer swipe.
      await page.locator('#gx-rb-home').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const firstTransform=await page.locator('.gx-rb-marquee-strip').evaluate(
        node=>getComputedStyle(node).transform
      );
      await page.waitForTimeout(900);
      const secondTransform=await page.locator('.gx-rb-marquee-strip').evaluate(
        node=>getComputedStyle(node).transform
      );
      assert.notEqual(firstTransform,secondTransform,'La cinta avanza automáticamente');
      await page.locator('#gx-rb-track').evaluate(node=>
        node.dispatchEvent(new Event('pointerdown',{bubbles:true}))
      );
      await page.waitForTimeout(100);
      const stopped=await page.locator('.gx-rb-marquee-strip').evaluate(
        node=>getComputedStyle(node).animationPlayState
      );
      assert.equal(stopped,'paused','Pausar al tocar la cinta');
      await page.locator('#gx-rb-track').evaluate(node=>
        node.dispatchEvent(new Event('pointerup',{bubbles:true}))
      );
      assert.equal(await page.locator('#gx-rb-open').count(),0,'La cinta no tiene CTA redundante');
      const placement=await page.evaluate(()=>{
        const section=document.querySelector('#gx-rb-home');
        const final=document.querySelector('#view-inicio .final-cta');
        return {
          beforeFinal:section.nextElementSibling===final,
          hasTopBorder:getComputedStyle(section).borderTopWidth,
          mask:getComputedStyle(document.querySelector('.gx-rb-marquee')).maskImage
        };
      });
      assert.equal(placement.beforeFinal,true,'Opiniones debe estar cerca del cierre de Inicio');
      assert.equal(placement.hasTopBorder,'0px','Cinta sin línea divisoria');
      assert.match(placement.mask,/linear-gradient/,'Bordes con difuminado');
      assert.equal(await page.locator('#gx-rb-stars .gx-rb-star').count(),5);
      assert.equal(await page.locator('.gx-rb-star').count(),5);
      // Ayuda must use its glass/editorial language, not Admin dashboard chrome.
      const skin=await page.evaluate(()=>{
        const home=document.querySelector('#view-inicio .gx-rb-home');
        return {
          accent:getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim(),
          homeBorder:getComputedStyle(home).borderRightStyle,
          homeTransparent:getComputedStyle(home).backgroundColor,
          heading:home.querySelector('h2')?.textContent,
          hasPreviewBar:Boolean(document.querySelector('.gx-rb-demo-bar--ayuda'))
        };
      });
      assert.equal(skin.accent,'#00f2fe');
      assert.equal(skin.homeBorder,'none');
      assert.equal(skin.homeTransparent,'rgba(0, 0, 0, 0)');
      assert.match(skin.heading,/GOXION/);
      assert.equal(skin.hasPreviewBar,true);
      await page.evaluate(()=>window.openFeedbackModal());
      await dom(page,()=>document.getElementById('modal-feedback').classList.contains('show'));
      const hero=await page.evaluate(()=>({
        noBox:getComputedStyle(document.querySelector('.gx-rb-emblem')).borderTopStyle,
        traced:document.querySelector('.gx-rb-neon-star-line')!==null,
        cyanFill:getComputedStyle(document.querySelector('.gx-rb-close')).backgroundColor,
        darkX:getComputedStyle(document.querySelector('.gx-rb-close')).color,
        runner:document.querySelector('.gx-rb-neon-star-runner')!==null,
        runnerLength:document.querySelector('.gx-rb-neon-star-runner')?.getAttribute('pathLength')
      }));
      assert.equal(hero.noBox,'none');
      assert.equal(hero.traced,true);
      assert.equal(hero.cyanFill,'rgb(0, 242, 254)','El disco debe estar completamente cyan');
      assert.equal(hero.darkX,'rgb(6, 18, 24)','La X debe ser oscura');
      assert.equal(hero.runner,true,'La estrella tiene un trazo neón independiente');
      assert.equal(hero.runnerLength,'100');
      const orbitStart=await page.locator('.gx-rb-neon-star-runner').evaluate(
        node=>getComputedStyle(node).strokeDashoffset
      );
      await page.waitForTimeout(450);
      const orbitEnd=await page.locator('.gx-rb-neon-star-runner').evaluate(
        node=>getComputedStyle(node).strokeDashoffset
      );
      assert.notEqual(orbitStart,orbitEnd,'El haz neón recorre realmente el contorno');
      assert.match(await page.locator('#gx-rb-title').innerText(),/Cómo te fue/i);
      const modalSkin=await page.evaluate(()=>({
        scoreBorder:getComputedStyle(document.querySelector('.gx-rb-score')).borderTopStyle,
        buttonGradient:getComputedStyle(document.querySelector('.gx-rb-submit')).backgroundImage,
        emblem:document.querySelectorAll('.gx-rb-form-head .gx-rb-emblem svg').length
      }));
      assert.equal(modalSkin.scoreBorder,'none');
      assert.match(modalSkin.buttonGradient,/linear-gradient/);
      assert.equal(modalSkin.emblem,1);
      await click(page,'.gx-rb-star[data-score="5"]');
      assert.equal(await page.locator('.gx-rb-star.is-lit').count(),5);
      await page.locator('#gx-rb-text').fill(marker);
      await page.locator('.gx-rb-consent').evaluate(label=>label.click());
      assert.equal(await page.locator('#gx-rb-consent').isChecked(),true,
        'El control completo debe activar autorización explícita');
      await click(page,'#gx-rb-submit');
      await dom(page,()=>!document.getElementById('gx-rb-success').hidden);
      assert.match(await page.locator('#gx-rb-success-text').innerText(),/después de que se apruebe/i);
      assert.equal(await page.locator('#gx-rb-submit').innerText(),'Listo');
      assert.equal(await page.locator('#gx-rb-submit svg').count(),1);
      await dom(page,()=>document.getElementById('gx-rb-fields').hidden,4000);
      const successState=await page.evaluate(()=>{
        const shell=document.querySelector('.gx-rb-shell');
        return {
          complete:document.getElementById('modal-feedback').classList.contains('gx-rb-complete'),
          shellOverflow:getComputedStyle(shell).overflowY,
          shellTouch:getComputedStyle(shell).touchAction,
          pageLocked:getComputedStyle(document.body).position,
          height:shell.getBoundingClientRect().height,
          before:shell.scrollTop
        };
      });
      assert.equal(successState.complete,true);
      assert.equal(successState.shellOverflow,'clip');
      assert.equal(successState.shellTouch,'none');
      assert.equal(successState.pageLocked,'fixed');
      assert(successState.height<480,'Éxito debe ser compacto, sin hueco inferior');
      const frozenScroll=await page.evaluate(()=>{
        const shell=document.querySelector('.gx-rb-shell');
        shell.scrollTop=150;
        return shell.scrollTop;
      });
      assert.equal(frozenScroll,successState.before,'La confirmación no permite scroll interno');
      await click(page,'#gx-rb-submit');
      await dom(page,()=>!document.getElementById('modal-feedback').classList.contains('show'));
      const restored=await page.evaluate(()=>getComputedStyle(document.body).position);
      assert.notEqual(restored,'fixed','Cerrar debe restaurar desplazamiento');
      assert.equal(realNotifications,0,'La beta no debe notificar a la base real');

      await page.goto(origin+'/preview/opiniones/admin-opiniones.html',{waitUntil:'domcontentloaded'});
      await dom(page,()=>!!document.getElementById('gx-rb-admin-list'));
      assert.equal(await page.locator('#gx-rb-stat-pending').innerText(),'2');
      const adminFont=await page.evaluate(()=>getComputedStyle(document.querySelector('.gx-rb-admin')).fontFamily);
      assert.match(adminFont,/Rajdhani/i,'La estética de Admin debe mantenerse intacta');
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
      assert.equal(await page.locator('.gx-rb-marquee-group:first-child .gx-rb-quote').count(),3);
      assert.match(await page.locator('#gx-rb-track').innerText(),/Excelente ayuda beta/);
      await page.evaluate(()=>window.openFeedbackModal());
      await click(page,'.gx-rb-star[data-score="3"]');
      await page.locator('#gx-rb-text').fill(privateMarker);
      assert.equal(await page.locator('#gx-rb-consent').isChecked(),false);
      await click(page,'#gx-rb-submit');
      await dom(page,()=>!document.getElementById('gx-rb-success').hidden);
      assert.match(await page.locator('#gx-rb-success-text').innerText(),/privado/i);
      assert.equal(await page.locator('#gx-rb-submit').innerText(),'Listo');
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
