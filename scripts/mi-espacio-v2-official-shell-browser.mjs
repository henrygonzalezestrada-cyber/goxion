/* Browser QA: espejo nacido de la oficial, SIN clientes reales ni mutaciones.
   Simula únicamente el evento de sesión verificada y respuestas de lectura. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const PORT=4288,origin='http://127.0.0.1:'+PORT,url=origin+'/ayuda-espejo-feed-v2.html';
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){for(let i=0;i<90;i++){try{if((await fetch(url)).ok)return}catch(_){ }await nap(120)}throw Error('Servidor local del QA sin respuesta')}
const reply=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)});
const data={ok:true,cliente:{id:'qa-v2-root',clave:'QA',nombre:'Cliente QA',folio:'TEST',estado:'pagado',dia_pago:15,pagos_puntuales:3},servicios:[{id:'qa-svc',nombre:'Crunchyroll Mega Fan',monto:45,activo:true,perfil_nombre:'Perfil QA'}],pagos:[],referidos:[],gamificacion:{tareas:'',descuento:0},misiones_progreso:[],catalogo:[]};
const refs=[{clave:'crunchyroll-mega-fan',plataforma:'Crunchyroll',plan:'Mega Fan',precio_mensual_mxn:159,revisado_el:'2026-11-23'}];
async function run(browserType,label){
 const browser=await browserType.launch({headless:true});
 try{
  const visitor=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await visitor.route('**/*',route=>{
   const u=route.request().url();
   if(u.startsWith(origin))return route.continue();
   if(u.includes('/functions/v1/mi-espacio'))return route.fulfill(reply({ok:true,cliente:null,catalogo:[],clientes:{},modo:'publico'}));
   return route.abort();
  });
  await visitor.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await visitor.locator('#gx-v2-feed').isVisible(),false,label+' invitado no ve V2');
  await visitor.close();
  for(const width of [390,320]){
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
   const failures=[];
   page.on('pageerror',e=>failures.push(String(e.message)));
   await page.route('**/*',route=>{
    const u=route.request().url();
    if(u.startsWith(origin))return route.continue();
    if(u.includes('/rest/v1/goxion_precios_referencia'))return route.fulfill(reply(refs));
    if(u.includes('/functions/v1/mi-espacio'))return route.fulfill(reply(data));
    if(u.includes('/functions/v1/estado-cuenta-beta'))return route.fulfill(reply({ok:true,estado_cuenta:{publicable:true,total_actual:45,estado:'pagado'}}));
    if(u.includes('/functions/v1/cancelaciones-cliente'))return route.fulfill(reply({ok:true,solicitudes:[]}));
    if(u.includes('/functions/v1/credenciales-cliente'))return route.fulfill(reply({ok:true,entregas:[]}));
    if(u.includes('/functions/v1/novedades-cliente'))return route.fulfill(reply({ok:true,novedades:[]}));
    if(u.includes('/functions/v1/accesos-cliente-beta'))return route.fulfill(reply({ok:true,accesos:[]}));
    if(u.includes('/functions/v1/notificaciones-cliente'))return route.fulfill(reply({ok:true,items:[]}));
    return route.abort();
   });
   await page.addInitScript(()=>localStorage.setItem('goxion_client_token','QA-SESSION-SIMULADA-SOLO-CI'));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(750); // completar inicialización pública antes de simular el evento de sesión
   // El contexto ya trae token de prueba desde addInitScript: esta página es un cliente autenticado.
   // La prueba de invitado se ejecuta en una página independiente sin token.
   assert.equal(await page.locator('#gxi-auth').count(),0,label+'/'+width+' sin segundo formulario de login');
   await page.evaluate(()=>{
    localStorage.setItem(window.GOXION_CORE.STORAGE.CLIENT_TOKEN,'QA-SESSION-SIMULADA-SOLO-CI');
    window.goxionCurrentClientKey='QA';
    document.body.classList.remove('no-scroll');
    for(const id of ['view-inicio','view-dashboard','view-catalogo','view-soporte'])
     document.getElementById(id)?.classList.toggle('active',id==='view-dashboard');
    window.dispatchEvent(new Event('goxion:client-ready'));
   });
   try{await page.locator('#gx-v2-feed').waitFor({state:'visible',timeout:14000})}
   catch(e){
    const diag=await page.evaluate(()=>({
     token:!!localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN),
     identity:typeof getCurrentClientKey==='function'?getCurrentClientKey():'unavailable',
     mirrorData:!!window.GOXION_V2_DATA,
     root:!!document.getElementById('gx-v2-feed'),
     active:document.getElementById('view-dashboard')?.className,
     feedReady:document.getElementById('gxi-shell')?.hidden,
     oldAvailable:!!document.getElementById('dash-services'),
     runtimeScript:[...document.scripts].some(x=>x.src.includes('official-feed-runtime.js')),
     integration:window.__GOXION_INTEGRATION_TEST||null
    }));
    console.error('ROOT QA DIAGNOSTIC',JSON.stringify({diag,failures}));
    throw e;
   }
   await page.locator('#gxs-list .gxs-card').first().waitFor({state:'visible',timeout:10000});
   const v=await page.evaluate(()=>{
    const hero=document.getElementById('focus'),surface=document.querySelector('#gx-v2-feed .gxc-surface');
    return {old:!!document.getElementById('dash-services'),oldHidden:getComputedStyle(document.getElementById('gx-v2-legacy-host')).display,
      catalog:!!document.getElementById('view-catalogo'),support:!!document.getElementById('view-soporte'),
      glass:getComputedStyle(surface).backdropFilter,logoSrc:document.querySelector('#gx-v2-feed .gxn-wordmark')?.getAttribute('src'),
      hero:hero?.querySelector('.focus-title')?.textContent,live:document.body.classList.contains('gx-v2-private-visible')};
   });
   assert(v.old&&v.catalog&&v.support,label+'/'+width+' otros módulos oficiales presentes');
   assert.equal(v.oldHidden,'none',label+'/'+width+' dashboard viejo invisible, handlers conservados');
   assert(v.glass.includes('11.75px'),label+'/'+width+' material neutral aprobado: '+v.glass);
   assert.equal(v.logoSrc,'./logo2.PNG',label+'/'+width+' recurso raíz correcto');
   assert(v.live,label+'/'+width+' header original oculto solo en el feed');
   await page.locator('#gxn-nav [data-gxn-target=catalog]').click();
   await page.locator('#view-catalogo.active').waitFor({state:'visible',timeout:5000});
   assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('gx-v2-private-visible')),false,label+'/'+width+' volver al shell oficial');
   await page.evaluate(()=>window.switchTab('soporte'));
   await page.locator('#view-soporte.active').waitFor({state:'visible',timeout:5000});
   await page.evaluate(()=>window.switchTab('inicio'));
   await page.locator('#gx-v2-feed').waitFor({state:'visible',timeout:5000});
   assert.equal(await page.locator('#gx-v2-feed .gxb-tile').count(),3,label+'/'+width+' beneficios nuevos intactos');
   const v2Errors=failures.filter(x=>/official-feed-runtime|official-feed-host|Cannot read properties of null.*gxn|Unexpected token.*scope/i.test(x));
   assert.deepEqual(v2Errors,[],label+'/'+width+' excepciones propias del injerto');
   console.log('OK espejo raíz '+label+'/'+width+' — feed, legado oculto, Catálogo, Soporte, vuelta, blur');
   await page.close();
  }
 }finally{await browser.close()}
}
try{await ready();await run(chromium,'chromium');await run(webkit,'webkit')}
finally{server.kill('SIGTERM')}
