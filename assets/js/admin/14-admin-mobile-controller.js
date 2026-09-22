(() => {
    const isMobile = () => window.matchMedia("(max-width:840px)").matches;
    let mobileOpsFilter = "priority";

    function money(v){
        return `$${Number(v||0).toFixed(0)}`;
    }

    function clientMonthly(c){
        return Number(c?.estado_cuenta?.total_actual ?? (c?.servicios||[]).reduce((sum,s)=>sum+Number(s?.monto||0),0));
    }

    function timing(c){
        return typeof window.gxPaymentTiming==="function"
            ? window.gxPaymentTiming(c)
            : {type:"none",days:999,due:null};
    }

    window.gxShowClientTiming = function(type){
        goAdminTab("tab-clientes");
        const filtered={};
        Object.entries(clientesDict||{}).forEach(([key,c])=>{
            const t=timing(c);
            if(type==="today" && t.type==="upcoming" && Number(t.days||0)===0) filtered[key]=c;
            if(type==="overdue" && t.type==="overdue") filtered[key]=c;
        });
        if(typeof renderizarClientes==="function") renderizarClientes(filtered);
        const p=document.querySelector('[data-status-filter="all"]');
        document.querySelectorAll('[data-status-filter]').forEach(x=>x.classList.remove("active"));
        p?.classList.add("active");
    };

    function renderUpcoming(){
        const list=document.getElementById("gx-next-payments-list");
        if(!list || typeof clientesDict==="undefined") return;

        const rows=Object.entries(clientesDict||{})
            .map(([key,c])=>({key,c,t:timing(c)}))
            .filter(x=>x.c.estado!=="pagado" && x.c.estado!=="suspendido" && !x.c.pago_en_revision && ["upcoming","overdue"].includes(x.t.type))
            .sort((a,b)=>{
                const pa=a.t.type==="overdue"?-1000-Number(a.t.days||0):Number(a.t.days||999);
                const pb=b.t.type==="overdue"?-1000-Number(b.t.days||0):Number(b.t.days||999);
                return pa-pb;
            })
            .slice(0,6);

        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay cobros próximos que requieran atención.</div>';
            return;
        }

        list.innerHTML=rows.map(({key,c,t})=>{
            const label=t.type==="overdue"
                ? `Vencido ${Number(t.days||0)}d`
                : Number(t.days||0)===0
                    ? "Vence hoy"
                    : `En ${Number(t.days||0)}d`;
            const cls=t.type==="overdue"?"overdue":Number(t.days||0)===0?"today":"upcoming";
            const date=t.due instanceof Date && !Number.isNaN(t.due.getTime())
                ? t.due.toLocaleDateString("es-MX",{day:"numeric",month:"short"})
                : `día ${c.dia_pago||15}`;
            return `<button class="gx-next-payment ${cls}" onclick="gxOpenClientFocus('${key}')">
                <div><strong>${window.gxEscapeAdminHtml?.(c.nombre)||c.nombre}</strong><small>${date} · ${money(clientMonthly(c))}/mes</small></div>
                <em>${label}</em>
            </button>`;
        }).join("");
    }

    function updateHomePriority(){
        if(typeof clientesDict==="undefined") return;
        const values=Object.values(clientesDict||{});
        const review=values.filter(c=>c.pago_en_revision===true).length;
        const overdue=values.filter(c=>!c.pago_en_revision && timing(c).type==="overdue").length;
        const today=values.filter(c=>!c.pago_en_revision && timing(c).type==="upcoming" && Number(timing(c).days||0)===0).length;
        const requests=(window.gxAdminNotifications||[]).filter(n=>{
            const cat=window.gxClassifyAdminNotification?.(n);
            return !n.leida && (cat==="cancellation"||cat==="support");
        }).length;

        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
        set("gx-count-review",review);
        set("gx-count-overdue-home",overdue);
        set("gx-count-due-today",today);
        set("gx-count-requests",requests);
        renderUpcoming();
    }

    function buildOps(){
        const persisted=Array.isArray(window.gxAdminNotifications)?window.gxAdminNotifications:[];
        const rows=[];

        Object.entries(clientesDict||{}).forEach(([key,c])=>{
            if(c.pago_en_revision){
                rows.push({
                    id:`review-${key}`, key, synthetic:true, category:"review",
                    title:"Pago pendiente de revisión",
                    message:`${c.nombre} tiene un comprobante esperando validación.`,
                    client:c.nombre, created_at:new Date().toISOString()
                });
                return;
            }
            const t=timing(c);
            if(t.type==="overdue"){
                rows.push({
                    id:`overdue-${key}`, key, synthetic:true, category:"overdue",
                    title:"Pago vencido",
                    message:`${c.nombre} lleva ${Number(t.days||0)} día${Number(t.days||0)===1?"":"s"} de atraso.`,
                    client:c.nombre, created_at:new Date().toISOString()
                });
            }
        });

        persisted.forEach(n=>{
            const cat=window.gxClassifyAdminNotification?.(n)||"activity";
            if(String(n?.tipo||"").toLowerCase()==="pago_revision") return;
            const key=Object.entries(clientesDict||{}).find(([,c])=>String(c?._id||c?.id||"")===String(n?.cliente_id||""))?.[0]||"";
            rows.push({
                id:n.id,key,synthetic:false,category:cat,
                title:n.titulo||"Actividad",
                message:n.mensaje||"",
                client:n.cliente_nombre||"",
                created_at:n.created_at,
                read:n.leida===true
            });
        });

        const order={review:0,overdue:1,cancellation:2,support:3,activity:4};
        return rows.sort((a,b)=>(order[a.category]??9)-(order[b.category]??9) || new Date(b.created_at||0)-new Date(a.created_at||0));
    }

    window.gxSetMobileOpsFilter = function(filter,btn){
        mobileOpsFilter=filter||"priority";
        document.querySelectorAll("[data-gx-mobile-ops]").forEach(x=>x.classList.remove("active"));
        btn?.classList.add("active");
        renderMobileOps();
    };

    function renderMobileOps(){
        const list=document.getElementById("gx-mobile-ops-list");
        if(!list)return;
        let rows=buildOps();

        if(mobileOpsFilter==="priority"){
            rows=rows.filter(x=>["review","overdue","cancellation","support"].includes(x.category) && (x.synthetic || !x.read));
        }else{
            rows=rows.filter(x=>x.category===mobileOpsFilter);
        }

        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay pendientes en esta categoría.</div>';
            return;
        }

        const labels={review:"Pago",overdue:"Vencido",cancellation:"Cancelación",support:"Soporte",activity:"Actividad"};
        list.innerHTML=rows.slice(0,40).map(x=>{
            const activity=x.category==="activity";
            const safeId=String(x.id||"").replace(/'/g,"");
            const safeKey=String(x.key||"").replace(/'/g,"");
            return `<article class="gx-mobile-op-item ${x.category}">
                <div>
                    <span class="kind">${labels[x.category]||"Actividad"}</span>
                    <strong>${window.gxEscapeAdminHtml?.(x.title)||x.title}</strong>
                    ${activity?"":`<p>${window.gxEscapeAdminHtml?.(x.message)||x.message}</p>`}
                    <small>${x.client?`${window.gxEscapeAdminHtml?.(x.client)||x.client} · `:""}${x.read?"Atendida":"Pendiente"}</small>
                    ${activity?`<p>${window.gxEscapeAdminHtml?.(x.message)||x.message}</p>`:""}
                </div>
                <div class="gx-mobile-op-actions">
                    ${safeKey?`<button onclick="gxOpenClientFocus('${safeKey}')">Abrir cliente</button>`:""}
                    ${x.category==="cancellation"&&!x.synthetic&&safeId?(window.gxCancellationButtons?.(safeId,"mobile")||""):""}
                    ${!x.synthetic&&!x.read&&safeId&&x.category!=="cancellation"?`<button class="done" onclick="gxMarkNotificationRead('${safeId}')">Atendida</button>`:""}
                    ${!x.synthetic&&safeId?`<button class="danger" onclick="gxDeleteNotification('${safeId}')">Eliminar</button>`:""}
                </div>
            </article>`;
        }).join("");
    }

    window.gxOpenMoreDestination = function(dest){
        if(dest==="catalog"){
            goAdminTab("tab-catalogo");
            return;
        }
        if(["missions","app","alerts"].includes(dest)){
            goAdminTab("tab-ajustes");
            const btn=[...document.querySelectorAll(".gx-settings-tabs button")].find(b=>{
                const txt=(b.textContent||"").toLowerCase();
                return dest==="missions" ? txt.includes("misiones")
                    : dest==="app" ? txt.includes("app")
                    : txt.includes("alertas");
            });
            window.gxSettingsView?.(dest,btn);
        }
    };

    window.gxToggleClientQuickMenu = function(btn){
        const menu=btn?.parentElement?.querySelector(".gx-client-quick-menu");
        if(!menu)return;
        document.querySelectorAll(".gx-client-quick-menu.show").forEach(x=>{if(x!==menu)x.classList.remove("show")});
        menu.classList.toggle("show");
    };

    window.gxOpenClientSection = function(section){
        document.querySelectorAll(".gx-client-quick-menu.show").forEach(x=>x.classList.remove("show"));
        const body=document.getElementById("gx-focus-body");
        if(!body)return;

        if(section==="activity"){
            const target=body.querySelector("details.gx-client-ops-context");
            if(target){
                target.open=true;
                target.scrollIntoView({behavior:"smooth",block:"center"});
            }
            return;
        }

        const target=body.querySelector(`[data-gx-section="${section}"]`);
        if(!target)return;
        body.querySelectorAll(":scope > [data-gx-section].gx-accordion").forEach(x=>x.classList.remove("open"));
        target.classList.add("open");
        target.scrollIntoView({behavior:"smooth",block:"center"});
    };

    function enhanceFocus(){
        const body=document.getElementById("gx-focus-body");
        const details=body?.querySelector("[id^='details-']");
        if(!details)return;
        const key=details.id.replace(/^details-/,"");
        const c=clientesDict?.[key];
        if(!c)return;

        const t=timing(c);
        const monthly=clientMonthly(c);
        const due=t.due instanceof Date && !Number.isNaN(t.due.getTime())
            ? t.due.toLocaleDateString("es-MX",{day:"numeric",month:"short"})
            : `día ${c.dia_pago||15}`;
        const state=c.pago_en_revision?"En revisión"
            : c.estado==="pagado"?"Pagado"
            : t.type==="overdue"?"Vencido"
            : c.estado==="suspendido"?"Suspendido"
            : "Pendiente";

        const summary=document.getElementById("gx-focus-summary");
        if(summary){
            summary.innerHTML=`<span><small>Vence</small><b>${due}</b></span>
                <span><small>Mensualidad</small><b>${money(monthly)}</b></span>
                <span><small>Estado</small><b>${state}</b></span>
                <span><small>Periodo</small><b>${typeof gxPeriodLabel==="function"?gxPeriodLabel(c.periodo_pendiente):String(c.periodo_pendiente||"").slice(0,7)}</b></span>`;
        }
    }

    // Bell: en teléfono abre Operaciones; en escritorio conserva el drawer.
    const originalToggle=window.gxToggleNotifications;
    if(typeof originalToggle==="function"){
        window.gxToggleNotifications=function(force){
            if(isMobile() && force!==false){
                goAdminTab("tab-operaciones");
                setTimeout(renderMobileOps,30);
                return;
            }
            return originalToggle.call(this,force);
        };
    }

    // Integrar con navegación existente.
    const originalTab=window.goAdminTab;
    if(typeof originalTab==="function"){
        window.goAdminTab=function(id,...args){
            const r=originalTab.call(this,id,...args);
            if(id==="tab-resumen") setTimeout(updateHomePriority,30);
            if(id==="tab-operaciones") setTimeout(renderMobileOps,30);
            return r;
        };
    }

    // Integrar con ficha existente sin cambiar su motor.
    const originalOpen=window.gxOpenClientFocus;
    if(typeof originalOpen==="function"){
        window.gxOpenClientFocus=function(key,...args){
            const r=originalOpen.call(this,key,...args);
            setTimeout(enhanceFocus,25);
            return r;
        };
    }

    // Resumen: conservar el cálculo original y añadir jerarquía móvil.
    const originalSummary=window.gxUpdateOperationsSummary;
    if(typeof originalSummary==="function"){
        window.gxUpdateOperationsSummary=function(...args){
            const r=originalSummary.apply(this,args);
            setTimeout(()=>{
                updateHomePriority();
                renderMobileOps();
            },0);
            return r;
        };
    }

    // Limpiar vuelve al orden recomendado.
    const originalClear=window.gxClearClientFilters;
    window.gxClearClientFilters=function(){
        if(typeof originalClear==="function") originalClear();
        const sort=document.getElementById("sort-by");
        if(sort) sort.value="priority";
        if(typeof filtrarClientes==="function") filtrarClientes();
    };

    function responsiveBusinessPanel(){
        const d=document.getElementById("gx-business-panel");
        if(!d || d.dataset.gxInitialised==="1") return;
        d.dataset.gxInitialised="1";
        if(isMobile()) d.removeAttribute("open");
        else d.setAttribute("open","");
    }

    document.addEventListener("click",e=>{
        if(!e.target.closest(".gx-client-quick-actions")){
            document.querySelectorAll(".gx-client-quick-menu.show").forEach(x=>x.classList.remove("show"));
        }
    });

    document.addEventListener("DOMContentLoaded",()=>{
        responsiveBusinessPanel();
        const sort=document.getElementById("sort-by");
        if(sort) sort.value="priority";
        setTimeout(()=>{
            if(typeof filtrarClientes==="function") filtrarClientes();
            updateHomePriority();
            renderMobileOps();
        },700);
    });

})();