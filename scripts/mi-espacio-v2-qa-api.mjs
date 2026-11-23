/* GOXION · validación de API oficial exclusivamente en el proyecto de aceptación.
   Sin credenciales incrustadas, sin URL configurable, sin mutaciones de producción.
   Se ejecuta con Node 20+ después de verificar esquema, versiones y ausencia de webhooks.
   QA_NAME, QA_PIN y QA_EXPECTED_ID son credenciales de una cuenta sintética aislada.
   Nunca registrar token ni PIN. Las operaciones comerciales siguen deshabilitadas
   en el espejo público; este runner es independiente. */
import assert from 'node:assert/strict';
const QA_ORIGIN='https://nsvybyvvdpdgbgtvydfb.supabase.co';
const {QA_NAME,QA_PIN,QA_EXPECTED_ID,QA_CONFIRM_WRITE}=process.env;
assert(QA_NAME&&/^qa[-_ ]/i.test(QA_NAME)&&/^\d{4}$/.test(QA_PIN||'')&&QA_EXPECTED_ID,'Se requiere cuenta QA sintética e ID esperado. No usar cuentas reales.');
let token='';
async function call(slug,body={}){
 assert(/^[a-z0-9-]+$/.test(slug));
 const response=await fetch(QA_ORIGIN+'/functions/v1/'+slug,{method:'POST',redirect:'error',headers:{'content-type':'application/json',...(token?{'X-Client-Token':token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 let value;try{value=await response.json()}catch{throw Error(slug+' HTTP '+response.status+' sin JSON')}
 return {status:response.status,value};
}
async function ok(slug,body={}){const r=await call(slug,body);assert(r.status>=200&&r.status<300&&r.value.ok===true,slug+' HTTP '+r.status+' no confirmado');return r.value}
const login=await ok('login-goxion',{nombre:QA_NAME,pin:QA_PIN});assert.equal(String(login.cliente?.id),QA_EXPECTED_ID,'Identidad QA distinta: abortar');assert(typeof login.session_token==='string'&&login.session_token.length>20);
token=login.session_token;
const initial=await ok('mi-espacio');assert.equal(String(initial.cliente?.id),QA_EXPECTED_ID);
const reads=[['estado-cuenta-beta',{accion:'mi_estado',datos:{}}],['cancelaciones-cliente',{accion:'listar',datos:{}}],['credenciales-cliente',{accion:'listar',datos:{}}],['novedades-cliente',{accion:'listar',datos:{}}],['accesos-cliente-beta',{accion:'listar',datos:{}}]];
for(const [slug,body] of reads){await ok(slug,body);console.log('OK lectura oficial aislada:',slug)}
console.log('OK login, identidad y Mi Espacio. Sin mostrar datos personales.');
if(process.argv.includes('--missions')){
 assert.equal(QA_CONFIRM_WRITE,QA_EXPECTED_ID,'Confirmación de escritura QA requerida');
 const g=initial.gamificacion;
 assert(g?.misiones_activas===true,'Preparar misiones manuales activas en cuenta QA');
 const tasks=String(g.tareas||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 assert(tasks.length>=2&&tasks.every(s=>!/\[[^\]]+\]\s*$/.test(s)),'Usar solo actividades manuales sintéticas');
 assert.equal((initial.misiones_progreso||[]).length,0,'Cuenta QA debe comenzar sin progreso');
 assert(Number(g.cupon_reclamado_ciclo||0)<Math.max(1,Number(g.cupon_ciclo||1)),'Cupón QA debe estar sin reclamar');
 const early=await call('mi-espacio',{modo:'reclamar_cupon'});assert.equal(early.status,409,'Reclamo anticipado debe rechazarse');
 for(let i=0;i<tasks.length;i++){
  await ok('mi-espacio',{modo:'completar_mision',mision_index:i});
  const current=await ok('mi-espacio');assert.equal(String(current.cliente.id),QA_EXPECTED_ID);assert.equal(current.misiones_progreso.length,i+1);
  console.log('OK avance persistido '+(i+1)+'/'+tasks.length);
 }
 const claim=await ok('mi-espacio',{modo:'reclamar_cupon'});assert.equal(claim.cupon_reclamado,true);assert.notEqual(claim.ya_reclamado,true);
 const again=await ok('mi-espacio',{modo:'reclamar_cupon'});assert.equal(again.ya_reclamado,true);
 console.log('OK reclamo y reintento idempotente. Confeti aún requiere prueba navegador.');
}
if(process.argv.includes('--referral')){
 assert.equal(QA_CONFIRM_WRITE,QA_EXPECTED_ID,'Confirmación de escritura QA requerida');
 const ref=initial.referidos?.[0];assert(ref&&ref.beneficio_reclamado!==true&&ref.meses_efectivos>=3&&ref.plataformas>=2,'Preparar referido QA elegible y no reclamado');
 const claim=await ok('mi-espacio',{modo:'reclamar_mes_referido'});assert.equal(claim.beneficio_reclamado,true);assert.notEqual(claim.ya_reclamado,true);
 const again=await ok('mi-espacio',{modo:'reclamar_mes_referido'});assert.equal(again.ya_reclamado,true);
 console.log('OK referido confirmado y reintento idempotente.');
}
