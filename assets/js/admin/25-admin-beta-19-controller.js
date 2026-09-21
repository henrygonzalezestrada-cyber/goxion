(()=>{
  const GXCORE=window.GOXION_CORE;
  if(!GXCORE) throw new Error('GOXION_CORE no disponible en promociones Admin.');
  const PROMO_URL=GXCORE.endpoint("promociones-admin-beta");
  let promoState={servicios:[],promociones:[]};

  window.gxOpenManagementDestination=function(dest){
    if(dest==='catalog'){gxOpenCatalogMode('services');return;}
    if(dest==='promotions'){gxOpenCatalogMode('promotions');return;}
    if(dest==='registration'){window.gxOpenRegistrationControl?.();return;}
    window.gxOpenMoreDestination?.(dest);
    setTimeout(()=>gxSetSettingsContext(dest),80);
  };
  function gxSetSettingsContext(dest){
    const map={missions:['Misiones','Plantillas, rondas y recompensas.'],loyalty:['Lealtad','Niveles, rachas y ajustes.'],fairdeal:['Trato Justo','Compensaciones del periodo afectado.'],accounts:['Accesos','Cuentas madre y distribución.'],credentials:['Credenciales','Contraseñas y entregas seguras.'],app:['Experiencia','Comportamiento visible de la app.'],alerts:['Incidencias','Avisos operativos para clientes.']};
    const pair=map[dest];if(!pair)return;const tab=document.getElementById('tab-ajustes');if(!tab)return;const h=tab.querySelector('.gx-page-heading h1'),p=tab.querySelector('.gx-page-heading p');if(h)h.textContent=pair[0];if(p)p.textContent=pair[1];
  }

  const gxSettingsView19Base=window.gxSettingsView;
  window.gxSettingsView=function(view,btn){
    const r=typeof gxSettingsView19Base==='function'?gxSettingsView19Base.call(this,view,btn):undefined;
    gxSetSettingsContext(view);
    return r;
  };

  window.gxOpenCatalogMode=function(mode,btn){
    goAdminTab('tab-catalogo');
    const services=document.getElementById('gx-catalog-services-view');
    const promos=document.getElementById('gx-catalog-promotions-view');
    document.querySelectorAll('[data-gx-catalog-mode]').forEach(x=>x.classList.toggle('active',x.dataset.gxCatalogMode===mode));
    if(services){services.classList.toggle('active',mode==='services');services.hidden=mode!=='services';}
    if(promos){promos.classList.toggle('active',mode==='promotions');promos.hidden=mode!=='promotions';}
    if(mode==='promotions')gxPromoLoad();
  };

  async function promoApi(accion,datos={}){
    const token=localStorage.getItem(GXCORE.STORAGE.ADMIN_TOKEN)||'';
    const r=await fetch(PROMO_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':token},body:JSON.stringify({accion,datos})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j?.ok!==true)throw new Error(j?.error||`HTTP ${r.status}`);
    return j;
  }
  const money=v=>Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function fmtDate(v){try{return new Date(v).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return '—'}}
  function localInput(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`}

  window.gxPromoLoad=async function(){
    const list=document.getElementById('gx-promo-list');if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{const r=await promoApi('listar');promoState={servicios:r.servicios||[],promociones:r.promociones||[]};gxPromoPopulateServices();gxPromoRender();}
    catch(e){console.error(e);list.innerHTML=`<div class="gx-empty-inline">No se pudieron cargar promociones: ${esc(e?.message||e)}</div>`;}
  };
  function gxPromoPopulateServices(){const sel=document.getElementById('gx-promo-service');if(!sel)return;sel.innerHTML=promoState.servicios.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)} · $${money(s.precio)}</option>`).join('');}
  function gxPromoRender(){
    const list=document.getElementById('gx-promo-list');if(!list)return;
    if(!promoState.promociones.length){list.innerHTML='<div class="gx-empty-inline">Todavía no hay promociones. El precio normal del catálogo sigue siendo la única referencia.</div>';return;}
    list.innerHTML=promoState.promociones.map(p=>{
      const s=p.servicio||{},state=String(p.estado_visual||'pausada');
      const duration=Number(p.duracion_periodos||1)===1?'solo primer mes':`${Number(p.duracion_periodos||1)} periodos`;
      const flags=[p.oferta_flash?'Oferta Flash':'',p.mostrar_contador?'timer':''].filter(Boolean).join(' · ');
      return `<article class="gx-promo-row"><div class="gx-promo-main"><strong>${esc(s.nombre||'Servicio')}</strong><div class="gx-promo-price"><s>$${money(s.precio)}</s><b>$${money(p.precio_promocional)}</b></div><small>${duration} · ${fmtDate(p.inicio)} → ${fmtDate(p.fin)}${flags?` · ${flags}`:''}</small></div><div class="gx-promo-state"><span class="${esc(state)}">${esc(state)}</span><button onclick="gxPromoEdit('${esc(p.id)}')">Editar</button></div><button class="gx-secondary-action" onclick="gxPromoToggle('${esc(p.id)}',${p.activa===true?'false':'true'})">${p.activa===true?'Pausar':'Activar'}</button></article>`;
    }).join('');
  }
  window.gxPromoOpenEditor=function(p=null){
    const ed=document.getElementById('gx-promo-editor');if(!ed)return;gxPromoPopulateServices();ed.hidden=false;
    document.getElementById('gx-promo-id').value=p?.id||'';document.getElementById('gx-promo-editor-title').textContent=p?'Editar promoción':'Nueva promoción';
    if(p){document.getElementById('gx-promo-service').value=p.servicio_id||'';document.getElementById('gx-promo-name').value=p.nombre||'';document.getElementById('gx-promo-price').value=p.precio_promocional||'';document.getElementById('gx-promo-periods').value=String(p.duracion_periodos||1);document.getElementById('gx-promo-start').value=localInput(p.inicio);document.getElementById('gx-promo-end').value=localInput(p.fin);document.getElementById('gx-promo-old-price').checked=p.mostrar_precio_anterior!==false;document.getElementById('gx-promo-flash').checked=p.oferta_flash===true;document.getElementById('gx-promo-countdown').checked=p.mostrar_contador===true;document.getElementById('gx-promo-active').checked=p.activa!==false;}
    else{const now=new Date(),end=new Date(now.getTime()+48*3600000);document.getElementById('gx-promo-name').value='';document.getElementById('gx-promo-price').value='';document.getElementById('gx-promo-periods').value='1';document.getElementById('gx-promo-start').value=localInput(now);document.getElementById('gx-promo-end').value=localInput(end);document.getElementById('gx-promo-old-price').checked=true;document.getElementById('gx-promo-flash').checked=false;document.getElementById('gx-promo-countdown').checked=false;document.getElementById('gx-promo-active').checked=true;}
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.gxPromoCloseEditor=function(){const ed=document.getElementById('gx-promo-editor');if(ed)ed.hidden=true;};
  window.gxPromoEdit=function(id){const p=promoState.promociones.find(x=>String(x.id)===String(id));if(p)gxPromoOpenEditor(p);};
  window.gxPromoSave=async function(){
    const btn=document.getElementById('gx-promo-save');const data={id:document.getElementById('gx-promo-id')?.value||'',servicio_id:document.getElementById('gx-promo-service')?.value||'',nombre:document.getElementById('gx-promo-name')?.value||'',precio_promocional:Number(document.getElementById('gx-promo-price')?.value||0),duracion_periodos:Number(document.getElementById('gx-promo-periods')?.value||1),inicio:document.getElementById('gx-promo-start')?.value||'',fin:document.getElementById('gx-promo-end')?.value||'',mostrar_precio_anterior:document.getElementById('gx-promo-old-price')?.checked===true,oferta_flash:document.getElementById('gx-promo-flash')?.checked===true,mostrar_contador:document.getElementById('gx-promo-countdown')?.checked===true,activa:document.getElementById('gx-promo-active')?.checked===true};
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{await promoApi('guardar',data);gxPromoCloseEditor();await gxPromoLoad();}
    catch(e){alert(`No se pudo guardar la promoción.\n\n${e?.message||e}`)}finally{if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}}
  };
  window.gxPromoToggle=async function(id,activa){try{await promoApi('cambiar_estado',{id,activa});await gxPromoLoad();}catch(e){alert(`No se pudo cambiar el estado.\n\n${e?.message||e}`)}};

  window.gxUpdateExperiencePreview=function(){const on=document.getElementById('combo-active')?.checked===true;const module=document.getElementById('gx-app-preview-module');const copy=document.getElementById('gx-app-preview-copy');if(module)module.style.opacity=on?'1':'.28';if(copy)copy.textContent=on?'El Combo GOXION está habilitado para mostrarse cuando corresponda.':'El módulo comercial está oculto actualmente.';};
  window.gxUpdateIncidentPreview=function(){const active=document.getElementById('alert-active')?.checked===true,platform=document.getElementById('alert-platform')?.selectedOptions?.[0]?.textContent||'Plataforma',type=document.getElementById('alert-type')?.value||'',msg=document.getElementById('global-msg')?.value?.trim()||'';const title=document.getElementById('gx-alert-preview-title'),copy=document.getElementById('gx-alert-preview-copy');if(title)title.textContent=active?platform:'Sin incidencia activa';if(copy)copy.textContent=active?`${type}${msg?`. ${msg}`:''}`:'Cuando actives una incidencia, la vista del cliente aparecerá aquí.';};

  function focusOverview(key){
    const c=typeof clientesDict!=='undefined'?clientesDict?.[key]:null,box=document.getElementById('gx-focus-overview');if(!c||!box)return;
    const ec=c.estado_cuenta||{},services=(c.servicios||[]);
    const total=Number(ec?.total_actual ?? services.reduce((s,x)=>s+Number(x?.monto||0),0));
    const base=Number(ec?.subtotal ?? services.reduce((s,x)=>s+Number(x?.monto||0),0));
    const mora=Number(ec?.cargos?.mora||0),react=Number(ec?.cargos?.reactivacion||0);
    const loyal=Number(ec?.lealtad?.pagos_efectivos??c.pagos_puntuales??0);
    const period=String(ec?.periodo_label || (typeof gxPeriodLabel==='function'?gxPeriodLabel(c.periodo_pendiente):String(c.periodo_pendiente||'').slice(0,7)) || 'Periodo actual');
    const dueDay=Number(ec?.dia_pago??c.dia_pago??15);
    const billingState=String(ec?.estado||'').toLowerCase();
    const timing=typeof gxPaymentTiming==='function'?gxPaymentTiming(c):{type:'none',days:0};
    const clientId=String(c?._id||c?.id||'');
    const accessRows=(window.gxAccessModelBeta?.accesos||[]).filter(a=>a.activo!==false&&String(a.cliente_id||'')===clientId);
    const pendingAccess=accessRows.filter(a=>{
      const mode=String(a.modo_acceso||'compartido');
      return mode==='invitacion'
        ? (!String(a.correo_override||'').trim() || !a.estado_invitacion || a.estado_invitacion==='sin_verificar')
        : !a.cuenta_id;
    }).length;
    const stateLabel=billingState==='pagado'?'Al corriente'
      :billingState==='revision'?'Pago en revisión'
      :billingState==='incompleto'?'Pago incompleto'
      :billingState==='vencido'?`Vencido${Number(ec?.dias_atraso||0)>0?` · ${Number(ec.dias_atraso)}d`:''}`
      :billingState==='vence_hoy'?'Vence hoy'
      :billingState==='por_vencer'?'Por vencer'
      :(c.estado==='suspendido'?'Suspendido':'Pendiente');
    const stateClass=billingState==='pagado'?'ok':billingState==='revision'?'review':billingState==='vencido'?'danger':billingState==='incompleto'?'warn':'neutral';
    const loyaltyLabel=loyal>=9?'Nivel 2 · 6%':loyal>=4?'Nivel 1 · 3%':`${loyal} pago${loyal===1?'':'s'}`;
    const attention=[];
    if(mora>0)attention.push(`Mora $${money(mora)}`);
    if(react>0)attention.push(`Reactivación $${money(react)}`);
    if(pendingAccess>0)attention.push(`${pendingAccess} acceso${pendingAccess===1?'':'s'} pendiente${pendingAccess===1?'':'s'}`);
    if(c.pago_en_revision)attention.unshift('Comprobante por revisar');
    else if(timing.type==='overdue'&&!attention.length)attention.push(`Cobro vencido ${Number(timing.days||0)} día${Number(timing.days||0)===1?'':'s'}`);
    const attentionText=attention.length?attention.join(' · '):'Sin alertas operativas';
    box.innerHTML=`
      <section class="gx-overview-dashboard">
        <div class="gx-overview-hero">
          <div>
            <span class="gx-overview-kicker">Total actual</span>
            <strong>$${money(total)}</strong>
            <small>Base mensual $${money(base)}</small>
          </div>
          <span class="gx-overview-state ${stateClass}">${esc(stateLabel)}</span>
        </div>
        <div class="gx-overview-facts">
          <div><span>Periodo</span><strong>${esc(period)}</strong></div>
          <div><span>Día de pago</span><strong>${dueDay}</strong></div>
          <div><span>Servicios</span><strong>${services.length}</strong></div>
          <div><span>Lealtad</span><strong>${esc(loyaltyLabel)}</strong></div>
        </div>
        <div class="gx-overview-attention ${attention.length?'has-alert':''}">
          <span>${attention.length?'Atención':'Estado'}</span>
          <strong>${esc(attentionText)}</strong>
        </div>
        <div class="gx-overview-actions">
          <button class="primary" onclick="gxFocusSection('billing',document.querySelector('[data-gx-focus-section=\'billing\']'))">Ver cobro</button>
          <button onclick="enviarMensaje('${String(c.nombre||'').replace(/'/g,"\'")}','${String(key).replace(/'/g,"\'")}')">Mensaje</button>
        </div>
      </section>`;
  }
  window.gxFocusSection=function(section,btn){const f=document.getElementById('gx-client-focus'),body=document.getElementById('gx-focus-body'),overview=document.getElementById('gx-focus-overview');if(!f||!body)return;document.querySelectorAll('[data-gx-focus-section]').forEach(x=>x.classList.toggle('active',x.dataset.gxFocusSection===section));if(overview)overview.hidden=section!=='summary';body.querySelectorAll('[data-gx-section]').forEach(x=>x.classList.toggle('gx-focus-section-active',x.dataset.gxSection===section));f.dataset.gxFocusSection=section;};
  function setupFocus(key){const f=document.getElementById('gx-client-focus');if(!f?.classList.contains('show'))return;f.classList.add('gx-focus-v3');f.dataset.gxClientKey=key;focusOverview(key);gxFocusSection('summary');}
  const currentOpen=window.gxOpenClientFocus;if(typeof currentOpen==='function')window.gxOpenClientFocus=function(key,...args){const r=currentOpen.call(this,key,...args);setTimeout(()=>setupFocus(key),90);return r;};
  const currentOpenSection=window.gxOpenClientSection;window.gxOpenClientSection=function(section,...args){if(document.getElementById('gx-client-focus')?.classList.contains('show')&&['summary','billing','services','benefits','account'].includes(section)){gxFocusSection(section);return;}return typeof currentOpenSection==='function'?currentOpenSection.call(this,section,...args):undefined;};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{gxUpdateExperiencePreview();gxUpdateIncidentPreview();},700));
})();