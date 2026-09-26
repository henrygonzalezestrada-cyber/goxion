(()=>{
  const ROOT_ID='gx-promo-showcase';
  const GXCORE=window.GOXION_CORE;
  if(!GXCORE) return;

  const state={
    promotions:[],
    active:0,
    timer:null,
    pointerStart:null,
    latestData:null,
    curatedMode:'popular',
    lastToken:null,
    loading:false
  };

  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const money=value=>Number(value||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:2});
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function clientToken(){
    return localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN)||'';
  }

  function logoFor(name=''){
    const n=norm(name);
    if(n.includes('netflix')) return 'logos/netflix.PNG';
    if(n.includes('disney')) return 'logos/disney.PNG';
    if(n.includes('hbo')||n==='max'||n.includes('max ')) return 'logos/hbo-max.PNG';
    if(n.includes('prime')||n.includes('amazon')) return 'logos/prime-video.PNG';
    if(n.includes('youtube')) return 'logos/youtube.PNG';
    if(n.includes('vix')) return 'logos/vix.PNG';
    if(n.includes('crunchy')) return 'logos/crunchyroll.PNG';
    if(n.includes('spotify')) return 'logos/spotify.PNG';
    if(n.includes('google')) return 'logos/google-one.PNG';
    if(n.includes('microsoft')||n.includes('365')) return 'logos/microsoft.PNG';
    return 'logo2.PNG';
  }

  function campaignKind(p){
    if(p?.oferta_flash) return 'FLASH';
    if(p?.mecanica==='combo') return 'COMBO';
    if(p?.mecanica==='addon') return 'ADD-ON';
    if(p?.mecanica==='porcentaje') return 'DESCUENTO';
    return String(p?.badge||'PROMO').trim().toUpperCase()||'PROMO';
  }

  function publicTitle(p){
    return String(p?.titulo_publico||p?.nombre||'Promoción GOXION').trim();
  }

  function promoPrice(p){
    if(p?.mecanica==='porcentaje'&&Number(p?.descuento_porcentaje||0)>0){
      return Number(p.descuento_porcentaje)+'% OFF';
    }
    if(p?.mecanica==='addon'){
      return '+$'+money(p?.precio_promocional||0);
    }
    return '$'+money(p?.precio_promocional_total??p?.precio_promocional??0);
  }

  function promoSubprice(p){
    const periods=Math.max(1,Number(p?.duracion_periodos||1));
    if(p?.mecanica==='porcentaje'){
      return '$'+money(p?.precio_promocional_total??p?.precio_promocional??0)+' · '+periods+' periodo'+(periods===1?'':'s');
    }
    return periods+' periodo'+(periods===1?'':'s');
  }

  function statusText(p){
    const acq=p?.adquirida;
    if(acq&&String(acq.estado)==='activa'){
      return 'Ya la tienes · '+Number(acq.periodos_consumidos||0)+'/'+Number(acq.periodos_totales||1)+' periodos';
    }
    if(p?.autenticado===false||p?.elegibilidad?.elegible===null){
      return 'Inicia sesión para confirmar disponibilidad';
    }
    if(p?.elegibilidad?.elegible===false){
      return String(p?.elegibilidad?.motivo||'No disponible para esta cuenta');
    }
    if(p?.adquisicion_habilitada===true){
      return 'Disponible para tu cuenta';
    }
    return 'Próximamente';
  }

  function normalizedPromo(raw,authenticated){
    return {
      ...raw,
      autenticado:authenticated===true,
      items:Array.isArray(raw?.items)?raw.items:[],
      precio_normal_total:Number(raw?.precio_normal_total||0),
      precio_promocional_total:Number(raw?.precio_promocional_total??raw?.precio_promocional||0),
      ahorro_estimado:Number(raw?.ahorro_estimado||0)
    };
  }

  async function loadPromotions(force=false){
    const token=clientToken();
    if(!force&&state.lastToken===token&&state.promotions.length) return;
    if(state.loading) return;
    state.loading=true;
    state.lastToken=token;
    try{
      const response=await fetch(GXCORE.endpoint('promociones-catalogo'),{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(token?{'X-Client-Token':token}:{})
        },
        body:'{}',
        cache:'no-store'
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data?.ok!==true) throw new Error(data?.error||'No fue posible cargar promociones.');
      state.promotions=(data.promociones||[]).map(p=>normalizedPromo(p,data.autenticado));
      maybePreviewPromotions();
      renderPromotions();
      renderCurated();
    }catch(error){
      console.warn('GOXION Promotions C1:',error);
      state.promotions=[];
      maybePreviewPromotions();
      renderPromotions();
    }finally{
      state.loading=false;
    }
  }

  function catalogEntries(){
    return Object.entries(window.catalogGroups||{}).map(([id,brand])=>{
      const plans=Array.isArray(brand?.plans)?brand.plans:[];
      const prices=plans.map(p=>Number(p?.precio||0)).filter(v=>v>0);
      const min=prices.length?Math.min(...prices):0;
      const tag=plans.find(p=>String(p?.etiqueta||'').trim())?.etiqueta||'';
      return {
        id,
        name:String(brand?.name||id),
        img:String(brand?.img||logoFor(brand?.name||id)),
        minPrice:min,
        available:brand?.gxAvailable!==false,
        recommended:brand?.gxRecommended===true,
        score:Number(brand?.gxRecommendationScore||0),
        tag:String(tag||''),
        owned:brand?.gxOwned===true
      };
    });
  }

  function maybePreviewPromotions(){
    if(state.promotions.length) return;
    const preview=new URLSearchParams(location.search).get('promoPreview')==='1';
    if(!preview) return;
    const entries=catalogEntries().filter(x=>x.minPrice>0).slice(0,5);
    if(entries.length<3) return;
    const [a,b,c,d]=entries;
    const onePrice=Math.max(1,Math.round(a.minPrice*.72));
    const comboNormal=b.minPrice+c.minPrice;
    const comboPrice=Math.max(1,Math.round(comboNormal*.78));
    const pct=30;
    const pctPrice=Math.max(1,Math.round((d||c).minPrice*(1-pct/100)));
    state.promotions=[
      {
        id:'preview-price',gx_preview:true,destacada:true,prioridad:30,mecanica:'precio_fijo',
        titulo_publico:'3 meses para disfrutar más',descripcion_publica:'Una de tus plataformas favoritas con precio especial por tres periodos.',
        badge:'PROMO',precio_normal_total:a.minPrice,precio_promocional:onePrice,precio_promocional_total:onePrice,
        ahorro_estimado:a.minPrice-onePrice,duracion_periodos:3,mostrar_precio_anterior:true,adquisicion_habilitada:true,
        elegibilidad:{elegible:true,motivo:'Vista previa C1'},autenticado:true,
        items:[{rol:'principal',servicio:{id:a.id,nombre:a.name,precio:a.minPrice}}]
      },
      {
        id:'preview-combo',gx_preview:true,destacada:true,prioridad:20,mecanica:'combo',
        titulo_publico:b.name+' + '+c.name,descripcion_publica:'Dos experiencias en una sola oferta, con un ahorro visible desde el primer periodo.',
        badge:'COMBO',precio_normal_total:comboNormal,precio_promocional:comboPrice,precio_promocional_total:comboPrice,
        ahorro_estimado:comboNormal-comboPrice,duracion_periodos:3,mostrar_precio_anterior:true,adquisicion_habilitada:true,
        elegibilidad:{elegible:true,motivo:'Vista previa C1'},autenticado:true,
        items:[
          {rol:'incluido',servicio:{id:b.id,nombre:b.name,precio:b.minPrice}},
          {rol:'incluido',servicio:{id:c.id,nombre:c.name,precio:c.minPrice}}
        ]
      },
      {
        id:'preview-percent',gx_preview:true,destacada:true,prioridad:10,mecanica:'porcentaje',
        titulo_publico:'Un descuento que sí se nota',descripcion_publica:'Aprovecha un precio reducido durante los próximos periodos.',
        badge:'30% OFF',descuento_porcentaje:pct,precio_normal_total:(d||c).minPrice,precio_promocional:pctPrice,precio_promocional_total:pctPrice,
        ahorro_estimado:(d||c).minPrice-pctPrice,duracion_periodos:2,mostrar_precio_anterior:true,adquisicion_habilitada:true,
        elegibilidad:{elegible:true,motivo:'Vista previa C1'},autenticado:true,
        items:[{rol:'principal',servicio:{id:(d||c).id,nombre:(d||c).name,precio:(d||c).minPrice}}]
      }
    ];
  }

  function selectedPromotions(){
    const list=[...state.promotions].sort((a,b)=>
      Number(b?.destacada===true)-Number(a?.destacada===true) ||
      Number(b?.prioridad||0)-Number(a?.prioridad||0)
    );
    return list.slice(0,3);
  }

  function logosHtml(p,large=false){
    const items=(p?.items||[]).slice(0,3);
    if(!items.length) return '<img src="logo2.PNG" alt="GOXION">';
    return items.map((item,index)=>{
      const name=item?.servicio?.nombre||'Plataforma';
      return '<img src="'+esc(logoFor(name))+'" alt="'+esc(name)+'" style="--gx-logo-index:'+index+'" class="'+(large?'is-large':'')+'">';
    }).join('');
  }

  function deckCardHtml(p,index){
    const normal=Number(p?.precio_normal_total||0);
    const saving=Number(p?.ahorro_estimado||0);
    const kind=campaignKind(p);
    const title=publicTitle(p);
    const oldPrice=p?.mostrar_precio_anterior!==false&&normal>0
      ? '<s>$'+money(normal)+'</s>'
      :'';
    const savingLine=saving>0
      ? '<span class="gx-promo-saving">Ahorras $'+money(saving)+'</span>'
      :'';
    const preview=p?.gx_preview===true?'<span class="gx-promo-preview-chip">VISTA PREVIA</span>':'';
    return '<button type="button" class="gx-promo-deck-card" data-gx-promo-index="'+index+'" aria-label="Abrir '+esc(title)+'">'+
      '<span class="gx-promo-card-orbit gx-promo-card-orbit-a" aria-hidden="true"></span>'+
      '<span class="gx-promo-card-orbit gx-promo-card-orbit-b" aria-hidden="true"></span>'+
      '<div class="gx-promo-card-top"><span class="gx-promo-card-kind">'+esc(kind)+'</span>'+preview+'</div>'+
      '<div class="gx-promo-card-logos">'+logosHtml(p)+'</div>'+
      '<div class="gx-promo-card-copy">'+
        '<strong>'+esc(title)+'</strong>'+
        '<small>'+esc(String(p?.descripcion_publica||promoSubprice(p)))+'</small>'+
      '</div>'+
      '<div class="gx-promo-card-price">'+
        '<div><b>'+esc(promoPrice(p))+'</b>'+oldPrice+'</div>'+
        '<span>'+esc(promoSubprice(p))+'</span>'+
      '</div>'+
      savingLine+
    '</button>';
  }

  function renderPromotions(){
    const root=$(ROOT_ID),deck=$('gx-promo-deck'),controls=$('gx-promo-deck-controls'),dots=$('gx-promo-dots');
    if(!root||!deck||!controls||!dots) return;
    const list=selectedPromotions();
    stopAuto();

    if(!list.length){
      root.hidden=true;
      deck.innerHTML='';
      controls.hidden=true;
      return;
    }

    state.active=Math.min(state.active,list.length-1);
    root.hidden=false;
    deck.innerHTML=list.map(deckCardHtml).join('');
    dots.innerHTML=list.map((_,i)=>'<button type="button" data-gx-promo-dot="'+i+'" aria-label="Ver promoción '+(i+1)+'"></button>').join('');
    controls.hidden=list.length<2;
    applyDeckPositions();
    bindDeck();
    startAuto();
  }

  function applyDeckPositions(){
    const cards=[...document.querySelectorAll('#gx-promo-deck .gx-promo-deck-card')];
    const list=selectedPromotions();
    if(!cards.length||!list.length) return;

    cards.forEach((card,i)=>{
      card.classList.remove('is-front','is-middle','is-back','is-hidden');
      const offset=(i-state.active+cards.length)%cards.length;
      if(offset===0) card.classList.add('is-front');
      else if(offset===1) card.classList.add('is-middle');
      else if(offset===2) card.classList.add('is-back');
      else card.classList.add('is-hidden');
      card.setAttribute('aria-hidden',offset>2?'true':'false');
    });
    document.querySelectorAll('[data-gx-promo-dot]').forEach((dot,i)=>{
      dot.classList.toggle('active',i===state.active);
      dot.setAttribute('aria-current',i===state.active?'true':'false');
    });
    const status=$('gx-promo-deck-status');
    if(status) status.textContent=(state.active+1)+' / '+cards.length;
  }

  function moveDeck(direction){
    const list=selectedPromotions();
    if(list.length<2) return;
    state.active=(state.active+direction+list.length)%list.length;
    applyDeckPositions();
    restartAuto();
  }

  function bindDeck(){
    const deck=$('gx-promo-deck');
    if(!deck||deck.dataset.gxBound==='1') return;
    deck.dataset.gxBound='1';

    deck.addEventListener('click',event=>{
      const card=event.target.closest('.gx-promo-deck-card');
      if(!card) return;
      const index=Number(card.dataset.gxPromoIndex||0);
      if(index!==state.active){
        state.active=index;
        applyDeckPositions();
        restartAuto();
        return;
      }
      openPromoDetail(selectedPromotions()[index]);
    });

    deck.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0) return;
      state.pointerStart={x:event.clientX,y:event.clientY};
      stopAuto();
    },{passive:true});

    deck.addEventListener('pointerup',event=>{
      const start=state.pointerStart;
      state.pointerStart=null;
      if(!start){startAuto();return}
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.15){
        moveDeck(dx<0?1:-1);
      }else{
        startAuto();
      }
    },{passive:true});

    deck.addEventListener('pointercancel',()=>{state.pointerStart=null;startAuto()},{passive:true});

    $('gx-promo-prev')?.addEventListener('click',()=>moveDeck(-1));
    $('gx-promo-next')?.addEventListener('click',()=>moveDeck(1));
    $('gx-promo-dots')?.addEventListener('click',event=>{
      const dot=event.target.closest('[data-gx-promo-dot]');
      if(!dot) return;
      state.active=Number(dot.dataset.gxPromoDot||0);
      applyDeckPositions();
      restartAuto();
    });
  }

  function startAuto(){
    stopAuto();
    if(reduced()||document.hidden||selectedPromotions().length<2||document.querySelector('.gx-promo-expanded')) return;
    state.timer=setInterval(()=>moveDeck(1),7600);
  }
  function stopAuto(){
    if(state.timer){clearInterval(state.timer);state.timer=null}
  }
  function restartAuto(){stopAuto();startAuto()}

  function detailItems(p){
    return (p?.items||[]).map(item=>{
      const name=item?.servicio?.nombre||'Plataforma';
      const price=Number(item?.servicio?.precio||0);
      const role=item?.rol==='disparador'?'Base':item?.rol==='complemento'?'Complemento':'Incluida';
      return '<div class="gx-promo-detail-item">'+
        '<img src="'+esc(logoFor(name))+'" alt="">'+
        '<span><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span>'+
        (price>0?'<b>$'+money(price)+'</b>':'')+
      '</div>';
    }).join('');
  }

  function openPromoDetail(p){
    if(!p) return;
    stopAuto();
    document.querySelector('.gx-promo-expanded')?.remove();
    const root=$(ROOT_ID);
    if(!root) return;

    const panel=document.createElement('div');
    panel.className='gx-promo-expanded';
    const saving=Number(p?.ahorro_estimado||0);
    const normal=Number(p?.precio_normal_total||0);
    const description=String(p?.descripcion_publica||'Una oferta preparada dentro del catálogo GOXION.');
    const detailStatus=statusText(p);
    const primaryItem=p?.items?.[0]?.servicio?.nombre||'';

    panel.innerHTML=
      '<div class="gx-promo-expanded-backdrop" data-gx-promo-close></div>'+
      '<article class="gx-promo-expanded-card" role="dialog" aria-modal="true" aria-label="'+esc(publicTitle(p))+'">'+
        '<button type="button" class="gx-promo-expanded-close" data-gx-promo-close aria-label="Cerrar">×</button>'+
        '<div class="gx-promo-expanded-top"><span>'+esc(campaignKind(p))+'</span>'+(p?.gx_preview?'<b>VISTA PREVIA C1</b>':'')+'</div>'+
        '<div class="gx-promo-expanded-logos">'+logosHtml(p,true)+'</div>'+
        '<h3>'+esc(publicTitle(p))+'</h3>'+
        '<p>'+esc(description)+'</p>'+
        '<div class="gx-promo-expanded-price"><div><strong>'+esc(promoPrice(p))+'</strong>'+(normal>0&&p?.mostrar_precio_anterior!==false?'<s>$'+money(normal)+'</s>':'')+'</div><span>'+esc(promoSubprice(p))+'</span></div>'+
        (saving>0?'<div class="gx-promo-expanded-saving">Ahorras <strong>$'+money(saving)+'</strong> con esta oferta.</div>':'')+
        '<div class="gx-promo-detail-items">'+detailItems(p)+'</div>'+
        '<div class="gx-promo-expanded-status"><span></span><strong>'+esc(detailStatus)+'</strong></div>'+
        '<div class="gx-promo-expanded-actions">'+
          (primaryItem?'<button type="button" class="gx-promo-detail-secondary" data-gx-promo-service="'+esc(primaryItem)+'">Ver en catálogo</button>':'')+
          (!clientToken()?'<button type="button" class="gx-promo-detail-primary" data-gx-promo-login>Iniciar sesión</button>':'')+
        '</div>'+
      '</article>';

    root.appendChild(panel);
    requestAnimationFrame(()=>panel.classList.add('active'));

    panel.addEventListener('click',event=>{
      if(event.target.closest('[data-gx-promo-close]')){
        closePromoDetail(panel); return;
      }
      const serviceBtn=event.target.closest('[data-gx-promo-service]');
      if(serviceBtn){
        const serviceName=serviceBtn.dataset.gxPromoService||'';
        closePromoDetail(panel);
        setTimeout(()=>focusCatalogBrandByName(serviceName),220);
        return;
      }
      if(event.target.closest('[data-gx-promo-login]')){
        closePromoDetail(panel);
        setTimeout(()=>window.openAuthSheet?.(),180);
      }
    });
  }

  function closePromoDetail(panel=document.querySelector('.gx-promo-expanded')){
    if(!panel)return;
    panel.classList.remove('active');
    setTimeout(()=>{panel.remove();startAuto()},260);
  }

  function brandPromoSaving(entry){
    let best=0;
    const key=norm(entry.name);
    for(const p of state.promotions){
      const involved=(p.items||[]).some(item=>{
        const name=norm(item?.servicio?.nombre||'');
        return name.includes(key)||key.includes(name);
      });
      if(!involved)continue;
      const normal=Number(p.precio_normal_total||0);
      const saving=Number(p.ahorro_estimado||0);
      if(normal>0&&saving>0) best=Math.max(best,saving/normal);
    }
    return best;
  }

  function rankEntries(mode){
    const entries=catalogEntries().filter(x=>x.available&&!x.owned);
    return entries.sort((a,b)=>{
      if(mode==='saving'){
        const sa=brandPromoSaving(a),sb=brandPromoSaving(b);
        const ta=/ahorro|promo|oferta|descuento/i.test(a.tag)?1:0;
        const tb=/ahorro|promo|oferta|descuento/i.test(b.tag)?1:0;
        if(sb!==sa)return sb-sa;
        if(tb!==ta)return tb-ta;
      }else{
        const pa=/popular|top|favorit/i.test(a.tag)?1:0;
        const pb=/popular|top|favorit/i.test(b.tag)?1:0;
        if(pb!==pa)return pb-pa;
        if(Number(b.recommended)!==Number(a.recommended))return Number(b.recommended)-Number(a.recommended);
        if(b.score!==a.score)return b.score-a.score;
      }
      return a.minPrice-b.minPrice||a.name.localeCompare(b.name,'es');
    });
  }

  function miniCard(entry,context='popular'){
    const saving=brandPromoSaving(entry);
    let meta=entry.tag||('Desde $'+money(entry.minPrice));
    if(context==='saving'&&saving>0) meta=Math.round(saving*100)+'% de ahorro disponible';
    else if(entry.recommended) meta='Recomendado para ti';
    return '<button type="button" class="gx-catalog-mini-card" data-gx-brand="'+esc(entry.id)+'">'+
      '<div class="gx-catalog-mini-logo"><img src="'+esc(entry.img||logoFor(entry.name))+'" alt="'+esc(entry.name)+'"></div>'+
      '<div class="gx-catalog-mini-copy"><strong>'+esc(entry.name)+'</strong><small>'+esc(meta)+'</small></div>'+
      '<div class="gx-catalog-mini-price">Desde <b>$'+money(entry.minPrice)+'</b></div>'+
      '<span class="gx-catalog-mini-arrow">›</span>'+
    '</button>';
  }

  function renderCurated(){
    const section=$('gx-catalog-curated');
    const best=$('gx-catalog-best-rail');
    const discover=$('gx-catalog-discover-rail');
    if(!section||!best||!discover) return;
    const entries=catalogEntries();
    if(!entries.length){section.hidden=true;return}

    const ranked=rankEntries(state.curatedMode);
    const bestEntries=ranked.slice(0,4);
    const used=new Set(bestEntries.map(x=>x.id));
    const discoverEntries=entries
      .filter(x=>x.available&&!x.owned&&!used.has(x.id))
      .sort((a,b)=>a.score-b.score||b.minPrice-a.minPrice)
      .slice(0,4);

    best.innerHTML=bestEntries.map(x=>miniCard(x,state.curatedMode)).join('');
    discover.innerHTML=discoverEntries.map(x=>miniCard(x,'discover')).join('');
    section.hidden=!bestEntries.length;

    section.querySelectorAll('[data-gx-brand]').forEach(btn=>{
      btn.addEventListener('click',()=>focusCatalogBrand(btn.dataset.gxBrand||''));
    });
  }

  function focusCatalogBrand(id){
    const card=document.getElementById('brand-card-'+id);
    if(!card)return;
    card.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
    setTimeout(()=>{
      if(!card.classList.contains('expanded')&&typeof window.toggleBrandCard==='function') window.toggleBrandCard(id);
    },reduced()?0:430);
  }

  function focusCatalogBrandByName(name){
    const target=norm(name);
    const entry=catalogEntries().find(x=>{
      const n=norm(x.name);
      return n.includes(target)||target.includes(n);
    });
    if(entry)focusCatalogBrand(entry.id);
  }

  function bindCuratedSwitch(){
    document.querySelectorAll('[data-gx-curated-mode]').forEach(btn=>{
      if(btn.dataset.gxBound==='1')return;
      btn.dataset.gxBound='1';
      btn.addEventListener('click',()=>{
        state.curatedMode=btn.dataset.gxCuratedMode||'popular';
        document.querySelectorAll('[data-gx-curated-mode]').forEach(x=>x.classList.toggle('active',x===btn));
        renderCurated();
      });
    });
  }

  function syncSearchState(){
    const field=$('gx-catalog-search');
    const view=$('view-catalogo');
    if(!field||!view)return;
    view.classList.toggle('gx-catalog-searching',String(field.value||'').trim().length>0);
  }

  function bindSearch(){
    const field=$('gx-catalog-search');
    if(!field||field.dataset.gxPromoBound==='1')return;
    field.dataset.gxPromoBound='1';
    field.addEventListener('input',syncSearchState);
    syncSearchState();
  }

  function wrapCatalogRenderer(){
    const previous=window.cargarCatalogo;
    if(typeof previous!=='function'||previous.__gxPromotionsC1)return;
    function wrapped(data){
      const result=previous.apply(this,arguments);
      state.latestData=data;
      maybePreviewPromotions();
      renderPromotions();
      renderCurated();
      bindCuratedSwitch();
      bindSearch();
      const token=clientToken();
      if(token!==state.lastToken) loadPromotions(true);
      return result;
    }
    wrapped.__gxPromotionsC1=true;
    window.cargarCatalogo=wrapped;
  }

  document.addEventListener('visibilitychange',()=>document.hidden?stopAuto():startAuto());
  window.addEventListener('beforeunload',stopAuto,{once:true});

  wrapCatalogRenderer();
  bindCuratedSwitch();
  bindSearch();
  loadPromotions(true);
})();