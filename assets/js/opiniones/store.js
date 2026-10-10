/* GOXION · Opiniones oficiales. Fuente: Supabase Edge Function, NO localStorage de beta. */
(()=>{
 "use strict";
 if(window.GOXION_REVIEWS)return;
 const gx=window.GOXION_CORE;
 if(!gx||typeof gx.endpoint!=="function")return;
 const endpoint=gx.endpoint("opiniones-goxion");
 const clientKey=gx.STORAGE.CLIENT_TOKEN;
 const adminKey=gx.STORAGE.ADMIN_TOKEN;
 let published=[],administrative=[];
 const listeners=new Set();
 const starSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.91 6.07 6.69.94-4.84 4.7 1.15 6.65L12 17.81l-5.91 3.15 1.15-6.65-4.84-4.7 6.69-.94L12 2.6Z"/></svg>';
 const notify=()=>{for(const fn of listeners){try{fn()}catch(err){console.error(err)}}};
 async function request(mode,payload={},tokenType=""){
   const headers={"Content-Type":"application/json"};
   if(tokenType){
     const token=localStorage.getItem(tokenType==="admin"?adminKey:clientKey)||"";
     if(!token)throw new Error(tokenType==="admin"?"Inicia sesión en Admin.":"Inicia sesión en Mi Espacio para enviar tu opinión.");
     headers[tokenType==="admin"?"X-Admin-Token":"X-Client-Token"]=token;
   }
   let response;
   try{
     response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({modo:mode,...payload}),cache:"no-store"});
   }catch(_){throw new Error("No hay conexión. Comprueba tu red y vuelve a intentarlo.")}
   const json=await response.json().catch(()=>({}));
   if(!response.ok||json.ok!==true)throw new Error(json.error||"No se pudo completar la solicitud.");
   return json;
 }
 async function refreshPublished(){
   const data=await request("publicas");
   published=Array.isArray(data.opiniones)?data.opiniones:[];
   notify();
   return published;
 }
 async function refreshAdmin(){
   const data=await request("admin_listar",{},"admin");
   administrative=Array.isArray(data.opiniones)?data.opiniones:[];
   notify();
   return administrative;
 }
 async function add(payload){
   const rating=Number(payload.rating);
   const text=String(payload.text||"").trim().replace(/\s+/g," ");
   if(!Number.isInteger(rating)||rating<1||rating>5)throw new Error("Selecciona de 1 a 5 estrellas.");
   if(text.length<12)throw new Error("Cuéntanos un poco más (mínimo 12 caracteres).");
   if(text.length>500)throw new Error("El comentario debe tener máximo 500 caracteres.");
   const data=await request("enviar",{rating,text,consent:payload.consent===true},"client");
   return data.opinion;
 }
 async function update(id,action,value){
   const actions={publish:"publicar",hide:"ocultar",reply:"responder"};
   if(!actions[action])throw new Error("Acción no permitida.");
   const data=await request("admin_accion",{id,accion:actions[action],...(action==="reply"?{respuesta:value}:{})},"admin");
   await refreshAdmin();
   return data.opinion;
 }
 function subscribe(listener){
   listeners.add(listener);
   return ()=>listeners.delete(listener);
 }
 function date(value){try{return new Date(value).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}catch{return "—"}}
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 window.GOXION_REVIEWS={load:()=>published,loadAdmin:()=>administrative,refreshPublished,refreshAdmin,add,update,subscribe,date,starSvg,esc};
})();
