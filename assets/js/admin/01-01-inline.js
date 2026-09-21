let currentToken = "";
    // Contratos globales implementados por las capas Supabase actuales.
    var toggleClientDetails, pedirToken, cerrarSesion, inicializarPanel, agregarNuevoCliente, updateGlobalService, addGlobalService, removeGlobalService, sincronizarPrecioMasivo, toggleReferido, updateReferido, toggleMisiones, updateMisiones, aplicarMisionesMasivas, borrarMisionesMasivas, aplicarTratoJusto, resetearDescuentoFallas, agregarDescuentoEspecial, eliminarDescuentoEspecial, aprobarPago, updateClientData, updateServiceCreds, reiniciarLealtad, addClientService, removeClientService, updatePagos, prepararYGuardar;

let clientesDict = {}; 
    let configGlobal = { alertas: {}, serviciosGlobales: [], combo_upsell: true };
    let inventarioActivo = {};
    let currentStatusFilter = 'all'; 

    function gxBillingState(cliente) {
        const central = String(cliente?.estado_cuenta?.estado || '').toLowerCase();
        if (central) return central;
        if (cliente?.pago_en_revision === true) return 'revision';
        if (cliente?.estado === 'suspendido') return 'suspendido';
        return cliente?.estado === 'pagado' ? 'pagado' : 'pendiente';
    }

    function gxBillingBucket(cliente) {
        if (cliente?.estado === 'suspendido') return 'suspendido';
        const state = gxBillingState(cliente);
        if (state === 'revision') return 'revision';
        if (state === 'pagado') return 'pagado';
        return 'pendiente';
    }

    const DEFAULT_SERVICES = [
        {nombre: "Netflix Premium", cuentas: 1, precio: 109, costo: 369, limite: 4, beneficios: "Resolución 4K Ultra HD, Audio Espacial"},
        {nombre: "Disney+ Premium", cuentas: 2, precio: 89, costo: 340, limite: 10, beneficios: "Descargas Offline, Calidad 4K"},
        {nombre: "Max Standard", cuentas: 2, precio: 79, costo: 358, limite: 8, beneficios: "HBO, Warner Bros y DC Comics"},
        {nombre: "Prime Video", cuentas: 1, precio: 39, costo: 7, limite: 5, beneficios: "4K y envíos gratuitos"},
        {nombre: "YouTube Premium", cuentas: 2, precio: 89, costo: 242, limite: 10, beneficios: "Cero Anuncios + YT Music"},
        {nombre: "Vix Premium", cuentas: 1, precio: 49, costo: 74.5, limite: 4, beneficios: "Liga MX y Novelas"},
        {nombre: "Crunchyroll", cuentas: 1, precio: 45, costo: 39, limite: 5, beneficios: "Anime sin anuncios"},
        {nombre: "Microsoft 365", cuentas: 1, precio: 79, costo: 119, limite: 5, beneficios: "1TB OneDrive + Office"},
        {nombre: "Google One 2TB", cuentas: 1, precio: 29, costo: 77, limite: 5, beneficios: "Almacenamiento expandido"}
    ];

    document.addEventListener("DOMContentLoaded", () => {
        if (!currentToken) pedirToken();
        else inicializarPanel();
    });

    function switchTab(tabId, btn) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.bottom-btn:not(.main-action)').forEach(b => b.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        if(btn) btn.classList.add('active');
        window.scrollTo({top:0, behavior:'smooth'});
    }

    function setStatusFilter(status, btnElement) {
        currentStatusFilter = status;
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
        filtrarClientes();
    }




    

    function calcularInventarioYFinanzas() {
        inventarioActivo = {};
        let ingresosTotales = 0;
        let costosTotales = 0;

        configGlobal.serviciosGlobales.forEach(s => { 
            inventarioActivo[s.nombre] = 0; 
            costosTotales += parseFloat(s.costo || 0) * parseInt(s.cuentas || 1);
        });

        Object.values(clientesDict).forEach(cliente => {
            if (cliente.estado !== 'suspendido' && cliente.servicios) {
                cliente.servicios.forEach(s => {
                    ingresosTotales += parseFloat(s.monto || 0);
                    
                    let nombreCliente = s.nombre.toLowerCase();
                    let multiplier = 1; 
                    let matchQuant = nombreCliente.match(/\(x(\d+)\)/);
                    if (matchQuant) multiplier = parseInt(matchQuant[1]);
                    
                    configGlobal.serviciosGlobales.forEach(g => {
                        let nombreCatalogo = g.nombre.toLowerCase();
                        let matched = false;
                        
                        if (nombreCatalogo.includes('netflix') && nombreCliente.includes('netflix')) matched = true;
                        else if (nombreCatalogo.includes('disney') && (nombreCliente.includes('disney') || nombreCliente.includes('disney+'))) matched = true;
                        else if ((nombreCatalogo.includes('max') || nombreCatalogo.includes('hbo')) && (nombreCliente.includes('max') || nombreCliente.includes('hbo'))) matched = true;
                        else if (nombreCatalogo.includes('prime') && (nombreCliente.includes('prime') || nombreCliente.includes('amazon'))) matched = true;
                        else if (nombreCatalogo.includes('youtube') && nombreCliente.includes('youtube')) matched = true;
                        else if (nombreCatalogo.includes('vix') && nombreCliente.includes('vix')) matched = true;
                        else if (nombreCatalogo.includes('crunchy') && nombreCliente.includes('crunchy')) matched = true;
                        else if (nombreCatalogo.includes('microsoft') && (nombreCliente.includes('microsoft') || nombreCliente.includes('365'))) matched = true;
                        else if (nombreCatalogo.includes('google') && (nombreCliente.includes('google') || nombreCliente.includes('one'))) matched = true;
                        else {
                            let keyword = g.nombre.replace(/ premium| standard| platino| cuenta completa| 2tb| 365/gi, '').trim().toLowerCase();
                            if (nombreCliente.includes(keyword)) matched = true;
                        }

                        if (matched) {
                            inventarioActivo[g.nombre] += multiplier;
                        }
                    });
                });
            }
        });

        let gananciaNeta = ingresosTotales - costosTotales;
        document.getElementById("kpi-ingresos").innerText = `$${ingresosTotales.toFixed(2)}`;
        document.getElementById("kpi-costos").innerText = `$${costosTotales.toFixed(2)}`;
        document.getElementById("kpi-ganancias").innerText = `$${gananciaNeta.toFixed(2)}`;
    }

    function renderGlobalServicesUI() {
        const container = document.getElementById("global-services-container");
        const alertSelect = document.getElementById("alert-platform");
        
        container.innerHTML = "";
        alertSelect.innerHTML = `<option value="Todos los servicios">Todos los servicios</option>`;

        configGlobal.serviciosGlobales.forEach((srv, index) => {
            let vendidos = inventarioActivo[srv.nombre] || 0;
            let cuentasMultiplicador = parseInt(srv.cuentas || 1);
            let limiteIndividual = parseInt(srv.limite || 0);
            
            let capacidadTotal = cuentasMultiplicador * limiteIndividual;
            
            let disponibles = 0;
            let esManual = false;
            if (srv.stock_manual !== undefined && srv.stock_manual !== null && srv.stock_manual !== "") {
                disponibles = parseInt(srv.stock_manual);
                esManual = true;
            } else {
                disponibles = capacidadTotal - vendidos;
            }
            
            let badgeClass = "inv-ok";
            if (disponibles <= 1) badgeClass = "inv-warn";
            if (disponibles <= 0) badgeClass = "inv-full";
            
            let manualIndicator = esManual ? '🛠️ ' : '';

            container.innerHTML += `
                <tr>
                    <td><input type="text" value="${srv.nombre}" onchange="updateGlobalService(${index}, 'nombre', this.value)"></td>
                    <td><input type="text" placeholder="Ej: Promo" value="${srv.etiqueta || ''}" onchange="updateGlobalService(${index}, 'etiqueta', this.value)"></td>
                    <td><input type="text" style="min-width:140px;" placeholder="Ej: 4K, 1 Perfil..." value="${srv.beneficios || ''}" onchange="updateGlobalService(${index}, 'beneficios', this.value)"></td>
                    <td><input type="number" style="color:var(--neon-green);" value="${cuentasMultiplicador}" onchange="updateGlobalService(${index}, 'cuentas', this.value)" title="Cuentas Madres Activas"></td>
                    <td><input type="number" value="${srv.precio}" onchange="updateGlobalService(${index}, 'precio', this.value)"></td>
                    <td><input type="number" style="color:var(--neon-red);" value="${srv.costo || 0}" onchange="updateGlobalService(${index}, 'costo', this.value)"></td>
                    <td><input type="number" style="color:#fff;" value="${limiteIndividual}" onchange="updateGlobalService(${index}, 'limite', this.value)"></td>
                    <td><input type="number" placeholder="Auto" style="color:var(--neon-yellow);" value="${esManual ? srv.stock_manual : ''}" onchange="updateGlobalService(${index}, 'stock_manual', this.value)" title="Fijar disponibilidad (vacío = Automático)"></td>
                    <td><span class="inv-badge ${badgeClass}" title="${esManual ? 'Stock Forzado Manualmente' : 'Stock Calculado Automáticamente'}">${manualIndicator}${disponibles}</span></td>
                    <td style="display:flex; gap:8px; align-items:center; justify-content: center; padding-top:10px;">
                        <button class="btn-icon info" onclick="sincronizarPrecioMasivo(${index})" title="Empujar precio a clientes">📡</button>
                        <button class="btn-icon danger" onclick="removeGlobalService(${index})" title="Eliminar">✖</button>
                    </td>
                </tr>
            `;
            let selected = (configGlobal.alertas?.plataforma === srv.nombre) ? "selected" : "";
            alertSelect.innerHTML += `<option value="${srv.nombre}" ${selected}>${srv.nombre}</option>`;
        });
    }





    function toggleAlertFields() {
        const isActive = document.getElementById("alert-active").checked;
        const settingsDiv = document.getElementById("alert-settings");
        settingsDiv.style.opacity = isActive ? "1" : "0.5";
        settingsDiv.style.pointerEvents = isActive ? "auto" : "none";
    }
    
    function toggleComboUpsell() {
        configGlobal.combo_upsell = document.getElementById("combo-active").checked;
    }

    function filtrarClientes() {
        const query = document.getElementById("search-input").value.toLowerCase();
        const statusFilter = currentStatusFilter; 
        const sortBy = document.getElementById("sort-by").value;

        let filtradosArr = Object.keys(clientesDict).map(key => ({ key, ...clientesDict[key] }));

        filtradosArr = filtradosArr.filter(c => {
            const matchText = c.nombre.toLowerCase().includes(query) || c.folio.toLowerCase().includes(query);
            const matchStatus = statusFilter === 'all' 
                ? true 
                : gxBillingBucket(c) === statusFilter;
            return matchText && matchStatus;
        });

        if (sortBy === 'priority') {
            const priority = c => {
                if (c.pago_en_revision === true) return [0, 0];
                const t = typeof gxPaymentTiming === 'function' ? gxPaymentTiming(c) : {type:'none',days:999};
                if (t.type === 'overdue') return [1, -Number(t.days || 0)];
                if (t.type === 'upcoming' && Number(t.days || 0) === 0) return [2, 0];
                if (t.type === 'upcoming') return [3, Number(t.days || 0)];
                if (c.estado === 'pendiente') return [4, Number(c.dia_pago || 15)];
                if (c.estado === 'suspendido') return [5, Number(c.dia_pago || 15)];
                return [6, Number(c.dia_pago || 15)];
            };
            filtradosArr.sort((a,b)=>{
                const pa=priority(a), pb=priority(b);
                return pa[0]-pb[0] || pa[1]-pb[1] || String(a.nombre||'').localeCompare(String(b.nombre||''),'es');
            });
        } else if (sortBy === 'name') {
            filtradosArr.sort((a, b) => a.nombre.localeCompare(b.nombre));
        } else if (sortBy === 'date') {
            filtradosArr.sort((a, b) => (a.dia_pago || 15) - (b.dia_pago || 15));
        } else if (sortBy === 'loyalty') {
            filtradosArr.sort((a, b) => (b.pagos_puntuales || 0) - (a.pagos_puntuales || 0));
        }

        const filtradosDict = {};
        filtradosArr.forEach(c => {
            const { key, ...rest } = c;
            filtradosDict[key] = rest;
        });
        
        renderizarClientes(filtradosDict);
    }

    function esServicioPorInvitacion(nombreServicio) {
        const plataformasInvitacion = ['youtube', 'microsoft', 'google', 'apple', 'spotify', 'one 2tb', '365'];
        const nombreMin = nombreServicio.toLowerCase();
        return plataformasInvitacion.some(plat => nombreMin.includes(plat));
    }



    



    function abrirModalSeleccionClientes() {
        const modal = document.getElementById('modal-seleccionar-clientes');
        const lista = document.getElementById('lista-clientes-modal');
        lista.innerHTML = '';
        
        let sortedKeys = Object.keys(clientesDict).sort((a,b) => clientesDict[a].nombre.localeCompare(clientesDict[b].nombre));
        
        sortedKeys.forEach(key => {
            const c = clientesDict[key];
            lista.innerHTML += `
                <label class="modal-cliente-item" style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; cursor:pointer; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s;">
                    <input type="checkbox" value="${key}" class="chk-modal-cliente" style="width:18px; height:18px; accent-color: var(--neon-purple);">
                    <span style="color:#fff; font-size:0.95rem;">${c.nombre} <span style="color:var(--text-muted); font-size:0.8rem;">(${c.folio})</span></span>
                </label>
            `;
        });
        
        modal.style.display = 'flex';
    }

    function cerrarModalSeleccion() {
        document.getElementById('modal-seleccionar-clientes').style.display = 'none';
    }

    function filtrarModalClientes() {
        const q = document.getElementById('search-modal-clientes').value.toLowerCase();
        const items = document.querySelectorAll('.modal-cliente-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(q) ? 'flex' : 'none';
        });
    }





    function renderizarClientes(diccionario) {
        const container = document.getElementById("clients-container");
        container.innerHTML = "";
        const keys = Object.keys(diccionario);

        if (keys.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No se encontraron clientes que coincidan con la búsqueda.</p>`;
            return;
        }

        const globalOptions = configGlobal.serviciosGlobales.map(s => `<option value="${s.nombre}|${s.precio}">${s.nombre} ($${s.precio})</option>`).join("");

        keys.forEach(key => {
            const cliente = diccionario[key];
            let subtotal = 0;
            let clientServicesHTML = "";
            
            if(cliente.servicios && cliente.servicios.length > 0) {
                cliente.servicios.forEach((s, sIdx) => {
                    subtotal += s.monto;
                    const esInvitacion = esServicioPorInvitacion(s.nombre);
                    const lockStatus = esInvitacion ? 'disabled title="No aplica para este servicio"' : '';
                    
                    clientServicesHTML += `
                        <div class="gx-service-compact" data-gx-client-key="${key}" data-gx-service-index="${sIdx}" data-gx-service-name="${String(s.nombre||'').replace(/"/g,'&quot;')}">
                            <div class="gx-service-compact-head">
                                <div class="gx-service-identity">
                                    <strong>${s.nombre}</strong>
                                    <div class="gx-service-state-row">
                                        <span class="gx-service-live-state ${gxAdminServiceHasAlert(s.nombre) ? 'interrupted' : 'active'}" data-gx-service-live-state>
                                            <i></i>${gxAdminServiceHasAlert(s.nombre) ? 'Temporalmente inactivo' : 'Activo'}
                                        </span>
                                        <span class="gx-service-request-state" data-gx-service-request-state style="${gxPendingCancellationForService(cliente,s) ? '' : 'display:none'}">Cancelación solicitada</span>
                                    </div>
                                </div>
                                <strong class="gx-service-price">$${s.monto}</strong>
                                <details class="gx-service-actions-menu">
                                    <summary title="Más acciones">•••</summary>
                                    <div class="gx-service-actions-pop">
                                        <button type="button" onclick="gxToggleServiceIncident('${key}', ${sIdx});this.closest('details').removeAttribute('open')">${gxAdminServiceHasAlert(s.nombre) ? '✓ Resolver incidencia global' : '⚠ Marcar incidencia global'}</button>
                                        <button type="button" onclick="gxOpenTratoJusto('${key}', ${sIdx});this.closest('details').removeAttribute('open')">🛡 Gestionar Trato Justo</button>
                                        <button type="button" class="danger" onclick="removeClientService('${key}', ${sIdx});this.closest('details').removeAttribute('open')">✖ Eliminar servicio</button>
                                    </div>
                                </details>
                            </div>
                            ${(() => {
                                const comp = (cliente.trato_justo_compensaciones || []).find(t => String(t.cliente_servicio_id||"") === String(s._id||s.id||"") && t.activo !== false && String(t.periodo||"").slice(0,7) === String(cliente.periodo_pendiente||"").slice(0,7));
                                return comp ? `<button type="button" class="gx-trato-badge" onclick="gxOpenTratoJusto('${key}', ${sIdx})">🛡 Trato Justo · ${Number(comp.dias_falla||0)} día${Number(comp.dias_falla||0)===1?'':'s'} · -$${Number(comp.monto||0).toFixed(2)}</button>` : '';
                            })()}
                            <details class="gx-service-access-details">
                                <summary><span>🔑 Editar acceso</span><em>Abrir</em></summary>
                                <div class="cred-box gx-service-cred-collapsed gx-smart-access-box">
                                    <div class="gx-access-loading-note">Cargando arquitectura de acceso…</div>
                                </div>
                            </details>
</div>
                    `;
                });
            } else { clientServicesHTML = `<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding: 10px 0;">Sin servicios activos asignados</div>`; }

            const gxEstadoCuenta = cliente.estado_cuenta || null;
            const gxSubtotalReal = gxEstadoCuenta ? Number(gxEstadoCuenta.subtotal || 0) : Number(subtotal || 0);
            const gxCobroActual = gxEstadoCuenta ? Number(gxEstadoCuenta.total_actual || 0) : Number(subtotal || 0);
            const gxDescuentosTotal = gxEstadoCuenta ? Number(gxEstadoCuenta.descuentos?.total || 0) : 0;
            const gxCargosTotal = gxEstadoCuenta ? Number(gxEstadoCuenta.cargos?.total || 0) : 0;
            const gxBillingBreakdown = Array.isArray(gxEstadoCuenta?.desglose) ? gxEstadoCuenta.desglose : [];
            const gxBillingBreakdownHTML = gxBillingBreakdown.length ? `
                <div class="gx-admin-live-breakdown">
                    ${gxBillingBreakdown.map(item => {
                        const value = Number(item?.monto || 0);
                        const cls = value < 0 ? 'discount' : (item?.tipo === 'cargo' ? 'charge' : 'base');
                        const sign = value > 0 && item?.tipo === 'cargo' ? '+' : '';
                        return `<div class="${cls}"><span>${item?.concepto || 'Ajuste'}</span><strong>${sign}$${Math.abs(value).toFixed(2)}${value < 0 ? ' OFF' : ''}</strong></div>`;
                    }).join('')}
                    <div class="total"><span>${gxEstadoCuenta?.total_label || 'Total actual'}</span><strong>$${gxCobroActual.toFixed(2)}</strong></div>
                </div>` : '';

            let descuentosHTML = `
                <div class="gx-benefit-section-head">
                    <div><span>Beneficios y descuentos</span><small>Reglas automáticas por periodo</small></div>
                    <button class="gx-benefit-add" type="button" onclick="gxOpenBenefitModal('${key}')">＋ Programar</button>
                </div>
            `;

            if (Array.isArray(cliente.beneficios_programados) && cliente.beneficios_programados.length) {
                descuentosHTML += `<div class="gx-benefit-list">${cliente.beneficios_programados.map(b => window.gxBenefitCardHTML ? window.gxBenefitCardHTML(b, cliente, '${key}') : '').join('')}</div>`;
            } else {
                descuentosHTML += `<div class="gx-benefit-empty">Sin beneficios programados.</div>`;
            }

            if (cliente.descuento_especial || (cliente.descuentos_especiales && cliente.descuentos_especiales.length)) {
                descuentosHTML += `<div class="gx-benefit-legacy-label">Descuentos anteriores</div>`;
            }

            if (cliente.descuento_especial) {
                descuentosHTML += `
                <div style="background: rgba(0, 242, 254, 0.1); border: 1px solid var(--neon-blue); padding: 6px 10px; border-radius: 6px; margin-top: 6px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--neon-blue); font-weight:bold;">${cliente.descuento_especial.concepto}</div>
                        <div style="font-size:0.85rem; color:#fff;">-$${cliente.descuento_especial.monto}</div>
                    </div>
                    <button class="btn-icon danger" onclick="eliminarDescuentoEspecial('${key}', -1)">✖</button>
                </div>`;
            }
            
            if (cliente.descuentos_especiales && cliente.descuentos_especiales.length > 0) {
                cliente.descuentos_especiales.forEach((desc, idx) => {
                    descuentosHTML += `
                    <div style="background: rgba(0, 242, 254, 0.1); border: 1px solid var(--neon-blue); padding: 6px 10px; border-radius: 6px; margin-top: 6px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:0.75rem; color:var(--neon-blue); font-weight:bold;">${desc.concepto}</div>
                            <div style="font-size:0.85rem; color:#fff;">-$${desc.monto}</div>
                        </div>
                        <button class="btn-icon danger" onclick="eliminarDescuentoEspecial('${key}', ${idx})">✖</button>
                    </div>`;
                });
            }

            if (cliente.descuento_fallas) {
                descuentosHTML += `
                <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(248, 232, 0, 0.5); padding: 6px 10px; border-radius: 6px; margin-top: 6px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--neon-yellow); font-weight:bold;">Garantía Trato Justo</div>
                        <div style="font-size:0.85rem; color:#fff;">-$${cliente.descuento_fallas.toFixed(2)}</div>
                    </div>
                    <button class="btn-icon danger" onclick="resetearDescuentoFallas('${key}')" title="Resetear a 0">✖</button>
                </div>`;
            }

            const gxBillingStateNow = gxBillingState(cliente);
            const gxBillingBucketNow = gxBillingBucket(cliente);
            let enRevision = gxBillingStateNow === 'revision';
            let statusColor = enRevision
                ? 'var(--neon-yellow)'
                : gxBillingBucketNow === 'pagado'
                    ? 'var(--neon-green)'
                    : (gxBillingStateNow === 'vencido' || gxBillingBucketNow === 'suspendido')
                        ? 'var(--neon-red)'
                        : 'var(--neon-blue)';
            let statusBadge = enRevision
                ? '💳 REVISAR PAGO'
                : gxBillingBucketNow === 'pagado'
                    ? 'PAGADO'
                    : gxBillingBucketNow === 'suspendido'
                        ? 'SUSPENDIDO'
                        : gxBillingStateNow === 'vencido'
                            ? 'VENCIDO'
                            : gxBillingStateNow === 'incompleto'
                                ? 'PAGO INCOMPLETO'
                                : gxBillingStateNow === 'vence_hoy'
                                    ? 'VENCE HOY'
                                    : 'PENDIENTE';
            let pulseAnim = enRevision ? 'animation: pulse 1.5s infinite;' : '';

            let refActivo = cliente.referido_activo;
            let refServiceOptions = (configGlobal?.serviciosGlobales || []).map(s => s.nombre).filter(Boolean);
            let refSelectedServices = Array.isArray(refActivo?.servicios) ? refActivo.servicios : [];
            let refStart = refActivo?.fecha_inicio || new Date().toISOString().slice(0,10);
            let refSmartMonths = gxReferralSmartMonths(refActivo);
            let refCandidates = Object.entries(clientesDict || {})
                .filter(([candidateKey]) => candidateKey !== key)
                .sort((a,b) => String(a[1]?.nombre || "").localeCompare(String(b[1]?.nombre || ""), "es"));
            let refSelectedKey = refActivo
                ? (refCandidates.find(([,candidate]) => String(candidate?.nombre || "").trim().toLowerCase() === String(refActivo?.nombre || "").trim().toLowerCase())?.[0] || "")
                : "";
            let refLinkedClient = refSelectedKey ? clientesDict[refSelectedKey] : null;
            let refLinkedServices = refLinkedClient
                ? [...new Set((refLinkedClient.servicios || []).filter(s => s?.activo !== false).map(s => s?.nombre).filter(Boolean))]
                : refSelectedServices;
            let refHTML = `
                <div class="gx-ref-admin">
                    <div class="gx-ref-admin-head">
                        <div>
                            <strong>🎁 Referido inteligente</strong>
                            <small id="gx-ref-head-${key}">${refActivo ? `${refSmartMonths}/3 meses · ${refLinkedServices.length} servicios` : 'Sin referido activo'}</small>
                        </div>
                        <label class="switch" style="transform:scale(.72);margin:0;"><input type="checkbox" ${refActivo ? 'checked' : ''} onchange="toggleReferido('${key}', this.checked)"><span class="slider"></span></label>
                    </div>
                    ${refActivo ? `
                        <div class="gx-ref-link-select">
                            <span class="gx-field-label">Cliente referido</span>
                            <select id="gx-ref-client-select-${key}" onchange="gxSelectReferralClient('${key}', this.value)">
                                <option value="">Seleccionar cliente registrado…</option>
                                ${refCandidates.map(([candidateKey,candidate]) => `
                                    <option value="${candidateKey}" ${candidateKey === refSelectedKey ? 'selected' : ''}>
                                        ${candidate.nombre || 'Cliente'}${candidate.folio ? ` · ${candidate.folio}` : ''}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        ${refLinkedClient ? `
                            <div class="gx-ref-linked-card" id="gx-ref-linked-${key}">
                                <div>
                                    <strong>${refLinkedClient.nombre || 'Cliente'}</strong>
                                    <small>${refLinkedClient.folio || 'Sin folio'} · ${refLinkedClient.estado || 'pendiente'}</small>
                                </div>
                                <span class="gx-ref-linked-badge">${refLinkedServices.length} servicio${refLinkedServices.length===1?'':'s'}</span>
                            </div>
                        ` : (refActivo.nombre ? `
                            <div class="gx-ref-link-legacy">El referido actual “${refActivo.nombre}” todavía no está vinculado a un cliente del Admin. Selecciona arriba el cliente correcto para detectar sus servicios automáticamente.</div>
                        ` : '')}

                        <div class="gx-ref-progress-row">
                            <label class="gx-field-label gx-ref-date-compact">Inicio
                                <input type="date" value="${refStart}" onchange="gxSaveReferralSmart('${key}', {fecha_inicio:this.value})">
                            </label>
                            <div class="gx-field-label gx-ref-month-control">
                                <span>Progreso</span>
                                <div class="gx-ref-counter">
                                    <button type="button" onclick="gxAdjustReferralMonth('${key}', -1)">−</button>
                                    <strong id="gx-ref-month-${key}">${refSmartMonths}/3</strong>
                                    <button type="button" onclick="gxAdjustReferralMonth('${key}', 1)">＋</button>
                                    <button type="button" class="auto ${refActivo?.meses_override == null ? 'active' : ''}" id="gx-ref-auto-${key}" onclick="gxReferralAutoMode('${key}')">AUTO</button>
                                </div>
                            </div>
                        </div>

                        <div class="gx-ref-auto-services">
                            <div class="gx-ref-auto-services-head">
                                <span>Servicios detectados automáticamente</span>
                                <strong id="gx-ref-service-summary-${key}">${refLinkedServices.length}</strong>
                            </div>
                            <div class="gx-ref-detected-chips" id="gx-ref-service-chips-${key}">
                                ${refLinkedServices.length
                                    ? refLinkedServices.map(name => `<span>✓ ${name}</span>`).join('')
                                    : `<div class="gx-ref-detected-empty">${refSelectedKey ? 'El cliente seleccionado no tiene servicios activos.' : 'Selecciona un cliente para detectar sus servicios activos.'}</div>`}
                            </div>
                            ${refSelectedKey ? `<button type="button" class="gx-ref-resync" onclick="gxResyncReferralClient('${key}')">↻ Volver a detectar servicios</button>` : ''}
                        </div>
                        <div id="gx-ref-status-${key}" class="gx-ref-smart-status ${refLinkedServices.length >= 2 ? 'ok' : 'warn'}">
                            ${refActivo.beneficio_reclamado
                                ? '💝 Beneficio ya reclamado'
                                : (refLinkedServices.length < 2
                                    ? `⚠️ Falta ${2-refLinkedServices.length} servicio${2-refLinkedServices.length === 1 ? '' : 's'} para continuar acumulando meses`
                                    : (refSmartMonths >= 3 ? '🎁 3/3 · Beneficio listo para reclamar' : `✓ Progreso automático: ${refSmartMonths}/3 meses`))}
                        </div>
                        <div class="gx-ref-management-actions">
                            <button type="button" class="reset" onclick="gxResetReferral('${key}')">↻ Reiniciar progreso</button>
                            <button type="button" class="delete" onclick="gxDeleteReferral('${key}')">🗑 Eliminar referido</button>
                        </div>
                        <div class="gx-ref-management-help">Reiniciar conserva el referido y sus servicios, pero vuelve el contador a 0/3 desde hoy. Eliminar borra el registro activo.</div>
                    ` : `<div class="gx-empty-inline">Activa el referido para comenzar el seguimiento automático.</div>`}
                </div>
            `;

            let gamifConfig = cliente.gamificacion || { misiones_activas: false, descuento: 5, tareas: "" };
            
            let gamifHTML = `
                <div class="gx-client-mission-admin">
                    <div class="gx-client-mission-summary">
                        <div class="gx-client-mission-icon">${gamifConfig.misiones_activas ? '🎯' : '○'}</div>
                        <div class="gx-client-mission-copy">
                            <strong>${gamifConfig.misiones_activas ? 'Misiones activas' : 'Sin misiones activas'}</strong>
                            <small>${gamifConfig.misiones_activas
                                ? `${gamifConfig.descuento || 0}% OFF · Ronda ${gamifConfig.cupon_ciclo || 1}${Number(gamifConfig.cupon_reclamado_ciclo || 0) >= Number(gamifConfig.cupon_ciclo || 1) ? ' · Cupón reclamado' : ''}`
                                : 'Actívalas únicamente cuando este cliente necesite una misión individual.'}</small>
                        </div>
                        <label class="switch gx-client-mission-switch"><input type="checkbox" ${gamifConfig.misiones_activas ? 'checked' : ''} onchange="toggleMisiones('${key}', this.checked)"><span class="slider"></span></label>
                    </div>

                    ${gamifConfig.misiones_activas ? `
                    <details class="gx-client-mission-config">
                        <summary>⚙️ Configuración individual</summary>
                        <div class="gx-client-mission-config-body">
                            <label>Descuento del cupón
                                <div class="gx-inline-percent"><input type="number" value="${gamifConfig.descuento || 0}" onchange="updateMisiones('${key}','descuento',this.value)"><span>% OFF</span></div>
                            </label>
                            <label>Misiones asignadas
                                <textarea onchange="updateMisiones('${key}','tareas',this.value)" placeholder="Las misiones masivas se administran mejor desde Ajustes → Misiones.">${gamifConfig.tareas || ''}</textarea>
                            </label>
                            <div class="gx-client-round-status">
                                <span>${Number(gamifConfig.cupon_reclamado_ciclo || 0) >= Number(gamifConfig.cupon_ciclo || 1) ? '🥇' : '🎟️'}</span>
                                <div><strong>Ronda ${gamifConfig.cupon_ciclo || 1}</strong><small>${Number(gamifConfig.cupon_reclamado_ciclo || 0) >= Number(gamifConfig.cupon_ciclo || 1) ? 'Cupón reclamado' : 'Cupón pendiente de completar'}</small></div>
                            </div>
                            <div class="gx-client-mission-admin-actions">
                                <button type="button" class="reset" onclick="reiniciarMisionesCliente('${key}')">↻ Reiniciar progreso</button>
                                <button type="button" class="round" onclick="nuevaRondaCupon('${key}')">🎟️ Nueva ronda</button>
                            </div>
                        </div>
                    </details>
                    ` : ''}
                    <div class="gx-client-mission-tip">Para crear o asignar etiquetas nuevas usa <strong>Ajustes → Misiones</strong>. Aquí queda solo la configuración específica de este cliente.</div>
                </div>
            `;

            const card = document.createElement("div");
            card.className = "client-card";
            card.style.borderLeftColor = statusColor;
            if(enRevision) card.style.boxShadow = "0 0 20px rgba(188, 19, 254, 0.25)";
            
            card.dataset.clientKey = key;
            const serviceNames = (cliente.servicios || []).map(s => String(s.nombre || "").replace(/\s*\(x\d+\)\s*/gi, "").trim()).filter(Boolean);
            const servicesBrief = serviceNames.length ? serviceNames.slice(0,3).join(" · ") + (serviceNames.length > 3 ? ` +${serviceNames.length-3}` : "") : "Sin servicios activos";
            const refBrief = refActivo ? (refActivo.beneficio_reclamado ? "💝 Reclamado" : ((Number(refActivo.plataformas||0)>=2 && Number(refActivo.meses||0)>=3) ? "🎁 Beneficio listo" : `🎁 ${Number(refActivo.meses||0)}/3`)) : "🎁 Sin referido";
            const couponCycle = Number(gamifConfig.cupon_ciclo || 1);
            const couponClaimed = Number(gamifConfig.cupon_reclamado_ciclo || 0) >= couponCycle;
            const missionBrief = gamifConfig.misiones_activas ? (couponClaimed ? `🥇 Ronda ${couponCycle}` : `🎟️ Ronda ${couponCycle}`) : "🎟️ Sin misiones";
            const cardTiming = typeof gxPaymentTiming==='function' ? gxPaymentTiming(cliente) : {type:'none',days:0,due:null};
            const dueText = cardTiming?.due instanceof Date && !Number.isNaN(cardTiming.due.getTime())
                ? cardTiming.due.toLocaleDateString('es-MX',{day:'numeric',month:'short'})
                : `día ${cliente.dia_pago||15}`;
            const gxDaysLate = Number(gxEstadoCuenta?.dias_atraso || cardTiming.days || 0);
            const gxDaysToCut = Number(gxEstadoCuenta?.dias_para_corte ?? cardTiming.days ?? 0);
            const paymentPrimary = gxBillingStateNow === 'revision'
                ? 'Pago en revisión'
                : gxBillingStateNow === 'pagado'
                    ? 'Mensualidad cubierta'
                    : gxBillingStateNow === 'vencido'
                        ? `Vencido hace ${gxDaysLate} día${gxDaysLate===1?'':'s'}`
                        : gxBillingStateNow === 'incompleto'
                            ? 'Pago incompleto'
                            : gxBillingStateNow === 'vence_hoy'
                                ? 'Vence hoy'
                                : gxBillingStateNow === 'por_vencer'
                                    ? `Vence en ${gxDaysToCut} día${gxDaysToCut===1?'':'s'}`
                                    : cardTiming.type==='overdue'
                                        ? `Vencido hace ${cardTiming.days} día${cardTiming.days===1?'':'s'}`
                                        : cardTiming.type==='upcoming'
                                            ? (cardTiming.days===0?'Vence hoy':`Vence en ${cardTiming.days} día${cardTiming.days===1?'':'s'}`)
                                            : `Vence ${dueText}`;
            const paymentSecondary = gxBillingStateNow==='pagado'
                ? `${typeof gxPeriodLabel==='function'?gxPeriodLabel(cliente.periodo_pendiente):String(cliente.periodo_pendiente||'').slice(0,7)}`
                : `Fecha ${dueText} · ${typeof gxPeriodLabel==='function'?gxPeriodLabel(cliente.periodo_pendiente):String(cliente.periodo_pendiente||'').slice(0,7)}`;
            const paymentClass = gxBillingStateNow==='revision'?'review'
                : gxBillingStateNow==='pagado'?'paid'
                : gxBillingStateNow==='vencido'?'overdue'
                : (gxBillingStateNow==='incompleto'||gxBillingStateNow==='vence_hoy'||gxBillingStateNow==='por_vencer')?'upcoming':'normal';

            card.innerHTML = `
                <div class="card-header-main gx-client-card-header" onclick="toggleClientDetails('${key}')">
                    <div class="client-info-basic">
                        <div class="gx-client-name-line"><h3 style="color:${statusColor};">${cliente.nombre}</h3><span class="gx-client-folio">${cliente.folio}</span></div>
                        <div class="gx-client-payment-primary ${paymentClass}">
                            <span class="gx-client-payment-dot"></span>
                            <div><strong>${paymentPrimary}</strong><small>${paymentSecondary}</small></div>
                        </div>
                    </div>
                    <div class="gx-client-money gx-client-money-live"><strong>$${gxCobroActual.toFixed(2)}</strong><span>cobro actual${gxEstadoCuenta && gxCobroActual !== gxSubtotalReal ? ` · base $${gxSubtotalReal.toFixed(2)}` : ''}</span></div>
                </div>
                <div class="gx-client-brief" onclick="toggleClientDetails('${key}')">
                    <div class="gx-service-brief">${servicesBrief}</div>
                    <div class="gx-client-preview-meta">
                        <span class="services">${serviceNames.length} servicio${serviceNames.length===1?'':'s'}</span>
                        ${Number(cliente.pagos_puntuales||0)>=9 ? `<span class="loyalty">✦ Nivel 2</span>` : ''}
                        ${refActivo ? `<span class="referral">🎁 Referido</span>` : ''}
                        ${gamifConfig.misiones_activas ? `<span class="missions">🎯 Misiones</span>` : ''}
                    </div>
                    <div class="gx-client-brief-footer"><span class="client-status-badge" style="color:${statusColor};border-color:${statusColor}40;background:${statusColor}10;${pulseAnim}">${statusBadge}</span><span class="gx-open-client">Abrir ›</span></div>
                </div>
                <div class="client-details gx-focus-details" id="details-${key}">
                    <div class="gx-client-secondary-tools">
                        <span>Acciones</span>
                        <button type="button" onclick="enviarMensaje('${cliente.nombre}','${key}')">WA Mensaje</button>
                        <button type="button" onclick="copiarInfo('${cliente.nombre}','${key}')">↗ Link</button>
                    </div>
                    ${enRevision ? `<div class="gx-payment-priority">
                        <div class="gx-payment-priority-icon">💳</div>
                        <div class="gx-payment-priority-copy">
                            <strong>Pago pendiente de revisión</strong>
                            <small>Hay un comprobante esperando tu decisión · esperado $${gxCobroActual.toFixed(2)}</small>
                        </div>
                        <button type="button" onclick="gxOpenPaymentModal('${key}', ${gxCobroActual})">Revisar ahora</button>
                    </div>` : ''}

                    <div class="gx-accordion open gx-billing-accordion" data-gx-section="billing">
                        <button class="gx-accordion-trigger" type="button" onclick="gxToggleAccordion(this)">
                            <span><i>💳</i><b>Cobro y estado</b><small>${paymentPrimary} · ${dueText}</small></span><em>⌄</em>
                        </button>
                        <div class="gx-accordion-content">
                            <div class="gx-billing-primary">
                                <div><small>Próximo vencimiento</small><strong>${dueText}</strong></div>
                                <div><small>Cobro actual</small><strong>$${gxCobroActual.toFixed(2)}</strong><span class="gx-billing-base-note">Base mensual $${gxSubtotalReal.toFixed(2)}</span></div>
                                <div class="gx-billing-status ${paymentClass}"><small>Estado</small><strong>${gxEstadoCuenta?.estado_label || (gxBillingBucketNow==='suspendido'?'Suspendido':gxBillingStateNow==='pagado'?'Pagado':gxBillingStateNow==='revision'?'En revisión':gxBillingStateNow==='vencido'?'Vencido':gxBillingStateNow==='incompleto'?'Pago incompleto':'Pendiente')}</strong></div>
                            </div>

                            ${gxBillingBreakdownHTML}

                            <details class="gx-billing-admin">
                                <summary><span>Administrar ciclo</span><em>${cliente.ciclo_cobro_manual?'Manual':'Automático'}</em></summary>
                                <div class="gx-billing-admin-body">
                                    <div class="gx-billing-fields">
                                        <label class="gx-period-field"><span>Periodo a cobrar</span><input type="month" value="${String(cliente.periodo_pendiente || new Date().toISOString().slice(0,7)).slice(0,7)}" onchange="updateClientData('${key}','periodo_pendiente',this.value)"></label>
                                        <label><span>Día de cobro</span><input type="number" value="${cliente.dia_pago || 15}" min="1" max="31" onchange="updateClientData('${key}','dia_pago',this.value)"></label>
                                    </div>
                                    <div class="gx-cycle-mode-row">
                                        <div><strong>Ciclo de cobro</strong><small>${cliente.ciclo_cobro_manual?'El corte mensual no modificará esta cuenta.':'Al iniciar el mes, el periodo pendiente se presenta como nuevo cobro.'}</small></div>
                                        <div class="gx-cycle-segment">
                                            <button type="button" class="${!cliente.ciclo_cobro_manual?'active':''}" onclick="gxSetBillingCycleMode('${key}',false)">Automático</button>
                                            <button type="button" class="${cliente.ciclo_cobro_manual?'active manual':''}" onclick="gxSetBillingCycleMode('${key}',true)">Manual</button>
                                        </div>
                                    </div>
                                    ${cliente.ciclo_cobro_manual ? `<label class="gx-manual-status"><span>Estado manual</span><select class="status-select status-${cliente.estado}" onchange="updateClientData('${key}','estado',this.value)"><option value="pendiente" ${cliente.estado==='pendiente'?'selected':''}>Pendiente (Deuda)</option><option value="pagado" ${cliente.estado==='pagado'?'selected':''}>Pagado</option><option value="suspendido" ${cliente.estado==='suspendido'?'selected':''}>Suspendido</option></select></label>` : `<div class="gx-auto-note">Usa Manual únicamente para acuerdos, pruebas o excepciones.</div>`}
                                </div>
                            </details>

                            <details class="gx-billing-admin gx-billing-adjustments">
                                <summary><span>Ajustes y descuentos</span><em>${gxEstadoCuenta ? `$${gxDescuentosTotal.toFixed(2)} aplicado` : `${(cliente.descuentos_especiales?.length||0) + (cliente.descuento_especial?1:0) + (cliente.descuento_fallas?1:0)} activo${((cliente.descuentos_especiales?.length||0) + (cliente.descuento_especial?1:0) + (cliente.descuento_fallas?1:0))===1?'':'s'}`}</em></summary>
                                <div class="gx-billing-admin-body">${descuentosHTML}</div>
                            </details>
                        </div>
                    </div>

                    <div class="gx-accordion" data-gx-section="services">
                        <button class="gx-accordion-trigger" type="button" onclick="gxToggleAccordion(this)">
                            <span><i>📺</i><b>Servicios</b><small>${serviceNames.length} activo${serviceNames.length===1?'':'s'} · $${subtotal}</small></span><em>⌄</em>
                        </button>
                        <div class="gx-accordion-content">
                            <div class="client-services-list">
                                ${clientServicesHTML}
                                <div class="client-service-add-row"><select id="add-srv-sel-${key}">${globalOptions}</select><button class="btn-save" onclick="addClientService('${key}')">＋</button></div>
                            </div>
                        </div>
                    </div>

                    <div class="gx-accordion gx-benefits-accordion" data-gx-section="benefits">
                        <button class="gx-accordion-trigger" type="button" onclick="gxToggleAccordion(this)">
                            <span><i>✦</i><b>Beneficios</b><small>${cliente.pagos_puntuales || 0} pagos · ${refActivo?'Referido activo':'Sin referido'} · ${gamifConfig.misiones_activas?'Misiones activas':'Sin misiones'}</small></span><em>⌄</em>
                        </button>
                        <div class="gx-accordion-content">
                            <div class="gx-benefit-loyalty gx-benefit-loyalty-v195">
                                <div class="gx-benefit-copy">
                                    <small>Lealtad</small>
                                    <strong><span id="pagos-${key}">${cliente.pagos_puntuales || 0}</span> pagos puntuales</strong>
                                </div>
                                <div class="gx-loyalty-inline-actions" aria-label="Administrar lealtad">
                                    <button type="button" onclick="updatePagos('${key}',-1)" title="Restar pago">−</button>
                                    <button type="button" onclick="updatePagos('${key}',1)" title="Sumar pago">＋</button>
                                    <button type="button" class="reset" onclick="reiniciarLealtad('${key}')" title="Reiniciar lealtad">↻</button>
                                </div>
                            </div>

                            <details class="gx-benefit-sub">
                                <summary><span>Referidos</span><em>${refActivo ? `${refSmartMonths}/3 meses` : 'Sin referido'}</em></summary>
                                <div class="gx-benefit-sub-body">${refHTML}</div>
                            </details>

                            <details class="gx-benefit-sub">
                                <summary><span>Misiones y cupón</span><em>${gamifConfig.misiones_activas ? missionBrief : 'Inactivas'}</em></summary>
                                <div class="gx-benefit-sub-body">${gamifHTML}</div>
                            </details>
                        </div>
                    </div>

                    <div class="gx-accordion" data-gx-section="account">
                        <button class="gx-accordion-trigger" type="button" onclick="gxToggleAccordion(this)">
                            <span><i>🔑</i><b>Cuenta y acceso</b><small>Identidad, usuario y PIN seguro</small></span><em>⌄</em>
                        </button>
                        <div class="gx-accordion-content">
                            <div class="access-portal-box gx-access-compact gx-account-access">
                                <label class="gx-account-field">
                                    <span>Nombre a mostrar</span>
                                    <input type="text" value="${cliente.nombre}" class="cred-input" onchange="updateClientData('${key}','nombre',this.value)">
                                </label>
                                <label class="gx-account-field">
                                    <span>Usuario / Correo</span>
                                    <input type="text" value="${cliente.usuario_acceso || ''}" class="cred-input" placeholder="Sin configurar" onchange="updateClientData('${key}','usuario_acceso',this.value)">
                                </label>

                                <section class="gx-pin-control" data-gx-pin-key="${key}">
                                    <div class="gx-pin-control-head">
                                        <div>
                                            <small>PIN de acceso</small>
                                            <strong>••••</strong>
                                        </div>
                                        <span>Protegido</span>
                                    </div>
                                    <p>Por seguridad, el PIN actual no se puede recuperar. Puedes cambiarlo o generar uno nuevo.</p>

                                    <div class="gx-pin-actions">
                                        <button type="button" onclick="gxOpenPinEditor('${key}')">Cambiar PIN</button>
                                        <button type="button" class="primary" onclick="gxGenerateUniquePin('${key}')">Generar PIN</button>
                                    </div>

                                    <div class="gx-pin-editor" id="gx-pin-editor-${key}" hidden>
                                        <label>
                                            <span>Nuevo PIN</span>
                                            <input id="gx-pin-input-${key}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 dígitos">
                                        </label>
                                        <div>
                                            <button type="button" onclick="gxCancelPinEditor('${key}')">Cancelar</button>
                                            <button type="button" class="save" onclick="gxSaveUniquePin('${key}')">Guardar</button>
                                        </div>
                                    </div>

                                    <div class="gx-pin-reveal" id="gx-pin-reveal-${key}" hidden>
                                        <div>
                                            <small>PIN actualizado · visible solo en esta sesión</small>
                                            <strong id="gx-pin-value-${key}">••••</strong>
                                        </div>
                                        <div class="gx-pin-reveal-actions">
                                            <button type="button" onclick="gxCopyPin('${key}')">Copiar PIN</button>
                                            <button type="button" onclick="gxCopyFullAccess('${key}')">Copiar acceso</button>
                                            <button type="button" class="quiet" onclick="gxHideSessionPin('${key}')">Ocultar</button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>

                </div>
            `;
            container.appendChild(card);
        });
    }

    function copiarInfo(nombre, key) {
        const link = `https://henrygonzalezestrada-cyber.github.io/goxion/index.html?cliente=${key}`;
        navigator.clipboard.writeText(`Hola ${nombre}, aquí tienes tu estado de cuenta actualizado:\n${link}`);
        alert("¡Link copiado correctamente!");
    }

    function enviarMensaje(nombre, key) {
        const link = `https://henrygonzalezestrada-cyber.github.io/goxion/index.html?cliente=${key}`;
        const mensajePreescrito = `Hola ${nombre}, te comparto el enlace a tu portal actualizado de GOXION:%0A%0A${link}`;
        window.open(`https://api.whatsapp.com/send?text=${mensajePreescrito}`, '_blank');
    }








    