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
    loading:false,
    expandedCard:null,
    expandedOrigin:null,
    expandedPlaceholder:null,
    expandedClickHandler:null,
    expandedKeyHandler:null,
    pendingPromoRender:false,
    morphBackdrop:null
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

  function brandPalette(name=''){
    const n=norm(name);
    if(n.includes('netflix')) return {brand:'#8f1118',deep:'#360609',accent:'#ef3340'};
    if(n.includes('disney')) return {brand:'#164caa',deep:'#071d4e',accent:'#58a8ff'};
    if(n.includes('hbo')||n==='max'||n.includes('max ')) return {brand:'#6636a8',deep:'#24113f',accent:'#b78cff'};
    if(n.includes('prime')||n.includes('amazon')) return {brand:'#0877a8',deep:'#062d46',accent:'#53d6ff'};
    if(n.includes('youtube')) return {brand:'#a8141b',deep:'#410508',accent:'#ff4d55'};
    if(n.includes('vix')) return {brand:'#b56d08',deep:'#3e2104',accent:'#ffc15a'};
    if(n.includes('crunchy')) return {brand:'#b84e12',deep:'#401505',accent:'#ff9b4a'};
    if(n.includes('spotify')) return {brand:'#157a42',deep:'#07341e',accent:'#62df91'};
    if(n.includes('google')) return {brand:'#2e5ea5',deep:'#10254b',accent:'#79a7ff'};
    if(n.includes('microsoft')||n.includes('365')) return {brand:'#25698d',deep:'#0b2d43',accent:'#74d2ff'};
    return {brand:'#5740a0',deep:'#1b123f',accent:'#9f8cff'};
  }

  function promoPlatformTitle(p){
    const names=(p?.items||[]).map(x=>String(x?.servicio?.nombre||'').trim()).filter(Boolean);
    if(!names.length) return publicTitle(p);
    return names.slice(0,2).join(' + ');
  }

  function promoPalette(p){
    const names=(p?.items||[]).map(x=>String(x?.servicio?.nombre||'').trim()).filter(Boolean);
    const first=brandPalette(names[0]||'');
    const second=brandPalette(names[1]||names[0]||'');
    return {...first,accent:second.accent||first.accent};
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

  function promoDurationLabel(p){
    const periods=Math.max(1,Number(p?.duracion_periodos||1));
    return periods+' periodo'+(periods===1?'':'s');
  }

  function promoContractPrice(p){
    return Math.max(0,Number(p?.precio_promocional_total??p?.precio_promocional??0));
  }

  function promoContractState(p){
    if(p?.adquirida&&String(p.adquirida.estado)==='activa'){
      return {enabled:false,label:'Ya la tienes'};
    }
    if(p?.autenticado===true&&p?.elegibilidad?.elegible===false){
      return {enabled:false,label:'No disponible'};
    }
    if(p?.adquisicion_habilitada!==true){
      return {enabled:false,label:'Próximamente'};
    }
    return {enabled:true,label:'Contratar ahora'};
  }

  function promoCartLabel(p){
    return campaignKind(p)+' · '+publicTitle(p);
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
      precio_promocional_total:Number(raw?.precio_promocional_total??raw?.precio_promocional??0),
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
    if(!items.length) return '<img src="logo2.PNG" alt="GOXION" class="gx-promo-logo-item">';
    const combo=items.length>1;
    return items.map((item,index)=>{
      const name=item?.servicio?.nombre||'Plataforma';
      const classes=[
        'gx-promo-logo-item',
        combo?'is-combo':'is-single',
        'gx-logo-pos-'+index,
        large?'is-large':''
      ].filter(Boolean).join(' ');
      return '<img src="'+esc(logoFor(name))+'" alt="'+esc(name)+'" class="'+classes+'">';
    }).join('');
  }

  function deckCardHtml(p,index){
    const normal=Number(p?.precio_normal_total||0);
    const saving=Number(p?.ahorro_estimado||0);
    const kind=campaignKind(p);
    const title=publicTitle(p);
    const platform=promoPlatformTitle(p);
    const palette=promoPalette(p);
    const description=String(p?.descripcion_publica||'Descubre los detalles de esta promoción.');
    const contract=promoContractState(p);
    const promoTotal=promoContractPrice(p);
    const oldPrice=p?.mostrar_precio_anterior!==false&&normal>0
      ? '<s>$'+money(normal)+'</s>'
      :'';
    const savingLine=saving>0
      ? '<div class="gx-promo-saving"><strong>Ahorras $'+money(saving)+'</strong></div>'
      :'';
    const percentDetail=p?.mecanica==='porcentaje'&&promoTotal>0
      ? '<div class="gx-promo-summary-item"><span>Precio promo</span><strong>$'+money(promoTotal)+'</strong></div>'
      :'';
    const preview=p?.gx_preview===true?'<span class="gx-promo-preview-chip">PREVIEW</span>':'';
    const comboClass=(p?.items||[]).length>1?' is-combo':'';
    const mechanicClass=' gx-mechanic-'+String(p?.mecanica||'promo').replace(/[^a-z0-9_-]/gi,'');
    const style='--gx-brand:'+palette.brand+';--gx-brand-deep:'+palette.deep+';--gx-brand-accent:'+palette.accent+';';

    return '<article class="gx-promo-deck-card'+comboClass+mechanicClass+'" style="'+esc(style)+'" data-gx-promo-index="'+index+'" role="button" tabindex="0" aria-label="Abrir '+esc(title)+'" aria-expanded="false">'+
      '<span class="gx-promo-card-aurora" aria-hidden="true"></span>'+
      '<span class="gx-promo-card-glow" aria-hidden="true"></span>'+
      '<div class="gx-promo-card-top"><span class="gx-promo-card-kind">'+esc(kind)+'</span>'+preview+'</div>'+
      '<button type="button" class="gx-promo-morph-close" data-gx-promo-close aria-label="Cerrar promoción">×</button>'+
      '<div class="gx-promo-card-logos'+comboClass+'">'+logosHtml(p)+'</div>'+
      '<div class="gx-promo-card-copy">'+
        '<strong class="gx-promo-platform-name">'+esc(platform)+'</strong>'+
        (title!==platform?'<span class="gx-promo-offer-title">'+esc(title)+'</span>':'')+
        '<p class="gx-promo-card-description">'+esc(description)+'</p>'+
      '</div>'+
      '<div class="gx-promo-card-price">'+
        '<div class="gx-promo-price-stack"><b>'+esc(promoPrice(p))+'</b>'+oldPrice+'</div>'+
      '</div>'+
      '<div class="gx-promo-card-footer">'+
        savingLine+
        '<button type="button" class="gx-promo-info-hint" data-gx-promo-details>Ver detalles</button>'+
      '</div>'+
      '<div class="gx-promo-morph-detail" aria-hidden="true">'+
        '<div class="gx-promo-detail-summary">'+
          '<div class="gx-promo-summary-item"><span>Duración</span><strong>'+esc(promoDurationLabel(p))+'</strong></div>'+
          percentDetail+
          '<div class="gx-promo-summary-item gx-promo-summary-status"><span>Estado</span><strong>'+esc(statusText(p))+'</strong></div>'+
        '</div>'+
        '<div class="gx-promo-detail-items">'+detailItems(p)+'</div>'+
        '<div class="gx-promo-expanded-actions">'+
          ((p?.items?.[0]?.servicio?.nombre)?'<button type="button" class="gx-promo-detail-secondary" data-gx-promo-service="'+esc(p.items[0].servicio.nombre)+'">Ver en catálogo</button>':'')+
          '<button type="button" class="gx-promo-detail-primary" data-gx-promo-contract '+(contract.enabled?'':'disabled')+'>'+esc(contract.label)+'</button>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function renderPromotions(){
    if(state.expandedCard){
      state.pendingPromoRender=true;
      return;
    }
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
      card.classList.remove('is-front','is-left','is-right','is-hidden','is-middle','is-back');
      const previous=(state.active-1+cards.length)%cards.length;
      const next=(state.active+1)%cards.length;
      if(i===state.active) card.classList.add('is-front');
      else if(i===previous) card.classList.add('is-left');
      else if(i===next) card.classList.add('is-right');
      else card.classList.add('is-hidden');
      card.setAttribute('aria-hidden',i===state.active?'false':'true');
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

  function addPromotionToCart(p,button){
    const price=promoContractPrice(p);
    const contract=promoContractState(p);
    if(!contract.enabled||price<=0||typeof window.GOXION_CATALOG_CART?.add!=='function') return false;

    const label=promoCartLabel(p);
    const safeId='promo-'+String(p?.id||label).replace(/[^a-z0-9_-]/gi,'').slice(0,32);
    window.GOXION_CATALOG_CART.add(label,price,safeId);

    if(button){
      const original=button.textContent;
      button.disabled=true;
      button.classList.add('is-added');
      button.textContent='✓ Agregado al carrito';
      setTimeout(()=>{
        button.classList.remove('is-added');
        button.disabled=false;
        button.textContent=original||'Contratar ahora';
      },900);
    }
    return true;
  }

  function bindDeck(){
    const deck=$('gx-promo-deck');
    if(!deck||deck.dataset.gxBound==='1') return;
    deck.dataset.gxBound='1';

    // Safari/WebKit: resolvemos "Ver detalles" en capture antes de mover
    // la misma tarjeta fuera del carrusel para el morph.
    deck.addEventListener('click',event=>{
      const detailsBtn=event.target.closest('[data-gx-promo-details]');
      if(!detailsBtn) return;
      const card=detailsBtn.closest('.gx-promo-deck-card');
      if(!card) return;
      event.preventDefault();
      event.stopPropagation();
      const index=Number(card.dataset.gxPromoIndex||0);
      if(index!==state.active){
        state.active=index;
        applyDeckPositions();
      }
      stopAuto();
      // WebKit es más estable si el reparent del mismo nodo ocurre después
      // de terminar la propagación del click actual.
      setTimeout(()=>{
        if(!state.expandedCard) openPromoDetail(selectedPromotions()[index],card);
      },0);
    },true);

    deck.addEventListener('click',event=>{
      const card=event.target.closest('.gx-promo-deck-card');
      if(!card) return;

      if(event.target.closest('[data-gx-promo-close]')){
        event.stopPropagation();
        closePromoDetail(card);
        return;
      }
      const serviceBtn=event.target.closest('[data-gx-promo-service]');
      if(serviceBtn){
        event.stopPropagation();
        const serviceName=serviceBtn.dataset.gxPromoService||'';
        closePromoDetail(card);
        setTimeout(()=>focusCatalogBrandByName(serviceName),420);
        return;
      }
      if(event.target.closest('[data-gx-promo-login]')){
        event.stopPropagation();
        closePromoDetail(card);
        setTimeout(()=>window.openAuthSheet?.(),420);
        return;
      }
      if(card.classList.contains('is-expanded')) return;

      const index=Number(card.dataset.gxPromoIndex||0);
      if(index!==state.active){
        state.active=index;
        applyDeckPositions();
        restartAuto();
        return;
      }
      openPromoDetail(selectedPromotions()[index],card);
    });

    deck.addEventListener('keydown',event=>{
      const card=event.target.closest('.gx-promo-deck-card');
      if(!card||event.target.closest('button')) return;
      if((event.key==='Enter'||event.key===' ')&&!card.classList.contains('is-expanded')){
        event.preventDefault();
        const index=Number(card.dataset.gxPromoIndex||0);
        if(index!==state.active){
          state.active=index;
          applyDeckPositions();
          restartAuto();
        }else{
          openPromoDetail(selectedPromotions()[index],card);
        }
      }
      if(event.key==='Escape'&&card.classList.contains('is-expanded')){
        event.preventDefault();
        closePromoDetail(card);
      }
    });

    deck.addEventListener('pointerdown',event=>{
      if(state.expandedCard) return;
      if(event.pointerType==='mouse'&&event.button!==0) return;
      state.pointerStart={x:event.clientX,y:event.clientY};
      stopAuto();
    },{passive:true});

    deck.addEventListener('pointerup',event=>{
      if(state.expandedCard) return;
      const start=state.pointerStart;
      state.pointerStart=null;
      if(!start){startAuto();return}
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy)*1.12){
        moveDeck(dx<0?1:-1);
      }else{
        startAuto();
      }
    },{passive:true});

    deck.addEventListener('pointercancel',()=>{
      state.pointerStart=null;
      if(!state.expandedCard) startAuto();
    },{passive:true});

    const prev=$('gx-promo-prev');
    const next=$('gx-promo-next');
    if(prev) prev.onclick=()=>moveDeck(-1);
    if(next) next.onclick=()=>moveDeck(1);
    window.gxPromoCatalogPrev=()=>moveDeck(-1);
    window.gxPromoCatalogNext=()=>moveDeck(1);
    $('gx-promo-dots')?.addEventListener('click',event=>{
      if(state.expandedCard) return;
      const dot=event.target.closest('[data-gx-promo-dot]');
      if(!dot) return;
      state.active=Number(dot.dataset.gxPromoDot||0);
      applyDeckPositions();
      restartAuto();
    });
  }

  function startAuto(){
    stopAuto();
    if(reduced()||document.hidden||selectedPromotions().length<2||state.expandedCard) return;
    state.timer=setInterval(()=>moveDeck(1),6800);
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

  function createMorphBackdrop(){
    state.morphBackdrop?.remove();
    const backdrop=document.createElement('div');
    backdrop.className='gx-promo-morph-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    backdrop.addEventListener('click',()=>closePromoDetail(state.expandedCard));
    document.body.appendChild(backdrop);
    state.morphBackdrop=backdrop;
    requestAnimationFrame(()=>backdrop.classList.add('active'));
  }

  function openPromoDetail(p,card){
    if(!p||!card||state.expandedCard) return;
    stopAuto();

    const rect=card.getBoundingClientRect();
    state.expandedCard=card;
    state.expandedOrigin={top:rect.top,left:rect.left,width:rect.width,height:rect.height,scrollY:window.scrollY};
    state.pendingPromoRender=false;

    const targetWidth=Math.min(window.innerWidth-44,352);
    const maxHeight=Math.max(460,window.innerHeight-52);
    const itemCount=Math.min(3,(p?.items||[]).length);
    const targetHeight=Math.min(maxHeight,itemCount>1?536:504);
    const targetLeft=Math.max(22,(window.innerWidth-targetWidth)/2);
    const targetTop=Math.max(26,(window.innerHeight-targetHeight)/2);

    const placeholder=document.createElement('div');
    placeholder.className='gx-promo-morph-placeholder';
    placeholder.dataset.gxPromoIndex=String(card.dataset.gxPromoIndex||0);
    placeholder.style.width=rect.width+'px';
    placeholder.style.height=rect.height+'px';
    card.parentNode?.insertBefore(placeholder,card);
    state.expandedPlaceholder=placeholder;
    document.body.appendChild(card);

    const expandedClickHandler=(event)=>{
      if(event.target.closest('[data-gx-promo-close]')){
        event.preventDefault();event.stopPropagation();closePromoDetail(card);return;
      }
      const serviceBtn=event.target.closest('[data-gx-promo-service]');
      if(serviceBtn){
        event.preventDefault();event.stopPropagation();
        const serviceName=serviceBtn.dataset.gxPromoService||'';
        closePromoDetail(card);
        setTimeout(()=>focusCatalogBrandByName(serviceName),560);
        return;
      }
      const contractBtn=event.target.closest('[data-gx-promo-contract]');
      if(contractBtn){
        event.preventDefault();event.stopPropagation();
        const index=Number(card.dataset.gxPromoIndex||0);
        const current=selectedPromotions()[index];
        if(addPromotionToCart(current,contractBtn)) setTimeout(()=>closePromoDetail(card),420);
      }
    };
    const expandedKeyHandler=(event)=>{
      if(event.key==='Escape'){event.preventDefault();closePromoDetail(card)}
    };
    state.expandedClickHandler=expandedClickHandler;
    state.expandedKeyHandler=expandedKeyHandler;
    card.addEventListener('click',expandedClickHandler);
    card.addEventListener('keydown',expandedKeyHandler);

    Object.assign(card.style,{
      position:'fixed',
      inset:'auto',
      top:rect.top+'px',
      left:rect.left+'px',
      width:rect.width+'px',
      height:rect.height+'px',
      transform:'none',
      zIndex:'2102',
      margin:'0',
      willChange:'top,left,width,height,border-radius'
    });
    card.setAttribute('aria-expanded','true');

    createMorphBackdrop();
    document.documentElement.classList.add('gx-promo-morph-open');
    document.body.classList.add('gx-promo-morph-open');

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        card.classList.add('is-expanded');
        card.querySelector('.gx-promo-morph-detail')?.setAttribute('aria-hidden','false');
        card.style.top=targetTop+'px';
        card.style.left=targetLeft+'px';
        card.style.width=targetWidth+'px';
        card.style.height=targetHeight+'px';
      });
    });
  }

  function closePromoDetail(card=state.expandedCard){
    if(!card||card!==state.expandedCard||card.classList.contains('is-closing')) return;
    const origin=state.expandedOrigin;
    card.classList.add('is-closing');
    card.querySelector('.gx-promo-morph-detail')?.setAttribute('aria-hidden','true');
    state.morphBackdrop?.classList.remove('active');

    // 1) Detalles desaparecen sin cambiar todavía el layout principal.
    setTimeout(()=>{
      if(card!==state.expandedCard) return;
      card.classList.add('is-returning');
      if(origin){
        card.style.top=origin.top+'px';
        card.style.left=origin.left+'px';
        card.style.width=origin.width+'px';
        card.style.height=origin.height+'px';
      }
    },140);

    // 2) Al terminar la contracción regresamos exactamente el mismo nodo al deck.
    setTimeout(()=>{
      if(card!==state.expandedCard) return;

      card.classList.remove('is-expanded','is-closing','is-returning');
      if(state.expandedClickHandler) card.removeEventListener('click',state.expandedClickHandler);
      if(state.expandedKeyHandler) card.removeEventListener('keydown',state.expandedKeyHandler);
      state.expandedClickHandler=null;
      state.expandedKeyHandler=null;

      const placeholder=state.expandedPlaceholder;
      if(placeholder?.parentNode){
        placeholder.parentNode.insertBefore(card,placeholder);
        placeholder.remove();
      }else{
        const deck=$('gx-promo-deck');
        if(deck) deck.appendChild(card);
      }
      state.expandedPlaceholder=null;

      for(const prop of ['position','inset','top','left','width','height','transform','z-index','margin','will-change','max-height']){
        card.style.removeProperty(prop);
      }
      card.setAttribute('aria-expanded','false');

      document.documentElement.classList.remove('gx-promo-morph-open');
      document.body.classList.remove('gx-promo-morph-open');
      state.morphBackdrop?.remove();
      state.morphBackdrop=null;
      state.expandedCard=null;
      state.expandedOrigin=null;

      if(state.pendingPromoRender){
        state.pendingPromoRender=false;
        renderPromotions();
        renderCurated();
      }else{
        applyDeckPositions();
        requestAnimationFrame(()=>startAuto());
      }
    },620);
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
