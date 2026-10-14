/* F3 beta · la MISMA ficha de revisión de Admin, sin segundo panel.
 * 0 clientes B2 activos: el pago heredado está bloqueado en esta copia.
 * Sólo una confirmación explícita acredita un reporte B2 autenticado. */
(function(){
 "use strict";
 if(!window.GOXION_B2_ADMIN_MIRROR?.writeLegacyBlocked)return;
 const core=window.GOXION_CORE;
 const keys=new Map(); let current=null;
 const money=n=>(Number(n||0)/100).toLocaleString("es-MX",
   {style:"currency",currency:"MXN"});
 async function request(action,datos){
  const token=localStorage.getItem(core.STORAGE.ADMIN_TOKEN)||"";
  if(!token)throw Error("Inicia sesión de Admin para validar B2.");
  const response=await fetch(core.endpoint("acciones-financieras-b2-beta"),{
   method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":token},
   body:JSON.stringify({accion:action,datos}),cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error(data.error||"No se pudo validar B2.");
  return data;
 }
 function buttons(enabled){
  const approve=document.querySelector("#gx-payment-modal .gx-payment-action.approve");
  if(approve)approve.disabled=!enabled;
  for(const selector of [".gx-payment-action.incomplete",".gx-payment-action.reject",
    ".gx-payment-extra",".gx-confirm-incomplete"]){
   const el=document.querySelector("#gx-payment-modal "+selector);
   if(el)el.hidden=true;
  }
 }
 function card(){
  return document.getElementById("gx-payment-review-card");
 }
 function message(text){
  const el=card();if(el)el.textContent=text;
 }
 function clientId(key){
  const c=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
  return String(c?._id||c?.id||"");
 }
 const originalOpen=window.gxOpenPaymentModal;
 if(typeof originalOpen!=="function")return;
 window.gxOpenPaymentModal=function(key,monto){
  originalOpen.call(this,key,monto);
  const item={key,clienteId:clientId(key),state:"loading",report:null,
   quote:null,viewed:false,assignments:null};
  current=item;
  buttons(false);message("Verificando comprobantes B2 y obligaciones del cliente…");
  (async()=>{
   if(!item.clienteId)throw Error("Cliente sin identificador autenticado.");
   const data=await request("b2_listar_comprobantes",{cliente_id:item.clienteId});
   if(current!==item)return;
   if(data.modo!=="b2_multifecha"){
    item.state="global";message("Este cliente usa cobro de fecha única. "+
     "Para revisar o aprobar su pago, utiliza el Admin oficial, no la beta B2.");
    return;
   }
   const reports=(data.comprobantes||[]).filter(x=>x.estado==="reportado");
   if(!reports.length){
    item.state="empty";message("No hay comprobantes B2 pendientes de aprobación.");
    return;
   }
   if(reports.length>1){
    item.state="ambiguous";message("Hay varios comprobantes en revisión. "+
     "Se requiere conciliación de Admin antes de acreditar.");
    return;
   }
   const report=reports[0],rows=Array.isArray(data.cotizacion?.cargos)?
     data.cotizacion.cargos:[];
   const selected=new Set(report.cargos_solicitados||[]);
   const chosen=rows.filter(x=>selected.has(x.cargo_id)&&x.pagado!==true);
   const amount=chosen.reduce((total,row)=>total+Number(row.total_centavos||0),0);
   if(!chosen.length||chosen.length!==selected.size||
     amount!==Number(report.monto_reportado_centavos||0))
    throw Error("El comprobante ya no coincide con los saldos actuales.");
   let retry=keys.get(report.id);
   if(!retry){
    retry={id:crypto.randomUUID(),rows:chosen.map(row=>({
      cargo_id:row.cargo_id,monto_centavos:Number(row.total_centavos),
      saldo_esperado_centavos:Number(row.total_centavos),
      operation_id:crypto.randomUUID()
    }))};
    keys.set(report.id,retry);
   }
   item.report=report;item.quote=data.cotizacion;item.assignments=retry;
   item.state="pending";
   const box=card();if(!box)return;
   box.replaceChildren();
   const title=document.createElement("strong");
   title.textContent="Comprobante B2 · "+money(amount);
   const detail=document.createElement("p");
   detail.textContent=chosen.length+" obligación(es) seleccionada(s). "+
     "El pago NO está acreditado hasta tu confirmación.";
   box.append(title,detail);
   for(const row of chosen){
    const line=document.createElement("div");
    line.textContent="Vence "+row.vence+" · "+money(row.total_centavos);
    box.append(line);
   }
   const previewBtn=document.createElement("button");
   previewBtn.type="button";previewBtn.textContent="Ver comprobante privado";
   previewBtn.className="gx-payment-action";
   previewBtn.style.marginTop="12px";
   box.append(previewBtn);
   previewBtn.addEventListener("click",async()=>{
    previewBtn.disabled=true;
    try{
     const file=await request("b2_ver_evidencia",{
       cliente_id:item.clienteId,reporte_id:report.id});
     if(current!==item)return;
     const img=document.createElement("img");
     img.alt="Comprobante privado de pago B2";
     img.style.cssText="display:block;width:100%;max-height:270px;object-fit:contain;margin-top:12px;border-radius:12px";
     img.onload=()=>{if(current===item){item.viewed=true;buttons(true)}};
     img.onerror=()=>{item.viewed=false;buttons(false);message("No se pudo abrir la evidencia. No se acreditó.");};
     img.src=file.url;box.append(img);
    }catch(e){message(e.message);}
    finally{previewBtn.disabled=false;}
   });
  })().catch(e=>{
   if(current!==item)return;
   item.state="error";buttons(false);
   message(e.message||"B2 no está disponible: no se aplicó ningún pago.");
  });
 };
 window.gxPaymentApprove=async function(){
  const item=current;
  if(!item||item.state!=="pending"||!item.viewed||!item.assignments){
   alert("Revisa la evidencia y confirma el saldo B2 antes de aprobar.");
   return;
  }
  if(!confirm("¿Aprobar los cargos B2 seleccionados por "+
    money(item.report.monto_reportado_centavos)+
    "? Esta acción acreditará el pago en el servidor."))return;
  item.state="submitting";buttons(false);
  try{
   const response=await request("b2_aprobar_comprobante",{
    cliente_id:item.clienteId,reporte_id:item.report.id,
    asignaciones:item.assignments.rows,
    clave_idempotencia:item.assignments.id,confirmar_aprobacion:true
   });
   if(response.resultado?.ok!==true)throw Error("El servidor no confirmó el pago.");
   item.state="approved";
   message("Pago B2 acreditado y conciliado. Actualiza la ficha del cliente.");
   alert("✓ Comprobante B2 aprobado y asociado a sus obligaciones.");
   window.gxClosePaymentModal?.();
   window.gxCloseClientFocus?.();
   if(typeof gxReloadAdminClient==="function")await gxReloadAdminClient(item.key);
  }catch(e){
   if(current===item){
    item.state="pending";
    message("No se pudo confirmar. Reabre y revisa el saldo antes de reintentar. "+e.message);
    buttons(false);
   }
  }
 };
 window.gxPaymentIncomplete=()=>alert("El pago incompleto B2 requiere revisión excepcional. No se registra desde esta beta.");
 window.gxPaymentReject=()=>alert("El rechazo B2 aún no se habilita en esta beta. Usa el control administrativo aprobado.");
 const originalClose=window.gxClosePaymentModal;
 window.gxClosePaymentModal=function(...args){
  current=null;
  return typeof originalClose==="function"?originalClose.apply(this,args):undefined;
 };
})();