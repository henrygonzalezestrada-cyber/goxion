import { chromium, webkit } from 'playwright';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';

const PORT=4195,origin=`http://127.0.0.1:${PORT}`;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
  env:{...process.env,PORT:String(PORT)},stdio:'ignore'
});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const item=(id,title,action='account')=>({
  id,source:'general',tipo:'pago_recibido',titulo:title,mensaje:'Notificación de prueba',
  created_at:new Date().toISOString(),leida:false,accion:action,
  accion_label:action==='account'?'Ver estado de cuenta':'Ver servicios',accion_ref:''
});
const post=(route,data)=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify(data)
});
let failures=0;

try{
  let ready=false;
  for(let i=0;i<80;i++){
    try{if((await fetch(origin+'/preview/realtime/notification-smoke.html')).ok){ready=true;break;}}catch(_){}
    await pause(100);
  }
  assert(ready,'El servidor de fixture Realtime no inició');

  for(const [name,engine] of Object.entries({chromium,webkit})){
    const browser=await engine.launch({headless:true});
    try{
      const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
      const errors=[];
      page.on('pageerror',err=>errors.push(err.message));
      await page.addInitScript(()=>{
        localStorage.setItem('goxion_client_token','token-A');
        localStorage.setItem('gx-smoke-client','client-A');
      });
      const data={
        'token-A':[item('a1','Pago registrado'),item('a2','Beneficio disponible')],
        'token-B':[item('b1','Solicitud recibida')]
      };
      const actions=[];
      const listCount={'token-A':0,'token-B':0};
      let held=null;
      await page.route('**/functions/v1/notificaciones-cliente',async route=>{
        const session=route.request().headers()['x-client-token']||'';
        const body=route.request().postDataJSON();
        const action=body?.accion||'listar';
        actions.push({session,action});
        const items=data[session]||[];
        if(action==='listar'){
          listCount[session]=(listCount[session]||0)+1;
          const snapshot=items.map(x=>({...x}));
          if(held&&held.token===session&&held.resolve===null){
            const latch=held;
            latch.resolve=()=>{};
            latch.started();
            await latch.promise;
          }
          await post(route,{ok:true,items:snapshot,no_leidas:snapshot.filter(x=>!x.leida).length});
        }else if(action==='marcar_todas'){
          items.forEach(x=>x.leida=true);
          await post(route,{ok:true,marcadas:items.length});
        }else if(action==='eliminar_todas'){
          const n=items.length;items.splice(0);
          await post(route,{ok:true,eliminadas:n});
        }else if(action==='marcar_leida'){
          const row=items.find(x=>x.id===body.datos.id);
          if(row)row.leida=true;
          await post(route,{ok:true,marcadas:row?1:0});
        }else if(action==='eliminar_una'){
          const idx=items.findIndex(x=>x.id===body.datos.id);
          if(idx>=0)items.splice(idx,1);
          await post(route,{ok:true,eliminadas:idx>=0?1:0});
        }else await post(route,{ok:false,error:'Acción inesperada'});
      });

      await page.goto(origin+'/preview/realtime/notification-smoke.html',{
        waitUntil:'domcontentloaded'
      });
      await page.waitForFunction(()=>
        Boolean(window.GOXION_CLIENT_NOTIFICATIONS)&&
        document.querySelectorAll('.gx-client-notif-item').length===2,
        null,{timeout:12000}
      );
      await page.locator('#gx-client-notif-launch').click();
      await page.locator('#gx-client-notif-sheet.show').waitFor();
      assert.equal(await page.locator('.gx-client-notif-item.unread').count(),2);

      const read=page.locator('#gx-client-notif-mark-all');
      await read.click();
      assert(await page.locator('.gx-client-notif-toolbar.gx-confirm-read').count());
      assert.equal(actions.filter(x=>x.action==='marcar_todas').length,0,
        'Primer toque NO debe marcar');
      await read.click();
      await page.waitForFunction(()=>
        document.querySelector('#gx-client-notif-feedback.show span')
          ?.textContent.includes('Todo marcado como leído'),null,{timeout:6000}
      );
      assert.equal(actions.filter(x=>x.action==='marcar_todas').length,1);
      assert.equal(await page.locator('.gx-client-notif-item.unread').count(),0);

      const clear=page.locator('#gx-client-notif-clear-all');
      await clear.click();
      assert(await page.locator('.gx-client-notif-toolbar.gx-confirm-clear').count());
      assert.equal(actions.filter(x=>x.action==='eliminar_todas').length,0);
      await clear.click();
      await page.waitForFunction(()=>
        document.querySelector('#gx-client-notif-feedback.show span')
          ?.textContent.includes('Todas las notificaciones eliminadas'),null,{timeout:6000}
      );
      assert.equal(await page.locator('.gx-client-notif-item').count(),0);
      assert.equal(actions.filter(x=>x.action==='eliminar_todas').length,1);

      // A deferred response from account A must NEVER overwrite account B.
      data['token-A'].push(item('a3','Aviso antiguo'));
      let releaseOld,startOld;
      const oldStarted=new Promise(resolve=>{startOld=resolve});
      const oldGate=new Promise(resolve=>{releaseOld=resolve});
      held={token:'token-A',promise:oldGate,started:startOld,resolve:null};
      await page.evaluate(()=>{void window.GOXION_CLIENT_NOTIFICATIONS.refresh()});
      await oldStarted;
      await page.evaluate(()=>{
        localStorage.setItem('goxion_client_token','token-B');
        localStorage.setItem('gx-smoke-client','client-B');
        void window.GOXION_CLIENT_NOTIFICATIONS.refresh();
      });
      await page.waitForFunction(()=>
        document.querySelector('.gx-client-notif-item strong')?.textContent==='Solicitud recibida',
        null,{timeout:6000}
      );
      held=null;
      releaseOld();
      await pause(200);
      assert.equal(await page.locator('.gx-client-notif-item').count(),1);
      assert.match(await page.locator('.gx-client-notif-item').innerText(),/Solicitud recibida/);
      assert.doesNotMatch(await page.locator('.gx-client-notif-item').innerText(),/Aviso antiguo/);

      // A Realtime invalidation arriving during an in-flight list must be queued.
      let releaseQueue,startQueue;
      const queueStarted=new Promise(resolve=>{startQueue=resolve});
      const queueGate=new Promise(resolve=>{releaseQueue=resolve});
      held={token:'token-B',promise:queueGate,started:startQueue,resolve:null};
      await page.evaluate(()=>{void window.GOXION_CLIENT_NOTIFICATIONS.refresh()});
      await queueStarted;
      data['token-B'].push(item('b2','Segundo evento'));
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('goxion:realtime',{
        detail:{scope:'client_notifications'}
      })));
      held=null;
      releaseQueue();
      await page.waitForFunction(()=>
        [...document.querySelectorAll('.gx-client-notif-item strong')]
          .some(n=>n.textContent==='Segundo evento'),null,{timeout:6000}
      );
      assert((listCount['token-B']||0)>=3,'La invalidación concurrente debe reenviar consulta');

      const beforeResync=listCount['token-B'];
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('goxion:realtime',{
        detail:{scope:'resync',operation:'RECONNECT'}
      })));
      await pause(350);
      assert(listCount['token-B']>beforeResync,'resync debe consultar la bandeja');
      const beforeVisible=listCount['token-B'];
      await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      await pause(350);
      assert(listCount['token-B']>beforeVisible,'Al volver Safari debe revalidar notificaciones');

      // Three modular consumers, without rebuilding the catalogue on a notification.
      await page.evaluate(()=>{
        window.globalClientesData={'client-B':{nombre:'Beta'}};
        window.__goxionCounters={client:0,admin:0,index:0,catalog:0};
        window.goxionReloadPrivateClientView=async()=>{
          window.__goxionCounters.client++;
          return {key:'client-B',cliente:{nombre:'Beta',servicios:[]}};
        };
        window.goxionReloadAdminModel=async()=>{
          window.__goxionCounters.admin++;
        };
        window.cargarEstadoCuenta=async()=>{window.__goxionCounters.index++};
        window.cargarCatalogo=()=>{window.__goxionCounters.catalog++};
      });
      await page.addScriptTag({url:origin+'/assets/js/ayuda/03-realtime.js'});
      await page.addScriptTag({url:origin+'/assets/js/admin/31-admin-realtime.js'});
      await page.addScriptTag({url:origin+'/assets/js/index/04-realtime.js'});
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('goxion:realtime',{
        detail:{scope:'account_state'}
      })));
      await page.waitForFunction(()=>{
        const x=window.__goxionCounters;
        return x?.client>=1&&x?.admin>=1&&x?.index>=1;
      },null,{timeout:7000});
      const counters=await page.evaluate(()=>({...window.__goxionCounters}));
      assert.equal(counters.catalog,0,'Realtime no debe reconstruir catálogo');
      assert(await page.locator('#gx-client-notif-sheet.show').count(),
        'Una actualización modular no debe cerrar la bandeja');

      await page.evaluate(()=>{window.cerrarSesion()});
      await page.waitForFunction(()=>
        document.querySelector('#gx-client-notif-launch')?.disabled===true &&
        !document.getElementById('gx-client-notif-sheet')?.classList.contains('show'),
        null,{timeout:3000}
      );
      assert.equal(await page.locator('.gx-client-notif-item').count(),0);
      assert.equal(errors.length,0,'Errores de JavaScript: '+errors.join(' | '));
      console.log(name+': sesiones aisladas, eventos en cola, resync, morph, 3 adaptadores, logout OK');
      await page.close();
    }finally{await browser.close();}
  }
}finally{server.kill('SIGTERM');}
console.log('GOXION · Realtime beta smoke OK (datos simulados, sin writes Supabase)');
