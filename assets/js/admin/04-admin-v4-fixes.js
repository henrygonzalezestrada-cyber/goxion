    (() => {
        const GXCORE = window.GOXION_CORE;
        const AJUSTES_URL = GXCORE.endpoint("admin-ajustes");
        const TOKEN_KEY = GXCORE.STORAGE.ADMIN_TOKEN;

        async function ajusteAdmin(accion, datos = {}) {
            const token = localStorage.getItem(TOKEN_KEY) || currentToken || "";
            if (!token) throw new Error("Sesión administrativa no disponible.");

            const r = await fetch(AJUSTES_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Token": token
                },
                body: JSON.stringify({ accion, datos })
            });

            const text = await r.text();
            let body = {};
            try { body = text ? JSON.parse(text) : {}; } catch {}

            if (!r.ok || body?.ok !== true) {
                throw new Error(body?.error || `HTTP ${r.status}: ${text || "Respuesta vacía"}`);
            }
            return body;
        }

        async function cargarStockManual() {
            try {
                const r = await ajusteAdmin("obtener_stock_manual");
                const mapa = new Map((r.stock || []).map(x => [String(x.id), x.stock_manual]));

                configGlobal.serviciosGlobales.forEach(s => {
                    const id = String(s.id || s._id || "");
                    if (!id || !mapa.has(id)) return;

                    const valor = mapa.get(id);
                    if (valor === null || valor === undefined || valor === "") {
                        delete s.stock_manual;
                    } else {
                        s.stock_manual = Number(valor);
                    }
                });

                calcularInventarioYFinanzas();
                renderGlobalServicesUI();
            } catch (e) {
                console.error("No se pudo cargar stock manual:", e);
            }
        }

        const inicializarAnterior = inicializarPanel;
        inicializarPanel = async function() {
            await inicializarAnterior();
            await cargarStockManual();
        };

        const updateGlobalServiceAnterior = updateGlobalService;
        updateGlobalService = async function(index, field, value) {
            if (field !== "stock_manual") {
                return updateGlobalServiceAnterior(index, field, value);
            }

            const s = configGlobal.serviciosGlobales[index];
            if (!s) return;

            const limpio = String(value ?? "").trim();
            const stockManual = limpio === "" ? null : Math.max(0, parseInt(limpio) || 0);

            try {
                const r = await ajusteAdmin("guardar_stock_manual", {
                    id: s.id || s._id,
                    stock_manual: stockManual
                });

                const guardado = r?.servicio?.stock_manual;
                if (guardado === null || guardado === undefined || guardado === "") {
                    delete s.stock_manual;
                } else {
                    s.stock_manual = Number(guardado);
                }

                calcularInventarioYFinanzas();
                renderGlobalServicesUI();
            } catch (e) {
                console.error(e);
                alert(`❌ No se pudo guardar la disponibilidad manual.\n\n${e?.message || e}`);
            }
        };

        toggleReferido = async function(key, isChecked) {
            const c = clientesDict[key];
            if (!c?._id) return;

            try {
                if (isChecked) {
                    const actual = c.referido_activo || {};
                    await ajusteAdmin("guardar_referido", {
                        cliente_id: c._id,
                        nombre: actual.nombre || "",
                        plataformas: Number(actual.plataformas || 2),
                        meses: Number(actual.meses || 1),
                        activo: true
                    });
                } else {
                    // La desactivación existente ya funciona y permanece en admin-acciones.
                    const token = localStorage.getItem(TOKEN_KEY) || currentToken || "";
                    const r = await fetch(GXCORE.endpoint("admin-acciones"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Admin-Token": token
                        },
                        body: JSON.stringify({
                            accion: "desactivar_referido",
                            datos: { cliente_id: c._id }
                        })
                    });

                    const text = await r.text();
                    let body = {};
                    try { body = text ? JSON.parse(text) : {}; } catch {}
                    if (!r.ok || body?.ok !== true) {
                        throw new Error(body?.error || `HTTP ${r.status}: ${text || "Respuesta vacía"}`);
                    }
                }

                await inicializarPanel();

                setTimeout(() => {
                    const details = document.getElementById(`details-${key}`);
                    const toggle = document.getElementById(`toggle-text-${key}`);
                    if (details) details.style.display = "block";
                    if (toggle) toggle.innerHTML = "Ocultar detalles ▴";
                }, 60);
            } catch (e) {
                console.error(e);
                alert(`❌ No se pudo ${isChecked ? "activar" : "desactivar"} el referido.\n\n${e?.message || e}`);
                filtrarClientes();
            }
        };

        updateReferido = async function(key, field, value) {
            const c = clientesDict[key];
            if (!c?._id) return;

            const actual = c.referido_activo || {
                nombre: "",
                plataformas: 2,
                meses: 1
            };

            if (field === "nombre") actual.nombre = String(value || "");
            else actual[field] = parseInt(value) || 1;

            c.referido_activo = actual;

            try {
                const r = await ajusteAdmin("guardar_referido", {
                    cliente_id: c._id,
                    nombre: actual.nombre || "",
                    plataformas: Number(actual.plataformas || 2),
                    meses: Number(actual.meses || 1),
                    activo: true
                });

                if (r?.referido) {
                    c.referido_activo = {
                        ...actual,
                        ...r.referido
                    };
                }
            } catch (e) {
                console.error(e);
                alert(`❌ No se pudo guardar el referido.\n\n${e?.message || e}`);
            }
        };


        window.reiniciarMisionesCliente = async function(key) {
            const c = clientesDict[key];
            if(!c?._id) {
                alert("No encontré el cliente en memoria.");
                return;
            }

            const nombre = c.nombre || c.folio || "este cliente";

            if(!confirm(`¿Reiniciar el progreso de misiones de ${nombre}?\n\nEl cliente tendrá que completar nuevamente todas las misiones actuales. Si ya reclamó el cupón, ese reclamo NO se reiniciará.`)) {
                return;
            }

            try {
                const result = await ajusteAdmin("reiniciar_misiones_cliente", {
                    cliente_id: c._id
                });

                alert(`✅ Progreso reiniciado.\n\nNueva versión de misiones: ${result.misiones_version}\n\nAl volver a cargar Mi Espacio, el cliente verá todas las misiones pendientes otra vez.`);

                try {
                    await cargarAdminDatos();
                } catch(refreshError) {
                    console.warn("El progreso sí se reinició; solo falló el refresco visual del Admin:", refreshError);
                }
            } catch(e) {
                console.error(e);
                alert(`❌ No se pudo reiniciar el progreso.\n\n${e?.message || e}`);
            }
        };


        window.nuevaRondaCupon = async function(key) {
            const c = clientesDict[key];
            if(!c?._id) {
                alert("No encontré el cliente en memoria.");
                return;
            }

            const nombre = c.nombre || c.folio || "este cliente";

            if(!confirm(`¿Crear una NUEVA RONDA de cupón para ${nombre}?\n\nEsto reiniciará el progreso actual de misiones y permitirá que el cliente gane y reclame OTRO cupón al completarlas. El cupón anterior seguirá registrado.`)) {
                return;
            }

            try {
                const result = await ajusteAdmin("nueva_ronda_cupon", {
                    cliente_id: c._id
                });

                alert(`✅ Nueva ronda creada.\n\nRonda de cupón: ${result.cupon_ciclo}\nVersión de misiones: ${result.misiones_version}\n\nEl cliente podrá completar nuevamente las misiones y reclamar otro cupón.`);

                try {
                    await cargarAdminDatos();
                } catch(refreshError) {
                    console.warn("La nueva ronda sí se creó; solo falló el refresco visual del Admin:", refreshError);
                }
            } catch(e) {
                console.error(e);
                alert(`❌ No se pudo crear la nueva ronda.\n\n${e?.message || e}`);
            }
        };

    })();
    