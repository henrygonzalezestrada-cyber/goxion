/* GOXION: continuity in memory, isolated by account. Never cache secrets. */
(function(){
'use strict';
const same=(a,b)=>!!a?.cliente?.id&&String(a.cliente.id)===String(b?.cliente?.id);
const pending=c=>['solicitada','aprobada'].includes(String(c?.estado||'').toLowerCase());
function merge(previous,next){
 if(!next)return next;
 const missing=Object.keys(next.lecturas||{}).filter(k=>next.lecturas[k]===false&&!(k==='finanzas_b2'&&next.finanzas_b2?.modo==='b2_sin_estado_cobrable'));
 const out={...next,staleReads:missing};
 if(!same(previous,next))return out;
 if(missing.includes('historial')&&previous.historial)out.historial=previous.historial;
 if(missing.includes('cancelaciones')){
  const old=new Map((previous.servicios||[]).map(s=>[String(s.id),s.cancelacion]));
  out.servicios=(next.servicios||[]).map(s=>!s.cancelacion&&pending(old.get(String(s.id)))?{...s,cancelacion:old.get(String(s.id))}:s);
  out.cancelaciones=(previous.cancelaciones||[]).filter(c=>pending(c)&&(out.servicios||[]).some(s=>String(s.id)===String(c.cliente_servicio_id)));
 }
 return out;
}
function financialUnavailable(v){return ['estado_cuenta','finanzas_b2'].some(k=>v?.lecturas?.[k]===false&&!(k==='finanzas_b2'&&v.finanzas_b2?.modo==='b2_sin_estado_cobrable'))}
function createScroll(){let positions=Object.create(null);return {remember(tab,y){if(['space','catalog','support'].includes(tab))positions[tab]=Math.max(0,Number(y)||0)},get(tab){return positions[tab]||0},reset(){positions=Object.create(null)}}}
window.GOXION_FEED_CONTINUITY=Object.freeze({merge,financialUnavailable,createScroll});
})();