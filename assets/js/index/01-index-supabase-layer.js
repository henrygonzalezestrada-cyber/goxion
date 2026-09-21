(() => {
    const MI_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/mi-espacio";
    const NOTIFY_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/notificar-goxion";
    const PERIODO_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/periodo-cobro";
    const TRATO_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/trato-justo";
    const ESTADO_CUENTA_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/estado-cuenta-beta";
    const TOKEN_KEY = "goxion_client_token";
    const nativeFetch = window.fetch.bind(window);

    
function goxionLegacyAdapter(data) {
    const legacy = {
        _goxion_config: {
            alertas: data?.alertas || {},
            serviciosGlobales: Array.isArray(data?.catalogo) ? data.catalogo : [],
            combo_upsell: data?.configuracion?.combo_upsell !== false
        }
    };

    if (data?.cliente) {
        const c = data.cliente;
        const key = c.clave || "";
        legacy[key] = {
            id: c.id,
            clave: c.clave,
            folio: c.folio || "",
            nombre: c.nombre || "",
            usuario_acceso: c.usuario_acceso || "",
            dia_pago: Number(c.dia_pago || 15),
            periodo_pendiente: c.periodo_pendiente || data?.periodo_pendiente || "",
            ciclo_cobro_manual: c.ciclo_cobro_manual === true,
            corte_virtual: c.corte_virtual === true,
            estado: c.estado || "pendiente",
            pago_en_revision: c.pago_en_revision === true,
            pago_revision_estado: String(c.pago_revision_estado || ""),
            pago_revision_mensaje: c.pago_revision_mensaje || "",
            pago_revision_monto_faltante: Number(c.pago_revision_monto_faltante || 0),
            pago_revision_updated_at: c.pago_revision_updated_at || "",
            pagos_puntuales: Number(c.pagos_puntuales || 0),
            descuento_fallas: Number(c.descuento_fallas || 0),
            estado_cuenta: data?.estado_cuenta || null,
            trato_justo_compensaciones: Array.isArray(data.trato_justo_compensaciones) ? data.trato_justo_compensaciones : [],
            servicios: (data.servicios || []).map(s => ({
                id: s.id,
                nombre: s.nombre,
                monto: Number(s.monto || 0),
                correo_login: s.correo_login || "",
                perfil_nombre: s.perfil_nombre || "",
                perfil_pin: s.perfil_pin || ""
            })),
            historial_pagos: (data.pagos || []).map(p => ({
                id: p.id,
                fecha: p.periodo || p.fecha || "",
                monto: Number(p.monto || 0),
                estado: p.estado || "pagado",
                notas: p.notas || ""
            })),
            gamificacion: data.gamificacion || null,
            referido_activo: Array.isArray(data.referidos) && data.referidos.length ? data.referidos[0] : undefined,
            descuentos_especiales: (data.descuentos || []).map(d => ({
                id: d.id,
                concepto: d.descripcion || "Descuento",
                monto: Number(d.monto || 0)
            }))
        };
    }

    return legacy;
}


    async function parseJSON(r) {
        const t = await r.text();
        let j = {};
        try { j = t ? JSON.parse(t) : {}; } catch {}
        return {text:t,json:j};
    }

    window.fetch = async function(input, init = {}) {
        const url = typeof input === "string" ? input : (input?.url || "");

        if (url.includes("clientes.json")) {
            const token = localStorage.getItem(TOKEN_KEY) || "";
            if (!token) {
                return new Response(JSON.stringify({}), {
                    status:200,
                    headers:{"Content-Type":"application/json"}
                });
            }

            const [r, periodoR, tratoR, estadoR] = await Promise.all([
                nativeFetch(MI_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:"{}"
                }),
                nativeFetch(PERIODO_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:JSON.stringify({accion:"obtener_periodo",datos:{}})
                }).catch(() => null),
                nativeFetch(TRATO_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:JSON.stringify({accion:"listar_cliente",datos:{}})
                }).catch(() => null),
                nativeFetch(ESTADO_CUENTA_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:JSON.stringify({accion:"mi_estado",datos:{}}),
                    cache:"no-store"
                }).catch(() => null)
            ]);
            const {json} = await parseJSON(r);

            if (periodoR?.ok) {
                try {
                    const periodoData = await periodoR.json();
                    if (periodoData?.ok === true) {
                        json.periodo_pendiente = periodoData.periodo_pendiente || "";
                        if (json.cliente) {
                            json.cliente.periodo_pendiente = periodoData.periodo_pendiente || "";
                            if (periodoData.estado) json.cliente.estado = periodoData.estado;
                            json.cliente.ciclo_cobro_manual = periodoData.ciclo_cobro_manual === true;
                            json.cliente.corte_virtual = periodoData.corte_aplicado === true;
                        }
                    }
                } catch {}
            }

            if (tratoR?.ok) {
                try {
                    const tratoData = await tratoR.json();
                    if (tratoData?.ok === true) {
                        json.trato_justo_compensaciones = tratoData.compensaciones || [];
                        const total = (json.trato_justo_compensaciones || []).reduce((s,x)=>s+Number(x.monto||0),0);
                        if (json.cliente) json.cliente.descuento_fallas = total;
                    }
                } catch {}
            }

            if (estadoR?.ok) {
                try {
                    const estadoData = await estadoR.json();
                    if (estadoData?.ok === true && estadoData.estado_cuenta) {
                        json.estado_cuenta = estadoData.estado_cuenta;
                        if (json.cliente && estadoData.estado_cuenta.periodo) {
                            json.cliente.periodo_pendiente = estadoData.estado_cuenta.periodo;
                        }
                    }
                } catch {}
            }

            if (!r.ok || json?.ok !== true) {
                if (r.status === 401) {
                    localStorage.removeItem(TOKEN_KEY);
                }
                return new Response(JSON.stringify({}), {
                    status:200,
                    headers:{"Content-Type":"application/json"}
                });
            }

            return new Response(JSON.stringify(goxionLegacyAdapter(json)), {
                status:200,
                headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
            });
        }

        if (url === "goxion://pagos") {
            const token = localStorage.getItem(TOKEN_KEY) || "";

            if (init?.body instanceof FormData) {
                if (!token) return new Response(JSON.stringify({ok:false,error:"Sesión requerida"}), {status:401});

                const mr = await nativeFetch(MI_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:JSON.stringify({modo:"marcar_pago_revision"})
                });

                if (!mr.ok) return mr;

                const fd = init.body;
                fd.set("categoria", "pagos");
                return nativeFetch(NOTIFY_URL, {
                    method:"POST",
                    headers:{"X-Client-Token":token},
                    body:fd
                });
            }

            let payload = {};
            try { payload = JSON.parse(init?.body || "{}"); } catch {}
            const emb = payload?.embeds?.[0] || {};
            return nativeFetch(NOTIFY_URL, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    categoria:"pagos",
                    titulo:emb.title || "GOXION",
                    mensaje:emb.description || "",
                    colorHex:Number(emb.color || 65437).toString(16)
                })
            });
        }

        return nativeFetch(input, init);
    };

    window.addEventListener("DOMContentLoaded", () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            const app = document.getElementById("app");
            setTimeout(() => {
                if (app && app.innerText.includes("CLIENTE NO ENCONTRADO")) {
                    app.innerHTML = `
                    <div class="glass-card" style="margin-top:40px;text-align:center;">
                        <div style="font-size:38px;margin-bottom:10px;">🔐</div>
                        <div style="font-weight:800;margin-bottom:8px;">Inicia sesión primero</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px;">Este Estado de Cuenta está protegido por tu sesión de GOXION.</div>
                        <a class="btn btn-copy" href="ayuda.html">Ir a Mi Espacio</a>
                    </div>`;
                }
            }, 700);
        }
    });

    console.info("GOXION index protegido por sesión Supabase.");
})();