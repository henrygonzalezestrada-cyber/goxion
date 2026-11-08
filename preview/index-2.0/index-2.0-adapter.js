/* GOXION · Index 2.0 · adaptador del espejo (B0/B1).
 * Sustituye a preview/integracion-b2/index-adapter.js DENTRO del espejo.
 * Reutiliza el motor financiero y el puente demo/real (b2-bridge.js): los
 * importes, la mora y la lealtad vienen del servidor en centavos; aquí solo
 * se AGRUPA por fecha efectiva para pintar. Nada se calcula en JS.
 * B1: grupos por fecha con <details> nativo. DESGLOSE DEL PAGO como sección
 * no se toca en este bloque (es B4); la selección por grupo con chip "Todo"
 * y el botón con importe es B3. */
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
 /* B1 · Selección por grupo (decisión de Henry): tocar un grupo lo
  * selecciona entero. mode "grupo" = el grupo seleccionado (o el próximo
  * si no hay selección); "todo" existe para el chip de B3. */
 let mode="grupo",selectedGroup=null,installed=false,lastAnchor=null,
  lastNextFecha="";
 const openGroups=new Set();
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
  })).sort((a,b)=>effectiveDue(a).localeCompare(effectiveDue(b))||
    a.vence.localeCompare(b.vence)||a.cargo_id.localeCompare(b.cargo_id)): [];
 }
 // Acuerdo de prórroga vigente desplaza el vencimiento efectivo, nunca el
 // vencimiento original usado para calcular mora si el acuerdo se incumple.
 function effectiveDue(row){
  return row.prorroga_estado==="aprobada"&&row.fecha_pactada&&row.mora_centavos<=0
   ?row.fecha_pactada:row.vence;
 }
 function pending(){return rows().filter(x=>!x.pagado&&x.total_centavos>0)}
 function nextPayment(){
  const list=pending();
  if(!list.length)return {cargos:[],centavos:0,fecha:""};
  const fecha=effectiveDue(list[0]);
  const due=list.filter(x=>effectiveDue(x)===fecha);
  return {cargos:due,centavos:due.reduce((n,x)=>n+x.total_centavos,0),fecha};
 }
 /* B1 · Grupos por fecha efectiva: un grupo por fecha, con sus cargos
  * dentro. El total del grupo suma solo lo pendiente (un cargo pagado no
  * aporta importe, propuesta §3.4). */
 function groups(){
  const out=[];
  for(const row of rows()){
   const fecha=effectiveDue(row);
   let g=out.find(x=>x.fecha===fecha);
   if(!g){g={fecha,cargos:[],centavos:0};out.push(g);}
   g.cargos.push(row);
   if(!row.pagado)g.centavos+=row.total_centavos;
  }
  return out;
 }
 function choice(){
  const list=pending();
  if(!list.length)return {cargos:[],centavos:0};
  if(mode==="todo")return {cargos:list,centavos:list.reduce((s,x)=>s+x.total_centavos,0)};
  const fecha=selectedGroup||nextPayment().fecha;
  const items=list.filter(x=>effectiveDue(x)===fecha);
  if(items.length)return {cargos:items,centavos:items.reduce((s,x)=>s+x.total_centavos,0)};
  const due=nextPayment();
  return {cargos:due.cargos,centavos:due.centavos};
 }
 /* B1 · Estado del grupo, en palabras (propuesta §3.4). La fecha vive solo
  * en el encabezado; la prórroga aprobada define la fecha efectiva del
  * grupo y se nombra una sola vez. */
 function daysUntil(fecha){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha||"")))return null;
  const now=new Date();
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.round((Date.parse(fecha+"T00:00:00Z")-today)/86400000);
 }
 function groupState(g){
  if(g.cargos.length&&g.cargos.every(x=>x.pagado))return "Pagado";
  const prorrogado=g.cargos.find(x=>x.prorroga_estado==="aprobada"&&
    x.fecha_pactada&&x.mora_centavos<=0);
  if(prorrogado)return "Prórroga hasta "+date(prorrogado.fecha_pactada);
  if(g.cargos.some(x=>x.mora_centavos>0))return "Vencido";
  const days=daysUntil(g.fecha);
  if(days===null)return "Por confirmar";
  if(days<0)return "Vencido";
  if(days===0)return "Vence hoy";
  if(days===1)return "Vence mañana";
  return "Vence en "+days+" días";
 }
 /* B1 · Estado de la fila, SOLO si difiere del grupo. Sin fecha en las
  * filas y sin "Lealtad sin descuento": la lealtad es un dato de la cuenta,
  * vive solo en su módulo (y, si descuenta, como línea dentro del grupo en B4). */
 function rowState(row){
  if(row.pagado)return {text:"Pagado",late:false};
  if(row.mora_centavos>0)return {text:"Mora "+money(row.mora_centavos),late:true};
  if(row.abono_pagado_centavos>0)return {text:"Abonado "+money(row.abono_pagado_centavos),late:false};
  return null;
 }
 function title(row){return row.servicio+" · Perfil "+row.ordinal}
 function updateHeader(){
  const quote=store.quote;
  if(!quote)return;
  const next=nextPayment(),due=next.cargos[0];
  const label=document.querySelector(".balance-hero .total-label");
  const amount=document.querySelector(".balance-hero .total-amount");
  const badge=document.querySelector(".balance-hero .time-badge");
  if(label)label.textContent=due?"Próximo pago":"Saldo pendiente";
  if(amount)amount.textContent=money(next.centavos);
  if(badge){
   // La píldora se afina en B2 (solo estado relativo, sin fecha repetida);
   // en B1 se conserva el texto del adaptador B2 para no cambiar el hero
   // antes de tiempo.
   badge.textContent=due?(due.mora_centavos>0?"🚨 Servicio vencido · "+date(due.vence):"⏳ Próximo pago · "+date(next.fecha)):"✅ Servicios al corriente";
   badge.className="time-badge "+(due?.mora_centavos>0?"badge-overdue":due?"badge-ok":"badge-paid");
  }
  const period=document.querySelector(".card-info .info-block.full .value");
  if(period){
    const value=quote.periodo||"";
    const month=/^\d{4}-\d{2}/.test(value)
      ?new Intl.DateTimeFormat("es-MX",{month:"long",year:"numeric",timeZone:"UTC"})
        .format(new Date(value.slice(0,7)+"-01T00:00:00Z"))
      :"Período vigente";
    const dueDates=new Set((quote.cargos||[]).map(x=>x.vence).filter(Boolean)).size;
    const dueLabel=dueDates===1?"1 fecha de pago":dueDates+" fechas de pago";
    const labelEl=period.firstElementChild;
    const desired=month.charAt(0).toUpperCase()+month.slice(1);
    if(period.firstChild?.nodeType===3&&period.firstChild.textContent!==desired+" ")
      period.firstChild.textContent=desired+" ";
    if(labelEl&&labelEl.textContent!==dueLabel)
      labelEl.textContent=dueLabel;
  }
  const oldOverdue=document.querySelector(".overdue-incentive-box");
  if(oldOverdue)oldOverdue.style.display="none";
  /* Lealtad perdida B2 sobre la joya nueva (.gx-index-loyalty): el render
   * global ya pinta la joya con los datos del motor global; la cotización
   * B2 puede saber antes que se perdió la lealtad (lealtad_global_perdida).
   * Solo se aplica la variante "perdida" cuando la bandera B2 está activa. */
  const loyaltyPanel=document.querySelector(".loyalty-badge.gx-index-loyalty");
  if(loyaltyPanel)setLoyaltyLost(loyaltyPanel,quote.lealtad_global_perdida===true);
 }
 function setLoyaltyLost(panel,lost){
  const mark=panel.querySelector(".gx-index-loyalty-mark");
  const titleEl=panel.querySelector(".loyalty-title");
  const caption=panel.querySelector(".gx-index-loyalty-caption");
  const desc=panel.querySelector(".loyalty-desc");
  if(!mark||!titleEl||!caption||!desc)return;
  if(!panel.dataset.gxB2LoyaltyOriginal){
   panel.dataset.gxB2LoyaltyOriginal=JSON.stringify({
    state:panel.dataset.loyaltyState||"active",
    title:titleEl.textContent,caption:caption.textContent,
    desc:desc.innerHTML,now:mark.getAttribute("aria-valuenow")||"0",
    max:mark.getAttribute("aria-valuemax")||"4"});
  }
  if(lost){
   if(panel.dataset.gxB2LoyaltyApplied==="lost")return;
   panel.dataset.gxB2LoyaltyApplied="lost";
   panel.dataset.loyaltyState="lost";
   mark.classList.add("is-lost");
   mark.setAttribute("role","img");
   mark.setAttribute("aria-label","Racha reiniciada");
   mark.querySelectorAll(".gx-index-loyalty-seg").forEach(s=>s.classList.remove("is-filled"));
   titleEl.textContent="Racha reiniciada";
   caption.textContent="Perdiste tu avance";
   desc.innerHTML='<span style="color:var(--danger-red);font-weight:600;">💔 Racha reiniciada por incumplir una fecha de pago.</span>';
  }else{
   if(panel.dataset.gxB2LoyaltyApplied!=="lost")return;
   delete panel.dataset.gxB2LoyaltyApplied;
   const orig=JSON.parse(panel.dataset.gxB2LoyaltyOriginal);
   panel.dataset.loyaltyState=orig.state;
   mark.classList.remove("is-lost");
   mark.setAttribute("role","progressbar");
   mark.setAttribute("aria-label","Racha: "+orig.now+" de "+orig.max+" pagos puntuales");
   const now=Number(orig.now)||0;
   mark.querySelectorAll(".gx-index-loyalty-seg").forEach((s,i)=>s.classList.toggle("is-filled",i<now));
   titleEl.textContent=orig.title;caption.textContent=orig.caption;desc.innerHTML=orig.desc;
  }
 }
 /* Seguimiento del comprobante B2: la única señal viva es
  * quote.comprobante_en_revision. Se muestra con el mismo tracker vanilla
  * del render global; si el global ya pintó uno, no se duplica. */
 function updateProofTracker(){
  const content=document.querySelector(".scrollable-content");
  if(!content)return;
  const own=content.querySelector(":scope > .gx-index-proof[data-gx-20-proof]");
  if(!store.quote?.comprobante_en_revision){own?.remove();return;}
  if(content.querySelector(":scope > .gx-index-proof"))return;
  if(typeof window.gxProofTrackerHTML!=="function")return;
  const tmp=document.createElement("div");
  tmp.innerHTML=window.gxProofTrackerHTML("review");
  const section=tmp.firstElementChild;
  if(!section)return;
  section.dataset.gx20Proof="1";
  content.insertBefore(section,content.firstChild);
 }
 function content(){
  const list=groups(),next=nextPayment();
  const nextFecha=next.fecha;
  const due=pending()[0];
  const selectedFecha=selectedGroup||nextFecha;
  const plural=n=>n===1?"1 servicio":n+" servicios";
  const groupsHTML=list.map(g=>{
   const isNext=g.fecha===nextFecha&&g.centavos>0;
   const isActive=g.fecha===selectedFecha;
   const open=openGroups.has(g.fecha);
   const state=groupState(g);
   const rowsHTML=g.cargos.map(x=>{
    const st=rowState(x);
    const side=x.pagado?"Pagado":isActive?"Seleccionado":"Pendiente";
    return '<button class="gx-20-row '+(isActive&&!x.pagado?'is-active ':'')+
     (x.pagado?'is-done':'')+'" type="button" data-gx20-cargo="'+esc(x.cargo_id)+
     '" data-gx20-fecha="'+esc(g.fecha)+'" '+(x.pagado?'disabled':'')+'>'+
     '<span class="gx-20-row-main"><span class="gx-20-row-title">'+esc(title(x))+
     '</span>'+(st?'<span class="gx-20-row-state'+(st.late?' is-late':'')+'">'+
       esc(st.text)+'</span>':'')+'</span>'+
     '<span class="gx-20-row-side"><strong>'+money(x.total_centavos)+'</strong><small>'+
       side+'</small></span></button>';
   }).join("");
   return '<details class="gx-20-group '+(isNext?'is-next ':'')+
    (isActive?'is-active':'')+'" data-gx20-fecha="'+esc(g.fecha)+'"'+
    (open?' open':'')+'>'+
    '<summary class="gx-20-summary">'+
     '<span class="gx-20-sum-main"><strong class="gx-20-sum-date">'+esc(date(g.fecha))+
     '</strong><span class="gx-20-sum-meta">'+esc(plural(g.cargos.length))+' · '+
       esc(state)+'</span></span>'+
     '<span class="gx-20-sum-side"><strong class="gx-20-sum-total">'+money(g.centavos)+
     '</strong><span class="gx-20-chevron" aria-hidden="true">⌄</span></span>'+
    '</summary>'+
    '<div class="gx-20-rows">'+rowsHTML+'</div>'+
   '</details>';
  }).join("");
  const foot=(store.quote?.comprobante_en_revision?
    "Comprobante recibido · pendiente de revisión. Aún no es un pago acreditado.":
    "El reporte de pago se acredita únicamente después de la revisión de Admin.");
  const prorrogated=due?.prorroga_estado==="aprobada"&&due.mora_centavos===0?
    '<p class="gx-20-foot">Acuerdo pactado hasta el '+esc(date(due.fecha_pactada))+
    '. Mantendrás tu lealtad si cumples en esa fecha.</p>':"";
  const lostNote=store.quote?.lealtad_global_perdida?
    '<p class="gx-20-foot gx-20-note">La lealtad se perdió por una fecha incumplida. La mora corresponde solo al servicio vencido.</p>':"";
  return '<div class="gx-20-cal-head"><span class="gx-20-caption">CALENDARIO DE PAGOS</span></div>'+
   groupsHTML+
   '<p class="gx-20-foot">'+esc(foot)+'</p>'+prorrogated+lostNote;
 }
 function render(){
  const anchor=document.querySelector(".services-container");
  if(!anchor)return;
  document.getElementById("gx-20-read-block")?.remove();
  if(store.blocked){
    document.getElementById("gx-20-calendar")?.remove();
    document.documentElement.classList.remove("gx-20-b2");
    const guard=document.createElement("div");
    guard.id="gx-20-read-block";
    guard.className="glass-card gx-20-card";
    guard.setAttribute("role","alert");
    guard.style.cssText="padding:18px;margin:12px 0;line-height:1.6";
    guard.textContent="Tu calendario B2 requiere verificación. No realices un pago global hasta que se confirme el saldo por servicio.";
    anchor.insertAdjacentElement("afterend",guard);
    return;
  }
  if(!store.quote?.ok||!Array.isArray(store.quote.cargos)){
    document.getElementById("gx-20-calendar")?.remove();
    document.documentElement.classList.remove("gx-20-b2");
    return;
  }
  /* B1 · En B2, SERVICIOS ACTIVOS no se pinta (el CSS del espejo lo oculta
   * solo cuando esta clase está puesta); en flujo global no hay cotización
   * B2 y la lista se conserva tal cual. */
  document.documentElement.classList.add("gx-20-b2");
  const next=nextPayment();
  /* El grupo próximo nace abierto. Si la cotización cambia y el próximo es
   * otra fecha, esa fecha se abre; un grupo que el cliente cerró a mano no
   * se reabre solo por un re-render (lastNextFecha solo cambia con el próximo). */
  if(next.fecha&&next.fecha!==lastNextFecha){openGroups.add(next.fecha);lastNextFecha=next.fecha;}
  let card=document.getElementById("gx-20-calendar");
  if(!card){
   card=document.createElement("section");
   card.id="gx-20-calendar";
   card.className="glass-card gx-20-card";
   card.setAttribute("aria-label","Calendario de pagos por fecha");
   anchor.insertAdjacentElement("afterend",card);
  }
  card.innerHTML=content();
  card.querySelectorAll("details.gx-20-group").forEach(details=>{
   details.addEventListener("toggle",()=>{
    const fecha=details.dataset.gx20Fecha;
    if(details.open)openGroups.add(fecha);else openGroups.delete(fecha);
   });
  });
  card.querySelectorAll("[data-gx20-cargo]").forEach(button=>button.addEventListener("click",()=>{
   selectedGroup=button.dataset.gx20Fecha;mode="grupo";
   openGroups.add(selectedGroup);
   render();
  }));
  updateHeader();
  updateProofTracker();
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
