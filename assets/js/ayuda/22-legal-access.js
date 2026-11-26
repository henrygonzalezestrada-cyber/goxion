/* GOXION · Interfaz de cuenta restringida, para todas las cuentas que rechacen términos v2.0.
   Nunca decide cobertura a partir de datos del navegador: confía en estado
   autenticado de legal-consent-v2 -> RPC service-role. */
(()=>{
 "use strict";
 if(window.GOXION_LEGAL_ACCESS)return;
 const CORE=window.GOXION_CORE,legal=()=>window.GOXION_LEGAL_V2;
 // La identidad sólo se obtiene del runtime central; sin él no se pide historial.
 const TOKEN_KEY=CORE?.STORAGE?.CLIENT_TOKEN;
 const token=()=>{if(!TOKEN_KEY)return "";try{return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";}};
 let locked=false,blocked=false,managed=[],lastAccess=null,loadingHistory=false;
 const $=(s,root=document)=>root.querySelector(s);
 function n(tag,cls,text){
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=text;
   return el;
 }
 function init(){
   if($("#gx-legal-access-shell"))return;
   const shell=n("section");shell.id="gx-legal-access-shell";shell.hidden=true;
   shell.setAttribute("aria-label","Tu espacio está restringido");
   shell.innerHTML=[
     '<div class="gx-legal-lock-card">',
     '<div class="gx-legal-lock-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="11" rx="2.4"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></div>',
     '<h2>Tu espacio está restringido</h2>',
     '<p>Tus servicios contratados han finalizado y decidiste no aceptar los Términos y Condiciones actualizados.</p>',
     '<p class="gx-legal-lock-help">Si cambiaste de opinión, puedes revisar y aceptar los términos para volver a contratar en GOXION.</p>',
     '<button type="button" class="gx-legal-lock-primary" data-gx-lock-accept>Revisar y aceptar términos</button>',
     '<button type="button" class="gx-legal-lock-exit" data-gx-lock-exit>Cerrar sesión</button>',
     '<div class="gx-legal-lock-links"><button type="button" data-gx-lock-history aria-expanded="false">Comprobantes y aclaraciones</button></div>',
     '<div class="gx-legal-lock-details" data-gx-lock-details hidden></div>',
     '</div>'
   ].join("");
   document.body.append(shell);
   $("[data-gx-lock-accept]",shell).addEventListener("click",()=>{legal()?.openConsent?.();});
   $("[data-gx-lock-exit]",shell).addEventListener("click",()=>{
     if(typeof window.cerrarSesion==="function")window.cerrarSesion();
     else{if(TOKEN_KEY)try{localStorage.removeItem(TOKEN_KEY);}catch(_){}window.dispatchEvent(new Event("goxion:client-logout"));location.reload();}
   });
   $("[data-gx-lock-history]",shell).addEventListener("click",()=>void showHistory());
 }
 function setInert(value){
   if(value){
     managed=[];
     for(const child of document.body.children){
       if(child.id==="gx-legal-access-shell"||child.id==="gx-legal-consent"||
         child.tagName==="SCRIPT"||child.hasAttribute("inert"))continue;
       child.inert=true;managed.push(child);
     }
   }else{
     for(const child of managed)child.inert=false;
     managed=[];
   }
 }
 function setLocked(value){
   if(locked===value)return;
   locked=value;
   init();
   const shell=$("#gx-legal-access-shell");
   if(value){
     document.body.classList.add("gx-legal-locked");
     shell.hidden=false;
     setInert(true);
     shell.querySelector("[data-gx-lock-accept]")?.focus({preventScroll:true});
   }else{
     setInert(false);
     document.body.classList.remove("gx-legal-locked");
     shell.hidden=true;
   }
 }
 function banner(){
   const dash=$("#view-dashboard");if(!dash)return null;
   let el=$("#gx-legal-access-banner");
   if(!el){
     el=n("aside","gx-legal-access-banner");
     el.id="gx-legal-access-banner";el.hidden=true;
     const greeting=dash.querySelector(".dash-greeting-box");
     if(greeting)greeting.insertAdjacentElement("afterend",el);
     else dash.prepend(el);
   }
   return el;
 }
 function setActiveWarning(access){
   const bar=banner();if(!bar)return;
   const shouldShow=access?.bloquea_operaciones===true
     &&(access?.fase==="rechazado_vigente"||access?.fase==="revision_manual");
   bar.hidden=!shouldShow;
   if(shouldShow){
     const date=access.ultima_cobertura||"la fecha de cierre";
     bar.replaceChildren(n("strong","","Términos rechazados. "),
       document.createTextNode(access.fase==="revision_manual"
         ?"Tus periodos requieren revisión. Puedes consultar tus servicios y aclaraciones, pero no contratar, renovar ni cancelar."
         :"Tus accesos pagados finalizarán al terminar la última cobertura ("+date+"). No podrás renovar, contratar ni solicitar cancelaciones."));
   }
 }
 function render(payload){
   const state=payload?.acceso||null,prev=locked;
   lastAccess=state;
   blocked=state?.bloquea_operaciones===true;
   document.body.classList.toggle("gx-legal-rejected-active",blocked&&!state?.restringido);
   if(blocked&&!state?.restringido&&$("#view-catalogo")?.classList.contains("active"))
     window.switchTab?.("inicio");
   setActiveWarning(state);
   setLocked(state?.restringido===true);
   if(prev&&!locked&&state?.fase==="aceptado"&&token()){
     // Al aceptar tras el bloqueo la vista anterior solo tenía historial.
     setTimeout(()=>location.reload(),160);
   }
 }
 async function showHistory(){
   const shell=$("#gx-legal-access-shell"),panel=$("[data-gx-lock-details]",shell),
     btn=$("[data-gx-lock-history]",shell);
   if(!locked||!panel||loadingHistory)return;
   if(!panel.hidden){panel.hidden=true;btn.setAttribute("aria-expanded","false");return;}
   panel.hidden=false;btn.setAttribute("aria-expanded","true");
   panel.replaceChildren(n("p","","Consultando tu historial…"));
   loadingHistory=true;
   const current=token();
   try{
     if(!current||typeof CORE?.endpoint!=="function")throw Error("Sesión requerida");
     const res=await fetch(CORE.endpoint("mi-espacio"),{
       method:"POST",cache:"no-store",
       headers:{"Content-Type":"application/json","X-Client-Token":current},
       body:JSON.stringify({modo:""})
     });
     const data=await res.json();
     if(current!==token()||!locked)return;
     if(!res.ok||data.ok!==true||data.acceso_restringido!==true||!data.cliente?.id)
       throw Error("No fue posible verificar el historial");
     panel.replaceChildren(n("h3","","Historial de pagos"));
     const rows=Array.isArray(data.pagos)?data.pagos.slice(0,25):[];
     if(!rows.length)panel.append(n("p","","No hay pagos registrados."));
     for(const x of rows){
       const row=n("div","gx-legal-lock-pay");
       row.append(n("span","",String(x.fecha||x.periodo||"Periodo")));
       row.append(n("strong","",Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(x.monto)||0)+" · "+String(x.estado||"")));
       panel.append(row);
     }
     const phone=CORE?.BUSINESS?.WHATSAPP;
     if(phone&&/^\d{10,15}$/.test(String(phone))){
       const link=n("a","gx-legal-lock-contact","Solicitar una aclaración");
       link.href="https://wa.me/"+phone;link.target="_blank";link.rel="noopener noreferrer";
       panel.append(link);
     }
   }catch(err){if(locked)panel.replaceChildren(n("p","","No fue posible cargar el historial. Inténtalo nuevamente."));}
   finally{loadingHistory=false;}
 }
 document.addEventListener("click",event=>{
   if(!blocked||locked)return;
   const action=event.target?.closest?.("#btn-tab-catalogo,[data-goxion-tab='catalogo']");
   if(action){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 window.addEventListener("goxion:legal-state",event=>render(event.detail));
 window.addEventListener("goxion:client-logout",()=>render({acceso:null}));
 window.addEventListener("storage",event=>{if(TOKEN_KEY&&event.key===TOKEN_KEY)legal()?.refresh?.();});
 window.addEventListener("focus",()=>{if(token())legal()?.refresh?.();});
 const baseSwitch=window.switchTab;
 if(typeof baseSwitch==="function"){
   window.switchTab=function(name){
     if(blocked&&name==="catalogo")return;
     return baseSwitch.apply(this,arguments);
   };
 }
 init();
 if(token())setTimeout(()=>legal()?.refresh?.(),1250);
 window.GOXION_LEGAL_ACCESS=Object.freeze({getState:()=>lastAccess,refresh:()=>legal()?.refresh?.()});
})();
