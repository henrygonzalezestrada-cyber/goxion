(() => {
    const ACTIVATION_URL = "https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/activar-cuenta-goxion";
    let gxActivationContext = null;
    let gxStageBusy = false;

    const reduceMotion26 = () =>
        Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const $ = id => document.getElementById(id);

    function gxDigits(value, max) {
        return String(value || '').replace(/\D/g, '').slice(0, max);
    }

    function gxActivationSetStatus(id, text = '', type = '') {
        const el = $(id);
        if (!el) return;
        el.textContent = text;
        el.classList.remove('is-error', 'is-ok');
        if (type) el.classList.add(type);
    }

    function gxActivationButtonLoading(button, loading, label) {
        if (!button) return;
        button.disabled = loading;
        button.classList.toggle('gx-activation-loading', loading);
        const span = button.querySelector('span');
        if (span && label) span.textContent = label;
    }

    function gxMeasureStage(stage, width) {
        if (!stage) return 360;
        const wasHidden = stage.hidden;
        const old = {
            position: stage.style.position,
            left: stage.style.left,
            top: stage.style.top,
            width: stage.style.width,
            visibility: stage.style.visibility,
            opacity: stage.style.opacity,
            pointerEvents: stage.style.pointerEvents,
            display: stage.style.display
        };
        stage.hidden = false;
        Object.assign(stage.style, {
            position: 'fixed',
            left: '-10000px',
            top: '0',
            width: `${Math.max(250, width - 44)}px`,
            visibility: 'hidden',
            opacity: '0',
            pointerEvents: 'none',
            display: 'block'
        });
        const h = Math.ceil(stage.scrollHeight || stage.getBoundingClientRect().height || 360);
        Object.assign(stage.style, old);
        stage.hidden = wasHidden;
        return h;
    }

    async function gxResizeForStage(stage) {
        const root = $('header-action-btn');
        if (!root || !root.classList.contains('gx-auth-flip-card') || !stage) return;

        const current = root.getBoundingClientRect();
        const contentHeight = gxMeasureStage(stage, current.width);
        const viewportMax = Math.max(410, window.innerHeight - 72);
        const targetHeight = Math.min(viewportMax, Math.max(410, contentHeight + 48));
        const targetTop = Math.max(36, Math.round((window.innerHeight - targetHeight) / 2));

        if (Math.abs(targetHeight - current.height) < 2 && Math.abs(targetTop - current.top) < 2) return;

        if (reduceMotion26() || !Element.prototype.animate) {
            root.style.height = `${targetHeight}px`;
            root.style.top = `${targetTop}px`;
            return;
        }

        const anim = root.animate([
            {height:`${current.height}px`, top:`${current.top}px`},
            {height:`${targetHeight}px`, top:`${targetTop}px`}
        ],{
            duration:300,
            easing:'cubic-bezier(.16,1,.3,1)',
            fill:'forwards'
        });
        await anim.finished.catch(() => {});
        root.style.height = `${targetHeight}px`;
        root.style.top = `${targetTop}px`;
        try { anim.cancel(); } catch(_) {}
    }

    async function gxSwitchStage(from, to, direction = 1) {
        if (!from || !to || from === to || gxStageBusy) return;
        gxStageBusy = true;

        const reduced = reduceMotion26() || !Element.prototype.animate;
        const enterX = 12 * direction;
        const exitX = -8 * direction;

        try {
            if (!reduced) {
                const out = from.animate([
                    {opacity:1, transform:'translate3d(0,0,0) scale(1)'},
                    {opacity:0, transform:`translate3d(${exitX}px,0,0) scale(.992)`}
                ],{
                    duration:155,
                    easing:'cubic-bezier(.4,0,.7,.2)',
                    fill:'forwards'
                });
                await out.finished.catch(() => {});
                /* Ocultamos ANTES de cancelar el fill, evitando que el
                   frame final reaparezca un instante en Safari. */
                from.hidden = true;
                try { out.cancel(); } catch(_) {}
            } else {
                from.hidden = true;
            }

            /* El destino nace invisible ANTES de quitar hidden.
               Antes ocurría al revés: Safari alcanzaba a pintarlo al 100%
               durante el resize y luego lo devolvíamos a opacity:0. */
            to.style.opacity = '0';
            to.style.transform = `translate3d(${enterX}px,0,0) scale(.992)`;
            to.style.willChange = 'transform, opacity';
            to.style.pointerEvents = 'none';
            to.hidden = false;

            const resizeTarget = to.closest?.('.gx-auth-stage') || to;

            if (reduced) {
                await gxResizeForStage(resizeTarget);
                to.style.opacity = '1';
                to.style.transform = 'translate3d(0,0,0) scale(1)';
            } else {
                /* Resize e entrada ocurren juntos. Ya no existe una
                   tarjeta vacía de ~300ms entre una etapa y la otra. */
                const resizePromise = gxResizeForStage(resizeTarget);
                const incoming = to.animate([
                    {opacity:0, transform:`translate3d(${enterX}px,0,0) scale(.992)`},
                    {opacity:1, transform:'translate3d(0,0,0) scale(1)'}
                ],{
                    duration:275,
                    easing:'cubic-bezier(.16,1,.3,1)',
                    fill:'both'
                });

                await Promise.all([
                    resizePromise,
                    incoming.finished.catch(() => {})
                ]);

                to.style.opacity = '1';
                to.style.transform = 'translate3d(0,0,0) scale(1)';
                try { incoming.cancel(); } catch(_) {}
            }

            to.style.pointerEvents = '';
            to.style.willChange = '';
            /* Se limpian en el siguiente frame cuando ya existe un estado
               pintado estable; así no hay salto al retirar los inline. */
            requestAnimationFrame(() => {
                if (!to.hidden) {
                    to.style.opacity = '';
                    to.style.transform = '';
                }
            });
        } finally {
            gxStageBusy = false;
        }
    }

    function gxResetActivationFlow() {
        gxActivationContext = null;
        const login = $('gx-auth-login-stage');
        const activation = $('gx-auth-activation-stage');
        const codeStep = $('gx-activation-step-code');
        const pinStep = $('gx-activation-step-pin');
        const success = $('gx-activation-success');

        if (login) login.hidden = false;
        if (activation) activation.hidden = true;
        if (codeStep) codeStep.hidden = false;
        if (pinStep) pinStep.hidden = true;
        if (success) success.hidden = true;

        ['gx-activation-id','gx-activation-code','gx-activation-pin','gx-activation-pin-confirm'].forEach(id => {
            const el = $(id); if (el) el.value = '';
        });
        if (typeof window.gxCleanupActivationFold === 'function') window.gxCleanupActivationFold();
        if (typeof window.gxSyncActivationCodeVisual === 'function') window.gxSyncActivationCodeVisual();
        if (typeof window.gxSyncFloatingLabels === 'function') window.gxSyncFloatingLabels();
        gxActivationSetStatus('gx-activation-code-status');
        gxActivationSetStatus('gx-activation-pin-status');
        $('gx-activation-progress-1')?.classList.add('is-active');
        $('gx-activation-progress-2')?.classList.remove('is-active');

        const b1 = $('gx-activation-validate');
        const b2 = $('gx-activation-finish');
        gxActivationButtonLoading(b1, false, 'Continuar');
        gxActivationButtonLoading(b2, false, 'Activar Mi Espacio');
    }

    window.gxOpenActivationFlow = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (gxStageBusy) return;

        const login = $('gx-auth-login-stage');
        const activation = $('gx-auth-activation-stage');
        if (!login || !activation) return;

        const loginId = $('login-id')?.value?.trim() || '';
        gxResetActivationFlow();
        if (loginId) $('gx-activation-id').value = loginId;
        if (typeof window.gxSyncFloatingLabels === 'function') window.gxSyncFloatingLabels();
        await gxSwitchStage(login, activation, 1);
        setTimeout(() => $('gx-activation-id')?.focus({preventScroll:true}), 60);
    };

    window.gxBackToLogin = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (gxStageBusy) return;
        const login = $('gx-auth-login-stage');
        const activation = $('gx-auth-activation-stage');
        if (!login || !activation) return;
        await gxSwitchStage(activation, login, -1);
    };

    window.gxValidateActivationCode = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const id = $('gx-activation-id')?.value?.trim() || '';
        const codeEl = $('gx-activation-code');
        const code = gxDigits(codeEl?.value, 6);
        if (codeEl) codeEl.value = code;

        if (!id) {
            gxActivationSetStatus('gx-activation-code-status','Escribe tu GOXION ID.','is-error');
            $('gx-activation-id')?.focus();
            return;
        }
        if (code.length !== 6) {
            gxActivationSetStatus('gx-activation-code-status','Tu código debe tener 6 dígitos.','is-error');
            codeEl?.focus();
            return;
        }

        const btn = $('gx-activation-validate');
        gxActivationSetStatus('gx-activation-code-status','');
        gxActivationButtonLoading(btn, true, 'Validando…');

        try {
            const response = await fetch(ACTIVATION_URL, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({accion:'validar_codigo',goxion_id:id,codigo:code}),
                cache:'no-store'
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.ok !== true) {
                throw new Error(data?.error || 'GOXION ID o código incorrecto.');
            }

            gxActivationContext = {
                goxion_id:String(data.goxion_id || id),
                codigo:code,
                nombre:String(data.nombre || '')
            };
            gxActivationSetStatus('gx-activation-code-status','');
            $('gx-activation-progress-2')?.classList.add('is-active');

            const codeStep = $('gx-activation-step-code');
            const pinStep = $('gx-activation-step-pin');
            if (typeof window.gxRunActivationConstellation === 'function') {
                await window.gxRunActivationConstellation(code);
            } else {
                gxActivationSetStatus('gx-activation-code-status','Código confirmado.','is-ok');
            }
            /* El escenario final permanece visible DURANTE el relevo.
               Así no reaparece un frame del formulario anterior antes
               de que entre el paso de PIN. */
            await gxSwitchStage(codeStep, pinStep, 1);
            if (typeof window.gxCleanupActivationFold === 'function') window.gxCleanupActivationFold();
            setTimeout(() => $('gx-activation-pin')?.focus({preventScroll:true}), 60);
        } catch (e) {
            gxActivationSetStatus('gx-activation-code-status', e?.message || 'No pudimos validar tu código.', 'is-error');
        } finally {
            gxActivationButtonLoading(btn, false, 'Continuar');
        }
    };

    window.gxActivationBackToCode = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (gxStageBusy) return;
        const codeStep = $('gx-activation-step-code');
        const pinStep = $('gx-activation-step-pin');
        $('gx-activation-progress-2')?.classList.remove('is-active');
        gxActivationSetStatus('gx-activation-pin-status');
        await gxSwitchStage(pinStep, codeStep, -1);
    };

    window.gxFinishActivation = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (!gxActivationContext) {
            gxActivationSetStatus('gx-activation-pin-status','Primero valida tu código.','is-error');
            return;
        }

        const pinEl = $('gx-activation-pin');
        const confirmEl = $('gx-activation-pin-confirm');
        const pin = gxDigits(pinEl?.value, 4);
        const confirm = gxDigits(confirmEl?.value, 4);
        if (pinEl) pinEl.value = pin;
        if (confirmEl) confirmEl.value = confirm;

        if (pin.length !== 4) {
            gxActivationSetStatus('gx-activation-pin-status','Tu PIN debe tener 4 dígitos.','is-error');
            pinEl?.focus();
            return;
        }
        if (pin !== confirm) {
            gxActivationSetStatus('gx-activation-pin-status','Los PIN no coinciden.','is-error');
            confirmEl?.focus();
            return;
        }

        const btn = $('gx-activation-finish');
        gxActivationSetStatus('gx-activation-pin-status','');
        gxActivationButtonLoading(btn, true, 'Activando…');

        try {
            const response = await fetch(ACTIVATION_URL, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    accion:'activar',
                    goxion_id:gxActivationContext.goxion_id,
                    codigo:gxActivationContext.codigo,
                    pin
                }),
                cache:'no-store'
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.ok !== true) {
                throw new Error(data?.error || 'No pudimos activar tu espacio.');
            }

            const finalId = String(data.goxion_id || gxActivationContext.goxion_id);
            gxActivationContext.goxion_id = finalId;
            const successId = $('gx-activation-success-id');
            if (successId) successId.textContent = `@${finalId}`;

            const pinStep = $('gx-activation-step-pin');
            const success = $('gx-activation-success');
            await gxSwitchStage(pinStep, success, 1);
        } catch (e) {
            gxActivationSetStatus('gx-activation-pin-status', e?.message || 'No pudimos activar tu espacio.', 'is-error');
        } finally {
            gxActivationButtonLoading(btn, false, 'Activar Mi Espacio');
        }
    };

    window.gxActivationGoLogin = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const id = gxActivationContext?.goxion_id || '';
        const login = $('gx-auth-login-stage');
        const activation = $('gx-auth-activation-stage');
        if (!login || !activation) return;
        await gxSwitchStage(activation, login, -1);
        if ($('login-id')) $('login-id').value = id;
        if ($('login-pin')) $('login-pin').value = '';
        if (typeof window.gxSyncFloatingLabels === 'function') window.gxSyncFloatingLabels();
        setTimeout(() => $('login-pin')?.focus({preventScroll:true}), 70);
    };

    // Entrada numérica limpia sin pelear con el teclado de iOS.
    ['gx-activation-code','gx-activation-pin','gx-activation-pin-confirm'].forEach(id => {
        const el = $(id);
        el?.addEventListener('input', () => {
            const max = id === 'gx-activation-code' ? 6 : 4;
            const clean = gxDigits(el.value, max);
            if (el.value !== clean) el.value = clean;
        }, {passive:true});
    });

    // Al cerrar o abrir Mi Espacio siempre se parte del login normal.
    const baseOpen = window.openAuthSheet;
    if (typeof baseOpen === 'function') {
        window.openAuthSheet = async function(...args) {
            gxResetActivationFlow();
            return await baseOpen.apply(this,args);
        };
    }
    const baseClose = window.closeAuthSheet;
    if (typeof baseClose === 'function') {
        window.closeAuthSheet = async function(...args) {
            const result = await baseClose.apply(this,args);
            gxResetActivationFlow();
            return result;
        };
    }

})();