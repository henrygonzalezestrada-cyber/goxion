/* GOXION Admin · Cliente Prueba: alerta de baja legal y confirmación interna.
   Nunca da de baja plataformas externas y no aplica a clientes reales. */
(()=>{
 "use strict";
 if(window.GOXION_ADMIN_LEGAL_PILOT)return;
 const core=window.GOXION_CORE,endpoint=core?.endpoint?.("admin-operaciones"),
   tokenKey=core?.STORAGE?.ADMIN_TOKEN;
 let busy=false,lastCheck=0,currentToken="";
 function n(tag,cls,value){
   const e=document.createElement(tag);if(cls)e.className=cls;
   if(value!==undefined)e.textContent=String(value);return e;
 }
 function locate(){
   const ops=document.getElementById("tab-operaciones"),home=document.getElementById("tab-resumen");
   if(!ops||!home)return null;
   let panel=document.getElementById("gx-legal-admin-alert");
   if(!panel){
     panel=n("section");panel.id="gx-legal-admin-alert";panel.hidden=true;
     panel.setAttribute("aria-label","Baja por rechazo de términos pendiente");
     const alert=document.getElementById("gx-extension-red-alerts");
     if(alert)alert.insertAdjacentElement("afterend",panel);
     else ops.prepend(panel);
   }
   let homeBtn=document.getElementById("gx-legal-admin-home");
   if(!homeBtn){
     homeBtn=n("button","","Rechazo de términos · revisar baja");
     homeBtn.id="gx-legal-admin-home";homeBtn.type="button";homeBtn.hidden=true;
     homeBtn.addEventListener("click",()=>{
       window.goAdminTab?.("tab-operaciones");
       panel.scrollIntoView({behavior:"smooth",block:"center"});
     });
     const priority=home.querySelector(".gx-home-priority-grid");
     if(priority)priority.insertAdjacentElement("afterend",homeBtn);
     else home.prepend(homeBtn);
   }
   return {panel,homeBtn};
 }
 async function call(action,datos={}){
   const token=localStorage.getItem(tokenKey)||"";
   if(!token||!endpoint)throw Error("Sesión de Admin requerida");
   const res=await fetch(endpoint,{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Admin-Token":token},
     body:JSON.stringify({accion:action,datos})});
   const data=await res.json().catch(()=>({}));
   if(token!==localStorage.getItem(tokenKey))throw Error("La sesión ha cambiado");
   if(!res.ok||data.ok!==true)throw Error(data.error||"Operación no disponible");
   return data;
 }
 function render(data){
   const el=locate();if(!el)return;
   const {panel,homeBtn}=el;
   panel.replaceChildren();
   const status=data?.estado||{};
   if(!data?.pendiente||status.fase!=="restringido"||data.baja_confirmada){
     panel.hidden=true;homeBtn.hidden=true;return;
   }
   panel.hidden=false;homeBtn.hidden=false;
   const h=n("div","gx-legal-admin-head");
   h.append(n("strong","","Cliente Prueba · baja pendiente"));
   const refresh=n("button","","Actualizar");refresh.type="button";
   refresh.addEventListener("click",()=>void load(true));h.append(refresh);panel.append(h);
   panel.append(n("p","gx-legal-admin-copy",
     "Rechazó los Términos 2.0 y concluyó su última cobertura pagada ("+
     (status.ultima_cobertura||"sin fecha vigente")+"). Sus accesos aún se administran manualmente."));
   const ul=n("ul","gx-legal-admin-items");
   for(const item of status.servicios||[])ul.append(n("li","",item.nombre+" · hasta "+(item.cobertura_hasta||"por revisar")));
   panel.append(ul);
   const actions=n("div","gx-legal-admin-controls");
   const open=n("button","gx-legal-admin-no","Ver ficha");
   open.type="button";open.addEventListener("click",()=>{
     window.goAdminTab?.("tab-clientes");
     const dict=typeof clientesDict==="undefined"?{}:clientesDict;
     const key=Object.entries(dict).find(([,v])=>String(v?._id||v?.id)==="091e79b7-c60b-4d50-bb98-a047bfc0dbb4")?.[0];
     if(key&&window.gxOpenClientFocus)window.gxOpenClientFocus(key);
   });actions.append(open);
   const button=n("button","gx-legal-admin-go","Finalizar servicios en GOXION");
   button.type="button";actions.append(button);panel.append(actions);
   const feedback=n("p","gx-legal-admin-status");feedback.setAttribute("role","status");
   feedback.hidden=true;panel.append(feedback);
   button.addEventListener("click",()=>{
     actions.replaceChildren();
     const cancel=n("button","gx-legal-admin-no","Cancelar");
     const confirm=n("button","gx-legal-admin-yes","Confirmar baja interna");
     cancel.type="button";confirm.type="button";
     cancel.addEventListener("click",()=>render(data));
     confirm.addEventListener("click",async()=>{
       if(busy)return;busy=true;confirm.disabled=true;cancel.disabled=true;
       feedback.hidden=false;feedback.textContent="Verificando periodos y registrando baja…";
       try{
         const result=await call("confirmar_baja_legal",{
           cliente_id:"091e79b7-c60b-4d50-bb98-a047bfc0dbb4",
           confirmacion:"FINALIZAR_SERVICIOS"
         });
         feedback.textContent="Baja interna registrada. Recuerda retirar los accesos externos manualmente.";
       }catch(err){feedback.textContent=String(err?.message||err);confirm.disabled=false;cancel.disabled=false;}
       finally{
         busy=false;
         void load(true);
         window.dispatchEvent(new Event("goxion:admin-refresh"));
       }
     });
     actions.append(cancel,confirm);
   });
 }
 async function load(force=false){
   if(busy)return;
   const els=locate();if(!els||!endpoint||!tokenKey)return;
   const token=localStorage.getItem(tokenKey)||"";
   if(!token){els.panel.hidden=true;els.homeBtn.hidden=true;currentToken="";return;}
   if(!force&&currentToken===token&&Date.now()-lastCheck<60000)return;
   currentToken=token;
   try{
     const data=await call("listar_bajas_legales");
     lastCheck=Date.now();render(data);
   }catch(err){
     els.panel.hidden=false;els.homeBtn.hidden=true;
     els.panel.replaceChildren(n("p","gx-legal-admin-status",
       "No se pudo verificar la baja legal. Actualiza Operaciones para reintentar."));
     console.warn("GOXION · baja legal no verificada",String(err?.message||err).slice(0,130));
   }
 }
 function setup(){
   locate();void load(true);
   setInterval(()=>{if(!document.hidden)void load(false);},60000);
   window.addEventListener("focus",()=>void load(true));
   document.addEventListener("visibilitychange",()=>{if(!document.hidden)void load(true)});
   document.addEventListener("goxion:admin-refresh",()=>void load(true));
 }
 window.GOXION_ADMIN_LEGAL_PILOT=Object.freeze({refresh:()=>load(true)});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
})();
