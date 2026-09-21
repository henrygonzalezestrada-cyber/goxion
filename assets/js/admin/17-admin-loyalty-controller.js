(() => {
    let loyaltySelection = new Set();
    let loyaltyInitialized = false;

    const esc = value => String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

    function clients(){
        return Object.entries(typeof clientesDict!=="undefined" ? (clientesDict||{}) : {})
            .map(([key,c])=>({key,c,id:String(c?._id||c?.id||"")}))
            .filter(x=>x.id);
    }

    function loyaltyTarget(){
        const select=document.getElementById("gx-loyalty-target");
        if(select?.value==="custom"){
            return Math.max(0,Math.min(99,Math.trunc(Number(document.getElementById("gx-loyalty-custom")?.value||0))));
        }
        return Math.max(0,Math.min(99,Math.trunc(Number(select?.value||9))));
    }

    function ensureLoyaltySelection(){
        const rows=clients();
        if(!loyaltyInitialized){
            loyaltySelection=new Set(rows.map(x=>x.id));
            loyaltyInitialized=true;
        }else{
            const valid=new Set(rows.map(x=>x.id));
            loyaltySelection=new Set([...loyaltySelection].filter(id=>valid.has(id)));
        }
    }

    window.gxLoyaltyTargetChanged=function(){
        const custom=document.getElementById("gx-loyalty-custom-wrap");
        const select=document.getElementById("gx-loyalty-target");
        if(custom) custom.hidden=select?.value!=="custom";
        window.gxRenderLoyaltyTool();
    };

    window.gxLoyaltySelectScope=function(scope){
        const rows=clients();
        if(scope==="all") loyaltySelection=new Set(rows.map(x=>x.id));
        else if(scope==="active") loyaltySelection=new Set(rows.filter(x=>x.c?.estado!=="suspendido").map(x=>x.id));
        else loyaltySelection=new Set();
        loyaltyInitialized=true;
        window.gxRenderLoyaltyTool();
    };

    window.gxToggleLoyaltyClient=function(id,checked){
        loyaltyInitialized=true;
        if(checked) loyaltySelection.add(String(id));
        else loyaltySelection.delete(String(id));
        window.gxRenderLoyaltyTool(false);
    };

    window.gxRenderLoyaltyClientList=function(){
        ensureLoyaltySelection();
        const list=document.getElementById("gx-loyalty-client-list");
        if(!list)return;

        const q=String(document.getElementById("gx-loyalty-search")?.value||"").trim().toLowerCase();
        const target=loyaltyTarget();
        const rows=clients().filter(x=>{
            if(!q)return true;
            return `${x.c?.nombre||""} ${x.c?.folio||""}`.toLowerCase().includes(q);
        });

        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay clientes que coincidan.</div>';
            return;
        }

        list.innerHTML=rows.map(({c,id})=>{
            const selected=loyaltySelection.has(id);
            const current=Number(c?.pagos_puntuales||0);
            const atTarget=current===target;
            return `<label class="gx-loyalty-client-row ${selected?"":"excluded"} ${atTarget?"at-target":""}">
                <input type="checkbox" ${selected?"checked":""} onchange="gxToggleLoyaltyClient('${esc(id)}',this.checked)">
                <div class="gx-loyalty-client-copy">
                    <strong>${esc(c?.nombre||"Cliente")}</strong>
                    <small>${esc(c?.folio||"Sin folio")} · ${c?.estado==="suspendido"?"Suspendido":"Activo"}</small>
                </div>
                <em>${atTarget?`${target} pagos ✓`:`${current} → ${target}`}</em>
            </label>`;
        }).join("");
    };

    window.gxRenderLoyaltyTool=function(renderList=true){
        ensureLoyaltySelection();
        const rows=clients();
        const target=loyaltyTarget();
        const selectedRows=rows.filter(x=>loyaltySelection.has(x.id));
        const excluded=rows.length-selectedRows.length;
        const changing=selectedRows.filter(x=>Number(x.c?.pagos_puntuales||0)!==target).length;
        const already=selectedRows.length-changing;

        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
        set("gx-loyalty-selected",selectedRows.length);
        set("gx-loyalty-excluded",excluded);
        set("gx-loyalty-changing",changing);
        set("gx-loyalty-already",already);

        const preview=document.getElementById("gx-loyalty-preview-text");
        if(preview){
            preview.textContent=selectedRows.length
                ? `${selectedRows.length} incluidos · ${excluded} excluidos · ${changing} cambiarán`
                : "Selecciona al menos un cliente.";
        }
        const btn=document.getElementById("gx-loyalty-apply");
        if(btn){
            btn.disabled=selectedRows.length===0;
            btn.textContent=`Aplicar a ${selectedRows.length}`;
        }

        if(renderList) window.gxRenderLoyaltyClientList();
    };

    window.gxApplyBulkLoyalty=async function(){
        ensureLoyaltySelection();
        const rows=clients();
        const selected=rows.filter(x=>loyaltySelection.has(x.id));
        const target=loyaltyTarget();
        const reason=String(document.getElementById("gx-loyalty-reason")?.value||"Ajuste masivo de lealtad").trim()||"Ajuste masivo de lealtad";
        const changing=selected.filter(x=>Number(x.c?.pagos_puntuales||0)!==target).length;
        const already=selected.length-changing;

        if(!selected.length)return alert("Selecciona al menos un cliente.");
        const ok=confirm(
            `Aplicar lealtad masiva\n\n`+
            `${selected.length} incluidos\n`+
            `${rows.length-selected.length} excluidos\n`+
            `${changing} cambiarán\n`+
            `${already} ya están en ${target}\n\n`+
            `Valor final: ${target} pagos puntuales\n`+
            `Motivo: ${reason}\n\n¿Continuar?`
        );
        if(!ok)return;

        const btn=document.getElementById("gx-loyalty-apply");
        const previous=btn?.textContent||"Aplicar";
        if(btn){btn.disabled=true;btn.textContent="Aplicando…";}

        try{
            if(typeof window.gxOps!=="function")throw new Error("La conexión de operaciones no está disponible.");
            const r=await window.gxOps("establecer_lealtad_masiva",{
                cliente_ids:selected.map(x=>x.id),
                valor:target,
                motivo:reason
            });

            selected.forEach(({c})=>{c.pagos_puntuales=target;});
            if(typeof window.gxReloadAdminClient==="function"){
                await window.gxReloadAdminClient();
            }else if(typeof filtrarClientes==="function"){
                filtrarClientes();
            }

            loyaltyInitialized=false;
            ensureLoyaltySelection();
            window.gxRenderLoyaltyTool();

            alert(
                `✅ Lealtad actualizada\n\n`+
                `${Number(r.actualizados||0)} clientes cambiaron\n`+
                `${Number(r.sin_cambio||0)} ya estaban en el valor seleccionado\n`+
                `Valor final: ${target} pagos`
            );
        }catch(e){
            console.error(e);
            alert("No se pudo aplicar la lealtad masiva.\n\n"+(e?.message||e));
        }finally{
            if(btn){btn.disabled=false;btn.textContent=previous;}
            window.gxRenderLoyaltyTool(false);
        }
    };

    // Acceso desde Más.
    const previousMore=window.gxOpenMoreDestination;
    window.gxOpenMoreDestination=function(dest){
        if(dest==="loyalty"){
            goAdminTab("tab-ajustes");
            setTimeout(()=>{
                const button=[...document.querySelectorAll(".gx-settings-tabs button")].find(b=>(b.textContent||"").toLowerCase().includes("lealtad"));
                window.gxSettingsView?.("loyalty",button);
                loyaltyInitialized=false;
                window.gxRenderLoyaltyTool();
            },40);
            return;
        }
        return typeof previousMore==="function" ? previousMore.call(this,dest) : undefined;
    };

    // Beta 19.3: identidad y ciclo se leen en una sola línea compacta.
    function polishFocus(key){
        const c=(typeof clientesDict!=="undefined")?clientesDict?.[key]:null;
        const summary=document.getElementById("gx-focus-summary");
        const meta=document.getElementById("gx-focus-meta");
        if(!c)return;
        if(summary){summary.innerHTML="";summary.hidden=true;}
        const ec=c.estado_cuenta||{};
        const total=Number(ec.total_actual ?? (c.servicios||[]).reduce((sum,x)=>sum+Number(x?.monto||0),0));
        const timing=typeof gxPaymentTiming==="function"?gxPaymentTiming(c):{type:"none",days:0};
        const state=c.estado==="suspendido"?"Suspendido":ec.estado_label||(c.pago_en_revision?"En revisión":timing.type==="overdue"?"Vencido":c.estado==="pagado"?"Pagado":"Pendiente");
        const period=typeof gxPeriodLabel==="function"?gxPeriodLabel(ec.periodo||c.periodo_pendiente):String(ec.periodo||c.periodo_pendiente||"").slice(0,7);
        if(meta) meta.textContent=`${state} · $${total.toFixed(2)} · ${period||`día ${c.dia_pago||15}`}`;
    }

    const previousOpen=window.gxOpenClientFocus;
    if(typeof previousOpen==="function"){
        window.gxOpenClientFocus=function(key,...args){
            const result=previousOpen.call(this,key,...args);
            setTimeout(()=>polishFocus(key),60);
            return result;
        };
    }

    // Si la propia pestaña Lealtad se abre desde desktop, prepara selección.
    const previousSettingsView=window.gxSettingsView;
    if(typeof previousSettingsView==="function"){
        window.gxSettingsView=function(name,btn){
            const result=previousSettingsView.call(this,name,btn);
            if(name==="loyalty"){
                setTimeout(()=>{
                    loyaltyInitialized=false;
                    window.gxRenderLoyaltyTool();
                },20);
            }
            return result;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(()=>{
            if(document.querySelector('[data-settings-view="loyalty"]')) window.gxRenderLoyaltyTool();
        },850);
    });

})();