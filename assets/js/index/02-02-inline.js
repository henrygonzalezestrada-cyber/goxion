  const GXCORE = window.GOXION_CORE;
  const TELEFONO_GOXION = GXCORE.BUSINESS.WHATSAPP;
  const CLABE_PAGO = GXCORE.BUSINESS.BANK.CLABE;
  const BANCO_PAGO = GXCORE.BUSINESS.BANK.NAME;
  const TITULAR_PAGO = GXCORE.BUSINESS.BANK.HOLDER;
  const GX_PAYMENT_V2 = true;
  document.documentElement.classList.add("gx-payment-v2");
  const CUENTAS_PAGO = Object.freeze(
    Array.isArray(GXCORE.BUSINESS.BANK.ACCOUNTS) && GXCORE.BUSINESS.BANK.ACCOUNTS.length
      ? GXCORE.BUSINESS.BANK.ACCOUNTS.map(x => Object.freeze({...x}))
      : [Object.freeze({
          ID:"nu",
          LABEL:BANCO_PAGO,
          INSTITUTION:BANCO_PAGO,
          HOLDER:TITULAR_PAGO,
          CLABE:CLABE_PAGO,
          CURRENCY:"MXN",
          PRIMARY:true
        })]
  );
  
  // Canal lógico de notificación, centralizado en GOXION_CORE.
  const WEBHOOK_DISCORD = GXCORE.BUSINESS.CHANNELS.pagos;

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
      const gxSaldoBloqueado = gxEstadoCuenta?.ok === false &&
        gxEstadoCuenta?.fuente_financiera === 'supabase:goxion_hibrido_contrato_unico_v1';
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

      /* R17-completar (a) · fase del seguimiento del comprobante, del
       * estado vivo del motor. Prioridad: revisión > observación >
       * validado. "Validado" exige período pagado Y último estado de
       * revisión aprobado, para no afirmar un comprobante validado
       * en un período nuevo sin recibo. "Rechazado" es observación:
       * Admin dejó un mensaje para corregir y reenviar. */
      const proofPhase = enRevision ? "review"
        : (pagoIncompleto || reviewState === "rechazado") ? "correction"
        : (estaPagadoPeriodo && reviewState === "aprobado") ? "approved" : null;
      const proofHint = proofPhase === "correction"
        ? String(cliente.pago_revision_mensaje || "").trim() : "";
      const proofHTML = proofPhase ? gxProofTrackerHTML(proofPhase, proofHint) : "";

      /* R17-completar (b) · lealtad viva para la joya del preview:
       * objetivo 4 (Nivel 1) o 9 (Nivel 2); el conteo lo pone la
       * leyenda de la joya, así la descripción ya no repite "X/4". */
      const loyaltyTarget = racha >= 4 ? 9 : 4;
      const loyaltyCount = Math.max(0, Math.min(racha, loyaltyTarget));
      const loyaltyTitle = perdioRacha ? "Racha reiniciada" : "Tu lealtad";
      const loyaltyCaption = perdioRacha ? "Perdiste tu avance"
        : `${loyaltyCount} de ${loyaltyTarget} pagos puntuales`;

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
          : `Te faltan ${faltantes} pago(s) para subir a Nivel 1.`;
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

      if (gxSaldoBloqueado) {
          // Nunca presentar cero ni abrir comprobante con saldo no conciliado.
          labelTotal = 'Saldo en revisión';
          btnAccionHTML = '';
      } else if (enRevision) {
          /* R17-completar (a) · en revisión no hay bloque de acción:
           * el mensaje vive solo en el seguimiento del comprobante
           * (igual que en el preview: "Message belongs only to the
           * proof timeline"). La píldora del hero sigue diciendo
           * "Pago en revisión" y el botón de pago no aparece. */
          btnAccionHTML = ``;
      } else if (estaPagadoPeriodo) {
          totalFinal = gxEstadoCuenta ? Number(gxEstadoCuenta.total_actual || 0) : 0;
          labelTotal = gxEstadoCuenta?.total_label || "Saldo Pendiente";
      } else if (pagoIncompleto) {
          // Administración ya validó el pago anterior y registró la diferencia.
          // Ese monto pasa a ser el saldo mostrado y el monto del siguiente comprobante.
          if (gxEstadoCuenta) totalFinal = Number(gxEstadoCuenta.total_actual || 0);
          else if (tieneDiferenciaPendiente) totalFinal = montoFaltanteRevision;
          labelTotal = gxEstadoCuenta?.total_label || "Saldo Pendiente";
          pagoActualInfo = { clienteKey, periodo: periodoStr, monto: totalFinal.toFixed(2), folio: cliente.folio, nombre: cliente.nombre };
          btnAccionHTML = `
            ${botonComprobanteHTML(clienteKey, periodoStr, totalFinal, cliente.folio, cliente.nombre)}
            ${botonDatosPagoHTML()}
          `;
      } else {
          pagoActualInfo = { clienteKey, periodo: periodoStr, monto: totalFinal.toFixed(2), folio: cliente.folio, nombre: cliente.nombre };
          btnAccionHTML = `
            ${botonComprobanteHTML(clienteKey, periodoStr, totalFinal, cliente.folio, cliente.nombre)}
            ${botonDatosPagoHTML()}
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
              <div class="total-amount" style="color: ${uiColor}; text-shadow: 0 0 25px ${uiColor}50;">${gxSaldoBloqueado ? "Importe por conciliar" : "$" + totalFinal.toFixed(2)}</div>
              <div class="time-badge ${badgeClass}">${gxEstadoCuenta?.estado_label ? `${gxEstadoCuenta.estado==='pagado'?'✅':gxEstadoCuenta.estado==='revision'?'⏳':gxEstadoCuenta.estado==='incompleto'?'⚠️':gxEstadoCuenta.estado==='vencido'?'🚨':'⏳'} ${gxEstadoCuenta.estado_label}` : badgeText}</div>
          </div>
        </div>

        <div class="scrollable-content">
          ${proofHTML}
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

          <div class="glass-card loyalty-badge gx-index-loyalty" data-loyalty-state="${perdioRacha ? "lost" : "active"}">
            ${gxLoyaltyMarkHTML(loyaltyCount, loyaltyTarget, perdioRacha)}
            <div class="loyalty-content">
              <div class="loyalty-title">${loyaltyTitle}</div>
              <div class="gx-index-loyalty-caption">${loyaltyCaption}</div>
              <div class="loyalty-desc">${mensajeLealtad}</div>
            </div>
          </div>

          <div class="actions-group ${GX_PAYMENT_V2 ? "gx-payment-actions" : ""}">
            ${btnAccionHTML}
            <a href="${urlWA}" target="_blank" class="btn btn-wa ${GX_PAYMENT_V2 ? "gx-support-tertiary" : ""}">
              ${GX_PAYMENT_V2 ? '<span>¿Necesitas ayuda?</span><strong>Contactar a soporte</strong>' : '💬 Contactar a Soporte'}
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

  function mostrarToastPago(mensaje, error = false) {
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.textContent = mensaje;
    toast.classList.toggle("error", error);
    toast.classList.toggle("success", GX_PAYMENT_V2 && !error);
    toast.style.display = "block";
    clearTimeout(mostrarToastPago._timer);
    mostrarToastPago._timer = setTimeout(() => {
      toast.style.display = "none";
      toast.classList.remove("error","success");
    }, 2100);
  }

  async function copiarTextoSeguro(texto) {
    const limpio = String(texto || "").replace(/\D/g, "");
    if(!limpio) return false;

    if(window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(limpio);
        return true;
      } catch (_) {}
    }

    const area = document.createElement("textarea");
    area.value = limpio;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    area.style.fontSize = "16px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, area.value.length);

    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    area.remove();
    return ok;
  }

  async function copiarDatos() {
    const ok = await copiarTextoSeguro(CLABE_PAGO);
    mostrarToastPago(ok ? "✓ CLABE de Nu copiada" : "No se pudo copiar automáticamente", !ok);
  }

  function gxEsc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  /* R17-completar · SEGUIMIENTO DEL COMPROBANTE (port vanilla del
   * preview E1/B2, sin React/Animate UI: la oficial no los carga).
   * Misma información que el preview: fase, icono animado, nombre,
   * pista y 3 etapas. La fase la decide SOLO el estado vivo del
   * motor (pago_en_revision / pago_revision_estado / pago_incompleto
   * / período pagado); aquí no se calcula nada financiero.
   * review = comprobante recibido, en revisión.
   * correction = observación (incompleto o rechazado por Admin).
   * approved = comprobante validado y período pagado. */
  function gxProofTrackerHTML(phase, hintOverride) {
    const defs = {
      review: { name: "Recibimos tu comprobante", hint: "No lo envíes de nuevo.",
        progress: 66, steps: ["Recibido", "Validando", "Resultado"], completed: 1,
        icon: "clock" },
      correction: { name: "Hay una observación", hint: "Revisa los datos antes de enviarlo otra vez.",
        progress: 66, steps: ["Recibido", "Revisado", "Corregir"], completed: 1,
        icon: "x" },
      approved: { name: "Comprobante validado", hint: "El pago ya fue aplicado.",
        progress: 100, steps: ["Recibido", "Verificado", "Aplicado"], completed: 3,
        icon: "check" }
    };
    const def = defs[phase];
    if (!def) return "";
    const hint = String(hintOverride || "").trim() || def.hint;
    /* Iconos Lucide, mismas rutas que los componentes Animate UI del
     * preview (preview/experiencia-financiera-espejo/animate-ui-src/
     * icons/{clock,circle-x,circle-check}.tsx). El reloj anima su
     * manecilla con CSS (pausa con pestaña oculta y reduced-motion). */
    const icons = {
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="12" x2="16" y2="14" class="gx-index-proof-hand"/><line x1="12" y1="6" x2="12" y2="12"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>'
    };
    const currentLabel = def.steps[Math.min(def.steps.length - 1, def.completed)];
    const labels = def.steps.map((label, i) => {
      const cls = i < def.completed ? "is-reached"
        : (phase === "correction" && i === 2 ? "is-attention" : "");
      return '<span class="' + cls + '">' + gxEsc(label) + "</span>";
    }).join("");
    return '<section class="gx-index-proof gx-index-proof-' + phase + '" data-phase="' + phase + '" aria-label="Estado del comprobante">' +
      '<div class="gx-index-proof-head">' +
        '<div class="gx-index-proof-icon" aria-hidden="true">' + (icons[def.icon] || "") + "</div>" +
        '<div class="gx-index-proof-words">' +
          '<span class="gx-index-proof-eyebrow">COMPROBANTE</span>' +
          '<strong class="gx-index-proof-name">' + gxEsc(def.name) + "</strong>" +
          '<p class="gx-index-proof-hint">' + gxEsc(hint) + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="gx-index-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + def.progress + '" aria-label="Etapas completadas del comprobante" aria-valuetext="' + def.completed + " de 3 etapas; " + gxEsc(currentLabel) + '">' +
        '<span class="gx-index-progress-track"><span class="gx-index-progress-indicator" style="width:' + def.progress + '%"></span></span>' +
      "</div>" +
      '<div class="gx-index-progress-labels" aria-hidden="true">' + labels + "</div>" +
    "</section>";
  }

  /* R17-completar · JOYA DE LEALTAD (port vanilla del preview).
   * Anillo con una sección por pago del nivel (4 o 9, como los
   * milestones del preview) y estrella Lucide al centro con
   * respiración suave. Datos vivos: racha = pagos_efectivos del
   * motor; el nivel siguiente es 4 (Nivel 1) o 9 (Nivel 2).
   * Sin racha no hay joya: si no hay estado, se devuelve "". */
  function gxLoyaltyMarkHTML(count, target, lost) {
    const C = 2 * Math.PI * 40;
    const n = Math.max(1, Number(target) || 4);
    const filled = lost ? 0 : Math.max(0, Math.min(Number(count) || 0, n));
    const gap = 6;
    const segLen = Math.max(1, C / n - gap);
    let segs = "";
    for (let i = 0; i < n; i++) {
      segs += '<circle class="gx-index-loyalty-seg' + (i < filled ? " is-filled" : "") + '" cx="50" cy="50" r="40" stroke-dasharray="' + segLen.toFixed(2) + " " + (C - segLen).toFixed(2) + '" stroke-dashoffset="' + (-i * (segLen + gap)).toFixed(2) + '" transform="rotate(-90 50 50)"/>';
    }
    const star = '<span class="gx-index-loyalty-star" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg></span>';
    /* Corazón roto Lucide (HeartCrack), el mismo icono del preview
     * (animate-ui-native.bundle.js, lucide-react): la joya con
     * estrella es solo cuando la lealtad está viva; rota = corazón
     * roto, como en la beta. Ambos iconos viven en el DOM y el CSS
     * muestra uno u otro según .is-lost, así el adaptador B2 puede
     * cambiar el estado en vivo solo con la clase. */
    const heart = '<span class="gx-index-loyalty-heart" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12.409 5.824c-.702.792-1.15 1.496-1.415 2.166l2.153 2.156a.5.5 0 0 1 0 .707l-2.293 2.293a.5.5 0 0 0 0 .707L12 15"/><path d="M13.508 20.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.677.6.6 0 0 0 .818.001A5.5 5.5 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5z"/></svg></span>';
    const a11y = lost
      ? 'role="img" aria-label="Racha reiniciada"'
      : 'role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + filled + '" aria-label="Racha: ' + filled + " de " + n + ' pagos puntuales"';
    return '<div class="gx-index-loyalty-mark' + (lost ? " is-lost" : "") + '" ' + a11y + ">" +
      '<svg class="gx-index-loyalty-orbit" viewBox="0 0 100 100" aria-hidden="true">' +
        '<defs><linearGradient id="gx-index-loyalty-grad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#b79bf0"/><stop offset="1" stop-color="#7de4cf"/>' +
        "</linearGradient></defs>" + segs +
      "</svg>" + star + heart +
    "</div>";
  }

  function gxFormatoClabe(value) {
    return String(value || "").replace(/\D/g, "").replace(/(.{3})(?=.)/g, "$1 ");
  }

  function botonDatosPagoHTML() {
    if(!GX_PAYMENT_V2) {
      return '<button class="btn btn-copy" onclick="copiarDatos()">💳 Copiar CLABE de pago</button>';
    }
    return `
      <button class="btn gx-bank-trigger" type="button" onclick="abrirDatosPago()">
        <span class="gx-bank-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3.5 9.2 12 4l8.5 5.2M5.5 10.5v7m4.3-7v7m4.4-7v7m4.3-7v7M3.5 20h17"/></svg>
        </span>
        <span class="gx-bank-trigger-copy">
          <strong>Datos para transferir</strong>
          <small>Nu o Revolut</small>
        </span>
        <span class="gx-bank-trigger-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>
        </span>
      </button>
    `;
  }

  function botonComprobanteHTML(clienteKey, periodoStr, totalFinal, folio, nombre) {
    const action = `abrirModalPago('${clienteKey}', '${periodoStr}', '${Number(totalFinal).toFixed(2)}', '${folio}', '${nombre}')`;
    if(!GX_PAYMENT_V2) {
      return `
        <button class="btn btn-wa" style="background: rgba(46, 160, 67, 0.15); border-color: var(--success-green); color: var(--success-green); text-shadow: 0 0 10px rgba(46, 160, 67, 0.4);" onclick="${action}">
          📤 Ya realicé mi depósito
        </button>
      `;
    }
    return `
      <button class="btn gx-payment-primary" type="button" onclick="${action}">
        <span class="gx-payment-primary-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 4v10m-4-4 4 4 4-4M5 18.5h14"/></svg>
        </span>
        <span class="gx-payment-primary-copy">
          <strong>Ya realicé mi pago</strong>
          <small>Subir comprobante</small>
        </span>
        <span class="gx-payment-primary-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>
        </span>
      </button>
    `;
  }

  function renderCuentasPago() {
    const list = document.getElementById("gx-bank-list");
    const dots = document.getElementById("gx-wallet-dots");
    if(!list) return;

    list.innerHTML = CUENTAS_PAGO.map((cuenta,index) => {
      const id = gxEsc(cuenta.ID || `cuenta-${index}`);
      const label = gxEsc(cuenta.LABEL || cuenta.INSTITUTION || "Cuenta");
      const institucion = gxEsc(cuenta.INSTITUTION || cuenta.LABEL || "");
      const titular = gxEsc(cuenta.HOLDER || "");
      const clabeRaw = String(cuenta.CLABE || "").replace(/\D/g,"");
      const clabe = gxEsc(gxFormatoClabe(clabeRaw));
      const last4 = gxEsc(clabeRaw.slice(-4));

      return `
        <article class="gx-bank-card gx-wallet-card ${index===0 ? "is-active" : ""}" data-bank="${id}" data-index="${index}" tabindex="0" aria-label="${label}. Toca para ver datos" aria-pressed="false">
          <div class="gx-wallet-card-inner">
            <section class="gx-wallet-face gx-wallet-front">
              <div class="gx-wallet-orb" aria-hidden="true"></div>
              <div class="gx-wallet-brand-row">
                <div>
                  <strong class="gx-wallet-brand-name">${label}</strong>
                  <small>${institucion}</small>
                </div>
                <span class="gx-wallet-card-accent" aria-hidden="true"></span>
              </div>
              <div class="gx-wallet-front-bottom">
                <div>
                  <span>Cuenta de transferencia</span>
                  <strong>•••• ${last4}</strong>
                </div>
                <small>Toca para ver datos</small>
              </div>
            </section>

            <section class="gx-wallet-face gx-wallet-back">
              <div class="gx-wallet-back-head">
                <div>
                  <span>Datos de transferencia</span>
                  <strong>${label}</strong>
                </div>
              </div>

              <div class="gx-bank-beneficiary">
                <span>Beneficiario</span>
                <strong>${titular}</strong>
              </div>

              <div class="gx-bank-clabe-wrap">
                <div class="gx-bank-clabe">
                  <span>CLABE</span>
                  <strong>${clabe}</strong>
                </div>
                <button class="gx-clabe-copy" type="button" aria-label="Copiar CLABE de ${label}">
                  <span class="gx-copy-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path class="gx-copy-back" d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      <rect class="gx-copy-front" x="8" y="8" width="14" height="14" rx="2"/>
                      <path class="gx-copy-check" d="m6.8 12.4 3.2 3.2 7.2-7.2"/>
                    </svg>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </article>
      `;
    }).join("");

    if(dots) {
      dots.innerHTML = CUENTAS_PAGO.map((_,i)=>`<span class="${i===0 ? "is-active" : ""}"></span>`).join("");
    }

    const cards = [...list.querySelectorAll(".gx-wallet-card")];
    let raf = 0;

    const setActive = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const listRect = list.getBoundingClientRect();
        const center = listRect.left + listRect.width / 2;
        let activeIndex = 0;
        let best = Infinity;
        cards.forEach((card,i) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const dist = Math.abs(cardCenter - center);
          if(dist < best) { best = dist; activeIndex = i; }
        });
        cards.forEach((card,i)=>{
          card.classList.toggle("is-active", i===activeIndex);
          card.classList.toggle("is-before", i<activeIndex);
          card.classList.toggle("is-after", i>activeIndex);
        });
        dots?.querySelectorAll("span").forEach((dot,i)=>dot.classList.toggle("is-active", i===activeIndex));
      });
    };

    cards.forEach((card) => {
      let downX = 0;
      let downY = 0;
      let moved = false;

      card.addEventListener("pointerdown", e => {
        downX = e.clientX;
        downY = e.clientY;
        moved = false;
      });

      card.addEventListener("pointermove", e => {
        if(Math.abs(e.clientX-downX) > 8 || Math.abs(e.clientY-downY) > 8) moved = true;
      });

      const toggle = (event) => {
        if(event?.target?.closest(".gx-clabe-copy")) return;
        if(moved) return;
        card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", card.classList.contains("is-flipped") ? "true" : "false");
      };

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", e => {
        if(e.key==="Enter" || e.key===" ") {
          e.preventDefault();
          toggle(e);
        }
      });

      const copyBtn = card.querySelector(".gx-clabe-copy");
      copyBtn?.addEventListener("click", async e => {
        e.stopPropagation();
        await copiarClabePago(card.dataset.bank, copyBtn);
      });
    });

    list.addEventListener("scroll", setActive, {passive:true});
    requestAnimationFrame(setActive);
  }

  function abrirDatosPago() {
    const modal = document.getElementById("bank-modal");
    if(!modal || !pagoActualInfo?.monto) return;

    const amount = document.getElementById("gx-bank-amount");
    if(amount) amount.textContent = `$${Number(pagoActualInfo.monto || 0).toFixed(2)}`;

    renderCuentasPago();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  }

  function cerrarDatosPago(e, force = false, restoreScroll = true) {
    const modal = document.getElementById("bank-modal");
    if(!modal) return;
    if(force || !e || e.target === modal) {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden","true");
      if(restoreScroll) document.body.style.overflow = "auto";
    }
  }

  function seleccionarClabeVisible(card) {
    const target = card?.querySelector(".gx-bank-clabe strong");
    if(!target || !window.getSelection) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function copiarClabePago(accountId, btn) {
    const cuenta = CUENTAS_PAGO.find(x => String(x.ID) === String(accountId));
    if(!cuenta || !btn) return;

    const card = btn.closest(".gx-bank-card");
    const ok = await copiarTextoSeguro(cuenta.CLABE);

    if(!ok) {
      seleccionarClabeVisible(card);
      mostrarToastPago("No se pudo copiar · mantén presionada la CLABE", true);
      return;
    }

    document.querySelectorAll(".gx-clabe-copy.is-copied").forEach(node => {
      if(node !== btn) node.classList.remove("is-copied");
    });

    btn.classList.remove("is-copied");
    void btn.offsetWidth;
    btn.classList.add("is-copied");
    mostrarToastPago("✓ CLABE copiada");

    clearTimeout(btn._gxCopyTimer);
    btn._gxCopyTimer = setTimeout(() => {
      btn.classList.remove("is-copied");
    }, 1900);
  }

  document.addEventListener("keydown", (event) => {
    if(event.key === "Escape" && document.getElementById("bank-modal")?.classList.contains("show")) {
      cerrarDatosPago(null, true);
    }
  });

  // --- FLUJO DE SUBIDA DE COMPROBANTES --- //
  let pagoActualInfo = {};
  let gxPaymentCloseTimer = 0;

  function gxSetPaymentSubmitState(state = "idle") {
      const modal = document.getElementById("payment-modal");
      const btn = document.getElementById("btn-enviar-comprobante");
      if(!btn) return;

      const title = btn.querySelector(".gx-submit-title");
      const subtitle = btn.querySelector(".gx-submit-subtitle");
      btn.dataset.state = state;

      const labels = GX_PAYMENT_V2
        ? {
            idle:["Enviar comprobante",""],
            loading:["Enviando",""],
            success:["Comprobante enviado",""],
            error:["Reintentar",""]
          }
        : {
            idle:["📤 Enviar Comprobante Seguro",""],
            loading:["⏳ Encriptando y subiendo comprobante...",""],
            success:["✅ ¡Validación solicitada con éxito!",""],
            error:["📤 Enviar Comprobante Seguro",""]
          };

      const [main,sub] = labels[state] || labels.idle;
      if(title) title.textContent = main;
      if(subtitle) subtitle.textContent = sub;

      btn.disabled = state === "loading" || state === "success";
      modal?.classList.toggle("is-sending", state === "loading");
      modal?.classList.toggle("is-success", state === "success");
      modal?.classList.toggle("is-error", state === "error");
  }

  function abrirModalPago(clienteKey, periodo, monto, folio, nombre) {
      pagoActualInfo = { clienteKey, periodo, monto, folio, nombre };
      const modal = document.getElementById("payment-modal");
      if(!modal) return;

      clearTimeout(gxPaymentCloseTimer);
      gxSetPaymentSubmitState("idle");
      modal.classList.remove("is-closing");
      modal.setAttribute("aria-hidden","false");

      if(GX_PAYMENT_V2) {
          requestAnimationFrame(() => modal.classList.add("show"));
      } else {
          modal.classList.add("show");
      }

      document.body.style.overflow = "hidden";
  }

  function cerrarModalPago(e, force = false) {
      const modal = document.getElementById("payment-modal");
      if(!modal) return;
      const clickedOverlay = e?.target === modal || e?.target?.classList?.contains("modal-overlay");
      if(!(force || clickedOverlay)) return;

      modal.classList.remove("show");
      modal.classList.add("is-closing");
      modal.setAttribute("aria-hidden","true");
      document.body.style.overflow = "auto";

      clearTimeout(gxPaymentCloseTimer);
      if(GX_PAYMENT_V2) {
          gxPaymentCloseTimer = setTimeout(() => {
              reiniciarSubida();
              modal.classList.remove("is-closing");
          }, 320);
      } else {
          reiniciarSubida();
      }
  }

  function reiniciarSubida() {
      const input = document.getElementById("file-input");
      const preview = document.getElementById("preview-img");
      const modal = document.getElementById("payment-modal");
      const previewContainer = document.getElementById("preview-container");
      const uploadArea = document.getElementById("upload-area");
      const submit = document.getElementById("btn-enviar-comprobante");

      if(input) input.value = "";
      if(preview) preview.src = "";

      modal?.classList.remove("has-preview","is-sending","is-success","is-error");
      gxSetPaymentSubmitState("idle");

      if(!GX_PAYMENT_V2) {
          if(previewContainer) previewContainer.style.display = "none";
          if(uploadArea) uploadArea.style.display = "block";
          if(submit) submit.style.display = "none";
      }
  }

  function mostrarPreview(input) {
      if (!input.files || !input.files[0]) return;

      const file = input.files[0];
      if (!file.type.startsWith("image/")) {
          input.value = "";
          if(GX_PAYMENT_V2) {
              mostrarToastPago("Formato no compatible", true);
          } else {
              alert("Por favor, selecciona un archivo de imagen válido (Captura de pantalla o foto).");
          }
          return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
          const preview = document.getElementById("preview-img");
          const modal = document.getElementById("payment-modal");
          if(preview) preview.src = e.target.result;

          gxSetPaymentSubmitState("idle");

          if(GX_PAYMENT_V2) {
              modal?.classList.remove("is-error");
              modal?.classList.add("has-preview");
          } else {
              const previewContainer = document.getElementById("preview-container");
              const uploadArea = document.getElementById("upload-area");
              const submit = document.getElementById("btn-enviar-comprobante");
              if(previewContainer) previewContainer.style.display = "block";
              if(uploadArea) uploadArea.style.display = "none";
              if(submit) submit.style.display = "block";
          }
      };
      reader.readAsDataURL(file);
  }

  async function enviarComprobanteDiscord() {
      const input = document.getElementById("file-input");
      if (!input?.files?.[0]) {
          if(GX_PAYMENT_V2) {
              gxSetPaymentSubmitState("error");
              setTimeout(() => gxSetPaymentSubmitState("idle"), 1200);
          } else {
              alert("Debes adjuntar una captura de pantalla antes de enviar.");
          }
          return;
      }

      const file = input.files[0];
      gxSetPaymentSubmitState("loading");

      const { clienteKey, periodo, monto, folio, nombre } = pagoActualInfo;
      const formData = new FormData();
      formData.append("file", file, file.name);

      const colorDec = parseInt("00ff9d", 16);
      const payload = {
          embeds: [{
              title: "💰 COMPROBANTE SUBIDO DESDE LA APP WEB",
              description: `**Cliente:** ${nombre}\n**Folio:** ${folio}\n**Monto Esperado:** $${monto} MXN\n**Periodo:** ${periodo}\n\n*El cliente acaba de subir su captura de pantalla. Verifica el adjunto para acreditar su mes.*`,
              color: colorDec,
              timestamp: new Date().toISOString(),
              footer: { text: "GOXION Pay System" },
              image: { url: `attachment://${file.name}` }
          }]
      };

      formData.append("payload_json", JSON.stringify(payload));

      try {
          const response = await fetch(WEBHOOK_DISCORD, {
              method: "POST",
              body: formData
          });

          if(!response.ok) throw new Error(`HTTP ${response.status}`);

          gxSetPaymentSubmitState("success");

          setTimeout(() => {
              location.reload();
          }, GX_PAYMENT_V2 ? 1350 : 1500);

      } catch (error) {
          console.error("Error al enviar el archivo:", error);
          gxSetPaymentSubmitState("error");

          if(GX_PAYMENT_V2) {
              // El propio botón comunica el error; evitamos otra cápsula superpuesta.
          } else {
              alert("Ocurrió un pequeño error de red al subir la imagen. Por favor, intenta de nuevo o avísanos por WhatsApp.");
              gxSetPaymentSubmitState("idle");
          }
      }
  }

  cargarEstadoCuenta();