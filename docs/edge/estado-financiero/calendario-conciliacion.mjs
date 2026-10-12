// GOXION · Conciliación determinista de las fechas independientes con el
// CONTRATO FINANCIERO OFICIAL. MODO SOMBRA, NO APTO PARA COBRO.
// El backend oficial calcula promociones, lealtad, especiales, misiones,
// Trato Justo, mora, reactivación y pagos. Aquí SOLO se leen sus resultados.
// Un reparto aritmético entre accesos NO prueba elegibilidad por vencimiento.
const MXN=100;
const safeCents=(v,label)=>{
 const n=Number(v);
 if(!Number.isFinite(n)||n<0||n>1e8||Math.abs(n*MXN-Math.round(n*MXN))>1e-6)
  throw Error("Importe oficial inválido: "+label);
 return Math.round(n*MXN);
};
const isISO=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)
 && !Number.isNaN(new Date(s+"T00:00:00Z").valueOf())
 && new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const globalCategories=["promociones","lealtad","especiales","trato_justo","programados"];
const chargeCategories=["mora","reactivacion"];
const bad=(code,extra={})=>({
 modo:"conciliacion_sombra",cuadrado:false,cobrable:false,
 motivo:code,importe_oficial_centavos:null,importe_base_centavos:null,
 conceptos:[],vencimientos:[],alertas:[code],...extra
});

// Centavos deterministas por restos mayores; cuotas exactas, sin floats monetarios
// en el acumulado y sin aplicar descuento por encima del saldo de una unidad.
export function distribuirCentavos(total,pesos,topes=pesos){
 if(!Number.isInteger(total)||total<0||!Array.isArray(pesos)||!Array.isArray(topes)||
   pesos.length!==topes.length||!pesos.length||
   pesos.some(x=>!Number.isInteger(x)||x<0)||
   topes.some(x=>!Number.isInteger(x)||x<0))
   throw Error("Distribución inválida");
 if(total>topes.reduce((a,b)=>a+b,0))throw Error("Descuento excede saldo");
 const applied=pesos.map(()=>0);let remaining=total;
 while(remaining>0){
  const active=pesos.map((w,i)=>({i,w:topes[i]-applied[i]})).filter(x=>x.w>0);
  const weight=active.reduce((a,x)=>a+x.w,0);
  if(!weight)throw Error("Sin base elegible");
  const quotas=active.map(x=>{
    const raw=remaining*x.w/weight;
    const floor=Math.min(x.w,Math.floor(raw));
    return {...x,floor,fraction:raw-Math.floor(raw)};
  });
  let done=0;
  for(const q of quotas){applied[q.i]+=q.floor;done+=q.floor}
  let rest=remaining-done;
  quotas.sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  for(const q of quotas){
   if(rest<=0)break;
   if(applied[q.i]<topes[q.i]){applied[q.i]++;rest--}
  }
  if(remaining===rest)throw Error("Distribución no progresó");
  remaining=rest;
 }
 return applied;
}
export function reconciliarCalendarioOficial({calendario,financiero}={}){
 try{
  if(!calendario||!financiero||!Array.isArray(calendario.servicios)||!calendario.servicios.length)
   return bad("fuente_incompleta");
  if(financiero?.fuente_financiera!=="supabase:goxion_estado_financiero"||
    financiero?.contrato_financiero?.modo!=="oficial")
   return bad("estado_no_oficial");
  const units=calendario.servicios;
  if(units.length>60||new Set(units.map(u=>String(u.id))).size!==units.length)
   return bad("identidades_ambiguas");
  if(units.some(u=>!isISO(u.fecha_vencimiento)||
       u.cobertura_confirmada!==true||
       !Number.isInteger(u.monto_base_centavos)||u.monto_base_centavos<0))
   return bad("fechas_o_precios_sin_verificar");
  const services=Array.isArray(financiero.servicios)?financiero.servicios:[];
  if(!services.length)return bad("sin_servicios_oficiales");
  const base=units.reduce((a,u)=>a+u.monto_base_centavos,0);
  const officialBase=safeCents(financiero.subtotal,"subtotal");
  if(base!==officialBase)return bad("precio_contratado_no_coincide",{
    importe_base_centavos:base,importe_oficial_centavos:safeCents(financiero.total_actual,"saldo")
  });
  const contractBase=new Map();
  for(const u of units)contractBase.set(u.cliente_servicio_id,
    (contractBase.get(u.cliente_servicio_id)||0)+u.monto_base_centavos);
  if(services.length!==contractBase.size||
    services.some(s=>!contractBase.has(s.id)||contractBase.get(s.id)!==safeCents(s.monto,"servicio")))
   return bad("desglose_contratos_no_conciliado");
  const totalOfficial=safeCents(financiero.total_actual,"total actual");
  const promoSum=safeCents(financiero.promociones?.total_ahorro??0,"promociones");
  const disc=financiero.descuentos||{},charges=financiero.cargos||{};
  const discounts=Object.fromEntries(globalCategories.map(k=>[k,safeCents(disc[k]??0,k)]));
  const fees=Object.fromEntries(chargeCategories.map(k=>[k,safeCents(charges[k]??0,k)]));
  if(discounts.promociones!==promoSum||
     discounts.lealtad!==safeCents(financiero.lealtad?.monto??0,"lealtad")||
     discounts.programados!==
      (Array.isArray(financiero.beneficios_programados)
        ?financiero.beneficios_programados.reduce((sum,b)=>sum+safeCents(b.monto,"beneficio"),0)
        :0))
   return bad("descuentos_no_conciliados");
  const discountTotal=Object.values(discounts).reduce((a,b)=>a+b,0);
  const chargesTotal=Object.values(fees).reduce((a,b)=>a+b,0);
  if(discountTotal!==safeCents(disc.total??0,"total descuentos")||
    chargesTotal!==safeCents(charges.total??0,"total cargos"))
   return bad("totales_ajustes_inconsistentes");
  if(officialBase-discounts.promociones!==safeCents(financiero.subtotal_efectivo,"subtotal efectivo"))
   return bad("subtotal_promocional_inconsistente");
  if(Math.max(0,base-discountTotal+chargesTotal)!==
     safeCents(financiero.total_calculado,"total calculado"))
   return bad("waterfall_oficial_no_cuadra");
  const dueState=String(financiero.estado||"").toLowerCase();
  const pending=Boolean(financiero.pago_en_revision||financiero.pago_incompleto);
  const paid=Boolean(financiero.esta_pagado_periodo);
  if(!paid&&!pending&&totalOfficial!==Math.max(0,base-discountTotal+chargesTotal))
   return bad("saldo_oficial_difiere_del_calculo");
  if(paid&&totalOfficial!==0)return bad("saldo_pagado_inconsistente");
  const benefits=Array.isArray(financiero.beneficios_programados)?financiero.beneficios_programados:[];
  const benefitsById=new Set(),cupones=[];
  for(const item of benefits){
   if(!item?.id||benefitsById.has(item.id))return bad("beneficio_duplicado");
   benefitsById.add(item.id);
   if(String(item.origen||"").toLowerCase()==="misiones")cupones.push({
     beneficio_id:item.id,monto_centavos:safeCents(item.monto,"cupón"),
     origen:"misiones",periodo_indice:item.periodo_indice
   });
  }
  const nivel=Number(financiero.lealtad?.nivel??0),pct=Number(financiero.lealtad?.porcentaje??0);
  if(!Number.isFinite(pct)||pct<0||!Number.isInteger(nivel)||nivel<0||nivel>2||
    (pct!==0&&pct!==3&&pct!==6))
   return bad("lealtad_no_reconocida");
  const unitsOut=units.map(u=>({
    id:u.id,cliente_servicio_id:u.cliente_servicio_id,fecha:u.fecha_vencimiento,
    base_centavos:u.monto_base_centavos,restante_centavos:u.monto_base_centavos,
    descuentos:{},cargos:{}
  }));
  const concepts=[];
  const blockedReasons=[];
  if(cupones.length)blockedReasons.push("cupon_misiones_una_vez_por_periodo");
  if(discounts.promociones>0)blockedReasons.push("promociones_con_reglas_de_acumulacion");
  if(discounts.lealtad>0)blockedReasons.push("lealtad_requiere_elegibilidad_por_fecha");
  if(discounts.especiales>0)blockedReasons.push("descuentos_especiales_sin_destino_por_acceso");
  if(discounts.trato_justo>0)blockedReasons.push("trato_justo_requiere_servicio_elegible");
  if(discounts.programados>0)blockedReasons.push("beneficios_programados_sin_destino_individual");
  if(fees.mora>0)blockedReasons.push("mora_exige_dias_y_saldo_por_vencimiento");
  if(fees.reactivacion>0)blockedReasons.push("reactivacion_depende_del_periodo");
  if(paid)blockedReasons.push("periodo_ya_pagado");
  if(pending)blockedReasons.push("pago_parcial_o_revision");
  if(financiero.acuerdo_cobro)blockedReasons.push("acuerdo_cobro_vigente");
  if(dueState==="suspendido"||financiero.estado_db==="suspendido")
   blockedReasons.push("cliente_suspendido");
  // Distribución contable aritmética, NUNCA permiso de cobro. Se procesan los
  // cinco descuentos una vez según el total OFICIAL, no se recalcula % por acceso.
  let excess=0;
  for(const key of globalCategories){
   const wanted=discounts[key];if(!wanted)continue;
   const available=unitsOut.reduce((s,u)=>s+u.restante_centavos,0);
   const used=Math.min(wanted,available),unused=wanted-used;
   excess+=unused;
   if(used){
    const parts=distribuirCentavos(used,unitsOut.map(u=>u.restante_centavos));
    for(let i=0;i<unitsOut.length;i++){
     unitsOut[i].descuentos[key]=parts[i];
     unitsOut[i].restante_centavos-=parts[i];
    }
   }
   concepts.push({tipo:"descuento",categoria:key,total_centavos:wanted,
     aplicado_centavos:used,excedente_centavos:unused});
  }
  if(excess)blockedReasons.push("descuento_excede_base");
  for(const key of chargeCategories){
   if(!fees[key])continue;
   const weights=unitsOut.map(u=>u.restante_centavos);
   const totalWeight=weights.reduce((a,b)=>a+b,0);
   // Para cargos se reparte sobre el neto tras descuentos; si es cero, usar base.
   const baseWeights=totalWeight>0?weights:unitsOut.map(u=>u.base_centavos);
   const basic=baseWeights.reduce((a,b)=>a+b,0);
   if(basic===0)return bad("sin_base_para_cargo");
   const chunks=distribuirCentavos(fees[key],baseWeights,
     baseWeights.map(()=>fees[key]));
   for(let i=0;i<unitsOut.length;i++){
    unitsOut[i].cargos[key]=chunks[i];
    unitsOut[i].restante_centavos+=chunks[i];
   }
   concepts.push({tipo:"cargo",categoria:key,total_centavos:fees[key]});
  }
  const sum=unitsOut.reduce((a,u)=>a+u.restante_centavos,0);
  const expected=Math.max(0,base-discountTotal+chargesTotal);
  // Si descuentos exceden el subtotal, la distribución de cargos NO tiene
  // equivalencia 1:1; todavía puede cerrarse aritméticamente pero no cobrarse.
  if(sum!==expected)return bad("asignacion_no_concilia",{
    diferencia_centavos:sum-expected
  });
  const groups=new Map();
  for(const unit of unitsOut){
   const group=groups.get(unit.fecha)||{fecha:unit.fecha,base_centavos:0,
     estimado_centavos:0,servicios:[]};
   group.base_centavos+=unit.base_centavos;
   group.estimado_centavos+=unit.restante_centavos;
   group.servicios.push({id:unit.id,estimado_centavos:unit.restante_centavos});
   groups.set(unit.fecha,group);
  }
  if(groups.size>1)blockedReasons.push("obligaciones_independientes_sin_aplicacion_idempotente");
  // Incluso sin ajustes el pago aprobado de un contrato global no puede
  // inferirse como pago de una unidad: el cambio de modelo requiere migración.
  blockedReasons.push("pendiente_imputacion_pago_por_obligacion");
  return {
   modo:"conciliacion_sombra",cuadrado:true,cobrable:false,
   periodo:financiero.periodo??null,
   importe_base_centavos:base,
   importe_oficial_centavos:totalOfficial,
   total_estimado_centavos:sum,
   diferencia_aritmetica_centavos:sum-expected,
   categorias:{descuentos:discounts,cargos:fees,
     cupones_misiones:cupones,lealtad:{nivel,porcentaje:pct}},
   conceptos:concepts,
   vencimientos:[...groups.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha)),
   alertas:[...new Set(blockedReasons)],
   fuente:"supabase:goxion_estado_financiero",
   desglose_de_obligaciones_autorizado:false
  };
 }catch(e){
  return bad("error_conciliacion",{detalle:e?.message||"Error de datos"});
 }
}
