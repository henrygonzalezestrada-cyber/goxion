(() => {
    const URL="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/registro-admin";
    window.gxRegistrationState={clientes:[],solicitudes:[],activaciones:[],resumen:{foco_rojo:0,nuevos_pendientes:0,activaciones_pendientes:0,activaciones_bloqueadas:0,activaciones_expiradas:0,legacy_sin_telefono:0},tab:"new"};

    const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const fmtPhone=v=>{
        const d=String(v||"").replace(/\D/g,"");
        const local=d.startsWith("52")&&d.length===12?d.slice(2):d;
        return local.length===10?`${local.slice(0,3)} ${local.slice(3,6)} ${local.slice(6)}`:(d||"Sin teléfono");
    };
    const fmtDate=v=>{
        if(!v)return "—";
        const d=new Date(v);if(Number.isNaN(d.getTime()))return "—";
        return d.toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short"});
    };
    const remaining=v=>{
        if(!v)return "Sin vigencia";
        const ms=new Date(v).getTime()-Date.now();
        if(!Number.isFinite(ms)||ms<=0)return "Vencido";
        const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
        return h>=1?`${h} h ${m} min`:`${Math.max(1,m)} min`;
    };
    const clientKeyById=id=>Object.entries(clientesDict||{}).find(([,c])=>String(c?._id||c?.id||"")===String(id))?.[0]||"";
    const clientIdentity=id=>gxRegistrationState.clientes.find(c=>String(c.id)===String(id))||null;
    const activationByRequest=id=>gxRegistrationState.activaciones.find(a=>String(a.solicitud_id)===String(id))||null;

    async function api(accion,datos={}){
        const token=localStorage.getItem("GOXION_ADMIN_TOKEN")||"";
        const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":token},body:JSON.stringify({accion,datos}),cache:"no-store"});
        const j=await r.json().catch(()=>({}));
        if(!r.ok||j?.ok!==true){const e=new Error(j?.error||`HTTP ${r.status}`);e.payload=j;e.status=r.status;throw e}
        return j;
    }

    window.gxLoadRegistrationState=async function(render=false){
        try{
            const r=await api("resumen",{});
            gxRegistrationState={clientes:r.clientes||[],solicitudes:r.solicitudes||[],activaciones:r.activaciones||[],resumen:r.resumen||{},tab:gxRegistrationState.tab||"attempts"};
            const red=Number(gxRegistrationState.resumen.foco_rojo||0)+Number(gxRegistrationState.resumen.activaciones_bloqueadas||0)+Number(gxRegistrationState.resumen.activaciones_expiradas||0);
            const attention=red+Number(gxRegistrationState.resumen.nuevos_pendientes||0)+Number(gxRegistrationState.resumen.activaciones_pendientes||0);
            const dec=document.getElementById("gx-decision-registrations");
            const ops=document.getElementById("gx-ops-registration-count");
            if(dec)dec.textContent=String(attention);
            if(ops)ops.textContent=String(attention);
            const total=document.getElementById("gx-decision-total");
            if(total){
                const current=Number((total.textContent.match(/\d+/)||["0"])[0]);
                if(!total.dataset.gxRegCount) total.dataset.gxRegCount="0";
                const prev=Number(total.dataset.gxRegCount||0);
                const next=Math.max(0,current-prev+attention);
                total.textContent=`${next} pendiente${next===1?"":"s"}`;
                total.dataset.gxRegCount=String(attention);
            }
            if(render)gxRenderRegistrationControl();
            return r;
        }catch(e){console.warn("Registro & activación",e);return null}
    };

    window.gxOpenRegistrationControl=async function(){
        const modal=document.getElementById("gx-registration-control");
        modal?.classList.add("show");modal?.setAttribute("aria-hidden","false");
        document.body.style.overflow="hidden";
        await gxLoadRegistrationState(true);
    };
    window.gxCloseRegistrationControl=function(){
        const modal=document.getElementById("gx-registration-control");
        modal?.classList.remove("show");modal?.setAttribute("aria-hidden","true");
        if(!document.getElementById("gx-activation-delivery")?.classList.contains("show"))document.body.style.overflow="";
    };
    window.gxRegistrationTab=function(tab,btn){
        gxRegistrationState.tab=tab;
        document.querySelectorAll(".gx-registration-tabs button").forEach(b=>b.classList.toggle("active",b===btn));
        gxRenderRegistrationControl();
    };
    window.gxGoActivationTab=function(){
        gxRegistrationState.tab="pending";
        document.querySelectorAll(".gx-registration-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.gxRegTab==="pending"));
        gxRenderRegistrationControl();
    };

    function activationStatus(a){
        if(!a)return {label:"Sin activar",cls:""};
        if(a.estado==="pendiente")return {label:"Pendiente de activación",cls:"pending"};
        if(a.estado==="activada")return {label:"Cuenta activada",cls:"new"};
        if(a.estado==="bloqueada")return {label:"Código bloqueado",cls:"danger"};
        if(a.estado==="expirada")return {label:"Código vencido",cls:"review"};
        if(a.estado==="cancelada")return {label:"Cancelada",cls:""};
        return {label:a.estado||"—",cls:""};
    }

    window.gxRenderRegistrationControl=function(){
        const list=document.getElementById("gx-registration-list");if(!list)return;
        const s=gxRegistrationState;
        const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
        set("gx-reg-kpi-review",s.resumen.foco_rojo||0);
        set("gx-reg-kpi-new",s.resumen.nuevos_pendientes||0);
        set("gx-reg-kpi-activation",s.resumen.activaciones_pendientes||0);
        set("gx-reg-kpi-activated",s.resumen.activadas||0);

        const renderActivation=a=>{
            const st=activationStatus(a);
            const linked=a.cliente_id?clientIdentity(a.cliente_id):null;
            const canRenew=["pendiente","expirada","bloqueada"].includes(a.estado);
            const canCancel=["pendiente","expirada","bloqueada"].includes(a.estado);
            return `<article class="gx-reg-row ${st.cls}">
                <div class="gx-reg-main">
                    <div class="gx-reg-top">
                        <strong>${esc(a.nombre_declarado)}</strong>
                        <span class="gx-reg-badge ${st.cls}">${esc(st.label)}</span>
                        <span class="gx-reg-tag">@${esc(a.goxion_id)}</span>
                    </div>
                    <div class="gx-reg-meta">${fmtPhone(a.telefono_normalizado)} · ${a.estado==="pendiente"?`vence en ${remaining(a.expira_at)}`:a.expira_at?`vigencia: ${fmtDate(a.expira_at)}`:"sin código activo"}</div>
                    <div class="gx-reg-meta">Intentos ${Number(a.intentos_fallidos||0)}/${Number(a.max_intentos||5)} · regeneraciones ${Number(a.regeneraciones||0)}${a.activada_at?` · activada ${fmtDate(a.activada_at)}`:""}</div>
                </div>
                <div class="gx-reg-actions">
                    ${linked?`<button onclick="gxOpenIdentityClient('${esc(linked.id)}')">Ver cliente</button>`:""}
                    ${canRenew?`<button class="ok" onclick="gxRegenerateActivation('${esc(a.solicitud_id)}','${esc(a.nombre_declarado)}',${a.estado==="pendiente"?"true":"false"})">${a.estado==="pendiente"?"Regenerar y enviar":"Generar nuevo código"}</button>`:""}
                    ${canCancel?`<button class="danger" onclick="gxCancelActivation('${esc(a.solicitud_id)}','${esc(a.nombre_declarado)}')">Cancelar</button>`:""}
                    ${a.estado!=="activada"?`<button class="delete-record" onclick="gxDeleteRegistration('${esc(a.solicitud_id)}','${esc(a.nombre_declarado)}')">Eliminar registro</button>`:""}
                </div>
            </article>`;
        };

        const renderRequest=r=>{
            const a=r.activacion||activationByRequest(r.id);
            const cls=r.resultado==="cliente_existente"?"danger":r.resultado==="revisar"?"review":r.resultado==="nuevo"?"new":"";
            const label=r.resultado==="cliente_existente"?"Cliente existente":r.resultado==="revisar"?"Requiere revisión":r.resultado==="nuevo"?"Cliente nuevo":"Solicitud previa";
            const linked=clientIdentity(r.cliente_id);
            const actionable=r.estado_admin!=="resuelto"&&r.estado_admin!=="descartado";
            const canPrepare=actionable&&r.resultado==="nuevo"&&!a;
            const ast=activationStatus(a);
            return `<article class="gx-reg-row ${cls}">
                <div class="gx-reg-main">
                    <div class="gx-reg-top">
                        <strong>${esc(r.nombre_declarado)}</strong>
                        <span class="gx-reg-badge ${cls}">${label}</span>
                        ${a?`<span class="gx-reg-badge ${ast.cls}">${esc(ast.label)}</span>`:`<span class="gx-reg-badge">${esc(r.estado_admin)}</span>`}
                    </div>
                    <div class="gx-reg-meta">${fmtPhone(r.telefono_normalizado)}${linked?` · Coincide con ${esc(linked.nombre)}`:""} · ${fmtDate(r.created_at)}</div>
                    ${a?`<div class="gx-reg-meta"><b class="gx-reg-inline-id">@${esc(a.goxion_id)}</b>${a.estado==="pendiente"?` · código activo por ${remaining(a.expira_at)}`:""}</div>`:""}
                    ${r.detalle?`<div class="gx-reg-meta">${esc(r.detalle)}</div>`:""}
                </div>
                <div class="gx-reg-actions">
                    ${linked?`<button onclick="gxOpenIdentityClient('${esc(linked.id)}')">Ver cliente</button>`:""}
                    ${actionable&&linked&&(r.resultado==="revisar"||r.resultado==="cliente_existente")&&!a?`<button class="danger" onclick="gxLinkExistingRegistration('${esc(r.id)}','${esc(linked.id)}')">Vincular teléfono</button>`:""}
                    ${canPrepare?`<button class="ok gx-prepare-activation" onclick="gxPrepareActivation('${esc(r.id)}','${esc(r.nombre_declarado)}')">Aprobar registro</button><button class="danger" onclick="gxRegistrationStatus('${esc(r.id)}','descartado')">Descartar</button>`:""}
                    ${a?`<button onclick="gxGoActivationTab()">Ver activación</button>`:""}
                    ${actionable&&!canPrepare&&!a&&r.resultado!=="nuevo"?`<button class="danger" onclick="gxRegistrationStatus('${esc(r.id)}','descartado')">Rechazar registro</button>`:""}
                    ${!a||a.estado!=="activada"?`<button class="delete-record" onclick="gxDeleteRegistration('${esc(r.id)}','${esc(r.nombre_declarado)}')">Eliminar registro</button>`:""}
                </div>
            </article>`;
        };

        if(s.tab==="legacy"){
            const rows=s.clientes.filter(c=>c.origen_cliente==="sd_streaming"&&!c.telefono_normalizado);
            list.innerHTML=rows.length?rows.map(c=>`
                <article class="gx-reg-row review">
                    <div class="gx-reg-main">
                        <div class="gx-reg-top"><strong>${esc(c.nombre)}</strong><span class="gx-reg-badge review">Base previa</span></div>
                        <div class="gx-reg-meta">Folio ${esc(c.folio||"—")} · Sin teléfono para reforzar la detección de altas repetidas.</div>
                    </div>
                    <div class="gx-reg-actions"><button onclick="gxOpenIdentityClient('${esc(c.id)}')">Abrir cliente</button></div>
                </article>`).join(""):'<div class="gx-empty-inline">Todos los clientes previos ya tienen teléfono registrado.</div>';
            return;
        }

        if(s.tab==="pending"){
            const rows=s.activaciones.filter(a=>a.estado==="pendiente");
            list.innerHTML=rows.length?rows.map(renderActivation).join(""):'<div class="gx-empty-inline">No hay cuentas esperando activación.</div>';
            return;
        }

        if(s.tab==="activated"){
            const rows=s.activaciones.filter(a=>a.estado==="activada");
            list.innerHTML=rows.length?rows.map(renderActivation).join(""):'<div class="gx-empty-inline">Todavía no hay altas completadas mediante este flujo.</div>';
            return;
        }

        if(s.tab==="history"){
            const rows=s.solicitudes;
            list.innerHTML=rows.length?rows.map(renderRequest).join(""):'<div class="gx-empty-inline">Todavía no hay historial de registros.</div>';
            return;
        }

        if(s.tab==="review"){
            const requests=s.solicitudes.filter(r=>r.estado_admin!=="resuelto"&&r.estado_admin!=="descartado"&&(r.resultado==="revisar"||r.resultado==="cliente_existente"));
            const acts=s.activaciones.filter(a=>a.estado==="bloqueada"||a.estado==="expirada");
            const parts=[];
            if(requests.length)parts.push(`<div class="gx-reg-section-label">Solicitudes que requieren decisión</div>${requests.map(renderRequest).join("")}`);
            if(acts.length)parts.push(`<div class="gx-reg-section-label">Activaciones con incidencia</div>${acts.map(renderActivation).join("")}`);
            list.innerHTML=parts.length?parts.join(""):'<div class="gx-empty-inline">No hay registros que requieran revisión.</div>';
            return;
        }

        const rows=s.solicitudes.filter(r=>r.resultado==="nuevo"&&r.estado_admin!=="resuelto"&&r.estado_admin!=="descartado"&&!activationByRequest(r.id));
        list.innerHTML=rows.length?rows.map(renderRequest).join(""):'<div class="gx-empty-inline">No hay registros nuevos pendientes de aprobación.</div>';
    };

    window.gxRegistrationStatus=async function(id,state){
        if(state==="descartado"&&!confirm("¿Descartar esta solicitud? No se preparará ninguna activación ni beneficio de bienvenida."))return;
        try{await api("resolver_solicitud",{solicitud_id:id,estado_admin:state});await gxLoadRegistrationState(true)}
        catch(e){alert("No se pudo actualizar la solicitud.\n\n"+e.message)}
    };
    window.gxLinkExistingRegistration=async function(requestId,clientId){
        if(!confirm("Se guardará este número en el cliente existente, quedará marcado como cartera previa y sin derecho al -10% de bienvenida.\n\n¿Continuar?"))return;
        try{await api("vincular_existente",{solicitud_id:requestId,cliente_id:clientId});await gxLoadRegistrationState(true)}
        catch(e){alert("No se pudo vincular el registro.\n\n"+e.message)}
    };

    window.gxDeleteRegistration=async function(requestId,name){
        const ok=confirm(`¿Eliminar el registro de ${name||"esta persona"}?\n\nSe borrará la solicitud y cualquier código de activación NO completado. No se elimina ningún cliente, pago, servicio ni beneficio ya creado. Esta acción permite que la persona vuelva a solicitar su registro desde Ayuda.`);
        if(!ok)return;
        if(!confirm("Confirma por segunda vez: eliminar este registro y permitir un nuevo intento."))return;
        try{await api("eliminar_registro",{solicitud_id:requestId});await gxLoadRegistrationState(true)}catch(e){alert("No se pudo eliminar el registro.\n\n"+e.message)}
    };

    window.gxPrepareActivation=async function(requestId,name){
        const ok=confirm(`Aprobar el registro de ${name||"este cliente"}?\n\nGOXION volverá a validar nombre y teléfono. Si sigue siendo cliente nuevo, preparará su GOXION ID y un código de activación de 6 dígitos válido por 24 horas. Todavía NO se creará su PIN ni se activará el 10%.`);
        if(!ok)return;
        try{
            const r=await api("preparar_activacion",{solicitud_id:requestId});
            await gxLoadRegistrationState(true);
            if(r?.codigo)gxShowActivationDelivery(r);
            else{gxGoActivationTab();alert("Esta solicitud ya tenía una activación preparada. Por seguridad el código anterior no puede volver a mostrarse; puedes regenerarlo desde Activaciones.")}
        }catch(e){
            await gxLoadRegistrationState(true);
            if(e?.payload?.status==="review_required")return alert("GOXION detuvo la aprobación porque encontró una coincidencia al volver a validar. No se generó ningún código.\n\n"+e.message);
            alert("No se pudo preparar la activación.\n\n"+e.message);
        }
    };
    window.gxRegenerateActivation=async function(requestId,name,hasActive){
        const msg=hasActive
          ?`¿Regenerar el código de ${name||"este cliente"}?\n\nEl código actual quedará inválido inmediatamente y comenzará una nueva vigencia de 24 horas.`
          :`¿Generar un nuevo código para ${name||"este cliente"}?\n\nTendrá una vigencia nueva de 24 horas y reiniciará los intentos fallidos.`;
        if(!confirm(msg))return;
        try{
            const r=await api("regenerar_activacion",{solicitud_id:requestId});
            await gxLoadRegistrationState(true);
            gxShowActivationDelivery(r);
        }catch(e){alert("No se pudo generar un nuevo código.\n\n"+e.message)}
    };
    window.gxCancelActivation=async function(requestId,name){
        if(!confirm(`¿Cancelar la activación de ${name||"este cliente"}?\n\nEl código dejará de funcionar y la solicitud quedará descartada.`))return;
        try{await api("cancelar_activacion",{solicitud_id:requestId});await gxLoadRegistrationState(true)}
        catch(e){alert("No se pudo cancelar la activación.\n\n"+e.message)}
    };

    window.gxShowActivationDelivery=function(data){
        window.gxActivationDeliveryData=data||null;
        const modal=document.getElementById("gx-activation-delivery");
        const name=document.getElementById("gx-activation-delivery-name");
        const user=document.getElementById("gx-activation-delivery-user");
        const code=document.getElementById("gx-activation-delivery-code");
        const phone=document.getElementById("gx-activation-delivery-phone");
        const exp=document.getElementById("gx-activation-delivery-exp");
        if(name)name.textContent=data?.nombre||"Cliente";
        if(user)user.textContent=`@${data?.goxion_id||"—"}`;
        if(code)code.textContent=data?.codigo||"••••••";
        if(phone)phone.textContent=fmtPhone(data?.telefono);
        if(exp)exp.textContent=data?.expira_at?fmtDate(data.expira_at):"24 horas";
        modal?.classList.add("show");modal?.setAttribute("aria-hidden","false");
        document.body.style.overflow="hidden";
    };
    window.gxCloseActivationDelivery=function(){
        const modal=document.getElementById("gx-activation-delivery");
        modal?.classList.remove("show");modal?.setAttribute("aria-hidden","true");
        const code=document.getElementById("gx-activation-delivery-code");if(code)code.textContent="••••••";
        window.gxActivationDeliveryData=null;
        if(!document.getElementById("gx-registration-control")?.classList.contains("show"))document.body.style.overflow="";
    };
    window.gxOpenActivationWhatsApp=function(){
        const d=window.gxActivationDeliveryData;
        if(!d?.whatsapp_url)return alert("No hay un mensaje de activación disponible. Regenera el código para crear uno nuevo.");
        window.open(d.whatsapp_url,"_blank","noopener,noreferrer");
    };
    window.gxCopyActivationMessage=async function(){
        const d=window.gxActivationDeliveryData;
        if(!d?.mensaje_whatsapp)return alert("No hay mensaje disponible.");
        try{await navigator.clipboard.writeText(d.mensaje_whatsapp);alert("Mensaje de activación copiado.")}
        catch{alert("No se pudo copiar automáticamente. Abre WhatsApp para usar el mensaje preparado.")}
    };

    window.gxOpenIdentityClient=function(id){
        const key=clientKeyById(id);
        if(!key)return alert("No encontramos este cliente en la vista actual.");
        gxCloseRegistrationControl();
        goAdminTab("tab-clientes");
        setTimeout(()=>gxOpenClientFocus(key),70);
    };

    function originLabel(origin){
        return origin==="sd_streaming"?"Cliente previo SD":origin==="goxion"?"Alta GOXION":origin==="importado"?"Importado":"Manual";
    }
    function injectIdentity(key){
        const c=clientesDict?.[key];if(!c)return;
        const id=String(c._id||c.id||"");
        const ident=clientIdentity(id);
        const body=document.getElementById("gx-focus-body");
        if(!body||!ident)return;
        body.querySelector(".gx-client-identity-card")?.remove();
        const legacy=ident.origen_cliente==="sd_streaming";
        const wrap=document.createElement("section");
        wrap.className="gx-client-identity-card";
        wrap.innerHTML=`
            <details class="gx-identity-compact">
                <summary>
                    <div><strong>Registro e identidad</strong><small>${originLabel(ident.origen_cliente)} · datos internos</small></div>
                    <span class="gx-client-origin-badge ${legacy?"legacy":""}">${ident.usuario_acceso?`@${esc(ident.usuario_acceso)}`:(ident.promo_nuevo_elegible?"Elegible -10%":"Sin beneficio")}</span>
                </summary>
                <div class="gx-client-identity-grid">
                    <label><span>WhatsApp / teléfono</span><input id="gx-identity-phone-${esc(id)}" inputmode="tel" value="${esc(ident.telefono_normalizado||"")}" placeholder="961 000 0000"></label>
                    <label><span>Origen</span><select id="gx-identity-origin-${esc(id)}">
                        <option value="sd_streaming" ${ident.origen_cliente==="sd_streaming"?"selected":""}>SD Streaming / previo</option>
                        <option value="goxion" ${ident.origen_cliente==="goxion"?"selected":""}>GOXION nuevo</option>
                        <option value="manual" ${ident.origen_cliente==="manual"?"selected":""}>Alta manual</option>
                        <option value="importado" ${ident.origen_cliente==="importado"?"selected":""}>Importado</option>
                    </select></label>
                    <label class="gx-identity-check"><span>Beneficio bienvenida</span><span class="gx-identity-eligible"><input id="gx-identity-eligible-${esc(id)}" type="checkbox" ${ident.promo_nuevo_elegible?"checked":""}> Elegible -10%</span></label>
                    <button class="gx-identity-save" type="button" onclick="gxSaveClientIdentity('${esc(key)}','${esc(id)}')">Guardar cambios</button>
                </div>
                ${!ident.telefono_normalizado&&legacy?'<div class="gx-client-identity-warning">Cliente previo sin teléfono: completa este dato para reforzar la detección de registros repetidos.</div>':""}
                ${ident.telefono_normalizado?`<div class="gx-identity-maintenance"><small>Si el número se guardó por error, puedes liberarlo sin borrar al cliente ni su historial comercial.</small><button class="gx-identity-release" type="button" onclick="gxReleaseClientPhone('${esc(key)}','${esc(id)}','${esc(ident.nombre)}')">Liberar teléfono</button></div>`:""}
            </details>
        `;
        const accountTarget=body.querySelector('[data-gx-section="account"] .gx-accordion-content')||body.querySelector('[data-gx-section="account"]')||body;
        accountTarget.appendChild(wrap);
    }

    window.gxReleaseClientPhone=async function(key,id,name){
        if(!confirm(`¿Liberar el teléfono registrado de ${name||"este cliente"}?\n\nLa cuenta, PIN, servicios, pagos y beneficios permanecen intactos. Solo se elimina el teléfono de la identidad comercial.`))return;
        if(!confirm("Confirma por segunda vez. Si además quieres borrar una solicitud anterior, hazlo desde Registros > Historial."))return;
        try{await api("liberar_telefono",{cliente_id:id});await gxLoadRegistrationState(false);injectIdentity(key)}catch(e){alert("No se pudo liberar el teléfono.\n\n"+e.message)}
    };

    window.gxSaveClientIdentity=async function(key,id){
        const phone=document.getElementById(`gx-identity-phone-${id}`)?.value||"";
        const origin=document.getElementById(`gx-identity-origin-${id}`)?.value||"sd_streaming";
        const eligible=Boolean(document.getElementById(`gx-identity-eligible-${id}`)?.checked);
        if(origin==="sd_streaming"&&eligible&&!confirm("Este cliente está marcado como previo de SD Streaming. ¿Seguro que quieres hacerlo elegible para la promoción de cliente nuevo?"))return;
        try{
            await api("actualizar_cliente",{cliente_id:id,telefono:phone,origen_cliente:origin,promo_nuevo_elegible:eligible});
            await gxLoadRegistrationState(false);
            injectIdentity(key);
        }catch(e){alert("No se pudo guardar la identidad.\n\n"+e.message)}
    };

    const prevOpen=window.gxOpenClientFocus;
    if(typeof prevOpen==="function"){
        window.gxOpenClientFocus=function(key,...args){
            const r=prevOpen.call(this,key,...args);
            setTimeout(()=>injectIdentity(key),120);
            return r;
        };
    }

    const prevDecision=window.gxRefreshDecisionCenter;
    if(typeof prevDecision==="function"){
        window.gxRefreshDecisionCenter=async function(...args){
            const r=await prevDecision.apply(this,args);
            await gxLoadRegistrationState(false);
            return r;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>gxLoadRegistrationState(false),1250));
})();