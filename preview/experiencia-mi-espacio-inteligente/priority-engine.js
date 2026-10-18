/* GOXION E1/B1 — pure, read-only priority rules; beta ONLY.
 * Amounts in this laboratory are SYNTHETIC cents, never real charges.
 * A production adapter must consume the existing confirmed financial quote.
 */
(function(root){
 'use strict';
 const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
   !Number.isNaN(Date.parse(x+'T12:00:00Z'));
 const days=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
 const money=c=>Number.isSafeInteger(c)&&c>=0
   ?(c/100).toLocaleString('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}):null;
 const niceDate=s=>iso(s)?new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):'fecha por confirmar';
 const clean=(s,def)=>typeof s==='string'&&s.trim()?s.trim().slice(0,72):def;
 const stages=Object.freeze({correction:100,overdue:90,review:85,today:80,extension:70,soon:60,mission:35,clear:10,onboard:95});
 function evaluate(snapshot,today){
  if(!iso(today))throw Error('Fecha local de referencia inválida');
  const services=Array.isArray(snapshot?.services)?snapshot.services:[];
  const valid=services.map((r,i)=>({
   id:clean(r?.id,'s'+i),name:clean(r?.name,'Servicio'),
   due:iso(r?.due)?r.due:null,
   effective:iso(r?.extension?.agreedDate)&&r?.extension?.state==='active'?r.extension.agreedDate:(iso(r?.due)?r.due:null),
   extended:r?.extension?.state==='active'&&iso(r?.extension?.agreedDate),
   status:r?.status==='paid'?'paid':'pending',
   cents:Number.isSafeInteger(r?.cents)&&r.cents>=0?r.cents:null
  }));
  const review=snapshot?.review||{};
  const reviewed=new Set(Array.isArray(review.serviceIds)?review.serviceIds:[]);
  const eligible=valid.filter(s=>s.status!=='paid'&&!reviewed.has(s.id)&&s.effective);
  eligible.sort((a,b)=>a.effective.localeCompare(b.effective)||a.id.localeCompare(b.id));
  const earliest=eligible[0]||null;
  const dueGroup=earliest?eligible.filter(s=>s.effective===earliest.effective):[];
  const allKnown=dueGroup.every(s=>s.cents!==null);
  const dueCents=allKnown?dueGroup.reduce((n,s)=>n+s.cents,0):null;
  const dueText=allKnown?money(dueCents):'importe por confirmar';
  const descNext=earliest?niceDate(earliest.effective):null;
  const allUpcoming=valid.filter(s=>s.status!=='paid'&&s.effective).sort((a,b)=>a.effective.localeCompare(b.effective));
  const schedule=allUpcoming.map(s=>({name:s.name,date:s.effective,
   amount:s.cents===null?'Por confirmar':money(s.cents),extended:s.extended,
   reviewing:reviewed.has(s.id)}));
  const next=earliest?{date:earliest.effective,amount:dueText,count:dueGroup.length,
   services:dueGroup.map(s=>s.name),extended:dueGroup.some(s=>s.extended)}:null;
  const output=(code,tone,kicker,title,description,action,target)=>({
    code,tone,kicker,title,description,action,target,next,schedule,rank:stages[code]
  });
  if(services.length===0)return output('onboard','info','PARA EMPEZAR','Tu espacio ya está listo',
   'Cuando elijas tu primer servicio, tus próximas acciones aparecerán aquí.','Explorar catálogo','catalog');
  if(review.status==='correction')return output('correction','attention','REQUIERE TU ATENCIÓN',
    'Hay una observación en tu comprobante',
    'Revisa la indicación recibida antes de enviar una nueva versión. No se registrará otro cobro desde aquí.',
    'Consultar observación','review');
  // Un servicio distinto al comprobante en revisión puede estar vencido:
  // todavía debe ser informado, sin volver a cobrar el que está bajo revisión.
  if(earliest&&days(earliest.effective,today)<0)return output('overdue','danger',
   'PAGO PENDIENTE','Un servicio necesita revisión',
   dueGroup.map(x=>x.name).join(' y ')+' tiene fecha vencida ('+descNext+'). El importe final y cualquier mora deben confirmarse en tu estado de cuenta.',
   'Ver estado de cuenta','account');
  if(review.status==='pending')return output('review','review',
   'COMPROBANTE RECIBIDO','Tu comprobante está en revisión',
   'Ya recibimos tu información. Evitamos solicitar otro pago del mismo servicio mientras se verifica.',
   'Consultar estado','review');
  if(earliest&&days(earliest.effective,today)===0)return output('today','attention',
   'VENCE HOY','Hoy corresponde revisar un pago',
   'Próximo importe: '+dueText+'. Solo considera '+dueGroup.map(x=>x.name).join(' y ')+'.',
   'Ver desglose','account');
  if(earliest&&earliest.extended&&days(earliest.effective,today)<=5)return output('extension','agreement',
   'ACUERDO PACTADO','Tu nueva fecha está registrada',
   'Fecha acordada: '+descNext+'. Las condiciones del acuerdo se consultan en tu estado de cuenta.',
   'Consultar acuerdo','account');
  if(earliest&&days(earliest.effective,today)<=3)return output('soon','info',
   'PRÓXIMO A VENCER','Tu próximo pago se acerca',
   'El '+descNext+' corresponde '+dueText+' por '+dueGroup.map(x=>x.name).join(' y ')+'.',
   allUpcoming.length>1?'Ver próximas fechas':'Ver estado de cuenta','account');
  const missions=snapshot?.missions;
  if(missions&&missions.active===true&&Number.isInteger(missions.done)&&Number.isInteger(missions.total)
   &&missions.total>0&&missions.done>=0&&missions.done<missions.total)return output('mission','progress',
   'MISIÓN PENDIENTE','Te falta poco para completar tus misiones',
   'Llevas '+missions.done+' de '+missions.total+' realizadas. Continúa cuando tengas oportunidad.',
   'Revisar misiones','missions');
  if(earliest&&earliest.extended)return output('extension','agreement',
   'ACUERDO REGISTRADO','Tienes una fecha pactada',
   'Próximo vencimiento: '+descNext+'. Mantén presente tu acuerdo.',
   'Consultar acuerdo','account');
  return output('clear','calm','TODO EN ORDEN','Tu espacio está al corriente',
   earliest?'La próxima fecha es '+descNext+'. No tienes acciones urgentes en este ejemplo.':
   'Por ahora no tienes pagos ni acciones inmediatas pendientes.',
   earliest?'Ver próxima fecha':'Ver tu estado','account');
 }
 const api=Object.freeze({evaluate,money,niceDate,days});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.GOXION_SMART_PRIORITY=api;
})(typeof window!=='undefined'?window:globalThis);
