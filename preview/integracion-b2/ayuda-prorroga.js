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

 // iOS Safari mantiene el documento desplazable detrás de <dialog>.
 // Fijar la página y contener los gestos evita el "rubber band".
 // Se restaura exactamente el scroll al salir, incluido Escape/cierre.
 let releaseScroll=null;
 function lockBehindDialog(dialog){
   if(releaseScroll)releaseScroll();
   const html=document.documentElement,body=document.body;
   const saved={scrollX:window.scrollX,scrollY:window.scrollY,
     htmlOverflow:html.style.overflow,htmlOverscroll:html.style.overscrollBehavior,
     bodyPosition:body.style.position,bodyTop:body.style.top,
     bodyLeft:body.style.left,bodyRight:body.style.right,
     bodyWidth:body.style.width,bodyOverflow:body.style.overflow,
     bodyTouch:body.style.touchAction};
   html.style.overflow="hidden";
   html.style.overscrollBehavior="none";
   body.style.position="fixed";
   body.style.top="-"+saved.scrollY+"px";
   body.style.left="0";
   body.style.right="0";
   body.style.width="100%";
   body.style.overflow="hidden";
   let startY=0;
   const onStart=event=>{
     if(event.touches.length===1)startY=event.touches[0].clientY;
   };
   const onMove=event=>{
     if(event.touches.length!==1)return;
     const target=event.target;
     if(!dialog.contains(target)){event.preventDefault();return}
     // Únicamente el contenido del diálogo puede desplazarse, y solo
     // cuando hay desbordamiento y aún puede avanzar en esa dirección.
     const delta=event.touches[0].clientY-startY;
     let el=target;
     while(el&&el!==dialog.parentElement){
       if(el instanceof Element&&el.scrollHeight>el.clientHeight+1){
         const canUp=delta>0&&el.scrollTop>0;
         const canDown=delta<0&&el.scrollTop+el.clientHeight<el.scrollHeight-1;
         if(canUp||canDown)return;
       }
       if(el===dialog)break;
       el=el.parentElement;
     }
     event.preventDefault();
   };
   document.addEventListener("touchstart",onStart,{passive:true,capture:true});
   document.addEventListener("touchmove",onMove,{passive:false,capture:true});
   let released=false;
   releaseScroll=()=>{
     if(released)return;
     released=true;
     document.removeEventListener("touchstart",onStart,true);
     document.removeEventListener("touchmove",onMove,true);
     html.style.overflow=saved.htmlOverflow;
     html.style.overscrollBehavior=saved.htmlOverscroll;
     body.style.position=saved.bodyPosition;
     body.style.top=saved.bodyTop;
     body.style.left=saved.bodyLeft;
     body.style.right=saved.bodyRight;
     body.style.width=saved.bodyWidth;
     body.style.overflow=saved.bodyOverflow;
     body.style.touchAction=saved.bodyTouch;
     window.scrollTo(saved.scrollX,saved.scrollY);
     releaseScroll=null;
   };
   return releaseScroll;
 }

 let state=null,fetching=false,view=null,activeToken="",confirmKey=null;
 const storageKey="goxion-b2-espejo-pactado";
 const dueDate="2026-11-06";
 const savedAgreement=()=>{
   try{const data=JSON.parse(sessionStorage.getItem(storageKey)||"null");
     return data&&/^2026-11-(0[7-9]|1[01])$/.test(data.fecha_pactada)?
       {...data,activo:true,estado:"activo",fecha_original:dueDate}:null;
   }catch{return null}
 };
 const demoState=()=>({ok:true,modo:"b2_multifecha",
   puede_solicitar:!savedAgreement(),fecha_original:dueDate,
   fecha_maxima:"2026-11-11",fecha_servidor:dueDate,
   acuerdo:savedAgreement(),cargo_id:"b2-demo-1",
   requiere_autorizacion_admin:false});
 const demoQuote=(date)=> {
   const duration=Math.round((Date.parse(date)-Date.parse(dueDate))/86400000);
   if(!Number.isInteger(duration)||duration<1||duration>5)
     throw Error("Selecciona una fecha de hasta cinco días adicionales.");
   const subtotal=4900;
   const mora=Math.round(subtotal*.05*(duration+1));
   return {ok:true,fecha_original:dueDate,fecha_pactada:date,
    importe_pactado_centavos:4606,importe_si_incumple_centavos:subtotal+mora,
    mora_si_incumple_centavos:mora,lealtad_en_riesgo_centavos:294,
    requiere_admin:false};
 };
 async function action(accion,datos={}){
   if(demo){
     if(accion==="mi_prorroga")return demoState();
     if(accion==="cotizar_prorroga_auto")return {ok:true,cotizacion:demoQuote(datos.fecha_pactada)};
     if(accion==="activar_prorroga_auto"){
       if(savedAgreement())throw Error("Ya utilizaste una prórroga en este período.");
       demoQuote(datos.fecha_pactada);
       if(!datos.acepta_condiciones||!datos.confirma_importe)
         throw Error("Acepta las condiciones del acuerdo.");
       sessionStorage.setItem(storageKey,JSON.stringify({
         fecha_original:dueDate,fecha_pactada:datos.fecha_pactada,activo:true
       }));
       return {ok:true,aprobacion:"automatica",estado:"activo",
         acuerdo:savedAgreement()};
     }
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
     // La fecha ya es el elemento protagonista: nunca duplicarla en
     // otro bloque inferior ni repetir las condiciones del diálogo.
     existing?.remove();
     card.querySelector(".gx-prorroga-active")?.remove();
     const dateEl=card.querySelector("#dash-date");
     const agreed=label(state.acuerdo.fecha_pactada);
     if(dateEl&&dateEl.textContent!==agreed)dateEl.textContent=agreed;
     const dateTitle=card.querySelector("#dash-date-label");
     if(dateTitle&&dateTitle.textContent!=="Nueva fecha de pago")
       dateTitle.textContent="Nueva fecha de pago";
     const badge=card.querySelector("#dash-badge");
     const badgeMarkup='<span class="gx-prorroga-state">Acuerdo pactado</span>';
     if(badge&&badge.innerHTML!==badgeMarkup)badge.innerHTML=badgeMarkup;
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
   dialog.tabIndex=-1;
   const init=plus(state.fecha_original,3);
   dialog.innerHTML='<div class="gx-prorroga-sheet">'+
     '<div class="gx-prorroga-kicker">FLEXIBILIDAD GOXION</div>'+
     '<button class="gx-prorroga-close" type="button" data-gx-close aria-label="Cerrar">'+
       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>'+
     '<h2 id="gx-prorroga-title">Un poco más de tiempo.</h2>'+
     '<p>Elige cuándo pagar. Mantendrás tu lealtad y evitarás mora si cumples el acuerdo.</p>'+
     '<label class="gx-prorroga-field">Nueva fecha de pago<input type="date" data-gx-day min="'+
       plus(state.fecha_original,1)+'" max="'+state.fecha_maxima+'" value="'+init+'" aria-describedby="gx-prorroga-date-error"></label>'+
     '<span id="gx-prorroga-date-error" class="gx-prorroga-date-error" role="alert" aria-live="polite" hidden></span>'+
     '<div class="gx-prorroga-line"><span>Fecha original</span><strong data-gx-old></strong></div>'+
     '<div class="gx-prorroga-line"><span>Acuerdo propuesto</span><strong data-gx-new></strong></div>'+
     '<div class="gx-prorroga-line gx-prorroga-main"><span>Si pagas en la nueva fecha</span><strong data-gx-protected></strong></div>'+
     '<div class="gx-prorroga-risk"><span class="gx-prorroga-risk-title">Si incumples, al día siguiente deberás</span>'+
       '<strong class="gx-prorroga-risk-total" data-gx-missed></strong>'+
       '<div class="gx-prorroga-risk-details" aria-label="Desglose del incumplimiento">'+
         '<div><span>Mora retroactiva</span><b data-gx-mora></b></div>'+
         '<div><span>Lealtad perdida</span><b data-gx-loyalty></b></div>'+
       '</div>'+
     '</div>'+
     '<p class="gx-prorroga-terms-copy">La mora comienza a contarse desde el vencimiento original. Una prórroga por período y máximo cinco días.</p>'+
     '<label class="gx-prorroga-consent"><input type="checkbox" data-gx-accept>'+
       '<span>Comprendo y acepto las condiciones del acuerdo.</span></label>'+
     '<button class="gx-prorroga-activate" type="button" data-gx-activate disabled>Aceptar y pactar fecha</button>'+
     '<div class="gx-prorroga-result" role="status" aria-live="polite"></div></div>';
   document.body.appendChild(dialog);
   const day=dialog.querySelector("[data-gx-day]"),btn=dialog.querySelector("[data-gx-activate]");
   const confirm=dialog.querySelector("[data-gx-accept]"),status=dialog.querySelector(".gx-prorroga-result");
   let quote=null,requestSerial=0;
   const dateError=dialog.querySelector("#gx-prorroga-date-error");
   const minDate=plus(state.fecha_original,1);
   const maxDate=state.fecha_maxima;
   const validDate=value=>{
     if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
     const parsed=new Date(value+"T00:00:00Z");
     return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value&&
       value>=minDate&&value<=maxDate;
   };
   const quoteFields=["data-gx-protected","data-gx-missed","data-gx-mora",
     "data-gx-loyalty","data-gx-new"];
   const clearQuote=()=>{
     quoteFields.forEach(name=>{
       const el=dialog.querySelector("["+name+"]");
       if(el)el.textContent="—";
     });
   };
   const showDateError=error=>{
     const invalid=Boolean(error);
     day.classList.toggle("is-invalid",invalid);
     day.setAttribute("aria-invalid",String(invalid));
     dateError.hidden=!invalid;
     dateError.textContent=error||"";
     if(invalid)clearQuote();
   };
   const update=async()=>{
     const thisRequest=++requestSerial;
     btn.disabled=true;quote=null;
     if(!validDate(day.value)){
       status.textContent="";
       showDateError("Elige una fecha entre el "+label(minDate)+
         " y el "+label(maxDate)+". El límite es de 5 días.");
       return;
     }
     showDateError("");
     status.textContent="Calculando importe…";
     try{
       const data=await action("cotizar_prorroga_auto",{
         cargo_id:state.cargo_id,fecha_pactada:day.value});
       if(thisRequest!==requestSerial||!validDate(day.value))return;
       quote=data.cotizacion;
       if(quote.fecha_pactada!==day.value)throw Error("La fecha calculada cambió. Vuelve a elegirla.");
       renderQuote(dialog,quote);
       status.textContent="";btn.disabled=!confirm.checked;
     }catch(e){
       if(thisRequest!==requestSerial)return;
       clearQuote();status.textContent=e.message;
     }
   };
   dialog.querySelector("[data-gx-close]").addEventListener("click",()=>dialog.close());
   dialog.addEventListener("close",()=>{releaseScroll?.();confirmKey=null;dialog.remove();});
   day.addEventListener("input",update);
   day.addEventListener("change",update);
   confirm.addEventListener("change",()=>btn.disabled=!confirm.checked||!quote||!validDate(day.value));
   btn.addEventListener("click",async()=>{
     if(!quote||!confirm.checked||!validDate(day.value)||
       quote.fecha_pactada!==day.value){
       await update();return;
     }
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
   // Montar bloqueo ANTES de abrir el modal para impedir el salto de scroll.
   const unlock=lockBehindDialog(dialog);
   try{
     dialog.showModal();
     // El foco queda en el contenedor sin aro inicial; teclado sí conserva
     // el estilo de :focus-visible en controles al navegar.
     dialog.focus({preventScroll:true});
     await update();
   }catch(e){unlock();dialog.remove();throw e;}
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
