(() => {
    function gxRefObj(key){ return clientesDict?.[key]?.referido_activo || null; }
    function gxActiveServiceNames(client){
        return [...new Set((client?.servicios || [])
            .filter(s => s?.activo !== false)
            .map(s => String(s?.nombre || "").trim())
            .filter(Boolean))];
    }
    function gxFindLinkedKey(referrerKey, r){
        if(!r?.nombre) return "";
        const wanted=String(r.nombre).trim().toLowerCase();
        return Object.entries(clientesDict || {}).find(([k,c]) =>
            k !== referrerKey && String(c?.nombre || "").trim().toLowerCase() === wanted
        )?.[0] || "";
    }
    function gxEffectiveMonthsV6(r){
        if(!r) return 0;
        if(r.meses_override !== null && r.meses_override !== undefined) return Math.max(0,Math.min(3,Number(r.meses_override)||0));
        if(r.meses_efectivos !== undefined && r.meses_efectivos !== null) return Math.max(0,Math.min(3,Number(r.meses_efectivos)||0));
        if(typeof gxReferralSmartMonths === "function") return gxReferralSmartMonths(r);
        return Math.max(0,Math.min(3,Number(r.meses)||0));
    }
    function gxUpdateLinkedReferralUI(key){
        const r=gxRefObj(key); if(!r)return;
        const selectedKey=document.getElementById(`gx-ref-client-select-${key}`)?.value || gxFindLinkedKey(key,r);
        const target=selectedKey ? clientesDict?.[selectedKey] : null;
        const services=target ? gxActiveServiceNames(target) : (Array.isArray(r.servicios)?r.servicios:[]);
        const months=gxEffectiveMonthsV6(r);

        const head=document.getElementById(`gx-ref-head-${key}`);
        const month=document.getElementById(`gx-ref-month-${key}`);
        const count=document.getElementById(`gx-ref-service-summary-${key}`);
        const chips=document.getElementById(`gx-ref-service-chips-${key}`);
        const status=document.getElementById(`gx-ref-status-${key}`);
        const auto=document.getElementById(`gx-ref-auto-${key}`);

        if(head) head.textContent=`${months}/3 meses · ${services.length} servicio${services.length===1?'':'s'}`;
        if(month) month.textContent=`${months}/3`;
        if(count) count.textContent=String(services.length);
        if(auto) auto.classList.toggle("active",r.meses_override===null||r.meses_override===undefined);

        if(chips){
            chips.innerHTML=services.length
                ? services.map(name=>`<span>✓ ${name}</span>`).join("")
                : `<div class="gx-ref-detected-empty">${target?'El cliente seleccionado no tiene servicios activos.':'Selecciona un cliente para detectar sus servicios activos.'}</div>`;
        }

        if(status){
            status.classList.toggle("ok",services.length>=2);
            status.classList.toggle("warn",services.length<2);
            if(r.beneficio_reclamado) status.textContent="💝 Beneficio ya reclamado";
            else if(services.length<2) status.textContent=`⚠️ Falta ${2-services.length} servicio${2-services.length===1?'':'s'} para cumplir el requisito`;
            else if(months>=3) status.textContent="🎁 3/3 · Beneficio listo para reclamar";
            else status.textContent=`✓ Progreso ${r.meses_override == null ? 'automático' : 'manual'}: ${months}/3 meses`;
        }
    }

    window.gxSelectReferralClient = async function(referrerKey,targetKey){
        const referrer=clientesDict?.[referrerKey];
        const target=clientesDict?.[targetKey];
        const r=gxRefObj(referrerKey);
        if(!referrer?._id || !r) return;
        if(!targetKey || !target) return;

        const previous={
            nombre:r.nombre,
            servicios:[...(r.servicios||[])],
            plataformas:r.plataformas,
            fecha_inicio:r.fecha_inicio
        };
        const services=gxActiveServiceNames(target);

        r.nombre=target.nombre||"";
        r.servicios=services;
        r.plataformas=services.length;
        r.fecha_inicio=r.fecha_inicio||new Date().toISOString().slice(0,10);
        gxUpdateLinkedReferralUI(referrerKey);

        try{
            const x=await gxOps("guardar_referido_inteligente",{
                cliente_id:referrer._id,
                nombre:r.nombre,
                servicios:r.servicios,
                fecha_inicio:r.fecha_inicio
            });
            Object.assign(r,x.referido||{});
            r.servicios=Array.isArray(x.referido?.servicios)?x.referido.servicios:services;
            r.plataformas=r.servicios.length;
            gxUpdateLinkedReferralUI(referrerKey);

            // Refrescamos la ficha para mostrar folio/estado del cliente vinculado.
            if(typeof gxCloseClientFocus==="function") gxCloseClientFocus();
            if(typeof filtrarClientes==="function") filtrarClientes();
            setTimeout(()=>{ if(typeof gxOpenClientFocus==="function") gxOpenClientFocus(referrerKey); },90);
        }catch(e){
            r.nombre=previous.nombre;
            r.servicios=previous.servicios;
            r.plataformas=previous.plataformas;
            r.fecha_inicio=previous.fecha_inicio;
            gxUpdateLinkedReferralUI(referrerKey);
            alert("No se pudo vincular el cliente referido.\n\n"+(e?.message||e));
        }
    };

    window.gxResyncReferralClient = function(referrerKey){
        const select=document.getElementById(`gx-ref-client-select-${referrerKey}`);
        const targetKey=select?.value || gxFindLinkedKey(referrerKey,gxRefObj(referrerKey));
        if(!targetKey) return alert("Selecciona primero el cliente referido.");
        return window.gxSelectReferralClient(referrerKey,targetKey);
    };

    // El switch de Referido ahora crea un registro vacío e inteligente.
    window.toggleReferido = async function(key,isChecked){
        const c=clientesDict?.[key];
        if(!c?._id) return;
        try{
            if(isChecked){
                const today=new Date().toISOString().slice(0,10);
                await gxOps("guardar_referido_inteligente",{
                    cliente_id:c._id,
                    nombre:"",
                    servicios:[],
                    fecha_inicio:today
                });
            }else{
                await gxOps("eliminar_referido_inteligente",{cliente_id:c._id});
            }

            if(typeof gxCloseClientFocus==="function") gxCloseClientFocus();
            if(typeof inicializarPanel==="function") await inicializarPanel();
            setTimeout(()=>{
                if(typeof filtrarClientes==="function") filtrarClientes();
                if(isChecked && typeof gxOpenClientFocus==="function") gxOpenClientFocus(key);
            },100);
        }catch(e){
            alert(`No se pudo ${isChecked?'activar':'desactivar'} el referido.\n\n${e?.message||e}`);
            if(typeof filtrarClientes==="function") filtrarClientes();
        }
    };

    // Los antiguos checkboxes manuales quedan sin uso, pero mantenemos las funciones
    // para compatibilidad con cualquier ficha abierta antes de actualizar.
    window.gxRefreshReferralLinkedUI = gxUpdateLinkedReferralUI;
})();