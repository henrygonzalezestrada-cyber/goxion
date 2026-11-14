"use strict";
/**
 * GOXION / TURNO — independent visual concept V4.
 * All records, prices, dates and operations below are fictional fixtures.
 * Never fetch, import, write or connect to production or Supabase.
 */
(() => {
  const clients = [
    {id:"GX-1042",name:"Valeria Cruz",state:"due",status:"Por vencer",amount:249,next:"15 NOV",benefits:"Disponibles",
      services:[
        {name:"Google One",accesses:[{name:"Acceso 1",date:"15 NOV",coverage:"Fecha independiente de muestra"},{name:"Acceso 2",date:"23 NOV",coverage:"Fecha independiente de muestra"}]},
        {name:"Netflix",accesses:[{name:"Acceso 1",date:"28 NOV",coverage:"Fecha de muestra"}]}
      ]
    },
    {id:"GX-1048",name:"Mateo Díaz",state:"review",status:"En revisión",amount:399,next:"16 NOV",benefits:"En seguimiento",
      services:[{name:"Spotify",accesses:[{name:"Acceso 1",date:"16 NOV",coverage:"Fecha de muestra"}]},{name:"Disney+",accesses:[{name:"Acceso 1",date:"16 NOV",coverage:"Fecha de muestra"}]}]
    },
    {id:"GX-1056",name:"Sofía Herrera",state:"current",status:"Al corriente",amount:179,next:"28 NOV",benefits:"Activos",
      services:[{name:"YouTube Premium",accesses:[{name:"Acceso 1",date:"28 NOV",coverage:"Fecha de muestra"}]}]
    },
    {id:"GX-1061",name:"Emilio Rojas",state:"late",status:"Pendiente",amount:289,next:"10 NOV",benefits:"Disponibles",
      services:[{name:"Crunchyroll",accesses:[{name:"Acceso 1",date:"10 NOV",coverage:"Fecha de muestra"}]},{name:"Max",accesses:[{name:"Acceso 1",date:"10 NOV",coverage:"Fecha de muestra"}]}]
    }
  ];
  const ops = [
    {id:"pago",type:"pagos",kind:"pago",short:"PAGO",title:"Comprobante por revisar",sub:"Validación pendiente; no se ha aprobado el pago.",client:"GX-1048",status:"Revisión pendiente",open:true},
    {id:"cancelacion",type:"solicitudes",kind:"baja",short:"BAJA",title:"Cancelación aprobada",sub:"Aprobada, pero aún no se ha hecho efectiva.",client:"GX-1042",status:"Por ejecutar",open:true},
    {id:"soporte",type:"solicitudes",kind:"soporte",short:"AYUDA",title:"Mensaje sin resolver",sub:"El cliente espera seguimiento de soporte.",client:"GX-1061",status:"Esperando respuesta",open:true},
    {id:"actualizacion",type:"actividad",kind:"actividad",short:"REGISTRO",title:"Servicio actualizado",sub:"Movimiento del expediente de muestra.",client:"GX-1056",status:"Histórico",open:false}
  ];
  const state={clientsFilter:"todos",clientQuery:"",opsFilter:"pendientes",lastDetailClient:null};
  const $=(id)=>document.getElementById(id);
  const escape=(v)=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
  const currency=(n)=>money.format(n);
  const icon=(name)=>'<svg aria-hidden="true"><use href="#ico-'+name+'"></use></svg>';
  const client=(id)=>clients.find(c=>c.id===id);
  const clean=(str)=>String(str).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").trim();
  const totalAccess=(c)=>c.services.reduce((n,s)=>n+s.accesses.length,0);
  const clientHref=(id,tab="resumen")=>"#/clientes/"+encodeURIComponent(id)+"/"+tab;
  function renderHome() {
    $("home-queue").innerHTML=ops.filter(o=>o.open).map(o=>{
      const c=client(o.client);
      return '<a class="queue-entry" href="'+clientHref(c.id)+'" aria-label="Abrir expediente de '+escape(c.name)+', '+escape(o.title)+'">'+
        '<span class="queue-sign" data-type="'+escape(o.kind)+'">'+escape(o.short)+'<small>'+escape(o.status)+'</small></span>'+
        '<span class="queue-text"><strong>'+escape(o.title)+'</strong><small>'+escape(c.name)+'</small><em>'+escape(o.sub)+'</em></span>'+
        '<span class="queue-open">'+icon('arrow')+'</span></a>';
    }).join("");
    const dates=[
      {id:"GX-1042",day:"15",mon:"NOV",service:"Google One · Acceso 1"},
      {id:"GX-1048",day:"16",mon:"NOV",service:"Spotify · Acceso 1"},
      {id:"GX-1042",day:"23",mon:"NOV",service:"Google One · Acceso 2"},
      {id:"GX-1056",day:"28",mon:"NOV",service:"YouTube Premium"}
    ];
    $("date-track").innerHTML=dates.map(d=>{
      const c=client(d.id);
      return '<a class="date-entry" href="'+clientHref(d.id,"servicios")+'" aria-label="Consultar '+escape(d.service)+' de '+escape(c.name)+', '+escape(d.day)+' de noviembre">'+
        '<span class="date-mark"><strong>'+escape(d.day)+'</strong><small>'+escape(d.mon)+'</small></span>'+
        '<span class="date-info"><strong>'+escape(c.name)+'</strong><small>'+escape(d.service)+'</small><span>Acceso de muestra</span></span>'+
        '<span class="date-amount">'+escape(currency(c.amount))+'</span></a>';
    }).join("");
  }
  function matchesClient(c){
    if(state.clientsFilter==="atencion" && c.state==="current")return false;
    if(state.clientsFilter==="corriente" && c.state!=="current")return false;
    const q=clean(state.clientQuery);
    return !q || clean(c.name).includes(q) || clean(c.id).includes(q);
  }
  function renderClients(){
    const matches=clients.filter(matchesClient);
    $("client-list").innerHTML=matches.map(c=>{
      const tags=c.services.map(s=>'<span class="service-pill">'+escape(s.name)+(s.accesses.length>1?' <em>×'+s.accesses.length+'</em>':'')+'</span>').join("");
      return '<a class="folio" href="'+clientHref(c.id)+'" aria-label="Abrir expediente de '+escape(c.name)+'">'+
        '<span class="folio-top"><span class="folio-id">'+escape(c.id)+'</span><span class="folio-state '+escape(c.state)+'">'+escape(c.status)+'</span></span>'+
        '<span class="folio-inner"><span class="folio-name">'+escape(c.name)+'</span><span class="folio-services">'+tags+'</span><span class="folio-baseline" aria-hidden="true"></span>'+
        '<span class="folio-bottom"><span><span class="folio-bottom-label">Próximo vencimiento</span><strong class="folio-bottom-date">'+escape(c.next)+'</strong></span>'+
        '<strong class="folio-bottom-amount">'+escape(currency(c.amount))+'</strong></span></span>'+
        '<span class="folio-end">Ver expediente '+icon('arrow')+'</span></a>';
    }).join("");
    $("client-empty").hidden=matches.length!==0;
    $("directory-total").innerHTML=matches.length+' <span>'+(matches.length===1?"expediente":"expedientes")+'</span>';
    document.querySelectorAll("[data-client-filter]").forEach(b=>{
      const on=b.dataset.clientFilter===state.clientsFilter;
      b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));
    });
  }
  const fact=(name,note,value)=>'<div class="fact-row"><div><strong>'+escape(name)+'</strong><p>'+escape(note)+'</p></div><span>'+escape(value)+'</span></div>';
  function renderDetail(c,tab) {
    $("dossier-intro").innerHTML='<div><span class="dossier-folio">Expediente '+escape(c.id)+'</span><h2>'+escape(c.name)+'</h2><p>'+c.services.map(s=>escape(s.name)).join(' · ')+'</p></div><span class="dossier-status '+escape(c.state)+'">'+escape(c.status)+'</span>';
    document.querySelectorAll("[data-detail-tab]").forEach(a=>{
      const active=a.dataset.detailTab===tab;a.href=clientHref(c.id,a.dataset.detailTab);
      a.classList.toggle("selected",active);
      if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    let output="";
    if(tab==="resumen") {
      output='<div class="dossier-statbar"><div><small>Próximo vencimiento</small><strong>'+escape(c.next)+'</strong></div>'+
        '<div><small>Importe de muestra</small><strong>'+escape(currency(c.amount))+'</strong></div>'+
        '<div><small>Accesos activos (demo)</small><strong>'+totalAccess(c)+'</strong></div></div>'+
        '<h3 class="dossier-section-title">Estado del expediente</h3>'+
        fact("Situación", "Estado de prueba, no consultado al motor financiero.",c.status)+
        fact("Servicios","Contratos comerciales, sin duplicar X2.",c.services.length+" registrados")+
        fact("Fechas","Renovaciones por acceso en la vista Servicios.",totalAccess(c)+" accesos")+
        '<a class="dossier-link" href="#/operaciones">Revisar Operaciones '+icon('arrow')+'</a>';
    } else if(tab==="servicios") {
      output='<h3 class="dossier-section-title">Servicios y accesos</h3>'+
        '<div class="access-services">'+c.services.map(s=>
          '<section class="service-block"><div><h3>'+escape(s.name)+'</h3><p>Contrato de prueba</p><span class="service-count">'+s.accesses.length+' '+(s.accesses.length===1?"acceso":"accesos")+'</span></div>'+
          '<div class="access-rows">'+s.accesses.map(a=>
            '<div class="access-row"><span class="access-label"><i class="access-node" aria-hidden="true"></i><span><strong>'+escape(a.name)+'</strong><small>'+escape(a.coverage)+'</small></span></span>'+
            '<time class="access-date">'+escape(a.date)+'</time></div>'
          ).join("")+'</div></section>'
        ).join("")+'</div>'+
        '<p class="dossier-description">Las fechas son ficticias. El calendario B2 productivo mantiene su motor de cobertura, obligaciones y pagos sin modificaciones.</p>';
    } else if(tab==="beneficios") {
      output='<h3 class="dossier-section-title">Beneficios</h3>'+
        fact("Lealtad","Consulta ilustrativa; sin calcular puntos.",c.benefits)+
        fact("Misiones","Se conservará el módulo original.","Ver en Admin oficial")+
        '<p class="dossier-description">Este concepto no valida recompensas, descuentos ni elegibilidad real.</p>';
    } else {
      output='<h3 class="dossier-section-title">Cuenta</h3>'+
        fact("Folio","Identificador ficticio de demostración.",c.id)+
        fact("Estado de acceso","No representa un inicio de sesión real.","Cuenta de muestra")+
        fact("Credenciales","Gestionadas exclusivamente por rutas protegidas.","No disponibles")+
        '<p class="dossier-description">Ningún PIN, contraseña o token real se incorpora a este prototipo.</p>';
    }
    const body=$("dossier-body");body.innerHTML=output;
    body.classList.remove("state-change");void body.offsetHeight;body.classList.add("state-change");
  }
  function renderOps() {
    const list=ops.filter(o=>state.opsFilter==="pendientes"?o.open:o.type===state.opsFilter);
    const names={pendientes:"Pendientes",pagos:"Pagos",solicitudes:"Solicitudes",actividad:"Actividad"};
    $("ops-label").textContent=names[state.opsFilter];
    $("ops-counter").textContent=list.length+" "+(list.length===1?"asunto":"asuntos");
    $("operations-list").innerHTML=list.length?list.map(o=>{
      const c=client(o.client);
      return '<a class="operation-item" href="'+clientHref(c.id)+'" aria-label="Abrir '+escape(o.title)+' del expediente de '+escape(c.name)+'">'+
        '<span class="operation-kind" data-type="'+escape(o.kind)+'"><span>'+escape(o.short)+'</span></span>'+
        '<span class="operation-body"><strong>'+escape(o.title)+'</strong><p>'+escape(c.name)+' · '+escape(o.sub)+'</p><small>'+escape(o.status)+'</small></span>'+
        '<span class="operation-open">'+icon('arrow')+'</span></a>';
    }).join(""):'<div class="empty">No hay asuntos de este tipo en la muestra. Elige otra categoría.</div>';
    document.querySelectorAll("[data-ops-filter]").forEach(b=>{
      const selected=b.dataset.opsFilter===state.opsFilter;
      b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));
    });
  }
  function readRoute(){
    const segments=decodeURIComponent((location.hash||"#/inicio").slice(2)).split("/").filter(Boolean);
    return {section:["inicio","clientes","operaciones","gestion"].includes(segments[0])?segments[0]:"inicio",id:segments[1]||null,tab:["resumen","servicios","beneficios","cuenta"].includes(segments[2])?segments[2]:"resumen"};
  }
  let lastRoute="";
  function navigate(initial=false) {
    const route=readRoute();
    if(route.section==="clientes" && route.id && !client(route.id)){
      location.replace("#/clientes");return;
    }
    document.querySelectorAll(".screen").forEach(n=>{n.hidden=n.id!=="screen-"+route.section;});
    document.querySelectorAll("[data-nav]").forEach(a=>{
      const isCurrent=a.dataset.nav===route.section;a.classList.toggle("selected",isCurrent);
      if(isCurrent)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    $("client-directory").hidden=route.section==="clientes"&&!!route.id;
    $("client-detail").hidden=route.section!=="clientes"||!route.id;
    if(route.section==="clientes"&&route.id){
      const c=client(route.id);
      renderDetail(c,route.tab);
      state.lastDetailClient=route.id;
    }else if(route.section==="clientes")renderClients();
    else if(route.section==="operaciones")renderOps();
    if(!initial){
      if(route.section!==lastRoute.split("/")[0] || route.id!==lastRoute.split("/")[1]){
        window.scrollTo({top:0,behavior:"auto"});
      }
      $("main").focus({preventScroll:true});
    }
    lastRoute=[route.section,route.id||"",route.tab].join("/");
  }
  document.addEventListener("click",(event)=>{
    const c=event.target.closest("[data-client-filter]");
    if(c){state.clientsFilter=c.dataset.clientFilter;renderClients();return;}
    const o=event.target.closest("[data-ops-filter]");
    if(o){state.opsFilter=o.dataset.opsFilter;renderOps();return;}
  });
  $("client-search").addEventListener("input",event=>{state.clientQuery=event.target.value;renderClients();});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&readRoute().section==="clientes"&&readRoute().id){location.hash="#/clientes";}
  });
  window.addEventListener("hashchange",()=>navigate());
  renderHome();renderClients();renderOps();
  if(!location.hash){history.replaceState(null,"","#/inicio");}
  navigate(true);
})();