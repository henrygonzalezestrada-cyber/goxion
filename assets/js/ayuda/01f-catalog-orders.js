        function srvCleanName(n) { 
            return n.trim(); 
        }

        function gxCatalogReducedMotion() {
            return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        }

        function gxSetBrandCardState(card, open) {
            const header = card.querySelector('.brand-header');
            const content = card.querySelector('.brand-expanded-content');
            const icon = card.querySelector('.brand-expand-icon');

            card.classList.toggle('expanded', open);
            if (header) header.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (content) content.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (icon) icon.classList.toggle('open',open);
        }

        function gxMorphBrandCard(card, open) {
            if (!card || card.dataset.gxCatalogMorphing === '1') return;

            const content = card.querySelector('.brand-expanded-content');
            const header = card.querySelector('.brand-header');
            const icon = card.querySelector('.brand-expand-icon');
            const logo = card.querySelector('.brand-logo-img');
            if (!content || !header) {
                gxSetBrandCardState(card, open);
                return;
            }

            if (gxCatalogReducedMotion() || typeof card.animate !== 'function') {
                gxSetBrandCardState(card, open);
                return;
            }

            card.dataset.gxCatalogMorphing = '1';
            card.classList.add('gx-catalog-morphing');

            const startHeight = card.getBoundingClientRect().height;
            const previousCardTransition = card.style.transition;
            const previousContentTransition = content.style.transition;

            // Measure the real destination in the same task, so nothing flashes on screen.
            card.style.transition = 'none';
            content.style.transition = 'none';
            card.style.height = 'auto';
            gxSetBrandCardState(card, open);
            const endHeight = card.getBoundingClientRect().height;

            // Return visually to the first frame, then animate the container to the last one.
            card.style.height = startHeight + 'px';
            card.style.overflow = 'hidden';
            void card.offsetHeight;

            const duration = open ? 540 : 430;
            const easing = 'cubic-bezier(0.2, 0.82, 0.2, 1)';

            const containerAnim = card.animate([
                { height: startHeight + 'px' },
                { height: endHeight + 'px' }
            ], {
                duration,
                easing,
                fill: 'forwards'
            });

            // The information is born from inside the same container.
            const bodyAnim = content.animate(open ? [
                { opacity: 0, transform: 'translateY(-10px) scale(0.985)', filter: 'blur(3px)' },
                { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' }
            ] : [
                { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
                { opacity: 0, transform: 'translateY(-7px) scale(0.992)', filter: 'blur(2px)' }
            ], {
                duration: open ? 390 : 260,
                delay: open ? 95 : 0,
                easing,
                fill: 'both'
            });

            // Preserve tag animations: only logo/icon are shared-motion accents.
            if (logo) {
                logo.animate(open ? [
                    { transform: 'translateY(0) scale(1)' },
                    { transform: 'translateY(-2px) scale(1.05)' }
                ] : [
                    { transform: 'translateY(-2px) scale(1.05)' },
                    { transform: 'translateY(0) scale(1)' }
                ], { duration: open ? 460 : 360, easing, fill: 'both' });
            }

            // Stagger only expanded body blocks; the promotional badge and its
            // animated border/connection remain completely untouched.
            if (open) {
                Array.from(content.children).forEach((child, index) => {
                    child.animate([
                        { opacity: 0, transform: 'translateY(8px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ], {
                        duration: 320,
                        delay: 145 + index * 48,
                        easing,
                        fill: 'both'
                    });
                });
            }

            containerAnim.onfinish = () => {
                card.style.height = '';
                card.style.overflow = '';
                card.style.transition = previousCardTransition;
                content.style.transition = previousContentTransition;
                card.classList.remove('gx-catalog-morphing');
                delete card.dataset.gxCatalogMorphing;

                // Clear WAAPI fill so CSS owns the stable final state.
                try { containerAnim.cancel(); } catch (_) {}
                try { bodyAnim.cancel(); } catch (_) {}
            };

            containerAnim.oncancel = () => {
                card.style.height = '';
                card.style.overflow = '';
                card.style.transition = previousCardTransition;
                content.style.transition = previousContentTransition;
                card.classList.remove('gx-catalog-morphing');
                delete card.dataset.gxCatalogMorphing;
            };
        }

        function toggleBrandCard(brandId) {
            const card = document.getElementById('brand-card-' + brandId);
            if (!card || card.dataset.gxCatalogMorphing === '1') return;

            const opening = !card.classList.contains('expanded');

            // One open container at a time. Other cards collapse through the
            // same morph instead of disappearing abruptly.
            document.querySelectorAll('.brand-card.expanded').forEach(other => {
                if (other !== card) gxMorphBrandCard(other, false);
            });

            gxMorphBrandCard(card, opening);
        }

        function findComboSuggestion(planName) {
            if(!globalClientesData || !globalClientesData._goxion_config) return null;
            const cat = globalClientesData._goxion_config.serviciosGlobales;
            let currentName = planName.toLowerCase();
            
            for(let s of cat) {
                let sName = s.nombre.toLowerCase();
                if(sName !== currentName && (sName.includes('+') || sName.includes(' combo '))) {
                    let hasCurrent = false;
                    if((sName.includes('hbo') || sName.includes('max')) && (currentName.includes('hbo') || currentName.includes('max'))) hasCurrent = true;
                    if(sName.includes('prime') && currentName.includes('prime')) hasCurrent = true;
                    if(sName.includes('netflix') && currentName.includes('netflix')) hasCurrent = true;
                    if(sName.includes('disney') && currentName.includes('disney')) hasCurrent = true;
                    
                    if(hasCurrent) {
                        return { msg: `💡 <strong>Tip Inteligente:</strong> Combínalo y llévate <span>${s.nombre}</span> por <strong>$${s.precio}</strong> todo integrado.` };
                    }
                }
            }
            
            if(currentName.includes('hbo') || currentName.includes('max')) return { msg: `💡 <strong>Tip Inteligente:</strong> ¡Combínalo con Prime Video y llévatelos por <strong>$99</strong> todo integrado! Pregunta en soporte.` };
            if(currentName.includes('prime')) return { msg: `💡 <strong>Tip Inteligente:</strong> ¡Suma HBO Max y llévatelos por <strong>$99</strong> todo integrado! Pregunta en soporte.` };
            
            return null;
        }

        function selectSubPlan(brandId, planIndex, btnElement, isInit = false) {
            const brand = window.catalogGroups[brandId];
            const plan = brand.plans[planIndex];
            
            if(btnElement) {
                const parent = btnElement.parentElement;
                parent.querySelectorAll('.plan-pill').forEach(b => b.classList.remove('active'));
                btnElement.classList.add('active');
            }
            
            const descEl = document.getElementById('desc-' + brandId);
            const comboEl = document.getElementById('smart-combo-' + brandId);
            const cartContainer = document.getElementById('cart-controls-' + brandId);
            
            descEl.style.opacity = '0';
            cartContainer.style.opacity = '0';
            
            setTimeout(() => {
                let textoDesc = INFO_SERVICIOS["default"];
                if (plan.beneficios && plan.beneficios.trim() !== "") {
                    textoDesc = plan.beneficios;
                } else {
                    for(let key in INFO_SERVICIOS) { 
                        if(plan.nombre.toLowerCase().includes(key)) { 
                            textoDesc = INFO_SERVICIOS[key]; 
                            break; 
                        } 
                    }
                }
                descEl.innerHTML = textoDesc;

                const stockEl = document.getElementById('stock-' + brandId);
                if(plan.disponibles > 0) {
                    stockEl.className = 'plan-stock-badge ok';
                    stockEl.innerHTML = `🟢 ${plan.disponibles} disp.`;
                } else {
                    stockEl.className = 'plan-stock-badge out';
                    stockEl.innerHTML = `🔴 Agotado`;
                }

                if(comboEl) {
                    let combo = findComboSuggestion(plan.nombre);
                    if(combo && plan.disponibles > 0) {
                        comboEl.innerHTML = combo.msg;
                        comboEl.style.display = 'block';
                        comboEl.style.animation = 'none';
                        setTimeout(() => comboEl.style.animation = 'fadeIn 0.5s ease forwards', 10);
                    } else {
                        comboEl.style.display = 'none';
                    }
                }
                
                if(plan.disponibles > 0) {
                    let currentQty = (carritoPedidos[plan.nombre] && carritoPedidos[plan.nombre].qty) ? carritoPedidos[plan.nombre].qty : 0;
                    cartContainer.innerHTML = `
                    <div class="price-action-box">
                        <div class="price-display">
                            <span class="price-currency">$</span>${plan.precio}
                        </div>
                        <div class="qty-controls-large">
                            <button class="qty-btn-large" onclick="actualizarCarrito('${plan.nombre}', ${plan.precio}, -1, '${plan.safeId}')">-</button>
                            <span class="qty-val-large" id="qty-${plan.safeId}">${currentQty}</span>
                            <button class="qty-btn-large" onclick="actualizarCarrito('${plan.nombre}', ${plan.precio}, 1, '${plan.safeId}')">+</button>
                        </div>
                    </div>`;
                } else {
                    cartContainer.innerHTML = `
                    <div class="price-action-box" style="opacity: 0.4;">
                        <div class="price-display">
                            <span class="price-currency">$</span>${plan.precio}
                        </div>
                        <div class="qty-controls-large" style="cursor: not-allowed;">
                            <button class="qty-btn-large" disabled>-</button>
                            <span class="qty-val-large">0</span>
                            <button class="qty-btn-large" disabled>+</button>
                        </div>
                    </div>`;
                }

                descEl.style.opacity = '1';
                cartContainer.style.opacity = '1';
            }, 200);
        }


        let gxCatalogActiveFilter = 'all';

        function gxCatalogBrandKey(nombre) {
            const n = gxNormalizeUiText(nombre);
            if (n.includes('netflix')) return 'netflix';
            if (n.includes('disney')) return 'disney';
            if (n.includes('hbo') || n.includes('max')) return 'max';
            if (n.includes('prime') || n.includes('amazon')) return 'prime';
            if (n.includes('youtube')) return 'youtube';
            if (n.includes('vix')) return 'vix';
            if (n.includes('crunchy')) return 'crunchyroll';
            if (n.includes('spotify')) return 'spotify';
            if (n.includes('google')) return 'google';
            if (n.includes('microsoft') || n.includes('365')) return 'microsoft';
            return n.replace(/[^a-z0-9]/g,'').slice(0,24);
        }

        function gxCatalogContext(data) {
            const key = typeof getCurrentClientKey === 'function' ? getCurrentClientKey() : '';
            const cliente = key ? data?.[key] : null;

            return {
                authenticated:Boolean(cliente),
                cliente,
                owned:new Set((cliente?.servicios || []).map(s => gxCatalogBrandKey(s.nombre)))
            };
        }

        function gxCatalogRecommendation(brandKey,context,brand) {
            if (!context.authenticated || context.owned.has(brandKey)) {
                return {score:0,reason:''};
            }

            let score = brand.plans.some(p => Number(p.disponibles || 0) > 0) ? 4 : 0;
            let reason = 'Disponible para ti';

            if (brandKey === 'prime' && context.owned.has('max')) {
                score = 20;
                reason = 'Complementa tu HBO Max';
            } else if (brandKey === 'max' && context.owned.has('prime')) {
                score = 20;
                reason = 'Complementa tu Prime Video';
            }

            if (brand.plans.some(p => String(p.etiqueta || '').trim())) score += 2;
            return {score,reason};
        }

        function gxSetupCatalogFilters(context) {
            const filters = document.getElementById('gx-catalog-filters');
            const search = document.getElementById('gx-catalog-search');

            gxCatalogActiveFilter = 'all';
            if (search) search.value = '';

            if (!filters) return;

            filters.innerHTML = context.authenticated
                ? `
                    <button type="button" class="gx-catalog-filter-chip active" onclick="gxSetCatalogFilter('all',this)">Todos</button>
                    <button type="button" class="gx-catalog-filter-chip" onclick="gxSetCatalogFilter('recommended',this)">Para ti</button>
                    <button type="button" class="gx-catalog-filter-chip" onclick="gxSetCatalogFilter('available',this)">Disponibles</button>
                  `
                : `
                    <button type="button" class="gx-catalog-filter-chip active" onclick="gxSetCatalogFilter('all',this)">Todos</button>
                    <button type="button" class="gx-catalog-filter-chip" onclick="gxSetCatalogFilter('available',this)">Disponibles</button>
                  `;
        }

        function gxSetCatalogFilter(filter,button) {
            gxCatalogActiveFilter = filter || 'all';
            document.querySelectorAll('#gx-catalog-filters .gx-catalog-filter-chip').forEach(btn => {
                btn.classList.toggle('active',btn === button);
            });
            gxApplyCatalogFilters();
        }

        function gxApplyCatalogFilters() {
            const q = gxNormalizeUiText(document.getElementById('gx-catalog-search')?.value || '').trim();
            const cards = [...document.querySelectorAll('#catalog-container .brand-card')];
            let visible = 0;

            cards.forEach(card => {
                const searchable = gxNormalizeUiText(card.dataset.gxSearch || card.textContent || '');
                const matchesText = !q || searchable.includes(q);
                const matchesFilter =
                    gxCatalogActiveFilter === 'all' ||
                    (gxCatalogActiveFilter === 'available' && card.dataset.gxAvailable === '1') ||
                    (gxCatalogActiveFilter === 'recommended' && card.dataset.gxRecommended === '1');

                const show = matchesText && matchesFilter;
                card.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            const empty = document.getElementById('gx-catalog-empty');
            if (empty) empty.hidden = visible > 0;
        }

        function cargarCatalogo(data) {
            const config = data._goxion_config;
            const catalogContainer = document.getElementById('catalog-container');
            if (!config || !config.serviciosGlobales || !Array.isArray(config.serviciosGlobales)) return;

            const gxCatalogClient = gxCatalogContext(data);
            gxSetupCatalogFilters(gxCatalogClient);

            if (config.alertas && config.alertas.activa) {
                const banner = document.getElementById('dynamic-alert');
                const content = document.getElementById('alert-content');
                content.innerHTML = `<strong>Aviso Técnico:</strong> El servicio de <strong>${config.alertas.plataforma || "Servicios"}</strong> está ${config.alertas.falla || "presentando intermitencias"}. Las demás plataformas operan con normalidad.${config.alertas.mensaje ? `<br><small>${config.alertas.mensaje}</small>` : ''}`;
                banner.style.display = 'flex';
            }

            let ocupados = {};
            config.serviciosGlobales.forEach(catSrv => { ocupados[catSrv.nombre] = 0; });

            for (let key in data) {
                if (key === '_goxion_config') continue;
                let cliente = data[key];
                if (cliente.servicios) {
                    cliente.servicios.forEach(s => {
                        let nombreCliente = s.nombre.toLowerCase();
                        let multiplier = 1; let matchQuant = nombreCliente.match(/\(x(\d+)\)/);
                        if (matchQuant) multiplier = parseInt(matchQuant[1]);
                        
                        config.serviciosGlobales.forEach(catSrv => {
                            let keyword = catSrv.nombre.replace(/ Premium| Standard| Platino| Cuenta completa| 2TB| 365/gi, '').trim().toLowerCase();
                            if (nombreCliente.includes(keyword)) ocupados[catSrv.nombre] += multiplier;
                        });
                    });
                }
            }

            const mapMarcas = { 
                "netflix": { name: "Netflix", img: "logos/netflix.PNG" }, 
                "disney": { name: "Disney+", img: "logos/disney.PNG" }, 
                "max": { name: "Max", img: "logos/hbo-max.PNG" },
                "hbo": { name: "HBO", img: "logos/hbo-max.PNG" }, 
                "prime": { name: "Prime Video", img: "logos/prime-video.PNG" }, 
                "youtube": { name: "YouTube", img: "logos/youtube.PNG" }, 
                "vix": { name: "ViX Premium", img: "logos/vix.PNG" }, 
                "crunchyroll": { name: "Crunchyroll", img: "logos/crunchyroll.PNG" }, 
                "spotify": { name: "Spotify", img: "logos/spotify.PNG" },
                "google": { name: "Google One", img: "logos/google-one.PNG" }, 
                "microsoft": { name: "Microsoft 365", img: "logos/microsoft.PNG" }
            };

            window.catalogGroups = {};

            config.serviciosGlobales.forEach(srv => {
                let srvLower = srv.nombre.toLowerCase();
                let brandKey = "otros_" + srv.nombre.replace(/[^a-zA-Z0-9]/g, '');
                let foundImg = "logo2.PNG";
                let foundName = srv.nombre;
                
                for (let key in mapMarcas) { 
                    if (srvLower.includes(key)) { 
                        brandKey = key; 
                        foundName = mapMarcas[key].name;
                        foundImg = mapMarcas[key].img;
                        break; 
                    } 
                }

                if(!window.catalogGroups[brandKey]) {
                    window.catalogGroups[brandKey] = {
                        id: brandKey,
                        name: foundName,
                        img: foundImg,
                        plans: []
                    };
                }

                let limiteTotal = (srv.cuentas || 0) * (srv.limite || 1);
                let disponibles = (srv.disponibles_servidor !== undefined && srv.disponibles_servidor !== null)
                    ? Number(srv.disponibles_servidor)
                    : (limiteTotal - (ocupados[srv.nombre] || 0));
                
                window.catalogGroups[brandKey].plans.push({
                    ...srv,
                    disponibles: disponibles,
                    safeId: srv.nombre.replace(/[^a-zA-Z0-9]/g, '-')
                });
            });

            const gxCatalogEntries = Object.entries(window.catalogGroups).map(([bKey,brand]) => {
                const canonical = gxCatalogBrandKey(brand.name || bKey);
                const rec = gxCatalogRecommendation(canonical,gxCatalogClient,brand);

                brand.gxOwned = gxCatalogClient.owned.has(canonical);
                brand.gxAvailable = brand.plans.some(p => Number(p.disponibles || 0) > 0);
                brand.gxRecommendationScore = rec.score;
                brand.gxRecommendationReason = rec.reason;
                brand.gxRecommended = false;

                return [bKey,brand];
            });

            gxCatalogEntries.sort((a,b) => {
                const A = a[1], B = b[1];

                if (gxCatalogClient.authenticated) {
                    if (A.gxOwned !== B.gxOwned) return A.gxOwned ? 1 : -1;
                    if (A.gxRecommendationScore !== B.gxRecommendationScore) {
                        return B.gxRecommendationScore - A.gxRecommendationScore;
                    }
                }

                if (A.gxAvailable !== B.gxAvailable) return A.gxAvailable ? -1 : 1;
                return String(A.name || '').localeCompare(String(B.name || ''),'es');
            });

            if (gxCatalogClient.authenticated) {
                let slots = 0;
                gxCatalogEntries.forEach(([,brand]) => {
                    const eligible = !brand.gxOwned && brand.gxAvailable && brand.gxRecommendationScore > 0;
                    brand.gxRecommended = eligible && slots < 3;
                    if (brand.gxRecommended) slots++;
                });
            }

            let htmlCatalogo = '';

            for (const [bKey,brand] of gxCatalogEntries) {
                let minPrice = Math.min(...brand.plans.map(p => p.precio));
                
                let pillsHtml = '';
                let brandTag = "";

                brand.plans.forEach((plan, idx) => {
                    let planName = srvCleanName(plan.nombre);
                    let opacity = plan.disponibles <= 0 ? '0.5' : '1';
                    
                    if(!brandTag && plan.etiqueta) {
                        brandTag = plan.etiqueta;
                    }
                    
                    pillsHtml += `<button class="plan-pill ${idx === 0 ? 'active' : ''}" style="opacity: ${opacity}" onclick="selectSubPlan('${bKey}', ${idx}, this)" ${plan.disponibles <= 0 ? 'disabled' : ''}>${planName}</button>`;
                });

                // ASIGNACIÓN INTELIGENTE DE CLASES PARA TARJETAS Y ETIQUETAS
                let badgeClass = "animated-etiqueta";
                let cardPromoClass = "";
                
                if (brandTag) {
                    let tLow = brandTag.toLowerCase();
                    if (tLow.includes("nuevo") || tLow.includes("estreno")) {
                        badgeClass += " is-nuevo";
                        cardPromoClass = "has-promo has-promo-nuevo";
                    } else if (tLow.includes("ahorro") || tLow.includes("promo") || tLow.includes("descuento") || tLow.includes("oferta")) {
                        badgeClass += " is-ahorro";
                        cardPromoClass = "has-promo has-promo-ahorro";
                    } else {
                        // Animación rotatoria (Por defecto o Popular)
                        cardPromoClass = "has-promo has-promo-popular";
                    }
                }
                
                let badgeHtml = brandTag ? `<span class="${badgeClass}" style="margin-top: 2px;">${brandTag}</span>` : '';

                const gxContextBadge = gxCatalogClient.authenticated
                    ? (brand.gxOwned
                        ? `<span class="gx-catalog-context-badge owned">✓ Ya lo tienes</span>`
                        : (brand.gxRecommended ? `<span class="gx-catalog-context-badge recommended">✦ Para ti</span>` : ''))
                    : '';

                const gxReason = gxCatalogClient.authenticated && brand.gxRecommended && !brand.gxOwned
                    ? `<div class="gx-catalog-smart-reason">${brand.gxRecommendationReason}</div>`
                    : '';

                htmlCatalogo += `
                <div class="brand-card ${cardPromoClass} ${brand.gxOwned ? 'gx-owned-service' : ''}"
                     id="brand-card-${bKey}"
                     data-gx-search="${brand.name} ${brand.plans.map(p => p.nombre).join(' ')}"
                     data-gx-owned="${brand.gxOwned ? '1' : '0'}"
                     data-gx-recommended="${brand.gxRecommended ? '1' : '0'}"
                     data-gx-available="${brand.gxAvailable ? '1' : '0'}">
                    <div class="brand-header" role="button" tabindex="0" aria-expanded="false" onclick="toggleBrandCard('${bKey}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleBrandCard('${bKey}');}">
                        <div class="brand-header-left">
                            <img src="${brand.img}" class="brand-logo-img" onerror="this.src='logo2.PNG'">
                            <div class="brand-titles">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap: wrap;">
                                    <div class="brand-name">${brand.name}</div>
                                    ${badgeHtml}
                                </div>
                                <div class="gx-brand-meta"><div class="brand-price-start">Desde $${minPrice}</div>${gxContextBadge}</div>
                            </div>
                        </div>
                        <div class="brand-expand-icon gx-chevron-motion" aria-hidden="true">
                            <svg class="gx-chevron-svg" viewBox="0 0 24 16" aria-hidden="true">
                                <path d="M3.2 4.2L12 11.3L20.8 4.2"></path>
                            </svg>
                        </div>
                    </div>
                    
                    <div class="brand-expanded-content" aria-hidden="true">
                        ${gxReason}
                        <div class="plan-pills-container">
                            ${pillsHtml}
                        </div>
                        
                        <div class="plan-details-box">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;">Beneficios</div>
                                <div class="plan-stock-badge" id="stock-${bKey}" style="margin: 0;">Cargando...</div>
                            </div>
                            <div class="plan-desc-text" id="desc-${bKey}" style="transition: opacity 0.2s;"></div>
                            <div id="smart-combo-${bKey}" class="smart-combo-banner" style="display:none;"></div>
                        </div>
                        
                        <div id="cart-controls-${bKey}" style="transition: opacity 0.2s;"></div>
                    </div>
                </div>`;
            }
            
            if(htmlCatalogo !== '') catalogContainer.innerHTML = htmlCatalogo;

            for (let bKey in window.catalogGroups) {
                selectSubPlan(bKey, 0, null, true);
            }
            gxApplyCatalogFilters();
        }

        function actualizarCarrito(nombre, precio, cambio, safeId) {
            if (!carritoPedidos[nombre]) carritoPedidos[nombre] = { precio: precio, qty: 0 };
            carritoPedidos[nombre].qty += cambio; 
            if (carritoPedidos[nombre].qty < 0) carritoPedidos[nombre].qty = 0;
            
            const qtyEl = document.getElementById('qty-' + safeId);
            if (qtyEl) qtyEl.innerText = carritoPedidos[nombre].qty; 
            
            renderCartFloating();
        }

        function renderCartFloating() {
            let totalItems = 0, totalPrecio = 0;
            for (let item in carritoPedidos) { 
                totalItems += carritoPedidos[item].qty; 
                totalPrecio += (carritoPedidos[item].qty * carritoPedidos[item].precio); 
            }
            const fc = document.getElementById('floating-cart');
            if (totalItems > 0 && document.getElementById('view-catalogo').classList.contains('active')) {
                document.getElementById('cart-items-count').innerText = totalItems + (totalItems === 1 ? " perfil" : " perfiles");
                document.getElementById('cart-total-price').innerText = "$" + totalPrecio + " MXN"; fc.classList.add('show');
            } else { 
                fc.classList.remove('show'); 
            }
        }

        function enviarPedidoBase() {
            let msgDiscord = ""; 
            let totalPrecio = 0;
            
            for (let item in carritoPedidos) {
                if (carritoPedidos[item].qty > 0) { 
                    msgDiscord += `🛒 **${carritoPedidos[item].qty}x** ${item} ($${carritoPedidos[item].precio * carritoPedidos[item].qty} MXN)\n`; 
                    totalPrecio += (carritoPedidos[item].qty * carritoPedidos[item].precio); 
                }
            }
            msgDiscord += `\n💰 **Total estimado:** $${totalPrecio} MXN`;

            const key = getCurrentClientKey();
            let clienteInfo = "👤 **Cliente:** INVITADO (Aún no inicia sesión)";
            if (key && globalClientesData[key]) {
                clienteInfo = `👤 **Cliente:** ${globalClientesData[key].nombre}\n📄 **Folio:** ${globalClientesData[key].folio}`;
            }

            notificarAdmin("pedidos", "🚀 NUEVO PEDIDO RECIBIDO", `${clienteInfo}\n\n${msgDiscord}`, "2ea043");

            const alertContent = document.getElementById('alert-content');
            const dynamicAlert = document.getElementById('dynamic-alert');
            
            alertContent.innerHTML = "<strong>¡Pedido recibido con éxito!</strong><br>Hemos registrado tu solicitud. Te contactaremos en breve o verás los accesos reflejados en tu panel pronto.";
            dynamicAlert.style.display = 'flex';
            dynamicAlert.style.background = 'rgba(46, 160, 67, 0.15)'; 
            dynamicAlert.style.borderColor = 'var(--success-green)';
            
            carritoPedidos = {};
            renderCartFloating();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            setTimeout(() => { dynamicAlert.style.display = 'none'; }, 8000);
        }
