import assert from "node:assert/strict";
import {cotizarProrroga as quote} from "../docs/edge/estado-financiero/prorroga-policy.mjs";
let n=0;const pass=x=>{assert(x.ok,JSON.stringify(x));n++;return x};
const deny=(x,why)=>{assert.equal(x.ok,false);assert.equal(x.reason,why);n++};
const example={original:"2026-10-15",pactada:"2026-10-18",
 principalCentavos:4606,descuentoCentavos:294,
 aprobada:true};
let a=pass(quote({...example,hoy:"2026-10-15"}));
assert.equal(a.mora_actual_centavos,0);assert.equal(a.conserva_lealtad,true);
assert.equal(a.total_si_paga_pactada_centavos,4606);
assert.equal(a.mora_si_incumple_al_dia_siguiente_centavos,980);
assert.equal(a.total_si_incumple_al_dia_siguiente_centavos,5880);
a=pass(quote({...example,hoy:"2026-10-18"}));
assert.equal(a.conserva_lealtad,true);assert.equal(a.mora_actual_centavos,0);
a=pass(quote({...example,hoy:"2026-10-19"}));
assert.equal(a.mora_dias_retroactivos,4);assert.equal(a.mora_actual_centavos,980);
assert.equal(a.conserva_lealtad,false);assert.equal(a.total_actual_centavos,5880);
a=pass(quote({...example,hoy:"2026-10-30"}));
assert.equal(a.porcentaje_mora,50);assert.equal(a.mora_actual_centavos,2450);
a=pass(quote({...example,aprobada:false,solicitud:"2026-10-14",hoy:"2026-10-14"}));
assert.equal(a.conserva_lealtad,false);
deny(quote({...example,pactada:"2026-10-21",hoy:"2026-10-15"}),"prorroga_fuera_de_rango");
deny(quote({...example,aprobada:false,solicitud:"2026-10-16",hoy:"2026-10-16"}),"solicitud_fuera_de_plazo");
deny(quote({...example,aprobada:false,solicitud:"2026-10-15",hoy:"2026-10-15",usadasPeriodo:1}),"ya_uso_prorroga_del_periodo");
deny(quote({...example,original:"2026-02-30"}),"parametros_invalidos");
const c=pass(quote({original:"2026-11-06",pactada:"2026-11-11",hoy:"2026-11-12",
 principalCentavos:4606,descuentoCentavos:294,aprobada:true}));
assert.equal(c.mora_actual_centavos,1470);
assert.equal(c.total_actual_centavos,6370);
console.log("GOXION · Prórrogas y lealtad "+n+" casos PASS");
