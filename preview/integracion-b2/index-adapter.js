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
   descuento_comercial_centavos:Number(x.descuento_comercial_centavos||0),
   beneficios_comerciales:Array.isArray(x.beneficios_comerciales)?x.beneficios_comerciales:[],
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

 // Desglose financiero B2: parte SIEMPRE de los cargos seleccionados.
 // Las cantidades del servidor están en centavos; el residuo concilia
 // promociones, créditos u otros movimientos sin inventar su concepto.
 function breakdown(){
  const selection=choice(),items=selection.cargos;
  if(!items.length)return null;
  const sum=key=>items.reduce((acc,row)=>acc+Math.max(0,Number(row[key]||0)),0);
  const subtotal=sum("base_centavos");
  const lealtad=sum("descuento_centavos");
  const comerciales=sum("descuento_comercial_centavos");
  const mora=sum("mora_centavos");
  const abonos=sum("abono_pagado_centavos");
  const detalles=new Map();
  for(const item of items)for(const benefit of item.beneficios_comerciales){
    const key=String(benefit.fuente)+":"+String(benefit.referencia_id);
    const previous=detalles.get(key)||{concepto:String(benefit.concepto||"Beneficio GOXION"),monto:0};
    previous.monto+=Number(benefit.monto_centavos||0);
    detalles.set(key,previous);
  }
  const ajustes=selection.centavos-(subtotal-lealtad-comerciales+mora-abonos);
  return {subtotal,lealtad,comerciales,detalles:[...detalles.values()],
    mora,abonos,ajustes,total:selection.centavos,
    titulo:mode==="todo"?"Todos los servicios":
      title(items[0])};
 }
 function updateBreakdown(){
  const anchor=document.getElementById("b2-calendar");
  if(!anchor)return;
  let panel=document.querySelector(".scrollable-content .breakdown-box");
  if(!panel){
    panel=document.createElement("section");
    panel.className="glass-card breakdown-box";
  }
  panel.classList.add("gx-b2-breakdown");
  if(panel.previousElementSibling!==anchor)
    anchor.insertAdjacentElement("afterend",panel);
  const b=breakdown();
  if(!b){
    panel.hidden=true;
    return;
  }
  panel.hidden=false;
  panel.style.removeProperty("display");
  const line=(description,value,type="")=>
    '<div class="breakdown-line gx-b2-breakdown-line '+type+'">'+
      '<span>'+esc(description)+'</span><strong>'+esc(value)+'</strong></div>';
  panel.innerHTML=
    '<div class="gx-b2-breakdown-caption">DESGLOSE DEL PAGO</div>'+
    '<div class="gx-b2-breakdown-context">'+esc(b.titulo)+'</div>'+
    line("Subtotal",money(b.subtotal))+
    (b.lealtad>0?line("Descuento de lealtad","−"+money(b.lealtad),"discount-line"):"")+
    (b.detalles.length?b.detalles.map(x=>line(x.concepto,"−"+money(x.monto),
       "discount-line")).join(""):
      b.comerciales>0?line("Beneficios comerciales aplicados","−"+money(b.comerciales),
        "discount-line"):"")+
    (b.abonos>0?line("Pagos parciales aprobados","−"+money(b.abonos),"discount-line"):"")+
    (b.mora>0?line("Mora acumulada","+"+money(b.mora),"surcharge-line"):"")+
    (b.ajustes!==0?line("Otros ajustes al saldo",
      (b.ajustes<0?"−":"+")+money(Math.abs(b.ajustes)),
      b.ajustes<0?"discount-line":"surcharge-line"):"")+
    '<div class="gx-b2-breakdown-final">'+
      '<span>Importe seleccionado</span><strong id="b2-selected-total">'+money(b.total)+'</strong>'+
    '</div>';
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
   // Reutilizar los símbolos del estado de cuenta oficial, no sustituirlos por etiquetas genéricas.
   badge.textContent=due?(due.mora_centavos>0?"🚨 Servicio vencido · "+date(due.vence):"⏳ Próximo pago · "+date(due.vence)):"✅ Servicios al corriente";
   badge.className="time-badge "+(due?.mora_centavos>0?"badge-overdue":due?"badge-ok":"badge-paid");
  }
  const period=document.querySelector(".card-info .info-block.full .value");
  if(period){
    // Conservar la fila ORIGINAL "Periodo facturado" y su jerarquía:
    // sólo cambian los valores, no el componente ni sus estilos.
    const value=quote.periodo||"";
    const month=/^\d{4}-\d{2}/.test(value)
      ?new Intl.DateTimeFormat("es-MX",{month:"long",year:"numeric",timeZone:"UTC"})
        .format(new Date(value.slice(0,7)+"-01T00:00:00Z"))
      :"Período vigente";
    const dueDates=new Set((quote.cargos||[]).map(x=>x.vence).filter(Boolean)).size;
    const dueLabel=dueDates===1?"1 fecha de pago":dueDates+" fechas de pago";
    const label=period.firstElementChild;
    const desired=month.charAt(0).toUpperCase()+month.slice(1);
    if(period.firstChild?.nodeType===3&&period.firstChild.textContent!==desired+" ")
      period.firstChild.textContent=desired+" ";
    if(label&&label.textContent!==dueLabel)
      label.textContent=dueLabel;
  }
  const oldOverdue=document.querySelector(".overdue-incentive-box");
  if(oldOverdue)oldOverdue.style.display="none";
  const loyaltyIcon=document.querySelector(".loyalty-badge .loyalty-icon");
  if(loyaltyIcon){
    if(!loyaltyIcon.dataset.gxB2Original)
      loyaltyIcon.dataset.gxB2Original=loyaltyIcon.textContent;
    const icon=quote.lealtad_global_perdida?"💔":loyaltyIcon.dataset.gxB2Original;
    if(loyaltyIcon.textContent!==icon)loyaltyIcon.textContent=icon;
  }
  const loyalty=document.querySelector(".loyalty-badge .loyalty-desc");
  if(loyalty){
    // Conservar el componente oficial y sus colores/énfasis. Mostrar
    // pérdida únicamente en el escenario real de incumplimiento.
    if(!loyalty.dataset.gxB2Original)
      loyalty.dataset.gxB2Original=loyalty.innerHTML;
    const result=quote.lealtad_global_perdida
      ?'<span style="color:var(--danger-red);font-weight:600;">💔 Racha reiniciada por incumplir una fecha de pago.</span>'
      :loyalty.dataset.gxB2Original;
    if(loyalty.innerHTML!==result)loyalty.innerHTML=result;
  }
 }
 function content(){
  const list=rows(),due=pending()[0];
  const first=due?money(due.total_centavos):"Al corriente";
  const label=due?(due.prorroga_estado==="aprobada"&&due.mora_centavos===0?
    "Prórroga hasta "+date(due.fecha_pactada):"Vence "+date(due.vence)):
    "Sin pagos pendientes";
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
     '<p class="gx-b2-foot">'+(store.quote?.comprobante_en_revision?
      "Comprobante recibido · pendiente de revisión. Aún no es un pago acreditado.":
      "El reporte de pago se acredita únicamente después de la revisión de Admin.")+'</p>'+
     (due?.prorroga_estado==="aprobada"?
       '<p class="gx-b2-foot gx-b2-prorrogated">Acuerdo pactado hasta el '+
         esc(date(due.fecha_pactada))+
         '. Mantendrás tu lealtad si cumples en esa fecha.</p>':"")+
     (store.quote?.lealtad_global_perdida?
        '<p class="gx-b2-note">La lealtad se perdió por una fecha incumplida. La mora corresponde solo al servicio vencido.</p>':"")+
     '</div></div></div>';
 }
 function render(){
  const anchor=document.querySelector(".services-container");
  if(!anchor)return;
  document.getElementById("gx-b2-read-block")?.remove();
  if(store.blocked){
    const guard=document.createElement("div");
    guard.id="gx-b2-read-block";
    guard.className="glass-card gx-b2-card";
    guard.setAttribute("role","alert");
    guard.style.cssText="padding:18px;margin:12px 0;line-height:1.6";
    guard.textContent="Tu calendario B2 requiere verificación. No realices un pago global hasta que se confirme el saldo por servicio.";
    anchor.insertAdjacentElement("afterend",guard);
    return;
  }
  if(!store.quote?.ok||!Array.isArray(store.quote.cargos))return;
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
  updateHeader();
  updateBreakdown();
  updateServiceMarker();
 }
 function installHandlers(){
  if(installed||typeof window.abrirModalPago!=="function")return;
  installed=true;
  const originalModal=window.abrirModalPago;
  const originalBank=window.abrirDatosPago;
  window.abrirModalPago=function(key,period,monto,folio,nombre){
   if(store.blocked){
    window.mostrarToastPago?.("Saldo B2 sin verificar: no se permite el pago global.",true);
    return;
   }
   if(!store.quote)return originalModal.apply(this,arguments);
   if(store.quote.comprobante_en_revision){
    window.mostrarToastPago?.("Tu comprobante ya está en revisión.",true);return;
   }
   const val=choice();
   if(!val.cargos.length||val.centavos<=0){
    window.mostrarToastPago?.("Selecciona un importe válido",true);return;
   }
   store.report={monto_centavos:val.centavos,
     cargo_ids:val.cargos.map(x=>x.cargo_id),
     modo:mode,periodo:store.quote.periodo};
   originalModal.call(this,key,period,(val.centavos/100).toFixed(2),folio,nombre);
  };
  if(typeof originalBank==="function")window.abrirDatosPago=function(){
   if(store.blocked||store.quote?.comprobante_en_revision){
    window.mostrarToastPago?.("Comprobante o saldo pendiente de revisión.",true);
    return;
   }
   if(store.quote){
    const val=choice();if(val.centavos<=0)return;
    try{pagoActualInfo.monto=(val.centavos/100).toFixed(2)}catch(_){}
   }
   return originalBank.apply(this,arguments);
  };
  window.enviarComprobanteDiscord=async function(){
   if(store.blocked){
    window.mostrarToastPago?.("El saldo B2 aún no está conciliado.",true);return;
   }
   if(!store.quote)return;
   const val=choice();
   const input=document.getElementById("file-input");
   if(!input?.files?.length){
    window.mostrarToastPago?.("Selecciona tu comprobante",true);return;
   }
   if(val.centavos<=0||store.quote.comprobante_en_revision)return;
   if(store.demo){
    if(typeof window.gxSetPaymentSubmitState==="function")
     window.gxSetPaymentSubmitState("success");
    else document.getElementById("payment-modal")?.classList.add("is-success");
    window.mostrarToastPago?.("Esta pantalla es de revisión; no acepta pagos reales");
    return;
   }
   const core=window.GOXION_CORE;
   const token=localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   const cycle=String(store.quote.ciclo_id||"");
   if(!store.f3||!token||!/^[-0-9a-f]{36}$/i.test(cycle)){
    window.mostrarToastPago?.("Esta cuenta no tiene habilitado el reporte B2 beta.",true);
    return;
   }
   if(store.submitting)return;
   const file=input.files[0],ids=val.cargos.map(x=>x.cargo_id);
   const signature=[cycle,val.centavos,...ids,file.name,file.size,file.lastModified].join("|");
   let op=store.reportOperation;
   if(!op||op.signature!==signature)op={signature,id:crypto.randomUUID()};
   store.reportOperation=op;store.submitting=true;
   try{
    const fd=new FormData();
    fd.set("ciclo_id",cycle);
    fd.set("monto_centavos",String(val.centavos));
    fd.set("cargo_ids",JSON.stringify(ids));
    fd.set("clave_idempotencia",op.id);
    fd.set("archivo",file);
    const response=await fetch(core.endpoint("comprobantes-b2-beta"),{
      method:"POST",headers:{"X-Client-Token":token},
      body:fd,cache:"no-store"
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok||json.ok!==true||
      !json.reporte_id||json.acreditado===true)
      throw Error(json.error||"El comprobante no fue aceptado; revisa el importe.");
    store.report={...store.report,reporte_id:json.reporte_id,
      estado:json.estado,acreditado:false};
    store.quote.comprobante_en_revision=true;
    render();
    if(typeof window.gxSetPaymentSubmitState==="function")
      window.gxSetPaymentSubmitState("success");
    else document.getElementById("payment-modal")?.classList.add("is-success");
    window.mostrarToastPago?.("Comprobante recibido. Esperando validación de Admin.");
   }catch(error){
    document.getElementById("payment-modal")?.classList.add("is-error");
    window.mostrarToastPago?.(error.message||"No fue posible reportar tu pago.",true);
   }finally{store.submitting=false;}
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