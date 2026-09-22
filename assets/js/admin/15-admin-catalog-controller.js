(() => {
    let gxCatalogSelectedIndex = null;

    const esc = value => String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

    function isMobile(){
        return window.matchMedia("(max-width:840px)").matches;
    }

    function catalogStock(index){
        const row=document.querySelectorAll("#global-services-container tr")[index];
        const badge=row?.querySelector(".inv-badge");
        const raw=(badge?.textContent||"").replace(/[^\d-]/g,"");
        const value=Number(raw||0);
        return {
            value:Number.isFinite(value)?Math.max(0,value):0,
            title:badge?.title||"",
            state:badge?.classList.contains("inv-full")?"full":
                  badge?.classList.contains("inv-warn")?"warn":"ok"
        };
    }

    function renderCatalogList(){
        const list=document.getElementById("gx-catalog-mobile-list");
        const editor=document.getElementById("gx-catalog-mobile-editor");
        const count=document.getElementById("gx-catalog-mobile-count");
        if(!list || !editor || typeof configGlobal==="undefined") return;

        const services=Array.isArray(configGlobal.serviciosGlobales)?configGlobal.serviciosGlobales:[];
        if(count) count.textContent=`${services.length} servicio${services.length===1?"":"s"}`;

        if(gxCatalogSelectedIndex!==null && !services[gxCatalogSelectedIndex]){
            gxCatalogSelectedIndex=null;
        }

        if(gxCatalogSelectedIndex!==null){
            list.style.display="none";
            renderCatalogEditor(gxCatalogSelectedIndex);
            return;
        }

        editor.hidden=true;
        editor.innerHTML="";
        list.style.display="grid";

        if(!services.length){
            list.innerHTML='<div class="gx-empty-inline">Aún no hay servicios en el catálogo.</div>';
            return;
        }

        list.innerHTML=services.map((srv,index)=>{
            const stock=catalogStock(index);
            return `<button type="button" class="gx-catalog-platform-row" onclick="gxOpenMobileCatalog(${index})">
                <div class="gx-catalog-platform-copy">
                    <strong>${esc(srv.nombre||"Servicio")}</strong>
                    <small>Venta $${Number(srv.precio||0).toFixed(0)} · Costo $${Number(srv.costo||0).toFixed(0)}</small>
                </div>
                <span class="gx-catalog-platform-stock ${stock.state}">${stock.value}</span>
                <em>›</em>
            </button>`;
        }).join("");
    }

    function renderCatalogEditor(index){
        const list=document.getElementById("gx-catalog-mobile-list");
        const editor=document.getElementById("gx-catalog-mobile-editor");
        const srv=configGlobal?.serviciosGlobales?.[index];
        if(!editor || !srv) return;

        const stock=catalogStock(index);
        const cuentas=Number(srv.cuentas||1);
        const limite=Number(srv.limite||0);
        const fixed=srv.stock_manual===undefined || srv.stock_manual===null ? "" : srv.stock_manual;

        if(list) list.style.display="none";
        editor.hidden=false;
        editor.innerHTML=`<div class="gx-catalog-editor-head">
            <button type="button" class="gx-catalog-editor-back" onclick="gxCloseMobileCatalog()">‹</button>
            <div class="gx-catalog-editor-title">
                <strong>${esc(srv.nombre||"Servicio")}</strong>
                <small>${cuentas} cuenta${cuentas===1?"":"s"} · límite ${limite} por cuenta</small>
            </div>
            <span class="gx-catalog-editor-stock">${stock.value} disp.</span>
        </div>
        <div class="gx-catalog-editor-body">
            <div class="gx-catalog-editor-grid">
                <label class="gx-catalog-editor-field full">
                    <span>Nombre</span>
                    <input type="text" value="${esc(srv.nombre||"")}" onchange="updateGlobalService(${index},'nombre',this.value)">
                </label>
                <label class="gx-catalog-editor-field">
                    <span>Venta</span>
                    <input type="number" inputmode="decimal" value="${Number(srv.precio||0)}" onchange="updateGlobalService(${index},'precio',this.value)">
                </label>
                <label class="gx-catalog-editor-field">
                    <span>Costo</span>
                    <input type="number" inputmode="decimal" value="${Number(srv.costo||0)}" onchange="updateGlobalService(${index},'costo',this.value)">
                </label>
                <label class="gx-catalog-editor-field">
                    <span>Cuentas</span>
                    <input type="number" inputmode="numeric" value="${cuentas}" onchange="updateGlobalService(${index},'cuentas',this.value)">
                </label>
                <label class="gx-catalog-editor-field">
                    <span>Límite</span>
                    <input type="number" inputmode="numeric" value="${limite}" onchange="updateGlobalService(${index},'limite',this.value)">
                </label>
                <label class="gx-catalog-editor-field full">
                    <span>Stock fijo · vacío = automático</span>
                    <input type="number" inputmode="numeric" placeholder="Automático" value="${esc(fixed)}" onchange="updateGlobalService(${index},'stock_manual',this.value)">
                </label>
                <label class="gx-catalog-editor-field full">
                    <span>Etiqueta</span>
                    <input type="text" placeholder="Ej. Promo" value="${esc(srv.etiqueta||"")}" onchange="updateGlobalService(${index},'etiqueta',this.value)">
                </label>
                <label class="gx-catalog-editor-field full">
                    <span>Beneficios</span>
                    <input type="text" placeholder="Ej. 4K, 1 perfil…" value="${esc(srv.beneficios||"")}" onchange="updateGlobalService(${index},'beneficios',this.value)">
                </label>
            </div>
            <div class="gx-catalog-editor-actions">
                <button type="button" class="gx-catalog-editor-sync" onclick="sincronizarPrecioMasivo(${index})">Sincronizar precio</button>
                <button type="button" class="gx-catalog-editor-delete" onclick="gxRemoveCatalogServiceMobile(${index})">Eliminar</button>
            </div>
        </div>`;
    }

    window.gxOpenMobileCatalog=function(index){
        gxCatalogSelectedIndex=Number(index);
        renderCatalogList();
        document.getElementById("gx-catalog-mobile")?.scrollIntoView({behavior:"smooth",block:"start"});
    };

    window.gxCloseMobileCatalog=function(){
        gxCatalogSelectedIndex=null;
        renderCatalogList();
    };

    window.gxAddCatalogServiceMobile=function(){
        const before=Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales.length:0;
        addGlobalService();
        const after=Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales.length:0;
        if(after>before){
            gxCatalogSelectedIndex=after-1;
            renderCatalogList();
        }
    };

    window.gxRemoveCatalogServiceMobile=function(index){
        const before=Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales.length:0;
        removeGlobalService(index);
        const after=Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales.length:0;
        if(after<before){
            gxCatalogSelectedIndex=null;
            renderCatalogList();
        }
    };

    // Cualquier actualización del catálogo conserva la selección móvil actual.
    const previousRender=window.renderGlobalServicesUI || renderGlobalServicesUI;
    if(typeof previousRender==="function"){
        window.renderGlobalServicesUI=function(...args){
            const result=previousRender.apply(this,args);
            setTimeout(renderCatalogList,0);
            return result;
        };
        // La función global original puede estar referenciada por nombre léxico;
        // sincronizamos también esa referencia cuando el navegador lo permite.
        try{ renderGlobalServicesUI=window.renderGlobalServicesUI; }catch{}
    }

    // Cuando se entra al catálogo desde Más o escritorio, siempre refresca lista.
    const previousTab=window.goAdminTab;
    if(typeof previousTab==="function"){
        window.goAdminTab=function(id,...args){
            const result=previousTab.call(this,id,...args);
            if(id==="tab-catalogo"){
                setTimeout(()=>{
                    if(isMobile()) renderCatalogList();
                },20);
            }
            return result;
        };
    }

    document.addEventListener("DOMContentLoaded",()=>{
        setTimeout(renderCatalogList,800);
    });

})();