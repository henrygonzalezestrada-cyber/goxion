(function(){
 "use strict";
 const demo=new URLSearchParams(location.search).get("demo")==="1";
 const core=window.GOXION_CORE;
 const endpoint=core?.endpoint?.("estado-financiero-b2-beta");
 const money=x=>(Number(x||0)/100).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
 const label=iso=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||"")))return "Fecha por confirmar";
   const [y,m,d]=iso.split("-").map(Number);
   return new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d)));
 };
 const plus=(iso,n)=>new Date(Date.parse(iso+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
 let state=null,fetching=false,view=null,activeToken="",confirmKey=null;
 const demoState=()=>({ok:true,modo:"global",puede_solicitar:true,
   fecha_original:"2026-10-15",fecha_maxima:"2026-10-20",fecha_servidor:"2026-10-15",
   acuerdo:null,cargo_id:null,requiere_autorizacion_admin:false});
 const demoQuote=(date)=> {
   const duration=Math.round((Date.parse(date)-Date.parse("2026-10-15"))/86400000);
   return {ok:true,fecha_original:"2026-10-15",fecha_pactada:date,
    importe_pactado_centavos:4606,importe_si_incumple_centavos:4900+
    Math.round(4900*.05*(duration+1)),
    mora_si_incumple_centavos:Math.round(4900*.05*(duration+1)),
    lealtad_en_riesgo_centavos:294,requiere_admin:false};
 };
 async function action(accion,datos={}){
   if(demo){
     if(accion==="mi_prorroga")return demoState();
     if(accion==="cotizar_prorroga_auto")return {ok:true,cotizacion:demoQuote(datos.fecha_pactada)};
     if(accion==="activar_prorroga_auto")return {ok:true,aprobacion:"automatica",estado:"activo",
        acuerdo:{fecha_original:"2026-10-15",fecha_pactada:datos.fecha_pactada}};
   }
   const token=localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   if(!token||!endpoint)throw Error("Ingresa a Mi Espacio para continuar.");
   const r=await fetch(endpoint,{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Client-Token":token},
     body:JSON.stringify({accion,datos})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data.ok)throw Error(data.error||"No fue posible completar la operación.");
   return data;
 }
 function controls(){
   const card=document.getElementById("dash-billing-card");
   const existing=card?.querySelector(".gx-prorroga-entry");
   if(!card||!card.querySelector(".gx-account-capsule"))return;
   if(!state){existing?.remove();return;}
   if(state.acuerdo?.activo){
     existing?.remove();
     const anchor=card.querySelector(".gx-account-capsule");
     let shown=card.querySelector(".gx-prorroga-active");
     if(!shown){shown=document.createElement("div");
       shown.className="gx-prorroga-active";anchor.insertAdjacentElement("afterend",shown);}
     shown.innerHTML='<span class="gx-prorroga-eyebrow">ACUERDO PACTADO</span>'+
       '<strong>'+label(state.acuerdo.fecha_pactada)+'</strong>'+
       '<small>Conservas tu lealtad si pagas dentro del plazo.</small>';
     const dateEl=card.querySelector("#dash-date");
     if(dateEl)dateEl.textContent=label(state.acuerdo.fecha_pactada);
     const badge=card.querySelector("#dash-badge");
     if(badge)badge.innerHTML='<span class="gx-prorroga-state">Prórroga activa · Pago protegido</span>';
     return;
   }
   card.querySelector(".gx-prorroga-active")?.remove();
   if(state.puede_solicitar&&!existing){
     const btn=document.createElement("button");btn.type="button";
     btn.className="gx-prorroga-entry";btn.textContent="¿No puedes realizar tu pago hoy?";
     btn.addEventListener("click",openDialog);
     card.querySelector(".gx-account-capsule").insertAdjacentElement("afterend",btn);
   } else if(!state.puede_solicitar){existing?.remove();}
 }
 async function refresh(){
   if(fetching)return;
   const token=demo?"demo":localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   if(token===activeToken&&state)return;
   if(!token){state=null;activeToken="";controls();return;}
   fetching=true;
   try{state=await action("mi_prorroga");activeToken=token;controls();}
   catch(e){console.warn("GOXION prórroga beta:",e.message);state=null;activeToken="";controls();}
   finally{fetching=false;}
 }
 function renderQuote(dialog,quote){
   dialog.querySelector("[data-gx-protected]").textContent=money(quote.importe_pactado_centavos);
   dialog.querySelector("[data-gx-missed]").textContent=money(quote.importe_si_incumple_centavos);
   dialog.querySelector("[data-gx-mora]").textContent=money(quote.mora_si_incumple_centavos);
   dialog.querySelector("[data-gx-loyalty]").textContent=money(quote.lealtad_en_riesgo_centavos);
   dialog.querySelector("[data-gx-old]").textContent=label(quote.fecha_original);
   dialog.querySelector("[data-gx-new]").textContent=label(quote.fecha_pactada);
 }
 async function openDialog(){
   if(!state?.puede_solicitar)return;
   document.getElementById("gx-prorroga-dialog")?.remove();
   const dialog=document.createElement("dialog");dialog.className="gx-prorroga-dialog";
   dialog.id="gx-prorroga-dialog";dialog.setAttribute("aria-labelledby","gx-prorroga-title");
   const init=plus(state.fecha_original,3);
   dialog.innerHTML='<div class="gx-prorroga-sheet">'+
     '<div class="gx-prorroga-kicker">FLEXIBILIDAD GOXION</div>'+
     '<button class="gx-prorroga-close" type="button" data-gx-close aria-label="Cerrar">×</button>'+
     '<h2 id="gx-prorroga-title">Un poco más de tiempo.</h2>'+
     '<p>Elige cuándo pagar. Mantendrás tu lealtad y evitarás mora si cumples el acuerdo.</p>'+
     '<label class="gx-prorroga-field">Nueva fecha de pago<input type="date" data-gx-day min="'+
       plus(state.fecha_original,1)+'" max="'+state.fecha_maxima+'" value="'+init+'"></label>'+
     '<div class="gx-prorroga-line"><span>Fecha original</span><strong data-gx-old></strong></div>'+
     '<div class="gx-prorroga-line"><span>Acuerdo propuesto</span><strong data-gx-new></strong></div>'+
     '<div class="gx-prorroga-line gx-prorroga-main"><span>Si pagas en la nueva fecha</span><strong data-gx-protected></strong></div>'+
     '<div class="gx-prorroga-risk"><span>Si incumples, al día siguiente deberás</span>'+
       '<strong data-gx-missed></strong>'+
       '<small>Mora retroactiva <b data-gx-mora></b> · Lealtad perdida <b data-gx-loyalty></b></small>'+
     '</div>'+
     '<p class="gx-prorroga-terms-copy">La mora comienza a contarse desde el vencimiento original. Una prórroga por período y máximo cinco días.</p>'+
     '<label class="gx-prorroga-consent"><input type="checkbox" data-gx-accept>'+
       '<span>Comprendo y acepto las condiciones del acuerdo.</span></label>'+
     '<button class="gx-prorroga-activate" type="button" data-gx-activate disabled>Aceptar y pactar fecha</button>'+
     '<div class="gx-prorroga-result" role="status" aria-live="polite"></div></div>';
   document.body.appendChild(dialog);
   const day=dialog.querySelector("[data-gx-day]"),btn=dialog.querySelector("[data-gx-activate]");
   const confirm=dialog.querySelector("[data-gx-accept]"),status=dialog.querySelector(".gx-prorroga-result");
   let quote=null;
   const update=async()=>{
     status.textContent="Calculando importe…";btn.disabled=true;quote=null;
     try{
       const data=await action("cotizar_prorroga_auto",{
         cargo_id:state.cargo_id,fecha_pactada:day.value});
       quote=data.cotizacion;renderQuote(dialog,quote);
       status.textContent="";btn.disabled=!confirm.checked;
     }catch(e){status.textContent=e.message;}
   };
   dialog.querySelector("[data-gx-close]").addEventListener("click",()=>dialog.close());
   dialog.addEventListener("close",()=>{confirmKey=null;dialog.remove();});
   day.addEventListener("change",update);
   confirm.addEventListener("change",()=>btn.disabled=!confirm.checked||!quote);
   btn.addEventListener("click",async()=>{
     if(!quote||!confirm.checked)return;
     btn.disabled=true;status.textContent="Confirmando tu acuerdo…";
     if(!confirmKey)confirmKey=crypto.randomUUID();
     try{
       const result=await action("activar_prorroga_auto",{
        cargo_id:state.cargo_id,fecha_pactada:quote.fecha_pactada,
        clave_idempotencia:confirmKey,acepta_condiciones:true,confirma_importe:true});
       if(result.aprobacion!=="automatica"||result.estado!=="activo")
         throw Error("No pudimos confirmar el acuerdo.");
       state={...state,puede_solicitar:false,acuerdo:{
         activo:true,estado:"activo",fecha_original:quote.fecha_original,
         fecha_pactada:quote.fecha_pactada}};
       controls();status.textContent="Acuerdo activado correctamente.";
       dialog.close();
       document.dispatchEvent(new CustomEvent("goxion:prorroga-activada",{detail:{demo}}));
     }catch(e){status.textContent=e.message;btn.disabled=false;}
   });
   dialog.showModal();
   await update();
 }
 const observer=new MutationObserver(()=>{const el=document.getElementById("dash-billing-card");
   if(el&&el!==view){view=el;activeToken="";refresh();}
   else if(el){controls();}
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);
 else refresh();
 document.addEventListener("visibilitychange",()=>{
   if(!document.hidden){activeToken="";refresh();}
 });
 window.GOXION_PRORROGA_BETA={refresh:()=>{activeToken="";return refresh();},demo};
})();
