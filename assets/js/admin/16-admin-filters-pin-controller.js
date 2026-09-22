(() => {
    const sessionPins = new Map();
    let lastWindowY = window.scrollY || 0;

    const statusLabels = {
        all:"Todos",
        revision:"Revisión",
        pendiente:"Pendientes",
        pagado:"Pagados",
        suspendido:"Suspendidos"
    };
    const sortLabels = {
        priority:"Prioridad",
        date:"Día de cobro",
        name:"Nombre A–Z",
        loyalty:"Lealtad"
    };

    function clientByKey(key){
        return typeof clientesDict!=="undefined" ? clientesDict?.[key] : null;
    }

    window.gxUpdateFilterSummary = function(){
        const status = typeof currentStatusFilter!=="undefined" ? currentStatusFilter : "all";
        const sort = document.getElementById("sort-by")?.value || "priority";
        const summary = document.getElementById("gx-filter-summary");
        const count = document.getElementById("gx-filter-active-count");
        const active = (status!=="all"?1:0) + (sort!=="priority"?1:0);

        if(summary) summary.textContent = `${statusLabels[status]||"Todos"} · ${sortLabels[sort]||"Prioridad"}`;
        if(count){
            count.textContent=String(active);
            count.hidden=active===0;
        }
    };

    window.gxToggleClientFilters = function(force){
        const panel=document.getElementById("gx-client-command-panel");
        const toggle=document.getElementById("gx-filter-toggle");
        const drawer=document.getElementById("gx-filter-drawer");
        if(!panel||!toggle||!drawer)return;

        const open = typeof force==="boolean" ? force : !panel.classList.contains("filters-open");
        panel.classList.toggle("filters-open",open);
        toggle.setAttribute("aria-expanded",open?"true":"false");
        drawer.setAttribute("aria-hidden",open?"false":"true");
    };

    const oldSetStatus = window.setStatusFilter || (typeof setStatusFilter==="function" ? setStatusFilter : null);
    if(typeof oldSetStatus==="function"){
        window.setStatusFilter=function(status,btn){
            const result=oldSetStatus.call(this,status,btn);
            setTimeout(window.gxUpdateFilterSummary,0);
            return result;
        };
        try{ setStatusFilter=window.setStatusFilter; }catch{}
    }

    const oldClear = window.gxClearClientFilters;
    if(typeof oldClear==="function"){
        window.gxClearClientFilters=function(...args){
            const result=oldClear.apply(this,args);
            setTimeout(()=>{
                window.gxUpdateFilterSummary();
                window.gxToggleClientFilters(false);
            },0);
            return result;
        };
    }

    // Si el bloque está desplegado y empiezas a navegar por clientes,
    // vuelve automáticamente a su formato compacto.
    window.addEventListener("scroll",()=>{
        const y=window.scrollY||0;
        if(y>lastWindowY+18 && document.getElementById("gx-client-command-panel")?.classList.contains("filters-open")){
            window.gxToggleClientFilters(false);
        }
        lastWindowY=y;
    },{passive:true});

    function renderSessionPin(key){
        const value=sessionPins.get(String(key));
        const reveal=document.getElementById(`gx-pin-reveal-${key}`);
        const output=document.getElementById(`gx-pin-value-${key}`);
        if(!reveal||!output)return;
        if(value){
            output.textContent=value;
            reveal.hidden=false;
        }else{
            output.textContent="••••";
            reveal.hidden=true;
        }
    }

    window.gxOpenPinEditor=function(key){
        const editor=document.getElementById(`gx-pin-editor-${key}`);
        const input=document.getElementById(`gx-pin-input-${key}`);
        if(!editor||!input)return;
        editor.hidden=false;
        input.value="";
        setTimeout(()=>input.focus(),20);
    };

    window.gxCancelPinEditor=function(key){
        const editor=document.getElementById(`gx-pin-editor-${key}`);
        const input=document.getElementById(`gx-pin-input-${key}`);
        if(editor)editor.hidden=true;
        if(input)input.value="";
    };

    window.gxSaveUniquePin=async function(key){
        const c=clientByKey(key);
        const input=document.getElementById(`gx-pin-input-${key}`);
        const pin=String(input?.value||"").trim();
        if(!c?._id)return alert("Cliente sin ID de Supabase.");
        if(!/^\d{4}$/.test(pin))return alert("El PIN debe tener exactamente 4 dígitos.");

        try{
            const r=await window.gxOps("cambiar_pin_unico",{cliente_id:c._id,pin});
            sessionPins.set(String(key),String(r.pin||pin));
            window.gxCancelPinEditor(key);
            renderSessionPin(key);
        }catch(e){
            alert(e?.message||"No se pudo actualizar el PIN.");
        }
    };

    window.gxGenerateUniquePin=async function(key){
        const c=clientByKey(key);
        if(!c?._id)return alert("Cliente sin ID de Supabase.");
        if(!confirm("Se reemplazará el PIN actual por uno nuevo y único. ¿Continuar?"))return;

        try{
            const r=await window.gxOps("generar_pin_unico",{cliente_id:c._id});
            const pin=String(r.pin||"");
            if(!/^\d{4}$/.test(pin))throw new Error("El servidor no devolvió un PIN válido.");
            sessionPins.set(String(key),pin);
            window.gxCancelPinEditor(key);
            renderSessionPin(key);
        }catch(e){
            alert(e?.message||"No se pudo generar el PIN.");
        }
    };

    async function copyText(text){
        if(navigator.clipboard?.writeText){
            await navigator.clipboard.writeText(text);
            return;
        }
        const ta=document.createElement("textarea");
        ta.value=text;
        ta.style.position="fixed";
        ta.style.opacity="0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    }

    window.gxCopyPin=async function(key){
        const pin=sessionPins.get(String(key));
        if(!pin)return alert("Genera o cambia el PIN primero.");
        try{
            await copyText(pin);
        }catch{
            alert(`PIN: ${pin}`);
        }
    };

    window.gxCopyFullAccess=async function(key){
        const c=clientByKey(key);
        const pin=sessionPins.get(String(key));
        if(!c||!pin)return alert("Genera o cambia el PIN primero.");
        const parts=[
            `GOXION · Acceso`,
            `Nombre: ${c.nombre||""}`,
            c.usuario_acceso ? `Usuario: ${c.usuario_acceso}` : "",
            `PIN: ${pin}`
        ].filter(Boolean).join("\n");
        try{
            await copyText(parts);
        }catch{
            alert(parts);
        }
    };

    window.gxHideSessionPin=function(key){
        sessionPins.delete(String(key));
        renderSessionPin(key);
    };

    // Si vuelves a abrir la ficha durante la misma sesión,
    // el PIN recién cambiado sigue disponible para copiarlo.
    const oldOpenClient=window.gxOpenClientFocus;
    if(typeof oldOpenClient==="function"){
        window.gxOpenClientFocus=function(key,...args){
            const result=oldOpenClient.call(this,key,...args);
            setTimeout(()=>renderSessionPin(key),35);
            return result;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(window.gxUpdateFilterSummary,700);
    });

})();