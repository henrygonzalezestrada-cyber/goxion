/* GOXION Mi Espacio V2 · browser QA de la interfaz lab con fuentes simuladas
   SOLO dentro de CI: jamás se entregan datos QA en la aplicación. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const PORT=4270,origin='http://127.0.0.1:'+PORT,url=origin+'/preview/mi-espacio-v2/index.html';
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
async function ready(){for(let i=0;i<90;i++){try{if((await fetch(url)).ok)return}catch(_){}await nap(120)}throw Error('Servidor QA no disponible')}
const refs=[
 {clave:'netflix-premium',plataforma:'Netflix',plan:'Premium 4K',precio_mensual_mxn:369,revisado_el:'2026-11-23',fuente_url:'https://www.netflix.com/mx',notas:''},
 {clave:'youtube-premium',plataforma:'YouTube',plan:'Individual',precio_mensual_mxn:159,revisado_el:'2026-11-23',fuente_url:'https://www.telcel.com',notas:''}
];
const common={
 servicios:[
  {id:'svc-netflix',nombre:'Netflix Premium',monto:109,activo:true,perfil_nombre:'Perfil 2',perfil_pin:'4826',correo_login:'qa@example.test'},
  {id:'svc-youtube',nombre:'YouTube Premium',monto:79,activo:true,modo_acceso:'invitacion',correo_login:'qa2@example.test'}
 ],
 pagos:[{id:'payment1',fecha:'2026-11-15',periodo:'2026-11',estado:'pagado',monto:188}],
 gamificacion:{tareas:'[CATALOGO] Explorar el catálogo\n[COMPARTIR] Compartir GOXION\n[FEEDBACK] Compartir opinión',descuento:10,misiones_version:1},
 misiones_progreso:[{mision_index:0,misiones_version:1},{mision_index:1,misiones_version:1}],
 referidos:[{id:'ref1',meses:1,plataformas:2,beneficio_reclamado:false}],
 catalogo:[{id:'ca',nombre:'Netflix Premium',precio:109,activo:true}]
};
function client(overdue=false){
 return {ok:true,...common,cliente:{id:'qa-client',clave:'QA',folio:'QA001',nombre:overdue?'Casone QA':'Mario QA',
 pagos_puntuales:3,dia_pago:15,estado:overdue?'pendiente':'pagado',pago_en_revision:false,pago_revision_estado:''}};
}
function body(json){return {status:200,contentType:'application/json',body:JSON.stringify(json)}}
async function run(engine,name){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,320,280]){
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const overdue=width===320;
   const result=client(overdue);
   await page.addInitScript(()=>localStorage.setItem('goxion_client_token','QA-LOCAL-ONLY'));
   await page.route('**/*',route=>{
    const u=route.request().url();
    if(u.startsWith(origin))return route.continue();
    if(u.includes('/rest/v1/goxion_precios_referencia'))return route.fulfill(body(refs));
    if(u.includes('/functions/v1/mi-espacio'))return route.fulfill(body(result));
    if(u.includes('/functions/v1/estado-cuenta-beta'))return route.fulfill(body({ok:true,estado_cuenta:{publicable:true,total_actual:188,estado:overdue?'vencido':'pagado'}}));
    if(u.includes('/functions/v1/cancelaciones-cliente'))return route.fulfill(body({ok:true,solicitudes:[]}));
    if(u.includes('/functions/v1/credenciales-cliente'))return route.fulfill(body({ok:true,entregas:[]}));
    if(u.includes('/functions/v1/novedades-cliente'))return route.fulfill(body({ok:true,novedades:[]}));
    if(u.includes('/functions/v1/accesos-cliente-beta'))return route.fulfill(body({ok:true,accesos:[]}));
    if(u.includes('/functions/v1/notificaciones-cliente')){
     const notifications=Array.from({length:12},(_,i)=>({id:'notice'+i,leida:false,titulo:'Aviso '+(i+1),mensaje:'Actualización de cuenta'}));
     return route.fulfill(body({ok:true,items:notifications}));
    }
    return route.abort();
   });
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#gxi-shell').waitFor({state:'visible',timeout:12000});
   await page.locator('#gxv-savings').waitFor({state:'visible',timeout:12000});
   await nap(100);
   const geometry=await page.evaluate(()=>({
    row:[...document.querySelectorAll('#gxb-row .gxb-tile')].map(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width})),
    viewportWidth:document.documentElement.scrollWidth,windowWidth:window.innerWidth,
    logo:!!document.querySelector('.gxn-brand .gxn-wordmark'),hero:getComputedStyle(document.getElementById('focus')).position,
    nav:document.querySelectorAll('#gxn-nav').length,
    noOldStyles:![...document.styleSheets].some(s=>(s.href||'').includes('assets/css/ayuda.css')),
    noDemos:!document.querySelector('#demo-panel,#gxs-demo-case,#gxv-demo-case'),
    savings:document.getElementById('gxv-amount').textContent
   }));
   assert.equal(geometry.row.length,3,name+'/'+width+' tres compactas lab');
   assert(geometry.row.every(r=>r.width>52&&Math.abs(r.top-geometry.row[0].top)<3),name+'/'+width+' una fila '+JSON.stringify(geometry.row));
   assert(geometry.viewportWidth<=geometry.windowWidth+1,name+'/'+width+' sin scroll horizontal '+JSON.stringify(geometry));
   assert.equal(geometry.nav,1,name+'/'+width+' cápsula única');
   assert(geometry.logo&&geometry.noOldStyles&&geometry.noDemos,name+'/'+width+' pureza de laboratorio');
   assert.match(geometry.savings,/340/,name+'/'+width+' ahorro = (369+159)-(109+79) sin fixtures en página');
   assert.equal(await page.locator('#gxs-list .gxs-card').count(),2,name+'/'+width+' solo servicios activos');
   assert.equal(await page.locator('#gxm-list .gxm-entry').count(),1,name+'/'+width+' historial real');
   const hero=await page.locator('#focus-title').textContent();
   assert.equal(hero,overdue?'Tienes un pago vencido':'Todo al corriente',name+'/'+width+' estado real');
   assert.equal(await page.locator('#gxn-bell .gxi-bell-count').textContent(),'12',name+'/'+width+' conteo real');
   await page.locator('#gxb-row [data-gxb="referral"]').click();
   await page.locator('#gxb-panel').waitFor({state:'visible'});
   assert.match(await page.locator('#gxb-title').textContent(),/invitado avanza/i,name+'/'+width+' panel laboratorio real');
   assert.equal(await page.locator('.gxb-morph-surface').count(),0,name+'/'+width+' morph finalizó');
   await page.locator('#gxb-dismiss').click();
   await page.locator('#gxb-row').waitFor({state:'visible'});
   await page.locator('#gxs-list .gxs-trigger').first().click();
   assert.equal(await page.locator('#gxs-list').evaluate(el=>el.innerHTML.includes('4826')),false,name+'/'+width+' PIN no en HTML oculto');
   await page.locator('#gxs-list [data-gxi-action=pin]').click();
   assert.match(await page.locator('#gxs-list').innerText(),/4826/,name+'/'+width+' PIN solo después de acción explícita');
   await page.locator('#gxs-list [data-gxi-action=pin]').click();
   assert.equal(await page.locator('#gxs-list').evaluate(el=>el.innerHTML.includes('4826')),false,name+'/'+width+' PIN vuelve a ocultarse');
   assert.deepEqual(errors,[],name+'/'+width+' excepciones JS');
   await page.close();
   console.log('OK '+name+' '+width+' px — lab, estados, ahorro, servicios, morph, privacidad');
  }
 }finally{await browser.close()}
}
try{await ready();await run(chromium,'chromium');await run(webkit,'webkit')}
finally{server.kill('SIGTERM')}
