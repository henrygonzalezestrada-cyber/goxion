"use strict";
/**
 * GOXION NEXO V5 — DEMOSTRACIÓN SIN BACKEND
 * Registros, fechas, productos, estados y montos ficticios.
 * Cero lecturas/escrituras a Admin, B2, Edge o Supabase.
 */
(() => {
  const customers = [
    {id:"GX-1042",name:"Valeria Cruz",initials:"VC",state:"due",status:"Por vencer",next:"15 NOV",total:249,
      services:[
        {name:"Google One",accesses:[{name:"Acceso 1",date:"15 NOV",description:"Fecha independiente de muestra"},{name:"Acceso 2",date:"23 NOV",description:"Fecha independiente de muestra"}]},
        {name:"Netflix",accesses:[{name:"Acceso 1",date:"28 NOV",description:"Fecha de muestra"}]}
      ], benefit:"Disponible"},
    {id:"GX-1048",name:"Mateo Díaz",initials:"MD",state:"review",status:"En revisión",next:"16 NOV",total:399,
      services:[
        {name:"Spotify",accesses:[{name:"Acceso 1",date:"16 NOV",description:"Fecha de muestra"}]},
        {name:"Disney+",accesses:[{name:"Acceso 1",date:"16 NOV",description:"Fecha de muestra"}]}
      ], benefit:"En seguimiento"},
    {id:"GX-1056",name:"Sofía Herrera",initials:"SH",state:"current",status:"Al corriente",next:"28 NOV",total:179,
      services:[{name:"YouTube Premium",accesses:[{name:"Acceso 1",date:"28 NOV",description:"Fecha de muestra"}]}],benefit:"Disponible"},
    {id:"GX-1061",name:"Emilio Rojas",initials:"ER",state:"late",status:"Pendiente",next:"10 NOV",total:289,
      services:[
        {name:"Crunchyroll",accesses:[{name:"Acceso 1",date:"10 NOV",description:"Fecha de muestra"}]},
        {name:"Max",accesses:[{name:"Acceso 1",date:"10 NOV",description:"Fecha de muestra"}]}
      ],benefit:"Sin cambios"}
  ];
  const work = [
    {id:"op-1",kind:"payment",category:"pagos",title:"Comprobante por revisar",detail:"Mateo envió un comprobante. Falta validarlo en el Admin real.",customer:"GX-1048",tag:"Pago",open:true},
    {id:"op-2",kind:"request",category:"solicitudes",title:"Cancelación aprobada",detail:"La aprobación no equivale a la baja efectiva del servicio.",customer:"GX-1042",tag:"Cancelación",open:true},
    {id:"op-3",kind:"late",category:"solicitudes",title:"Soporte sin resolver",detail:"Hay una respuesta pendiente para el cliente.",customer:"GX-1061",tag:"Soporte",open:true},
    {id:"op-4",kind:"activity",category:"actividad",title:"Cambio de servicio registrado",detail:"Movimiento histórico ilustrativo.",customer:"GX-1056",tag:"Actividad",open:false}
  ];

  const state={clientQuery:"",clientFilter:"todos",opsFilter:"pendientes"};
  const el=(id)=>document.getElementById(id);
  const svg=(name)=>'<svg aria-hidden="true"><use href="#ic-'+name+'"></use></svg>';
  const escape=(s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=(n)=>"$"+Number(n).toLocaleString("es-MX");
  const customer=(id)=>customers.find(c=>c.id===id);
  const normalize=(s)=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const totalAccess=(c)=>c.services.reduce((n,s)=>n+s.accesses.length,0);
  const hrefClient=(id,tab="resumen")=>"#/clientes/"+encodeURIComponent(id)+"/"+tab;
  const plainServices=(c)=>c.services.map(s=>s.name).join(" · ");
  const facts=(title,desc,right)=>
    '<div class="detail-line"><div><strong>'+escape(title)+'</strong><small>'+escape(desc)+'</small></div><em>'+escape(right)+'</em></div>';

  function renderHome(){
    // Date-focused information is derived from the same demonstration records.
    const upcoming=[
      {id:"GX-1042",date:"15",month:"NOV",title:"Google One · Acceso 1",caption:"Valeria Cruz"},
      {id:"GX-1048",date:"16",month:"NOV",title:"Spotify · Acceso 1",caption:"Mateo Díaz"},
      {id:"GX-1042",date:"23",month:"NOV",title:"Google One · Acceso 2",caption:"Valeria Cruz"},
      {id:"GX-1056",date:"28",month:"NOV",title:"YouTube Premium",caption:"Sofía Herrera"}
    ];
    el("home-renewals").innerHTML=upcoming.map(r=>
      '<a class="renewal-item" href="'+hrefClient(r.id,"servicios")+'" aria-label="Consultar '+escape(r.title)+" de "+escape(r.caption)+', '+escape(r.date)+' de noviembre">'+
      '<span class="renewal-date"><strong>'+escape(r.date)+'</strong><small>'+escape(r.month)+'</small></span>'+
      '<span class="renewal-content"><strong>'+escape(r.title)+'</strong><small>'+escape(r.caption)+'</small></span>'+svg("chevron")+'</a>'
    ).join("");
    const bars=[{date:"15",count:1},{date:"16",count:2},{date:"23",count:1},{date:"28",count:2}];
    el("rhythm-bars").innerHTML=bars.map(b=>
      '<div class="rhythm-bar" aria-label="'+b.count+' accesos ficticios el '+b.date+' de noviembre">'+
      '<span class="rhythm-bar-track"><span class="rhythm-bar-fill" style="--bar-height:'+(b.count===2?100:55)+'%"></span></span>'+
      '<span class="rhythm-bar-label">'+b.date+'</span></div>'
    ).join("");
  }
  function renderCustomers(){
    const query=normalize(state.clientQuery);
    const filtered=customers.filter(c=>{
      if(state.clientFilter==="atencion"&&c.state==="current")return false;
      if(state.clientFilter==="corriente"&&c.state!=="current")return false;
      return !query||normalize(c.name).includes(query)||normalize(c.id).includes(query);
    });
    el("clients-grid").innerHTML=filtered.map(c=>
      '<a class="customer-card" href="'+hrefClient(c.id)+'" data-state="'+escape(c.state)+'" aria-label="Abrir expediente de '+escape(c.name)+'">'+
      '<span class="customer-head"><span class="customer-avatar">'+escape(c.initials)+'</span>'+
      '<span class="customer-name"><strong>'+escape(c.name)+'</strong><small>'+escape(c.id)+'</small></span>'+
      '<span class="status-tag '+escape(c.state)+'">'+escape(c.status)+'</span></span>'+
      '<span class="customer-services">'+c.services.map(s=>'<span class="service-chip">'+escape(s.name)+(s.accesses.length>1?' <em>×'+s.accesses.length+'</em>':'')+'</span>').join("")+'</span>'+
      '<span class="customer-bottom"><span><small>Próxima fecha</small><strong>'+escape(c.next)+'</strong></span>'+
      '<span class="customer-price"><small>Importe demo</small><strong>'+money(c.total)+'</strong></span></span>'+
      '<span class="customer-foot"><span>Ver expediente</span>'+svg("arrow")+'</span></a>'
    ).join("");
    el("clients-empty").hidden=filtered.length>0;
    el("client-count").innerHTML=String(filtered.length).padStart(2,"0")+' <small>'+(filtered.length===1?"expediente":"expedientes")+'</small>';
    document.querySelectorAll("[data-client-filter]").forEach(b=>{
      const active=b.dataset.clientFilter===state.clientFilter;
      b.classList.toggle("is-active",active);
      b.setAttribute("aria-pressed",String(active));
    });
  }
  function renderDossier(c,view){
    el("dossier-head").innerHTML='<span class="dossier-profile">'+escape(c.initials)+'</span>'+
      '<div class="dossier-head-copy"><small>'+escape(c.id)+' · EXPEDIENTE DEMO</small><h2>'+escape(c.name)+'</h2><p>'+escape(plainServices(c))+'</p></div>';
    document.querySelectorAll("[data-detail]").forEach(a=>{
      const on=a.dataset.detail===view;
      a.href=hrefClient(c.id,a.dataset.detail);
      a.classList.toggle("is-active",on);
      if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    let content="";
    if(view==="resumen"){
      content='<div class="dossier-statgrid">'+
        '<div class="dossier-stat"><small>Próxima fecha</small><strong>'+escape(c.next)+'</strong></div>'+
        '<div class="dossier-stat"><small>Importe ilustrativo</small><strong>'+money(c.total)+'</strong></div>'+
        '<div class="dossier-stat"><small>Accesos de muestra</small><strong>'+totalAccess(c)+'</strong></div></div>'+
        '<h3 class="dossier-section-title">Situación del cliente</h3>'+
        facts("Estado","Situación visual, no calculada por el backend.",c.status)+
        facts("Servicios","Contratos comerciales visibles una sola vez.",c.services.length+' servicios')+
        facts("Calendario","Fechas individuales de los accesos.",totalAccess(c)+' accesos')+
        '<a class="detail-action" href="#/operaciones">Consultar operaciones '+svg("arrow")+'</a>'+
        '<p class="detail-message">Las cifras y fechas son ficticias. La V5 no modifica el motor de pagos ni la cobertura de servicios.</p>';
    } else if(view==="servicios"){
      content='<h3 class="dossier-section-title">Servicios contratados</h3>'+
        '<div class="service-units">'+c.services.map(s=>
          '<section class="service-unit"><div class="service-unit-top"><div><h3>'+escape(s.name)+'</h3><p>Servicio comercial · información ficticia</p></div>'+
          '<span class="access-count">'+s.accesses.length+' '+(s.accesses.length===1?"acceso":"accesos")+'</span></div>'+
          '<div class="access-list">'+s.accesses.map(a=>
            '<div class="access-row"><span class="access-label"><i class="access-marker" aria-hidden="true"></i><span><strong>'+escape(a.name)+'</strong><small>'+escape(a.description)+'</small></span></span>'+
            '<time class="access-date">'+escape(a.date)+'</time></div>'
          ).join("")+'</div></section>'
        ).join("")+'</div>'+
        '<p class="detail-message">En un servicio X2 se muestra un único contrato con dos accesos y fechas propias. La lógica B2 real no se ha reproducido aquí.</p>';
    } else if(view==="beneficios"){
      content='<h3 class="dossier-section-title">Beneficios</h3>'+
        facts("Programa de lealtad","Elegibilidad de muestra, sin cómputo de puntos.",c.benefit)+
        facts("Misiones y compensaciones","Las decisiones permanecen en sus módulos reales.","Sin datos demo")+
        '<p class="detail-message">No se han conectado beneficios, descuentos ni saldos reales.</p>';
    } else {
      content='<h3 class="dossier-section-title">Cuenta y permisos</h3>'+
        facts("Identificador","Folio creado exclusivamente para esta demostración.",c.id)+
        facts("Acceso","Los permisos dependen del Admin oficial.","Protegido")+
        facts("Credenciales","Nunca se cargan contraseñas ni tokens aquí.","No disponibles")+
        '<p class="detail-message">La ficha es una muestra visual; no cambia asignaciones, acceso ni perfiles.</p>';
    }
    el("dossier-content").innerHTML=content;
  }
  function renderOperations(){
    const filtered=work.filter(o=>state.opsFilter==="pendientes"?o.open:o.category===state.opsFilter);
    const titles={pendientes:"Por atender",pagos:"Comprobantes y cobros",solicitudes:"Solicitudes",actividad:"Actividad"};
    el("ops-list-title").textContent=titles[state.opsFilter];
    el("ops-count").textContent=filtered.length+" "+(filtered.length===1?"asunto":"asuntos");
    el("operations-list").innerHTML=filtered.length?filtered.map(o=>{
      const c=customer(o.customer);
      const svgName=o.kind==="payment"?"wallet":o.kind==="request"?"clock":o.kind==="late"?"life":"activity";
      return '<a class="operation-row" href="'+hrefClient(c.id)+'" data-kind="'+escape(o.kind)+'" aria-label="Abrir expediente de '+escape(c.name)+' para '+escape(o.title)+'">'+
        '<span class="operation-type">'+svg(svgName)+'</span>'+
        '<span class="operation-copy"><strong>'+escape(o.title)+'</strong><small>'+escape(c.name)+' · '+escape(o.detail)+'</small><em>'+escape(o.tag)+'</em></span>'+
        '<span class="operation-go">'+svg("arrow")+'</span></a>';
    }).join(""):'<p class="empty-message">No hay movimientos de este tipo en la muestra.</p>';
    document.querySelectorAll("[data-ops-filter]").forEach(b=>{
      const on=b.dataset.opsFilter===state.opsFilter;b.classList.toggle("is-active",on);b.setAttribute("aria-pressed",String(on));
    });
  }

  const allowed=["inicio","clientes","operaciones","gestion"];
  const tabs=["resumen","servicios","beneficios","cuenta"];
  function route(){
    const parts=decodeURIComponent((location.hash||"#/inicio").replace(/^#\/?/,"")).split("/").filter(Boolean);
    return {page:allowed.includes(parts[0])?parts[0]:"inicio",id:parts[1]||null,tab:tabs.includes(parts[2])?parts[2]:"resumen"};
  }
  let lastRoute="";
  function applyRoute(first=false){
    const next=route();
    if(next.page==="clientes"&&next.id&&!customer(next.id)){location.replace("#/clientes");return;}
    const visibleId="screen-"+next.page;
    document.querySelectorAll(".screen").forEach(section=>{section.hidden=section.id!==visibleId;});
    document.querySelectorAll("[data-nav]").forEach(a=>{
      const active=a.dataset.nav===next.page;a.classList.toggle("is-selected",active);
      if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    el("directory").hidden=next.page==="clientes"&&!!next.id;
    el("dossier").hidden=next.page!=="clientes"||!next.id;
    if(next.page==="clientes"&&next.id)renderDossier(customer(next.id),next.tab);
    else if(next.page==="clientes")renderCustomers();
    else if(next.page==="operaciones")renderOperations();

    const currentKey=next.page+"/"+(next.id||"");
    const previousKey=lastRoute.split("/").slice(0,2).join("/");
    if(!first){
      if(currentKey!==previousKey)window.scrollTo({top:0,behavior:"auto"});
      el("main").focus({preventScroll:true});
    }
    lastRoute=currentKey+"/"+next.tab;
  }
  function changeRoute(){
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!reduced&&typeof document.startViewTransition==="function"){
      document.startViewTransition(()=>applyRoute());
    }else applyRoute();
  }
  document.addEventListener("click",event=>{
    const c=event.target.closest("[data-client-filter]");
    if(c){state.clientFilter=c.dataset.clientFilter;renderCustomers();return;}
    const o=event.target.closest("[data-ops-filter]");
    if(o){state.opsFilter=o.dataset.opsFilter;renderOperations();}
  });
  el("search-client").addEventListener("input",e=>{state.clientQuery=e.target.value;renderCustomers();});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){const now=route();if(now.page==="clientes"&&now.id)location.hash="#/clientes";}
  });
  window.addEventListener("hashchange",changeRoute);
  renderHome();renderCustomers();renderOperations();
  if(!location.hash)history.replaceState(null,"","#/inicio");
  applyRoute(true);
})();