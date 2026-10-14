/* GOXION · Mi Espacio: próximo importe real B2, sin alterar fecha única. */
(()=>{
 "use strict";
 const core=window.GOXION_CORE;
 if(!core?.endpoint)return;
 const money=n=>(Number(n)/100).toLocaleString("es-MX",{
  style:"currency",currency:"MXN",minimumFractionDigits:2});
 const niceDate=iso=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
  const [y,m,d]=iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"long",
    timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d)));
 };
 const effective=row=>row.prorroga_estado==="aprobada"&&
  row.fecha_pactada&&Number(row.mora_centavos||0)<=0
   ?String(row.fecha_pactada):String(row.vence||"");
 const nextPayment=quote=>{
  if(quote?.ok!==true||quote?.cobrable!==true||
    !Array.isArray(quote.cargos)||!/^[-0-9a-f]{36}$/i.test(String(quote.ciclo_id||"")))
    return null;
  const pending=quote.cargos.filter(x=>x.pagado!==true&&
    Number.isSafeInteger(Number(x.total_centavos))&&Number(x.total_centavos)>0&&
    /^\d{4}-\d{2}-\d{2}$/.test(effective(x)))
   .sort((a,b)=>effective(a).localeCompare(effective(b)));
  if(!pending.length)return {amount:0,date:null};
  const date=effective(pending[0]);
  const amount=pending.filter(x=>effective(x)===date)
    .reduce((n,x)=>n+Number(x.total_centavos),0);
  return {amount,date};
 };
 let latest=null,fetching=false,identity="",currentCard=null,observer=null;
 function apply(){
  const card=document.getElementById("dash-billing-card");
  if(!card||!latest||card.hidden)return;
  const next=nextPayment(latest);
  if(!next)return;
  const button=card.querySelector(".gx-account-capsule-label");
  const wanted=next.date?"Próximo pago · "+money(next.amount):"Servicios al corriente";
  if(button&&button.textContent!==wanted)button.textContent=wanted;
  const dateEl=card.querySelector("#dash-date");
  const formatted=next.date?niceDate(next.date):null;
  if(dateEl&&formatted&&dateEl.textContent!==formatted)
    dateEl.textContent=formatted;
  const heading=card.querySelector("#gx-b2-next-label");
  if(!heading&&dateEl){
   const textLabel=document.createElement("div");textLabel.id="gx-b2-next-label";
   textLabel.textContent="PRÓXIMO VENCIMIENTO";
   textLabel.style.cssText="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text-muted);text-align:center";
   dateEl.previousElementSibling?.setAttribute("hidden","");
   dateEl.before(textLabel);
  }
 }
 function observe(){
  const card=document.getElementById("dash-billing-card");
  if(card&&card!==currentCard){
   observer?.disconnect();currentCard=card;
   observer=new MutationObserver(apply);
   observer.observe(card,{childList:true,characterData:true,subtree:true});
  }
  apply();
 }
 async function refresh(){
  if(fetching)return;
  const token=localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
  if(!token){latest=null;identity="";return;}
  fetching=true;identity=token;
  try{
   const res=await fetch(core.endpoint("estado-financiero-b2-beta"),{
    method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json","X-Client-Token":token},
    body:JSON.stringify({accion:"mi_estado",datos:{}})
   });
   const data=await res.json().catch(()=>({}));
   if(token!==localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||""))return;
   latest=res.ok&&data.ok===true&&data.modo==="b2_multifecha"&&
     nextPayment(data.calendario_financiero)?data.calendario_financiero:null;
   observe();
  }catch(e){console.warn("GOXION: próximo pago B2 no disponible",String(e).slice(0,120))}
  finally{fetching=false;}
 }
 document.addEventListener("DOMContentLoaded",()=>{observe();refresh()},{once:true});
 if(document.readyState!=="loading"){observe();refresh();}
 // Los datos del dashboard pueden renderizarse después de la consulta.
 new MutationObserver(observe).observe(document.documentElement,{childList:true,subtree:false});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
 document.addEventListener("goxion:prorroga-activada",refresh);
 window.addEventListener("focus",()=>{const token=localStorage.getItem(core?.STORAGE?.CLIENT_TOKEN||"")||"";
   if(token&&token!==identity)refresh();else observe();});
})();