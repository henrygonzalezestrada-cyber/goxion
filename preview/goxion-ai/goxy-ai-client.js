/* Goxy IA F7 · transport client no secrets.
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
  async function ask({message,platform,issueIndex,signal}){
    const text=String(message||"").trim();
    if(!text || text.length>400 || /[<>]/.test(text) || sensitive.test(text))
      return {ok:false,code:"SENSITIVE_OR_INVALID_INPUT",
        message:"Por seguridad, no envíes correos, números de cuenta, PIN ni códigos. Describe solo la falla."};
    try {
      return await send({mode:"chat",message:text,platform,issueIndex},{signal});
    }catch(error){
      if(error?.name==="AbortError")return {ok:false,code:"ABORTED"};
      return {ok:false,code:"NETWORK_ERROR",message:"No puedo conectar con la IA. Puedes seguir usando las guías."};
    }
  }
  async function status(){
    try{return await send({mode:"status"});}
    catch{return {ok:false,configured:false,code:"NETWORK_ERROR"};}
  }
  window.GOXY_AI = Object.freeze({ask,status});
})();
