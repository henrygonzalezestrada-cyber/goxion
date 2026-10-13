(function(){
 "use strict";
 const store=window.GOXION_B2_PREVIEW;
 if(!store)return;
 const money=n=>(Number(n||0)/100).toLocaleString("es-MX",
   {style:"currency",currency:"MXN"});
 const date=s=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return "Por confirmar";
  const [y,m,d]=s.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"short",
   timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d)));
 };
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let mode="proximo",selected=null,expanded=false,lastAnchor=null;
 let installed=false;
 function rows(){
  return Array.isArray(store.quote?.cargos)?store.quote.cargos.map((x,i)=>({
   cargo_id:String(x.cargo_id||""),
   vence:String(x.vence||""),
   servicio:String(x.servicio||"Servicio contratado"),
   ordinal:Number(x.ordinal||i+1),
   total_centavos:Number(x.total_centavos||0),
   principal_centavos:Number(x.principal_centavos||0),
   base_centavos:Number(x.base_centavos||0),
   descuento_centavos:Number(x.descuento_centavos||0),
   mora_centavos:Number(x.mora_centavos||0),
   abono_pagado_centavos:Number(x.abono_pagado_centavos||0),
   fecha_pactada:String(x.fecha_pactada||""),
   prorroga_estado:String(x.prorroga_estado||""),
   pagado:x.pagado===true
  })).sort((a,b)=>a.vence.localeCompare(b.vence)): [];
 }
 function pending(){return rows().filter(x=>!x.pagado&&x.total_centavos>0)}
 function choice(){
  const list=pending();
  if(!list.length)return {cargos:[],centavos:0};
  const picked=list.find(x=>x.cargo_id===selected)||list[0];
  if(mode==="todo")return {cargos:list,centavos:list.reduce((s,x)=>s+x.total_centavos,0)};
  return {cargos:[picked],centavos:picked.total_centavos};
 }
 function title(row){return row.servicio+" · Perfil "+row.ordinal}
 function status(row){
  if(row.pagado)return "Liquidado";
  if(row.mora_centavos>0)return "Mora "+money(row.mora_centavos);
  if(row.prorroga_estado==="aprobada")
    return "Prórroga "+date(row.fecha_pactada)+(row.mora_centavos>0?" · incumplida":" · protegida");
  if(row.abono_pagado_centavos>0)return "Abonado "+money(row.abono_pagado_centavos);
  return "Lealtad "+(row.descuento_centavos>0?"aplicada":"sin descuento");
 }
 function updateServiceMarker(){
  const items=Array.from(document.querySelectorAll(".services-container .service-item"));
  for(const item of items)item.querySelector(".gx-b2-service-flag")?.remove();
  const due=pending()[0];
  if(!due)return;
  const normal=x=>String(x||"").toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const target=normal(due.servicio);
  if(!target || target==="servicio contratado")return;
  // Sólo identificar si hay coincidencia inequívoca con el contrato activo.
  const matches=items.filter(item=>normal(item.querySelector(".service-name")?.textContent)
    .includes(target));
  if(matches.length!==1)return;
  const label=document.createElement("small");
  label.className="gx-b2-service-flag";
  label.textContent=due.mora_centavos>0?
    "VENCIDO · Perfil "+due.ordinal:"PRÓXIMO A VENCER · Perfil "+due.ordinal+" · "+date(due.vence);
  label.classList.toggle("is-late",due.mora_centavos>0);
  matches[0].querySelector(".service-name")?.appendChild(label);
 }
 function updateHeader(){
  const quote=store.quote;
  if(!quote)return;
  const due=pending()[0];
  const total=Number(quote.total_pendiente_centavos||0);
  const label=document.querySelector(".balance-hero .total-label");
  const amount=document.querySelector(".balance-hero .total-amount");
  const badge=document.querySelector(".balance-hero .time-badge");
  if(label)label.textContent="Saldo total por vencimientos";
  if(amount)amount.textContent=money(total);
  if(badge){
   badge.textContent=due?(due.mora_centavos>0?"Servicio vencido · "+date(due.vence):"Próximo pago · "+date(due.vence)):"Servicios al corriente";
   badge.className="time-badge "+(due?.mora_centavos>0?"badge-overdue":due?"badge-ok":"badge-paid");
  }
  const period=document.querySelector(".card-info .info-block.full .value");
  if(period)period.textContent="Fechas de pago por servicio";
  const globalBreakdown=document.querySelector(".breakdown-box");
  if(globalBreakdown)globalBreakdown.style.display="none";
  const oldOverdue=document.querySelector(".overdue-incentive-box");
  if(oldOverdue)oldOverdue.style.display="none";
  const loyalty=document.querySelector(".loyalty-badge .loyalty-desc");
  if(loyalty)loyalty.textContent=quote.lealtad_global_perdida?
   "Lealtad perdida por un vencimiento incumplido. Los pagos aprobados se conservan.":
   "Beneficio aplicado por perfil. La racha avanza al pagar todas las fechas puntualmente.";
 }
 function content(){
  const list=rows(),due=pending()[0];
  const first=due?money(due.total_centavos):"Al corriente";
  const label=due?(due.prorroga_estado==="aprobada"&&due.mora_centavos===0?
    "Prórroga hasta "+date(due.fecha_pactada):"Vence "+date(due.vence)):
    "Sin pagos pendientes";
  const chosen=choice();
  const scenario=store.demo?'<div class="gx-b2-scenario" role="group" aria-label="Casos de prueba">'+
   '<span>CAMBIAR ESCENARIO DE DEMOSTRACIÓN</span>'+
   [["puntual","Normal"],["prorroga","Prórroga vigente"],["prorroga-incumplida","Incumplida"],["vencido","Con mora"],["primero-pagado","1 pagado"]]
    .map(pair=>'<button type="button" data-b2-scenario="'+pair[0]+'" aria-pressed="'+(store.scenario===pair[0])+'">'+pair[1]+'</button>').join("")+
   '</div>':"";
  return '<button class="gx-b2-toggle" id="b2-toggle" type="button" aria-expanded="'+expanded+'" aria-controls="b2-body">'+
     '<span class="gx-b2-head"><span class="gx-b2-head-copy"><span class="gx-b2-caption">CALENDARIO DE PAGOS</span>'+
       '<strong>'+esc(label)+'</strong></span></span>'+
      '<span class="gx-b2-head-amount">'+first+' <span class="gx-b2-chevron" aria-hidden="true">⌄</span></span></button>'+
    '<div class="gx-b2-reveal" id="b2-body" aria-hidden="'+(!expanded)+'" '+(expanded?'':'inert')+'><div class="gx-b2-clip"><div class="gx-b2-content">'+
     '<div class="gx-b2-divider"></div>'+
     list.map(x=>{
      const checked=(mode==="todo"&&!x.pagado)||
        x.cargo_id===(selected||due?.cargo_id);
      const next=x.cargo_id===due?.cargo_id&&!x.pagado;
      const late=x.mora_centavos>0;
      return '<button class="gx-b2-row '+(checked?'is-active ':'')+
       (x.pagado?'is-done ':'')+(late?'is-late ':'')+(next?'is-next':'')+
       '" type="button" data-b2-cargo="'+esc(x.cargo_id)+'" '+(x.pagado?'disabled':'')+'>'+
       '<span class="gx-b2-row-main"><span class="gx-b2-row-title">'+esc(title(x))+
       '</span><span class="gx-b2-row-meta">'+
       (next?'<span class="gx-b2-next-tag">'+(late?'VENCIDO':'PRÓXIMO')+'</span>':'')+
       esc(date(x.vence))+' · '+esc(status(x))+'</span></span>'+
       '<span class="gx-b2-row-side"><strong>'+money(x.total_centavos)+'</strong><small>'+
         (x.pagado?'Pagado':checked?'Seleccionado':'Pendiente')+'</small></span></button>'
     }).join("")+
     '<div class="gx-b2-group" role="group" aria-label="Forma de pago">'+
       [["proximo","Próximo vencimiento"],["todo","Todo junto"]]
       .map(pair=>'<button type="button" class="gx-b2-choice" data-b2-mode="'+pair[0]+'" aria-pressed="'+(mode===pair[0])+'">'+pair[1]+'</button>').join("")+
     '</div>'+
     '<div class="gx-b2-summary"><span>Importe seleccionado</span><strong id="b2-selected-total">'+money(chosen.centavos)+'</strong></div>'+
     '<p class="gx-b2-foot">El reporte de pago se acredita únicamente después de la revisión de Admin.</p>'+
     (due?.prorroga_estado==="aprobada"?
       '<p class="gx-b2-foot gx-b2-prorrogated">Acuerdo pactado hasta el '+
         esc(date(due.fecha_pactada))+
         '. Mantendrás tu lealtad si cumples en esa fecha.</p>':"")+
     (store.quote?.lealtad_global_perdida?
        '<p class="gx-b2-note">La lealtad se perdió por una fecha incumplida. La mora corresponde solo al servicio vencido.</p>':"")+
     scenario+'</div></div></div>';
 }
 function render(){
  const anchor=document.querySelector(".services-container");
  if(!anchor||!store.quote?.ok||!Array.isArray(store.quote.cargos))return;
  let card=document.getElementById("b2-calendar");
  if(!card){
   card=document.createElement("section");
   card.id="b2-calendar";
   card.className="glass-card gx-b2-card";
   card.setAttribute("aria-label","Calendario de pagos por servicio");
   anchor.insertAdjacentElement("afterend",card);
  }
  card.classList.toggle("is-open",expanded);
  card.innerHTML=content();
  card.querySelector("#b2-toggle").addEventListener("click",()=>{
   expanded=!expanded;card.classList.toggle("is-open",expanded);
   card.querySelector("#b2-toggle").setAttribute("aria-expanded",String(expanded));
   card.querySelector("#b2-body").setAttribute("aria-hidden",String(!expanded));
   card.querySelector("#b2-body").toggleAttribute("inert",!expanded);
  });
  card.querySelectorAll("[data-b2-cargo]").forEach(button=>button.addEventListener("click",()=>{
   selected=button.dataset.b2Cargo;mode="proximo";render();
  }));
  card.querySelectorAll("[data-b2-mode]").forEach(button=>button.addEventListener("click",()=>{
   mode=button.dataset.b2Mode;render();
  }));
  card.querySelectorAll("[data-b2-scenario]").forEach(button=>button.addEventListener("click",()=>{
   selected=null;mode="proximo";store.makeDemo(button.dataset.b2Scenario);
  }));
  updateHeader();
  updateServiceMarker();
 }
 function installHandlers(){
  if(installed||typeof window.abrirModalPago!=="function")return;
  installed=true;
  const originalModal=window.abrirModalPago;
  const originalBank=window.abrirDatosPago;
  window.abrirModalPago=function(key,period,monto,folio,nombre){
   if(!store.quote)return originalModal.apply(this,arguments);
   const val=choice();
   if(!val.cargos.length||val.centavos<=0){
    window.mostrarToastPago?.("Selecciona un importe válido",true);return;
   }
   store.report={monto_centavos:val.centavos,
     cargo_ids:val.cargos.map(x=>x.cargo_id),
     modo:mode,periodo:store.quote.periodo};
   originalModal.call(this,key,period,(val.centavos/100).toFixed(2),folio,nombre);
   const kicker=document.querySelector(".gx-payment-upload-kicker");
   if(kicker)kicker.textContent="VISTA PREVIA · NO SE ENVIARÁ";
   const heading=document.querySelector(".gx-payment-upload-copy p");
   if(heading)heading.textContent="El comprobante incluiría el vencimiento e importe seleccionados.";
  };
  if(typeof originalBank==="function")window.abrirDatosPago=function(){
   if(store.quote){
    const val=choice();if(val.centavos<=0)return;
    try{pagoActualInfo.monto=(val.centavos/100).toFixed(2)}catch(_){}
   }
   return originalBank.apply(this,arguments);
  };
  window.enviarComprobanteDiscord=function(){
   if(!store.quote)return;
   const val=choice();
   const input=document.getElementById("file-input");
   if(!input?.files?.length){
    window.mostrarToastPago?.("Selecciona una captura de prueba",true);return;
   }
   if(val.centavos<=0)return;
   if(store.demo){
    if(typeof window.gxSetPaymentSubmitState==="function")
     window.gxSetPaymentSubmitState("success");
    else document.getElementById("payment-modal")?.classList.add("is-success");
    window.mostrarToastPago?.("Simulación completada · No se envió ningún pago");
   }else{
    window.mostrarToastPago?.("El envío B2 sigue en validación; no se envió el comprobante",true);
    document.getElementById("payment-modal")?.classList.add("is-error");
   }
  };
 }
 function init(){
  installHandlers();
  if(!store.quote)return;
  const anchor=document.querySelector(".services-container");
  if(anchor && anchor!==lastAnchor){lastAnchor=anchor;render();}
 }
 const observer=new MutationObserver(init);
 observer.observe(document.getElementById("app"),{childList:true,subtree:true});
 window.addEventListener("goxion:b2-quote-change",render);
 init();
})();