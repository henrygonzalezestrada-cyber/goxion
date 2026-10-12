// GOXION B2 · Verificador conservador de atribución por obligación.
// No calcula precios ni crea pagos. Sólo contrasta importes del motor oficial
// contra evidencia comercial explícita y fechas verificadas.
// UNA CONCILIACIÓN COHERENTE TODAVÍA NO AUTORIZA UN COBRO.
const DESCUENTOS=["promociones","lealtad","especiales","trato_justo","programados"];
const CARGOS=["mora","reactivacion"];
const hasOwn=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const cents=(v)=>Number.isSafeInteger(v)&&v>=0&&v<=100_000_000;
const iso=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+"T00:00:00Z"))&&
 new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
const fromMoney=v=>{
 const n=Number(v);if(!Number.isFinite(n)||n<0||Math.abs(n*100-Math.round(n*100))>1e-6)
 throw Error("Importe oficial inválido");
 return Math.round(n*100);
};
function error(code,details=[]){return {modo:"evidencia_b2_sombra",coherente:false,
 cobrable:false,acreditada:false,errores:[code,...details],
 obligaciones:[],totales_por_categoria:{}};}
const dayDiff=(a,b)=>Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);

/**
 * Una asignación debe aportar:
 * - obligación real, categoría oficial, origen_id documentado, monto en centavos.
 * - elegibilidad_confirmada y revision_origen (impide adivinar destinatarios).
 * - cupón misiones: origen_tipo="misiones"; una sola asignación por origen.
 * - promoción: periodo_indice + contrato_reconciliado.
 * - mora: saldo_principal, fecha_operativa y fecha_calculo; tope 50%, 5% diario.
 * Este método siempre retorna cobrable:false; la imputación/aprobación por
 * obligación futura debe ejecutarse en una RPC y no en JavaScript.
 */
export function verificarAtribucionB2({obligaciones,asignaciones=[],financiero}={}){
 try{
  if(!Array.isArray(obligaciones)||!obligaciones.length||obligaciones.length>80||
    !Array.isArray(asignaciones)||asignaciones.length>400||!financiero||
    financiero.fuente_financiera!=="supabase:goxion_estado_financiero"||
    financiero.contrato_financiero?.modo!=="oficial")
   return error("fuente_no_verificada");
  if(financiero.pago_en_revision||financiero.pago_incompleto||
    financiero.esta_pagado_periodo||financiero.estado==="suspendido")
   return error("estado_sin_cobro_individual");
  const seen=new Set();
  for(const ob of obligaciones){
   if(!ob||!ob.id||seen.has(ob.id)||!ob.cliente_servicio_id||!ob.cliente_acceso_id||
     !iso(ob.fecha_vencimiento)||!iso(ob.ciclo_inicio)||!cents(ob.base_centavos)||
     !Number.isInteger(ob.calendario_revision)||ob.calendario_revision<1||
     ob.calendario_estado!=="verificado")
     return error("obligacion_sin_identidad_cobertura_o_revision");
   seen.add(ob.id);
  }
  const subtotal=obligaciones.reduce((a,b)=>a+b.base_centavos,0);
  if(subtotal!==fromMoney(financiero.subtotal))
   return error("subtotal_contratos_no_coincide");
  const official={};
  for(const k of DESCUENTOS)official[k]=fromMoney(financiero.descuentos?.[k]??0);
  for(const k of CARGOS)official[k]=fromMoney(financiero.cargos?.[k]??0);
  if(DESCUENTOS.reduce((a,k)=>a+official[k],0)!==
       fromMoney(financiero.descuentos?.total??0)||
     CARGOS.reduce((a,k)=>a+official[k],0)!==
       fromMoney(financiero.cargos?.total??0))
   return error("categorias_oficiales_no_cuadran");
  const byId=new Map(obligaciones.map(ob=>[ob.id,{
   ...ob,descuentos:{},cargos:{},descuento_total_centavos:0,
   cargos_total_centavos:0,neto_proyectado_centavos:ob.base_centavos
  }]));
  const sums=Object.fromEntries([...DESCUENTOS,...CARGOS].map(k=>[k,0]));
  const consumedCoupon=new Set(),sources=new Set();
  const ordered=[...asignaciones].sort((a,b)=>
   (DESCUENTOS.includes(a?.categoria)?0:1)-(DESCUENTOS.includes(b?.categoria)?0:1));
  for(const a of ordered){
   const ob=byId.get(a?.obligacion_id);
   if(!ob||!hasOwn(sums,a?.categoria)||!cents(a?.monto_centavos)||
     typeof a?.origen_id!=="string"||!a.origen_id.trim()||
     a.elegibilidad_confirmada!==true||
     !Number.isInteger(a.revision_origen)||a.revision_origen<1)
    return error("asignacion_sin_evidencia");
   const discount=DESCUENTOS.includes(a.categoria);
   const fingerprint=[a.categoria,a.origen_id,a.obligacion_id].join("|");
   if(sources.has(fingerprint))return error("atribucion_duplicada");
   sources.add(fingerprint);
   if(a.categoria==="promociones"){
    if(!Number.isInteger(a.periodo_indice)||a.periodo_indice<1||
      a.contrato_reconciliado!==true) return error("promocion_sin_periodo_o_contrato");
    ob._promo=true;
   }
   if(a.categoria==="lealtad"){
    if(a.lealtad_elegible!==true||ob._promo)
     return error("lealtad_en_acceso_promocionado_o_no_elegible");
   }
   if(a.categoria==="trato_justo"&&a.cliente_servicio_id!==ob.cliente_servicio_id)
    return error("trato_justo_de_otro_servicio");
   if(a.categoria==="programados"&&a.origen_tipo==="misiones"){
    if(consumedCoupon.has(a.origen_id))return error("cupon_repetido");
    consumedCoupon.add(a.origen_id);
   }
   if(a.categoria==="mora"){
    if(!cents(a.saldo_principal_centavos)||!iso(a.fecha_operativa)||
      !iso(a.fecha_calculo)||!a.saldo_aprobado||
      a.fecha_operativa<ob.fecha_vencimiento)
     return error("mora_sin_saldo_o_fecha_validada");
    const late=Math.max(0,dayDiff(a.fecha_operativa,a.fecha_calculo));
    const expected=Math.round(a.saldo_principal_centavos*Math.min(50,late*5)/100);
    if(expected!==a.monto_centavos)
     return error("mora_no_corresponde_a_dias_y_saldo");
   }
   if(a.categoria==="reactivacion"&&a.reactivacion_autorizada!==true)
    return error("reactivacion_no_autorizada");
   sums[a.categoria]+=a.monto_centavos;
   if(discount){
    ob.descuentos[a.categoria]=(ob.descuentos[a.categoria]||0)+a.monto_centavos;
    ob.descuento_total_centavos+=a.monto_centavos;
    ob.neto_proyectado_centavos-=a.monto_centavos;
    if(ob.neto_proyectado_centavos<0)return error("descuento_excede_base");
   }else{
    ob.cargos[a.categoria]=(ob.cargos[a.categoria]||0)+a.monto_centavos;
    ob.cargos_total_centavos+=a.monto_centavos;
    ob.neto_proyectado_centavos+=a.monto_centavos;
   }
  }
  for(const key of Object.keys(sums))
   if(sums[key]!==official[key])return error("categoria_no_atribuida",[key]);
  const total=[...byId.values()].reduce((a,b)=>a+b.neto_proyectado_centavos,0);
  const expected=subtotal-DESCUENTOS.reduce((a,k)=>a+official[k],0)+
    CARGOS.reduce((a,k)=>a+official[k],0);
  if(total!==expected||total!==fromMoney(financiero.total_actual))
   return error("total_no_coincide_con_oficial");
  return {modo:"evidencia_b2_sombra",coherente:true,cobrable:false,
   acreditada:false,total_proyectado_centavos:total,
   totales_por_categoria:sums,obligaciones:[...byId.values()].map(ob=>{
    const {_promo,...publicOb}=ob;return publicOb;
   }),errores:["acreditacion_individual_transaccional_no_validada"]};
 }catch(e){return error("evidencia_invalida",[String(e?.message||"Error")]);}
}
