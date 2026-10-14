import assert from 'node:assert/strict';
import {clasificarRutaCobro} from '../docs/edge/estado-financiero/calendario-ruteo.mjs';
const C={id:'c',estado:'pagado',dia_pago:15};
const F={fuente_financiera:'supabase:goxion_estado_financiero',total_actual:221,fecha_corte:'2026-10-15',
 descuentos:{lealtad:12,programados:20},cargos:{mora:0}};
const a=(i,id='cs')=>({id:i,cliente_servicio_id:id,ordinal:1,activo:true});
const cal=(id,day=15,estado='borrador',servicio='cs')=>({
 cliente_acceso_id:id,cliente_servicio_id:servicio,estado,dia_corte:day,
 cobertura_hasta:'2026-10-'+String(day).padStart(2,'0')});
let n=0;
const verify=(x,expected,reason)=>{assert.equal(x.ruta,expected,reason);
 assert.equal(x.puede_cobrar_por_vencimiento,false);
 assert.equal(x.autoriza_nuevo_pago,false);
 assert.equal(x.usa_total_global,true);n++;};
let x=clasificarRutaCobro({cliente:C,accesos:[a('a'),a('b','other')],calendarios:[],financiero:F});
verify(x,'global_heredado','David cuatro plataformas sin calendarios');
assert.equal(x.total_global_oficial,221,'No se recalcula total con lealtad/cupón');
x=clasificarRutaCobro({cliente:C,accesos:[a('a'),a('b','other')],
 calendarios:[cal('a'),cal('b',15,'borrador','other')],financiero:F});
verify(x,'global_heredado','Borradores mismo día, pago global');
x=clasificarRutaCobro({cliente:{...C,dia_pago:30},accesos:[a('a')],financiero:F});
verify(x,'global_heredado','Un servicio con fecha no 15');
x=clasificarRutaCobro({cliente:C,accesos:[a('a', 'combo'),{...a('b','combo'),ordinal:1}],financiero:F});
verify(x,'global_heredado','Combo con unidades técnicas ambiguas sigue global');
x=clasificarRutaCobro({cliente:{...C,estado:'suspendido'},accesos:[a('a')],financiero:F});
verify(x,'cuenta_suspendida','Cuenta suspendida');
x=clasificarRutaCobro({cliente:{...C,dia_pago:6},accesos:[a('a'),{...a('b'),ordinal:2}],
 calendarios:[cal('a',6,'verificado'),cal('b',30,'verificado')],financiero:F});
verify(x,'b2_multifecha_sombra','Nayeli dos fechas verificadas');
assert.equal(x.dias_distintos,2);assert.equal(x.fechas_confirmadas,2);
x=clasificarRutaCobro({cliente:{...C,dia_pago:6},accesos:[a('a'),{...a('b'),ordinal:2}],
 calendarios:[cal('a',6,'verificado')],financiero:F});
verify(x,'global_heredado','Aún no hay una fecha distinta confirmada');
x=clasificarRutaCobro({cliente:C,accesos:[a('a'),a('b','other')],
 calendarios:[cal('a',30,'verificado')],financiero:F});
verify(x,'requiere_revision','Fecha dispareja parcial');
x=clasificarRutaCobro({cliente:C,accesos:[a('a')],calendarios:[cal('a',30)],financiero:F});
verify(x,'requiere_revision','Borrador distinto a base');
x=clasificarRutaCobro({cliente:C,accesos:[a('a')],calendarios:[cal('a',30,'verificado')],financiero:F});
verify(x,'requiere_revision','Fecha única verificada distinta a base requiere actualizar fecha global');
x=clasificarRutaCobro({cliente:C,accesos:[a('a')],financiero:{...F,fuente_financiera:'browser'}});
verify(x,'requiere_revision','Fuente financiera no oficial');
console.log('GOXION · Rutas global/independiente: '+n+' escenarios PASS; sin dividir beneficios');
