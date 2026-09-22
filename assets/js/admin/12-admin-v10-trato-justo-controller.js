(() => {
    let tj = {key:null, serviceIndex:-1, days:1, record:null};

    function money(v){ return Number(v||0).toFixed(2); }
    function currentService(){
        const c = clientesDict?.[tj.key];
        return c?.servicios?.[tj.serviceIndex] || null;
    }
    function refresh(){
        const s = currentService(); if(!s) return;
        tj.days = Math.max(1, Math.min(10, Number(tj.days||1)));
        const pct = tj.days * 5;
        const amount = Number(s.monto||0) * pct / 100;
        document.getElementById('gx-tj-days').textContent = tj.days;
        document.getElementById('gx-tj-percent').textContent = pct + '%';
        document.getElementById('gx-tj-amount').textContent = '-$' + money(amount);
    }

    window.gxOpenTratoJusto = function(key, serviceIndex){
        const c=clientesDict?.[key], s=c?.servicios?.[serviceIndex];
        if(!c || !s || !(s._id||s.id)) return alert('❌ Este servicio todavía no tiene un ID válido en Supabase.');
        const period = String(c.periodo_pendiente || new Date().toISOString().slice(0,7)).slice(0,7);
        const rec = (c.trato_justo_compensaciones || []).find(x =>
            String(x.cliente_servicio_id||'') === String(s._id||s.id||'') &&
            String(x.periodo||'').slice(0,7) === period &&
            x.activo !== false
        ) || null;
        tj={key,serviceIndex,days:Number(rec?.dias_falla||1),record:rec};
        document.getElementById('gx-tj-service-name').textContent=s.nombre||'Servicio';
        document.getElementById('gx-tj-service-price').textContent='$'+money(s.monto);
        document.getElementById('gx-tj-period').value=period;
        document.getElementById('gx-tj-reason').value=rec?.motivo || 'Falla técnica';
        document.getElementById('gx-tj-delete').style.display=rec?.id?'block':'none';
        document.getElementById('gx-tj-overlay').classList.add('show');
        document.getElementById('gx-tj-overlay').setAttribute('aria-hidden','false');
        document.body.style.overflow='hidden';
        refresh();
    };
    window.gxCloseTratoJusto=function(){
        const el=document.getElementById('gx-tj-overlay');
        if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}
        document.body.style.overflow='';
    };
    window.gxTJStep=function(delta){tj.days=Math.max(1,Math.min(10,tj.days+Number(delta||0)));refresh()};

    window.gxSaveTratoJusto=async function(){
        const c=clientesDict?.[tj.key],s=currentService();
        if(!c||!s||typeof window.GOXION_FINANCIAL_ACTIONS?.saveFairDeal!=='function')return;
        const period=document.getElementById('gx-tj-period').value;
        const reason=document.getElementById('gx-tj-reason').value;
        if(!/^\d{4}-\d{2}$/.test(period)) return alert('❌ Selecciona un periodo válido.');
        try{
            const r=await window.GOXION_FINANCIAL_ACTIONS.saveFairDeal({
                clienteId:c._id,
                clienteServicioId:s._id||s.id,
                periodo:period,
                diasFalla:tj.days,
                motivo:reason
            });
            gxCloseTratoJusto();
            if(typeof gxReloadAdminClient==='function') await gxReloadAdminClient(tj.key);
            alert(`✅ Trato Justo aplicado.\n\n${s.nombre}\n${tj.days} día${tj.days===1?'':'s'} · ${tj.days*5}%\nDescuento: -$${money(r.compensacion?.monto)}`);
        }catch(e){
            console.error(e);alert('❌ No se pudo guardar Trato Justo.\n\n'+(e?.message||e));
        }
    };

    window.gxDeleteTratoJusto=async function(){
        if(!tj.record?.id || typeof window.GOXION_FINANCIAL_ACTIONS?.deleteFairDeal!=='function')return;
        if(!confirm('¿Eliminar esta compensación de Trato Justo?'))return;
        try{
            await window.GOXION_FINANCIAL_ACTIONS.deleteFairDeal({id:tj.record.id});
            gxCloseTratoJusto();
            if(typeof gxReloadAdminClient==='function') await gxReloadAdminClient(tj.key);
            alert('✅ Compensación eliminada.');
        }catch(e){console.error(e);alert('❌ No se pudo eliminar la compensación.\n\n'+(e?.message||e))}
    };
})();