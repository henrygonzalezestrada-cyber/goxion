// GOXION B2 · Único cálculo puro de MORA INDIVIDUAL por obligación.
// El SQL del backend será el responsable de acreditar pagos. Este módulo
// solamente proyecta saldos con movimientos aprobados y centavos enteros.
// No mezclar con cobros de fecha única ni actualizar estado global.
const iso=s=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;
 const [y,m,d]=s.split('-').map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));
 return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===s;
};
const countDays=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
const addDay=s=>new Date(Date.parse(s+'T00:00:00Z')+86400000).toISOString().slice(0,10);
const cash=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const fail=(codigo,extra={})=>({ok:false,codigo,modo:'mora_b2_informativa',
 cobrable:false,acreditada:false,...extra});
export function simularMoraIndependiente({
 obligaciones=[],movimientos=[],hoy,fechas_unificadas=false,
}={}){
 if(fechas_unificadas)return fail('usar_motor_global');
 if(!iso(hoy)||!Array.isArray(obligaciones)||!obligaciones.length||
   obligaciones.length>60||!Array.isArray(movimientos)||movimientos.length>600)
  return fail('parametros_invalidos');
 const by=new Map(),payBy=new Map(),keys=new Set();
 for(const o of obligaciones){
  if(!o||!o.acceso_id||by.has(o.acceso_id)||!iso(o.vence)
     ||!cash(o.saldo_inicial_centavos)||o.saldo_inicial_centavos===0
     ||o.conciliado!==true)return fail('obligacion_no_conciliada');
  by.set(o.acceso_id,o);payBy.set(o.acceso_id,[]);
 }
 for(const m of movimientos){
  if(!m?.operation_id||keys.has(m.operation_id)||!payBy.has(m.acceso_id)
    ||m.aprobado!==true||!iso(m.fecha_aprobacion)
    ||m.fecha_aprobacion>hoy||!cash(m.monto_centavos)||m.monto_centavos===0)
   return fail('movimiento_no_aprobado_o_duplicado');
  keys.add(m.operation_id);payBy.get(m.acceso_id).push(m);
 }
 const lines=[];
 for(const o of by.values()){
  const pays=payBy.get(o.acceso_id).sort((a,b)=>
   a.fecha_aprobacion.localeCompare(b.fecha_aprobacion)||a.operation_id.localeCompare(b.operation_id));
  const base=o.saldo_inicial_centavos,cap=Math.round(base*0.5);
  let principal=base,fee=0,feeGenerated=0,paidPrincipal=0,paidFees=0;
  let pos=0;
  let day=pays.length&&pays[0].fecha_aprobacion<o.vence?
   pays[0].fecha_aprobacion:o.vence;
  const apply=m=>{
   if(m.monto_centavos>principal+fee)return false;
   // Priorizar la reducción de principal: así un abono evita mora futura
   // sobre el monto aplicado, sin condonar recargos históricos.
   const toPrincipal=Math.min(principal,m.monto_centavos);
   principal-=toPrincipal;paidPrincipal+=toPrincipal;
   const toFee=m.monto_centavos-toPrincipal;
   fee-=toFee;paidFees+=toFee;
   return true;
  };
  // Hasta fecha hoy, jamás predice cargos futuros ni aplica comprobantes pendientes.
  while(day<=hoy){
   if(day>o.vence&&principal>0&&feeGenerated<cap){
    const extra=Math.min(cap-feeGenerated,Math.round(principal*0.05));
    fee+=extra;feeGenerated+=extra;
   }
   while(pos<pays.length&&pays[pos].fecha_aprobacion===day){
    if(!apply(pays[pos]))return fail('abono_supera_saldo',{acceso_id:o.acceso_id});
    pos++;
   }
   day=addDay(day);
   if(countDays(o.vence,day)>3700)return fail('horizonte_de_mora_excesivo');
  }
  if(pos!==pays.length)return fail('movimiento_anterior_al_ciclo_no_procesado');
  lines.push({
   acceso_id:o.acceso_id,vence:o.vence,
   base_centavos:base,tope_mora_centavos:cap,
   principal_pendiente_centavos:principal,
   mora_generada_centavos:feeGenerated,
   mora_pendiente_centavos:fee,
   abonos_principal_centavos:paidPrincipal,
   abonos_mora_centavos:paidFees,
   saldo_total_centavos:principal+fee,
   liquidado:principal+fee===0,
   dias_atraso:Math.max(0,countDays(o.vence,hoy))
  });
 }
 lines.sort((a,b)=>a.vence.localeCompare(b.vence)||a.acceso_id.localeCompare(b.acceso_id));
 return {ok:true,modo:'mora_b2_informativa',cobrable:false,acreditada:false,
  obligaciones:lines,totales:{
   principal_pendiente_centavos:lines.reduce((a,b)=>a+b.principal_pendiente_centavos,0),
   mora_pendiente_centavos:lines.reduce((a,b)=>a+b.mora_pendiente_centavos,0),
   mora_generada_centavos:lines.reduce((a,b)=>a+b.mora_generada_centavos,0),
   saldo_total_centavos:lines.reduce((a,b)=>a+b.saldo_total_centavos,0)
  }};
}
