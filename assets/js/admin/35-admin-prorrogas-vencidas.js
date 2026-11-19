/* GOXION Admin · Foco rojo por prórrogas incumplidas.
 * Solo lectura: el servidor exige sesión Admin y verifica cargo, contrato,
 * acceso y comprobantes. No retira servicios ni escribe notificaciones.
 */
(function(){
 "use strict";
 var core=window.GOXION_CORE;
 var endpoint=core&&core.endpoint&&core.endpoint("admin-operaciones");
 var running=null,lastToken="",lastCheck=0,latest=[];
 var moneyDate=function(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return "fecha no disponible";
   var parts=s.split("-").map(Number);
   return new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})
     .format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2])));};
 function node(tag,className,content){
   var element=document.createElement(tag);
   if(className)element.className=className;
   if(content!==undefined)element.textContent=String(content);
   return element;
 }
 function locate(){
   var ops=document.getElementById("tab-operaciones");
   var home=document.getElementById("tab-resumen");
   if(!ops||!home)return false;
   if(!document.getElementById("gx-extension-red-alerts")){
     var section=node("section","gx-extension-alerts");
     section.id="gx-extension-red-alerts";section.hidden=true;
     section.setAttribute("aria-label","Prórrogas incumplidas para revisar manualmente");
     var filters=ops.querySelector("#gx-mobile-ops-filters");
     if(filters)ops.insertBefore(section,filters);else ops.append(section);
   }
   if(!document.getElementById("gx-extension-home-flag")){
     var badge=node("button","gx-extension-home-flag");badge.id="gx-extension-home-flag";
     badge.type="button";badge.hidden=true;
     badge.addEventListener("click",function(){
       if(typeof window.goAdminTab==="function")window.goAdminTab("tab-operaciones");
       document.getElementById("gx-extension-red-alerts")?.scrollIntoView({behavior:"smooth",block:"start"});
     });
     var priority=home.querySelector(".gx-home-priority-grid");
     if(priority)priority.insertAdjacentElement("afterend",badge);else home.prepend(badge);
   }
   return true;
 }
 function findClientKey(id){
   if(typeof clientesDict==="undefined")return null;
   for(var pair of Object.entries(clientesDict||{})){
     if(String(pair[1]?._id||pair[1]?.id||"")===String(id))return pair[0];
   }
   return null;
 }
 function goClient(id){
   var key=findClientKey(id);
   if(typeof window.goAdminTab==="function")window.goAdminTab("tab-clientes");
   if(key&&typeof window.gxOpenClientFocus==="function")window.gxOpenClientFocus(key);
   else{
     var search=document.getElementById("search-input");
     if(search){search.focus();search.setAttribute("placeholder","Busca el cliente por su nombre o folio");}
   }
 }
 function render(list){
   if(!locate())return;
   latest=Array.isArray(list)?list:[];
   var urgent=latest.filter(function(c){
     return Array.isArray(c.servicios)&&c.servicios.some(function(s){
       return s.estado==="pendiente_retiro_manual";
     });
   });
   var ops=document.getElementById("gx-extension-red-alerts");
   var home=document.getElementById("gx-extension-home-flag");
   ops.replaceChildren();
   var count=urgent.reduce(function(n,c){
     return n+c.servicios.filter(function(s){return s.estado==="pendiente_retiro_manual";}).length;
   },0);
   var review=latest.reduce(function(n,c){
     return n+c.servicios.filter(function(s){return s.estado==="comprobante_en_revision";}).length;
   },0);
   if(!count&&!review){ops.hidden=true;home.hidden=true;return;}
   ops.hidden=false;home.hidden=!count;
   if(count){
     home.replaceChildren(node("span","gx-extension-red-dot"));
     home.append(node("strong","",String(count)+" acceso"+(count===1?"":"s")+" por revisar · prórroga vencida"));
     home.append(node("span","","Ver en Operaciones"));
   }
   var title=node("div","gx-extension-alerts-head");
   var heading=node("div","");
   heading.append(node("span","gx-extension-eyebrow","ALERTA OPERATIVA"));
   heading.append(node("h2","","Prórrogas incumplidas"));
   heading.append(node("p","","Los accesos permanecen activos hasta que revises y retires manualmente cada servicio."));
   title.append(heading);
   var refresh=node("button","gx-extension-refresh","Actualizar");
   refresh.type="button";refresh.addEventListener("click",function(){void load(true);});
   title.append(refresh);ops.append(title);
   for(var client of latest){
     var services=client.servicios||[];
     var red=services.filter(function(s){return s.estado==="pendiente_retiro_manual";});
     var pending=services.filter(function(s){return s.estado==="comprobante_en_revision";});
     if(!red.length&&!pending.length)continue;
     var card=node("article","gx-extension-alert-card"+(!red.length?" is-review":""));
     var head=node("div","gx-extension-alert-client");
     head.append(node("span",red.length?"gx-extension-red-dot":"gx-extension-amber-dot"));
     var who=node("div","");
     who.append(node("strong","",client.cliente_nombre||"Cliente"));
     if(client.folio)who.append(node("small","","Folio "+client.folio));
     head.append(who);
     var button=node("button","gx-extension-open-client","Revisar ficha");
     button.type="button";
     button.addEventListener("click",function(id){return function(){goClient(id);};}(client.cliente_id));
     head.append(button);card.append(head);
     if(red.length)card.append(node("p","gx-extension-critical",
       "Foco rojo: terminó la prórroga y no hay pago acreditado. Revisa para retirar manualmente estos servicios:"));
     var listEl=node("ul","gx-extension-services");
     services.forEach(function(service){
       var item=node("li",service.estado==="comprobante_en_revision"?"is-review":"");
       item.append(node("strong","",service.nombre+
         (Number(service.ordinal)>1?" · perfil "+service.ordinal:"")));
       item.append(node("span","",service.estado==="comprobante_en_revision"?
         "Comprobante pendiente de validar · no retirar todavía":
         "Fecha pactada: "+moneyDate(service.fecha_pactada)+" · retiro manual pendiente"));
       listEl.append(item);
     });
     card.append(listEl);
     ops.append(card);
   }
   if(!count&&review)ops.append(node("p","gx-extension-note",
     "Los reportes pendientes deben conciliarse antes de considerar un retiro."));
 }
 function showError(){
   if(!locate())return;
   var ops=document.getElementById("gx-extension-red-alerts"),home=document.getElementById("gx-extension-home-flag");
   // No mostrar datos previos ni el falso estado de cero ante errores de red.
   home.hidden=true;ops.hidden=false;ops.replaceChildren(node("p","gx-extension-error",
     "No se pudo comprobar el estado de las prórrogas. Actualiza la página o inténtalo nuevamente."));
   var btn=node("button","gx-extension-refresh","Reintentar");btn.type="button";
   btn.addEventListener("click",function(){void load(true);});ops.append(btn);
 }
 async function load(force){
   if(!endpoint||!core?.STORAGE?.ADMIN_TOKEN)return;
   var token=localStorage.getItem(core.STORAGE.ADMIN_TOKEN)||"";
   if(!token){
     if(locate()){
       document.getElementById("gx-extension-red-alerts").hidden=true;
       document.getElementById("gx-extension-home-flag").hidden=true;
     }
     lastToken="";return;
   }
   if(running)return running;
   if(!force&&lastToken===token&&Date.now()-lastCheck<60000)return;
   lastToken=token;
   running=(async function(){
     try{
       var response=await fetch(endpoint,{method:"POST",cache:"no-store",
         headers:{"Content-Type":"application/json","X-Admin-Token":token},
         body:JSON.stringify({accion:"listar_prorrogas_incumplidas",datos:{}})});
       var data=await response.json().catch(function(){return {};});
       if(!response.ok||data.ok!==true||!Array.isArray(data.clientes))
         throw new Error(data.error||"Consulta no verificada");
       lastCheck=Date.now();
       // Cierre de sesión/cambio de usuario: no publicar datos de un token antiguo.
       if(localStorage.getItem(core.STORAGE.ADMIN_TOKEN)!==token)return;
       render(data.clientes);
     }catch(error){
       if(localStorage.getItem(core.STORAGE.ADMIN_TOKEN)===token)showError();
       console.warn("GOXION Admin · prórrogas vencidas no verificadas",String(error?.message||error).slice(0,160));
     }finally{running=null;}
   })();
   return running;
 }
 function setup(){
   // Refrescar de inmediato al completar login o reconstruir clientes.
   var prev=window.renderizarClientes;
   if(typeof prev==="function"){
     window.renderizarClientes=function(){
       var result=prev.apply(this,arguments);
       queueMicrotask(function(){void load(true);});
       return result;
     };
   }
   locate();void load(true);
   setInterval(function(){if(!document.hidden)void load(false);},60000);
   window.addEventListener("focus",function(){void load(true);});
   document.addEventListener("visibilitychange",function(){if(!document.hidden)void load(true);});
   document.addEventListener("goxion:admin-refresh",function(){void load(true);});
 }
 window.GOXION_ADMIN_PRORROGAS_ALERTA={refresh:function(){return load(true);}};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
 else setup();
})();