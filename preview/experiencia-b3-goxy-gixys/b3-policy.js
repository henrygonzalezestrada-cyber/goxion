/* E2/B3 · priority contract + deduplicated events in a SYNTHETIC mirror.
 * Reuses GOXION_SMART_PRIORITY.evaluate from the approved E1/B1.
 * No client data, no server or state mutation and no financial calculations.
 * DO NOT reuse DOM/fixtures for official production. Official needs server
 * eventId/clientId/status/timestamp, authenticated context and read receipts.
 */
(()=>{
 'use strict';
 if(document.documentElement.dataset.gxB3!=='true')return;
 const $=id=>document.getElementById(id);
 const TODAY='2026-10-18';
 const S=(date,cents=4500,extra={})=>({id:'synthetic-service',name:'Servicio de ejemplo',
  due:date,cents,status:'pending',...extra});
 const fixtures=Object.freeze({
  correction:{services:[S('2026-10-24')],review:{status:'correction',serviceIds:['synthetic-service']}},
  overdue:{services:[S('2026-10-17')],review:{}},
  review:{services:[S('2026-10-24')],review:{status:'pending',serviceIds:['synthetic-service']}},
  extension:{services:[S('2026-10-16',4500,{extension:{state:'active',agreedDate:'2026-10-23'}})],review:{}},
  soon:{services:[S('2026-10-20')],review:{}},
  clear:{services:[S('2026-11-15')],review:{}}
 });
 const policy=Object.freeze({
  correction:{important:true,gixy:true,goxy:true},
  overdue:{important:true,gixy:true,goxy:true},
  review:{important:true,gixy:false,goxy:false},
  extension:{important:true,gixy:false,goxy:false},
  soon:{important:false,gixy:false,goxy:false},
  clear:{important:false,gixy:false,goxy:false}
 });
 const events=new Set();let current='clear',inProgress=false,currentEvent=null;
 const codes={};
 for(const [key,fixture] of Object.entries(fixtures)){
  const assessed=window.GOXION_SMART_PRIORITY?.evaluate(fixture,TODAY);
  if(!assessed||assessed.code!==(key==='soon'?'soon':key)){
   throw Error('E1/B1 priority-engine changed for '+key+': '+assessed?.code);
  }
  codes[key]=Object.freeze({code:assessed.code,rank:assessed.rank,...policy[key]});
 }
 const b3=Object.freeze({
  isolated:true,production:false,usesE1B1PriorityEngine:true,
  scenarios:Object.freeze(codes),
  current:()=>current,inProgress:()=>inProgress,
  played:()=>[...events],
  eligible:code=>Boolean(codes[code]?.important&&!events.has('demo:'+code)),
  replay:code=>{
   const decision=codes[code];
   if(!decision||inProgress)return false;
   current=code;
   // Remove stale context immediately. Never keep assistance from an old
   // notification after changing scenarios.
   document.dispatchEvent(new CustomEvent('gx-b3:priority-reset',{detail:{code}}));
   $('dash-badge').innerHTML=decision.important
     ?'<span class="time-badge '+(code==='overdue'||code==='correction'?'badge-danger':'badge-ok')+'">'+
       ({correction:'Requiere corrección',overdue:'Pago vencido',review:'En revisión',extension:'Acuerdo pactado'}[code])+'</span>'
     :'<span class="time-badge badge-ok">Próximo pago · Ejemplo</span>';
   if(!decision.important){
    inProgress=false;
    $('gx-mirror-toast').textContent='Aviso ordinario: sin animación ni Gixy.';
    $('gx-mirror-toast').hidden=false;
    setTimeout(()=>$('gx-mirror-toast').hidden=true,2700);
    return false;
   }
   const id='demo:'+code;
   if(events.has(id))return false;
   events.add(id);currentEvent=id;inProgress=true;
   document.dispatchEvent(new Event('gx-smart-case-rendered'));
   window.GOXION_SMART_NOTICE?.preview();
   // There is one V6 optical ribbon and one notification event, not separate
   // parallel effects. Release only after its visual completion.
   return true;
  }
 });
 window.GOXION_SMART_BETA=Object.freeze({getScenario:()=>current});
 window.GOXION_B3_PRIORITY=b3;
 document.addEventListener('gx-b3:notice-delivered',e=>{
  if(e.detail?.code!==current||!currentEvent)return;
  inProgress=false;
  document.dispatchEvent(new CustomEvent('gx-b3:priority-delivered',{
   detail:{code:current,id:currentEvent,...codes[current]}
  }));
  currentEvent=null;
 });
 document.addEventListener('gx-mirror-ready',()=>{
  document.querySelectorAll('[data-gx-b3-priority]').forEach(btn=>btn.addEventListener('click',()=>{
   const code=btn.dataset.gxB3Priority;
   const toggle=$('gx-b3-toggle'),tray=$('gx-b3-controls');
   if(tray){tray.hidden=true;toggle?.setAttribute('aria-expanded','false')}
   b3.replay(code);
  }));
 });
})();
