import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { simularCalendario } from "./calendario-beta.mjs";

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

    const admin=await verify(req.headers.get("X-Admin-Token")||"",adminSecret,"goxion_admin");
    if(!admin)return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);


    // Nuevo simulador de calendario por plataforma. No modifica estados ni periodos oficiales.
    if(accion==="listar_calendarios_beta"){
      const [cq,sq]=await Promise.all([
        sb.from("clientes").select("id,nombre,dia_pago,estado").order("nombre").limit(300),
        sb.from("cliente_servicios").select("id,cliente_id").eq("activo",true).limit(900)
      ]);
      if(cq.error||sq.error)throw cq.error||sq.error;
      if((cq.data||[]).length>=300||(sq.data||[]).length>=900)
        return res({ok:false,error:"Lista incompleta. Necesita paginación antes de consultar."},503);
      const totals=new Map<string,number>();
      for(const item of sq.data||[])totals.set(item.cliente_id,(totals.get(item.cliente_id)||0)+1);
      const clientes=(cq.data||[]).filter(c=>(totals.get(c.id)||0)>0).map(c=>({
        id:c.id,nombre:c.nombre,numero_servicios:totals.get(c.id),dia_pago:c.dia_pago,
        estado:c.estado
      }));
      return res({ok:true,modo:"simulacion_sin_escrituras",clientes});
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
      const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Merida",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
      const val=(part:string)=>parts.find(x=>x.type===part)?.value||"";
      const hoy=val("year")+"-"+val("month")+"-"+val("day");
      try{
        const calendario=simularCalendario({
          cliente:cq.data,servicios:sq.data||[],financiero:fq.data,
          propuesta:datos.propuesta||{},hoy
        });
        if(cq.data.estado==="suspendido")calendario.advertencias.push("Cliente suspendido. La simulación no habilita cobro ni reactivación.");
        return res({ok:true,modo:"sombra_sin_escrituras",cliente:{id:cq.data.id,nombre:cq.data.nombre},
          calendario});
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