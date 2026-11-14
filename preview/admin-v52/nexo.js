"use strict";
/**
 * GOXION NEXO V5.2 — DEMOSTRACIÓN SIN BACKEND
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
    {id:"op-1",kind:"payment",category:"pagos",title:"Comprobante recibido",detail:"Pendiente de validar",customer:"GX-1048",open:true},
    {id:"op-2",kind:"request",category:"solicitudes",title:"Cancelación aprobada",detail:"Falta hacerla efectiva",customer:"GX-1042",open:true},
    {id:"op-3",kind:"late",category:"solicitudes",title:"Consulta de soporte",detail:"Respuesta pendiente",customer:"GX-1061",open:true},
    {id:"op-4",kind:"activity",category:"actividad",title:"Servicio actualizado",detail:"",customer:"GX-1056",open:false}
  ];

  const demoDates=["2026-11-14","2026-11-15","2026-11-18","2026-11-28","2026-11-29"];
  const state={clientQuery:"",clientFilter:"todos",opsFilter:"pendientes",demoDay:0,selectedCustomer:null};
  const renewalDays={"GX-1042":"2026-11-15","GX-1048":"2026-11-16","GX-1056":"2026-11-28","GX-1061":"2026-11-10"};
  const toDay=(iso)=>Math.floor(Date.parse(iso+"T12:00:00Z")/86400000);
  const statusFor=(c)=>{
    const day=toDay(demoDates[state.demoDay]);
    const target=toDay(renewalDays[c.id]);
    const diff=target-day;
    if(c.state==="review")return {key:"review",name:"En revisión",note:"Pago por validar",priority:"Revisar"};
    if(c.state==="current" && diff>=0)return {key:"current",name:"Al corriente",note:"",priority:"Estable"};
    if(diff<0)return {key:"late",name:"Vencido",note:Math.abs(diff)===1?"Venció ayer":"Venció hace "+Math.abs(diff)+" días",priority:"Atención"};
    if(diff===0)return {key:"due",name:"Vence hoy",note:"Hoy",priority:"Prioridad"};
    if(diff<=3)return {key:"due",name:"Por vencer",note:diff===1?"Mañana":"En "+diff+" días",priority:"Próximo"};
    return {key:"current",name:"Al corriente",note:"En "+diff+" días",priority:"Estable"};
  };
  const demoDateLabel=()=>demoDates[state.demoDay].slice(8)+" NOV";
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
  }
  function renderCustomers(){
    const query=normalize(state.clientQuery);
    const filtered=customers.filter(c=>{
      if(state.clientFilter==="atencion"&&statusFor(c).key==="current")return false;
      if(state.clientFilter==="corriente"&&statusFor(c).key!=="current")return false;
      return !query||normalize(c.name).includes(query)||normalize(c.id).includes(query);
    });
    el("clients-grid").innerHTML=filtered.map(c=>{
      const status=statusFor(c);
      return '<a class="customer-card" href="'+hrefClient(c.id)+'" data-id="'+escape(c.id)+'" data-state="'+status.key+'"'+(state.selectedCustomer===c.id?' style="view-transition-name:active-customer"':'')+' aria-label="Abrir expediente de '+escape(c.name)+', '+status.name+'">'+
        '<span class="customer-head">'+
        '<span class="customer-name"><strong>'+escape(c.name)+'</strong><small>'+escape(c.id)+'</small></span>'+
        '<span class="status-tag '+status.key+'">'+status.name+'</span></span>'+
        '<span class="customer-services">'+c.services.map(s=>'<span class="service-chip">'+escape(s.name)+(s.accesses.length>1?' <em>×'+s.accesses.length+'</em>':'')+'</span>').join("")+'</span>'+
        '<span class="customer-bottom"><span class="customer-date"><small class="customer-date-label">'+(status.key==="late"?"VENCIÓ EL":"PRÓXIMO CORTE")+'</small><strong>'+escape(c.next)+'</strong><em class="customer-state-note">'+escape(status.note)+'</em></span>'+
        '<span class="customer-price"><small>IMPORTE DEMO</small><strong>'+money(c.total)+'</strong></span></span>'+
        '<span class="customer-foot"><span>Ver expediente</span>'+svg("arrow")+'</span></a>';
    }).join("");
    el("clients-empty").hidden=filtered.length>0;
    el("client-count").innerHTML=String(filtered.length).padStart(2,"0")+' <small>'+(filtered.length===1?"expediente":"expedientes")+'</small>';
    el("demo-date-label").textContent=demoDateLabel();
    document.querySelectorAll("[data-client-filter]").forEach(b=>{
      const active=b.dataset.clientFilter===state.clientFilter;
      b.classList.toggle("is-active",active);
      b.setAttribute("aria-pressed",String(active));
    });
  }
  function advanceDate(){
    const previous=new Map(customers.map(c=>[c.id,statusFor(c)]));
    state.demoDay=(state.demoDay+1)%demoDates.length;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Update the live card surface in-place. Do not stack full-screen
    // view transitions when a user taps through several sample dates quickly.
    if(state.clientFilter!=="todos"){
      renderCustomers();
    }else{
      customers.forEach(c=>{
        const card=Array.from(document.querySelectorAll(".customer-card")).find(node=>node.dataset.id===c.id);
        if(!card)return;
        const status=statusFor(c),old=previous.get(c.id);
        const changed=old.key!==status.key||old.note!==status.note||old.name!==status.name;
        card.dataset.state=status.key;
        card.setAttribute("aria-label","Abrir expediente de "+c.name+", "+status.name);
        const tag=card.querySelector(".status-tag"),note=card.querySelector(".customer-state-note");
        tag.className="status-tag "+status.key;
        tag.textContent=status.name;
        note.textContent=status.note;
        card.querySelector(".customer-date-label").textContent=status.key==="late"?"VENCIÓ EL":"PRÓXIMO CORTE";
        if(changed&&!reduced){
          for(const target of [tag,note]){
            target.getAnimations().forEach(animation=>animation.cancel());
            target.animate([{opacity:.3,transform:"translateY(4px)"},{opacity:1,transform:"translateY(0)"}],
              {duration:280,easing:"cubic-bezier(.2,.72,.22,1)"});
          }
        }
      });
      el("demo-date-label").textContent=demoDateLabel();
    }
    const changed=customers.filter(c=>{
      const old=previous.get(c.id),current=statusFor(c);
      return old.key!==current.key||old.name!==current.name;
    }).map(c=>c.name);
    el("status-announcement").textContent="Fecha de muestra: "+demoDateLabel()+". "+
      (changed.length?"Cambió el estado visual de "+changed.join(", ")+".":"Estados actualizados.");
    if(!reduced){
      const btn=el("advance-demo-date");
      btn.getAnimations().forEach(a=>a.cancel());
      btn.animate([{transform:"scale(.96)"},{transform:"scale(1)"}],{duration:180,easing:"ease-out"});
    }
  }
  function renderDossier(c,view){
    const status=statusFor(c);
    el("dossier-head").innerHTML=
      '<div class="dossier-head-copy"><small>'+escape(c.id)+' · EXPEDIENTE</small><h2>'+escape(c.name)+'</h2><p>'+escape(plainServices(c))+'</p></div>'+
      '<span class="dossier-status '+status.key+'">'+status.name+'</span>';
    document.querySelectorAll("[data-detail]").forEach(a=>{
      const on=a.dataset.detail===view;
      a.href=hrefClient(c.id,a.dataset.detail);
      a.classList.toggle("is-active",on);
      if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    let content="";
    if(view==="resumen"){
      const nextAccess=c.services.flatMap(service=>service.accesses.map(access=>({service:service.name,access}))).find(r=>r.access.date===c.next);
      content='<div class="dossier-overview">'+
        '<div class="dossier-summary-main"><div class="dossier-statgrid">'+
        '<div class="dossier-stat"><small>Vencimiento</small><strong>'+escape(c.next)+'</strong></div>'+
        '<div class="dossier-stat"><small>Importe demo</small><strong>'+money(c.total)+'</strong></div>'+
        '<div class="dossier-stat"><small>Accesos</small><strong>'+totalAccess(c)+'</strong></div></div></div>'+
        '<aside class="dossier-insight"><span class="insight-kicker">PRÓXIMO ACCESO</span>'+
        '<strong class="insight-service">'+escape(nextAccess?nextAccess.service:"Sin registro")+'</strong>'+
        '<span class="insight-state">'+escape(nextAccess?nextAccess.access.name:"Consultar servicios")+'</span>'+
        '<a class="insight-link" href="'+hrefClient(c.id,"servicios")+'">Ver accesos '+svg("arrow")+'</a></aside>'+
        '</div>';
    } else if(view==="servicios"){
      content='<div class="section-title-row"><h3 class="dossier-section-title">Servicios</h3><span>'+c.services.length+' contratados</span></div>'+
        '<div class="service-units">'+c.services.map(s=>
          '<section class="service-unit"><div class="service-unit-top"><div><h3>'+escape(s.name)+'</h3></div>'+
          '<span class="access-count">'+s.accesses.length+' '+(s.accesses.length===1?"acceso":"accesos")+'</span></div>'+
          '<div class="access-list">'+s.accesses.map(a=>
            '<div class="access-row"><span class="access-label"><i class="access-marker" aria-hidden="true"></i><strong>'+escape(a.name)+'</strong></span>'+
            '<time class="access-date">'+escape(a.date)+'</time></div>'
          ).join("")+'</div></section>'
        ).join("")+'</div>';
    } else if(view==="beneficios"){
      content='<h3 class="dossier-section-title">Beneficios</h3>'+
        facts("Lealtad","Elegibilidad de muestra",c.benefit)+
        facts("Misiones","Gestionadas en el Admin oficial","Sin datos demo");
    } else {
      content='<h3 class="dossier-section-title">Cuenta</h3>'+
        facts("Folio","Identificador de demostración",c.id)+
        facts("Permisos","Administrados por el sistema original","Protegidos")+
        facts("Credenciales","Nunca se muestran en el prototipo","Privadas");
    }
    el("dossier-content").innerHTML=content;
  }
  function renderOperations(){
    const filtered=work.filter(o=>state.opsFilter==="pendientes"?o.open:o.category===state.opsFilter);
    el("operations-list").innerHTML=filtered.length?filtered.map(o=>{
      const c=customer(o.customer);
      return '<a class="operation-row" href="'+hrefClient(c.id)+'" data-kind="'+escape(o.kind)+'" aria-label="Abrir expediente de '+escape(c.name)+' para '+escape(o.title)+'">'+
        '<span class="operation-signal" aria-hidden="true"></span>'+
        '<span class="operation-copy"><strong>'+escape(o.title)+'</strong><small>'+escape(c.name)+(o.detail?' · '+escape(o.detail):'')+'</small></span>'+
        '<span class="operation-go" aria-hidden="true">'+svg("chevron")+'</span></a>';
    }).join(""):'<p class="empty-message">No hay movimientos en esta categoría.</p>';
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
    if(next.page==="operaciones"&&["pendientes","pagos","solicitudes","actividad"].includes(next.id))state.opsFilter=next.id;
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
  let activeViewTransition=null;
  function changeRoute(){
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!reduced&&typeof document.startViewTransition==="function"){
      if(activeViewTransition)activeViewTransition.skipTransition();
      const transition=document.startViewTransition(()=>applyRoute());
      activeViewTransition=transition;
      const finished=transition.finished.catch(()=>{});
      window.__goxionTransitionFinished=finished;
      finished.then(()=>{if(activeViewTransition===transition)activeViewTransition=null;});
    }else applyRoute();
  }
  document.addEventListener("click",event=>{
    const card=event.target.closest("a.customer-card");
    if(card){
      document.querySelectorAll(".customer-card").forEach(node=>{node.style.viewTransitionName="none";});
      state.selectedCustomer=card.dataset.id;
      card.style.viewTransitionName="active-customer";
    }
    const c=event.target.closest("[data-client-filter]");
    if(c){state.clientFilter=c.dataset.clientFilter;renderCustomers();return;}
    const o=event.target.closest("[data-ops-filter]");
    if(o){state.opsFilter=o.dataset.opsFilter;renderOperations();}
  });
  el("search-client").addEventListener("input",e=>{state.clientQuery=e.target.value;renderCustomers();});
  el("advance-demo-date").addEventListener("click",advanceDate);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){const now=route();if(now.page==="clientes"&&now.id)location.hash="#/clientes";}
  });
  window.addEventListener("hashchange",changeRoute);
  const capsule=document.querySelector(".header-shell");
  let scrolling=false;
  window.addEventListener("scroll",()=>{
    if(scrolling)return;
    scrolling=true;
    requestAnimationFrame(()=>{
      capsule.classList.toggle("is-scrolled",window.scrollY>18);
      scrolling=false;
    });
  },{passive:true});
  renderHome();renderCustomers();renderOperations();
  if(!location.hash)history.replaceState(null,"","#/inicio");
  applyRoute(true);
})();