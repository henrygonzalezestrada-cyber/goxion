(() => {
    const normalize = (v="") => String(v)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .trim();

    window.gxEscapeAdminHtml = (value="") => String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

    window.gxClassifyAdminNotification = function(n={}){
        const tipo=normalize(n.tipo);
        const titulo=normalize(n.titulo);
        const mensaje=normalize(n.mensaje);

        if(tipo==="pago_revision") return "review";

        if(
            titulo.includes("solicitud de cancelacion") ||
            mensaje.includes("proceso de cancelacion") ||
            mensaje.includes("solicita iniciar el proceso de cancelacion")
        ) return "cancellation";

        // Feedback/comentarios son actividad, no una solicitud de soporte pendiente.
        if(
            titulo.includes("feedback") ||
            titulo.includes("comentario") ||
            mensaje.includes("comentario:")
        ) return "activity";

        if(tipo==="soporte") return "support";

        return "activity";
    };

    window.gxParseAdminNotificationMeta = function(n={}){
        const message=String(n.mensaje||"");
        const service=message.match(/(?:^|\n)\s*Servicio:\s*([^\n]+)/i);
        const serviceId=message.match(/(?:^|\n)\s*Servicio ID:\s*([^\n]+)/i);
        const folio=message.match(/(?:^|\n)\s*Folio:\s*([^\n]+)/i);
        return {
            servicio:service?.[1]?.trim()||"",
            servicio_id:serviceId?.[1]?.trim()||"",
            folio:folio?.[1]?.trim()||""
        };
    };

    window.gxAdminServiceHasAlert = function(name){
        const alert=configGlobal?.alertas||{};
        if(alert?.activa!==true)return false;
        const platform=normalize(alert.plataforma).replace(/[^a-z0-9]+/g," ").trim();
        const service=normalize(name).replace(/[^a-z0-9]+/g," ").trim();
        return platform==="todos los servicios" ||
            platform==="todos" ||
            Boolean(platform && (service===platform || service.startsWith(platform+" ")));
    };

    function notificationMatchesService(n,service={}){
        if(window.gxClassifyAdminNotification(n)!=="cancellation")return false;
        const meta=window.gxParseAdminNotificationMeta(n);
        const serviceId=String(service?._id||service?.id||"");
        if(meta.servicio_id && serviceId && meta.servicio_id===serviceId)return true;
        return normalize(meta.servicio)===normalize(service?.nombre);
    }

    window.gxPendingCancellationForService = function(cliente,service){
        const cid=String(cliente?._id||cliente?.id||"");
        return (window.gxAdminNotifications||[]).some(n=>
            !n.leida &&
            String(n?.cliente_id||"")===cid &&
            notificationMatchesService(n,service)
        );
    };

    window.gxRefreshServiceRequestBadges = function(){
        document.querySelectorAll(".gx-service-compact[data-gx-client-key]").forEach(card=>{
            const key=card.dataset.gxClientKey;
            const idx=Number(card.dataset.gxServiceIndex);
            const c=clientesDict?.[key];
            const s=c?.servicios?.[idx];
            const request=card.querySelector("[data-gx-service-request-state]");
            const live=card.querySelector("[data-gx-service-live-state]");
            if(request) request.style.display=window.gxPendingCancellationForService(c,s)?"inline-flex":"none";
            if(live && s){
                const interrupted=window.gxAdminServiceHasAlert(s.nombre);
                live.classList.toggle("interrupted",interrupted);
                live.classList.toggle("active",!interrupted);
                live.innerHTML=`<i></i>${interrupted?"Temporalmente inactivo":"Activo"}`;
            }
        });
    };

    window.gxToggleServiceIncident = async function(key,index){
        const c=clientesDict?.[key];
        const s=c?.servicios?.[index];
        if(!c||!s)return;

        const current={...(configGlobal?.alertas||{})};
        const same=window.gxAdminServiceHasAlert(s.nombre);

        let next;
        if(same){
            const scope=normalize(current.plataforma)==="todos los servicios"||normalize(current.plataforma)==="todos"
                ?"la alerta global de todos los servicios"
                :`la incidencia de ${s.nombre}`;
            if(!confirm(`¿Resolver ${scope}?\n\nAyuda volverá a mostrar este servicio como Activo.`))return;
            next={
                activa:false,
                plataforma:current.plataforma||s.nombre,
                falla:current.falla||"presentando intermitencias temporales",
                mensaje:current.mensaje||""
            };
        }else{
            if(current.activa===true && current.plataforma && !window.gxAdminServiceHasAlert(s.nombre)){
                if(!confirm(`Ya existe una alerta activa para "${current.plataforma}".\n\n¿Quieres reemplazarla por una incidencia de "${s.nombre}"?`))return;
            }
            next={
                activa:true,
                plataforma:s.nombre,
                falla:current.falla||document.getElementById("alert-type")?.value||"presentando intermitencias temporales",
                mensaje:""
            };
        }

        try{
            if(typeof window.gxCoreAdminAction!=="function") throw new Error("La conexión administrativa no está disponible.");
            await window.gxCoreAdminAction("guardar_alerta",next);
            configGlobal.alertas=next;

            const active=document.getElementById("alert-active");
            const platform=document.getElementById("alert-platform");
            const type=document.getElementById("alert-type");
            const msg=document.getElementById("global-msg");
            if(active)active.checked=next.activa;
            if(platform)platform.value=next.plataforma;
            if(type)type.value=next.falla;
            if(msg)msg.value=next.mensaje;

            if(typeof toggleAlertFields==="function")toggleAlertFields();
            if(typeof window.gxReloadAdminClient==="function") await window.gxReloadAdminClient(key);
            else window.gxRefreshServiceRequestBadges();
        }catch(e){
            console.error(e);
            alert("No se pudo actualizar la incidencia.\n\n"+(e?.message||e));
        }
    };

    function clientOperationalItems(clienteId){
        return (window.gxAdminNotifications||[])
            .filter(n=>{
                if(String(n?.cliente_id||"")!==String(clienteId||""))return false;
                const cat=window.gxClassifyAdminNotification(n);
                return cat==="cancellation"||cat==="support";
            })
            .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
            .slice(0,5);
    }

    window.gxRefreshClientOperationalContext = function(){
        const focus=document.getElementById("gx-client-focus");
        if(!focus?.classList.contains("show"))return;
        const body=document.getElementById("gx-focus-body");
        const details=body?.querySelector("[id^='details-']");
        if(!details)return;
        const key=details.id.replace(/^details-/,"");
        const c=clientesDict?.[key];
        if(!c)return;

        details.querySelector(".gx-client-ops-context")?.remove();

        const items=clientOperationalItems(c._id);
        if(!items.length)return;

        const unread=items.filter(n=>!n.leida).length;
        const box=document.createElement("details");
        box.className="gx-client-ops-context";
        box.open=false;
        box.innerHTML=`<summary class="gx-client-ops-context-head">
            <div><strong>Actividad de Mi Espacio</strong><span>${items.length} movimiento${items.length===1?"":"s"}</span></div>
            <em>${unread?`${unread} pendiente${unread===1?"":"s"}`:"Ver historial"}</em>
        </summary>
        <div class="gx-client-ops-context-body">` + items.map(n=>{
            const cat=window.gxClassifyAdminNotification(n);
            const meta=window.gxParseAdminNotificationMeta(n);
            const safeId=window.gxEscapeAdminHtml(n.id||"");
            return `<article class="gx-client-request" data-gx-client-request-id="${safeId}">
                <div class="gx-client-request-top">
                    <strong>${window.gxEscapeAdminHtml(n.titulo|| (cat==="cancellation"?"Solicitud de cancelación":"Solicitud de soporte"))}</strong>
                    <span class="gx-client-request-status ${n.leida?"seen":"pending"}">${n.leida?"Vista":"Pendiente"}</span>
                </div>
                ${meta.servicio?`<small>${window.gxEscapeAdminHtml(meta.servicio)}</small>`:""}
                <p>${window.gxEscapeAdminHtml(n.mensaje||"")}</p>
                <div class="gx-client-request-actions">
                    ${!n.leida&&n.id?`<button class="done" type="button" onclick="gxMarkNotificationRead('${String(n.id).replace(/'/g,"")}')">Marcar atendida</button>`:""}
                    ${n.id?`<button class="danger" type="button" onclick="gxDeleteNotification('${String(n.id).replace(/'/g,"")}')">Eliminar</button>`:""}
                    <button type="button" onclick="gxOpenNotificationCategory('${cat}')">Ver en operaciones</button>
                </div>
            </article>`;
        }).join("") + `</div>`;

        // Actividad es contexto secundario: siempre al final de la ficha.
        details.appendChild(box);
    };

    window.gxHighlightClientRequest = function(id){
        if(!id)return;
        const el=document.querySelector(`[data-gx-client-request-id="${CSS.escape(String(id))}"]`);
        if(!el)return;
        el.classList.add("highlight");
        el.scrollIntoView({behavior:"smooth",block:"center"});
        setTimeout(()=>el.classList.remove("highlight"),1200);
    };

    window.gxOpenNotificationCategory = function(filter="all"){
        if(typeof window.gxToggleNotifications==="function") window.gxToggleNotifications(true);
        setTimeout(()=>{
            const btn=document.querySelector(`[data-gx-notif-filter="${filter}"]`);
            if(typeof window.gxSetNotificationFilter==="function") window.gxSetNotificationFilter(filter,btn);
        },20);
    };

    // Enriquece la ficha actual sin sustituir su comportamiento.
    const openClient=window.gxOpenClientFocus;
    if(typeof openClient==="function"){
        window.gxOpenClientFocus=function(key,...args){
            const result=openClient.call(this,key,...args);
            setTimeout(()=>{
                window.gxRefreshClientOperationalContext();
                window.gxRefreshServiceRequestBadges();
            },20);
            return result;
        };
    }

    // Mantener contador de solicitudes en el Resumen.
    const summary=window.gxUpdateOperationsSummary;
    if(typeof summary==="function"){
        window.gxUpdateOperationsSummary=function(...args){
            const result=summary.apply(this,args);
            setTimeout(()=>{
                const ops=(window.gxAdminNotifications||[]).filter(n=>{
                    const cat=window.gxClassifyAdminNotification(n);
                    return !n.leida && (cat==="cancellation"||cat==="support");
                }).length;
                const el=document.getElementById("gx-count-requests");
                if(el)el.textContent=ops;
                window.gxRefreshServiceRequestBadges();
            },0);
            return result;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(()=>{
            window.gxRefreshServiceRequestBadges();
            window.gxUpdateOperationsSummary?.();
        },650);
    });

})();