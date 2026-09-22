    (() => {
        const GXCORE = window.GOXION_CORE;
        const SB = GXCORE.SUPABASE_ORIGIN;
        const ACCIONES = GXCORE.endpoint("admin-acciones");
        const PERIODOS = GXCORE.endpoint("periodo-cobro");
        const TRATO_JUSTO = GXCORE.endpoint("trato-justo");
        const TOKEN_KEY = GXCORE.STORAGE.ADMIN_TOKEN;

        async function accion(accion, datos = {}) {
            const token = localStorage.getItem(TOKEN_KEY) || currentToken || "";
            if (!token) throw new Error("Sesión administrativa no disponible.");

            const r = await fetch(ACCIONES, {
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

        async function accionPeriodo(accionNombre, datos = {}) {
            const token = localStorage.getItem(TOKEN_KEY) || currentToken || "";
            if (!token) throw new Error("Sesión administrativa no disponible.");

            const r = await fetch(PERIODOS, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Token": token
                },
                body: JSON.stringify({ accion: accionNombre, datos })
            });

            const text = await r.text();
            let body = {};
            try { body = text ? JSON.parse(text) : {}; } catch {}

            if (!r.ok || body?.ok !== true) {
                throw new Error(body?.error || `HTTP ${r.status}: ${text || "Respuesta vacía"}`);
            }
            return body;
        }

        async function accionTratoJusto(accionNombre, datos = {}) {
            const token = localStorage.getItem(TOKEN_KEY) || currentToken || "";
            if (!token) throw new Error("Sesión administrativa no disponible.");
            const r = await fetch(TRATO_JUSTO, {
                method: "POST",
                headers: {"Content-Type":"application/json","X-Admin-Token":token},
                body: JSON.stringify({accion:accionNombre,datos})
            });
            const text = await r.text();
            let body = {};
            try { body = text ? JSON.parse(text) : {}; } catch {}
            if (!r.ok || body?.ok !== true) throw new Error(body?.error || `HTTP ${r.status}: ${text || "Respuesta vacía"}`);
            return body;
        }

        window.gxPeriodAction = accionPeriodo;
        window.gxTratoJustoAction = accionTratoJusto;
        window.gxCoreAdminAction = accion;

        function cli(key) { return clientesDict[key]; }
        function num(v, d=0) {
            const x = Number(v);
            return Number.isFinite(x) ? x : d;
        }

        function errorUI(titulo, e) {
            console.error(titulo, e);
            alert(`❌ ${titulo}\n\n${e?.message || e}`);
        }

        async function recargar(abrirKey = null) {
            if (typeof inicializarPanel !== "function") return;

            // El Centro de Operaciones mueve físicamente los detalles del cliente
            // al panel de enfoque. Si recargamos datos sin cerrar ese panel, queda
            // visible el nodo antiguo aunque Supabase ya haya guardado el cambio.
            // Cerramos primero y luego reabrimos la ficha recién renderizada.
            const focusVisible = document.getElementById("gx-client-focus")?.classList.contains("show");
            if (focusVisible && typeof gxCloseClientFocus === "function") {
                gxCloseClientFocus();
            }

            await inicializarPanel();

            if (abrirKey) {
                setTimeout(() => {
                    if (typeof gxOpenClientFocus === "function") {
                        gxOpenClientFocus(abrirKey);
                        return;
                    }
                    // Respaldo para la interfaz anterior.
                    const d = document.getElementById(`details-${abrirKey}`);
                    const t = document.getElementById(`toggle-text-${abrirKey}`);
                    if (d) d.style.display = "block";
                    if (t) t.innerHTML = "Ocultar detalles ▴";
                }, 110);
            }
        }

        window.gxReloadAdminClient = recargar;

        // ---------- LEALTAD: GUARDA AL TOCAR + / - ----------
        updatePagos = async function(key, delta) {
            const c = cli(key);
            if (!c?._id) return alert("❌ Cliente sin ID de Supabase.");
            try {
                const r = await accion("ajustar_lealtad", {
                    cliente_id: c._id,
                    delta
                });
                c.pagos_puntuales = num(r.pagos_puntuales, Math.max(0, num(c.pagos_puntuales) + delta));
                const el = document.getElementById(`pagos-${key}`);
                if (el) el.innerText = c.pagos_puntuales;
                await recargar(key);
            } catch (e) { errorUI("No se pudo guardar la lealtad.", e); }
        };

        reiniciarLealtad = async function(key) {
            if (!confirm("¿Reiniciar la racha de pagos puntuales a 0?")) return;
            const c = cli(key);
            if (!c?._id) return;
            try {
                await accion("reiniciar_lealtad", { cliente_id: c._id });
                c.pagos_puntuales = 0;
                await recargar(key);
            } catch (e) { errorUI("No se pudo reiniciar la lealtad.", e); }
        };

        // ---------- CLIENTE ----------
        updateClientData = async function(key, field, value) {
            const c = cli(key);
            if (!c?._id) return alert("❌ Cliente sin ID de Supabase.");

            try {
                if (field === "codigo") {
                    const pin = String(value || "").trim();
                    if (!pin) return;
                    await accion("cambiar_pin", { cliente_id: c._id, pin });
                    c.codigo = "";
                    alert("✅ PIN actualizado.");
                    return;
                }

                let v = value;
                if (field === "dia_pago") v = parseInt(value) || 15;

                if (field === "periodo_pendiente") {
                    const mes = String(value || "").trim();
                    if (!/^\d{4}-\d{2}$/.test(mes)) return alert("❌ Selecciona un periodo válido.");
                    const periodo = `${mes}-01`;
                    const r = await accionPeriodo("guardar_periodo", {
                        cliente_id: c._id,
                        periodo_pendiente: periodo
                    });
                    c.periodo_pendiente = r.periodo_pendiente || periodo;
                    await recargar(key);
                    alert("✅ Periodo de cobro actualizado.");
                    return;
                }

                // usuario_acceso se mantiene visualmente; el backend principal
                // se ampliará para persistirlo. Evitamos mentir con un guardado falso.
                if (field === "usuario_acceso") {
                    c.usuario_acceso = String(v || "");
                    alert("ℹ️ Usuario/Correo actualizado en pantalla. Este campo se activará en persistencia al cerrar la compatibilidad del backend.");
                    return;
                }

                await accion("editar_cliente", {
                    cliente_id: c._id,
                    [field]: v
                });

                c[field] = v;
                calcularInventarioYFinanzas();
                if(field === 'dia_pago' || field === 'estado') await recargar(key);
                else filtrarClientes();
            } catch (e) { errorUI("No se pudo actualizar el cliente.", e); }
        };

        agregarNuevoCliente = async function() {
            const nombre = prompt("Nombre del nuevo cliente:");
            if (!nombre) return;

            const folioNum = Object.keys(clientesDict).length + 1;
            const folio = prompt("Folio:", "GX-2026-" + String(folioNum).padStart(4, "0"));
            if (!folio) return;

            const pin = prompt("PIN inicial de 4 dígitos:", "1234");
            if (!pin) return;

            try {
                await accion("crear_cliente", {
                    nombre: nombre.trim(),
                    folio: folio.trim(),
                    pin: pin.trim(),
                    dia_pago: 15,
                    estado: "pendiente"
                });
                await recargar();
                alert("✅ Cliente creado en Supabase.");
            } catch (e) { errorUI("No se pudo crear el cliente.", e); }
        };

        // ---------- SERVICIOS CLIENTE ----------
        addClientService = async function(key) {
            const c = cli(key);
            if (!c?._id) return;

            const sel = document.getElementById(`add-srv-sel-${key}`);
            if (!sel?.value) return;
            const [nombre, precio] = sel.value.split("|");
            const cat = configGlobal.serviciosGlobales.find(s => s.nombre === nombre);

            // Evita enviar dos veces el mismo servicio cuando la ficha visible
            // todavía corresponde a un render anterior.
            const yaExiste = (c.servicios || []).some(s =>
                String(s?.nombre || "").trim().toLowerCase() === String(nombre || "").trim().toLowerCase()
            );
            if (yaExiste) {
                await recargar(key);
                return alert(`ℹ️ ${nombre} ya está asignado a este cliente. La ficha se actualizó con los datos de Supabase.`);
            }

            try {
                await accion("agregar_servicio_cliente", {
                    cliente_id: c._id,
                    servicio_id: cat?.id || cat?._id || null,
                    nombre,
                    monto: num(precio),
                    correo_login: "",
                    perfil_nombre: "",
                    perfil_pin: ""
                });
                await recargar(key);
            } catch (e) {
                // Si el backend rechaza por duplicado, refrescamos para mostrar
                // lo que ya existe realmente en Supabase en vez de dejar la ficha vieja.
                const msg = String(e?.message || e || "");
                if (/duplicate|duplicad|unique|uq_cliente_servicio_nombre/i.test(msg)) {
                    await recargar(key);
                    return alert(`ℹ️ ${nombre} ya estaba asignado. Actualicé la ficha con los datos reales.`);
                }
                errorUI("No se pudo agregar el servicio.", e);
            }
        };

        removeClientService = async function(key, serviceIndex) {
            const c = cli(key);
            const s = c?.servicios?.[serviceIndex];
            if (!s) return;
            if (!confirm(`¿Quitar "${s.nombre}" de este cliente?`)) return;

            const serviceId = s.id || s._id;
            if (!serviceId) return alert("❌ Este servicio no tiene ID de Supabase. Recarga el Admin antes de eliminarlo.");

            try {
                await accion("quitar_servicio_cliente", { id: serviceId });
                await recargar(key);
            } catch (e) {
                // No ocultamos el error; primero re-sincronizamos la ficha para
                // evitar que un nodo viejo haga parecer que el servicio sigue ahí.
                try { await recargar(key); } catch {}
                errorUI("No se pudo quitar el servicio.", e);
            }
        };

        updateServiceCreds = async function(key, serviceIndex, field, value) {
            const c = cli(key);
            const s = c?.servicios?.[serviceIndex];
            if (!s) return;

            try {
                await accion("editar_servicio_cliente", {
                    id: s.id || s._id,
                    [field]: String(value || "").trim()
                });
                s[field] = String(value || "").trim();
            } catch (e) { errorUI("No se pudieron guardar las credenciales.", e); }
        };

        // ---------- PAGO ----------
        aprobarPago = async function(key, monto) {
            const c = cli(key);
            if (!c?._id) return;
            const periodoVisible = String(c.periodo_pendiente || "").slice(0,7);
            if (!confirm(`¿Confirmas que verificaste el comprobante?\n\nEste pago se aplicará al periodo: ${periodoVisible || "actual"}.`)) return;

            try {
                const timing = typeof gxPaymentTiming === "function" ? gxPaymentTiming({...c,estado:"pendiente",pago_en_revision:false}) : {type:"none"};
                const puntual = timing.type !== "overdue";
                const alreadyPaid = typeof gxPeriodAlreadyPaid === "function" ? gxPeriodAlreadyPaid(c) : false;
                const r = await accionPeriodo("aprobar_pago_periodo", {
                    cliente_id: c._id,
                    monto: num(monto),
                    notas: "Aprobado desde Admin",
                    puntual
                });
                if (!puntual && !alreadyPaid) await accion("reiniciar_lealtad", { cliente_id: c._id });
                await recargar(key);
                alert(`✅ Pago aplicado a ${r.periodo_pagado || "el periodo pendiente"}.\n\nSiguiente periodo: ${String(r.periodo_pendiente || "").slice(0,7)}.`);
            } catch (e) { errorUI("No se pudo aprobar el pago.", e); }
        };

        // ---------- REFERIDOS ----------
        toggleReferido = async function(key, checked) {
            const c = cli(key);
            if (!c?._id) return;
            try {
                if (checked) {
                    await accion("guardar_referido", {
                        cliente_id: c._id,
                        nombre: c.referido_activo?.nombre || "",
                        plataformas: num(c.referido_activo?.plataformas, 2),
                        meses: num(c.referido_activo?.meses, 1),
                        activo: true
                    });
                } else {
                    await accion("desactivar_referido", { cliente_id: c._id });
                }
                await recargar(key);
            } catch (e) { errorUI("No se pudo actualizar el referido.", e); }
        };

        updateReferido = async function(key, field, value) {
            const c = cli(key);
            if (!c?._id) return;
            const r = c.referido_activo || { nombre:"", plataformas:2, meses:1 };
            if (field === "nombre") r.nombre = value;
            else r[field] = parseInt(value) || 1;
            c.referido_activo = r;

            try {
                await accion("guardar_referido", {
                    cliente_id: c._id,
                    nombre: r.nombre || "",
                    plataformas: num(r.plataformas, 2),
                    meses: num(r.meses, 1),
                    activo: true
                });
            } catch (e) { errorUI("No se pudo guardar el referido.", e); }
        };

        // ---------- GAMIFICACIÓN ----------
        toggleMisiones = async function(key, checked) {
            const c = cli(key);
            if (!c?._id) return;
            const g = c.gamificacion || { misiones_activas:false, descuento:5, tareas:"" };
            g.misiones_activas = checked;
            c.gamificacion = g;

            try {
                await accion("guardar_gamificacion", {
                    cliente_id: c._id,
                    misiones_activas: checked,
                    descuento: num(g.descuento, 5),
                    tareas: g.tareas || ""
                });
                filtrarClientes();
            } catch (e) { errorUI("No se pudo guardar la gamificación.", e); }
        };

        updateMisiones = async function(key, field, value) {
            const c = cli(key);
            if (!c?._id) return;
            const g = c.gamificacion || { misiones_activas:true, descuento:5, tareas:"" };
            g[field] = field === "descuento" ? num(value) : value;
            c.gamificacion = g;
            try {
                await accion("guardar_gamificacion", {
                    cliente_id: c._id,
                    misiones_activas: g.misiones_activas === true,
                    descuento: num(g.descuento, 5),
                    tareas: g.tareas || ""
                });
            } catch (e) { errorUI("No se pudieron guardar las misiones.", e); }
        };

        aplicarMisionesMasivas = async function(modo) {
            const tareas = document.getElementById("global-misiones-tareas").value;
            const descuento = num(document.getElementById("global-misiones-desc").value);
            if (!tareas) return alert("Debes escribir al menos una tarea.");

            let ids = [];
            if (modo === "todos") {
                if (!confirm("¿Aplicar estas misiones a TODOS los clientes?")) return;
                ids = Object.values(clientesDict).map(c => c._id).filter(Boolean);
            } else {
                const checks = [...document.querySelectorAll(".chk-modal-cliente:checked")];
                if (!checks.length) return alert("No has seleccionado clientes.");
                ids = checks.map(ch => clientesDict[ch.value]?._id).filter(Boolean);
                cerrarModalSeleccion();
            }

            try {
                await accion("misiones_masivas", { clientes: ids, descuento, tareas });
                await recargar();
                alert(`✅ Misiones guardadas en ${ids.length} cliente(s).`);
            } catch (e) { errorUI("No se pudieron aplicar las misiones masivas.", e); }
        };

        borrarMisionesMasivas = async function() {
            if (!confirm("¿Seguro que quieres BORRAR las misiones de TODOS los clientes?")) return;
            try {
                await accion("borrar_misiones_masivas", {});
                await recargar();
                alert("✅ Misiones desactivadas.");
            } catch (e) { errorUI("No se pudieron borrar las misiones.", e); }
        };

        // ---------- DESCUENTOS / TRATO JUSTO ----------
        agregarDescuentoEspecial = async function(key) {
            const c = cli(key);
            if (!c?._id) return;
            const concepto = prompt("Concepto del descuento:");
            if (!concepto) return;
            const monto = prompt("Cantidad a descontar en $:");
            if (!monto || isNaN(monto)) return;

            try {
                await accion("agregar_descuento", {
                    cliente_id: c._id,
                    descripcion: concepto,
                    monto: num(monto)
                });
                await recargar(key);
            } catch (e) { errorUI("No se pudo agregar el descuento.", e); }
        };

        eliminarDescuentoEspecial = async function(key, index) {
            const c = cli(key);
            const d = index >= 0 ? c?.descuentos_especiales?.[index] : c?.descuento_especial;
            if (!d) return;
            try {
                await accion("eliminar_descuento", { id: d.id || d._id });
                await recargar(key);
            } catch (e) { errorUI("No se pudo eliminar el descuento.", e); }
        };

        aplicarTratoJusto = function(key) {
            const c = cli(key);
            if (!c) return;
            const idx = Math.max(0, (c.servicios || []).findIndex(Boolean));
            gxOpenTratoJusto(key, idx);
        };

        resetearDescuentoFallas = function(key) {
            alert("Trato Justo ahora se administra por servicio y periodo desde el menú ••• de cada servicio.");
        };

        // ---------- CATÁLOGO ----------
        addGlobalService = async function() {
            const nombre = prompt("Nombre del nuevo servicio:");
            if (!nombre) return;
            const precio = prompt("Precio de venta:", "0");
            if (precio === null) return;

            try {
                await accion("crear_servicio_catalogo", {
                    nombre: nombre.trim(),
                    etiqueta: "",
                    beneficios: "",
                    cuentas: 1,
                    precio: num(precio),
                    costo: 0,
                    limite: 5
                });
                await recargar();
            } catch (e) { errorUI("No se pudo crear el servicio.", e); }
        };

        updateGlobalService = async function(index, field, value) {
            const s = configGlobal.serviciosGlobales[index];
            if (!s) return;

            let v = value;
            if (field === "stock_manual") {
                // Campo ya existe en Supabase; persistencia de esta acción
                // se habilitará al ampliar admin-acciones.
                v = String(value).trim() === "" ? null : (parseInt(value) || 0);
                if (v === null) delete s.stock_manual;
                else s.stock_manual = v;
                calcularInventarioYFinanzas();
                renderGlobalServicesUI();
                alert("ℹ️ Stock manual actualizado en pantalla. Falta activar su escritura en admin-acciones.");
                return;
            }

            if (!["nombre","etiqueta","beneficios"].includes(field)) v = num(value);

            try {
                await accion("editar_servicio_catalogo", {
                    id: s.id || s._id,
                    [field]: v
                });
                s[field] = v;
                calcularInventarioYFinanzas();
                renderGlobalServicesUI();
                if (field === "nombre") renderizarClientes(clientesDict);
            } catch (e) { errorUI("No se pudo actualizar el catálogo.", e); }
        };

        removeGlobalService = async function(index) {
            const s = configGlobal.serviciosGlobales[index];
            if (!s) return;
            if (!confirm(`¿Eliminar "${s.nombre}" del catálogo?`)) return;
            try {
                await accion("eliminar_servicio_catalogo", { id: s.id || s._id });
                await recargar();
            } catch (e) { errorUI("No se pudo eliminar el servicio.", e); }
        };

        sincronizarPrecioMasivo = async function(index) {
            const s = configGlobal.serviciosGlobales[index];
            if (!s) return;
            if (!confirm(`¿Aplicar $${s.precio} a TODOS los clientes con "${s.nombre}"?`)) return;
            try {
                const r = await accion("sincronizar_precio", { nombre:s.nombre, precio:num(s.precio) });
                await recargar();
                alert(`✅ Precio sincronizado en ${num(r.actualizados)} registro(s).`);
            } catch (e) { errorUI("No se pudo sincronizar el precio.", e); }
        };

        // ---------- BOTÓN GUARDAR: SOLO CONFIGURACIÓN GLOBAL ----------
        prepararYGuardar = async function() {
            const pc = document.querySelector("header .btn-save");
            const mob = document.getElementById("btn-save-mobile");
            const pcTxt = pc?.innerText || "";
            const mobHtml = mob?.innerHTML || "";

            if (pc) pc.innerText = "Guardando...";
            if (mob) mob.innerHTML = `<i>⏳</i><span>Guardando</span>`;

            try {
                const alerta = {
                    activa: document.getElementById("alert-active").checked,
                    plataforma: document.getElementById("alert-platform").value,
                    falla: document.getElementById("alert-type").value,
                    mensaje: document.getElementById("global-msg").value
                };
                const combo = document.getElementById("combo-active").checked;

                await accion("guardar_alerta", alerta);
                await accion("guardar_configuracion", { combo_upsell: combo });

                configGlobal.alertas = alerta;
                configGlobal.combo_upsell = combo;
                alert("⚡ Configuración global guardada en Supabase.");
            } catch (e) {
                errorUI("No se pudo guardar la configuración global.", e);
            } finally {
                if (pc) pc.innerText = pcTxt;
                if (mob) mob.innerHTML = mobHtml;
            }
        };

    })();
    