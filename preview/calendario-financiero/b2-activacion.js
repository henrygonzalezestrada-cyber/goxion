/* GOXION Admin · Activación B2 en el calendario ya existente. */
(()=>{
"use strict";
const panel=document.getElementById("servicesPanel"),select=document.getElementById("client"),
 status=document.getElementById("calendarStatus"),workspace=document.getElementById("workspace");
if(!panel||!select||!status||!workspace)return;
const url="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/acciones-financieras-b2-beta";
const uuid=/^[0-9a-f-]{36}$/i;
const root=document.createElement("div");root.className="gx-b2-activation";root.hidden=true;
root.innerHTML='<div class="gx-b2-row"><div class="gx-b2-label"><strong>Cobro por perfil</strong>'+
 '<small id="gx-b2-info" role="status" aria-live="polite">Consultando fechas…</small></div>'+
 '<button type="button" id="gx-b2-open" disabled>Activar</button></div>'+
 '<div id="gx-b2-confirm" class="gx-b2-confirm" hidden><p id="gx-b2-detail"></p>'+
 '<label class="gx-b2-agree"><input id="gx-b2-check" type="checkbox">'+
 '<span>Confirmo las fechas y coberturas, y autorizo el cobro por perfil para este cliente.</span></label>'+
 '<div class="gx-b2-actions"><button id="gx-b2-cancel" type="button">Cancelar</button>'+
 '<button id="gx-b2-submit" type="button" disabled>Confirmar activación</button></div></div>';
panel.appendChild(root);
const style=document.createElement("style");
style.textContent='.gx-b2-activation{margin-top:10px;padding:12px;border:1px solid rgba(85,196,222,.23);border-radius:13px;background:linear-gradient(110deg,rgba(90,69,163,.13),rgba(34,181,203,.06))}'+
'.gx-b2-activation[hidden],.gx-b2-confirm[hidden]{display:none}.gx-b2-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.gx-b2-label{display:flex;flex-direction:column;gap:3px;min-width:0}'+
'.gx-b2-label strong{font-size:14px;color:#eaf5ff}.gx-b2-label small{font-size:12px;color:#a9b8d0;line-height:1.35}'+
'#gx-b2-open,#gx-b2-submit{border:0;border-radius:10px;background:linear-gradient(110deg,#7869e9,#3fc7d8);color:white;font-size:12px;font-weight:700;padding:9px 12px}'+
'#gx-b2-open:disabled,#gx-b2-submit:disabled{opacity:.4;cursor:not-allowed}'+
'.gx-b2-confirm{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;color:#bfd0e9;line-height:1.45}'+
'.gx-b2-confirm p{margin:0 0 9px}.gx-b2-agree{display:flex;align-items:flex-start;gap:8px}.gx-b2-agree input{flex:none;width:17px;height:17px;margin:1px 0 0;accent-color:#9176f5}'+
'.gx-b2-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:11px}'+
'#gx-b2-cancel{padding:8px 11px;border:1px solid rgba(205,212,236,.19);border-radius:10px;background:rgba(30,34,52,.7);font-size:12px}';
document.head.appendChild(style);
const msg=root.querySelector("#gx-b2-info"),open=root.querySelector("#gx-b2-open"),
 conf=root.querySelector("#gx-b2-confirm"),detail=root.querySelector("#gx-b2-detail"),
 check=root.querySelector("#gx-b2-check"),submit=root.querySelector("#gx-b2-submit");
let info=null,busy=false,serial=0,timer=null;
const id=()=>String(select.value||"");
const unsaved=()=>/cambios sin guardar/i.test(status.textContent||"");
const close=()=>{conf.hidden=true;check.checked=false;submit.disabled=true;open.setAttribute("aria-expanded","false")};
async function request(accion,datos){
 const token=localStorage.getItem("GOXION_ADMIN_TOKEN")||"";
 if(!token)throw Error("Inicia sesión en Admin.");
 const resp=await fetch(url,{method:"POST",cache:"no-store",
  headers:{"Content-Type":"application/json","X-Admin-Token":token},
  body:JSON.stringify({accion,datos})});
 const body=await resp.json().catch(()=>({}));
 if(!resp.ok||body.ok!==true)throw Error(body.error||"No se pudo consultar B2.");
 return body;
}
function render(data){
 const active=data.regimen_activo===true;
 const ready=data.listo_para_activar===true&&!active&&!unsaved();
 open.disabled=busy||!ready;open.textContent=active?"Activo":"Activar";
 msg.textContent=active?"Activo · Selección por perfil habilitada":
  unsaved()?"Guarda los cambios de fechas antes de activar":
  ready?data.perfiles_verificados+" perfiles verificados · Listo para activar":
  (data.motivos||[]).join(" · ")||"Completa la configuración de fechas";
 if(!ready)close();
}
async function refresh(){
 const clientId=id(),generation=++serial;
 if(!uuid.test(clientId)||workspace.classList.contains("hidden")){
   root.hidden=true;info=null;close();return;
 }
 root.hidden=false;
 if(busy)return;
 open.disabled=true;msg.textContent="Verificando el calendario…";close();
 try{
   const data=await request("b2_estado_activacion",{cliente_id:clientId});
   if(generation!==serial||id()!==clientId)return;
   info=data;render(data);
 }catch(e){
   if(generation!==serial)return;
   info=null;open.disabled=true;msg.textContent=e?.message||"No se pudo consultar";
 }
}
const queue=()=>{clearTimeout(timer);timer=setTimeout(refresh,280)};
select.addEventListener("change",queue);
new MutationObserver(queue).observe(status,{childList:true,characterData:true,subtree:true,
 attributes:true,attributeFilter:["data-saved"]});
const services=document.getElementById("services");
services?.addEventListener("change",()=>{open.disabled=true;close()},true);
services?.addEventListener("click",e=>{if(e.target.closest?.("[data-save]"))setTimeout(queue,650)});
open.addEventListener("click",()=>{
 if(open.disabled||!info||unsaved())return;
 close();conf.hidden=false;open.setAttribute("aria-expanded","true");
 detail.textContent=info.perfiles_verificados+" perfiles, "+info.fechas_distintas+
  " fechas distintas. Período "+info.periodo+
  ". Se prepararán cargos individuales; no se marcará ningún pago como realizado.";
});
root.querySelector("#gx-b2-cancel").addEventListener("click",close);
check.addEventListener("change",()=>submit.disabled=!check.checked||busy);
submit.addEventListener("click",async()=>{
 const clientId=id(),periodo=info?.periodo;
 if(busy||!info?.listo_para_activar||!check.checked||unsaved()||
  !uuid.test(clientId)||!/^\d{4}-\d{2}-01$/.test(periodo))return;
 busy=true;submit.disabled=true;submit.textContent="Activando…";
 try{
   const before=await request("b2_estado_activacion",{cliente_id:clientId});
   if(id()!==clientId||!before.listo_para_activar||before.periodo!==periodo)
     throw Error("El calendario cambió. Revisa las fechas.");
   const applied=await request("b2_activar_cliente",{
    cliente_id:clientId,periodo,confirmar_activacion:true});
   if(applied.resultado?.regimen_activo!==true)
     throw Error("El servidor no confirmó la activación.");
   const after=await request("b2_estado_activacion",{cliente_id:clientId});
   if(after.regimen_activo!==true)throw Error("No se pudo verificar el nuevo régimen.");
   if(id()===clientId){
     info=after;close();render(after);
     const note=document.getElementById("calendarNotice");
     if(note){note.textContent="✓ Cobro por perfil activado. El cliente puede elegir su pago en Index.";
      note.dataset.kind="success";note.classList.remove("hidden")}
   }
 }catch(e){close();msg.textContent=e?.message||"No se pudo activar B2.";}
 finally{busy=false;submit.textContent="Confirmar activación";queue();}
});
document.addEventListener("DOMContentLoaded",queue,{once:true});
queue();
})();