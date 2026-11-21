/* GOXION Admin · bajas por términos v2.0 para todas las cuentas.
   El operador confirma cada baja; retiro de accesos externos siempre manual. */
(()=>{
 "use strict";
 if(window.GOXION_ADMIN_LEGAL_BAJAS)return;
 const core=window.GOXION_CORE,endpoint=core?.endpoint?.("admin-operaciones"),
       tokenKey=core?.STORAGE?.ADMIN_TOKEN;
 let busy=false,lastCheck=0,lastToken="";
 const n=(tag,cls,txt)=>{
   const e=document.createElement(tag);if(cls)e.className=cls;
   if(txt!==undefined)e.textContent=String(txt);return e;
 };
 function locate(){
   const ops=document.getElementById("tab-operaciones"),home=document.getElementById("tab-resumen");
   if(!ops||!home)return null;
   let panel=document.getElementById("gx-legal-admin-alert");
   if(!panel){
     panel=n("section");panel.id="gx-legal-admin-alert";panel.hidden=true;
     panel.setAttribute("aria-label","Bajas por términos rechazados");
     const anchor=document.getElementById("gx-extension-red-alerts");
     if(anchor)anchor.insertAdjacentElement("afterend",panel);else ops.prepend(panel);
   }
   let homeBtn=document.getElementById("gx-legal-admin-home");
   if(!homeBtn){
     homeBtn=n("button","","Revisar bajas por términos");
     homeBtn.id="gx-legal-admin-home";homeBtn.type="button";homeBtn.hidden=true;
     homeBtn.addEventListener("click",()=>{
       window.goAdminTab?.("tab-operaciones");
       panel.scrollIntoView({behavior:"smooth",block:"center"});
     });
     const anchor=home.querySelector(".gx-home-priority-grid");
     if(anchor)anchor.insertAdjacentElement("afterend",homeBtn);else home.prepend(homeBtn);
   }
   return {panel,homeBtn};
 }
 async function call(action,datos={}){
   const token=localStorage.getItem(tokenKey)||"";
   if(!token||!endpoint)throw Error("La sesión administrativa no está disponible");
   const res=await fetch(endpoint,{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Admin-Token":token},
     body:JSON.stringify({accion:action,datos})});
   const data=await res.json().catch(()=>({}));
   if(token!==localStorage.getItem(tokenKey))throw Error("La sesión de Admin cambió");
   if(!res.ok||data.ok!==true)throw Error(data.error||"No se pudo completar la operación");
   return data;
 }
 function render(data){
   const els=locate();if(!els)return;
   const {panel,homeBtn}=els,pend=Array.isArray(data.clientes)?data.clientes:[],
         reviews=Array.isArray(data.revision)?data.revision:[];
   panel.replaceChildren();
   panel.hidden=pend.length===0&&reviews.length===0;
   homeBtn.hidden=panel.hidden;
   if(panel.hidden)return;
   const h=n("div","gx-legal-admin-head");
   h.append(n("strong","",pend.length+" "+(pend.length===1?"baja legal pendiente":"bajas legales pendientes")));
   const refresh=n("button","","Actualizar");refresh.type="button";
   refresh.addEventListener("click",()=>void load(true));h.append(refresh);panel.append(h);
   if(pend.length)panel.append(n("p","gx-legal-admin-copy",
     "Estos clientes rechazaron los términos 2.0 y terminaron sus coberturas pagadas. "+
     "La baja interna requiere tu confirmación; después retiras los accesos en cada plataforma."));
   for(const item of pend){
     const section=n("section","gx-legal-admin-client");
     section.append(n("strong","",String(item.cliente_nombre||"Cliente")));
     const date=item.estado?.ultima_cobertura||"Sin servicios vigentes";
     section.append(n("p","gx-legal-admin-date","Última cobertura: "+date));
     const ul=n("ul","gx-legal-admin-items");
     for(const svc of item.estado?.servicios||[]){
       ul.append(n("li","",String(svc.nombre||"Servicio")+" · hasta "+String(svc.cobertura_hasta||"por revisar")));
     }
     if(ul.children.length)section.append(ul);
     const actions=n("div","gx-legal-admin-controls");
     const start=n("button","gx-legal-admin-go","Finalizar servicios en GOXION");
     start.type="button";actions.append(start);section.append(actions);
     const feedback=n("p","gx-legal-admin-status");feedback.hidden=true;
     feedback.setAttribute("role","status");section.append(feedback);
     start.addEventListener("click",()=>{
       actions.replaceChildren();
       const cancel=n("button","gx-legal-admin-no","Cancelar");
       const confirm=n("button","gx-legal-admin-yes","Confirmar baja interna");
       cancel.type="button";confirm.type="button";
       cancel.addEventListener("click",()=>render(data));
       confirm.addEventListener("click",async()=>{
         if(busy)return;busy=true;cancel.disabled=confirm.disabled=true;
         feedback.hidden=false;feedback.textContent="Verificando la última cobertura…";
         let success=false;
         try{
           await call("confirmar_baja_legal",{
             cliente_id:item.cliente_id,confirmacion:"FINALIZAR_SERVICIOS"
           });
           success=true;
           feedback.textContent="Baja interna registrada. Retira los accesos externos manualmente.";
         }catch(err){
           feedback.textContent=String(err?.message||err);
           cancel.disabled=confirm.disabled=false;
         }finally{
           busy=false;
           if(success){
             void load(true);
             window.dispatchEvent(new Event("goxion:admin-refresh"));
           }
         }
       });
       actions.append(cancel,confirm);
     });
     panel.append(section);
   }
   if(reviews.length){
     const notice=n("section","gx-legal-admin-review");
     notice.append(n("strong","","Coberturas por conciliar · "+reviews.length));
     notice.append(n("p","","Estos clientes rechazaron los términos, pero no tienen todas las fechas pagadas verificadas. No se permite su baja automática."));
     notice.append(n("div","gx-legal-admin-review-names",
       reviews.map(x=>x.cliente_nombre||"Cliente").join(" · ")));
     panel.append(notice);
   }
   homeBtn.textContent=pend.length?pend.length+" bajas por términos pendientes":
     reviews.length+" coberturas por revisar";
 }
 async function load(force=false){
   if(busy)return;
   const els=locate();if(!els||!endpoint||!tokenKey)return;
   const token=localStorage.getItem(tokenKey)||"";
   if(!token){
     els.panel.hidden=els.homeBtn.hidden=true;lastToken="";
     return;
   }
   if(!force&&lastToken===token&&Date.now()-lastCheck<60000)return;
   lastToken=token;
   try{
     const data=await call("listar_bajas_legales");
     lastCheck=Date.now();render(data);
   }catch(err){
     els.panel.hidden=false;els.homeBtn.hidden=true;
     els.panel.replaceChildren(n("p","gx-legal-admin-status",
       "No se pudo consultar la situación legal. Actualiza Operaciones para reintentar."));
     console.warn("[GOXION] Estado de bajas legales",String(err?.message||err).slice(0,150));
   }
 }
 function init(){
   locate();void load(true);
   setInterval(()=>{if(!document.hidden)void load(false)},60000);
   window.addEventListener("focus",()=>void load(true));
   document.addEventListener("visibilitychange",()=>{if(!document.hidden)void load(true)});
   window.addEventListener("goxion:admin-refresh",()=>void load(true));
 }
 window.GOXION_ADMIN_LEGAL_BAJAS=Object.freeze({refresh:()=>load(true)});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
