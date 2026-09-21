  const TELEFONO_GOXION = "528136836901"; 
  const CLABE_PAGO = "638180000167909381";
  const BANCO_PAGO = "NU BANCO";
  const TITULAR_PAGO = "Henry González";
  
  // WEBHOOK DE DISCORD AÑADIDO Y ACTUALIZADO
  const WEBHOOK_DISCORD = "goxion://pagos"; 

  function notificarAdminDiscord(titulo, mensaje, colorHex) {
      if(!WEBHOOK_DISCORD) return;
      
      const colorDec = parseInt(colorHex.replace("#",""), 16);

      const payload = {
          embeds: [{
              title: titulo,
              description: mensaje,
              color: colorDec,
              timestamp: new Date().toISOString(),
              footer: { text: "GOXION Pay System" }
          }]
      };

      fetch(WEBHOOK_DISCORD, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
      }).catch(e => console.log("Webhook no enviado", e));
  }

  async function cargarEstadoCuenta() {
    const params = new URLSearchParams(window.location.search);
    const clienteKey = params.get('cliente')?.toLowerCase().trim();
    const app = document.getElementById('app');

    if (!clienteKey) {
      app.innerHTML = `<div class="error-msg">⚠️ ENLACE INCOMPLETO.<br><span style="font-size:12px; color:var(--text-muted); font-weight: 400;">Falta el identificador del cliente en la URL.</span></div>`;
      return;
    }

    try {
      const version = new Date().getTime();
      const response = await fetch(`clientes.json?v=${version}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
      });
      
      if (!response.ok) throw new Error("No se pudo cargar clientes.json");
      
      const data = await response.json();
      const cliente = data[clienteKey];

      if (!cliente) {
        app.innerHTML = `<div class="error-msg">❌ CLIENTE NO ENCONTRADO.<br><span style="font-size:12px; color:var(--text-muted); font-weight: 400;">El registro "${clienteKey}" no existe en el sistema.</span></div>`;
        return;
      }

      const hoy = new Date();
      const gxEstadoCuenta = cliente.estado_cuenta || null;
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

      // Periodo persistente: no cambia solo porque inició un mes nuevo.
      const rawPeriodo = String(gxEstadoCuenta?.periodo || cliente.periodo_pendiente || "");
      const matchPeriodo = rawPeriodo.match(/^(\d{4})-(\d{2})/);
      const periodoYear = matchPeriodo ? Number(matchPeriodo[1]) : hoy.getFullYear();
      const periodoMonth = matchPeriodo ? Math.max(0, Math.min(11, Number(matchPeriodo[2]) - 1)) : hoy.getMonth();
      const mesPeriodo = meses[periodoMonth];
      const periodoStr = `${mesPeriodo} ${periodoYear}`;

      const diaPago = cliente.dia_pago || 15;
      const ultimoDiaPeriodo = new Date(periodoYear, periodoMonth + 1, 0).getDate();
      const diaCorteReal = Math.min(Math.max(1, Number(diaPago) || 15), ultimoDiaPeriodo);
      const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const corteUTC = Date.UTC(periodoYear, periodoMonth, diaCorteReal);
      const difDiasLocal = Math.round((corteUTC - hoyUTC) / 86400000);
      const difDias = gxEstadoCuenta
          ? (Number(gxEstadoCuenta.dias_atraso || 0) > 0 ? -Number(gxEstadoCuenta.dias_atraso || 0) : Number(gxEstadoCuenta.dias_para_corte ?? difDiasLocal))
          : difDiasLocal;
      const etiquetaCorte = difDias < 0 ? "Venció" : "Corte";

      // Estado mensual real: un pago solo cubre el periodo al que pertenece.
      const pagosCliente = Array.isArray(cliente.historial_pagos) ? cliente.historial_pagos : [];
      const normalizarPeriodo = (valor) => String(valor || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\bde\b/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const pagoPeriodoActual = pagosCliente.find(p => {
          const periodo = normalizarPeriodo(p.periodo || p.fecha || "");
          const estadoPago = String(p.estado || "pagado").trim().toLowerCase();
          return periodo === normalizarPeriodo(periodoStr) && estadoPago === "pagado";
      });

      const tieneHistorialConPeriodo = pagosCliente.some(
          p => String(p.periodo || p.fecha || "").trim() !== ""
      );

      let estaPagadoPeriodo = gxEstadoCuenta
          ? gxEstadoCuenta.esta_pagado_periodo === true
          : Boolean(
              pagoPeriodoActual ||
              (!tieneHistorialConPeriodo && cliente.estado === "pagado")
            );

      // Un comprobante en revisión siempre tiene prioridad visual sobre "pagado".
      // El estado verde sólo vuelve cuando Administración aprueba y Supabase
      // limpia pago_en_revision / marca pago_revision_estado como aprobado.
      const reviewState = String(cliente.pago_revision_estado || "").toLowerCase();
      const enRevision = gxEstadoCuenta
          ? gxEstadoCuenta.pago_en_revision === true
          : (cliente.pago_en_revision === true || reviewState === "revision");

      // El cambio manual desde Admin manda sobre el periodo activo.
      if (cliente.estado === "pendiente" || cliente.estado === "suspendido" || enRevision) {
          estaPagadoPeriodo = false;
      }

      let rachaOriginal = gxEstadoCuenta ? Number(gxEstadoCuenta.lealtad?.pagos_guardados || 0) : (cliente.pagos_puntuales || 0);
      let racha = gxEstadoCuenta ? Number(gxEstadoCuenta.lealtad?.pagos_efectivos || 0) : rachaOriginal;
      let perdioRacha = gxEstadoCuenta ? gxEstadoCuenta.lealtad?.racha_reiniciada_virtual === true : false;

      if (!gxEstadoCuenta && !estaPagadoPeriodo && difDias < 0 && rachaOriginal > 0) {
          racha = 0;
          perdioRacha = true;
      }

      let subtotal = 0;
      let serviciosHTML = '';
      if (cliente.servicios && cliente.servicios.length > 0) {
        cliente.servicios.forEach(s => {
          subtotal += s.monto;
          serviciosHTML += `
            <div class="service-item">
              <span class="service-name">${s.nombre}</span>
              <span class="service-price">$${s.monto}</span>
            </div>
          `;
        });
      } else {
        serviciosHTML = `<div style="text-align:center; color:var(--text-muted); font-size:13px; padding: 15px 0;">No tienes servicios activos asignados.</div>`;
      }
      if (gxEstadoCuenta) subtotal = Number(gxEstadoCuenta.subtotal || subtotal);

      let pctMoraDiaria = 0;
      let montoMora = 0;
      let montoBajaAdmin = 0;
      let diasAtraso = 0;
      
      let badgeClass = "";
      let badgeText = "";
      let uiColor = "var(--neon-blue)";
      let mensajeAtrasoHTML = "";

      // Supabase es la única fuente de verdad del estado de revisión.
      const montoFaltanteRevision = Math.max(0, Number(gxEstadoCuenta?.monto_faltante_revision ?? cliente.pago_revision_monto_faltante ?? 0));
      const pagoIncompleto = gxEstadoCuenta
          ? gxEstadoCuenta.pago_incompleto === true
          : (!estaPagadoPeriodo
              && !enRevision
              && String(cliente.pago_revision_estado || "").toLowerCase() === "incompleto");
      const tieneDiferenciaPendiente = pagoIncompleto && montoFaltanteRevision > 0;

      if (enRevision) {
          badgeClass = "badge-review";
          badgeText = `⏳ Pago en revisión`;
          uiColor = "var(--neon-purple)";
      } else if (estaPagadoPeriodo) {
          badgeClass = "badge-paid";
          badgeText = "✅ Al corriente este mes";
          uiColor = "var(--success-neon)";
      } else if (pagoIncompleto) {
          badgeClass = "badge-incomplete";
          badgeText = tieneDiferenciaPendiente
              ? `⚠️ Pago incompleto · resta $${montoFaltanteRevision.toFixed(2)}`
              : `⚠️ Pago incompleto`;
          uiColor = "var(--warning-amber)";
      } else if (difDias > 0) {
          badgeClass = "badge-ok";
          badgeText = `⏳ Vence en ${difDias} día(s)`;
      } else if (difDias === 0) {
          badgeClass = "badge-today";
          badgeText = `⚠️ Tu corte es HOY`;
          uiColor = "var(--warning-amber)";
      } else {
          diasAtraso = Math.abs(difDias);
          badgeClass = "badge-overdue";
          badgeText = `🚨 Vencido hace ${diasAtraso} día(s)`;
          uiColor = "var(--danger-red)";

          let pctMoraCalculado = diasAtraso * 0.05;
          pctMoraDiaria = gxEstadoCuenta
              ? Number(gxEstadoCuenta.cargos?.mora_porcentaje || 0) / 100
              : Math.min(pctMoraCalculado, 0.50);
          montoMora = gxEstadoCuenta
              ? Number(gxEstadoCuenta.cargos?.mora || 0)
              : Math.round(subtotal * pctMoraDiaria);
          let acumMoraTotal = subtotal + montoMora;

          if (diasAtraso > 15 || cliente.estado === 'suspendido') {
              montoBajaAdmin = gxEstadoCuenta
                  ? Number(gxEstadoCuenta.cargos?.reactivacion || 0)
                  : Math.round(acumMoraTotal * 0.20);
          }

          mensajeAtrasoHTML = `
            <div class="overdue-incentive-box">
              🚨 <strong style="color:var(--text-main);">Mora activa por falta de pago.</strong><br>
              Se aplica recargo automático del 5% diario (+${Math.round(pctMoraDiaria * 100)}% acum.). 
              ${(diasAtraso > 15 || cliente.estado === 'suspendido') ? `<br><strong style="color:var(--danger-red);">⚠️ Se incluyó un 20% de recargo por reactivación.</strong>` : ''}
              <br><small style="color:var(--text-muted); display:block; margin-top:8px;">Si prevés un retraso, notifícalo con antelación para evitar recargos.</small>
            </div>
          `;
      }

      let bannerEstado = "";
      if (cliente.estado === 'suspendido' && !enRevision) {
          bannerEstado = `<div class="alert-banner" style="background: rgba(255, 51, 102, 0.1); border-color: var(--danger-red); color: var(--danger-red); box-shadow: 0 0 15px rgba(255, 51, 102, 0.15);">⛔ Servicio Suspendido</div>`;
          uiColor = "var(--danger-red)";
      }

      let pctDescuento = 0;
      let mensajeLealtad = '';
      if (racha >= 9) {
        pctDescuento = 0.06;
        mensajeLealtad = `Nivel 2 Activo: <span class="loyalty-highlight">6% de descuento</span> aplicado en tu total.`;
      } else if (racha >= 4) {
        pctDescuento = 0.03;
        const faltantes = 9 - racha;
        mensajeLealtad = `Nivel 1 Activo: <span class="loyalty-highlight">3% OFF</span>. Te faltan ${faltantes} pago(s) para subir a Nivel 2.`;
      } else {
        pctDescuento = 0;
        const faltantes = 4 - racha;
        mensajeLealtad = perdioRacha 
          ? `<span style="color:var(--danger-red); font-weight:600;">💔 Racha reiniciada a 0 por atraso en el pago.</span>` 
          : `Progreso: <span class="loyalty-highlight" style="color:var(--text-main);">${racha}/4 pagos</span>. Faltan ${faltantes} pago(s) para subir a Nivel 1.`;
      }

      if (gxEstadoCuenta) pctDescuento = Number(gxEstadoCuenta.lealtad?.porcentaje || 0) / 100;
      let ahorro = gxEstadoCuenta
          ? Number(gxEstadoCuenta.lealtad?.monto || 0)
          : ((diasAtraso === 0 && cliente.estado !== 'suspendido' && !estaPagadoPeriodo) ? Math.round(subtotal * pctDescuento) : 0);
      
      let totalDescuentosEspeciales = 0;
      let desgloseDescuentosHTML = '';

      if (cliente.descuento_especial && parseFloat(cliente.descuento_especial.monto) > 0) {
          let m = parseFloat(cliente.descuento_especial.monto);
          let c = cliente.descuento_especial.concepto || "Descuento Especial";
          totalDescuentosEspeciales += m;
          desgloseDescuentosHTML += `<div class="breakdown-line discount-line"><span>${c}</span><span>-$${m}</span></div>`;
      }

      if (cliente.descuentos_especiales && cliente.descuentos_especiales.length > 0) {
          cliente.descuentos_especiales.forEach(desc => {
              let m = parseFloat(desc.monto) || 0;
              let c = desc.concepto || "Descuento Especial";
              if (m > 0) {
                  totalDescuentosEspeciales += m;
                  desgloseDescuentosHTML += `<div class="breakdown-line discount-line"><span>${c}</span><span>-$${m}</span></div>`;
              }
          });
      }

      const tratoJustoDetalle = Array.isArray(cliente.trato_justo_compensaciones) ? cliente.trato_justo_compensaciones : [];
      let descuentoTratoJusto = tratoJustoDetalle.length
          ? tratoJustoDetalle.reduce((s,x)=>s+(parseFloat(x.monto)||0),0)
          : (cliente.descuento_fallas ? (parseFloat(cliente.descuento_fallas) || 0) : 0);

      if (tratoJustoDetalle.length) {
          tratoJustoDetalle.forEach(comp => {
              const nombreServicio = comp?.cliente_servicios?.nombre || "Servicio";
              const dias = Number(comp.dias_falla || 0);
              const monto = parseFloat(comp.monto) || 0;
              desgloseDescuentosHTML += `<div class="breakdown-line discount-line"><span>🛡 Trato Justo · ${nombreServicio} (${dias} día${dias===1?'':'s'})</span><span>-$${monto.toFixed(2)}</span></div>`;
          });
      } else if (descuentoTratoJusto > 0) {
          desgloseDescuentosHTML += `<div class="breakdown-line discount-line"><span>Garantía Trato Justo</span><span>-$${descuentoTratoJusto.toFixed(2)}</span></div>`;
      }
      
      let ahorroTotal = ahorro + totalDescuentosEspeciales + descuentoTratoJusto;

      let totalFinal = gxEstadoCuenta
          ? Number(gxEstadoCuenta.total_actual || 0)
          : ((subtotal - ahorroTotal) + montoMora + montoBajaAdmin);
      if (totalFinal < 0) totalFinal = 0; 

      let labelTotal = gxEstadoCuenta?.total_label || "Total a Pagar";

      let btnAccionHTML = "";

      if (enRevision) {
          btnAccionHTML = `
            <div class="btn-review-state">
              <span>⏳ <strong>Tu comprobante está en revisión</strong></span>
              <span style="font-size: 11px; color: var(--text-muted);">El equipo de Goxion actualizará tu estado en breve.</span>
            </div>
          `;
      } else if (estaPagadoPeriodo) {
          totalFinal = gxEstadoCuenta ? Number(gxEstadoCuenta.total_actual || 0) : 0;
          labelTotal = gxEstadoCuenta?.total_label || "Saldo Pendiente";
      } else if (pagoIncompleto) {
          // Administración ya validó el pago anterior y registró la diferencia.
          // Ese monto pasa a ser el saldo mostrado y el monto del siguiente comprobante.
          if (gxEstadoCuenta) totalFinal = Number(gxEstadoCuenta.total_actual || 0);
          else if (tieneDiferenciaPendiente) totalFinal = montoFaltanteRevision;
          labelTotal = gxEstadoCuenta?.total_label || "Saldo Pendiente";
          btnAccionHTML = `
            <button class="btn btn-copy" onclick="copiarDatos('${totalFinal.toFixed(2)}')">💳 Copiar Datos de Pago</button>
            <button class="btn btn-wa" style="background: rgba(46, 160, 67, 0.15); border-color: var(--success-green); color: var(--success-green); text-shadow: 0 0 10px rgba(46, 160, 67, 0.4);" onclick="abrirModalPago('${clienteKey}', '${periodoStr}', '${totalFinal.toFixed(2)}', '${cliente.folio}', '${cliente.nombre}')">
              📤 Ya realicé mi depósito
            </button>
          `;
      } else {
          btnAccionHTML = `
            <button class="btn btn-copy" onclick="copiarDatos('${totalFinal.toFixed(2)}')">💳 Copiar Datos de Pago</button>
            <button class="btn btn-wa" style="background: rgba(46, 160, 67, 0.15); border-color: var(--success-green); color: var(--success-green); text-shadow: 0 0 10px rgba(46, 160, 67, 0.4);" onclick="abrirModalPago('${clienteKey}', '${periodoStr}', '${totalFinal.toFixed(2)}', '${cliente.folio}', '${cliente.nombre}')">
              📤 Ya realicé mi depósito
            </button>
          `;
      }

      let breakdownHTML = '';
      if (gxEstadoCuenta && Array.isArray(gxEstadoCuenta.desglose) && gxEstadoCuenta.desglose.length && !estaPagadoPeriodo && !pagoIncompleto) {
          breakdownHTML = `
            <div class="glass-card breakdown-box">
              ${gxEstadoCuenta.desglose.map(item => {
                  const amount = Number(item?.monto || 0);
                  const cls = amount < 0 ? 'discount-line' : (item?.tipo === 'cargo' ? 'surcharge-line' : '');
                  const shown = amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : (item?.tipo === 'cargo' ? `+$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`);
                  return `<div class="breakdown-line ${cls}" ${item?.tipo === 'subtotal' ? 'style="color: var(--text-muted);"' : ''}><span>${item?.concepto || 'Ajuste'}</span><span>${shown}</span></div>`;
              }).join('')}
            </div>
          `;
      } else if (!estaPagadoPeriodo && !pagoIncompleto && (ahorroTotal > 0 || montoMora > 0 || montoBajaAdmin > 0)) {
          breakdownHTML = `
            <div class="glass-card breakdown-box">
              <div class="breakdown-line" style="color: var(--text-muted);"><span>Subtotal Mensual</span><span>$${subtotal}</span></div>
              ${ahorro > 0 ? `<div class="breakdown-line discount-line"><span>Descuento Lealtad</span><span>-$${ahorro}</span></div>` : ''}
              ${desgloseDescuentosHTML}
              ${montoMora > 0 ? `<div class="breakdown-line surcharge-line"><span>Mora (+${Math.round(pctMoraDiaria * 100)}%)</span><span>+$${montoMora}</span></div>` : ''}
              ${montoBajaAdmin > 0 ? `<div class="breakdown-line surcharge-line"><span>Cargo Reactivación</span><span>+$${montoBajaAdmin}</span></div>` : ''}
            </div>
          `;
      }

      const mensajeWA = encodeURIComponent(`Hola GOXION, requiero asistencia con mi cuenta.\n\n👤 Cliente: ${cliente.nombre}\n📄 Folio: ${cliente.folio}`);
      const urlWA = `https://wa.me/${TELEFONO_GOXION}?text=${mensajeWA}`;

      app.innerHTML = `
        <div class="sticky-area">
          <div class="header">
            <div class="header-title">Estado de Cuenta</div>
          </div>

          ${bannerEstado}

          <div class="balance-hero">
              <div class="total-label">${labelTotal}</div>
              <div class="total-amount" style="color: ${uiColor}; text-shadow: 0 0 25px ${uiColor}50;">$${totalFinal.toFixed(2)}</div>
              <div class="time-badge ${badgeClass}">${gxEstadoCuenta?.estado_label ? `${gxEstadoCuenta.estado==='pagado'?'✅':gxEstadoCuenta.estado==='revision'?'⏳':gxEstadoCuenta.estado==='incompleto'?'⚠️':gxEstadoCuenta.estado==='vencido'?'🚨':'⏳'} ${gxEstadoCuenta.estado_label}` : badgeText}</div>
          </div>
        </div>

        <div class="scrollable-content">
          ${(cliente.estado === 'pagado' || enRevision || pagoIncompleto) ? '' : mensajeAtrasoHTML}

          <div class="glass-card card-info">
            <div class="info-block">
              <span class="label">Titular</span>
              <span class="value">${cliente.nombre.split(' ')[0]}</span>
            </div>
            <div class="info-block" style="text-align: right;">
              <span class="label">Folio</span>
              <span class="value" style="color:var(--neon-purple);">${cliente.folio}</span>
            </div>
            <div class="info-block full">
              <span class="label">Periodo Facturado</span>
              <span class="value" style="display:flex; justify-content:space-between; align-items:center;">
                  ${periodoStr} 
                  <span style="color:var(--text-muted); font-size:12px; font-weight:500;">${etiquetaCorte}: ${diaCorteReal} de ${mesPeriodo}</span>
              </span>
            </div>
          </div>

          <div class="section-title">Servicios Activos</div>
          <div class="glass-card services-container">
            ${serviciosHTML}
          </div>

          ${breakdownHTML}

          <div class="glass-card loyalty-badge">
            <div class="loyalty-icon">⭐</div>
            <div class="loyalty-content">
              <div class="loyalty-title">Programa Goxion</div>
              <div class="loyalty-desc">${mensajeLealtad}</div>
            </div>
          </div>

          <div class="actions-group">
            ${btnAccionHTML}
            <a href="${urlWA}" target="_blank" class="btn btn-wa">
              💬 Contactar a Soporte
            </a>
          </div>

          <div class="footer">
            <span style="color:var(--text-main); font-weight:600;">🎁 ¡Gana un mes gratis!</span><br>
            Invita a un amigo, cuando cumpla 3 meses de servicio, tu próxima mensualidad será sin costo.
            
            <div class="footer-logo-container">
              <img src="logo2.PNG" alt="Goxion - Todo conectado" class="footer-logo" onerror="this.style.display='none'">
            </div>
            <div class="goxion-release-version" aria-label="Versión de GOXION">GOXION · Index · v1.0.2 · fuente única</div>
          </div>
        </div>
      `;

    } catch (e) {
      app.innerHTML = `<div class="error-msg">⚠️ Error al cargar la base de datos.<br><span style="font-size:13px; color:var(--text-muted); font-weight: 400;">Revisa tu conexión a internet o contacta a soporte.</span></div>`;
    }
  }

  function copiarDatos(monto) {
    const texto = `GOXION - Datos de Transferencia\n\nBanco: ${BANCO_PAGO}\nTitular: ${TITULAR_PAGO}\nCLABE: ${CLABE_PAGO}\nMonto exacto: $${monto} MXN`;
    navigator.clipboard.writeText(texto).then(() => {
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    });
  }

  // --- NUEVA LÓGICA DE SUBIDA DE COMPROBANTES --- //
  let pagoActualInfo = {};

  function abrirModalPago(clienteKey, periodo, monto, folio, nombre) {
      pagoActualInfo = { clienteKey, periodo, monto, folio, nombre };
      document.getElementById('payment-modal').classList.add('show');
      document.body.style.overflow = 'hidden'; 
  }

  function cerrarModalPago(e, force = false) {
      if (force || e.target.classList.contains('modal-overlay')) {
          document.getElementById('payment-modal').classList.remove('show');
          document.body.style.overflow = 'auto';
          reiniciarSubida(); // Limpia los inputs si el usuario cierra la ventana
      }
  }

  function reiniciarSubida() {
      document.getElementById('file-input').value = "";
      document.getElementById('preview-container').style.display = 'none';
      document.getElementById('upload-area').style.display = 'block';
      document.getElementById('btn-enviar-comprobante').style.display = 'none';
  }

  function mostrarPreview(input) {
      if (input.files && input.files[0]) {
          const file = input.files[0];
          
          if (!file.type.startsWith('image/')) {
              alert("Por favor, selecciona un archivo de imagen válido (Captura de pantalla o foto).");
              input.value = "";
              return;
          }

          const reader = new FileReader();
          reader.onload = function(e) {
              document.getElementById('preview-img').src = e.target.result;
              document.getElementById('preview-container').style.display = 'block';
              document.getElementById('upload-area').style.display = 'none'; 
              document.getElementById('btn-enviar-comprobante').style.display = 'block';
          }
          reader.readAsDataURL(file);
      }
  }

  async function enviarComprobanteDiscord() {
      const input = document.getElementById('file-input');
      if (!input.files || !input.files[0]) {
          alert("Debes adjuntar una captura de pantalla antes de enviar.");
          return;
      }

      const file = input.files[0];
      const btn = document.getElementById('btn-enviar-comprobante');
      
      btn.disabled = true;
      btn.innerText = "⏳ Encriptando y subiendo comprobante...";

      const { clienteKey, periodo, monto, folio, nombre } = pagoActualInfo;

      // 1. Guardamos localmente el estado de revisión y completamos la misión de la app

      // 2. Preparamos el "sobre" con el archivo y la información
      const formData = new FormData();
      formData.append('file', file, file.name);

      const colorDec = parseInt("00ff9d", 16);
      const payload = {
          embeds: [{
              title: "💰 COMPROBANTE SUBIDO DESDE LA APP WEB",
              description: `**Cliente:** ${nombre}\n**Folio:** ${folio}\n**Monto Esperado:** $${monto} MXN\n**Periodo:** ${periodo}\n\n*El cliente acaba de subir su captura de pantalla. Verifica el adjunto para acreditar su mes.*`,
              color: colorDec,
              timestamp: new Date().toISOString(),
              footer: { text: "GOXION Pay System" },
              image: { url: `attachment://${file.name}` } // Esta línea asegura que la foto se muestre bonito dentro del mensaje
          }]
      };

      formData.append('payload_json', JSON.stringify(payload));

      try {
          // 3. Enviamos a Discord
          await fetch(WEBHOOK_DISCORD, {
              method: 'POST',
              body: formData
          });

          btn.innerText = "✅ ¡Validación solicitada con éxito!";
          btn.style.background = "linear-gradient(135deg, var(--neon-blue), #4f8cff)";
          btn.style.boxShadow = "0 0 20px rgba(0, 242, 254, 0.4)";
          
          setTimeout(() => {
              location.reload();
          }, 1500);

      } catch (error) {
          console.error("Error al enviar el archivo:", error);
          alert("Ocurrió un pequeño error de red al subir la imagen. Por favor, intenta de nuevo o avísanos por WhatsApp.");
          btn.disabled = false;
          btn.innerText = "📤 Enviar Comprobante Seguro";
      }
  }

  cargarEstadoCuenta();