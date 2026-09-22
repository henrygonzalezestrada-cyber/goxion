(() => {
    const GXCORE = window.GOXION_CORE;
    const MI_URL = GXCORE.endpoint("mi-espacio");
    const NOTIFY_URL = GXCORE.endpoint("notificar-goxion");
    const PERIODO_URL = GXCORE.endpoint("periodo-cobro");
    const TRATO_URL = GXCORE.endpoint("trato-justo");
    const ESTADO_CUENTA_URL = GXCORE.endpoint("estado-cuenta-beta");
    const TOKEN_KEY = GXCORE.STORAGE.CLIENT_TOKEN;
    const nativeFetch = window.fetch.bind(window);

    
window.gxSelectIndexFinancialState = function(legacyState, financialState, expectedClientId = "") {
    const legacy = legacyState && typeof legacyState === "object" ? legacyState : null;
    const financial = financialState && typeof financialState === "object" ? financialState : null;
    const expectedId = String(expectedClientId || "").trim();

    const isFiniteMoney = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
    const validFinancial = Boolean(
        financial &&
        financial.fuente_financiera === "supabase:goxion_estado_financiero" &&
        financial.contrato_financiero?.version === "1.0" &&
        financial.contrato_financiero?.modo === "sombra" &&
        isFiniteMoney(financial.subtotal) &&
        isFiniteMoney(financial.total_actual) &&
        /^\d{4}-\d{2}/.test(String(financial.periodo || "")) &&
        (!expectedId || !financial.cliente_id || String(financial.cliente_id) === expectedId)
    );

    const fields = [
        ["periodo", value => String(value || "")],
        ["estado", value => String(value || "")],
        ["subtotal", value => Number(value || 0)],
        ["total_actual", value => Number(value || 0)],
        ["pagos_efectivos", value => Number(value || 0), state => state?.lealtad?.pagos_efectivos],
        ["nivel_lealtad", value => Number(value || 0), state => state?.lealtad?.nivel],
        ["mora", value => Number(value || 0), state => state?.cargos?.mora],
        ["reactivacion", value => Number(value || 0), state => state?.cargos?.reactivacion],
    ];

    const diferencias = [];
    if (legacy && financial) {
        for (const [field, normalize, pick] of fields) {
            const read = pick || (state => state?.[field]);
            const a = normalize(read(legacy));
            const b = normalize(read(financial));
            if (typeof a === "number" && typeof b === "number") {
                if (Math.abs(a - b) >= 0.005) diferencias.push({ field, legacy:a, financial:b });
            } else if (a !== b) {
                diferencias.push({ field, legacy:a, financial:b });
            }
        }
    }

    const compared = Boolean(legacy && financial);
    const matches = compared ? diferencias.length === 0 : null;
    const useFinancial = validFinancial && (!legacy || matches === true);
    const chosen = useFinancial ? financial : legacy;

    const audit = {
        source: useFinancial
            ? "financial-v1"
            : (validFinancial && legacy && matches === false
                ? "legacy-variance-fallback"
                : (legacy ? "legacy-fallback" : "none")),
        financial_valid: validFinancial,
        compared,
        differences: diferencias,
        matches
    };

    return { state: chosen, audit };
};

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

            const [r, periodoR, tratoR, estadoR, financialState] = await Promise.all([
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
                }).catch(() => null),
                window.GOXION_FINANCIAL?.clientState?.().catch(() => null) ?? Promise.resolve(null)
            ]);
            const {json} = await parseJSON(r);
            let legacyEstadoCuenta = json?.estado_cuenta || null;

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
                        legacyEstadoCuenta = estadoData.estado_cuenta;
                    }
                } catch {}
            }

            const selection = window.gxSelectIndexFinancialState(
                legacyEstadoCuenta,
                financialState,
                json?.cliente?.id || ""
            );
            json.estado_cuenta = selection.state;
            window.__GOXION_INDEX_FINANCE_AUDIT = Object.freeze({
                ...selection.audit,
                checked_at: new Date().toISOString()
            });

            if (selection.audit.compared && selection.audit.matches === false) {
                console.warn("GOXION Index · diferencia financiera detectada", selection.audit.differences);
            }

            if (json.cliente && json.estado_cuenta?.periodo) {
                json.cliente.periodo_pendiente = json.estado_cuenta.periodo;
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