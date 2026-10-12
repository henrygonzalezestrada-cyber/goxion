// GOXION · Enrutador financiero para fecha única vs múltiples vencimientos.
// Nunca crea deuda, no escribe, no divide descuentos ni muestra cuotas individuales.
// Para un solo día, los descuentos/cupones/lealtad siguen en el motor oficial.
export function clasificarRutaCobro({cliente={},accesos=[],calendarios=[],financiero={}}={}){
 const estado=String(cliente.estado||"");
 const day=Number(cliente.dia_pago);
 const official=financiero?.fuente_financiera==="supabase:goxion_estado_financiero";
 const base={
  modo:"consulta_no_cobrable",
  estado_financiero_oficial:official,
  usa_total_global:true,
  puede_cobrar_por_vencimiento:false,
  autoriza_nuevo_pago:false,
  total_global_oficial:official?financiero.total_actual:null,
  fecha_corte_global:official?financiero.fecha_corte:null
 };
 if(estado==="suspendido"){
  return {...base,ruta:"cuenta_suspendida",razon:"sin_cobro_hasta_reactivacion"};
 }
 if(!official||!Number.isInteger(day)||day<1||day>31){
  return {...base,ruta:"requiere_revision",razon:"fuente_o_fecha_global_no_verificada"};
 }
 const activos=accesos.filter(a=>a?.activo!==false);
 if(!activos.length){
  return {...base,ruta:"global_heredado",razon:"sin_accesos_separables"};
 }
 const byAccess=new Map();
 for(const a of activos){
  if(!a?.id||byAccess.has(a.id))return {...base,ruta:"requiere_revision",razon:"acceso_duplicado"};
  byAccess.set(a.id,a);
 }
 const comprobados=new Map();
 let borradorDistinto=false;
 for(const f of calendarios){
  if(!f?.cliente_acceso_id||!byAccess.has(f.cliente_acceso_id)){
    return {...base,ruta:"requiere_revision",razon:"calendario_fuera_de_contrato"};
  }
  if(f.estado==="verificado"){
   if(comprobados.has(f.cliente_acceso_id)){
    return {...base,ruta:"requiere_revision",razon:"fecha_duplicada"};
   }
   if(!Number.isInteger(Number(f.dia_corte))||Number(f.dia_corte)<1||Number(f.dia_corte)>31||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(f.cobertura_hasta||""))){
     return {...base,ruta:"requiere_revision",razon:"fecha_verificada_invalida"};
   }
   comprobados.set(f.cliente_acceso_id,f);
  }else if(f.estado==="borrador"){
   if(Number(f.dia_corte)!==day)borradorDistinto=true;
  }else{
   return {...base,ruta:"requiere_revision",razon:"estado_calendario_desconocido"};
  }
 }
 const days=new Set([...comprobados.values()].map(f=>Number(f.dia_corte)));
 if(borradorDistinto){
  return {...base,ruta:"requiere_revision",razon:"hay_fecha_distinta_sin_confirmar"};
 }
 if(days.size===0||(days.size===1&&days.has(day))){
  return {...base,ruta:"global_heredado",razon:"una_fecha_no_dividir_beneficios"};
 }
 // Hay evidencia de alguna fecha diferente de la base. No aplicar
 // cobros B2 hasta verificar TODOS los accesos.
 if(comprobados.size!==byAccess.size){
  return {...base,ruta:"requiere_revision",razon:"fechas_independientes_incompletas"};
 }
 const byContract=new Map();
 for(const a of activos){
  if(!a.cliente_servicio_id)return {...base,ruta:"requiere_revision",razon:"sin_id_contrato"};
  const list=byContract.get(a.cliente_servicio_id)||[];list.push(a);byContract.set(a.cliente_servicio_id,list);
 }
 for(const [id,rows] of byContract){
  const ord=new Set(rows.map(a=>a.ordinal));
  if(ord.size!==rows.length){
    return {...base,ruta:"requiere_revision",razon:"unidades_ambiguas_de_combo"};
  }
  // Cada fecha debe corresponder a su propio acceso persistido.
  if(rows.some(a=>comprobados.get(a.id)?.cliente_servicio_id!==id)){
   return {...base,ruta:"requiere_revision",razon:"calendario_sin_contrato"};
  }
 }
 if(days.size===1){
  return {...base,ruta:"requiere_revision",razon:"fecha_unica_difiere_del_corte_global"};
 }
 return {...base,ruta:"b2_multifecha_sombra",razon:"fechas_independientes_confirmadas",
  fechas_confirmadas:comprobados.size,dias_distintos:days.size};
}
