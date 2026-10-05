(()=>{
  function currentClient(){
    const focus=document.getElementById("gx-client-focus");
    const key=focus?.dataset?.gxClientKey||"";
    const c=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
    return {key,c};
  }
  const money=v=>Number(v||0).toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:2});

  window.gxAdminQuickMarkPaid=async function(){
    const {key,c}=currentClient();
    if(!c?._id)return alert("No pude identificar el espacio.");
    const ec=c.estado_cuenta||{};
    const state=String(ec.estado||"").toLowerCase();
    if(state==="pagado"||c.estado==="pagado")return alert("Este periodo ya aparece pagado.");
    const amount=Number(ec.total_actual ?? (c.servicios||[]).reduce((s,x)=>s+Number(x?.monto||0),0));
    const period=String(c.periodo_pendiente||ec.periodo||"").slice(0,7);
    if(!(amount>=0)||!/^\d{4}-\d{2}$/.test(period))return alert("Recarga la ficha antes de registrar el pago.");
    const timing=typeof gxPaymentTiming==="function"?gxPaymentTiming({...c,estado:"pendiente",pago_en_revision:false}):{type:"none"};
    const punctual=timing.type!=="overdue";
    if(!confirm(`Marcar como pagado desde Admin\n\nCliente: ${c.nombre||"Cliente"}\nPeriodo: ${period}\nMonto: $${money(amount)}\nLealtad: ${punctual?"puntual":"fuera de fecha"}\n\nUsará el mismo motor financiero que la aprobación normal. ¿Continuar?`))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.approvePayment!=="function")throw new Error("Motor financiero no disponible.");
      const r=await window.GOXION_FINANCIAL_ACTIONS.approvePayment({
        clienteId:c._id,monto:amount,puntual,
        notas:"Pago registrado manualmente desde Admin",
        periodoEsperado:period
      });
      if(typeof window.gxReloadAdminClient==="function")await window.gxReloadAdminClient(key);
      alert(`✓ Pago registrado en ${r.periodo_pagado||period}.\nSiguiente periodo: ${String(r.periodo_pendiente||"").slice(0,7)||"actualizado"}.`);
    }catch(e){console.error(e);alert("No se pudo registrar el pago.\n\n"+(e?.message||e));}
  };

  window.gxAdminDeleteSpace=async function(){
    const {c}=currentClient();
    if(!c?._id)return alert("No pude identificar el espacio.");
    const name=String(c.nombre||"este cliente");
    if(!confirm(`Eliminar espacio de ${name}\n\nEsta opción está pensada para espacios de prueba. Si existe historial financiero, GOXION bloqueará la eliminación.`))return;
    const typed=prompt(`Para confirmar la eliminación definitiva de ${name}, escribe:\nELIMINAR`);
    if(String(typed||"").trim().toUpperCase()!=="ELIMINAR")return;
    try{
      if(typeof window.gxCoreAdminAction!=="function")throw new Error("Acción administrativa no disponible.");
      await window.gxCoreAdminAction("eliminar_espacio",{cliente_id:c._id,confirmacion:"ELIMINAR ESPACIO"});
      window.gxCloseClientFocus?.();
      await window.gxReloadAdminClient?.();
      alert("✓ Espacio eliminado. Sus datos de prueba asociados fueron retirados.");
    }catch(e){console.error(e);alert("No se eliminó el espacio.\n\n"+(e?.message||e));}
  };

  function inject(){
    const {c}=currentClient(); if(!c)return;
    const actions=document.querySelector("#gx-focus-overview .gx-overview-actions");
    if(actions&&!actions.querySelector("[data-gx-manual-paid]")){
      const b=document.createElement("button");b.type="button";b.dataset.gxManualPaid="1";b.textContent="Marcar pagado";b.onclick=window.gxAdminQuickMarkPaid;actions.appendChild(b);
    }
    const body=document.getElementById("gx-focus-body");
    const account=body?.querySelector('[data-gx-section="account"] .gx-accordion-content')||body?.querySelector('[data-gx-section="account"]');
    if(account&&!account.querySelector("[data-gx-delete-space]")){
      const box=document.createElement("section");box.dataset.gxDeleteSpace="1";box.style.cssText="margin-top:14px;padding:14px;border:1px solid rgba(255,90,110,.28);border-radius:14px;background:rgba(255,60,90,.045)";
      box.innerHTML='<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><strong style="display:block">Eliminar espacio</strong><small style="opacity:.7">Solo se permite si no existe historial financiero que deba conservarse.</small></div><button type="button" style="border-color:rgba(255,90,110,.45)" onclick="gxAdminDeleteSpace()">Eliminar espacio</button></div>';
      account.appendChild(box);
    }
  }
  const prev=window.gxOpenClientFocus;
  if(typeof prev==="function")window.gxOpenClientFocus=function(...args){const r=prev.apply(this,args);setTimeout(inject,140);return r;};
  const prevSection=window.gxFocusSection;
  if(typeof prevSection==="function")window.gxFocusSection=function(...args){const r=prevSection.apply(this,args);setTimeout(inject,30);return r;};
})();