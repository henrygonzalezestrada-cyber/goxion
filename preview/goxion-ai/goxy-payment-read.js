/* Goxy F13: lector de cotización ya aprobada por el motor oficial B2.
 * SOLO lectura. No hace cálculos de beneficios/mora, no persiste datos,
 * no expone identidad/credenciales a Groq, WhatsApp ni a URLs.
 */
(()=>{
 'use strict';
 const key=()=>String(window.getCurrentClientKey?.()||window.goxionCurrentClientKey||'');
 const token=()=>String(window.GOXION_CORE?.getClientToken?.()||
   localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'');
 const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?String(s):'';
 const money=centavos=>(centavos/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 const date=s=>{
   const value=iso(s);
   if(!value)return 'fecha por confirmar';
   const [y,m,d]=value.split('-').map(Number);
   return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',
     timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)));
 };
 const effective=c=>c.prorroga_estado==='aprobada' && iso(c.fecha_pactada) &&
   Number(c.mora_centavos||0)<=0?iso(c.fecha_pactada):iso(c.vence);
 const valid=amount=>Number.isSafeInteger(amount)&&amount>=0;
 const unavailable=(reason='unavailable')=>({ok:false,reason});
 const same=(id,auth)=>Boolean(id&&auth&&key()===id&&token()===auth);
 async function read({signal}={}){
   const id=key(),auth=token(),core=window.GOXION_CORE;
   if(!id||!auth||typeof core?.endpoint!=='function')return unavailable('session');
   let result;
   try{
     const response=await fetch(core.endpoint('estado-financiero-b2-beta'),{
       method:'POST',cache:'no-store',signal,
       headers:{'Content-Type':'application/json','X-Client-Token':auth},
       body:JSON.stringify({accion:'mi_estado',datos:{}})
     });
     result=await response.json();
     if(!same(id,auth))return unavailable('session_changed');
     if(result?.modo==='b2_sin_estado_cobrable')
       return unavailable('unreconciled');
     if(!response.ok||result?.ok!==true)return unavailable('server');
   }catch(error){return unavailable(error?.name==='AbortError'?'aborted':'network');}
   if(result.modo==='b2_multifecha'){
     const quote=result.calendario_financiero;
     if(quote?.ok!==true||quote.cobrable!==true||
       !/^[0-9a-f-]{36}$/i.test(String(quote.ciclo_id||''))||
       !Array.isArray(quote.cargos))return unavailable('unreconciled');
     const rows=[];
     for(const raw of quote.cargos){
       const amount=Number(raw.total_centavos);
       if(!raw.cargo_id||!raw.acceso_id||typeof raw.servicio!=='string'||
         !Number.isInteger(raw.ordinal)||raw.ordinal<1||
         !valid(amount)||!iso(effective(raw)))return unavailable('unreconciled');
       if(raw.pagado===true||amount===0)continue;
       rows.push({id:String(raw.cargo_id),name:raw.servicio.slice(0,90),
         ordinal:raw.ordinal,amount,due:effective(raw),
         agreement:raw.prorroga_estado==='aprobada'&&Number(raw.mora_centavos||0)<=0});
     }
     rows.sort((a,b)=>a.due.localeCompare(b.due)||a.ordinal-b.ordinal);
     const total=rows.reduce((n,r)=>n+r.amount,0);
     if(!Number.isSafeInteger(total)||
       !valid(Number(quote.total_pendiente_centavos))||
       total!==Number(quote.total_pendiente_centavos))return unavailable('unreconciled');
     return {ok:true,mode:'b2',rows,total,period:String(quote.periodo||''),
       inReview:quote.comprobante_en_revision===true};
   }
   if(result.modo==='oficial'){
     // Calendarios de fecha única siguen sujetos al saldo oficial, no a sumar contratos.
     const state=result.estado_financiero;
     const pesos=Number(state?.total_actual);
     const amount=Math.round(pesos*100);
     if(state?.fuente_financiera!=='supabase:goxion_estado_financiero'||
       !valid(amount)||!Number.isFinite(pesos)||!iso(state.fecha_corte))
       return unavailable('legacy_unknown');
     return {ok:true,mode:'oficial',amount,due:state.fecha_corte,
       paid:state.esta_pagado_periodo===true};
   }
   return unavailable('unknown_mode');
 }
 function describe(data,mode='all',id=null){
   if(!data?.ok)return {answer:'No pude confirmar el saldo exacto con GOXION en este momento. Puedes revisar tu estado de cuenta oficial antes de realizar cualquier pago.',choices:[{kind:'pay-open',label:'Ver estado de cuenta'}]};
   if(data.mode==='oficial')return {answer:data.paid
     ? 'Tu período actual aparece pagado en el estado de cuenta. La fecha de corte registrada es '+date(data.due)+'. Consulta tu estado de cuenta para tu próxima renovación.'
     : 'Tu próxima fecha de pago registrada es el '+date(data.due)+
       ' y el importe oficial del período es '+money(data.amount)+'. Puedes abrir Index para revisar el desglose y reportar tu pago.',
     choices:[{kind:'pay-open',label:data.paid?'Ver estado de cuenta':'Realizar mi pago'}]};
   if(data.inReview)return {answer:'Tu comprobante aparece en revisión. Antes de intentar otro pago, revisa el estado de cuenta para conocer el saldo actualizado.',choices:[{kind:'pay-open',label:'Consultar comprobante'}]};
   const rows=data.rows;
   if(!rows.length)return {answer:'Tu calendario confirmado no tiene importes pendientes en este período.',choices:[{kind:'pay-open',label:'Ver estado de cuenta'}]};
   let chosen=rows;
   if(mode==='next')chosen=rows.filter(r=>r.due===rows[0].due);
   if(mode==='one'){
     const found=rows.find(r=>r.id===id);
     if(!found)return describe(data,'all');
     chosen=[found];
   }
   const dueTotal=chosen.reduce((sum,row)=>sum+row.amount,0);
   const lines=chosen.slice(0,12).map(row=>
     '• '+row.name+' · perfil '+row.ordinal+': '+date(row.due)+' · '+money(row.amount)+
     (row.agreement?' (acuerdo pactado)':''));
   const prefix=mode==='next'?'Tu próximo vencimiento:':
     mode==='one'?'Este es el importe confirmado para ese perfil:':
       'Estos son tus vencimientos confirmados:';
   const extra=chosen.length>12?'\nConsulta los demás perfiles en Index.':'';
   const totalLine=mode==='all'?'Total pendiente del período: ':
      mode==='next'?'Total de esa fecha: ':'Importe de ese perfil: ';
   const choices=[{kind:'pay-next',label:'Próximo vencimiento'},
     {kind:'pay-all',label:'Todo junto · '+money(data.total)},
     ...rows.slice(0,6).map(row=>({kind:'pay-one',chargeId:row.id,
       label:row.name+' · perfil '+row.ordinal})),
     {kind:'pay-open',label:'Ir a pagar'}];
   return {answer:prefix+'\n'+lines.join('\n')+extra+'\n\n'+totalLine+
     money(dueTotal)+'\nPuedes pagar por fecha o todo junto desde Index; el importe se valida nuevamente antes de reportar tu pago.',
     choices};
 }
 window.GOXY_PAYMENT=Object.freeze({read,describe});
})();
