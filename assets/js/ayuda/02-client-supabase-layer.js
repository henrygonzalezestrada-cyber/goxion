    (() => {
        const LOGIN_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/login-goxion";
        const MI_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/mi-espacio";
        const NOTIFY_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/notificar-goxion";
        const INVENTARIO_PUBLICO_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/inventario-publico";
        const CANCELACIONES_CLIENTE_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/cancelaciones-cliente";
        const CREDENCIALES_CLIENTE_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/credenciales-cliente";
        const NOVEDADES_CLIENTE_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/novedades-cliente";
        const ESTADO_CUENTA_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/estado-cuenta-beta";
        const ACCESOS_CLIENTE_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/accesos-cliente-beta";
        const TOKEN_KEY = "goxion_client_token";

        async function missionRequest(payload) {
            const token = localStorage.getItem(TOKEN_KEY) || "";
            if(!token) throw new Error("Sesión requerida");
            const r = await fetch(MI_URL, {
                method:"POST",
                headers:{"Content-Type":"application/json","X-Client-Token":token},
                body:JSON.stringify(payload)
            });
            const {text,json} = await parseJSON(r);
            if(!r.ok || json?.ok !== true) throw new Error(json?.error || text || "No fue posible sincronizar el avance.");
            return json;
        }

        window.goxionMissionAPI = {
            completeIndex: (index) => missionRequest({modo:"completar_mision",mision_index:Number(index)}),
            completeType: (tipo) => missionRequest({modo:"completar_mision_tipo",tipo:String(tipo||"").toUpperCase()}),
            importLegacy: (indices, version) => missionRequest({modo:"importar_progreso_misiones",indices,misiones_version:Number(version||1)})
        };

        async function migrarProgresoLocalSiExiste(data) {
            const c = data?.cliente, g = data?.gamificacion;
            if(!c?.folio || !g) return data;
            const key = `goxion_missions_${c.folio}`;
            const versionKey = `goxion_missions_version_${c.folio}`;
            const recentKey = `goxion_recent_mission_${c.folio}`;
            const payKey = `goxion_mission_pago_completed_${c.folio}`;
            let indices = [];
            try { indices = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
            const version = Number(localStorage.getItem(versionKey) || g.misiones_version || 1);

            if(Array.isArray(indices) && indices.length) {
                try {
                    const migrated = await window.goxionMissionAPI.importLegacy(indices, version);
                    data.misiones_progreso = Array.isArray(migrated?.progreso) ? migrated.progreso : data.misiones_progreso;
                } catch(e) {
                    console.warn("No se pudo migrar progreso local anterior:", e);
                    return data;
                }
            }
            localStorage.removeItem(key);
            localStorage.removeItem(versionKey);
            localStorage.removeItem(recentKey);
            localStorage.removeItem(payKey);
            return data;
        }



        async function cargarExtrasPrivados(data, token) {
            if(!data || !token) return data;

            const request = async (url, accion="listar") => {
                const r=await fetch(url,{
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":token},
                    body:JSON.stringify({accion,datos:{}}),
                    cache:"no-store"
                });
                const {text,json}=await parseJSON(r);
                if(!r.ok || json?.ok!==true) throw new Error(json?.error || text || "No disponible");
                return json;
            };

            const [cancelaciones,credenciales,novedades,estadoCuenta,accesosCliente]=await Promise.allSettled([
                request(CANCELACIONES_CLIENTE_URL),
                request(CREDENCIALES_CLIENTE_URL),
                request(NOVEDADES_CLIENTE_URL),
                request(ESTADO_CUENTA_URL,"mi_estado"),
                request(ACCESOS_CLIENTE_URL)
            ]);

            if(cancelaciones.status==="fulfilled") {
                data.cancelaciones=Array.isArray(cancelaciones.value?.solicitudes)
                    ? cancelaciones.value.solicitudes
                    : [];
            } else {
                console.warn("Cancelaciones Mi Espacio:",cancelaciones.reason);
                data.cancelaciones=[];
            }

            if(credenciales.status==="fulfilled") {
                data.credenciales_entregas=Array.isArray(credenciales.value?.entregas)
                    ? credenciales.value.entregas
                    : [];
            } else {
                console.warn("Credenciales Mi Espacio:",credenciales.reason);
                data.credenciales_entregas=[];
            }

            if(novedades.status==="fulfilled") {
                data.novedades_servicio=Array.isArray(novedades.value?.novedades)
                    ? novedades.value.novedades
                    : [];
            } else {
                console.warn("Novedades Mi Espacio:",novedades.reason);
                data.novedades_servicio=[];
            }

            if(estadoCuenta.status==="fulfilled" && estadoCuenta.value?.estado_cuenta) {
                data.estado_cuenta=estadoCuenta.value.estado_cuenta;
            } else {
                console.warn("Estado de cuenta central Mi Espacio:",estadoCuenta.reason || "No disponible");
                data.estado_cuenta=null;
            }

            if(accesosCliente.status==="fulfilled") {
                data.cliente_accesos=Array.isArray(accesosCliente.value?.accesos)
                    ? accesosCliente.value.accesos
                    : [];
            } else {
                console.warn("Accesos reales Mi Espacio:",accesosCliente.reason || "No disponible");
                data.cliente_accesos=[];
            }

            return data;
        }

function goxionViewModelAdapter(data) {
    const viewModel = {
        _goxion_config: {
            alertas: data?.alertas || {},
            serviciosGlobales: Array.isArray(data?.catalogo) ? data.catalogo : [],
            combo_upsell: data?.configuracion?.combo_upsell !== false
        }
    };

    if (data?.cliente) {
        const c = data.cliente;
        const key = c.clave || "";
        viewModel[key] = {
            id: c.id,
            clave: c.clave,
            folio: c.folio || "",
            nombre: c.nombre || "",
            usuario_acceso: c.usuario_acceso || "",
            dia_pago: Number(c.dia_pago || 15),
            estado: c.estado || "pendiente",
            pago_en_revision: c.pago_en_revision === true,
            pago_revision_estado: c.pago_revision_estado || "",
            pago_revision_mensaje: c.pago_revision_mensaje || "",
            pago_revision_monto_faltante: Number(c.pago_revision_monto_faltante || 0),
            pago_revision_updated_at: c.pago_revision_updated_at || null,
            pagos_puntuales: Number(c.pagos_puntuales || 0),
            descuento_fallas: Number(c.descuento_fallas || 0),
            origen_cliente: c.origen_cliente || "",
            promo_nuevo_elegible: c.promo_nuevo_elegible === true,
            created_at: c.created_at || null,
            estado_cuenta: data?.estado_cuenta || null,
            servicios: (data.servicios || []).map(s => {
                const serviceCancellations=(data.cancelaciones || [])
                    .filter(x => String(x.cliente_servicio_id || "") === String(s.id || ""))
                    .sort((a,b) => new Date(b.created_at || b.solicitada_at || 0) - new Date(a.created_at || a.solicitada_at || 0));
                const openCancellation=serviceCancellations.find(x => ["solicitada","aprobada"].includes(String(x.estado || "").toLowerCase()));
                const latestCancellation=openCancellation || serviceCancellations[0] || null;

                const pendingCredential=(data.credenciales_entregas || []).find(x =>
                    String(x.cliente_servicio_id || "") === String(s.id || "") &&
                    String(x.estado || "").toLowerCase() === "pendiente" &&
                    x.activa !== false &&
                    x.servicio_activo !== false
                ) || null;

                return {
                    id: s.id,
                    nombre: s.nombre,
                    monto: Number(s.monto || 0),
                    correo_login: s.correo_login || "",
                    perfil_nombre: s.perfil_nombre || "",
                    perfil_pin: s.perfil_pin || "",
                    accesos: (data.cliente_accesos || [])
                        .filter(a => String(a.cliente_servicio_id || "") === String(s.id || ""))
                        .sort((a,b) =>
                            String(a.servicio || "").localeCompare(String(b.servicio || ""),"es") ||
                            Number(a.ordinal || 1)-Number(b.ordinal || 1)
                        )
                        .map(a => ({
                            id: a.id || "",
                            servicio_id: a.servicio_id || "",
                            servicio: a.servicio || s.nombre || "Servicio",
                            modo_acceso: a.modo_acceso || "compartido",
                            ordinal: Number(a.ordinal || 1),
                            correo: a.correo || "",
                            perfil_nombre: a.perfil_nombre || "",
                            perfil_pin: a.perfil_pin || "",
                            estado_invitacion: a.estado_invitacion || "",
                            configurado: a.configurado === true
                        })),
                    cancelacion: latestCancellation,
                    credencial_pendiente: pendingCredential,
                    novedades: (data.novedades_servicio || []).filter(n =>
                        String(n.cliente_servicio_id || "") === String(s.id || "")
                    )
                };
            }),
            historial_pagos: (data.pagos || []).map(p => ({
                id: p.id,
                fecha: p.periodo || p.fecha || "",
                monto: Number(p.monto || 0),
                estado: p.estado || "pagado",
                notas: p.notas || ""
            })),
            gamificacion: data.gamificacion ? {...data.gamificacion, progreso: Array.isArray(data.misiones_progreso) ? data.misiones_progreso : []} : null,
            referido_activo: Array.isArray(data.referidos) && data.referidos.length ? data.referidos[0] : undefined,
            descuentos_especiales: (data.descuentos || []).map(d => ({
                id: d.id,
                concepto: d.descripcion || "Descuento",
                monto: Number(d.monto || 0)
            }))
        };
    }

    return viewModel;
}


        async function parseJSON(r) {
            const t = await r.text();
            let j = {};
            try { j = t ? JSON.parse(t) : {}; } catch {}
            return { text:t, json:j };
        }

        async function aplicarInventarioPublico(viewModel) {
            try {
                const r = await fetch(INVENTARIO_PUBLICO_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}"
                });

                const { text, json } = await parseJSON(r);
                if (!r.ok || json?.ok !== true) {
                    throw new Error(json?.error || text || "Inventario no disponible");
                }

                const porId = new Map((json.inventario || []).map(x => [String(x.id), x]));
                const porNombre = new Map((json.inventario || []).map(x => [String(x.nombre).toLowerCase(), x]));

                const catalogo = viewModel?._goxion_config?.serviciosGlobales;
                if (Array.isArray(catalogo)) {
                    catalogo.forEach(s => {
                        const info =
                            porId.get(String(s.id || s._id || "")) ||
                            porNombre.get(String(s.nombre || "").toLowerCase());

                        if (info) {
                            s.disponibles_servidor = Number(info.disponibles || 0);
                            s.modo_inventario = info.modo || "automatico";
                        }
                    });
                }

                return viewModel;
            } catch (e) {
                console.error("Inventario público:", e);
                return viewModel;
            }
        }

        async function cargarPublicoOCliente() {
            const token = localStorage.getItem(TOKEN_KEY) || "";

            if (token) {
                try {
                    const r = await fetch(MI_URL, {
                        method:"POST",
                        headers:{"Content-Type":"application/json","X-Client-Token":token},
                        body:JSON.stringify({})
                    });
                    const {json} = await parseJSON(r);
                    if (r.ok && json?.ok === true) {
                        window.goxionCurrentClientKey = String(json?.cliente?.clave || "");
                        await migrarProgresoLocalSiExiste(json);
                        await cargarExtrasPrivados(json,token);
                        return await aplicarInventarioPublico(goxionViewModelAdapter(json));
                    }
                    if (r.status === 401) {
                        localStorage.removeItem(TOKEN_KEY);
                        window.goxionCurrentClientKey = "";
                    }
                } catch (e) {
                    console.error("Mi Espacio:", e);
                }
            }

            window.goxionCurrentClientKey = "";
            const r = await fetch(MI_URL, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({modo:"publico"})
            });
            const {text,json} = await parseJSON(r);
            if (!r.ok || json?.ok !== true) throw new Error(json?.error || text || "No fue posible cargar el catálogo.");
            return await aplicarInventarioPublico(goxionViewModelAdapter(json));
        }

        cargarDatosYVerificarSesion = async function() {
            try {
                globalClientesData = await cargarPublicoOCliente();
                cargarCatalogo(globalClientesData);
                renderizarSoporteDinamico(globalClientesData);

                const savedKey = getCurrentClientKey();
                if (savedKey && globalClientesData[savedKey]) {
                    // Sesión válida: reconstruimos y reactivamos Mi Espacio.
                    renderDashboard(savedKey);
                    switchTab("inicio");
                } else {
                    // Token inexistente/expirado: volvemos limpiamente a la vista pública.
                    const headerText = document.getElementById("header-btn-text");
                    const tabIcon = document.getElementById("tab-inicio-icon");
                    const tabText = document.getElementById("tab-inicio-text");
                    const guestCard = document.getElementById("guest-action-card");

                    if (headerText) headerText.innerText = "Mi Espacio";
                    if (tabIcon) tabIcon.innerText = "🏠";
                    if (tabText) tabText.innerText = "Inicio";
                    if (guestCard) guestCard.style.display = "block";

                    switchTab("inicio");
                }
            } catch (e) {
                console.error("Error cargando GOXION", e);
                const dynamicAlert = document.getElementById("dynamic-alert");
                const alertContent = document.getElementById("alert-content");
                if (dynamicAlert && alertContent) {
                    alertContent.innerHTML = "<strong>No fue posible sincronizar con GOXION.</strong><br>Intenta recargar la página.";
                    dynamicAlert.style.display = "flex";
                }
            }
        };

        iniciarSesion = async function() {
            const inputId = document.getElementById("login-id").value.trim();
            const inputPin = document.getElementById("login-pin").value.trim();
            const errorMsg = document.getElementById("login-error");
            const loginBtn = document.getElementById("btn-login-submit");

            const setLoginState = (state, text) => {
                if (!loginBtn) return;
                loginBtn.classList.remove("gx-validating", "gx-success", "gx-error");
                if (state) loginBtn.classList.add(state);
                loginBtn.innerHTML = text;
            };

            if (!inputId || !inputPin) {
                setLoginState("gx-error", "✕ Datos incompletos");
                errorMsg.innerText = "Por favor ingresa tu Nombre y PIN de acceso.";
                errorMsg.style.display = "block";
                setTimeout(() => setLoginState("", "Validar acceso"), 1050);
                return;
            }

            setLoginState("gx-validating", "Validando información…");
            loginBtn.disabled = true;
            errorMsg.style.display = "none";

            try {
                const lr = await fetch(LOGIN_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({nombre:inputId, pin:inputPin})
                });
                const {text:lt,json:login} = await parseJSON(lr);

                if (!lr.ok || login?.ok !== true || !login?.session_token) {
                    throw new Error(login?.error || lt || "Datos incorrectos.");
                }

                localStorage.setItem(TOKEN_KEY, login.session_token);
                window.goxionCurrentClientKey = login.cliente.clave;
                actualizarBloqueoSoporte();

                const dr = await fetch(MI_URL, {
                    method:"POST",
                    headers:{"Content-Type":"application/json","X-Client-Token":login.session_token},
                    body:"{}"
                });
                const {text:dt,json:data} = await parseJSON(dr);
                if (!dr.ok || data?.ok !== true) throw new Error(data?.error || dt || "No fue posible abrir Mi Espacio.");

                window.goxionCurrentClientKey = String(login.cliente.clave || data?.cliente?.clave || "");
                await migrarProgresoLocalSiExiste(data);
                await cargarExtrasPrivados(data,login.session_token);
                globalClientesData = await aplicarInventarioPublico(goxionViewModelAdapter(data));
                cargarCatalogo(globalClientesData);
                renderizarSoporteDinamico(globalClientesData);

                errorMsg.style.display = "none";
                setLoginState("gx-success", "✓ Validación exitosa");

                const guestCard = document.getElementById("guest-action-card");
                if (guestCard) guestCard.style.display = "none";

                renderDashboard(login.cliente.clave);
                notificarAdmin("logins", "🟢 Nuevo Inicio de Sesión", `El cliente **${login.cliente.nombre}** acaba de entrar a su app.`, "2ea043");

                setTimeout(() => {
                    closeAuthSheet();
                    switchTab("inicio");
                    loginBtn.disabled = false;
                    setTimeout(() => setLoginState("", "Validar acceso"), 220);
                }, 470);

            } catch (e) {
                console.error(e);
                setLoginState("gx-error", "✕ Datos incorrectos");
                errorMsg.innerText = e?.message || "Datos incorrectos. Verifica tu Nombre y Código.";
                errorMsg.style.display = "block";
                loginBtn.disabled = false;

                setTimeout(() => {
                    setLoginState("", "Validar acceso");
                }, 1300);
            }
        };

        cerrarSesion = function() {
            localStorage.removeItem(TOKEN_KEY);
            window.goxionCurrentClientKey = "";
            actualizarBloqueoSoporte();
            resetSesionVisual();
        };

        notificarAdmin = function(categoria, titulo, mensaje, colorHex = "00f2fe") {
            const headers = {"Content-Type":"application/json"};
            const token = localStorage.getItem(TOKEN_KEY) || "";

            if (categoria !== "pedidos" && token) {
                headers["X-Client-Token"] = token;
            }

            fetch(NOTIFY_URL, {
                method:"POST",
                headers,
                body:JSON.stringify({
                    categoria,
                    titulo,
                    mensaje,
                    colorHex,
                    session_token: token
                })
            }).catch(e => console.warn("Notificación no enviada", e));
        };

    })();
    