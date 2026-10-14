(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (!params.has("cliente")) {
    params.set("cliente", "b2-demo");
    params.set("demo", "1");
    history.replaceState(null, "", location.pathname + "?" + params.toString());
  }
  const demo = params.get("demo") === "1" && params.get("cliente") === "b2-demo";
  const f3=params.get("f3")==="1"&&!demo&&
    window.GOXION_B2_MIRROR?.integratedBeta===true;
  const store = { demo, f3, quote:null,blocked:false,scenario:"puntual",
    error:"",report:null,reportOperation:null };
  window.GOXION_B2_PREVIEW = store;

  // En la demostración también sustituimos los DATOS BANCARIOS:
  // ninguna CLABE real debe mostrarse ni copiarse accidentalmente.
  if(demo){
    const original=window.GOXION_CORE;
    const fakeBank=Object.freeze({
      ...original.BUSINESS.BANK,NAME:"BANCO DE PRUEBA",
      HOLDER:"CUENTA DEMOSTRACIÓN",CLABE:"000000000000000000",
      ACCOUNTS:Object.freeze([
        Object.freeze({ID:"nu",LABEL:"Nu",INSTITUTION:"Datos no operativos",
          HOLDER:"CUENTA DEMOSTRACIÓN",CLABE:"000000000000000000",
          CURRENCY:"MXN",PRIMARY:true}),
        Object.freeze({ID:"revolut",LABEL:"Revolut",INSTITUTION:"Datos no operativos",
          HOLDER:"CUENTA DEMOSTRACIÓN",CLABE:"000000000000000000",
          CURRENCY:"MXN",PRIMARY:false})
      ])
    });
    window.GOXION_CORE=Object.freeze({...original,
      BUSINESS:Object.freeze({...original.BUSINESS,BANK:fakeBank})});
  }

  function fixture() {
    return { "b2-demo": {
      id: "demo-b2-no-real", clave: "b2-demo", folio: "GX-0026",
      nombre: "Cliente GOXION", estado: "pendiente",
      dia_pago: 6, periodo_pendiente: "2026-11-01", pagos_puntuales: 10,
      pago_en_revision: false, historial_pagos: [],
      servicios: [{nombre:"ViX Premium · 2 perfiles",monto:98}],
      estado_cuenta: {
        fuente_financiera:"supabase:goxion_estado_financiero",
        periodo:"2026-11-01",estado:"pendiente",
        estado_label:"Pendiente",total_label:"Saldo pendiente",
        subtotal:98,total_actual:92,dias_para_corte:25,
        esta_pagado_periodo:false,pago_en_revision:false,
        lealtad:{pagos_guardados:10,pagos_efectivos:10,
          porcentaje:6,monto:6},cargos:{mora:0,reactivacion:0},
        desglose:[{concepto:"Subtotal",tipo:"subtotal",monto:98},
          {concepto:"Programa GOXION",tipo:"descuento",monto:-6}]
      }
    }};
  }
  function charge(id, day, amount, extra) {
    return Object.assign({
      cargo_id:"b2-demo-"+id,acceso_id:"demo-"+id,
      servicio:"ViX Premium", ordinal: id, vence:"2026-11-"+day,
      base_centavos:4900,descuento_centavos:294,
      principal_centavos:amount,mora_centavos:0,
      total_centavos:amount,pagado:false
    },extra||{});
  }
  function makeQuote(scenario) {
    let rows = [charge(1,"06",4606),charge(2,"30",4606)];
    let lost = false;
    if(scenario==="vencido"){
      lost=true;
      rows=[charge(1,"06",4900,{descuento_centavos:0,mora_centavos:245,
        total_centavos:5145}),
        charge(2,"30",4900,{descuento_centavos:0})];
    }
    if(scenario==="prorroga"){
      rows=[charge(1,"06",4606,{fecha_pactada:"2026-11-09",prorroga_estado:"aprobada"}),
        charge(2,"30",4606)];
    }
    if(scenario==="prorroga-incumplida"){
      lost=true;
      rows=[charge(1,"06",4900,{fecha_pactada:"2026-11-09",
        prorroga_estado:"aprobada",descuento_centavos:0,
        mora_centavos:980,total_centavos:5880}),charge(2,"30",4900,{
        descuento_centavos:0})];
    }
    if(scenario==="parcial"){
      rows=[charge(1,"06",2606,{abono_pagado_centavos:2000}),
        charge(2,"30",4606)];
    }
    if(scenario==="primero-pagado"){
      rows=[charge(1,"06",0,{pagado:true,principal_centavos:0,
        total_centavos:0,abono_pagado_centavos:4606}),
        charge(2,"30",4606)];
    }
    return {ok:true,modo:"b2_multifecha",cobrable:false,solo_cotizacion:true,
      requiere_aprobacion_admin:true,periodo:"2026-11-01",
      lealtad_global_perdida:lost,cargos:rows,
      total_pendiente_centavos:rows.reduce((sum,x)=>sum+x.total_centavos,0)};
  }
  store.makeDemo = function(scenario) {
    store.scenario=scenario;
    store.quote=makeQuote(scenario);
    window.dispatchEvent(new CustomEvent("goxion:b2-quote-change"));
  };
  if (demo) store.quote = makeQuote("puntual");

  // Corre después del adaptador oficial, antes del renderizador original.
  // Para clientes reales conserva el fetch y los datos ya autorizados;
  // únicamente consulta su estado B2 en una función beta aislada.
  const previousFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (demo && (/^goxion:\/\//i.test(url)||/discord(?:app)?\.com/i.test(url))) {
      return new Response(JSON.stringify({ok:false,modo:"demo_sin_envios"}),{
        status:403,headers:{"Content-Type":"application/json"}
      });
    }
    if (!url.includes("clientes.json")) return previousFetch(input,init);
    if (demo) return new Response(JSON.stringify(fixture()), {
      status:200,headers:{"Content-Type":"application/json"}
    });
    const result=await previousFetch(input,init);
    if(!result.ok||!f3)return result;
    const core=window.GOXION_CORE;
    const token=localStorage.getItem(core.STORAGE.CLIENT_TOKEN)||"";
    if(!token)return result;
    try{
      const beta=await previousFetch(core.endpoint("estado-financiero-b2-beta"),{
        method:"POST",cache:"no-store",
        headers:{"Content-Type":"application/json","X-Client-Token":token},
        body:JSON.stringify({accion:"mi_estado",datos:{}})
      });
      const response=await beta.json().catch(()=>({}));
      if(response.modo==="b2_sin_estado_cobrable"){
        store.blocked=true;store.quote=null;
        store.error=response.error||"La cuenta B2 requiere revisión.";
      }else if(beta.ok&&response.ok&&response.modo==="b2_multifecha"){
        const quote=response.calendario_financiero;
        if(quote?.ok===true&&quote?.cobrable===true&&
          /^[0-9a-f-]{36}$/i.test(String(quote.ciclo_id||""))&&
          Array.isArray(quote.cargos)&&quote.cargos.every(x=>
            x.cargo_id&&x.acceso_id&&x.servicio&&Number.isInteger(x.ordinal))){
          store.quote=quote;store.blocked=false;
        }else{
          store.blocked=true;store.quote=null;
          store.error="El ciclo o los perfiles no están conciliados.";
        }
      }else if(response.modo==="oficial"){
        store.quote=null;store.blocked=false;store.error="";
      }else if(!beta.ok){
        store.blocked=true;store.error="No fue posible validar B2 con el servidor.";
      }
    }catch(error){
      store.blocked=true;
      store.error="No se pudo verificar la cotización B2.";
    }
    window.dispatchEvent(new CustomEvent("goxion:b2-quote-change"));
    return result;
  };
})();