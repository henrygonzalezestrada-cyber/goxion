import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { simularCalendario } from "./calendario-beta.mjs";
import { calendarioInformativo } from "./calendario-cliente.mjs";
import { reconciliarCalendarioOficial } from "./calendario-conciliacion.mjs";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

function res(body:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}

function b64b(text:string){
  const base64=text.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"=");
  const binary=atob(base64);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

function b64t(text:string){
  return new TextDecoder().decode(b64b(text));
}

async function verify(token:string,secret:string,role:string){
  const parts=String(token||"").trim().split(".");
  if(parts.length!==2)return null;
  const key=await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},
    false,
    ["verify"]
  );
  const ok=await crypto.subtle.verify(
    "HMAC",
    key,
    b64b(parts[1]),
    new TextEncoder().encode(parts[0])
  );
  if(!ok)return null;
  try{
    const payload=JSON.parse(b64t(parts[0]));
    return payload?.role===role&&payload?.exp>Math.floor(Date.now()/1000)?payload:null;
  }catch{
    return null;
  }
}

async function exigirClienteActivo(sb:any,clienteId:string){
  const q=await sb.from("clientes").select("estado").eq("id",clienteId).maybeSingle();
  if(q.error)throw q.error;
  if(!q.data)return {ok:false,status:404,error:"Espacio no encontrado"};
  if(String(q.data.estado||"").toLowerCase()==="suspendido")return {ok:false,status:403,error:"Tu espacio se encuentra suspendido. Contacta a soporte para reactivarlo."};
  return {ok:true,status:200,error:""};
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);

  try{
    const url=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminSecret=Deno.env.get("ADMIN_SESSION_SECRET");
    if(!url||!serviceKey||!adminSecret)throw new Error("Configuración interna incompleta");

    const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));
    const accion=String(body?.accion||"mi_estado");
    const datos=body?.datos||{};

    async function estado(clienteId:string){
      const q=await sb.rpc("goxion_estado_financiero",{p_cliente_id:clienteId});
      if(q.error)throw q.error;
      return q.data;
    }

    // Prórrogas autogestionadas: el token identifica al titular.
    // Solicitar y pactar sucede en UNA transacción SQL, sin Admin.
    if(["mi_prorroga","cotizar_prorroga_auto","activar_prorroga_auto"].includes(accion)){
      const token=await verify(req.headers.get("X-Client-Token")||"",serviceKey,"goxion_client");
      if(!token?.cliente_id)return res({ok:false,error:"Tu sesión ha expirado."},401);
      const clienteId=String(token.cliente_id);
      const access=await exigirClienteActivo(sb,clienteId);
      if(!access.ok)return res({ok:false,error:access.error},access.status);
      const client=await sb.from("clientes")
        .select("id,periodo_pendiente,dia_pago,pago_en_revision,estado")
        .eq("id",clienteId).single();
      if(client.error||!client.data)return res({ok:false,error:"Cuenta no disponible"},409);
      const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Merida",
        year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      const part=(t:string)=>parts.find(x=>x.type===t)?.value||"";
      const today=part("year")+"-"+part("month")+"-"+part("day");
      const period=String(client.data.periodo_pendiente||"").slice(0,10);
      const regime=await sb.from("goxion_b2_regimen_cliente")
        .select("activo").eq("cliente_id",clienteId).maybeSingle();
      if(regime.error)throw regime.error;
      const b2=regime.data?.activo===true;
      let agreement:any=null,candidates:any[]=[],allCharges:any[]=[];
      if(b2){
        const charges=await sb.from("goxion_b2_cargos")
          .select("id,fecha_vencimiento,periodo,ciclo_id,liquidado")
          .eq("cliente_id",clienteId).eq("periodo",period).eq("liquidado",false)
          .order("fecha_vencimiento",{ascending:true}).limit(60);
        if(charges.error)throw charges.error;
        allCharges=charges.data||[];
        candidates=allCharges.filter(x=>x.fecha_vencimiento===today);
        const cycleId=(charges.data||[])[0]?.ciclo_id;
        if(cycleId){
          const prior=await sb.from("goxion_b2_prorrogas")
            .select("id,fecha_original,fecha_pactada,estado,cargo_id")
            .eq("cliente_id",clienteId).eq("ciclo_id",cycleId).maybeSingle();
          if(prior.error)throw prior.error;
          agreement=prior.data||null;
        }
      }else{
        const prior=await sb.from("acuerdos_cobro")
          .select("id,fecha_original,fecha_pactada,estado,activo")
          .eq("cliente_id",clienteId).eq("periodo",period).maybeSingle();
        if(prior.error)throw prior.error;
        agreement=prior.data||null;
      }
      if(accion==="mi_prorroga"){
        const last=period?new Date(Date.UTC(Number(period.slice(0,4)),
          Number(period.slice(5,7)),0)).getUTCDate():0;
        const original=b2?(candidates[0]?.fecha_vencimiento||agreement?.fecha_original||null):
          period?period.slice(0,7)+"-"+String(Math.min(Number(client.data.dia_pago)||15,
              last)).padStart(2,"0"):null;
        let may=!agreement&&!client.data.pago_en_revision&&
          (b2?candidates.length>0:original===today);
        let maxDate=original?new Date(Date.parse(original+"T00:00:00Z")+
           5*86400000).toISOString().slice(0,10):null;
        if(may&&b2){
          const next=allCharges.find(x=>x.fecha_vencimiento>today);
          if(next&&next.fecha_vencimiento<=maxDate){
            maxDate=new Date(Date.parse(next.fecha_vencimiento+"T00:00:00Z")-
              86400000).toISOString().slice(0,10);
          }
          const check=await sb.rpc("goxion_b2_cotizar_ciclo",{
            p_cliente_id:clienteId,p_periodo:period});
          may=!check.error&&check.data?.ok===true&&
            check.data?.lealtad_global_perdida!==true&&maxDate>today;
        }
        if(may&&!b2){
          const financial=await estado(clienteId);
          may=financial?.esta_pagado_periodo!==true&&
            financial?.estado!=="pagado"&&financial?.pago_en_revision!==true;
        }
        return res({ok:true,modo:b2?"b2_multifecha":"global",
          acuerdo:agreement?{fecha_original:agreement.fecha_original,
            fecha_pactada:agreement.fecha_pactada,estado:agreement.estado,
            activo:agreement.estado==="aprobada"||agreement.estado==="activo"}:null,
          puede_solicitar:may,fecha_original:original,
          fecha_servidor:today,cargo_id:b2&&may?candidates[0].id:null,
          fecha_maxima:maxDate,
          requiere_autorizacion_admin:false});
      }
      const chosen=String(datos?.fecha_pactada||"");
      const charge=String(datos?.cargo_id||"");
      const operation=String(datos?.clave_idempotencia||"");
      const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(chosen)||
        (b2&&!idPattern.test(charge))||
        (accion==="activar_prorroga_auto"&&!idPattern.test(operation))||
        (accion==="activar_prorroga_auto"&&(
          datos?.acepta_condiciones!==true||datos?.confirma_importe!==true)))
        return res({ok:false,error:"Fecha, monto o aceptación inválidos"},400);
      const args={p_cliente_id:clienteId,p_fecha_pactada:chosen,
        p_cargo_id:b2?charge:null};
      let quote:any=null;
      if(accion==="cotizar_prorroga_auto"||!agreement){
        const calculation=await sb.rpc("goxion_prorroga_auto_cotizar",args);
        if(calculation.error||calculation.data?.ok!==true)
          return res({ok:false,error:calculation.error?.message||
            "La prórroga no cumple las condiciones"},409);
        quote=calculation.data;
      }
      if(accion==="cotizar_prorroga_auto")
        return res({ok:true,cotizacion:quote,requiere_admin:false});
      const applied=b2?
        await sb.rpc("goxion_b2_solicitar_prorroga",{
          p_cliente_id:clienteId,p_cargo_id:charge,
          p_fecha_pactada:chosen,p_operation_id:operation,
          p_motivo:"Solicita prórroga de pago"}):
        await sb.rpc("goxion_prorroga_auto_global",{
          p_cliente_id:clienteId,p_fecha_pactada:chosen,
          p_operation_id:operation});
      if(applied.error||applied.data?.ok!==true)return res({
        ok:false,error:applied.error?.message||"No fue posible confirmar el acuerdo",
        codigo:"PRORROGA_NO_ELEGIBLE"},409);
      // F4: el evento/Admin se guardó ya en SQL, en la misma transacción.
      // Discord se despacha DESPUÉS, sin revertir jamás el acuerdo.
      if(b2&&applied.data?.repetida!==true){
        try{
          const task=fetch(url+"/functions/v1/b2-f4-discord-beta",{
            method:"POST",
            headers:{"Content-Type":"application/json",
              "X-B2-Dispatch-Key":serviceKey},
            body:"{}"
          }).then(r=>{if(!r.ok)console.warn("B2 F4: entrega diferida",r.status)})
            .catch(e=>console.warn("B2 F4: entrega diferida",String(e).slice(0,100)));
          const waitUntil=(globalThis as any).EdgeRuntime?.waitUntil;
          if(typeof waitUntil==="function")waitUntil(task);
          else await task;
        }catch(e){console.warn("B2 F4: aviso pendiente de reintento",String(e).slice(0,100))}
      }
      return res({ok:true,estado:"activo",aprobacion:"automatica",
        acuerdo:applied.data,solicitud_pendiente:false,requiere_admin:false});
    }

    if(accion==="mi_estado"){
      const client=await verify(req.headers.get("X-Client-Token")||"",serviceKey,"goxion_client");
      if(!client?.cliente_id)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
      const acceso=await exigirClienteActivo(sb,String(client.cliente_id));if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);
      const clientId=String(client.cliente_id);
      const state=await estado(clientId);
      const opt=await sb.from("goxion_b2_regimen_cliente")
        .select("activo,periodo_inicio").eq("cliente_id",clientId).maybeSingle();
      if(opt.error)throw opt.error;
      if(opt.data?.activo===true){
        const ciclo=String(state?.periodo||"").slice(0,7)+"-01";
        const b2=await sb.rpc("goxion_b2_cotizar_ciclo",{
          p_cliente_id:clientId,p_periodo:ciclo
        });
        if(b2.error||b2.data?.ok!==true)return res({
          ok:false,modo:"b2_sin_estado_cobrable",
          error:"Calendario financiero pendiente de conciliación; contacta a soporte.",
          permitir_pago_global:false
        },409);
        // F3 beta: un perfil real se presenta por contrato/ordinal verificados.
        // Un ID ambiguo bloquea la cotización en lugar de inventar "Perfil 1".
        const cycle=await sb.from("goxion_b2_ciclos").select("id")
          .eq("cliente_id",clientId).eq("periodo",ciclo).maybeSingle();
        if(cycle.error||!cycle.data?.id)return res({
          ok:false,modo:"b2_sin_estado_cobrable",
          error:"Ciclo B2 pendiente de revisión",permitir_pago_global:false},409);
        const [obligations,accesses,contracts,reports,attributions,sources]=await Promise.all([
          sb.from("goxion_b2_cargos")
            .select("id,cliente_acceso_id,cliente_servicio_id")
            .eq("cliente_id",clientId).eq("periodo",ciclo).limit(90),
          sb.from("cliente_accesos").select("id,ordinal,cliente_servicio_id")
            .eq("cliente_id",clientId).eq("activo",true).limit(90),
          sb.from("cliente_servicios").select("id,nombre")
            .eq("cliente_id",clientId).eq("activo",true).limit(90),
          sb.from("goxion_b2_comprobantes").select("id,estado")
            .eq("cliente_id",clientId).eq("ciclo_id",cycle.data.id)
            .eq("estado","reportado").limit(1),
          sb.from("goxion_b2_atribuciones_comerciales")
            .select("fuente,referencia_id,cliente_acceso_id,monto_centavos")
            .eq("cliente_id",clientId).eq("periodo",ciclo).limit(150),
          sb.rpc("goxion_b2_fuentes_comerciales",{
            p_cliente_id:clientId,p_periodo:ciclo
          })
        ]);
        if(obligations.error||accesses.error||contracts.error||
          reports.error||attributions.error||sources.error)
          throw obligations.error||accesses.error||contracts.error||
            reports.error||attributions.error||sources.error;
        const byCharge=new Map((obligations.data||[]).map((item:any)=>[item.id,item]));
        const byAccess=new Map((accesses.data||[]).map((item:any)=>[item.id,item]));
        const byContract=new Map((contracts.data||[]).map((item:any)=>[item.id,item]));
        const quoteRows=Array.isArray(b2.data.cargos)?b2.data.cargos:[];
        const commercialSources=new Map(
          (Array.isArray(sources.data?.fuentes)?sources.data.fuentes:[])
            .map((x:any)=>[x.fuente+":"+x.referencia_id,x])
        );
        const detailed=quoteRows.map((item:any)=>{
          const obligation=byCharge.get(item.cargo_id) as any;
          const access=byAccess.get(obligation?.cliente_acceso_id) as any;
          const contract=byContract.get(obligation?.cliente_servicio_id) as any;
          if(!obligation||!access||!contract||
            access.cliente_servicio_id!==obligation.cliente_servicio_id||
            item.acceso_id!==access.id||
            !Number.isInteger(access.ordinal)||access.ordinal<1||
            !String(contract.nombre||"").trim())return null;
          const benefits=(attributions.data||[])
            .filter((a:any)=>a.cliente_acceso_id===access.id)
            .map((a:any)=>{
              const source=commercialSources.get(a.fuente+":"+a.referencia_id) as any;
              if(!source||!Number.isSafeInteger(a.monto_centavos)||
                a.monto_centavos<=0)return null;
              return {fuente:a.fuente,referencia_id:a.referencia_id,
                concepto:String(source.concepto||"Beneficio GOXION").slice(0,120),
                monto_centavos:a.monto_centavos};
            });
          if(benefits.some((benefit:any)=>!benefit)||
            benefits.reduce((sum:number,x:any)=>sum+x.monto_centavos,0)!==
              Number(item.descuento_comercial_centavos||0))return null;
          return {...item,servicio:String(contract.nombre).slice(0,100),
            ordinal:access.ordinal,cliente_servicio_id:contract.id,
            beneficios_comerciales:benefits};
        });
        if(!cycle.data?.id||detailed.some((item:any)=>!item)||
          detailed.length!==obligations.data?.length)
          return res({ok:false,modo:"b2_sin_estado_cobrable",
            error:"La identidad de los perfiles requiere revisión de Admin.",
            permitir_pago_global:false},409);
        const quoteReady={...b2.data,ciclo_id:cycle.data.id,cargos:detailed,
          comprobante_en_revision:(reports.data||[]).length>0};
        return res({ok:true,estado_financiero:state,modo:"b2_multifecha",
          permitir_pago_global:false,calendario_financiero:quoteReady,
          fuente:"goxion_b2_cotizar_ciclo"});
      }
      return res({
        ok:true,
        estado_financiero:state,
        modo:"oficial"
      });
    }

    // Fechas confirmadas para el PROPIO cliente: solo informativas.
    // No calcula saldo, descuentos o mora y NO habilita pagar una obligación individual.
    if(accion==="mi_calendario"){
      const client=await verify(req.headers.get("X-Client-Token")||"",serviceKey,"goxion_client");
      if(!client?.cliente_id)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
      const clientId=String(client.cliente_id);
      const permiso=await exigirClienteActivo(sb,clientId);
      if(!permiso.ok)return res({ok:false,error:permiso.error},permiso.status);
      const [contracts,accesses,verified]=await Promise.all([
        sb.from("cliente_servicios").select("id,nombre,monto").eq("cliente_id",clientId)
          .eq("activo",true).limit(80),
        sb.from("cliente_accesos").select("id,cliente_servicio_id,ordinal").eq("cliente_id",clientId)
          .eq("activo",true).limit(90),
        sb.from("goxion_calendario_accesos")
          .select("cliente_acceso_id,cliente_servicio_id,cobertura_hasta,dia_corte,estado,precio_centavos")
          .eq("cliente_id",clientId).eq("estado","verificado").limit(90)
      ]);
      if(contracts.error||accesses.error||verified.error)
        throw contracts.error||accesses.error||verified.error;
      const todayParts=new Intl.DateTimeFormat("en-US",{
        timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"
      }).formatToParts(new Date());
      const part=(type:string)=>todayParts.find(p=>p.type===type)?.value||"";
      const hoy=part("year")+"-"+part("month")+"-"+part("day");
      const calendario=calendarioInformativo({
        contratos:contracts.data||[],accesos:accesses.data||[],fechas:verified.data||[],hoy
      });
      // Solo si Admin activó B2: exponer saldo individual verificado
      // al PROPIO cliente que ya pasó el X-Client-Token firmado.
      const opt=await sb.from("goxion_b2_regimen_cliente")
        .select("activo").eq("cliente_id",clientId).maybeSingle();
      if(opt.error)throw opt.error;
      if(opt.data?.activo===true){
        const state=await estado(clientId);
        const periodo=String(state?.periodo||"").slice(0,7)+"-01";
        const quote=await sb.rpc("goxion_b2_cotizar_ciclo",{
          p_cliente_id:clientId,p_periodo:periodo
        });
        if(quote.error||quote.data?.ok!==true)return res({
          ok:false,error:"El calendario de pagos requiere conciliación",
          modo:"b2_sin_estado_cobrable",permitir_pago_global:false
        },409);
        return res({ok:true,calendario,calendario_financiero:quote.data,
          permitir_pago_global:false,modo:"b2_multifecha",
          fuente:"goxion_b2_cotizar_ciclo"});
      }
      return res({ok:true,calendario,fuente:"goxion_calendario_accesos",modo:"solo_fechas_sin_cobro"});
    }

    const admin=await verify(req.headers.get("X-Admin-Token")||"",adminSecret,"goxion_admin");
    if(!admin)return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);


    // Nuevo simulador de calendario por plataforma. No modifica estados ni periodos oficiales.
    if(accion==="listar_calendarios_beta"){
      const [cq,sq]=await Promise.all([
        sb.from("clientes").select("id,nombre,dia_pago,estado").order("nombre").limit(300),
        sb.from("cliente_servicios").select("id,cliente_id,nombre").eq("activo",true).limit(900)
      ]);
      if(cq.error||sq.error)throw cq.error||sq.error;
      if((cq.data||[]).length>=300||(sq.data||[]).length>=900)
        return res({ok:false,error:"Lista incompleta. Necesita paginación antes de consultar."},503);
      const totals=new Map<string,number>();
      for(const item of sq.data||[]){
        const n=String(item.nombre||"").match(/\(\s*x([2-9]|1[0-2])\s*\)/i);
        totals.set(item.cliente_id,(totals.get(item.cliente_id)||0)+(n?Number(n[1]):1));
      }
      const clientes=(cq.data||[]).filter(c=>(totals.get(c.id)||0)>0).map(c=>({
        id:c.id,nombre:c.nombre,numero_servicios:totals.get(c.id),dia_pago:c.dia_pago,
        estado:c.estado
      }));
      return res({ok:true,modo:"simulacion_sin_escrituras",clientes});
    }
    // Relación real entre contrato y acceso técnico. No inventar otra clave para X2.
    async function accesosDeCliente(clienteId:string){
      const r=await sb.from("cliente_accesos")
        .select("id,cliente_id,cliente_servicio_id,servicio_id,ordinal,activo")
        .eq("cliente_id",clienteId).eq("activo",true).limit(90);
      if(r.error)throw r.error;
      if((r.data||[]).length>=90)throw new Error("Demasiados accesos: revisión requerida");
      return r.data||[];
    }
    function idsSimulados(contratos:any[],accesos:any[]){
      const mapa=new Map<string,string>();
      const porContrato=new Map<string,any[]>();
      for(const a of accesos){
        const list=porContrato.get(a.cliente_servicio_id)||[];
        list.push(a);porContrato.set(a.cliente_servicio_id,list);
      }
      for(const c of contratos){
        const list=(porContrato.get(c.id)||[]).sort((a,b)=>a.ordinal-b.ordinal);
        const x=String(c.nombre||"").match(/\(\s*x([2-9]|1[0-2])\s*\)/i);
        const multiple=x?Number(x[1]):1;
        if(multiple!==list.length)continue; // Nunca mapear combos de dos plataformas como X2.
        if(multiple>1 && new Set(list.map(a=>a.ordinal)).size!==list.length)continue;
        for(let i=0;i<list.length;i++){
          const a=list[i];
          mapa.set(a.id,multiple>1?c.id+"#"+(i+1):c.id);
        }
      }
      return mapa;
    }
    async function obtenerConfiguracion(clienteId:string,contratos:any[],accesos:any[]){
      const q=await sb.from("goxion_calendario_accesos")
        .select("cliente_acceso_id,cliente_servicio_id,cobertura_hasta,dia_corte,precio_centavos,estado,revision")
        .eq("cliente_id",clienteId).limit(90);
      if(q.error)throw q.error;
      const mapa=idsSimulados(contratos,accesos);
      const byAccess=new Map(accesos.map(a=>[a.id,a]));
      const configuracion:Record<string,any>={};
      const disponibles:Record<string,string>={};
      for(const [accessId,id] of mapa)disponibles[id]=accessId;
      for(const item of q.data||[]){
        const id=mapa.get(item.cliente_acceso_id);
        if(!id||!byAccess.has(item.cliente_acceso_id))continue;
        configuracion[id]={
          cobertura_hasta:item.cobertura_hasta,dia_original:item.dia_corte,
          cobertura_confirmada:item.estado==="verificado",
          precio_centavos:item.precio_centavos,
          revision:item.revision
        };
      }
      const preciosDesactualizados:string[]=[];
      for(const contrato of contratos){
        const claves=Object.keys(configuracion).filter(id=>id===contrato.id||id.startsWith(contrato.id+"#"));
        if(!claves.length)continue;
        const total=claves.reduce((sum,id)=>sum+Number(configuracion[id].precio_centavos||0),0);
        if(total!==Math.round(Number(contrato.monto)*100)){
          preciosDesactualizados.push(contrato.id);
          for(const id of claves)delete configuracion[id].precio_centavos;
        }
      }
      return {configuracion,disponibles,preciosDesactualizados};
    }

    if(accion==="guardar_calendario_beta"){
      const contratoId=String(datos?.contrato_id||"");
      const unidades=datos?.unidades;
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contratoId))
        return res({ok:false,error:"Contrato inválido"},400);
      if(!Array.isArray(unidades)||unidades.length<1||unidades.length>30)
        return res({ok:false,error:"Los accesos del contrato son obligatorios"},400);
      const q=await sb.from("cliente_servicios").select("id,cliente_id,activo").eq("id",contratoId).maybeSingle();
      if(q.error)throw q.error;
      if(!q.data||q.data.activo!==true)return res({ok:false,error:"Contrato inactivo o inexistente"},404);
      const cq=await sb.from("clientes").select("estado").eq("id",q.data.cliente_id).maybeSingle();
      if(cq.error)throw cq.error;
      if(cq.data?.estado==="suspendido")return res({ok:false,error:"No configurar fechas de un cliente suspendido"},403);
      if(JSON.stringify(unidades).length>10000)return res({ok:false,error:"Datos de calendario excesivos"},400);
      const actor="admin:"+String(admin.sub||admin.user_id||admin.id||"sesion").slice(0,100);
      const save=await sb.rpc("goxion_guardar_calendario_contrato_borrador",{
        p_cliente_servicio_id:contratoId,p_unidades:unidades,p_actor:actor
      });
      if(save.error)return res({ok:false,error:"No se pudo guardar: "+save.error.message},400);
      return res({ok:true,modo:"calendario_persistido_sin_cobro",guardado:save.data});
    }

    if(accion==="simular_calendario_beta"){
      const clienteId=String(datos?.cliente_id||"").trim();
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clienteId))
        return res({ok:false,error:"Identificador de cliente inválido."},400);
      if(JSON.stringify(datos?.propuesta||{}).length>12000)
        return res({ok:false,error:"Demasiados datos en el plan."},400);
      const [cq,sq,fq]=await Promise.all([
        sb.from("clientes").select("id,nombre,dia_pago,estado").eq("id",clienteId).maybeSingle(),
        sb.from("cliente_servicios").select("id,cliente_id,nombre,monto,activo")
          .eq("cliente_id",clienteId).eq("activo",true).limit(32),
        sb.rpc("goxion_estado_financiero",{p_cliente_id:clienteId})
      ]);
      if(cq.error||sq.error||fq.error)throw cq.error||sq.error||fq.error;
      if(!cq.data)return res({ok:false,error:"No existe el cliente."},404);
      if((sq.data||[]).length>=32)return res({ok:false,error:"Demasiados servicios: revisión manual requerida."},400);
      const accesos=await accesosDeCliente(clienteId);
      const persistencia=await obtenerConfiguracion(clienteId,sq.data||[],accesos);
      const propuestaOriginal=datos.propuesta||{};
      const combinados:Record<string,any>={...persistencia.configuracion};
      for(const [id,valor] of Object.entries(propuestaOriginal.servicios||{})){
        // Un restablecimiento de fecha general omite el registro persistido SOLO en simulación.
        if((valor as any)?.usar_general===true){delete combinados[id];continue;}
        combinados[id]={...(combinados[id]||{}),...(valor as object)};
      }
      const propuesta={...propuestaOriginal,servicios:combinados};
      const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Merida",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      const val=(part:string)=>parts.find(x=>x.type===part)?.value||"";
      const hoy=val("year")+"-"+val("month")+"-"+val("day");
      try{
        const calendario=simularCalendario({
          cliente:cq.data,servicios:sq.data||[],financiero:fq.data,
          propuesta,hoy
        });
        // Solo contabilidad sombra: jamás generar obligación o editar el importe oficial.
        calendario.conciliacion=reconciliarCalendarioOficial({calendario,financiero:fq.data});
        if(persistencia.preciosDesactualizados.length)
          calendario.advertencias.push("Cambió la tarifa de una contratación: se conservan fechas, pero debe revisarse el desglose de precios antes de cobrar.");
        if(cq.data.estado==="suspendido")calendario.advertencias.push("Cliente suspendido. La simulación no habilita cobro ni reactivación.");
        return res({ok:true,modo:"sombra_sin_cobros",cliente:{id:cq.data.id,nombre:cq.data.nombre},
          calendario,persistencia:{
            configuracion:persistencia.configuracion,
            accesos:persistencia.disponibles,
            guardado_disponible:true
          }});
      }catch(error){
        return res({ok:false,error:error instanceof Error?error.message:"Propuesta inválida"},400);
      }
    }

    if(accion==="obtener_admin"){
      const clienteId=String(datos?.cliente_id||"").trim();
      if(!clienteId)return res({ok:false,error:"Falta cliente_id"},400);
      return res({
        ok:true,
        estado_financiero:await estado(clienteId),
        modo:"oficial"
      });
    }

    if(accion==="listar_admin"||accion==="comparar_admin"){
      const cq=await sb.from("clientes").select("id,folio,nombre").order("nombre");
      if(cq.error)throw cq.error;

      const estados:any[]=[];
      let diferencias=0;
      let deltaAbs=0;

      for(const cliente of cq.data||[]){
        try{
          const e=await estado(String(cliente.id));
          const delta=Math.abs(Number(e?.shadow?.delta_total||0));
          if(delta>=0.005)diferencias++;
          deltaAbs+=delta;
          estados.push(e);
        }catch(error){
          estados.push({
            cliente_id:cliente.id,
            folio:cliente.folio,
            nombre:cliente.nombre,
            error:error instanceof Error?error.message:String(error)
          });
        }
      }

      return res({
        ok:true,
        estados,
        comparacion:{
          clientes:(cq.data||[]).length,
          diferencias,
          delta_abs_total:Math.round(deltaAbs*100)/100
        },
        fuente:"supabase:goxion_estado_financiero",
        modo:"oficial"
      });
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(error){
    console.error(error);
    return res({
      ok:false,
      error:error instanceof Error?error.message:"No fue posible calcular el estado financiero"
    },500);
  }
});