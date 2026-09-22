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
                    const GXCORE = window.GOXION_CORE;
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
                    fetch(GXCORE.endpoint("registro-goxion"),{
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
