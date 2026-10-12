import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-admin-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

function decodePart(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function validAdmin(req: Request, secret: string) {
  const token = (req.headers.get("X-Admin-Token") || "").trim();
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, token: "" };

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    decodePart(parts[1]),
    new TextEncoder().encode(parts[0]),
  );
  if (!verified) return { ok: false, token: "" };

  try {
    const payload = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const now = Math.floor(Date.now() / 1000);
    return {
      ok: payload?.role === "goxion_admin" && Number(payload?.exp || 0) > now,
      token,
    };
  } catch {
    return { ok: false, token: "" };
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {}
  return { text, body };
}

async function callFunction(
  url: string,
  name: string,
  action: string,
  data: Record<string, unknown>,
  adminToken: string,
) {
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify({ accion: action, datos: data }),
  });
  const parsed = await readJson(response);
  return { response, ...parsed };
}

async function financialState(sb: any, clienteId: string) {
  if (!clienteId) return { data: null, error: null };
  return sb.rpc("goxion_estado_financiero", { p_cliente_id: clienteId });
}

function month(value: unknown) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

function todayMx() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseDateOnly(value: unknown) {
  const raw=String(value||"").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function addDays(dateText: string, days: number) {
  const d=new Date(dateText+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  const operationId = crypto.randomUUID();

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminSecret = Deno.env.get("ADMIN_SESSION_SECRET");
    if (!url || !serviceKey || !adminSecret) throw new Error("Configuración interna incompleta");

    const auth = await validAdmin(req, adminSecret);
    if (!auth.ok) {
      return json({ ok: false, error: "Sesión administrativa inválida o expirada", operation_id: operationId }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.accion || "").trim();
    const data = payload?.datos && typeof payload.datos === "object" ? payload.datos : {};
    const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // B2: preflight de preparación ANTES de mover o facturar cualquier acceso.
    // Sólo Admin. Es lectura SQL sin efecto financiero; incluso si pasa, NO cobra.
    if (action === "diagnostico_b2_sombra") {
      const clienteId=String(data?.cliente_id||"").trim();
      const periodo=String(data?.periodo||"").trim();
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuid.test(clienteId)||
        (periodo&&!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(periodo))) {
        return json({ok:false,error:"Cliente o período no válido",
          codigo:"DIAGNOSTICO_B2_PARAMETROS_INVALIDOS",cobrable:false},400);
      }
      const check=await sb.rpc("goxion_diagnostico_b2_sombra",{
        p_cliente_id:clienteId,p_periodo:periodo||null
      });
      if (check.error||check.data?.ok!==true) {
        return json({ok:false,error:check.error?.message||"Diagnóstico no disponible",
          codigo:"DIAGNOSTICO_B2_NO_VERIFICADO",cobrable:false},409);
      }
      return json({ok:true,accion:action,resultado:check.data,
        modo:"diagnostico_b2_sombra",cobrable:false,
        acreditada_oficial:false,operation_id:operationId});
    }

    // B2: imputación exclusivamente SOMBRA de un pago YA APROBADO.
    // No modifica pagos, parciales, saldos, cobertura, mora ni lealtad.
    // Autorización por X-Admin-Token al principio del gateway.
    // B2: validar todo el calendario del cliente ANTES de materializar
    // obligaciones de prueba. La escritura requiere confirmación administrativa
    // explícita y nunca genera deuda/pago/cupón real.
    if (action === "preparar_obligaciones_sombra") {
      const clienteId=String(data?.cliente_id||"").trim();
      const periodo=String(data?.periodo||"").trim();
      const confirmar=data?.confirmar_materializacion===true;
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!uuid.test(clienteId)||!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(periodo)){
        return json({ok:false,error:"Cliente y primer día del período requeridos",
          codigo:"CALENDARIO_NO_VALIDADO",cobrable:false},400);
      }
      const prepared=await sb.rpc("goxion_preparar_obligaciones_calendario_sombra",{
        p_cliente_id:clienteId,p_periodo:periodo,p_solo_validar:!confirmar
      });
      if(prepared.error)return json({ok:false,error:prepared.error.message,
        codigo:"CALENDARIO_NO_VALIDADO",cobrable:false},409);
      return json({ok:true,accion:action,resultado:prepared.data,
        modo:"obligaciones_sombra_no_cobrables",acreditada_oficial:false,
        cobrable:false,operation_id:operationId});
    }

    // B2: confirmar asignación EN SOMBRA, nunca acreditar en cuenta oficial.
    // Solo sesión administrativa, nunca X-Client-Token.
    if (action === "confirmar_imputacion_sombra") {
      const imputacionId=String(data?.imputacion_id||"").trim();
      const clave=String(data?.clave_confirmacion||"").trim();
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!uuid.test(imputacionId)||!uuid.test(clave)){
        return json({ok:false,error:"Imputación y clave válidas requeridas",
          codigo:"IMPUTACION_NO_VALIDADA",acreditada_oficial:false},400);
      }
      const result=await sb.rpc("goxion_confirmar_imputacion_sombra",{
        p_imputacion_id:imputacionId,p_clave_confirmacion:clave
      });
      if(result.error)return json({ok:false,
        error:result.error.message||"No se pudo confirmar la imputación",
        codigo:"IMPUTACION_NO_VALIDADA",acreditada_oficial:false},409);
      return json({ok:true,accion:action,
        contrato:"goxion-b2-shadow-v2",resultado:result.data,
        modo:"asignacion_sombra_sin_cobro",acreditada_oficial:false,
        cobrable:false,operation_id:clave});
    }
    if (action === "resumen_obligacion_sombra") {
      const obligacionId=String(data?.obligacion_id||"").trim();
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!uuid.test(obligacionId)){
        return json({ok:false,error:"Obligación inválida",acreditada_oficial:false},400);
      }
      const result=await sb.rpc("goxion_resumen_imputacion_sombra",{
        p_obligacion_id:obligacionId
      });
      if(result.error)return json({ok:false,error:result.error.message||"Error de conciliación",
        acreditada_oficial:false},409);
      return json({ok:true,accion:action,resultado:result.data,
        modo:"informativo_no_cobrable",acreditada_oficial:false,cobrable:false});
    }

    if (action === "preparar_imputacion_sombra") {
      const obligacionId=String(data?.obligacion_id||"").trim();
      const pagoId=String(data?.pago_id||"").trim();
      const clave=String(data?.clave_idempotencia||"").trim();
      const monto=Number(data?.monto_centavos);
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!uuid.test(obligacionId)||!uuid.test(pagoId)||!uuid.test(clave)||
        !Number.isSafeInteger(monto)||monto<=0||monto>1_000_000_000){
        return json({ok:false,error:"Se requiere obligación, pago aprobado, importe en centavos y clave válida",
          operation_id:operationId},400);
      }
      const result=await sb.rpc("goxion_preparar_imputacion_sombra",{
        p_obligacion_id:obligacionId,p_pago_id:pagoId,
        p_monto_centavos:monto,p_clave_idempotencia:clave
      });
      if(result.error){
        return json({ok:false,
          error:result.error.message||"No se pudo preparar la imputación",
          codigo:"IMPUTACION_NO_VALIDADA",operation_id:clave,
          acreditada:false},409);
      }
      return json({ok:true,accion:action,operation_id:clave,
        contrato:"goxion-b2-shadow-v1",resultado:result.data,
        modo:"propuesta_sin_acreditacion",acreditada:false,cobrable:false});
    }

    if (action === "aprobar_pago") {
      const clienteId = String(data?.cliente_id || "").trim();
      const monto = Number(data?.monto ?? 0);
      const puntual = data?.puntual !== false;
      const notas = String(data?.notas || "Aprobado desde Admin");
      const periodoEsperado = String(data?.periodo_esperado || "").trim().slice(0, 7);

      if (!clienteId || !Number.isFinite(monto) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodoEsperado)) {
        return json({ ok: false, error: "Cliente, monto o periodo esperado inválido", operation_id: operationId }, 400);
      }

      const before = await financialState(sb, clienteId);
      if (before.error) {
        return json({
          ok: false,
          error: "No fue posible validar el estado financiero previo.",
          operation_id: operationId,
        }, 409);
      }

      const periodoActual = String(before.data?.periodo || "").slice(0, 7);
      // Si una respuesta se perdió después del COMMIT, la clave existente debe
      // llegar a SQL para devolver la operación original aun con periodo avanzado.
      // Una clave NUEVA no salta la guarda: SQL lo rechazará bajo lock.
      const replayKey=String(data?.clave_idempotencia||"").trim();
      if (periodoActual !== periodoEsperado && !uuid.test(replayKey)) {
        return json({
          ok: false,
          error: "El periodo de cobro cambió antes de aprobar el pago. Recarga la ficha antes de continuar.",
          operation_id: operationId,
          codigo: "PERIODO_DESACTUALIZADO",
          periodo_esperado: periodoEsperado,
          periodo_actual: periodoActual,
        }, 409);
      }

      // El estado previo es informativo: la RPC revalida bajo lock de cliente.
      const suppliedKey=String(data?.clave_idempotencia||"").trim();
      if(suppliedKey&&!uuid.test(suppliedKey)){
        return json({ok:false,error:"Clave idempotente inválida",codigo:"CLAVE_INVALIDA"},400);
      }
      const effectiveId=suppliedKey||operationId;
      const applied=await sb.rpc("goxion_aprobar_pago_periodo_atomico",{
        p_cliente_id:clienteId,p_periodo_esperado:periodoEsperado,
        p_monto:monto,p_puntual:puntual,p_notas:notas,p_operation_id:effectiveId
      });
      if(applied.error||applied.data?.ok!==true){
        const stale=/PERIODO_DESACTUALIZADO|ya acreditado|ya cubierto/i.test(applied.error?.message||"");
        return json({
          ok:false,error:applied.error?.message||"No fue posible aprobar el pago.",
          operation_id:effectiveId,codigo:stale?"PERIODO_DESACTUALIZADO":"APROBACION_ATOMICA_FALLIDA",
          etapa:"goxion_aprobar_pago_periodo_atomico"
        },409);
      }
      const after=await financialState(sb,clienteId);
      return json({
        ok:true,accion:action,operation_id:effectiveId,
        contrato:"goxion-financial-actions-v1",version:"1.2",
        resultado:applied.data,estado_anterior:before.data||null,
        estado_financiero:after.error?null:(after.data||null),
        estado_financiero_error:after.error?"No fue posible refrescar el estado después de guardar.":null
      });
    }

        if (action === "trato_justo_guardar") {
      const clienteId = String(data?.cliente_id || "").trim();
      const servicioId = String(data?.cliente_servicio_id || "").trim();
      const periodo = month(data?.periodo);
      const dias = Math.max(1, Math.min(10, Math.trunc(Number(data?.dias_falla || 1))));
      const motivo = String(data?.motivo || "Falla técnica").trim() || "Falla técnica";

      if (!clienteId || !servicioId || !periodo) {
        return json({ ok: false, error: "Cliente, servicio o periodo inválido", operation_id: operationId }, 400);
      }

      const before = await financialState(sb, clienteId);
      if (before.error) {
        return json({ ok: false, error: "No fue posible validar el estado financiero previo.", operation_id: operationId }, 409);
      }

      const downstream = await callFunction(url, "trato-justo", "guardar_compensacion", {
        cliente_id: clienteId,
        cliente_servicio_id: servicioId,
        periodo,
        dias_falla: dias,
        motivo,
      }, auth.token);

      if (!downstream.response.ok || downstream.body?.ok !== true) {
        return json({
          ok: false,
          error: downstream.body?.error || downstream.text || "No fue posible guardar Trato Justo.",
          operation_id: operationId,
          etapa: "trato-justo",
        }, downstream.response.status || 500);
      }

      const after = await financialState(sb, clienteId);
      return json({
        ok: true,
        accion: action,
        operation_id: operationId,
        contrato: "goxion-financial-actions-v1",
        version: "1.1",
        resultado: downstream.body,
        estado_anterior: before.data || null,
        estado_financiero: after.error ? null : (after.data || null),
        estado_financiero_error: after.error ? "No fue posible refrescar el estado después de guardar." : null,
      });
    }

    if (action === "trato_justo_eliminar") {
      const id = String(data?.id || "").trim();
      if (!id) return json({ ok: false, error: "Falta compensación", operation_id: operationId }, 400);

      const lookup = await sb.from("trato_justo_compensaciones").select("id,cliente_id").eq("id", id).maybeSingle();
      if (lookup.error || !lookup.data?.cliente_id) {
        return json({ ok: false, error: "Compensación inexistente", operation_id: operationId }, 404);
      }
      const clienteId = String(lookup.data.cliente_id);
      const before = await financialState(sb, clienteId);

      const downstream = await callFunction(url, "trato-justo", "eliminar_compensacion", { id }, auth.token);
      if (!downstream.response.ok || downstream.body?.ok !== true) {
        return json({
          ok: false,
          error: downstream.body?.error || downstream.text || "No fue posible eliminar Trato Justo.",
          operation_id: operationId,
          etapa: "trato-justo",
        }, downstream.response.status || 500);
      }

      const after = await financialState(sb, clienteId);
      return json({
        ok: true,
        accion: action,
        operation_id: operationId,
        contrato: "goxion-financial-actions-v1",
        version: "1.1",
        resultado: downstream.body,
        estado_anterior: before.error ? null : (before.data || null),
        estado_financiero: after.error ? null : (after.data || null),
        estado_financiero_error: after.error ? "No fue posible refrescar el estado después de eliminar." : null,
      });
    }

    if (action === "trato_justo_masivo") {
      const clienteIds = Array.isArray(data?.cliente_ids)
        ? [...new Set(data.cliente_ids.map((x: unknown) => String(x || "").trim()).filter(Boolean))]
        : [];
      const servicioId = String(data?.servicio_id || "").trim();
      const servicioNombre = String(data?.servicio_nombre || "").trim();
      const periodo = month(data?.periodo);
      const dias = Math.max(1, Math.min(10, Math.trunc(Number(data?.dias_falla || 1))));
      const motivo = String(data?.motivo || "Falla técnica").trim() || "Falla técnica";

      if (!clienteIds.length || (!servicioId && !servicioNombre) || !periodo) {
        return json({ ok: false, error: "Clientes, servicio o periodo inválido", operation_id: operationId }, 400);
      }
      if (clienteIds.length > 200) {
        return json({ ok: false, error: "Demasiados clientes en una sola operación", operation_id: operationId }, 400);
      }

      const downstream = await callFunction(url, "trato-justo", "guardar_compensaciones_masivas", {
        cliente_ids: clienteIds,
        servicio_id: servicioId,
        servicio_nombre: servicioNombre,
        periodo,
        dias_falla: dias,
        motivo,
      }, auth.token);

      if (!downstream.response.ok || downstream.body?.ok !== true) {
        return json({
          ok: false,
          error: downstream.body?.error || downstream.text || "No fue posible aplicar Trato Justo masivo.",
          operation_id: operationId,
          etapa: "trato-justo",
        }, downstream.response.status || 500);
      }

      return json({
        ok: true,
        accion: action,
        operation_id: operationId,
        contrato: "goxion-financial-actions-v1",
        version: "1.1",
        resultado: downstream.body,
      });
    }


    if (action === "beneficio_crear") {
      const clienteId=String(data?.cliente_id||"").trim();
      const concepto=String(data?.concepto||"Descuento programado").trim().slice(0,140);
      const tipo=String(data?.tipo||"monto")==="porcentaje"?"porcentaje":"monto";
      const valor=Math.round(Number(data?.valor||0)*100)/100;
      const periodosTotal=Math.trunc(Number(data?.periodos_total||1));
      const periodoInicio=month(data?.periodo_inicio);
      if(!clienteId||!concepto||!(valor>0)||!periodoInicio||periodosTotal<1||periodosTotal>36){
        return json({ok:false,error:"Datos de beneficio inválidos",operation_id:operationId},400);
      }
      const before=await financialState(sb,clienteId);
      const downstream=await callFunction(url,"beneficios-admin-beta","crear_manual",{
        cliente_id:clienteId,concepto,tipo,valor,periodo_inicio:periodoInicio,periodos_total:periodosTotal
      },auth.token);
      if(!downstream.response.ok||downstream.body?.ok!==true){
        return json({ok:false,error:downstream.body?.error||downstream.text||"No fue posible crear el beneficio.",operation_id:operationId,etapa:"beneficios-admin-beta"},downstream.response.status||500);
      }
      const after=await financialState(sb,clienteId);
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:downstream.body,estado_anterior:before.error?null:(before.data||null),estado_financiero:after.error?null:(after.data||null)});
    }

    if (action === "beneficio_cancelar" || action === "beneficio_eliminar") {
      const id=String(data?.id||"").trim();
      if(!id)return json({ok:false,error:"Falta beneficio",operation_id:operationId},400);
      const lookup=await sb.from("beneficios_programados").select("id,cliente_id").eq("id",id).maybeSingle();
      if(lookup.error||!lookup.data?.cliente_id)return json({ok:false,error:"Beneficio inexistente",operation_id:operationId},404);
      const clienteId=String(lookup.data.cliente_id);
      const before=await financialState(sb,clienteId);
      const downstream=await callFunction(url,"beneficios-admin-beta",action==="beneficio_cancelar"?"cancelar":"eliminar",{id},auth.token);
      if(!downstream.response.ok||downstream.body?.ok!==true){
        return json({ok:false,error:downstream.body?.error||downstream.text||"No fue posible actualizar el beneficio.",operation_id:operationId,etapa:"beneficios-admin-beta"},downstream.response.status||500);
      }
      const after=await financialState(sb,clienteId);
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:downstream.body,estado_anterior:before.error?null:(before.data||null),estado_financiero:after.error?null:(after.data||null)});
    }

    if (action === "promocion_guardar" || action === "promocion_estado" || action === "promocion_eliminar") {
      const downstreamAction=action==="promocion_guardar"?"guardar":(action==="promocion_estado"?"cambiar_estado":"eliminar");
      const downstream=await callFunction(url,"promociones-admin-beta",downstreamAction,data,auth.token);
      if(!downstream.response.ok||downstream.body?.ok!==true){
        return json({ok:false,error:downstream.body?.error||downstream.text||"No fue posible actualizar la promoción.",operation_id:operationId,etapa:"promociones-admin-beta"},downstream.response.status||500);
      }
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:downstream.body});
    }

    if (action === "promocion_adquirir") {
      const clienteId=String(data?.cliente_id||"").trim();
      const promocionId=String(data?.promocion_id||"").trim();
      const periodoInicio=month(data?.periodo_inicio);
      const origen=String(data?.origen||"admin").trim().slice(0,40)||"admin";
      if(!clienteId||!promocionId){
        return json({ok:false,error:"Cliente o promoción inválida",operation_id:operationId},400);
      }

      const before=await financialState(sb,clienteId);
      if(before.error){
        return json({ok:false,error:"No fue posible validar el estado financiero previo.",operation_id:operationId},409);
      }

      const eligibility=await sb.rpc("goxion_promocion_elegibilidad",{
        p_cliente_id:clienteId,
        p_promocion_id:promocionId
      });
      if(eligibility.error)throw eligibility.error;
      if(eligibility.data?.elegible!==true){
        return json({
          ok:false,
          error:eligibility.data?.motivo||"Cliente no elegible para esta promoción",
          codigo:eligibility.data?.codigo||"NO_ELEGIBLE",
          elegibilidad:eligibility.data||null,
          operation_id:operationId
        },409);
      }

      const acquired=await sb.rpc("goxion_adquirir_promocion",{
        p_cliente_id:clienteId,
        p_promocion_id:promocionId,
        p_periodo_inicio:periodoInicio,
        p_operation_id:operationId,
        p_origen:origen
      });
      if(acquired.error){
        return json({ok:false,error:acquired.error.message||"No fue posible adquirir la promoción.",operation_id:operationId},409);
      }

      const after=await financialState(sb,clienteId);
      return json({
        ok:true,
        accion:action,
        operation_id:operationId,
        contrato:"goxion-financial-actions-v1",
        version:"1.2",
        resultado:{adquisicion:acquired.data,elegibilidad:eligibility.data},
        estado_anterior:before.data||null,
        estado_financiero:after.error?null:(after.data||null),
        estado_financiero_error:after.error?"No fue posible refrescar el estado después de adquirir la promoción.":null
      });
    }

    if (action === "promocion_cancelar_adquisicion") {
      const id=String(data?.id||"").trim();
      const motivo=String(data?.motivo||"Cancelada manualmente").trim().slice(0,240);
      if(!id)return json({ok:false,error:"Falta adquisición",operation_id:operationId},400);

      const lookup=await sb.from("promocion_adquisiciones")
        .select("id,cliente_id,estado")
        .eq("id",id)
        .maybeSingle();
      if(lookup.error||!lookup.data?.cliente_id){
        return json({ok:false,error:"Adquisición inexistente",operation_id:operationId},404);
      }
      const clienteId=String(lookup.data.cliente_id);
      const before=await financialState(sb,clienteId);

      const cancelled=await sb.rpc("goxion_cancelar_adquisicion_promocional",{
        p_adquisicion_id:id,
        p_motivo:motivo||"Cancelada manualmente"
      });
      if(cancelled.error)throw cancelled.error;

      const after=await financialState(sb,clienteId);
      return json({
        ok:true,
        accion:action,
        operation_id:operationId,
        contrato:"goxion-financial-actions-v1",
        version:"1.2",
        resultado:{adquisicion:cancelled.data},
        estado_anterior:before.error?null:(before.data||null),
        estado_financiero:after.error?null:(after.data||null)
      });
    }

    if (action === "promocion_asignar") {
      const clienteServicioId=String(data?.cliente_servicio_id||"").trim();
      const promocionId=String(data?.promocion_id||"").trim();
      if(!clienteServicioId||!promocionId)return json({ok:false,error:"Servicio o promoción inválida",operation_id:operationId},400);

      const cs=await sb.from("cliente_servicios").select("id,cliente_id,servicio_id,monto,activo").eq("id",clienteServicioId).maybeSingle();
      if(cs.error||!cs.data||cs.data.activo!==true)return json({ok:false,error:"Servicio del cliente inexistente o inactivo",operation_id:operationId},404);
      const promo=await sb.from("promociones_catalogo").select("id,servicio_id,mecanica,precio_promocional,duracion_periodos,activa,inicio,fin").eq("id",promocionId).maybeSingle();
      if(promo.error||!promo.data||promo.data.activa!==true)return json({ok:false,error:"Promoción inexistente o inactiva",operation_id:operationId},404);
      if(String(cs.data.servicio_id||"")!==String(promo.data.servicio_id||""))return json({ok:false,error:"La promoción no corresponde a este servicio",operation_id:operationId},409);

      const client=await sb.from("clientes").select("id,periodo_pendiente").eq("id",cs.data.cliente_id).maybeSingle();
      if(client.error||!client.data)return json({ok:false,error:"Cliente inexistente",operation_id:operationId},404);
      const requested=month(data?.periodo_inicio);
      const promoStart=month(promo.data.inicio);
      let periodoInicio=requested||String(client.data.periodo_pendiente).slice(0,10);
      if(promoStart&&promoStart>periodoInicio)periodoInicio=promoStart;

      await sb.from("cliente_servicio_promociones")
        .update({activo:false,updated_at:new Date().toISOString()})
        .eq("cliente_servicio_id",clienteServicioId).eq("activo",true);

      const inserted=await sb.from("cliente_servicio_promociones").insert({
        cliente_servicio_id:clienteServicioId,
        promocion_id:promocionId,
        precio_normal_snapshot:Number(cs.data.monto||0),
        precio_promocional:["precio_fijo","combo"].includes(String(promo.data.mecanica||""))
          ?Math.round((Number(promo.data.precio_promocional||0)/Math.max(1,Number(promo.data.duracion_periodos||1)))*100)/100
          :Number(promo.data.precio_promocional||0),
        periodos_totales:Number(promo.data.duracion_periodos||1),
        periodos_consumidos:0,
        periodo_inicio:periodoInicio,
        activo:true,
        updated_at:new Date().toISOString()
      }).select().single();
      if(inserted.error)throw inserted.error;

      const after=await financialState(sb,String(cs.data.cliente_id));
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:{asignacion:inserted.data},estado_financiero:after.error?null:(after.data||null)});
    }

    if (action === "promocion_quitar_asignacion") {
      const id=String(data?.id||"").trim();
      if(!id)return json({ok:false,error:"Falta asignación",operation_id:operationId},400);
      const lookup=await sb.from("cliente_servicio_promociones").select("id,cliente_servicio_id").eq("id",id).maybeSingle();
      if(lookup.error||!lookup.data)return json({ok:false,error:"Asignación inexistente",operation_id:operationId},404);
      const cs=await sb.from("cliente_servicios").select("cliente_id").eq("id",lookup.data.cliente_servicio_id).maybeSingle();
      const q=await sb.from("cliente_servicio_promociones").update({activo:false,updated_at:new Date().toISOString()}).eq("id",id);
      if(q.error)throw q.error;
      const after=cs.data?.cliente_id?await financialState(sb,String(cs.data.cliente_id)):{data:null,error:null};
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:{desactivada:true},estado_financiero:after.error?null:(after.data||null)});
    }

    if (action === "registrar_pago_parcial") {
      const clienteId=String(data?.cliente_id||"").trim();
      const periodoEsperado=String(data?.periodo_esperado||"").trim().slice(0,7);
      const saldoRaw=Number(data?.saldo_restante);
      const saldoCentavos=Math.round(saldoRaw*100);
      const notas=String(data?.notas||"Pago parcial registrado").trim().slice(0,300);
      const clave=String(data?.clave_idempotencia||"").trim();
      if(!clienteId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clienteId)||
         !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodoEsperado)||
         !Number.isFinite(saldoRaw)||saldoCentavos<=0||
         Math.abs(saldoRaw*100-saldoCentavos)>1e-5){
        return json({ok:false,error:"Cliente, periodo o saldo restante inválido",operation_id:operationId},400);
      }
      if(clave&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clave)){
        return json({ok:false,error:"Clave idempotente inválida",operation_id:operationId},400);
      }
      const effectiveId=clave||operationId;
      // Lectura previa solo para compatibilidad de respuesta; la RPC vuelve a
      // calcular y verifica período/saldo bajo bloqueo en UNA transacción SQL.
      const before=await financialState(sb,clienteId);
      if(before.error)return json({ok:false,error:"No fue posible validar el estado financiero previo.",operation_id:effectiveId},409);
      const applied=await sb.rpc("goxion_registrar_pago_parcial_atomico",{
        p_cliente_id:clienteId,p_periodo_esperado:periodoEsperado,
        p_saldo_restante_centavos:saldoCentavos,
        p_operation_id:effectiveId,p_notas:notas
      });
      if(applied.error){
        const outdated=String(applied.error.message||"").includes("PERIODO_DESACTUALIZADO");
        return json({ok:false,error:outdated?"El periodo cambió. Recarga la ficha antes de continuar.":applied.error.message,
          codigo:outdated?"PERIODO_DESACTUALIZADO":"PARCIAL_NO_APLICADO",
          operation_id:effectiveId},409);
      }
      const after=await financialState(sb,clienteId);
      return json({ok:true,accion:action,operation_id:effectiveId,
        contrato:"goxion-financial-actions-v1",version:"1.3",
        resultado:{pago_parcial:applied.data?.pago_parcial,
          monto_pagado:applied.data?.monto_pagado,
          saldo_restante:applied.data?.saldo_restante,
          repetida:applied.data?.repetida===true},
        estado_anterior:before.data||null,
        estado_financiero:after.error?null:(after.data||null),
        estado_financiero_error:after.error?"No se pudo refrescar el estado después de guardar.":null
      });
    }

        if (action === "pactar_fecha_pago") {
      const clienteId=String(data?.cliente_id||"").trim();
      const periodoEsperado=String(data?.periodo_esperado||"").trim().slice(0,7);
      const fechaPactada=parseDateOnly(data?.fecha_pactada);
      const motivo=String(data?.motivo||"Acuerdo de pago").trim().slice(0,300)||"Acuerdo de pago";
      if(!clienteId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodoEsperado)||!fechaPactada){
        return json({ok:false,error:"Cliente, periodo o fecha pactada inválida",operation_id:operationId},400);
      }
      const before=await financialState(sb,clienteId);
      if(before.error)return json({ok:false,error:"No fue posible validar el estado financiero previo.",operation_id:operationId},409);
      if(String(before.data?.periodo||"").slice(0,7)!==periodoEsperado)return json({ok:false,error:"El periodo cambió. Recarga la ficha antes de continuar.",codigo:"PERIODO_DESACTUALIZADO",operation_id:operationId},409);
      if(before.data?.esta_pagado_periodo===true)return json({ok:false,error:"Este periodo ya está pagado.",operation_id:operationId},409);
      const original=String(before.data?.fecha_corte_original||before.data?.fecha_corte||"").slice(0,10);
      if(!original||fechaPactada<original||fechaPactada>addDays(original,31)){
        return json({ok:false,error:"La fecha pactada debe ser igual o posterior al corte original y no exceder 31 días.",operation_id:operationId,fecha_original:original},400);
      }
      const periodo=String(before.data?.periodo||"").slice(0,10);
      const upsert=await sb.from("acuerdos_cobro").upsert({
        cliente_id:clienteId,periodo,fecha_original:original,fecha_pactada:fechaPactada,motivo,
        activo:true,estado:"activo",operation_id:operationId,updated_at:new Date().toISOString()
      },{onConflict:"cliente_id,periodo"}).select().single();
      if(upsert.error)throw upsert.error;
      const after=await financialState(sb,clienteId);
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:{acuerdo:upsert.data},estado_anterior:before.data||null,estado_financiero:after.error?null:(after.data||null)});
    }

    if (action === "cancelar_fecha_pactada") {
      const clienteId=String(data?.cliente_id||"").trim();
      const periodoEsperado=String(data?.periodo_esperado||"").trim().slice(0,7);
      if(!clienteId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodoEsperado))return json({ok:false,error:"Cliente o periodo inválido",operation_id:operationId},400);
      const before=await financialState(sb,clienteId);
      if(before.error)return json({ok:false,error:"No fue posible validar el estado financiero previo.",operation_id:operationId},409);
      if(String(before.data?.periodo||"").slice(0,7)!==periodoEsperado)return json({ok:false,error:"El periodo cambió. Recarga la ficha antes de continuar.",codigo:"PERIODO_DESACTUALIZADO",operation_id:operationId},409);
      const periodo=String(before.data?.periodo||"").slice(0,10);
      const q=await sb.from("acuerdos_cobro").update({activo:false,estado:"cancelado",updated_at:new Date().toISOString()}).eq("cliente_id",clienteId).eq("periodo",periodo).eq("activo",true);
      if(q.error)throw q.error;
      const after=await financialState(sb,clienteId);
      return json({ok:true,accion:action,operation_id:operationId,contrato:"goxion-financial-actions-v1",version:"1.2",resultado:{cancelado:true},estado_anterior:before.data||null,estado_financiero:after.error?null:(after.data||null)});
    }

    return json({
      ok: false,
      error: `Acción financiera no reconocida: ${action}`,
      operation_id: operationId,
    }, 400);
  } catch (error) {
    console.error("acciones-financieras", operationId, error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "No fue posible procesar la acción financiera",
      operation_id: operationId,
    }, 500);
  }
});
