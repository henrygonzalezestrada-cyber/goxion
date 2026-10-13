// GOXION · Contrato financiero MULTIFECHA, sólo simulación pura.
// Cobro real debe ser una transacción SQL autenticada, nunca este módulo.
// La lealtad es una sola racha por cliente, el descuento aplica POR acceso.
// Un incumplimiento reinicia la racha completa para períodos FUTUROS.
// Importes en centavos; no reaplicar descuento a cuota ya liquidada.

const validDate = s => {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;
 const [y,m,d]=s.split('-').map(Number);
 return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===s;
};
const month = s => s.slice(0,7);
const cents = n => Number.isSafeInteger(n)&&n>=0&&n<=100000000?n:null;
const rate = n => [0,3,6].includes(n)?n:null;
const fail = (codigo,extra={})=>({
 ok:false,codigo,modo:'proyeccion_b2_sin_cobro',cobrable:false,
 acreditada:false,...extra
});
const days = (start,end)=>Math.floor((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);
const money = (base,pct)=>Math.round(base*pct/100);

export function calcularMultifechaLealtad({
 accesos=[],lealtad={},hoy,periodo,aprobaciones=[],ajustes=[],
}={}){
 if(!validDate(hoy)||!validDate(periodo)||periodo.slice(-2)!=='01')
  return fail('fecha_o_periodo_invalido');
 if(!Array.isArray(accesos)||!accesos.length||accesos.length>40
   ||!Array.isArray(aprobaciones)||!Array.isArray(ajustes))
  return fail('accesos_invalidos');
 if(!Number.isSafeInteger(lealtad.racha)||lealtad.racha<0||lealtad.racha>10000)
  return fail('racha_no_verificada');
 const porcentaje=rate(lealtad.porcentaje);
 if(porcentaje===null)return fail('nivel_lealtad_invalido');
 const nivel=Number(lealtad.nivel||0);
 if((nivel===0&&porcentaje!==0)||(nivel===1&&porcentaje!==3)
    ||(nivel===2&&porcentaje!==6)||![0,1,2].includes(nivel))
  return fail('porcentaje_no_corresponde_al_nivel');
 if(ajustes.length)return fail('promociones_cupones_o_cargos_requieren_origen');

 const used=new Set(),paid=new Map(),out=[];
 for(const p of aprobaciones){
  if(!p?.acceso_id||!validDate(p.fecha_aprobacion)||
    cents(p.monto_aprobado_centavos)===null||paid.has(p.acceso_id))
    return fail('aprobaciones_invalidas_o_duplicadas');
  paid.set(p.acceso_id,p);
 }
 for(const a of accesos){
  if(!a?.id||used.has(a.id)||!a.contrato_id){
   return fail('acceso_sin_identidad_unica');
  }
  used.add(a.id);
  if(a.verificado!==true||!validDate(a.fecha_vencimiento)
    ||month(a.fecha_vencimiento)!==month(periodo)
    ||!Number.isSafeInteger(Number(a.revision))||Number(a.revision)<1)
   return fail('cobertura_o_ciclo_no_confirmado');
  const base=cents(a.base_centavos);
  if(base===null||base<=0)return fail('precio_no_conciliado');
  if(a.lealtad_elegible!==true)return fail('origen_de_descuento_no_verificado');
  if(a.tiene_promocion||a.tiene_cupon||a.tiene_trato_justo||
     a.tiene_descuento_especial||a.tiene_reactivacion)
    return fail('beneficio_debe_atribuirse_antes_de_simular');
  const d=money(base,porcentaje);
  const due=base-d;
  const payment=paid.get(a.id);
  if(payment&&payment.monto_aprobado_centavos!==due)
   return fail('comprobante_distinto_al_importe_del_acceso');
  const lateDays=Math.max(0,days(a.fecha_vencimiento,hoy));
  const mora=payment?0:money(due,Math.min(lateDays*5,50));
  out.push({
   acceso_id:a.id,contrato_id:a.contrato_id,
   fecha_vencimiento:a.fecha_vencimiento,
   monto_base_centavos:base,porcentaje_lealtad:porcentaje,
   descuento_lealtad_centavos:d,
   subtotal_centavos:due,mora_proyectada_centavos:mora,
   total_proyectado_centavos:payment?0:due+mora,
   pagado:!!payment,
   puntual:payment?payment.fecha_aprobacion<=a.fecha_vencimiento:false,
   vencido:(!payment&&hoy>a.fecha_vencimiento)||
     !!(payment&&payment.fecha_aprobacion>a.fecha_vencimiento),
  });
 }
 for(const k of paid.keys())if(!used.has(k))return fail('comprobante_de_otro_acceso');
 // Una cuota que venció sin estar pagada —o se aprobó tarde—
 // hace perder la racha global; pagar otra fecha no la protege.
 const incumplimiento=out.some(x=>x.vencido);
 const todas=out.every(x=>x.pagado);
 const periodoPuntual=todas&&!incumplimiento;
 const rachaProyectada=incumplimiento?0:periodoPuntual?lealtad.racha+1:lealtad.racha;
 const totalBase=out.reduce((n,x)=>n+x.monto_base_centavos,0);
 const totalDescuento=out.reduce((n,x)=>n+x.descuento_lealtad_centavos,0);
 const totalMora=out.reduce((n,x)=>n+x.mora_proyectada_centavos,0);
 return {
  ok:true,modo:'proyeccion_b2_sin_cobro',
  cobrable:false,acreditada:false,
  periodo, nivel_lealtad:nivel, porcentaje_lealtad:porcentaje,
  lealtad_global:{racha_inicial:lealtad.racha,
   racha_resultante_solo_al_cierre:rachaProyectada,
   pierde_beneficio_siguiente_ciclo:incumplimiento,
   racha_puede_incrementar:periodoPuntual,
   incremento_maximo_del_ciclo:periodoPuntual?1:0},
  unidades:out.sort((a,b)=>a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)||a.acceso_id.localeCompare(b.acceso_id)),
  totales:{
   base_centavos:totalBase,lealtad_centavos:totalDescuento,
   mora_centavos:totalMora,
   total_ciclo_sin_mora_centavos:totalBase-totalDescuento,
   saldo_pendiente_con_mora_centavos:out.reduce((n,x)=>n+x.total_proyectado_centavos,0)
  },
  nota:'Descuentos asignados individualmente, racha por cliente. No usar para acreditar ni cobrar.',
 };
}
