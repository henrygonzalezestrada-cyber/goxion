(() => {
  "use strict";
  if(window.GOXION_QA_ISOLATED!==true||location.pathname.split("/").pop()!=="ayuda-aceptacion-v2.html")return;
  const endpoint="https://nsvybyvvdpdgbgtvydfb.supabase.co/functions/v1/push-cliente-qa";
  const tokenKey=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
  if(!tokenKey)return;
  const storageKey="goxion_push_qa_device";
  const token=()=>localStorage.getItem(tokenKey)||"";
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const installed=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
  const capable=()=>isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
  const base=new URL("./",location.href);
  let panel,registration,publicKey,owner="",epoch=0,preparing=false,busy=false,active=false,guide=false,notice="",blocked=false;
  const getSaved=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"null")}catch{return null}};
  const setSaved=(value)=>value?localStorage.setItem(storageKey,JSON.stringify(value)):localStorage.removeItem(storageKey);
  const b64=(s)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
  const api=async(accion,datos={},current=token(),keepalive=false)=>{
    if(!current)throw Error("Inicia sesión nuevamente");
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Client-Token":current},
      body:JSON.stringify({accion,datos}),cache:"no-store",keepalive});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw Error(j.error||"No se pudo conectar");
    return j;
  };
  const show=(msg)=>{notice=msg;render()};
  function mount(){
    const list=document.getElementById("gx-client-notif-list");
    if(!list||!list.parentElement)return;
    if(!panel){
      panel=document.createElement("section");panel.className="gx-push-qa";panel.setAttribute("aria-label","Avisos en este dispositivo");
      panel.innerHTML='<h3 class="gx-push-qa-title"></h3><p class="gx-push-qa-desc"></p><ol hidden><li>En Safari, toca Compartir (cuadrado con flecha hacia arriba).</li><li>Elige Agregar a pantalla de inicio. Si aparece Abrir como app web, déjalo activado y confirma.</li><li>Abre GOXION QA desde su nuevo icono e inicia sesión si te lo solicita. Después vuelve a Notificaciones.</li></ol><div class="gx-push-qa-actions"><button type="button" data-primary></button><button type="button" data-test class="secondary" hidden>Enviar prueba</button></div><p role="status" aria-live="polite" hidden></p>';
      panel.querySelector("[data-primary]").onclick=primary;
      panel.querySelector("[data-test]").onclick=test;
      list.before(panel);
    }
    render();
  }
  function render(){
    if(!panel)return;
    panel.hidden=!token()||blocked;
    if(panel.hidden)return;
    const title=panel.querySelector("h3"),desc=panel.querySelector(".gx-push-qa-desc"),button=panel.querySelector("[data-primary]"),testBtn=panel.querySelector("[data-test]");
    const needsInstall=ios&&!installed(),supported=capable();
    title.textContent=active?"Avisos en este dispositivo":"Recibe avisos en tu dispositivo";
    desc.textContent=active?"Notificaciones activadas para esta cuenta.":needsInstall?"Agrega GOXION a tu pantalla de inicio para recibir avisos aunque lo cierres.":!supported?"Este navegador no admite notificaciones push. La campana seguirá funcionando.":Notification.permission==="denied"?"Los avisos están bloqueados. Habilítalos desde los ajustes de tu dispositivo.":"Entérate de cambios importantes sin tener que abrir Mi Espacio.";
    panel.querySelector("ol").hidden=!(needsInstall&&guide);
    button.hidden=!needsInstall&&(!supported||Notification.permission==="denied")&&!active;
    button.disabled=busy||(!needsInstall&&!active&&(!registration||!publicKey));
    button.textContent=active?"Desactivar":needsInstall?(guide?"Ocultar pasos":"Cómo activar"):"Activar avisos";
    testBtn.hidden=!active;testBtn.disabled=busy;
    const status=panel.querySelector("[role=status]");status.textContent=notice;status.hidden=!notice;
  }
  async function prepare(){
    mount();
    const current=token();
    if(!current||blocked||ios&&!installed()||!capable())return;
    if(preparing||owner===current&&registration&&publicKey)return;
    const generation=++epoch;owner=current;preparing=true;notice="";active=false;
    try{
      const r=await navigator.serviceWorker.register(new URL("push-qa-sw.js",base),{scope:new URL("ayuda-aceptacion-v2.html",base).pathname});
      const [config]=await Promise.all([api("config",{},current),navigator.serviceWorker.ready]);
      if(generation!==epoch||current!==token())return;
      registration=r;publicKey=config.publicKey;
      const existing=await r.pushManager.getSubscription(),saved=getSaved();
      if(generation!==epoch||current!==token())return;
      if(saved?.id&&existing){
        const state=await api("estado",{deviceId:saved.id},current);
        if(generation!==epoch||current!==token())return;
        active=Boolean(state.active);
        if(!active){await existing.unsubscribe();setSaved(null)}
      }else if(existing){await existing.unsubscribe();setSaved(null)}
    }catch{if(generation===epoch)notice="No fue posible preparar los avisos. Vuelve a abrir Notificaciones."}
    finally{if(generation===epoch){preparing=false;render()}}
  }
  async function primary(){
    if(ios&&!installed()){guide=!guide;render();return}
    if(busy||!token()||blocked)return;
    if(active){busy=true;render();const complete=await detach(token());await prepare();show(complete?"Avisos desactivados.":"No pudimos confirmar la desactivación. Revisa los permisos del dispositivo.");return}
    if(!registration||!publicKey)return;
    const current=token(),generation=epoch;busy=true;notice="";render();
    let sub,registeredId;
    try{
      // Starts synchronously from the genuine button gesture (Safari permission requirement).
      sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(publicKey)});
      if(generation!==epoch||current!==token())throw Error("La sesión cambió");
      const r=await api("activar",{subscription:sub.toJSON()},current);registeredId=r.deviceId;
      if(generation!==epoch||current!==token())throw Error("La sesión cambió");
      setSaved({id:r.deviceId});active=true;notice="Activadas. Puedes enviar un aviso de prueba.";
    }catch(e){
      if(registeredId)void api("desactivar",{deviceId:registeredId},current,true).catch(()=>{});
      if(sub)await sub.unsubscribe().catch(()=>false);
      if(generation===epoch){notice=Notification.permission==="denied"?"Permiso bloqueado. Revisa los ajustes del dispositivo.":e.message||"No se pudieron activar los avisos."}
    }finally{if(generation===epoch){busy=false;render()}}
  }
  async function test(){
    const current=token(),saved=getSaved(),generation=epoch;if(!saved?.id||!active||busy||blocked)return;
    busy=true;render();
    try{await api("probar",{deviceId:saved.id},current);if(generation===epoch)notice="El proveedor aceptó el aviso; comprueba el centro de notificaciones de tu teléfono."}
    catch(e){if(generation===epoch)notice=e.message}
    finally{if(generation===epoch){busy=false;render()}}
  }
  async function detach(current){
    const saved=getSaved(),reg=registration;epoch++;owner="";publicKey=null;registration=null;active=false;busy=false;preparing=false;setSaved(null);render();
    // No tokens are stored in the subscription or service worker. Remove provider subscription even if the API is offline.
    const tasks=[];
    if(saved?.id&&current)tasks.push(api("desactivar",{deviceId:saved.id},current,true));
    if(reg)tasks.push(reg.pushManager.getSubscription().then(s=>s?.unsubscribe()));
    else if("serviceWorker" in navigator)tasks.push(navigator.serviceWorker.getRegistration(new URL("ayuda-aceptacion-v2.html",base)).then(r=>r?.pushManager.getSubscription()).then(s=>s?.unsubscribe()));
    const results=await Promise.allSettled(tasks);return results.every(r=>r.status==="fulfilled"&&r.value!==false);
  }
  function onReady(){
    if(new URLSearchParams(location.search).get("push")==="1"&&token()&&!blocked){
      history.replaceState(null,"",location.pathname);
      setTimeout(()=>window.GOXION_CLIENT_NOTIFICATIONS?.open(),650);
    }
    void prepare();
  }
  window.addEventListener("goxion:client-ready",onReady);
  window.addEventListener("goxion:client-logout",()=>{void detach(token());guide=false;notice="";setTimeout(render,0)});
  window.addEventListener("goxion:legal-state",e=>{
    const a=e.detail?.acceso;const was=blocked;blocked=a?.restringido===true||a?.bloquea_operaciones===true||a?.acceso_restringido===true;
    if(blocked&&!was)void detach(token());mount();if(!blocked&&was)void prepare();
  });
  window.addEventListener("storage",()=>{if(owner&&owner!==token()){void detach(owner);return}if(token())void prepare()});
  document.addEventListener("click",e=>{if(e.target.closest?.("#gx-client-notif-launch"))setTimeout(prepare,0)},true);
  document.addEventListener("DOMContentLoaded",()=>setTimeout(onReady,650));
})();
