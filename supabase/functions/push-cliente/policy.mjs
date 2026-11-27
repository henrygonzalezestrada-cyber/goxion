// The only outbound destinations are audited browser push providers. No arbitrary URL/SSRF.
export const projectAllowed=(url)=>["https://hmpevcwodcgbkviarfic.supabase.co","https://nsvybyvvdpdgbgtvydfb.supabase.co"].includes(url);
export const endpointValid=(value)=>{
  if(typeof value!=="string"||value.length>2048)return false;
  try {
    const u=new URL(value),h=u.hostname;
    return u.protocol==="https:"&&!u.port&&!u.username&&!u.password&&!u.hash&&u.pathname!=="/"&&(
      h==="fcm.googleapis.com"||h==="updates.push.services.mozilla.com"||
      h==="web.push.apple.com"||h.endsWith(".push.apple.com")||
      h.endsWith(".notify.windows.com")
    );
  }catch{return false;}
};
export const decode=(s)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
export function subscriptionValid(s) {
  try{return endpointValid(s?.endpoint)&&/^[A-Za-z0-9_-]{87}$/.test(s?.keys?.p256dh)&&/^[A-Za-z0-9_-]{22}$/.test(s?.keys?.auth)&&decode(s.keys.p256dh)[0]===4;}catch{return false}
}
export const DEFAULT_CATEGORIES=Object.freeze(["cuenta","servicios","importante"]);
export const CATEGORIES=Object.freeze([...DEFAULT_CATEGORIES,"beneficios"]);
export const categoriesValid=(v)=>Array.isArray(v)&&v.length>=1&&v.length<=4&&new Set(v).size===v.length&&v.every(x=>CATEGORIES.includes(x));
export const payloadFor=(test,id)=>({
  title:test===true?"GOXION · Aviso de prueba":"GOXION · Tienes un aviso",
  body:test===true?"Tu dispositivo está listo para recibir avisos.":"Abre Mi Espacio para consultar la información.",
  tag:"gx-push-"+id
});
export function providerOutcome(status){
  if(status>=200&&status<300)return "accepted";
  if(status===404||status===410)return "gone";
  if(status===429||(status>=500&&status<600))return "retryable";
  return "failed";
}
export async function signed(token,secret){
  if(!secret||typeof token!=="string"||token.length>8192||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))return null;
  try{
    const [p,s]=token.split(".");
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    if(!await crypto.subtle.verify("HMAC",key,decode(s),new TextEncoder().encode(p)))return null;
    const j=JSON.parse(new TextDecoder().decode(decode(p)));
    return j.role==="goxion_client"&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(j.cliente_id)&&Number.isFinite(j.exp)&&j.exp>Date.now()/1000?j:null;
  }catch{return null;}
}

