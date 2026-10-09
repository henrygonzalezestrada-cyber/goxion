import {chromium, webkit} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=4184, origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const services=[{id:'prime',nombre:'Prime Video',precio:45,disponibles:5,safeId:'prime'},{id:'disney',nombre:'Disney+ Premium',precio:89,disponibles:2,safeId:'disney'},{id:'crunch',nombre:'Crunchyroll cuenta completa',precio:100,disponibles:1,safeId:'crunch'}];
// Exercise native form submission without Playwright waiting forever for a
// moving WebKit footer to become geometrically stable (layout is checked below).
async function submitCart(page){
  // Error text is set before the handler's finally block unlocks the form.
  // Wait for a completed request rather than dropping the next click while busy.
  await page.waitForFunction(()=>{
    const button=document.querySelector('#gx-cart-form button[type=submit]');
    return button && !button.disabled && !button.classList.contains('is-sending');
  },null,{timeout:10000});
  await page.locator('#gx-cart-form button[type=submit]').evaluate(button=>{
    if(button.disabled)throw new Error('Botón de carrito deshabilitado');
    button.click();
  });
}
const promo={id:'promo-prime',nombre:'Prime Video · 3 meses',titulo_publico:'Prime Video · 3 meses',adquisicion_habilitada:true,mecanica:'precio_fijo',duracion_periodos:3,precio_promocional_total:99,items:[{servicio_id:'prime',servicio:services[0]}],disponibilidad:{disponible:true,items:[{servicio_id:'prime',nombre:'Prime Video',requiere_cupo:true}]}};
try{
  for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  for(const [name,engine] of Object.entries({chromium,webkit})){
    const browser=await engine.launch({headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
    if(name==='webkit'){
      const nativeWait=page.waitForFunction.bind(page);
      page.waitForFunction=(expression,arg,options={})=>
        nativeWait(expression,arg,{polling:100,...options});
    }
    page.on('pageerror', e=>console.error('PAGE',e.message));
    let posts=[], fail=true, remaining=2;
    await page.route('**/*.supabase.co/**',async route=>{
      const url=route.request().url();
      let data={ok:true};
      if(url.includes('/mi-espacio'))data={ok:true,catalogo:services};
      if(url.includes('promociones-catalogo'))data={ok:true,promociones:[promo]};
      if(url.includes('inventario-publico'))data={ok:true,inventario:services.map(s=>({...s,disponibles:s.id==='disney'?remaining:s.disponibles}))};
      if(url.includes('notificar-goxion')){posts.push(route.request().postDataJSON());data=fail?{ok:false,error:'Prueba de error del servidor'}:{ok:true};}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto(origin+'/ayuda.html');
    await page.waitForFunction(()=>Object.values(window.catalogGroups||{}).flatMap(x=>x.plans||[]).some(x=>x.id==='disney'));
    await page.evaluate(({services,promo})=>{
      document.getElementById('view-catalogo').classList.add('active');
      GOXION_CART.changeService('Disney+ Premium',1);GOXION_CART.changeService('Disney+ Premium',1);
      GOXION_CART.changeService('Disney+ Premium',1); // cap at two
      GOXION_CART.changeService('Crunchyroll cuenta completa',1);
      GOXION_CART.addPromotion(promo);GOXION_CART.open();
    },{services,promo});
    await page.waitForFunction(()=>{
      const dialog=document.getElementById('gx-cart-dialog');
      return dialog.open && !dialog.classList.contains('is-opening');
    },null,{timeout:10000});
    await page.screenshot({path:`/tmp/goxion-cart-compact-${name}.png`});
    const layout = await page.evaluate(()=>{ const d=document.getElementById('gx-cart-dialog').getBoundingClientRect(); const f=document.querySelector('#gx-cart-dialog footer').getBoundingClientRect(); return {width:d.width,height:d.height,footer:f.bottom,viewport:innerHeight,rows:[...document.querySelectorAll('.gx-cart-line')].map(x=>x.getBoundingClientRect().height)}; });
    console.log('Layout',layout);
    assert.ok(layout.rows.every(h=>h<135)); assert.ok(layout.footer<layout.viewport);
    assert.match(await page.locator('#gx-cart-total').innerText(),/377/);
    assert.match(await page.locator('#gx-cart-lines').innerText(),/2 perfiles/);
    assert.match(await page.locator('#gx-cart-lines').innerText(),/1 cuenta completa/);
    assert.match(await page.locator('#gx-cart-lines').innerText(),/Paquete · 3 meses/);
    await page.locator('#gx-cart-phone').fill('123');
    await submitCart(page);
    assert.equal(posts.length,0);
    await page.locator('#gx-cart-phone').fill('9611234567');
    remaining=1;
    await submitCart(page);
    await page.waitForFunction(()=>Boolean(document.getElementById('gx-cart-error').textContent));
    assert.match(await page.locator('#gx-cart-error').innerText(),/cupos/);
    assert.equal(posts.length,0);
    remaining=2;
    await submitCart(page);
    await page.waitForFunction(()=>document.getElementById('gx-cart-error').textContent.includes('Prueba de error'),
      null,{timeout:9000,polling:100}).catch(async error=>{
      console.log('CART DIAGNOSTIC',name,await page.evaluate(()=>({
        error:document.getElementById('gx-cart-error')?.textContent,
        buttonDisabled:document.querySelector('#gx-cart-form button[type=submit]')?.disabled,
        sending:document.querySelector('#gx-cart-form button[type=submit]')?.classList.contains('is-sending'),
        formHidden:document.querySelector('#gx-cart-form')?.hidden,
        count:document.querySelectorAll('.gx-cart-line').length
      })),{posts:posts.length,remaining,fail});
      throw error;
    });
    assert.match(await page.locator('#gx-cart-total').innerText(),/377/);
    fail=false;
    await page.screenshot({path:`/tmp/goxion-cart-${name}.png`});
    await submitCart(page);
    await page.locator('#gx-cart-success').waitFor({state:'visible'});
    assert.equal(posts.length,2);
    assert.equal(posts[0].referencia,posts[1].referencia);
    assert.match(posts[1].mensaje,/WhatsApp: \+529611234567/);
    assert.match(posts[1].mensaje,/PROMO_ID: promo-prime/);
    assert.match(posts[1].mensaje,/377/);
    assert.equal(posts[1].categoria,'pedidos');
    // WebKit puede mantener animada la geometría del diálogo aunque ya esté visible.
    await page.locator('.gx-cart-done').evaluate(button=>{
      if(button.disabled)throw new Error('Botón finalizar carrito deshabilitado');
      button.click();
    });
    await page.waitForFunction(()=>!document.getElementById('gx-cart-dialog').open);
    await page.evaluate(({services})=>{
      localStorage.setItem(GOXION_CORE.STORAGE.CLIENT_TOKEN,'test-token');
      window.goxionCurrentClientKey='cart-test';
      globalClientesData['cart-test']={nombre:'Cliente Prueba',folio:'TEST'};
      // Same identity selector used by the application.
      window.getCurrentClientKey=()=> 'cart-test';
      GOXION_CART.changeService('Crunchyroll cuenta completa',1);GOXION_CART.open();
    },{services});
    assert.equal(await page.locator('#gx-cart-phone').isVisible(),false);
    await submitCart(page);
    await page.locator('#gx-cart-success').waitFor({state:'visible'});
    assert.match(posts.at(-1).mensaje,/Folio: TEST/);
    assert.equal(posts.at(-1).session_token,'test-token');
    assert.match(await page.locator('#gx-cart-success-text').innerText(),/en breve/);
    console.log(name+': carrito mixto, cantidades, stock, error, reintento, invitado y sesión OK');
    await browser.close();
  }
}finally{server.kill('SIGTERM');}
