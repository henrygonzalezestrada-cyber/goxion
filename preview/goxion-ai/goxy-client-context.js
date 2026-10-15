/* Goxy F12 · Contexto mínimo por sesión autenticada de Mi Espacio.
 * Groq jamás recibe datos de la cuenta. El correo de acceso solo aparece
 * en una ficha visible y consentida antes de abrir WhatsApp.
 */
(() => {
  'use strict';
  const support=window.GOXY_SUPPORT;
  const key=()=>String(
    typeof window.getCurrentClientKey==='function'
      ? window.getCurrentClientKey() || '' : window.goxionCurrentClientKey || ''
  );
  const token=()=>String(window.GOXION_CORE?.getClientToken?.() || '');
  const unavailable=(reason)=>({ok:false,reason,platforms:[],serviceCount:0});

  function extract(cliente) {
    if (!cliente || !Array.isArray(cliente.servicios))return unavailable('missing');
    const found=new Set();
    let serviceCount=0;
    for (const s of cliente.servicios) {
      if (!s || s.activo===false)continue;
      serviceCount++;
      // La consulta oficial 'mi-espacio' ya filtra cliente_servicios.activo=true.
      const names=[s.nombre];
      if (Array.isArray(s.accesos))for(const access of s.accesos)names.push(access?.servicio);
      for(const name of names){
        if(typeof name!=='string')continue;
        for(const platform of support.resolveAllPlatforms(name))found.add(platform);
      }
    }
    const platforms=support.platforms().filter(platform=>found.has(platform));
    return {ok:true,platforms,serviceCount};
  }
  function local() {
    if (!key() || !token())return unavailable('no_session');
    // globalClientesData es el estado léxico de 01a-shared-state.js en Ayuda,
    // compartido con scripts clásicos inyectados en el mismo documento.
    const view=typeof globalClientesData!=='undefined'?globalClientesData:null;
    if(!view || typeof view!=='object')return unavailable('loading');
    const cliente=Object.prototype.hasOwnProperty.call(view,key())?view[key()]:null;
    return extract(cliente);
  }
  async function refresh() {
    const oldKey=key(),oldToken=token();
    if(!oldKey || !oldToken)return unavailable('no_session');
    const localResult=local();
    if(localResult.ok)return localResult;
    // Fallback a la lectura oficial autenticada solo cuando la vista aún no
    // terminó de hidratarse. Se proyectan NOMBRES únicamente y se descarta el
    // objeto privado recibido; no se envía nunca a Groq ni se persiste.
    if(typeof window.goxionReloadPrivateClientView!=='function')return localResult;
    try{
      const snapshot=await window.goxionReloadPrivateClientView();
      if(key()!==oldKey || token()!==oldToken || String(snapshot?.key||'')!==oldKey)
        return unavailable('session_changed');
      return extract(snapshot?.cliente);
    }catch{return unavailable('load_failed');}
  }
  // F12: rutas a la misma tarjeta OFICIAL de Mi Espacio.
  // Nunca entregar códigos, PIN ni contraseñas fuera de su vista oficial.
  function destinations(platform) {
    if(!key() || !token())return [];
    const view=typeof globalClientesData!=='undefined'?globalClientesData:null;
    const current=view && Object.prototype.hasOwnProperty.call(view,key())?view[key()]:null;
    if(!Array.isArray(current?.servicios))return [];
    const allowed=support.platforms();
    if(!allowed.includes(platform))return [];
    return current.servicios.flatMap((service,index)=>{
      if(!service || service.activo===false)return [];
      const labels=[service.nombre,...(Array.isArray(service.accesos)
        ? service.accesos.map(x=>x?.servicio):[])].filter(x=>typeof x==='string');
      if(!labels.some(label=>support.resolveAllPlatforms(label).includes(platform)))return [];
      // Métadatos mínimos no secretos, solo sesión autorizada.
      const accesses=Array.isArray(service.accesos)?service.accesos.filter(a=>
        support.resolveAllPlatforms(a?.servicio||service.nombre).includes(platform)): [];
      const hasProfile=Boolean(service.perfil_pin||service.perfil_nombre||
        accesses.some(a=>a.perfil_pin||a.perfil_nombre));
      const hasLogin=Boolean(service.correo_login || accesses.some(a=>a.correo));
      const hasPendingPassword=service.credencial_pendiente?.estado==='pendiente' &&
        support.resolveAllPlatforms(service.credencial_pendiente.plataforma||service.nombre).includes(platform);
      return [{index,label:platform+(current.servicios.length>1?' · servicio '+(index+1):''),
        hasProfile,hasLogin,hasPendingPassword}];
    });
  }
  // Resumen de contacto para derivación explícitamente autorizada por cliente.
  // No copiar claves, PIN, códigos, perfiles ni otros campos de Mi Espacio.
  function supportReference(platform,serviceIndex=null){
    if(!key() || !token() || !support.platforms().includes(platform))return null;
    const store=typeof globalClientesData!=='undefined'?globalClientesData:null;
    const account=store && Object.prototype.hasOwnProperty.call(store,key())?store[key()]:null;
    if(!account || !Array.isArray(account.servicios))return null;
    const choices=destinations(platform);
    const chosen=Number.isInteger(serviceIndex)
      ?choices.find(x=>x.index===serviceIndex)
      :choices.length===1?choices[0]:null;
    // Si hay varias cuentas del mismo servicio, nunca seleccionar la primera a ciegas.
    if(!chosen)return null;
    const service=account.servicios[chosen.index];
    if(!service)return null;
    const accesses=Array.isArray(service.accesos)?service.accesos.filter(x=>
      support.resolveAllPlatforms(x?.servicio||service.nombre).includes(platform)):[];
    const email=String(service.correo_login||accesses.find(x=>x?.correo)?.correo||'').trim();
    return {
      clientId:key().slice(0,70),
      clientName:String(account.nombre||'').trim().slice(0,65),
      platform,
      serviceIndex:chosen.index,
      serviceLabel:chosen.label,
      // El correo se utiliza sólo en la vista previa que aprueba el cliente.
      loginEmail:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email.slice(0,110):''
    };
  }
  window.GOXY_CLIENT_CONTEXT=Object.freeze({local,refresh,destinations,supportReference});
})();