import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-admin-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64UrlToBytes(text: string) {
  const base64 = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");

  const binary = atob(base64);

  return Uint8Array.from(
    binary,
    (c) => c.charCodeAt(0)
  );
}

function base64UrlToText(text: string) {
  return new TextDecoder().decode(
    base64UrlToBytes(text)
  );
}

async function verificarFirma(
  payloadCodificado: string,
  firmaCodificada: string,
  secreto: string
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(firmaCodificada),
    new TextEncoder().encode(payloadCodificado)
  );
}

async function validarToken(req: Request) {
  const adminToken =
    req.headers.get("X-Admin-Token") || "";

  if (!adminToken) return false;

  const partes = adminToken.trim().split(".");

  if (partes.length !== 2) return false;

  const [payloadCodificado, firma] = partes;

  const secreto =
    Deno.env.get("ADMIN_SESSION_SECRET");

  if (!secreto) {
    throw new Error(
      "ADMIN_SESSION_SECRET no configurado"
    );
  }

  const firmaValida = await verificarFirma(
    payloadCodificado,
    firma,
    secreto
  );

  if (!firmaValida) return false;

  try {
    const payload = JSON.parse(
      base64UrlToText(payloadCodificado)
    );

    const ahora =
      Math.floor(Date.now() / 1000);

    return (
      payload.role === "goxion_admin" &&
      payload.exp &&
      payload.exp > ahora
    );
  } catch {
    return false;
  }
}

function crearClave(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function asegurarNumero(
  valor: unknown,
  defecto = 0
) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}


function normalizarInventario(v: unknown) {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function multiplicadorInventario(nombre: string) {
  const m = nombre.match(/\(x\s*(\d+)\)/i);
  return m ? Math.max(1, Number(m[1]) || 1) : 1;
}
function coincideInventario(catalogoOriginal: string, contratadoOriginal: string) {
  const c = normalizarInventario(catalogoOriginal);
  const s = normalizarInventario(contratadoOriginal);
  if (c.includes("netflix")) return s.includes("netflix");
  if (c.includes("disney")) return s.includes("disney");
  if ((c.includes("hbo") || c.includes("max")) && !c.includes("prime")) return s.includes("hbo") || s.includes("max");
  if (c.includes("prime")) return s.includes("prime") || s.includes("amazon");
  if (c.includes("youtube")) return s.includes("youtube");
  if (c.includes("vix")) return s.includes("vix");
  if (c.includes("microsoft") || c.includes("365")) return s.includes("microsoft") || s.includes("365");
  if (c.includes("google") || c.includes("one 2tb")) return s.includes("google") || s.includes("one 2tb");
  if (c.includes("crunchy")) {
    if (c.includes("cuenta completa")) return s.includes("crunchy") && s.includes("cuenta completa");
    if (c.includes("mega fan")) return s.includes("crunchy") && s.includes("mega fan");
    return s.includes("crunchy");
  }
  const keyword = c.replace(/ premium| standard| platino| cuenta completa| mega fan| 2tb| 365/g, "").trim();
  return keyword.length >= 3 && s.includes(keyword);
}
async function validarCapacidadReactivacion(supabase: any, clienteId: string) {
  const [clienteRes, propiosRes, catalogoRes, activosRes, suspendidosRes] = await Promise.all([
    supabase.from("clientes").select("id,estado").eq("id", clienteId).single(),
    supabase.from("cliente_servicios").select("id,nombre,activo").eq("cliente_id", clienteId).eq("activo", true),
    supabase.from("servicios").select("id,nombre,cuentas,limite,stock_manual,activo").eq("activo", true),
    supabase.from("cliente_servicios").select("id,nombre,cliente_id,activo").eq("activo", true),
    supabase.from("clientes").select("id").eq("estado", "suspendido")
  ]);
  if (clienteRes.error) throw clienteRes.error;
  if (propiosRes.error) throw propiosRes.error;
  if (catalogoRes.error) throw catalogoRes.error;
  if (activosRes.error) throw activosRes.error;
  if (suspendidosRes.error) throw suspendidosRes.error;
  if (String(clienteRes.data?.estado || "") !== "suspendido") return { ok:true, bloqueos:[] };
  const suspendedIds = new Set((suspendidosRes.data ?? []).map((x:any)=>String(x.id)));
  const contratosContados = (activosRes.data ?? []).filter((x:any)=>!suspendedIds.has(String(x.cliente_id)));
  const propios = propiosRes.data ?? [];
  const bloqueos:any[] = [];
  for (const cat of (catalogoRes.data ?? [])) {
    let demanda = 0, asignados = 0;
    for (const cs of propios) if (coincideInventario(cat.nombre, cs.nombre)) demanda += multiplicadorInventario(cs.nombre);
    if (!demanda) continue;
    for (const cs of contratosContados) if (coincideInventario(cat.nombre, cs.nombre)) asignados += multiplicadorInventario(cs.nombre);
    const capacidad = Math.max(0, Number(cat.cuentas || 0) * Number(cat.limite || 0));
    const disponiblesAuto = Math.max(0, capacidad - asignados);
    const disponibles = cat.stock_manual === null || cat.stock_manual === undefined ? disponiblesAuto : Math.max(0, Number(cat.stock_manual));
    if (demanda > disponibles) bloqueos.push({servicio_id:cat.id,servicio:cat.nombre,requeridos:demanda,disponibles,capacidad,asignados,modo:cat.stock_manual===null||cat.stock_manual===undefined?"automatico":"manual"});
  }
  return { ok: bloqueos.length === 0, bloqueos };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return responder(
      {
        ok: false,
        error: "Método no permitido",
      },
      405
    );
  }

  try {
    const autorizado =
      await validarToken(req);

    if (!autorizado) {
      return responder(
        {
          ok: false,
          error:
            "Sesión administrativa inválida o expirada",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Configuración interna incompleta"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const body = await req.json();

    const accion =
      String(body?.accion ?? "").trim();

    const datos =
      body?.datos &&
      typeof body.datos === "object"
        ? body.datos
        : {};

    if (!accion) {
      return responder(
        {
          ok: false,
          error: "Falta indicar la acción",
        },
        400
      );
    }

    // ======================================
    // CLIENTES
    // ======================================

    if (accion === "crear_cliente") {
      const nombre =
        String(datos.nombre ?? "").trim();

      const folio =
        String(datos.folio ?? "").trim();

      const pin =
        String(datos.pin ?? "1234").trim();

      if (!nombre || !folio) {
        return responder(
          {
            ok: false,
            error:
              "Nombre y folio son obligatorios",
          },
          400
        );
      }

      if (!/^\d{4}$/.test(pin)) {
        return responder(
          {
            ok: false,
            error:
              "El PIN debe tener 4 dígitos",
          },
          400
        );
      }

      const clave =
        String(
          datos.clave ??
            crearClave(nombre)
        ).trim();

      const codigoHash =
        bcrypt.hashSync(pin, 10);

      const { data, error } =
        await supabase
          .from("clientes")
          .insert({
            clave,
            folio,
            nombre,
            codigo_hash: codigoHash,
            pagos_puntuales: 0,
            dia_pago:
              asegurarNumero(
                datos.dia_pago,
                15
              ),
            estado:
              String(
                datos.estado ??
                  "pendiente"
              ),
            pago_en_revision: false,
            descuento_fallas: 0,
          })
          .select(`
            id,
            clave,
            folio,
            nombre,
            dia_pago,
            estado
          `)
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        cliente: data,
      });
    }

    if (accion === "editar_cliente") {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      if (!clienteId) {
        return responder(
          {
            ok: false,
            error: "Falta cliente_id",
          },
          400
        );
      }

      const cambios: Record<
        string,
        unknown
      > = {};

      if (datos.nombre !== undefined)
        cambios.nombre =
          String(datos.nombre).trim();

      if (datos.folio !== undefined)
        cambios.folio =
          String(datos.folio).trim();

      if (datos.dia_pago !== undefined)
        cambios.dia_pago =
          asegurarNumero(
            datos.dia_pago,
            15
          );

      if (datos.estado !== undefined)
        cambios.estado =
          String(datos.estado);

      if (datos.usuario_acceso !== undefined)
        cambios.usuario_acceso =
          String(datos.usuario_acceso ?? "").trim() || null;

      if (
        datos.pago_en_revision !==
        undefined
      )
        cambios.pago_en_revision =
          Boolean(
            datos.pago_en_revision
          );

      if (
        datos.pagos_puntuales !==
        undefined
      )
        cambios.pagos_puntuales =
          Math.max(
            0,
            asegurarNumero(
              datos.pagos_puntuales
            )
          );

      if (datos.estado !== undefined && String(datos.estado) !== "suspendido") {
        const capacidad = await validarCapacidadReactivacion(supabase, clienteId);
        if (!capacidad.ok) {
          return responder({ ok:false, error:"No hay cupos suficientes para reactivar este espacio sin sobreasignar inventario.", codigo:"CAPACIDAD_REACTIVACION_INSUFICIENTE", bloqueos:capacidad.bloqueos },409);
        }
      }

      const { data, error } =
        await supabase
          .from("clientes")
          .update(cambios)
          .eq("id", clienteId)
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        cliente: data,
      });
    }

    if (accion === "cambiar_pin") {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const pin =
        String(datos.pin ?? "").trim();

      if (
        !clienteId ||
        !/^\d{4}$/.test(pin)
      ) {
        return responder(
          {
            ok: false,
            error:
              "Cliente o PIN inválido",
          },
          400
        );
      }

      const codigoHash =
        bcrypt.hashSync(pin, 10);

      const { error } =
        await supabase
          .from("clientes")
          .update({
            codigo_hash: codigoHash,
          })
          .eq("id", clienteId);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    if (
      accion === "ajustar_lealtad"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const delta =
        asegurarNumero(
          datos.delta,
          0
        );

      const { data: cliente, error } =
        await supabase
          .from("clientes")
          .select(
            "pagos_puntuales"
          )
          .eq("id", clienteId)
          .single();

      if (error) throw error;

      const nuevoValor =
        Math.max(
          0,
          Number(
            cliente.pagos_puntuales ||
              0
          ) + delta
        );

      const { error: updateError } =
        await supabase
          .from("clientes")
          .update({
            pagos_puntuales:
              nuevoValor,
          })
          .eq("id", clienteId);

      if (updateError)
        throw updateError;

      return responder({
        ok: true,
        accion,
        pagos_puntuales:
          nuevoValor,
      });
    }

    if (
      accion ===
      "reiniciar_lealtad"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const { error } =
        await supabase
          .from("clientes")
          .update({
            pagos_puntuales: 0,
          })
          .eq("id", clienteId);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    // ======================================
    // SERVICIOS DE CLIENTES
    // ======================================

    if (
      accion ===
      "agregar_servicio_cliente"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const nombre =
        String(
          datos.nombre ?? ""
        ).trim();

      if (!clienteId || !nombre) {
        return responder(
          {
            ok: false,
            error:
              "Cliente y servicio son obligatorios",
          },
          400
        );
      }

      const { data, error } =
        await supabase
          .from(
            "cliente_servicios"
          )
          .insert({
            cliente_id: clienteId,
            servicio_id:
              datos.servicio_id ||
              null,
            nombre,
            monto:
              asegurarNumero(
                datos.monto
              ),
            correo_login:
              String(
                datos.correo_login ??
                  ""
              ),
            perfil_nombre:
              String(
                datos.perfil_nombre ??
                  ""
              ),
            perfil_pin:
              String(
                datos.perfil_pin ??
                  ""
              ),
            activo: true,
          })
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        servicio: data,
      });
    }

    if (
      accion ===
      "editar_servicio_cliente"
    ) {
      const id =
        String(datos.id ?? "").trim();

      if (!id) {
        return responder(
          {
            ok: false,
            error:
              "Falta el ID del servicio",
          },
          400
        );
      }

      const cambios: Record<
        string,
        unknown
      > = {};

      if (datos.nombre !== undefined)
        cambios.nombre =
          String(datos.nombre);

      if (datos.monto !== undefined)
        cambios.monto =
          asegurarNumero(
            datos.monto
          );

      if (
        datos.correo_login !==
        undefined
      )
        cambios.correo_login =
          String(
            datos.correo_login
          ).trim();

      if (
        datos.perfil_nombre !==
        undefined
      )
        cambios.perfil_nombre =
          String(
            datos.perfil_nombre
          ).trim();

      if (
        datos.perfil_pin !==
        undefined
      )
        cambios.perfil_pin =
          String(
            datos.perfil_pin
          ).trim();

      if (datos.activo !== undefined)
        cambios.activo =
          Boolean(datos.activo);

      const { data, error } =
        await supabase
          .from(
            "cliente_servicios"
          )
          .update(cambios)
          .eq("id", id)
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        servicio: data,
      });
    }

    if (
      accion ===
      "quitar_servicio_cliente"
    ) {
      const id =
        String(datos.id ?? "").trim();

      const { error } =
        await supabase
          .from(
            "cliente_servicios"
          )
          .delete()
          .eq("id", id);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    // ======================================
    // PAGOS
    // ======================================

    if (
      accion ===
      "marcar_pago_revision"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const { error } =
        await supabase
          .from("clientes")
          .update({
            pago_en_revision: true,
          })
          .eq("id", clienteId);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    if (accion === "aprobar_pago") {
      // Escritor obsoleto RETIRADO. Las operaciones oficiales de pago
      // solo se admiten por acciones-financieras y comprobantes B2.
      return responder({ok:false,codigo:"MOTOR_UNICO_APROBACION_RETIRO",
        error:"Usa la aprobación financiera actual de Admin; esta ruta antigua no acredita pagos."},409);

      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const monto =
        asegurarNumero(
          datos.monto
        );

      const { data: cliente, error } =
        await supabase
          .from("clientes")
          .select(
            "pagos_puntuales"
          )
          .eq("id", clienteId)
          .single();

      if (error) throw error;

      const nuevaRacha =
        Number(
          cliente.pagos_puntuales ||
            0
        ) + 1;

      const hoy =
        new Date();

      const periodo =
        hoy.toLocaleDateString(
          "es-MX",
          {
            month: "long",
            year: "numeric",
          }
        );

      const { error: pagoError } =
        await supabase
          .from("pagos")
          .insert({
            cliente_id: clienteId,
            fecha:
              hoy
                .toISOString()
                .slice(0, 10),
            periodo,
            monto,
            estado: "pagado",
            notas:
              String(
                datos.notas ?? ""
              ),
          });

      if (pagoError)
        throw pagoError;

      const { error: clienteError } =
        await supabase
          .from("clientes")
          .update({
            estado: "pagado",
            pago_en_revision: false,
            pagos_puntuales:
              nuevaRacha,
            descuento_fallas: 0,
          })
          .eq("id", clienteId);

      if (clienteError)
        throw clienteError;

      return responder({
        ok: true,
        accion,
        pagos_puntuales:
          nuevaRacha,
      });
    }

    // ======================================
    // REFERIDOS
    // ======================================

    if (accion === "guardar_referido") {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const { data: existente } =
        await supabase
          .from("referidos")
          .select("id")
          .eq(
            "cliente_id",
            clienteId
          )
          .eq("activo", true)
          .maybeSingle();

      const payload = {
        cliente_id: clienteId,
        nombre:
          String(
            datos.nombre ?? ""
          ),
        plataformas:
          asegurarNumero(
            datos.plataformas,
            1
          ),
        meses:
          asegurarNumero(
            datos.meses,
            1
          ),
        activo:
          datos.activo ===
          undefined
            ? true
            : Boolean(
                datos.activo
              ),
      };

      let resultado;

      if (existente?.id) {
        resultado =
          await supabase
            .from("referidos")
            .update(payload)
            .eq(
              "id",
              existente.id
            )
            .select()
            .single();
      } else {
        resultado =
          await supabase
            .from("referidos")
            .insert(payload)
            .select()
            .single();
      }

      if (resultado.error)
        throw resultado.error;

      return responder({
        ok: true,
        accion,
        referido:
          resultado.data,
      });
    }

    if (
      accion ===
      "desactivar_referido"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const { error } =
        await supabase
          .from("referidos")
          .update({
            activo: false,
          })
          .eq(
            "cliente_id",
            clienteId
          )
          .eq("activo", true);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    // ======================================
    // GAMIFICACIÓN / MISIONES
    // ======================================

    if (
      accion ===
      "guardar_gamificacion"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const payload = {
        cliente_id: clienteId,
        misiones_activas:
          Boolean(
            datos.misiones_activas
          ),
        descuento:
          asegurarNumero(
            datos.descuento
          ),
        tareas:
          String(
            datos.tareas ?? ""
          ),
      };

      const { data: existente } =
        await supabase
          .from("gamificacion")
          .select("id")
          .eq(
            "cliente_id",
            clienteId
          )
          .maybeSingle();

      let resultado;

      if (existente?.id) {
        resultado =
          await supabase
            .from("gamificacion")
            .update(payload)
            .eq(
              "id",
              existente.id
            )
            .select()
            .single();
      } else {
        resultado =
          await supabase
            .from("gamificacion")
            .insert(payload)
            .select()
            .single();
      }

      if (resultado.error)
        throw resultado.error;

      return responder({
        ok: true,
        accion,
        gamificacion:
          resultado.data,
      });
    }

    if (
      accion ===
      "misiones_masivas"
    ) {
      const clientes =
        Array.isArray(
          datos.clientes
        )
          ? datos.clientes
          : [];

      const descuento =
        asegurarNumero(
          datos.descuento
        );

      const tareas =
        String(
          datos.tareas ?? ""
        );

      if (
        clientes.length === 0
      ) {
        return responder(
          {
            ok: false,
            error:
              "No hay clientes seleccionados",
          },
          400
        );
      }

      for (
        const clienteId of clientes
      ) {
        const {
          data: existente,
        } = await supabase
          .from("gamificacion")
          .select("id")
          .eq(
            "cliente_id",
            clienteId
          )
          .maybeSingle();

        if (existente?.id) {
          await supabase
            .from("gamificacion")
            .update({
              misiones_activas:
                true,
              descuento,
              tareas,
            })
            .eq(
              "id",
              existente.id
            );
        } else {
          await supabase
            .from("gamificacion")
            .insert({
              cliente_id:
                clienteId,
              misiones_activas:
                true,
              descuento,
              tareas,
            });
        }
      }

      return responder({
        ok: true,
        accion,
        afectados:
          clientes.length,
      });
    }

    if (
      accion ===
      "borrar_misiones_masivas"
    ) {
      const { error } =
        await supabase
          .from("gamificacion")
          .update({
            misiones_activas:
              false,
            tareas: "",
          })
          .neq(
            "cliente_id",
            "00000000-0000-0000-0000-000000000000"
          );

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    // ======================================
    // DESCUENTOS
    // ======================================

    if (
      accion ===
      "agregar_descuento"
    ) {
      const { data, error } =
        await supabase
          .from(
            "descuentos_especiales"
          )
          .insert({
            cliente_id:
              datos.cliente_id,
            descripcion:
              String(
                datos.descripcion ??
                  ""
              ),
            monto:
              asegurarNumero(
                datos.monto
              ),
            activo: true,
          })
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        descuento: data,
      });
    }

    if (
      accion ===
      "eliminar_descuento"
    ) {
      const id =
        String(datos.id ?? "").trim();

      const { error } =
        await supabase
          .from(
            "descuentos_especiales"
          )
          .delete()
          .eq("id", id);

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    if (
      accion ===
      "aplicar_trato_justo"
    ) {
      const clienteId =
        String(
          datos.cliente_id ?? ""
        ).trim();

      const montoServicio =
        asegurarNumero(
          datos.monto_servicio
        );

      const { data: cliente, error } =
        await supabase
          .from("clientes")
          .select(
            "descuento_fallas"
          )
          .eq("id", clienteId)
          .single();

      if (error) throw error;

      const actual =
        Number(
          cliente.descuento_fallas ||
            0
        );

      const incremento =
        montoServicio * 0.05;

      const maximo =
        montoServicio * 0.5;

      const nuevo =
        Math.min(
          actual + incremento,
          maximo
        );

      const { error: updateError } =
        await supabase
          .from("clientes")
          .update({
            descuento_fallas:
              nuevo,
          })
          .eq("id", clienteId);

      if (updateError)
        throw updateError;

      return responder({
        ok: true,
        accion,
        descuento_fallas: nuevo,
      });
    }

    if (
      accion ===
      "resetear_trato_justo"
    ) {
      const { error } =
        await supabase
          .from("clientes")
          .update({
            descuento_fallas: 0,
          })
          .eq(
            "id",
            datos.cliente_id
          );

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    // ======================================
    // CATÁLOGO
    // ======================================

    if (
      accion ===
      "crear_servicio_catalogo"
    ) {
      const { data, error } =
        await supabase
          .from("servicios")
          .insert({
            nombre:
              String(
                datos.nombre ??
                  "Nuevo"
              ),
            etiqueta:
              String(
                datos.etiqueta ?? ""
              ),
            beneficios:
              String(
                datos.beneficios ??
                  ""
              ),
            categoria_catalogo:
              String(
                datos.categoria_catalogo ??
                  "streaming"
              ),
            cuentas:
              asegurarNumero(
                datos.cuentas,
                1
              ),
            precio:
              asegurarNumero(
                datos.precio
              ),
            costo:
              asegurarNumero(
                datos.costo
              ),
            limite:
              asegurarNumero(
                datos.limite,
                5
              ),
            activo: true,
          })
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        servicio: data,
      });
    }

    if (
      accion ===
      "editar_servicio_catalogo"
    ) {
      const id =
        String(datos.id ?? "").trim();

      const cambios: Record<
        string,
        unknown
      > = {};

      const textoCampos = [
        "nombre",
        "etiqueta",
        "beneficios",
        "categoria_catalogo",
      ];

      for (
        const campo of textoCampos
      ) {
        if (
          datos[campo] !==
          undefined
        )
          cambios[campo] =
            String(datos[campo]);
      }

      const numeroCampos = [
        "precio",
        "costo",
        "cuentas",
        "limite",
      ];

      for (
        const campo of numeroCampos
      ) {
        if (
          datos[campo] !==
          undefined
        )
          cambios[campo] =
            asegurarNumero(
              datos[campo]
            );
      }

      if (datos.activo !== undefined)
        cambios.activo =
          Boolean(datos.activo);

      const { data, error } =
        await supabase
          .from("servicios")
          .update(cambios)
          .eq("id", id)
          .select()
          .single();

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        servicio: data,
      });
    }

    if (
      accion ===
      "eliminar_servicio_catalogo"
    ) {
      const { error } =
        await supabase
          .from("servicios")
          .delete()
          .eq(
            "id",
            datos.id
          );

      if (error) throw error;

      return responder({
        ok: true,
        accion,
      });
    }

    if (
      accion ===
      "sincronizar_precio"
    ) {
      const nombre =
        String(
          datos.nombre ?? ""
        );

      const precio =
        asegurarNumero(
          datos.precio
        );

      const { data, error } =
        await supabase
          .from(
            "cliente_servicios"
          )
          .update({
            monto: precio,
          })
          .eq("nombre", nombre)
          .select("id");

      if (error) throw error;

      return responder({
        ok: true,
        accion,
        actualizados:
          data?.length ?? 0,
      });
    }

    // ======================================
    // ALERTAS
    // ======================================

    if (accion === "guardar_alerta") {
      const payload = {
        activa:
          Boolean(datos.activa),
        plataforma:
          String(
            datos.plataforma ?? ""
          ),
        falla:
          String(
            datos.falla ?? ""
          ),
        mensaje:
          String(
            datos.mensaje ?? ""
          ),
      };

      const { data: existente } =
        await supabase
          .from("alertas")
          .select("id")
          .limit(1)
          .maybeSingle();

      let resultado;

      if (existente?.id) {
        resultado =
          await supabase
            .from("alertas")
            .update(payload)
            .eq(
              "id",
              existente.id
            )
            .select()
            .single();
      } else {
        resultado =
          await supabase
            .from("alertas")
            .insert(payload)
            .select()
            .single();
      }

      if (resultado.error)
        throw resultado.error;

      return responder({
        ok: true,
        accion,
        alerta: resultado.data,
      });
    }

    // ======================================
    // CONFIGURACIÓN
    // ======================================

    if (
      accion ===
      "guardar_configuracion"
    ) {
      const comboUpsell =
        Boolean(
          datos.combo_upsell
        );

      const { data: existente } =
        await supabase
          .from("configuracion")
          .select("id")
          .limit(1)
          .maybeSingle();

      let resultado;

      if (existente?.id) {
        resultado =
          await supabase
            .from("configuracion")
            .update({
              combo_upsell:
                comboUpsell,
            })
            .eq(
              "id",
              existente.id
            )
            .select()
            .single();
      } else {
        resultado =
          await supabase
            .from("configuracion")
            .insert({
              combo_upsell:
                comboUpsell,
            })
            .select()
            .single();
      }

      if (resultado.error)
        throw resultado.error;

      return responder({
        ok: true,
        accion,
        configuracion:
          resultado.data,
      });
    }

    // ======================================
    // ELIMINAR ESPACIO SIN HISTORIAL FINANCIERO
    // ======================================

    if (accion === "eliminar_espacio") {
      const clienteId = String(datos.cliente_id ?? "").trim();
      const confirmacion = String(datos.confirmacion ?? "").trim();
      if (!clienteId || confirmacion !== "ELIMINAR ESPACIO") {
        return responder({ ok:false, error:"Confirmación de eliminación inválida" },400);
      }

      const cliente = await supabase.from("clientes")
        .select("id,nombre,folio")
        .eq("id",clienteId)
        .maybeSingle();
      if (cliente.error) throw cliente.error;
      if (!cliente.data) return responder({ok:false,error:"El espacio ya no existe"},404);

      const checks = await Promise.all([
        supabase.from("pagos").select("id",{count:"exact",head:true}).eq("cliente_id",clienteId),
        supabase.from("pagos_parciales").select("id",{count:"exact",head:true}).eq("cliente_id",clienteId),
        supabase.from("beneficio_aplicaciones").select("id",{count:"exact",head:true}).eq("cliente_id",clienteId),
        supabase.from("promocion_adquisicion_aplicaciones").select("id",{count:"exact",head:true}).eq("cliente_id",clienteId)
      ]);
      const labels = ["pagos","pagos parciales","beneficios aplicados","promociones aplicadas"];
      const blockers:string[] = [];
      checks.forEach((q:any,i:number)=>{
        if(q.error) throw q.error;
        if(Number(q.count||0)>0) blockers.push(`${labels[i]}: ${q.count}`);
      });
      if (blockers.length) {
        return responder({
          ok:false,
          error:"Este espacio tiene historial financiero y no puede eliminarse desde Admin.",
          bloqueos:blockers
        },409);
      }

      const del = await supabase.from("clientes").delete().eq("id",clienteId);
      if (del.error) throw del.error;
      return responder({ok:true,accion,eliminado:true,cliente:cliente.data});
    }

    // ======================================
    // ACCIÓN DESCONOCIDA
    // ======================================

    return responder(
      {
        ok: false,
        error:
          `Acción no reconocida: ${accion}`,
      },
      400
    );
  } catch (error) {
    console.error(error);

    return responder(
      {
        ok: false,
        error:
          "No fue posible realizar la acción administrativa",
      },
      500
    );
  }
});