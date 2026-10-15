/* Goxy IA F10 · contexto de misión y conversación segura.
   All business/auth/rate limits live in Supabase goxy-ai-beta. */
(() => {
  "use strict";
  const URL="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/goxy-ai-beta";
  const sensitive=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[\s.-]?){9,16}\b|\b\d{4,8}\b/iu;
  function token(){
    const key=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
    return key ? localStorage.getItem(key)||"" : "";
  }
  async function send(payload,{signal}={}){
    const clientToken=token();
    if(!clientToken) return {ok:false,code:"SESSION_INVALID",message:"Inicia sesión nuevamente en Mi Espacio."};
    const res=await fetch(URL,{method:"POST",signal,cache:"no-store",
      headers:{"Content-Type":"application/json","X-Client-Token":clientToken},
      body:JSON.stringify(payload)});
    const body=await res.json().catch(()=>({ok:false,code:"INVALID_RESPONSE"}));
    return {ok:res.ok && body.ok===true,...body};
  }
  async function ask({message,platform,issueIndex,history=[],signal}){
    const text=String(message||"").trim();
    if(!text || text.length>400 || /[<>]/.test(text) || sensitive.test(text))
      return {ok:false,code:"SENSITIVE_OR_INVALID_INPUT",
        message:"Por seguridad, no envíes correos, números de cuenta, PIN ni códigos. Describe solo la falla."};
    try {
      const safeHistory=Array.isArray(history)?history.slice(-6).filter(x=>
        x&&['user','assistant'].includes(x.role)&&
        typeof x.content==='string'&&x.content.length<=280&&!/[<>]/.test(x.content)&&
        !sensitive.test(x.content)
      ).map(x=>({role:x.role,content:x.content})):[];
      return await send({mode:"chat",message:text,platform,issueIndex,history:safeHistory},{signal});
    }catch(error){
      if(error?.name==="AbortError")return {ok:false,code:"ABORTED"};
      return {ok:false,code:"NETWORK_ERROR",message:"No puedo conectar con la IA. Puedes seguir usando las guías."};
    }
  }
  async function status(){
    try{return await send({mode:"status"});}
    catch{return {ok:false,configured:false,code:"NETWORK_ERROR"};}
  }
  async function account(topic,{signal,message=''}={}){
    if(!['payment','missions','promotions'].includes(topic))return {ok:false,code:'TOPIC_UNSUPPORTED'};
    try{
      const text=String(message||'').trim();
      if(text.length>400 || sensitive.test(text) || /[<>]/.test(text))
        return {ok:false,code:'SENSITIVE_OR_INVALID_INPUT',message:'Describe la consulta sin datos privados.'};
      return await send({mode:"account",topic,message:text},{signal});
    }
    catch(error){
      if(error?.name==='AbortError')return {ok:false,code:'ABORTED'};
      return {ok:false,code:'NETWORK_ERROR',message:'No pude consultar Mi Espacio en este momento.'};
    }
  }
  window.GOXY_AI = Object.freeze({ask,status,account});
})();
