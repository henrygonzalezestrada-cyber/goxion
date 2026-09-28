(()=>{
  const GXCORE=window.GOXION_CORE;
  if(!GXCORE) throw new Error('GOXION_CORE no disponible en Promotions Studio.');

  const PROMO_URL=GXCORE.endpoint('promociones-admin-beta');
  const MECHANICS={
    precio_fijo:{label:'Precio temporal',icon:'$',hint:'Precio final durante varios periodos'},
    porcentaje:{label:'Porcentaje',icon:'%',hint:'Descuento porcentual sobre una plataforma'},
    combo:{label:'Combo',icon:'＋',hint:'Varias plataformas por un precio conjunto'},
    addon:{label:'Add-on',icon:'↗',hint:'Una plataforma habilita complementos a precio especial'}
  };
  const AUDIENCES={
    todos:'Todos los clientes',
    nuevos:'Nuevos clientes',
    actuales:'Clientes actuales',
    con_servicio:'Ya tienen una plataforma',
    sin_servicio:'No tienen una plataforma',
    lealtad_1:'Lealtad Nivel 1+',
    lealtad_2:'Lealtad Nivel 2'
  };

  let studio={servicios:[],promociones:[]};
  let editing=null;

  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:2});
  const service=id=>studio.servicios.find(s=>String(s.id)===String(id));
  const serviceOptions=(selected='')=>studio.servicios.map(s=>'<option value="'+esc(s.id)+'" '+(String(s.id)===String(selected)?'selected':'')+'>'+esc(s.nombre)+' · $'+money(s.precio)+'</option>').join('');

  function localInput(v){
    if(!v)return'';
    const d=new Date(v);
    if(Number.isNaN(d.getTime()))return'';
    const z=n=>String(n).padStart(2,'0');
    return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+'T'+z(d.getHours())+':'+z(d.getMinutes());
  }
  function fmtDate(v){
    try{return new Date(v).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
    catch{return'—'}
  }
  function mechanicLabel(v){return MECHANICS[v]?.label||MECHANICS.precio_fijo.label}

  async function promoRead(){
    const token=localStorage.getItem(GXCORE.STORAGE.ADMIN_TOKEN)||'';
    const r=await fetch(PROMO_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Admin-Token':token},
      body:JSON.stringify({accion:'listar',datos:{}})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j?.ok!==true)throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }

  function populateSharedSelects(){
    const sel=byId('gx-promo-audience-service');
    if(!sel)return;
    const current=sel.value;
    sel.innerHTML='<option value="">Selecciona una plataforma</option>'+serviceOptions(current);
  }

  function renderStats(){
    const set=(id,v)=>{const x=byId(id);if(x)x.textContent=String(v)};
    set('gx-promo-stat-total',studio.promociones.length);
    set('gx-promo-stat-active',studio.promociones.filter(p=>p.estado_visual==='activa').length);
    set('gx-promo-stat-scheduled',studio.promociones.filter(p=>p.estado_visual==='programada').length);
    set('gx-promo-stat-ready',studio.promociones.filter(p=>p.estado_visual==='lista').length);
  }

  function itemNames(p){
    const names=(p?.items||[]).map(x=>x?.servicio?.nombre||service(x.servicio_id)?.nombre).filter(Boolean);
    return names.length?names.join(' + '):(p?.servicio?.nombre||'Sin plataforma');
  }

  function priceLine(p){
    const type=String(p?.mecanica||'precio_fijo');
    const untilEnd=p?.duracion_tipo==='hasta_fin_campana';
    if(type==='porcentaje')return money(p.descuento_porcentaje)+'% OFF · 

  window.gxPromoLoad=async function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{
      const r=await promoRead();
      studio={servicios:r.servicios||[],promociones:r.promociones||[]};
      populateSharedSelects();
      renderStats();
      window.gxPromoRender();
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="gx-empty-inline">No se pudieron cargar promociones: '+esc(e?.message||e)+'</div>';
    }
  };

  window.gxPromoRender=function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    const q=String(byId('gx-promo-search')?.value||'').trim().toLowerCase();
    const mech=String(byId('gx-promo-filter-mechanic')?.value||'');
    const state=String(byId('gx-promo-filter-state')?.value||'');

    const rows=studio.promociones.filter(p=>{
      if(mech&&String(p.mecanica)!==mech)return false;
      if(state&&String(p.estado_visual)!==state)return false;
      if(q){
        const hay=(String(p.nombre||'')+' '+String(p.titulo_publico||'')+' '+itemNames(p)).toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="gx-empty-inline">No hay promociones que coincidan con estos filtros.</div>';
      return;
    }

    list.innerHTML=rows.map(p=>{
      const type=String(p.mecanica||'precio_fijo');
      const periods=Number(p.duracion_periodos||1);
      const durationText=p.duracion_tipo==='hasta_fin_campana'
        ?'Hasta fin de campaña'
        :(periods+' periodo'+(periods===1?'':'s'));
      const flags=[
        p.oferta_flash?'Flash':'',
        p.mostrar_contador?'Timer':'',
        p.destacada?'Destacada':'',
        p.notificar_cliente?'Notificación preparada':'',
        p.adquisicion_habilitada?'Contratable':(p.publicada?'Sólo visible':'')
      ].filter(Boolean);
      return '<article class="gx-promo-row gx-promo-studio-row">'+
        '<div class="gx-promo-type-mark"><b>'+esc(MECHANICS[type]?.icon||'$')+'</b><span>'+esc(mechanicLabel(type))+'</span></div>'+
        '<div class="gx-promo-main">'+
          '<div class="gx-promo-row-title"><strong>'+esc(p.nombre||'Promoción')+'</strong><span class="gx-promo-state-chip '+esc(p.estado_visual||'lista')+'">'+esc(p.estado_visual||'lista')+'</span></div>'+
          '<small>'+esc(itemNames(p))+'</small>'+
          '<div class="gx-promo-row-meta"><b>'+esc(priceLine(p))+'</b><span>'+esc(durationText)+' · '+esc(AUDIENCES[p.audiencia]||AUDIENCES.todos)+'</span></div>'+
          '<div class="gx-promo-row-foot"><span>'+fmtDate(p.inicio)+' → '+fmtDate(p.fin)+'</span><span>'+(p.publicada?'Publicada':'No publicada')+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div>'+
        '</div>'+
        '<div class="gx-promo-row-actions">'+
          '<button onclick="gxPromoEdit(\''+esc(p.id)+'\')" type="button">Editar</button>'+
          '<button onclick="gxPromoDuplicate(\''+esc(p.id)+'\')" type="button">Duplicar</button>'+
          '<button class="'+(p.activa===true?'pause':'')+'" onclick="gxPromoToggle(\''+esc(p.id)+'\','+(p.activa===true?'false':'true')+')" type="button">'+(p.activa===true?'Pausar':'Activar')+'</button>'+
        '</div>'+
      '</article>';
    }).join('');
  };

  function blankPromo(){
    const now=new Date(),end=new Date(now.getTime()+7*24*3600000);
    return {
      id:'',mecanica:'precio_fijo',nombre:'',titulo_publico:'',descripcion_publica:'',badge:'PROMO',
      precio_promocional:'',descuento_porcentaje:'',duracion_periodos:1,duracion_tipo:'periodos',
      inicio:now.toISOString(),fin:end.toISOString(),
      mostrar_precio_anterior:true,mostrar_contador:false,oferta_flash:false,activa:true,
      audiencia:'todos',segmentacion:{},
      acumulacion:{lealtad:true,trato_justo:true,beneficios_programados:false,bienvenida:false},
      destacada:false,notificar_cliente:false,publicada:false,adquisicion_habilitada:false,prioridad:0,items:[]
    };
  }

  window.gxPromoOpenEditor=function(input=null){
    const ed=byId('gx-promo-editor');
    if(!ed)return;
    editing=input?JSON.parse(JSON.stringify(input)):blankPromo();

    byId('gx-promo-id').value=editing.id||'';
    byId('gx-promo-editor-title').textContent=editing.id?'Editar promoción':'Nueva promoción';
    byId('gx-promo-editor-subtitle').textContent=editing.id
      ?('Revisión '+Number(editing.revision||1)+' · las futuras adquisiciones conservarán su propia fotografía comercial.')
      :'Define la mecánica y GOXION adapta el resto del formulario.';
    byId('gx-promo-name').value=editing.nombre||'';
    byId('gx-promo-public-title').value=editing.titulo_publico||'';
    byId('gx-promo-public-description').value=editing.descripcion_publica||'';
    byId('gx-promo-badge').value=editing.badge||'';
    byId('gx-promo-priority').value=String(editing.prioridad||0);
    byId('gx-promo-price').value=editing.precio_promocional??'';
    byId('gx-promo-percent').value=editing.descuento_porcentaje??'';
    byId('gx-promo-periods').value=editing.duracion_tipo==='hasta_fin_campana'
      ?'campaign_end'
      :String(editing.duracion_periodos||1);
    byId('gx-promo-start').value=localInput(editing.inicio);
    byId('gx-promo-end').value=localInput(editing.fin);
    byId('gx-promo-audience').value=editing.audiencia||'todos';

    populateSharedSelects();
    byId('gx-promo-audience-service').value=editing.segmentacion?.servicio_id||'';

    byId('gx-promo-stack-loyalty').checked=editing.acumulacion?.lealtad!==false;
    byId('gx-promo-stack-fairdeal').checked=editing.acumulacion?.trato_justo!==false;
    byId('gx-promo-stack-benefits').checked=editing.acumulacion?.beneficios_programados===true;
    byId('gx-promo-stack-welcome').checked=editing.acumulacion?.bienvenida===true;

    byId('gx-promo-old-price').checked=editing.mostrar_precio_anterior!==false;
    byId('gx-promo-flash').checked=editing.oferta_flash===true;
    byId('gx-promo-countdown').checked=editing.mostrar_contador===true;
    byId('gx-promo-featured').checked=editing.destacada===true;
    byId('gx-promo-notify').checked=editing.notificar_cliente===true;
    byId('gx-promo-published').checked=editing.publicada===true;
    byId('gx-promo-acquisition').checked=editing.adquisicion_habilitada===true;
    byId('gx-promo-active').checked=editing.activa!==false;

    byId('gx-promo-delete').hidden=!editing.id;
    byId('gx-promo-duplicate').hidden=!editing.id;

    window.gxPromoSetMechanic(editing.mecanica||'precio_fijo',null,editing);
    window.gxPromoAudienceChanged();
    window.gxPromoPublicationChanged();
    window.gxPromoUpdatePreview();

    ed.hidden=false;
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.gxPromoCloseEditor=function(){
    const ed=byId('gx-promo-editor');
    if(ed)ed.hidden=true;
    editing=null;
  };

  window.gxPromoEdit=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(p)window.gxPromoOpenEditor(p);
  };

  window.gxPromoDuplicate=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(!p)return;
    const copy=JSON.parse(JSON.stringify(p));
    copy.id='';
    copy.nombre=(copy.nombre||'Promoción')+' · copia';
    copy.publicada=false;
    copy.adquisicion_habilitada=false;
    copy.activa=true;
    copy.revision=1;
    window.gxPromoOpenEditor(copy);
  };

  window.gxPromoDuplicateCurrent=function(){
    if(editing?.id)window.gxPromoDuplicate(editing.id);
  };

  window.gxPromoSetMechanic=function(type,btn=null,model=null){
    const mech=MECHANICS[type]?type:'precio_fijo';
    byId('gx-promo-mechanic').value=mech;
    document.querySelectorAll('[data-gx-promo-mechanic]').forEach(x=>x.classList.toggle('active',x.dataset.gxPromoMechanic===mech));

    const priceWrap=byId('gx-promo-price-wrap');
    const pctWrap=byId('gx-promo-percent-wrap');
    if(priceWrap)priceWrap.hidden=mech==='porcentaje';
    if(pctWrap)pctWrap.hidden=mech!=='porcentaje';

    renderMechanicFields(mech,model||editing||blankPromo());
    updatePriceLabel();
    window.gxPromoUpdatePreview();
  };

  function renderMechanicFields(mech,model){
    const host=byId('gx-promo-mechanic-fields');
    if(!host)return;
    const items=Array.isArray(model?.items)?model.items:[];

    if(mech==='precio_fijo'||mech==='porcentaje'){
      const selected=items[0]?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
      host.innerHTML='<label class="gx-promo-mechanic-single"><span>Plataforma</span><select id="gx-promo-single-service" onchange="gxPromoUpdatePreview()">'+serviceOptions(selected)+'</select></label>';
      return;
    }

    if(mech==='combo'){
      const selected=new Set(items.map(x=>String(x.servicio_id)));
      host.innerHTML=
        '<div class="gx-promo-service-picker-head"><div><strong>Plataformas del combo</strong><small>Selecciona dos o más. El precio normal se suma automáticamente.</small></div><span id="gx-promo-selection-count">0 seleccionadas</span></div>'+
        '<div class="gx-promo-service-picker">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-service-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div>';
      window.gxPromoSelectionChanged();
      return;
    }

    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
    const selected=new Set(items.filter(x=>x.rol==='complemento').map(x=>String(x.servicio_id)));
    host.innerHTML=
      '<div class="gx-promo-addon-grid">'+
        '<label><span>Plataforma disparadora</span><select id="gx-promo-addon-trigger" onchange="gxPromoSelectionChanged()">'+serviceOptions(trigger)+'</select></label>'+
        '<div><span>Complementos con precio especial</span><div class="gx-promo-service-picker compact">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-addon-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div></div>'+
      '</div>';
    window.gxPromoSelectionChanged();
  }

  window.gxPromoSelectionChanged=function(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='combo'){
      const checks=[...document.querySelectorAll('[data-gx-promo-service-check]:checked')];
      const count=byId('gx-promo-selection-count');
      if(count)count.textContent=checks.length+' seleccionada'+(checks.length===1?'':'s');
    }
    if(mech==='addon'){
      const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
      document.querySelectorAll('[data-gx-promo-addon-check]').forEach(x=>{
        x.disabled=String(x.value)===trigger;
        if(x.disabled)x.checked=false;
      });
    }
    window.gxPromoUpdatePreview();
  };

  window.gxPromoAudienceChanged=function(){
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const wrap=byId('gx-promo-audience-service-wrap');
    if(wrap)wrap.hidden=!(audience==='con_servicio'||audience==='sin_servicio');
  };

  window.gxPromoPublicationChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition){
      acquisition.disabled=!published;
      if(!published)acquisition.checked=false;
    }
    const note=byId('gx-promo-acquisition-note');
    if(note){
      const strong=note.querySelector('strong');
      const small=note.querySelector('small');
      if(strong)strong.textContent=published?'Campaña visible en catálogo':'Campaña todavía privada';
      if(small)small.textContent=published
        ?'Puedes dejarla sólo visible o habilitar adquisición para que clientes elegibles puedan contratarla.'
        :'Publica la campaña antes de permitir adquisiciones. Guardarla sin publicar no la mostrará en Ayuda.';
    }
    window.gxPromoUpdatePreview?.();
  };

  window.gxPromoAcquisitionChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition?.checked===true&&!published){
      acquisition.checked=false;
    }
    window.gxPromoUpdatePreview?.();
  };

  function durationMode(){
    return byId('gx-promo-periods')?.value==='campaign_end'?'hasta_fin_campana':'periodos';
  }

  function updatePriceLabel(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const untilEnd=durationMode()==='hasta_fin_campana';
    const label=byId('gx-promo-price-label');
    if(!label)return;
    label.textContent=
      mech==='addon'?'Precio adicional por periodo':
      (mech==='combo'
        ?(untilEnd?'Precio del combo por periodo':'Precio total del combo')
        :(untilEnd?'Precio promocional por periodo':'Precio total de la promoción'));
  }

  window.gxPromoDurationChanged=function(){
    updatePriceLabel();
    window.gxPromoUpdatePreview();
  };

  function collectItems(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='precio_fijo'||mech==='porcentaje'){
      const id=String(byId('gx-promo-single-service')?.value||'');
      return id?[{servicio_id:id,rol:'principal',orden:0}]:[];
    }
    if(mech==='combo'){
      return [...document.querySelectorAll('[data-gx-promo-service-check]:checked')]
        .map((x,i)=>({servicio_id:String(x.value),rol:'incluido',orden:i}));
    }
    const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
    const complements=[...document.querySelectorAll('[data-gx-promo-addon-check]:checked')]
      .map(x=>String(x.value)).filter(x=>x&&x!==trigger);
    return [
      ...(trigger?[{servicio_id:trigger,rol:'disparador',orden:0}]:[]),
      ...complements.map((id,i)=>({servicio_id:id,rol:'complemento',orden:i+1}))
    ];
  }

  function previewNumbers(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const mode=durationMode();
    const periods=mode==='periodos'?Math.max(1,Number(byId('gx-promo-periods')?.value||1)):1;
    const normalPeriod=items.reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const complementPeriod=items.filter(x=>x.rol==='complemento').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const triggerPeriod=items.filter(x=>x.rol==='disparador').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const pct=Number(byId('gx-promo-percent')?.value||0);
    const inputPrice=Number(byId('gx-promo-price')?.value||0);

    let normalTotal=normalPeriod;
    let offerPeriod=inputPrice;
    let offerTotal=inputPrice;
    let saving=0;

    if((mech==='precio_fijo'||mech==='combo')&&mode==='hasta_fin_campana'){
      normalTotal=normalPeriod;
      offerPeriod=inputPrice;
      offerTotal=inputPrice;
      saving=Math.max(0,normalPeriod-inputPrice);
    }else if(mech==='precio_fijo'||mech==='combo'){
      normalTotal=normalPeriod*periods;
      offerTotal=inputPrice;
      offerPeriod=periods>0?inputPrice/periods:inputPrice;
      saving=Math.max(0,normalTotal-offerTotal);
    }else if(mech==='porcentaje'){
      offerPeriod=(normalPeriod>0&&pct>0)?Math.round(normalPeriod*(1-pct/100)*100)/100:0;
      normalTotal=mode==='hasta_fin_campana'?normalPeriod:normalPeriod*periods;
      offerTotal=mode==='hasta_fin_campana'?offerPeriod:Math.round(offerPeriod*periods*100)/100;
      saving=Math.max(0,normalTotal-offerTotal);
    }else{
      normalTotal=mode==='hasta_fin_campana'?normalPeriod:normalPeriod*periods;
      offerPeriod=inputPrice;
      offerTotal=mode==='hasta_fin_campana'
        ?Math.round((triggerPeriod+inputPrice)*100)/100
        :Math.round((triggerPeriod+inputPrice)*periods*100)/100;
      saving=mode==='hasta_fin_campana'
        ?Math.max(0,complementPeriod-inputPrice)
        :Math.max(0,(complementPeriod-inputPrice)*periods);
    }

    return {
      mech,mode,items,periods,pct,
      normalPeriod,normalTotal,
      complementPeriod,triggerPeriod,
      offerPeriod,offerTotal,saving
    };
  }

  window.gxPromoUpdatePreview=function(){
    const card=byId('gx-promo-preview');
    const facts=byId('gx-promo-preview-facts');
    if(!card)return;

    updatePriceLabel();
    const x=previewNumbers();
    const title=String(byId('gx-promo-public-title')?.value||byId('gx-promo-name')?.value||'Nueva promoción').trim();
    const description=String(byId('gx-promo-public-description')?.value||MECHANICS[x.mech]?.hint||'').trim();
    const badge=String(byId('gx-promo-badge')?.value||mechanicLabel(x.mech)).trim();
    const names=x.items.map(i=>service(i.servicio_id)?.nombre).filter(Boolean);

    let price='Define el valor';
    if(x.mech==='porcentaje'&&x.pct>0)price=money(x.pct)+'% OFF · $'+money(x.offerTotal)+(x.mode==='hasta_fin_campana'?' / periodo':'');
    else if(x.mech==='addon'&&x.offerPeriod>0)price='+$'+money(x.offerPeriod)+' / periodo';
    else if(x.offerTotal>0)price='$'+money(x.offerTotal)+(x.mode==='hasta_fin_campana'?' / periodo':'');

    card.innerHTML=
      '<span>'+esc(badge||'PROMO')+'</span>'+
      '<strong>'+esc(title)+'</strong>'+
      '<p>'+esc(description||names.join(' + ')||'Selecciona las plataformas.')+'</p>'+
      '<div><b>'+esc(price)+'</b>'+(x.normalTotal>0&&x.mech!=='addon'?'<s>$'+money(x.normalTotal)+(x.mode==='hasta_fin_campana'?' / periodo':'')+'</s>':'')+'</div>';

    if(facts){
      const audience=AUDIENCES[byId('gx-promo-audience')?.value]||AUDIENCES.todos;
      const equivalent=x.mode==='periodos'&&(x.mech==='precio_fijo'||x.mech==='combo')&&x.offerTotal>0&&x.periods>1
        ?' · equiv. $'+money(x.offerPeriod)+'/periodo'
        :'';
      const durationText=x.mode==='hasta_fin_campana'
        ?'Hasta finalizar campaña'
        :(x.periods+' periodo'+(x.periods===1?'':'s')+equivalent);
      const savingLabel=x.mode==='hasta_fin_campana'?'Ahorro por periodo':'Ahorro total';
      facts.innerHTML=
        '<div><span>Composición</span><strong>'+esc(names.join(' + ')||'Pendiente')+'</strong></div>'+
        '<div><span>'+savingLabel+'</span><strong>$'+money(x.saving)+'</strong></div>'+
        '<div><span>Duración</span><strong>'+durationText+'</strong></div>'+
        '<div><span>Audiencia</span><strong>'+esc(audience)+'</strong></div>';
    }
  };

  function collectData(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const durationValue=String(byId('gx-promo-periods')?.value||'1');
    const duracion_tipo=durationValue==='campaign_end'?'hasta_fin_campana':'periodos';
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const segmentacion=(audience==='con_servicio'||audience==='sin_servicio')
      ?{servicio_id:String(byId('gx-promo-audience-service')?.value||'')}
      :{};
    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||'';
    const complements=items.filter(x=>x.rol==='complemento').map(x=>x.servicio_id);

    return {
      id:byId('gx-promo-id')?.value||'',
      mecanica:mech,
      nombre:byId('gx-promo-name')?.value||'',
      titulo_publico:byId('gx-promo-public-title')?.value||'',
      descripcion_publica:byId('gx-promo-public-description')?.value||'',
      badge:byId('gx-promo-badge')?.value||'',
      prioridad:Number(byId('gx-promo-priority')?.value||0),
      items,
      servicio_id:items[0]?.servicio_id||'',
      servicio_disparador_id:trigger,
      servicios_complemento_ids:complements,
      precio_promocional:Number(byId('gx-promo-price')?.value||0),
      descuento_porcentaje:Number(byId('gx-promo-percent')?.value||0),
      duracion_periodos:duracion_tipo==='periodos'?Math.max(1,Number(durationValue||1)):1,
      duracion_tipo,
      inicio:byId('gx-promo-start')?.value||'',
      fin:byId('gx-promo-end')?.value||'',
      audiencia:audience,
      segmentacion,
      acumulacion:{
        lealtad:byId('gx-promo-stack-loyalty')?.checked===true,
        trato_justo:byId('gx-promo-stack-fairdeal')?.checked===true,
        beneficios_programados:byId('gx-promo-stack-benefits')?.checked===true,
        bienvenida:byId('gx-promo-stack-welcome')?.checked===true
      },
      mostrar_precio_anterior:byId('gx-promo-old-price')?.checked===true,
      oferta_flash:byId('gx-promo-flash')?.checked===true,
      mostrar_contador:byId('gx-promo-countdown')?.checked===true,
      destacada:byId('gx-promo-featured')?.checked===true,
      notificar_cliente:byId('gx-promo-notify')?.checked===true,
      publicada:byId('gx-promo-published')?.checked===true,
      adquisicion_habilitada:
        byId('gx-promo-published')?.checked===true &&
        byId('gx-promo-acquisition')?.checked===true,
      activa:byId('gx-promo-active')?.checked===true
    };
  }

  window.gxPromoSave=async function(){
    const btn=byId('gx-promo-save');
    const data=collectData();

    if(!String(data.nombre).trim())return alert('Agrega un nombre interno para identificar la campaña.');
    if(!data.items.length)return alert('Selecciona las plataformas de la promoción.');
    if(data.mecanica==='combo'&&data.items.length<2)return alert('Un combo necesita al menos dos plataformas.');
    if(data.mecanica==='addon'&&!data.servicios_complemento_ids.length)return alert('Selecciona al menos un complemento.');
    if((data.audiencia==='con_servicio'||data.audiencia==='sin_servicio')&&!data.segmentacion.servicio_id)return alert('Selecciona la plataforma usada para segmentar.');
    if(data.adquisicion_habilitada===true&&data.publicada!==true)return alert('Publica la campaña antes de habilitar adquisiciones.');

    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.savePromotion(data);
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo guardar la promoción.\n\n'+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}
    }
  };

  window.gxPromoToggle=async function(id,activa){
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id,activa});
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo cambiar el estado.\n\n'+(e?.message||e));
    }
  };

  window.gxPromoDeleteCurrent=async function(){
    const id=String(byId('gx-promo-id')?.value||'');
    if(!id)return;
    if(!confirm('¿Eliminar esta promoción? Si ya tuviera una adquisición histórica, GOXION la desactivará en lugar de borrarla.'))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.deletePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.deletePromotion({id});
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo eliminar la promoción.\n\n'+(e?.message||e));
    }
  };
})();+money(p.precio_promocional_total??p.precio_promocional)+(untilEnd?' / periodo':'');
    if(type==='addon')return 'Complemento +

  window.gxPromoLoad=async function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{
      const r=await promoRead();
      studio={servicios:r.servicios||[],promociones:r.promociones||[]};
      populateSharedSelects();
      renderStats();
      window.gxPromoRender();
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="gx-empty-inline">No se pudieron cargar promociones: '+esc(e?.message||e)+'</div>';
    }
  };

  window.gxPromoRender=function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    const q=String(byId('gx-promo-search')?.value||'').trim().toLowerCase();
    const mech=String(byId('gx-promo-filter-mechanic')?.value||'');
    const state=String(byId('gx-promo-filter-state')?.value||'');

    const rows=studio.promociones.filter(p=>{
      if(mech&&String(p.mecanica)!==mech)return false;
      if(state&&String(p.estado_visual)!==state)return false;
      if(q){
        const hay=(String(p.nombre||'')+' '+String(p.titulo_publico||'')+' '+itemNames(p)).toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="gx-empty-inline">No hay promociones que coincidan con estos filtros.</div>';
      return;
    }

    list.innerHTML=rows.map(p=>{
      const type=String(p.mecanica||'precio_fijo');
      const periods=Number(p.duracion_periodos||1);
      const flags=[
        p.oferta_flash?'Flash':'',
        p.mostrar_contador?'Timer':'',
        p.destacada?'Destacada':'',
        p.notificar_cliente?'Notificación preparada':'',
        p.adquisicion_habilitada?'Contratable':(p.publicada?'Sólo visible':'')
      ].filter(Boolean);
      return '<article class="gx-promo-row gx-promo-studio-row">'+
        '<div class="gx-promo-type-mark"><b>'+esc(MECHANICS[type]?.icon||'$')+'</b><span>'+esc(mechanicLabel(type))+'</span></div>'+
        '<div class="gx-promo-main">'+
          '<div class="gx-promo-row-title"><strong>'+esc(p.nombre||'Promoción')+'</strong><span class="gx-promo-state-chip '+esc(p.estado_visual||'lista')+'">'+esc(p.estado_visual||'lista')+'</span></div>'+
          '<small>'+esc(itemNames(p))+'</small>'+
          '<div class="gx-promo-row-meta"><b>'+esc(priceLine(p))+'</b><span>'+periods+' periodo'+(periods===1?'':'s')+' · '+esc(AUDIENCES[p.audiencia]||AUDIENCES.todos)+'</span></div>'+
          '<div class="gx-promo-row-foot"><span>'+fmtDate(p.inicio)+' → '+fmtDate(p.fin)+'</span><span>'+(p.publicada?'Publicada':'No publicada')+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div>'+
        '</div>'+
        '<div class="gx-promo-row-actions">'+
          '<button onclick="gxPromoEdit(\''+esc(p.id)+'\')" type="button">Editar</button>'+
          '<button onclick="gxPromoDuplicate(\''+esc(p.id)+'\')" type="button">Duplicar</button>'+
          '<button class="'+(p.activa===true?'pause':'')+'" onclick="gxPromoToggle(\''+esc(p.id)+'\','+(p.activa===true?'false':'true')+')" type="button">'+(p.activa===true?'Pausar':'Activar')+'</button>'+
        '</div>'+
      '</article>';
    }).join('');
  };

  function blankPromo(){
    const now=new Date(),end=new Date(now.getTime()+7*24*3600000);
    return {
      id:'',mecanica:'precio_fijo',nombre:'',titulo_publico:'',descripcion_publica:'',badge:'PROMO',
      precio_promocional:'',descuento_porcentaje:'',duracion_periodos:1,
      inicio:now.toISOString(),fin:end.toISOString(),
      mostrar_precio_anterior:true,mostrar_contador:false,oferta_flash:false,activa:true,
      audiencia:'todos',segmentacion:{},
      acumulacion:{lealtad:true,trato_justo:true,beneficios_programados:false,bienvenida:false},
      destacada:false,notificar_cliente:false,publicada:false,adquisicion_habilitada:false,prioridad:0,items:[]
    };
  }

  window.gxPromoOpenEditor=function(input=null){
    const ed=byId('gx-promo-editor');
    if(!ed)return;
    editing=input?JSON.parse(JSON.stringify(input)):blankPromo();

    byId('gx-promo-id').value=editing.id||'';
    byId('gx-promo-editor-title').textContent=editing.id?'Editar promoción':'Nueva promoción';
    byId('gx-promo-editor-subtitle').textContent=editing.id
      ?('Revisión '+Number(editing.revision||1)+' · las futuras adquisiciones conservarán su propia fotografía comercial.')
      :'Define la mecánica y GOXION adapta el resto del formulario.';
    byId('gx-promo-name').value=editing.nombre||'';
    byId('gx-promo-public-title').value=editing.titulo_publico||'';
    byId('gx-promo-public-description').value=editing.descripcion_publica||'';
    byId('gx-promo-badge').value=editing.badge||'';
    byId('gx-promo-priority').value=String(editing.prioridad||0);
    byId('gx-promo-price').value=editing.precio_promocional??'';
    byId('gx-promo-percent').value=editing.descuento_porcentaje??'';
    byId('gx-promo-periods').value=String(editing.duracion_periodos||1);
    byId('gx-promo-start').value=localInput(editing.inicio);
    byId('gx-promo-end').value=localInput(editing.fin);
    byId('gx-promo-audience').value=editing.audiencia||'todos';

    populateSharedSelects();
    byId('gx-promo-audience-service').value=editing.segmentacion?.servicio_id||'';

    byId('gx-promo-stack-loyalty').checked=editing.acumulacion?.lealtad!==false;
    byId('gx-promo-stack-fairdeal').checked=editing.acumulacion?.trato_justo!==false;
    byId('gx-promo-stack-benefits').checked=editing.acumulacion?.beneficios_programados===true;
    byId('gx-promo-stack-welcome').checked=editing.acumulacion?.bienvenida===true;

    byId('gx-promo-old-price').checked=editing.mostrar_precio_anterior!==false;
    byId('gx-promo-flash').checked=editing.oferta_flash===true;
    byId('gx-promo-countdown').checked=editing.mostrar_contador===true;
    byId('gx-promo-featured').checked=editing.destacada===true;
    byId('gx-promo-notify').checked=editing.notificar_cliente===true;
    byId('gx-promo-published').checked=editing.publicada===true;
    byId('gx-promo-acquisition').checked=editing.adquisicion_habilitada===true;
    byId('gx-promo-active').checked=editing.activa!==false;

    byId('gx-promo-delete').hidden=!editing.id;
    byId('gx-promo-duplicate').hidden=!editing.id;

    window.gxPromoSetMechanic(editing.mecanica||'precio_fijo',null,editing);
    window.gxPromoAudienceChanged();
    window.gxPromoPublicationChanged();
    window.gxPromoUpdatePreview();

    ed.hidden=false;
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.gxPromoCloseEditor=function(){
    const ed=byId('gx-promo-editor');
    if(ed)ed.hidden=true;
    editing=null;
  };

  window.gxPromoEdit=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(p)window.gxPromoOpenEditor(p);
  };

  window.gxPromoDuplicate=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(!p)return;
    const copy=JSON.parse(JSON.stringify(p));
    copy.id='';
    copy.nombre=(copy.nombre||'Promoción')+' · copia';
    copy.publicada=false;
    copy.adquisicion_habilitada=false;
    copy.activa=true;
    copy.revision=1;
    window.gxPromoOpenEditor(copy);
  };

  window.gxPromoDuplicateCurrent=function(){
    if(editing?.id)window.gxPromoDuplicate(editing.id);
  };

  window.gxPromoSetMechanic=function(type,btn=null,model=null){
    const mech=MECHANICS[type]?type:'precio_fijo';
    byId('gx-promo-mechanic').value=mech;
    document.querySelectorAll('[data-gx-promo-mechanic]').forEach(x=>x.classList.toggle('active',x.dataset.gxPromoMechanic===mech));

    const priceWrap=byId('gx-promo-price-wrap');
    const pctWrap=byId('gx-promo-percent-wrap');
    const priceLabel=byId('gx-promo-price-label');
    if(priceWrap)priceWrap.hidden=mech==='porcentaje';
    if(pctWrap)pctWrap.hidden=mech!=='porcentaje';
    if(priceLabel)priceLabel.textContent=
      mech==='addon'?'Precio adicional por periodo':
      (mech==='combo'?'Precio total del combo':'Precio total de la promoción');

    renderMechanicFields(mech,model||editing||blankPromo());
    window.gxPromoUpdatePreview();
  };

  function renderMechanicFields(mech,model){
    const host=byId('gx-promo-mechanic-fields');
    if(!host)return;
    const items=Array.isArray(model?.items)?model.items:[];

    if(mech==='precio_fijo'||mech==='porcentaje'){
      const selected=items[0]?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
      host.innerHTML='<label class="gx-promo-mechanic-single"><span>Plataforma</span><select id="gx-promo-single-service" onchange="gxPromoUpdatePreview()">'+serviceOptions(selected)+'</select></label>';
      return;
    }

    if(mech==='combo'){
      const selected=new Set(items.map(x=>String(x.servicio_id)));
      host.innerHTML=
        '<div class="gx-promo-service-picker-head"><div><strong>Plataformas del combo</strong><small>Selecciona dos o más. El precio normal se suma automáticamente.</small></div><span id="gx-promo-selection-count">0 seleccionadas</span></div>'+
        '<div class="gx-promo-service-picker">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-service-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div>';
      window.gxPromoSelectionChanged();
      return;
    }

    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
    const selected=new Set(items.filter(x=>x.rol==='complemento').map(x=>String(x.servicio_id)));
    host.innerHTML=
      '<div class="gx-promo-addon-grid">'+
        '<label><span>Plataforma disparadora</span><select id="gx-promo-addon-trigger" onchange="gxPromoSelectionChanged()">'+serviceOptions(trigger)+'</select></label>'+
        '<div><span>Complementos con precio especial</span><div class="gx-promo-service-picker compact">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-addon-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div></div>'+
      '</div>';
    window.gxPromoSelectionChanged();
  }

  window.gxPromoSelectionChanged=function(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='combo'){
      const checks=[...document.querySelectorAll('[data-gx-promo-service-check]:checked')];
      const count=byId('gx-promo-selection-count');
      if(count)count.textContent=checks.length+' seleccionada'+(checks.length===1?'':'s');
    }
    if(mech==='addon'){
      const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
      document.querySelectorAll('[data-gx-promo-addon-check]').forEach(x=>{
        x.disabled=String(x.value)===trigger;
        if(x.disabled)x.checked=false;
      });
    }
    window.gxPromoUpdatePreview();
  };

  window.gxPromoAudienceChanged=function(){
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const wrap=byId('gx-promo-audience-service-wrap');
    if(wrap)wrap.hidden=!(audience==='con_servicio'||audience==='sin_servicio');
  };

  window.gxPromoPublicationChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition){
      acquisition.disabled=!published;
      if(!published)acquisition.checked=false;
    }
    const note=byId('gx-promo-acquisition-note');
    if(note){
      const strong=note.querySelector('strong');
      const small=note.querySelector('small');
      if(strong)strong.textContent=published?'Campaña visible en catálogo':'Campaña todavía privada';
      if(small)small.textContent=published
        ?'Puedes dejarla sólo visible o habilitar adquisición para que clientes elegibles puedan contratarla.'
        :'Publica la campaña antes de permitir adquisiciones. Guardarla sin publicar no la mostrará en Ayuda.';
    }
    window.gxPromoUpdatePreview?.();
  };

  window.gxPromoAcquisitionChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition?.checked===true&&!published){
      acquisition.checked=false;
    }
    window.gxPromoUpdatePreview?.();
  };

  function collectItems(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='precio_fijo'||mech==='porcentaje'){
      const id=String(byId('gx-promo-single-service')?.value||'');
      return id?[{servicio_id:id,rol:'principal',orden:0}]:[];
    }
    if(mech==='combo'){
      return [...document.querySelectorAll('[data-gx-promo-service-check]:checked')]
        .map((x,i)=>({servicio_id:String(x.value),rol:'incluido',orden:i}));
    }
    const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
    const complements=[...document.querySelectorAll('[data-gx-promo-addon-check]:checked')]
      .map(x=>String(x.value)).filter(x=>x&&x!==trigger);
    return [
      ...(trigger?[{servicio_id:trigger,rol:'disparador',orden:0}]:[]),
      ...complements.map((id,i)=>({servicio_id:id,rol:'complemento',orden:i+1}))
    ];
  }

  function previewNumbers(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const periods=Math.max(1,Number(byId('gx-promo-periods')?.value||1));
    const normalPeriod=items.reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const complementPeriod=items.filter(x=>x.rol==='complemento').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const triggerPeriod=items.filter(x=>x.rol==='disparador').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const pct=Number(byId('gx-promo-percent')?.value||0);
    const inputPrice=Number(byId('gx-promo-price')?.value||0);

    let normalTotal=normalPeriod;
    let offerPeriod=inputPrice;
    let offerTotal=inputPrice;
    let saving=0;

    if(mech==='precio_fijo'||mech==='combo'){
      normalTotal=normalPeriod*periods;
      offerTotal=inputPrice;
      offerPeriod=periods>0?inputPrice/periods:inputPrice;
      saving=Math.max(0,normalTotal-offerTotal);
    }else if(mech==='porcentaje'){
      offerPeriod=(normalPeriod>0&&pct>0)?Math.round(normalPeriod*(1-pct/100)*100)/100:0;
      normalTotal=normalPeriod*periods;
      offerTotal=Math.round(offerPeriod*periods*100)/100;
      saving=Math.max(0,normalTotal-offerTotal);
    }else{
      normalTotal=normalPeriod*periods;
      offerPeriod=inputPrice;
      offerTotal=Math.round((triggerPeriod+inputPrice)*periods*100)/100;
      saving=Math.max(0,(complementPeriod-inputPrice)*periods);
    }

    return {
      mech,items,periods,pct,
      normalPeriod,normalTotal,
      complementPeriod,triggerPeriod,
      offerPeriod,offerTotal,saving
    };
  }

  window.gxPromoUpdatePreview=function(){
    const card=byId('gx-promo-preview');
    const facts=byId('gx-promo-preview-facts');
    if(!card)return;

    const x=previewNumbers();
    const title=String(byId('gx-promo-public-title')?.value||byId('gx-promo-name')?.value||'Nueva promoción').trim();
    const description=String(byId('gx-promo-public-description')?.value||MECHANICS[x.mech]?.hint||'').trim();
    const badge=String(byId('gx-promo-badge')?.value||mechanicLabel(x.mech)).trim();
    const names=x.items.map(i=>service(i.servicio_id)?.nombre).filter(Boolean);

    let price='Define el valor';
    if(x.mech==='porcentaje'&&x.pct>0)price=money(x.pct)+'% OFF · $'+money(x.offerTotal);
    else if(x.mech==='addon'&&x.offerPeriod>0)price='+$'+money(x.offerPeriod)+' / periodo';
    else if(x.offerTotal>0)price='$'+money(x.offerTotal);

    card.innerHTML=
      '<span>'+esc(badge||'PROMO')+'</span>'+
      '<strong>'+esc(title)+'</strong>'+
      '<p>'+esc(description||names.join(' + ')||'Selecciona las plataformas.')+'</p>'+
      '<div><b>'+esc(price)+'</b>'+(x.normalTotal>0&&x.mech!=='addon'?'<s>$'+money(x.normalTotal)+'</s>':'')+'</div>';

    if(facts){
      const audience=AUDIENCES[byId('gx-promo-audience')?.value]||AUDIENCES.todos;
      const periods=x.periods;
      const equivalent=(x.mech==='precio_fijo'||x.mech==='combo')&&x.offerTotal>0&&periods>1
        ?' · equiv. $'+money(x.offerPeriod)+'/periodo'
        :'';
      facts.innerHTML=
        '<div><span>Composición</span><strong>'+esc(names.join(' + ')||'Pendiente')+'</strong></div>'+
        '<div><span>Ahorro total</span><strong>$'+money(x.saving)+'</strong></div>'+
        '<div><span>Duración</span><strong>'+periods+' periodo'+(periods===1?'':'s')+equivalent+'</strong></div>'+
        '<div><span>Audiencia</span><strong>'+esc(audience)+'</strong></div>';
    }
  };

  function collectData(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const segmentacion=(audience==='con_servicio'||audience==='sin_servicio')
      ?{servicio_id:String(byId('gx-promo-audience-service')?.value||'')}
      :{};
    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||'';
    const complements=items.filter(x=>x.rol==='complemento').map(x=>x.servicio_id);

    return {
      id:byId('gx-promo-id')?.value||'',
      mecanica:mech,
      nombre:byId('gx-promo-name')?.value||'',
      titulo_publico:byId('gx-promo-public-title')?.value||'',
      descripcion_publica:byId('gx-promo-public-description')?.value||'',
      badge:byId('gx-promo-badge')?.value||'',
      prioridad:Number(byId('gx-promo-priority')?.value||0),
      items,
      servicio_id:items[0]?.servicio_id||'',
      servicio_disparador_id:trigger,
      servicios_complemento_ids:complements,
      precio_promocional:Number(byId('gx-promo-price')?.value||0),
      descuento_porcentaje:Number(byId('gx-promo-percent')?.value||0),
      duracion_periodos:Number(byId('gx-promo-periods')?.value||1),
      inicio:byId('gx-promo-start')?.value||'',
      fin:byId('gx-promo-end')?.value||'',
      audiencia:audience,
      segmentacion,
      acumulacion:{
        lealtad:byId('gx-promo-stack-loyalty')?.checked===true,
        trato_justo:byId('gx-promo-stack-fairdeal')?.checked===true,
        beneficios_programados:byId('gx-promo-stack-benefits')?.checked===true,
        bienvenida:byId('gx-promo-stack-welcome')?.checked===true
      },
      mostrar_precio_anterior:byId('gx-promo-old-price')?.checked===true,
      oferta_flash:byId('gx-promo-flash')?.checked===true,
      mostrar_contador:byId('gx-promo-countdown')?.checked===true,
      destacada:byId('gx-promo-featured')?.checked===true,
      notificar_cliente:byId('gx-promo-notify')?.checked===true,
      publicada:byId('gx-promo-published')?.checked===true,
      adquisicion_habilitada:
        byId('gx-promo-published')?.checked===true &&
        byId('gx-promo-acquisition')?.checked===true,
      activa:byId('gx-promo-active')?.checked===true
    };
  }

  window.gxPromoSave=async function(){
    const btn=byId('gx-promo-save');
    const data=collectData();

    if(!String(data.nombre).trim())return alert('Agrega un nombre interno para identificar la campaña.');
    if(!data.items.length)return alert('Selecciona las plataformas de la promoción.');
    if(data.mecanica==='combo'&&data.items.length<2)return alert('Un combo necesita al menos dos plataformas.');
    if(data.mecanica==='addon'&&!data.servicios_complemento_ids.length)return alert('Selecciona al menos un complemento.');
    if((data.audiencia==='con_servicio'||data.audiencia==='sin_servicio')&&!data.segmentacion.servicio_id)return alert('Selecciona la plataforma usada para segmentar.');
    if(data.adquisicion_habilitada===true&&data.publicada!==true)return alert('Publica la campaña antes de habilitar adquisiciones.');

    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.savePromotion(data);
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo guardar la promoción.\n\n'+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}
    }
  };

  window.gxPromoToggle=async function(id,activa){
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id,activa});
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo cambiar el estado.\n\n'+(e?.message||e));
    }
  };

  window.gxPromoDeleteCurrent=async function(){
    const id=String(byId('gx-promo-id')?.value||'');
    if(!id)return;
    if(!confirm('¿Eliminar esta promoción? Si ya tuviera una adquisición histórica, GOXION la desactivará en lugar de borrarla.'))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.deletePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.deletePromotion({id});
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo eliminar la promoción.\n\n'+(e?.message||e));
    }
  };
})();+money(p.precio_promocional)+' / periodo';
    return '

  window.gxPromoLoad=async function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{
      const r=await promoRead();
      studio={servicios:r.servicios||[],promociones:r.promociones||[]};
      populateSharedSelects();
      renderStats();
      window.gxPromoRender();
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="gx-empty-inline">No se pudieron cargar promociones: '+esc(e?.message||e)+'</div>';
    }
  };

  window.gxPromoRender=function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    const q=String(byId('gx-promo-search')?.value||'').trim().toLowerCase();
    const mech=String(byId('gx-promo-filter-mechanic')?.value||'');
    const state=String(byId('gx-promo-filter-state')?.value||'');

    const rows=studio.promociones.filter(p=>{
      if(mech&&String(p.mecanica)!==mech)return false;
      if(state&&String(p.estado_visual)!==state)return false;
      if(q){
        const hay=(String(p.nombre||'')+' '+String(p.titulo_publico||'')+' '+itemNames(p)).toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="gx-empty-inline">No hay promociones que coincidan con estos filtros.</div>';
      return;
    }

    list.innerHTML=rows.map(p=>{
      const type=String(p.mecanica||'precio_fijo');
      const periods=Number(p.duracion_periodos||1);
      const flags=[
        p.oferta_flash?'Flash':'',
        p.mostrar_contador?'Timer':'',
        p.destacada?'Destacada':'',
        p.notificar_cliente?'Notificación preparada':'',
        p.adquisicion_habilitada?'Contratable':(p.publicada?'Sólo visible':'')
      ].filter(Boolean);
      return '<article class="gx-promo-row gx-promo-studio-row">'+
        '<div class="gx-promo-type-mark"><b>'+esc(MECHANICS[type]?.icon||'$')+'</b><span>'+esc(mechanicLabel(type))+'</span></div>'+
        '<div class="gx-promo-main">'+
          '<div class="gx-promo-row-title"><strong>'+esc(p.nombre||'Promoción')+'</strong><span class="gx-promo-state-chip '+esc(p.estado_visual||'lista')+'">'+esc(p.estado_visual||'lista')+'</span></div>'+
          '<small>'+esc(itemNames(p))+'</small>'+
          '<div class="gx-promo-row-meta"><b>'+esc(priceLine(p))+'</b><span>'+periods+' periodo'+(periods===1?'':'s')+' · '+esc(AUDIENCES[p.audiencia]||AUDIENCES.todos)+'</span></div>'+
          '<div class="gx-promo-row-foot"><span>'+fmtDate(p.inicio)+' → '+fmtDate(p.fin)+'</span><span>'+(p.publicada?'Publicada':'No publicada')+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div>'+
        '</div>'+
        '<div class="gx-promo-row-actions">'+
          '<button onclick="gxPromoEdit(\''+esc(p.id)+'\')" type="button">Editar</button>'+
          '<button onclick="gxPromoDuplicate(\''+esc(p.id)+'\')" type="button">Duplicar</button>'+
          '<button class="'+(p.activa===true?'pause':'')+'" onclick="gxPromoToggle(\''+esc(p.id)+'\','+(p.activa===true?'false':'true')+')" type="button">'+(p.activa===true?'Pausar':'Activar')+'</button>'+
        '</div>'+
      '</article>';
    }).join('');
  };

  function blankPromo(){
    const now=new Date(),end=new Date(now.getTime()+7*24*3600000);
    return {
      id:'',mecanica:'precio_fijo',nombre:'',titulo_publico:'',descripcion_publica:'',badge:'PROMO',
      precio_promocional:'',descuento_porcentaje:'',duracion_periodos:1,
      inicio:now.toISOString(),fin:end.toISOString(),
      mostrar_precio_anterior:true,mostrar_contador:false,oferta_flash:false,activa:true,
      audiencia:'todos',segmentacion:{},
      acumulacion:{lealtad:true,trato_justo:true,beneficios_programados:false,bienvenida:false},
      destacada:false,notificar_cliente:false,publicada:false,adquisicion_habilitada:false,prioridad:0,items:[]
    };
  }

  window.gxPromoOpenEditor=function(input=null){
    const ed=byId('gx-promo-editor');
    if(!ed)return;
    editing=input?JSON.parse(JSON.stringify(input)):blankPromo();

    byId('gx-promo-id').value=editing.id||'';
    byId('gx-promo-editor-title').textContent=editing.id?'Editar promoción':'Nueva promoción';
    byId('gx-promo-editor-subtitle').textContent=editing.id
      ?('Revisión '+Number(editing.revision||1)+' · las futuras adquisiciones conservarán su propia fotografía comercial.')
      :'Define la mecánica y GOXION adapta el resto del formulario.';
    byId('gx-promo-name').value=editing.nombre||'';
    byId('gx-promo-public-title').value=editing.titulo_publico||'';
    byId('gx-promo-public-description').value=editing.descripcion_publica||'';
    byId('gx-promo-badge').value=editing.badge||'';
    byId('gx-promo-priority').value=String(editing.prioridad||0);
    byId('gx-promo-price').value=editing.precio_promocional??'';
    byId('gx-promo-percent').value=editing.descuento_porcentaje??'';
    byId('gx-promo-periods').value=String(editing.duracion_periodos||1);
    byId('gx-promo-start').value=localInput(editing.inicio);
    byId('gx-promo-end').value=localInput(editing.fin);
    byId('gx-promo-audience').value=editing.audiencia||'todos';

    populateSharedSelects();
    byId('gx-promo-audience-service').value=editing.segmentacion?.servicio_id||'';

    byId('gx-promo-stack-loyalty').checked=editing.acumulacion?.lealtad!==false;
    byId('gx-promo-stack-fairdeal').checked=editing.acumulacion?.trato_justo!==false;
    byId('gx-promo-stack-benefits').checked=editing.acumulacion?.beneficios_programados===true;
    byId('gx-promo-stack-welcome').checked=editing.acumulacion?.bienvenida===true;

    byId('gx-promo-old-price').checked=editing.mostrar_precio_anterior!==false;
    byId('gx-promo-flash').checked=editing.oferta_flash===true;
    byId('gx-promo-countdown').checked=editing.mostrar_contador===true;
    byId('gx-promo-featured').checked=editing.destacada===true;
    byId('gx-promo-notify').checked=editing.notificar_cliente===true;
    byId('gx-promo-published').checked=editing.publicada===true;
    byId('gx-promo-acquisition').checked=editing.adquisicion_habilitada===true;
    byId('gx-promo-active').checked=editing.activa!==false;

    byId('gx-promo-delete').hidden=!editing.id;
    byId('gx-promo-duplicate').hidden=!editing.id;

    window.gxPromoSetMechanic(editing.mecanica||'precio_fijo',null,editing);
    window.gxPromoAudienceChanged();
    window.gxPromoPublicationChanged();
    window.gxPromoUpdatePreview();

    ed.hidden=false;
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.gxPromoCloseEditor=function(){
    const ed=byId('gx-promo-editor');
    if(ed)ed.hidden=true;
    editing=null;
  };

  window.gxPromoEdit=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(p)window.gxPromoOpenEditor(p);
  };

  window.gxPromoDuplicate=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(!p)return;
    const copy=JSON.parse(JSON.stringify(p));
    copy.id='';
    copy.nombre=(copy.nombre||'Promoción')+' · copia';
    copy.publicada=false;
    copy.adquisicion_habilitada=false;
    copy.activa=true;
    copy.revision=1;
    window.gxPromoOpenEditor(copy);
  };

  window.gxPromoDuplicateCurrent=function(){
    if(editing?.id)window.gxPromoDuplicate(editing.id);
  };

  window.gxPromoSetMechanic=function(type,btn=null,model=null){
    const mech=MECHANICS[type]?type:'precio_fijo';
    byId('gx-promo-mechanic').value=mech;
    document.querySelectorAll('[data-gx-promo-mechanic]').forEach(x=>x.classList.toggle('active',x.dataset.gxPromoMechanic===mech));

    const priceWrap=byId('gx-promo-price-wrap');
    const pctWrap=byId('gx-promo-percent-wrap');
    const priceLabel=byId('gx-promo-price-label');
    if(priceWrap)priceWrap.hidden=mech==='porcentaje';
    if(pctWrap)pctWrap.hidden=mech!=='porcentaje';
    if(priceLabel)priceLabel.textContent=
      mech==='addon'?'Precio adicional por periodo':
      (mech==='combo'?'Precio total del combo':'Precio total de la promoción');

    renderMechanicFields(mech,model||editing||blankPromo());
    window.gxPromoUpdatePreview();
  };

  function renderMechanicFields(mech,model){
    const host=byId('gx-promo-mechanic-fields');
    if(!host)return;
    const items=Array.isArray(model?.items)?model.items:[];

    if(mech==='precio_fijo'||mech==='porcentaje'){
      const selected=items[0]?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
      host.innerHTML='<label class="gx-promo-mechanic-single"><span>Plataforma</span><select id="gx-promo-single-service" onchange="gxPromoUpdatePreview()">'+serviceOptions(selected)+'</select></label>';
      return;
    }

    if(mech==='combo'){
      const selected=new Set(items.map(x=>String(x.servicio_id)));
      host.innerHTML=
        '<div class="gx-promo-service-picker-head"><div><strong>Plataformas del combo</strong><small>Selecciona dos o más. El precio normal se suma automáticamente.</small></div><span id="gx-promo-selection-count">0 seleccionadas</span></div>'+
        '<div class="gx-promo-service-picker">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-service-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div>';
      window.gxPromoSelectionChanged();
      return;
    }

    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
    const selected=new Set(items.filter(x=>x.rol==='complemento').map(x=>String(x.servicio_id)));
    host.innerHTML=
      '<div class="gx-promo-addon-grid">'+
        '<label><span>Plataforma disparadora</span><select id="gx-promo-addon-trigger" onchange="gxPromoSelectionChanged()">'+serviceOptions(trigger)+'</select></label>'+
        '<div><span>Complementos con precio especial</span><div class="gx-promo-service-picker compact">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-addon-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div></div>'+
      '</div>';
    window.gxPromoSelectionChanged();
  }

  window.gxPromoSelectionChanged=function(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='combo'){
      const checks=[...document.querySelectorAll('[data-gx-promo-service-check]:checked')];
      const count=byId('gx-promo-selection-count');
      if(count)count.textContent=checks.length+' seleccionada'+(checks.length===1?'':'s');
    }
    if(mech==='addon'){
      const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
      document.querySelectorAll('[data-gx-promo-addon-check]').forEach(x=>{
        x.disabled=String(x.value)===trigger;
        if(x.disabled)x.checked=false;
      });
    }
    window.gxPromoUpdatePreview();
  };

  window.gxPromoAudienceChanged=function(){
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const wrap=byId('gx-promo-audience-service-wrap');
    if(wrap)wrap.hidden=!(audience==='con_servicio'||audience==='sin_servicio');
  };

  window.gxPromoPublicationChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition){
      acquisition.disabled=!published;
      if(!published)acquisition.checked=false;
    }
    const note=byId('gx-promo-acquisition-note');
    if(note){
      const strong=note.querySelector('strong');
      const small=note.querySelector('small');
      if(strong)strong.textContent=published?'Campaña visible en catálogo':'Campaña todavía privada';
      if(small)small.textContent=published
        ?'Puedes dejarla sólo visible o habilitar adquisición para que clientes elegibles puedan contratarla.'
        :'Publica la campaña antes de permitir adquisiciones. Guardarla sin publicar no la mostrará en Ayuda.';
    }
    window.gxPromoUpdatePreview?.();
  };

  window.gxPromoAcquisitionChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition?.checked===true&&!published){
      acquisition.checked=false;
    }
    window.gxPromoUpdatePreview?.();
  };

  function collectItems(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='precio_fijo'||mech==='porcentaje'){
      const id=String(byId('gx-promo-single-service')?.value||'');
      return id?[{servicio_id:id,rol:'principal',orden:0}]:[];
    }
    if(mech==='combo'){
      return [...document.querySelectorAll('[data-gx-promo-service-check]:checked')]
        .map((x,i)=>({servicio_id:String(x.value),rol:'incluido',orden:i}));
    }
    const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
    const complements=[...document.querySelectorAll('[data-gx-promo-addon-check]:checked')]
      .map(x=>String(x.value)).filter(x=>x&&x!==trigger);
    return [
      ...(trigger?[{servicio_id:trigger,rol:'disparador',orden:0}]:[]),
      ...complements.map((id,i)=>({servicio_id:id,rol:'complemento',orden:i+1}))
    ];
  }

  function previewNumbers(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const periods=Math.max(1,Number(byId('gx-promo-periods')?.value||1));
    const normalPeriod=items.reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const complementPeriod=items.filter(x=>x.rol==='complemento').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const triggerPeriod=items.filter(x=>x.rol==='disparador').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const pct=Number(byId('gx-promo-percent')?.value||0);
    const inputPrice=Number(byId('gx-promo-price')?.value||0);

    let normalTotal=normalPeriod;
    let offerPeriod=inputPrice;
    let offerTotal=inputPrice;
    let saving=0;

    if(mech==='precio_fijo'||mech==='combo'){
      normalTotal=normalPeriod*periods;
      offerTotal=inputPrice;
      offerPeriod=periods>0?inputPrice/periods:inputPrice;
      saving=Math.max(0,normalTotal-offerTotal);
    }else if(mech==='porcentaje'){
      offerPeriod=(normalPeriod>0&&pct>0)?Math.round(normalPeriod*(1-pct/100)*100)/100:0;
      normalTotal=normalPeriod*periods;
      offerTotal=Math.round(offerPeriod*periods*100)/100;
      saving=Math.max(0,normalTotal-offerTotal);
    }else{
      normalTotal=normalPeriod*periods;
      offerPeriod=inputPrice;
      offerTotal=Math.round((triggerPeriod+inputPrice)*periods*100)/100;
      saving=Math.max(0,(complementPeriod-inputPrice)*periods);
    }

    return {
      mech,items,periods,pct,
      normalPeriod,normalTotal,
      complementPeriod,triggerPeriod,
      offerPeriod,offerTotal,saving
    };
  }

  window.gxPromoUpdatePreview=function(){
    const card=byId('gx-promo-preview');
    const facts=byId('gx-promo-preview-facts');
    if(!card)return;

    const x=previewNumbers();
    const title=String(byId('gx-promo-public-title')?.value||byId('gx-promo-name')?.value||'Nueva promoción').trim();
    const description=String(byId('gx-promo-public-description')?.value||MECHANICS[x.mech]?.hint||'').trim();
    const badge=String(byId('gx-promo-badge')?.value||mechanicLabel(x.mech)).trim();
    const names=x.items.map(i=>service(i.servicio_id)?.nombre).filter(Boolean);

    let price='Define el valor';
    if(x.mech==='porcentaje'&&x.pct>0)price=money(x.pct)+'% OFF · $'+money(x.offerTotal);
    else if(x.mech==='addon'&&x.offerPeriod>0)price='+$'+money(x.offerPeriod)+' / periodo';
    else if(x.offerTotal>0)price='$'+money(x.offerTotal);

    card.innerHTML=
      '<span>'+esc(badge||'PROMO')+'</span>'+
      '<strong>'+esc(title)+'</strong>'+
      '<p>'+esc(description||names.join(' + ')||'Selecciona las plataformas.')+'</p>'+
      '<div><b>'+esc(price)+'</b>'+(x.normalTotal>0&&x.mech!=='addon'?'<s>$'+money(x.normalTotal)+'</s>':'')+'</div>';

    if(facts){
      const audience=AUDIENCES[byId('gx-promo-audience')?.value]||AUDIENCES.todos;
      const periods=x.periods;
      const equivalent=(x.mech==='precio_fijo'||x.mech==='combo')&&x.offerTotal>0&&periods>1
        ?' · equiv. $'+money(x.offerPeriod)+'/periodo'
        :'';
      facts.innerHTML=
        '<div><span>Composición</span><strong>'+esc(names.join(' + ')||'Pendiente')+'</strong></div>'+
        '<div><span>Ahorro total</span><strong>$'+money(x.saving)+'</strong></div>'+
        '<div><span>Duración</span><strong>'+periods+' periodo'+(periods===1?'':'s')+equivalent+'</strong></div>'+
        '<div><span>Audiencia</span><strong>'+esc(audience)+'</strong></div>';
    }
  };

  function collectData(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const segmentacion=(audience==='con_servicio'||audience==='sin_servicio')
      ?{servicio_id:String(byId('gx-promo-audience-service')?.value||'')}
      :{};
    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||'';
    const complements=items.filter(x=>x.rol==='complemento').map(x=>x.servicio_id);

    return {
      id:byId('gx-promo-id')?.value||'',
      mecanica:mech,
      nombre:byId('gx-promo-name')?.value||'',
      titulo_publico:byId('gx-promo-public-title')?.value||'',
      descripcion_publica:byId('gx-promo-public-description')?.value||'',
      badge:byId('gx-promo-badge')?.value||'',
      prioridad:Number(byId('gx-promo-priority')?.value||0),
      items,
      servicio_id:items[0]?.servicio_id||'',
      servicio_disparador_id:trigger,
      servicios_complemento_ids:complements,
      precio_promocional:Number(byId('gx-promo-price')?.value||0),
      descuento_porcentaje:Number(byId('gx-promo-percent')?.value||0),
      duracion_periodos:Number(byId('gx-promo-periods')?.value||1),
      inicio:byId('gx-promo-start')?.value||'',
      fin:byId('gx-promo-end')?.value||'',
      audiencia:audience,
      segmentacion,
      acumulacion:{
        lealtad:byId('gx-promo-stack-loyalty')?.checked===true,
        trato_justo:byId('gx-promo-stack-fairdeal')?.checked===true,
        beneficios_programados:byId('gx-promo-stack-benefits')?.checked===true,
        bienvenida:byId('gx-promo-stack-welcome')?.checked===true
      },
      mostrar_precio_anterior:byId('gx-promo-old-price')?.checked===true,
      oferta_flash:byId('gx-promo-flash')?.checked===true,
      mostrar_contador:byId('gx-promo-countdown')?.checked===true,
      destacada:byId('gx-promo-featured')?.checked===true,
      notificar_cliente:byId('gx-promo-notify')?.checked===true,
      publicada:byId('gx-promo-published')?.checked===true,
      adquisicion_habilitada:
        byId('gx-promo-published')?.checked===true &&
        byId('gx-promo-acquisition')?.checked===true,
      activa:byId('gx-promo-active')?.checked===true
    };
  }

  window.gxPromoSave=async function(){
    const btn=byId('gx-promo-save');
    const data=collectData();

    if(!String(data.nombre).trim())return alert('Agrega un nombre interno para identificar la campaña.');
    if(!data.items.length)return alert('Selecciona las plataformas de la promoción.');
    if(data.mecanica==='combo'&&data.items.length<2)return alert('Un combo necesita al menos dos plataformas.');
    if(data.mecanica==='addon'&&!data.servicios_complemento_ids.length)return alert('Selecciona al menos un complemento.');
    if((data.audiencia==='con_servicio'||data.audiencia==='sin_servicio')&&!data.segmentacion.servicio_id)return alert('Selecciona la plataforma usada para segmentar.');
    if(data.adquisicion_habilitada===true&&data.publicada!==true)return alert('Publica la campaña antes de habilitar adquisiciones.');

    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.savePromotion(data);
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo guardar la promoción.\n\n'+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}
    }
  };

  window.gxPromoToggle=async function(id,activa){
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id,activa});
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo cambiar el estado.\n\n'+(e?.message||e));
    }
  };

  window.gxPromoDeleteCurrent=async function(){
    const id=String(byId('gx-promo-id')?.value||'');
    if(!id)return;
    if(!confirm('¿Eliminar esta promoción? Si ya tuviera una adquisición histórica, GOXION la desactivará en lugar de borrarla.'))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.deletePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.deletePromotion({id});
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo eliminar la promoción.\n\n'+(e?.message||e));
    }
  };
})();+money(p.precio_normal_total||p?.servicio?.precio)+' → 

  window.gxPromoLoad=async function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{
      const r=await promoRead();
      studio={servicios:r.servicios||[],promociones:r.promociones||[]};
      populateSharedSelects();
      renderStats();
      window.gxPromoRender();
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="gx-empty-inline">No se pudieron cargar promociones: '+esc(e?.message||e)+'</div>';
    }
  };

  window.gxPromoRender=function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    const q=String(byId('gx-promo-search')?.value||'').trim().toLowerCase();
    const mech=String(byId('gx-promo-filter-mechanic')?.value||'');
    const state=String(byId('gx-promo-filter-state')?.value||'');

    const rows=studio.promociones.filter(p=>{
      if(mech&&String(p.mecanica)!==mech)return false;
      if(state&&String(p.estado_visual)!==state)return false;
      if(q){
        const hay=(String(p.nombre||'')+' '+String(p.titulo_publico||'')+' '+itemNames(p)).toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="gx-empty-inline">No hay promociones que coincidan con estos filtros.</div>';
      return;
    }

    list.innerHTML=rows.map(p=>{
      const type=String(p.mecanica||'precio_fijo');
      const periods=Number(p.duracion_periodos||1);
      const flags=[
        p.oferta_flash?'Flash':'',
        p.mostrar_contador?'Timer':'',
        p.destacada?'Destacada':'',
        p.notificar_cliente?'Notificación preparada':'',
        p.adquisicion_habilitada?'Contratable':(p.publicada?'Sólo visible':'')
      ].filter(Boolean);
      return '<article class="gx-promo-row gx-promo-studio-row">'+
        '<div class="gx-promo-type-mark"><b>'+esc(MECHANICS[type]?.icon||'$')+'</b><span>'+esc(mechanicLabel(type))+'</span></div>'+
        '<div class="gx-promo-main">'+
          '<div class="gx-promo-row-title"><strong>'+esc(p.nombre||'Promoción')+'</strong><span class="gx-promo-state-chip '+esc(p.estado_visual||'lista')+'">'+esc(p.estado_visual||'lista')+'</span></div>'+
          '<small>'+esc(itemNames(p))+'</small>'+
          '<div class="gx-promo-row-meta"><b>'+esc(priceLine(p))+'</b><span>'+periods+' periodo'+(periods===1?'':'s')+' · '+esc(AUDIENCES[p.audiencia]||AUDIENCES.todos)+'</span></div>'+
          '<div class="gx-promo-row-foot"><span>'+fmtDate(p.inicio)+' → '+fmtDate(p.fin)+'</span><span>'+(p.publicada?'Publicada':'No publicada')+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div>'+
        '</div>'+
        '<div class="gx-promo-row-actions">'+
          '<button onclick="gxPromoEdit(\''+esc(p.id)+'\')" type="button">Editar</button>'+
          '<button onclick="gxPromoDuplicate(\''+esc(p.id)+'\')" type="button">Duplicar</button>'+
          '<button class="'+(p.activa===true?'pause':'')+'" onclick="gxPromoToggle(\''+esc(p.id)+'\','+(p.activa===true?'false':'true')+')" type="button">'+(p.activa===true?'Pausar':'Activar')+'</button>'+
        '</div>'+
      '</article>';
    }).join('');
  };

  function blankPromo(){
    const now=new Date(),end=new Date(now.getTime()+7*24*3600000);
    return {
      id:'',mecanica:'precio_fijo',nombre:'',titulo_publico:'',descripcion_publica:'',badge:'PROMO',
      precio_promocional:'',descuento_porcentaje:'',duracion_periodos:1,
      inicio:now.toISOString(),fin:end.toISOString(),
      mostrar_precio_anterior:true,mostrar_contador:false,oferta_flash:false,activa:true,
      audiencia:'todos',segmentacion:{},
      acumulacion:{lealtad:true,trato_justo:true,beneficios_programados:false,bienvenida:false},
      destacada:false,notificar_cliente:false,publicada:false,adquisicion_habilitada:false,prioridad:0,items:[]
    };
  }

  window.gxPromoOpenEditor=function(input=null){
    const ed=byId('gx-promo-editor');
    if(!ed)return;
    editing=input?JSON.parse(JSON.stringify(input)):blankPromo();

    byId('gx-promo-id').value=editing.id||'';
    byId('gx-promo-editor-title').textContent=editing.id?'Editar promoción':'Nueva promoción';
    byId('gx-promo-editor-subtitle').textContent=editing.id
      ?('Revisión '+Number(editing.revision||1)+' · las futuras adquisiciones conservarán su propia fotografía comercial.')
      :'Define la mecánica y GOXION adapta el resto del formulario.';
    byId('gx-promo-name').value=editing.nombre||'';
    byId('gx-promo-public-title').value=editing.titulo_publico||'';
    byId('gx-promo-public-description').value=editing.descripcion_publica||'';
    byId('gx-promo-badge').value=editing.badge||'';
    byId('gx-promo-priority').value=String(editing.prioridad||0);
    byId('gx-promo-price').value=editing.precio_promocional??'';
    byId('gx-promo-percent').value=editing.descuento_porcentaje??'';
    byId('gx-promo-periods').value=String(editing.duracion_periodos||1);
    byId('gx-promo-start').value=localInput(editing.inicio);
    byId('gx-promo-end').value=localInput(editing.fin);
    byId('gx-promo-audience').value=editing.audiencia||'todos';

    populateSharedSelects();
    byId('gx-promo-audience-service').value=editing.segmentacion?.servicio_id||'';

    byId('gx-promo-stack-loyalty').checked=editing.acumulacion?.lealtad!==false;
    byId('gx-promo-stack-fairdeal').checked=editing.acumulacion?.trato_justo!==false;
    byId('gx-promo-stack-benefits').checked=editing.acumulacion?.beneficios_programados===true;
    byId('gx-promo-stack-welcome').checked=editing.acumulacion?.bienvenida===true;

    byId('gx-promo-old-price').checked=editing.mostrar_precio_anterior!==false;
    byId('gx-promo-flash').checked=editing.oferta_flash===true;
    byId('gx-promo-countdown').checked=editing.mostrar_contador===true;
    byId('gx-promo-featured').checked=editing.destacada===true;
    byId('gx-promo-notify').checked=editing.notificar_cliente===true;
    byId('gx-promo-published').checked=editing.publicada===true;
    byId('gx-promo-acquisition').checked=editing.adquisicion_habilitada===true;
    byId('gx-promo-active').checked=editing.activa!==false;

    byId('gx-promo-delete').hidden=!editing.id;
    byId('gx-promo-duplicate').hidden=!editing.id;

    window.gxPromoSetMechanic(editing.mecanica||'precio_fijo',null,editing);
    window.gxPromoAudienceChanged();
    window.gxPromoPublicationChanged();
    window.gxPromoUpdatePreview();

    ed.hidden=false;
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.gxPromoCloseEditor=function(){
    const ed=byId('gx-promo-editor');
    if(ed)ed.hidden=true;
    editing=null;
  };

  window.gxPromoEdit=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(p)window.gxPromoOpenEditor(p);
  };

  window.gxPromoDuplicate=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(!p)return;
    const copy=JSON.parse(JSON.stringify(p));
    copy.id='';
    copy.nombre=(copy.nombre||'Promoción')+' · copia';
    copy.publicada=false;
    copy.adquisicion_habilitada=false;
    copy.activa=true;
    copy.revision=1;
    window.gxPromoOpenEditor(copy);
  };

  window.gxPromoDuplicateCurrent=function(){
    if(editing?.id)window.gxPromoDuplicate(editing.id);
  };

  window.gxPromoSetMechanic=function(type,btn=null,model=null){
    const mech=MECHANICS[type]?type:'precio_fijo';
    byId('gx-promo-mechanic').value=mech;
    document.querySelectorAll('[data-gx-promo-mechanic]').forEach(x=>x.classList.toggle('active',x.dataset.gxPromoMechanic===mech));

    const priceWrap=byId('gx-promo-price-wrap');
    const pctWrap=byId('gx-promo-percent-wrap');
    const priceLabel=byId('gx-promo-price-label');
    if(priceWrap)priceWrap.hidden=mech==='porcentaje';
    if(pctWrap)pctWrap.hidden=mech!=='porcentaje';
    if(priceLabel)priceLabel.textContent=
      mech==='addon'?'Precio adicional por periodo':
      (mech==='combo'?'Precio total del combo':'Precio total de la promoción');

    renderMechanicFields(mech,model||editing||blankPromo());
    window.gxPromoUpdatePreview();
  };

  function renderMechanicFields(mech,model){
    const host=byId('gx-promo-mechanic-fields');
    if(!host)return;
    const items=Array.isArray(model?.items)?model.items:[];

    if(mech==='precio_fijo'||mech==='porcentaje'){
      const selected=items[0]?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
      host.innerHTML='<label class="gx-promo-mechanic-single"><span>Plataforma</span><select id="gx-promo-single-service" onchange="gxPromoUpdatePreview()">'+serviceOptions(selected)+'</select></label>';
      return;
    }

    if(mech==='combo'){
      const selected=new Set(items.map(x=>String(x.servicio_id)));
      host.innerHTML=
        '<div class="gx-promo-service-picker-head"><div><strong>Plataformas del combo</strong><small>Selecciona dos o más. El precio normal se suma automáticamente.</small></div><span id="gx-promo-selection-count">0 seleccionadas</span></div>'+
        '<div class="gx-promo-service-picker">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-service-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div>';
      window.gxPromoSelectionChanged();
      return;
    }

    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
    const selected=new Set(items.filter(x=>x.rol==='complemento').map(x=>String(x.servicio_id)));
    host.innerHTML=
      '<div class="gx-promo-addon-grid">'+
        '<label><span>Plataforma disparadora</span><select id="gx-promo-addon-trigger" onchange="gxPromoSelectionChanged()">'+serviceOptions(trigger)+'</select></label>'+
        '<div><span>Complementos con precio especial</span><div class="gx-promo-service-picker compact">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-addon-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div></div>'+
      '</div>';
    window.gxPromoSelectionChanged();
  }

  window.gxPromoSelectionChanged=function(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='combo'){
      const checks=[...document.querySelectorAll('[data-gx-promo-service-check]:checked')];
      const count=byId('gx-promo-selection-count');
      if(count)count.textContent=checks.length+' seleccionada'+(checks.length===1?'':'s');
    }
    if(mech==='addon'){
      const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
      document.querySelectorAll('[data-gx-promo-addon-check]').forEach(x=>{
        x.disabled=String(x.value)===trigger;
        if(x.disabled)x.checked=false;
      });
    }
    window.gxPromoUpdatePreview();
  };

  window.gxPromoAudienceChanged=function(){
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const wrap=byId('gx-promo-audience-service-wrap');
    if(wrap)wrap.hidden=!(audience==='con_servicio'||audience==='sin_servicio');
  };

  window.gxPromoPublicationChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition){
      acquisition.disabled=!published;
      if(!published)acquisition.checked=false;
    }
    const note=byId('gx-promo-acquisition-note');
    if(note){
      const strong=note.querySelector('strong');
      const small=note.querySelector('small');
      if(strong)strong.textContent=published?'Campaña visible en catálogo':'Campaña todavía privada';
      if(small)small.textContent=published
        ?'Puedes dejarla sólo visible o habilitar adquisición para que clientes elegibles puedan contratarla.'
        :'Publica la campaña antes de permitir adquisiciones. Guardarla sin publicar no la mostrará en Ayuda.';
    }
    window.gxPromoUpdatePreview?.();
  };

  window.gxPromoAcquisitionChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition?.checked===true&&!published){
      acquisition.checked=false;
    }
    window.gxPromoUpdatePreview?.();
  };

  function collectItems(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='precio_fijo'||mech==='porcentaje'){
      const id=String(byId('gx-promo-single-service')?.value||'');
      return id?[{servicio_id:id,rol:'principal',orden:0}]:[];
    }
    if(mech==='combo'){
      return [...document.querySelectorAll('[data-gx-promo-service-check]:checked')]
        .map((x,i)=>({servicio_id:String(x.value),rol:'incluido',orden:i}));
    }
    const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
    const complements=[...document.querySelectorAll('[data-gx-promo-addon-check]:checked')]
      .map(x=>String(x.value)).filter(x=>x&&x!==trigger);
    return [
      ...(trigger?[{servicio_id:trigger,rol:'disparador',orden:0}]:[]),
      ...complements.map((id,i)=>({servicio_id:id,rol:'complemento',orden:i+1}))
    ];
  }

  function previewNumbers(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const periods=Math.max(1,Number(byId('gx-promo-periods')?.value||1));
    const normalPeriod=items.reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const complementPeriod=items.filter(x=>x.rol==='complemento').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const triggerPeriod=items.filter(x=>x.rol==='disparador').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const pct=Number(byId('gx-promo-percent')?.value||0);
    const inputPrice=Number(byId('gx-promo-price')?.value||0);

    let normalTotal=normalPeriod;
    let offerPeriod=inputPrice;
    let offerTotal=inputPrice;
    let saving=0;

    if(mech==='precio_fijo'||mech==='combo'){
      normalTotal=normalPeriod*periods;
      offerTotal=inputPrice;
      offerPeriod=periods>0?inputPrice/periods:inputPrice;
      saving=Math.max(0,normalTotal-offerTotal);
    }else if(mech==='porcentaje'){
      offerPeriod=(normalPeriod>0&&pct>0)?Math.round(normalPeriod*(1-pct/100)*100)/100:0;
      normalTotal=normalPeriod*periods;
      offerTotal=Math.round(offerPeriod*periods*100)/100;
      saving=Math.max(0,normalTotal-offerTotal);
    }else{
      normalTotal=normalPeriod*periods;
      offerPeriod=inputPrice;
      offerTotal=Math.round((triggerPeriod+inputPrice)*periods*100)/100;
      saving=Math.max(0,(complementPeriod-inputPrice)*periods);
    }

    return {
      mech,items,periods,pct,
      normalPeriod,normalTotal,
      complementPeriod,triggerPeriod,
      offerPeriod,offerTotal,saving
    };
  }

  window.gxPromoUpdatePreview=function(){
    const card=byId('gx-promo-preview');
    const facts=byId('gx-promo-preview-facts');
    if(!card)return;

    const x=previewNumbers();
    const title=String(byId('gx-promo-public-title')?.value||byId('gx-promo-name')?.value||'Nueva promoción').trim();
    const description=String(byId('gx-promo-public-description')?.value||MECHANICS[x.mech]?.hint||'').trim();
    const badge=String(byId('gx-promo-badge')?.value||mechanicLabel(x.mech)).trim();
    const names=x.items.map(i=>service(i.servicio_id)?.nombre).filter(Boolean);

    let price='Define el valor';
    if(x.mech==='porcentaje'&&x.pct>0)price=money(x.pct)+'% OFF · $'+money(x.offerTotal);
    else if(x.mech==='addon'&&x.offerPeriod>0)price='+$'+money(x.offerPeriod)+' / periodo';
    else if(x.offerTotal>0)price='$'+money(x.offerTotal);

    card.innerHTML=
      '<span>'+esc(badge||'PROMO')+'</span>'+
      '<strong>'+esc(title)+'</strong>'+
      '<p>'+esc(description||names.join(' + ')||'Selecciona las plataformas.')+'</p>'+
      '<div><b>'+esc(price)+'</b>'+(x.normalTotal>0&&x.mech!=='addon'?'<s>$'+money(x.normalTotal)+'</s>':'')+'</div>';

    if(facts){
      const audience=AUDIENCES[byId('gx-promo-audience')?.value]||AUDIENCES.todos;
      const periods=x.periods;
      const equivalent=(x.mech==='precio_fijo'||x.mech==='combo')&&x.offerTotal>0&&periods>1
        ?' · equiv. $'+money(x.offerPeriod)+'/periodo'
        :'';
      facts.innerHTML=
        '<div><span>Composición</span><strong>'+esc(names.join(' + ')||'Pendiente')+'</strong></div>'+
        '<div><span>Ahorro total</span><strong>$'+money(x.saving)+'</strong></div>'+
        '<div><span>Duración</span><strong>'+periods+' periodo'+(periods===1?'':'s')+equivalent+'</strong></div>'+
        '<div><span>Audiencia</span><strong>'+esc(audience)+'</strong></div>';
    }
  };

  function collectData(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const segmentacion=(audience==='con_servicio'||audience==='sin_servicio')
      ?{servicio_id:String(byId('gx-promo-audience-service')?.value||'')}
      :{};
    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||'';
    const complements=items.filter(x=>x.rol==='complemento').map(x=>x.servicio_id);

    return {
      id:byId('gx-promo-id')?.value||'',
      mecanica:mech,
      nombre:byId('gx-promo-name')?.value||'',
      titulo_publico:byId('gx-promo-public-title')?.value||'',
      descripcion_publica:byId('gx-promo-public-description')?.value||'',
      badge:byId('gx-promo-badge')?.value||'',
      prioridad:Number(byId('gx-promo-priority')?.value||0),
      items,
      servicio_id:items[0]?.servicio_id||'',
      servicio_disparador_id:trigger,
      servicios_complemento_ids:complements,
      precio_promocional:Number(byId('gx-promo-price')?.value||0),
      descuento_porcentaje:Number(byId('gx-promo-percent')?.value||0),
      duracion_periodos:Number(byId('gx-promo-periods')?.value||1),
      inicio:byId('gx-promo-start')?.value||'',
      fin:byId('gx-promo-end')?.value||'',
      audiencia:audience,
      segmentacion,
      acumulacion:{
        lealtad:byId('gx-promo-stack-loyalty')?.checked===true,
        trato_justo:byId('gx-promo-stack-fairdeal')?.checked===true,
        beneficios_programados:byId('gx-promo-stack-benefits')?.checked===true,
        bienvenida:byId('gx-promo-stack-welcome')?.checked===true
      },
      mostrar_precio_anterior:byId('gx-promo-old-price')?.checked===true,
      oferta_flash:byId('gx-promo-flash')?.checked===true,
      mostrar_contador:byId('gx-promo-countdown')?.checked===true,
      destacada:byId('gx-promo-featured')?.checked===true,
      notificar_cliente:byId('gx-promo-notify')?.checked===true,
      publicada:byId('gx-promo-published')?.checked===true,
      adquisicion_habilitada:
        byId('gx-promo-published')?.checked===true &&
        byId('gx-promo-acquisition')?.checked===true,
      activa:byId('gx-promo-active')?.checked===true
    };
  }

  window.gxPromoSave=async function(){
    const btn=byId('gx-promo-save');
    const data=collectData();

    if(!String(data.nombre).trim())return alert('Agrega un nombre interno para identificar la campaña.');
    if(!data.items.length)return alert('Selecciona las plataformas de la promoción.');
    if(data.mecanica==='combo'&&data.items.length<2)return alert('Un combo necesita al menos dos plataformas.');
    if(data.mecanica==='addon'&&!data.servicios_complemento_ids.length)return alert('Selecciona al menos un complemento.');
    if((data.audiencia==='con_servicio'||data.audiencia==='sin_servicio')&&!data.segmentacion.servicio_id)return alert('Selecciona la plataforma usada para segmentar.');
    if(data.adquisicion_habilitada===true&&data.publicada!==true)return alert('Publica la campaña antes de habilitar adquisiciones.');

    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.savePromotion(data);
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo guardar la promoción.\n\n'+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}
    }
  };

  window.gxPromoToggle=async function(id,activa){
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id,activa});
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo cambiar el estado.\n\n'+(e?.message||e));
    }
  };

  window.gxPromoDeleteCurrent=async function(){
    const id=String(byId('gx-promo-id')?.value||'');
    if(!id)return;
    if(!confirm('¿Eliminar esta promoción? Si ya tuviera una adquisición histórica, GOXION la desactivará en lugar de borrarla.'))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.deletePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.deletePromotion({id});
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo eliminar la promoción.\n\n'+(e?.message||e));
    }
  };
})();+money(p.precio_promocional_total??p.precio_promocional)+(untilEnd?' / periodo':'');
  }

  window.gxPromoLoad=async function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    list.innerHTML='<div class="gx-empty-inline">Cargando promociones…</div>';
    try{
      const r=await promoRead();
      studio={servicios:r.servicios||[],promociones:r.promociones||[]};
      populateSharedSelects();
      renderStats();
      window.gxPromoRender();
    }catch(e){
      console.error(e);
      list.innerHTML='<div class="gx-empty-inline">No se pudieron cargar promociones: '+esc(e?.message||e)+'</div>';
    }
  };

  window.gxPromoRender=function(){
    const list=byId('gx-promo-list');
    if(!list)return;
    const q=String(byId('gx-promo-search')?.value||'').trim().toLowerCase();
    const mech=String(byId('gx-promo-filter-mechanic')?.value||'');
    const state=String(byId('gx-promo-filter-state')?.value||'');

    const rows=studio.promociones.filter(p=>{
      if(mech&&String(p.mecanica)!==mech)return false;
      if(state&&String(p.estado_visual)!==state)return false;
      if(q){
        const hay=(String(p.nombre||'')+' '+String(p.titulo_publico||'')+' '+itemNames(p)).toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="gx-empty-inline">No hay promociones que coincidan con estos filtros.</div>';
      return;
    }

    list.innerHTML=rows.map(p=>{
      const type=String(p.mecanica||'precio_fijo');
      const periods=Number(p.duracion_periodos||1);
      const flags=[
        p.oferta_flash?'Flash':'',
        p.mostrar_contador?'Timer':'',
        p.destacada?'Destacada':'',
        p.notificar_cliente?'Notificación preparada':'',
        p.adquisicion_habilitada?'Contratable':(p.publicada?'Sólo visible':'')
      ].filter(Boolean);
      return '<article class="gx-promo-row gx-promo-studio-row">'+
        '<div class="gx-promo-type-mark"><b>'+esc(MECHANICS[type]?.icon||'$')+'</b><span>'+esc(mechanicLabel(type))+'</span></div>'+
        '<div class="gx-promo-main">'+
          '<div class="gx-promo-row-title"><strong>'+esc(p.nombre||'Promoción')+'</strong><span class="gx-promo-state-chip '+esc(p.estado_visual||'lista')+'">'+esc(p.estado_visual||'lista')+'</span></div>'+
          '<small>'+esc(itemNames(p))+'</small>'+
          '<div class="gx-promo-row-meta"><b>'+esc(priceLine(p))+'</b><span>'+periods+' periodo'+(periods===1?'':'s')+' · '+esc(AUDIENCES[p.audiencia]||AUDIENCES.todos)+'</span></div>'+
          '<div class="gx-promo-row-foot"><span>'+fmtDate(p.inicio)+' → '+fmtDate(p.fin)+'</span><span>'+(p.publicada?'Publicada':'No publicada')+(flags.length?' · '+esc(flags.join(' · ')):'')+'</span></div>'+
        '</div>'+
        '<div class="gx-promo-row-actions">'+
          '<button onclick="gxPromoEdit(\''+esc(p.id)+'\')" type="button">Editar</button>'+
          '<button onclick="gxPromoDuplicate(\''+esc(p.id)+'\')" type="button">Duplicar</button>'+
          '<button class="'+(p.activa===true?'pause':'')+'" onclick="gxPromoToggle(\''+esc(p.id)+'\','+(p.activa===true?'false':'true')+')" type="button">'+(p.activa===true?'Pausar':'Activar')+'</button>'+
        '</div>'+
      '</article>';
    }).join('');
  };

  function blankPromo(){
    const now=new Date(),end=new Date(now.getTime()+7*24*3600000);
    return {
      id:'',mecanica:'precio_fijo',nombre:'',titulo_publico:'',descripcion_publica:'',badge:'PROMO',
      precio_promocional:'',descuento_porcentaje:'',duracion_periodos:1,
      inicio:now.toISOString(),fin:end.toISOString(),
      mostrar_precio_anterior:true,mostrar_contador:false,oferta_flash:false,activa:true,
      audiencia:'todos',segmentacion:{},
      acumulacion:{lealtad:true,trato_justo:true,beneficios_programados:false,bienvenida:false},
      destacada:false,notificar_cliente:false,publicada:false,adquisicion_habilitada:false,prioridad:0,items:[]
    };
  }

  window.gxPromoOpenEditor=function(input=null){
    const ed=byId('gx-promo-editor');
    if(!ed)return;
    editing=input?JSON.parse(JSON.stringify(input)):blankPromo();

    byId('gx-promo-id').value=editing.id||'';
    byId('gx-promo-editor-title').textContent=editing.id?'Editar promoción':'Nueva promoción';
    byId('gx-promo-editor-subtitle').textContent=editing.id
      ?('Revisión '+Number(editing.revision||1)+' · las futuras adquisiciones conservarán su propia fotografía comercial.')
      :'Define la mecánica y GOXION adapta el resto del formulario.';
    byId('gx-promo-name').value=editing.nombre||'';
    byId('gx-promo-public-title').value=editing.titulo_publico||'';
    byId('gx-promo-public-description').value=editing.descripcion_publica||'';
    byId('gx-promo-badge').value=editing.badge||'';
    byId('gx-promo-priority').value=String(editing.prioridad||0);
    byId('gx-promo-price').value=editing.precio_promocional??'';
    byId('gx-promo-percent').value=editing.descuento_porcentaje??'';
    byId('gx-promo-periods').value=String(editing.duracion_periodos||1);
    byId('gx-promo-start').value=localInput(editing.inicio);
    byId('gx-promo-end').value=localInput(editing.fin);
    byId('gx-promo-audience').value=editing.audiencia||'todos';

    populateSharedSelects();
    byId('gx-promo-audience-service').value=editing.segmentacion?.servicio_id||'';

    byId('gx-promo-stack-loyalty').checked=editing.acumulacion?.lealtad!==false;
    byId('gx-promo-stack-fairdeal').checked=editing.acumulacion?.trato_justo!==false;
    byId('gx-promo-stack-benefits').checked=editing.acumulacion?.beneficios_programados===true;
    byId('gx-promo-stack-welcome').checked=editing.acumulacion?.bienvenida===true;

    byId('gx-promo-old-price').checked=editing.mostrar_precio_anterior!==false;
    byId('gx-promo-flash').checked=editing.oferta_flash===true;
    byId('gx-promo-countdown').checked=editing.mostrar_contador===true;
    byId('gx-promo-featured').checked=editing.destacada===true;
    byId('gx-promo-notify').checked=editing.notificar_cliente===true;
    byId('gx-promo-published').checked=editing.publicada===true;
    byId('gx-promo-acquisition').checked=editing.adquisicion_habilitada===true;
    byId('gx-promo-active').checked=editing.activa!==false;

    byId('gx-promo-delete').hidden=!editing.id;
    byId('gx-promo-duplicate').hidden=!editing.id;

    window.gxPromoSetMechanic(editing.mecanica||'precio_fijo',null,editing);
    window.gxPromoAudienceChanged();
    window.gxPromoPublicationChanged();
    window.gxPromoUpdatePreview();

    ed.hidden=false;
    ed.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.gxPromoCloseEditor=function(){
    const ed=byId('gx-promo-editor');
    if(ed)ed.hidden=true;
    editing=null;
  };

  window.gxPromoEdit=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(p)window.gxPromoOpenEditor(p);
  };

  window.gxPromoDuplicate=function(id){
    const p=studio.promociones.find(x=>String(x.id)===String(id));
    if(!p)return;
    const copy=JSON.parse(JSON.stringify(p));
    copy.id='';
    copy.nombre=(copy.nombre||'Promoción')+' · copia';
    copy.publicada=false;
    copy.adquisicion_habilitada=false;
    copy.activa=true;
    copy.revision=1;
    window.gxPromoOpenEditor(copy);
  };

  window.gxPromoDuplicateCurrent=function(){
    if(editing?.id)window.gxPromoDuplicate(editing.id);
  };

  window.gxPromoSetMechanic=function(type,btn=null,model=null){
    const mech=MECHANICS[type]?type:'precio_fijo';
    byId('gx-promo-mechanic').value=mech;
    document.querySelectorAll('[data-gx-promo-mechanic]').forEach(x=>x.classList.toggle('active',x.dataset.gxPromoMechanic===mech));

    const priceWrap=byId('gx-promo-price-wrap');
    const pctWrap=byId('gx-promo-percent-wrap');
    const priceLabel=byId('gx-promo-price-label');
    if(priceWrap)priceWrap.hidden=mech==='porcentaje';
    if(pctWrap)pctWrap.hidden=mech!=='porcentaje';
    if(priceLabel)priceLabel.textContent=
      mech==='addon'?'Precio adicional por periodo':
      (mech==='combo'?'Precio total del combo':'Precio total de la promoción');

    renderMechanicFields(mech,model||editing||blankPromo());
    window.gxPromoUpdatePreview();
  };

  function renderMechanicFields(mech,model){
    const host=byId('gx-promo-mechanic-fields');
    if(!host)return;
    const items=Array.isArray(model?.items)?model.items:[];

    if(mech==='precio_fijo'||mech==='porcentaje'){
      const selected=items[0]?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
      host.innerHTML='<label class="gx-promo-mechanic-single"><span>Plataforma</span><select id="gx-promo-single-service" onchange="gxPromoUpdatePreview()">'+serviceOptions(selected)+'</select></label>';
      return;
    }

    if(mech==='combo'){
      const selected=new Set(items.map(x=>String(x.servicio_id)));
      host.innerHTML=
        '<div class="gx-promo-service-picker-head"><div><strong>Plataformas del combo</strong><small>Selecciona dos o más. El precio normal se suma automáticamente.</small></div><span id="gx-promo-selection-count">0 seleccionadas</span></div>'+
        '<div class="gx-promo-service-picker">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-service-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div>';
      window.gxPromoSelectionChanged();
      return;
    }

    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||model?.servicio_id||studio.servicios[0]?.id||'';
    const selected=new Set(items.filter(x=>x.rol==='complemento').map(x=>String(x.servicio_id)));
    host.innerHTML=
      '<div class="gx-promo-addon-grid">'+
        '<label><span>Plataforma disparadora</span><select id="gx-promo-addon-trigger" onchange="gxPromoSelectionChanged()">'+serviceOptions(trigger)+'</select></label>'+
        '<div><span>Complementos con precio especial</span><div class="gx-promo-service-picker compact">'+studio.servicios.map(s=>
          '<label><input data-gx-promo-addon-check type="checkbox" value="'+esc(s.id)+'" '+(selected.has(String(s.id))?'checked':'')+' onchange="gxPromoSelectionChanged()"/>'+
          '<span><strong>'+esc(s.nombre)+'</strong><small>$'+money(s.precio)+'</small></span></label>'
        ).join('')+'</div></div>'+
      '</div>';
    window.gxPromoSelectionChanged();
  }

  window.gxPromoSelectionChanged=function(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='combo'){
      const checks=[...document.querySelectorAll('[data-gx-promo-service-check]:checked')];
      const count=byId('gx-promo-selection-count');
      if(count)count.textContent=checks.length+' seleccionada'+(checks.length===1?'':'s');
    }
    if(mech==='addon'){
      const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
      document.querySelectorAll('[data-gx-promo-addon-check]').forEach(x=>{
        x.disabled=String(x.value)===trigger;
        if(x.disabled)x.checked=false;
      });
    }
    window.gxPromoUpdatePreview();
  };

  window.gxPromoAudienceChanged=function(){
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const wrap=byId('gx-promo-audience-service-wrap');
    if(wrap)wrap.hidden=!(audience==='con_servicio'||audience==='sin_servicio');
  };

  window.gxPromoPublicationChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition){
      acquisition.disabled=!published;
      if(!published)acquisition.checked=false;
    }
    const note=byId('gx-promo-acquisition-note');
    if(note){
      const strong=note.querySelector('strong');
      const small=note.querySelector('small');
      if(strong)strong.textContent=published?'Campaña visible en catálogo':'Campaña todavía privada';
      if(small)small.textContent=published
        ?'Puedes dejarla sólo visible o habilitar adquisición para que clientes elegibles puedan contratarla.'
        :'Publica la campaña antes de permitir adquisiciones. Guardarla sin publicar no la mostrará en Ayuda.';
    }
    window.gxPromoUpdatePreview?.();
  };

  window.gxPromoAcquisitionChanged=function(){
    const published=byId('gx-promo-published')?.checked===true;
    const acquisition=byId('gx-promo-acquisition');
    if(acquisition?.checked===true&&!published){
      acquisition.checked=false;
    }
    window.gxPromoUpdatePreview?.();
  };

  function collectItems(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    if(mech==='precio_fijo'||mech==='porcentaje'){
      const id=String(byId('gx-promo-single-service')?.value||'');
      return id?[{servicio_id:id,rol:'principal',orden:0}]:[];
    }
    if(mech==='combo'){
      return [...document.querySelectorAll('[data-gx-promo-service-check]:checked')]
        .map((x,i)=>({servicio_id:String(x.value),rol:'incluido',orden:i}));
    }
    const trigger=String(byId('gx-promo-addon-trigger')?.value||'');
    const complements=[...document.querySelectorAll('[data-gx-promo-addon-check]:checked')]
      .map(x=>String(x.value)).filter(x=>x&&x!==trigger);
    return [
      ...(trigger?[{servicio_id:trigger,rol:'disparador',orden:0}]:[]),
      ...complements.map((id,i)=>({servicio_id:id,rol:'complemento',orden:i+1}))
    ];
  }

  function previewNumbers(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const periods=Math.max(1,Number(byId('gx-promo-periods')?.value||1));
    const normalPeriod=items.reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const complementPeriod=items.filter(x=>x.rol==='complemento').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const triggerPeriod=items.filter(x=>x.rol==='disparador').reduce((sum,item)=>sum+Number(service(item.servicio_id)?.precio||0),0);
    const pct=Number(byId('gx-promo-percent')?.value||0);
    const inputPrice=Number(byId('gx-promo-price')?.value||0);

    let normalTotal=normalPeriod;
    let offerPeriod=inputPrice;
    let offerTotal=inputPrice;
    let saving=0;

    if(mech==='precio_fijo'||mech==='combo'){
      normalTotal=normalPeriod*periods;
      offerTotal=inputPrice;
      offerPeriod=periods>0?inputPrice/periods:inputPrice;
      saving=Math.max(0,normalTotal-offerTotal);
    }else if(mech==='porcentaje'){
      offerPeriod=(normalPeriod>0&&pct>0)?Math.round(normalPeriod*(1-pct/100)*100)/100:0;
      normalTotal=normalPeriod*periods;
      offerTotal=Math.round(offerPeriod*periods*100)/100;
      saving=Math.max(0,normalTotal-offerTotal);
    }else{
      normalTotal=normalPeriod*periods;
      offerPeriod=inputPrice;
      offerTotal=Math.round((triggerPeriod+inputPrice)*periods*100)/100;
      saving=Math.max(0,(complementPeriod-inputPrice)*periods);
    }

    return {
      mech,items,periods,pct,
      normalPeriod,normalTotal,
      complementPeriod,triggerPeriod,
      offerPeriod,offerTotal,saving
    };
  }

  window.gxPromoUpdatePreview=function(){
    const card=byId('gx-promo-preview');
    const facts=byId('gx-promo-preview-facts');
    if(!card)return;

    const x=previewNumbers();
    const title=String(byId('gx-promo-public-title')?.value||byId('gx-promo-name')?.value||'Nueva promoción').trim();
    const description=String(byId('gx-promo-public-description')?.value||MECHANICS[x.mech]?.hint||'').trim();
    const badge=String(byId('gx-promo-badge')?.value||mechanicLabel(x.mech)).trim();
    const names=x.items.map(i=>service(i.servicio_id)?.nombre).filter(Boolean);

    let price='Define el valor';
    if(x.mech==='porcentaje'&&x.pct>0)price=money(x.pct)+'% OFF · $'+money(x.offerTotal);
    else if(x.mech==='addon'&&x.offerPeriod>0)price='+$'+money(x.offerPeriod)+' / periodo';
    else if(x.offerTotal>0)price='$'+money(x.offerTotal);

    card.innerHTML=
      '<span>'+esc(badge||'PROMO')+'</span>'+
      '<strong>'+esc(title)+'</strong>'+
      '<p>'+esc(description||names.join(' + ')||'Selecciona las plataformas.')+'</p>'+
      '<div><b>'+esc(price)+'</b>'+(x.normalTotal>0&&x.mech!=='addon'?'<s>$'+money(x.normalTotal)+'</s>':'')+'</div>';

    if(facts){
      const audience=AUDIENCES[byId('gx-promo-audience')?.value]||AUDIENCES.todos;
      const periods=x.periods;
      const equivalent=(x.mech==='precio_fijo'||x.mech==='combo')&&x.offerTotal>0&&periods>1
        ?' · equiv. $'+money(x.offerPeriod)+'/periodo'
        :'';
      facts.innerHTML=
        '<div><span>Composición</span><strong>'+esc(names.join(' + ')||'Pendiente')+'</strong></div>'+
        '<div><span>Ahorro total</span><strong>$'+money(x.saving)+'</strong></div>'+
        '<div><span>Duración</span><strong>'+periods+' periodo'+(periods===1?'':'s')+equivalent+'</strong></div>'+
        '<div><span>Audiencia</span><strong>'+esc(audience)+'</strong></div>';
    }
  };

  function collectData(){
    const mech=String(byId('gx-promo-mechanic')?.value||'precio_fijo');
    const items=collectItems();
    const audience=String(byId('gx-promo-audience')?.value||'todos');
    const segmentacion=(audience==='con_servicio'||audience==='sin_servicio')
      ?{servicio_id:String(byId('gx-promo-audience-service')?.value||'')}
      :{};
    const trigger=items.find(x=>x.rol==='disparador')?.servicio_id||'';
    const complements=items.filter(x=>x.rol==='complemento').map(x=>x.servicio_id);

    return {
      id:byId('gx-promo-id')?.value||'',
      mecanica:mech,
      nombre:byId('gx-promo-name')?.value||'',
      titulo_publico:byId('gx-promo-public-title')?.value||'',
      descripcion_publica:byId('gx-promo-public-description')?.value||'',
      badge:byId('gx-promo-badge')?.value||'',
      prioridad:Number(byId('gx-promo-priority')?.value||0),
      items,
      servicio_id:items[0]?.servicio_id||'',
      servicio_disparador_id:trigger,
      servicios_complemento_ids:complements,
      precio_promocional:Number(byId('gx-promo-price')?.value||0),
      descuento_porcentaje:Number(byId('gx-promo-percent')?.value||0),
      duracion_periodos:Number(byId('gx-promo-periods')?.value||1),
      inicio:byId('gx-promo-start')?.value||'',
      fin:byId('gx-promo-end')?.value||'',
      audiencia:audience,
      segmentacion,
      acumulacion:{
        lealtad:byId('gx-promo-stack-loyalty')?.checked===true,
        trato_justo:byId('gx-promo-stack-fairdeal')?.checked===true,
        beneficios_programados:byId('gx-promo-stack-benefits')?.checked===true,
        bienvenida:byId('gx-promo-stack-welcome')?.checked===true
      },
      mostrar_precio_anterior:byId('gx-promo-old-price')?.checked===true,
      oferta_flash:byId('gx-promo-flash')?.checked===true,
      mostrar_contador:byId('gx-promo-countdown')?.checked===true,
      destacada:byId('gx-promo-featured')?.checked===true,
      notificar_cliente:byId('gx-promo-notify')?.checked===true,
      publicada:byId('gx-promo-published')?.checked===true,
      adquisicion_habilitada:
        byId('gx-promo-published')?.checked===true &&
        byId('gx-promo-acquisition')?.checked===true,
      activa:byId('gx-promo-active')?.checked===true
    };
  }

  window.gxPromoSave=async function(){
    const btn=byId('gx-promo-save');
    const data=collectData();

    if(!String(data.nombre).trim())return alert('Agrega un nombre interno para identificar la campaña.');
    if(!data.items.length)return alert('Selecciona las plataformas de la promoción.');
    if(data.mecanica==='combo'&&data.items.length<2)return alert('Un combo necesita al menos dos plataformas.');
    if(data.mecanica==='addon'&&!data.servicios_complemento_ids.length)return alert('Selecciona al menos un complemento.');
    if((data.audiencia==='con_servicio'||data.audiencia==='sin_servicio')&&!data.segmentacion.servicio_id)return alert('Selecciona la plataforma usada para segmentar.');
    if(data.adquisicion_habilitada===true&&data.publicada!==true)return alert('Publica la campaña antes de habilitar adquisiciones.');

    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.savePromotion(data);
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo guardar la promoción.\n\n'+(e?.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Guardar promoción';}
    }
  };

  window.gxPromoToggle=async function(id,activa){
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id,activa});
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo cambiar el estado.\n\n'+(e?.message||e));
    }
  };

  window.gxPromoDeleteCurrent=async function(){
    const id=String(byId('gx-promo-id')?.value||'');
    if(!id)return;
    if(!confirm('¿Eliminar esta promoción? Si ya tuviera una adquisición histórica, GOXION la desactivará en lugar de borrarla.'))return;
    try{
      if(typeof window.GOXION_FINANCIAL_ACTIONS?.deletePromotion!=='function')throw new Error('Acciones financieras no disponibles.');
      await window.GOXION_FINANCIAL_ACTIONS.deletePromotion({id});
      window.gxPromoCloseEditor();
      await window.gxPromoLoad();
    }catch(e){
      alert('No se pudo eliminar la promoción.\n\n'+(e?.message||e));
    }
  };
})();