import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-admin-token, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function res(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function b64bytes(text: string) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function b64text(text: string) {
  return new TextDecoder().decode(b64bytes(text));
}

async function verifyHmacToken(token: string, secret: string, role: string) {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payload64, signature64] = parts;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64bytes(signature64),
    new TextEncoder().encode(payload64),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(b64text(payload64));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.role !== role || !payload?.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function firstOfMonth(input: unknown) {
  const raw = String(input ?? "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2200 || month < 1 || month > 12) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function addMonth(period: string) {
  const m = period.match(/^(\d{4})-(\d{2})-01$/);
  if (!m) return currentMonth();
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const monthNames = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function periodLabel(period: string) {
  const m = period.match(/^(\d{4})-(\d{2})-01$/);
  if (!m) return "";
  return `${monthNames[Number(m[2]) - 1]} de ${m[1]}`;
}

function normalizePeriod(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bde\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return res({ ok: false, error: "Método no permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminSecret = Deno.env.get("ADMIN_SESSION_SECRET");
    if (!url || !serviceKey || !adminSecret) throw new Error("Configuración interna incompleta");

    const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.accion ?? "").trim();
    const data = body?.datos && typeof body.datos === "object" ? body.datos : {};
    const mesActual = currentMonth();

    async function syncClientById(clienteId: string) {
      const q = await sb.from("clientes")
        .select("id,periodo_pendiente,estado,pago_en_revision,ciclo_cobro_manual")
        .eq("id", clienteId)
        .single();
      if (q.error) throw q.error;

      const c = q.data;
      const periodo = firstOfMonth(c?.periodo_pendiente) || mesActual;
      const manual = c?.ciclo_cobro_manual === true;
      let estado = String(c?.estado || "pendiente");
      let corte_aplicado = false;

      if (!manual && estado === "pagado" && periodo <= mesActual && c?.pago_en_revision !== true) {
        estado = "pendiente";
        corte_aplicado = true;
      }

      return {
        id: clienteId,
        periodo_pendiente: periodo,
        estado,
        estado_guardado: String(c?.estado || "pendiente"),
        ciclo_cobro_manual: manual,
        corte_aplicado,
      };
    }

    if (action === "obtener_periodo") {
      const clientToken = req.headers.get("X-Client-Token") || "";
      const payload = await verifyHmacToken(clientToken, serviceKey, "goxion_client");
      if (!payload?.cliente_id) return res({ ok: false, error: "Sesión de cliente inválida o expirada" }, 401);

      const synced = await syncClientById(String(payload.cliente_id));
      return res({ ok: true, ...synced });
    }

    const adminToken = req.headers.get("X-Admin-Token") || "";
    const adminPayload = await verifyHmacToken(adminToken, adminSecret, "goxion_admin");
    if (!adminPayload) return res({ ok: false, error: "Sesión administrativa inválida o expirada" }, 401);

    if (action === "listar_periodos") {
      const q = await sb.from("clientes")
        .select("id,folio,nombre,periodo_pendiente,estado,pago_en_revision,ciclo_cobro_manual")
        .order("nombre");
      if (q.error) throw q.error;

      const periodos = (q.data ?? []).map((c) => {
        const periodo = firstOfMonth(c?.periodo_pendiente) || mesActual;
        const manual = c?.ciclo_cobro_manual === true;
        const estadoGuardado = String(c?.estado || "pendiente");
        const corte = !manual && estadoGuardado === "pagado" && periodo <= mesActual && c?.pago_en_revision !== true;
        return {
          id: c.id,
          folio: c.folio,
          nombre: c.nombre,
          periodo_pendiente: periodo,
          estado: corte ? "pendiente" : estadoGuardado,
          estado_guardado: estadoGuardado,
          ciclo_cobro_manual: manual,
          corte_aplicado: corte,
        };
      });

      return res({ ok: true, periodos, mes_actual: mesActual, modo: "beta_virtual" });
    }

    if (action === "guardar_periodo") {
      const clienteId = String(data?.cliente_id ?? "").trim();
      const periodo = firstOfMonth(data?.periodo_pendiente);
      if (!clienteId || !periodo) return res({ ok: false, error: "Cliente o periodo inválido" }, 400);

      const q = await sb.from("clientes")
        .update({ periodo_pendiente: periodo })
        .eq("id", clienteId)
        .select("id,periodo_pendiente,estado,ciclo_cobro_manual")
        .single();
      if (q.error) throw q.error;
      return res({ ok: true, ...q.data });
    }

    if (action === "guardar_ciclo_manual") {
      const clienteId = String(data?.cliente_id ?? "").trim();
      if (!clienteId) return res({ ok: false, error: "Cliente inválido" }, 400);
      const manual = data?.ciclo_cobro_manual === true;

      const q = await sb.from("clientes")
        .update({ ciclo_cobro_manual: manual })
        .eq("id", clienteId)
        .select("id,periodo_pendiente,estado,ciclo_cobro_manual")
        .single();
      if (q.error) throw q.error;

      let result: any = q.data;
      if (!manual) result = await syncClientById(clienteId);
      return res({ ok: true, ...result });
    }

    if (action === "aprobar_pago_periodo") {
      // Escritor obsoleto RETIRADO. Las operaciones oficiales de pago
      // solo se admiten por acciones-financieras y comprobantes B2.
      return res({ok:false,codigo:"MOTOR_UNICO_APROBACION_RETIRO",
        error:"Usa la aprobación financiera actual de Admin; esta ruta antigua no acredita pagos."},409);

      const clienteId = String(data?.cliente_id ?? "").trim();
      const monto = Number(data?.monto ?? 0);
      const notas = String(data?.notas ?? "");
      const puntual = data?.puntual !== false;
      if (!clienteId || !Number.isFinite(monto)) return res({ ok: false, error: "Cliente o monto inválido" }, 400);

      const cq = await sb.from("clientes")
        .select("id,periodo_pendiente,pagos_puntuales,ciclo_cobro_manual")
        .eq("id", clienteId)
        .single();
      if (cq.error) throw cq.error;

      const periodo = firstOfMonth(cq.data?.periodo_pendiente) || mesActual;
      const label = periodLabel(periodo);
      const normalizedLabel = normalizePeriod(label);

      const pq = await sb.from("pagos")
        .select("id,periodo,estado")
        .eq("cliente_id", clienteId);
      if (pq.error) throw pq.error;

      const existing = (pq.data ?? []).find((p) => normalizePeriod(p.periodo) === normalizedLabel);
      const alreadyPaid = String(existing?.estado || "").toLowerCase() === "pagado";
      const today = new Date().toISOString().slice(0, 10);

      if (existing?.id) {
        const uq = await sb.from("pagos")
          .update({ fecha: today, monto, estado: "pagado", notas })
          .eq("id", existing.id);
        if (uq.error) throw uq.error;
      } else {
        const iq = await sb.from("pagos").insert({
          cliente_id: clienteId,
          fecha: today,
          periodo: label,
          monto,
          estado: "pagado",
          notas,
        });
        if (iq.error) throw iq.error;
      }

      const next = addMonth(periodo);
      const currentStreak = Math.max(0, Number(cq.data?.pagos_puntuales || 0));
      const nextStreak = alreadyPaid ? currentStreak : (puntual ? currentStreak + 1 : 0);

      const updateClient = await sb.from("clientes").update({
        estado: "pagado",
        pago_en_revision: false,
        pagos_puntuales: nextStreak,
        descuento_fallas: 0,
        periodo_pendiente: next,
        pago_revision_estado: "aprobado",
        pago_revision_mensaje: null,
        pago_revision_monto_faltante: 0,
        pago_revision_updated_at: new Date().toISOString(),
      }).eq("id", clienteId);
      if (updateClient.error) throw updateClient.error;

      return res({
        ok: true,
        periodo_pagado: label,
        periodo_pendiente: next,
        pagos_puntuales: nextStreak,
        reutilizado: Boolean(existing?.id),
        ciclo_cobro_manual: cq.data?.ciclo_cobro_manual === true,
      });
    }

    return res({ ok: false, error: `Acción no reconocida: ${action}` }, 400);
  } catch (e) {
    console.error(e);
    return res({ ok: false, error: e instanceof Error ? e.message : "No fue posible procesar el periodo de cobro beta" }, 500);
  }
});