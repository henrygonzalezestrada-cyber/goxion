/* GOXION Admin · Recordatorios inteligentes (solo lectura del motor de cobro).
 * El estado financiero y las prorrogas se consultan a los endpoints existentes.
 * Compartir archivos via Web Share no puede preseleccionar el chat de WhatsApp.
 */
(function(){
  "use strict";
  var CORE=window.GOXION_CORE;
  var AGREEMENTS_URL=CORE&&CORE.endpoint("acciones-financieras-b2-beta");
  var SPACE_URL="https://henrygonzalezestrada-cyber.github.io/goxion/ayuda.html";
  var agreements=[], verified=false, loadedAt=0, pending=null, modal=null, shareFile=null, shareMessage="", objectUrl="";
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
  function agreementFor(c){
    if(!verified||!c)return null;
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
    var signature=[status,a?.record?.id||"",String(c.estado_cuenta?.total_actual||"")].join("|");
    if(card.dataset.gxReminderSignature===signature)return;
    card.dataset.gxReminderSignature=signature;
    card.classList.remove("gx-reminder-agreed","gx-reminder-overdue","gx-reminder-missed","gx-reminder-unverified");
    card.querySelector(".gx-reminder-action")?.remove();
    if(status==="unverified"){
      card.classList.add("gx-reminder-unverified");
      return;
    }
    if(status==="agreed"){
      card.classList.add("gx-reminder-agreed");
      text(card.querySelector(".gx-client-payment-primary strong"),"Acuerdo pactado");
      text(card.querySelector(".gx-client-payment-primary small"),"Nueva fecha · "+dateLabel(a.record.fecha_pactada));
      text(card.querySelector(".client-status-badge"),"PRÓRROGA ACTIVA");
      card.querySelector(".gx-client-brief .gx-client-preview-meta")?.setAttribute("data-gx-agreed","true");
      return;
    }
    if(status!=="overdue"&&status!=="missed")return;
    card.classList.add(status==="missed"?"gx-reminder-missed":"gx-reminder-overdue");
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
    button.addEventListener("click",async function(event){
      event.preventDefault();event.stopPropagation();
      button.disabled=true;button.textContent="Verificando…";
      try{
        if(!(await updateAgreements(true)))throw new Error("No se pudo comprobar si existe una prórroga vigente.");
        var actual=getClient(key);
        if(!actual||!["overdue","missed"].includes(effectiveStatus(actual))){
          applyCards();throw new Error("El estado del cliente cambió. Actualiza su cuenta antes de continuar.");
        }
        prepareReminder(key,actual);
      }catch(err){alert(err?.message||"No se pudo preparar el recordatorio.");}
      finally{button.disabled=false;button.textContent="↗ Enviar recordatorio";}
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
    var raw=String(identity?.telefono_normalizado||c?.telefono_normalizado||"").replace(/\D/g,"");
    if(raw.length===10)raw="52"+raw;
    if(raw.length===13&&raw.startsWith("521"))raw="52"+raw.slice(3);
    return /^52\d{10}$/.test(raw)?raw:"";
  }
  function messageFor(c){
    var ec=c.estado_cuenta,days=Number(ec.dias_atraso||0);
    var lines=[
      "¡Hola, "+String(c.nombre||"")+"! 👋🏻💜",
      "",
      "Esperamos que te encuentres muy bien. 😊",
      "",
      "Queremos recordarte que tu fecha de pago ya pasó y actualmente tu cuenta presenta un saldo pendiente de *"+money(ec.total_actual)+"*, incluyendo los recargos que correspondan.",
      "",
      "Te invitamos a ingresar a *Mi Espacio GOXION* para consultar tu estado de cuenta actualizado:",
      "🔗 "+SPACE_URL,
      "",
      "✨ *¡Queremos ayudarte a que no pagues de más!* Te recomendamos estar pendiente de tus próximas fechas de pago para evitar cargos adicionales.",
      "",
      "Sabemos que a veces las fechas se nos pasan. ¡Gracias por formar parte de GOXION! 💜"
    ];
    if(days>0)lines.splice(4,0,"Tu pago lleva "+days+" día"+(days===1?"":"s")+" de atraso.");
    return lines.join("\n");
  }
  function round(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function block(ctx,x,y,w,h,r,fill,stroke){
    round(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function label(ctx,str,x,y,size,color,weight){
    ctx.textAlign="left";ctx.textBaseline="alphabetic";
    ctx.font=(weight||"500")+" "+size+"px Poppins, Arial, sans-serif";
    ctx.fillStyle=color;ctx.fillText(String(str),x,y);
  }
  function fit(ctx,value,width){
    var str=String(value||"");
    while(str.length>1&&ctx.measureText(str).width>width)str=str.slice(0,-2)+"…";
    return str;
  }
  function paint(c){
    var ec=c.estado_cuenta,canvas=document.createElement("canvas");
    canvas.width=1000;canvas.height=1220;
    var ctx=canvas.getContext("2d");if(!ctx)throw new Error("No se pudo crear la imagen.");
    var bg=ctx.createLinearGradient(0,0,1000,1220);
    bg.addColorStop(0,"#101021");bg.addColorStop(.5,"#080910");bg.addColorStop(1,"#080813");
    ctx.fillStyle=bg;ctx.fillRect(0,0,1000,1220);
    var glow=ctx.createRadialGradient(790,80,15,790,80,720);
    glow.addColorStop(0,"rgba(105,46,209,.27)");glow.addColorStop(1,"rgba(105,46,209,0)");
    ctx.fillStyle=glow;ctx.fillRect(0,0,1000,800);
    block(ctx,48,44,904,1128,40,"rgba(15,16,27,.96)","rgba(121,130,178,.33)");
    block(ctx,76,76,848,94,20,"rgba(115,96,202,.11)");
    label(ctx,"G O X I O N",103,133,32,"#e9eafa","700");
    label(ctx,"ESTADO DE CUENTA",644,132,20,"#92a0b4","700");
    label(ctx,"CLIENTE",110,246,18,"#7e8aab","600");
    ctx.font="700 53px Poppins, Arial, sans-serif";
    label(ctx,fit(ctx,c.nombre,770),110,313,53,"#ffffff","700");
    label(ctx,String(c.folio||"").toUpperCase(),111,351,19,"#7f94b5","600");
    block(ctx,108,401,246,58,29,"rgba(232,73,115,.12)","rgba(255,125,163,.35)");
    label(ctx,"PAGO VENCIDO",137,441,22,"#ff96ad","700");
    label(ctx,"TOTAL PENDIENTE",111,536,23,"#a9b4cd","600");
    var total=amount(ec.total_actual);
    label(ctx,money(total),105,647,94,"#69e4f6","700");
    var days=Number(ec.dias_atraso||0);
    label(ctx,(days>0?"Vencido hace "+days+" día"+(days===1?"":"s"):"Pago vencido")+" · "+String(ec.periodo_label||currentPeriod(c)),111,699,22,"#b3b4cb","500");
    block(ctx,85,760,830,274,24,"rgba(26,28,45,.94)","rgba(140,158,211,.16)");
    label(ctx,"DESGLOSE DEL COBRO",116,808,22,"#e9eafa","700");
    var items=[
      ["Subtotal",amount(ec.subtotal),false],
      ["Descuentos",amount(ec.descuentos?.total),true],
      ["Mora",amount(ec.cargos?.mora),false],
      ["Otros cargos",Math.max(0,amount(ec.cargos?.total)-amount(ec.cargos?.mora)),false]
    ].filter(function(row){return row[0]==="Subtotal"||row[1]>0;});
    var ypos=852;
    items.forEach(function(row){
      label(ctx,row[0],116,ypos,23,"#a9b4cd","500");
      var value=(row[2]?"−":"")+money(row[1]);
      ctx.font="600 23px Poppins, Arial, sans-serif";
      var width=ctx.measureText(value).width;
      label(ctx,value,887-width,ypos,23,row[2]?"#9ff0c4":row[0]==="Mora"?"#ff9bb0":"#f1f4ff","600");
      ypos+=51;
    });
    ctx.strokeStyle="rgba(139,155,190,.23)";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(103,1066);ctx.lineTo(897,1066);ctx.stroke();
    label(ctx,"Consulta tu información siempre actualizada en Mi Espacio",110,1105,20,"#b5bfd5","500");
    label(ctx,"GOXION · Resumen generado para tu consulta",110,1143,17,"#78879d","500");
    return canvas;
  }
  function fileFromCanvas(canvas,c){
    var data=canvas.toDataURL("image/png").split(",")[1];
    var bin=atob(data),bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    var slug=String(c.folio||"estado-cuenta").replace(/[^a-z0-9_-]/gi,"-").slice(0,35);
    return new File([bytes],"GOXION-"+slug+".png",{type:"image/png"});
  }
  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement("dialog");
    modal.className="gx-reminder-dialog";
    modal.setAttribute("aria-label","Compartir recordatorio de cobro");
    modal.innerHTML='<div class="gx-reminder-sheet"><header><div><small>GOXION · COBRO INTELIGENTE</small><h2>Recordatorio preparado</h2></div><button type="button" class="gx-reminder-close" aria-label="Cerrar">×</button></header><div class="gx-reminder-view"><img alt="Imagen del estado de cuenta que se compartirá"></div><p class="gx-reminder-destination"></p><p class="gx-reminder-hint">WhatsApp permite compartir la imagen, pero la selección automática del chat junto al archivo depende del teléfono y del navegador.</p><div class="gx-reminder-actions"><button type="button" class="gx-reminder-share">Compartir imagen y mensaje</button><button type="button" class="gx-reminder-wa">Abrir WhatsApp con mensaje</button><button type="button" class="gx-reminder-copy">Copiar mensaje</button><button type="button" class="gx-reminder-save">Guardar imagen</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector(".gx-reminder-close").addEventListener("click",function(){modal.close();});
    modal.addEventListener("click",function(e){if(e.target===modal)modal.close();});
    modal.addEventListener("close",function(){document.body.classList.remove("gx-reminder-modal-open");if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";}});
    modal.querySelector(".gx-reminder-share").addEventListener("click",async function(){
      if(!shareFile)return;
      if(typeof navigator.share!=="function"||!navigator.canShare?.({files:[shareFile]})){
        alert("Este dispositivo no permite compartir archivos desde el navegador. Usa Guardar imagen y Abrir WhatsApp.");
        return;
      }
      try{await navigator.share({files:[shareFile],text:shareMessage,title:"GOXION · Estado de cuenta"});}
      catch(e){if(e?.name!=="AbortError")alert("No se pudo compartir el archivo. Puedes guardarlo y abrir WhatsApp por separado.");}
    });
    modal.querySelector(".gx-reminder-copy").addEventListener("click",async function(){
      try{await navigator.clipboard.writeText(shareMessage);text(this,"✓ Mensaje copiado");}
      catch(e){alert("No fue posible copiar automáticamente el texto.");}
    });
    modal.querySelector(".gx-reminder-save").addEventListener("click",function(){
      if(!shareFile)return;
      var url=URL.createObjectURL(shareFile),a=document.createElement("a");
      a.href=url;a.download=shareFile.name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1500);
    });
    return modal;
  }
  function prepareReminder(key,c){
    var box=ensureModal();
    shareMessage=messageFor(c);shareFile=fileFromCanvas(paint(c),c);
    var phone=phoneFor(c);
    var whatsapp="https://wa.me/"+phone+"?text="+encodeURIComponent(shareMessage);
    var wa=box.querySelector(".gx-reminder-wa");
    wa.textContent=phone?"Abrir WhatsApp del cliente":"Elegir contacto en WhatsApp";
    wa.onclick=function(){
      window.open(phone?whatsapp:"https://api.whatsapp.com/send?text="+encodeURIComponent(shareMessage),"_blank","noopener,noreferrer");
    };
    text(box.querySelector(".gx-reminder-destination"),phone?"WhatsApp registrado: +"+phone:"Sin número registrado: selecciona el contacto al compartir.");
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";}
    objectUrl=URL.createObjectURL(shareFile);
    box.querySelector("img").src=objectUrl;
    text(box.querySelector(".gx-reminder-copy"),"Copiar mensaje");
    document.body.classList.add("gx-reminder-modal-open");
    if(!box.open)box.showModal();
  }
  function setup(){
    var base=window.renderizarClientes;
    if(typeof base==="function"){
      window.renderizarClientes=function(dic){var result=base.apply(this,arguments);applyCards();return result;};
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
    updateAgreements(false);
    applyCards();
    window.addEventListener("focus",function(){updateAgreements(true);});
    document.addEventListener("visibilitychange",function(){if(!document.hidden)updateAgreements(true);});
  }
  window.GOXION_ADMIN_REMINDERS={refresh:function(){return updateAgreements(true);},status:effectiveStatus};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();
