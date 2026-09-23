(() => {
    // Hard guard: if modal/drawer ever disappear from the DOM, explain it instead of failing silently.
    const oldToggle = window.gxToggleNotificationsBase;
    window.gxToggleNotifications = function(force) {
        const drawer = document.getElementById("gx-notification-drawer");
        const overlay = document.getElementById("gx-notification-overlay");
        if(!drawer || !overlay) return alert("No se pudo abrir el Centro de Notificaciones. Recarga esta versión del Admin.");
        return oldToggle ? oldToggle(force) : undefined;
    };

    const oldOpenPayment = window.gxOpenPaymentModalBase;
    window.gxOpenPaymentModal = function(key, monto) {
        const modal = document.getElementById("gx-payment-modal");
        if(!modal) return alert("No se pudo abrir la revisión de pago. Recarga esta versión del Admin.");
        return oldOpenPayment ? oldOpenPayment(key, monto) : undefined;
    };

    window.gxPreparePaymentIncomplete = function() {
        const wrap = document.getElementById("gx-missing-amount-wrap");
        const confirmBtn = document.getElementById("gx-confirm-incomplete");
        const note = document.getElementById("gx-payment-note");
        wrap?.classList.add("show");
        confirmBtn?.classList.add("show");
        if(note && !note.value) note.value = "Tu pago está incompleto. Por favor revisa el monto faltante y vuelve a enviar tu comprobante.";
    };

    // Override prior one-click confirm: now the user can enter missing amount first.
    window.gxPaymentIncomplete = async function() {
        if(!window.paymentCtx && typeof paymentCtx === "undefined") {
            // paymentAction closes over its own context, so call the original only after UI preparation.
        }
        const wrap = document.getElementById("gx-missing-amount-wrap");
        if(!wrap?.classList.contains("show")) return gxPreparePaymentIncomplete();
        if(!confirm("¿Confirmar este pago como INCOMPLETO y registrar el aviso?")) return;

        // Ejecuta la operación administrativa usando el helper público.
        const key = document.getElementById("gx-payment-client-meta")?.dataset?.key;
        // Existing V2 closure doesn't expose context; infer active client from focus name/folio.
        let foundKey = null;
        const name = document.getElementById("gx-payment-client-name")?.textContent || "";
        Object.entries(clientesDict || {}).some(([k,c]) => {
            if(c.nombre === name && c.pago_en_revision) { foundKey = k; return true; }
            return false;
        });
        if(!foundKey) return alert("No pude identificar al cliente en revisión. Cierra y vuelve a abrir la revisión.");

        const c = clientesDict[foundKey];
        const amount = Number(document.getElementById("gx-missing-amount")?.value || 0);
        const msg = document.getElementById("gx-payment-note")?.value.trim() || `Detectamos un pago incompleto${amount>0?` por $${amount}`:""}.`;
        try {
            if(amount>0 && typeof window.GOXION_FINANCIAL_ACTIONS?.registerPartialPayment==='function'){
                await window.GOXION_FINANCIAL_ACTIONS.registerPartialPayment({
                    clienteId:c._id,
                    saldoRestante:amount,
                    notas:msg,
                    periodoEsperado:String(c.periodo_pendiente||c.estado_cuenta?.periodo||"").slice(0,7)
                });
            }else{
                await gxOps("pago_incompleto",{cliente_id:c._id,monto_faltante:amount,mensaje:msg});
            }
            c.estado="pendiente"; c.pago_en_revision=false; c.pago_revision_estado="incompleto"; c.pago_revision_mensaje=msg; c.pago_revision_monto_faltante=amount;
            gxClosePaymentModal(); gxCloseClientFocus(); filtrarClientes(); gxUpdateOperationsSummary();
            alert("⚠️ Pago marcado como incompleto.");
        } catch(e) { alert("No se pudo procesar el pago.\n\n"+e.message); }
    };

    window.gxResetReferral = async function(key) {
        const c = clientesDict?.[key], r = c?.referido_activo;
        if(!c?._id || !r) return;
        if(!confirm(`¿Reiniciar el progreso de ${r.nombre || "este referido"} a 0/3 desde hoy?\n\nSe conservarán el referido y los servicios seleccionados.`)) return;
        try {
            const x = await gxOps("reiniciar_referido_inteligente",{cliente_id:c._id});
            c.referido_activo = {...r,...x.referido, meses:0, meses_override:null, beneficio_reclamado:false, beneficio_reclamado_at:null};
            gxCloseClientFocus();
            if(typeof inicializarPanel === "function") await inicializarPanel();
            setTimeout(()=>{filtrarClientes();gxOpenClientFocus(key)},100);
        } catch(e) { alert("No se pudo reiniciar el referido.\n\n"+e.message); }
    };

    window.gxDeleteReferral = async function(key) {
        const c = clientesDict?.[key], r = c?.referido_activo;
        if(!c?._id || !r) return;
        if(!confirm(`¿Eliminar el referido "${r.nombre || "activo"}"?\n\nEsta acción quitará el registro activo de este cliente.`)) return;
        try {
            await gxOps("eliminar_referido_inteligente",{cliente_id:c._id});
            c.referido_activo = null;
            gxCloseClientFocus();
            if(typeof inicializarPanel === "function") await inicializarPanel();
            setTimeout(()=>filtrarClientes(),100);
        } catch(e) { alert("No se pudo eliminar el referido.\n\n"+e.message); }
    };

    // Date-based smart progress should obey a reset date, not a stale legacy month value.
    window.gxReferralSmartMonths = function(r) {
        if(!r) return 0;
        if(r.meses_override !== null && r.meses_override !== undefined) return Math.min(3,Math.max(0,Number(r.meses_override)||0));
        const start = new Date(r.fecha_inicio || Date.now());
        if(Number.isNaN(start.getTime())) return Math.min(3,Math.max(0,Number(r.meses)||0));
        const now = new Date();
        let months=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth());
        if(now.getDate()<start.getDate()) months--;
        return Math.min(3,Math.max(0,months));
    };
})();