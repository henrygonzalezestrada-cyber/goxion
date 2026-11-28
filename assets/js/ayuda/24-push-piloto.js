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
  let gear,sheet,headerTitle,headerBack,headerInfo,settingsOpen=false,guideStep=0,missionObserver,lastBellMode="",handleButton;
  const surveyKey="goxion_push_k3_feedback_local";
  const glyph=(d)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';
  const icons={
    // PulsoIcon Settings outline + BellRing (ISC, CityPulso; see PULSOICON-LICENSE.txt).
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>',
    menu:glyph("M4 6h16M4 12h11M4 18h16"),
    tabs:glyph("M7 7h13v14H7zM4 17H3V3h14v1"),
    reload:glyph("M20 7v6h-6M20 13a8 8 0 1 1-2.3-6"),
    tap:glyph("M12 3v5M3 9l5 2M21 9l-5 2M7 21l-1-5 5 2V9a2 2 0 0 1 4 0v5l2-1 4 2-2 6"),
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="gx-k3-pulso-clapper" d="M10.268 21a2 2 0 0 0 3.464 0"/><path class="gx-k3-pulso-body" d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>',
    share:glyph("M12 15V2m-4 4 4-4 4 4M7 8H4v13h16V8h-3"),
    plus:glyph("M12 8v8m-4-4h8M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"),
    check:glyph("m5 12 4 4L19 6"),
    arrow:glyph("M19 12H5m7-7-7 7 7 7"),
    chevron:glyph("m9 18 6-6-6-6"),
    down:glyph("m6 9 6 6 6-6"),
    bookmark:glyph("M6 3h12v18l-6-4-6 4z"),
    glasses:glyph("M2 12h1m18 0h1M10 12h4M3 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0m10 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0"),
    copy:glyph("M9 9h12v12H9zM5 15H3V3h12v2"),
    close:glyph("M6 6l12 12M18 6 6 18")
  };
  // Original instructional diagrams, not OS screenshots. Large legible labels; no simulated controls.
  // Apple MX: https://support.apple.com/es-mx/guide/iphone/iphea86e5236/ios
  const tapMarker='<span class="gx-k3-tap" aria-hidden="true"></span>';
  const logo='<img src="./Logo individual.png" alt="">';
  const guideSteps=[
    {title:"Toca Compartir",copy:"En Safari, abre el menú de página y toca Compartir. Si ves el icono de compartir directamente, úsalo.",hint:"Si llegaste desde WhatsApp, abre esta página en Safari.",art:'<div class="gx-k3-guide-art gx-k3-art-share"><div class="gx-k3-browser"><div class="gx-k3-browser-page">'+logo+'<b>GOXION</b></div><div class="gx-k3-browser-nav"><span>'+icons.arrow+'</span><div class="gx-k3-address"><span class="gx-k3-target">'+icons.menu+'<span class="gx-k3-step-number">1</span></span><small>GOXION</small>'+icons.reload+'</div><span>'+icons.tabs+'</span></div></div><div class="gx-k3-share-flyout gx-k3-target">'+icons.share+'<strong>Compartir</strong><span class="gx-k3-step-number">2</span></div></div>'},
    {title:"Agrega GOXION a Inicio",copy:"Si ves Ver más (la flecha hacia abajo), tócalo. Luego busca Agregar a Inicio.",hint:"Si el menú ya está expandido, desliza hasta Agregar a Inicio. Si no está, revisa Editar acciones al final de la lista.",art:'<div class="gx-k3-guide-art gx-k3-art-menu"><div class="gx-k3-app-menu gx-k3-expanded-share"><div class="gx-k3-share-preview">'+logo+'<div><b>GOXION</b><small>Compartir</small></div></div><div class="gx-k3-share-actions"><div><span>'+icons.copy+'</span><small>Copiar</small></div><div><span>'+icons.bookmark+'</span><small>Marcadores</small></div><div><span>'+icons.glasses+'</span><small>Lecturas</small></div><div><span class="gx-k3-target">'+icons.down+'<span class="gx-k3-step-number">1</span></span><small>Ver más</small></div></div><div class="gx-k3-expanded-list"><div class="gx-k3-ios-row"><span>☆</span><span>Agregar a Favoritos</span></div><div class="gx-k3-ios-row"><span>⌕</span><span>Buscar en la página</span></div><div class="gx-k3-ios-row gx-k3-target">'+icons.plus+'<b>Agregar a Inicio</b><span class="gx-k3-step-number">2</span></div></div></div></div>'},
    {title:"Crea tu icono",copy:"Deja activo Abrir como app web, si aparece. Toca Agregar.",hint:"No necesitas descargar nada de App Store.",art:'<div class="gx-k3-guide-art gx-k3-art-install"><div class="gx-k3-app-menu"><div class="gx-k3-ios-head"><span class="gx-k3-os-close">'+icons.close+'</span><b>Agregar a Inicio</b><span class="gx-k3-target gx-k3-add">Agregar'+tapMarker+'</span></div><div class="gx-k3-install-preview"><div class="gx-k3-app-icon gx-k3-white-icon">'+logo+'</div><div><b>GOXION Piloto</b><small>App web</small></div></div><div class="gx-k3-ios-row"><b>Abrir como app web</b><span class="gx-k3-demo-toggle"></span></div></div></div>'},
    {title:"Abre GOXION desde Inicio",copy:"Sal de Safari y abre el nuevo icono de GOXION Piloto.",hint:"Si es necesario, vuelve a iniciar sesión.",art:'<div class="gx-k3-guide-art gx-k3-art-home"><div class="gx-k3-home-grid"><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-app"><div class="gx-k3-app-icon gx-k3-white-icon gx-k3-target">'+logo+tapMarker+'</div><b>GOXION Piloto</b></div><div class="gx-k3-home-placeholder"></div><div class="gx-k3-home-placeholder"></div></div><div class="gx-k3-handle gx-k3-home-handle"></div></div>'},
    {title:"Activa tus avisos",copy:"En GOXION, toca la campana, abre Ajustes y pulsa Activar avisos. Confirma Permitir.",hint:"Puedes probar tus avisos y cambiar tus preferencias en cualquier momento.",art:'<div class="gx-k3-guide-art gx-k3-art-permit"><div class="gx-k3-go-header">'+logo+'<span>'+icons.bell+'</span><span class="gx-k3-target">'+icons.gear+tapMarker+'</span></div><div class="gx-k3-activate-example">Activar avisos '+icons.chevron+'</div><div class="gx-k3-permit-example">'+icons.bell+'<b>GOXION quiere enviarte notificaciones</b><div class="gx-k3-permit-choice"><span>No permitir</span><b class="gx-k3-target">Permitir'+tapMarker+'</b></div></div></div>'}
  ];
  function survey(){try{const d=JSON.parse(localStorage.getItem(surveyKey)||"null");return d&&d.deviceId===saved()?.id&&Date.now()-d.at<7*86400000?d:null}catch{return null}}
  function setSurvey(v){try{v?localStorage.setItem(surveyKey,JSON.stringify(v)):localStorage.removeItem(surveyKey)}catch{}window.dispatchEvent(new Event("goxion:push-k3-feedback"));}
  function feedbackItem(clientId){const d=survey();return eligible&&active&&!blocked&&String(window.GOXION_V2_CLIENT_ID||"")===String(clientId)&&d?.answer==="pending"?{id:"push-feedback",kind:"push-feedback",title:"¿Recibiste nuestro aviso?",meta:"Confirma si viste la notificación de prueba.",detail:"",name:"Notificaciones",tone:"neutral",priority:10}:null;}
  function answerFeedback(yes){const d=survey();if(!d||d.answer!=="pending"||!eligible||!active||blocked)return false;setSurvey({...d,answer:yes?"yes":"no"});if(yes){const toast=document.getElementById("gxn-toast");if(toast?.hidden){const message="¡Gracias por confirmar!";toast.textContent=message;toast.hidden=false;setTimeout(()=>{if(toast.textContent===message)toast.hidden=true},2300)}}notice=yes?"¡Gracias por confirmar! Respuesta guardada en este dispositivo.":"No recibido. Revisa los permisos y vuelve a probar.";render();return true}
  function canInvite(){return eligible&&!blocked&&!!token()}
  function openSettings(){
    if(!canInvite())return false;
    window.GOXION_CLIENT_NOTIFICATIONS?.open();mount();if(!panel)return false;
    settingsOpen=true;guide=false;guideStep=0;hideInfo();render();return true;
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
      panel.innerHTML='<div data-settings><div class="gx-k3-intro"><span class="gx-k3-bell">'+icons.bell+'</span><h3 data-title></h3><p data-desc></p></div><div class="gx-k3-status" role="status" aria-live="polite" hidden></div><div data-options hidden><h4>Recibir avisos de</h4><div data-checkboxes></div><button type="button" data-save class="gx-k3-action" hidden>Guardar preferencias</button></div><div class="gx-k3-buttons"><button type="button" data-primary class="gx-k3-action"></button><button type="button" data-test class="gx-k3-action" hidden>Enviar aviso de prueba</button><button type="button" data-feedback class="gx-k3-action secondary" hidden>Compartir mi experiencia</button></div><div data-help-info hidden><h4>Sobre tus avisos</h4><p>Los avisos de tu cuenta no incluirán información privada en la pantalla bloqueada. Si no llegan, revisa los permisos de GOXION, tu conexión y el modo No molestar.</p><p>La campana sigue funcionando si desactivas los avisos al teléfono.</p></div></div><div data-guide hidden><div class="gx-k3-step-head"><span data-step-label></span><span data-step-progress aria-hidden="true"></span></div><div data-step-art aria-label="Ilustración del paso"></div><div class="gx-k3-guide-copy"><h4 data-step-title></h4><p data-step-copy></p><p class="gx-k3-hint" data-step-hint hidden></p></div><div class="gx-push-pilot-actions"><button type="button" data-guide-prev>Anterior</button><button type="button" data-guide-next>Siguiente</button></div></div>';
      for(const [value,label] of types){const l=document.createElement("label"),i=document.createElement("input"),sw=document.createElement("span");i.type="checkbox";i.value=value;sw.className="gx-k3-switch";sw.setAttribute("aria-hidden","true");l.append(document.createTextNode(label),i,sw);panel.querySelector("[data-checkboxes]").append(l);
        i.onchange=()=>{categories=[...panel.querySelectorAll("input:checked")].map(x=>x.value);options=true;render()};}
      panel.querySelector("[data-primary]").onclick=primary;
      panel.querySelector("[data-test]").onclick=test;
      panel.querySelector("[data-save]").onclick=preferences;
      panel.querySelector("[data-feedback]").onclick=()=>{settingsOpen=false;guide=false;hideInfo();render();window.GOXION_CLIENT_NOTIFICATIONS?.close();window.dispatchEvent(new Event("goxion:push-k3-feedback"))};
      panel.querySelector("[data-guide-prev]").onclick=()=>{guideStep=Math.max(0,guideStep-1);hideInfo();render()};
      panel.querySelector("[data-guide-next]").onclick=()=>{if(guideStep===guideSteps.length-1){guide=false;guideStep=0}else guideStep++;hideInfo();render()};
      list.before(panel);
      const originalHandle=sheet.querySelector(".gx-client-notif-handle");
      if(originalHandle){
        handleButton=document.createElement("button");handleButton.type="button";handleButton.className="gx-client-notif-handle gx-k3-drag-handle";handleButton.setAttribute("aria-label","Expandir notificaciones");handleButton.setAttribute("aria-expanded","false");originalHandle.replaceWith(handleButton);
        const setExpanded=value=>{sheet.classList.toggle("gx-k3-expanded",value);handleButton.setAttribute("aria-expanded",String(value));handleButton.setAttribute("aria-label",value?"Reducir notificaciones":"Expandir notificaciones")};
        let y=null,suppressClick=false;
        handleButton.addEventListener("pointerdown",e=>{if(settingsOpen)return;y=e.clientY;suppressClick=false;handleButton.setPointerCapture?.(e.pointerId)});
        handleButton.addEventListener("pointerup",e=>{if(y===null)return;const dy=e.clientY-y;y=null;if(Math.abs(dy)>20){suppressClick=true;setExpanded(dy<0)}});
        handleButton.addEventListener("pointercancel",()=>{y=null});
        handleButton.onclick=()=>{if(suppressClick){suppressClick=false;return}if(!settingsOpen)setExpanded(!sheet.classList.contains("gx-k3-expanded"))};
      }
      const header=sheet.querySelector(".gx-client-notif-head"),close=header?.querySelector(".gx-client-notif-close");
      if(close){
        headerTitle=header.querySelector(".gx-client-notif-head-title")||header.querySelector("strong");
        headerBack=document.createElement("button");headerBack.type="button";headerBack.className="gx-k3-back";headerBack.setAttribute("aria-label","Volver");headerBack.innerHTML=icons.arrow;headerBack.hidden=true;
        header.insertBefore(headerBack,header.firstChild);headerBack.onclick=()=>{if(guide){guide=false;guideStep=0;hideInfo();render()}else{settingsOpen=false;hideInfo();render();gear?.focus()}};
        const group=document.createElement("div");group.className="gx-k3-head-right";
        gear=document.createElement("button");gear.type="button";gear.className="gx-k3-gear";gear.setAttribute("aria-label","Ajustes de notificaciones");gear.title="Ajustes de notificaciones";gear.innerHTML=icons.gear;gear.hidden=true;
        headerInfo=document.createElement("button");headerInfo.type="button";headerInfo.className="gx-k3-info";headerInfo.setAttribute("aria-label","Información");headerInfo.setAttribute("aria-expanded","false");headerInfo.innerHTML=icons.info;headerInfo.hidden=true;
        headerInfo.onclick=()=>{const el=panel.querySelector(guide?"[data-step-hint]":"[data-help-info]");el.hidden=!el.hidden;headerInfo.setAttribute("aria-expanded",String(!el.hidden))};
        close.before(group);group.append(gear,headerInfo,close);
        gear.onclick=()=>{settingsOpen=true;guide=false;guideStep=0;hideInfo();render();headerBack.focus({preventScroll:true})};
      }
      if(sheet.classList.contains("gx-client-notif-sheet"))new MutationObserver(()=>{if(!sheet.classList.contains("show")){if(sheet.classList.contains("gx-k3-expanded")){sheet.classList.remove("gx-k3-expanded");handleButton?.setAttribute("aria-expanded","false");handleButton?.setAttribute("aria-label","Expandir notificaciones")}if(settingsOpen){settingsOpen=false;guide=false;guideStep=0;hideInfo();render()}}}).observe(sheet,{attributes:true,attributeFilter:["class"]});
      const missions=document.querySelector(".gxb-wrap");if(missions){missionObserver=new MutationObserver(syncMissionPreview);missionObserver.observe(missions,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","data-benefit"]});}
    }
    render();
  }
  function hideInfo(){
    if(panel){panel.querySelector("[data-help-info]").hidden=true;panel.querySelector("[data-step-hint]").hidden=true;}
    headerInfo?.setAttribute("aria-expanded","false");
  }
  function render(){
    if(!panel)return;
    const allowed=canInvite();if(!allowed){settingsOpen=false;guide=false;guideStep=0;hideInfo()}
    const next=allowed&&settingsOpen;
    const needsInstall=ios&&!installed(),support=capable(),button=panel.querySelector("[data-primary]"),denied=support&&Notification.permission==="denied",showGuide=next&&needsInstall&&guide;
    if(gear){gear.hidden=!allowed||next;gear.setAttribute("aria-expanded",String(next));}
    if(headerBack)headerBack.hidden=!next;
    if(headerInfo)headerInfo.hidden=!next;
    if(headerTitle)headerTitle.textContent=next?(showGuide?"Activar en iPhone":"Ajustes"):"Notificaciones";
    sheet?.classList.toggle("gx-k3-settings-open",next);panel.hidden=!next;syncMissionPreview();
    if(handleButton){handleButton.disabled=!allowed||next;handleButton.setAttribute("aria-hidden",String(!allowed||next));}
    if(!next){lastBellMode="";return;}
    panel.dataset.mode=showGuide?"guide":active?"active":needsInstall?"install":denied?"denied":support?"inactive":"unsupported";
    const mode=panel.dataset.mode;
    if(mode!==lastBellMode){
      lastBellMode=mode;panel.scrollTop=0;
      const bell=panel.querySelector(".gx-k3-bell");bell.classList.remove("gx-k3-pulse-once");
      if(!showGuide){void bell.offsetWidth;bell.classList.add("gx-k3-pulse-once")}
    }
    panel.querySelector("[data-settings]").hidden=showGuide;
    panel.querySelector("[data-guide]").hidden=!showGuide;
    if(showGuide){
      const step=guideSteps[guideStep];
      panel.querySelector("[data-step-label]").textContent="Paso "+(guideStep+1)+" de "+guideSteps.length;
      panel.querySelector("[data-step-progress]").innerHTML=guideSteps.map((_,i)=>'<span class="'+(i===guideStep?"current":i<guideStep?"done":"")+'"></span>').join("");
      const art=panel.querySelector("[data-step-art]");
      if(art.dataset.step!==String(guideStep)){art.dataset.step=String(guideStep);art.innerHTML=step.art;panel.scrollTop=0}
      panel.querySelector("[data-step-title]").textContent=step.title;
      panel.querySelector("[data-step-copy]").textContent=step.copy;
      panel.querySelector("[data-step-hint]").textContent=step.hint;
      panel.querySelector("[data-guide-prev]").disabled=guideStep===0;
      panel.querySelector("[data-guide-next]").textContent=guideStep===guideSteps.length-1?"Entendido":"Siguiente";
      return;
    }
    panel.querySelector("[data-title]").textContent=active?"Avisos activados":needsInstall?"Activa tus avisos":!support?"Avisos no compatibles":denied?"Avisos bloqueados":"Activa tus avisos";
    panel.querySelector("[data-desc]").textContent=active?"En este dispositivo.":needsInstall?"Agrega GOXION a tu pantalla de inicio.":!support?"La campana sigue disponible.":denied?"Los avisos están bloqueados. Revisa los permisos.":"Recibe novedades aunque GOXION esté cerrado.";
    button.hidden=!needsInstall&&(!support||denied)&&!active;
    button.disabled=busy||(!needsInstall&&!active&&(!reg||!pub||categories.length===0));
    button.textContent=active?"Desactivar avisos":needsInstall?"Cómo activar en iPhone":"Activar avisos";
    button.classList.toggle("gx-k3-disable",active);
    panel.querySelector("[data-options]").hidden=needsInstall||!support||denied;
    for(const i of panel.querySelectorAll("input")){i.checked=categories.includes(i.value);i.disabled=busy;}
    const saveButton=panel.querySelector("[data-save]");saveButton.hidden=!active||!options;saveButton.disabled=busy||categories.length===0;
    const t=panel.querySelector("[data-test]");t.hidden=!active;t.disabled=busy;
    panel.querySelector("[data-feedback]").hidden=survey()?.answer!=="pending";
    const status=panel.querySelector("[role=status]");status.textContent=notice;status.hidden=!notice;
  }
  window.GOXION_PUSH_K3=Object.freeze({canInvite,active:()=>active,feedbackItem,answerFeedback,openSettings});
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
    if(ios&&!installed()){guide=true;guideStep=0;hideInfo();render();return}
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
    busy=true;render();try{await api("probar",{deviceId:d.id});if(g===generation){notice="Aviso de prueba enviado. Revisa tu teléfono.";setSurvey({deviceId:d.id,at:Date.now(),answer:"pending"});}}
    catch(e){if(g===generation)notice=e.message}finally{if(g===generation){busy=false;render()}}
  }
  function onReady(){
    if(token()&&!blocked&&new URLSearchParams(location.search).get("push")==="1"){
      history.replaceState(null,"",location.pathname);setTimeout(()=>window.GOXION_CLIENT_NOTIFICATIONS?.open(),650);
    }
    void prepare();
  }
  window.addEventListener("goxion:client-ready",onReady);
  window.addEventListener("goxion:client-logout",()=>{void detach(token()||owner);guide=false;guideStep=0;settingsOpen=false;options=false;notice="";categories=[...defaults]});
  window.addEventListener("goxion:legal-state",e=>{const a=e.detail?.acceso;const was=blocked;blocked=a?.restringido===true||a?.bloquea_operaciones===true||a?.acceso_restringido===true;if(blocked&&!was)void detach(token());render();if(!blocked&&was)void prepare()});
  window.addEventListener("storage",()=>{if(token()!==owner){if(owner)void detach(owner);else void prepare()}});
  document.addEventListener("click",e=>{if(e.target.closest?.("#gx-client-notif-launch"))setTimeout(prepare,0)},true);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!busy)void prepare()});
  document.addEventListener("DOMContentLoaded",()=>setTimeout(onReady,650));
})();
