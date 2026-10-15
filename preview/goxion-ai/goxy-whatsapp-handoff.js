/* F12 · Ficha WhatsApp, preparación local y envío exclusivamente por el cliente. */
(() => {
  'use strict';
  const ctx=window.GOXY_CLIENT_CONTEXT;
  function short(value,max=180){
    return String(value||'').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  }
  function prepare(platform,details={}){
    const reference=ctx.supportReference?.(platform);
    if(!reference)return null;
    // SOLO diagnóstico estructurado; nunca incluir el texto íntegro del chat.
    const issue=short(details.issue||'Solicitud de ayuda con el acceso',180);
    const check=Array.isArray(details.checks)?details.checks.map(x=>short(x,120)).slice(0,5).filter(Boolean):[];
    const service=short(platform,48);
    const message=[
      'GOXION · Caso preparado por Goxy',
      'Cliente: '+short(reference.clientName||'Cliente GOXION',70),
      'GOXION ID: '+short(reference.clientId,70),
      'Plataforma: '+service,
      'Correo de acceso asociado: '+(reference.loginEmail||'No disponible en Mi Espacio'),
      'Problema: '+issue,
      'Comprobaciones: '+(check.length?check.join(' / '):'Consulta inicial'),
      'Acción solicitada: revisión de acceso con asesor',
      'El cliente confirmó compartir este resumen con soporte.'
    ].join('\n');
    return {platform:service,clientId:reference.clientId,message};
  }
  function url(ticket){
    if(!ticket?.message)return null;
    const raw=typeof NUMERO_GOXION!=='undefined'?String(NUMERO_GOXION):'';
    const phone=raw.replace(/\D/g,'');
    if(!/^\d{10,15}$/.test(phone))return null;
    return 'https://wa.me/'+phone+'?text='+encodeURIComponent(ticket.message);
  }
  window.GOXY_HANDOFF=Object.freeze({prepare,url});
})();