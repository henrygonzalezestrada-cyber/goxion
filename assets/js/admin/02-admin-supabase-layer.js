    (() => {
        const GXCORE = window.GOXION_CORE;
        const SUPABASE_URL = GXCORE.SUPABASE_ORIGIN;
        const LOGIN_URL = GXCORE.endpoint("login-admin");
        const DATOS_URL = GXCORE.endpoint("admin-datos");
        const PERIODOS_URL = GXCORE.endpoint("periodo-cobro");
        const TRATO_URL = GXCORE.endpoint("trato-justo");
        const ESTADO_CUENTA_URL = GXCORE.endpoint("estado-cuenta-beta");
        const BENEFICIOS_URL = GXCORE.endpoint("beneficios-admin-beta");
        const ADMIN_TOKEN_KEY = GXCORE.STORAGE.ADMIN_TOKEN;
        currentToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
const n = (v, fallback = 0) => {
            const x = Number(v);
            return Number.isFinite(x) ? x : fallback;
        };

        const slug = (v = "") => String(v)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-_]/g, "");

        const firstArray = (...vals) => vals.find(Array.isArray) || [];

        function showFatal(title, detail = "") {
            const container = document.getElementById("clients-container");
            if (!container) return;
            container.innerHTML = `
                <div style="color:#ff6b8a;background:rgba(255,0,60,.08);border:1px solid rgba(255,0,60,.35);padding:14px;border-radius:8px;line-height:1.45;">
                    <strong style="display:block;color:var(--neon-red);margin-bottom:6px;">${title}</strong>
                    <div style="white-space:pre-wrap;font-family:monospace;font-size:.78rem;color:#ffd6df;">${detail || "Sin detalle adicional."}</div>
                </div>`;
        }

        async function parseResponse(response) {
            const text = await response.text();
            let json = null;
            try { json = text ? JSON.parse(text) : {}; } catch {}
            return { text, json };
        }

        async function loginAdminInteractivo() {
            const usuario = prompt("🔒 ACCESO RESTRINGIDO // GOXION ADMIN\n\nUsuario:");
            if (!usuario) return false;
            const password = prompt("Contraseña:");
            if (!password) return false;

            let response;
            try {
                response = await fetch(LOGIN_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ usuario: usuario.trim(), password })
                });
            } catch (e) {
                showFatal("No fue posible contactar login-admin.", String(e));
                return false;
            }

            const { text, json } = await parseResponse(response);
            const token = json?.token || json?.access_token || json?.session_token || "";

            if (!response.ok || json?.ok !== true || !token) {
                showFatal(`login-admin respondió HTTP ${response.status}.`, text || "Respuesta vacía.");
                alert(json?.error || "❌ No fue posible iniciar sesión.");
                return false;
            }

            currentToken = token;
            localStorage.setItem(ADMIN_TOKEN_KEY, token);
            return true;
        }

        async function callAdminDatos() {
            let response;
            try {
                response = await fetch(DATOS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": currentToken
                    },
                    body: "{}"
                });
            } catch (e) {
                throw new Error(`Fallo de red/CORS al llamar admin-datos:\n${e}`);
            }

            const { text, json } = await parseResponse(response);

            if (response.status === 401) {
                localStorage.removeItem(ADMIN_TOKEN_KEY);
                currentToken = "";
                const err = new Error("SESION_EXPIRADA");
                err.raw = text;
                throw err;
            }

            if (!response.ok) {
                throw new Error(`admin-datos devolvió HTTP ${response.status}\n${text || "Respuesta vacía."}`);
            }

            if (!json) {
                throw new Error(`admin-datos no devolvió JSON válido.\nRespuesta recibida:\n${text.slice(0, 2000)}`);
            }

            try {
                const pr = await fetch(PERIODOS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": currentToken
                    },
                    body: JSON.stringify({ accion: "listar_periodos", datos: {} })
                });
                const parsed = await parseResponse(pr);
                if (pr.status === 401) {
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    currentToken = "";
                    const err = new Error("SESION_EXPIRADA");
                    err.raw = parsed.text;
                    throw err;
                }
                if (pr.ok && parsed.json?.ok === true) {
                    json.periodos_cobro = parsed.json.periodos || [];
                } else {
                    console.warn("No se pudieron cargar periodos de cobro:", parsed.text);
                }
            } catch (e) {
                if (e?.message === "SESION_EXPIRADA") throw e;
                console.warn("Periodo de cobro no disponible temporalmente:", e);
            }

            try {
                const tr = await fetch(TRATO_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": currentToken
                    },
                    body: JSON.stringify({ accion: "listar_todas", datos: {} })
                });
                const parsed = await parseResponse(tr);
                if (tr.status === 401) {
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    currentToken = "";
                    const err = new Error("SESION_EXPIRADA");
                    err.raw = parsed.text;
                    throw err;
                }
                if (tr.ok && parsed.json?.ok === true) {
                    json.trato_justo_compensaciones = parsed.json.compensaciones || [];
                } else {
                    console.warn("Trato Justo no disponible:", parsed.text);
                }
            } catch (e) {
                if (e?.message === "SESION_EXPIRADA") throw e;
                console.warn("No se pudieron cargar compensaciones Trato Justo:", e);
            }

            try {
                const er = await fetch(ESTADO_CUENTA_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": currentToken
                    },
                    body: JSON.stringify({ accion: "listar_admin", datos: {} }),
                    cache: "no-store"
                });
                const parsed = await parseResponse(er);
                if (er.status === 401) {
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    currentToken = "";
                    const err = new Error("SESION_EXPIRADA");
                    err.raw = parsed.text;
                    throw err;
                }
                if (er.ok && parsed.json?.ok === true) {
                    json.estados_cuenta = parsed.json.estados || [];
                    json.estado_cuenta_fuente = parsed.json.fuente || "supabase:goxion_estado_cuenta";
                } else {
                    console.warn("Estado de cuenta central no disponible:", parsed.text);
                }
            } catch (e) {
                if (e?.message === "SESION_EXPIRADA") throw e;
                console.warn("Estado de cuenta central no disponible temporalmente:", e);
            }

            try {
                const br = await fetch(BENEFICIOS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": currentToken
                    },
                    body: JSON.stringify({ accion: "listar", datos: {} }),
                    cache: "no-store"
                });
                const parsed = await parseResponse(br);
                if (br.status === 401) {
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    currentToken = "";
                    const err = new Error("SESION_EXPIRADA");
                    err.raw = parsed.text;
                    throw err;
                }
                if (br.ok && parsed.json?.ok === true) {
                    json.beneficios_programados = parsed.json.beneficios || [];
                } else {
                    console.warn("Beneficios programados no disponibles:", parsed.text);
                }
            } catch (e) {
                if (e?.message === "SESION_EXPIRADA") throw e;
                console.warn("No se pudieron cargar beneficios programados:", e);
            }

            return json;
        }

        function unwrapRoot(data) {
            if (!data || typeof data !== "object") return {};
            if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) return data.data;
            if (data.result && typeof data.result === "object" && !Array.isArray(data.result)) return data.result;
            return data;
        }

        function getArray(root, ...names) {
            for (const name of names) {
                if (Array.isArray(root?.[name])) return root[name];
            }
            return [];
        }

        function belongsToCliente(item, clienteId) {
            return String(item?.cliente_id ?? item?.id_cliente ?? item?.clienteId ?? item?.cliente?.id ?? "") === String(clienteId);
        }

        function adaptarServicioCliente(s = {}) {
            return {
                _id: s.id || "",
                id: s.id || "",
                servicio_id: s.servicio_id ?? s.catalogo_id ?? s.servicio?.id ?? null,
                nombre: s.nombre || s.servicio_nombre || s.nombre_servicio || s.servicio?.nombre || "Servicio",
                monto: n(s.monto ?? s.precio ?? s.precio_cliente, 0),
                correo_login: s.correo_login || s.correo || s.email || "",
                perfil_nombre: s.perfil_nombre || s.perfil || "",
                perfil_pin: s.perfil_pin || s.pin_perfil || "",
                activo: s.activo !== false
            };
        }

        function adaptarPago(p = {}) {
            return {
                _id: p.id || "",
                id: p.id || "",
                fecha: p.fecha || p.fecha_pago || p.created_at || "",
                monto: n(p.monto, 0),
                estado: p.estado || "pagado"
            };
        }

        function adaptarDescuento(d = {}) {
            return {
                _id: d.id || "",
                id: d.id || "",
                concepto: d.concepto || d.descripcion || d.nombre || "Descuento",
                monto: n(d.monto, 0)
            };
        }

        function adaptarReferido(r = {}) {
            return {
                _id: r.id || "",
                id: r.id || "",
                nombre: r.nombre || "",
                plataformas: n(r.plataformas, 2),
                meses: n(r.meses, 1),
                activo: r.activo !== false,
                beneficio_reclamado: r.beneficio_reclamado === true,
                beneficio_reclamado_at: r.beneficio_reclamado_at || null,
                servicios: Array.isArray(r.servicios) ? r.servicios : [],
                fecha_inicio: r.fecha_inicio || r.created_at?.slice?.(0,10) || "",
                progreso_pausado: r.progreso_pausado === true,
                meses_override: r.meses_override ?? null
            };
        }

        function adaptarGamificacion(g = {}) {
            return {
                _id: g.id || "",
                id: g.id || "",
                misiones_activas: g.misiones_activas === true,
                descuento: n(g.descuento, 5),
                tareas: g.tareas || "",
                cupon_reclamado: g.cupon_reclamado === true,
                cupon_reclamado_at: g.cupon_reclamado_at || null,
                misiones_version: n(g.misiones_version, 1),
                cupon_ciclo: n(g.cupon_ciclo, 1),
                cupon_reclamado_ciclo: n(g.cupon_reclamado_ciclo, 0)
            };
        }

        function adaptarCatalogo(s = {}) {
            const item = {
                _id: s.id || "",
                id: s.id || "",
                nombre: s.nombre || "Servicio",
                etiqueta: s.etiqueta || "",
                beneficios: s.beneficios || "",
                cuentas: n(s.cuentas, 1),
                precio: n(s.precio, 0),
                costo: n(s.costo, 0),
                limite: n(s.limite, 5)
            };
            if (s.stock_manual !== undefined && s.stock_manual !== null && s.stock_manual !== "") {
                item.stock_manual = n(s.stock_manual, 0);
            }
            return item;
        }

        function adaptarRespuestaAdmin(data) {
            const root = unwrapRoot(data);

            // admin-datos entrega las notificaciones administrativas.
            // Las conservamos en memoria para que la campana, el punto rojo y
            // "Marcar leídas" trabajen con datos reales y no solo con alertas sintéticas.
            window.gxAdminNotifications = Array.isArray(root.notificaciones)
                ? root.notificaciones
                : (Array.isArray(data?.notificaciones) ? data.notificaciones : []);

            const clientes = firstArray(
                root.clientes,
                root.clients,
                root.usuarios,
                data.clientes,
                data.data?.clientes
            );

            const catalogo = firstArray(
                root.serviciosGlobales,
                root.servicios_globales,
                root.servicios_catalogo,
                root.catalogo,
                root.catalogo_servicios,
                data.serviciosGlobales,
                data.servicios_globales
            );

            const serviciosGlobal = getArray(root, "cliente_servicios", "servicios_clientes", "clientes_servicios", "suscripciones");
            const pagosGlobal = getArray(root, "pagos", "historial_pagos", "pagos_clientes");
            const referidosGlobal = getArray(root, "referidos", "clientes_referidos");
            const gamifGlobal = getArray(root, "gamificacion", "gamificaciones", "clientes_gamificacion");
            const descuentosGlobal = getArray(root, "descuentos", "descuentos_especiales", "clientes_descuentos");
            const tratoJustoGlobal = getArray(root, "trato_justo_compensaciones");
            const estadosCuentaGlobal = getArray(root, "estados_cuenta");
            const beneficiosProgramadosGlobal = getArray(root, "beneficios_programados");
            const estadoCuentaPorCliente = new Map(estadosCuentaGlobal.map(x => [String(x?.cliente_id || ""), x]));
            const periodosCobro = getArray(root, "periodos_cobro");
            const periodoPorCliente = new Map(
                periodosCobro.map(x => [String(x?.id || x?.cliente_id || ""), x])
            );

            if (!clientes.length) {
                const keys = Object.keys(root || {});
                throw new Error("La respuesta de admin-datos llegó, pero no encontré el arreglo de clientes.\nClaves recibidas: " + keys.join(", "));
            }

            const nuevoDict = {};

            clientes.forEach((c, idx) => {
                const id = c.id || c.cliente_id || c.uuid || "";

                const servicios = firstArray(
                    c.servicios,
                    c.cliente_servicios,
                    c.suscripciones,
                    serviciosGlobal.filter(x => belongsToCliente(x, id))
                );
                const pagos = firstArray(
                    c.historial_pagos,
                    c.pagos,
                    pagosGlobal.filter(x => belongsToCliente(x, id))
                );
                const referidos = firstArray(
                    c.referidos,
                    referidosGlobal.filter(x => belongsToCliente(x, id))
                );
                const descuentos = firstArray(
                    c.descuentos_especiales,
                    c.descuentos,
                    descuentosGlobal.filter(x => belongsToCliente(x, id))
                );

                let gamificacion = c.gamificacion;
                if (Array.isArray(gamificacion)) gamificacion = gamificacion[0];
                if (!gamificacion) gamificacion = gamifGlobal.find(x => belongsToCliente(x, id));

                const refActivo = referidos.find(r => r?.activo !== false) || null;
                const tratoJusto = tratoJustoGlobal.filter(x => String(x?.cliente_id || "") === String(id));

                let key = c.clave || c.key || c.slug || c.identificador || slug(c.nombre || c.folio || id || `cliente-${idx + 1}`);
                if (!key) key = `cliente-${idx + 1}`;
                if (nuevoDict[key]) key = `${key}-${String(id || idx).slice(0, 6)}`;

                const periodoMeta = periodoPorCliente.get(String(id)) || {};

                nuevoDict[key] = {
                    _id: id,
                    id,
                    _key: key,
                    folio: c.folio || "",
                    nombre: c.nombre || key,
                    usuario_acceso: c.usuario_acceso || c.usuario || c.correo_acceso || "",
                    codigo: "",
                    pagos_puntuales: n(c.pagos_puntuales, 0),
                    dia_pago: n(c.dia_pago, 15),
                    periodo_pendiente: c.periodo_pendiente || periodoMeta.periodo_pendiente || new Date().toISOString().slice(0,7) + "-01",
                    ciclo_cobro_manual: periodoMeta.ciclo_cobro_manual === true,
                    corte_virtual: periodoMeta.corte_aplicado === true,
                    estado_guardado: periodoMeta.estado_guardado || c.estado || "pendiente",
                    estado: periodoMeta.estado || c.estado || "pendiente",
                    pago_en_revision: c.pago_en_revision === true,
                    pago_revision_estado: c.pago_revision_estado || "",
                    pago_revision_mensaje: c.pago_revision_mensaje || "",
                    pago_revision_monto_faltante: n(c.pago_revision_monto_faltante, 0),
                    pago_revision_updated_at: c.pago_revision_updated_at || null,
                    historial_pagos: pagos.map(adaptarPago),
                    servicios: servicios.map(adaptarServicioCliente),
                    descuentos_especiales: descuentos.map(adaptarDescuento),
                    beneficios_programados: beneficiosProgramadosGlobal.filter(x => String(x?.cliente_id || "") === String(id)),
                    trato_justo_compensaciones: tratoJusto,
                    descuento_fallas: tratoJusto.filter(x => x.activo !== false && String(x.periodo || "").slice(0,7) === String(c.periodo_pendiente || periodoMeta.periodo_pendiente || "").slice(0,7)).reduce((s,x)=>s+n(x.monto,0), n(c.descuento_fallas,0)),
                    referido_activo: refActivo ? adaptarReferido(refActivo) : undefined,
                    gamificacion: gamificacion ? adaptarGamificacion(gamificacion) : undefined,
                    estado_cuenta: estadoCuentaPorCliente.get(String(id)) || null
                };
            });

            const cfg = root.config || root.configuracion || root._goxion_config || data.config || data.configuracion || {};
            const alertasRaw = root.alertas ?? data.alertas ?? cfg.alertas ?? {};
            const alertas = Array.isArray(alertasRaw) ? (alertasRaw[0] || {}) : alertasRaw;
            const catalogoCfg = firstArray(cfg.serviciosGlobales, cfg.servicios_globales);

            configGlobal = {
                alertas: {
                    activa: alertas.activa === true,
                    plataforma: alertas.plataforma || "Todos los servicios",
                    falla: alertas.falla || "presentando intermitencias temporales",
                    mensaje: alertas.mensaje || ""
                },
                serviciosGlobales: (catalogo.length ? catalogo : catalogoCfg).map(adaptarCatalogo),
                combo_upsell: (root.combo_upsell ?? data.combo_upsell ?? cfg.combo_upsell) !== false
            };

            if (!configGlobal.serviciosGlobales.length) {
                configGlobal.serviciosGlobales = DEFAULT_SERVICES.map(x => ({...x}));
            }

            clientesDict = nuevoDict;
        }

        async function cargarAdminDatos() {
            const data = await callAdminDatos();
            adaptarRespuestaAdmin(data);
document.getElementById("combo-active").checked = configGlobal.combo_upsell;
            document.getElementById("alert-active").checked = configGlobal.alertas?.activa || false;
            document.getElementById("alert-type").value = configGlobal.alertas?.falla || "presentando intermitencias temporales";
            document.getElementById("global-msg").value = configGlobal.alertas?.mensaje || "";

            calcularInventarioYFinanzas();
            renderGlobalServicesUI();

            const alertPlatform = document.getElementById("alert-platform");
            if (alertPlatform && configGlobal.alertas?.plataforma) {
                alertPlatform.value = configGlobal.alertas.plataforma;
            }

            toggleAlertFields();
            filtrarClientes();
        }

        pedirToken = async function() {
            const ok = await loginAdminInteractivo();
            if (ok) await inicializarPanel();
        };

        cerrarSesion = function() {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            currentToken = "";
            location.reload();
        };

        inicializarPanel = async function() {
            currentToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";

            if (!currentToken) {
                const ok = await loginAdminInteractivo();
                if (!ok) return;
            }

            try {
                await cargarAdminDatos();
            } catch (e) {
                if (e?.message === "SESION_EXPIRADA") {
                    const ok = await loginAdminInteractivo();
                    if (ok) {
                        try {
                            await cargarAdminDatos();
                            return;
                        } catch (e2) {
                            console.error(e2);
                            showFatal("No fue posible cargar admin-datos después de renovar sesión.", e2?.stack || e2?.message || String(e2));
                            return;
                        }
                    }
                    return;
                }
                console.error(e);
                showFatal("No fue posible cargar admin-datos.", e?.stack || e?.message || String(e));
            }
        };

    })();
    