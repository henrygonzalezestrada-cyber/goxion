(() => {
    window.gxSetBillingCycleMode = async function(key, manual){
        const c = clientesDict?.[key];
        if(!c?._id || typeof gxPeriodAction !== 'function') return;
        if(manual && !confirm('¿Activar modo MANUAL para este cliente?\n\nEl corte mensual automático dejará de cambiar su estado. Úsalo para pruebas, acuerdos o excepciones.')) return;
        try{
            const r = await gxPeriodAction('guardar_ciclo_manual',{
                cliente_id:c._id,
                ciclo_cobro_manual:Boolean(manual)
            });
            c.ciclo_cobro_manual = Boolean(r.ciclo_cobro_manual);
            if(r.estado) c.estado = r.estado;
            if(r.estado_guardado) c.estado_guardado = r.estado_guardado;
            if(typeof gxReloadAdminClient==='function') await gxReloadAdminClient(key);
            if(manual) alert('🧪 Ciclo manual activado. Esta cuenta queda protegida del corte mensual automático.');
            else alert('✅ Ciclo automático activado. El sistema volverá a determinar el estado según el periodo pendiente.');
        }catch(e){
            console.error(e);
            alert('❌ No se pudo cambiar el ciclo de cobro.\n\n'+(e?.message||e));
        }
    };
})();