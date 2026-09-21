(() => {
    const reduceMotion = () =>
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gxAuthUseLayoutMorph = () => {
        const ua = navigator.userAgent || '';
        return /AppleWebKit/i.test(ua) && !/(Chrome|Chromium|Edg|OPR)/i.test(ua);
    };

    function gxAuthCubicBezier(x1, y1, x2, y2) {
        const sample = (a1, a2, t) =>
            3 * (1 - t) * (1 - t) * t * a1 +
            3 * (1 - t) * t * t * a2 +
            t * t * t;
        const derivative = (a1, a2, t) =>
            3 * (1 - t) * (1 - t) * a1 +
            6 * (1 - t) * t * (a2 - a1) +
            3 * t * t * (1 - a2);

        return (progress) => {
            const x = Math.max(0, Math.min(1, progress));
            let t = x;
            for (let i = 0; i < 6; i++) {
                const dx = sample(x1, x2, t) - x;
                const d = derivative(x1, x2, t);
                if (Math.abs(d) < 1e-6) break;
                t -= dx / d;
                t = Math.max(0, Math.min(1, t));
            }
            return sample(y1, y2, t);
        };
    }

    function gxAuthAnimateGeometry(element, from, to, duration, easing) {
        let cancelled = false;
        let raf = 0;
        const ease = gxAuthCubicBezier(...easing);

        const finished = new Promise(resolve => {
            const start = performance.now();
            const radiusFrom = parseFloat(from.borderRadius) || 0;
            const radiusTo = parseFloat(to.borderRadius) || 0;
            const lerp = (a, b, p) => a + (b - a) * p;

            const frame = now => {
                if (cancelled) {
                    resolve();
                    return;
                }

                const linear = Math.min(1, Math.max(0, (now - start) / duration));
                const p = ease(linear);

                element.style.left = `${lerp(from.left, to.left, p)}px`;
                element.style.top = `${lerp(from.top, to.top, p)}px`;
                element.style.width = `${lerp(from.width, to.width, p)}px`;
                element.style.height = `${lerp(from.height, to.height, p)}px`;
                element.style.borderRadius = `${lerp(radiusFrom, radiusTo, p)}px`;

                if (linear < 1) {
                    raf = requestAnimationFrame(frame);
                } else {
                    resolve();
                }
            };

            raf = requestAnimationFrame(frame);
        });

        return {
            finished,
            cancel() {
                cancelled = true;
                if (raf) cancelAnimationFrame(raf);
            }
        };
    }

    /* =========================================================
       1) NAVIGATION // PRODUCTION
       Uses the approved production behavior:
       - instant active-class swap
       - one lightweight fadeIn on the incoming view
       - nav pill morph remains pure CSS
       No outgoing WAAPI animation, no queue, no page-scale.
       ========================================================= */

    window.switchTab = function(tabName) {
        if (!['inicio', 'catalogo', 'soporte'].includes(tabName)) return;

        ['inicio', 'catalogo', 'soporte'].forEach(name => {
            const btn = document.getElementById(`btn-tab-${name}`);
            const view = document.getElementById(`view-${name}`);

            if (btn) btn.classList.remove('active');
            if (view) view.classList.remove('active');
        });

        const activeBtn = document.getElementById(`btn-tab-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');

        if (tabName === 'inicio') {
            const key = typeof getCurrentClientKey === 'function'
                ? getCurrentClientKey()
                : '';

            const guestCard = document.getElementById('guest-action-card');
            if (guestCard) guestCard.style.display = key ? 'none' : 'block';

            if (key) {
                document.getElementById('view-inicio')?.classList.remove('active');
                document.getElementById('view-dashboard')?.classList.add('active');
            } else {
                document.getElementById('view-inicio')?.classList.add('active');
                document.getElementById('view-dashboard')?.classList.remove('active');
            }

            setTimeout(() => revealOnScroll?.(), 100);
        } else {
            document.getElementById('view-dashboard')?.classList.remove('active');

            const activeView = document.getElementById(`view-${tabName}`);
            if (activeView) activeView.classList.add('active');
        }

        if (tabName === 'catalogo') {
            setTimeout(() => completarMisionInteligente?.('catalogo'), 800);
        } else if (tabName === 'soporte') {
            setTimeout(() => completarMisionInteligente?.('soporte'), 800);
        }

        const bar = document.getElementById('sticky-client-bar');
        if (bar) bar.classList.remove('show');

        // Same behavior as production: page reset is independent of view animation.
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (tabName !== 'catalogo') {
            document.getElementById('floating-cart')?.classList.remove('show');
        } else {
            renderCartFloating?.();
        }

        actualizarBloqueoSoporte?.();
    };

    /* =========================================================
       2) ACTION BUTTON STATE MORPHS
       ========================================================= */
    function gxMorphActionButton(btn, text, state = 'busy', duration = 220) {
        if (!btn) return Promise.resolve();

        btn.classList.add('gx-action-morph');
        btn.classList.toggle('gx-action-busy', state === 'busy');
        btn.classList.toggle('gx-action-success', state === 'success');

        if (reduceMotion() || !Element.prototype.animate) {
            btn.innerHTML = `<span class="gx-action-label">${text}</span>`;
            return Promise.resolve();
        }

        const oldContent = btn.innerHTML;

        const out = btn.animate([
            { opacity: 1, transform: 'scale(1)' },
            { opacity: .15, transform: 'scale(.94)' }
        ], {
            duration: Math.round(duration * .42),
            easing: 'ease-in'
        });

        return out.finished.catch(() => {}).then(() => {
            btn.innerHTML = `<span class="gx-action-label">${text}</span>`;

            const incoming = btn.animate([
                { opacity: .15, transform: 'scale(.94)' },
                { opacity: 1, transform: 'scale(1)' }
            ], {
                duration: Math.round(duration * .58),
                easing: 'cubic-bezier(.16,1,.3,1)'
            });

            return incoming.finished.catch(() => {}).then(() => oldContent);
        });
    }

    const originalEnviarPedido = typeof enviarPedidoBase === 'function' ? enviarPedidoBase : null;
    if (typeof originalEnviarPedido === 'function') {
        window.enviarPedido = function(...args) {
            const btn = document.querySelector('#floating-cart .cart-btn');

            gxMorphActionButton(btn, '••• Procesando', 'busy', 180).then(() => {
                originalEnviarPedido.apply(this, args);

                const cart = document.getElementById('floating-cart');
                if (cart && btn) {
                    cart.classList.add('show');
                    gxMorphActionButton(btn, '✓ Pedido enviado', 'success', 220);

                    setTimeout(() => {
                        cart.classList.remove('show');
                        btn.classList.remove('gx-action-busy', 'gx-action-success');
                        btn.innerHTML = 'Enviar Pedido 📲';
                    }, 780);
                }
            });
        };
    }

    const originalSendSmartWA = typeof sendSmartWABase === 'function' ? sendSmartWABase : null;
    if (typeof originalSendSmartWA === 'function') {
        window.sendSmartWA = function(...args) {
            const selector = document.getElementById('issue-selector');
            const input = document.getElementById('smart-extra-input');
            const valid = selector?.value !== '' && Boolean(input?.value?.trim());

            if (!valid) return originalSendSmartWA.apply(this, args);

            const btn = document.getElementById('smart-action-btn');

            // Keep window.open synchronous so iOS never treats it as a blocked popup.
            const result = originalSendSmartWA.apply(this, args);

            gxMorphActionButton(btn, '✓ Solicitud preparada', 'success', 220);

            setTimeout(() => {
                if (btn) {
                    btn.classList.remove('gx-action-busy', 'gx-action-success');
                    btn.innerHTML = '📲 Enviar Solicitud a Soporte';
                }
            }, 1200);

            return result;
        };
    }

    /* =========================================================
       3) MI ESPACIO -> STABLE TRANSFORM
       No shared title motion. No emoji motion. No visual handoffs.
       ========================================================= */
    let gxAuthBusy = false;
    let gxAuthOpen = false;
    let gxAuthPlaceholder = null;
    let gxAuthOriginalParent = null;
    let gxAuthOriginalNextSibling = null;
    let gxAuthSourceRect = null;
    let gxAuthSourceStyle = null;
    let gxAuthBaseCardRect = null;
    let gxAuthResizeAnim = null;

    function gxAuthCardStyle() {
        return {
            backgroundColor: 'rgba(8,8,12,.88)',
            borderColor: 'rgba(0,242,254,.18)',
            borderRadius: '26px',
            boxShadow: '0 22px 64px rgba(0,0,0,.48), 0 0 28px rgba(0,242,254,.055)'
        };
    }

    function gxAuthReadSourceStyle(root) {
        const cs = getComputedStyle(root);
        return {
            backgroundColor: cs.backgroundColor,
            borderColor: cs.borderColor,
            borderRadius: cs.borderRadius,
            boxShadow: cs.boxShadow
        };
    }

    function gxAuthMeasureContentHeight(root, cardWidth) {
        const content = root.querySelector('.gx-auth-inline-content');
        if (!content) return 340;

        const old = {
            position: content.style.position,
            left: content.style.left,
            right: content.style.right,
            top: content.style.top,
            bottom: content.style.bottom,
            width: content.style.width,
            height: content.style.height,
            visibility: content.style.visibility,
            opacity: content.style.opacity,
            pointerEvents: content.style.pointerEvents
        };

        Object.assign(content.style, {
            position: 'fixed',
            left: '-10000px',
            right: 'auto',
            top: '0',
            bottom: 'auto',
            width: `${Math.max(250, cardWidth - 44)}px`,
            height: 'auto',
            visibility: 'hidden',
            opacity: '0',
            pointerEvents: 'none'
        });

        const h = Math.ceil(content.scrollHeight || content.getBoundingClientRect().height || 340);
        Object.assign(content.style, old);
        return h;
    }

    function gxAuthCardGeometry(root) {
        const width = Math.min(390, Math.max(310, window.innerWidth - 40));
        const contentHeight = gxAuthMeasureContentHeight(root, width);
        const naturalHeight = contentHeight + 48;
        const maxHeight = Math.max(390, window.innerHeight - 100);
        const height = Math.min(maxHeight, Math.max(410, naturalHeight));

        const left = Math.round((window.innerWidth - width) / 2);
        const top = Math.round(Math.max(52, (window.innerHeight - height) / 2));

        return { left, top, width, height };
    }

    function gxAuthCreatePlaceholder(root, rect) {
        const p = document.createElement('span');
        p.className = 'gx-auth-pill-placeholder';
        p.style.width = `${rect.width}px`;
        p.style.height = `${rect.height}px`;

        gxAuthOriginalParent = root.parentNode;
        gxAuthOriginalNextSibling = root.nextSibling;
        gxAuthOriginalParent.insertBefore(p, root);
        return p;
    }

    function gxAuthFlipData(sourceRect, cardRect) {
        return {
            sx: sourceRect.width / cardRect.width,
            sy: sourceRect.height / cardRect.height,
            dx: sourceRect.left - cardRect.left,
            dy: sourceRect.top - cardRect.top
        };
    }

    function gxAuthFlipMatrix(flip) {
        return `matrix(${flip.sx},0,0,${flip.sy},${flip.dx},${flip.dy})`;
    }

    function gxAuthInitialRadius(sourceStyle, flip) {
        const sourceRadius = parseFloat(sourceStyle.borderRadius) || 20;
        const rx = Math.max(1, sourceRadius / Math.max(flip.sx, .01));
        const ry = Math.max(1, sourceRadius / Math.max(flip.sy, .01));
        return `${rx}px / ${ry}px`;
    }

    function gxAuthPauseWave(paused) {
        try {
            if (typeof window.gxWaveSetPaused === 'function') {
                window.gxWaveSetPaused(paused);
            }
        } catch (_) {}
    }

    async function gxAuthResizeCardForRecovery(opening) {
        const root = document.getElementById('header-action-btn');
        const content = root?.querySelector('.gx-auth-inline-content');

        if (!root || !content || !gxAuthOpen) return;

        try { gxAuthResizeAnim?.cancel(); } catch (_) {}
        gxAuthResizeAnim = null;

        // Let the DOM settle after hidden was toggled.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const current = root.getBoundingClientRect();

        let targetHeight;
        let targetTop;

        if (opening) {
            const contentHeight = Math.ceil(content.scrollHeight || content.getBoundingClientRect().height);
            const needed = contentHeight + 48;
            const viewportMax = Math.max(420, window.innerHeight - 72);

            targetHeight = Math.min(viewportMax, Math.max(current.height, needed));
            targetTop = Math.max(36, Math.round((window.innerHeight - targetHeight) / 2));
        } else if (gxAuthBaseCardRect) {
            targetHeight = gxAuthBaseCardRect.height;
            targetTop = gxAuthBaseCardRect.top;
        } else {
            return;
        }

        if (Math.abs(targetHeight - current.height) < 2 && Math.abs(targetTop - current.top) < 2) {
            return;
        }

        if (!Element.prototype.animate || reduceMotion()) {
            root.style.height = `${targetHeight}px`;
            root.style.top = `${targetTop}px`;
            return;
        }

        gxAuthResizeAnim = root.animate([
            {
                top: `${current.top}px`,
                height: `${current.height}px`
            },
            {
                top: `${targetTop}px`,
                height: `${targetHeight}px`
            }
        ], {
            duration: 285,
            easing: 'cubic-bezier(.16,1,.3,1)',
            fill: 'forwards'
        });

        await gxAuthResizeAnim.finished.catch(() => {});

        // Commit final size before cancelling fill:forwards.
        root.style.top = `${targetTop}px`;
        root.style.height = `${targetHeight}px`;

        try { gxAuthResizeAnim.cancel(); } catch (_) {}
        gxAuthResizeAnim = null;
    }

    function gxAuthResetLoginExtras() {
        const recovery = document.getElementById('gx-pin-recovery');
        const status = document.getElementById('gx-pin-recovery-status');
        const btn = document.getElementById('gx-pin-recovery-btn');
        const pin = document.getElementById('login-pin');
        const eye = document.getElementById('gx-pin-eye-btn');

        if (recovery) recovery.hidden = true;
        document.getElementById('header-action-btn')?.classList.remove('gx-auth-recovery-open');
        if (status) status.textContent = '';
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Solicitar recuperación';
        }
        if (pin) pin.type = 'password';
        if (eye) {
            eye.classList.remove('is-visible');
            eye.setAttribute('aria-label', 'Mostrar PIN');
        }
    }

    window.gxAuthRootClick = function(event) {
        if (gxAuthOpen || gxAuthBusy) return;
        if (event?.target?.closest?.('.gx-auth-inline-content')) return;
        toggleAuth();
    };

    window.openAuthSheet = async function() {
        if (gxAuthBusy || gxAuthOpen) return;

        const root = document.getElementById('header-action-btn');
        const overlay = document.getElementById('auth-overlay');
        const pillLabel = root?.querySelector('.gx-auth-pill-label');
        const content = root?.querySelector('.gx-auth-inline-content');

        if (!root || !overlay || !pillLabel || !content) return;

        if (reduceMotion() || !Element.prototype.animate) {
            gxAuthOpen = true;
            overlay.classList.add('show');
            root.classList.add('gx-auth-login-visible');
            content.style.visibility = 'visible';
            content.style.opacity = '1';
            pillLabel.style.display = 'none';
            document.body.style.overflow = 'hidden';
            return;
        }

        gxAuthBusy = true;
        gxAuthResetLoginExtras();

        gxAuthSourceRect = root.getBoundingClientRect();
        gxAuthSourceStyle = gxAuthReadSourceStyle(root);

        const cardRect = gxAuthCardGeometry(root);
        gxAuthBaseCardRect = { ...cardRect };
        const cardStyle = gxAuthCardStyle();
        const flip = gxAuthFlipData(gxAuthSourceRect, cardRect);
        const inverse = gxAuthFlipMatrix(flip);
        const startRadius = gxAuthInitialRadius(gxAuthSourceStyle, flip);

        gxAuthPlaceholder = gxAuthCreatePlaceholder(root, gxAuthSourceRect);

        root.classList.add('gx-auth-flip-card');

        const useLayoutMorph = gxAuthUseLayoutMorph();

        Object.assign(root.style, {
            left: `${useLayoutMorph ? gxAuthSourceRect.left : cardRect.left}px`,
            top: `${useLayoutMorph ? gxAuthSourceRect.top : cardRect.top}px`,
            width: `${useLayoutMorph ? gxAuthSourceRect.width : cardRect.width}px`,
            height: `${useLayoutMorph ? gxAuthSourceRect.height : cardRect.height}px`,
            transformOrigin: '0 0',
            transform: useLayoutMorph ? 'none' : inverse,
            borderRadius: useLayoutMorph ? gxAuthSourceStyle.borderRadius : startRadius,
            backgroundColor: gxAuthSourceStyle.backgroundColor,
            borderColor: gxAuthSourceStyle.borderColor,
            boxShadow: 'none',
            willChange: useLayoutMorph
                ? 'left, top, width, height, border-radius, background-color'
                : 'transform, border-radius, background-color'
        });

        document.body.appendChild(root);

        // Keep the pill's own content out of the animation.
        pillLabel.style.opacity = '0';
        content.style.visibility = 'hidden';
        content.style.opacity = '0';
        content.style.pointerEvents = 'none';

        gxAuthPauseWave(true);
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

        void root.offsetWidth;

        const shape = useLayoutMorph
            ? gxAuthAnimateGeometry(root, {
                left: gxAuthSourceRect.left,
                top: gxAuthSourceRect.top,
                width: gxAuthSourceRect.width,
                height: gxAuthSourceRect.height,
                borderRadius: gxAuthSourceStyle.borderRadius
            }, {
                left: cardRect.left,
                top: cardRect.top,
                width: cardRect.width,
                height: cardRect.height,
                borderRadius: cardStyle.borderRadius
            }, 430, [.18,.86,.22,1])
            : root.animate([
                {
                    transform: inverse,
                    borderRadius: startRadius,
                    backgroundColor: gxAuthSourceStyle.backgroundColor,
                    borderColor: gxAuthSourceStyle.borderColor
                },
                {
                    transform: 'matrix(1,0,0,1,0,0)',
                    borderRadius: cardStyle.borderRadius,
                    backgroundColor: cardStyle.backgroundColor,
                    borderColor: cardStyle.borderColor
                }
            ], {
                duration: 430,
                easing: 'cubic-bezier(.18,.86,.22,1)',
                fill: 'forwards'
            });

        // Safari/WebKit: geometry is tweened manually, so color needs its own
        // short transition. Finish it early so the expanding surface already
        // reads as the dark login card instead of a large cyan pill.
        const colorMorph = useLayoutMorph
            ? root.animate([
                {
                    backgroundColor: gxAuthSourceStyle.backgroundColor,
                    borderColor: gxAuthSourceStyle.borderColor
                },
                {
                    backgroundColor: cardStyle.backgroundColor,
                    borderColor: cardStyle.borderColor
                }
            ], {
                duration: 165,
                easing: 'cubic-bezier(.16,1,.3,1)',
                fill: 'forwards'
            })
            : null;

        await Promise.allSettled([
            shape.finished,
            colorMorph?.finished || Promise.resolve()
        ]);

        // Commit the final card BEFORE showing any login UI.
        Object.assign(root.style, {
            left: `${cardRect.left}px`,
            top: `${cardRect.top}px`,
            width: `${cardRect.width}px`,
            height: `${cardRect.height}px`,
            transform: 'none',
            borderRadius: cardStyle.borderRadius,
            backgroundColor: cardStyle.backgroundColor,
            borderColor: cardStyle.borderColor,
            boxShadow: cardStyle.boxShadow,
            willChange: ''
        });
        try { shape.cancel(); } catch (_) {}
        try { colorMorph?.cancel(); } catch (_) {}

        root.classList.add('gx-auth-login-visible');
        content.style.visibility = 'visible';
        content.style.pointerEvents = 'auto';

        const contentIn = content.animate([
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 220,
            easing: 'cubic-bezier(.16,1,.3,1)',
            fill: 'forwards'
        });

        await contentIn.finished.catch(() => {});
        content.style.opacity = '1';
        content.style.transform = 'none';
        try { contentIn.cancel(); } catch (_) {}

        root.setAttribute('aria-expanded', 'true');
        gxAuthOpen = true;
        gxAuthBusy = false;
    };

    window.closeAuthSheet = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (gxAuthBusy || !gxAuthOpen) return;

        const root = document.getElementById('header-action-btn');
        const overlay = document.getElementById('auth-overlay');
        const pillLabel = root?.querySelector('.gx-auth-pill-label');
        const content = root?.querySelector('.gx-auth-inline-content');
        const destination = gxAuthPlaceholder?.getBoundingClientRect();

        if (!root || !overlay || !pillLabel || !content || !destination) return;

        if (reduceMotion() || !Element.prototype.animate) {
            overlay.classList.remove('show');
            content.style.visibility = '';
            content.style.opacity = '';
            pillLabel.style.display = '';
            gxAuthOpen = false;
            document.body.style.overflow = 'auto';
            return;
        }

        gxAuthBusy = true;

        try { gxAuthResizeAnim?.cancel(); } catch (_) {}
        gxAuthResizeAnim = null;

        const contentOut = content.animate([
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(6px)' }
        ], {
            duration: 130,
            easing: 'ease-in',
            fill: 'forwards'
        });

        await contentOut.finished.catch(() => {});
        content.style.visibility = 'hidden';
        content.style.pointerEvents = 'none';
        try { contentOut.cancel(); } catch (_) {}

        root.classList.remove('gx-auth-login-visible');

        const cardRect = root.getBoundingClientRect();
        const flip = gxAuthFlipData(destination, cardRect);
        const inverse = gxAuthFlipMatrix(flip);
        const endRadius = gxAuthInitialRadius(gxAuthSourceStyle, flip);

        const useLayoutMorph = gxAuthUseLayoutMorph();
        if (useLayoutMorph) {
            root.style.willChange = 'left, top, width, height, border-radius, background-color';
        }

        const shapeBack = useLayoutMorph
            ? gxAuthAnimateGeometry(root, {
                left: cardRect.left,
                top: cardRect.top,
                width: cardRect.width,
                height: cardRect.height,
                borderRadius: '26px'
            }, {
                left: destination.left,
                top: destination.top,
                width: destination.width,
                height: destination.height,
                borderRadius: gxAuthSourceStyle.borderRadius
            }, 390, [.22,.72,.18,1])
            : root.animate([
                {
                    transform: 'matrix(1,0,0,1,0,0)',
                    borderRadius: '26px',
                    backgroundColor: 'rgba(8,8,12,.88)',
                    borderColor: 'rgba(0,242,254,.18)'
                },
                {
                    transform: inverse,
                    borderRadius: endRadius,
                    backgroundColor: gxAuthSourceStyle.backgroundColor,
                    borderColor: gxAuthSourceStyle.borderColor
                }
            ], {
                duration: 390,
                easing: 'cubic-bezier(.22,.72,.18,1)',
                fill: 'forwards'
            });

        setTimeout(() => overlay.classList.remove('show'), 235);

        await shapeBack.finished.catch(() => {});

        // Exact source geometry before returning to header.
        Object.assign(root.style, {
            left: `${destination.left}px`,
            top: `${destination.top}px`,
            width: `${destination.width}px`,
            height: `${destination.height}px`,
            transform: 'none',
            borderRadius: gxAuthSourceStyle.borderRadius,
            backgroundColor: gxAuthSourceStyle.backgroundColor,
            borderColor: gxAuthSourceStyle.borderColor,
            boxShadow: gxAuthSourceStyle.boxShadow
        });
        try { shapeBack.cancel(); } catch (_) {}

        if (gxAuthOriginalParent && gxAuthPlaceholder) {
            gxAuthOriginalParent.insertBefore(root, gxAuthPlaceholder);
        } else if (gxAuthOriginalParent) {
            gxAuthOriginalParent.insertBefore(root, gxAuthOriginalNextSibling);
        }

        gxAuthPlaceholder?.remove();
        gxAuthPlaceholder = null;

        root.classList.remove('gx-auth-flip-card');
        root.removeAttribute('style');
        root.setAttribute('aria-expanded', 'false');

        pillLabel.style.opacity = '';
        content.removeAttribute('style');
        gxAuthResetLoginExtras();

        document.body.style.overflow = 'auto';
        gxAuthPauseWave(false);

        gxAuthBaseCardRect = null;
        gxAuthOpen = false;
        gxAuthBusy = false;
    };

    window.togglePinVisibility = function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        const pin = document.getElementById('login-pin');
        const btn = document.getElementById('gx-pin-eye-btn');
        if (!pin || !btn) return;

        const show = pin.type === 'password';
        pin.type = show ? 'text' : 'password';
        btn.classList.toggle('is-visible', show);
        btn.setAttribute('aria-label', show ? 'Ocultar PIN' : 'Mostrar PIN');
        pin.focus({ preventScroll: true });
    };

    window.openPinRecovery = async function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        const root = document.getElementById('header-action-btn');
        const recovery = document.getElementById('gx-pin-recovery');
        const status = document.getElementById('gx-pin-recovery-status');

        if (!root || !recovery || gxAuthBusy) return;

        const opening = recovery.hidden;

        recovery.hidden = !opening;
        root.classList.toggle('gx-auth-recovery-open', opening);

        if (status) status.textContent = '';

        await gxAuthResizeCardForRecovery(opening);
    };

    window.sendPinRecovery = function(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        const inputId = document.getElementById('login-id');
        const status = document.getElementById('gx-pin-recovery-status');
        const btn = document.getElementById('gx-pin-recovery-btn');
        const identificador = inputId?.value?.trim() || '';

        if (!identificador) {
            if (status) status.textContent = 'Escribe primero tu nombre o ID.';
            inputId?.focus({ preventScroll: false });
            return;
        }

        const message =
            `Hola, necesito recuperar mi acceso a GOXION.\n\n` +
            `Nombre o ID: ${identificador}\n` +
            `Motivo: Olvidé mi PIN de acceso.`;

        if (status) {
            status.textContent = 'Abriendo soporte seguro para solicitar tu recuperación…';
        }

        if (btn) {
            btn.textContent = 'Abrir soporte';
        }

        window.open(
            `https://wa.me/${NUMERO_GOXION}?text=${encodeURIComponent(message)}`,
            '_blank'
        );
    };

    window.closeAuthSheetEvent = function(event) {
        if (event.target?.id === 'auth-overlay') {
            window.closeAuthSheet(event);
        }
    };

    window.toggleAuth = function() {
        if (typeof getCurrentClientKey === 'function' && getCurrentClientKey()) {
            cerrarSesion?.();
        } else if (gxAuthOpen) {
            window.closeAuthSheet();
        } else {
            window.openAuthSheet();
        }
    };
})();