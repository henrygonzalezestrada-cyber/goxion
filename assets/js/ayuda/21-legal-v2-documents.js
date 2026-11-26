/* GOXION · Documentos v2 dentro del modal existente y consentimiento de piloto.
 * Fuente única: docs/legal/*.md en el mismo sitio.
 * La decisión se persiste en Supabase; localStorage NO acredita aceptación.
 */
(()=>{
 "use strict";
 if(window.GOXION_LEGAL_V2)return;
 const VERSION="2.0", CORE=window.GOXION_CORE;
 // Única clave de sesión: runtime oficial o runtime de aceptación aislada.
 const TOKEN_KEY=CORE?.STORAGE?.CLIENT_TOKEN;
 const API=CORE?.endpoint?.("legal-consent-v2")||"";
 const DOCS={
   terminos:{title:"Términos y Condiciones",url:"./assets/legal/terminos-v2.txt"},
   referidos:{title:"Bases de referidos",url:"./assets/legal/referidos-v2.txt"},
   cupones:{title:"Cupones y promociones",url:"./assets/legal/cupones-v2.txt"}
 };
 const cache=new Map();
 let currentDoc="terminos",reader=null,dialog=null,serverState=null,activeToken="";
 let pendingOperation=null,busy=false,openQueued=false,retryTimer=0,remindTimer=0,lastCheckedAt=0;
 const REMIND_AFTER_MS=24*60*60*1000;
 const REFRESH_AFTER_MS=30*1000;
 const remindKey=()=>serverState?.cliente_id?"goxion:terminos:2.0:recordar:"+serverState.cliente_id:null;
 const remindAfter=()=>{
   const key=remindKey();if(!key)return 0;
   try{return Number(localStorage.getItem(key)||0)||0;}catch{return 0;}
 };
 function scheduleReminder(){
   clearTimeout(remindTimer);remindTimer=0;
   if(serverState?.estado!=="pendiente"||!token())return;
   const remaining=remindAfter()-Date.now();
   if(remaining>0)remindTimer=setTimeout(()=>{void checkSession();},remaining+500);
 }
 function postpone(){
   const key=remindKey();
   if(key){try{localStorage.setItem(key,String(Date.now()+REMIND_AFTER_MS));}catch(_){}}
   openQueued=false;clearTimeout(retryTimer);scheduleReminder();
 }
 function tryOffer(){
   if(serverState?.estado!=="pendiente"||!serverState?.habilitado||!token()||busy||
      (dialog?.element.open)||openQueued)return;
   if(remindAfter()>Date.now()){scheduleReminder();return;}
   openQueued=true;
   let attempts=0;
   const offer=()=>{
     if(!openQueued||!token()||serverState?.estado!=="pendiente")return;
     if(remindAfter()>Date.now()){openQueued=false;scheduleReminder();return;}
     if(!alreadyBlocked()&&attempts>=2){
       openQueued=false;void openConsent();return;
     }
     if(++attempts<80)retryTimer=setTimeout(offer,700);
     else openQueued=false; // Se reintentará al regresar a la pestaña.
   };
   retryTimer=setTimeout(offer,1100);
 }
 const token=()=>{if(!TOKEN_KEY)return "";try{return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";}};
 function el(tag,cls,text){
   const n=document.createElement(tag);
   if(cls)n.className=cls;
   if(text!==undefined)n.textContent=String(text);
   return n;
 }
 function addInline(parent,text){
   String(text).split(/(\*\*[^*]+\*\*)/g).forEach(piece=>{
     if(piece.startsWith("**")&&piece.endsWith("**")){
       parent.append(el("strong","",piece.slice(2,-2)));
     }else if(piece)parent.append(document.createTextNode(piece));
   });
 }
 function renderMarkdown(container,md){
   container.replaceChildren();
   let lines=String(md).split(/\r?\n/),paragraph=[],list=null;
   const flush=()=>{
     if(!paragraph.length)return;
     let p=el("p");
     addInline(p,paragraph.join(" "));
     container.append(p);paragraph=[];
   };
   for(const line of lines){
     const heading=/^(#{1,3})\s+(.*)$/.exec(line);
     const item=/^[-*]\s+(.*)$/.exec(line);
     if(heading){
       flush();list=null;
       const h=el("h"+heading[1].length);addInline(h,heading[2]);container.append(h);
     }else if(item){
       flush();
       if(!list){list=el("ul");container.append(list);}
       let li=el("li");addInline(li,item[1]);list.append(li);
     }else if(!line.trim()){
       flush();list=null;
     }else {
       list=null;paragraph.push(line.trim());
     }
   }
   flush();
 }
 async function source(name){
   if(!DOCS[name])throw Error("Documento desconocido");
   if(!cache.has(name)){
     const promise=fetch(DOCS[name].url+"?v=2.0",{cache:"no-store"})
       .then(resp=>{if(!resp.ok)throw Error("El documento no está disponible");return resp.text();});
     cache.set(name,promise);
   }
   return cache.get(name);
 }
 async function loadInto(name,container){
   container.replaceChildren(el("p","gx-legal-loading","Cargando documento completo…"));
   try{
     const md=await source(name);
     renderMarkdown(container,md);
     return md;
   }catch(err){
     container.replaceChildren(el("p","gx-legal-error","No fue posible cargar el documento. Inténtalo de nuevo."));
     throw err;
   }
 }
 function readerMount(){
   if(reader)return reader;
   const existing=document.getElementById("modal-terminos");
   const body=existing?.querySelector(".gx-dialog-legacy-scroll");
   if(!existing||!body)return null;
   const title=existing.querySelector(".modal-title");
   if(title)title.textContent="Documentos y políticas";
   body.replaceChildren();
   const shell=el("section","gx-legal-reader");shell.setAttribute("aria-label","Documentos de GOXION");
   const nav=el("nav","gx-legal-reader-tabs");nav.setAttribute("aria-label","Seleccionar documento");
   for(const [key,item] of Object.entries(DOCS)){
     const button=el("button","",item.title);button.type="button";button.dataset.legalDoc=key;
     button.addEventListener("click",()=>selectDocument(key));
     nav.append(button);
   }
   const content=el("article","gx-legal-prose");content.id="gx-legal-reader-content";
   const footer=el("div","gx-legal-reader-footer");
   const direct=el("a","gx-legal-direct","Abrir el documento en página completa");
   direct.target="_blank";direct.rel="noopener";direct.href="./assets/legal/lector.html?doc=terminos";
   footer.append(direct);
   shell.append(nav,content,footer);body.append(shell);
   reader={body,nav,content,direct};
   const ref=document.getElementById("modal-referidos")?.querySelector(".gx-dialog-legacy-scroll");
   if(ref&&!document.getElementById("gx-legal-referrals-link")){
     const button=el("button","gx-legal-inline-link","Leer bases completas del programa");
     button.id="gx-legal-referrals-link";button.type="button";
     button.addEventListener("click",()=>{
       window.closeModal?.("modal-referidos");
       openDocument("referidos");
     });
     ref.prepend(button);
   }
   const guarantee=document.getElementById("modal-garantia")?.querySelector(".gx-dialog-legacy-scroll");
   if(guarantee&&!document.getElementById("gx-legal-guarantee-link")){
     const button=el("button","gx-legal-inline-link","Consultar condiciones completas");
     button.id="gx-legal-guarantee-link";button.type="button";
     button.addEventListener("click",()=>{
       window.closeModal?.("modal-garantia");openDocument("terminos");
     });
     guarantee.append(button);
   }
   void selectDocument("terminos");
   return reader;
 }
 async function selectDocument(key){
   if(!DOCS[key])key="terminos";
   const r=readerMount();if(!r)return;
   currentDoc=key;
   r.nav.querySelectorAll("button").forEach(b=>{
     b.setAttribute("aria-current",b.dataset.legalDoc===key?"page":"false");
   });
   r.direct.href="./assets/legal/lector.html?doc="+key;
   r.body.scrollTop=0;
   await loadInto(key,r.content).catch(()=>{});
 }
 function openDocument(key="terminos"){
   if(!DOCS[key])key="terminos";
   readerMount();void selectDocument(key);
   if(typeof window.openModal==="function")window.openModal("modal-terminos");
   else document.getElementById("modal-terminos")?.classList.add("show");
 }
 function hubMount(){
   const dash=document.getElementById("view-dashboard");
   if(!dash||document.getElementById("gx-legal-hub"))return;
   // Pie secundario del feed: después del historial, nunca entre saludo y pagos.
   const box=el("div","gx-legal-hub");box.id="gx-legal-hub";
   const link=el("button","gx-legal-hub-open");
   link.type="button";
   link.setAttribute("aria-label","Consultar documentos y políticas");
   const copy=el("span","gx-legal-hub-label","Documentos y políticas");
   const arrow=el("span","gx-legal-hub-arrow","›");arrow.setAttribute("aria-hidden","true");
   link.append(copy,arrow);
   link.addEventListener("click",()=>openDocument("terminos"));
   const status=el("div","gx-legal-status");status.id="gx-legal-status";
   box.append(link,status);
   dash.append(box);
 }
 function showState(){
   const root=document.getElementById("gx-legal-status");if(!root)return;
   root.replaceChildren();
   if(!serverState?.habilitado)return;
   const status=String(serverState.estado||"pendiente");
   const label=status==="aceptado"?"Términos 2.0 aceptados":
     status==="rechazado"?"Términos 2.0 rechazados":"Términos 2.0 · pendiente";
   const button=el("button","gx-legal-review",label);
   button.type="button";button.addEventListener("click",()=>void openConsent(true));
   root.append(button);
 }
 async function api(accion,data={},sessionToken=token()){
   if(!API||!sessionToken)throw Error("Sesión requerida");
   const res=await fetch(API,{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Client-Token":sessionToken},
     body:JSON.stringify({accion,...data})});
   const out=await res.json().catch(()=>({}));
   if(!res.ok||out?.ok!==true)throw Error(out?.error||"No se pudo guardar tu decisión");
   return out;
 }
 async function verifySha(text,expected){
   if(!expected||!crypto?.subtle)return false;
   const bytes=new TextEncoder().encode(text);
   const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
   const actual=[...hash].map(c=>c.toString(16).padStart(2,"0")).join("");
   return actual===expected;
 }
 function createConsent(){
   if(dialog)return dialog;
   const d=document.createElement("dialog");
   d.id="gx-legal-consent";d.className="gx-legal-consent";
   d.setAttribute("aria-labelledby","gx-legal-consent-title");
   d.setAttribute("tabindex","-1");
   d.innerHTML=[
     '<div class="gx-legal-panel gx-legal-intro" data-gx-panel="intro">',
       '<button class="gx-legal-close" type="button" data-gx-close aria-label="Cerrar aviso"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg></button>',
       '<h2 id="gx-legal-consent-title"><span class="gx-legal-title-accent">Actualizamos</span> los términos.</h2>',
       '<p class="gx-legal-intro-copy">Consulta la versión 2.0 antes de decidir.</p>',
       '<button type="button" class="gx-legal-read-cta gx-legal-motion" data-gx-open-reader><span class="gx-legal-cta-copy">Leer términos</span><span class="gx-legal-cta-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z" fill="currentColor"></path></svg></span></button>',
       '<div class="gx-legal-intro-actions">',
         '<button type="button" data-gx-reject>Rechazar</button>',
         '<button type="button" data-gx-later>Ahora no</button>',
       '</div>',
       '<p class="gx-legal-intro-error" role="status" aria-live="polite"></p>',
     '</div>',
     '<div class="gx-legal-panel gx-legal-read" data-gx-panel="read" hidden>',
       '<header class="gx-legal-read-head">',
         '<button type="button" data-gx-back aria-label="Volver al aviso">← <span>Volver</span></button>',
         '<span>Versión 2.0</span>',
       '</header>',
       '<div class="gx-legal-consent-scroll" role="region" aria-label="Documento completo">',
         '<article class="gx-legal-prose gx-legal-consent-article"></article>',
         '<div class="gx-legal-end" aria-hidden="true">Fin del documento</div>',
       '</div>',
       '<footer class="gx-legal-read-foot">',
         '<p class="gx-legal-scroll-hint">Lee hasta el final para aceptar.</p>',
         '<label class="gx-legal-check"><input type="checkbox" data-gx-read disabled> <span>He leído los términos de la versión 2.0.</span></label>',
         '<div class="gx-legal-consent-actions">',
           '<button type="button" class="gx-legal-reject" data-gx-reject>Rechazar</button>',
           '<button type="button" class="gx-legal-accept gx-legal-motion" data-gx-accept disabled>Aceptar</button>',
         '</div>',
         '<p class="gx-legal-consent-feedback" role="status" aria-live="polite"></p>',
       '</footer>',
     '</div>',
     '<div class="gx-legal-panel gx-legal-confirm" data-gx-panel="confirm" hidden>',
       '<button type="button" class="gx-legal-confirm-back" data-gx-cancel-reject>← Volver</button>',
       '<h2>¿Quieres rechazar los términos?</h2>',
       '<p>Si rechazas, <strong>no podrás contratar ni renovar servicios</strong> hasta aceptar los términos vigentes. Los accesos que ya pagaste seguirán disponibles <strong>hasta finalizar su periodo</strong>, pero no se renovarán sin tu aceptación.</p><p class="gx-legal-confirm-note">Podrás consultar tus pagos y recibir soporte durante el proceso.</p>',
       '<button type="button" class="gx-legal-confirm-action gx-legal-motion" data-gx-confirm-reject>Confirmar rechazo</button>',
       '<p class="gx-legal-confirm-error" role="status" aria-live="polite"></p>',
     '</div>'
   ].join("");
   document.body.append(d);
   const read=d.querySelector('[data-gx-panel="read"]');
   const scroll=d.querySelector(".gx-legal-consent-scroll");
   const checkbox=d.querySelector("[data-gx-read]");
   const accept=d.querySelector("[data-gx-accept]");
   const feedback=d.querySelector(".gx-legal-consent-feedback");
   const introError=d.querySelector(".gx-legal-intro-error");
   const confirmError=d.querySelector(".gx-legal-confirm-error");
   let checksumOk=false,scrolled=false,returnMode="intro",lastFocus=null;
   function showPanel(mode){
     for(const panel of d.querySelectorAll("[data-gx-panel]")){
       panel.hidden=panel.dataset.gxPanel!==mode;
     }
     d.dataset.mode=mode;
     // No preseleccionar el botón principal al abrir en iPhone: provoca aro azul.
     // En lectura y confirmación sí mantenemos foco útil para teclado.
     const focusTarget=mode==="intro"?d:
       mode==="read"?d.querySelector("[data-gx-back]"):
         d.querySelector("[data-gx-cancel-reject]");
     focusTarget?.focus({preventScroll:true});
   }
   const ready=()=>{accept.disabled=!(checksumOk&&scrolled&&checkbox.checked&&!busy);};
   const checkScroll=()=>{
     if(!checksumOk)return;
     if(scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<=22){
       scrolled=true;checkbox.disabled=false;
       d.querySelector(".gx-legal-scroll-hint").textContent="Puedes confirmar tu lectura.";
       ready();
     }
   };
   async function enterReader(){
     if(busy)return;
     showPanel("read");
     checkbox.checked=false;checkbox.disabled=true;scrolled=false;checksumOk=false;ready();
     scroll.scrollTop=0;
     feedback.textContent="";
     try{
       const content=await loadInto("terminos",read.querySelector(".gx-legal-consent-article"));
       checksumOk=await verifySha(content,serverState?.documento_sha256);
       if(!checksumOk)throw Error("No se pudo verificar este documento. Inténtalo más tarde.");
       checkScroll();
     }catch(error){
       checksumOk=false;ready();
       feedback.textContent=String(error?.message||error);
     }
   }
   scroll.addEventListener("scroll",checkScroll,{passive:true});
   checkbox.addEventListener("change",ready);
   d.querySelector("[data-gx-open-reader]").addEventListener("click",()=>void enterReader());
   d.querySelector("[data-gx-back]").addEventListener("click",()=>showPanel("intro"));
   d.querySelectorAll("[data-gx-reject]").forEach(button=>button.addEventListener("click",()=>{
     if(busy)return;
     returnMode=d.dataset.mode==="read"?"read":"intro";
     confirmError.textContent="";showPanel("confirm");
   }));
   d.querySelector("[data-gx-cancel-reject]").addEventListener("click",()=>showPanel(returnMode));
   d.querySelector("[data-gx-confirm-reject]").addEventListener("click",()=>void decide("rechazado"));
   accept.addEventListener("click",()=>{if(!accept.disabled)void decide("aceptado");});
   d.querySelector("[data-gx-later]").addEventListener("click",()=>{if(!busy)d.close();});
   d.querySelector("[data-gx-close]").addEventListener("click",()=>{if(!busy)d.close();});
   d.addEventListener("cancel",event=>{if(busy)event.preventDefault();});
   d.addEventListener("close",()=>{
     // Cerrar o "Ahora no" no registra consentimiento: solo posterga 24 h.
     if(serverState?.estado==="pendiente"&&token())postpone();
     checkbox.checked=false;feedback.textContent="";introError.textContent="";confirmError.textContent="";
     const previous=lastFocus;lastFocus=null;previous?.focus?.({preventScroll:true});
     // La cola informativa continúa solo DESPUÉS de cerrar esta tarjeta.
     // Nunca convierte un "Ahora no" en aceptación ni modifica la decisión.
     window.dispatchEvent(new CustomEvent("goxion:legal-dismissed",{
       detail:{estado:serverState?.estado||"sin_activar"}
     }));
   });
   dialog={
     element:d,scroll,checkbox,accept,feedback,introError,confirmError,
     setMode:showPanel,ready,verified:()=>checksumOk&&scrolled&&checkbox.checked,
     reset:()=>{
       checksumOk=false;scrolled=false;
       checkbox.checked=false;checkbox.disabled=true;scroll.scrollTop=0;
       ready();feedback.textContent="";introError.textContent="";confirmError.textContent="";
       d.querySelector(".gx-legal-scroll-hint").textContent="Lee hasta el final para aceptar.";
       showPanel("intro");
     },
     saveFocus:()=>{lastFocus=document.activeElement;}
   };
   return dialog;
 }
 function alreadyBlocked(){
   if(document.hidden||document.body.classList.contains("no-scroll"))return true;
   const splash=document.getElementById("splash-screen");
   if(splash&&splash.style.visibility!=="hidden")return true;
   if(document.querySelector("#gx-release-overlay:not([hidden]),.modal.show,.gx-client-notif-overlay.show"))return true;
   return false;
 }
 async function openConsent(manual=false){
   if(!serverState?.habilitado||busy||!token())return;
   const dlg=createConsent();if(dlg.element.open)return;
   if(!manual&&alreadyBlocked())return;
   dlg.saveFocus();dlg.reset();dlg.element.showModal();
   // Intro deliberadamente compacto; el documento se muestra solo si el cliente lo solicita.
   dlg.setMode("intro");
   window.dispatchEvent(new CustomEvent("goxion:legal-opened",{
     detail:{estado:serverState?.estado||"sin_activar"}
   }));
 }
 async function decide(value){
   if(busy)return;
   const dlg=createConsent();
   if(value==="aceptado"&&!dlg.verified())return;
   const current=token();if(!current)return;
   const opId=pendingOperation?.value===value?pendingOperation.id:crypto.randomUUID();
   pendingOperation={value,id:opId};
   busy=true;
   const feedback=value==="rechazado"?dlg.confirmError:dlg.feedback;
   feedback.textContent="Guardando tu decisión…";
   const controls=[...dlg.element.querySelectorAll("button,input")];
   const original=controls.map(node=>node.disabled);
   controls.forEach(node=>{node.disabled=true;});
   try{
     const updated=await api("decidir",{decision:value,operation_id:opId},current);
     if(current!==token())throw Error("La sesión cambió. Inicia sesión otra vez.");
     serverState={...serverState,...updated};
     pendingOperation=null;showState();dlg.element.close();
     window.dispatchEvent(new CustomEvent("goxion:legal-state",{detail:{
       estado:serverState?.estado||"pendiente",acceso:serverState?.acceso||null
     }}));
     window.GOXION_CLIENT_NOTIFICATIONS?.refresh?.();
   }catch(error){feedback.textContent=String(error?.message||error);}
   finally{
     busy=false;
     controls.forEach((node,index)=>{node.disabled=original[index];});
     dlg.ready();
   }
 }
 async function checkSession({force=false}={}){
   const current=token();
   if(!current)return;
   if(!force&&current===activeToken&&Date.now()-lastCheckedAt<REFRESH_AFTER_MS){
     tryOffer();return serverState;
   }
   activeToken=current;
   try{
     const state=await api("estado",{},current);
     if(current!==token())return null;
     lastCheckedAt=Date.now();
     serverState=state;showState();
     window.dispatchEvent(new CustomEvent("goxion:legal-state",{detail:{
       estado:state.estado,acceso:state.acceso||null
     }}));
     window.GOXION_CLIENT_NOTIFICATIONS?.refresh?.();
     if(state.habilitado&&state.estado==="pendiente")tryOffer();
     else{openQueued=false;clearTimeout(retryTimer);clearTimeout(remindTimer);}
     return state;
   }catch(error){
     activeToken="";
     console.warn("GOXION: estado legal no verificado",String(error?.message||error).slice(0,130));
     return null;
   }
 }
 async function openNotification(){
   const current=token();
   if(!current)return;
   // Siempre consultar al servidor: un dispositivo diferente pudo ya decidir.
   const state=await checkSession({force:true});
   if(current!==token()||!state)return;
   if(!state.habilitado||state.estado==="aceptado"){
     openDocument("terminos");
   }else{
     // Desde notificaciones la persona puede decidir incluso durante la prórroga
     // de "Ahora no"; rechazos previos también pueden reconsiderarse.
     openQueued=false;clearTimeout(retryTimer);
     await openConsent(true);
   }
 }
 function logout(){
   clearTimeout(retryTimer);clearTimeout(remindTimer);openQueued=false;activeToken="";lastCheckedAt=0;
   serverState=null;pendingOperation=null;showState();
   window.dispatchEvent(new CustomEvent("goxion:legal-state",{detail:{
     estado:"sin_activar",acceso:null
   }}));
   if(dialog?.element.open)dialog.element.close();
 }
 function setup(){
   readerMount();hubMount();
   if(token())setTimeout(()=>void checkSession(),900);
 }
 window.GOXION_LEGAL_V2=Object.freeze({
   version:VERSION,openDocument,openConsent:()=>void openConsent(true),
   openNotification,
   refresh:()=>checkSession({force:true}),
   getState:()=>serverState?.estado||"sin_activar",
   getAccessState:()=>serverState?.acceso||null,
   getQueueStatus:()=>({
     estado:serverState?.estado||"sin_activar",
     deferido:remindAfter()>Date.now(),
     modalAbierto:Boolean(dialog?.element.open)
   })
 });
 window.addEventListener("goxion:client-ready",()=>void checkSession({force:true}));
 window.addEventListener("focus",()=>{if(!document.hidden)void checkSession({force:true});});
 document.addEventListener("visibilitychange",()=>{
   if(!document.hidden)void checkSession({force:true});
 });
 // Mientras Mi Espacio permanezca abierto, seguir comprobando la decisión.
 setInterval(()=>{if(!document.hidden&&token())void checkSession();},30*1000);
 window.addEventListener("goxion:client-logout",logout);
 window.addEventListener("storage",ev=>{if(TOKEN_KEY&&ev.key===TOKEN_KEY){logout();if(token())void checkSession();}});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
})();
