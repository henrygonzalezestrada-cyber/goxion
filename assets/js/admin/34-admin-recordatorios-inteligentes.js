/* GOXION Admin · Recordatorios inteligentes (solo lectura del motor de cobro).
 * El estado financiero y las prorrogas se consultan a los endpoints existentes.
 * Abre WhatsApp con texto prellenado; no adjunta ni descarga archivos.
 */
(function(){
  "use strict";
  var CORE=window.GOXION_CORE;
  var AGREEMENTS_URL=CORE&&CORE.endpoint("acciones-financieras-b2-beta");
  var SPACE_URL="https://henrygonzalezestrada-cyber.github.io/goxion/ayuda.html";
  var agreements=[], verified=false, loadedAt=0, pending=null, noPhoneDialog=null;
  var b2Modes=new Map(),b2Requested=new Set(),b2Busy=0,b2QueueTimer=0;
  var DAY=/^\d{4}-\d{2}-\d{2}$/;
  function today(){
    return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  }
  function money(n){return "$"+Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function amount(v){var n=Number(v);return Number.isFinite(n)?Math.max(0,n):0;}
  function getClient(key){return typeof clientesDict!=="undefined"?clientesDict[key]:null;}
  function clientId(c){return String(c?._id||c?.id||"");}
  function currentPeriod(c){return String(c?.estado_cuenta?.periodo||c?.periodo_pendiente||"").slice(0,7);}
  function dateLabel(value){
    if(!DAY.test(String(value||"")))return "";
    var d=new Date(value+"T12:00:00");
    return d.toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"});
  }
  async function updateAgreements(force){
    if(pending)return pending;
    if(!force&&verified&&Date.now()-loadedAt<60000)return agreements;
    var token=CORE&&CORE.STORAGE?localStorage.getItem(CORE.STORAGE.ADMIN_TOKEN):"";
    if(!token||!AGREEMENTS_URL){verified=false;return null;}
    pending=(async function(){
      try{
        var resp=await fetch(AGREEMENTS_URL,{method:"POST",cache:"no-store",
          headers:{"Content-Type":"application/json","X-Admin-Token":token},
          body:JSON.stringify({accion:"b2_listar_prorrogas",datos:{}})});
        var data=await resp.json().catch(function(){return {};});
        if(!resp.ok||data.ok!==true||!Array.isArray(data.solicitudes))throw new Error("No se pudo consultar acuerdos");
        agreements=data.solicitudes;
        verified=true;loadedAt=Date.now();
        applyCards();
        return agreements;
      }catch(err){
        verified=false;
        applyCards();
        console.warn("GOXION · recordatorios: prórrogas sin verificar",err);
        return null;
      }finally{pending=null;}
    })();
    return pending;
  }
  async function adminAction(action,data){
    var token=CORE&&CORE.STORAGE?localStorage.getItem(CORE.STORAGE.ADMIN_TOKEN):"";
    if(!token)throw new Error("Sesión administrativa no disponible.");
    var response=await fetch(AGREEMENTS_URL,{method:"POST",cache:"no-store",
      headers:{"Content-Type":"application/json","X-Admin-Token":token},
      body:JSON.stringify({accion:action,datos:data||{}})});
    var result=await response.json().catch(function(){return {};});
    if(!response.ok||result.ok!==true)throw new Error(result.error||"No se pudo confirmar la cotización B2.");
    return result;
  }
  async function inspectB2(c,force){
    var id=clientId(c),period=currentPeriod(c);
    if(!/^[0-9a-f-]{36}$/i.test(id)||!period)return;
    if(!force&&b2Requested.has(id))return;
    b2Requested.add(id);
    try{
      var status=await adminAction("b2_listar_comprobantes",{cliente_id:id});
      if(status.modo!=="b2_multifecha"){
        b2Modes.set(id,{mode:"global"});
        applyCards();return;
      }
      b2Modes.set(id,{mode:"unverified"});
      var quote=await adminAction("b2_cotizar_ciclo",{cliente_id:id,periodo:period+"-01"});
      if(!quote.resultado||quote.resultado.ok!==true||!Array.isArray(quote.resultado.cargos))
        throw new Error("Cotización B2 incompleta.");
      b2Modes.set(id,{mode:"b2",quote:quote.resultado,period:period});
    }catch(error){
      if(b2Modes.get(id)?.mode!=="global")b2Modes.set(id,{mode:"unverified"});
      console.warn("GOXION · cotización B2 no verificada",String(error?.message||error));
    }
    applyCards();
  }
  function queueB2(){
    if(b2QueueTimer)return;
    b2QueueTimer=setTimeout(function(){
      b2QueueTimer=0;
      if(!verified||b2Busy>=3)return;
      var items=Object.values(typeof clientesDict!=="undefined"?clientesDict:{}).filter(function(c){
        return !!c?.estado_cuenta && !b2Requested.has(clientId(c)) && /^[0-9a-f-]{36}$/i.test(clientId(c));
      });
      items.slice(0,3-b2Busy).forEach(function(c){
        b2Busy++;
        inspectB2(c,false).finally(function(){b2Busy--;queueB2();});
      });
    },250);
  }
  function b2Model(c){
    var b=b2Modes.get(clientId(c));
    if(b?.mode!=="b2"||b.period!==currentPeriod(c))return null;
    var rows=b.quote.cargos.map(function(x){
      var protectedDue=x.prorroga_estado==="aprobada"&&DAY.test(String(x.fecha_pactada||""))&&Number(x.mora_centavos||0)<=0;
      var due=protectedDue?x.fecha_pactada:String(x.vence||"");
      return Object.assign({},x,{effective_due:due});
    }).filter(function(x){return x.pagado!==true&&Number(x.total_centavos||0)>0;});
    var now=today();
    var late=rows.filter(function(x){return DAY.test(x.effective_due)&&x.effective_due<now;});
    var agreed=rows.filter(function(x){
      return x.prorroga_estado==="aprobada"&&DAY.test(String(x.fecha_pactada||""))&&x.fecha_pactada>=now&&Number(x.mora_centavos||0)<=0;
    });
    var missed=late.some(function(x){return DAY.test(String(x.fecha_pactada||""))&&x.fecha_pactada<now;});
    return {rows:rows,late:late,agreed:agreed,missed:missed,period:b.quote.periodo};
  }
  function b2Context(c){
    var model=b2Model(c);if(!model||!model.late.length)return c;
    var sum=function(field){return model.late.reduce(function(n,x){return n+Number(x[field]||0);},0);};
    var earliest=model.late.map(function(x){return x.effective_due;}).sort()[0];
    var lateDays=Math.max(0,Math.floor((Date.parse(today()+"T12:00:00")-Date.parse(earliest+"T12:00:00"))/86400000));
    var mora=sum("mora_centavos")/100,abonos=sum("abono_pagado_centavos")/100;
    var total=sum("total_centavos")/100,base=sum("base_centavos")/100;
    var desc=(sum("descuento_centavos")+sum("descuento_comercial_centavos"))/100;
    var ajustes=Math.round((total-(base-desc+mora-abonos))*100)/100;
    var breakdown=[
      {concepto:"Subtotal",monto:base},
      {concepto:"Descuentos",monto:-desc},
      {concepto:"Abonos aprobados",monto:-abonos},
      {concepto:"Mora",monto:mora},
      {concepto:"Otros ajustes",monto:ajustes}
    ].filter(function(x){return x.concepto==="Subtotal"||Math.abs(x.monto)>.001;});
    return Object.assign({},c,{estado_cuenta:{
      estado:"vencido",periodo_label:c.estado_cuenta?.periodo_label||currentPeriod(c),
      dias_atraso:lateDays,total_actual:total,subtotal:base,desglose:breakdown,
      descuentos:{total:desc},cargos:{mora:mora,total:mora}
    }});
  }
  function agreementFor(c){
    if(!verified||!c)return null;
    var b2=b2Model(c);
    if(b2){
      var agreed=b2.agreed[0];
      return agreed?{kind:"active",record:{id:String(agreed.cargo_id||""),fecha_pactada:agreed.fecha_pactada}}:null;
    }
    var id=clientId(c),period=currentPeriod(c),now=today();
    var candidates=agreements.filter(function(a){
      return String(a.cliente_id)===id &&
        String(a.fecha_original||"").slice(0,7)===period &&
        DAY.test(String(a.fecha_pactada||"")) &&
        !a.liquidado && !a.cumplida &&
        ["aprobada","activo"].includes(String(a.estado||"").toLowerCase());
    });
    candidates.sort(function(a,b){return String(b.solicitado_en||"").localeCompare(String(a.solicitado_en||""));});
    var active=candidates.find(function(a){return a.fecha_pactada>=now;});
    return active?{kind:"active",record:active}:candidates.length?{kind:"lapsed",record:candidates[0]}:null;
  }
  function effectiveStatus(c){
    var ec=c?.estado_cuenta;
    if(!verified||!ec)return "unverified";
    var b=b2Modes.get(clientId(c));
    if((/^[0-9a-f-]{36}$/i).test(clientId(c))&&(!b||b.mode==="unverified"))return "unverified";
    if(b?.mode==="b2"){
      var model=b2Model(c);
      if(!model)return "unverified";
      if(model.late.length)return model.missed?"missed":"overdue";
      return model.agreed.length?"agreed":"normal";
    }
    if(c.estado==="suspendido"||c.pago_en_revision||ec.estado==="revision"||ec.estado==="pagado"||ec.esta_pagado_periodo===true)return "normal";
    var a=agreementFor(c);
    if(a?.kind==="active")return "agreed";
    if(String(ec.estado).toLowerCase()==="vencido"&&amount(ec.total_actual)>0){
      return a?.kind==="lapsed"?"missed":"overdue";
    }
    return "normal";
  }
  function text(node,textValue){if(node)node.textContent=textValue;}
  function updateOne(card){
    var key=card.dataset.clientKey,c=getClient(key);
    if(!c)return;
    var status=effectiveStatus(c),a=agreementFor(c);
    var primary=card.querySelector(".gx-client-payment-primary strong");
    var secondary=card.querySelector(".gx-client-payment-primary small");
    var badge=card.querySelector(".client-status-badge");
    if(!Object.prototype.hasOwnProperty.call(card.dataset,"gxReminderOriginalPrimary")){
      card.dataset.gxReminderOriginalPrimary=primary?.textContent||"";
      card.dataset.gxReminderOriginalSecondary=secondary?.textContent||"";
      card.dataset.gxReminderOriginalBadge=badge?.textContent||"";
    }
    var ctx=b2Context(c);
    var signature=[status,a?.record?.id||"",String(ctx.estado_cuenta?.total_actual||"")].join("|");
    if(card.dataset.gxReminderSignature===signature)return;
    card.dataset.gxReminderSignature=signature;
    text(primary,card.dataset.gxReminderOriginalPrimary);
    text(secondary,card.dataset.gxReminderOriginalSecondary);
    text(badge,card.dataset.gxReminderOriginalBadge);
    if(!Object.prototype.hasOwnProperty.call(card.dataset,"gxReminderOriginalAmount")){
      card.dataset.gxReminderOriginalAmount=card.querySelector(".gx-client-money strong")?.textContent||"";
    }
    text(card.querySelector(".gx-client-money strong"),card.dataset.gxReminderOriginalAmount);
    card.classList.remove("gx-reminder-agreed","gx-reminder-overdue","gx-reminder-missed","gx-reminder-unverified");
    card.querySelector(".gx-reminder-action")?.remove();
    if(status==="unverified"){
      card.classList.add("gx-reminder-unverified");
      return;
    }
    if(status==="agreed"){
      card.classList.add("gx-reminder-agreed");
      var quote=b2Model(c);
      if(quote?.rows?.length){
        var ordered=quote.rows.slice().sort(function(x,y){return x.effective_due.localeCompare(y.effective_due);});
        var first=ordered[0].effective_due;
        var nextAmount=ordered.filter(function(x){return x.effective_due===first;})
          .reduce(function(sum,x){return sum+Number(x.total_centavos||0);},0);
        text(card.querySelector(".gx-client-money strong"),money(nextAmount/100));
      }
      text(card.querySelector(".gx-client-payment-primary strong"),"Acuerdo pactado");
      text(card.querySelector(".gx-client-payment-primary small"),"Nueva fecha · "+dateLabel(a.record.fecha_pactada));
      text(card.querySelector(".client-status-badge"),"PRÓRROGA ACTIVA");
      card.querySelector(".gx-client-brief .gx-client-preview-meta")?.setAttribute("data-gx-agreed","true");
      return;
    }
    if(status!=="overdue"&&status!=="missed")return;
    card.classList.add(status==="missed"?"gx-reminder-missed":"gx-reminder-overdue");
    if(b2Model(c))text(card.querySelector(".gx-client-money strong"),money(ctx.estado_cuenta.total_actual));
    if(status==="missed"){
      text(card.querySelector(".gx-client-payment-primary strong"),"Prórroga incumplida");
      text(card.querySelector(".client-status-badge"),"ACUERDO INCUMPLIDO");
    }
    var footer=card.querySelector(".gx-client-brief-footer");
    if(!footer)return;
    var button=document.createElement("button");
    button.type="button";button.className="gx-reminder-action";
    button.setAttribute("aria-label","Enviar recordatorio a "+String(c.nombre||"cliente"));
    button.textContent="↗ Enviar recordatorio";
    button.addEventListener("click",function(event){
      event.preventDefault();event.stopPropagation();
      var actual=getClient(key);
      if(!actual||!["overdue","missed"].includes(effectiveStatus(actual))){
        applyCards();
        alert("El estado financiero de este cliente ya no permite enviar el recordatorio. Actualiza Admin.");
        return;
      }
      // Solo datos financieros previamente validados por el servidor.
      var context=b2Context(actual);
      openReminder(context);
    });
    footer.insertAdjacentElement("afterend",button);
  }
  function applyCards(){
    document.querySelectorAll("#clients-container .client-card[data-client-key]").forEach(updateOne);
  }
  function phoneFor(c){
    var id=clientId(c);
    var state=window.gxRegistrationState;
    var identity=state?.clientes?.find(function(row){return String(row.id)===id;});
    var raw=String(identity ? (identity.telefono_normalizado||"") : (c?.telefono_normalizado||"")).replace(/\D/g,"");
    if(raw.length===10)raw="52"+raw;
    if(raw.length===13&&raw.startsWith("521"))raw="52"+raw.slice(3);
    return /^52\d{10}$/.test(raw)?raw:"";
  }
  function messageFor(c){
    var ec=c.estado_cuenta,days=Number(ec.dias_atraso||0),mora=amount(ec.cargos?.mora);
    var lines=[
      "¡Hola, "+String(c.nombre||"")+"! 👋🏻💜",
      "",
      "Esperamos que te encuentres muy bien. 😊",
      "",
      "Queremos recordarte que tu fecha de pago ya pasó y actualmente tu cuenta presenta un saldo pendiente de *"+money(ec.total_actual)+"*."
    ];
    if(days>0)lines.push("Tu pago lleva "+days+" día"+(days===1?"":"s")+" de atraso.");
    if(mora>0)lines.push("Este importe incluye *"+money(mora)+"* de recargos generados por el atraso.");
    lines.push(
      "",
      "Te invitamos a ingresar a *Mi Espacio GOXION*, donde puedes consultar tu estado de cuenta actualizado:",
      "🔗 "+SPACE_URL,
      "",
      "✨ *¡Queremos ayudarte a que no pagues de más!* Te recomendamos estar pendiente de tus próximas fechas de pago para evitar recargos adicionales.",
      "",
      "Sabemos que a veces las fechas se nos pueden pasar. ¡Gracias por seguir formando parte de GOXION! 💜"
    );
    return lines.join("\n");
  }
  function getNoPhoneDialog(){
    if(noPhoneDialog)return noPhoneDialog;
    noPhoneDialog=document.createElement("dialog");
    noPhoneDialog.className="gx-reminder-no-phone-dialog";
    noPhoneDialog.setAttribute("aria-labelledby","gx-reminder-no-phone-title");
    noPhoneDialog.innerHTML=
      '<div class="gx-reminder-no-phone-sheet">'+
        '<header><div><small>GOXION · RECORDATORIOS</small><h2 id="gx-reminder-no-phone-title">Sin número registrado</h2></div>'+
        '<button type="button" class="gx-reminder-no-phone-close" aria-label="Cerrar">×</button></header>'+
        '<p>Este cliente aún no tiene un número de WhatsApp guardado. Puedes seleccionar su conversación desde WhatsApp y enviar el mensaje preparado.</p>'+
        '<div class="gx-reminder-no-phone-actions">'+
          '<button type="button" class="gx-reminder-no-phone-cancel">Cancelar</button>'+
          '<button type="button" class="gx-reminder-no-phone-share">Elegir contacto en WhatsApp ↗</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(noPhoneDialog);
    var close=function(){noPhoneDialog.close();};
    noPhoneDialog.querySelector(".gx-reminder-no-phone-close").addEventListener("click",close);
    noPhoneDialog.querySelector(".gx-reminder-no-phone-cancel").addEventListener("click",close);
    noPhoneDialog.addEventListener("click",function(e){if(e.target===noPhoneDialog)close();});
    return noPhoneDialog;
  }
  function shareWithoutPhone(message){
    var url="https://api.whatsapp.com/send?text="+encodeURIComponent(message);
    if(typeof navigator.share!=="function"){
      window.open(url,"_blank","noopener,noreferrer");
      return;
    }
    // navigator.share debe ejecutarse directamente en un toque del usuario (Safari iOS).
    navigator.share({text:message}).catch(function(error){
      if(error?.name==="AbortError")return;
      // Solo una alternativa; no se promete que WhatsApp esté instalado.
      window.location.href=url;
    });
  }
  function openReminder(c){
    var message=messageFor(c),phone=phoneFor(c);
    if(phone){
      // Una pulsación: abre exactamente el chat registrado con el mensaje listo.
      window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),
        "_blank","noopener,noreferrer");
      return;
    }
    var dialog=getNoPhoneDialog();
    var share=dialog.querySelector(".gx-reminder-no-phone-share");
    share.onclick=function(){
      dialog.close();
      shareWithoutPhone(message);
    };
    if(!dialog.open)dialog.showModal();
  }
  function setup(){
    var base=window.renderizarClientes;
    if(typeof base==="function"){
      window.renderizarClientes=function(dic){var result=base.apply(this,arguments);applyCards();queueB2();return result;};
    }
    var container=document.getElementById("clients-container");
    if(container){
      var scheduled=false;
      new MutationObserver(function(mutations){
        if(scheduled||!mutations.some(function(m){return m.addedNodes.length||m.removedNodes.length;}))return;
        scheduled=true;
        queueMicrotask(function(){scheduled=false;applyCards();});
      }).observe(container,{childList:true,subtree:true});
    }
    updateAgreements(false).then(function(){queueB2();});
    applyCards();
    window.addEventListener("focus",function(){updateAgreements(true);});
    document.addEventListener("visibilitychange",function(){if(!document.hidden)updateAgreements(true);});
  }
  window.GOXION_ADMIN_REMINDERS={
    refresh:function(){return updateAgreements(true);},
    verifyClient:function(key){return inspectB2(getClient(key),true);},
    status:effectiveStatus,
    quoteForReminder:b2Context,
    messageFor:messageFor,
    phoneFor:phoneFor
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();
