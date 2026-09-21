(() => {
    const ACCESS_URL="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/accesos-admin-beta";
    const TOKEN_KEY="GOXION_ADMIN_TOKEN";
    let gxAccessModel={servicios:[],componentes:[],cuentas:[],accesos:[]};
    let gxAccessModelLoaded=false;
    let gxBuilderComponents=new Map();
    let gxBuilderUnmatched=[];

    const esc=s=>String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const clean=v=>String(v??"").trim();
    const norm=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
    const qtyPart=raw=>{const s=clean(raw),m=s.match(/(?:\s*\(\s*x\s*(\d{1,2})\s*\)|\s+x\s*(\d{1,2}))\s*$/i),qty=Math.max(1,Math.min(20,Number(m?.[1]||m?.[2]||1)));return {name:(m?s.slice(0,m.index):s).replace(/\s*\(\s*especial\s*\)\s*/ig," ").replace(/\s+/g," ").trim(),qty}};

    async function gxAccessCall(accion,datos={}){
        const token=localStorage.getItem(TOKEN_KEY)||window.currentToken||"";
        if(!token) throw new Error("Sesión administrativa no disponible.");
        const r=await fetch(ACCESS_URL,{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":token},body:JSON.stringify({accion,datos}),cache:"no-store"});
        const t=await r.text();let b={};try{b=t?JSON.parse(t):{}}catch{}
        if(!r.ok||b?.ok!==true)throw new Error(b?.error||`HTTP ${r.status}: ${t||"Respuesta vacía"}`);
        return b;
    }

    function score(token,s){
        const t=norm(token),n=norm(s?.nombre);if(!t||!n)return 0;if(t===n)return 100;
        if(n.startsWith(t+" ")||t.startsWith(n+" "))return 88;
        if((t.includes("hbo")||t==="max")&&(n.includes("hbo")||n.includes("max")))return 92;
        if((t.includes("prime")||t.includes("amazon"))&&n.includes("prime"))return 92;
        if(t.includes("netflix")&&n.includes("netflix"))return 92;
        if(t.includes("disney")&&n.includes("disney"))return 92;
        if(t.includes("youtube")&&n.includes("youtube"))return 92;
        if(t.includes("vix")&&n.includes("vix"))return 92;
        if((t.includes("microsoft")||t.includes("365"))&&(n.includes("microsoft")||n.includes("365")))return 92;
        if((t.includes("google")||t.includes("2tb"))&&(n.includes("google")||n.includes("2tb")))return 92;
        if(t.includes("crunchy")){
            if(t.includes("cuenta completa")&&n.includes("cuenta completa"))return 97;
            if(t.includes("mega")&&n.includes("mega"))return 97;
            if(n.includes("crunchy"))return 72;
        }
        const simple=x=>x.replace(/\b(premium|platino|standard)\b/g,"").replace(/\s+/g," ").trim();
        return simple(t)&&simple(t)===simple(n)?84:0;
    }
    function individuals(){return (gxAccessModel.servicios||[]).filter(s=>s.activo!==false&&s.tipo_producto!=="combo")}
    function best(token){
        const list=individuals().map(s=>({s,score:score(token,s)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.s.nombre).localeCompare(String(b.s.nombre),"es"));
        if(!list.length)return null;
        if(list.length>1&&list[0].score===list[1].score&&list[0].score<95)return null;
        return list[0].s;
    }
    function productById(id){return (gxAccessModel.servicios||[]).find(s=>String(s.id)===String(id))||null}
    function componentsOf(id){return (gxAccessModel.componentes||[]).filter(c=>String(c.servicio_padre_id)===String(id))}
    function accountsFor(id){return (gxAccessModel.cuentas||[]).filter(a=>a.activo!==false&&String(a.servicio_id)===String(id))}

    function planService(s){
        const product=s?.servicio_id?productById(s.servicio_id):null;
        if(product?.tipo_producto==="combo"){
            const arr=[];for(const c of componentsOf(product.id)){const srv=productById(c.servicio_componente_id);for(let i=1;i<=Number(c.cantidad||1);i++)arr.push({servicio_id:c.servicio_componente_id,servicio:srv?.nombre||c.nombre||"Servicio",ordinal:i,origin:"formal"})}
            return {kind:"combo_formal",items:arr,issues:arr.length?[]:["Combo sin componentes"]};
        }
        if(product){
            const q=qtyPart(s?.nombre||product.nombre).qty,arr=[];for(let i=1;i<=q;i++)arr.push({servicio_id:product.id,servicio:product.nombre,ordinal:i,origin:q>1?"multiplicador":"directo"});
            return {kind:q>1?"multiplicador":"individual",items:arr,issues:[]};
        }
        const raw=clean(s?.nombre),parts=raw.split(/\s+\+\s+/).map(x=>x.trim()).filter(Boolean),tokens=(parts.length?parts:[raw]).map(qtyPart),arr=[],issues=[];
        for(const t of tokens){const m=best(t.name);if(!m){issues.push(`No se reconoció “${t.name}”`);continue}for(let i=1;i<=t.qty;i++)arr.push({servicio_id:m.id,servicio:m.nombre,ordinal:i,origin:"inferido"})}
        return {kind:parts.length>1?"combo_legacy":tokens.some(t=>t.qty>1)?"multiplicador":"especial",items:arr,issues};
    }

    async function gxLoadAccessModel(force=false){
        if(gxAccessModelLoaded&&!force)return gxAccessModel;
        const r=await gxAccessCall("modelo");
        gxAccessModel={servicios:r.servicios||[],componentes:r.componentes||[],cuentas:r.cuentas||[],accesos:r.accesos||[]};
        window.gxAccessModelBeta=gxAccessModel;
        gxAccessModelLoaded=true;
        // Enriquecer catálogo sin tocar admin-datos oficial.
        const meta=new Map(gxAccessModel.servicios.map(s=>[String(s.id),s]));
        (window.configGlobal?.serviciosGlobales||[]).forEach(s=>Object.assign(s,meta.get(String(s.id||s._id))||{}));
        gxPopulateComponentSelect();
        gxDecorateCatalogProducts();
        gxDecorateClientAccessCards();
        gxRenderPlatformDetected();
        return gxAccessModel;
    }

    function gxComputeDiagnostic(){
        const rows=[];let contracts=0,expected=0,review=0,combos=0,multipliers=0,specials=0;
        const missing=new Set();
        Object.entries(clientesDict||{}).forEach(([key,c])=>{
            (c?.servicios||[]).filter(s=>s?.activo!==false).forEach((s,index)=>{
                contracts++;const p=planService(s);expected+=p.items.length;
                if(p.issues.length||!p.items.length)review++;
                if(p.kind.includes("combo"))combos++;
                if(p.kind==="multiplicador")multipliers++;
                if(p.kind==="especial")specials++;
                p.items.forEach(i=>{if(!accountsFor(i.servicio_id).length)missing.add(i.servicio)});
                rows.push({key,index,cliente:c?.nombre||"Cliente",folio:c?.folio||"",contratacion:s?.nombre||"Servicio",...p});
            });
        });
        return {contracts,expected,review,combos,multipliers,specials,accounts:(gxAccessModel.cuentas||[]).filter(a=>a.activo!==false).length,missing:[...missing].sort((a,b)=>a.localeCompare(b,"es")),rows};
    }

    window.gxRunAccessDiagnostic=async function(){
        const state=document.getElementById("gx-access-diagnostic-state");
        if(state){state.className="gx-access-diagnostic-state";state.innerHTML="<i></i><span>Revisando accesos materializados y cuentas madre…</span>"}
        try{
            await gxLoadAccessModel(true);
            const r=await gxAccessCall("diagnostico",{});
            const d=r.summary||{};
            const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v??0)};
            set("gx-access-d-contracts",d.contratos_activos);
            set("gx-access-d-accesses",d.accesos_existentes);
            const gxOperationalPending=(gxAccessModel.accesos||[]).filter(a=>{
                const mode=a.modo_acceso||'compartido';
                return a.activo!==false && (mode==='invitacion'
                    ? (!String(a.correo_override||'').trim() || !a.estado_invitacion || a.estado_invitacion==='sin_verificar')
                    : !a.cuenta_id);
            }).length;
            set("gx-access-d-review",gxOperationalPending);
            set("gx-access-d-accounts",d.cuentas_madre_activas);

            if(state){
                const accesos=(gxAccessModel.accesos||[]);
                const pendingShared=accesos.filter(a=>a.activo!==false && (a.modo_acceso||'compartido')==='compartido' && !a.cuenta_id).length;
                const pendingInvite=accesos.filter(a=>a.activo!==false && (a.modo_acceso||'compartido')==='invitacion' && (!String(a.correo_override||'').trim() || !a.estado_invitacion || a.estado_invitacion==='sin_verificar')).length;
                const pending=pendingShared+pendingInvite;
                state.className=`gx-access-diagnostic-state ${pending?'review':'ok'}`;
                state.innerHTML=`<i></i><span>${Number(d.accesos_existentes||0)} accesos materializados · ${pendingShared} compartidos sin cuenta · ${pendingInvite} invitaciones por completar.</span>`;
            }

            const details=document.getElementById("gx-access-diagnostic-details");
            if(details){
                const missing=Array.isArray(d.plataformas_compartidas_sin_cuenta)?d.plataformas_compartidas_sin_cuenta:[];
                details.innerHTML=`
                    <div class="gx-access-diagnostic-note"><strong>${Number(d.combos_legacy_detectados||0)}</strong> combo(s) legacy · <strong>${Number(d.multiplicadores_detectados||0)}</strong> multiplicador(es) · <strong>${Number(d.accesos_invitacion||0)}</strong> acceso(s) por invitación. La arquitectura técnica ya está materializada y protegida contra duplicados.</div>
                    ${missing.length?`<div class="gx-access-diagnostic-note warn"><strong>Faltan cuentas compartidas:</strong> ${esc(missing.join(" · "))}. Solo afecta plataformas de acceso compartido.</div>`:`<div class="gx-access-diagnostic-note"><strong>✓ Cuentas compartidas cubiertas:</strong> las plataformas que requieren credenciales administradas tienen contenedor disponible.</div>`}
                    ${Number(d.invitaciones_sin_correo||0)>0?`<div class="gx-access-diagnostic-note"><strong>${Number(d.invitaciones_sin_correo||0)}</strong> acceso(s) por invitación todavía sin correo personal verificado. No requieren contraseña compartida.</div>`:''}
                    <div class="gx-access-diagnostic-note"><strong>Asignación segura:</strong> una operación masiva se rechaza completa si la cuenta no tiene capacidad suficiente o si algún acceso ya fue asignado.</div>
                `;
            }
            gxDecorateClientAccessCards();
            gxRenderPlatformDetected();
            return r;
        }catch(e){
            console.error(e);
            if(state){state.className="gx-access-diagnostic-state review";state.innerHTML=`<i></i><span>No se pudo completar el diagnóstico: ${esc(e?.message||e)}</span>`}
        }
    };

    function gxDecorateClientAccessCards(){
        if(!gxAccessModelLoaded)return;
        document.querySelectorAll('.gx-service-compact[data-gx-client-key]').forEach(card=>{
            const key=card.dataset.gxClientKey,index=Number(card.dataset.gxServiceIndex),s=clientesDict?.[key]?.servicios?.[index];if(!s)return;
            const p=planService(s),showArchitectureSummary=p.kind!=="individual"||!s.servicio_id;
            const box=card.querySelector('.gx-smart-access-box');if(!box)return;
            const serviceRowId=String(s?._id||s?.id||"");

            const oldVisible=card.querySelector('.gx-access-visible-summary');
            if(oldVisible) oldVisible.remove();

            if(showArchitectureSummary){
                const details=card.querySelector('.gx-service-access-details');
                const label=p.kind==='combo_legacy'?'COMBO':
                    p.kind==='combo_formal'?'COMBO':
                    p.kind==='multiplicador'?'MÚLTIPLE':'ACCESO ESPECIAL';
                const chips=p.items.map(x=>{
                    const repeated=p.items.filter(y=>y.servicio_id===x.servicio_id).length>1;
                    return `<span>${esc(x.servicio)}${repeated?` #${x.ordinal}`:''}</span>`;
                }).join('');
                details?.insertAdjacentHTML('beforebegin',`
                    <div class="gx-access-visible-summary">
                        <div>
                            <strong>${label} · ${p.items.length} acceso${p.items.length===1?'':'s'}</strong>
                            <small>Contratación comercial arriba · accesos técnicos abajo.</small>
                        </div>
                        <div class="gx-access-visible-chips">${chips || '<span>Revisión necesaria</span>'}</div>
                    </div>
                `);
            }

            // Todos los servicios usan una sola vista de acceso.
            // Así no conviven el bloque legado (correo/perfil/PIN) y el nuevo bloque técnico.
            box.setAttribute('data-gx-beta-preview','1');
            box.innerHTML=`<div class="gx-beta-access-preview">
                <div class="gx-beta-access-preview-head">
                    <div>
                        <strong>${p.items.length} acceso${p.items.length===1?'':'s'} real${p.items.length===1?'':'es'}</strong>
                        <small>${p.kind==='combo_legacy'?'Combo existente':p.kind==='combo_formal'?'Combo formal':p.kind==='multiplicador'?'Múltiples accesos de la misma plataforma':p.kind==='individual'?'Acceso individual':'Servicio especial'}</small>
                    </div>
                    <span>Activo</span>
                </div>

                ${p.items.map(x=>{
                    const access=(gxAccessModel.accesos||[]).find(a=>
                        String(a.cliente_servicio_id)===serviceRowId &&
                        String(a.servicio_id)===String(x.servicio_id) &&
                        Number(a.ordinal||1)===Number(x.ordinal||1)
                    );
                    const accounts=(window.gxPlatformAccountState?.cuentas||gxAccessModel.cuentas||[])
                        .filter(a=>a.activo!==false&&String(a.servicio_id)===String(x.servicio_id));
                    const current=access?.cuenta_id?accounts.find(a=>String(a.id)===String(access.cuenta_id)):null;
                    const repeated=p.items.filter(y=>y.servicio_id===x.servicio_id).length>1;
                    const mode=access?.modo_acceso || productById(x.servicio_id)?.modo_acceso || 'compartido';
                    const isInvite=mode==='invitacion';
                    const inviteState=access?.estado_invitacion || 'sin_verificar';
                    return `<div class="gx-beta-access-row gx-beta-access-row-live ${isInvite?'gx-invite-access':''}">
                        <div class="gx-tech-access-main">
                            <strong>${esc(x.servicio)}${repeated?` · acceso ${x.ordinal}`:''}</strong>
                            <small>${access?`ID técnico listo · ${isInvite?'beneficio en cuenta personal':current?`cuenta ${esc(current.alias)}`:'pendiente de cuenta compartida'}`:'No materializado'}</small>

                            ${access ? (isInvite ? `
                                <div class="gx-tech-invite-grid">
                                    <label class="wide">
                                        <span>Cuenta personal del cliente</span>
                                        <input type="email" value="${esc(access.correo_override||'')}" placeholder="correo personal" onchange="gxUpdateTechnicalAccess('${esc(access.id)}','correo_override',this.value,this)">
                                    </label>
                                    <label>
                                        <span>Estado del beneficio</span>
                                        <select onchange="gxUpdateTechnicalAccess('${esc(access.id)}','estado_invitacion',this.value,this)">
                                            <option value="sin_verificar" ${inviteState==='sin_verificar'?'selected':''}>Sin verificar</option>
                                            <option value="pendiente" ${inviteState==='pendiente'?'selected':''}>Pendiente</option>
                                            <option value="enviada" ${inviteState==='enviada'?'selected':''}>Invitación enviada</option>
                                            <option value="activa" ${inviteState==='activa'?'selected':''}>Activo</option>
                                            <option value="revision" ${inviteState==='revision'?'selected':''}>Requiere revisión</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="gx-tech-password-line gx-invite-note">
                                    <div><span>Acceso personal</span><small>El cliente entra con su propia cuenta. GOXION no almacena ni entrega su contraseña.</small></div>
                                </div>
                            ` : `
                                <div class="gx-tech-credential-grid">
                                    <label>
                                        <span>Perfil</span>
                                        <input type="text" value="${esc(access.perfil_nombre||'')}" placeholder="Ej. David" onchange="gxUpdateTechnicalAccess('${esc(access.id)}','perfil_nombre',this.value,this)">
                                    </label>
                                    <label>
                                        <span>PIN</span>
                                        <input type="text" value="${esc(access.perfil_pin||'')}" placeholder="PIN" maxlength="30" onchange="gxUpdateTechnicalAccess('${esc(access.id)}','perfil_pin',this.value,this)">
                                    </label>
                                </div>
                                <div class="gx-tech-password-line">
                                    <div>
                                        <span>Contraseña</span>
                                        <small>${current?'Se administra una sola vez desde la cuenta compartida':'Asigna una cuenta compartida para administrar la contraseña'}</small>
                                    </div>
                                    ${current?`<button type="button" onclick="gxOpenTechnicalPassword('${esc(x.servicio_id)}','${esc(current.id)}',event)">Gestionar contraseña</button>`:''}
                                </div>
                            `) : ''}
                        </div>
                        ${access?`
                            <div class="gx-tech-account-side">
                                <span>${isInvite?'Grupo / licencia (opcional)':'Cuenta compartida'}</span>
                                <select class="gx-technical-account-select" onchange="gxAssignTechnicalAccess('${esc(access.id)}',this.value,this)">
                                    <option value="">${isInvite?'Sin grupo asignado':'Sin cuenta'}</option>
                                    ${accounts.map(a=>{
                                        const occ=Number(a.ocupados||0),max=Number(a.limite_perfiles||0),selected=String(a.id)===String(access.cuenta_id||"");
                                        const full=occ>=max&&!selected;
                                        return `<option value="${esc(a.id)}" ${selected?'selected':''} ${full?'disabled':''}>${esc(a.alias)} · ${occ}/${max}${full?' · lleno':''}</option>`;
                                    }).join('')}
                                </select>
                                <em class="${isInvite?(inviteState==='activa'?'assigned':'missing'):(current?'assigned':'missing')}">${isInvite?(inviteState==='activa'?'Beneficio activo':'Revisar estado'):(current?'Asignado':'Pendiente')}</em>
                            </div>
                        `:`<em class="missing">Revisión</em>`}
                    </div>`;
                }).join('')}

                ${p.issues.length?`<div class="gx-access-diagnostic-note warn">${esc(p.issues.join(' · '))}</div>`:''}
                ${p.items.length>1?`<div class="gx-access-diagnostic-note">Cada acceso es independiente: en un x2 puedes distribuirlos entre cuentas madre distintas sin cambiar la contratación.</div>`:''}
            </div>`;
        });
    }

    // ---------- Detección visible por plataforma ----------
    function gxDetectedForPlatform(serviceId){
        return (gxAccessModel.accesos||[])
            .filter(a=>a.activo!==false&&String(a.servicio_id)===String(serviceId))
            .sort((a,b)=>String(a.cliente||"").localeCompare(String(b.cliente||""),"es")||Number(a.ordinal||1)-Number(b.ordinal||1));
    }

    function gxRenderPlatformDetected(){
        const sel=document.getElementById('gx-account-platform');
        const title=document.getElementById('gx-platform-detected-title');
        const count=document.getElementById('gx-platform-detected-count');
        const list=document.getElementById('gx-platform-detected-list');
        const target=document.getElementById('gx-platform-target-account');
        if(!sel||!list)return;

        const serviceId=String(sel.value||'');
        const srv=productById(serviceId)||(gxAccessModel.servicios||[]).find(s=>String(s.id)===serviceId)||null;
        const inviteMode=srv?.modo_acceso==='invitacion';
        const rows=serviceId?gxDetectedForPlatform(serviceId):[];
        const accounts=(window.gxPlatformAccountState?.cuentas||[]).filter(a=>a.activo!==false&&String(a.servicio_id)===serviceId);
        const pending=inviteMode ? rows.filter(r=>!String(r.correo_override||'').trim() || !r.estado_invitacion || r.estado_invitacion==='sin_verificar') : rows.filter(r=>!r.cuenta_id);

        if(title)title.textContent=srv?`${inviteMode?'Beneficiarios':'Quién tiene'} ${srv.nombre} · ${pending.length} pendiente${pending.length===1?'':'s'}`:'Selecciona una plataforma';
        if(count)count.textContent=String(rows.length);

        if(target){
            const prev=target.value;
            target.innerHTML=`<option value="">${inviteMode?'Grupo/licencia destino (opcional)…':'Cuenta destino…'}</option>`+accounts.map(a=>`<option value="${esc(a.id)}">${esc(a.alias)} · ${Number(a.ocupados||0)}/${Number(a.limite_perfiles||0)} · ${Math.max(0,Number(a.limite_perfiles||0)-Number(a.ocupados||0))} libres</option>`).join('');
            if(prev&&accounts.some(a=>String(a.id)===String(prev)))target.value=prev;
            else if(accounts.length===1)target.value=String(accounts[0].id);
        }

        if(!rows.length){
            list.innerHTML='<div class="gx-empty-inline">No hay accesos materializados para esta plataforma.</div>';
            return;
        }

        list.innerHTML=rows.map(r=>{
            const account=r.cuenta_id?(window.gxPlatformAccountState?.cuentas||[]).find(a=>String(a.id)===String(r.cuenta_id)):null;
            const isTest=String(r.folio||'').startsWith('GX-TEST-');
            const siblings=rows.filter(x=>
                String(x.cliente_servicio_id)===String(r.cliente_servicio_id) &&
                String(x.servicio_id)===String(r.servicio_id)
            ).sort((a,b)=>Number(a.ordinal||1)-Number(b.ordinal||1));
            const total=siblings.length;
            const position=Math.max(1,siblings.findIndex(x=>String(x.id)===String(r.id))+1);
            const accessLabel=total>1?`Acceso ${position} de ${total}`:'1 acceso';
            const mode=r.modo_acceso || srv?.modo_acceso || 'compartido';
            const isInvite=mode==='invitacion';
            return `<div class="gx-platform-detected-row ${r.cuenta_id?'is-assigned':''} ${isTest?'is-test':''} ${isInvite?'is-invite':''}">
                <input type="checkbox" class="gx-access-pending-check" value="${esc(r.id)}" ${r.cuenta_id?'disabled':''} data-gx-test="${isTest?'1':'0'}">
                <div class="gx-detected-client-copy">
                    <strong>${esc(r.cliente)} ${isTest?'<b>PRUEBA</b>':''}</strong>
                    <small>${esc(r.folio)} · ${esc(r.contratacion)} · <b>${esc(accessLabel)}</b>${isInvite?` · ${esc(r.correo_override||'Sin correo personal')}`:''}</small>
                </div>
                <select class="gx-inline-account-select" aria-label="${isInvite?'Grupo o licencia':'Cuenta compartida'} de ${esc(r.cliente)} ${esc(accessLabel)}"
                    onchange="gxMoveDetectedAccess('${esc(r.id)}',this.value,this)">
                    <option value="">${isInvite?'Sin grupo':'Sin cuenta'}</option>
                    ${accounts.map(a=>{
                        const occ=Number(a.ocupados||0),max=Number(a.limite_perfiles||0),selected=String(a.id)===String(r.cuenta_id||'');
                        const full=occ>=max&&!selected;
                        return `<option value="${esc(a.id)}" ${selected?'selected':''} ${full?'disabled':''}>${esc(a.alias)} · ${occ}/${max}${full?' · llena':''}</option>`;
                    }).join('')}
                </select>
                <span class="${isInvite?(r.estado_invitacion==='activa'?'assigned':''):(r.cuenta_id?'assigned':'')}">${isInvite?(r.estado_invitacion==='activa'?'Activo':String(r.estado_invitacion||'sin verificar').replace('_',' ')):(account?'Asignado':'Pendiente')}</span>
            </div>`;
        }).join('');
    }
    window.gxRenderPlatformDetected=gxRenderPlatformDetected;

    window.gxSelectPendingAccesses=function(){
        document.querySelectorAll('#gx-platform-detected-list .gx-access-pending-check:not(:disabled)').forEach(chk=>{
            const row=chk.closest('.gx-platform-detected-row');
            chk.checked=chk.dataset.gxTest!=='1' && !row?.classList.contains('is-invite');
        });
    };

    window.gxMoveDetectedAccess=async function(accessId,accountId,select){
        const access=(gxAccessModel.accesos||[]).find(a=>String(a.id)===String(accessId));
        const previous=String(access?.cuenta_id||'');
        if(String(accountId||'')===previous)return;
        if(select)select.disabled=true;
        try{
            if(accountId){
                await gxAccessCall('asignar_seleccion',{cuenta_id:accountId,acceso_ids:[accessId]});
            }else{
                await gxAccessCall('desasignar',{acceso_id:accessId});
            }
            gxAccessModelLoaded=false;
            await Promise.allSettled([window.gxLoadPlatformAccounts?.(),gxLoadAccessModel(true)]);
            gxRenderPlatformDetected();
            gxDecorateClientAccessCards();
        }catch(e){
            if(select){select.value=previous;select.disabled=false}
            alert(`No se pudo mover este acceso.\n\n${e?.message||e}`);
        }
    };

    window.gxAssignSelectedDetected=async function(){
        const accountId=String(document.getElementById('gx-platform-target-account')?.value||'');
        const ids=[...document.querySelectorAll('#gx-platform-detected-list .gx-access-pending-check:checked')].map(x=>x.value);
        if(!accountId)return alert('Selecciona la cuenta madre destino.');
        if(!ids.length)return alert('Selecciona al menos un acceso pendiente.');
        const account=(window.gxPlatformAccountState?.cuentas||[]).find(a=>String(a.id)===accountId);
        if(!confirm(`Vas a asignar ${ids.length} acceso${ids.length===1?'':'s'} a ${account?.alias||'esta cuenta'}.\n\nLa operación se cancelará completa si no hay capacidad suficiente. ¿Continuar?`))return;
        try{
            const r=await gxAccessCall('asignar_seleccion',{cuenta_id:accountId,acceso_ids:ids});
            gxAccessModelLoaded=false;
            await Promise.allSettled([window.gxLoadPlatformAccounts?.(),gxLoadAccessModel(true)]);
            gxRenderPlatformDetected();
            gxDecorateClientAccessCards();
            alert(`✓ ${Number(r.stats?.assigned||ids.length)} acceso${ids.length===1?'':'s'} asignado${ids.length===1?'':'s'}.\n\n${Number(r.stats?.libres||0)} espacio(s) libre(s) en la cuenta.`);
        }catch(e){
            alert(`No se realizó ningún cambio.\n\n${e?.message||e}`);
            await Promise.allSettled([window.gxLoadPlatformAccounts?.(),gxLoadAccessModel(true)]);
            gxRenderPlatformDetected();
        }
    };

    window.gxAssignTechnicalAccess=async function(accessId,accountId,select){
        const previous=(gxAccessModel.accesos||[]).find(a=>String(a.id)===String(accessId))?.cuenta_id||'';
        try{
            if(accountId)await gxAccessCall('asignar_seleccion',{cuenta_id:accountId,acceso_ids:[accessId]});
            else await gxAccessCall('desasignar',{acceso_id:accessId});
            gxAccessModelLoaded=false;
            await Promise.allSettled([window.gxLoadPlatformAccounts?.(),gxLoadAccessModel(true)]);
            gxDecorateClientAccessCards();
            gxRenderPlatformDetected();
        }catch(e){
            if(select)select.value=String(previous||'');
            alert(`No se pudo cambiar la cuenta.\n\n${e?.message||e}`);
        }
    };

    window.gxUpdateTechnicalAccess=async function(accessId,field,value,input){
        const allowed=['perfil_nombre','perfil_pin','correo_override','estado_invitacion'];
        if(!allowed.includes(field))return;
        const access=(gxAccessModel.accesos||[]).find(a=>String(a.id)===String(accessId));
        const previous=String(access?.[field]||'');
        if(String(value||'')===previous)return;
        if(input)input.classList.add('gx-saving');
        try{
            const r=await gxAccessCall('editar_acceso',{acceso_id:accessId,[field]:String(value||'')});
            if(access&&r.acceso)Object.assign(access,r.acceso);
            window.gxAccessModelBeta=gxAccessModel;
            if(input){input.classList.remove('gx-saving');input.classList.add('gx-saved');setTimeout(()=>input.classList.remove('gx-saved'),700)}
        }catch(e){
            if(input){input.value=previous;input.classList.remove('gx-saving')}
            alert(`No se pudo guardar este dato de acceso.\n\n${e?.message||e}`);
        }
    };

    window.gxOpenTechnicalPassword=function(serviceId,accountId,event){
        event?.preventDefault?.();event?.stopPropagation?.();
        goAdminTab('tab-ajustes');
        setTimeout(()=>{
            const btn=[...document.querySelectorAll('.gx-settings-tabs button')].find(b=>(b.textContent||'').toLowerCase().includes('credenciales'));
            window.gxSettingsView?.('credentials',btn);
            setTimeout(()=>{
                const svc=document.getElementById('gx-cred-service');
                const list=Array.isArray(configGlobal?.serviciosGlobales)?configGlobal.serviciosGlobales:[];
                const idx=list.findIndex(s=>String(s._id||s.id||'')===String(serviceId));
                if(svc&&idx>=0){svc.value=String(idx);window.gxCredentialServiceChanged?.()}
                setTimeout(()=>{
                    const acc=document.getElementById('gx-cred-account');
                    if(acc&&[...acc.options].some(o=>String(o.value)===String(accountId))){
                        acc.value=String(accountId);window.gxCredentialAccountChanged?.();
                    }
                    document.getElementById('gx-cred-password')?.focus();
                },80);
            },80);
        },40);
    };

    // ---------- Constructor de productos / combos ----------
    function gxPopulateComponentSelect(){
        const sel=document.getElementById('gx-product-component-select');if(!sel)return;
        sel.innerHTML='<option value="">Agregar componente…</option>'+individuals().map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join('');
    }
    function gxRenderBuilder(){
        const wrap=document.getElementById('gx-product-components'),sum=document.getElementById('gx-product-builder-summary');
        const comps=[...gxBuilderComponents.entries()].map(([id,qty])=>({s:productById(id),qty})).filter(x=>x.s);
        if(wrap)wrap.innerHTML=comps.map(x=>`<div class="gx-product-component"><strong>${esc(x.s.nombre)}</strong><span>× ${x.qty}</span><button type="button" onclick="gxRemoveProductComponent('${esc(x.s.id)}')">×</button></div>`).join('');
        const total=comps.reduce((n,x)=>n+x.qty,0);
        if(sum)sum.textContent=comps.length?`Combo técnico · ${total} acceso${total===1?'':'s'} · ${comps.length} plataforma${comps.length===1?'':'s'}`:'Producto individual.';
    }
    function gxDetectBuilderName(){
        const raw=clean(document.getElementById('gx-product-name')?.value),d=document.getElementById('gx-product-detection');
        gxBuilderComponents=new Map();gxBuilderUnmatched=[];
        if(!raw){if(d){d.className='gx-product-detection';d.innerHTML='<i>◇</i><div><strong>Esperando nombre</strong><span>Usa el signo + separado por espacios para proponer un combo.</span></div>'}gxRenderBuilder();return}
        const pieces=raw.split(/\s+\+\s+/).map(x=>x.trim()).filter(Boolean),tokens=(pieces.length?pieces:[raw]).map(qtyPart);
        const comboSyntax=pieces.length>1,qtySyntax=tokens.some(t=>t.qty>1);
        if(comboSyntax||qtySyntax){
            tokens.forEach(t=>{const m=best(t.name);if(m)gxBuilderComponents.set(String(m.id),(gxBuilderComponents.get(String(m.id))||0)+t.qty);else gxBuilderUnmatched.push(t.name)});
            if(d){d.className=`gx-product-detection ${gxBuilderUnmatched.length?'warn':'combo'}`;d.innerHTML=gxBuilderUnmatched.length?`<i>!</i><div><strong>Necesita revisión</strong><span>No pude identificar: ${esc(gxBuilderUnmatched.join(' · '))}. Corrige el nombre o agrega los componentes manualmente.</span></div>`:`<i>✦</i><div><strong>${comboSyntax?'Combo detectado':'Cantidad múltiple detectada'}</strong><span>${[...gxBuilderComponents.entries()].map(([id,q])=>`${esc(productById(id)?.nombre||'Servicio')} ×${q}`).join(' · ')}</span></div>`}
        }else if(d){d.className='gx-product-detection';d.innerHTML='<i>◇</i><div><strong>Producto individual</strong><span>No se detectó composición. Puedes agregar componentes manualmente si quieres crear un paquete con otro nombre comercial.</span></div>'}
        gxRenderBuilder();
    }
    window.gxProductNameChanged=gxDetectBuilderName;
    window.gxAddManualProductComponent=function(){const id=clean(document.getElementById('gx-product-component-select')?.value),qty=Math.max(1,Math.min(20,Number(document.getElementById('gx-product-component-qty')?.value||1)));if(!id)return;gxBuilderComponents.set(id,(gxBuilderComponents.get(id)||0)+qty);gxRenderBuilder()};
    window.gxRemoveProductComponent=function(id){gxBuilderComponents.delete(String(id));gxRenderBuilder()};

    window.gxOpenProductBuilder=async function(){
        try{await gxLoadAccessModel()}catch(e){return alert(`❌ No pude cargar el modelo de catálogo.\n\n${e?.message||e}`)}
        gxBuilderComponents=new Map();gxBuilderUnmatched=[];
        ['gx-product-name','gx-product-label','gx-product-benefits'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});const p=document.getElementById('gx-product-price');if(p)p.value='0';
        gxPopulateComponentSelect();gxDetectBuilderName();const modal=document.getElementById('gx-product-builder');modal?.classList.add('show');modal?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>document.getElementById('gx-product-name')?.focus(),80);
    };
    window.gxCloseProductBuilder=function(e){e?.preventDefault?.();const modal=document.getElementById('gx-product-builder');modal?.classList.remove('show');modal?.setAttribute('aria-hidden','true');document.body.style.overflow=''};
    window.gxCreateSmartProduct=async function(){
        const btn=document.getElementById('gx-product-create'),nombre=clean(document.getElementById('gx-product-name')?.value),precio=Number(document.getElementById('gx-product-price')?.value||0);
        if(!nombre)return alert('Escribe el nombre del producto.');
        const components=[...gxBuilderComponents.entries()].map(([servicio_id,cantidad])=>({servicio_id,cantidad}));
        if(/\s+\+\s+/.test(nombre)&&gxBuilderUnmatched.length&&components.length<2)return alert('El nombre parece un combo, pero no pude reconocer todos sus componentes. Corrígelo antes de guardar.');
        const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Creando…'}
        try{
            const r=await gxAccessCall('crear_producto',{nombre,precio,etiqueta:clean(document.getElementById('gx-product-label')?.value),beneficios:clean(document.getElementById('gx-product-benefits')?.value),componentes});
            await window.recargar?.();gxAccessModelLoaded=false;await gxLoadAccessModel(true);gxCloseProductBuilder();
            alert(components.length?`✓ Combo creado.\n\n${nombre}\n${components.reduce((n,x)=>n+x.cantidad,0)} acceso(s) técnicos.`:`✓ Servicio individual creado.\n\n${nombre}`);
        }catch(e){console.error(e);alert(`❌ No se pudo crear el producto.\n\n${e?.message||e}`)}finally{if(btn){btn.disabled=false;btn.textContent=old||'Crear producto'}}
    };

    function gxDecorateCatalogProducts(){
        const rows=document.querySelectorAll('#global-services-container tr');
        rows.forEach((row,index)=>{
            const s=window.configGlobal?.serviciosGlobales?.[index];if(!s)return;
            const td=row.querySelector('td');if(!td)return;
            td.querySelector('.gx-catalog-access-meta')?.remove();
            if(s.tipo_producto==='combo'){
                const comps=componentsOf(s.id).reduce((n,c)=>n+Number(c.cantidad||1),0);
                td.insertAdjacentHTML('beforeend',`<div class="gx-catalog-access-meta"><span class="gx-catalog-combo-badge">COMBO · ${comps} accesos</span><span class="gx-access-mode-badge ${s.modo_acceso||'mixto'}">${String(s.modo_acceso||'mixto').toUpperCase()}</span></div>`);
                return;
            }
            const mode=s.modo_acceso||'compartido';
            td.insertAdjacentHTML('beforeend',`<div class="gx-catalog-access-meta"><span class="gx-access-mode-badge ${mode}">${mode==='invitacion'?'INVITACIÓN / CUENTA PERSONAL':'CUENTA COMPARTIDA'}</span><select class="gx-access-mode-select" onchange="gxChangeServiceAccessMode('${esc(s.id)}',this.value,this)"><option value="compartido" ${mode==='compartido'?'selected':''}>Cuenta compartida</option><option value="invitacion" ${mode==='invitacion'?'selected':''}>Invitación / cuenta personal</option></select></div>`);
        });
    }

    window.gxChangeServiceAccessMode=async function(serviceId,mode,select){
        const previous=(gxAccessModel.servicios||[]).find(s=>String(s.id)===String(serviceId))?.modo_acceso||'compartido';
        if(mode===previous)return;
        const label=mode==='invitacion'?'Invitación / cuenta personal':'Cuenta compartida';
        if(!confirm(`Cambiar el tipo de acceso a “${label}”

Esto cambia qué campos administra GOXION para esta plataforma, pero no modifica precios ni servicios contratados. ¿Continuar?`)){select.value=previous;return}
        try{
            await gxAccessCall('cambiar_modo_servicio',{servicio_id:serviceId,modo_acceso:mode});
            gxAccessModelLoaded=false;await gxLoadAccessModel(true);renderGlobalServicesUI();gxDecorateClientAccessCards();
        }catch(e){select.value=previous;alert(`No se pudo cambiar el tipo de acceso.\n\n${e?.message||e}`)}
    };

    // Sustituir alta legacy por constructor inteligente. No modifica edición existente.
    window.addGlobalService=window.gxOpenProductBuilder;
    try{ addGlobalService=window.gxOpenProductBuilder; }catch{}
    window.gxAddCatalogServiceMobile=window.gxOpenProductBuilder;

    const oldRenderClients=window.renderizarClientes||renderizarClientes;
    if(typeof oldRenderClients==='function'){
        window.renderizarClientes=function(...args){const r=oldRenderClients.apply(this,args);setTimeout(gxDecorateClientAccessCards,0);return r};
        try{renderizarClientes=window.renderizarClientes}catch{}
    }
    const oldRenderCatalog=window.renderGlobalServicesUI||renderGlobalServicesUI;
    if(typeof oldRenderCatalog==='function'){
        window.renderGlobalServicesUI=function(...args){const r=oldRenderCatalog.apply(this,args);setTimeout(gxDecorateCatalogProducts,0);return r};
        try{renderGlobalServicesUI=window.renderGlobalServicesUI}catch{}
    }

    const oldInit=window.inicializarPanel||inicializarPanel;
    if(typeof oldInit==='function'){
        window.inicializarPanel=async function(...args){const r=await oldInit.apply(this,args);try{await gxLoadAccessModel(true);await gxRunAccessDiagnostic()}catch(e){console.error('Accesos:',e)}return r};
        try{inicializarPanel=window.inicializarPanel}catch{}
    }

    const gxOldAccountPlatformChanged=window.gxAccountPlatformChanged;
    if(typeof gxOldAccountPlatformChanged==='function'){
        window.gxAccountPlatformChanged=function(...args){
            const r=gxOldAccountPlatformChanged.apply(this,args);
            setTimeout(gxRenderPlatformDetected,0);
            return r;
        };
    }

    const gxOldRenderPlatformAccounts=window.gxRenderPlatformAccounts;
    if(typeof gxOldRenderPlatformAccounts==='function'){
        window.gxRenderPlatformAccounts=function(...args){
            const r=gxOldRenderPlatformAccounts.apply(this,args);
            gxAccessModel.cuentas=(window.gxPlatformAccountState?.cuentas||[]).map(a=>({...a}));
            setTimeout(()=>{gxRenderPlatformDetected();gxDecorateClientAccessCards()},0);
            return r;
        };
    }

    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('gx-product-builder')?.classList.contains('show'))gxCloseProductBuilder(e)});
})();