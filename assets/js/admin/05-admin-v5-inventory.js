    (() => {
        const INVENTARIO_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/inventario";
        const TOKEN_KEY_INV = "GOXION_ADMIN_TOKEN";
        let inventarioServidor = null;

        async function pedirInventarioServidor() {
            const token = localStorage.getItem(TOKEN_KEY_INV) || currentToken || "";
            if (!token) throw new Error("Sesión administrativa no disponible.");

            const r = await fetch(INVENTARIO_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Token": token
                },
                body: "{}"
            });

            const text = await r.text();
            let body = {};
            try { body = text ? JSON.parse(text) : {}; } catch {}

            if (!r.ok || body?.ok !== true) {
                throw new Error(body?.error || `HTTP ${r.status}: ${text || "Respuesta vacía"}`);
            }

            inventarioServidor = new Map(
                (body.inventario || []).map(x => [String(x.id), x])
            );

            // Mantiene el objeto que ya usa la interfaz original.
            inventarioActivo = {};
            configGlobal.serviciosGlobales.forEach(s => {
                const info = inventarioServidor.get(String(s.id || s._id || ""));
                if (info) {
                    inventarioActivo[s.nombre] = Number(info.asignados || 0);
                    s._inventario_auto = info;
                }
            });

            calcularInventarioYFinanzas();
            renderGlobalServicesUI();

            console.table((body.inventario || []).map(x => ({
                servicio: x.nombre,
                capacidad: x.capacidad,
                asignados: x.asignados,
                disponibles: x.disponibles,
                modo: x.modo,
                sobrecupo: x.sobrecupo
            })));

            return body.inventario || [];
        }

        // Reemplaza únicamente el conteo de inventario; conserva los KPI financieros.
        const calcularAnteriorV5 = calcularInventarioYFinanzas;
        calcularInventarioYFinanzas = function() {
            if (!inventarioServidor) {
                return calcularAnteriorV5();
            }

            let ingresosTotales = 0;
            let costosTotales = 0;

            configGlobal.serviciosGlobales.forEach(s => {
                costosTotales += parseFloat(s.costo || 0) * parseInt(s.cuentas || 1);

                const info = inventarioServidor.get(String(s.id || s._id || ""));
                inventarioActivo[s.nombre] = info ? Number(info.asignados || 0) : 0;
            });

            Object.values(clientesDict).forEach(cliente => {
                if (cliente.estado !== "suspendido" && Array.isArray(cliente.servicios)) {
                    cliente.servicios.forEach(s => {
                        ingresosTotales += parseFloat(s.monto || 0);
                    });
                }
            });

            const gananciaNeta = ingresosTotales - costosTotales;
            document.getElementById("kpi-ingresos").innerText = `$${ingresosTotales.toFixed(2)}`;
            document.getElementById("kpi-costos").innerText = `$${costosTotales.toFixed(2)}`;
            document.getElementById("kpi-ganancias").innerText = `$${gananciaNeta.toFixed(2)}`;
        };

        // Añade al tooltip el origen real del cálculo, sin cambiar el diseño.
        const renderAnteriorV5 = renderGlobalServicesUI;
        renderGlobalServicesUI = function() {
            renderAnteriorV5();

            const rows = document.querySelectorAll("#global-services-container tr");
            rows.forEach((row, index) => {
                const srv = configGlobal.serviciosGlobales[index];
                if (!srv) return;
                const info = inventarioServidor?.get(String(srv.id || srv._id || ""));
                if (!info) return;

                const badge = row.querySelector(".inv-badge");
                if (badge) {
                    const manual = srv.stock_manual !== undefined && srv.stock_manual !== null && srv.stock_manual !== "";
                    const disponibles = manual ? Number(srv.stock_manual) : Number(info.disponibles_auto || 0);
                    badge.innerText = `${manual ? "🛠️ " : ""}${Math.max(0, disponibles)}`;

                    let detalle = `Capacidad: ${info.capacidad} | Asignados: ${info.asignados} | Disponibles: ${Math.max(0, disponibles)}`;
                    if (info.sobrecupo > 0) detalle += ` | ⚠ Sobrecupo: ${info.sobrecupo}`;
                    detalle += manual ? " | Modo: Manual" : " | Modo: Automático Supabase";
                    badge.title = detalle;
                }
            });
        };

        // Cada carga del panel vuelve a consultar contratos reales en Supabase.
        const inicializarAnteriorV5 = inicializarPanel;
        inicializarPanel = async function() {
            await inicializarAnteriorV5();
            try {
                await pedirInventarioServidor();
            } catch (e) {
                console.error("Inventario inteligente:", e);
                // No bloquea el panel: queda el cálculo anterior como respaldo.
            }
        };

        // Tras operaciones que pueden cambiar capacidad/nombre, refresca inventario.
        const updateGlobalAnteriorV5 = updateGlobalService;
        updateGlobalService = async function(index, field, value) {
            await updateGlobalAnteriorV5(index, field, value);

            if (["nombre", "cuentas", "limite", "stock_manual"].includes(field)) {
                try { await pedirInventarioServidor(); }
                catch (e) { console.error("No se pudo refrescar inventario:", e); }
            }
        };

        // Tras agregar/quitar servicios a un cliente, las funciones anteriores recargan
        // el panel y por tanto este inventario también se recalcula automáticamente.

    })();
    