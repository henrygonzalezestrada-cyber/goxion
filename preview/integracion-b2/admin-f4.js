/* GOXION F4 · distintivo y reintentos sin modificar la ficha nativa */
(()=>{
 "use strict";
 if(!window.GOXION_B2_ADMIN_MIRROR?.writeLegacyBlocked)return;
 const core=window.GOXION_CORE;
 const localeDate=(value)=>{
  const s=String(value||"");
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"—";
 };
 const meridaToday=()=>{
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Merida",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=t=>parts.find(x=>x.type===t)?.value||"00";
  return part("year")+"-"+part("month")+"-"+part("day");
 };
 async function action(accion,datos={}){
  const token=localStorage.getItem(core.STORAGE.ADMIN_TOKEN)||"";
  if(!token)throw Error("Sesión Admin no disponible");
  const r=await fetch(core.endpoint("acciones-financieras-b2-beta"),{
    method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json","X-Admin-Token":token},
    body:JSON.stringify({accion,datos})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw Error(j.error||"F4 temporalmente no disponible");
  return j;
 }
 const banner=()=>{
  const head=document.querySelector("#gx-client-focus .gx-focus-identity");
  if(!head)return null;
  let tag=head.querySelector("[data-gx-b2-f4-status]");
  if(!tag){
   tag=document.createElement("small");
   tag.dataset.gxB2F4Status="1";
   tag.style.cssText="display:none;width:max-content;max-width:100%;padding:4px 10px;border-radius:99px;border:1px solid rgba(91,211,255,.34);background:rgba(87,129,255,.13);color:#b9edff;font-size:11px;font-weight:700;letter-spacing:.01em;line-height:1.3;margin-top:5px";
   head.appendChild(tag);
  }
  return tag;
 };
 let generation=0;
 async function update(key){
  const seq=++generation;
  const tag=banner();if(!tag)return;
  tag.style.display="none";tag.textContent="";
  const c=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
  const clientId=String(c?._id||c?.id||"");
  if(!/^[0-9a-f-]{36}$/i.test(clientId))return;
  try{
   const response=await action("b2_listar_prorrogas",{cliente_id:clientId});
   if(seq!==generation)return;
   const now=meridaToday();
   const agreement=(response.solicitudes||[]).find(x=>x.estado==="aprobada");
   if(!agreement)return;
   let caption="";
   if(agreement.cumplida===true)caption="✓ Prórroga cumplida";
   else if(agreement.liquidado===true)caption="Prórroga liquidada";
   else if(String(agreement.fecha_pactada||"")<now)
     caption="⚠ Prórroga incumplida · "+localeDate(agreement.fecha_pactada);
   else caption="Prórroga hasta "+localeDate(agreement.fecha_pactada);
   tag.textContent=caption;tag.style.display="inline-block";
   tag.setAttribute("aria-label",caption);
   tag.title="Acuerdo registrado automáticamente, sin aprobación manual";
  }catch(e){
   if(seq===generation){tag.style.display="none";console.warn("B2 F4 estado no disponible",e)}
  }
 }
 const originalFocus=window.gxOpenClientFocus;
 if(typeof originalFocus==="function"){
  window.gxOpenClientFocus=function(key,...args){
   const rv=originalFocus.call(this,key,...args);
   void update(key);
   return rv;
  };
 }
 // Reintentar la cola al abrir la campana: usa el gateway autenticado,
 // nunca el navegador como portador de secretos Discord.
 let pending=false;
 const oldToggle=window.gxToggleNotificationsBase;
 if(typeof oldToggle==="function"){
  window.gxToggleNotificationsBase=function(force,...args){
   const rv=oldToggle.call(this,force,...args);
   const open=document.getElementById("gx-notification-drawer")?.classList.contains("show");
   if(open&&!pending){
    pending=true;
    action("b2_f4_reintentar_discord").catch(e=>console.warn("B2 F4 Discord pendiente",e))
      .finally(()=>{pending=false});
   }
   return rv;
  };
 }
})();