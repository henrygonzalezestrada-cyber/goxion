(() => {
  "use strict";
  // Only the existing preproduction mirror; official and QA remain unchanged.
  if(location.pathname.split("/").pop()!=="ayuda-espejo-feed-v2.html"||window.GOXION_QA_ISOLATED===true)return;
  const endpoint="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/push-cliente";
  const key=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
  if(!key)return;
  const token=()=>localStorage.getItem(key)||"",savedKey="goxion_push_pilot_device";
  const base=new URL("./",location.href),route=new URL("ayuda-espejo-feed-v2.html",base);
  const defaults=["cuenta","servicios","importante"],types=[["cuenta","Mi cuenta y pagos"],["servicios","Mis servicios"],["beneficios","Misiones y recompensas"],["importante","Avisos importantes"]];
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const installed=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
  const capable=()=>isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
  let panel,reg,pub,owner="",generation=0,eligible=false,active=false,blocked=false,busy=false,preparing=false,guide=false,options=false,notice="",categories=[...defaults];
  const saved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||"null")}catch{return null}};
  const save=v=>v?localStorage.setItem(savedKey,JSON.stringify(v)):localStorage.removeItem(savedKey);
  const b64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
  async function api(accion,datos={},current=token(),keepalive=false){
    if(!current)throw Error("Inicia sesión nuevamente");
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Client-Token":current},body:JSON.stringify({accion,datos}),cache:"no-store",keepalive});
    const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||"No se pudo conectar");return j;
  }
  function mount(){
    const list=document.getElementById("gx-client-notif-list");if(!list?.parentElement)return;
    if(!panel){
      panel=document.createElement("section");panel.className="gx-push-pilot";panel.hidden=true;panel.setAttribute("aria-label","Avisos en este dispositivo");
      panel.innerHTML='<h3></h3><p data-desc></p><ol hidden><li>En Safari, toca Compartir.</li><li>Elige Agregar a pantalla de inicio y Abrir como app web.</li><li>Abre GOXION Piloto desde el icono, inicia sesión y vuelve a Notificaciones.</li></ol><div class="gx-push-pilot-actions"><button type="button" data-primary></button><button type="button" data-types class="secondary">Tipos de avisos</button><button type="button" data-test class="secondary" hidden>Enviar prueba</button></div><div data-options hidden><p>Elige qué avisos quieres recibir en este dispositivo. El contenido de tu cuenta no se mostrará en pantalla bloqueada.</p><div data-checkboxes></div><button type="button" data-save hidden>Guardar preferencias</button></div><p role="status" aria-live="polite" hidden></p>';
      for(const [value,label] of types){const l=document.createElement("label"),i=document.createElement("input");i.type="checkbox";i.value=value;l.append(i,document.createTextNode(label));panel.querySelector("[data-checkboxes]").append(l);
        i.onchange=()=>{categories=[...panel.querySelectorAll("input:checked")].map(x=>x.value);render()};}
      panel.querySelector("[data-primary]").onclick=primary;
      panel.querySelector("[data-types]").onclick=()=>{options=!options;render()};
      panel.querySelector("[data-test]").onclick=test;
      panel.querySelector("[data-save]").onclick=preferences;
      list.before(panel);
    }
    render();
  }
  function render(){
    if(!panel)return;
    panel.hidden=!token()||!eligible||blocked;if(panel.hidden)return;
    const needsInstall=ios&&!installed(),support=capable(),button=panel.querySelector("[data-primary]"),denied=support&&Notification.permission==="denied";
    panel.querySelector("h3").textContent=active?"Avisos en este dispositivo":"Recibe avisos en tu dispositivo";
    panel.querySelector("[data-desc]").textContent=active?"Puedes cambiar tus preferencias o desactivarlos cuando quieras.":needsInstall?"Agrega GOXION a tu pantalla de inicio para recibir avisos aunque lo cierres.":!support?"Este navegador no admite avisos push. La campana seguirá funcionando.":denied?"Los avisos están bloqueados. Habilítalos desde los ajustes de tu dispositivo.":"Recibe noticias de tu cuenta y servicios, incluso con Mi Espacio cerrado.";
    panel.querySelector("ol").hidden=!(needsInstall&&guide);
    button.hidden=!needsInstall&&(!support||denied)&&!active;
    button.disabled=busy||(!needsInstall&&!active&&(!reg||!pub||categories.length===0));
    button.textContent=active?"Desactivar":needsInstall?(guide?"Ocultar pasos":"Cómo activar"):"Activar avisos";
    panel.querySelector("[data-types]").hidden=needsInstall||!support||denied;
    panel.querySelector("[data-types]").textContent=options?"Ocultar tipos":"Tipos de avisos";
    panel.querySelector("[data-options]").hidden=!options||needsInstall||!support||denied;
    for(const i of panel.querySelectorAll("input")){i.checked=categories.includes(i.value);i.disabled=busy;}
    const s=panel.querySelector("[data-save]");s.hidden=!active;s.disabled=busy||categories.length===0;
    const t=panel.querySelector("[data-test]");t.hidden=!active;t.disabled=busy;
    const status=panel.querySelector("[role=status]");status.textContent=notice;status.hidden=!notice;
  }
  async function detach(current,keepEligible=false){
    const d=saved(),r=reg;generation++;owner="";reg=null;pub=null;active=false;busy=false;preparing=false;save(null);
    if(!keepEligible)eligible=false;render();
    const tasks=[];
    if(d?.id&&current)tasks.push(api("desactivar",{deviceId:d.id},current,true));
    if(r)tasks.push(r.pushManager.getSubscription().then(s=>s?.unsubscribe()));
    else if("serviceWorker" in navigator)tasks.push(navigator.serviceWorker.getRegistration(route).then(r=>r?.pushManager.getSubscription()).then(s=>s?.unsubscribe()));
    const res=await Promise.allSettled(tasks);return res.every(x=>x.status==="fulfilled"&&x.value!==false);
  }
  async function prepare(){
    const current=token();if(!current||blocked||preparing||busy)return;
    if(owner&&owner!==current){await detach(owner);if(token()!==current)return;}
    owner=current;const g=++generation;preparing=true;
    try{
      const gate=await api("elegibilidad",{},current);
      if(g!==generation||current!==token())return;
      eligible=gate.eligible===true;mount();
      if(!eligible){if(saved()?.id||reg)await detach(current);return;}
      if(ios&&!installed()||!capable())return;
      const r=await navigator.serviceWorker.register(new URL("goxion-push-pilot-sw.js",base),{scope:route.pathname});
      const [c]=await Promise.all([api("config",{},current),navigator.serviceWorker.ready]);
      if(g!==generation||current!==token())return;
      reg=r;pub=c.publicKey;
      const sub=await r.pushManager.getSubscription(),data=saved();
      if(g!==generation||current!==token())return;
      if(sub&&data?.id){
        const status=await api("estado",{deviceId:data.id},current);
        if(g!==generation||current!==token())return;
        active=status.active===true;
        if(active&&!options)categories=[...status.categories];
        if(!active){await sub.unsubscribe();save(null);}
      }else{active=false;if(sub)await sub.unsubscribe();if(data?.id){await api("desactivar",{deviceId:data.id},current).catch(()=>{});save(null);}}
    }catch{if(g===generation){notice="No fue posible preparar los avisos. Vuelve a abrir Notificaciones.";pub=null;}}
    finally{if(g===generation){preparing=false;render();}}
  }
  async function primary(){
    if(ios&&!installed()){guide=!guide;render();return}
    if(busy||!eligible||blocked||!token())return;
    const current=token();
    if(active){busy=true;render();const done=await detach(current,true);await prepare();notice=done?"Avisos desactivados.":"No pudimos confirmar la desactivación. Revisa los permisos.";render();return}
    if(!reg||!pub||categories.length===0)return;
    const g=generation;busy=true;notice="";render();let sub,id;
    try{
      // Invoke subscribe synchronously within the genuine user gesture.
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(pub)});
      if(g!==generation||current!==token())throw Error("La sesión cambió");
      const r=await api("activar",{subscription:sub.toJSON(),categories:[...categories]},current);id=r.deviceId;
      if(g!==generation||current!==token())throw Error("La sesión cambió");
      save({id});active=true;notice="Activadas. Puedes enviar un aviso de prueba.";
    }catch(e){
      if(id)void api("desactivar",{deviceId:id},current,true).catch(()=>{});
      if(sub)await sub.unsubscribe().catch(()=>false);
      if(g===generation)notice=Notification.permission==="denied"?"Permiso bloqueado. Revisa tus ajustes.":e.message;
    }finally{if(g===generation){busy=false;render()}}
  }
  async function preferences(){
    const d=saved(),g=generation;if(!d?.id||!active||busy||!categories.length)return;
    busy=true;render();try{await api("preferencias",{deviceId:d.id,categories:[...categories]});if(g===generation){notice="Preferencias guardadas.";options=false}}
    catch(e){if(g===generation)notice=e.message}finally{if(g===generation){busy=false;render()}}
  }
  async function test(){
    const d=saved(),g=generation;if(!d?.id||!active||busy||blocked)return;
    busy=true;render();try{await api("probar",{deviceId:d.id});if(g===generation)notice="El proveedor aceptó el aviso. Comprueba las notificaciones de tu teléfono."}
    catch(e){if(g===generation)notice=e.message}finally{if(g===generation){busy=false;render()}}
  }
  function onReady(){
    if(token()&&!blocked&&new URLSearchParams(location.search).get("push")==="1"){
      history.replaceState(null,"",location.pathname);setTimeout(()=>window.GOXION_CLIENT_NOTIFICATIONS?.open(),650);
    }
    void prepare();
  }
  window.addEventListener("goxion:client-ready",onReady);
  window.addEventListener("goxion:client-logout",()=>{void detach(token()||owner);guide=false;options=false;notice="";categories=[...defaults]});
  window.addEventListener("goxion:legal-state",e=>{const a=e.detail?.acceso;const was=blocked;blocked=a?.restringido===true||a?.bloquea_operaciones===true||a?.acceso_restringido===true;if(blocked&&!was)void detach(token());render();if(!blocked&&was)void prepare()});
  window.addEventListener("storage",()=>{if(token()!==owner){if(owner)void detach(owner);else void prepare()}});
  document.addEventListener("click",e=>{if(e.target.closest?.("#gx-client-notif-launch"))setTimeout(prepare,0)},true);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!busy)void prepare()});
  document.addEventListener("DOMContentLoaded",()=>setTimeout(onReady,650));
})();
