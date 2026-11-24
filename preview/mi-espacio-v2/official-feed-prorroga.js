(function(){
 "use strict";
 // Publicación controlada: NO existe modo demo ni se aceptan fixtures.
 const demo=false;
 
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
 async function action(accion,datos={}){
   const token=localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   if(!token||!endpoint)throw Error("Ingresa a Mi Espacio para continuar.");
   const r=await fetch(endpoint,{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Client-Token":token},
     body:JSON.stringify({accion,datos})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data.ok)throw Error(data.error||"No fue posible completar la operación.");
   return data;
 }
 let manualDue=null;
 function controls(){
   const card=document.getElementById("focus");
   const existing=card?.querySelector(".gx-prorroga-entry");
   const capsule=card?.querySelector("#focus-action");
   if(!card||!capsule)return;
   if(!document.body.classList.contains("gx-v2-private-visible")){existing?.remove();return;}
   if(!state){existing?.remove();card.querySelector(".gx-prorroga-active-warning")?.remove();return;}
   if(state.acuerdo?.activo){
     existing?.remove();
     card.querySelector(".gx-prorroga-active")?.remove();
     const dateEl=card.querySelector("#dash-date");
     const agreed=label(state.acuerdo.fecha_pactada);
     const incumplido=state.fecha_servidor>state.acuerdo.fecha_pactada;
     const pronostico=state.acuerdo.pronostico_incumplimiento;
     if(dateEl&&dateEl.textContent!==agreed)dateEl.textContent=agreed;
     const dateTitle=card.querySelector("#dash-date-label");
     const dateCaption=incumplido?"Acuerdo vencido":"Nueva fecha de pago";
     if(dateTitle&&dateTitle.textContent!==dateCaption)
       dateTitle.textContent=dateCaption;
     let warning=card.querySelector(".gx-prorroga-active-warning");
     if(!warning){
       warning=document.createElement("p");
       warning.className="gx-prorroga-active-warning";
       warning.style.cssText="grid-column:1/-1;grid-row:3;font-size:10px;line-height:1.55;opacity:.83;margin:8px 0 0";
       card.append(warning);
     }
     const importe=pronostico&&Number.isSafeInteger(pronostico.total_centavos)?
       " Si no se registra tu pago, el saldo estimado al primer día de incumplimiento será "+
       money(pronostico.total_centavos)+" (incluye "+
       money(pronostico.mora_centavos)+" de mora).":"";
     const warningText=incumplido?
       "La fecha pactada del "+agreed+" ya pasó. Este servicio está sujeto a retiro "+
       "después de verificar los pagos y comprobantes pendientes."+importe:
       "Paga a más tardar el "+agreed+". Si incumples, desde el "+
       label(plus(state.acuerdo.fecha_pactada,1))+
       " este acceso puede retirarse tras verificar pagos y comprobantes."+importe;
     if(warning.textContent!==warningText)warning.textContent=warningText;
     const badge=card.querySelector("#dash-badge");
     const badgeMarkup=incumplido?
       '<div class="time-badge gx-prorroga-state">⚠️ Acuerdo vencido</div>':
       '<div class="time-badge badge-ok gx-prorroga-state">🤝 Acuerdo pactado</div>';
     if(badge&&badge.innerHTML!==badgeMarkup)badge.innerHTML=badgeMarkup;
     return;
   }
   card.querySelector(".gx-prorroga-active")?.remove();
   card.querySelector(".gx-prorroga-active-warning")?.remove();
   const automatic=state.puede_solicitar===true;
   // Los días 1-3 son elegibles desde el backend; la revisión queda como contingencia.
   const review=!automatic&&!state.acuerdo&&
     /^\d{4}-\d{2}-\d{2}$/.test(String(manualDue||""))&&
     manualDue<state.fecha_servidor&&state.fecha_servidor<=plus(manualDue,3);
   if(!automatic&&!review){existing?.remove();return;}
   const btn=existing||document.createElement("button");
   btn.type="button";
   btn.className="gx-prorroga-entry";
   const caption=automatic?"¿No puedes realizar tu pago hoy?":"Solicitar prórroga de pago";
   if(btn.textContent!==caption)btn.textContent=caption;
   btn.onclick=review?openReviewDialog:openDialog;
   if(!existing){btn.style.cssText="flex:1 1 auto;min-width:0;width:auto;margin:0;font-size:10px;line-height:1.3;white-space:normal;padding:8px 10px";capsule.insertAdjacentElement("beforebegin",btn);}
 }
 async function openReviewDialog(){
   if(!state||!manualDue||!state.fecha_servidor||
     manualDue>=state.fecha_servidor||state.fecha_servidor>plus(manualDue,3)||state.acuerdo)return;
   document.getElementById("gx-prorroga-dialog")?.remove();
   const dialog=document.createElement("dialog");
   dialog.className="gx-prorroga-dialog";
   dialog.id="gx-prorroga-dialog";
   dialog.setAttribute("aria-labelledby","gx-prorroga-title");
   dialog.tabIndex=-1;
   const first=plus(state.fecha_servidor,1);
   const last=plus(manualDue,10);
   dialog.innerHTML='<div class="gx-prorroga-sheet">'+
     '<div class="gx-prorroga-kicker">SOLICITUD DE PRÓRROGA</div>'+
     '<button class="gx-prorroga-close" type="button" data-gx-close aria-label="Cerrar">'+
       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>'+
     '<h2 id="gx-prorroga-title">Propón una nueva fecha de pago.</h2>'+
     '<p>Tu pago ya venció. Puedes solicitar revisión hasta el tercer día de atraso. La fecha máxima es diez días después del vencimiento original y requiere autorización.</p>'+
     '<div class="gx-prorroga-line"><span>Fecha de vencimiento</span><strong data-gx-old></strong></div>'+
     '<label class="gx-prorroga-field"><span>¿Cuándo podrías pagar?</span>'+
       '<input type="date" data-gx-day required min="'+first+'" max="'+last+'" value="'+first+'"></label>'+
     '<label class="gx-prorroga-field"><span>Motivo (opcional)</span>'+
       '<input type="text" data-gx-reason maxlength="180" placeholder="Cuéntanos brevemente qué pasó"></label>'+
     '<p class="gx-prorroga-terms-copy">Enviar la solicitud no modifica el vencimiento, los recargos ni el estado de tu servicio. Te avisaremos si la prórroga es autorizada.</p>'+
     '<button class="gx-prorroga-activate" type="button" data-gx-submit>Enviar solicitud para revisión</button>'+
     '<div class="gx-prorroga-result" role="status" aria-live="polite"></div></div>';
   document.body.appendChild(dialog);
   dialog.querySelector("[data-gx-old]").textContent=label(manualDue);
   const day=dialog.querySelector("[data-gx-day]");
   const reason=dialog.querySelector("[data-gx-reason]");
   const btn=dialog.querySelector("[data-gx-submit]");
   const result=dialog.querySelector(".gx-prorroga-result");
   dialog.querySelector("[data-gx-close]").addEventListener("click",()=>dialog.close());
   dialog.addEventListener("close",()=>{releaseScroll?.();dialog.remove()});
   btn.addEventListener("click",async()=>{
     const chosen=String(day.value||"");
     const parsed=new Date(chosen+"T00:00:00Z");
     if(!/^\d{4}-\d{2}-\d{2}$/.test(chosen)||
       !Number.isFinite(parsed.getTime())||
       parsed.toISOString().slice(0,10)!==chosen||chosen<=state.fecha_servidor||
       chosen>plus(manualDue,10)||state.fecha_servidor>plus(manualDue,3)){
       result.textContent="Selecciona una fecha futura, como máximo diez días después del vencimiento original.";return;
     }
     if(typeof window.notificarAdmin!=="function"){
       result.textContent="No fue posible conectar con Soporte. Inténtalo nuevamente.";return;
     }
     btn.disabled=true;
     result.textContent="Enviando tu solicitud…";
     const motivo=String(reason.value||"").replace(/[<>\r\n]/g," ").trim().slice(0,180);
     const mensaje="El cliente solicita revisión de una prórroga de pago (dentro de los tres días posteriores al vencimiento).\n"+
       "Vencimiento original: "+manualDue+"\n"+
       "Nueva fecha propuesta: "+chosen+"\n"+
       "Motivo: "+(motivo||"No indicado")+"\n"+
       "Pendiente de autorización. NO modificar pagos ni vencimientos automáticamente.";
     try{
       await window.notificarAdmin("soporte","📅 Prórroga de pago · Por revisar",
         mensaje,"00f2fe","PRORROGA-"+manualDue);
       btn.textContent="Solicitud enviada";
       result.textContent="Recibimos tu solicitud. Revisaremos la fecha propuesta y te confirmaremos si fue autorizada.";
     }catch(error){
       btn.disabled=false;
       result.textContent="No se pudo registrar la solicitud. Inténtalo nuevamente o comunícate con Soporte.";
     }
   });
   const unlock=lockBehindDialog(dialog);
   try{dialog.showModal();dialog.focus({preventScroll:true})}
   catch(error){unlock();dialog.remove();throw error}
 }
 async function refresh(){
   if(fetching)return;
   const token=demo?"demo":localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   if(token===activeToken&&state)return;
   if(!token){state=null;manualDue=null;activeToken="";controls();return;}
   fetching=true;
   try{
     const current=await action("mi_prorroga");
     let overdue=null;
     if(!current.acuerdo&&current.modo==="global"&&
       /^\d{4}-\d{2}-\d{2}$/.test(String(current.fecha_original||""))&&
       current.fecha_original<current.fecha_servidor)
       overdue=current.fecha_original;
     if(!current.acuerdo&&current.modo==="b2_multifecha"&&
       current.puede_solicitar!==true){
       // No inferir B2 de la fecha global: leer obligaciones verificadas.
       try{
         const details=await action("mi_estado");
         const quote=details.calendario_financiero;
         if(details.modo==="b2_multifecha"&&quote?.cobrable===true&&
           quote?.comprobante_en_revision!==true&&Array.isArray(quote.cargos)){
           const late=quote.cargos.filter(row=>row.pagado!==true&&
             Number(row.total_centavos)>0&&
             /^\d{4}-\d{2}-\d{2}$/.test(String(row.vence||""))&&
             row.vence<current.fecha_servidor&&
             !(row.prorroga_estado==="aprobada"&&
               row.fecha_pactada>=current.fecha_servidor))
             .sort((a,b)=>String(a.vence).localeCompare(String(b.vence)));
           overdue=late[0]?.vence||null;
         }
       }catch(error){
         console.warn("GOXION: no se confirmó vencimiento B2",String(error).slice(0,120));
       }
     }
     if(token!==localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||""))return;
     state=current;
     manualDue=overdue;
     activeToken=token;
     controls();
   }catch(error){
     console.warn("GOXION prórroga:",error.message);
     state=null;manualDue=null;activeToken="";controls();
   }finally{fetching=false;}
 }
 function renderQuote(dialog,quote){
   dialog.querySelector("[data-gx-protected]").textContent=money(quote.importe_pactado_centavos);
   dialog.querySelector("[data-gx-missed]").textContent=money(quote.importe_si_incumple_centavos);
   dialog.querySelector("[data-gx-mora]").textContent=money(quote.mora_si_incumple_centavos);
   dialog.querySelector("[data-gx-loyalty]").textContent=money(quote.lealtad_en_riesgo_centavos);
   dialog.querySelector("[data-gx-old]").textContent=label(quote.fecha_original);
   dialog.querySelector("[data-gx-new]").textContent=label(quote.fecha_pactada);
   dialog.querySelector("[data-gx-agreed-day]").textContent=label(quote.fecha_pactada);
   dialog.querySelector("[data-gx-next-day]").textContent=label(plus(quote.fecha_pactada,1));
 }
 async function openDialog(){
   if(!state?.puede_solicitar)return;
   document.getElementById("gx-prorroga-dialog")?.remove();
   const dialog=document.createElement("dialog");dialog.className="gx-prorroga-dialog";
   dialog.id="gx-prorroga-dialog";dialog.setAttribute("aria-labelledby","gx-prorroga-title");
   dialog.tabIndex=-1;
   const minAvailable=state.fecha_servidor>state.fecha_original?
     plus(state.fecha_servidor,1):plus(state.fecha_original,1);
   const init=minAvailable;
   dialog.innerHTML='<div class="gx-prorroga-sheet">'+
     '<div class="gx-prorroga-kicker">FLEXIBILIDAD GOXION</div>'+
     '<button class="gx-prorroga-close" type="button" data-gx-close aria-label="Cerrar">'+
       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>'+
     '<h2 id="gx-prorroga-title">Un poco más de tiempo.</h2>'+
     '<p>Elige cuándo pagar. No habrá mora si cumples el acuerdo, pero la prórroga interrumpe tu racha y el descuento de lealtad.</p>'+
     '<label class="gx-prorroga-field"><span>Nueva fecha de pago</span><input type="date" data-gx-day min="'+
       minAvailable+'" max="'+state.fecha_maxima+'" value="'+init+'" aria-describedby="gx-prorroga-date-error"></label>'+
     '<span id="gx-prorroga-date-error" class="gx-prorroga-date-error" role="alert" aria-live="polite" hidden></span>'+
     '<div class="gx-prorroga-line"><span>Fecha original</span><strong data-gx-old></strong></div>'+
     '<div class="gx-prorroga-line"><span>Acuerdo propuesto</span><strong data-gx-new></strong></div>'+
     '<div class="gx-prorroga-line gx-prorroga-main"><span>Si pagas en la nueva fecha</span><strong data-gx-protected></strong></div>'+
     '<div class="gx-prorroga-risk"><span class="gx-prorroga-risk-title">Si incumples el acuerdo, tu saldo estimado al día siguiente será</span>'+
       '<strong class="gx-prorroga-risk-total" data-gx-missed></strong>'+
       '<div class="gx-prorroga-risk-details" aria-label="Desglose del incumplimiento">'+
         '<div><span>Mora retroactiva</span><b data-gx-mora></b></div>'+
         '<div><span>Descuento de lealtad retirado (ya incluido)</span><b data-gx-loyalty></b></div>'+
       '</div>'+
     '</div>'+
     '<p class="gx-prorroga-terms-copy"><strong>Aviso importante:</strong> Si el pago no queda acreditado el <strong data-gx-agreed-day></strong>, a partir del <strong data-gx-next-day></strong> el acceso de este servicio podrá retirarse, previa verificación de comprobantes y pagos pendientes. Para recuperarlo deberás cubrir el saldo vencido y la mora aplicable (sin cargo administrativo adicional). El descuento de lealtad se pierde desde que aceptas la prórroga.</p>'+
     '<label class="gx-prorroga-consent"><input type="checkbox" data-gx-accept>'+
       '<span>Comprendo y acepto las condiciones del acuerdo.</span></label>'+
     '<button class="gx-prorroga-activate" type="button" data-gx-activate disabled>Aceptar y pactar fecha</button>'+
     '<div class="gx-prorroga-result" role="status" aria-live="polite"></div></div>';
   document.body.appendChild(dialog);
   const day=dialog.querySelector("[data-gx-day]"),btn=dialog.querySelector("[data-gx-activate]");
   const confirm=dialog.querySelector("[data-gx-accept]"),status=dialog.querySelector(".gx-prorroga-result");
   let quote=null,requestSerial=0;
   const dateError=dialog.querySelector("#gx-prorroga-date-error");
   const minDate=minAvailable;
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
         " y el "+label(maxDate)+". El límite es de 10 días desde el vencimiento original.");
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
       activeToken="";
       refresh().catch(e=>console.warn("Actualización de prórroga:",String(e).slice(0,100)));
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
 const observer=new MutationObserver(()=>{const el=document.getElementById("focus");
   if(el&&el!==view){view=el;activeToken="";refresh();}
   else if(el){controls();}
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);
 else refresh();
 document.addEventListener("visibilitychange",()=>{
   if(!document.hidden){activeToken="";refresh();}
 });
 window.addEventListener("goxion:client-ready",()=>{activeToken="";void refresh()});
 window.addEventListener("goxion:v2-feed:rendered",()=>{activeToken="";void refresh()});
 window.addEventListener("goxion:client-logout",()=>{state=null;manualDue=null;activeToken="";controls()});
 window.GOXION_PRORROGA={refresh:()=>{activeToken="";return refresh();},demo};
})();
