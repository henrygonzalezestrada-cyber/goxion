        let selectedPlat = "", currentIssues = {};
        
        const DATABASE_ISSUES = window.GOXION_DATA?.supportIssues || {};

        function renderizarSoporteDinamico(data) {
            const config = data._goxion_config; 
            const container = document.getElementById('support-platforms-grid'); 
            
            if(!config || !config.serviciosGlobales) return;
            
            const mapImagenes = {
                "netflix": { nombre: "Netflix", img: "netflix" },
                "disney": { nombre: "Disney+", img: "disney" },
                "max": { nombre: "Max", img: "hbo-max" },
                "hbo": { nombre: "HBO", img: "hbo-max" },
                "prime": { nombre: "Prime Video", img: "prime-video" },
                "youtube": { nombre: "YouTube", img: "youtube" },
                "vix": { nombre: "ViX", img: "vix" },
                "crunchyroll": { nombre: "Crunchyroll", img: "crunchyroll" },
                "spotify": { nombre: "Spotify", img: "spotify" },
                "microsoft": { nombre: "Microsoft", img: "microsoft" },
                "google": { nombre: "Google One", img: "google-one" },
                "apple": { nombre: "Apple", img: "apple" },
                "paramount": { nombre: "Paramount+", img: "paramount" }
            };
            
            let html = "";
            let addedBrands = new Set(); 
            
            config.serviciosGlobales.forEach(s => { 
                let imgSrc = "logo2.PNG"; 
                let srvLower = s.nombre.toLowerCase();
                let brandName = srvCleanName(s.nombre);
                let brandKeyId = s.nombre; 
                
                for (let key in mapImagenes) { 
                    if (srvLower.includes(key)) {
                        imgSrc = `logos/${mapImagenes[key].img}.PNG`; 
                        brandName = mapImagenes[key].nombre;
                        brandKeyId = key;
                        break;
                    }
                }
                
                if (!addedBrands.has(brandKeyId)) {
                    addedBrands.add(brandKeyId);
                    html += `
                    <div class="platform-btn" onclick="selectPlatform('${brandName}', this, event)">
                        <img src="${imgSrc}" style="width: 35px; height: 35px; border-radius: 10px; object-fit: cover; margin-bottom: 3px; box-shadow: 0 5px 15px rgba(0,0,0,0.5);" onerror="this.src='logo2.PNG'">
                        <div class="gx-support-platform-name" style="line-height:1.2;">
                            ${brandName}
                            <div class="gx-support-platform-subtitle">Asistente inteligente de soporte</div>
                        </div>
                    </div>`; 
                }
            });
            
            container.innerHTML = html;
        }

        let gxSupportMorphBusy = false;
        let gxSupportExpandedEl = null;

        function gxSupportAnimateCardHeight(card, fromHeight, toHeight, duration = 420) {
            if (!card || Math.abs(toHeight - fromHeight) < 2) return null;

            card.classList.add('gx-support-morph-running', 'gx-support-height-lock');
            card.style.height = `${fromHeight}px`;

            if (!Element.prototype.animate) {
                card.style.height = `${toHeight}px`;
                requestAnimationFrame(() => {
                    card.style.height = '';
                    card.classList.remove('gx-support-morph-running', 'gx-support-height-lock');
                });
                return null;
            }

            const anim = card.animate([{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
                {
                    duration,
                    easing: 'cubic-bezier(.22,.72,.18,1)',
                    fill: 'forwards'
                }
            );

            anim.finished.finally(() => {
                try { anim.cancel(); } catch (_) {}
                card.style.height = '';
                card.classList.remove('gx-support-morph-running', 'gx-support-height-lock');
            });

            return anim;
        }

        function gxSupportFlip(el, firstRect, lastRect, opening = true) {
            if (!el || !Element.prototype.animate) return null;

            const dx = firstRect.left - lastRect.left;
            const dy = firstRect.top - lastRect.top;
            const sx = firstRect.width / Math.max(lastRect.width, 1);
            const sy = firstRect.height / Math.max(lastRect.height, 1);

            return el.animate([
                {
                    transformOrigin: 'top left',
                    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
                },
                {
                    transformOrigin: 'top left',
                    transform: 'translate(0,0) scale(1)'
                }
            ], {
                duration: opening ? 430 : 390,
                easing: opening
                    ? 'cubic-bezier(.18,.86,.22,1)'
                    : 'cubic-bezier(.22,.72,.18,1)'
            });
        }

        function gxRenderSupportIssueOptions(issues) {
            const wrap = document.getElementById('support-issue-options');
            if (!wrap) return;

            wrap.innerHTML = issues.map((item, idx) => `
                <button type="button"
                    class="gx-support-issue-btn"
                    data-support-issue="${idx}"
                    onclick="selectSupportIssue(${idx}, this, event)">
                    ${item.issue}
                </button>
            `).join('');
        }

        function gxMountSupportClose(el) {
            if (!el) return null;

            const old = el.querySelector(':scope > .gx-support-back');
            if (old) old.remove();

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gx-support-back';
            btn.setAttribute('aria-label', 'Cerrar asistente y cambiar plataforma');
            btn.textContent = '×';

            btn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                closeSupportMorph(event);
            });

            el.appendChild(btn);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => btn.classList.add('gx-support-x-visible'));
            });

            return btn;
        }

        async function gxUnmountSupportClose(el) {
            const btn = el?.querySelector(':scope > .gx-support-back');
            if (!btn) return;

            btn.classList.remove('gx-support-x-visible');

            if (!Element.prototype.animate) {
                btn.remove();
                return;
            }

            const anim = btn.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(.82)' }
            ], {
                duration: 110,
                easing: 'ease-in',
                fill: 'forwards'
            });

            await anim.finished.catch(() => {});
            btn.remove();
        }

        async function gxOpenSupportMorph(el) {
            if (!el || gxSupportMorphBusy || gxSupportExpandedEl === el) return;

            const reduceMotion = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const grid = document.getElementById('support-platforms-grid');
            const card = document.getElementById('smart-support-card');
            const flow = document.getElementById('support-flow-shell');
            const step1 = document.getElementById('support-step-1-label');

            if (!grid || !card || !flow) return;

            gxSupportMorphBusy = true;
            card.classList.add('gx-support-enhanced');

            const firstRect = el.getBoundingClientRect();
            const firstCardHeight = card.getBoundingClientRect().height;
            const siblings = Array.from(grid.querySelectorAll('.platform-btn')).filter(btn => btn !== el);

            if (!reduceMotion && Element.prototype.animate) {
                const fades = siblings.map((btn, index) => btn.animate([
                    { opacity: 1, transform: 'scale(1)' },
                    { opacity: 0, transform: 'scale(.94)' }
                ], {
                    duration: 155,
                    delay: Math.min(index, 5) * 10,
                    easing: 'ease-in'
                }));
                await Promise.allSettled(fades.map(anim => anim.finished));
            }

            grid.classList.add('gx-support-focus');
            el.classList.add('gx-support-expanded', 'selected');
            gxSupportExpandedEl = el;

            flow.classList.add('gx-inside-platform');
            el.appendChild(flow);

            if (step1) step1.style.display = 'none';

            document.getElementById('step-2')?.classList.add('active');
            document.getElementById('step-3')?.classList.remove('active');

            const lastRect = el.getBoundingClientRect();
            const lastCardHeight = card.getBoundingClientRect().height;

            if (!reduceMotion) {
                gxSupportFlip(el, firstRect, lastRect, true);
                gxSupportAnimateCardHeight(card, firstCardHeight, lastCardHeight, 430);

                flow.classList.remove('gx-support-step-enter');
                void flow.offsetWidth;
                flow.classList.add('gx-support-step-enter');
            }

            setTimeout(() => {
                flow.classList.remove('gx-support-step-enter');

                // The X is mounted only after the morph lands, so it never
                // scales or flies with the expanding platform card.
                gxMountSupportClose(el);

                gxSupportMorphBusy = false;
            }, reduceMotion ? 0 : 450);
        }

        async function closeSupportMorph(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            if (gxSupportMorphBusy || !gxSupportExpandedEl) return;

            const reduceMotion = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const grid = document.getElementById('support-platforms-grid');
            const card = document.getElementById('smart-support-card');
            const flow = document.getElementById('support-flow-shell');
            const home = document.getElementById('support-flow-home');
            const step1 = document.getElementById('support-step-1-label');
            const el = gxSupportExpandedEl;

            gxSupportMorphBusy = true;

            const firstRect = el.getBoundingClientRect();
            const firstCardHeight = card.getBoundingClientRect().height;

            // Remove the X before any FLIP/height transformation starts.
            // This prevents the control from jumping, scaling or changing
            // coordinate systems during contraction.
            await gxUnmountSupportClose(el);

            if (!reduceMotion && Element.prototype.animate) {
                const fadeFlow = flow.animate([
                    { opacity: 1, transform: 'translateY(0) scale(1)' },
                    { opacity: 0, transform: 'translateY(-5px) scale(.992)' }
                ], { duration: 145, easing: 'ease-in' });
                await fadeFlow.finished.catch(() => {});
            }

            // Lock the large card height BEFORE collapsing its DOM.
            // This prevents the lower support blocks from jumping upward.
            card.classList.add('gx-support-height-lock');
            card.style.height = `${firstCardHeight}px`;

            home.appendChild(flow);
            flow.classList.remove('gx-inside-platform', 'gx-support-step-enter');

            document.getElementById('step-2')?.classList.remove('active');
            document.getElementById('step-3')?.classList.remove('active');

            const selector = document.getElementById('issue-selector');
            if (selector) selector.value = "";
            document.querySelectorAll('.gx-support-issue-btn').forEach(btn => btn.classList.remove('selected'));

            // Temporarily reveal the compact grid invisibly so we can measure the
            // exact destination without showing the siblings too early.
            el.classList.remove('gx-support-expanded', 'selected');
            grid.classList.remove('gx-support-focus');
            const siblings = Array.from(grid.querySelectorAll('.platform-btn')).filter(btn => btn !== el);
            siblings.forEach(btn => {
                btn.style.opacity = '0';
                btn.style.pointerEvents = 'none';
            });

            if (step1) {
                step1.style.display = '';
                step1.style.opacity = '0';
            }

            const lastRect = el.getBoundingClientRect();

            // Measure the real compact height while the outer card is locked.
            card.style.height = '';
            const lastCardHeight = card.getBoundingClientRect().height;
            card.style.height = `${firstCardHeight}px`;

            let flipAnim = null;
            let heightAnim = null;

            if (!reduceMotion) {
                flipAnim = gxSupportFlip(el, firstRect, lastRect, false);
                heightAnim = card.animate([{ height: `${firstCardHeight}px` }, { height: `${lastCardHeight}px` }],
                    {
                        duration: 460,
                        easing: 'cubic-bezier(.22,.72,.18,1)',
                        fill: 'forwards'
                    }
                );

                // Return the other platforms only near the end of the contraction.
                setTimeout(() => {
                    siblings.forEach((btn, index) => {
                        btn.style.opacity = '';
                        btn.style.pointerEvents = '';
                        btn.animate([
                            { opacity: 0, transform: 'scale(.96) translateY(4px)' },
                            { opacity: 1, transform: 'scale(1) translateY(0)' }
                        ], {
                            duration: 230,
                            delay: Math.min(index, 5) * 16,
                            easing: 'cubic-bezier(.16,1,.3,1)'
                        });
                    });

                    if (step1) {
                        step1.animate(
                            [{ opacity: 0 }, { opacity: 1 }],
                            { duration: 190, easing: 'ease-out' }
                        );
                        step1.style.opacity = '';
                    }
                }, 285);
            } else {
                siblings.forEach(btn => {
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                if (step1) step1.style.opacity = '';
            }

            await Promise.allSettled([
                flipAnim?.finished || Promise.resolve(),
                heightAnim?.finished || Promise.resolve()
            ]);

            try { heightAnim?.cancel(); } catch (_) {}
            card.style.height = '';
            card.classList.remove('gx-support-height-lock', 'gx-support-morph-running');

            gxSupportExpandedEl = null;
            selectedPlat = "";
            currentIssues = [];

            gxSupportMorphBusy = false;
        }

        function selectPlatform(p, el, event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            if (gxSupportMorphBusy || gxSupportExpandedEl === el) return;

            selectedPlat = p;
            document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('selected'));
            el.classList.add('selected');

            const sel = document.getElementById('issue-selector');
            sel.innerHTML = `<option value="">-- Selecciona tu situación --</option>`;

            let issues = DATABASE_ISSUES["Default"];
            for (let key in DATABASE_ISSUES) {
                if (p.toLowerCase().includes(key.toLowerCase())) {
                    issues = DATABASE_ISSUES[key];
                    break;
                }
            }

            currentIssues = issues;
            currentIssues.forEach((i, idx) => {
                sel.innerHTML += `<option value="${idx}">${i.issue}</option>`;
            });

            gxRenderSupportIssueOptions(currentIssues);
            document.getElementById('step-2').classList.add('active');
            document.getElementById('step-3').classList.remove('active');

            gxOpenSupportMorph(el);
        }

        function selectSupportIssue(idx, button, event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const sel = document.getElementById('issue-selector');
            if (!sel || !currentIssues[idx]) return;

            sel.value = String(idx);
            document.querySelectorAll('.gx-support-issue-btn').forEach(btn => btn.classList.remove('selected'));
            button?.classList.add('selected');

            showSolution();

            const step3 = document.getElementById('step-3');
            if (step3 && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
                step3.classList.remove('gx-support-step-enter');
                void step3.offsetWidth;
                step3.classList.add('gx-support-step-enter');
                setTimeout(() => step3.classList.remove('gx-support-step-enter'), 320);
            }
        }

        function showSolution() {
            const idx = document.getElementById('issue-selector').value;

            if (idx === "") {
                document.getElementById('step-3').classList.remove('active');
                document.querySelectorAll('.gx-support-issue-btn').forEach(btn => btn.classList.remove('selected'));
                return;
            }

            const data = currentIssues[idx];
            document.getElementById('solution-text').innerHTML = `<strong>💡 Instrucciones:</strong><br>${data.instructions}`;
            document.getElementById('input-label').innerText = data.labelInput;

            document.querySelectorAll('.gx-support-issue-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.supportIssue === String(idx));
            });

            let autoData = "";
            const key = getCurrentClientKey();

            if (key && globalClientesData && globalClientesData[key]) {
                const cliente = globalClientesData[key];
                if (cliente.servicios) {
                    let platKeyword = srvCleanName(selectedPlat).toLowerCase();
                    const srv = cliente.servicios.find(s => s.nombre.toLowerCase().includes(platKeyword));
                    if (srv) {
                        let labelLow = data.labelInput.toLowerCase();
                        if (labelLow.includes("correo") && srv.correo_login) autoData = srv.correo_login;
                        else if (labelLow.includes("perfil") && srv.perfil_nombre) autoData = srv.perfil_nombre;
                        else if (labelLow.includes("pin") && srv.perfil_pin) autoData = srv.perfil_pin;
                    }
                }
            }

            document.getElementById('smart-extra-input').value = autoData;
            document.getElementById('step-3').classList.add('active');
        }

        function sendSmartWABase() {
            const idx = document.getElementById('issue-selector').value; 
            if(idx === "") return;
            const val = document.getElementById('smart-extra-input').value.trim(); 
            if(!val) return alert("Por favor completa el dato requerido en el campo de texto.");
            
            let extraContext = ""; 
            const key = getCurrentClientKey();
            
            if (key && globalClientesData && globalClientesData[key]) {
                const cliente = globalClientesData[key]; 
                let platKeyword = srvCleanName(selectedPlat).toLowerCase(); 
                const srv = cliente.servicios?.find(s => s.nombre.toLowerCase().includes(platKeyword));
                
                extraContext = `\n\n------------------------\n*EXPEDIENTE DE SOPORTE:*\n👤 Cliente: ${cliente.nombre}\n📄 Folio: ${cliente.folio}`;
                
                if (srv) { 
                    extraContext += `\n📺 Plataforma: ${srv.nombre}`; 
                    if (srv.correo_login) extraContext += `\n📧 Cta: ${srv.correo_login}`; 
                    if (srv.perfil_nombre) extraContext += `\n👤 Perfil: ${srv.perfil_nombre}`; 
                    if (srv.perfil_pin) extraContext += `\n🔢 PIN: ${srv.perfil_pin}`; 
                }
                notificarAdmin("soporte", "🛠️ Nueva Petición de Soporte", `El cliente **${cliente.nombre}** solicitó ayuda para ${selectedPlat}.`);
            }
            window.open(`https://wa.me/${NUMERO_GOXION}?text=${encodeURIComponent(currentIssues[idx].templateWA + val + extraContext)}`, '_blank');
        }

        function toggleFAQ(el) {
            const item = el.parentElement;
            item.classList.toggle('open');
        }

    