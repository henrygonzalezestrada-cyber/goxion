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
   if(mode==='platform'){
     if(!window.GOXY_SUPPORT?.platforms?.().includes(id))return describe(data,'all');
     chosen=rows.filter(row=>window.GOXY_SUPPORT.resolveAllPlatforms(row.name).includes(id));
     if(!chosen.length)return {answer:'No encuentro un cargo pendiente de '+id+
       ' en el calendario confirmado. Puedes consultar todas las fechas o abrir Index.',
       choices:[{kind:'pay-all',label:'Ver todos los pagos'},
         {kind:'pay-open',label:'Abrir estado de cuenta'}]};
   }
   const dueTotal=chosen.reduce((sum,row)=>sum+row.amount,0);
   const lines=chosen.slice(0,12).map(row=>
     '• '+row.name+' · perfil '+row.ordinal+': '+date(row.due)+' · '+money(row.amount)+
     (row.agreement?' (acuerdo pactado)':''));
   const prefix=mode==='next'?'Tu próximo vencimiento:':
     mode==='one'?'Este es el importe confirmado para ese perfil:':
     mode==='platform'?'Estos son los pagos de '+id+':':
       'Estos son tus vencimientos confirmados:';
   const extra=chosen.length>12?'\nConsulta los demás perfiles en Index.':'';
   const totalLine=mode==='all'?'Total pendiente del período: ':
      mode==='next'?'Total de esa fecha: ':mode==='platform'?'Total de esta plataforma: ':'Importe de ese perfil: ';
   const recognized=window.GOXY_SUPPORT;
   const platforms=[...new Set(rows.flatMap(row=>
     recognized?.resolveAllPlatforms?.(row.name)||[]))];
   const choices=[{kind:'pay-next',label:'Próximo vencimiento'},
     {kind:'pay-all',label:'Todo junto · '+money(data.total)},
     ...(platforms.length>1?platforms.slice(0,3).map(platform=>({
       kind:'pay-platform',platform,label:platform+' · total'})):[]),
     ...rows.slice(0,rows.length<=4?4:2).map(row=>({kind:'pay-one',chargeId:row.id,
       label:row.name+' · perfil '+row.ordinal+' · '+date(row.due)})),
     {kind:'pay-open',label:'Realizar mi pago'}];
   return {answer:prefix+'\n'+lines.join('\n')+extra+'\n\n'+totalLine+
     money(dueTotal)+'\nPuedes pagar por fecha o todo junto desde Index; el importe se valida nuevamente antes de reportar tu pago.',
     choices};
 }
 // Todas estas consultas usan la misma identidad de Mi Espacio.
 async function extension({signal}={}){
   const id=key(),auth=token(),core=window.GOXION_CORE;
   if(!id||!auth||typeof core?.endpoint!=='function')return unavailable('session');
   try{
     const r=await fetch(core.endpoint('estado-financiero-b2-beta'),{
       method:'POST',cache:'no-store',signal,
       headers:{'Content-Type':'application/json','X-Client-Token':auth},
       body:JSON.stringify({accion:'mi_prorroga',datos:{}})
     });
     const body=await r.json();
     if(!same(id,auth))return unavailable('session_changed');
     if(!r.ok||body.ok!==true)return unavailable('server');
     return {ok:true,eligible:body.puede_solicitar===true,
       agreement:body.acuerdo||null,date:iso(body.fecha_original),
       today:iso(body.fecha_servidor),max:iso(body.fecha_maxima),
       multi:body.modo==='b2_multifecha'};
   }catch(error){return unavailable(error?.name==='AbortError'?'aborted':'network');}
 }
 function extensionDescribe(state){
   const choices=[{kind:'pay-open',label:'Revisar mi pago'}];
   if(!state?.ok)return {answer:'Puedo explicarte las prórrogas, pero ahora no pude comprobar si tu cuenta tiene una disponible. La opción oficial aparece en Mi Espacio solo cuando cumples las condiciones.',choices};
   if(state.agreement){
     const dateText=iso(state.agreement.fecha_pactada)?date(state.agreement.fecha_pactada):'la fecha pactada';
     return {answer:'Ya tienes una prórroga registrada en este período, con fecha '+dateText+
       '. Solo se permite una por cliente y período; por eso no puedes solicitar otra ahora. En el siguiente período podrá habilitarse otra vez si cumples las condiciones. Si incumples el acuerdo, se aplican las consecuencias del vencimiento original.',
       choices};
   }
   if(state.eligible)return {
     answer:'Sí, hoy puedes solicitar una prórroga desde Mi Espacio. Puedes elegir una nueva fecha hasta '+date(state.max)+
       ' (máximo cinco días después del vencimiento original). Si pagas el día acordado, conservas tu lealtad y no generas mora. Si no cumples, al día siguiente se acumula la mora desde el vencimiento original y pierdes el beneficio de lealtad. Antes de aceptar verás los importes calculados por GOXION.',
     choices:[{kind:'extend-open',label:'Solicitar prórroga'},...choices]
   };
   return {answer:'Por ahora no tienes una prórroga disponible para activar. Solo puede solicitarse el día del vencimiento original, una vez por cliente y período, con pagos y calendario elegibles. Cuando llegue una nueva fecha de pago, Goxy podrá verificar otra vez si está habilitada.',choices};
 }
 async function loyalty({signal}={}){
   const id=key(),auth=token(),core=window.GOXION_CORE;
   if(!id||!auth||typeof core?.endpoint!=='function')return unavailable('session');
   try{
     const r=await fetch(core.endpoint('estado-financiero-b2-beta'),{
       method:'POST',cache:'no-store',signal,
       headers:{'Content-Type':'application/json','X-Client-Token':auth},
       body:JSON.stringify({accion:'mi_estado',datos:{}})
     });
     const json=await r.json();
     if(!same(id,auth))return unavailable('session_changed');
     if(!r.ok||json?.ok!==true||!['oficial','b2_multifecha'].includes(json.modo))return unavailable('server');
     const state=json.estado_financiero;
     const rates=state?.reglas?.lealtad;
     if(state?.fuente_financiera!=='supabase:goxion_estado_financiero'||!Array.isArray(rates))
       return unavailable('unverified');
     const max=rates.filter(x=>Number.isFinite(Number(x.porcentaje))).sort(
       (a,b)=>Number(b.porcentaje)-Number(a.porcentaje))[0];
     if(!max)return unavailable('unverified');
     return {ok:true,current:Number(state.lealtad?.porcentaje)||0,
       level:Number(state.lealtad?.nivel)||0,
       max:Number(max.porcentaje),payments:Number(max.pagos)||0,
       saving:Number(state.lealtad?.monto)||0};
   }catch(error){return unavailable(error?.name==='AbortError'?'aborted':'network');}
 }
 function loyaltyDescribe(info){
   if(!info?.ok)return {answer:'El programa GOXION ofrece descuentos por pagos puntuales, pero no pude verificar tu nivel ahora. Mi Espacio muestra tu avance y los beneficios vigentes.',
     choices:[{kind:'account',label:'Ver mi lealtad'}]};
   return {answer:'El nivel máximo del Programa GOXION da '+info.max+
     '% de descuento sobre el importe elegible, al alcanzar '+info.payments+
     ' pagos puntuales. Actualmente tu nivel registrado es '+info.level+
     ', con '+info.current+'% de descuento. Las promociones, descuentos especiales y fechas distintas pueden modificar la base elegible. Por eso no sería correcto prometerte una cantidad exacta en pesos antes de que el motor calcule ese futuro período.',
     choices:[{kind:'account',label:'Ver mi avance y beneficios'}]};
 }
 const months=Object.freeze(['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
    'septiembre','octubre','noviembre','diciembre']);
 const localDay=()=>{
   const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Merida',
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
   const get=type=>parts.find(p=>p.type===type)?.value||'';
   return get('year')+'-'+get('month')+'-'+get('day');
 };
 function addDays(isoDay,days){
   const d=new Date(isoDay+'T00:00:00Z');
   d.setUTCDate(d.getUTCDate()+days);
   return d.toISOString().slice(0,10);
 }
 function parseDate(input){
   const n=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
     .toLowerCase().trim();
   const today=localDay();
   let candidate=null;
   let m=n.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
   if(m)candidate=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
   if(!candidate){
     m=n.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
     if(m)candidate=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
   }
   if(!candidate){
     m=n.match(/\b(?:el |dia |hasta el |hasta )?(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s*(?:de\s*)?(20\d{2}))?\b/);
     if(m)candidate=(m[3]||today.slice(0,4))+'-'+String(months.indexOf(m[2])+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');
   }
   if(!candidate){
     m=n.match(/\b(?:en|dentro de)\s+(\d{1,2})\s+dias?\b/);
     if(m)candidate=addDays(today,Number(m[1]));
   }
   if(!candidate&&/\bmanana\b/.test(n))candidate=addDays(today,1);
   if(!candidate){
     m=n.match(/\b(?:el dia|dia|hasta el|hasta|el)\s+(\d{1,2})\b/);
     if(m){
       const d=Number(m[1]),start=new Date(today+'T00:00:00Z');
       start.setUTCDate(d);
       if(start.toISOString().slice(0,10)<today)start.setUTCMonth(start.getUTCMonth()+1);
       candidate=start.toISOString().slice(0,10);
     }
   }
   if(!candidate||!iso(candidate))return null;
   const parsed=new Date(candidate+'T00:00:00Z');
   if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==candidate)return null;
   return candidate;
 }
 function forecastDescribe(value){
   const choices=[{kind:'forecast-date',label:'Elegir otra fecha'},
     {kind:'pay-open',label:'Ver estado de cuenta'},
     {kind:'terms-open',label:'Consultar reglas de mora y reactivación'}];
   if(!value?.ok)return {answer:value?.message||
      'No pude verificar una proyección oficial para esa fecha. Tu estado de cuenta muestra el saldo vigente.',choices};
   if(!valid(value.amountCents)||!valid(value.moraCents))
     return {answer:'El importe calculado no pasó la validación de GOXION.',choices};
   let answer='Si realizas tu pago el '+date(value.date)+
      ', el motor financiero proyecta '+money(value.amountCents)+
      ' de saldo pendiente, incluyendo '+money(value.moraCents)+' de mora.';
   if(value.reactivationConfirmed && valid(value.reactivationCents))
     answer+=value.reactivationCents>0
       ? ' Además, el motor aplicaría '+money(value.reactivationCents)+' de reactivación (cargo del 20% según la política para atrasos de más de 15 días).'
       : ' Para esa fecha, el motor no proyecta cargo de reactivación.';
   else answer+=' En GOXION, los términos contemplan un cargo administrativo del 20% sobre el saldo adeudado cuando un servicio supera los 15 días de atraso sin reporte o requiere reactivación. Esta cotización B2 todavía NO calcula ese cargo por separado. Por seguridad, no lo sumaré como deuda confirmada: si se cumplen esas condiciones, el total podría aumentar. Puedes revisar las reglas antes de pagar.';
   if(value.loyaltyAtRisk)answer+=' La lealtad también podría perderse por incumplimiento.';
   answer+=' Es una simulación, no un importe definitivo: puede cambiar si hay abonos, prórrogas o ajustes.';
   return {answer,choices};
 }
 window.GOXY_PAYMENT=Object.freeze({read,describe,extension,extensionDescribe,
   loyalty,loyaltyDescribe,parseDate,localDay,addDays,forecastDescribe});
})();
