/* GOXION: contratos de presentación del runtime REAL, sin red, sin usuarios reales.
   No equivale a E2E. Un caso hipotético de precedencia se registra como investigación,
   porque todavía falta verificar qué combinación emite el backend oficial. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('preview/mi-espacio-v2/official-feed-runtime.js','utf8');
function cut(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i,'Falta función '+a);return source.slice(i,j)}
const api=new Function("const state={view:null}; const gxServiceHasAlert=name=>name==='QA Pausado'; const clean=x=>String(x??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();"+cut("function heroState(view){","const paths=")+cut("function missionInfo(view){","function updateMini(")+cut("function serviceDetail(s){","function accessRow(")+"return {heroState,missionInfo,serviceDetail,benefit:(v,k)=>{state.view=v;return benefitState(k)}}")();
const base={cliente:{estado:'pagado',dia_pago:15,pagos_puntuales:3},servicios:[{id:'qa',nombre:'Disney+'}],estado_cuenta:{estado:'pagado',lealtad:{pagos_efectivos:3}},pagos:[],gamificacion:null,misiones_progreso:[],referidos:[]};
const view=p=>({...base,...p,cliente:{...base.cliente,...p.cliente},estado_cuenta:{...base.estado_cuenta,...p.estado_cuenta}});
const results=[];
function check(name,actual,expected){results.push({name,actual,expected,ok:JSON.stringify(actual)===JSON.stringify(expected)})}
for(const [name,p,expected] of [
 ['Al corriente',{},'clear'],['Próximo pago',{cliente:{estado:'pendiente'}},'soon'],['Vencido',{cliente:{estado:'vencido'}},'overdue'],['Suspendido',{cliente:{estado:'suspendido'}},'suspended'],
 ['Comprobante rechazado',{cliente:{pago_revision_estado:'rechazado'}},'correction'],['Pago incompleto',{cliente:{pago_revision_estado:'incompleto'}},'incomplete'],['En revisión',{cliente:{pago_en_revision:true}},'review'],
 ['Prórroga confirmada',{estado_cuenta:{prorroga_confirmada:true}},'extension'],['Cancelación',{servicios:[{cancelacion:{estado:'solicitada'}}]},'cancellation'],
 ['Nuevo',{cliente:{estado:'pendiente',origen_cliente:'goxion',promo_nuevo_elegible:true,usuario_acceso:'qa'},servicios:[]},'new']
])check(name,api.heroState(view(p))[0],expected);
const ambiguous=api.heroState(view({cliente:{estado:'vencido'},estado_cuenta:{estado:'vencido',prorroga_confirmada:true}}))[0];
console.log('INVESTIGAR con respuesta real: prórroga confirmada + estado vencido previo =>',ambiguous);
for(const [name,k,p,expected] of [
 ['Racha rota','loyalty',{cliente:{pagos_puntuales:0,racha_reiniciada_virtual:true}},'lost'],['Racha activa','loyalty',{},'active'],
 ['Referidos sin invitado','referral',{},'none'],['Referido activo','referral',{referidos:[{meses_efectivos:2,servicios:['a','b']}]},'active'],
 ['Referido listo','referral',{referidos:[{meses_efectivos:3,servicios:['a','b']}]},'ready'],['Referido reclamado','referral',{referidos:[{meses_efectivos:3,servicios:['a','b'],beneficio_reclamado:true}]},'claimed'],
 ['Misión pendiente','mission',{gamificacion:{tareas:'Actividad 1\nActividad 2',misiones_version:2},misiones_progreso:[{misiones_version:2,mision_index:0}]},'active'],
 ['Misión completa','mission',{gamificacion:{tareas:'Actividad 1\nActividad 2',misiones_version:2},misiones_progreso:[{misiones_version:2,mision_index:0},{misiones_version:2,mision_index:1}]},'ready'],
 ['Cupón aplicado','mission',{gamificacion:{tareas:'Actividad 1',cupon_ciclo:2,cupon_reclamado_ciclo:2}},'claimed']
])check(name,api.benefit(view(p),k).phase,expected);
check('Contrato real: API filtra por versión y omite versión en cada fila',api.benefit(view({gamificacion:{tareas:'A\nB',misiones_version:3},misiones_progreso:[{mision_index:0},{mision_index:1}]}),'mission').phase,'ready');
check('Excluir versión explícitamente antigua',api.missionInfo(view({gamificacion:{tareas:'A\nB',misiones_version:3},misiones_progreso:[{misiones_version:2,mision_index:0},{mision_index:1}]})).done,1);
check('Lealtad toma pagos efectivos de fuente oficial',api.benefit(view({cliente:{pagos_puntuales:6},estado_cuenta:{lealtad:{pagos_efectivos:0}}}),'loyalty').num,'0/4');
check('Contrato real de QA vencido: cuatro guardados, cero efectivos',api.benefit(view({cliente:{estado:'vencido',pagos_puntuales:4},estado_cuenta:{lealtad:{pagos_guardados:4,pagos_efectivos:0,racha_reiniciada_virtual:true}}}),'loyalty').num,'0/4');
check('No mostrar racha histórica si falla la lectura financiera',api.benefit({...base,cliente:{estado:'vencido',pagos_puntuales:4},estado_cuenta:null},'loyalty').num,'—');
check('B2 sin conciliación no ofrece un cobro global',api.heroState(view({finanzas_b2:{modo:'b2_sin_estado_cobrable'}}))[0],'incomplete');
check('Revisión prevalece sobre vencimiento anterior',api.heroState(view({cliente:{estado:'vencido',pago_en_revision:true}}))[0],'review');
check('Corazón roto',api.benefit(view({cliente:{pagos_puntuales:0,racha_reiniciada_virtual:true}}),'loyalty').emoji,'💔');
check('Referidos: total normalizado de servidor',api.benefit(view({referidos:[{meses_efectivos:3,plataformas:2,servicios:[]}]}),'referral').phase,'ready');
for(const [name,s,expected] of [
 ['Servicio activo',{},'active'],['Interrupción oficial',{nombre:'QA Pausado'},'caution'],['Solicitud',{cancelacion:{estado:'solicitada'}},'pending'],['Aprobada',{cancelacion:{estado:'aprobada'}},'caution'],['Rechazada',{cancelacion:{estado:'rechazada'}},'danger'],
 ['Invitación',{accesos:[{estado_invitacion:'pendiente'}]},'pending'],['Contraseña nueva',{credencial_pendiente:{id:'qa'}},'notice']
])check(name,api.serviceDetail(s)[1],expected);
console.table(results);
assert.equal(results.filter(x=>!x.ok).length,0,'Regresión de contrato del feed');
console.log(results.length+' contratos aprobados. No certifican operaciones reales.');
