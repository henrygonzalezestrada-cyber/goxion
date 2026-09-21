(() => {
    let gxGamifMorphing = false;
    let gxActiveGamifType = null;

    const gxReduceMotion = () =>
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gxWait = ms => new Promise(resolve => setTimeout(resolve, ms));

    function gxGetParts(type) {
        const grid = document.getElementById('gamif-grid');
        const refPanel = document.getElementById('gamif-expanded-referral');
        const cupPanel = document.getElementById('gamif-expanded-coupon');
        const panel = type === 'referral' ? refPanel : cupPanel;
        const otherPanel = type === 'referral' ? cupPanel : refPanel;
        const source = grid?.querySelector(type === 'referral' ? '.gx-gamif-card-ref' : '.gx-gamif-card-mission');
        return { grid, refPanel, cupPanel, panel, otherPanel, source, host: grid?.parentElement || null };
    }

    function gxRectStyles(el, rect) {
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
    }

    function gxCreateGhost(source, rect) {
        const ghost = source.cloneNode(true);
        ghost.removeAttribute('onclick');
        ghost.removeAttribute('id');
        ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        ghost.classList.add('gx-gamif-morph-ghost');
        ghost.setAttribute('aria-hidden', 'true');
        gxRectStyles(ghost, rect);
        ghost.style.opacity = '1';
        document.body.appendChild(ghost);
        return ghost;
    }

    function gxCreateSurface(panel, rect) {
        const cs = getComputedStyle(panel);
        const surface = document.createElement('div');
        surface.className = 'gx-gamif-morph-surface';
        gxRectStyles(surface, rect);
        surface.style.backgroundColor = cs.backgroundColor;
        surface.style.border = cs.border;
        surface.style.borderColor = cs.borderColor;
        surface.style.borderRadius = cs.borderRadius;
        surface.style.boxShadow = cs.boxShadow;
        surface.style.backdropFilter = cs.backdropFilter;
        surface.style.webkitBackdropFilter = cs.webkitBackdropFilter;
        surface.style.opacity = '1';
        document.body.appendChild(surface);
        return surface;
    }

    function gxSourceEmojiMetrics(source, suppliedRect = null) {
        const rect = suppliedRect || source.getBoundingClientRect();
        const pseudo = getComputedStyle(source, '::before');
        const fontSize = parseFloat(pseudo.fontSize) || 104;
        const opacity = parseFloat(pseudo.opacity);
        const right = parseFloat(pseudo.right);

        // Exact center of the watermark used by the real card CSS.
        const rightEdge = rect.right - (Number.isFinite(right) ? right : -8);
        return {
            text: source.dataset.watermark || '✨',
            left: rightEdge - fontSize * 0.50,
            top: rect.top + rect.height * 0.51,
            fontSize,
            opacity: Number.isFinite(opacity) ? opacity : 0.14,
            rotation: -14,
            scale: 1.04
        };
    }

    function gxTargetEmojiMetrics(target) {
        const rect = target.getBoundingClientRect();
        const cs = getComputedStyle(target);
        const fontSize = parseFloat(cs.fontSize) || 40;
        const opacity = parseFloat(cs.opacity);
        return {
            text: target.textContent.trim() || '✨',
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
            fontSize,
            opacity: Number.isFinite(opacity) ? opacity : 1,
            rotation: 0,
            scale: 1
        };
    }

    function gxCreateFloatingEmoji(from, to) {
        const emoji = document.createElement('span');
        const baseFont = Math.max(from.fontSize, to.fontSize);

        emoji.className = 'gx-gamif-floating-emoji';
        emoji.textContent = to.text || from.text;
        emoji.style.left = `${from.left}px`;
        emoji.style.top = `${from.top}px`;
        emoji.style.fontSize = `${baseFont}px`;
        emoji.style.opacity = `${from.opacity}`;
        emoji.style.transform =
            `translate(-50%,-50%) rotate(${from.rotation}deg) scale(${(from.fontSize / baseFont) * from.scale})`;
        emoji.dataset.baseFont = String(baseFont);

        document.body.appendChild(emoji);
        return emoji;
    }

    function gxAnimateEmoji(emoji, from, to, opening) {
        if (!emoji || gxReduceMotion() || !Element.prototype.animate) return null;

        const baseFont = Number(emoji.dataset.baseFont) || Math.max(from.fontSize, to.fontSize);
        const fromScale = (from.fontSize / baseFont) * from.scale;
        const toScale = (to.fontSize / baseFont) * to.scale;

        // Font-size never changes during the flight. Only scale does.
        // This prevents Safari from re-rasterizing the emoji and "jumping" at small sizes.
        return emoji.animate([
            {
                left: `${from.left}px`,
                top: `${from.top}px`,
                opacity: from.opacity,
                transform: `translate(-50%,-50%) rotate(${from.rotation}deg) scale(${fromScale})`
            },
            {
                left: `${to.left}px`,
                top: `${to.top}px`,
                opacity: to.opacity,
                transform: `translate(-50%,-50%) rotate(${to.rotation}deg) scale(${toScale})`
            }
        ], {
            duration: opening ? 455 : 485,
            easing: 'cubic-bezier(.22,.72,.18,1)',
            fill: 'forwards'
        });
    }

    async function gxHandoffEmoji(floating, realTarget, targetOpacity = 1) {
        if (!floating || !realTarget) return;

        const oldInlineOpacity = realTarget.style.opacity;
        realTarget.style.visibility = 'visible';
        realTarget.style.opacity = '0';

        const realFade = realTarget.animate(
            [{ opacity: 0 }, { opacity: targetOpacity }],
            { duration: 105, easing: 'ease-out', fill: 'forwards' }
        );
        const floatFade = floating.animate(
            [{ opacity: Number(getComputedStyle(floating).opacity) || targetOpacity }, { opacity: 0 }],
            { duration: 105, easing: 'ease-out', fill: 'forwards' }
        );

        await Promise.allSettled([realFade.finished, floatFade.finished]);

        realTarget.style.opacity = targetOpacity;
        try { realFade.cancel(); } catch (_) {}
        try { floatFade.cancel(); } catch (_) {}

        realTarget.style.opacity = oldInlineOpacity;
        realTarget.style.visibility = '';
        floating.remove();
    }

    function gxAnimateChildren(panel, entering) {
        const children = Array.from(panel.children).filter(el =>
            !el.classList.contains('gx-gamif-shared-emoji')
        );
        if (!children.length || gxReduceMotion() || !Element.prototype.animate) return [];

        return children.map((child, index) => {
            const delay = entering ? 92 + Math.min(index, 7) * 22 : Math.min(index, 6) * 13;
            const frames = entering
                ? [
                    { opacity: 0, transform: 'translateY(9px) scale(.992)' },
                    { opacity: 1, transform: 'translateY(0) scale(1)' }
                  ]
                : [
                    { opacity: 1, transform: 'translateY(0) scale(1)' },
                    { opacity: 0, transform: 'translateY(-6px) scale(.99)' }
                  ];

            return child.animate(frames, {
                duration: entering ? 300 : 205,
                delay,
                easing: entering ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.4,0,.2,1)',
                fill: entering ? 'backwards' : 'forwards'
            });
        });
    }

    function gxSetPanelReady(panel, visible) {
        panel.classList.remove('gx-morph-in', 'gx-morph-out', 'slide-left');
        panel.classList.toggle('gx-shared-panel', visible);
        panel.style.display = visible ? 'block' : 'none';
        panel.style.opacity = visible ? '1' : '';
        panel.style.visibility = visible ? 'visible' : '';
        panel.style.transform = '';
    }

    function gxReleaseFinishedMorphAnimations(root) {
        if (!root || !root.getAnimations) return;
        const nodes = [root, ...root.querySelectorAll('*')];

        nodes.forEach(node => {
            if (!node.getAnimations) return;
            node.getAnimations().forEach(anim => {
                // Only finished Web Animations can leak their composited final frame.
                // CSS animations that are still running (shake, progress, tags, etc.) stay untouched.
                if (anim.playState === 'finished') {
                    const effect = anim.effect;
                    const frames = effect && effect.getKeyframes ? effect.getKeyframes() : [];
                    const isMorphResidue = frames.some(frame =>
                        Object.prototype.hasOwnProperty.call(frame, 'transform') ||
                        Object.prototype.hasOwnProperty.call(frame, 'opacity')
                    );
                    if (isMorphResidue) {
                        try { anim.cancel(); } catch (_) {}
                    }
                }
            });
        });
    }

    function gxMeasureHiddenGrid(grid, source, host) {
        const saved = {
            display: grid.style.display,
            visibility: grid.style.visibility,
            position: grid.style.position,
            left: grid.style.left,
            top: grid.style.top,
            right: grid.style.right,
            width: grid.style.width,
            opacity: grid.style.opacity,
            pointerEvents: grid.style.pointerEvents,
            hostPosition: host?.style.position || ''
        };

        if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative';

        grid.style.display = 'grid';
        grid.style.visibility = 'hidden';
        grid.style.position = 'absolute';
        grid.style.left = '0';
        grid.style.top = '0';
        grid.style.right = '0';
        grid.style.width = '100%';
        grid.style.opacity = '0';
        grid.style.pointerEvents = 'none';

        const sourceRect = source.getBoundingClientRect();
        const sourceEmoji = gxSourceEmojiMetrics(source, sourceRect);
        const cs = getComputedStyle(grid);
        const outerHeight = grid.getBoundingClientRect().height
            + (parseFloat(cs.marginTop) || 0)
            + (parseFloat(cs.marginBottom) || 0);

        grid.style.display = saved.display;
        grid.style.visibility = saved.visibility;
        grid.style.position = saved.position;
        grid.style.left = saved.left;
        grid.style.top = saved.top;
        grid.style.right = saved.right;
        grid.style.width = saved.width;
        grid.style.opacity = saved.opacity;
        grid.style.pointerEvents = saved.pointerEvents;
        if (host) host.style.position = saved.hostPosition;

        return { sourceRect, sourceEmoji, outerHeight };
    }

    async function gxOpenShared(type) {
        if (gxGamifMorphing) return;

        const { grid, panel, otherPanel, source } = gxGetParts(type);
        if (!grid || !panel || !source) return;

        gxGamifMorphing = true;
        gxActiveGamifType = type;

        gxReleaseFinishedMorphAnimations(panel);
        gxReleaseFinishedMorphAnimations(grid);

        if (gxReduceMotion() || !Element.prototype.animate) {
            grid.style.display = 'none';
            gxSetPanelReady(otherPanel, false);
            gxSetPanelReady(panel, true);
            if (type === 'coupon') setTimeout(animarMisionesCompletadasEnSecuencia, 80);
            gxGamifMorphing = false;
            return;
        }

        try {
            const sourceRect = source.getBoundingClientRect();
            const sourceEmoji = gxSourceEmojiMetrics(source, sourceRect);
            const ghost = gxCreateGhost(source, sourceRect);

            source.style.visibility = 'hidden';

            grid.style.display = 'none';
            gxSetPanelReady(otherPanel, false);

            panel.classList.remove('gx-morph-in', 'gx-morph-out', 'slide-left');
            panel.classList.add('gx-shared-panel');
            panel.style.display = 'block';
            panel.style.visibility = 'hidden';
            panel.style.opacity = '0';

            const targetRect = panel.getBoundingClientRect();
            const targetEmojiEl = panel.querySelector('.gx-gamif-shared-emoji');
            const targetEmoji = targetEmojiEl ? gxTargetEmojiMetrics(targetEmojiEl) : null;
            const targetOpacity = targetEmoji?.opacity ?? 1;

            if (targetEmojiEl) targetEmojiEl.style.visibility = 'hidden';
            panel.style.visibility = 'visible';

            const floatingEmoji = targetEmoji ? gxCreateFloatingEmoji(sourceEmoji, targetEmoji) : null;
            const emojiAnim = targetEmoji
                ? gxAnimateEmoji(floatingEmoji, sourceEmoji, targetEmoji, true)
                : null;

            Array.from(ghost.children).forEach((child, index) => {
                child.animate([
                    { opacity: 1, transform: 'translateY(0) scale(1)' },
                    { opacity: index === ghost.children.length - 1 ? .13 : .035, transform: 'translateY(-3px) scale(.985)' }
                ], {
                    duration: 255,
                    delay: 38,
                    easing: 'cubic-bezier(.4,0,.2,1)',
                    fill: 'forwards'
                });
            });

            const ghostAnim = ghost.animate([
                {
                    left: `${sourceRect.left}px`,
                    top: `${sourceRect.top}px`,
                    width: `${sourceRect.width}px`,
                    height: `${sourceRect.height}px`,
                    borderRadius: '22px'
                },
                {
                    left: `${targetRect.left}px`,
                    top: `${targetRect.top}px`,
                    width: `${targetRect.width}px`,
                    height: `${targetRect.height}px`,
                    borderRadius: '24px'
                }
            ], {
                duration: 445,
                easing: 'cubic-bezier(.18,.86,.22,1)',
                fill: 'forwards'
            });

            let openPanelFade = null;
            setTimeout(() => {
                openPanelFade = panel.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: 170,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                gxAnimateChildren(panel, true);
            }, 255);

            await Promise.allSettled([
                ghostAnim.finished,
                emojiAnim?.finished || Promise.resolve()
            ]);

            ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 95,
                easing: 'ease-out',
                fill: 'forwards'
            });

            if (floatingEmoji && targetEmojiEl) {
                await gxHandoffEmoji(floatingEmoji, targetEmojiEl, targetOpacity);
            }

            await gxWait(20);
            ghost.remove();
            source.style.visibility = '';
            panel.style.opacity = '1';

            // Safari can keep a finished WAAPI animation composited above inline styles.
            // Release it now so a second open never inherits opacity/filter state.
            if (openPanelFade) {
                try { openPanelFade.cancel(); } catch (_) {}
                openPanelFade = null;
            }

            if (type === 'coupon') setTimeout(animarMisionesCompletadasEnSecuencia, 90);
        } finally {
            gxGamifMorphing = false;
        }
    }

    async function gxCloseShared() {
        if (gxGamifMorphing) return;

        const type = gxActiveGamifType ||
            (document.getElementById('gamif-expanded-referral')?.style.display !== 'none' ? 'referral' : 'coupon');

        const { grid, panel, source, host } = gxGetParts(type);
        if (!grid || !panel || !source || !host) return;

        gxGamifMorphing = true;

        gxReleaseFinishedMorphAnimations(panel);
        gxReleaseFinishedMorphAnimations(grid);

        if (gxReduceMotion() || !Element.prototype.animate) {
            gxSetPanelReady(panel, false);
            grid.style.display = 'grid';
            grid.style.visibility = 'visible';
            source.style.visibility = '';
            gxActiveGamifType = null;
            gxGamifMorphing = false;
            return;
        }

        let surface = null;
        let floatingEmoji = null;
        let spacer = null;

        try {
            const panelRect = panel.getBoundingClientRect();
            const panelCS = getComputedStyle(panel);
            const panelOuterHeight = panelRect.height
                + (parseFloat(panelCS.marginTop) || 0)
                + (parseFloat(panelCS.marginBottom) || 0);

            const panelEmojiEl = panel.querySelector('.gx-gamif-shared-emoji');
            const panelEmoji = panelEmojiEl ? gxTargetEmojiMetrics(panelEmojiEl) : null;

            // IMPORTANT: measure the destination while the real grid is temporarily
            // present but ABSOLUTE. It does not affect layout, so the billing card
            // below can never jump or overlap during measurement.
            const measured = gxMeasureHiddenGrid(grid, source, host);
            const destinationRect = measured.sourceRect;
            const sourceEmoji = measured.sourceEmoji;
            const gridOuterHeight = measured.outerHeight;

            surface = gxCreateSurface(panel, panelRect);

            if (panelEmojiEl && panelEmoji) {
                panelEmojiEl.style.visibility = 'hidden';
                floatingEmoji = gxCreateFloatingEmoji(panelEmoji, { ...sourceEmoji, text: panelEmoji.text });
            }

            // MISMO emoji compartido durante todo el cierre.
            // No se desvanece a mitad del recorrido ni se sustituye antes de tiempo.
            const emojiAnim = floatingEmoji && panelEmoji
                ? gxAnimateEmoji(
                    floatingEmoji,
                    panelEmoji,
                    { ...sourceEmoji, text: panelEmoji.text },
                    false
                  )
                : null;

            const exitChildAnims = gxAnimateChildren(panel, false);

            // Content leaves first, while the glass surface stays in place.
            const panelFade = panel.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: .58, transform: 'scale(.997)', offset: .58 },
                { opacity: 0, transform: 'scale(.992)' }
            ], {
                duration: 245,
                easing: 'cubic-bezier(.4,0,.2,1)',
                fill: 'forwards'
            });

            await gxWait(105);

            const sourceStyle = getComputedStyle(source);
            const surfaceAnim = surface.animate([
                {
                    left: `${panelRect.left}px`,
                    top: `${panelRect.top}px`,
                    width: `${panelRect.width}px`,
                    height: `${panelRect.height}px`,
                    borderRadius: '24px',
                    opacity: 1
                },
                {
                    left: `${destinationRect.left}px`,
                    top: `${destinationRect.top}px`,
                    width: `${destinationRect.width}px`,
                    height: `${destinationRect.height}px`,
                    borderRadius: '22px',
                    backgroundColor: sourceStyle.backgroundColor,
                    borderColor: sourceStyle.borderColor,
                    boxShadow: sourceStyle.boxShadow,
                    opacity: 1
                }
            ], {
                duration: 475,
                easing: 'cubic-bezier(.22,.72,.18,1)',
                fill: 'forwards'
            });

            await Promise.allSettled([
                surfaceAnim.finished,
                emojiAnim?.finished || Promise.resolve(),
                panelFade.finished
            ]);

            // Swap the layout only AFTER the visual surface has already landed.
            // A temporary spacer preserves the old height and then collapses smoothly,
            // so "Tu próxima fecha de corte" never jumps over/behind the cards.
            panel.style.display = 'none';

            // Critical iOS/Safari cleanup: finished animations with fill:'forwards'
            // otherwise retain blur()/transform in the compositor on later openings.
            try { panelFade.cancel(); } catch (_) {}
            exitChildAnims.forEach(anim => {
                try { anim.cancel(); } catch (_) {}
            });

            panel.style.opacity = '';
            panel.style.transform = '';
            panel.classList.remove('gx-shared-panel');

            grid.style.display = 'grid';
            grid.style.visibility = 'visible';

            Array.from(grid.children).forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(4px) scale(.992)';
            });

            const heightDifference = Math.max(0, panelOuterHeight - gridOuterHeight);
            if (heightDifference > 1) {
                spacer = document.createElement('div');
                spacer.className = 'gx-gamif-layout-spacer';
                spacer.style.height = `${heightDifference}px`;
                host.appendChild(spacer);
            }

            // La tarjeta real vuelve, pero su watermark permanece oculto
            // mientras el MISMO emoji flotante sigue visible encima.
            // Esto evita tanto el doble icono como el "desaparece y reaparece".
            source.classList.add('gx-gamif-watermark-hidden');
            source.style.visibility = '';

            const cards = Array.from(grid.children);
            const cardAnims = cards.map((card, index) =>
                card.animate([
                    { opacity: 0, transform: 'translateY(4px) scale(.992)' },
                    { opacity: 1, transform: 'translateY(0) scale(1)' }
                ], {
                    duration: 220,
                    delay: index * 32,
                    easing: 'cubic-bezier(.16,1,.3,1)',
                    fill: 'forwards'
                })
            );

            const surfaceFade = surface.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: 120, easing: 'ease-out', fill: 'forwards' }
            );

            // El emoji flotante permanece visible durante TODO el fade del grid.
            // El handoff al watermark real se hace únicamente cuando la tarjeta
            // ya terminó de aparecer.

            const spacerAnim = spacer
                ? spacer.animate(
                    [{ height: `${heightDifference}px` }, { height: '0px' }],
                    { duration: 345, easing: 'cubic-bezier(.22,.72,.18,1)', fill: 'forwards' }
                  )
                : null;

            await Promise.allSettled([
                surfaceFade.finished,
                spacerAnim?.finished || Promise.resolve(),
                ...cardAnims.map(a => a.finished)
            ]);

            cards.forEach((card, index) => {
                // Commit the natural final state, then release the WAAPI layer.
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) scale(1)';
                try { cardAnims[index]?.cancel(); } catch (_) {}
                card.style.opacity = '';
                card.style.transform = '';
            });

            if (panelEmojiEl) panelEmojiEl.style.visibility = '';

            // HANDOFF ATÓMICO DEL MISMO EMOJI:
            // la copia flotante ya está exactamente en la posición/escala
            // del watermark. Revelamos el real y retiramos la copia en el mismo
            // ciclo de JavaScript, sin fade intermedio ni frame vacío.
            source.classList.remove('gx-gamif-watermark-hidden');
            if (floatingEmoji) {
                floatingEmoji.style.visibility = 'hidden';
                floatingEmoji.remove();
                floatingEmoji = null;
            }

            surface.remove();
            surface = null;
            spacer?.remove();
            spacer = null;

            gxActiveGamifType = null;
        } finally {
            // Defensive cleanup: prevents a failed/interrupted animation from
            // ever leaving the rewards section over the billing/date card.
            if (surface?.isConnected) surface.remove();
            if (floatingEmoji?.isConnected) floatingEmoji.remove();
            if (spacer?.isConnected) spacer.remove();
            source?.classList?.remove('gx-gamif-watermark-hidden');

            panel.style.opacity = '';
            panel.style.transform = '';

            gxGamifMorphing = false;
        }
    }

    window.openGamif = gxOpenShared;
    window.closeGamif = gxCloseShared;
})();