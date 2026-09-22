        window.gxPaymentHistoryMeta = function(p, context = {}) {
            const normalize = (value) => {
                if (typeof gxNormalizeUiText === 'function') return gxNormalizeUiText(value);
                return String(value ?? '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .trim();
            };

            const estado = normalize(p?.estado || '');
            const notas = normalize(p?.notas || '');
            const efecto = normalize(p?.lealtad_efecto || '');
            const explicitPunctual = typeof p?.puntual === 'boolean' ? p.puntual : null;
            const isLateText = /(mora|recargo|tarde|tardio|atras|vencid|fuera de fecha)/.test(notas);
            const isReview = /(revision|pendiente)/.test(estado) || /(revision)/.test(notas);
            const isPaid = /(pagado|aprobado|acreditado)/.test(estado);
            const storedStreak = Math.max(0, Number(context?.storedStreak || 0));

            if (isReview) {
                return {
                    label:'En revisión',
                    badgeClass:'review',
                    loyalty:'Lealtad pendiente',
                    loyaltyClass:'no',
                    status:'Revisión'
                };
            }

            if (efecto === 'reinicio') {
                return {
                    label:'Pago fuera de fecha',
                    badgeClass:'late',
                    loyalty:'Racha reiniciada',
                    loyaltyClass:'no',
                    status:'Acreditado'
                };
            }

            if (efecto === 'sin_cambio') {
                return {
                    label:'Pago acreditado',
                    badgeClass:'ontime',
                    loyalty:'Sin cambio de lealtad',
                    loyaltyClass:'no',
                    status:'Acreditado'
                };
            }

            if (efecto === 'sumo') {
                return {
                    label:'Pago en tiempo',
                    badgeClass:'ontime',
                    loyalty:'Sumó lealtad',
                    loyaltyClass:'yes',
                    status:'Acreditado'
                };
            }

            if (explicitPunctual === false || isLateText) {
                return {
                    label:isLateText ? 'Pago fuera de fecha' : 'Pago acreditado',
                    badgeClass:'late',
                    loyalty:context?.hadPriorPaid ? 'Racha reiniciada' : 'No sumó lealtad',
                    loyaltyClass:'no',
                    status:'Acreditado'
                };
            }

            if (explicitPunctual === true && isPaid) {
                return {
                    label:'Pago en tiempo',
                    badgeClass:'ontime',
                    loyalty:'Sumó lealtad',
                    loyaltyClass:'yes',
                    status:'Acreditado'
                };
            }

            if (isPaid) {
                // Compatibilidad con pagos anteriores al campo de auditoría:
                // si el último pago acreditado dejó la racha almacenada en 0,
                // nunca afirmamos que "sumó lealtad".
                if (context?.isLatestPaid === true && storedStreak === 0) {
                    return {
                        label:'Pago acreditado',
                        badgeClass:'late',
                        loyalty:context?.hadPriorPaid ? 'Racha reiniciada' : 'No sumó lealtad',
                        loyaltyClass:'no',
                        status:'Acreditado'
                    };
                }

                return {
                    label:'Pago en tiempo',
                    badgeClass:'ontime',
                    loyalty:'Sumó lealtad',
                    loyaltyClass:'yes',
                    status:'Acreditado'
                };
            }

            return {
                label:'Pago registrado',
                badgeClass:'review',
                loyalty:'Sin cambio de lealtad',
                loyaltyClass:'no',
                status:'Registrado'
            };
        };

        function renderDashboard(key) {
            const cliente = globalClientesData[key];

            if(!cliente) {
                console.error("GOXION: No se encontró el cliente para renderizar el dashboard.", key);
                return;
            }
            const primerNombre = String(cliente.nombre || "Cliente").trim().split(/\s+/)[0] || "Cliente";
            
            const dashName = document.getElementById('dash-name');
            if(dashName) dashName.innerText = primerNombre;
            
            const stickyName = document.getElementById('sticky-client-name');
            if (stickyName) stickyName.innerText = primerNombre;
            
            document.getElementById('header-btn-text').innerText = 'Cerrar Sesión';
            document.getElementById('tab-inicio-icon').innerText = '👤';
            document.getElementById('tab-inicio-text').innerText = 'Mi Espacio';

            iniciarSaludoDinamico(cliente.nombre);

            const gxEstadoCuenta = cliente.estado_cuenta || null;

            const gxNoServices = !Array.isArray(cliente.servicios) || cliente.servicios.length === 0;
            const gxNoPayments = !Array.isArray(cliente.historial_pagos) || cliente.historial_pagos.length === 0;
            const gxIsFreshGoxionClient = String(cliente.origen_cliente || '').toLowerCase() === 'goxion'
                && cliente.promo_nuevo_elegible === true
                && Boolean(String(cliente.usuario_acceso || '').trim());
            const gxShowNewClientOnboarding = gxIsFreshGoxionClient && gxNoServices && gxNoPayments;
            const gxOnboardingCard = document.getElementById('dash-onboarding-card');
            const gxBillingCard = document.getElementById('dash-billing-card');
            if(gxOnboardingCard) gxOnboardingCard.hidden = !gxShowNewClientOnboarding;
            if(gxBillingCard) gxBillingCard.hidden = gxShowNewClientOnboarding;

            const payAlert = document.getElementById('dash-payment-review-alert');
            if(payAlert) {
                const reviewState = String(cliente.pago_revision_estado || '').toLowerCase();
                const reviewMsg = cliente.pago_revision_mensaje || '';
                const missing = Number(cliente.pago_revision_monto_faltante || 0);
                if(reviewState === 'incompleto') {
                    payAlert.innerHTML = `<div class="gx-client-payment-alert warning"><span>⚠️</span><div><strong>Tu pago requiere corrección</strong><small>${reviewMsg || 'Detectamos un pago incompleto.'}${missing > 0 ? ` <b>Faltante: $${missing}</b>` : ''}</small></div></div>`;
                } else if(reviewState === 'rechazado') {
                    payAlert.innerHTML = `<div class="gx-client-payment-alert danger"><span>✕</span><div><strong>No pudimos validar tu comprobante</strong><small>${reviewMsg || 'Verifica los datos y vuelve a enviar tu comprobante.'}</small></div></div>`;
                } else if(cliente.pago_en_revision === true || reviewState === 'revision') {
                    payAlert.innerHTML = `<div class="gx-client-payment-alert review"><span>⏳</span><div><strong>Comprobante en revisión</strong><small>Ya recibimos tu pago. Te avisaremos cuando quede validado.</small></div></div>`;
                } else {
                    payAlert.innerHTML = '';
                }
            }

            const refContainer = document.getElementById('referral-section-container');
            
            let gamifConfig = cliente.gamificacion || { misiones_activas: false, descuento: 0, tareas: "" };
            let hasMissions = gamifConfig.misiones_activas;
            
            let refNombre = cliente.referido_activo ? cliente.referido_activo.nombre : "";
            let hasReferral = !!cliente.referido_activo;
            
            let btnRefHtml = ''; let expandedRefHtml = '';
            let btnCupHtml = ''; let expandedCupHtml = '';

            const missionVersion = Math.max(1, Number(gamifConfig.misiones_version || 1));
            const savedMissions = Array.isArray(gamifConfig.progreso)
                ? [...new Set(gamifConfig.progreso.map(x => Number(x.mision_index)).filter(Number.isInteger))]
                : [];

            if(hasReferral) {
                let serviciosRef = Array.isArray(cliente.referido_activo.servicios) ? cliente.referido_activo.servicios : [];
                let mesesRaw = Number(cliente.referido_activo.meses_efectivos ?? cliente.referido_activo.meses_override ?? cliente.referido_activo.meses ?? 0);
                let meses = Math.max(0, Math.min(mesesRaw, 3));
                let plats = serviciosRef.length || Number(cliente.referido_activo.plataformas || 0);
                let beneficioReclamado = cliente.referido_activo.beneficio_reclamado === true;
                let beneficioListo = plats >= 2 && meses >= 3;

                // --- NUEVO DISEÑO: MINIMALISMO FLOTANTE EN REFERIDOS ---
                let warningHTML = plats < 2
                    ? `<div style="color:var(--warning-amber); font-size:11px; text-align:center; margin-top:12px;">⚠️ Tu referido necesita al menos 2 servicios activos. Le falta ${Math.max(0, 2 - plats)}.</div>`
                    : '';

                let refSubtitle = "";
                let refSubtitleColor = "var(--neon-purple)";
                let refCardClass = "";

                if(beneficioReclamado) {
                    refSubtitle = `Mes gratis reclamado ✓ · ${plats} servicio${plats===1?'':'s'}`;
                    refSubtitleColor = "var(--success-green)";
                } else if(plats < 2 || meses < 1) {
                    refSubtitle = `${meses}/3 meses · ${plats} servicio${plats===1?'':'s'}`;
                    refSubtitleColor = "var(--warning-amber)";
                } else {
                    refSubtitle = `${meses}/3 meses · ${plats} servicios`;
                    refSubtitleColor = beneficioListo ? "var(--neon-blue)" : "var(--neon-purple)";
                    refCardClass = beneficioListo ? "gx-referral-ready" : "pulse-referral";
                }

                let claimMonthHTML = "";
                if(beneficioListo) {
                    claimMonthHTML = beneficioReclamado
                        ? `<button id="btn-claim-free-month" class="btn-primary gx-claim-done" disabled style="margin-top:20px;padding:14px;font-size:13px;">✅ Mes gratis reclamado</button>`
                        : `
                            <div style="text-align:center; color:var(--success-green); font-size:13px; font-weight:800; margin-top:20px; margin-bottom:10px;">🎉 ¡Ciclo cumplido!</div>
                            <button id="btn-claim-free-month" class="btn-primary" style="padding:14px;font-size:13px;" onclick="reclamarMesGratis('${cliente.nombre}', '${cliente.folio}', '${refNombre.replace(/'/g, "\\'")}')">🎁 Reclama tu mes gratis</button>
                          `;
                }

                const refProgressPct = beneficioReclamado ? 100 : Math.min(100, Math.round((Math.min(3, meses) / 3) * 100));
                const refStateText = beneficioReclamado
                    ? "Beneficio reclamado"
                    : beneficioListo
                        ? "Mes gratis disponible"
                        : (plats < 2 ? "Progreso pausado" : "En progreso");

                btnRefHtml = `
                    <div class="gamif-btn gx-gamif-card gx-gamif-card-ref ${refCardClass}" data-watermark="${beneficioReclamado ? '💝' : '🎁'}" onclick="openGamif('referral')">
                        <div class="gx-gamif-card-top">
                            <span class="gx-gamif-card-kicker">REFERIDOS</span>
                        </div>
                        <div class="gamif-title gx-referral-card-title">${refNombre || 'Tu referido'}</div>
                        <div id="gx-referral-status" class="gx-gamif-card-status" style="color:${refSubtitleColor};">${refStateText}</div>
                        <div class="gx-gamif-card-meta">${plats} servicio${plats===1?'':'s'} activo${plats===1?'':'s'} · ${meses}/3 meses</div>
                        <div class="gx-gamif-progress" data-progress="${refProgressPct}" aria-label="Progreso de referidos: ${refProgressPct}%">
                            <span style="width:${refProgressPct}%"></span>
                        </div>
                    </div>`;

                expandedRefHtml = `
                    <div class="gx-gamif-expanded-head"><button class="btn-gamif-close" onclick="closeGamif()"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button><span class="gx-gamif-expanded-kicker">GOXION REWARDS</span></div>

                    <div style="text-align:center; margin-bottom:25px; margin-top:5px;">
                        <div class="gx-gamif-shared-emoji ${beneficioListo && !beneficioReclamado ? 'shake-anim' : ''}" style="font-size:42px; margin-bottom:8px; display:inline-block; filter: drop-shadow(0 0 15px rgba(0,242,254,0.3));">${beneficioReclamado ? '💝' : '🎁'}</div>
                        <div class="gx-referral-name" style="font-size:18px; font-weight:800; color:#fff;">Tus Recompensas</div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Progreso de tu invitado: <span style="color:var(--text-main); font-weight:700;">${refNombre}</span></div>
                    </div>

                    <div style="display: flex; justify-content: space-around; margin-bottom: 25px;">
                        <div style="text-align:center;">
                            <div style="font-size:22px; font-weight:800; color:${plats < 2 ? 'var(--warning-amber)' : 'var(--neon-blue)'}; line-height:1;">${plats}</div>
                            <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Servicios</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:22px; font-weight:800; color:${beneficioListo ? 'var(--success-green)' : 'var(--neon-blue)'}; line-height:1;">${meses}/3</div>
                            <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Meses</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 30px;">
                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:12px; text-align:center;">Servicios Activos</div>
                        ${serviciosRef.length
                            ? `<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">${serviciosRef.map(s => `<span style="padding:6px 14px; border-radius:20px; background:rgba(0,242,254,0.05); border:1px solid rgba(0,242,254,0.2); color:var(--neon-blue); font-size:11px; font-weight:700;">✓ ${s}</span>`).join('')}</div>`
                            : `<div style="text-align:center; color:var(--warning-amber); font-size:11px;">Aún no hay servicios vinculados.</div>`}
                        <div style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:14px; opacity:0.6;">Sincronizado desde GOXION</div>
                    </div>

                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px; text-align:center;">Progreso al mes gratis</div>
                    <div class="loyalty-progress-bg" style="height:6px; background:rgba(255,255,255,0.05); border:none;">
                        <div class="loyalty-progress-fill" style="width:${Math.min((meses / 3) * 100,100)}%; background:${beneficioListo ? 'linear-gradient(90deg,#00f2fe,#00ff9d)' : 'linear-gradient(90deg,#7c4dff,#00f2fe)'}; box-shadow: 0 0 10px ${beneficioListo ? 'rgba(0,255,157,0.4)' : 'rgba(0,242,254,0.4)'};"></div>
                    </div>

                    ${warningHTML}
                    ${claimMonthHTML}

                    <div style="font-size:11px; color:var(--text-muted); margin-top:20px; text-align:center; cursor:pointer; text-decoration:underline;" onclick="openModal('modal-referidos')">Ver reglas del beneficio</div>`;
                // --- FIN DE NUEVO DISEÑO ---
            } else {
                let msgWhatsApp = `Hola, quiero unirme a GOXION. Vengo invitado por el cliente ${cliente.nombre} (${cliente.folio}).`;
                btnRefHtml = `
                    <div class="gamif-btn gx-gamif-card gx-gamif-card-ref" data-watermark="🫂" onclick="openGamif('referral')">
                        <div class="gx-gamif-card-top"><span class="gx-gamif-card-kicker">REFERIDOS</span></div>
                        <div class="gamif-title">Invita y gana</div>
                        <div class="gx-gamif-card-status">Empieza a referir</div>
                        <div class="gx-gamif-card-meta">Comparte GOXION y desbloquea beneficios</div>
                        <div class="gx-gamif-progress" data-progress="0" aria-label="Progreso de referidos: 0%"><span style="width:0%"></span></div>
                    </div>`;

                expandedRefHtml = `
                    <button class="btn-gamif-close" onclick="closeGamif()"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                    <div style="text-align:center;margin-bottom:15px;margin-top:-5px;">
                        <div class="gx-gamif-shared-emoji" style="font-size:38px;margin-bottom:5px;">🫂</div>
                        <div style="font-size:16px;font-weight:800;">Gana 1 Mes Gratis</div>
                        <div style="font-size:12px;color:var(--text-muted);line-height:1.4;margin-top:5px;">Invita a un amigo. Cuando contrate y cumpla 3 meses, ¡tu próxima mensualidad es 100% gratis!</div>
                    </div>
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <input type="text" readonly value="https://wa.me/${NUMERO_GOXION}?text=${encodeURIComponent(msgWhatsApp)}" class="input-smart" style="margin:0;padding:10px;font-size:10px;flex:1;color:var(--text-muted);" id="ref-link-input">
                        <button class="btn-primary" style="width:auto;padding:10px 15px;border-radius:12px;font-size:12px;" onclick="copiarEnlace()">📋 Copiar</button>
                    </div>
                    <button class="btn-primary" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white;box-shadow:0 0 15px rgba(37,211,102,.4);padding:14px;font-size:13px;" onclick="compartirAppGoxion('${msgWhatsApp}')">📲 Compartir por WhatsApp</button>
                    <div class="gx-referral-link-action" onclick="openModal('modal-referidos')"><span>Ver reglas del beneficio</span><svg class="gx-nav-arrow gx-nav-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg></div>`;
            }

            let tareasArr = gamifConfig.tareas ? gamifConfig.tareas.split('\n').filter(t => t.trim() !== '') : [];
            let allDoneInitial = tareasArr.length > 0 && tareasArr.every((_, idx) => savedMissions.includes(idx));
            const couponCycle = Math.max(1, Number(gamifConfig.cupon_ciclo || 1));
            const couponClaimedCycle = Math.max(0, Number(gamifConfig.cupon_reclamado_ciclo || 0));
            let couponClaimed = couponClaimedCycle >= couponCycle;

            /* Misma animación premium de Referidos mientras exista una ronda activa
               y todavía no se haya reclamado su beneficio. */
            let cupPulse = (hasMissions && !couponClaimed) ? 'gx-referral-ready' : '';
            let cupSubtitle = couponClaimed
                ? `<span style="color:var(--success-green);font-weight:800;">Cupón reclamado ✓</span>`
                : (allDoneInitial
                    ? `<span style="color:var(--neon-blue);font-weight:800;">¡Listo para reclamar!</span>`
                    : (hasMissions ? `<span style="color:var(--neon-blue);font-weight:bold;">¡Misiones activas!</span>` : `Sin tareas`));

            const missionTotal = Array.isArray(tareasArr) ? tareasArr.length : 0;
                const missionDone = Array.isArray(savedMissions)
                    ? tareasArr.reduce((total, _, idx) => total + (savedMissions.includes(idx) ? 1 : 0), 0)
                    : 0;
                const missionPct = missionTotal > 0
                    ? Math.min(100, Math.round((missionDone / missionTotal) * 100))
                    : 0;
                const missionClaimed = Boolean(couponClaimed);
                const missionReady = missionTotal > 0 && missionDone >= missionTotal;
                const missionState = missionClaimed
                    ? 'Beneficio aplicado'
                    : missionReady
                        ? 'Recompensa lista'
                        : (missionTotal > 0 ? `${missionDone} de ${missionTotal} completadas` : 'Sin tareas activas');

                btnCupHtml = `
                    <div class="gamif-btn gx-gamif-card gx-gamif-card-mission ${missionReady && !missionClaimed ? 'pulse-mission' : ''}" data-watermark="${missionClaimed ? '✅' : missionReady ? '🏆' : '🎯'}" onclick="openGamif('coupon')">
                        <div class="gx-gamif-card-top">
                            <span class="gx-gamif-card-kicker">MISIONES GOXION</span>
                        </div>
                        <div class="gamif-title">Tu progreso</div>
                        <div class="gx-gamif-card-status">${missionState}</div>
                        <div class="gx-gamif-card-meta">Recompensa: ${Number(gamifConfig.descuento || 0)}% OFF</div>
                        <div class="gx-gamif-progress" data-progress="${missionPct}" aria-label="Progreso de misiones: ${missionPct}%">
                            <span style="width:${missionPct}%"></span>
                        </div>
                    </div>`;

            if(hasMissions && tareasArr.length > 0) {
                let missionsHTML = '';
                tareasArr.forEach((tareaLine, idx) => {
                    let isDone = savedMissions.includes(idx);
                    
                    let smartType = ''; let param = '';
                    let cleanTarea = tareaLine;
                    
                    let tagMatch = tareaLine.match(/\[(.*?)\]/);
                    if (tagMatch) {
                        let fullTag = tagMatch[1];
                        cleanTarea = tareaLine.replace(tagMatch[0], '').trim();
                        
                        if (fullTag.toUpperCase().startsWith('LINK:')) {
                            smartType = 'link'; param = fullTag.substring(5).trim();
                        } else {
                            smartType = fullTag.toLowerCase();
                        }
                    }

                    let isSmart = (smartType !== '');
                    let extraIcon = '';
                    let clickAction = `onclick="toggleMission(${idx}, 'btn-claim-coupon', '${cliente.folio}')"`;

                    if (smartType === 'pago') {
                        extraIcon = '💳';
                        clickAction = isDone ? '' : `onclick="alert('🔒 ACCIÓN REQUERIDA:\\nDebes ir al menú principal y presionar el botón \\'Ver Estado de Cuenta y Pagar\\' para completar esta misión.')"`;
                    } else if (smartType === 'catalogo') {
                        extraIcon = '🛒';
                        clickAction = isDone ? '' : `onclick="alert('🔒 ACCIÓN REQUERIDA:\\nDebes visitar nuestra pestaña de \\'Catálogo\\' en la app para completarlo.')"`;
                    } else if (smartType === 'feedback') {
                        extraIcon = '💬';
                        clickAction = isDone ? '' : `onclick="openFeedbackModal(${idx}, '${cliente.folio}')"`;
                    } else if (smartType === 'link') {
                        extraIcon = '🔗';
                        clickAction = isDone ? '' : `onclick="abrirRedSocial(${idx}, '${cliente.folio}', '${param}')"`;
                    } else if (smartType === 'soporte') {
                        extraIcon = '🛠️';
                        clickAction = isDone ? '' : `onclick="alert('🔒 ACCIÓN REQUERIDA:\\nVisita la sección de \\'Soporte\\' para completarlo.'); switchTab('soporte');"`;
                    } else if (smartType === 'referidos') {
                        extraIcon = '🫂';
                        clickAction = isDone ? '' : `onclick="alert('🔒 ACCIÓN REQUERIDA:\\nRevisa tu panel de Referidos para completarlo.'); openGamif('referral');"`;
                     } else if (smartType === 'compartir') {
                        extraIcon = '📲';
                        clickAction = isDone ? '' : `onclick="compartirAppGoxion('Hola, quiero unirme a GOXION. Vengo invitado por el cliente ${cliente.nombre} (${cliente.folio}).')"`;
                    }

                    missionsHTML += `
                        <div class="mission-item ${isDone ? 'done' : ''} ${isSmart && !isDone ? 'locked' : ''}" id="mission-${idx}" data-type="${smartType}" ${clickAction}>
                            <div class="mission-checkbox">${isSmart && !isDone ? '🔒' : ''}</div>
                            <div class="gx-mission-text" style="flex:1;">${cleanTarea}</div>
                            ${extraIcon ? `<div style="font-size:16px; margin-left: 5px;">${extraIcon}</div>` : ''}
                        </div>`;
                });

                expandedCupHtml = `
                    <button class="btn-gamif-close" onclick="closeGamif()"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                    <div style="text-align: center; margin-bottom: 15px; margin-top: -5px;">
                        <div class="gx-gamif-shared-emoji ${couponClaimed ? '' : 'shake-anim'}" style="font-size: 38px; margin-bottom: 5px; display: inline-block;">${missionClaimed ? '✅' : missionReady ? '🏆' : '🎯'}</div>
                        <div style="font-size: 16px; font-weight: 800; color: var(--neon-blue);">¡Desbloquea ${gamifConfig.descuento}% OFF!</div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-top: 5px;">Completa las siguientes misiones para reclamar tu descuento especial:</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        ${missionsHTML}
                    </div>
                    ${couponClaimed
                        ? `<button id="btn-claim-coupon" class="btn-primary gx-claim-done" disabled style="padding:14px;font-size:13px;display:block;opacity:1;">✅ Ya has reclamado tu cupón</button>`
                        : `<button id="btn-claim-coupon" class="btn-primary" style="padding:14px;font-size:13px;display:${allDoneInitial ? 'block' : 'none'};opacity:${allDoneInitial ? '1' : '0'};transition:.3s;" onclick="reclamarCuponSilencioso('${cliente.nombre}', '${cliente.folio}', '${gamifConfig.descuento}')">✅ Aplicar Cupón del ${gamifConfig.descuento}%</button>`
                    }`;
            } else {
                expandedCupHtml = `
                    <button class="btn-gamif-close" onclick="closeGamif()"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                    <div style="text-align: center; margin-bottom: 15px; margin-top: -5px;">
                        <div class="gx-gamif-shared-emoji" style="font-size: 38px; margin-bottom: 5px; opacity: 0.5;">🎯</div>
                        <div style="font-size: 16px; font-weight: 800;">Sin misiones activas</div>
                        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-top: 5px;">Vuelve pronto. Constantemente lanzamos dinámicas para que interactúes y ahorres más.</div>
                    </div>`;
            }

            refContainer.innerHTML = `
                <div id="gamif-grid" class="gamification-grid">
                    ${btnRefHtml}
                    ${btnCupHtml}
                </div>
                <div id="gamif-expanded-referral" class="gamif-expanded-container slide-left">
                    ${expandedRefHtml}
                </div>
                <div id="gamif-expanded-coupon" class="gamif-expanded-container">
                    ${expandedCupHtml}
                </div>
            `;

            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const hoy = new Date();
            const diaPago = Number(gxEstadoCuenta?.dia_pago ?? cliente.dia_pago ?? 15);
            let difDias = gxEstadoCuenta
                ? (Number(gxEstadoCuenta.dias_atraso || 0) > 0 ? -Number(gxEstadoCuenta.dias_atraso || 0) : Number(gxEstadoCuenta.dias_para_corte || 0))
                : (diaPago - hoy.getDate());

            if(gxEstadoCuenta?.fecha_corte) {
                const corte = new Date(`${gxEstadoCuenta.fecha_corte}T12:00:00`);
                document.getElementById('dash-date').innerText = `${corte.getDate()} de ${meses[corte.getMonth()]}`;
            } else {
                document.getElementById('dash-date').innerText = `${diaPago} de ${meses[hoy.getMonth()]}`;
            }

            let badgeHTML = "";
            if(gxEstadoCuenta) {
                const st = String(gxEstadoCuenta.estado || "");
                const cls = st === "pagado" ? "badge-ok" :
                    st === "revision" ? "badge-review" :
                    st === "incompleto" ? "badge-today" :
                    st === "vencido" ? "badge-overdue" :
                    st === "vence_hoy" ? "badge-today" : "badge-ok";
                const icon = st === "pagado" ? "✨" :
                    st === "revision" ? "⏳" :
                    st === "incompleto" ? "⚠️" :
                    st === "vencido" ? "🚨" :
                    st === "vence_hoy" ? "⚠️" : "⏳";
                badgeHTML = `<div class="time-badge ${cls}">${icon} ${gxEstadoCuenta.estado_label || "Estado actualizado"}</div>`;
            } else {
                const dashboardReviewState = String(cliente.pago_revision_estado || '').toLowerCase();
                const dashboardEnRevision = cliente.pago_en_revision === true || dashboardReviewState === 'revision';
                if (dashboardEnRevision) badgeHTML = `<div class="time-badge badge-review">⏳ Pago en revisión</div>`;
                else if (cliente.estado === 'pagado') badgeHTML = `<div class="time-badge badge-ok">✨ Mensualidad Cubierta</div>`;
                else if (difDias > 0) badgeHTML = `<div class="time-badge badge-ok">⏳ Faltan ${difDias} día(s)</div>`;
                else if (difDias === 0) badgeHTML = `<div class="time-badge badge-today">⚠️ Vence HOY</div>`;
                else badgeHTML = `<div class="time-badge badge-overdue">🚨 Pago Vencido</div>`;
            }
            document.getElementById('dash-badge').innerHTML = badgeHTML;

            let pagos = gxEstadoCuenta ? Number(gxEstadoCuenta.lealtad?.pagos_efectivos || 0) : (cliente.pagos_puntuales || 0);
            let meta = 4;
            let beneficio = "3% OFF";

            if (pagos >= 4 && pagos < 9) {
                meta = 9;
                beneficio = "6% OFF";
            } else if (pagos >= 9) {
                meta = pagos;
                beneficio = "Nivel Máximo (6% OFF)";
            }

            document.getElementById('loyalty-count').innerText = `${pagos}/${meta} Pagos`;
            setTimeout(() => { document.getElementById('loyalty-bar').style.width = `${Math.min((pagos / meta) * 100, 100)}%`; }, 300);
            document.getElementById('loyalty-msg').innerText = pagos >= 9 ? "¡Felicidades! Disfrutas de tu Nivel 2." : `Acumula ${meta} pagos seguidos para obtener ${beneficio}.`;

            const accountLabel=document.querySelector('.gx-account-capsule-label');
            if(accountLabel) {
                accountLabel.textContent = gxEstadoCuenta
                    ? `${gxEstadoCuenta.total_label || 'Estado de cuenta'} · $${Number(gxEstadoCuenta.total_actual || 0).toFixed(2)}`
                    : 'Ver Estado de Cuenta';
            }

            let historyHTML = '';
            if(cliente.historial_pagos && cliente.historial_pagos.length > 0) {
                // mi-espacio ya entrega pagos del más reciente al más antiguo.
                const pagosHist = [...cliente.historial_pagos];

                const paidIndexes = pagosHist
                    .map((p,index) => (/(pagado|aprobado|acreditado)/.test(gxNormalizeUiText(p?.estado || '')) ? index : -1))
                    .filter(index => index >= 0);
                const latestPaidIndex = paidIndexes.length ? paidIndexes[0] : -1;
                const storedStreak = Math.max(0, Number(cliente.pagos_puntuales || 0));

                const money = (value) => Number(value || 0).toLocaleString('es-MX',{
                    style:'currency',
                    currency:'MXN',
                    minimumFractionDigits:2
                });

                historyHTML = `<div id="gx-payment-history-card" class="gx-payment-history-card">`;

                pagosHist.forEach((p,index) => {
                    const meta = window.gxPaymentHistoryMeta(p,{
                        isLatestPaid:index === latestPaidIndex,
                        hadPriorPaid:paidIndexes.some(paidIndex => paidIndex > index),
                        storedStreak
                    });

                    historyHTML += `
                        <div class="gx-payment-history-row ${index >= 3 ? 'gx-history-extra' : ''}">
                            <div class="gx-payment-history-dot"></div>

                            <div class="gx-payment-history-main">
                                <div class="gx-payment-history-date">${p.fecha || 'Pago registrado'}</div>
                                <div class="gx-payment-history-meta">
                                    <span class="gx-payment-history-badge ${meta.badgeClass}">${meta.label}</span>
                                    <span class="gx-payment-history-loyalty gx-loyalty-pill ${meta.loyaltyClass}">${meta.loyalty}</span>
                                </div>
                            </div>

                            <div>
                                <div class="gx-payment-history-amount">${money(p.monto)}</div>
                                <div class="gx-payment-history-status">${meta.status}</div>
                            </div>
                        </div>`;
                });

                if (pagosHist.length > 3) {
                    historyHTML += `
                        <button type="button" id="gx-history-toggle" class="gx-history-toggle" onclick="gxTogglePaymentHistory()">
                            Ver todos
                        </button>`;
                }

                historyHTML += `</div>`;
            } else {
                historyHTML = `
                    <div class="gx-dashboard-empty-card">
                        <strong>Aún no hay pagos registrados</strong>
                        <small>Tus próximos movimientos y constancia aparecerán aquí.</small>
                    </div>`;
            }

            document.getElementById('dash-history').innerHTML = historyHTML;

            let srvHTML = '';

            const serviceLogo = (name) => {
                const n = gxNormalizeUiText(name);

                if(n.includes('netflix')) return 'logos/netflix.PNG';
                if(n.includes('disney')) return 'logos/disney.PNG';
                if(n.includes('hbo') || n.includes('max')) return 'logos/hbo-max.PNG';
                if(n.includes('prime') || n.includes('amazon')) return 'logos/prime-video.PNG';
                if(n.includes('youtube')) return 'logos/youtube.PNG';
                if(n.includes('vix')) return 'logos/vix.PNG';
                if(n.includes('crunchy')) return 'logos/crunchyroll.PNG';
                if(n.includes('spotify')) return 'logos/spotify.PNG';
                if(n.includes('google')) return 'logos/google-one.PNG';
                if(n.includes('microsoft') || n.includes('365')) return 'logos/microsoft.PNG';

                return 'logo2.PNG';
            };

            if(cliente.servicios && cliente.servicios.length > 0) {
                cliente.servicios.forEach((s,idx) => {
                    const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
                    const cancellation = s.cancelacion || null;
                    const cancellationState = String(cancellation?.estado || '').toLowerCase();
                    const delivery = s.credencial_pendiente && s.credencial_pendiente.estado === 'pendiente'
                        ? s.credencial_pendiente
                        : null;

                    const serviceNotices = Array.isArray(s.novedades)
                        ? s.novedades.slice()
                        : [];

                    const cancellationNotice = cancellationState === 'aprobada'
                        ? {
                            id:`cancel-${cancellation?.id || s.id}-aprobada`,
                            tipo:'cancelacion_aprobada',
                            titulo:'Cancelación aprobada',
                            resumen:'Pendiente de baja efectiva',
                            prioridad:7,
                            created_at:cancellation?.resuelta_at || cancellation?.updated_at || cancellation?.created_at || ''
                        }
                        : cancellationState === 'rechazada'
                            ? {
                                id:`cancel-${cancellation?.id || s.id}-rechazada`,
                                tipo:'cancelacion_rechazada',
                                titulo:'Cancelación no autorizada',
                                resumen:'Puedes enviar una nueva solicitud',
                                prioridad:6,
                                created_at:cancellation?.resuelta_at || cancellation?.updated_at || cancellation?.created_at || ''
                            }
                            : cancellationState === 'solicitada'
                                ? {
                                    id:`cancel-${cancellation?.id || s.id}-solicitada`,
                                    tipo:'cancelacion_revision',
                                    titulo:'Cancelación en revisión',
                                    resumen:'Solicitud recibida por GOXION',
                                    prioridad:5,
                                    created_at:cancellation?.solicitada_at || cancellation?.created_at || ''
                                }
                                : null;

                    const combinedNotices = serviceNotices.slice();

                    if(cancellationNotice) {
                        combinedNotices.push(cancellationNotice);
                    }

                    if(delivery && !combinedNotices.some(n => String(n?.tipo || '').toLowerCase() === 'password')) {
                        combinedNotices.push({
                            id:`cred-${delivery.id}`,
                            tipo:'password',
                            titulo:'Nueva contraseña',
                            resumen:'Actualiza tu acceso',
                            prioridad:3,
                            created_at:delivery.created_at || delivery.disponible_desde || ''
                        });
                    }

                    combinedNotices.sort((a,b) =>
                        (Number(b.prioridad||0)-Number(a.prioridad||0)) ||
                        (new Date(b.created_at||0)-new Date(a.created_at||0))
                    );

                    const updateNotice = combinedNotices[0] || null;
                    const updateExtraCount = Math.max(0,combinedNotices.length-1);
                    const updateLabel = updateNotice
                        ? `${escape(updateNotice.titulo || 'Acceso actualizado')}${updateExtraCount ? ` +${updateExtraCount}` : ''}`
                        : '';
                    const updateType = String(updateNotice?.tipo || 'acceso').toLowerCase();
                    const updateKey = updateNotice
                        ? String(updateNotice.id || `${s.id}-${updateType}-${updateNotice.created_at || ''}`)
                        : '';

                    const updateBadgeHTML = updateNotice
                        ? `<span class="gx-service-update-badge gx-update-${escape(updateType)}" title="${escape(updateNotice.resumen || updateNotice.titulo || '')}">${updateLabel}</span>`
                        : '';

                    const credentialNoticeHTML = delivery ? `
                        <button type="button" class="gx-credential-notice" id="gx-credential-notice-${idx}" onclick="gxServiceView(${idx},'credential',event)">
                            <span class="gx-credential-notice-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                                    <rect x="5" y="10" width="14" height="10" rx="3"></rect>
                                    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"></path>
                                    <path d="M12 14v2"></path>
                                </svg>
                            </span>
                            <span class="gx-credential-notice-copy">
                                <strong>Nueva contraseña disponible</strong>
                                <small>${escape(delivery.plataforma || s.nombre)} · una sola consulta · requiere tu PIN</small>
                            </span>
                            <span class="gx-credential-notice-arrow"><svg class="gx-nav-arrow gx-nav-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg></span>
                        </button>` : '';

                    const cancellationOptionHTML = cancellation && ['solicitada','aprobada','rechazada'].includes(cancellationState)
                        ? `<button type="button" class="gx-cancel-link gx-cancel-open-state" onclick="gxServiceView(${idx},'cancel',event)">
                                <span>${cancellationState === 'rechazada' ? 'Solicitar de nuevo' : 'Ver cancelación'}</span>
                                <svg class="gx-nav-arrow gx-nav-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg>
                           </button>`
                        : `<button type="button" class="gx-cancel-link" onclick="gxServiceView(${idx},'cancel',event)"><span>Solicitar cancelación</span><svg class="gx-nav-arrow gx-nav-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg></button>`;

                    const cancelAdminNote = cancellation?.nota_admin
                        ? `<div class="gx-cancel-admin-note"><strong>Nota de GOXION</strong><br>${escape(cancellation.nota_admin)}</div>`
                        : '';

                    let cancellationPanelHTML = `
                        <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                        <h3>Solicitar cancelación</h3>
                        <p>Tu servicio continúa activo hasta que GOXION confirme la solicitud.</p>
                        <p class="gx-cancel-detail">Los cargos ya generados no cambian. Revisaremos tu solicitud antes de efectuar cualquier baja.</p>
                        <div class="gx-cancel-submit-zone">
                            <button type="button" class="gx-service-cancel-submit gx-action-morph" id="gx-service-cancel-submit-${idx}" onclick="gxSubmitServiceCancellation(${idx},event)"><span class="gx-action-label">Enviar solicitud</span></button>
                        </div>
                        <div class="gx-service-cancel-status" id="gx-service-cancel-status-${idx}" aria-live="polite"></div>`;

                    if(cancellationState === 'solicitada') {
                        cancellationPanelHTML = `
                            <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                            <h3>Cancelación en revisión</h3>
                            <p>Ya recibimos tu solicitud. Tu servicio permanece activo mientras revisamos la baja.</p>
                            <div class="gx-cancel-progress" aria-label="Solicitud recibida, revisión pendiente">
                                <span class="done"></span><i class="done"></i><span class="done"></span><i></i><span></span>
                            </div>
                            <div class="gx-cancel-state-card requested">
                                <strong>Estamos revisando tu solicitud</strong>
                                <small>No necesitas enviarla nuevamente. Te mostraremos aquí cuando haya una resolución.</small>
                            </div>
                            ${cancelAdminNote}`;
                    } else if(cancellationState === 'aprobada') {
                        const effectiveDate = cancellation?.fecha_efectiva
                            ? ` Fecha prevista: ${escape(cancellation.fecha_efectiva)}.`
                            : '';
                        cancellationPanelHTML = `
                            <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                            <h3>Cancelación aprobada</h3>
                            <p>La solicitud fue autorizada. El servicio seguirá disponible hasta que la baja sea marcada como efectiva.${effectiveDate}</p>
                            <div class="gx-cancel-progress" aria-label="Solicitud y revisión completadas">
                                <span class="success"></span><i class="success"></i><span class="success"></span><i class="success"></i><span></span>
                            </div>
                            <div class="gx-cancel-state-card approved">
                                <strong>Autorizada por GOXION</strong>
                                <small>Los cargos ya generados permanecen sin cambios. No es necesario volver a solicitar la cancelación.</small>
                            </div>
                            ${cancelAdminNote}`;
                    } else if(cancellationState === 'rechazada') {
                        cancellationPanelHTML = `
                            <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                            <h3>Solicitud no autorizada</h3>
                            <p>La solicitud anterior fue revisada y no se hizo efectiva. Tu servicio continúa activo.</p>
                            <div class="gx-cancel-state-card rejected">
                                <strong>La cancelación no fue aplicada</strong>
                                <small>Si tu situación cambió, puedes enviar una nueva solicitud para que la revisemos nuevamente.</small>
                            </div>
                            ${cancelAdminNote}
                            <div class="gx-cancel-submit-zone">
                                <button type="button" class="gx-cancel-retry gx-action-morph" id="gx-service-cancel-submit-${idx}" onclick="gxSubmitServiceCancellation(${idx},event)"><span class="gx-action-label">Enviar nueva solicitud</span></button>
                            </div>
                            <div class="gx-service-cancel-status" id="gx-service-cancel-status-${idx}" aria-live="polite"></div>`;
                    }

                    const credentialPanelHTML = delivery ? `
                        <div class="gx-service-subnav">
                            <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                            <div class="gx-credential-kicker">ACTUALIZACIÓN DE ACCESO · UNA SOLA VISTA</div>
                        </div>
                        <h3>Nueva contraseña disponible</h3>
                        <p>GOXION actualizó la contraseña de esta cuenta. Confirma tu PIN de Mi Espacio para verla.</p>
                        <div class="gx-one-time-warning">
                            Esta contraseña solo se mostrará una vez. Ten listo el dispositivo donde iniciarás sesión antes de continuar.
                        </div>
                        <div class="gx-credential-account">
                            <span>Cuenta de acceso</span>
                            <strong>${escape(delivery.cuenta_login || s.correo_login || 'Cuenta asignada')}</strong>
                        </div>
                        <div class="gx-credential-pin-wrap" id="gx-credential-auth-${idx}">
                            <label for="gx-credential-pin-${idx}">Confirma tu PIN de GOXION</label>
                            <div class="gx-credential-pin-row">
                                <input id="gx-credential-pin-${idx}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="••••">
                                <button type="button" class="gx-credential-reveal-btn" id="gx-credential-reveal-${idx}" onclick="gxRevealCredential(${idx},event)">Ver contraseña</button>
                            </div>
                        </div>
                        <div class="gx-credential-status" id="gx-credential-status-${idx}" aria-live="polite"></div>
                        <div class="gx-credential-result" id="gx-credential-result-${idx}" hidden>
                            <div class="gx-credential-result-label">Contraseña actualizada</div>
                            <div class="gx-credential-password" id="gx-credential-password-${idx}"></div>
                            <div class="gx-credential-result-actions">
                                <button type="button" id="gx-credential-copy-${idx}" onclick="gxCopyCredentialPassword(${idx})">Copiar contraseña</button>
                                <button type="button" onclick="gxFinishCredentialView(${idx},event)">Listo, ocultar</button>
                            </div>
                        </div>` : '';
                    const realAccesses = Array.isArray(s.accesos) ? s.accesos : [];
                    const invitationLabel = state => ({
                        activa:'Invitación activa',
                        enviada:'Invitación enviada',
                        pendiente:'Invitación pendiente',
                        revision:'En revisión',
                        sin_verificar:'Pendiente de configurar'
                    }[String(state || '').toLowerCase()] || 'Pendiente de configurar');
                    const accessRow = (label,value,copyLabel=label) => value
                        ? `<div class="gx-access-row"><div><span>${escape(label)}</span><strong>${escape(value)}</strong></div><button type="button" data-value="${escape(value)}" data-label="${escape(copyLabel)}" onclick="copiarDatoRapido(this.dataset.value,this.dataset.label)" aria-label="Copiar ${escape(copyLabel)}">Copiar</button></div>`
                        : '';
                    let credsHTML = '';

                    if(realAccesses.length) {
                        const normalizedNames = new Set(realAccesses.map(a => gxNormalizeUiText(a.servicio || s.nombre)));
                        const multiPlatform = normalizedNames.size > 1;
                        const multiAccess = realAccesses.length > 1;

                        credsHTML = realAccesses.map((a,aIdx) => {
                            const mode = String(a.modo_acceso || 'compartido').toLowerCase();
                            const sameName = gxNormalizeUiText(a.servicio || '') === gxNormalizeUiText(s.nombre || '');
                            let accessTitle = '';
                            if(multiPlatform || !sameName) accessTitle = a.servicio || `Acceso ${aIdx+1}`;
                            else if(multiAccess) accessTitle = `Acceso ${Number(a.ordinal || aIdx+1)}`;

                            const groupHead = (accessTitle || mode === 'invitacion')
                                ? `<div class="gx-access-group-head">${accessTitle ? `<strong>${escape(accessTitle)}</strong>` : '<strong>Acceso</strong>'}<span>${mode === 'invitacion' ? 'INVITACIÓN' : 'COMPARTIDO'}</span></div>`
                                : '';

                            const rows = [];
                            if(mode === 'invitacion') {
                                if(a.correo) rows.push(accessRow('Correo personal',a.correo,'Correo'));
                                rows.push(`<div class="gx-access-row gx-access-row-static"><div><span>Estado</span><strong>${escape(invitationLabel(a.estado_invitacion))}</strong></div></div>`);
                            } else {
                                if(a.correo) rows.push(accessRow('Correo',a.correo,'Correo'));
                                if(a.perfil_nombre) rows.push(accessRow('Perfil',a.perfil_nombre,'Perfil'));
                                if(a.perfil_pin) {
                                    const pinId=`gx-pin-${idx}-${aIdx}`;
                                    rows.push(`<div class="gx-access-row"><div><span>PIN del perfil</span><strong id="${pinId}">••••</strong></div><button type="button" data-pin="${escape(a.perfil_pin)}" aria-pressed="false" aria-label="Mostrar PIN" onclick="gxRevealServicePin(this,'${pinId}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>`);
                                }
                            }

                            if(!rows.length) {
                                rows.push(`<p class="gx-access-empty gx-access-empty-inline">${mode === 'invitacion' ? 'Falta configurar el correo de la cuenta personal.' : 'Este acceso todavía no tiene una cuenta asignada.'}</p>`);
                            }
                            return `<div class="gx-access-group">${groupHead}${rows.join('')}</div>`;
                        }).join('');
                    } else {
                        const legacy = [];
                        for (const [field,label] of [['correo_login','Correo'],['perfil_nombre','Perfil']]) {
                            if(s[field]) legacy.push(accessRow(label,s[field],label));
                        }
                        if(s.perfil_pin) legacy.push(`<div class="gx-access-row"><div><span>PIN del perfil</span><strong id="gx-pin-${idx}">••••</strong></div><button type="button" data-pin="${escape(s.perfil_pin)}" aria-pressed="false" aria-label="Mostrar PIN" onclick="gxRevealServicePin(this,${idx})"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>`);
                        credsHTML = legacy.length ? legacy.join('') : '<p class="gx-access-empty">¿Necesitas tus datos de acceso? Escríbenos desde Soporte.</p>';
                    }

                    srvHTML += `
                        <article class="gx-service-manage-card ${updateNotice ? 'gx-service-has-update' : ''}" id="gx-service-card-${idx}" ${updateNotice ? `data-gx-update-key="${escape(updateKey)}"` : ''}>
                            <button type="button" class="gx-service-summary" aria-expanded="false" onclick="gxToggleServiceCard(${idx})">
                                <img src="${serviceLogo(s.nombre)}" class="gx-service-logo-img" alt="${s.nombre}" onerror="this.src='logo2.PNG'">

                                <span>
                                    <span class="gx-service-name">${s.nombre}</span>
                                    <span class="gx-service-state-line">
                                        <span class="gx-service-state ${gxServiceHasAlert(s.nombre) ? 'gx-service-interrupted' : ''}">${gxServiceHasAlert(s.nombre) ? 'Temporalmente inactivo' : 'Activo'}</span>
                                        ${updateBadgeHTML}
                                    </span>
                                </span>

                                <span class="brand-expand-icon gx-service-expand-icon gx-chevron-motion" id="gx-service-chevron-${idx}" aria-hidden="true">
                                <svg class="gx-chevron-svg" viewBox="0 0 24 16" aria-hidden="true">
                                <path d="M3.2 4.2L12 11.3L20.8 4.2"></path>
                            </svg>
                            </span>
                            </button>

                            <div class="gx-service-expanded" id="gx-service-expanded-${idx}" hidden>
                                <div class="gx-service-divider"></div>

                                <div id="gx-service-home-${idx}" class="gx-service-home">
                                    ${credentialNoticeHTML}
                                    <div class="gx-access-heading">Tus accesos</div>
                                    ${credsHTML}
                                    <div class="gx-service-toolbar">
                                        <button type="button" class="gx-service-more" onclick="gxServiceView(${idx},'options',event)">Más opciones</button>
                                    </div>
                                </div>
                                <div id="gx-service-options-${idx}" class="gx-service-view" hidden>
                                    <button type="button" class="gx-service-back" onclick="gxServiceView(${idx},'home',event)"><svg class="gx-nav-arrow gx-nav-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg><span>Volver</span></button>
                                    <button type="button" class="gx-option-support" onclick="gxOpenServiceSupport(${idx},event)"><span>Soporte de la plataforma</span><svg class="gx-nav-arrow gx-nav-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 10.8h10.45l-3.55-3.55a1.1 1.1 0 0 1 1.56-1.56l5.43 5.43a1.1 1.1 0 0 1 0 1.56l-5.43 5.43a1.1 1.1 0 0 1-1.56-1.56l3.55-3.55H4.9a1.1 1.1 0 0 1 0-2.2Z"></path></svg></button>
                                    ${cancellationOptionHTML}
                                </div>
                                <div id="gx-service-cancel-${idx}" class="gx-service-view gx-cancellation-state-view" hidden>
                                    ${cancellationPanelHTML}
                                </div>
                                <div id="gx-service-retention-${idx}" class="gx-service-view gx-retention-view" hidden></div>
                                ${delivery ? `<div id="gx-service-credential-${idx}" class="gx-service-view gx-credential-view" hidden>${credentialPanelHTML}</div>` : ''}
                            </div>
                        </article>`;
                });
            } else {
                srvHTML = gxShowNewClientOnboarding
                    ? `<div class="gx-payment-history-card gx-first-service-empty"><strong>Tu primer servicio aparecerá aquí</strong><small>Explora el catálogo para comenzar.</small></div>`
                    : `<div class="gx-dashboard-empty-card"><strong>No tienes servicios activos</strong><small>Cuando contrates una plataforma, la podrás administrar aquí.</small></div>`;
            }

            document.getElementById('dash-services').innerHTML = srvHTML;
            requestAnimationFrame(()=>gxAnimateServiceUpdates());
        }


        function gxAnimateServiceUpdates() {
            document.querySelectorAll('.gx-service-manage-card[data-gx-update-key]').forEach(card=>{
                const key=String(card.dataset.gxUpdateKey||'').trim();
                if(!key) return;

                const storageKey=`goxion_service_notice_${key}`;
                let already=false;
                try { already=sessionStorage.getItem(storageKey)==='1'; } catch(_) {}
                if(already) return;

                card.classList.remove('gx-service-update-ping');
                void card.offsetWidth;
                card.classList.add('gx-service-update-ping');

                try { sessionStorage.setItem(storageKey,'1'); } catch(_) {}

                clearTimeout(card._gxUpdateTimer);
                card._gxUpdateTimer=setTimeout(()=>{
                    card.classList.remove('gx-service-update-ping');
                },1350);
            });
        }

        async function gxAcknowledgeServiceNotices(index) {
            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const servicio=key ? globalClientesData?.[key]?.servicios?.[index] : null;
            const token=localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || '';
            if(!servicio?.id || !token) return;

            const pending=(servicio.novedades||[]).some(n=>String(n?.tipo||'')!=='password');
            if(!pending) return;

            try {
                await fetch(GXCORE.endpoint("novedades-cliente"),{
                    method:'POST',
                    headers:{'Content-Type':'application/json','X-Client-Token':token},
                    body:JSON.stringify({
                        accion:'marcar_servicio',
                        datos:{cliente_servicio_id:servicio.id}
                    }),
                    cache:'no-store'
                });
            } catch(error) {
                console.warn('Novedades de servicio:',error);
            }
        }

        function gxRevealServicePin(button,target) {
            const show=button.getAttribute('aria-pressed')!=='true';
            const targetId=String(target || '').startsWith('gx-pin-') ? String(target) : `gx-pin-${target}`;
            const pinNode=document.getElementById(targetId);
            if(!pinNode) return;
            pinNode.textContent=show?button.dataset.pin:'••••';
            button.setAttribute('aria-pressed',String(show));
            button.setAttribute('aria-label',show?'Ocultar PIN':'Mostrar PIN');
        }
        function gxServiceView(index,view,event) {
            event?.preventDefault(); event?.stopPropagation();
            const card=document.getElementById(`gx-service-card-${index}`);
            if(!card || card.dataset.gxServiceMorphing==='1') return;
            if(view !== 'credential') gxDiscardCredentialReveal(index);
            for(const name of ['home','options','cancel','retention','credential']) {
                const el=document.getElementById(`gx-service-${name}-${index}`);
                if(el) el.hidden=name!==view;
            }
            const active=document.getElementById(`gx-service-${view}-${index}`);
            if(!active) return;
            if(!gxServiceReducedMotion()) active.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
            active.querySelector('button')?.focus({preventScroll:true});
        }

        function gxServiceHasAlert(name) {
            const raw=globalClientesData?._goxion_config?.alertas;
            const alerts=Array.isArray(raw)?raw:[raw];
            const normalize=value=>gxNormalizeUiText(value).replace(/[^a-z0-9]+/g,' ').trim();
            const service=normalize(name);
            return alerts.some(alert=>{
                if(alert?.activa!==true) return false;
                const platform=normalize(alert.plataforma);
                return platform==='todos los servicios' || platform==='todos' || (platform && (service===platform || service.startsWith(platform+' ')));
            });
        }
        function gxNormalizeUiText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g,'')
                .toLowerCase();
        }

        function gxTogglePaymentHistory() {
            const card = document.getElementById('gx-payment-history-card');
            const btn = document.getElementById('gx-history-toggle');
            if (!card || !btn) return;

            const open = !card.classList.contains('expanded');
            card.classList.toggle('expanded', open);
            btn.textContent = open ? 'Mostrar menos' : 'Ver todos';
        }

        function gxServiceReducedMotion() {
            return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        }

        function gxAnimateCatalogArrow(icon,open) {
            if (!icon || gxServiceReducedMotion() || typeof icon.animate !== 'function') return;

            icon.animate(open ? [
                {transform:'scale(.88) rotate(-25deg)'},
                {transform:'scale(1.08) rotate(8deg)',offset:.58},
                {transform:'scale(1) rotate(0deg)'}
            ] : [
                {transform:'scale(.90) rotate(22deg)'},
                {transform:'scale(1) rotate(0deg)'}
            ],{
                duration:open ? 420 : 300,
                easing:'cubic-bezier(.2,.82,.2,1)'
            });
        }

        function gxSetServiceCardState(card,index,open) {
            const summary = card.querySelector('.gx-service-summary');
            const body = document.getElementById(`gx-service-expanded-${index}`);
            const chevron = document.getElementById(`gx-service-chevron-${index}`);

            if(!open) {
                card.querySelectorAll('[data-pin]').forEach(button=>{button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Mostrar PIN');});
                const pin=document.getElementById(`gx-pin-${index}`); if(pin) pin.textContent='••••';
            }
            card.classList.toggle('expanded',open);
            if(summary) summary.setAttribute('aria-expanded',open ? 'true' : 'false');
            if(body) body.hidden = !open;
            if(chevron) chevron.classList.toggle('open',open);
        }

        function gxMorphServiceCard(card,index,open) {
            if (!card || card.dataset.gxServiceMorphing === '1') return;

            const body = document.getElementById(`gx-service-expanded-${index}`);
            const icon = document.getElementById(`gx-service-chevron-${index}`);
            const logo = card.querySelector('.gx-service-logo-img');
            if (!body) return;

            if (gxServiceReducedMotion() || typeof card.animate !== 'function') {
                gxSetServiceCardState(card,index,open);
                return;
            }

            card.dataset.gxServiceMorphing = '1';

            const startHeight = card.getBoundingClientRect().height;
            const previousTransition = card.style.transition;

            card.style.transition = 'none';
            card.style.height = 'auto';
            gxSetServiceCardState(card,index,open);
            const endHeight = card.getBoundingClientRect().height;

            card.style.height = `${startHeight}px`;
            card.style.overflow = 'hidden';
            void card.offsetHeight;

            const easing = 'cubic-bezier(.2,.82,.2,1)';
            const duration = open ? 540 : 430;

            const container = card.animate([
                {height:`${startHeight}px`},
                {height:`${endHeight}px`}
            ],{
                duration,
                easing,
                fill:'forwards'
            });

            const bodyAnim = body.animate(open ? [
                {opacity:0,transform:'translateY(-9px) scale(.987)'},
                {opacity:1,transform:'translateY(0) scale(1)'}
            ] : [
                {opacity:1,transform:'translateY(0) scale(1)'},
                {opacity:0,transform:'translateY(-6px) scale(.993)'}
            ],{
                duration:open ? 360 : 240,
                delay:open ? 90 : 0,
                easing,
                fill:'both'
            });

            if (logo && typeof logo.animate === 'function') {
                logo.animate(open ? [
                    {transform:'translateY(0) scale(1)'},
                    {transform:'translateY(-2px) scale(1.05)'}
                ] : [
                    {transform:'translateY(-2px) scale(1.05)'},
                    {transform:'translateY(0) scale(1)'}
                ],{
                    duration:open ? 460 : 360,
                    easing,
                    fill:'both'
                });
            }

            container.onfinish = () => {
                card.style.height = '';
                card.style.overflow = '';
                card.style.transition = previousTransition;
                delete card.dataset.gxServiceMorphing;

                try { container.cancel(); } catch (_) {}
                try { bodyAnim.cancel(); } catch (_) {}
            };
        }

        function gxToggleServiceCard(index) {
            const card = document.getElementById(`gx-service-card-${index}`);
            if (!card || card.dataset.gxServiceMorphing === '1') return;

            const opening = !card.classList.contains('expanded');

            if (opening) {
                document.querySelectorAll('.gx-service-manage-card.expanded').forEach(other => {
                    if (other !== card) {
                        const otherIndex = Number(String(other.id).split('-').pop());
                        gxSetServiceCardState(other,otherIndex,false);
                    }
                });
                setTimeout(()=>gxAcknowledgeServiceNotices(index),850);
            }

            gxMorphServiceCard(card,index,opening);
        }

        function gxSetInnerActionState(card,body,icon,open) {
            card.classList.toggle('expanded',open);
            card.querySelector('button[aria-expanded]')?.setAttribute('aria-expanded',open ? 'true' : 'false');

            if(body) {
                body.hidden = !open;
                body.setAttribute('aria-hidden',open ? 'false' : 'true');
            }
            if(icon) icon.textContent = open ? '×' : '⏷';
        }

        function gxMorphInnerAction(card,body,icon,open) {
            if (!card || !body || card.dataset.gxInnerMorphing === '1') return;

            if (gxServiceReducedMotion() || typeof card.animate !== 'function') {
                gxSetInnerActionState(card,body,icon,open);
                return;
            }

            card.dataset.gxInnerMorphing = '1';

            const startHeight = card.getBoundingClientRect().height;
            card.style.height = 'auto';
            gxSetInnerActionState(card,body,icon,open);
            const endHeight = card.getBoundingClientRect().height;

            card.style.height = `${startHeight}px`;
            card.style.overflow = 'hidden';
            void card.offsetHeight;

            const easing = 'cubic-bezier(.2,.82,.2,1)';

            const container = card.animate([
                {height:`${startHeight}px`},
                {height:`${endHeight}px`}
            ],{
                duration:open ? 420 : 330,
                easing,
                fill:'forwards'
            });

            const contentAnim = body.animate(open ? [
                {opacity:0,transform:'translateY(-7px) scale(.988)'},
                {opacity:1,transform:'translateY(0) scale(1)'}
            ] : [
                {opacity:1,transform:'translateY(0) scale(1)'},
                {opacity:0,transform:'translateY(-5px) scale(.994)'}
            ],{
                duration:open ? 260 : 180,
                delay:open ? 70 : 0,
                easing,
                fill:'both'
            });

            gxAnimateCatalogArrow(icon,open);

            container.onfinish = () => {
                card.style.height = '';
                card.style.overflow = '';
                delete card.dataset.gxInnerMorphing;

                try { container.cancel(); } catch (_) {}
                try { contentAnim.cancel(); } catch (_) {}
            };
        }

        function gxToggleServiceAccess(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const card = document.getElementById(`gx-service-access-card-${index}`);
            const body = document.getElementById(`gx-service-access-${index}`);
            const icon = document.getElementById(`gx-service-access-chevron-${index}`);
            if (!card || !body) return;

            gxMorphInnerAction(card,body,icon,!card.classList.contains('expanded'));
        }

        function gxToggleServiceMore(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const panel = document.getElementById(`gx-service-more-${index}`);
            const chevron = document.getElementById(`gx-service-more-chevron-${index}`);
            if (!panel) return;

            panel.hidden = !panel.hidden;
            if(chevron) chevron.textContent = panel.hidden ? '⌄' : '⌃';

            if(panel.hidden) {
                const cancelCard = document.getElementById(`gx-service-cancel-card-${index}`);
                const cancelBody = document.getElementById(`gx-service-cancel-${index}`);
                const cancelIcon = document.getElementById(`gx-service-cancel-chevron-${index}`);

                if(cancelCard && cancelBody && cancelCard.classList.contains('expanded')) {
                    gxSetInnerActionState(cancelCard,cancelBody,cancelIcon,false);
                }
            }
        }

        function gxToggleCancellationCard(index,event,forceOpen) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const card = document.getElementById(`gx-service-cancel-card-${index}`);
            const body = document.getElementById(`gx-service-cancel-${index}`);
            const icon = document.getElementById(`gx-service-cancel-chevron-${index}`);
            if (!card || !body) return;

            const open = typeof forceOpen === 'boolean'
                ? forceOpen
                : !card.classList.contains('expanded');

            gxMorphInnerAction(card,body,icon,open);
        }

        function gxSupportButtonForService(name) {
            const n = gxNormalizeUiText(name);
            const key = n.includes('hbo') || n.includes('max') ? 'max'
                : n.includes('prime') ? 'prime'
                : n.includes('netflix') ? 'netflix'
                : n.includes('disney') ? 'disney'
                : n.includes('youtube') ? 'youtube'
                : n.includes('vix') ? 'vix'
                : n.includes('crunchy') ? 'crunchy'
                : n.includes('spotify') ? 'spotify'
                : n.includes('google') ? 'google'
                : n.includes('microsoft') || n.includes('365') ? 'microsoft'
                : n.split(' ')[0];

            return [...document.querySelectorAll('#support-platforms-grid .platform-btn')]
                .find(btn => gxNormalizeUiText(btn.textContent).includes(key)) || null;
        }

        function gxOpenServiceSupport(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const key = typeof getCurrentClientKey === 'function' ? getCurrentClientKey() : '';
            const cliente = key ? globalClientesData?.[key] : null;
            const servicio = cliente?.servicios?.[index];
            if (!servicio) return;

            switchTab('soporte');

            setTimeout(() => {
                const btn = gxSupportButtonForService(servicio.nombre);
                if (btn) selectPlatform(servicio.nombre,btn,null);
            },420);
        }

        function gxCancellationActionState(button,state,label='') {
            if(!button) return;
            const span=button.querySelector('.gx-action-label');

            button.classList.remove('gx-action-loading','gx-action-success','gx-action-error');

            if(state==='loading') {
                button.disabled=true;
                button.classList.add('gx-action-loading');
                if(span) span.textContent='';
                button.setAttribute('aria-label','Registrando solicitud');
                return;
            }

            if(state==='success') {
                button.disabled=true;
                button.classList.add('gx-action-success');
                if(span) span.textContent='';
                button.setAttribute('aria-label','Solicitud registrada');
                return;
            }

            if(state==='error') {
                button.disabled=false;
                button.classList.add('gx-action-error');
                if(span) span.textContent=label || 'Reintentar';
                button.setAttribute('aria-label',label || 'Reintentar');
                return;
            }

            button.disabled=false;
            if(span) span.textContent=label || 'Enviar solicitud';
            button.setAttribute('aria-label',label || 'Enviar solicitud');
        }

        async function gxCancellationApi(accion,datos={}) {
            const token=localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || '';
            if(!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
            const r=await fetch(GXCORE.endpoint("cancelaciones-cliente"),{
                method:'POST',
                headers:{'Content-Type':'application/json','X-Client-Token':token},
                body:JSON.stringify({accion,datos}),
                cache:'no-store'
            });
            const data=await r.json().catch(()=>({}));
            if(!r.ok || data?.ok!==true) throw new Error(data?.error || 'No fue posible completar la operación.');
            return data;
        }

        function gxRetentionMoney(value) {
            const n=Number(value||0);
            return `$${n.toFixed(2)}`;
        }

        function gxRetentionEscape(value) {
            return String(value ?? '')
                .replace(/&/g,'&amp;')
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;')
                .replace(/'/g,'&#039;');
        }

        function gxRenderRetentionOffer(index,offer) {
            const panel=document.getElementById(`gx-service-retention-${index}`);
            if(!panel || !offer) return;

            const serviceName=String(offer.servicio_nombre || 'este servicio');
            const percent=Number(offer.porcentaje || 30);
            const base=Number(offer.monto_base || 0);
            const discount=Number(offer.monto_descuento || 0);
            const final=Number(offer.monto_final || Math.max(0,base-discount));

            panel.innerHTML=`
                <div class="gx-retention-stage">
                    <img class="gx-retention-logo" src="Logo individual.png" onerror="this.src='logo2.PNG'" alt="GOXION">
                    <span class="gx-retention-eyebrow">UNA OPCIÓN ANTES DE IRTE</span>
                    <h3>Nos gustaría que te quedaras</h3>
                    <p class="gx-retention-lead">Antes de cancelar <strong>${gxRetentionEscape(serviceName)}</strong>, podemos aplicar un beneficio automático en tu próximo pago.</p>

                    <div class="gx-retention-value">
                        <div class="gx-retention-percent">-${percent}%</div>
                        <div class="gx-retention-price">
                            <span>Próximo pago</span>
                            <strong>${gxRetentionMoney(final)}</strong>
                            <small>Precio habitual <s>${gxRetentionMoney(base)}</s> · ahorras ${gxRetentionMoney(discount)}</small>
                        </div>
                    </div>

                    <div class="gx-retention-rule">
                        <strong>Beneficio único de retención</strong>
                        <span>Solo puede aceptarse una vez en toda tu cuenta GOXION y se aplica únicamente a este servicio durante un periodo. Después vuelve a su precio habitual.</span>
                    </div>

                    <div class="gx-retention-actions">
                        <button type="button" class="gx-retention-accept" id="gx-retention-accept-${index}" onclick="gxAcceptRetention(${index},event)">
                            <span>Quedarme con -${percent}% OFF</span>
                        </button>
                        <button type="button" class="gx-retention-decline" id="gx-retention-decline-${index}" onclick="gxDeclineRetention(${index},event)">Continuar con la cancelación</button>
                    </div>

                    <div class="gx-retention-status" id="gx-retention-status-${index}" aria-live="polite"></div>
                </div>`;

            if(!gxServiceReducedMotion() && typeof panel.animate==='function') {
                panel.animate([
                    {opacity:0,transform:'translateY(11px) scale(.985)',filter:'blur(4px)'},
                    {offset:.58,opacity:1,transform:'translateY(-2px) scale(1.008)',filter:'blur(0)'},
                    {opacity:1,transform:'translateY(0) scale(1)',filter:'none'}
                ],{
                    duration:540,
                    easing:'cubic-bezier(.2,.82,.2,1)'
                });
            }
        }

        function gxRetentionButtonState(button,state,defaultLabel='') {
            if(!button) return;
            button.classList.remove('is-loading','is-success');
            const span=button.querySelector('span');

            if(state==='loading') {
                button.disabled=true;
                button.classList.add('is-loading');
                if(span) span.textContent='Aplicando beneficio…';
                return;
            }

            if(state==='success') {
                button.disabled=true;
                button.classList.add('is-success');
                if(span) span.textContent='';
                return;
            }

            button.disabled=false;
            if(span && defaultLabel) span.textContent=defaultLabel;
        }

        async function gxAcceptRetention(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const service=key ? globalClientesData?.[key]?.servicios?.[index] : null;
            const offer=service?._retentionOffer;
            const accept=document.getElementById(`gx-retention-accept-${index}`);
            const decline=document.getElementById(`gx-retention-decline-${index}`);
            const status=document.getElementById(`gx-retention-status-${index}`);
            if(!service || !offer?.id || !accept) return;

            const label=`Quedarme con -${Number(offer.porcentaje||30)}% OFF`;
            gxRetentionButtonState(accept,'loading',label);
            if(decline) decline.disabled=true;
            if(status) {
                status.className='gx-retention-status';
                status.textContent='';
            }

            try {
                const [data]=await Promise.all([
                    gxCancellationApi('aceptar_retencion',{oferta_id:offer.id}),
                    new Promise(resolve=>setTimeout(resolve,850))
                ]);

                gxRetentionButtonState(accept,'success',label);

                if(status) {
                    status.className='gx-retention-status success';
                    status.innerHTML=`<strong>Beneficio aplicado</strong><span>La cancelación no fue enviada. Ahorrarás ${gxRetentionMoney(data?.oferta?.monto_descuento || offer.monto_descuento)} en tu próximo pago de ${gxRetentionEscape(data?.oferta?.servicio_nombre || offer.servicio_nombre || service.nombre)}.</span>`;
                }

                if(navigator.vibrate) {
                    try { navigator.vibrate([18,40,28]); } catch(_) {}
                }

                setTimeout(async()=>{
                    try {
                        globalClientesData=await cargarPublicoOCliente();
                        cargarCatalogo(globalClientesData);
                        renderizarSoporteDinamico(globalClientesData);
                        const freshKey=typeof getCurrentClientKey==='function' ? (getCurrentClientKey() || key) : key;
                        if(freshKey && globalClientesData?.[freshKey]) renderDashboard(freshKey);
                    } catch(error) {
                        console.warn('Beneficio aplicado; actualización visual pendiente.',error);
                    }
                },1250);
            } catch(error) {
                gxRetentionButtonState(accept,'idle',label);
                if(decline) decline.disabled=false;
                if(status) {
                    status.className='gx-retention-status error';
                    status.textContent=error?.message || 'No pudimos aplicar el beneficio.';
                }
            }
        }

        async function gxDeclineRetention(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const service=key ? globalClientesData?.[key]?.servicios?.[index] : null;
            const offer=service?._retentionOffer;
            const accept=document.getElementById(`gx-retention-accept-${index}`);
            const decline=document.getElementById(`gx-retention-decline-${index}`);

            if(accept) accept.disabled=true;
            if(decline) {
                decline.disabled=true;
                decline.textContent='Continuando…';
            }

            if(offer?.id) {
                try {
                    await gxCancellationApi('rechazar_retencion',{oferta_id:offer.id});
                } catch(error) {
                    console.warn('No se pudo registrar el rechazo de retención.',error);
                }
            }

            if(service) delete service._retentionOffer;
            gxServiceView(index,'cancel',event);
            setTimeout(()=>gxCreateCancellationRequest(index),200);
        }

        async function gxCreateCancellationRequest(index) {
            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const cliente=key ? globalClientesData?.[key] : null;
            const servicio=cliente?.servicios?.[index];
            const status=document.getElementById(`gx-service-cancel-status-${index}`);
            const submit=document.getElementById(`gx-service-cancel-submit-${index}`);

            if(!cliente || !servicio || !status || !submit) return;

            gxCancellationActionState(submit,'loading');
            status.classList.remove('error');
            status.textContent='';

            try {
                const [data]=await Promise.all([
                    gxCancellationApi('crear',{
                        cliente_servicio_id:servicio.id,
                        motivo:'Solicitud desde Mi Espacio'
                    }),
                    new Promise(resolve=>setTimeout(resolve,900))
                ]);

                servicio.cancelacion={
                    ...(data.solicitud || {}),
                    cliente_servicio_id:servicio.id,
                    estado:String(data?.solicitud?.estado || 'solicitada')
                };

                gxCancellationActionState(submit,'success');

                status.innerHTML=data?.already_open
                    ? '<span style="color:#cdbfff;font-weight:800;">Solicitud en revisión.</span> No necesitas enviarla nuevamente.'
                    : '<span style="color:var(--success-green);font-weight:800;">✓ Solicitud registrada.</span> Tu servicio seguirá activo mientras la revisamos.';

                if(navigator.vibrate) {
                    try { navigator.vibrate([20,35,30]); } catch(_) {}
                }

                setTimeout(async()=>{
                    const currentPanel=document.getElementById(`gx-service-cancel-${index}`);
                    if(currentPanel && !gxServiceReducedMotion() && typeof currentPanel.animate==='function') {
                        try {
                            await currentPanel.animate([
                                {opacity:1,transform:'translateY(0) scale(1)'},
                                {opacity:0,transform:'translateY(-8px) scale(.992)'}
                            ],{
                                duration:280,
                                easing:'cubic-bezier(.4,0,.2,1)',
                                fill:'forwards'
                            }).finished;
                        } catch(_) {}
                    }

                    renderDashboard(key);
                    setTimeout(()=>{
                        gxToggleServiceCard(index);
                        setTimeout(()=>gxServiceView(index,'cancel'),560);
                    },60);
                },620);
            } catch(error) {
                gxCancellationActionState(submit,'error','Reintentar');
                status.classList.add('error');
                status.textContent=error?.message || 'No fue posible registrar la solicitud.';
            }
        }

        async function gxSubmitServiceCancellation(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const servicio=key ? globalClientesData?.[key]?.servicios?.[index] : null;
            const status=document.getElementById(`gx-service-cancel-status-${index}`);
            const submit=document.getElementById(`gx-service-cancel-submit-${index}`);

            if(!servicio || !status || !submit) return;

            gxCancellationActionState(submit,'loading');
            status.classList.remove('error');
            status.textContent='Revisando si tenemos un beneficio disponible para ti…';

            try {
                const [evaluation]=await Promise.all([
                    gxCancellationApi('evaluar_retencion',{cliente_servicio_id:servicio.id}),
                    new Promise(resolve=>setTimeout(resolve,650))
                ]);

                if(evaluation?.elegible===true && evaluation?.oferta?.id) {
                    servicio._retentionOffer=evaluation.oferta;
                    gxCancellationActionState(submit,'idle','Enviar solicitud');
                    status.textContent='';
                    gxRenderRetentionOffer(index,evaluation.oferta);
                    gxServiceView(index,'retention',event);
                    return;
                }
            } catch(error) {
                console.warn('Evaluación de retención no disponible; se continúa con la cancelación.',error);
            }

            await gxCreateCancellationRequest(index);
        }

        function gxDiscardCredentialReveal(index) {
            const password=document.getElementById(`gx-credential-password-${index}`);
            const result=document.getElementById(`gx-credential-result-${index}`);
            const input=document.getElementById(`gx-credential-pin-${index}`);
            if(password) password.textContent='';
            if(result) result.hidden=true;
            if(input) input.value='';

            const key=typeof getCurrentClientKey==='function' ? getCurrentClientKey() : '';
            const servicio=key ? globalClientesData?.[key]?.servicios?.[index] : null;
            if(servicio && !servicio.credencial_pendiente) {
                document.getElementById(`gx-credential-notice-${index}`)?.remove();
            }
        }

        async function gxRevealCredential(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const key = typeof getCurrentClientKey === 'function' ? getCurrentClientKey() : '';
            const cliente = key ? globalClientesData?.[key] : null;
            const servicio = cliente?.servicios?.[index];
            const delivery = servicio?.credencial_pendiente;
            const token = localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || '';
            const input = document.getElementById(`gx-credential-pin-${index}`);
            const button = document.getElementById(`gx-credential-reveal-${index}`);
            const status = document.getElementById(`gx-credential-status-${index}`);
            const result = document.getElementById(`gx-credential-result-${index}`);
            const passwordBox = document.getElementById(`gx-credential-password-${index}`);

            if(!delivery || !token || !input || !button || !status || !result || !passwordBox) return;
            const pin=String(input.value||'').trim();
            status.classList.remove('error');

            if(!/^\d{4}$/.test(pin)) {
                status.classList.add('error');
                status.textContent='Ingresa tu PIN de 4 dígitos para continuar.';
                input.focus();
                return;
            }

            button.disabled=true;
            button.textContent='Validando…';
            status.textContent='';

            try {
                const r=await fetch(GXCORE.endpoint("credenciales-cliente"),{
                    method:'POST',
                    headers:{
                        'Content-Type':'application/json',
                        'X-Client-Token':token
                    },
                    body:JSON.stringify({
                        accion:'revelar',
                        datos:{entrega_id:delivery.id,pin}
                    }),
                    cache:'no-store'
                });
                const data=await r.json().catch(()=>({}));
                if(!r.ok || data?.ok!==true || !data?.password) {
                    throw new Error(data?.error || 'No fue posible mostrar la contraseña.');
                }

                passwordBox.textContent=String(data.password);
                result.hidden=false;
                input.value='';
                input.disabled=true;
                button.hidden=true;
                status.textContent='Contraseña revelada. Al salir de esta vista se ocultará definitivamente.';

                delivery.estado='vista';
                delivery.vista_at=data.vista_at || new Date().toISOString();
                servicio.credencial_pendiente=null;
            } catch(error) {
                status.classList.add('error');
                status.textContent=error?.message || 'No fue posible mostrar la contraseña.';
                button.disabled=false;
                button.textContent='Ver contraseña';
            }
        }

        function gxCredentialCopyExperience(index) {
            const button=document.getElementById(`gx-credential-copy-${index}`);
            const result=document.getElementById(`gx-credential-result-${index}`);
            const password=document.getElementById(`gx-credential-password-${index}`);
            if(!button || !result || !password) return;

            const reduced=gxServiceReducedMotion();
            clearTimeout(button._gxCopyRestoreTimer);
            clearTimeout(result._gxCopyClearTimer);

            button.querySelectorAll('.gx-copy-spark').forEach(x=>x.remove());
            button.classList.remove('gx-copy-celebrate');
            result.classList.remove('gx-copy-success');
            password.classList.remove('gx-password-confirmed');
            void button.offsetWidth;

            button.dataset.gxOriginalText=button.dataset.gxOriginalText || 'Copiar contraseña';
            button.textContent='✓ Copiada';

            if(!reduced) {
                button.classList.add('gx-copy-celebrate');
                result.classList.add('gx-copy-success');
                password.classList.add('gx-password-confirmed');

                const angles=[0,60,120,180,240,300];
                angles.forEach((angle,i)=>{
                    const spark=document.createElement('span');
                    spark.className='gx-copy-spark';
                    spark.style.setProperty('--gx-copy-angle',`${angle}deg`);
                    spark.style.setProperty('--gx-copy-delay',`${i*18}ms`);
                    button.appendChild(spark);
                });
            }

            if(navigator.vibrate) {
                try { navigator.vibrate([22,28,35]); } catch(_) {}
            }

            button._gxCopyRestoreTimer=setTimeout(()=>{
                button.querySelectorAll('.gx-copy-spark').forEach(x=>x.remove());
                button.classList.remove('gx-copy-celebrate');
                button.textContent=button.dataset.gxOriginalText || 'Copiar contraseña';
            },1450);

            result._gxCopyClearTimer=setTimeout(()=>{
                result.classList.remove('gx-copy-success');
                password.classList.remove('gx-password-confirmed');
            },1250);
        }

        async function gxCopyCredentialPassword(index) {
            const password=document.getElementById(`gx-credential-password-${index}`)?.textContent || '';
            const status=document.getElementById(`gx-credential-status-${index}`);
            if(!password) return;
            try {
                await navigator.clipboard.writeText(password);
                if(status) {
                    status.classList.remove('error');
                    status.textContent='✓ Copiada. Ya puedes pegarla en la plataforma.';
                }
                gxCredentialCopyExperience(index);
            } catch {
                if(status) {
                    status.classList.add('error');
                    status.textContent='No pudimos copiarla automáticamente. Mantén presionada la contraseña para copiarla.';
                }
            }
        }

        function gxFinishCredentialView(index,event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            gxDiscardCredentialReveal(index);
            document.getElementById(`gx-credential-notice-${index}`)?.remove();
            gxServiceView(index,'home',event);
        }
