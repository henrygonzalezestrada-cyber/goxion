/* QA automatizada del ESPEJO INTEGRAL. Datos sintéticos y módulo oficial simulado
   ÚNICAMENTE en el servidor de Playwright; nunca se incorporan a GOXION. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4282,origin='http://127.0.0.1:'+port,url=origin+'/preview/mi-espacio-v2/espejo.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(url)).ok)return}catch(_){}await sleep(100)}throw Error('QA server unavailable')}
const body=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)});
const client={ok:true,cliente:{id:'qa-mirror-id',nombre:'Integración QA',estado:'pagado',pagos_puntuales:1,dia_pago:15},servicios:[{id:'qa-svc',nombre:'Crunchyroll Mega Fan',monto:45,activo:true}],pagos:[],referidos:[],gamificacion:{tareas:'',descuento:0},misiones_progreso:[],catalogo:[]};
const refs=[{clave:'crunchyroll-mega-fan',plataforma:'Crunchyroll',plan:'Mega Fan · cuenta completa',precio_mensual_mxn:159,revisado_el:'2026-11-23',fuente_url:'https://apps.apple.com/mx/app/crunchyroll/id329913454'}];
const officialHTML=`<!doctype html><html><head><title>GOXION oficial · simulador de rutas CI</title><style>.view-section{display:none}.view-section.active{display:block}</style></head><body><header class="app-header">Header original</header><nav id="goxion-main-nav"></nav><div class="container"><section class="view-section active" id="view-inicio">Inicio oficial</section><section class="view-section" id="view-dashboard">Mi Espacio anterior</section><section class="view-section" id="view-catalogo">Catálogo oficial con su controlador</section><section class="view-section" id="view-soporte">Soporte oficial con su controlador</section></div><script>window.switchTab=function(name){for(const el of document.querySelectorAll('.view-section'))el.classList.remove('active');document.getElementById('view-'+name).classList.add('active')};<\/script></body></html>`;
async function test(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let unread=true;
  await page.addInitScript(()=>localStorage.setItem('goxion_client_token','QA-SESSION-ONLY'));
  await page.route('**/*',route=>{
   const u=route.request().url();
   if(u.endsWith('/ayuda.html'))return route.fulfill({status:200,contentType:'text/html',body:officialHTML});
   if(u.startsWith(origin))return route.continue();
   if(u.includes('/rest/v1/goxion_precios_referencia'))return route.fulfill(body(refs));
   if(u.includes('/functions/v1/mi-espacio'))return route.fulfill(body(client));
   if(u.includes('/functions/v1/estado-cuenta-beta'))return route.fulfill(body({ok:true,estado_cuenta:{publicable:true,total_actual:45,estado:'pagado'}}));
   if(u.includes('/functions/v1/cancelaciones-cliente'))return route.fulfill(body({ok:true,solicitudes:[]}));
   if(u.includes('/functions/v1/credenciales-cliente'))return route.fulfill(body({ok:true,entregas:[]}));
   if(u.includes('/functions/v1/novedades-cliente'))return route.fulfill(body({ok:true,novedades:[]}));
   if(u.includes('/functions/v1/accesos-cliente-beta'))return route.fulfill(body({ok:true,accesos:[]}));
   if(u.includes('/functions/v1/notificaciones-cliente')){
    const action=JSON.parse(route.request().postData()||'{}').accion;
    if(action==='marcar_todas'){unread=false;return route.fulfill(body({ok:true}))}
    if(action==='listar')return route.fulfill(body({ok:true,items:[{id:'qa-1',leida:!unread,titulo:'Estado de cuenta',mensaje:'Aviso de QA',source:'general',created_at:'2026-11-23T14:30:00Z'}]}));
    return route.fulfill(body({ok:true}));
   }
   return route.abort();
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#gxi-shell').waitFor({state:'visible',timeout:15000});
  await page.locator('#gxv-savings').waitFor({state:'visible',timeout:12000});
  await page.waitForFunction(()=>document.querySelector('#gx-client-notif-badge')?.textContent==='1',null,{timeout:10000});
  const expanded=await page.locator('#gxn-bell').evaluate(el=>({width:el.getBoundingClientRect().width,badge:getComputedStyle(el.querySelector('.gx-client-notif-badge')).backgroundImage}));
  assert(Math.abs(expanded.width-74)<2,name+' expanded bell '+expanded.width);
  assert(expanded.badge.includes('linear-gradient'),name+' gradient badge');
  await page.locator('#gxn-bell').click();
  await page.locator('#gx-client-notif-sheet.show').waitFor({state:'visible',timeout:3000});
  await page.locator('#gx-client-notif-mark-all').click();
  await page.locator('#gx-client-notif-mark-all').click();
  await page.waitForFunction(()=>document.querySelector('#gxn-bell')?.classList.contains('gx-has-new')===false,null,{timeout:7000});
  const collapsed=await page.locator('#gxn-bell').evaluate(el=>el.getBoundingClientRect().width);
  assert(Math.abs(collapsed-44)<2,name+' collapsed bell '+collapsed);
  await page.locator('#gx-client-notif-sheet .gx-client-notif-close').click();
  await page.locator('[data-gxn-target="catalog"]').click();
  await page.frameLocator('#gxi-official-frame').locator('#view-catalogo.active').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#gxi-space').isVisible(),false,name+' feed oculto en catálogo');
  const iframeUrl=await page.locator('#gxi-official-frame').getAttribute('src');
  assert(iframeUrl.endsWith('/ayuda.html'),name+' módulo oficial en iframe aislado');
  await page.locator('[data-gxn-target="support"]').click();
  await page.frameLocator('#gxi-official-frame').locator('#view-soporte.active').waitFor({state:'visible',timeout:7000});
  assert.equal(await page.locator('#gxi-official-frame').getAttribute('src'),iframeUrl,name+' iframe no se vuelve a crear');
  await page.locator('[data-gxn-target="space"]').click();
  await page.locator('#gxi-space').waitFor({state:'visible',timeout:5000});
  assert.equal(await page.locator('#gxi-official-portal').isVisible(),false,name+' retorno limpio al feed V2');
  assert.deepEqual(errors,[],name+' JS errors');
  console.log('OK espejo integral '+name+' — bell circular/expandida, badge degradado, navegación oficial y retorno');
 }finally{await browser.close()}
}
try{await ready();await test(chromium,'chromium');await test(webkit,'webkit')}
finally{server.kill('SIGTERM')}
