/* GOXION · Mi Espacio espejo.
 * Preserva TODA la interfaz y el renderDashboard oficial. Únicamente
 * reemplaza la identidad con un fixture local en esta ruta de sandbox.
 */
(function(){
 "use strict";
 if(!window.GOXION_B2_MIRROR?.writeBlocked)return;
 const key="b2-demo";
 const financial={
  fuente_financiera:"supabase:goxion_estado_financiero",
  periodo:"2026-11-01",dia_pago:6,fecha_corte:"2026-11-06",
  estado:"vence_hoy",estado_label:"Tu pago vence hoy",total_label:"Saldo pendiente",
  subtotal:98,total_actual:92.12,dias_para_corte:0,dias_atraso:0,
  esta_pagado_periodo:false,pago_en_revision:false,
  lealtad:{pagos_guardados:10,pagos_efectivos:10,porcentaje:6,monto:5.88},
  cargos:{mora:0,reactivacion:0},
  desglose:[{concepto:"Subtotal",tipo:"subtotal",monto:98},
    {concepto:"Descuento de lealtad",tipo:"descuento",monto:-5.88}]
 };
 const fixture={
  [key]:{
   id:"demo-b2-no-real",clave:key,folio:"GX-0026",nombre:"Cliente GOXION",
   estado:"pendiente",origen_cliente:"goxion",dia_pago:6,
   periodo_pendiente:"2026-11-01",pagos_puntuales:10,pago_en_revision:false,
   estado_cuenta:financial,
   servicios:[{id:"demo-vix-1",nombre:"ViX Premium · Perfil 1",monto:49,activo:true},
     {id:"demo-vix-2",nombre:"ViX Premium · Perfil 2",monto:49,activo:true}],
   historial_pagos:[],
   gamificacion:{misiones_activas:false,descuento:0,tareas:"",progreso:[]},
   referidos:[],referido_activo:null,cliente_accesos:[],
   credenciales_entregas:[],novedades_servicio:[],cancelaciones:[],
   descuento_fallas:0,descuentos_especiales:[],
   promociones_aplicadas:[]
  },
  _goxion_config:{alertas:{},serviciosGlobales:[],combo_upsell:false}
 };
 // El demo NUNCA se comunica con el servidor. Al usar funciones reales
 // del dashboard validamos la jerarquía, lealtad, servicios y animaciones.
 window.goxionCurrentClientKey=key;
 window.cargarDatosYVerificarSesion=async function(){
   globalClientesData=fixture;
   if(typeof renderDashboard==="function")renderDashboard(key);
   if(typeof switchTab==="function")switchTab("inicio");
   document.getElementById("guest-action-card")?.style.setProperty("display","none");
   return fixture;
 };
 window.irAlTicket=function(){
   location.href="./preview/integracion-b2/index.html?cliente=b2-demo&demo=1";
 };
 window.GOXION_B2_MIRROR_DEMO=Object.freeze({modo:"interfaz-oficial",key});
})();