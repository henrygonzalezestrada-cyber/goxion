// GOXION · Cálculo determinista de calendarios por servicio.
// MODO SOMBRA: ninguna operación de este módulo escribe en pagos, clientes o contratos.
const RE_DATE=/^\d{4}-\d{2}-\d{2}$/;
const MS=86400000;
const validDay=n=>Number.isInteger(n)&&n>=1&&n<=31;
const error=msg=>{throw new Error(msg)};
export function fechaUTC(value){
 if(typeof value!=="string"||!RE_DATE.test(value))error("Fecha inválida (YYYY-MM-DD)");
 const t=Date.parse(value+"T00:00:00Z"),d=new Date(t);
 if(!Number.isFinite(t)||d.toISOString().slice(0,10)!==value)error("Fecha inexistente");
 return d;
}
export function iso(d){return d.toISOString().slice(0,10)}
export function diasEntre(a,b){return Math.round((fechaUTC(b).getTime()-fechaUTC(a).getTime())/MS)}
export function fechaMesAnclada(year,month,day){
 if(!validDay(day))error("Día de corte fuera de rango");
 // Acepta meses desplazados: new Date(Date.UTC(y, m, 0)) es último día del mes.
 const last=new Date(Date.UTC(year,month,0)).getUTCDate();
 return iso(new Date(Date.UTC(year,month-1,Math.min(day,last))));
}
export function siguienteFecha(desde,dia,incluirHoy=true){
 const d=fechaUTC(desde);if(!validDay(dia))error("Día de corte inválido");
 let y=d.getUTCFullYear(),m=d.getUTCMonth()+1;
 let candidato=fechaMesAnclada(y,m,dia);
 if(candidato<desde||(!incluirHoy&&candidato===desde)){
   if(++m>12){m=1;y++}
   candidato=fechaMesAnclada(y,m,dia);
 }
 return candidato;
}
export function siguienteCiclo(desde,ancla){
 const f=fechaUTC(desde);
 let y=f.getUTCFullYear(),m=f.getUTCMonth()+2;
 if(m>12){y++;m-=12}
 // La fecha de inicio puede ser día 28 por febrero aunque el ancla original sea 31.
 const next=fechaMesAnclada(y,m,ancla);
 if(next<=desde)error("Ciclo inválido");
 return next;
}
export function dineroACentavos(value){
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>1000000)error("Importe inválido");
 // Limita los montos a centavos antes de acumular o distribuirlos.
 if(Math.abs(n*100-Math.round(n*100))>0.00001)error("Importe tiene fracciones de centavo");
 return Math.round(n*100);
}
export function prorratearExtension(inicio,final,nuevoAncla,centavos){
 const d=diasEntre(inicio,final);
 if(d<0||d>45)error("La extensión debe estar entre 0 y 45 días");
 if(!validDay(nuevoAncla))error("Ancla anterior inválida");
 let cursor=inicio,total=0,partes=[];
 while(cursor<final){
   let tope=siguienteCiclo(cursor,nuevoAncla),fin=tope<final?tope:final;
   const largo=diasEntre(cursor,tope),usados=diasEntre(cursor,fin);
   const subtotal=centavos*usados/largo;
   total+=subtotal;
   partes.push({desde:cursor,hasta:fin,dias:usados,dias_ciclo:largo,importe_estimado_centavos:Math.round(subtotal)});
   cursor=fin;
 }
 return {dias:d,centavos:Math.round(total),partes};
}
function rangoFecha(value,hoy){
 const diff=diasEntre(hoy,value);
 if(diff< -365||diff>550)error("La cobertura introducida queda fuera del rango permitido");
 return value;
}

export function desglosarUnidades(servicios){
 if(!Array.isArray(servicios))error("Listado de servicios inválido");
 const result=[];
 for(const s of servicios){
   // X2 es una cantidad dentro de UNA contratación, no dos contratos nuevos.
   // Un combo entre marcas ("HBO + Prime") permanece en una sola unidad.
   const m=String(s.nombre||"").match(/\(\s*x([2-9]|1[0-2])\s*\)/i);
   const n=m?Number(m[1]):1;
   const cents=dineroACentavos(s.monto);
   const base=Math.floor(cents/n),rest=cents%n;
   for(let i=0;i<n;i++){
     const unitAmount=base+(i<rest?1:0);
     result.push({
       ...s,id:n>1?s.id+"#"+(i+1):s.id,
       cliente_servicio_id:s.id,
       unidad:i+1,unidades:n,
       nombre:n>1?String(s.nombre).replace(/\(\s*x\d+\s*\)/i,"").trim()+" · Perfil "+(i+1):s.nombre,
       monto:unitAmount/100,
       monto_unidad_centavos:unitAmount,
       precio_dividido_estimado:n>1
     });
   }
 }
 return result;
}
export function simularCalendario({cliente,servicios,financiero,propuesta={},hoy}){
 if(!cliente||!Array.isArray(servicios)||!hoy)error("Faltan datos del cliente");
 fechaUTC(hoy);
 const contratos=servicios.filter(s=>s.activo!==false);
 const activos=desglosarUnidades(contratos);
 if(activos.length>60)error("Demasiadas unidades en una simulación");
 if(!activos.length)error("El cliente no tiene servicios activos");
 if(contratos.length>30)error("Demasiados contratos en una simulación");
 const ids=new Set(activos.map(s=>s.id));
 if(ids.size!==activos.length)error("Servicios duplicados");
 const plan=propuesta.servicios||{};
 if(!plan||typeof plan!=="object"||Array.isArray(plan))error("Plan inválido");
 for(const key of Object.keys(plan))if(!ids.has(key))error("El plan contiene un servicio ajeno");
 const global=propuesta.unificar_dia==null?null:Number(propuesta.unificar_dia);
 if(global!=null&&!validDay(global))error("Fecha conjunta inválida");
 const legado=Number(cliente.dia_pago||15);
 if(!validDay(legado))error("Día heredado inválido");
 const fechaOficial=financiero?.fecha_corte&&RE_DATE.test(financiero.fecha_corte)?financiero.fecha_corte:null;
 let enunciados=[];
 const items=activos.map(s=>{
   const cfg=plan[s.id]||{};
   if(!cfg||typeof cfg!=="object"||Array.isArray(cfg))error("Configuración de servicio inválida");
   const importe=s.monto_unidad_centavos;
   const coberturaExplicita=cfg.cobertura_hasta!=null&&cfg.cobertura_hasta!=="";
   // Única fuente fiable para calendarios distintos: cobertura capturada/confirmada.
   let vence=coberturaExplicita?rangoFecha(iso(fechaUTC(cfg.cobertura_hasta)),hoy)
     : fechaOficial||siguienteFecha(hoy,legado);
   const ancla=cfg.dia_original==null?(coberturaExplicita?Number(vence.slice(8)):legado):Number(cfg.dia_original);
   if(!validDay(ancla))error("Día de origen inválido");
   const diaNuevo=cfg.nuevo_dia==null?global:Number(cfg.nuevo_dia);
   if(diaNuevo!=null&&!validDay(diaNuevo))error("Día nuevo inválido");
   const diaAplicado=diaNuevo??ancla;
   const siguiente=siguienteCiclo(vence,ancla);
   const nuevoVencimiento=diaNuevo==null?vence:siguienteFecha(vence,diaNuevo,true);
   const ajuste=diaNuevo==null?{dias:0,centavos:0,partes:[]}
     :prorratearExtension(vence,nuevoVencimiento,ancla,importe);
   return {
     id:s.id,nombre:s.nombre,monto_base_centavos:importe,
     cliente_servicio_id:s.cliente_servicio_id,unidad:s.unidad,unidades:s.unidades,
     precio_dividido_estimado:s.precio_dividido_estimado,
     fecha_vencimiento:vence,origen_fecha:coberturaExplicita?"cobertura_declarada":"heredada_del_cliente",
     cobertura_confirmada:cfg.cobertura_confirmada===true&&coberturaExplicita,
     dia_original:ancla,ciclo_siguiente_hasta:siguiente,
     nueva_fecha:diaNuevo==null?null:nuevoVencimiento,
     nuevo_dia:diaNuevo,ajuste,
     importe_al_renovar_centavos:importe,
     // Fecha nueva NO sustituye vencimiento hasta que Admin confirme la modificación.
     fecha_cobro_propuesta:vence
   };
 }).sort((a,b)=>a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)||a.id.localeCompare(b.id));
 const grupos=[];
 for(const item of items){
   let group=grupos.find(x=>x.fecha===item.fecha_vencimiento);
   if(!group){group={fecha:item.fecha_vencimiento,total_centavos:0,servicios:[]};grupos.push(group)}
   group.total_centavos+=item.monto_base_centavos;
   group.servicios.push({id:item.id,nombre:item.nombre,importe_centavos:item.monto_base_centavos});
 }
 const modo=grupos.length>1?"independiente":"unificado";
 const modoPago=propuesta.pago?.modo||"proximo";
 if(!["proximo","todos","elegidos"].includes(modoPago))error("Modo de pago inválido");
 const pagosElegidos=new Set(propuesta.pago?.servicios||[]);
 if(modoPago==="elegidos"){
   if(!Array.isArray(propuesta.pago?.servicios)||!pagosElegidos.size)error("Selecciona servicios válidos");
   for(const id of pagosElegidos)if(!ids.has(id))error("Selección de otro cliente");
 }
 const primeraFecha=grupos[0].fecha;
 const elegidos=items.filter(x=>modoPago==="todos"||(modoPago==="proximo"&&x.fecha_vencimiento===primeraFecha)||(modoPago==="elegidos"&&pagosElegidos.has(x.id)));
 const total=elegidos.reduce((n,s)=>n+s.monto_base_centavos,0);
 const importePago=propuesta.pago?.importe==null?total:dineroACentavos(propuesta.pago.importe);
 if(importePago>total)error("El pago excede los conceptos seleccionados; no se reparte automáticamente a otros servicios");
 let restante=importePago;
 const aplicacion=elegidos.map(s=>{
   const aplicada=Math.min(restante,s.monto_base_centavos);
   restante-=aplicada;
   return {servicio_id:s.id,nombre:s.nombre,periodo_desde:s.fecha_vencimiento,
     periodo_hasta:s.ciclo_siguiente_hasta,
     fecha_vencimiento:s.fecha_vencimiento,importe_centavos:s.monto_base_centavos,
     pago_asignado_centavos:aplicada,saldo_centavos:s.monto_base_centavos-aplicada,
     liquidado:aplicada===s.monto_base_centavos};
 });
 const promociones=Number(financiero?.promociones?.total_ahorro||0);
 const totalOficial=Number(financiero?.total_actual);
 const sumaBase=items.reduce((a,b)=>a+b.monto_base_centavos,0);
 const confirmados=items.every(x=>x.cobertura_confirmada);
 const warnings=[];
 const multiples=items.filter(x=>x.unidades>1);
 if(multiples.length)warnings.push("Las contrataciones X2 se dividen en perfiles independientes solo para simular; verifica qué precio y cobertura corresponde realmente a cada perfil.");
 if(!confirmados)warnings.push("Las coberturas no confirmadas son hipótesis, no vencimientos comprobados.");
 if(promociones>0)warnings.push("Existen promociones: los importes base NO sustituyen el precio promocional oficial.");
 if(!Number.isFinite(totalOficial)||Math.abs(sumaBase/100-totalOficial)>0.009)
   warnings.push("El total de servicios no coincide con el saldo oficial (descuentos, pagos, recargos o revisión).");
 if(financiero?.pago_en_revision||financiero?.pago_incompleto)warnings.push("Hay un pago en revisión o incompleto; no realizar ninguna imputación sin conciliarlo.");
 if(global!=null||items.some(x=>x.nuevo_dia!=null)){
   if(!confirmados)warnings.push("El ajuste de fechas requiere confirmar previamente la cobertura ya pagada por cada servicio.");
   warnings.push("La propuesta de unificación extiende cobertura. No recorta períodos pagados ni aplica saldos a favor automáticamente.");
 }
 return {
   modo:"sombra_no_acredita",cliente_id:cliente.id,fecha_calculo:hoy,
   calendario:modo,grupos,servicios:items,
   total_base_centavos:sumaBase,
   pago:{modo:modoPago,importe_centavos:importePago,total_seleccionado_centavos:total,
     asignaciones:aplicacion,restante_sin_aplicar_centavos:restante,
     todo_seleccionado_pagado:importePago===total},
   ajuste_total_centavos:items.reduce((a,b)=>a+b.ajuste.centavos,0),
   fuente_oficial:{periodo:financiero?.periodo||null,total_actual:financiero?.total_actual??null,
     fecha_corte:fechaOficial,esta_pagado_periodo:financiero?.esta_pagado_periodo??null},
   listo_para_acreditar:false,importe_final_ventas_confirmado:false,
   advertencias:warnings
 };
}
