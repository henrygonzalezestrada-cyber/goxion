import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const engine=process.env.BROWSER_ENGINE||'chromium';
const playwright=require('playwright');
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('assets/js/ayuda/24-push-piloto.js');
const hero=read('preview/mi-espacio-v2/hero-states-k3.js'),release=read('preview/mi-espacio-v2/release-announcement-k3.js');
const css=read('assets/css/push-pilot.css'),notificationCss=read('assets/css/realtime-client-notifications.css'),releaseCss=read('preview/mi-espacio-v2/release-announcement.css');
const browser=await playwright[engine].launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
const url='https://fixture.invalid/ayuda-espejo-feed-v2.html',fixtureId='fixture-client';
const shot=async(page,name)=>{if(process.env.K3_SCREENSHOTS){mkdirSync(process.env.K3_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.K3_SCREENSHOTS+'/'+name+'.png',animations:'disabled'});}};
try {
 for(const mode of ['guest','outside-gate','iphone-web','iphone-installed','android','denied']){
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await context.addInitScript(({mode,fixtureId})=>{
    window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:'test-token'},endpoint:name=>{if(name!=='push-cliente')throw Error('Unexpected endpoint');return 'https://api.fixture.invalid/functions/v1/'+name}};
    window.GOXION_V2_CLIENT_ID=fixtureId;
    if(mode!=='guest')localStorage.setItem('test-token','fixture-session');
    Object.defineProperty(navigator,'userAgent',{value:mode.startsWith('iphone')?'iPhone Safari':'Chrome Android'});
    Object.defineProperty(navigator,'standalone',{value:mode==='iphone-installed'});
    window.PushManager=function(){};window.Notification={permission:mode==='denied'?'denied':'default'};
    let subscribed=false,regCount=0;
    const sub={toJSON:()=>({endpoint:'https://fcm.googleapis.com/mock/test',keys:{p256dh:'fake',auth:'fake'}}),unsubscribe:async()=>{subscribed=false;return true}};
    const reg={pushManager:{getSubscription:async()=>subscribed?sub:null,subscribe:()=>{window._gesture=true;subscribed=true;return Promise.resolve(sub)}}};
    Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>{window._registered=++regCount;return reg},ready:Promise.resolve(reg),getRegistration:async()=>reg}});
    window.GOXION_CLIENT_NOTIFICATIONS={open:()=>document.querySelector('#gx-client-notif-sheet').classList.add('show'),close:()=>document.querySelector('#gx-client-notif-sheet').classList.remove('show')};
  },{mode,fixtureId});
  const page=await context.newPage(),actions=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=`<!doctype html><html lang=es><head><meta name=viewport content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#0b0a10;color:#f7f5ff;font-family:system-ui;padding:16px}:root{--card-glass:#16161f;--neon-blue:#79e6fc;--gx-notif-panel-max:calc(100dvh - 82px)} .focus{position:relative;padding:16px;border-radius:22px;background:#22212b;height:168px}.focus-copy{max-width:75%}.focus-icon{position:absolute;right:20px;top:20px}.focus-bottom{display:flex;align-items:center;justify-content:center;gap:8px}.focus-action{border:0;background:#3b394b;border-radius:999px;color:#fff;padding:10px 13px;min-height:36px}.gx-state-panel{position:absolute;inset:0;background:#22212b;padding:16px;border-radius:22px;display:grid;grid-template-columns:1fr 75px;grid-template-rows:1fr auto}.gx-state-panel[hidden],.gx-state-panel [hidden],.gx-state-bubbles[hidden]{display:none!important}.gx-state-panel .focus-bottom{grid-column:1/-1}.gx-state-bubbles{display:flex;gap:5px}.gx-state-bubble{border:0;background:#3c334d;border-radius:50%;height:38px;width:38px;color:#d2bcff}.gx-state-art svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.8}.gx-state-hero-art{display:grid;place-items:center}.gx-state-hero-art svg{width:65px;height:65px}.gx-state-detail,.focus-meta{font-size:12px;color:#c8c1d6}.focus-title{font-size:21px;font-weight:650}.gx-state-panel[hidden]{display:none}.gxb-wrap{margin-top:16px}.gxb-panel{background:#22212b;padding:12px;border-radius:20px} ${notificationCss} ${css}</style></head><body class="gx-v2-private-visible"><main id="gx-v2-feed"><div class=focus id=focus><div class=focus-copy><div class=focus-title>Todo al corriente</div><span class=focus-meta>Fecha de pago</span></div><span class=focus-icon>✓</span><div class=focus-bottom><button class=focus-action>Ver mi cuenta</button></div></div><div class=gxb-wrap><button id=show-mission>Misiones</button><div id=gxb-panel class=gxb-panel data-benefit=mission hidden><div id=gxb-content>Misiones existentes</div></div></div></main><button id="gx-client-notif-launch" onclick="GOXION_CLIENT_NOTIFICATIONS.open()">Notificaciones</button><section id=gx-client-notif-sheet class="gx-client-notif-sheet"><div class=gx-client-notif-handle></div><header class=gx-client-notif-head><div class=gx-client-notif-toolbar><button aria-label="Marcar todo como leído">✓</button><button aria-label="Eliminar todo">⌫</button></div><strong class=gx-client-notif-head-title>Notificaciones</strong><button class=gx-client-notif-close aria-label=Cerrar onclick="GOXION_CLIENT_NOTIFICATIONS.close()">×</button></header><div class=gx-client-notif-list id="gx-client-notif-list">Bandeja existente</div></section><output id=gxn-toast hidden></output><script>${hero}</script><script>window.hero=GOXION_HERO_STATES.create({card:document.querySelector('#focus'),logo:()=>'',storage:false});window.updateHero=()=>hero.update({cliente:{id:'${fixtureId}'},servicios:[],alertas:null},'clear');updateHero();document.querySelector('#show-mission').onclick=()=>document.querySelector('#gxb-panel').hidden=false;</script><script>${source}</script></body></html>`;
  await page.route(url,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:fixture}));
  await page.route('https://api.fixture.invalid/functions/v1/push-cliente',async r=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-client-token','Access-Control-Allow-Methods':'POST, OPTIONS'};
    if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers});return}
    const body=JSON.parse(r.request().postData());actions.push(body);
    const responses={elegibilidad:{eligible:mode!=='outside-gate'},config:{publicKey:'BA'},activar:{deviceId:'12345678-abcd-4321-abcd-123456789012'},estado:{active:true,categories:['cuenta','servicios','importante']},probar:{accepted:true},preferencias:{},desactivar:{}};
    await r.fulfill({json:{ok:true,...responses[body.accion]},headers});
  });
  await page.route('**/Logo%20individual.png',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" rx="12" fill="#17121e"/><path d="M10 24h30M25 8v32" stroke="#c6b1f7" stroke-width="4"/></svg>'}));
  await page.goto(url);page.setDefaultTimeout(8000);
  const panel=page.locator('.gx-push-pilot'),gear=page.getByRole('button',{name:'Ajustes de notificaciones'});
  await page.getByRole('button',{name:'Notificaciones',exact:true}).click();
  if(mode==='guest'||mode==='outside-gate'){
    await page.waitForTimeout(1100);assert(!(await gear.count()));assert(!await page.evaluate(()=>window._registered));assert(mode==='guest'?actions.length===0:actions.length>0&&actions.every(x=>x.accion==='elegibilidad'));
  }else{
    await gear.waitFor({state:'visible'});await gear.click();assert(await panel.isVisible());assert(!(await page.locator('#gx-client-notif-list').isVisible()));assert(!(await gear.isVisible()));assert.equal(await page.locator('.gx-client-notif-head-title').textContent(),'Ajustes');assert(await page.getByRole('button',{name:'Volver',exact:true}).isVisible());
    if(mode==='iphone-web'){
      await shot(page,'iphone-settings');
      const info=page.getByRole('button',{name:'Información',exact:true});
      assert(!(await panel.locator('[data-help-info]').isVisible()));await info.click();assert(await panel.locator('[data-help-info]').isVisible());await info.click();
      await panel.getByRole('button',{name:'Cómo activar en iPhone'}).click();
      assert.equal(await page.locator('.gx-client-notif-head-title').textContent(),'Activar en iPhone');
      assert(!(await panel.locator('[data-settings]').isVisible()));
      for(const [i,title] of ['Toca Compartir','Agrega GOXION a Inicio','Crea tu icono','Abre GOXION desde Inicio','Activa tus avisos'].entries()){
        await panel.getByRole('heading',{name:title,exact:true}).waitFor();
        const art=panel.locator('[data-step-art]');assert(await art.isVisible());assert((await art.boundingBox()).width>=250);
        assert(!(await panel.locator('[data-step-hint]').isVisible()));
        await shot(page,'iphone-step-'+(i+1));if(i<4)await panel.getByRole('button',{name:'Siguiente'}).click();
      }
      await info.click();assert(await panel.locator('[data-step-hint]').isVisible());await info.click();
      assert(!await page.evaluate(()=>window._registered));await panel.getByRole('button',{name:'Entendido'}).click();
      assert(await panel.locator('[data-settings]').isVisible());assert(!(await panel.locator('[data-guide]').isVisible()));
      await panel.getByRole('button',{name:'Cómo activar en iPhone'}).click();await page.getByRole('button',{name:'Volver',exact:true}).click();assert(await panel.locator('[data-settings]').isVisible());await page.getByRole('button',{name:'Volver',exact:true}).click();assert(await gear.isVisible());assert(await page.locator('#gx-client-notif-list').isVisible());
    }else if(mode==='denied'){
      await panel.getByText('Los avisos están bloqueados',{exact:false}).waitFor();assert(!(await panel.getByRole('button',{name:'Activar avisos'}).isVisible()));await shot(page,'denied');
    }else{
      await panel.getByRole('button',{name:'Activar avisos'}).click();assert(await page.evaluate(()=>window._gesture));
      await panel.getByRole('button',{name:'Enviar aviso de prueba'}).click();
      await panel.getByText('Aviso de prueba enviado.',{exact:false}).waitFor();await shot(page,'settings-active');
      // Confirmation is tied to the accepted test on this authenticated device.
      const enroll=actions.find(x=>x.accion==='activar');assert.deepEqual(enroll.datos.categories,['cuenta','servicios','importante']);
      await panel.getByRole('checkbox',{name:'Misiones y recompensas'}).check();await panel.getByRole('button',{name:'Guardar preferencias'}).click();await panel.getByText('Preferencias guardadas.').waitFor();
      assert(actions.find(x=>x.accion==='preferencias').datos.categories.includes('beneficios'));
      await panel.getByRole('button',{name:'Compartir mi experiencia'}).click();
      assert(await page.getByRole('button',{name:'Ver mi cuenta'}).isVisible());
      const bubble=page.getByRole('button',{name:'¿Recibiste nuestro aviso?'});await bubble.click();await shot(page,'hero-feedback');
      await page.getByRole('button',{name:mode==='android'?'No me llegó':'Sí, me llegó'}).click();
      assert(!(await bubble.count()));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('goxion_push_k3_feedback_local')).answer),mode==='android'?'no':'yes');
      if(mode==='android'){
        await panel.getByRole('button',{name:'Desactivar avisos'}).click();await panel.getByText('Avisos desactivados.').waitFor();
      }else{
        await page.getByRole('button',{name:'Misiones',exact:true}).click();
        await page.getByText('Vista previa de misión de lanzamiento').waitFor();assert(await page.getByText('20%',{exact:false}).isVisible());await shot(page,'mission-preview');
        await Promise.all([page.waitForRequest(r=>r.method()==='POST'&&r.postData()?.includes('"desactivar"')),page.evaluate(()=>{window.dispatchEvent(new Event('goxion:client-logout'));localStorage.removeItem('test-token')})]);
        assert.equal(await page.evaluate(()=>localStorage.getItem('goxion_push_pilot_device')),null);
        assert.equal(await page.evaluate(()=>localStorage.getItem('goxion_push_k3_feedback_local')),null);
      }
    }
  }
  assert.deepEqual(errors,[]);console.log('PASS',mode);await context.close();
 }
 // The existing release controller owns sequencing. K3 only adds one chapter for the active pilot.
 for(const gate of [true,false,"late"]){
  const ctx=await browser.newContext({viewport:{width:375,height:812},reducedMotion:gate===true?'no-preference':'reduce'});
  await ctx.addInitScript(({gate})=>{localStorage.setItem('test-token','fixture');window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:'test-token'}};window.getCurrentClientKey=()=> 'casone';window.globalClientesData={casone:{}};window.GOXION_LEGAL_V2={getQueueStatus:()=>({estado:'aceptado',modalAbierto:false}),getAccessState:()=>({})};window._gate=gate===true;window.GOXION_PUSH_K3={canInvite:()=>window._gate,active:()=>false,deferSettings:()=>{window._defer=true;return true},releaseFinished:()=>{window._finished=true}};},{gate});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html data-gx-release-launch="pilot"><head><meta name=viewport content="width=device-width, initial-scale=1"><style>'+releaseCss+css+'</style></head><body><main id=view-dashboard class=active>Feed</main><script>'+release+'</script></body></html>'}));
  await page.goto(url);const modal=page.locator('#gx-release-overlay');await modal.waitFor({state:'visible',timeout:7000});
  const progress=modal.locator('.gx-launch-progress');assert.equal(await progress.getAttribute('aria-valuemax'),gate===true?'7':'6');
  for(let j=0;j<5;j++){if(gate==="late"&&j===3)await page.evaluate(()=>window._gate=true);await modal.locator('.gx-launch-next').click();}
  if(gate){assert.equal(await progress.getAttribute("aria-valuemax"),"7");await modal.getByRole('heading',{name:'Siempre conectado.'}).waitFor();
    const bell=modal.locator('.gx-launch-pulso svg');assert(await bell.isVisible());assert((await bell.boundingBox()).width>=140);
    const note=modal.locator('.gx-k3-launch-note');assert(!(await note.isVisible()));await modal.getByRole('button',{name:'Información sobre la activación'}).click();assert(await note.isVisible());await modal.getByRole('button',{name:'Información sobre la activación'}).click();assert(!(await note.isVisible()));
    const motion=await modal.locator('.gx-pulso-bell-body').evaluate(el=>getComputedStyle(el).animationName);assert.equal(motion,gate===true?'gx-k3-pulso-ring':'none');
    if(gate===true)await shot(page,'novedades-push');
    await modal.getByRole('button',{name:'Activar notificaciones'}).click();assert(await page.evaluate(()=>window._defer));await modal.locator('.gx-launch-next').click()}
  await modal.locator('.gx-launch-next').click();assert(await page.evaluate(()=>window._finished));assert.deepEqual(errors,[]);console.log('PASS novedades',gate==='late'?'late-server-gate':gate?'pilot-enabled':'closed-gate');await ctx.close();
 }
}finally{await browser.close()}
