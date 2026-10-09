/* GOXION Opiniones 2.0 — almacenamiento DEMO local, nunca escribe a Supabase */
(() => {
  "use strict";
  if(window.GOXION_REVIEWS_BETA)return;
  const KEY="gx_opiniones_beta_v1";
  const EVENT="gx:opiniones-beta";
  const sample=()=>{
    const date=new Date().toISOString();
    return [
      {id:"gx-rb-sample-1",rating:5,text:"La atención fue muy clara y me gustó poder consultar mis servicios en un solo lugar.",author:"Cliente de ejemplo",consent:true,verified:true,sample:true,status:"published",date,reply:""},
      {id:"gx-rb-sample-2",rating:4,text:"El espacio de cliente es práctico. Me gustaría ver todavía más opciones en el catálogo.",author:"Cliente de ejemplo",consent:true,verified:true,sample:true,status:"published",date,reply:""}
    ];
  };
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw===null){
        const fresh=sample();
        localStorage.setItem(KEY,JSON.stringify(fresh));
        return fresh;
      }
      const list=JSON.parse(raw);
      return Array.isArray(list)?list:[];
    }catch(error){
      console.warn("Opiniones beta: almacenamiento local no disponible",error);
      return sample();
    }
  }
  const channel=typeof BroadcastChannel==="function"?new BroadcastChannel("gx-opiniones-beta") : null;
  function changed(){
    window.dispatchEvent(new CustomEvent(EVENT));
  }
  function persist(rows){
    try{localStorage.setItem(KEY,JSON.stringify(rows));}
    catch(_){throw new Error("No se pudo guardar la opinión en este navegador. Revisa el almacenamiento privado.");}
    changed();
    try{channel?.postMessage({type:"changed"});}catch(_){}
    return rows;
  }
  function add(payload){
    const rating=Number(payload.rating);
    const comment=String(payload.text||"").trim().replace(/\s+/g," ");
    if(!Number.isInteger(rating)||rating<1||rating>5)throw new Error("Selecciona de 1 a 5 estrellas.");
    if(comment.length<12)throw new Error("Cuéntanos un poco más (mínimo 12 caracteres).");
    if(comment.length>500)throw new Error("El comentario debe tener un máximo de 500 caracteres.");
    const consent=Boolean(payload.consent);
    const review={
      id:typeof crypto?.randomUUID==="function"?crypto.randomUUID():"gx-rb-"+Date.now()+"-"+Math.floor(Math.random()*100000),
      rating,text:comment,consent,
      // Simulated identity ONLY. Real production will validate the customer token server-side.
      verified:true,author:"Cliente de prueba",sample:false,status:consent?"pending":"private",
      date:new Date().toISOString(),reply:"",reviewedAt:null
    };
    persist([review,...load()]);
    return review;
  }
  function update(id,action,value){
    const rows=load();
    const row=rows.find(r=>r.id===id);
    if(!row)throw new Error("Esta opinión ya no está disponible.");
    if(action==="publish"){
      if(!row.consent||!row.verified)throw new Error("Se requiere autorización expresa y verificación del cliente.");
      row.status="published";
    }else if(action==="hide"){
      row.status="hidden";
    }else if(action==="reply"){
      const reply=String(value||"").trim();
      if(reply.length<2||reply.length>200)throw new Error("La respuesta debe contener entre 2 y 200 caracteres.");
      row.reply=reply;
    }else throw new Error("Acción no permitida.");
    row.reviewedAt=new Date().toISOString();
    persist(rows);
    return row;
  }
  function reset(){return persist(sample());}
  function subscribe(listener){
    window.addEventListener(EVENT,listener);
    const storageListener=(event)=>{if(event.key===KEY)listener()};
    window.addEventListener("storage",storageListener);
    return ()=>{window.removeEventListener(EVENT,listener);window.removeEventListener("storage",storageListener)};
  }
  if(channel)channel.addEventListener("message",event=>{if(event.data?.type==="changed")changed();});
  const esc=(value)=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const date=(value)=>{try{return new Date(value).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}catch(_){return "Hoy"}};
  const starSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.91 6.07 6.69.94-4.84 4.7 1.15 6.65L12 17.81l-5.91 3.15 1.15-6.65-4.84-4.7 6.69-.94L12 2.6Z"/></svg>';
  window.GOXION_REVIEWS_BETA={load,add,update,reset,subscribe,esc,date,starSvg};
})();
