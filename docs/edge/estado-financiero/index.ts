import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { simularCalendario } from "./calendario-beta.mjs";
import { calendarioInformativo } from "./calendario-cliente.mjs";

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

    if(accion==="mi_estado"){
      const client=await verify(req.headers.get("X-Client-Token")||"",serviceKey,"goxion_client");
      if(!client?.cliente_id)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
      const acceso=await exigirClienteActivo(sb,String(client.cliente_id));if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);
      return res({
        ok:true,
        estado_financiero:await estado(String(client.cliente_id)),
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
      const calendario=calendarioInformativo({
        contratos:contracts.data||[],accesos:accesses.data||[],fechas:verified.data||[]
      });
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