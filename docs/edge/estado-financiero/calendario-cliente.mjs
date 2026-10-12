// GOXION · Proyección conservadora de fechas por acceso (sin importes ni cobros).
// Solo datos ya verificados, cobertura completa y precios conciliados con cada contrato.
// Función pura: nunca acredita pagos, no consume promociones ni revela datos de otros clientes.

const fechaReal = value => {
 const raw=String(value||"");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return false;
 const [year,month,day]=raw.split("-").map(Number);
 if(year<2020||year>2100||month<1||month>12||day<1||day>31)return false;
 const d=new Date(Date.UTC(year,month-1,day));
 return d.toISOString().slice(0,10)===raw;
};
const numCentavos = value => {
 const n=Number(value);
 return Number.isInteger(n)&&n>=0&&n<=1_000_000_000?n:null;
};
const montoContrato = value => {
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&Math.abs(n*100-Math.round(n*100))<.00001
   ? Math.round(n*100):null;
};

export function calendarioInformativo({contratos=[],accesos=[],fechas=[]}={}){
 const none=reason=>({
   disponible:false,modo:"informativo_sin_cobro",razon:reason,
   fecha_proxima:null,fechas:[],multiple:false,
   puede_pagar_individual:false
 });
 if(!Array.isArray(contratos)||!Array.isArray(accesos)||!Array.isArray(fechas))
   return none("datos_incompletos");
 if(!contratos.length)return none("sin_servicios");
 if(contratos.length>=80||accesos.length>=90||fechas.length>=90)
   return none("limite_de_seguridad");
 const byContrato=new Map(),byFecha=new Map(),seenAccess=new Set();
 for(const a of accesos){
   if(!a||!a.id||!a.cliente_servicio_id||seenAccess.has(a.id))return none("acceso_ambiguo");
   seenAccess.add(a.id);
   const arr=byContrato.get(a.cliente_servicio_id)||[];arr.push(a);
   byContrato.set(a.cliente_servicio_id,arr);
 }
 const byAccess=new Map();
 for(const row of fechas){
   if(!row?.cliente_acceso_id||byAccess.has(row.cliente_acceso_id))return none("fecha_ambigua");
   byAccess.set(row.cliente_acceso_id,row);
 }
 if(byAccess.size!==accesos.length||byContrato.size!==contratos.length)
   return none("faltan_fechas_verificadas");
 const contractIds=new Set();
 for(const c of contratos){
   if(!c?.id||contractIds.has(c.id))return none("contrato_ambiguo");
   contractIds.add(c.id);
   const rows=byContrato.get(c.id)||[];
   if(!rows.length)return none("faltan_accesos");
   // Validar la unidad comercial conocida. Un combo de marcas nunca se descompone por el nombre.
   const x=String(c.nombre||"").match(/\(\s*x([2-9]|1[0-2])\s*\)/i);
   if(x&&Number(x[1])!==rows.length)return none("multiplicador_incompleto");
   if(new Set(rows.map(a=>a.ordinal)).size!==rows.length)return none("ordinal_repetido");
   const price=montoContrato(c.monto);
   if(price==null)return none("precio_invalido");
   let total=0;
   for(const access of rows){
     const f=byAccess.get(access.id);
     if(!f||f.cliente_servicio_id!==c.id||f.estado!=="verificado"||
       !fechaReal(f.cobertura_hasta)||!Number.isInteger(Number(f.dia_corte))||
       Number(f.dia_corte)<1||Number(f.dia_corte)>31)
       return none("faltan_fechas_verificadas");
     const cents=numCentavos(f.precio_centavos);
     if(cents==null)return none("precio_invalido");
     total+=cents;
     const list=byFecha.get(f.cobertura_hasta)||[];
     list.push({
       servicio:String(c.nombre||"Servicio").slice(0,100),
       acceso:rows.length>1?Number(access.ordinal):null
     });
     byFecha.set(f.cobertura_hasta,list);
   }
   // Un descuento global impide considerar estos montos como cuotas exigibles:
   // esta prueba SOLO comprueba que el desglose base esté intacto.
   if(total!==price)return none("revisar_precios");
 }
 if(byAccess.size!==seenAccess.size)return none("accesos_sobrantes");
 const sorted=[...byFecha.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 // En un único vencimiento no hay nada extra que cambiar en Index/Ayuda.
 if(sorted.length<2)return none("una_fecha");
 return {
   disponible:true,
   modo:"informativo_sin_cobro",
   razon:"fechas_confirmadas",
   fecha_proxima:sorted[0][0],
   fechas:sorted.map(([fecha,servicios])=>({
     fecha,
     servicios:servicios.sort((a,b)=>a.servicio.localeCompare(b.servicio)||Number(a.acceso||0)-Number(b.acceso||0))
   })),
   multiple:true,
   puede_pagar_individual:false
 };
}
