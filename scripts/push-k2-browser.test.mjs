import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const {chromium}=require('playwright');
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/ayuda/24-push-piloto.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try {
 for(const mode of ['guest','outside-gate','iphone-web','iphone-installed','android','denied']){
  const context=await browser.newContext({viewport:{width:375,height:812}});
  await context.addInitScript(({mode})=>{
    window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:'test-token'}};
    if(mode!=='guest')localStorage.setItem('test-token','fixture-session');
    Object.defineProperty(navigator,'userAgent',{value:mode.startsWith('iphone')?'iPhone Safari':'Chrome Android'});
    Object.defineProperty(navigator,'standalone',{value:mode==='iphone-installed'});
    window.PushManager=function(){};window.Notification={permission:mode==='denied'?'denied':'default'};
    let subscribed=false,regCount=0;
    const sub={toJSON:()=>({endpoint:'https://fcm.googleapis.com/mock/test',keys:{p256dh:'fake',auth:'fake'}}),unsubscribe:async()=>{subscribed=false;return true}};
    const reg={pushManager:{getSubscription:async()=>subscribed?sub:null,subscribe:()=>{window._gesture=true;subscribed=true;return Promise.resolve(sub)}}};
    Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>{window._registered=++regCount;return reg},ready:Promise.resolve(reg),getRegistration:async()=>reg}});
  },{mode});
  const page=await context.newPage(),actions=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fixture.invalid/ayuda-espejo-feed-v2.html',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<button id="gx-client-notif-launch">Notificaciones</button><section><div id="gx-client-notif-list"></div></section><script>'+source+'</script>'}));
  await page.route('https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/push-cliente',async r=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-client-token','Access-Control-Allow-Methods':'POST, OPTIONS'};
    if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers});return}
    const body=JSON.parse(r.request().postData());actions.push(body);
    const responses={elegibilidad:{eligible:mode!=='outside-gate'},config:{publicKey:'BA'},activar:{deviceId:'12345678-abcd-4321-abcd-123456789012'},estado:{active:true,categories:['cuenta','servicios','importante']},probar:{accepted:true},preferencias:{},desactivar:{}};
    await r.fulfill({json:{ok:true,...responses[body.accion]},headers});
  });
  await page.goto('https://fixture.invalid/ayuda-espejo-feed-v2.html');
  const panel=page.locator('.gx-push-pilot');page.setDefaultTimeout(8000);
  if(mode==='guest'){
    await page.waitForTimeout(850);assert(!(await panel.count()));assert(!actions.length);
  }else{
    await panel.waitFor({state:'attached'});
    if(mode==='outside-gate'){assert(!(await panel.isVisible()));assert(!await page.evaluate(()=>window._registered));assert.deepEqual(actions.map(x=>x.accion),['elegibilidad']);}
    else if(mode==='iphone-web'){
      await panel.getByRole('button',{name:'Cómo activar'}).click();assert(await panel.getByText('Elige Agregar a pantalla de inicio',{exact:false}).isVisible());assert(!await page.evaluate(()=>window._registered));
    }else if(mode==='denied'){
      await panel.getByText('Los avisos están bloqueados',{exact:false}).waitFor();assert(!(await panel.getByRole('button',{name:'Activar avisos'}).isVisible()));
    }else{
      await panel.getByRole('button',{name:'Activar avisos'}).click();
      assert(await page.evaluate(()=>window._gesture));
      await panel.getByRole('button',{name:'Enviar prueba'}).click();
      await panel.getByText('El proveedor aceptó el aviso',{exact:false}).waitFor();
      const enroll=actions.find(x=>x.accion==='activar');assert.deepEqual(enroll.datos.categories,['cuenta','servicios','importante']);
      await panel.getByRole('button',{name:'Tipos de avisos'}).click();await panel.getByText('Misiones y recompensas').click();
      await panel.getByRole('button',{name:'Guardar preferencias'}).click();await panel.getByText('Preferencias guardadas.').waitFor();
      assert(actions.find(x=>x.accion==='preferencias').datos.categories.includes('beneficios'));
      if(mode==='android'){
        await panel.getByRole('button',{name:'Desactivar'}).click();await panel.getByText('Avisos desactivados.').waitFor();
      }else{
        await Promise.all([page.waitForRequest(r=>r.method()==='POST'&&r.postData()?.includes('"desactivar"')),page.evaluate(()=>{window.dispatchEvent(new Event('goxion:client-logout'));localStorage.removeItem('test-token')})]);
        assert.equal(await page.evaluate(()=>localStorage.getItem('goxion_push_pilot_device')),null);
      }
    }
  }
  assert.deepEqual(errors,[]);console.log('PASS',mode);await context.close();
 }
}finally{await browser.close()}
