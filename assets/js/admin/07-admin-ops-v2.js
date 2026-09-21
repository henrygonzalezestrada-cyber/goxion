(() => {
        const GXCORE = window.GOXION_CORE;
    const OPS_URL = GXCORE.endpoint("admin-operaciones");
    const TAGS = [
        {tag:"CATALOGO", emoji:"🛒", name:"Catálogo", mode:"Automática", info:"Se completa cuando el cliente visita la pestaña Catálogo."},
        {tag:"PAGO", emoji:"💳", name:"Pago", mode:"Automática", info:"Se completa cuando el cliente reporta su comprobante de pago."},
        {tag:"SOPORTE", emoji:"🛠️", name:"Soporte", mode:"Automática", info:"Lleva al cliente a Soporte y se completa al interactuar con esa sección."},
        {tag:"FEEDBACK", emoji:"💬", name:"Feedback", mode:"Automática", info:"Abre el formulario de comentarios; se completa al enviar feedback."},
        {tag:"REFERIDOS", emoji:"🫂", name:"Referidos", mode:"Automática", info:"Dirige al panel de Referidos y registra la interacción."},
        {tag:"COMPARTIR", emoji:"📲", name:"Compartir", mode:"Automática", info:"Invita al cliente a compartir GOXION."},
        {tag:"LINK", emoji:"🔗", name:"Enlace", mode:"Automática", info:"Abre una URL personalizada. Al elegirla agrega LINK: y pide la URL."},
        {tag:"MI_ESPACIO", emoji:"👤", name:"Mi Espacio", mode:"Manual", info:"Misión informativa relacionada con entrar o revisar Mi Espacio. Hoy se confirma manualmente."},
        {tag:"ESTADO", emoji:"📄", name:"Estado de cuenta", mode:"Manual", info:"Pide consultar su estado de cuenta. Compatible como misión manual."},
        {tag:"LEALTAD", emoji:"⭐", name:"Lealtad", mode:"Manual", info:"Pide revisar su progreso de fidelidad. Compatible como misión manual."},
        {tag:"BENEFICIOS", emoji:"🎁", name:"Beneficios", mode:"Manual", info:"Pide revisar beneficios, referidos o cupones. Compatible como misión manual."},
        {tag:"MANUAL", emoji:"✅", name:"Manual", mode:"Manual", info:"La misión se completa al tocarla. Útil para tareas especiales sin automatización."}
    ];
    let paymentCtx = null;

    async function ops(accion, datos={}) {
        const token = localStorage.getItem(GXCORE.STORAGE.ADMIN_TOKEN) || "";
        const r = await fetch(OPS_URL, {
            method:"POST",
            headers:{"Content-Type":"application/json","X-Admin-Token":token},
            body:JSON.stringify({accion,datos})
        });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j?.ok !== true) throw new Error(j?.error || `HTTP ${r.status}`);
        return j;
    }
    window.gxOps = ops;

    // ---------- Mission Builder ----------
    function tagOption(tag) {
        const t = TAGS.find(x=>x.tag===tag) || TAGS[0];
        return `${t.emoji} ${t.name}`;
    }
    function parseMission(line) {
        line = String(line||"").trim();
        const m = line.match(/\[([^\]]+)\]\s*$/);
        if(!m) return {text:line,tag:"MANUAL",param:""};
        const full=m[1], text=line.replace(m[0],"").trim();
        if(full.toUpperCase().startsWith("LINK:")) return {text,tag:"LINK",param:full.slice(5).trim()};
        return {text,tag:full.toUpperCase(),param:""};
    }
    function missionLine(row) {
        const text = row.querySelector(".gx-mission-text")?.value.trim() || "";
        const tag = row.querySelector(".gx-mission-tag")?.value || "MANUAL";
        const param = row.querySelector(".gx-mission-param")?.value.trim() || "";
        const suffix = tag==="LINK" ? `[LINK:${param}]` : `[${tag}]`;
        return text ? `${text} ${suffix}` : "";
    }
    function syncBuilder() {
        const src=document.getElementById("global-misiones-tareas");
        if(!src) return;
        src.value = [...document.querySelectorAll(".gx-mission-row")].map(missionLine).filter(Boolean).join("\n");
    }
    function rowHtml(data={text:"",tag:"CATALOGO",param:""}) {
        const row=document.createElement("div");
        row.className="gx-mission-row";
        row.innerHTML=`<input class="gx-mission-text" type="text" placeholder="Escribe la misión..." value="${String(data.text||"").replace(/"/g,"&quot;")}">
            <select class="gx-mission-tag">${TAGS.map(t=>`<option value="${t.tag}" ${t.tag===data.tag?'selected':''}>${t.emoji} ${t.name}</option>`).join("")}</select>
            <button type="button" title="Eliminar">×</button>
            <input class="gx-mission-param" type="url" placeholder="https://..." value="${String(data.param||"").replace(/"/g,"&quot;")}" style="grid-column:1/-1;display:${data.tag==='LINK'?'block':'none'}">`;
        const text=row.querySelector(".gx-mission-text"), select=row.querySelector(".gx-mission-tag"), param=row.querySelector(".gx-mission-param");
        text.addEventListener("input",syncBuilder);
        param.addEventListener("input",syncBuilder);
        select.addEventListener("change",()=>{param.style.display=select.value==="LINK"?"block":"none";syncBuilder()});
        row.querySelector("button").onclick=()=>{row.remove();syncBuilder()};
        return row;
    }
    window.gxAddMissionRow = function(data) {
        document.getElementById("gx-mission-builder-list")?.appendChild(rowHtml(data));
        syncBuilder();
    };
    function loadBuilder() {
        const src=document.getElementById("global-misiones-tareas");
        const list=document.getElementById("gx-mission-builder-list");
        if(!src||!list) return;
        list.innerHTML="";
        const lines=String(src.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
        (lines.length?lines:["Visita nuestro catálogo [CATALOGO]","Reporta tu pago [PAGO]"]).forEach(line=>list.appendChild(rowHtml(parseMission(line))));
        syncBuilder();
        const grid=document.getElementById("gx-tag-library-grid");
        if(grid) grid.innerHTML=TAGS.map(t=>`<div class="gx-tag-chip"><span class="emoji">${t.emoji}</span><span class="copy"><strong>${t.name}</strong><small>${t.mode}</small></span><button onclick='gxTagInfo(${JSON.stringify(t.tag)})'>i</button></div>`).join("");
    }
    window.gxTagInfo = tag => {
        const t=TAGS.find(x=>x.tag===tag);
        if(t) alert(`${t.emoji} ${t.name}\n\n${t.info}\n\nTipo: ${t.mode}`);
    };
    window.gxMissionBuilderApply = function(mode){syncBuilder();aplicarMisionesMasivas(mode)};
    window.gxMissionBuilderSelectClients = function(){syncBuilder();abrirModalSeleccionClientes()};

    // ---------- Notifications ----------
    function relativeTime(iso){
        const d=new Date(iso), s=Math.max(0,(Date.now()-d.getTime())/1000);
        if(s<60)return "ahora"; if(s<3600)return `hace ${Math.floor(s/60)} min`; if(s<86400)return `hace ${Math.floor(s/3600)} h`; return `hace ${Math.floor(s/86400)} d`;
    }
    function clientKeyById(id){return Object.entries(clientesDict||{}).find(([,c])=>c._id===id)?.[0]||null}

    window.gxNotificationFilter = window.gxNotificationFilter || "all";

    function operationsNotificationModel(){
        const persisted=Array.isArray(window.gxAdminNotifications)?window.gxAdminNotifications:[];
        const latestReviewByClient=new Map();

        persisted
            .filter(n=>String(n?.tipo||"").toLowerCase()==="pago_revision")
            .forEach(n=>{
                const id=String(n?.cliente_id||"");
                const prev=latestReviewByClient.get(id);
                if(!prev || new Date(n.created_at||0)>new Date(prev.created_at||0)) latestReviewByClient.set(id,n);
            });

        const reviews=[], overdue=[], upcoming=[], cancellations=[], support=[], activity=[];

        Object.entries(clientesDict||{}).forEach(([key,c])=>{
            if(c.pago_en_revision===true){
                const persistedReview=latestReviewByClient.get(String(c._id||""));
                reviews.push({
                    ...(persistedReview||{}),
                    id:persistedReview?.id||`review-${key}`,
                    tipo:"pago_revision",
                    categoria:"review",
                    titulo:persistedReview?.titulo||"Pago pendiente de revisión",
                    mensaje:persistedReview?.mensaje||`${c.nombre} tiene un comprobante pendiente de validar.`,
                    cliente_id:c._id,
                    cliente_nombre:c.nombre,
                    leida:persistedReview?.leida===true,
                    created_at:persistedReview?.created_at||new Date().toISOString(),
                    synthetic:!persistedReview,
                    key
                });
                return;
            }

            const timing=gxPaymentTiming(c);
            if(timing.type==="overdue"){
                overdue.push({
                    id:`od-${key}`,tipo:"pago_vencido",categoria:"overdue",
                    titulo:"Pago vencido",
                    mensaje:`${c.nombre} lleva ${timing.days} día${timing.days===1?'':'s'} de atraso en ${timing.periodo||gxPeriodLabel(c.periodo_pendiente)}. Fecha de pago: día ${c.dia_pago||15}.`,
                    cliente_id:c._id,cliente_nombre:c.nombre,leida:true,created_at:new Date().toISOString(),synthetic:true,key
                });
            }else if(timing.type==="upcoming"){
                upcoming.push({
                    id:`up-${key}`,tipo:"cobro_proximo",categoria:"upcoming",
                    titulo:timing.days===0?"Pago vence hoy":"Pago próximo",
                    mensaje:timing.days===0
                        ? `${c.nombre} tiene fecha de pago hoy para ${timing.periodo||gxPeriodLabel(c.periodo_pendiente)} (día ${c.dia_pago||15}).`
                        : `${c.nombre} vence en ${timing.days} día${timing.days===1?'':'s'} para ${timing.periodo||gxPeriodLabel(c.periodo_pendiente)} (día ${c.dia_pago||15}).`,
                    cliente_id:c._id,cliente_nombre:c.nombre,leida:true,created_at:new Date().toISOString(),synthetic:true,key
                });
            }
        });

        persisted.forEach(n=>{
            const tipo=String(n?.tipo||"").toLowerCase();
            if(tipo==="pago_revision") return;

            const key=clientKeyById(n?.cliente_id);
            const c=key?clientesDict?.[key]:null;

            // Evita duplicar el aviso de comprobante cuando el cliente ya aparece
            // explícitamente en "Por revisar".
            if(tipo==="pagos" && c?.pago_en_revision===true) return;

            const categoria=window.gxClassifyAdminNotification?.(n)||"activity";
            const item={...n,categoria,key,synthetic:false};

            if(categoria==="cancellation") cancellations.push(item);
            else if(categoria==="support") support.push(item);
            else activity.push(item);
        });

        const priority=[
            ...cancellations.filter(n=>!n.leida),
            ...reviews,
            ...support.filter(n=>!n.leida),
            ...overdue,
            ...upcoming
        ];

        return {
            reviews,overdue,upcoming,cancellations,support,activity,priority,
            all:[...cancellations,...reviews,...support,...overdue,...upcoming,...activity]
        };
    }

    function updateNotificationCounts(model){
        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
        set("gx-notif-count-all",model.priority.length);
        set("gx-notif-count-review",model.reviews.length);
        set("gx-notif-count-overdue",model.overdue.length);
        set("gx-notif-count-upcoming",model.upcoming.length);
        set("gx-notif-count-cancellation",model.cancellations.length);
        set("gx-notif-count-support",model.support.length);
        set("gx-notif-count-activity",model.activity.length);

        const unreadCancellation=model.cancellations.filter(n=>!n.leida).length;
        const unreadSupport=model.support.filter(n=>!n.leida).length;
        const urgent=model.reviews.length+model.overdue.length+unreadCancellation+unreadSupport;

        const bell=document.getElementById("gx-notification-bell");
        bell?.classList.toggle("has-new",urgent>0);
        const badge=document.getElementById("gx-notification-badge");
        if(badge)badge.title=urgent?`${urgent} requieren atención`:"Sin pendientes urgentes";

        const summary=document.getElementById("gx-notification-summary");
        if(summary){
            const parts=[];
            if(model.reviews.length) parts.push(`${model.reviews.length} pago${model.reviews.length===1?'':'s'} por revisar`);
            if(unreadCancellation) parts.push(`${unreadCancellation} cancelación${unreadCancellation===1?'':'es'}`);
            if(unreadSupport) parts.push(`${unreadSupport} soporte${unreadSupport===1?'':'s'}`);
            if(model.overdue.length) parts.push(`${model.overdue.length} vencido${model.overdue.length===1?'':'s'}`);
            summary.textContent=parts.length?parts.join(" · "):"Sin pendientes urgentes. La actividad reciente queda disponible aquí.";
        }

        const requests=document.getElementById("gx-count-requests");
        if(requests) requests.textContent=unreadCancellation+unreadSupport;
    }

    function renderNotifications(){
        const list=document.getElementById("gx-notification-list");
        if(!list)return;

        const model=operationsNotificationModel();
        updateNotificationCounts(model);

        let items=window.gxNotificationFilter==="review" ? model.reviews
            : window.gxNotificationFilter==="overdue" ? model.overdue
            : window.gxNotificationFilter==="upcoming" ? model.upcoming
            : window.gxNotificationFilter==="cancellation" ? model.cancellations
            : window.gxNotificationFilter==="support" ? model.support
            : window.gxNotificationFilter==="activity" ? model.activity
            : model.priority;

        const priority={cancellation:0,review:1,support:2,overdue:3,upcoming:4,activity:5};
        items=[...items].sort((a,b)=>{
            const pa=priority[a.categoria]??9,pb=priority[b.categoria]??9;
            if(pa!==pb)return pa-pb;
            return new Date(b.created_at||0)-new Date(a.created_at||0);
        });

        const labels={
            review:"Por revisar",
            overdue:"Vencido",
            upcoming:"Próximo",
            cancellation:"Cancelación",
            support:"Soporte",
            activity:"Actividad"
        };

        const renderActivity=(n)=>{
            const key=n.key||clientKeyById(n.cliente_id);
            const unread=!n.synthetic && n.leida!==true;
            return `<div class="gx-notif-compact ${unread?'unread':''}" data-gx-notification-id="${window.gxEscapeAdminHtml?.(n.id||'')||''}">
                <div class="gx-notif-compact-dot"></div>
                <div class="gx-notif-compact-copy">
                    <strong>${window.gxEscapeAdminHtml?.(n.titulo||"Actividad")||""}</strong>
                    <small>${n.cliente_nombre?`${window.gxEscapeAdminHtml?.(n.cliente_nombre)||""} · `:""}${relativeTime(n.created_at)}</small>
                </div>
                <div class="gx-notif-compact-actions">
                    ${key?`<button onclick="gxOpenNotificationClient('${key}', '${String(n.tipo||"").replace(/'/g,"")}', '${String(n.id||"").replace(/'/g,"")}')">Abrir</button>`:""}
                    ${!n.synthetic&&n.id?`<button class="danger" onclick="gxDeleteNotification('${String(n.id).replace(/'/g,"")}')">Eliminar</button>`:""}
                </div>
            </div>`;
        };

        list.innerHTML=items.length?items.map(n=>{
            const key=n.key||clientKeyById(n.cliente_id);
            const cls=n.categoria||"activity";
            if(cls==="activity") return renderActivity(n);

            const meta=window.gxParseAdminNotificationMeta?.(n)||{};
            const unread=!n.synthetic && n.leida!==true;
            const action=cls==="review"?"Revisar pago →"
                : cls==="cancellation"?"Abrir solicitud →"
                : "Abrir cliente →";
            const markLabel=cls==="cancellation"||cls==="support"?"Marcar atendida":"Marcar leída";

            return `<div class="gx-notif-item ${cls} ${unread?'unread':''}" data-gx-notification-id="${window.gxEscapeAdminHtml?.(n.id||'')||''}">
                <span class="gx-notif-kind ${cls}">${labels[cls]||"Actividad"}</span>
                <strong>${window.gxEscapeAdminHtml?.(n.titulo||"Actividad")||""}</strong>
                ${meta.servicio?`<span class="gx-notif-service">${window.gxEscapeAdminHtml?.(meta.servicio)||""}</span>`:""}
                <p>${window.gxEscapeAdminHtml?.(n.mensaje||"")||""}</p>
                <small>${n.cliente_nombre?`${window.gxEscapeAdminHtml?.(n.cliente_nombre)||""} · `:""}${relativeTime(n.created_at)}</small>
                <div class="gx-notif-actions-row">
                    ${key?`<button class="gx-notif-action" onclick="gxOpenNotificationClient('${key}', '${String(n.tipo||"").replace(/'/g,"")}', '${String(n.id||"").replace(/'/g,"")}')">${action}</button>`:""}
                    ${cls==="cancellation"&&!n.synthetic&&n.id?(window.gxCancellationButtons?.(String(n.id).replace(/'/g,""),"drawer")||""):""}
                    ${unread&&n.id&&cls!=="cancellation"?`<button class="gx-notif-mark" onclick="gxMarkNotificationRead('${String(n.id).replace(/'/g,"")}')">${markLabel}</button>`:""}
                    ${!n.synthetic&&n.id?`<button class="gx-notif-delete" onclick="gxDeleteNotification('${String(n.id).replace(/'/g,"")}')">Eliminar</button>`:""}
                </div>
            </div>`;
        }).join(""):`<div class="gx-empty-inline">No hay avisos en esta categoría.</div>`;
    }

    window.gxSetNotificationFilter=function(filter,btn){
        window.gxNotificationFilter=filter||"all";
        document.querySelectorAll("[data-gx-notif-filter]").forEach(x=>x.classList.toggle("active",x===btn));
        renderNotifications();
    };

    window.gxToggleNotificationsBase=function(force){
        const drawer=document.getElementById("gx-notification-drawer"),overlay=document.getElementById("gx-notification-overlay");
        const show=force===undefined?!drawer.classList.contains("show"):Boolean(force);
        drawer.classList.toggle("show",show);overlay.classList.toggle("show",show);drawer.setAttribute("aria-hidden",show?"false":"true");
        if(show)renderNotifications();
    };

    window.gxOpenNotificationClient=(key,tipo,notificationId="")=>{
        gxToggleNotifications(false);
        goAdminTab("tab-clientes");
        setTimeout(()=>{
            gxOpenClientFocus(key);
            if(tipo==="pago_revision") setTimeout(()=>gxOpenPaymentModal(key),150);
            if(notificationId) setTimeout(()=>window.gxHighlightClientRequest?.(notificationId),180);
        },80);
    };

    // Centro de Operaciones unificado: pagos + solicitudes + actividad persistente.
    window.gxMarkAllNotificationsRead=async()=>{
        const model=operationsNotificationModel();
        const current=window.gxNotificationFilter||"all";
        const visible=current==="review"?model.reviews
            :current==="overdue"?model.overdue
            :current==="upcoming"?model.upcoming
            :current==="cancellation"?model.cancellations
            :current==="support"?model.support
            :current==="activity"?model.activity
            :model.priority;

        const ids=[...new Set(visible.filter(n=>!n.synthetic && n.id && !n.leida).map(n=>n.id))];
        if(!ids.length)return;
        try{
            await ops("marcar_notificaciones_leidas",{ids});
            (window.gxAdminNotifications||[]).forEach(n=>{if(ids.includes(n.id))n.leida=true});
            renderNotifications();
            window.gxRefreshClientOperationalContext?.();
            window.gxRefreshServiceRequestBadges?.();
            window.gxUpdateOperationsSummary?.();
        }catch(e){console.warn("No se pudieron marcar los avisos como leídos",e)}
    };

    window.gxMarkNotificationRead=async(id)=>{
        if(!id)return;
        try{
            await ops("marcar_notificaciones_leidas",{ids:[id]});
            const n=(window.gxAdminNotifications||[]).find(x=>String(x?.id||"")===String(id));
            if(n)n.leida=true;
            renderNotifications();
            window.gxRefreshClientOperationalContext?.();
            window.gxRefreshServiceRequestBadges?.();
            window.gxUpdateOperationsSummary?.();
        }catch(e){
            console.error(e);
            alert("No se pudo marcar la solicitud como atendida.");
        }
    };

    window.gxDeleteNotification=async(id)=>{
        if(!id)return;
        const n=(window.gxAdminNotifications||[]).find(x=>String(x?.id||"")===String(id));
        const title=String(n?.titulo||"esta notificación");
        if(!confirm(`¿Eliminar "${title}"?\n\nSe quitará definitivamente del Centro de Operaciones.`))return;
        try{
            await ops("eliminar_notificaciones",{ids:[id]});
            window.gxAdminNotifications=(window.gxAdminNotifications||[]).filter(x=>String(x?.id||"")!==String(id));
            renderNotifications();
            window.gxRefreshClientOperationalContext?.();
            window.gxRefreshServiceRequestBadges?.();
            window.gxUpdateOperationsSummary?.();
        }catch(e){
            console.error(e);
            alert("No se pudo eliminar la notificación.");
        }
    };
    window.gxRefreshNotifications=async()=>{if(typeof inicializarPanel==="function"){await inicializarPanel();setTimeout(renderNotifications,80)}};

    // ---------- Payment alerts ----------
    window.gxPeriodLabel=function(periodo){
        const meses=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const m=String(periodo||"").match(/^(\d{4})-(\d{2})/);
        if(!m)return "Periodo actual";
        return `${meses[Math.max(0,Math.min(11,Number(m[2])-1))]} ${m[1]}`;
    };
    window.gxNormalizePeriod=function(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\bde\b/g," ").replace(/\s+/g," ").trim()};
    window.gxPeriodAlreadyPaid=function(c){
        if(c?.estado_cuenta) return c.estado_cuenta.esta_pagado_periodo === true;
        const wanted=gxNormalizePeriod(gxPeriodLabel(c?.periodo_pendiente));
        return (c?.historial_pagos||[]).some(p=>gxNormalizePeriod(p?.periodo||p?.fecha)===wanted && String(p?.estado||"pagado").toLowerCase()==="pagado");
    };
    window.gxPaymentTiming=function(c){
        if(c?.estado_cuenta){
            const ec=c.estado_cuenta;
            if(ec.estado==='vencido') return {type:'overdue',days:Number(ec.dias_atraso||0),periodo:ec.periodo_label||gxPeriodLabel(c.periodo_pendiente)};
            if(ec.estado==='por_vencer'||ec.estado==='vence_hoy') return {type:'upcoming',days:Number(ec.dias_para_corte||0),periodo:ec.periodo_label||gxPeriodLabel(c.periodo_pendiente)};
            return {type:'none',days:0,periodo:ec.periodo_label||gxPeriodLabel(c.periodo_pendiente)};
        }
        if(!c || c.estado==="suspendido" || c.pago_en_revision || gxPeriodAlreadyPaid(c))return {type:"none",days:0};
        const now=new Date();
        const pm=String(c.periodo_pendiente||"").match(/^(\d{4})-(\d{2})/);
        const y=pm?Number(pm[1]):now.getFullYear();
        const m=pm?Math.max(0,Math.min(11,Number(pm[2])-1)):now.getMonth();
        const lastDay=new Date(y,m+1,0).getDate();
        const day=Math.min(lastDay,Math.max(1,Number(c.dia_pago||15)));
        const due=new Date(y,m,day,23,59,59);
        const diff=Math.ceil((due-now)/86400000);
        if(diff>=0 && diff<=3)return {type:"upcoming",days:diff,due,periodo:gxPeriodLabel(c.periodo_pendiente)};
        if(diff<0)return {type:"overdue",days:Math.abs(diff),due,periodo:gxPeriodLabel(c.periodo_pendiente)};
        return {type:"none",days:diff,due,periodo:gxPeriodLabel(c.periodo_pendiente)};
    };
    window.gxShowPaymentAlert=function(type){
        goAdminTab("tab-clientes");
        const filtered={};Object.entries(clientesDict||{}).forEach(([k,c])=>{if(gxPaymentTiming(c).type===type)filtered[k]=c});
        renderizarClientes(filtered);
        const sub=document.getElementById("gx-client-page-subtitle");if(sub)sub.textContent=type==="upcoming"?"Clientes cuyo pago vence en los próximos 3 días":"Clientes con pago vencido";
    };

    // ---------- Payment review ----------
    window.gxOpenPaymentModalBase=function(key,monto){
        const c=clientesDict?.[key];if(!c)return;
        paymentCtx={key,monto:Number(monto ?? c?.estado_cuenta?.total_actual ?? ((c.servicios||[]).reduce((s,x)=>s+Number(x.monto||0),0)))};
        document.getElementById("gx-payment-client-name").textContent=c.nombre;
        document.getElementById("gx-payment-client-meta").textContent=`${c.folio} · ${gxPeriodLabel(c.periodo_pendiente)} · Esperado $${paymentCtx.monto} · Día ${c.dia_pago||15}`;
        const timing=gxPaymentTiming({...c,estado:"pendiente",pago_en_revision:false});
        document.getElementById("gx-payment-review-card").innerHTML=
            `<strong>Estado actual:</strong> ${c.pago_en_revision?'Comprobante recibido y pendiente de validar':'Sin comprobante en revisión'}<br>`+
            `<strong>Lealtad:</strong> ${c.pagos_puntuales||0} pagos consecutivos.`+
            (timing.type==="overdue"
                ? `<div style="margin-top:8px;padding:8px;border-radius:9px;background:rgba(255,170,0,.07);border:1px solid rgba(255,170,0,.18);color:#ffd36c;"><strong>Pago fuera de fecha.</strong> Por defecto no sumará Lealtad. Marca la casilla de pago puntual solo si deseas conservar/sumar la racha manualmente.</div>`
                : "");
        document.getElementById("gx-payment-note").value="";
        document.getElementById("gx-missing-amount").value="";
        document.getElementById("gx-missing-amount-wrap").classList.remove("show");
        const punctual=document.getElementById("gx-payment-punctual");if(punctual)punctual.checked=timing.type!=="overdue";
        const modal=document.getElementById("gx-payment-modal");modal.classList.add("show");modal.setAttribute("aria-hidden","false");
    };
    window.gxClosePaymentModal=()=>{document.getElementById("gx-payment-modal")?.classList.remove("show");paymentCtx=null};
    async function paymentAction(type){
        if(!paymentCtx)return;const c=clientesDict[paymentCtx.key],note=document.getElementById("gx-payment-note").value.trim();
        let successMessage="";
        try{
            if(type==="approve"){
                const puntual=document.getElementById("gx-payment-punctual").checked;
                const before=Number(c.pagos_puntuales||0);
                const alreadyPaid=gxPeriodAlreadyPaid(c);
                const r=await gxPeriodAction("aprobar_pago_periodo",{cliente_id:c._id,monto:paymentCtx.monto,puntual,notas:note||"Aprobado desde Admin"});
                let after=Number(r.pagos_puntuales||before);
                if(!puntual && !alreadyPaid){
                    await gxCoreAdminAction("reiniciar_lealtad",{cliente_id:c._id});
                    after=0;
                }
                c.estado="pagado";c.pago_en_revision=false;c.pagos_puntuales=after;c.pago_revision_estado="aprobado";c.periodo_pendiente=r.periodo_pendiente||c.periodo_pendiente;
                const periodoPagado=r.periodo_pagado||"el periodo pendiente";
                const siguiente=gxPeriodLabel(r.periodo_pendiente);
                if(puntual && after>before) successMessage=`✅ Pago aprobado · ${periodoPagado}.\n\nLealtad: ${before} → ${after} pagos.\nSiguiente periodo: ${siguiente}.`;
                else if(puntual && after===before) successMessage=`✅ Pago aprobado · ${periodoPagado}.\n\nLealtad se mantiene en ${after}. Este periodo ya estaba contabilizado.\nSiguiente periodo: ${siguiente}.`;
                else successMessage=`✅ Pago aprobado fuera de fecha · ${periodoPagado}.\n\nLealtad actual: ${after} pagos.\nSiguiente periodo: ${siguiente}.`;
            } else if(type==="incomplete"){
                const amount=Number(document.getElementById("gx-missing-amount").value||0);
                const msg=note||`Detectamos un pago incompleto${amount>0?` por $${amount}`:""}. Revisa el monto y vuelve a enviar tu comprobante.`;
                await ops("pago_incompleto",{cliente_id:c._id,monto_faltante:amount,mensaje:msg});
                c.estado="pendiente";c.pago_en_revision=false;c.pago_revision_estado="incompleto";c.pago_revision_mensaje=msg;c.pago_revision_monto_faltante=amount;
                successMessage="⚠️ Pago marcado como incompleto.";
            } else {
                const msg=note||"No pudimos validar tu comprobante. Verifica los datos y vuelve a enviarlo.";
                await ops("rechazar_pago",{cliente_id:c._id,mensaje:msg});
                c.estado="pendiente";c.pago_en_revision=false;c.pago_revision_estado="rechazado";c.pago_revision_mensaje=msg;
                successMessage="✕ Comprobante rechazado.";
            }
            const refreshKey=paymentCtx?.key;
            gxClosePaymentModal();gxCloseClientFocus();
            if(refreshKey && typeof gxReloadAdminClient==='function') await gxReloadAdminClient(refreshKey);
            else {filtrarClientes();gxUpdateOperationsSummary();}
            alert(successMessage);
        }catch(e){alert("No se pudo procesar el pago.\n\n"+e.message)}
    }
    window.gxPaymentApprove=()=>paymentAction("approve");
    
    window.gxPaymentReject=()=>{if(confirm("¿Rechazar este comprobante? La lealtad no aumentará."))paymentAction("reject")};


    // ---------- Summary enrichment ----------
    const originalSummary=window.gxUpdateOperationsSummaryBase;
    window.gxUpdateOperationsSummary=function(){
        originalSummary?.();
        const vals=Object.values(clientesDict||{});
        let upcoming=0,overdue=0;vals.forEach(c=>{const t=gxPaymentTiming(c).type;if(t==="upcoming")upcoming++;if(t==="overdue")overdue++});
        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set("gx-count-upcoming",upcoming);set("gx-count-overdue",overdue);
        renderNotifications();
    };

    // Hook admin response loading: initialize mission builder after settings are populated.
    const oldInit=window.inicializarPanel;
    if(typeof oldInit==="function"){
        window.inicializarPanel=async function(...args){const r=await oldInit.apply(this,args);setTimeout(()=>{loadBuilder();renderNotifications();gxUpdateOperationsSummary()},120);return r};
    }
    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{loadBuilder();renderNotifications()},500));
})();