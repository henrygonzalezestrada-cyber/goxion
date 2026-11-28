(() => {
  "use strict";
  // Only the existing preproduction mirror; official and QA remain unchanged.
  if(location.pathname.split("/").pop()!=="ayuda-espejo-feed-v2.html"||window.GOXION_QA_ISOLATED===true)return;
  const core=window.GOXION_CORE,key=core?.STORAGE?.CLIENT_TOKEN;
  if(!key||typeof core.endpoint!=="function")return;
  const endpoint=core.endpoint("push-cliente");
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
  // K3 view state: the existing K2 transport stays authoritative. No business writes.
  let gear,sheet,settingsOpen=false,guideStep=0,afterRelease=false,openTimer=0,missionObserver;
  const surveyKey="goxion_push_k3_feedback_local";
  const glyph=(d)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';
  const icons={
    gear:glyph("M10 2h4l.6 3 2 .9 2.6-1.7 2.8 2.8-1.7 2.6.9 2L24 12l-2.8.9-.9 2 1.7 2.6-2.8 2.8-2.6-1.7-2 .9-.6 2.5h-4l-.6-2.5-2-.9-2.6 1.7L2 17.5l1.7-2.6-.9-2L0 12l2.8-.9.9-2L2 6.5l2.8-2.8 2.6 1.7 2-.9L10 2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"),
    bell:glyph("M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"),
    share:glyph("M12 15V2m-4 4 4-4 4 4M7 8H4v13h16V8h-3"),
    plus:glyph("M12 8v8m-4-4h8M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"),
    check:glyph("m5 12 4 4L19 6"),
    arrow:glyph("m14 6-6 6 6 6")
  };
  const guideSteps=[
    {title:"Abre Compartir",copy:"Si abriste el enlace desde WhatsApp, ábrelo primero en Safari. Busca Compartir, en la barra o dentro del menú de página (···).",art:'<div class="gx-k3-phone"><span class="gx-k3-phone-label">Safari</span><div class="gx-k3-phone-page"><span class="gx-k3-mini-logo">GOXION</span></div><div class="gx-k3-phone-bar"><span>···</span><span class="gx-k3-highlight">'+icons.share+'</span><span>▢</span></div></div>',hint:"Este es el símbolo que debes buscar."},
    {title:"Agrega GOXION a Inicio",copy:"Desliza hacia arriba en el menú hasta encontrar Agregar a Inicio (también puede decir Agregar a pantalla de inicio).",art:'<div class="gx-k3-phone"><span class="gx-k3-phone-label">Compartir</span><div class="gx-k3-menu-row">Copiar</div><div class="gx-k3-menu-row">Agregar a favoritos</div><div class="gx-k3-menu-row gx-k3-selected">'+icons.plus+'<b>Agregar a Inicio</b></div></div>',hint:"Si no aparece, baja hasta Editar acciones."},
    {title:"Crea tu icono",copy:"Si aparece Abrir como app web, déjalo activo. Toca Agregar.",art:'<div class="gx-k3-phone"><span class="gx-k3-phone-label">Agregar a Inicio</span><div class="gx-k3-app-icon"><img src="./Logo individual.png" alt=""></div><b>GOXION Piloto</b><div class="gx-k3-menu-row">Abrir como app web <span class="gx-k3-demo-toggle"></span></div><span class="gx-k3-demo-add">Agregar</span></div>',hint:"No descargas nada desde una tienda de aplicaciones."},
    {title:"Abre GOXION desde Inicio",copy:"Sal de Safari, busca el icono de GOXION Piloto y ábrelo. Inicia sesión, toca la campana y entra a Ajustes. Desde ahí puedes activar y probar tus avisos.",art:'<div class="gx-k3-phone gx-k3-phone-home"><div class="gx-k3-app-icon"><img src="./Logo individual.png" alt=""></div><b>GOXION Piloto</b><span class="gx-k3-highlight">'+icons.bell+'</span></div>',hint:"Los avisos funcionan aunque GOXION esté cerrado."}
  ];
  function survey(){try{const d=JSON.parse(localStorage.getItem(surveyKey)||"null");return d&&d.deviceId===saved()?.id&&Date.now()-d.at<7*86400000?d:null}catch{return null}}
  function setSurvey(v){try{v?localStorage.setItem(surveyKey,JSON.stringify(v)):localStorage.removeItem(surveyKey)}catch{}window.dispatchEvent(new Event("goxion:push-k3-feedback"));}
  function feedbackItem(clientId){const d=survey();return eligible&&active&&!blocked&&String(window.GOXION_V2_CLIENT_ID||"")===String(clientId)&&d?.answer==="pending"?{id:"push-feedback",kind:"push-feedback",title:"¿Recibiste nuestro aviso?",meta:"Confirma si viste la notificación de prueba.",detail:"",name:"Notificaciones",tone:"neutral",priority:10}:null;}
  function answerFeedback(yes){const d=survey();if(!d||d.answer!=="pending"||!eligible||!active||blocked)return false;setSurvey({...d,answer:yes?"yes":"no"});if(yes){const toast=document.getElementById("gxn-toast");if(toast?.hidden){const message="¡Gracias por confirmar!";toast.textContent=message;toast.hidden=false;setTimeout(()=>{if(toast.textContent===message)toast.hidden=true},2300)}}notice=yes?"¡Gracias por confirmar! Tu respuesta quedó en este dispositivo durante el piloto.":"Gracias por avisarnos. Revisa los permisos en Ajustes y vuelve a intentar cuando estés listo.";render();return true}
  function canInvite(){return eligible&&!blocked&&!!token()}
  function openSettings(){
    if(!canInvite())return false;
    window.GOXION_CLIENT_NOTIFICATIONS?.open();mount();if(!panel)return false;
    settingsOpen=true;render();return true;
  }
  function deferSettings(){if(canInvite())afterRelease=true;return afterRelease}
  function releaseFinished(){
    clearTimeout(openTimer);if(!afterRelease)return;const current=token(),end=Date.now()+20000;
    const attempt=()=>{if(!afterRelease||!canInvite()||current!==token()||Date.now()>end){afterRelease=false;return}
      if(document.hidden||document.body.classList.contains("gx-v2-handoff-active")||document.body.classList.contains("no-scroll")||document.querySelector("dialog[open],#gx-release-overlay:not([hidden]),#gx-legal-consent[open]")){openTimer=setTimeout(attempt,350);return}
      afterRelease=false;openSettings();};
    openTimer=setTimeout(attempt,2300);
  }
  function syncMissionPreview(){
    const host=document.getElementById("gxb-panel"),content=document.getElementById("gxb-content");if(!host||!content)return;
    const existing=content.querySelector(".gx-k3-mission");
    if(!canInvite()||host.hidden||host.dataset.benefit!=="mission"){existing?.remove();return}
    if(existing){for(const row of existing.querySelectorAll("[data-mission-preview]")){const isDone=row.dataset.missionPreview==="feedback"?["yes","no"].includes(survey()?.answer):active;row.classList.toggle("done",isDone)}return}
    const m=document.createElement("section");m.className="gx-k3-mission";
    m.innerHTML='<p class="gx-k3-mini-caption">Vista previa de misión de lanzamiento</p><div class="gx-k3-mission-title"><b>Conéctate a GOXION</b><strong>20% <small>OFF</small></strong></div><p>Propuesta: hasta $35 MXN. Aún no disponible para canje.</p><div class="gx-k3-mission-steps"><span data-mission-preview="learn">Conoce la función</span><span data-mission-preview="configure">Configura tus avisos</span><span data-mission-preview="feedback">Comparte tu experiencia</span></div><button type="button" class="gx-k3-action">Conoce los avisos</button>';
    m.querySelector("button").onclick=()=>openSettings();content.append(m);syncMissionPreview();
  }
  function mount(){
    const list=document.getElementById("gx-client-notif-list");if(!list?.parentElement)return;
    if(!panel){
      sheet=list.parentElement;
      panel=document.createElement("section");panel.className="gx-push-pilot";panel.hidden=true;panel.setAttribute("aria-label","Ajustes de notificaciones");
      panel.innerHTML='<div class="gx-k3-heading"><button type="button" class="gx-k3-back" aria-label="Volver a notificaciones">'+icons.arrow+'</button><h3>Ajustes</h3></div><div class="gx-k3-intro"><span class="gx-k3-bell">'+icons.bell+'</span><div><h4 data-title></h4><p data-desc></p></div></div><div class="gx-k3-status" role="status" aria-live="polite" hidden></div><div data-guide hidden><div class="gx-k3-step-head"><span data-step-label></span><span data-step-progress></span></div><div data-step-art></div><h4 data-step-title></h4><p data-step-copy></p><p class="gx-k3-hint" data-step-hint></p><div class="gx-push-pilot-actions"><button type="button" data-guide-prev>Anterior</button><button type="button" data-guide-next>Siguiente</button></div></div><div data-options hidden><h4>¿Qué deseas recibir?</h4><div data-checkboxes></div><p class="gx-k3-hint">Los avisos de tu cuenta no mostrarán información privada en la pantalla bloqueada.</p><button type="button" data-save class="gx-k3-action" hidden>Guardar preferencias</button></div><div class="gx-k3-buttons"><button type="button" data-primary class="gx-k3-action"></button><button type="button" data-test class="gx-k3-action secondary" hidden>Enviar aviso de prueba</button><button type="button" data-feedback class="gx-k3-action secondary" hidden>Compartir mi experiencia</button><button type="button" data-help class="gx-k3-action secondary">Ayuda con los avisos</button></div><div data-help-info hidden><h4>¿No recibes avisos?</h4><p>Revisa los permisos de GOXION en los ajustes de tu teléfono. Comprueba el modo de concentración o No molestar y que tengas conexión. Luego prueba nuevamente.</p><p>Las notificaciones de la campana seguirán disponibles aunque desactives los avisos al teléfono.</p></div>';
      for(const [value,label] of types){const l=document.createElement("label"),i=document.createElement("input"),sw=document.createElement("span");i.type="checkbox";i.value=value;sw.className="gx-k3-switch";sw.setAttribute("aria-hidden","true");l.append(document.createTextNode(label),i,sw);panel.querySelector("[data-checkboxes]").append(l);
        i.onchange=()=>{categories=[...panel.querySelectorAll("input:checked")].map(x=>x.value);options=true;render()};}
      panel.querySelector(".gx-k3-back").onclick=()=>{settingsOpen=false;render();gear?.focus()};
      panel.querySelector("[data-primary]").onclick=primary;
      panel.querySelector("[data-test]").onclick=test;
      panel.querySelector("[data-save]").onclick=preferences;
      panel.querySelector("[data-help]").onclick=()=>{const el=panel.querySelector("[data-help-info]");el.hidden=!el.hidden};
      panel.querySelector("[data-feedback]").onclick=()=>{settingsOpen=false;render();window.GOXION_CLIENT_NOTIFICATIONS?.close();window.dispatchEvent(new Event("goxion:push-k3-feedback"))};
      panel.querySelector("[data-guide-prev]").onclick=()=>{guideStep=Math.max(0,guideStep-1);render()};
      panel.querySelector("[data-guide-next]").onclick=()=>{if(guideStep===guideSteps.length-1){guide=false;guideStep=0}else guideStep++;render()};
      list.before(panel);
      const header=sheet.querySelector(".gx-client-notif-head"),close=header?.querySelector(".gx-client-notif-close");
      if(close){const group=document.createElement("div");group.className="gx-k3-head-right";gear=document.createElement("button");gear.type="button";gear.className="gx-k3-gear";gear.setAttribute("aria-label","Ajustes de notificaciones");gear.title="Ajustes de notificaciones";gear.innerHTML=icons.gear;gear.hidden=true;close.before(group);group.append(gear,close);gear.onclick=()=>{settingsOpen=!settingsOpen;render();if(settingsOpen)panel.querySelector(".gx-k3-back").focus({preventScroll:true})};}
      if(sheet.classList.contains("gx-client-notif-sheet"))new MutationObserver(()=>{if(!sheet.classList.contains("show")){settingsOpen=false;render()}}).observe(sheet,{attributes:true,attributeFilter:["class"]});
      const missions=document.querySelector(".gxb-wrap");if(missions){missionObserver=new MutationObserver(syncMissionPreview);missionObserver.observe(missions,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","data-benefit"]});}
    }
    render();
  }
  function render(){
    if(!panel)return;
    const allowed=canInvite();if(!allowed)settingsOpen=false;
    if(gear){gear.hidden=!allowed;gear.setAttribute("aria-expanded",String(allowed&&settingsOpen));}
    const next=allowed&&settingsOpen;sheet?.classList.toggle("gx-k3-settings-open",next);panel.hidden=!next;syncMissionPreview();
    if(!next)return;
    const needsInstall=ios&&!installed(),support=capable(),button=panel.querySelector("[data-primary]"),denied=support&&Notification.permission==="denied";
    panel.querySelector("[data-title]").textContent=active?"Avisos activados":needsInstall?"Siempre conectado":"Activa tus avisos";
    panel.querySelector("[data-desc]").textContent=active?"Elige qué recibes en este dispositivo.":needsInstall?"Agrega GOXION a Inicio para recibir avisos.":!support?"Este navegador no admite avisos al teléfono. La campana seguirá funcionando.":denied?"Los avisos están bloqueados. Revisa los permisos de GOXION en tu teléfono.":"Recibe avisos de tu cuenta y servicios, incluso con Mi Espacio cerrado.";
    const g=panel.querySelector("[data-guide]");g.hidden=!(needsInstall&&guide);
    if(!g.hidden){const step=guideSteps[guideStep];panel.querySelector("[data-step-label]").textContent="Paso "+(guideStep+1)+" de "+guideSteps.length;panel.querySelector("[data-step-progress]").textContent="● ".repeat(guideStep+1)+"○ ".repeat(guideSteps.length-guideStep-1);panel.querySelector("[data-step-art]").innerHTML=step.art;panel.querySelector("[data-step-title]").textContent=step.title;panel.querySelector("[data-step-copy]").textContent=step.copy;panel.querySelector("[data-step-hint]").textContent=step.hint;panel.querySelector("[data-guide-prev]").disabled=guideStep===0;panel.querySelector("[data-guide-next]").textContent=guideStep===guideSteps.length-1?"Entendido":"Siguiente"}
    button.hidden=!needsInstall&&(!support||denied)&&!active;button.disabled=busy||(!needsInstall&&!active&&(!reg||!pub||categories.length===0));button.textContent=active?"Desactivar avisos":needsInstall?(guide?"Cerrar tutorial":"Cómo activar en iPhone"):"Activar avisos";button.classList.toggle("gx-k3-disable",active);
    panel.querySelector("[data-options]").hidden=needsInstall||!support||denied;
    for(const i of panel.querySelectorAll("input")){i.checked=categories.includes(i.value);i.disabled=busy;}
    const saveButton=panel.querySelector("[data-save]");saveButton.hidden=!active||!options;saveButton.disabled=busy||categories.length===0;
    const t=panel.querySelector("[data-test]");t.hidden=!active;t.disabled=busy;
    panel.querySelector("[data-feedback]").hidden=survey()?.answer!=="pending";
    const status=panel.querySelector("[role=status]");status.textContent=notice;status.hidden=!notice;
    if(needsInstall&&guide)button.classList.add("secondary");else button.classList.remove("secondary");
  }
  window.GOXION_PUSH_K3=Object.freeze({canInvite,active:()=>active,deferSettings,releaseFinished,feedbackItem,answerFeedback,openSettings});
  async function detach(current,keepEligible=false){
    const d=saved(),r=reg;generation++;owner="";reg=null;pub=null;active=false;busy=false;preparing=false;save(null);setSurvey(null);
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
      eligible=gate.eligible===true;if(eligible)mount();else render();
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
    finally{if(g===generation){preparing=false;render();window.dispatchEvent(new Event("goxion:push-k3-feedback"));}}
  }
  async function primary(){
    if(ios&&!installed()){guide=!guide;guideStep=0;render();return}
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
    busy=true;render();try{await api("probar",{deviceId:d.id});if(g===generation){notice="Aviso de prueba enviado. Comprueba las notificaciones de tu teléfono.";setSurvey({deviceId:d.id,at:Date.now(),answer:"pending"});}}
    catch(e){if(g===generation)notice=e.message}finally{if(g===generation){busy=false;render()}}
  }
  function onReady(){
    if(token()&&!blocked&&new URLSearchParams(location.search).get("push")==="1"){
      history.replaceState(null,"",location.pathname);setTimeout(()=>window.GOXION_CLIENT_NOTIFICATIONS?.open(),650);
    }
    void prepare();
  }
  window.addEventListener("goxion:client-ready",onReady);
  window.addEventListener("goxion:client-logout",()=>{void detach(token()||owner);guide=false;guideStep=0;settingsOpen=false;afterRelease=false;clearTimeout(openTimer);options=false;notice="";categories=[...defaults]});
  window.addEventListener("goxion:legal-state",e=>{const a=e.detail?.acceso;const was=blocked;blocked=a?.restringido===true||a?.bloquea_operaciones===true||a?.acceso_restringido===true;if(blocked&&!was)void detach(token());render();if(!blocked&&was)void prepare()});
  window.addEventListener("storage",()=>{if(token()!==owner){if(owner)void detach(owner);else void prepare()}});
  document.addEventListener("click",e=>{if(e.target.closest?.("#gx-client-notif-launch"))setTimeout(prepare,0)},true);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!busy)void prepare()});
  document.addEventListener("DOMContentLoaded",()=>setTimeout(onReady,650));
})();
