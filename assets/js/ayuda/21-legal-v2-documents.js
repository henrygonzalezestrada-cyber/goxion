/* GOXION · Documentos v2 dentro del modal existente y consentimiento de piloto.
 * Fuente única: docs/legal/*.md en el mismo sitio.
 * La decisión se persiste en Supabase; localStorage NO acredita aceptación.
 */
(()=>{
 "use strict";
 if(window.GOXION_LEGAL_V2)return;
 const VERSION="2.0", CORE=window.GOXION_CORE;
 const TOKEN_KEY=CORE?.STORAGE?.CLIENT_TOKEN||"goxion_client_token";
 const API=CORE?.endpoint?.("legal-consent-v2")||"";
 const DOCS={
   terminos:{title:"Términos y Condiciones",url:"./docs/legal/TERMINOS_GENERALES_V2.md"},
   referidos:{title:"Bases de referidos",url:"./docs/legal/BASES_REFERIDOS_V2.md"},
   cupones:{title:"Cupones y promociones",url:"./docs/legal/BASES_CUPONES_PROMOCIONES_V2.md"}
 };
 const cache=new Map();
 let currentDoc="terminos",reader=null,dialog=null,serverState=null,activeToken="";
 let pendingOperation=null,busy=false,openQueued=false,retryTimer=0;
 const token=()=>{try{return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";}};
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
   if(title)title.textContent="GOXION · Centro de documentos";
   body.replaceChildren();
   const shell=el("section","gx-legal-reader");shell.setAttribute("aria-label","Documentos de GOXION");
   const head=el("div","gx-legal-reader-head");
   head.append(el("small","gx-legal-eyebrow","VERSIÓN 2.0 · CONSULTA CUANDO QUIERAS"));
   head.append(el("p","", "Lee los términos completos y las bases particulares. El documento se puede desplazar de principio a fin."));
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
   shell.append(head,nav,content,footer);body.append(shell);
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
   const box=el("section","gx-legal-hub");box.id="gx-legal-hub";
   const title=el("div","gx-legal-hub-copy");
   title.append(el("strong","","Tus documentos GOXION"));
   title.append(el("small","","Términos, referidos y cupones · disponibles para consultar"));
   const links=el("div","gx-legal-hub-links");
   for(const [key,item] of Object.entries(DOCS)){
     const b=el("button","",item.title);b.type="button";
     b.addEventListener("click",()=>openDocument(key));links.append(b);
   }
   const state=el("div","gx-legal-status");state.id="gx-legal-status";
   box.append(title,links,state);
   const greet=dash.querySelector(".dash-greeting-box");
   if(greet)greet.insertAdjacentElement("afterend",box);
   else dash.prepend(box);
 }
 function showState(){
   const root=document.getElementById("gx-legal-status");if(!root)return;
   root.replaceChildren();
   if(!serverState?.habilitado)return;
   const status=String(serverState.estado||"pendiente");
   const label=status==="aceptado"?"Versión 2.0 aceptada":
     status==="rechazado"?"Versión 2.0 rechazada":"Actualización pendiente de decisión";
   root.append(el("span","",label));
   const button=el("button","gx-legal-review","Revisar mi decisión");
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
   const d=document.createElement("dialog");d.id="gx-legal-consent";d.className="gx-legal-consent";
   d.setAttribute("aria-labelledby","gx-legal-consent-title");
   d.setAttribute("aria-describedby","gx-legal-consent-description");
   d.innerHTML=[
     '<div class="gx-legal-consent-layout">',
     '<header class="gx-legal-consent-head">',
     '<div class="gx-legal-kicker">GOXION · ACTUALIZACIÓN DE DOCUMENTOS</div>',
     '<h2 id="gx-legal-consent-title">Términos y Condiciones <span>2.0</span></h2>',
     '<p id="gx-legal-consent-description">Revisamos nuestras reglas de pago, prórrogas, mora, lealtad y garantía. Lee el documento completo y elige expresamente si deseas aceptarlo o rechazarlo.</p>',
     '</header>',
     '<div class="gx-legal-consent-scroll" tabindex="0" role="region" aria-label="Términos y Condiciones completos">',
     '<article class="gx-legal-prose gx-legal-consent-article"></article>',
     '<div class="gx-legal-end" aria-hidden="true">FIN DEL DOCUMENTO · VERSIÓN 2.0</div>',
     '</div>',
     '<footer class="gx-legal-consent-footer">',
     '<p class="gx-legal-scroll-hint">Desplázate hasta el final para habilitar la aceptación.</p>',
     '<label class="gx-legal-check"><input type="checkbox" data-gx-read disabled/> <span>He leído los Términos y Condiciones de la versión 2.0.</span></label>',
     '<div class="gx-legal-consent-actions">',
     '<button type="button" class="gx-legal-reject" data-gx-reject>Rechazar</button>',
     '<button type="button" class="gx-legal-accept" data-gx-accept disabled>Aceptar términos</button>',
     '</div>',
     '<p class="gx-legal-disclaimer">Puedes consultar los documentos después desde Mi Espacio. Rechazar no cancela los periodos ya pagados.</p>',
     '<div class="gx-legal-consent-feedback" role="status" aria-live="polite"></div>',
     '<div class="gx-legal-reject-confirm" hidden>',
     '<strong>¿Confirmas que rechazas estos términos?</strong>',
     '<p>Registraremos tu decisión. Tus servicios ya pagados no se cancelan; cualquier renovación posterior deberá aclararse con GOXION.</p>',
     '<div><button type="button" data-gx-cancel-reject>Volver</button><button type="button" data-gx-confirm-reject>Confirmar rechazo</button></div>',
     '</div>',
     '<button type="button" class="gx-legal-later" data-gx-later>Ahora no · cerrar aviso</button>',
     '</footer></div>'
   ].join("");
   document.body.append(d);
   const scroll=d.querySelector(".gx-legal-consent-scroll");
   const checkbox=d.querySelector("[data-gx-read]");
   const accept=d.querySelector("[data-gx-accept]");
   const feedback=d.querySelector(".gx-legal-consent-feedback");
   let checksumOk=false,scrolled=false;
   const ready=()=>{
     accept.disabled=!(checksumOk&&scrolled&&checkbox.checked&&!busy);
   };
   const checkScroll=()=>{
     if(!checksumOk)return;
     if(scroll.scrollTop+scroll.clientHeight>=scroll.scrollHeight-18){
       scrolled=true;checkbox.disabled=false;
       d.querySelector(".gx-legal-scroll-hint").textContent="Lectura completa · puedes marcar la casilla y decidir.";
       ready();
     }
   };
   scroll.addEventListener("scroll",checkScroll,{passive:true});
   checkbox.addEventListener("change",ready);
   const rejectBox=d.querySelector(".gx-legal-reject-confirm");
   d.querySelector("[data-gx-reject]").addEventListener("click",()=>{
     if(busy)return;rejectBox.hidden=false;d.querySelector("[data-gx-confirm-reject]").focus();
   });
   d.querySelector("[data-gx-cancel-reject]").addEventListener("click",()=>{rejectBox.hidden=true;d.querySelector("[data-gx-reject]").focus();});
   d.querySelector("[data-gx-confirm-reject]").addEventListener("click",()=>void decide("rechazado"));
   accept.addEventListener("click",()=>{if(!accept.disabled)void decide("aceptado");});
   d.querySelector("[data-gx-later]").addEventListener("click",()=>{if(!busy)d.close();});
   d.addEventListener("cancel",e=>{if(busy)e.preventDefault();});
   d.addEventListener("close",()=>{checkbox.checked=false;rejectBox.hidden=true;feedback.textContent="";});
   dialog={element:d,scroll,content:d.querySelector(".gx-legal-consent-article"),
     checkbox,accept,feedback,reset:()=>{checksumOk=false;scrolled=false;checkbox.checked=false;
       checkbox.disabled=true;scroll.scrollTop=0;ready();},
     verified:ok=>{checksumOk=ok;checkScroll();ready();}};
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
   dlg.reset();dlg.feedback.textContent="";
   dlg.element.showModal();
   dlg.feedback.textContent="Cargando texto y verificando la versión…";
   try{
     const text=await loadInto("terminos",dlg.content);
     const valid=await verifySha(text,serverState.documento_sha256);
     if(!valid)throw Error("El documento no coincide con la versión registrada. No es posible aceptarlo todavía.");
     dlg.verified(true);dlg.feedback.textContent="";
   }catch(error){
     dlg.verified(false);dlg.feedback.textContent=String(error?.message||error);
   }
 }
 async function decide(value){
   if(busy)return;
   const dlg=createConsent();
   if(value==="aceptado"&&dlg.accept.disabled)return;
   const current=token();
   if(!current)return;
   const opId=pendingOperation?.value===value?pendingOperation.id:crypto.randomUUID();
   pendingOperation={value,id:opId};
   busy=true;dlg.feedback.textContent="Guardando tu decisión…";
   for(const b of dlg.element.querySelectorAll("button"))b.disabled=true;
   try{
     const updated=await api("decidir",{decision:value,operation_id:opId},current);
     if(current!==token())throw Error("La sesión cambió");
     serverState={...serverState,...updated};
     pendingOperation=null;showState();dlg.element.close();
     window.GOXION_CLIENT_NOTIFICATIONS?.refresh?.();
   }catch(error){dlg.feedback.textContent=String(error?.message||error);}
   finally{
     busy=false;
     for(const b of dlg.element.querySelectorAll("button"))b.disabled=false;
     dlg.accept.disabled=!(dlg.checkbox.checked&&!dlg.checkbox.disabled);
   }
 }
 async function checkSession(){
   const current=token();if(!current||current===activeToken)return;
   activeToken=current;
   try{
     const state=await api("estado",{},current);
     if(current!==token())return;
     serverState=state;showState();
     window.GOXION_CLIENT_NOTIFICATIONS?.refresh?.();
     if(!state.habilitado||state.estado!=="pendiente")return;
     openQueued=true;
     let attempts=0;
     const offer=()=>{
       if(!openQueued||current!==token())return;
       if(!alreadyBlocked()&&attempts>=2){openQueued=false;void openConsent();return;}
       if(++attempts<80)retryTimer=setTimeout(offer,700);
     };
     retryTimer=setTimeout(offer,1100);
   }catch(error){
     console.warn("GOXION: estado legal no verificado",String(error?.message||error).slice(0,130));
   }
 }
 function logout(){
   clearTimeout(retryTimer);openQueued=false;activeToken="";
   serverState=null;pendingOperation=null;showState();
   if(dialog?.element.open&&!busy)dialog.element.close();
 }
 function setup(){
   readerMount();hubMount();
   if(token())setTimeout(()=>void checkSession(),900);
 }
 window.GOXION_LEGAL_V2=Object.freeze({
   version:VERSION,openDocument,openConsent:()=>void openConsent(true),
   refresh:()=>{activeToken="";return checkSession();},
   getState:()=>serverState?.estado||"sin_activar"
 });
 window.addEventListener("goxion:client-ready",()=>void checkSession());
 window.addEventListener("goxion:client-logout",logout);
 window.addEventListener("storage",ev=>{if(ev.key===TOKEN_KEY){logout();if(token())void checkSession();}});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
})();
