(() => {
        const GXCORE = window.GOXION_CORE;
    const PROJECT_URL=GXCORE.SUPABASE_ORIGIN;
    const ACCOUNTS_URL=`${PROJECT_URL}/functions/v1/cuentas-plataforma-admin-beta`;
    const CANCELLATIONS_URL=`${PROJECT_URL}/functions/v1/cancelaciones-admin`;

    window.gxPlatformAccountState={cuentas:[],asignaciones:[],loaded:false};
    let gxDecisionCancellationCount=0;

    const esc=v=>String(v??"")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const norm=v=>String(v??"").trim().toLowerCase();

    async function api(url,accion,datos={}){
        const token=localStorage.getItem(GXCORE.STORAGE.ADMIN_TOKEN)||"";
        const r=await fetch(url,{
            method:"POST",
            headers:{"Content-Type":"application/json","X-Admin-Token":token},
            body:JSON.stringify({accion,datos}),
            cache:"no-store"
        });
        const j=await r.json().catch(()=>({}));
        if(!r.ok||j?.ok!==true)throw new Error(j?.error||`HTTP ${r.status}`);
        return j;
    }

    function catalog(){
        return Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales:[];
    }
    function accountById(id){
        return gxPlatformAccountState.cuentas.find(a=>String(a.id)===String(id))||null;
    }
    function assignmentByServiceRow(id){
        return gxPlatformAccountState.asignaciones.find(a=>String(a.cliente_servicio_id)===String(id))||null;
    }
    function accountsForService(serviceId){
        return gxPlatformAccountState.cuentas.filter(a=>String(a.servicio_id)===String(serviceId)&&a.activo!==false);
    }
    function clientService(key,index){
        return clientesDict?.[key]?.servicios?.[Number(index)]||null;
    }

    // -----------------------------------------------------
    // TU VEREDICTO
    // -----------------------------------------------------
    window.gxOpenDecision=function(kind){
        goAdminTab("tab-operaciones");
        setTimeout(()=>{
            const label=kind==="payments"?"pagos":kind==="cancellations"?"cancel":"soporte";
            const buttons=[...document.querySelectorAll("#tab-operaciones button")];
            const btn=buttons.find(b=>norm(b.textContent).includes(label));
            btn?.click?.();
        },80);
    };

    window.gxRefreshDecisionCenter=async function(){
        const clients=Object.values(clientesDict||{});
        const payments=clients.filter(c=>c?.pago_en_revision===true).length;
        const support=(window.gxAdminNotifications||[]).filter(n=>{
            if(n?.leida===true)return false;
            const t=norm(n?.tipo),title=norm(n?.titulo),msg=norm(n?.mensaje);
            const cancel=title.includes("cancel")||msg.includes("cancel");
            return !cancel&&(t.includes("soporte")||title.includes("soporte"));
        }).length;

        try{
            const c=await api(CANCELLATIONS_URL,"listar",{});
            gxDecisionCancellationCount=(c.solicitudes||[]).filter(x=>String(x.estado)==="solicitada").length;
        }catch(e){
            console.warn("Tu veredicto / cancelaciones",e);
        }

        const total=payments+gxDecisionCancellationCount+support;
        const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
        set("gx-decision-payments",payments);
        set("gx-decision-cancellations",gxDecisionCancellationCount);
        set("gx-decision-support",support);
        set("gx-decision-total",`${total} pendiente${total===1?"":"s"}`);
    };

    // -----------------------------------------------------
    // CUENTAS MADRE
    // -----------------------------------------------------
    async function loadAccounts(){
        try{
            const r=await api(ACCOUNTS_URL,"listar",{});
            gxPlatformAccountState={
                cuentas:Array.isArray(r.cuentas)?r.cuentas:[],
                asignaciones:Array.isArray(r.asignaciones)?r.asignaciones:[],
                loaded:true
            };
            populatePlatformSelect();
            window.gxRenderPlatformAccounts();
            window.gxHydrateMasterAccountSelectors();
        }catch(e){
            console.error(e);
            const list=document.getElementById("gx-account-manager-list");
            if(list)list.innerHTML=`<div class="gx-empty-inline">No se pudieron cargar las cuentas: ${esc(e.message||e)}</div>`;
        }
    }
    window.gxLoadPlatformAccounts=loadAccounts;

    function populatePlatformSelect(){
        const sel=document.getElementById("gx-account-platform");
        if(!sel)return;
        const prev=sel.value;
        const list=catalog();
        sel.innerHTML=list.map((s,i)=>`<option value="${esc(String(s._id||s.id||""))}">${esc(s.nombre||"Servicio")}</option>`).join("");
        if(prev&&list.some(s=>String(s._id||s.id)===prev))sel.value=prev;
        const current=list.find(s=>String(s._id||s.id)===sel.value)||list[0];
        if(current){
            const limit=document.getElementById("gx-account-new-limit");
            if(limit&&!limit.dataset.touched)limit.value=String(Math.max(1,Number(current.limite||5)));
        }
    }

    window.gxAccountPlatformChanged=function(){
        const limit=document.getElementById("gx-account-new-limit");
        if(limit)delete limit.dataset.touched;
        populatePlatformSelect();
        window.gxRenderPlatformAccounts();
    };

    window.gxRenderPlatformAccounts=function(){
        const list=document.getElementById("gx-account-manager-list");
        const sel=document.getElementById("gx-account-platform");
        if(!list||!sel)return;
        const serviceId=String(sel.value||"");
        const rows=gxPlatformAccountState.cuentas.filter(a=>String(a.servicio_id)===serviceId);
        const active=rows.filter(a=>a.activo!==false);
        const totalProfiles=rows.reduce((n,a)=>n+Number(a.ocupados||0),0);
        const summary=document.getElementById("gx-account-platform-summary");
        const capacity=document.getElementById("gx-account-platform-capacity");
        if(summary)summary.textContent=`${active.length} cuenta${active.length===1?"":"s"} activa${active.length===1?"":"s"}`;
        if(capacity)capacity.textContent=`${totalProfiles} perfil${totalProfiles===1?"":"es"} vinculado${totalProfiles===1?"":"s"}`;

        const alias=document.getElementById("gx-account-new-alias");
        if(alias&&!alias.value)alias.placeholder=`Cuenta ${rows.length+1}`;

        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">Todavía no hay cuentas madre para esta plataforma.</div>';
            return;
        }

        list.innerHTML=rows.map(a=>{
            const occ=Number(a.ocupados||0),max=Math.max(1,Number(a.limite_perfiles||1));
            const pct=Math.min(100,Math.round(occ/max*100));
            const names=(a.clientes||[]).filter(x=>x.activo!==false);
            return `<article class="gx-account-card ${a.activo===false?"inactive":""}" data-gx-account-id="${esc(a.id)}">
                <div class="gx-account-card-head">
                    <input data-gx-account-alias value="${esc(a.alias||"Cuenta")}" aria-label="Nombre de cuenta">
                    <input data-gx-account-email value="${esc(a.correo_login||"")}" aria-label="Correo de cuenta">
                    <input data-gx-account-limit type="number" min="1" max="99" value="${max}" aria-label="Capacidad">
                    <div class="gx-account-card-actions">
                        <button type="button" onclick="gxSavePlatformAccount('${esc(a.id)}')">Guardar</button>
                        <button type="button" class="secondary" onclick="gxTogglePlatformAccount('${esc(a.id)}',${a.activo===false?"true":"false"})">${a.activo===false?"Activar":"Pausar"}</button>
                    </div>
                </div>
                <div class="gx-account-usage"><i style="width:${pct}%"></i></div>
                <details class="gx-account-linked">
                    <summary><span>${occ}/${max} perfiles</span><span>${Math.max(0,max-occ)} libres</span></summary>
                    <div class="gx-account-linked-list">${names.length?names.map(x=>`<span>${esc(x.nombre)}${x.perfil_nombre?` · ${esc(x.perfil_nombre)}`:""}</span>`).join(""):'<span>Sin clientes vinculados</span>'}</div>
                </details>
            </article>`;
        }).join("");
    };

    window.gxCreatePlatformAccount=async function(){
        const serviceId=String(document.getElementById("gx-account-platform")?.value||"");
        const rows=gxPlatformAccountState.cuentas.filter(a=>String(a.servicio_id)===serviceId);
        const alias=(document.getElementById("gx-account-new-alias")?.value||"").trim()||`Cuenta ${rows.length+1}`;
        const correo=(document.getElementById("gx-account-new-email")?.value||"").trim();
        const limite=Number(document.getElementById("gx-account-new-limit")?.value||5);
        if(!serviceId||!correo)return alert("Selecciona una plataforma y escribe el correo de la cuenta.");
        try{
            await api(ACCOUNTS_URL,"crear",{servicio_id:serviceId,alias,correo_login:correo,limite_perfiles:limite});
            const a=document.getElementById("gx-account-new-alias"),e=document.getElementById("gx-account-new-email");
            if(a)a.value="";if(e)e.value="";
            await loadAccounts();
        }catch(e){alert("No se pudo crear la cuenta.\n\n"+(e.message||e))}
    };

    window.gxSavePlatformAccount=async function(id){
        const card=document.querySelector(`[data-gx-account-id="${CSS.escape(String(id))}"]`);
        if(!card)return;
        const current=accountById(id);
        const alias=card.querySelector("[data-gx-account-alias]")?.value?.trim()||"Cuenta";
        const correo=card.querySelector("[data-gx-account-email]")?.value?.trim()||"";
        const limite=Number(card.querySelector("[data-gx-account-limit]")?.value||5);
        const emailChanged=current&&norm(current.correo_login)!==norm(correo);
        const note=emailChanged&&Number(current.ocupados||0)>0
            ? `\n\nEl nuevo correo se actualizará automáticamente en ${current.ocupados} perfil${Number(current.ocupados)===1?"":"es"} vinculado${Number(current.ocupados)===1?"":"s"} y aparecerá como novedad en Mi Espacio.`
            :"";
        if(!confirm(`Guardar cambios de ${alias}?${note}`))return;
        try{
            await api(ACCOUNTS_URL,"editar",{id,alias,correo_login:correo,limite_perfiles:limite});
            await loadAccounts();
        }catch(e){alert("No se pudo guardar la cuenta.\n\n"+(e.message||e))}
    };

    window.gxTogglePlatformAccount=async function(id,active){
        try{
            await api(ACCOUNTS_URL,"editar",{id,activo:Boolean(active)});
            await loadAccounts();
        }catch(e){alert("No se pudo cambiar el estado de la cuenta.\n\n"+(e.message||e))}
    };

    // -----------------------------------------------------
    // SELECTORES DENTRO DE CLIENTES
    // -----------------------------------------------------
    window.gxHydrateMasterAccountSelectors=function(root=document){
        root.querySelectorAll?.(".gx-master-account-select").forEach(sel=>{
            const serviceId=String(sel.dataset.gxServiceId||"");
            const serviceRowId=String(sel.dataset.gxClientServiceId||"");
            const accounts=accountsForService(serviceId);
            const assignment=assignmentByServiceRow(serviceRowId);
            const currentId=String(assignment?.cuenta_id||"");

            sel.innerHTML=`<option value="">${accounts.length?"Sin cuenta vinculada":"Sin cuentas registradas"}</option>`+
                accounts.map(a=>{
                    const occ=Number(a.ocupados||0),max=Number(a.limite_perfiles||0);
                    const full=occ>=max&&String(a.id)!==currentId;
                    return `<option value="${esc(a.id)}" ${String(a.id)===currentId?"selected":""} ${full?"disabled":""}>${esc(a.alias)} · ${esc(a.correo_login)} · ${occ}/${max}${full?" · llena":""}</option>`;
                }).join("");

            const box=sel.closest(".gx-smart-access-box");
            const email=box?.querySelector("[data-gx-service-email]");
            const meta=box?.querySelector(".gx-master-account-meta");
            if(email){
                email.disabled=Boolean(currentId);
                email.title=currentId?"El correo se administra desde la cuenta madre":"";
            }
            const account=accountById(currentId);
            if(meta){
                meta.classList.toggle("gx-smart-account-feedback",Boolean(account));
                meta.textContent=account
                    ? `${account.alias} · ${account.ocupados}/${account.limite_perfiles} perfiles · correo sincronizado`
                    : accounts.length
                        ? "Elige una cuenta o usa “Mejor disponible”."
                        : "Crea primero una cuenta madre en Más → Cuentas de plataforma.";
            }
        });
    };

    window.gxAssignMasterAccount=async function(sel){
        const key=String(sel.dataset.gxClientKey||"");
        const index=Number(sel.dataset.gxServiceIndex||0);
        const rowId=String(sel.dataset.gxClientServiceId||"");
        const accountId=String(sel.value||"");
        const s=clientService(key,index);
        if(!s||!rowId)return;
        try{
            if(accountId){
                const r=await api(ACCOUNTS_URL,"asignar",{cliente_servicio_id:rowId,cuenta_id:accountId});
                s.correo_login=String(r.asignacion?.correo_login||s.correo_login||"");
                s.cuenta_id=accountId;
            }else{
                await api(ACCOUNTS_URL,"desasignar",{cliente_servicio_id:rowId});
                s.cuenta_id=null;
            }
            await loadAccounts();
            const box=sel.closest(".gx-smart-access-box");
            const email=box?.querySelector("[data-gx-service-email]");
            if(email)email.value=s.correo_login||"";
        }catch(e){
            alert("No se pudo asignar la cuenta.\n\n"+(e.message||e));
            await loadAccounts();
        }
    };

    window.gxSuggestProfilePin=async function(key,index,event){
        event?.preventDefault?.();event?.stopPropagation?.();
        const s=clientService(key,index);if(!s)return;
        const assignment=assignmentByServiceRow(s._id||s.id);
        if(!assignment?.cuenta_id)return alert("Selecciona primero una cuenta madre.");
        try{
            const r=await api(ACCOUNTS_URL,"sugerir_pin",{cuenta_id:assignment.cuenta_id});
            await updateServiceCreds(key,index,"perfil_pin",r.pin);
            s.perfil_pin=r.pin;
            const card=document.querySelector(`[data-gx-client-key="${CSS.escape(String(key))}"][data-gx-service-index="${Number(index)}"]`);
            const input=card?.querySelector("[data-gx-profile-pin]");
            if(input)input.value=r.pin;
            alert(`PIN libre asignado: ${r.pin}`);
        }catch(e){alert("No se pudo sugerir un PIN.\n\n"+(e.message||e))}
    };

    window.gxSmartAssignAccount=async function(key,index,event){
        event?.preventDefault?.();event?.stopPropagation?.();
        const s=clientService(key,index);if(!s?._id&&!s?.id)return;
        if(!confirm("GOXION elegirá la cuenta con más espacio disponible y asignará un PIN libre a este perfil.\n\n¿Continuar?"))return;
        try{
            const r=await api(ACCOUNTS_URL,"asignacion_inteligente",{cliente_servicio_id:s._id||s.id});
            s.cuenta_id=r.cuenta?.id||null;
            s.correo_login=r.cuenta?.correo_login||s.correo_login||"";
            await updateServiceCreds(key,index,"perfil_pin",r.pin);
            s.perfil_pin=r.pin;
            await loadAccounts();
            const card=document.querySelector(`[data-gx-client-key="${CSS.escape(String(key))}"][data-gx-service-index="${Number(index)}"]`);
            const email=card?.querySelector("[data-gx-service-email]");
            const pin=card?.querySelector("[data-gx-profile-pin]");
            if(email)email.value=s.correo_login;if(pin)pin.value=r.pin;
            alert(`✓ Asignación lista\n\n${r.cuenta?.alias||"Cuenta"} · ${r.cuenta?.correo_login||""}\nPIN: ${r.pin}`);
        }catch(e){alert("No se pudo hacer la asignación inteligente.\n\n"+(e.message||e))}
    };

    // -----------------------------------------------------
    // NAVEGACIÓN / CICLO DE VIDA
    // -----------------------------------------------------
    const previousMore=window.gxOpenMoreDestination;
    window.gxOpenMoreDestination=function(dest){
        if(dest==="accounts"){
            goAdminTab("tab-ajustes");
            setTimeout(()=>{
                const btn=[...document.querySelectorAll(".gx-settings-tabs button")].find(b=>norm(b.textContent).includes("cuentas"));
                window.gxSettingsView?.("accounts",btn);
                loadAccounts();
            },40);
            return;
        }
        return typeof previousMore==="function"?previousMore.call(this,dest):undefined;
    };

    const previousSettings=window.gxSettingsView;
    if(typeof previousSettings==="function"){
        window.gxSettingsView=function(name,btn){
            const r=previousSettings.call(this,name,btn);
            if(name==="accounts")setTimeout(loadAccounts,20);
            return r;
        };
    }

    const previousRender=window.renderizarClientes;
    if(typeof previousRender==="function"){
        window.renderizarClientes=function(...args){
            const r=previousRender.apply(this,args);
            setTimeout(()=>window.gxHydrateMasterAccountSelectors(),30);
            return r;
        };
    }

    const previousFocus=window.gxOpenClientFocus;
    if(typeof previousFocus==="function"){
        window.gxOpenClientFocus=function(...args){
            const r=previousFocus.apply(this,args);
            setTimeout(()=>window.gxHydrateMasterAccountSelectors(document.getElementById("gx-client-focus")||document),80);
            return r;
        };
    }

    const previousReload=window.gxReloadAdminClient;
    if(typeof previousReload==="function"){
        window.gxReloadAdminClient=async function(...args){
            const r=await previousReload.apply(this,args);
            await Promise.allSettled([loadAccounts(),window.gxRefreshDecisionCenter()]);
            return r;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(()=>{
            populatePlatformSelect();
            loadAccounts();
            window.gxRefreshDecisionCenter();
        },1050);
    });

})();