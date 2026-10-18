/* E1/B2 — visual-only, fabricated quotes for the Ayuda → Index mirror.
 * All monetary values are explicit cents from a SYNTHETIC server-like quote.
 * Never use this as a financial calculator or source of actual payments.
 */
(()=>{
'use strict';
const cargo=(id,name,due,total,extra={})=>Object.freeze({
 id,name,due,total,base:total,loyalty:0,commercial:0,mora:0,abono:0,
 paid:false,extension:null,...extra
});
const common={period:'Octubre 2026',folio:'GX-DEMO',holder:'Cliente de ejemplo',trusted:true};
const cases={
 upcoming:{...common,title:'Próximo vencimiento',cargos:[
  cargo('a','Servicio A','2026-10-20',8900)]},
 multi:{...common,title:'Fechas independientes',cargos:[
  cargo('a','Servicio A','2026-10-20',4500,{base:5000,loyalty:500}),
  cargo('b','Servicio B','2026-11-06',4900)]},
 same_day:{...common,title:'Dos servicios el mismo día',cargos:[
  cargo('a','Servicio A','2026-10-20',4500,{base:5000,loyalty:500}),
  cargo('b','Servicio B','2026-10-20',4900)]},
 review:{...common,title:'Comprobante recibido',proof:'review',cargos:[
  cargo('a','Servicio A','2026-10-20',7900)]},
 correction:{...common,title:'Comprobante observado',proof:'correction',cargos:[
  cargo('a','Servicio A','2026-10-20',7900)]},
 overdue:{...common,title:'Obligación vencida',cargos:[
  cargo('a','Servicio A','2026-10-16',4725,{base:4500,mora:225}),
  cargo('b','Servicio B','2026-11-06',4900)]},
 extension:{...common,title:'Prórroga activa',cargos:[
  cargo('a','Servicio A','2026-10-17',7900,{extension:'2026-10-21'})]},
 first_paid:{...common,title:'Primer servicio liquidado',proof:'approved',cargos:[
  cargo('a','Servicio A','2026-10-20',0,{base:4500,abono:4500,paid:true}),
  cargo('b','Servicio B','2026-11-06',4900)]},
 partial:{...common,title:'Abono aprobado en un servicio',cargos:[
  cargo('a','Servicio A','2026-10-20',2500,{base:4500,abono:2000}),
  cargo('b','Servicio B','2026-11-06',4900)]},
 clear:{...common,title:'Período liquidado',proof:'approved',cargos:[
  cargo('a','Servicio A','2026-10-15',0,{base:8900,abono:8900,paid:true})]},
 mission:{...common,title:'Próximo vencimiento sin urgencia',cargos:[
  cargo('a','Servicio A','2026-11-20',8900)]},
 new:{...common,title:'Sin servicios',cargos:[]},
 unavailable:{...common,title:'Saldo no confirmado',trusted:false,cargos:[]}
};
const mapping=Object.freeze({upcoming:'upcoming',multi:'multi',review:'review',
 correction:'correction',overdue:'overdue',extension:'extension',
 mission:'mission',clear:'clear',new:'new'});
const money=cents=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',
 minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
const date=iso=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',
 timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
const due=c=>c.extension||c.due;
const pending=q=>q.trusted?q.cargos.filter(c=>!c.paid&&c.total>0)
 .slice().sort((a,b)=>due(a).localeCompare(due(b))||a.id.localeCompare(b.id)):[];
const total=rows=>rows.reduce((acc,c)=>acc+c.total,0);
function next(q){
 const active=pending(q),d=active[0]?due(active[0]):null;
 const rows=d?active.filter(c=>due(c)===d):[];
 return Object.freeze({date:d,rows,amount:total(rows)});
}
function select(q,mode,id){
 const active=pending(q);if(mode==='all')return active;
 if(mode==='single'&&id){return active.filter(c=>c.id===id)}
 return next(q).rows;
}
function valid(q){
 if(!q||!Array.isArray(q.cargos))return false;
 return q.cargos.every(c=>['total','base','loyalty','commercial','mora','abono'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)
  &&c.total===c.base-c.loyalty-c.commercial+c.mora-c.abono
  &&(!c.paid||c.total===0)&&/^\d{4}-\d{2}-\d{2}$/.test(c.due));
}
for(const [key,q] of Object.entries(cases)){
 if(!valid(q))throw new Error('Fixture de demostración sin conciliar: '+key);
 Object.freeze(q.cargos);Object.freeze(q);
}
window.GOXION_E1B2_DEMO=Object.freeze({
 cases:Object.freeze(cases),mapping,money,date,due,pending,total,next,select,valid,
 isolated:true,noBackend:true
});
})();