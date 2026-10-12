import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/202610120011_diagnostico_b2_sombra.sql','utf8');
const gateway=readFileSync('docs/edge/acciones-financieras/index.ts','utf8');
let n=0;const check=(v,m)=>{assert(v,m);n++;};
const a=gateway.indexOf('if (action === "diagnostico_b2_sombra")');
const b=gateway.indexOf('// B2: imputación exclusivamente SOMBRA',a);
check(a>0&&b>a,'Ruta diagnóstico presente');
const auth=gateway.indexOf('const auth = await validAdmin(req, adminSecret)');
check(auth>0&&auth<a,'Autenticación administrativa previa');
const section=gateway.slice(a,b);
check(section.includes('goxion_diagnostico_b2_sombra'),'RPC única');
check(!section.includes('.from(')&&!/insert|update|delete/i.test(section.replace(/'[^']*'/g,'')),
 'La ruta es sólo lectura');
check(section.includes('cobrable:false'),'Nunca cobrar');
check(section.includes('acreditada_oficial:false'),'No acreditar en frontend');
check(sql.includes('security invoker set search_path'),'RPC sin elevar privilegios');
check(sql.includes('from public,anon,authenticated'),'Privilegios públicos revocados');
check(sql.includes('to service_role'),'Backend autorizado');
check(sql.includes("'fecha_unica_conservar_cobro_global'"),'Cliente una fecha se mantiene legacy');
check(sql.includes("'calendarios_no_verificados_o_fuera_de_periodo'"),'Guardas de verificación');
check(sql.includes("'beneficios_mora_o_reactivacion_sin_atribucion'"),'No prorratea beneficios');
check(sql.includes("'waterfall_financiero_inconsistente'"),'Control de waterfall');
check(sql.includes("'pago_en_revision_o_parcial'"),'Parciales/revisión no se acreditan');
check(sql.includes("'movimientos_b2_requieren_conciliacion'"),'No se duplica imputación');
check(!/insert into public\.|update public\.|delete from public\./i.test(sql),
 'RPC no escribe datos oficiales');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const fn=new AsyncFunction('action','data','sb','json','operationId',section);
const client='10a4c2b7-2b1b-4ca3-bb94-1eec762efa81';
async function call(data,err){
 const calls=[];
 const sb={rpc:async(name,args)=>{calls.push({name,args});
   return err?{error:{message:'backend no disponible'}}:
   {data:{ok:true,modo:'diagnostico_b2_sombra',aplicable_sombra:false,cobrable:false,
   razones:['calendarios_no_verificados_o_fuera_de_periodo']}};}};
 const out=await fn('diagnostico_b2_sombra',data,sb,(x,status=200)=>({...x,status}),
  'd9ba85ea-109e-4f44-af15-14bead036519');
 return {out,calls};
}
let r=await call({cliente_id:client});
check(r.out.status===200&&!r.out.cobrable&&r.calls.length===1,'Diagnóstico OK sin cobro');
check(r.calls[0].args.p_periodo===null,'Período opcional backend');
r=await call({cliente_id:client,periodo:'2026-11-01'});
check(r.out.status===200&&r.calls[0].args.p_periodo==='2026-11-01','Período exacto');
r=await call({cliente_id:client,periodo:'2026-11-13'});
check(r.out.status===400&&r.calls.length===0,'Día distinto al 1 rechazado');
r=await call({cliente_id:'otro'});
check(r.out.status===400&&r.calls.length===0,'UUID inválido rechazado');
r=await call({cliente_id:client},true);
check(r.out.status===409&&r.out.cobrable===false,'Falla SQL bloquea cobro');
console.log('GOXION B2 diagnóstico Admin: '+n+' controles PASS, sin cobros');
