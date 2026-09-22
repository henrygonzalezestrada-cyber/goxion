(() => {
        const GXCORE = window.GOXION_CORE;
    const PROJECT_URL=GXCORE.SUPABASE_ORIGIN;
    const CANCEL_URL=`${PROJECT_URL}/functions/v1/cancelaciones-admin`;
    const CRED_URL=`${PROJECT_URL}/functions/v1/credenciales-admin-beta`;

    let cancellationData={solicitudes:[],legacy:[]};
    let credentialData={credenciales:[],entregas:[]};
    let credentialSelection=new Set();
    let credentialSelectionInitialized=false;

    const esc=value=>String(value??"")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const norm=value=>String(value??"").trim().toLowerCase();

    async function adminApi(url,accion,datos={}){
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

    // =====================================================
    // CANCELACIONES FORMALES
    // =====================================================
    async function loadCancellations(){
        try{
            const r=await adminApi(CANCEL_URL,"listar",{});
            cancellationData={solicitudes:Array.isArray(r.solicitudes)?r.solicitudes:[],legacy:Array.isArray(r.legacy)?r.legacy:[]};
            refreshCancellationViews();
        }catch(e){
            console.warn("No se pudieron cargar cancelaciones formales",e);
        }
    }

    function cancellationByNotification(notificationId){
        return cancellationData.solicitudes.find(x=>String(x?.notificacion_id||"")===String(notificationId||""))||null;
    }

    function refreshCancellationViews(){
        window.gxUpdateOperationsSummary?.();
        const drawer=document.getElementById("gx-notification-drawer");
        if(drawer?.classList.contains("show"))window.gxToggleNotificationsBase?.(true);
    }

    window.gxCancellationButtons=function(notificationId,mode="mobile"){
        const request=cancellationByNotification(notificationId);
        if(!request){
            return `<button class="gx-cancel-approve" onclick="gxResolveCancellation('${esc(notificationId)}','aprobada')">Aceptar</button>
                    <button class="gx-cancel-reject" onclick="gxResolveCancellation('${esc(notificationId)}','rechazada')">Rechazar</button>`;
        }
        const state=String(request.estado||"solicitada");
        if(state==="solicitada"){
            return `<button class="gx-cancel-approve" onclick="gxResolveCancellation('${esc(notificationId)}','aprobada')">Aceptar</button>
                    <button class="gx-cancel-reject" onclick="gxResolveCancellation('${esc(notificationId)}','rechazada')">Rechazar</button>`;
        }
        if(state==="aprobada"){
            return `<span class="gx-cancel-state approved">Aprobada</span>
                    <button class="gx-cancel-effective" onclick="gxMakeCancellationEffective('${esc(request.id)}')">Hacer efectiva</button>`;
        }
        if(state==="rechazada")return `<span class="gx-cancel-state rejected">Rechazada</span>`;
        if(state==="efectiva")return `<span class="gx-cancel-state effective">Efectiva</span>`;
        return `<span class="gx-cancel-state">${esc(state)}</span>`;
    };

    window.gxResolveCancellation=async function(notificationId,decision){
        const approve=decision==="aprobada";
        const message=approve
            ?"¿Aprobar esta solicitud de cancelación?\n\nEl servicio seguirá activo hasta que marques la cancelación como efectiva."
            :"¿Rechazar esta solicitud de cancelación?\n\nLa solicitud quedará registrada como rechazada.";
        if(!confirm(message))return;
        try{
            await adminApi(CANCEL_URL,"resolver",{notificacion_id:notificationId,decision});
            await loadCancellations();
            if(typeof inicializarPanel==="function")await inicializarPanel();
        }catch(e){
            console.error(e);
            alert("No se pudo procesar la cancelación.\n\n"+(e?.message||e));
        }
    };

    window.gxMakeCancellationEffective=async function(requestId){
        if(!confirm("¿Hacer efectiva esta cancelación ahora?\n\nEl servicio del cliente se desactivará. Los cargos o deudas ya existentes no se borrarán."))return;
        try{
            await adminApi(CANCEL_URL,"hacer_efectiva",{solicitud_id:requestId});
            if(typeof inicializarPanel==="function")await inicializarPanel();
            await loadCancellations();
            alert("✓ Cancelación efectiva. El servicio quedó desactivado.");
        }catch(e){
            console.error(e);
            alert("No se pudo hacer efectiva la cancelación.\n\n"+(e?.message||e));
        }
    };

    // =====================================================
    // CREDENCIALES SEGURAS
    // =====================================================
    function catalog(){
        return Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales:[];
    }

    function selectedCatalog(){
        const i=Number(document.getElementById("gx-cred-service")?.value);
        return Number.isInteger(i)?catalog()[i]||null:null;
    }

    function selectedAccount(){
        return String(document.getElementById("gx-cred-account")?.value||"").trim();
    }

    function accessModel(){
        return window.gxAccessModelBeta||{accesos:[],cuentas:[]};
    }

    function accountById(id){
        return (window.gxPlatformAccountState?.cuentas||accessModel().cuentas||[])
            .find(a=>String(a.id)===String(id))||null;
    }

    function assignmentsFor(service,accountId=""){
        if(!service)return[];
        const serviceId=String(service._id||service.id||"");
        const accesses=(accessModel().accesos||[]).filter(a=>
            a.activo!==false &&
            String(a.servicio_id)===serviceId &&
            (!accountId||String(a.cuenta_id||"")===String(accountId))
        );
        return accesses.map(a=>({
            id:String(a.cliente_id||""),
            accessId:String(a.id||""),
            c:{nombre:a.cliente||"Cliente",folio:a.folio||""},
            s:{_id:a.cliente_servicio_id,nombre:a.contratacion||a.servicio||""},
            login:accountById(a.cuenta_id)?.correo_login||"",
            cuenta_id:a.cuenta_id||""
        })).filter(x=>x.id);
    }

    function populateCredentialServices(){
        const sel=document.getElementById("gx-cred-service");
        if(!sel)return;
        const prev=sel.value;
        const shared=catalog().map((s,i)=>({s,i})).filter(x=>(x.s?.modo_acceso||'compartido')!=='invitacion');
        sel.innerHTML=shared.map(x=>`<option value="${x.i}">${esc(x.s.nombre||"Servicio")}</option>`).join("");
        if(prev!==""&&shared.some(x=>String(x.i)===String(prev)))sel.value=prev;
        else if(shared.length)sel.value=String(shared[0].i);
    }

    function populateCredentialAccounts(){
        const sel=document.getElementById("gx-cred-account");
        if(!sel)return;
        const service=selectedCatalog();
        const serviceId=String(service?._id||service?.id||"");
        const prev=sel.value;
        const accounts=(window.gxPlatformAccountState?.cuentas||accessModel().cuentas||[])
            .filter(a=>a.activo!==false&&String(a.servicio_id)===serviceId);
        sel.innerHTML=accounts.length
            ? accounts.map(a=>`<option value="${esc(a.id)}">${esc(a.alias)} · ${esc(a.correo_login)} · ${Number(a.ocupados||0)}/${Number(a.limite_perfiles||0)}</option>`).join("")
            : `<option value="">Sin cuenta madre configurada</option>`;
        if(prev&&accounts.some(a=>String(a.id)===String(prev)))sel.value=prev;
        else if(accounts.length===1)sel.value=String(accounts[0].id);
    }

    function eligibleRecipients(){
        const service=selectedCatalog(),accountId=selectedAccount();
        if(!service||!accountId)return[];
        const byClient=new Map();
        assignmentsFor(service,accountId).forEach(x=>{
            if(!byClient.has(x.id))byClient.set(x.id,x);
        });
        return [...byClient.values()];
    }

    function ensureCredentialSelection(){
        const rows=eligibleRecipients();
        const valid=new Set(rows.map(x=>x.id));
        if(!credentialSelectionInitialized){
            credentialSelection=new Set(rows.map(x=>x.id));
            credentialSelectionInitialized=true;
        }else{
            credentialSelection=new Set([...credentialSelection].filter(id=>valid.has(id)));
        }
    }

    function activeCredential(){
        const accountId=selectedAccount();
        return credentialData.credenciales.find(x=>x.activa===true&&String(x.cuenta_id||"")===String(accountId))||null;
    }

    function renderCredentialHistory(){
        const list=document.getElementById("gx-cred-history-list");
        const count=document.getElementById("gx-cred-history-count");
        if(!list||!count)return;
        const service=selectedCatalog(),accountId=selectedAccount();
        const serviceId=String(service?._id||service?.id||"");
        const rows=credentialData.credenciales.filter(x=>
            (!serviceId||String(x.servicio_id||"")===serviceId)&&
            (!accountId||String(x.cuenta_id||"")===String(accountId))
        );
        count.textContent=`${rows.length} versión${rows.length===1?"":"es"}`;
        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">Todavía no hay contraseñas publicadas para esta cuenta.</div>';
            return;
        }
        list.innerHTML=rows.map(c=>{
            const deliveries=credentialData.entregas.filter(e=>String(e.credencial_id)===String(c.id));
            const pending=deliveries.filter(e=>e.estado==="pendiente").length;
            const seen=deliveries.filter(e=>e.estado==="vista").length;
            const revoked=deliveries.filter(e=>e.estado==="revocada"||e.estado==="expirada").length;
            const date=new Date(c.created_at||0).toLocaleDateString("es-MX",{day:"numeric",month:"short"});
            return `<div class="gx-cred-history-row ${c.activa?"":"inactive"}">
                <div><strong>${esc(c.plataforma)} · v${Number(c.version||1)}</strong><small>${esc(c.cuenta_login)} · ${date} · ${c.activa?"Activa":"Anterior"}</small></div>
                <div class="gx-cred-history-counts"><span>${pending} pendientes</span><span>${seen} vistas</span>${revoked?`<span>${revoked} cerradas</span>`:""}</div>
            </div>`;
        }).join("");
    }

    window.gxRenderCredentialRecipients=function(){
        ensureCredentialSelection();
        const list=document.getElementById("gx-cred-recipient-list");
        if(!list)return;
        const q=norm(document.getElementById("gx-cred-search")?.value||"");
        const rows=eligibleRecipients().filter(x=>!q||norm(`${x.c.nombre||""} ${x.c.folio||""}`).includes(q));
        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay clientes con esa cuenta de acceso.</div>';
            return;
        }
        list.innerHTML=rows.map(x=>{
            const selected=credentialSelection.has(x.id);
            return `<label class="gx-cred-recipient ${selected?"":"excluded"}">
                <input type="checkbox" ${selected?"checked":""} onchange="gxToggleCredentialRecipient('${esc(x.id)}',this.checked)">
                <div><strong>${esc(x.c.nombre||"Cliente")}</strong><small>${esc(x.c.folio||"Sin folio")} · ${esc(x.login)}</small></div>
                <em>1 vista</em>
            </label>`;
        }).join("");
    };

    window.gxToggleCredentialRecipient=function(id,checked){
        credentialSelectionInitialized=true;
        if(checked)credentialSelection.add(String(id));else credentialSelection.delete(String(id));
        window.gxRenderCredentials(false);
    };

    window.gxCredentialSelectScope=function(scope){
        const rows=eligibleRecipients();
        credentialSelection=scope==="all"?new Set(rows.map(x=>x.id)):new Set();
        credentialSelectionInitialized=true;
        window.gxRenderCredentials();
    };

    window.gxRenderCredentials=function(renderList=true){
        populateCredentialServices();
        populateCredentialAccounts();
        ensureCredentialSelection();
        const rows=eligibleRecipients();
        const selected=rows.filter(x=>credentialSelection.has(x.id));
        const excluded=rows.length-selected.length;
        const active=activeCredential();
        const pending=active?credentialData.entregas.filter(e=>String(e.credencial_id)===String(active.id)&&e.estado==="pendiente").length:0;
        const service=selectedCatalog(),accountId=selectedAccount(),account=accountById(accountId);
        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
        set("gx-cred-eligible",rows.length);
        set("gx-cred-selected",selected.length);
        set("gx-cred-excluded",excluded);
        set("gx-cred-pending",pending);
        const summary=document.getElementById("gx-cred-publish-summary");
        if(summary)summary.textContent=service&&account?`${service.nombre} · ${account.alias} · ${selected.length} cliente${selected.length===1?"":"s"}`:"Selecciona una plataforma y una cuenta.";
        const btn=document.getElementById("gx-cred-publish");
        if(btn)btn.disabled=!service||!accountId||selected.length===0;
        if(renderList)window.gxRenderCredentialRecipients();
        renderCredentialHistory();
    };

    window.gxCredentialServiceChanged=function(){
        credentialSelectionInitialized=false;
        populateCredentialAccounts();
        window.gxRenderCredentials();
    };
    window.gxCredentialAccountChanged=function(){
        credentialSelectionInitialized=false;
        window.gxRenderCredentials();
    };

    window.gxToggleCredentialPassword=function(){
        const input=document.getElementById("gx-cred-password");
        if(input)input.type=input.type==="password"?"text":"password";
    };

    async function loadCredentials(){
        try{
            const r=await adminApi(CRED_URL,"listar",{});
            credentialData={credenciales:Array.isArray(r.credenciales)?r.credenciales:[],entregas:Array.isArray(r.entregas)?r.entregas:[]};
            window.gxRenderCredentials();
        }catch(e){
            console.warn("No se pudieron cargar credenciales",e);
        }
    }

    window.gxPublishCredential=async function(){
        const service=selectedCatalog(),accountId=selectedAccount(),account=accountById(accountId);
        const password=String(document.getElementById("gx-cred-password")?.value||"");
        const rows=eligibleRecipients().filter(x=>credentialSelection.has(x.id));
        if(!service||!accountId||!account)return alert("Selecciona una plataforma y una cuenta madre.");
        if(password.length<4)return alert("Escribe la nueva contraseña.");
        if(!rows.length)return alert("Selecciona al menos un cliente.");
        const active=activeCredential();
        const warning=active?`\n\nEsto revocará las entregas pendientes de la versión ${active.version}.`:"";
        if(!confirm(`Publicar nueva contraseña\n\n${service.nombre}\n${account.alias} · ${account.correo_login}\n${rows.length} clientes\nEntrega: una sola vista${warning}\n\n¿Continuar?`))return;

        const btn=document.getElementById("gx-cred-publish");
        if(btn){btn.disabled=true;btn.textContent="Publicando…";}
        try{
            const r=await adminApi(CRED_URL,"publicar",{
                cuenta_id:accountId,
                password,
                cliente_ids:rows.map(x=>x.id)
            });
            const input=document.getElementById("gx-cred-password");
            if(input){input.value="";input.type="password";}
            await loadCredentials();
            alert(`✓ Contraseña protegida en Vault.\n\n${account.alias} · versión ${r.credencial?.version||""}\n${r.entregas||0} entregas preparadas.\n\nLos clientes asignados a esta cuenta madre podrán recibir la nueva contraseña desde Mi Espacio.`);
        }catch(e){
            console.error(e);
            alert("No se pudo publicar la contraseña.\n\n"+(e?.message||e));
        }finally{
            if(btn){btn.disabled=false;btn.textContent="Publicar contraseña";}
        }
    };

    // =====================================================
    // NAVEGACIÓN
    // =====================================================
    const oldMore=window.gxOpenMoreDestination;
    window.gxOpenMoreDestination=function(dest){
        if(dest==="credentials"){
            goAdminTab("tab-ajustes");
            setTimeout(()=>{
                const btn=[...document.querySelectorAll(".gx-settings-tabs button")].find(b=>(b.textContent||"").toLowerCase().includes("credenciales"));
                window.gxSettingsView?.("credentials",btn);
                credentialSelectionInitialized=false;
                populateCredentialServices();
                populateCredentialAccounts();
                loadCredentials();
            },40);
            return;
        }
        return typeof oldMore==="function"?oldMore.call(this,dest):undefined;
    };

    const oldSettings=window.gxSettingsView;
    if(typeof oldSettings==="function"){
        window.gxSettingsView=function(name,btn){
            const r=oldSettings.call(this,name,btn);
            if(name==="credentials"){
                setTimeout(()=>{
                    credentialSelectionInitialized=false;
                    populateCredentialServices();
                    populateCredentialAccounts();
                    loadCredentials();
                },20);
            }
            return r;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(()=>{
            loadCancellations();
            populateCredentialServices();
            populateCredentialAccounts();
            loadCredentials();
        },950);
    });

})();