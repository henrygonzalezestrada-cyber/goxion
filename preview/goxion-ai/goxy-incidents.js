/* H2a · Contexto determinista de incidencias; sin datos de cuentas ni IA. */
(()=>{
'use strict';
const k=window.GOXY_SUPPORT;
const failure=/\b(no (?:me )?(?:funciona|funcionan|abre|carga|reproduce|puedo entrar|me deja entrar|me deja acceder|se puede entrar)|fall\w*|caid[oa]s?|intermiten\w*|error|problema|pantalla negra|se congela|se cierra|me (?:pide|solicita) iniciar sesion)\b/;
const status=/\b(incidencias?|alertas?|avisos? generales?|fallas? generales?|servicio caido|estado del servicio|esta caid[oa]|estan caid[oa]s)\b/;
const unrelated=/\b(pago|pagar|saldo|mora|prorroga|comprobante|cupon\w*|misiones?|lealtad|referid\w*|promocion\w*|precio|contratar|cancelar|reembolso)\b/;
const general=/^(todos los servicios|todas las plataformas|todos|servicios|general)$/;
function request(text,context=null,kind=null){
 const n=k.normalize(text),brands=k.resolveAllPlatforms(text);
 if(!n||unrelated.test(n)||brands.length>1||['human','resolved','thanks','farewell','multiple'].includes(kind))return null;
 const explicit=status.test(n)||/\b(hay|tienen|existe)\b.{0,24}\b(fallas?|problemas?|intermitencias?)\b/.test(n);
 const platform=brands[0]||context||null;
 if(!explicit&&(!platform||!failure.test(n)))return null;
 return {platform,explicit};
}
function reply(snapshot,req,text){
 if(!snapshot?.ok)return req.explicit?{answer:'Por ahora no puedo verificar las incidencias de GOXION. Si tienes un problema, cuéntame qué plataforma y qué aparece en pantalla.',choices:[]}:null;
 const active=snapshot.active===true, raw=active?String(snapshot.platform||''):'';
 const generalNotice=active&&general.test(k.normalize(raw));
 const brands=active?k.resolveAllPlatforms(raw):[];
 const affected=brands.length===1?brands[0]:null;
 if(active&&!generalNotice&&!affected)return req.explicit?{answer:'Hay un aviso activo de GOXION, pero no puedo confirmar a qué plataforma corresponde. ¿Qué servicio estás intentando usar?',choices:[]}:null;
 const matches=active&&(generalNotice||!req.platform||affected===req.platform);
 if(!matches){
   if(!req.explicit)return null;
   return {answer:req.platform?'No hay una incidencia general activa registrada por GOXION para '+req.platform+'. Eso no descarta un fallo individual. ¿Qué te aparece al intentar utilizarla?':'No hay una incidencia general activa registrada por GOXION. Si algún servicio falla, dime cuál.',choices:[]};
 }
 const name=generalNotice?'los servicios':affected;
 const intro='GOXION tiene un aviso activo de '+(snapshot.intermittent?'intermitencias':'incidencia técnica')+' en '+name+'.';
 const n=k.normalize(text);
 const login=/\b(iniciar sesion|entrar a (?:la|mi) cuenta|acceso)\b/.test(n);
 const question=login?'El problema de acceso podría ser distinto. ¿Te aparece sólo la pantalla de inicio de sesión o algún aviso de error?':
  '¿Qué ocurre exactamente al intentar usar'+(generalNotice?' el servicio':' '+affected)+': no abre, te pide iniciar sesión o no reproduce?';
 return {platform:req.platform||affected,answer:intro+' '+question,choices:[]};
}
function photoOffer(text,platform){
 if(!platform)return false;
 const n=k.normalize(text);
 return !/\b(no puedo|no quiero|no tengo|prefiero no|sin foto|sin captura)\b/.test(n)&&
 /\b(foto(?:grafia)?|captura(?: de pantalla)?|imagen)\b/.test(n)&&
 /\b(mando|envio|enviar|mandar|comparto|compartir|muestro|mostrar|quieres|sirve|puedo|necesitas|gustaria|subir|adjuntar|te paso)\b/.test(n);
}
window.GOXY_INCIDENTS=Object.freeze({request,reply,photoOffer});
})();
