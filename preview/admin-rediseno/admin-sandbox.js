/* Rediseño Admin (espejo): adaptado de preview/integracion-b2/admin-sandbox.js.
 * Espejo de REVISIÓN: permite TODA la lectura del Admin (datos, cuentas,
 * cancelaciones, credenciales, registro, accesos, promociones, ajustes,
 * inventario y gateway B2) pero bloquea TODA escritura: nada de lo que se
 * toque en el espejo modifica clientes, pagos, cuentas ni credenciales.
 * Sin sesión Admin no pasa nada; sin cliente opt-in no acredita.
 * Diferencia con el sandbox F3: superficie de lectura completa (el F3 solo
 * cubría datos + B2); b2_cotizar_ciclo permitido (solo lectura) para que la
 * sección "Cobro B2" de la ficha cargue idéntica a la oficial. */
(function(){
 "use strict";
 if(!/\/preview\/admin-rediseno\/admin\.html$/.test(location.pathname))return;
 const previous=window.fetch.bind(window);
 const endpoint="https://hmpevcwodcgbkviarfic.supabase.co";
 const allowRead={
  "admin-datos":[""],
  "periodo-cobro":["listar_periodos"],
  "trato-justo":["listar_todas"],
  "estado-cuenta-beta":["listar_admin"],
  "beneficios-admin-beta":["listar"],
  "estado-financiero":["comparar_admin","obtener_admin"],
  /* Lecturas del Admin completo (solo lectura). Las escrituras de estos
     mismos recursos siguen BLOQUEADAS: cuentas crear/editar/asignar/
     desasignar/sugerir_pin/asignacion_inteligente; cancelaciones resolver/
     hacer_efectiva; credenciales publicar; registro resolver_solicitud/
     vincular_existente/eliminar_registro/preparar_activacion/
     regenerar_activacion/cancelar_activacion/liberar_telefono/
     actualizar_cliente; admin-operaciones marcar/eliminar_notificaciones/
     rechazar_pago; admin-ajustes guardar_stock_manual/guardar_referido/
     reiniciar_misiones_cliente/nueva_ronda_cupon; admin-acciones
     desactivar_referido. (Inventario: 05-admin-v5-inventory.js lo llama
     con cuerpo "{}" sin accion; es una instantánea de solo lectura.) */
  "cuentas-plataforma-admin-beta":["listar"],
  "cancelaciones-admin":["listar"],
  "credenciales-admin-beta":["listar"],
  "registro-admin":["resumen"],
  "accesos-admin-beta":["modelo","diagnostico"],
  "promociones-admin-beta":["listar"],
  "admin-ajustes":["obtener_stock_manual"],
  "inventario":[""]
 };
 const allowB2=["b2_listar_comprobantes","b2_ver_evidencia",
   "b2_aprobar_comprobante","b2_listar_prorrogas","b2_f4_reintentar_discord",
   /* Rediseño Admin: cotizar es solo lectura (no muta nada); sin ella la
      sección "Cobro B2" de la ficha y el encabezado B2 no cargan en el
      espejo (divergencia §1.10 de la propuesta). Las escrituras legacy
      siguen bloqueadas. */
   "b2_cotizar_ciclo"];
 const denied=()=>new Response(JSON.stringify({ok:false,
   error:"Admin F3 beta: esta operación no está habilitada."}),
   {status:403,headers:{"Content-Type":"application/json"}});
 window.GOXION_B2_ADMIN_MIRROR=Object.freeze({writeLegacyBlocked:true});
 window.fetch=function(input,init={}){
  const url=typeof input==="string"?input:input?.url||"";
  let dest;try{dest=new URL(url,location.href)}catch{return Promise.resolve(denied())}
  const method=String(init?.method||input?.method||"GET").toUpperCase();
  if(method==="GET"){
   if(dest.origin===location.origin||
     ["fonts.googleapis.com","fonts.gstatic.com","cdn.jsdelivr.net","esm.sh"].includes(dest.hostname))
    return previous(input,init);
   return Promise.resolve(denied());
  }
  if(method!=="POST"||dest.origin!==endpoint)return Promise.resolve(denied());
  const resource=dest.pathname.replace("/functions/v1/","");
  let data={};try{data=JSON.parse(typeof init.body==="string"?init.body:"{}")}catch{}
  // El login emite sesión Admin; no modifica ni cobra a clientes.
  if(resource==="login-admin"&&String(data.usuario||"").length>0 &&
    String(data.password||"").length>0)return previous(input,init);
  const headers=new Headers(init.headers||input?.headers||{});
  const adminToken=localStorage.getItem("GOXION_ADMIN_TOKEN")||"";
  if(adminToken.length<20||headers.get("X-Admin-Token")!==adminToken)
    return Promise.resolve(denied());
  const action=String(data.accion||"");
  /* Las lecturas sin accion (admin-datos, inventario) exigen cuerpo vacío:
     son instantáneas de solo lectura, no llamadas con parámetros. */
  const read=allowRead[resource]?.includes(action)===true&&
    (action!==""||Object.keys(data).length===0);
  const b2=resource==="acciones-financieras-b2-beta"&&allowB2.includes(action);
  return read||b2?previous(input,init):Promise.resolve(denied());
 };
 if(navigator.sendBeacon)try{navigator.sendBeacon=()=>false}catch{}
 document.addEventListener("submit",e=>e.preventDefault(),true);
})();