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
 let mode="proximo",selected=null,expanded=false,alternativesOpen=false,lastAnchor=null;
 let pactDate="",proposal=null;
 const addDays=(iso,n)=>{
  const time=Date.parse(iso+"T00:00:00Z");
  return Number.isFinite(time)?new Date(time+n*86400000).toISOString().slice(0,10):"";
 };
 const dayDiff=(a,b)=>Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
 const protect=(row,chosen)=>{
  if(!row||!/^\d{4}-\d{2}-\d{2}$/.test(String(chosen||"")))
   return null;
  const delta=dayDiff(row.vence,chosen);
  if(delta<1||delta>5)return null;
  const original=row.total_centavos;
  const subtotal=row.principal_centavos+row.descuento_centavos;
  const mora=Math.min(Math.round(row.base_centavos*.5),
    Math.round(subtotal*Math.min(delta+1,10)*.05));
  return {original,chosen,delta,mora,lealtad:row.descuento_centavos,
    missed:subtotal+mora,access:row};
 };
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
    "VENCIDO · Perfil "+due.ordinal:"PRÓXIMO · Perfil "+due.ordinal+" · "+date(due.vence);
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
  const label=due?(due.prorroga_estado==="aprobada"&&due.mora_centavos===0?
    "Prórroga hasta "+date(due.fecha_pactada):"Vence "+date(due.vence)):
    "Sin pagos pendientes";
  const chosen=choice();
  const selectedCharge=pending().find(x=>x.cargo_id===selected)||due;
  const pactable=Boolean(selectedCharge&&
    !store.quote?.lealtad_global_perdida&&selectedCharge.mora_centavos===0&&
    selectedCharge.prorroga_estado!=="aprobada");
  const firstDate=selectedCharge?addDays(selectedCharge.vence,1):"";
  const lastDate=selectedCharge?addDays(selectedCharge.vence,5):"";
  if(!pactDate||pactDate<firstDate||pactDate>lastDate)
    pactDate=selectedCharge?addDays(selectedCharge.vence,3):"";
  const projection=protect(selectedCharge,pactDate);
  const scenario=store.demo?'<div class="gx-b2-scenario" role="group" aria-label="Casos de prueba">'+
   '<span>CAMBIAR ESCENARIO DE DEMOSTRACIÓN</span>'+
   [["puntual","Normal"],["prorroga","Prórroga vigente"],["prorroga-incumplida","Incumplida"],["vencido","Con mora"],["primero-pagado","1 pagado"]]
    .map(pair=>'<button type="button" data-b2-scenario="'+pair[0]+'" aria-pressed="'+(store.scenario===pair[0])+'">'+pair[1]+'</button>').join("")+
   '</div>':"";
  return '<button class="gx-b2-toggle" id="b2-toggle" type="button" aria-expanded="'+expanded+'" aria-controls="b2-body">'+
     '<span class="gx-b2-head"><span class="gx-b2-ico" aria-hidden="true"></span>'+
      '<span class="gx-b2-head-copy"><span class="gx-b2-caption">CALENDARIO DE PAGOS</span>'+
       '<strong>'+esc(label)+'</strong></span></span>'+
      '<span class="gx-b2-head-amount">'+first+' <span class="gx-b2-chevron" aria-hidden="true">⌄</span></span></button>'+
    '<div class="gx-b2-reveal" id="b2-body" aria-hidden="'+(!expanded)+'" '+(expanded?'':'inert')+'><div class="gx-b2-clip"><div class="gx-b2-content">'+
     '<div class="gx-b2-divider"></div>'+
     list.map(x=>{
      const checked=(mode==="todo"&&!alternativesOpen&&!x.pagado)||
        x.cargo_id===(selected||due?.cargo_id);
      const next=x.cargo_id===due?.cargo_id&&!x.pagado;
      const late=x.mora_centavos>0;
      return '<button class="gx-b2-row '+(checked?'is-active ':'')+
       (x.pagado?'is-done ':'')+(late?'is-late ':'')+(next?'is-next':'')+
       '" type="button" data-b2-cargo="'+esc(x.cargo_id)+'" '+(x.pagado?'disabled':'')+'>'+
       '<span class="gx-b2-mark" aria-hidden="true">'+(x.pagado?'✓':'')+'</span>'+
       '<span class="gx-b2-row-main"><span class="gx-b2-row-title">'+esc(title(x))+
       '</span><span class="gx-b2-row-meta">'+
       (next?'<span class="gx-b2-next-tag">'+(late?'VENCIDO':'PRÓXIMO')+'</span>':'')+
       esc(date(x.vence))+' · '+esc(status(x))+'</span></span>'+
       '<span class="gx-b2-row-side"><strong>'+money(x.total_centavos)+'</strong><small>'+
         (x.pagado?'Pagado':checked?'Seleccionado':'Pendiente')+'</small></span></button>'
     }).join("")+
     '<div class="gx-b2-group" role="group" aria-label="Forma de pago">'+
       [["proximo","Próximo vencimiento"],["todo","Todo junto"]]
       .map(pair=>'<button type="button" class="gx-b2-choice" data-b2-mode="'+pair[0]+'" aria-pressed="'+(mode===pair[0]&&!alternativesOpen)+'">'+pair[1]+'</button>').join("")+
     '</div>'+
     '<div class="gx-b2-summary"><span>Importe seleccionado</span><strong id="b2-selected-total">'+money(chosen.centavos)+'</strong></div>'+
     '<p class="gx-b2-foot">El reporte de pago se acredita únicamente después de la revisión de Admin.</p>'+
     (pending().length?
       (pactable?
        '<button type="button" class="gx-b2-help-toggle" data-b2-alternatives aria-expanded="'+alternativesOpen+
        '" aria-controls="b2-help">¿No puedes pagar en tu fecha? <span aria-hidden="true">Explorar prórroga ↗</span></button>'+
        '<div class="gx-b2-help" id="b2-help" '+(alternativesOpen?'':'hidden')+'>'+
         '<div class="gx-b2-help-title">Solicitar una prórroga</div>'+
         '<p class="gx-b2-foot">Sin pagar hoy: solicita hasta cinco días adicionales y conserva tu lealtad si Admin la aprueba y cumples la nueva fecha.</p>'+
         '<div class="gx-b2-abono"><label for="b2-pact-date">Nueva fecha solicitada</label>'+
          '<input type="date" id="b2-pact-date" min="'+firstDate+'" max="'+lastDate+
          '" value="'+pactDate+'"></div>'+
         '<div class="gx-b2-consequences" aria-live="polite">'+
          '<div><span>Pago hasta la fecha aprobada</span><strong data-b2-on-time>'+
          money(projection?.original||0)+'</strong></div>'+
          '<div class="gx-b2-warning-row"><span>Si incumples: total al día siguiente</span><strong data-b2-missed>'+
          money(projection?.missed||0)+'</strong></div>'+
          '<p class="gx-b2-fineprint" data-b2-explain>Incluye '+money(projection?.mora||0)+
          ' de mora desde el vencimiento original y '+money(projection?.lealtad||0)+
          ' de lealtad perdida.</p>'+
         '</div>'+
         '<p class="gx-b2-foot">La solicitud no cambia tu fecha hasta que Admin la apruebe. Solo una por período; no disponible si ya venciste.</p>'+
         '<button class="gx-b2-request" type="button" data-b2-review>Revisar condiciones</button>'+
         '<a class="gx-b2-help-link" href="./ayuda.html">Consultar Mi Espacio ↗</a>'+
        '</div>':
        '<p class="gx-b2-foot gx-b2-prorrogated">'+
         (selectedCharge?.prorroga_estado==="aprobada"?
          'Tu prórroga está aprobada hasta el '+esc(date(selectedCharge.fecha_pactada))+
          '. Si incumples, la mora se contará desde el vencimiento original y perderás la lealtad.':
          'Este vencimiento ya no admite una prórroga automática. Consulta Mi Espacio para recibir ayuda.')+
        '</p>'):"")+
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
  card.classList.toggle("has-next",pending().length>0);
  card.classList.toggle("is-overdue",Boolean(pending()[0]?.mora_centavos>0));
  card.innerHTML=content();
  card.querySelector("#b2-toggle").addEventListener("click",()=>{
   expanded=!expanded;card.classList.toggle("is-open",expanded);
   card.querySelector("#b2-toggle").setAttribute("aria-expanded",String(expanded));
   card.querySelector("#b2-body").setAttribute("aria-hidden",String(!expanded));
   card.querySelector("#b2-body").toggleAttribute("inert",!expanded);
  });
  card.querySelectorAll("[data-b2-cargo]").forEach(button=>button.addEventListener("click",()=>{
   selected=button.dataset.b2Cargo;pactDate="";mode="proximo";render();
  }));
  card.querySelectorAll("[data-b2-mode]").forEach(button=>button.addEventListener("click",()=>{
   mode=button.dataset.b2Mode;alternativesOpen=false;render();
  }));
  const altBtn=card.querySelector("[data-b2-alternatives]");
  altBtn?.addEventListener("click",()=>{
   alternativesOpen=!alternativesOpen;mode="proximo";render();
  });
  const dateInput=card.querySelector("#b2-pact-date");
  dateInput?.addEventListener("change",()=>{
   pactDate=dateInput.value;render();
  });
  card.querySelector("[data-b2-review]")?.addEventListener("click",()=>{
   const picked=pending().find(x=>x.cargo_id===selected)||pending()[0];
   proposal=protect(picked,pactDate);
   if(!proposal)return;
   confirmProposal();
  });
  card.querySelectorAll("[data-b2-scenario]").forEach(button=>button.addEventListener("click",()=>{
   selected=null;pactDate="";mode="proximo";alternativesOpen=false;store.makeDemo(button.dataset.b2Scenario);
  }));
  updateHeader();
  updateServiceMarker();
 }
 function confirmProposal(){
  if(!proposal)return;
  document.getElementById("gx-b2-confirm")?.remove();
  const dlg=document.createElement("dialog");
  dlg.id="gx-b2-confirm";dlg.className="gx-b2-confirm";
  dlg.setAttribute("aria-labelledby","gx-b2-confirm-title");
  dlg.innerHTML='<div class="gx-b2-confirm-content">'+
    '<div class="gx-b2-dialog-eyebrow">Antes de solicitar</div>'+
    '<h2 id="gx-b2-confirm-title">Tu nueva fecha de pago</h2>'+
    '<p class="gx-b2-confirm-intro">Esta prórroga solo tendrá efecto si GOXION la aprueba.</p>'+
    '<div class="gx-b2-confirm-line"><span>Vencimiento original</span><strong>'+esc(date(proposal.access.vence))+'</strong></div>'+
    '<div class="gx-b2-confirm-line"><span>Fecha solicitada</span><strong>'+esc(date(proposal.chosen))+'</strong></div>'+
    '<div class="gx-b2-confirm-total"><span>Pagando en la nueva fecha</span><strong>'+
        money(proposal.original)+'</strong></div>'+
    '<div class="gx-b2-confirm-alert">'+
      '<span>Si no pagas, desde el día siguiente:</span>'+
      '<strong>'+money(proposal.missed)+'</strong>'+
      '<p>Mora retroactiva '+money(proposal.mora)+
      ' + pérdida de lealtad '+money(proposal.lealtad)+
      '. La mora se cuenta desde el vencimiento original, no desde la fecha pactada.</p>'+
    '</div>'+
    '<label class="gx-b2-terms"><input type="checkbox" id="gx-b2-accept">'+
      '<span>Entiendo que incumplir activa los recargos retroactivos y cancela la lealtad de mi cuenta.</span></label>'+
    '<div class="gx-b2-confirm-actions">'+
      '<button type="button" data-b2-cancel>Regresar</button>'+
      '<button type="button" data-b2-submit disabled>Solicitar prórroga</button>'+
    '</div><div class="gx-b2-confirm-status" aria-live="polite"></div></div>';
  document.body.appendChild(dlg);
  dlg.querySelector("[data-b2-cancel]").addEventListener("click",()=>dlg.close());
  dlg.addEventListener("close",()=>dlg.remove());
  const checkbox=dlg.querySelector("#gx-b2-accept");
  const submit=dlg.querySelector("[data-b2-submit]");
  checkbox.addEventListener("change",()=>submit.disabled=!checkbox.checked);
  submit.addEventListener("click",async()=>{
   if(!checkbox.checked)return;
   submit.disabled=true;
   const status=dlg.querySelector(".gx-b2-confirm-status");
   if(store.demo){
    status.textContent="Solicitud simulada. No se envió nada a Admin.";
    return;
   }
   status.textContent="Validando solicitud…";
   try{
    const core=window.GOXION_CORE;
    const token=localStorage.getItem(core.STORAGE.CLIENT_TOKEN);
    if(!token)throw Error("Vuelve a iniciar sesión en Mi Espacio.");
    const response=await fetch(core.endpoint("estado-financiero-b2-beta"),{
     method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json","X-Client-Token":token},
     body:JSON.stringify({accion:"solicitar_prorroga",
       datos:{cargo_id:proposal.access.cargo_id,fecha_pactada:proposal.chosen,
         clave_idempotencia:crypto.randomUUID(),motivo:"Solicita prórroga de pago"}})
    });
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||"No fue posible registrar la solicitud.");
    status.textContent="Solicitud recibida. Pendiente de aprobación de Admin.";
   }catch(e){
    status.textContent=String(e?.message||"Solicitud no disponible");
    submit.disabled=false;
   }
  });
  if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
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