(() => {
    let tjMassDays=1;
    let tjMassSelection=new Set();
    let tjMassInitialized=false;

    const esc=value=>String(value??"")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    const money=v=>Number(v||0).toFixed(2);
    const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();

    function selectedCatalogService(){
        const sel=document.getElementById("gx-tj-bulk-service");
        const idx=Number(sel?.value);
        return Number.isInteger(idx) ? configGlobal?.serviciosGlobales?.[idx] || null : null;
    }

    function currentPeriodValue(){
        const input=document.getElementById("gx-tj-bulk-period");
        return String(input?.value||"").slice(0,7);
    }

    function serviceMatches(s,catalog){
        if(!s||!catalog||s.activo===false)return false;
        const sid=String(s.servicio_id||"");
        const cid=String(catalog._id||catalog.id||"");
        if(sid&&cid)return sid===cid;
        return norm(s.nombre)===norm(catalog.nombre);
    }

    function eligibleClients(){
        const catalog=selectedCatalogService();
        if(!catalog)return [];
        return Object.entries(clientesDict||{}).map(([key,c])=>{
            const assignments=(c.servicios||[]).filter(s=>serviceMatches(s,catalog));
            if(!assignments.length)return null;
            const base=assignments.reduce((sum,s)=>sum+Number(s.monto||0),0);
            const period=currentPeriodValue();
            const activeExisting=(c.trato_justo_compensaciones||[]).filter(comp=>
                comp.activo!==false &&
                String(comp.periodo||"").slice(0,7)===period &&
                assignments.some(s=>String(comp.cliente_servicio_id||"")===String(s._id||s.id||""))
            );
            return {
                key,c,id:String(c._id||c.id||""),
                assignments,base,
                existing:activeExisting,
                predicted:Math.round(base*(tjMassDays*5/100)*100)/100
            };
        }).filter(Boolean).filter(x=>x.id);
    }

    function ensureSelection(){
        const rows=eligibleClients();
        const valid=new Set(rows.map(x=>x.id));
        if(!tjMassInitialized){
            tjMassSelection=new Set(rows.map(x=>x.id));
            tjMassInitialized=true;
        }else{
            tjMassSelection=new Set([...tjMassSelection].filter(id=>valid.has(id)));
        }
    }

    function populateServices(){
        const sel=document.getElementById("gx-tj-bulk-service");
        if(!sel||!configGlobal)return;
        const previous=sel.value;
        const list=Array.isArray(configGlobal.serviciosGlobales)?configGlobal.serviciosGlobales:[];
        sel.innerHTML=list.map((s,i)=>`<option value="${i}">${esc(s.nombre||"Servicio")}</option>`).join("");
        if(previous && list[Number(previous)])sel.value=previous;
    }

    function defaultPeriod(){
        const input=document.getElementById("gx-tj-bulk-period");
        if(!input||input.value)return;
        const counts=new Map();
        Object.values(clientesDict||{}).forEach(c=>{
            const p=String(c?.periodo_pendiente||"").slice(0,7);
            if(/^\d{4}-\d{2}$/.test(p))counts.set(p,(counts.get(p)||0)+1);
        });
        const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
        input.value=top||new Date().toISOString().slice(0,7);
    }

    window.gxTJMassServiceChanged=function(){
        tjMassInitialized=false;
        ensureSelection();
        window.gxRenderTJMass();
    };

    window.gxTJMassPeriodChanged=function(){
        tjMassInitialized=false;
        ensureSelection();
        window.gxRenderTJMass();
    };

    window.gxTJMassStep=function(delta){
        tjMassDays=Math.max(1,Math.min(10,tjMassDays+Number(delta||0)));
        window.gxRenderTJMass();
    };

    window.gxTJMassSelectScope=function(scope){
        const rows=eligibleClients();
        if(scope==="all")tjMassSelection=new Set(rows.map(x=>x.id));
        else if(scope==="without")tjMassSelection=new Set(rows.filter(x=>!x.existing.length).map(x=>x.id));
        else tjMassSelection=new Set();
        tjMassInitialized=true;
        window.gxRenderTJMass();
    };

    window.gxToggleTJMassClient=function(id,checked){
        tjMassInitialized=true;
        if(checked)tjMassSelection.add(String(id));
        else tjMassSelection.delete(String(id));
        window.gxRenderTJMass(false);
    };

    window.gxRenderTJMassList=function(){
        ensureSelection();
        const list=document.getElementById("gx-tj-bulk-client-list");
        if(!list)return;
        const q=norm(document.getElementById("gx-tj-bulk-search")?.value||"");
        const rows=eligibleClients().filter(x=>!q||norm(`${x.c.nombre||""} ${x.c.folio||""}`).includes(q));
        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay clientes elegibles para esta plataforma.</div>';
            return;
        }
        list.innerHTML=rows.map(x=>{
            const selected=tjMassSelection.has(x.id);
            const update=x.existing.length>0;
            const assignmentNote=x.assignments.length>1?`${x.assignments.length} accesos · `:"";
            const current=update
                ? `Actualiza ${Math.max(...x.existing.map(r=>Number(r.dias_falla||0)))}d`
                : "Nueva compensación";
            return `<label class="gx-tj-bulk-row ${selected?"":"excluded"}">
                <input type="checkbox" ${selected?"checked":""} onchange="gxToggleTJMassClient('${esc(x.id)}',this.checked)">
                <div class="gx-tj-bulk-copy">
                    <strong>${esc(x.c.nombre||"Cliente")}</strong>
                    <small>${esc(x.c.folio||"Sin folio")} · ${assignmentNote}$${money(x.base)}/mes</small>
                </div>
                <div class="gx-tj-bulk-amount">
                    <strong>−$${money(x.predicted)}</strong>
                    <small class="${update?"update":""}">${current}</small>
                </div>
            </label>`;
        }).join("");
    };

    window.gxRenderTJMass=function(renderList=true){
        populateServices();
        defaultPeriod();
        ensureSelection();

        const rows=eligibleClients();
        const selected=rows.filter(x=>tjMassSelection.has(x.id));
        const excluded=rows.length-selected.length;
        const updates=selected.filter(x=>x.existing.length>0).length;
        const total=selected.reduce((s,x)=>s+x.predicted,0);
        const catalog=selectedCatalogService();

        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
        set("gx-tj-bulk-days",tjMassDays);
        set("gx-tj-bulk-pct-badge",`${tjMassDays*5}%`);
        set("gx-tj-bulk-eligible",rows.length);
        set("gx-tj-bulk-selected",selected.length);
        set("gx-tj-bulk-excluded",excluded);
        set("gx-tj-bulk-updates",updates);
        set("gx-tj-bulk-total",`$${money(total)}`);

        const summary=document.getElementById("gx-tj-bulk-summary");
        if(summary){
            summary.textContent=catalog
                ? `${catalog.nombre} · ${currentPeriodValue()} · ${tjMassDays} día${tjMassDays===1?"":"s"} · ${selected.length} cliente${selected.length===1?"":"s"}`
                : "Selecciona una plataforma.";
        }
        const btn=document.getElementById("gx-tj-bulk-apply");
        if(btn){
            btn.disabled=selected.length===0||!catalog||!/^\d{4}-\d{2}$/.test(currentPeriodValue());
            btn.textContent=`Aplicar a ${selected.length}`;
        }
        if(renderList)window.gxRenderTJMassList();
    };

    window.gxApplyTJMass=async function(){
        const catalog=selectedCatalogService();
        const period=currentPeriodValue();
        const rows=eligibleClients();
        const selected=rows.filter(x=>tjMassSelection.has(x.id));
        const reason=String(document.getElementById("gx-tj-bulk-reason")?.value||"Falla técnica");
        const updates=selected.filter(x=>x.existing.length>0).length;
        const total=selected.reduce((s,x)=>s+x.predicted,0);

        if(!catalog)return alert("Selecciona una plataforma.");
        if(!/^\d{4}-\d{2}$/.test(period))return alert("Selecciona un periodo válido.");
        if(!selected.length)return alert("Selecciona al menos un cliente.");

        const ok=confirm(
            `Aplicar Trato Justo masivo\n\n`+
            `${catalog.nombre}\n`+
            `Periodo: ${period}\n`+
            `${tjMassDays} día${tjMassDays===1?"":"s"} · ${tjMassDays*5}%\n`+
            `${selected.length} clientes incluidos\n`+
            `${rows.length-selected.length} excluidos\n`+
            `${updates} compensaciones existentes serán actualizadas\n`+
            `Estimado total: -$${money(total)}\n\n`+
            `Motivo: ${reason}\n\n¿Continuar?`
        );
        if(!ok)return;

        const btn=document.getElementById("gx-tj-bulk-apply");
        if(btn){btn.disabled=true;btn.textContent="Aplicando…";}
        try{
            if(typeof window.gxTratoJustoAction!=="function")throw new Error("La conexión de Trato Justo no está disponible.");
            const r=await window.gxTratoJustoAction("guardar_compensaciones_masivas",{
                cliente_ids:selected.map(x=>x.id),
                servicio_id:String(catalog._id||catalog.id||""),
                servicio_nombre:String(catalog.nombre||""),
                periodo:period+"-01",
                dias_falla:tjMassDays,
                motivo:reason
            });

            if(typeof window.gxReloadAdminClient==="function")await window.gxReloadAdminClient();

            // Después de aplicar, no volvemos a seleccionar automáticamente
            // para evitar sobreescribir por accidente en un segundo lote.
            tjMassSelection=new Set();
            tjMassInitialized=true;
            window.gxRenderTJMass();

            alert(
                `✅ Trato Justo aplicado\n\n`+
                `${r.clientes_aplicados||0} clientes procesados\n`+
                `${r.creadas||0} compensaciones nuevas\n`+
                `${r.actualizadas||0} actualizadas\n`+
                `${(r.no_elegibles||[]).length} no elegibles\n`+
                `Total: -$${money(r.total_compensacion)}`
            );
        }catch(e){
            console.error(e);
            alert("❌ No se pudo aplicar Trato Justo masivo.\n\n"+(e?.message||e));
        }finally{
            if(btn)btn.disabled=false;
            window.gxRenderTJMass(false);
        }
    };

    // Acceso desde Más.
    const oldMore=window.gxOpenMoreDestination;
    window.gxOpenMoreDestination=function(dest){
        if(dest==="fairdeal"){
            goAdminTab("tab-ajustes");
            setTimeout(()=>{
                const button=[...document.querySelectorAll(".gx-settings-tabs button")].find(b=>(b.textContent||"").toLowerCase().includes("trato justo"));
                window.gxSettingsView?.("fairdeal",button);
                tjMassInitialized=false;
                window.gxRenderTJMass();
            },40);
            return;
        }
        return typeof oldMore==="function"?oldMore.call(this,dest):undefined;
    };

    // Abrir la pestaña directamente también prepara la herramienta.
    const oldSettings=window.gxSettingsView;
    if(typeof oldSettings==="function"){
        window.gxSettingsView=function(name,btn){
            const r=oldSettings.call(this,name,btn);
            if(name==="fairdeal"){
                setTimeout(()=>{
                    tjMassInitialized=false;
                    window.gxRenderTJMass();
                },20);
            }
            return r;
        };
    }

    // Después de recargar datos, refresca catálogo/elegibles si la herramienta está visible.
    const oldReload=window.gxReloadAdminClient;
    if(typeof oldReload==="function"){
        window.gxReloadAdminClient=async function(...args){
            const r=await oldReload.apply(this,args);
            setTimeout(()=>{
                if(document.querySelector('[data-settings-view="fairdeal"].active')){
                    window.gxRenderTJMass();
                }
            },80);
            return r;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(()=>{
            populateServices();
            defaultPeriod();
            window.gxRenderTJMass();
        },900);
    });

})();