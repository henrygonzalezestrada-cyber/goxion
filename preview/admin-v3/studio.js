'use strict';
/**
 * GOXION Admin V3 — SOLO PROTOTIPO.
 * NO Supabase, NO cookies, NO sesiones, NO API, NO escrituras.
 * Las funciones financieras y B2 productivas NO se recrean aquí.
 * Todas las cantidades, personas, servicios y fechas son ficticios.
 */
(() => {
  const clients = [
    {
      id:'GX-1042',name:'Valeria Cruz',state:'due',stateLabel:'Por vencer',nextDate:'15 NOV',
      amount:249,benefit:'Beneficios disponibles',account:'Cuenta activa',
      services:[
        {name:'YouTube Premium',accesses:[{name:'Acceso 1',date:'15 NOV',coverage:'Cobertura simulada'}, {name:'Acceso 2',date:'23 NOV',coverage:'Cobertura simulada'}]},
        {name:'Netflix',accesses:[{name:'Acceso 1',date:'23 NOV',coverage:'Cobertura simulada'}]}
      ]
    },
    {
      id:'GX-1048',name:'Mateo Díaz',state:'review',stateLabel:'En revisión',nextDate:'15 NOV',
      amount:399,benefit:'En seguimiento',account:'Cuenta activa',
      services:[
        {name:'Spotify',accesses:[{name:'Acceso 1',date:'15 NOV',coverage:'Cobertura simulada'}]},
        {name:'Disney+',accesses:[{name:'Acceso 1',date:'15 NOV',coverage:'Cobertura simulada'}]}
      ]
    },
    {
      id:'GX-1056',name:'Sofía Herrera',state:'current',stateLabel:'Al corriente',nextDate:'28 NOV',
      amount:179,benefit:'Activo',account:'Cuenta activa',
      services:[{name:'YouTube Premium',accesses:[{name:'Acceso 1',date:'28 NOV',coverage:'Cobertura simulada'}]}]
    },
    {
      id:'GX-1061',name:'Emilio Rojas',state:'late',stateLabel:'Pendiente',nextDate:'10 NOV',
      amount:289,benefit:'Disponible',account:'Cuenta activa',
      services:[
        {name:'Netflix',accesses:[{name:'Acceso 1',date:'10 NOV',coverage:'Cobertura simulada'}]},
        {name:'Max',accesses:[{name:'Acceso 1',date:'10 NOV',coverage:'Cobertura simulada'}]}
      ]
    }
  ];
  const operations = [
    {id:'OP-01',type:'payments',title:'Comprobante por revisar',desc:'Validación de pago pendiente',clientId:'GX-1048',typeLabel:'PAGO / REVISIÓN',open:true},
    {id:'OP-02',type:'requests',title:'Cancelación por hacer efectiva',desc:'Solicitud aprobada; baja aún no ejecutada',clientId:'GX-1042',typeLabel:'SOLICITUD / CANCELACIÓN',open:true},
    {id:'OP-03',type:'requests',title:'Seguimiento de soporte',desc:'El cliente espera una respuesta',clientId:'GX-1061',typeLabel:'SOLICITUD / SOPORTE',open:true},
    {id:'OP-04',type:'activity',title:'Servicio actualizado',desc:'Registro histórico de ejemplo',clientId:'GX-1056',typeLabel:'ACTIVIDAD / HISTÓRICO',open:false}
  ];
  const state={page:'home',clientFilter:'all',search:'',opFilter:'pending',opClient:null,client:null,detail:'summary'};
  const byId=(id)=>document.getElementById(id);
  const icon=(name)=>'<svg aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
  const h=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=(n)=>'$'+Number(n).toLocaleString('es-MX');
  const client=(id)=>clients.find(c=>c.id===id);
  const names=(c)=>c.services.map(s=>s.name).join(' · ');
  const countAccess=(c)=>c.services.reduce((n,s)=>n+s.accesses.length,0);
  const normalized=(s)=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function revealPage(page,focus=true) {
    if(!['home','clients','operations','management'].includes(page))return;
    state.page=page;
    document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!=='view-'+page;});
    document.querySelectorAll('[data-route]').forEach(b=>{
      const active=b.dataset.route===page;
      if(b.classList.contains('nav-link')||b.classList.contains('dock-link')) {
        b.classList.toggle('is-active',active);
        if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
      }
    });
    if(page==='clients')renderClients();
    if(page==='operations')renderOps();
    if(focus){window.scrollTo({top:0,behavior:'auto'});byId('main-content').focus({preventScroll:true});}
  }
  function navigate(page) {
    if(page==='clients') {
      state.client=null;
      byId('client-directory').hidden=false;
      byId('client-workspace').hidden=true;
    }
    if(page==='operations'){state.opClient=null;renderOps();}
    revealPage(page);
  }
  function renderHome(){
    byId('home-queue').innerHTML=operations.filter(op=>op.open).map((op,i)=>{
      const c=client(op.clientId);
      return '<button type="button" class="activity-row" data-open-client="'+h(c.id)+'"><span class="activity-rank">0'+(i+1)+'</span><span><span class="activity-title">'+h(op.title)+'</span><span class="activity-detail">'+h(c.name)+' · '+h(op.desc)+'</span><span class="activity-meta">'+h(op.typeLabel)+'</span></span><svg class="activity-tail" aria-hidden="true"><use href="#i-chevron"></use></svg></button>';
    }).join('');
    byId('agenda-list').innerHTML=[clients[0],clients[1],clients[2]].map(c=>{
      const [day,month]=c.nextDate.split(' ');
      return '<button type="button" class="agenda-item" data-open-client="'+h(c.id)+'"><span class="agenda-date"><strong>'+h(day)+'</strong><small>'+h(month)+'</small></span><span class="agenda-copy"><strong>'+h(c.name)+'</strong><small>'+h(names(c))+'</small></span><span class="agenda-amount">'+money(c.amount)+'</span></button>';
    }).join('');
  }
  function renderClients(){
    const search=normalized(state.search);
    const shown=clients.filter(c=>{
      const matchFilter=state.clientFilter==='all' || (state.clientFilter==='current'?c.state==='current':c.state!=='current');
      const matchQuery=!search || normalized(c.name).includes(search)||normalized(c.id).includes(search);
      return matchFilter&&matchQuery;
    });
    byId('client-grid').innerHTML=shown.map(c=>{
      const idx=clients.indexOf(c)+1;
      return '<button type="button" class="client-card" data-open-client="'+h(c.id)+'" data-state="'+h(c.state)+'" aria-label="Abrir expediente de '+h(c.name)+'">'+
        '<span class="client-top"><span class="client-number">'+h(c.id)+' / 0'+idx+'</span><span class="client-state '+h(c.state)+'">'+h(c.stateLabel)+'</span></span>'+
        '<span><span class="client-name">'+h(c.name)+'</span><span class="client-description">'+h(names(c))+'</span></span>'+
        '<span class="client-facts"><span><span class="fact-label">PRÓXIMO VENCIMIENTO</span><span class="fact-value">'+h(c.nextDate)+'</span></span><span><span class="fact-label">IMPORTE ILUSTRATIVO</span><span class="fact-value fact-money">'+money(c.amount)+'</span></span></span>'+
        '<span class="client-open">Abrir expediente '+icon('arrow')+'</span></button>';
    }).join('');
    byId('client-results').textContent=shown.length+' '+(shown.length===1?'resultado':'resultados');
    byId('clients-empty').hidden=shown.length>0;
    document.querySelectorAll('[data-client-filter]').forEach(b=>{
      const active=b.dataset.clientFilter===state.clientFilter;
      b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
    });
  }
  function openClient(id,tab='summary') {
    const c=client(id);if(!c)return;
    state.client=c;state.detail=tab;
    byId('client-directory').hidden=true;
    byId('client-workspace').hidden=false;
    renderDossier();
    revealPage('clients');
    byId('client-back').focus({preventScroll:true});
  }
  function closeClient(){
    if(!state.client)return;
    const closed=state.client.id;
    state.client=null;
    byId('client-workspace').hidden=true;byId('client-directory').hidden=false;
    renderClients();
    window.scrollTo({top:0,behavior:'auto'});
    const b=document.querySelector('[data-open-client="'+closed+'"]');
    if(b&&!b.closest('[hidden]'))b.focus({preventScroll:true});
    else byId('client-search').focus({preventScroll:true});
  }
  function detailRow(title,desc,right){
    return '<div class="detail-info-row"><span><strong>'+h(title)+'</strong><small>'+h(desc)+'</small></span><em>'+h(right)+'</em></div>';
  }
  function renderDossier(){
    const c=state.client;if(!c)return;
    byId('dossier-head').innerHTML=
      '<div class="dossier-super">EXPEDIENTE / '+h(c.id)+'</div>'+
      '<div class="dossier-titleline"><h2 class="dossier-name">'+h(c.name)+'</h2><span class="dossier-state '+h(c.state)+'">'+h(c.stateLabel)+'</span></div>'+
      '<div class="dossier-sub">'+h(names(c))+' · '+c.services.length+' '+(c.services.length===1?'servicio':'servicios')+'</div>';
    document.querySelectorAll('[data-detail]').forEach(b=>{
      const active=b.dataset.detail===state.detail;
      b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
    });
    let markup='';
    if(state.detail==='summary') {
      markup='<div class="detail-overview">'+
        '<div class="detail-stat"><small>PRÓXIMA FECHA</small><strong>'+h(c.nextDate)+'</strong></div>'+
        '<div class="detail-stat"><small>IMPORTE DEMO</small><strong class="money">'+money(c.amount)+'</strong></div>'+
        '<div class="detail-stat"><small>ACCESOS</small><strong>'+countAccess(c)+'</strong></div>'+
        '</div><h3 class="detail-section-title">Situación actual</h3>'+
        detailRow('Estado','Estado ilustrativo del expediente',c.stateLabel)+
        detailRow('Servicios contratados','Cada servicio se muestra una sola vez',String(c.services.length))+
        detailRow('Calendario de accesos','Fechas individuales disponibles en Servicios','Consultar')+
        '<button type="button" data-to-ops="'+h(c.id)+'" class="detail-route">Ver operaciones relacionadas '+icon('arrow')+'</button>'+
        '<p class="detail-note">Este resumen no calcula importes reales ni ejecuta aprobaciones. La versión integrada deberá consultar las fuentes actuales de GOXION.</p>';
    } else if(state.detail==='services') {
      markup='<h3 class="detail-section-title">Servicios y próximas fechas</h3><div class="service-list">'+
        c.services.map(s=>'<article class="service-unit"><div class="service-head"><div><strong>'+h(s.name)+'</strong><p>Contrato de muestra · sin edición activa</p></div><span class="service-count">'+s.accesses.length+' '+(s.accesses.length===1?'ACCESO':'ACCESOS')+'</span></div>'+
          '<div class="access-list">'+s.accesses.map((a,i)=>'<div class="access-line"><span class="access-label">'+h(a.name)+'<small>'+h(a.coverage)+'</small></span><time class="access-date">'+h(a.date)+'</time></div>').join('')+'</div></article>').join('')+
        '</div><p class="detail-note">La representación de X2 comparte el mismo apartado Servicios. En producción, el calendario B2, la cobertura y las fechas vendrán del motor y controladores existentes; este prototipo no los reproduce.</p>';
    } else if(state.detail==='benefits') {
      markup='<h3 class="detail-section-title">Beneficios del cliente</h3>'+
        detailRow('Programa de lealtad','Vista ilustrativa de elegibilidad',c.benefit)+
        detailRow('Misiones y compensaciones','Se conservará el módulo oficial','Sin datos demo')+
        '<p class="detail-note">No se calculan puntos, saldos ni descuentos en esta vista.</p>';
    } else if(state.detail==='account') {
      markup='<h3 class="detail-section-title">Cuenta y acceso</h3>'+
        detailRow('Folio del cliente','Identificador ficticio',c.id)+
        detailRow('Estado administrativo','Acceso y asignación',c.account)+
        detailRow('Credenciales','Gestionadas por el módulo oficial','Protegidas')+
        '<p class="detail-note">Nunca se copian contraseñas, PIN o tokens a la demostración. Se preservarán los controles de permisos existentes.</p>';
    }
    byId('dossier-content').innerHTML=markup;
  }
  function renderOps() {
    const labels={pending:'PENDIENTES',payments:'PAGOS',requests:'SOLICITUDES',activity:'ACTIVIDAD'};
    let shown=operations.filter(op=>state.opFilter==='pending'?op.open:op.type===state.opFilter);
    if(state.opClient)shown=shown.filter(op=>op.clientId===state.opClient);
    byId('ops-list-title').textContent='BANDEJA / '+labels[state.opFilter];
    byId('ops-results').textContent=shown.length+' '+(shown.length===1?'asunto':'asuntos');
    const reset=state.opClient?
      '<button type="button" class="detail-route" data-clear-op-client style="margin:15px 0">Ver todas las operaciones '+icon('arrow')+'</button>':'';
    const rows=shown.length?shown.map((op,i)=>{
      const c=client(op.clientId);
      return '<button class="ops-row" type="button" data-open-client="'+h(c.id)+'"><span class="ops-index">0'+(i+1)+'</span><span><strong class="ops-title">'+h(op.title)+'</strong><span class="ops-meta">'+h(c.name)+' · '+h(op.desc)+'</span><span class="ops-kind">'+h(op.typeLabel)+'</span></span><span class="ops-right">Abrir ficha</span><svg class="ops-arrow" aria-hidden="true"><use href="#i-chevron"></use></svg></button>';
    }).join(''):'<p class="ops-zero">No hay movimientos de esta clase en la muestra.</p>';
    byId('ops-list').innerHTML=reset+rows;
    document.querySelectorAll('[data-op-filter]').forEach(b=>{
      const active=b.dataset.opFilter===state.opFilter;
      b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
    });
  }
  document.addEventListener('click',(e)=>{
    const route=e.target.closest('[data-route]');
    if(route){navigate(route.dataset.route);return;}
    const open=e.target.closest('[data-open-client]');
    if(open){openClient(open.dataset.openClient);return;}
    const back=e.target.closest('#client-back');
    if(back){closeClient();return;}
    const filter=e.target.closest('[data-client-filter]');
    if(filter){state.clientFilter=filter.dataset.clientFilter;renderClients();return;}
    const op=e.target.closest('[data-op-filter]');
    if(op){state.opFilter=op.dataset.opFilter;state.opClient=null;renderOps();return;}
    const detail=e.target.closest('[data-detail]');
    if(detail){state.detail=detail.dataset.detail;renderDossier();return;}
    const toOps=e.target.closest('[data-to-ops]');
    if(toOps){state.opClient=toOps.dataset.toOps;state.opFilter='pending';revealPage('operations');return;}
    if(e.target.closest('[data-clear-op-client]')){state.opClient=null;renderOps();return;}
  });
  byId('client-search').addEventListener('input',(e)=>{state.search=e.target.value;renderClients();});
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&state.page==='clients'&&state.client){e.preventDefault();closeClient();}
  });
  renderHome();renderClients();renderOps();revealPage('home',false);
})();