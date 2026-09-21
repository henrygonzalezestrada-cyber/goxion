(() => {
    function refObj(key){ return clientesDict?.[key]?.referido_activo || null; }
    function effectiveMonths(r){
        if(!r) return 0;
        if(r.meses_override !== null && r.meses_override !== undefined) return Math.max(0,Math.min(3,Number(r.meses_override)||0));
        if(r.meses_efectivos !== undefined && r.meses_efectivos !== null) return Math.max(0,Math.min(3,Number(r.meses_efectivos)||0));
        if(typeof gxReferralSmartMonths === "function") return gxReferralSmartMonths(r);
        return Math.max(0,Math.min(3,Number(r.meses)||0));
    }
    function updateRefUI(key){
        const r=refObj(key); if(!r) return;
        const services=Array.isArray(r.servicios)?r.servicios:[];
        const months=effectiveMonths(r);
        const head=document.getElementById(`gx-ref-head-${key}`);
        const month=document.getElementById(`gx-ref-month-${key}`);
        const sum=document.getElementById(`gx-ref-service-summary-${key}`);
        const auto=document.getElementById(`gx-ref-auto-${key}`);
        const status=document.getElementById(`gx-ref-status-${key}`);
        if(head) head.textContent=`${months}/3 meses · ${services.length} servicio${services.length===1?'':'s'}`;
        if(month) month.textContent=`${months}/3`;
        if(sum) sum.textContent=services.length?`${services.length} seleccionado${services.length===1?'':'s'}`:"Seleccionar servicios";
        if(auto) auto.classList.toggle("active", r.meses_override === null || r.meses_override === undefined);
        if(status){
            status.classList.toggle("ok",services.length>=2); status.classList.toggle("warn",services.length<2);
            if(r.beneficio_reclamado) status.textContent="💝 Beneficio ya reclamado";
            else if(services.length<2) status.textContent=`⚠️ Falta ${2-services.length} servicio${2-services.length===1?'':'s'} para cumplir el requisito`;
            else if(months>=3) status.textContent="🎁 3/3 · Beneficio listo para reclamar";
            else status.textContent=`✓ Progreso ${r.meses_override == null ? 'automático' : 'manual'}: ${months}/3 meses`;
        }
    }

    window.gxToggleReferralService = async function(key,name,checked){
        const r=refObj(key); if(!r) return;
        const before=[...(r.servicios||[])];
        const set=new Set(before); checked?set.add(name):set.delete(name); r.servicios=[...set];
        r.plataformas=r.servicios.length;
        updateRefUI(key);
        try{
            const c=clientesDict[key];
            const x=await gxOps("guardar_referido_inteligente",{
                cliente_id:c._id,nombre:r.nombre||"",servicios:r.servicios,fecha_inicio:r.fecha_inicio||new Date().toISOString().slice(0,10)
            });
            Object.assign(r,x.referido||{});
            if(x.referido?.meses_override !== undefined) r.meses_override=x.referido.meses_override;
            updateRefUI(key);
        }catch(e){
            r.servicios=before; r.plataformas=before.length; updateRefUI(key);
            alert("No se pudo guardar la selección de servicios.\n\n"+e.message);
        }
    };

    window.gxToggleReferralServiceIndex = function(key,index,checked){
        const options=(configGlobal?.serviciosGlobales||[]).map(s=>s.nombre).filter(Boolean);
        const name=options[Number(index)];
        if(!name) return alert("No pude identificar el servicio seleccionado. Recarga el Admin e inténtalo nuevamente.");
        return window.gxToggleReferralService(key,name,checked);
    };

    const saveRefBase=window.gxSaveReferralSmart;
    window.gxSaveReferralSmart = async function(key,patch={}){
        const r=refObj(key); if(!r) return;
        Object.assign(r,patch); updateRefUI(key);
        try{
            const c=clientesDict[key];
            const x=await gxOps("guardar_referido_inteligente",{
                cliente_id:c._id,nombre:r.nombre||"",servicios:r.servicios||[],fecha_inicio:r.fecha_inicio||new Date().toISOString().slice(0,10)
            });
            Object.assign(r,x.referido||{});
            if(patch.fecha_inicio !== undefined && r.meses_override == null) r.meses_efectivos = 0;
            updateRefUI(key);
        }catch(e){ alert("No se pudo guardar el referido.\n\n"+e.message); }
    };

    window.gxAdjustReferralMonth = async function(key,delta){
        const c=clientesDict?.[key],r=refObj(key); if(!c?._id||!r)return;
        try{
            const x=await gxOps("ajustar_meses_referido",{cliente_id:c._id,delta});
            Object.assign(r,x.referido||{}); r.meses_override=x.meses_efectivos; r.meses_efectivos=x.meses_efectivos;
            updateRefUI(key);
        }catch(e){ alert("No se pudo ajustar el progreso.\n\n"+e.message); }
    };

    window.gxReferralAutoMode = async function(key){
        const c=clientesDict?.[key],r=refObj(key); if(!c?._id||!r)return;
        try{
            const x=await gxOps("modo_automatico_referido",{cliente_id:c._id});
            Object.assign(r,x.referido||{}); r.meses_override=null; r.meses_efectivos=x.meses_efectivos;
            updateRefUI(key);
        }catch(e){ alert("No se pudo volver al modo automático.\n\n"+e.message); }
    };

    // Keep focus summary current after any render.
    const openBase=window.gxOpenClientFocusBase;
    window.gxOpenClientFocus=function(key){
        const r=openBase?.(key);
        setTimeout(()=>updateRefUI(key),40);
        return r;
    };
})();