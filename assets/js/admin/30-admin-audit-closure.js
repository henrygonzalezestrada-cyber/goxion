(()=>{
  function currentClient(){
    const focus=document.getElementById("gx-client-focus");
    const key=focus?.dataset?.gxClientKey||"";
    const c=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
    return {key,c};
  }
  const money=v=>Number(v||0).toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:2});

  // Guard C2 (auditoría 2026-11-08): no aprobar por vía global un ciclo B2
  // ya medio pagado. Admin no tiene los cargos B2 cargados en la ficha
  // (estado_cuenta es solo el modelo global), así que se consulta el mismo
  // listado que usa el router F5: b2_listar_comprobantes. Si el cliente es
  // B2 y existe un comprobante APROBADO en el periodo de la ficha, el cobro
  // ya se está liquidando por la ruta B2 (F3); aprobar el total global
  // cobraría dos veces. Si el listado no se puede verificar (sin sesión,
  // sin gateway, error de red o 409), se mantiene el flujo anterior: el
  // modal F5 sigue protegiendo su propia ruta y la vía global no cambia
  // para clientes de fecha única. Devuelve el mensaje de bloqueo o null.
  async function gxAdminB2GuardBloqueaGlobal(clienteId, period){
    try{
      const core = window.GOXION_CORE;
      const token = core && core.STORAGE ? localStorage.getItem(core.STORAGE.ADMIN_TOKEN || "") : "";
      const url = core && typeof core.endpoint === "function" ? core.endpoint("acciones-financieras-b2-beta") : "";
      if(!token || !url) return null;
      const r = await fetch(url, {method:"POST", cache:"no-store",
        headers:{"Content-Type":"application/json", "X-Admin-Token":token},
        body:JSON.stringify({accion:"b2_listar_comprobantes", datos:{cliente_id:String(clienteId || "")}})});
      const j = await r.json().catch(() => ({}));
      if(!r.ok || j?.ok !== true || j?.modo !== "b2_multifecha") return null;
      const aprobado = (j.comprobantes || []).find(x => x && x.estado === "aprobado" && String(x.periodo || "").slice(0, 7) === String(period || ""));
      if(!aprobado) return null;
      const monto = (Number(aprobado.monto_reportado_centavos || 0) / 100).toFixed(2);
      return "Este cobro ya tiene un pago B2 aplicado en este periodo ($" + monto + " acreditados por comprobante). No lo marques como pagado por la vía global: se cobraría dos veces. Revisa el cobro B2 en la ficha (ruta de revisión de comprobantes).";
    }catch(e){
      console.warn("Guard C2: no se pudo verificar el régimen B2", String(e && e.message || e).slice(0, 120));
      return null;
    }
  }

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
    const bloqueoB2=await gxAdminB2GuardBloqueaGlobal(c._id, period);
    if(bloqueoB2) return alert(bloqueoB2);
    if(!confirm(`Marcar como pagado desde Admin\n\nCliente: ${c.nombre||"Cliente"}\nPeriodo: ${period}\nMonto: $${money(amount)}\nLealtad: ${punctual?"puntual":"fuera de fecha"}\n\nUsará el mismo motor financiero que la aprobación normal. ¿Continuar?`))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.approvePayment!=="function")throw new Error("Motor financiero no disponible.");
      const r=await window.GOXION_FINANCIAL_ACTIONS.approvePayment({
        clienteId:c._id,monto:amount,punctual,
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