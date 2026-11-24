/* GOXION · Puente administrativo de experiencia de servicio. Sin motor financiero nuevo. */
(()=>{
"use strict";
const gx=window.GOXION_CORE;if(!gx)return;
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem(gx.STORAGE.ADMIN_TOKEN)||"";
async function request(accion,datos={}){
 const session=token();if(!session)throw Error("Inicia sesión en Admin.");
 const res=await fetch(gx.endpoint("experiencia-servicio-admin"),{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","X-Admin-Token":session},body:JSON.stringify({accion,datos})});
 const json=await res.json().catch(()=>({}));if(token()!==session)throw Error("La sesión cambió.");if(!res.ok||json.ok!==true)throw Error(json.error||"No se pudo completar la solicitud.");return json;
}
window.GOXION_ADMIN_EXPERIENCE=Object.freeze({request});
const list=$("gx-tj-reports-list"),status=$("gx-tj-reports-status");if(!list||!status)return;
const labels={interrumpido:"Servicio interrumpido",frecuente:"Fallas frecuentes",sin_acceso:"Sin acceso a la plataforma",otro:"Otra afectación"};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const date=v=>String(v||"").slice(0,10);
const btn=(label,fn)=>{const n=el("button","",label);n.type="button";n.addEventListener("click",async()=>{if(n.disabled)return;n.disabled=true;try{await fn()}catch(e){status.textContent=e.message||"No se pudo completar la acción."}finally{n.disabled=false}});return n};
let revision=0;
async function change(action,id,datos={}){await request(action,{id,...datos});await load()}
function field(form,label,type,value){
 const l=el("label","gx-tj-field"),caption=el("span","",label),input=el(type==="textarea"?"textarea":"input");
 if(type!=="textarea")input.type=type;input.value=value||"";input.required=true;l.append(caption,input);form.append(l);return input;
}
function verifyForm(r,card){
 const form=el("form","gx-tj-report-verify");form.hidden=true;
 const period=field(form,"Periodo de compensación","month",date(r.afectacion_desde).slice(0,7));
 const from=field(form,"Desde (verificado)","date",date(r.afectacion_desde));
 const until=field(form,"Hasta (verificado)","date",date(r.afectacion_desde));
 const days=field(form,"Días completos verificados","number","");days.min="1";days.max="10";days.step="1";
 const proof=field(form,"Evidencia de verificación","textarea","");proof.minLength=12;proof.maxLength=1500;proof.rows=2;
 const l=el("label","gx-tj-report-origin"),check=el("input");check.type="checkbox";check.required=true;l.append(check,document.createTextNode(" Confirmo que la afectación es atribuible a GOXION."));form.append(l);
 const save=el("button","gx-primary-action","Validar incidencia");save.type="submit";form.append(save);
 form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;try{await change("validar",r.id,{periodo:period.value,desde:from.value,hasta:until.value,dias:Number(days.value),evidencia:proof.value,origen:check.checked?"goxion":""})}catch(e){status.textContent=e.message}finally{save.disabled=false}});
 card.append(form);return form;
}
function openComp(r){
 const found=Object.entries(typeof clientesDict!=="undefined"?clientesDict:{}).find(([,c])=>String(c._id||c.id)===String(r.cliente_id));
 if(!found)throw Error("Actualiza los clientes antes de abrir la compensación.");
 const [key,c]=found,idx=(c.servicios||[]).findIndex(s=>String(s._id||s.id)===String(r.cliente_servicio_id));
 if(idx<0)throw Error("El servicio ya no está disponible en la ficha. Revisa el caso manualmente.");
 const i=r.incidencia,existing=(c.trato_justo_compensaciones||[]).find(x=>String(x.cliente_servicio_id)===String(r.cliente_servicio_id)&&String(x.periodo).slice(0,7)===String(i.periodo).slice(0,7)&&x.activo!==false);
 if(existing&&Number(existing.dias_falla)!==Number(i.dias_completos_verificados))throw Error("Ya existe una compensación distinta para este periodo. Revisa la ficha antes de modificarla.");
 window.gxOpenTratoJusto(key,idx,{periodo:String(i.periodo).slice(0,7),dias:Number(i.dias_completos_verificados),motivo:({frecuente:"Intermitencia prolongada",sin_acceso:"Acceso no disponible"})[r.motivo]||"Falla técnica"});
}
function cardFor(r){
 const card=el("article","gx-rb-admin-card");card.dataset.reportId=r.id;
 const head=el("div","gx-rb-admin-card-head"),main=el("div"),name=el("div","gx-rb-admin-card-title",r.plataforma||"Servicio");
 main.append(name,el("div","gx-rb-admin-card-meta",[r.clientes?.nombre,r.clientes?.folio].filter(Boolean).join(" · ")));
 const validated=r.incidencia?.estado==="validada";
 head.append(main,el("span","gx-rb-status "+(validated?"published":"pending"),validated?"Verificada":r.estado==="en_revision"?"En revisión":"Pendiente"));card.append(head);
 card.append(el("p","",labels[r.motivo]||"Afectación reportada"),el("div","gx-rb-admin-card-meta","Desde "+date(r.afectacion_desde)));
 if(r.descripcion)card.append(el("p","",r.descripcion));
 const actions=el("div","gx-rb-admin-actions");card.append(actions);
 if(validated){
  card.append(el("div","gx-rb-admin-card-meta",r.incidencia.dias_completos_verificados+" días verificados · "+String(r.incidencia.periodo).slice(0,7)));
  actions.append(btn("Abrir compensación",()=>openComp(r)),btn("Vincular y cerrar",async()=>{if(confirm("¿Vincular la compensación activa de este periodo y cerrar el reporte?"))await change("cerrar",r.id)}));
 }else{
  if(r.estado==="pendiente")actions.append(btn("Iniciar revisión",()=>change("revisar",r.id)));
  else{const f=verifyForm(r,card);actions.append(btn("Verificar afectación",()=>{f.hidden=!f.hidden;if(!f.hidden)f.querySelector("input")?.focus()}))}
  actions.append(btn("No procede",async()=>{if(confirm("¿Cerrar el reporte sin compensación?"))await change("descartar",r.id)}));
 }
 return card;
}
async function load(focus=""){
 const rev=++revision;status.textContent="Consultando reportes…";list.replaceChildren();
 try{const result=await request("reportes");if(rev!==revision)return;
 const rows=result.reportes||[];rows.forEach(r=>list.append(cardFor(r)));status.textContent=rows.length?rows.length+" por atender"+(result.limitado?" · listado limitado":""):"Sin reportes pendientes.";
 if(focus){const n=[...list.children].find(n=>n.dataset.reportId===focus);if(n)n.scrollIntoView({behavior:"smooth",block:"center"});else status.textContent+=" El reporte seleccionado ya no está pendiente."}
 }catch(e){if(rev===revision)status.textContent=e.message}
}
$("gx-tj-reports-refresh")?.addEventListener("click",()=>load());
const view=list.closest("[data-settings-view]");if(view){const observer=new MutationObserver(()=>{if(view.classList.contains("active")&&!view.hidden)void load()});observer.observe(view,{attributes:true,attributeFilter:["class","hidden"]})}
const old=window.gxOpenNotificationClient;
window.gxOpenNotificationClient=function(key,tipo,id=""){
 const n=(window.gxAdminNotifications||[]).find(x=>String(x.id)===String(id));
 if(String(n?.referencia||"")==="trato-justo:"+id){window.gxToggleNotifications?.(false);window.gxOpenManagementDestination?.("fairdeal");void load(id);return}
 return old?.apply(this,arguments);
};
window.gxLoadFairDealReports=load;
})();