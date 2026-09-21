        const NUMERO_GOXION = "528136836901"; 
        
        const WEBHOOKS_DISCORD = {
            pedidos: "goxion://pedidos",
            soporte: "goxion://soporte",
            logins: "goxion://logins"
        }; 

        let globalClientesData = null;
        let greetingInterval = null;
        let carritoPedidos = {};
        window.goxionCurrentClientKey = "";
        function getCurrentClientKey() { return String(window.goxionCurrentClientKey || ""); }
        
        window.catalogGroups = {}; 

        let gxWelcomeCycle=0;

        function gxWelcomeReducedMotion() {
            return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        }

        function gxWelcomeTrigger() {
            return document.querySelector('.gx-welcome-trigger');
        }

        function gxWelcomeValidRect(rect) {
            return rect && rect.width > 2 && rect.height > 2;
        }

        function gxWelcomeSetShellRect(shell,rect) {
            shell.style.left=`${rect.left}px`;
            shell.style.top=`${rect.top}px`;
            shell.style.width=`${rect.width}px`;
            shell.style.height=`${rect.height}px`;
        }

        function gxWelcomeShellKeyframe(rect,radius) {
            return {
                left:`${rect.left}px`,
                top:`${rect.top}px`,
                width:`${rect.width}px`,
                height:`${rect.height}px`,
                borderRadius:radius
            };
        }

        function gxWelcomeContentNodes(sheet) {
            if(!sheet) return [];
            return [...sheet.children].filter(el =>
                !el.classList.contains('gx-welcome-close')
                && !el.hidden
            );
        }

        async function gxWelcomeRevealContent(modal,sheet,cycle) {
            if(!modal || !sheet || cycle !== gxWelcomeCycle) return;

            const nodes=gxWelcomeContentNodes(sheet);

            if(
                gxWelcomeReducedMotion()
                || typeof sheet.animate!=='function'
            ) {
                modal.classList.remove('gx-welcome-content-entering');
                return;
            }

            modal.classList.add('gx-welcome-content-entering');

            const sheetAnim=sheet.animate([
                {opacity:0,transform:'translateY(6px) scale(.995)'},
                {opacity:1,transform:'translateY(0) scale(1)'}
            ],{
                duration:320,
                easing:'cubic-bezier(.2,.82,.2,1)',
                fill:'both'
            });

            const childAnimations=nodes.map((node,index)=>node.animate([
                {opacity:0,transform:'translateY(9px)',filter:'blur(2.5px)'},
                {opacity:1,transform:'translateY(0)',filter:'blur(0)'}
            ],{
                duration:360,
                delay:70 + index*42,
                easing:'cubic-bezier(.2,.8,.2,1)',
                fill:'both'
            }));

            try {
                await Promise.all([
                    sheetAnim.finished,
                    ...childAnimations.map(a=>a.finished)
                ]);
            } catch(_) {}

            if(cycle !== gxWelcomeCycle) return;

            modal.classList.remove('gx-welcome-content-entering');
            sheetAnim.cancel();
            childAnimations.forEach(a=>a.cancel());
        }

        async function gxWelcomeHideContent(sheet) {
            if(
                !sheet
                || gxWelcomeReducedMotion()
                || typeof sheet.animate!=='function'
            ) return;

            const nodes=gxWelcomeContentNodes(sheet);
            const animations=nodes.map((node,index)=>node.animate([
                {opacity:1,transform:'translateY(0)',filter:'blur(0)'},
                {opacity:0,transform:'translateY(-5px)',filter:'blur(1.5px)'}
            ],{
                duration:170,
                delay:index*12,
                easing:'cubic-bezier(.4,0,.7,.2)',
                fill:'forwards'
            }));

            try {
                await Promise.all(animations.map(a=>a.finished));
            } catch(_) {}
        }

        async function gxAnimateWelcomeOpen(fromRect,cycle) {
            const modal=document.getElementById('gx-welcome-modal');
            const sheet=modal?.querySelector('.gx-welcome-sheet');
            const shell=document.getElementById('gx-welcome-morph-shell');
            if(!modal || !sheet) return;

            const targetRect=sheet.getBoundingClientRect();

            if(
                !shell ||
                !gxWelcomeValidRect(fromRect) ||
                !gxWelcomeValidRect(targetRect) ||
                gxWelcomeReducedMotion() ||
                typeof shell.animate!=='function'
            ) {
                modal.classList.remove('gx-welcome-preparing','gx-welcome-morphing');
                modal.classList.add('gx-welcome-ready');
                return;
            }

            gxWelcomeSetShellRect(shell,fromRect);
            shell.hidden=false;
            modal.classList.add('gx-welcome-morphing');

            try {
                await shell.animate([
                    {...gxWelcomeShellKeyframe(fromRect,'20px'),opacity:1,filter:'saturate(1) brightness(1)'},
                    {
                        ...gxWelcomeShellKeyframe({
                            left:targetRect.left,
                            top:targetRect.top + targetRect.height*.015,
                            width:targetRect.width,
                            height:targetRect.height*.97
                        },'24px'),
                        offset:.78,
                        opacity:1,
                        filter:'saturate(1.06) brightness(1.02)'
                    },
                    {...gxWelcomeShellKeyframe(targetRect,'24px'),opacity:1,filter:'none'}
                ],{
                    duration:560,
                    easing:'cubic-bezier(.2,.82,.18,1)',
                    fill:'forwards'
                }).finished;
            } catch(_) {}

            if(cycle !== gxWelcomeCycle) return;

            /* La tarjeta entra antes de que desaparezca el shell:
               evita el “pum” del contenido apareciendo de golpe. */
            modal.classList.add('gx-welcome-content-entering');
            modal.classList.remove('gx-welcome-preparing','gx-welcome-morphing');
            modal.classList.add('gx-welcome-ready');

            const shellFade = shell.animate(
                [{opacity:1},{opacity:.54,offset:.48},{opacity:0}],
                {duration:300,easing:'ease-out',fill:'forwards'}
            );

            await gxWelcomeRevealContent(modal,sheet,cycle);

            try { await shellFade.finished; } catch(_) {}

            if(cycle !== gxWelcomeCycle) return;
            shell.hidden=true;
            shell.getAnimations().forEach(a=>a.cancel());
        }

        function solicitarCuenta(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const modal=document.getElementById("gx-welcome-modal");
            const form=document.getElementById("gx-welcome-form");
            const result=document.getElementById("gx-welcome-result");
            const actions=document.getElementById("gx-welcome-existing-actions");
            const submit=document.getElementById("gx-welcome-submit");
            const trigger=gxWelcomeTrigger();
            const shell=document.getElementById('gx-welcome-morph-shell');
            if(!modal) return false;

            const cycle=++gxWelcomeCycle;
            const fromRect=trigger?.getBoundingClientRect();

            /* Limpia cualquier animación de un cierre/apertura anterior.
               Así una segunda apertura no puede ser cerrada por una promesa vieja. */
            shell?.getAnimations?.().forEach(a=>a.cancel());
            modal.querySelector('.gx-welcome-sheet')?.getAnimations?.().forEach(a=>a.cancel());
            modal.querySelectorAll('.gx-welcome-sheet *').forEach(el=>{
                el.getAnimations?.().forEach(a=>{ try{ a.cancel(); }catch(_){} });
                if(el instanceof HTMLElement){
                    el.style.removeProperty('opacity');
                    el.style.removeProperty('transform');
                    el.style.removeProperty('filter');
                }
            });
            if(shell) shell.hidden=true;

            if(form) form.hidden=false;
            if(result) {
                result.className="gx-welcome-result";
                result.innerHTML="";
            }
            if(actions) actions.hidden=true;
            if(submit) {
                gxWelcomeValidationState(submit,'idle','Validar y solicitar');
            }

            trigger?.classList.add('gx-welcome-source-active');
            modal.classList.remove(
                'gx-welcome-ready',
                'gx-welcome-closing',
                'gx-welcome-morphing'
            );
            modal.classList.add("show",'gx-welcome-preparing');
            modal.setAttribute("aria-hidden","false");
            document.body.style.overflow="hidden";

            requestAnimationFrame(()=>requestAnimationFrame(()=>{
                if(cycle !== gxWelcomeCycle) return;
                gxAnimateWelcomeOpen(fromRect,cycle);
                setTimeout(()=>{
                    if(cycle === gxWelcomeCycle) {
                        document.getElementById("gx-welcome-name")?.focus({preventScroll:true});
                    }
                },700);
            }));

            return false;
        }

        async function gxCloseWelcomeRegistration(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const cycle=++gxWelcomeCycle;
            const modal=document.getElementById("gx-welcome-modal");
            const sheet=modal?.querySelector('.gx-welcome-sheet');
            const shell=document.getElementById('gx-welcome-morph-shell');
            const backdrop=modal?.querySelector('.gx-welcome-backdrop');
            const trigger=gxWelcomeTrigger();
            if(!modal) return;

            const finish=()=>{
                if(cycle !== gxWelcomeCycle) return;

                shell && (shell.hidden=true);
                shell?.getAnimations?.().forEach(a=>a.cancel());
                sheet?.getAnimations?.().forEach(a=>a.cancel());
                backdrop?.getAnimations?.().forEach(a=>a.cancel());
                sheet?.querySelectorAll?.('*')?.forEach(el=>{
                    el.getAnimations?.().forEach(a=>{ try{ a.cancel(); }catch(_){} });
                    if(el instanceof HTMLElement){
                        el.style.removeProperty('opacity');
                        el.style.removeProperty('transform');
                        el.style.removeProperty('filter');
                    }
                });

                modal.classList.remove(
                    "show",
                    'gx-welcome-ready',
                    'gx-welcome-preparing',
                    'gx-welcome-morphing',
                    'gx-welcome-closing',
                    'gx-welcome-content-entering'
                );
                modal.setAttribute("aria-hidden","true");
                trigger?.classList.remove('gx-welcome-source-active');
                document.body.style.overflow="";

                /* El CTA regresa suavemente, no aparece de golpe. */
                if(
                    trigger
                    && !gxWelcomeReducedMotion()
                    && typeof trigger.animate==='function'
                ) {
                    trigger.animate([
                        {opacity:0,transform:'translateY(3px) scale(.97)'},
                        {opacity:1,transform:'translateY(0) scale(1)'}
                    ],{
                        duration:220,
                        easing:'cubic-bezier(.2,.8,.2,1)'
                    });
                }
            };

            const targetRect=trigger?.getBoundingClientRect();
            const fromRect=sheet?.getBoundingClientRect();

            if(
                !sheet
                || !shell
                || !gxWelcomeValidRect(fromRect)
                || !gxWelcomeValidRect(targetRect)
                || gxWelcomeReducedMotion()
                || typeof shell.animate!=='function'
            ) {
                finish();
                return;
            }

            modal.classList.add('gx-welcome-closing');

            /* El fondo de la página reaparece gradualmente mientras
               la tarjeta se contrae. */
            const backdropFade = backdrop?.animate?.([
                {opacity:1},
                {opacity:.66,offset:.38},
                {opacity:0}
            ],{
                duration:560,
                easing:'cubic-bezier(.4,0,.2,1)',
                fill:'forwards'
            });

            gxWelcomeSetShellRect(shell,fromRect);
            shell.hidden=false;

            const shellIn = shell.animate([
                {opacity:0},
                {opacity:1}
            ],{
                duration:150,
                easing:'ease-out',
                fill:'forwards'
            });

            const sheetOut = sheet.animate([
                {opacity:1,transform:'translateY(0) scale(1)'},
                {opacity:.36,transform:'translateY(-2px) scale(.996)',offset:.60},
                {opacity:0,transform:'translateY(-3px) scale(.994)'}
            ],{
                duration:190,
                easing:'cubic-bezier(.4,0,.7,.2)',
                fill:'forwards'
            });

            await gxWelcomeHideContent(sheet);

            try {
                await Promise.all([shellIn.finished,sheetOut.finished]);
            } catch(_) {}

            if(cycle !== gxWelcomeCycle) return;

            try {
                await shell.animate([
                    {...gxWelcomeShellKeyframe(fromRect,'24px'),opacity:1},
                    {
                        ...gxWelcomeShellKeyframe({
                            left:targetRect.left,
                            top:targetRect.top,
                            width:targetRect.width,
                            height:targetRect.height
                        },'20px'),
                        opacity:1
                    }
                ],{
                    duration:430,
                    easing:'cubic-bezier(.4,0,.2,1)',
                    fill:'forwards'
                }).finished;
            } catch(_) {}

            try { await backdropFade?.finished; } catch(_) {}

            finish();
        }

        async function gxRegistrationToLogin() {
            const name=document.getElementById("gx-welcome-name")?.value?.trim() || "";
            await gxCloseWelcomeRegistration();
            if(typeof openAuthSheet==="function") openAuthSheet();
            setTimeout(()=>{
                const loginId=document.getElementById("login-id");
                if(loginId && name) loginId.value=name;
                document.getElementById("login-pin")?.focus?.({preventScroll:true});
            },420);
        }

        function gxWelcomeValidationState(button,state,label='') {
            if(!button) return;
            const span=button.querySelector('.gx-welcome-submit-label');
            button.classList.remove('gx-welcome-validating','gx-welcome-validated','gx-welcome-validation-error','gx-welcome-status-success','gx-welcome-status-blocked','gx-welcome-status-review');
            if(state==='loading') {button.disabled=true;button.classList.add('gx-welcome-validating');if(span) span.textContent='';button.setAttribute('aria-label','Validando registro');return;}
            if(state==='success' || state==='blocked' || state==='review') {button.disabled=true;button.classList.add(`gx-welcome-status-${state}`);if(span) span.textContent='';button.setAttribute('aria-label',state==='success'?'Solicitud válida':state==='blocked'?'Registro no elegible':'Registro en revisión');return;}
            if(state==='error') {button.disabled=false;button.classList.add('gx-welcome-validation-error');if(span) span.textContent=label || 'Reintentar';button.setAttribute('aria-label',label || 'Reintentar');return;}
            button.disabled=false;if(span) span.textContent=label || 'Validar y solicitar';button.setAttribute('aria-label',label || 'Validar y solicitar');
        }

        async function gxSubmitWelcomeRegistration(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            const name=document.getElementById("gx-welcome-name")?.value?.trim() || "";
            const phone=document.getElementById("gx-welcome-phone")?.value?.trim() || "";
            const form=document.getElementById("gx-welcome-form");
            const result=document.getElementById("gx-welcome-result");
            const actions=document.getElementById("gx-welcome-existing-actions");
            const submit=document.getElementById("gx-welcome-submit");
            const cycle=gxWelcomeCycle;

            if(!result || !submit) return;

            if(name.length<2) {
                result.className="gx-welcome-result error";
                result.textContent="Escribe tu nombre completo.";
                return;
            }
            if(phone.replace(/\D/g,"").length<10) {
                result.className="gx-welcome-result error";
                result.textContent="Escribe un número de WhatsApp válido.";
                return;
            }

            gxWelcomeValidationState(submit,'loading');
            result.className="gx-welcome-result";
            result.innerHTML="";
            if(actions) actions.hidden=true;

            try {
                const [response]=await Promise.all([
                    fetch("https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/registro-goxion",{
                        method:"POST",
                        headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({nombre:name,telefono:phone}),
                        cache:"no-store"
                    }),
                    /* La línea siempre alcanza a completar su recorrido visual. */
                    new Promise(resolve=>setTimeout(resolve,1150))
                ]);

                const data=await response.json().catch(()=>({}));
                if(!response.ok || data?.ok!==true) {
                    throw new Error(data?.error || "No pudimos validar tu registro.");
                }

                /* Si el usuario cerró/reabrió el panel mientras respondía la red,
                   esta respuesta vieja no puede modificar la nueva vista. */
                if(cycle !== gxWelcomeCycle) return;

                if(data.status==="existing") {
                    if(form) form.hidden=true;
                    gxWelcomeValidationState(submit,'blocked');
                    await new Promise(resolve=>setTimeout(resolve,380));
                    if(cycle !== gxWelcomeCycle) return;
                    result.className="gx-welcome-result blocked";
                    result.innerHTML="<strong>Este número ya está registrado</strong><span>Ya existe un registro o espacio GOXION asociado a este número. El -10% es únicamente para clientes completamente nuevos.</span>";
                    if(actions) actions.hidden=false;
                    return;
                }
                if(data.status==="review") {
                    if(form) form.hidden=true;
                    gxWelcomeValidationState(submit,'review');
                    await new Promise(resolve=>setTimeout(resolve,380));
                    if(cycle !== gxWelcomeCycle) return;
                    result.className="gx-welcome-result review";
                    result.innerHTML="<strong>Tu registro necesita revisión</strong><span>Encontramos información que podría corresponder a un registro anterior. Aún no está rechazado: revisaremos el caso antes de autorizar el -10%.</span>";
                    return;
                }
                if(data.status==="already_requested") {
                    if(form) form.hidden=true;
                    gxWelcomeValidationState(submit,'success');
                    await new Promise(resolve=>setTimeout(resolve,380));
                    if(cycle !== gxWelcomeCycle) return;
                    result.className="gx-welcome-result success";
                    result.innerHTML="<strong>Tu solicitud ya está registrada</strong><span>No necesitas enviarla nuevamente. Si es aprobada, recibirás por WhatsApp tu GOXION ID y un código de activación válido por 24 horas.</span>";
                    return;
                }
                if(data.status==="new") {
                    if(!data.already) {
                        notificarAdmin("pedidos","🎁 REGISTRO -10% OFF",`**Nombre:** ${name}\n**WhatsApp:** ${phone}\n**Solicitud:** ${data.request_id || "N/A"}\n\n*Validación inicial: sin coincidencias como cliente previo. El beneficio queda sujeto a alta final.*`,"7c4dff");
                    }
                    if(form) form.hidden=true;
                    gxWelcomeValidationState(submit,'success');
                    await new Promise(resolve=>setTimeout(resolve,380));
                    if(cycle !== gxWelcomeCycle) return;
                    result.className="gx-welcome-result success";
                    result.innerHTML=`<strong>Solicitud registrada</strong><span>Gracias ${name}. Tu solicitud pasó la validación inicial. Si es aprobada en GOXION, recibirás por WhatsApp tu GOXION ID y código de activación.</span>`;
                    return;
                }

                throw new Error("No pudimos determinar el estado de tu solicitud.");
            } catch(error) {
                if(cycle !== gxWelcomeCycle) return;
                result.className="gx-welcome-result error";
                result.textContent=error?.message || "No pudimos validar tu registro.";
                gxWelcomeValidationState(submit,'error','Reintentar');
            }
        }

        async function reclamarCuponSilencioso(nombre, folio, descuento) {
            const btn = document.getElementById('btn-claim-coupon');
            const token = localStorage.getItem('goxion_client_token') || "";
            const key = getCurrentClientKey() || "";

            if(!token || !key) {
                alert("Tu sesión expiró. Inicia sesión nuevamente.");
                return;
            }

            if(btn) {
                btn.disabled = true;
                btn.innerHTML = "⏳ Registrando tu cupón…";
            }

            try {
                const response = await fetch("https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/mi-espacio", {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        "X-Client-Token":token
                    },
                    body:JSON.stringify({modo:"reclamar_cupon"})
                });
                const data = await response.json().catch(() => ({}));

                if(!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || "No fue posible registrar el cupón.");
                }

                if(globalClientesData?.[key]?.gamificacion) {
                    globalClientesData[key].gamificacion.cupon_reclamado = true;
                    globalClientesData[key].gamificacion.cupon_reclamado_at = data.reclamado_at || new Date().toISOString();
                    globalClientesData[key].gamificacion.cupon_reclamado_ciclo = Number(data.ciclo || globalClientesData[key].gamificacion.cupon_ciclo || 1);
                }

                if(btn) {
                    btn.classList.add("gx-claim-done");
                    btn.innerHTML = "✅ Ya has reclamado tu cupón";
                    btn.onclick = null;
                    btn.disabled = true;
                    btn.style.display = "block";
                    btn.style.opacity = "1";
                }

                const cupSubtitle = document.getElementById("gx-coupon-subtitle");
                if(cupSubtitle) {
                    cupSubtitle.innerHTML = '<span style="color:var(--success-green);font-weight:800;">Cupón reclamado ✓</span>';
                    const card = cupSubtitle.closest(".gamif-btn");
                    if(card) {
                        card.classList.remove("gx-referral-ready");
                        const icon = card.querySelector(".gamif-icon");
                        if(icon) icon.textContent = "🥇";
                    }
                }

                if(!data.ya_reclamado) {
                    notificarAdmin(
                        "logins",
                        "🏆 CUPÓN RECLAMADO",
                        `El cliente **${nombre}** (Folio: ${folio}) completó sus misiones y reclamó su **${descuento}% de descuento**.`,
                        "2ea043"
                    );
                }

                lanzarConfeti();
            } catch(error) {
                console.error(error);
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = `✅ Aplicar Cupón del ${descuento}%`;
                }
                alert(error?.message || "No fue posible registrar el cupón.");
            }
        }

        async function reclamarMesGratis(nombre, folio, referidoNombre) {
            const btn = document.getElementById("btn-claim-free-month");
            const token = localStorage.getItem("goxion_client_token") || "";
            const key = getCurrentClientKey() || "";

            if(!token || !key) {
                alert("Tu sesión expiró. Inicia sesión nuevamente.");
                return;
            }

            if(btn) {
                btn.disabled = true;
                btn.innerHTML = "⏳ Registrando beneficio…";
            }

            try {
                const response = await fetch("https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/mi-espacio", {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        "X-Client-Token":token
                    },
                    body:JSON.stringify({modo:"reclamar_mes_referido"})
                });
                const data = await response.json().catch(() => ({}));

                if(!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || "No fue posible registrar tu mes gratis.");
                }

                if(globalClientesData?.[key]?.referido_activo) {
                    globalClientesData[key].referido_activo.beneficio_reclamado = true;
                    globalClientesData[key].referido_activo.beneficio_reclamado_at = data.reclamado_at || new Date().toISOString();
                }

                if(btn) {
                    btn.classList.add("gx-claim-done");
                    btn.innerHTML = "✅ Mes gratis reclamado";
                    btn.onclick = null;
                    btn.disabled = true;
                }

                const refStatus = document.getElementById("gx-referral-status");
                if(refStatus) {
                    refStatus.textContent = "Mes gratis reclamado ✓";
                    refStatus.style.color = "var(--success-green)";
                    const card = refStatus.closest(".gamif-btn");
                    if(card) {
                        card.classList.remove("gx-referral-ready", "pulse-referral", "pulse-mission");
                        const icon = card.querySelector(".gamif-icon");
                        if(icon) icon.textContent = "💝";
                    }
                }

                if(!data.ya_reclamado) {
                    notificarAdmin(
                        "logins",
                        "🎁 MES GRATIS RECLAMADO",
                        `El cliente **${nombre}** (Folio: ${folio}) reclamó su **mes gratis** por el referido **${referidoNombre}**.`,
                        "00ff9d"
                    );
                }

                lanzarConfeti();
            } catch(error) {
                console.error(error);
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = "🎁 Reclama tu mes gratis";
                }
                alert(error?.message || "No fue posible registrar tu mes gratis.");
            }
        }

        window.solicitarMejoraSilenciosa = function(mejoraStr) {
            const key = getCurrentClientKey();
            if(!key || !globalClientesData[key]) return;
            
            let cliente = globalClientesData[key];
            notificarAdmin("pedidos", "🔥 SOLICITUD DE UPGRADE", `El cliente **${cliente.nombre}** (Folio: ${cliente.folio}) quiere agregar: **${mejoraStr}** para armar su Combo GOXION.`, "ffaa00");
            
            alert("¡Excelente decisión! Hemos notificado a nuestro equipo para aplicar la mejora a tu cuenta. Te contactaremos en breve para confirmar la activación.");
        };

        function revealOnScroll() {
            var reveals = document.querySelectorAll(".reveal");
            for (var i = 0; i < reveals.length; i++) {
                var windowHeight = window.innerHeight;
                var elementTop = reveals[i].getBoundingClientRect().top;
                var elementVisible = 50;
                if (elementTop < windowHeight - elementVisible) {
                    reveals[i].classList.add("active");
                }
            }
        }
        window.addEventListener("scroll", revealOnScroll);

        window.addEventListener('scroll', () => {
            const bar = document.getElementById('sticky-client-bar');
            const dashActive = document.getElementById('view-dashboard').classList.contains('active');
            
            if (dashActive && window.scrollY > 120) {
                bar.classList.add('show');
            } else if (bar) {
                bar.classList.remove('show');
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            // Tras una recarga, la identidad vive otra vez sólo en memoria.
            // Si existe token, esperamos a Supabase antes de decidir la vista final.
            const hasSessionToken = Boolean(localStorage.getItem('goxion_client_token'));
            const initialKey = getCurrentClientKey();
            const restoringSession = hasSessionToken && !initialKey;

            if(initialKey || restoringSession) {
                document.getElementById('view-inicio').classList.remove('active');
                document.getElementById('view-dashboard').classList.add('active');
                document.getElementById('tab-inicio-icon').innerText = '👤';
                document.getElementById('tab-inicio-text').innerText = 'Mi Espacio';

                const guestCard = document.getElementById('guest-action-card');
                if(guestCard) guestCard.style.display = 'none';

                // No mostramos "Cerrar Sesión" hasta confirmar qué cliente corresponde al token.
                document.getElementById('header-btn-text').innerText =
                    initialKey ? 'Cerrar Sesión' : 'Mi Espacio';
            } else {
                document.getElementById('view-inicio').classList.add('active');
                document.getElementById('view-dashboard').classList.remove('active');
            }
            setTimeout(revealOnScroll, 100);

            const popLogosEls = document.querySelectorAll('.pop-logo');
            let popIdx = 0;
            if(popLogosEls.length > 0) {
                setInterval(() => {
                    popLogosEls.forEach(el => el.classList.remove('active'));
                    popIdx = (popIdx + 1) % popLogosEls.length;
                    popLogosEls[popIdx].classList.add('active');
                }, 3000);
            }

            const comboPairs = [
                ["logos/hbo-max.PNG", "logos/prime-video.PNG"],
                ["logos/netflix.PNG", "logos/spotify.PNG"],
                ["logos/disney.PNG", "logos/youtube.PNG"]
            ];
            let comboIdx = 0;
            const leftEl = document.getElementById('combo-img-left');
            const rightEl = document.getElementById('combo-img-right');
            
            if(leftEl && rightEl) {
                setInterval(() => {
                    comboIdx = (comboIdx + 1) % comboPairs.length;
                    leftEl.src = comboPairs[comboIdx][0];
                    rightEl.src = comboPairs[comboIdx][1];
                }, 4000); 
            }

            const benefitsEls = document.querySelectorAll('.rotating-benefit-item');
            let benIdx = 0;
            if(benefitsEls.length > 0) {
                setInterval(() => {
                    benefitsEls.forEach(el => el.classList.remove('active'));
                    benIdx = (benIdx + 1) % benefitsEls.length;
                    benefitsEls[benIdx].classList.add('active');
                }, 3500);
            }
        });

        const rotatorTexts = [
            "✓ Calidad 4K Ultra HD", 
            "✓ Perfiles 100% privados", 
            "✓ Renovación sin perder historial", 
            "✓ Compatibles con cualquier TV"
        ];
        
        let rotatorIdx = 0;
        setInterval(() => {
            const textEl = document.getElementById('dynamic-rotator');
            const boxEl = document.getElementById('rotator-box');
            if(textEl && boxEl) {
                textEl.style.opacity = '0';
                setTimeout(() => {
                    rotatorIdx = (rotatorIdx + 1) % rotatorTexts.length;
                    textEl.innerText = rotatorTexts[rotatorIdx];
                    textEl.style.opacity = '1';
                }, 400); 
            }
        }, 4000);

        const INFO_SERVICIOS = {
            "netflix": "Vive una experiencia superior con tu perfil totalmente individual y personalizable con PIN. Disfruta películas y estrenos en calidad 4K Ultra HD y sonido Dolby Atmos. Tu historial, lista de favoritos y recomendaciones se mantienen completamente privados.",
            "disney": "Acceso ilimitado al catálogo de Disney, Pixar, Marvel, Star Wars y National Geographic en calidad 4K UHD. Disfruta de un perfil individual para descargas offline y visualización cómoda sin interrupciones.",
            "max": "Suscripción Platino con calidad de video 4K UHD. Disfruta del universo de HBO, Warner Bros, DC Comics y Cartoon Network. Tu perfil privado garantiza que siempre reanudes donde te quedaste.",
            "prime": "Accede al catálogo completo de Prime Video. Perfil personalizado, reproducción en calidad superior 4K y descargas habilitadas para disfrutar contenido sin conexión a internet.",
            "youtube": "¡Doble beneficio! Incluye YouTube Premium (videos sin anuncios) y acceso total a YouTube Music Premium. Reproducción en segundo plano y descargas offline para todos tus dispositivos móviles o TV.",
            "vix": "Todos los partidos de la Liga MX, contenido de TV exclusivo, telenovelas y los mejores estrenos premium en español sin una sola interrupción publicitaria.",
            "crunchyroll": "Membresía Mega Fan. Disfruta del anime sin publicidad, episodios de estreno simulcast y visualización offline.",
            "spotify": "Música infinita sin anuncios, opción para descargas y calidad de sonido superior. Podemos asignarte un perfil individual o hacer el Upgrade a tu propia cuenta personal.",
            "microsoft": "Membresía Microsoft 365 Family. Incluye 1TB de almacenamiento seguro en nube (OneDrive) y acceso completo a las aplicaciones premium (Word, Excel, PowerPoint) para tus dispositivos.",
            "google": "Expande rápidamente tu almacenamiento en la nube para Google Drive, Gmail y Google Fotos. Además, desbloquea las funciones de edición avanzadas en la aplicación de Fotos.",
            "default": "Perfil seguro y estable. Garantizamos protección total, reposición inmediata en caso de caídas y soporte técnico dedicado durante todo tu periodo de suscripción."
        };

        function hideSplash() {
            const splash = document.getElementById('splash-screen');
            if (splash.style.opacity === '0') return;
            splash.style.opacity = '0';
            setTimeout(() => { 
                splash.style.visibility = 'hidden'; 
                document.body.classList.remove('no-scroll'); 
            }, 600);
        }

        window.addEventListener('load', async () => {
            // Evita mostrar fugazmente el Inicio público antes de restaurar Mi Espacio.
            const splashFallback = setTimeout(hideSplash, 4500);
            try {
                await cargarDatosYVerificarSesion();
            } finally {
                clearTimeout(splashFallback);
                actualizarBloqueoSoporte();
                setTimeout(hideSplash, 250);
            }
        });

        function actualizarBloqueoSoporte() {
            const overlay = document.getElementById("support-lock-overlay");
            const soporteView = document.getElementById("view-soporte");
            if (!overlay || !soporteView) return;

            const token = localStorage.getItem("goxion_client_token") || "";
            const key = getCurrentClientKey() || "";
            const autenticado = Boolean(token && key);
            const soporteActivo = soporteView.classList.contains("active");
            const bloquearScroll = !autenticado && soporteActivo;

            overlay.classList.toggle("show", !autenticado);
            overlay.setAttribute("aria-hidden", autenticado ? "true" : "false");

            if (bloquearScroll) {
                window.scrollTo({ top: 0, behavior: "auto" });
            }

            document.body.classList.toggle("support-scroll-locked", bloquearScroll);
        }

        function openModal(id) { document.getElementById(id).classList.add('show'); }
        function closeModal(id) { document.getElementById(id).classList.remove('show'); }
        window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('show'); }

        function iniciarSaludoDinamico(nombreCompleto) {
            const primerNombre = String(nombreCompleto || "Cliente").trim().split(/\s+/)[0] || "Cliente";
            const frases = [
                `¡Hola, <span>${primerNombre}</span>! 👋`, 
                `¡Qué gusto verte, <span>${primerNombre}</span>! ✨`, 
                `¡Bienvenido a tu espacio, <span>${primerNombre}</span>! 🚀`, 
                `Todo en orden por aquí, <span>${primerNombre}</span> 💎`
            ];
            let index = 0;
            const el = document.getElementById('dynamic-greeting-text');
            if(!el) return;
            
            if(greetingInterval) clearInterval(greetingInterval);
            el.innerHTML = frases[0]; 
            el.style.opacity = 1;
            
            greetingInterval = setInterval(() => {
                el.style.opacity = 0;
                setTimeout(() => { 
                    index = (index + 1) % frases.length; 
                    el.innerHTML = frases[index]; 
                    el.style.opacity = 1; 
                }, 500);
            }, 6000);
        }

    function resetSesionVisual() {
            window.goxionCurrentClientKey = "";
            if(greetingInterval) clearInterval(greetingInterval);
            document.getElementById('header-btn-text').innerText = 'Mi Espacio'; 
            document.getElementById('tab-inicio-icon').innerText = '🏠';
            document.getElementById('tab-inicio-text').innerText = 'Inicio';
            document.getElementById('login-id').value = ''; 
            document.getElementById('login-pin').value = '';
            
            const stickyName = document.getElementById('sticky-client-name');
            if(stickyName) stickyName.innerText = '';
            const bar = document.getElementById('sticky-client-bar');
            if(bar) bar.classList.remove('show');

            const guestCard = document.getElementById('guest-action-card');
            if(guestCard) guestCard.style.display = 'block';

            switchTab('inicio');
        
    }


        function irAlTicket() { 
            const key = getCurrentClientKey(); 
            if(key) {
                setTimeout(() => {
                    const indexUrl = new URL("index.html", window.location.href);
                    indexUrl.search = "";
                    indexUrl.hash = "";
                    indexUrl.searchParams.set("cliente", key);
                    window.location.href = indexUrl.toString(); 
                }, 800);
            }
        }

        function copiarDatoRapido(texto, tipo) { 
            navigator.clipboard.writeText(texto); 
            alert(`¡${tipo} copiado al portapapeles!`); 
        }

        function animarMisionesCompletadasEnSecuencia() {
            const items = Array.from(document.querySelectorAll('#gamif-expanded-coupon .mission-item.done'));
            const total = document.querySelectorAll('#gamif-expanded-coupon .mission-item').length;

            if(!items.length || items.length !== total) return;

            items.forEach(item => {
                item.classList.remove('gx-sequence-reveal', 'gx-seq-hidden');
                item.classList.add('gx-seq-hidden');
            });

            items.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.remove('gx-seq-hidden');
                    item.classList.remove('gx-sequence-reveal');
                    void item.offsetWidth;
                    item.classList.add('gx-sequence-reveal');

                    setTimeout(() => {
                        item.classList.remove('gx-sequence-reveal');
                    }, 760);
                }, 180 + (index * 360));
            });
        }

        window.lanzarConfeti = function() {
            for(let i=0; i<40; i++) {
                let conf = document.createElement('div');
                conf.style.position = 'fixed';
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.top = '-10px';
                conf.style.width = Math.random() * 8 + 4 + 'px';
                conf.style.height = Math.random() * 8 + 4 + 'px';
                conf.style.backgroundColor = ['#00f2fe', '#7c4dff', '#ff3366', '#ffaa00', '#2ea043'][Math.floor(Math.random()*5)];
                conf.style.zIndex = '9999';
                conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                conf.style.transition = 'transform 2.5s cubic-bezier(0.2, 0.8, 0.2, 1), top 2.5s ease-in, opacity 2.5s';
                document.body.appendChild(conf);
                
                setTimeout(() => {
                    conf.style.top = '100vh';
                    conf.style.transform = `rotate(${Math.random() * 720}deg) translateX(${Math.random() * 150 - 75}px)`;
                    conf.style.opacity = '0';
                }, 50);
                setTimeout(() => conf.remove(), 2600);
            }
        };

        function mostrarMisionCompletada() {
            let toast = document.getElementById("gx-mission-toast");
            if(!toast) {
                toast = document.createElement("div");
                toast.id = "gx-mission-toast";
                toast.className = "gx-mission-toast";
                toast.innerHTML = "<span>✅</span><span>Misión completada</span>";
                document.body.appendChild(toast);
            }

            toast.classList.remove("show");
            void toast.offsetWidth;
            toast.classList.add("show");

            clearTimeout(toast._gxTimer);
            toast._gxTimer = setTimeout(() => toast.classList.remove("show"), 3650);
        }

        function marcarMisionVisual(index, btnId = 'btn-claim-coupon', celebrar = true) {
            const item = document.getElementById('mission-' + index);
            if(!item || item.classList.contains('done')) return;
            item.classList.add('done');
            item.classList.remove('locked');
            const checkbox = item.querySelector('.mission-checkbox');
            if(checkbox) checkbox.innerHTML = '';

            const couponPanel = document.getElementById('gamif-expanded-coupon');
            if(couponPanel && couponPanel.style.display === 'block') {
                item.classList.remove('gx-mission-just-completed');
                void item.offsetWidth;
                item.classList.add('gx-mission-just-completed');
                setTimeout(() => item.classList.remove('gx-mission-just-completed'), 900);
            }

            if(celebrar) {
                mostrarMisionCompletada();
                lanzarConfeti();
            }

            const allMissions = [...document.querySelectorAll('.mission-item')];
            const allDone = allMissions.length > 0 && allMissions.every(m => m.classList.contains('done'));
            const claimBtn = document.getElementById(btnId);
            if(claimBtn && !claimBtn.classList.contains('gx-claim-done')) {
                claimBtn.style.display = allDone ? 'block' : 'none';
                claimBtn.style.opacity = allDone ? '1' : '0';
                if(allDone && celebrar) {
                    setTimeout(lanzarConfeti, 300);
                    setTimeout(lanzarConfeti, 800);
                }
            }
        }

        window.toggleMission = async function(index, btnId, folio) {
            const item = document.getElementById('mission-' + index);
            if(!item || item.classList.contains('done')) return;
            try {
                const result = await window.goxionMissionAPI.completeIndex(index);
                const completed = Array.isArray(result?.completadas) ? result.completadas : [index];
                completed.forEach(i => marcarMisionVisual(Number(i), btnId, Number(i) === Number(index)));
                const key = getCurrentClientKey();
                const gamif = key && globalClientesData?.[key]?.gamificacion;
                if(gamif) gamif.progreso = Array.isArray(result?.progreso) ? result.progreso : gamif.progreso;
            } catch(e) {
                console.error("No se pudo guardar la misión:", e);
                alert("No fue posible sincronizar tu avance. Inténtalo nuevamente.");
            }
        };

        let activeFeedbackMissionIdx = null;
        let activeFeedbackFolio = null;

        window.openFeedbackModal = function(idx = null, folio = null) {
            activeFeedbackMissionIdx = idx;
            const key = getCurrentClientKey();
            activeFeedbackFolio = folio || (key && globalClientesData[key] ? globalClientesData[key].folio : null);
            document.getElementById('feedback-text').value = '';
            const feedbackSuccess = document.getElementById('feedback-success');
            const feedbackBtn = document.getElementById('btn-send-feedback');
            feedbackSuccess.style.display = 'none';
            feedbackSuccess.classList.remove('gx-feedback-message');
            feedbackBtn.style.display = 'block';
            feedbackBtn.disabled = false;
            feedbackBtn.classList.remove('gx-feedback-sending', 'gx-feedback-success');
            feedbackBtn.innerHTML = 'Enviar Comentario';
            openModal('modal-feedback');
        };

        window.enviarFeedback = function() {
            let text = document.getElementById('feedback-text').value.trim();
            if(!text) return alert("Por favor, escribe un comentario antes de enviar.");
            
            const key = getCurrentClientKey();
            let clienteNombre = key && globalClientesData[key] ? globalClientesData[key].nombre : "Usuario Anónimo";
            let clienteFolio = activeFeedbackFolio || (key && globalClientesData[key] ? globalClientesData[key].folio : "N/A");
            
            notificarAdmin("soporte", "💬 Nuevo Feedback Recibido", `**Cliente:** ${clienteNombre} (Folio: ${clienteFolio})\n**Comentario:**\n"${text}"`, "ffaa00");
            
            const feedbackBtn = document.getElementById('btn-send-feedback');
            const feedbackSuccess = document.getElementById('feedback-success');

            feedbackBtn.disabled = true;
            feedbackBtn.classList.add('gx-feedback-sending');
            feedbackBtn.textContent = 'Enviando…';

            setTimeout(() => {
                feedbackBtn.classList.remove('gx-feedback-sending');
                feedbackBtn.classList.add('gx-feedback-success');
                feedbackBtn.innerHTML = '✓ Comentario enviado';
                feedbackSuccess.classList.add('gx-feedback-message');
            }, 160);
            
            if(activeFeedbackMissionIdx !== null) {
                toggleMission(activeFeedbackMissionIdx, 'btn-claim-coupon', activeFeedbackFolio);
            } else {
                completarMisionInteligente('feedback');
            }
            
            setTimeout(() => {
                closeModal('modal-feedback');
            }, 1650);
        };

        window.completarMisionInteligente = async function(tipo) {
            const key = getCurrentClientKey();
            if(!key || !globalClientesData?.[key]) return;
            try {
                const result = await window.goxionMissionAPI.completeType(tipo);
                const completed = Array.isArray(result?.completadas) ? result.completadas : [];
                completed.forEach((idx, pos) => marcarMisionVisual(Number(idx), 'btn-claim-coupon', pos === 0));
                const gamif = globalClientesData[key].gamificacion;
                if(gamif) gamif.progreso = Array.isArray(result?.progreso) ? result.progreso : gamif.progreso;
            } catch(e) {
                console.error(`No se pudo registrar la misión ${tipo}:`, e);
            }
        };

        window.abrirRedSocial = function(idx, folio, url) {
            if(!url.startsWith('http')) url = 'https://' + url;
            window.open(url, '_blank');
            setTimeout(() => {
                let m = document.getElementById('mission-' + idx);
                if(m && !m.classList.contains('done')) {
                    m.classList.remove('locked');
                    m.querySelector('.mission-checkbox').innerHTML = '';
                    m.onclick = function() { toggleMission(idx, 'btn-claim-coupon', folio); };
                    toggleMission(idx, 'btn-claim-coupon', folio);
                }
            }, 2000);
        };

        window.compartirAppGoxion = function(msgWhatsApp) {
            let text = '¡Te invito a unirte a GOXION para tener los mejores servicios de streaming! Usa este enlace para contactarlos y decirles que vas de mi parte: https://wa.me/' + NUMERO_GOXION + '?text=' + encodeURIComponent(msgWhatsApp);
            window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
            setTimeout(() => {
                completarMisionInteligente('compartir');
                completarMisionInteligente('referidos');
            }, 2000);
        };
        
        window.copiarEnlace = function() {
            const input = document.getElementById('ref-link-input');
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value);
            alert("¡Enlace copiado al portapapeles!");
            completarMisionInteligente('compartir');
            completarMisionInteligente('referidos');
        };

        function toggleCreds(id) { 
            const box = document.getElementById(id); 
            box.style.display = (box.style.display === 'none') ? 'flex' : 'none'; 
        }

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

                const paymentMeta = (p) => {
                    const estado = gxNormalizeUiText(p?.estado || '');
                    const notas = gxNormalizeUiText(p?.notas || '');

                    const isLate = /(mora|recargo|tarde|tardio|atras|vencid|fuera de fecha)/.test(notas);
                    const isReview = /(revision|revisi[oó]n|pendiente)/.test(estado) || /(revision|revisi[oó]n)/.test(notas);
                    const isPaid = /(pagado|aprobado|acreditado)/.test(estado);

                    if (isLate) {
                        return {
                            label:'Pagaste mora',
                            badgeClass:'late',
                            loyalty:'No sumó lealtad',
                            loyaltyClass:'no',
                            status:'Acreditado'
                        };
                    }

                    if (isReview) {
                        return {
                            label:'En revisión',
                            badgeClass:'review',
                            loyalty:'Lealtad pendiente',
                            loyaltyClass:'no',
                            status:'Revisión'
                        };
                    }

                    if (isPaid) {
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

                const money = (value) => Number(value || 0).toLocaleString('es-MX',{
                    style:'currency',
                    currency:'MXN',
                    minimumFractionDigits:2
                });

                historyHTML = `<div id="gx-payment-history-card" class="gx-payment-history-card">`;

                pagosHist.forEach((p,index) => {
                    const meta = paymentMeta(p);

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
            const token=localStorage.getItem('goxion_client_token') || '';
            if(!servicio?.id || !token) return;

            const pending=(servicio.novedades||[]).some(n=>String(n?.tipo||'')!=='password');
            if(!pending) return;

            try {
                await fetch('https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/novedades-cliente',{
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
            const token=localStorage.getItem('goxion_client_token') || '';
            if(!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
            const r=await fetch('https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/cancelaciones-cliente',{
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
            const token = localStorage.getItem('goxion_client_token') || '';
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
                const r=await fetch('https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/credenciales-cliente',{
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

        let selectedPlat = "", currentIssues = {};
        
        const DATABASE_ISSUES = { 
            "Netflix": [ 
                { 
                    issue: "🔑 Solicitar Código de Acceso", 
                    instructions: "1. En tu pantalla selecciona 'Iniciar Sesión con Código'.<br>2. Al hacerlo, el sistema enviará un código <strong>al correo que nosotros administramos</strong>.<br>3. Abajo indícanos el correo exacto que aparece en tu pantalla y envíanos la solicitud. Te responderemos con el código al instante.", 
                    labelInput: "Correo que aparece en tu TV:", 
                    templateWA: "Hola GOXION, acabo de enviar un código al correo asignado. Solicito CÓDIGO DE ACCESO para NETFLIX.\n\n👤 Correo en pantalla: " 
                }, 
                { 
                    issue: "📺 Tu TV pide Actualizar Hogar", 
                    instructions: "1. Selecciona <strong>'Actualizar Hogar'</strong> en tu TV.<br>2. La pantalla enviará un correo de confirmación <strong>a nuestra bandeja</strong>.<br>3. Ingresa abajo el correo que aparece en pantalla y envíanos tu solicitud para autorizar tu TV.", 
                    labelInput: "Correo que aparece en tu TV:", 
                    templateWA: "Hola GOXION, mi TV pide actualizar HOGAR en NETFLIX. Ya envié el correo de autorización.\n\n📧 Correo en pantalla: " 
                }, 
                { 
                    issue: "⚠️ Límite de Pantallas", 
                    instructions: "Recuerda que cada perfil equivale a 1 pantalla. Si te marca límite, revisa que no tengas otra TV usándolo al mismo tiempo. Si el problema persiste, indícanos el nombre de tu perfil para revisarlo.", 
                    labelInput: "Nombre de tu Perfil:", 
                    templateWA: "Hola GOXION, tengo problemas de límite de pantallas en NETFLIX.\n\n👤 Mi Perfil es: " 
                } 
            ],
            "Disney+": [ 
                { 
                    issue: "🔑 Código de Verificación", 
                    instructions: "1. Ingresa a la app y presiona 'Continuar' con el correo asignado.<br>2. La plataforma enviará un código de 6 dígitos <strong>a nuestra bandeja de entrada</strong>.<br>3. Escribe el correo aquí abajo para indicarnos que ya lo solicitaste y te lo enviaremos.", 
                    labelInput: "El correo que acabas de ingresar:", 
                    templateWA: "Hola GOXION, solicito CÓDIGO DE VERIFICACIÓN para DISNEY+.\n\n📧 Correo: " 
                }, 
                { 
                    issue: "🏠 Mensaje de 'Hogar Principal'", 
                    instructions: "Selecciona 'Actualizar Hogar' en tu dispositivo. Eso nos enviará una solicitud de autorización al correo maestro. Escríbelo abajo para proceder.", 
                    labelInput: "Correo de tu cuenta Disney+:", 
                    templateWA: "Hola GOXION, Disney+ me pide autorización de Hogar.\n\n📧 Correo asignado: " 
                } 
            ],
            "Max": [ 
                { 
                    issue: "🔑 Iniciar Sesión con Código", 
                    instructions: "1. Selecciona 'Iniciar Sesión con un Código' en tu TV.<br>2. Aparecerán 6 letras/números en tu pantalla.<br>3. Como nosotros manejamos la plataforma, escribe ese código abajo para que nosotros lo vinculemos manually.", 
                    labelInput: "Código en tu pantalla de TV:", 
                    templateWA: "Hola GOXION, solicito que vinculen mi TV a MAX.\n\n🔤 Código TV: " 
                }, 
                { 
                    issue: "❌ Contraseña Incorrecta", 
                    instructions: "Asegúrate de no haber dejado espacios al copiar los datos. Si no te deja entrar, indícanos el correo de la cuenta para enviarte la contraseña actualizada.", 
                    labelInput: "Correo de la cuenta MAX:", 
                    templateWA: "Hola GOXION, me marca contraseña incorrecta en MAX.\n\n📧 Correo: " 
                } 
            ],
            "Prime Video": [ 
                { 
                    issue: "📺 Registrar Dispositivo", 
                    instructions: "1. Abre Prime Video y presiona 'Identifícate'.<br>2. Mostrará un código de registro en pantalla.<br>3. Escríbelo abajo para que nosotros enlacemos tu dispositivo desde nuestro panel maestro.", 
                    labelInput: "Código en Pantalla de TV:", 
                    templateWA: "Hola GOXION, solicito vincular mi TV a PRIME VIDEO.\n\n📺 Código TV: " 
                } 
            ],
            "YouTube": [ 
                { 
                    issue: "📩 No me llegó la invitación", 
                    instructions: "Verifica tu carpeta de SPAM en Gmail. Recuerda que no debes estar en otro grupo familiar activo. Si no está, compártenos tu correo para reenviarla.", 
                    labelInput: "Tu correo personal de Gmail:", 
                    templateWA: "Hola GOXION, requiero reenviar la INVITACIÓN a YOUTUBE PREMIUM.\n\n📧 Mi Gmail: " 
                } 
            ],
            "ViX": [ 
                { 
                    issue: "🔑 Vincular TV o Iniciar Sesión", 
                    instructions: "Selecciona 'Iniciar Sesión'. Envíanos el código alfanumérico que aparece en tu pantalla de TV para enlazarlo desde nuestra base de datos.", 
                    labelInput: "Código en pantalla:", 
                    templateWA: "Hola GOXION, necesito ayuda para vincular VIX PREMIUM.\n\n📱 Código TV: " 
                } 
            ],
            "Crunchyroll": [ 
                { 
                    issue: "🔑 Vincular Consola o TV", 
                    instructions: "Dirígete a 'Activar dispositivo' en tu consola o TV. Aparecerá un código, escríbelo aquí para que nosotros autoricemos la cuenta.", 
                    labelInput: "Código de activación de pantalla:", 
                    templateWA: "Hola GOXION, solicito vincular mi dispositivo a CRUNCHYROLL.\n\n🎮 Código: " 
                } 
            ],
            "Microsoft": [ 
                { 
                    issue: "💻 Reenviar Invitación familiar", 
                    instructions: "Indícanos el correo personal (Outlook/Hotmail) con el que te uniste para verificar y enviarte el enlace nuevamente.", 
                    labelInput: "Tu correo Outlook/Hotmail:", 
                    templateWA: "Hola GOXION, necesito que me reenvíen la invitación de MICROSOFT 365.\n\n📧 Correo: " 
                } 
            ],
            "Google One": [ 
                { 
                    issue: "☁️ Espacio no reflejado", 
                    instructions: "Asegúrate de haber aceptado la invitación de familia en tu Gmail. Indícanos tu correo si sigues sin ver los beneficios.", 
                    labelInput: "Tu correo Gmail personal:", 
                    templateWA: "Hola GOXION, sigo sin ver reflejado mi almacenamiento de GOOGLE ONE.\n\n📧 Mi Gmail: " 
                } 
            ],
            "Default": [ 
                { 
                    issue: "🔑 Solicitar Código / Asistencia", 
                    instructions: "Inicia sesión en tu dispositivo. Si te solicita un código o confirmación por correo, presiona 'Enviar' e indícanos tu correo o código en pantalla para proceder.", 
                    labelInput: "Dato en pantalla / Correo:", 
                    templateWA: "Hola GOXION, requiero asistencia/código para la plataforma seleccionada.\n\n📱 Dato: " 
                } 
            ]
        };

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

            const anim = card.animate(
                [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
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
                heightAnim = card.animate(
                    [{ height: `${firstCardHeight}px` }, { height: `${lastCardHeight}px` }],
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

    