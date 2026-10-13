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
 let mode="proximo",selected=null,partial="20.00",expanded=false,lastAnchor=null;
 let installed=false;
 function rows(){
  return Array.isArray(store.quote?.cargos)?store.quote.cargos.map((x,i)=>({
   cargo_id:String(x.cargo_id||""),
   vence:String(x.vence||""),
   servicio:String(x.servicio||"Servicio contratado"),
   ordinal:Number(x.ordinal||i+1),
   total_centavos:Number(x.total_centavos||0),
   base_centavos:Number(x.base_centavos||0),
   descuento_centavos:Number(x.descuento_centavos||0),
   mora_centavos:Number(x.mora_centavos||0),
   abono_pagado_centavos:Number(x.abono_pagado_centavos||0),
   pagado:x.pagado===true
  })).sort((a,b)=>a.vence.localeCompare(b.vence)): [];
 }
 function pending(){return rows().filter(x=>!x.pagado&&x.total_centavos>0)}
 function choice(){
  const list=pending();
  if(!list.length)return {cargos:[],centavos:0};
  const picked=list.find(x=>x.cargo_id===selected)||list[0];
  if(mode==="todo")return {cargos:list,centavos:list.reduce((s,x)=>s+x.total_centavos,0)};
  if(mode==="abono"){
   const exact=Math.round(Number(partial)*100);
   return {cargos:[picked],centavos:Number.isFinite(exact)&&exact>0?
     Math.min(picked.total_centavos,exact):0};
  }
  return {cargos:[picked],centavos:picked.total_centavos};
 }
 function title(row){return row.servicio+" · Perfil "+row.ordinal}
 function status(row){
  if(row.pagado)return "Liquidado";
  if(row.mora_centavos>0)return "Mora "+money(row.mora_centavos);
  if(row.abono_pagado_centavos>0)return "Abonado "+money(row.abono_pagado_centavos);
  return "Lealtad "+(row.descuento_centavos>0?"aplicada":"sin descuento");
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
   badge.textContent=due?(due.mora_centavos>0?"⚠️ Mora en un servicio":"◷ Próximo: "+date(due.vence)):"✓ Servicios al corriente";
   badge.className="time-badge "+(due?.mora_centavos>0?"badge-overdue":due?"badge-ok":"badge-paid");
  }
  const period=document.querySelector(".card-info .info-block.full .value");
  if(period)period.textContent="Vencimientos independientes · "+(store.quote.periodo||"");
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
  const label=due?"Vence "+date(due.vence):"Sin pagos pendientes";
  const chosen=choice();
  const selectedCharge=chosen.cargos[0];
  const scenario=store.demo?'<div class="gx-b2-scenario" role="group" aria-label="Casos de prueba">'+
   '<span>CAMBIAR ESCENARIO DE DEMOSTRACIÓN</span>'+
   [["puntual","Al corriente"],["vencido","Con mora"],["parcial","Con abono"],["primero-pagado","1 pagado"]]
    .map(pair=>'<button type="button" data-b2-scenario="'+pair[0]+'" aria-pressed="'+(store.scenario===pair[0])+'">'+pair[1]+'</button>').join("")+
   '</div>':"";
  return '<button class="gx-b2-toggle" id="b2-toggle" type="button" aria-expanded="'+expanded+'" aria-controls="b2-body">'+
     '<span class="gx-b2-head"><span class="gx-b2-ico" aria-hidden="true">▦</span>'+
      '<span class="gx-b2-head-copy"><span class="gx-b2-caption">CALENDARIO DE PAGOS</span>'+
       '<strong>'+esc(label)+'</strong></span></span>'+
      '<span class="gx-b2-head-amount">'+first+' <span class="gx-b2-chevron" aria-hidden="true">⌄</span></span></button>'+
    '<div class="gx-b2-reveal" id="b2-body" aria-hidden="'+(!expanded)+'" '+(expanded?'':'inert')+'><div class="gx-b2-clip"><div class="gx-b2-content">'+
     '<div class="gx-b2-divider"></div>'+
     list.map(x=>{
      const checked=x.cargo_id===(selected||due?.cargo_id);
      return '<button class="gx-b2-row '+(checked?'is-active ':'')+
       (x.pagado?'is-done ':'')+(x.mora_centavos>0?'is-late':'')+
       '" type="button" data-b2-cargo="'+esc(x.cargo_id)+'" '+(x.pagado?'disabled':'')+'>'+
       '<span class="gx-b2-mark" aria-hidden="true">'+(x.pagado?'✓':'◷')+'</span>'+
       '<span class="gx-b2-row-main"><span class="gx-b2-row-title">'+esc(title(x))+'</span>'+
       '<span class="gx-b2-row-meta">'+esc(date(x.vence))+' · '+esc(status(x))+'</span></span>'+
       '<span class="gx-b2-row-side"><strong>'+money(x.total_centavos)+'</strong><small>'+
         (x.pagado?'Pagado':checked?'Seleccionado':'Pendiente')+'</small></span></button>'
     }).join("")+
     '<div class="gx-b2-group" role="group" aria-label="Forma de pago">'+
       [["proximo","Próximo"],["todo","Todo junto"],["abono","Abonar"]]
       .map(pair=>'<button type="button" class="gx-b2-choice" data-b2-mode="'+pair[0]+'" aria-pressed="'+(mode===pair[0])+'">'+pair[1]+'</button>').join("")+
     '</div>'+
     (mode==="abono"&&selectedCharge?'<div class="gx-b2-abono">'+
       '<label for="b2-partial">Abono al perfil seleccionado</label>'+
       '<input type="number" id="b2-partial" min="0.01" step="0.01" inputmode="decimal" '+
       'max="'+(selectedCharge.total_centavos/100).toFixed(2)+'" value="'+esc(partial)+'"></div>':"")+
     '<div class="gx-b2-summary"><span>Importe a reportar</span><strong id="b2-selected-total">'+money(chosen.centavos)+'</strong></div>'+
     '<p class="gx-b2-foot">La transferencia se reporta para revisión. Un abono reduce el saldo, pero no acredita automáticamente el servicio.</p>'+
     (store.quote?.lealtad_global_perdida?
        '<p class="gx-b2-note">Se perdió la lealtad de la cuenta por incumplir un vencimiento; la mora pertenece solo al servicio atrasado.</p>':"")+
     scenario+'</div></div></div>';
 }
 function render(){
  const anchor=document.querySelector(".card-info");
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
  const input=card.querySelector("#b2-partial");
  if(input)input.addEventListener("input",()=>{
   partial=input.value;const v=choice();
   card.querySelector("#b2-selected-total").textContent=money(v.centavos);
  });
  card.querySelectorAll("[data-b2-scenario]").forEach(button=>button.addEventListener("click",()=>{
   selected=null;mode="proximo";store.makeDemo(button.dataset.b2Scenario);
  }));
  updateHeader();
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
  const anchor=document.querySelector(".card-info");
  if(anchor && anchor!==lastAnchor){lastAnchor=anchor;render();}
 }
 const observer=new MutationObserver(init);
 observer.observe(document.getElementById("app"),{childList:true,subtree:true});
 window.addEventListener("goxion:b2-quote-change",render);
 init();
})();