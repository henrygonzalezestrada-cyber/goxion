'use strict';
/* GOXION V7.1 -- ALL DATA ARE DEMONSTRATION FIXTURES. No backend calls. */
(()=>{
const $=id=>document.getElementById(id);
const icon=name=>'<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const cash=n=>'$'+Number(n).toLocaleString('es-MX');
const day=s=>Math.floor(Date.parse(s+'T12:00:00Z')/86400000);
const dates=['2026-11-14','2026-11-15','2026-11-18','2026-11-28','2026-11-29'];
const clients=[
 {id:'GX-1042',name:'Valeria Cruz',amount:249,due:'2026-11-15',review:false,services:[{name:'Google One',access:[{name:'Acceso 1',date:'15 NOV'},{name:'Acceso 2',date:'23 NOV'}]},{name:'Netflix',access:[{name:'Acceso 1',date:'28 NOV'}]}],benefit:'Disponible'},
 {id:'GX-1048',name:'Mateo Díaz',amount:399,due:'2026-11-16',review:true,services:[{name:'Spotify',access:[{name:'Acceso 1',date:'16 NOV'}]},{name:'Disney+',access:[{name:'Acceso 1',date:'16 NOV'}]}],benefit:'En revisión'},
 {id:'GX-1056',name:'Sofía Herrera',amount:179,due:'2026-11-28',review:false,services:[{name:'YouTube Premium',access:[{name:'Acceso 1',date:'28 NOV'}]}],benefit:'Disponible'},
 {id:'GX-1061',name:'Emilio Rojas',amount:289,due:'2026-11-10',review:false,services:[{name:'Crunchyroll',access:[{name:'Acceso 1',date:'10 NOV'}]},{name:'Max',access:[{name:'Acceso 1',date:'10 NOV'}]}],benefit:'Sin cambios'}
];
const operations=[
 {id:'op-c1',kind:'cancelaciones',title:'Cancelación aprobada',client:'GX-1042',next:'Pendiente de hacer efectiva',status:'Requiere acción',when:'Hace 12 min',priority:1,detail:'La aprobación no retira automáticamente el servicio. La baja efectiva debe confirmarse mediante el flujo oficial.'},
 {id:'op-c2',kind:'cancelaciones',title:'Solicitud de cancelación',client:'GX-1061',next:'Revisar solicitud',status:'Pendiente',when:'Hace 37 min',priority:1,detail:'Solicitud recibida. El servicio permanece activo mientras no se haga efectiva la cancelación.'},
 {id:'op-p1',kind:'pagos',title:'Comprobante recibido',client:'GX-1048',next:'Validar en el Admin oficial',status:'En revisión',when:'Hace 1 h',priority:1,detail:'Comprobante de pago ficticio; la revisión real requiere los controles financieros productivos.'},
 {id:'op-s1',kind:'soporte',title:'Consulta sin respuesta',client:'GX-1061',next:'Responder al cliente',status:'Pendiente',when:'Hace 2 h',priority:2,detail:'Seguimiento de soporte pendiente de respuesta.'},
 {id:'op-r1',kind:'registros',title:'Nuevo registro',customerName:'Abril Morales',next:'Cuenta creada',status:'Registrado',when:'Hoy · 10:40',priority:3,detail:'Alta de ejemplo incorporada al periodo de registro.'},
 {id:'op-r2',kind:'registros',title:'Nuevo registro',customerName:'Diego Navarro',next:'Cuenta creada',status:'Registrado',when:'Hoy · 09:18',priority:3,detail:'Alta de ejemplo incorporada al periodo de registro.'},
 {id:'op-r3',kind:'registros',title:'Nuevo registro',customerName:'Camila Vera',next:'Cuenta creada',status:'Registrado',when:'Ayer',priority:3,detail:'Alta registrada en la muestra.'},
 {id:'op-r4',kind:'registros',title:'Nuevo registro',customerName:'Hugo Méndez',next:'Cuenta creada',status:'Registrado',when:'Hace 3 días',priority:3,detail:'Alta registrada en la muestra.'},
 {id:'op-r5',kind:'registros',title:'Nuevo registro',customerName:'Nadia Flores',next:'Cuenta creada',status:'Registrado',when:'Hace 5 días',priority:3,detail:'Alta registrada en la muestra.'},
 {id:'op-i1',kind:'ingresos',title:'Ingreso registrado',amount:5900,customerName:'Lote de renovaciones',next:'Registro de muestra',status:'Registrado',when:'Ayer',priority:3,detail:'Movimiento ilustrativo del periodo de muestra.'},
 {id:'op-i2',kind:'ingresos',title:'Ingreso registrado',amount:3290,customerName:'Cobros recurrentes',next:'Registro de muestra',status:'Registrado',when:'Hace 4 días',priority:3,detail:'Movimiento ilustrativo del periodo de muestra.'},
 {id:'op-i3',kind:'ingresos',title:'Ingreso registrado',amount:3290,customerName:'Pagos extraordinarios',next:'Registro de muestra',status:'Registrado',when:'Hace 5 días',priority:3,detail:'Movimiento ilustrativo del periodo de muestra.'},
 {id:'op-e1',kind:'egresos',title:'Egreso registrado',amount:1700,customerName:'Reposición de licencias',next:'Registro de muestra',status:'Registrado',when:'Hace 3 días',priority:3,detail:'Movimiento ilustrativo. No se ha generado un egreso real.'},
 {id:'op-e2',kind:'egresos',title:'Egreso registrado',amount:1450,customerName:'Costos operativos',next:'Registro de muestra',status:'Registrado',when:'Hace 6 días',priority:3,detail:'Movimiento ilustrativo. No se ha generado un egreso real.'}
];
const notifications=[
 {id:'n1',title:'Cancelación por hacer efectiva',description:'Valeria Cruz · revisar solicitud',href:'#/operaciones/cancelaciones/op-c1',read:false},
 {id:'n2',title:'Pago por verificar',description:'Mateo Díaz · comprobante recibido',href:'#/operaciones/pagos/op-p1',read:false},
 {id:'n3',title:'Soporte pendiente',description:'Emilio Rojas · espera respuesta',href:'#/operaciones/soporte/op-s1',read:false}
];
const ui={demoIndex:0,clientFilter:'todos',query:'',noticeOpen:false,lastPage:'',lastDetail:'',selectedClient:null};
const tabNames={resumen:'Resumen',servicios:'Servicios',beneficios:'Beneficios',cuenta:'Cuenta'};
const opFilters=[['pendientes','Pendientes'],['cancelaciones','Cancelaciones'],['pagos','Pagos'],['registros','Registros'],['ingresos','Ingresos'],['egresos','Egresos'],['soporte','Soporte'],['actividad','Actividad']];
const clientFilters=[['todos','Todos'],['atencion','Atención'],['porvencer','Por vencer'],['corriente','Al corriente']];
const findClient=id=>clients.find(x=>x.id===id);
const clientLink=(id,tab='resumen')=>'#/clientes/'+encodeURIComponent(id)+'/'+tab;
const currentDate=()=>dates[ui.demoIndex];
function status(c){const difference=day(c.due)-day(currentDate());
 if(c.review)return{key:'review',text:'En revisión',note:'Pago por validar'};
 if(difference<0)return{key:'late',text:'Vencido',note:Math.abs(difference)===1?'Venció ayer':'Hace '+Math.abs(difference)+' días'};
 if(difference===0)return{key:'due',text:'Vence hoy',note:'Hoy'};
 if(difference<=3)return{key:'due',text:'Por vencer',note:difference===1?'Mañana':'En '+difference+' días'};
 return{key:'current',text:'Al corriente',note:''};
}
function clientServices(c){return c.services.map(s=>'<span class="service-chip">'+safe(s.name)+(s.access.length>1?' <b>×'+s.access.length+'</b>':'')+'</span>').join('');}
function clientCard(c){const v=status(c);return '<a class="client-card" href="'+clientLink(c.id)+'" data-id="'+safe(c.id)+'" data-state="'+v.key+'"'+(ui.selectedClient===c.id?' style="view-transition-name:active-client"':'')+' aria-label="'+safe(c.name)+', '+safe(v.text)+'. Abrir expediente">'+
 '<div class="client-top"><strong class="person-name">'+safe(c.name)+'</strong><span class="client-state"><span>'+safe(v.text)+'</span></span></div>'+ 
 '<div class="client-folio">'+safe(c.id)+'</div><div class="client-services">'+clientServices(c)+'</div>'+ 
 '<div class="client-bottom"><div class="client-date"><span class="client-date-label">'+(v.key==='late'?'VENCIÓ EL':'PRÓXIMO CORTE')+'</span><b class="client-date-value">'+safe(c.due.slice(-2))+' NOV</b><span class="client-date-note">'+safe(v.note)+'</span></div><div class="client-money"><span class="client-money-label">IMPORTE DEMO</span><b>'+cash(c.amount)+'</b></div></div><span class="client-footer" aria-hidden="true">'+icon('arrow')+'</span></a>';
}
function renderClients(){const search=normalize(ui.query);const filtered=clients.filter(c=>{
 const v=status(c);if(ui.clientFilter==='atencion'&&v.key==='current')return false;
 if(ui.clientFilter==='porvencer'&&v.key!=='due')return false;
 if(ui.clientFilter==='corriente'&&v.key!=='current')return false;
 return !search||normalize(c.name).includes(search)||normalize(c.id).includes(search);
});
 $('client-grid').innerHTML=filtered.map(clientCard).join('');$('clients-total').textContent=String(filtered.length).padStart(2,'0');$('clients-empty').hidden=!!filtered.length;
 $('demo-date').textContent=currentDate().slice(-2)+' nov';
 $('client-filters').innerHTML=clientFilters.map(([key,label])=>'<button type="button" class="filter '+(ui.clientFilter===key?'is-active':'')+'" data-filter="'+key+'" aria-pressed="'+(ui.clientFilter===key)+'">'+label+'</button>').join('');
}
function setDemoDate(){
 const before=new Map(clients.map(c=>[c.id,status(c)]));
 ui.demoIndex=(ui.demoIndex+1)%dates.length;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const changed=[];
 if($('client-directory').hidden||ui.clientFilter!=='todos'||ui.query){
   renderClients();
 }else{
   $('demo-date').textContent=currentDate().slice(-2)+' nov';
   for(const c of clients){
     const card=Array.from(document.querySelectorAll('.client-card')).find(el=>el.dataset.id===c.id);
     if(!card)continue;
     const old=before.get(c.id),fresh=status(c);
     const was=old.text!==fresh.text||old.note!==fresh.note;
     card.dataset.state=fresh.key;
     card.setAttribute('aria-label',c.name+', '+fresh.text+'. Abrir expediente');
     card.querySelector('.client-state span').textContent=fresh.text;
     card.querySelector('.client-date-label').textContent=fresh.key==='late'?'VENCIÓ EL':'PRÓXIMO CORTE';
     card.querySelector('.client-date-note').textContent=fresh.note;
     if(was&&!reduced){
       const text=card.querySelector('.client-state');
       text.getAnimations().forEach(a=>a.cancel());
       text.animate([{opacity:.45,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
         {duration:330,easing:'cubic-bezier(.18,.78,.22,1)'});
     }
   }
 }
 for(const c of clients){if(before.get(c.id).text!==status(c).text)changed.push(c.name);}
 renderHome();
 const btn=$('date-step');
 if(!reduced){btn.getAnimations().forEach(a=>a.cancel());btn.animate([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:250,easing:'cubic-bezier(.2,.8,.2,1)'})}
 $('live-announcement').textContent='Fecha de muestra: '+currentDate().slice(-2)+' de noviembre. '+(changed.length?'Cambió el estado de '+changed.join(', ')+'.':'Fechas actualizadas.');
}
function renderHome(){const homeOps=operations.filter(o=>o.priority<=2).sort((a,b)=>a.priority-b.priority);
 $('home-priorities').innerHTML=homeOps.map(o=>'<a class="home-row" href="#/operaciones/'+o.kind+'/'+o.id+'"><span class="home-row-icon">'+icon(o.kind==='cancelaciones'?'clock':o.kind==='pagos'?'wallet':'brief')+'</span><span class="home-row-content"><strong>'+safe(o.title)+'</strong><small>'+safe(o.client?findClient(o.client)?.name:'')+' · '+safe(o.next)+'</small></span><span class="row-action">'+icon('right')+'</span></a>').join('');
 $('recent-list').innerHTML=[operations.find(o=>o.id==='op-r1'),operations.find(o=>o.id==='op-i1'),operations.find(o=>o.id==='op-e1')].map(o=>'<a class="home-row" href="#/operaciones/'+o.kind+'/'+o.id+'"><span class="home-row-content"><strong>'+safe(o.title)+(o.amount?' · '+cash(o.amount):'')+'</strong><small>'+safe(o.customerName)+' · '+safe(o.when)+'</small></span><span class="row-action">'+icon('right')+'</span></a>').join('');
 const entries=[{id:'GX-1042',d:'15',service:'Google One · Acceso 1'},{id:'GX-1048',d:'16',service:'Spotify · Acceso 1'},{id:'GX-1042',d:'23',service:'Google One · Acceso 2'},{id:'GX-1056',d:'28',service:'YouTube Premium'}];
 const visibleEntries=entries.filter(x=>day('2026-11-'+x.d)>=day(currentDate()));
 $('upcoming-list').innerHTML=visibleEntries.length?visibleEntries.map(x=>'<a class="upcoming" href="'+clientLink(x.id,'servicios')+'"><span class="up-date">'+x.d+'<small>NOV</small></span><span class="up-info"><strong>'+safe(findClient(x.id).name)+'</strong><small>'+safe(x.service)+'</small></span></a>').join(''):'<p class="upcoming-empty">Sin fechas futuras en esta muestra.</p>';
}
function renderDossier(c,tab){const v=status(c);const count=c.services.reduce((n,s)=>n+s.access.length,0);
 $('detail-identity').style.viewTransitionName='active-client';
 $('detail-identity').innerHTML='<div class="detail-heading"><div><h2>'+safe(c.name)+'</h2><small>'+safe(c.id)+' · '+c.services.length+' servicios</small></div><span class="client-state" style="--state-color:'+(v.key==='late'?'#a74565':v.key==='due'?'#9a632e':v.key==='review'?'#6958b0':'#26745e')+'"><span>'+safe(v.text)+'</span></span></div>';
 $('detail-tabs').innerHTML=Object.entries(tabNames).map(([k,n])=>'<a class="detail-tab '+(tab===k?'is-active':'')+'" href="'+clientLink(c.id,k)+'"'+(tab===k?' aria-current="page"':'')+'>'+n+'</a>').join('');
 let content='';
 if(tab==='resumen'){
 content='<div class="detail-summary"><div class="detail-stat"><small>Vencimiento</small><b>'+safe(c.due.slice(-2))+' NOV</b></div><div class="detail-stat"><small>Importe demo</small><b>'+cash(c.amount)+'</b></div><div class="detail-stat"><small>Accesos</small><b>'+count+'</b></div></div>'+ 
 '<div class="detail-columns"><section class="detail-panel"><h3>Suscripciones</h3>'+c.services.map(s=>'<div class="detail-line"><b>'+safe(s.name)+'</b><span>'+s.access.length+' '+(s.access.length===1?'acceso':'accesos')+'</span></div>').join('')+'<a class="detail-jump" href="'+clientLink(c.id,'servicios')+'">Ver fechas y accesos '+icon('arrow')+'</a></section>'+ 
 '<section class="detail-panel"><h3>Seguimiento</h3><div class="detail-line"><span>Estado</span><b>'+safe(v.text)+'</b></div><div class="detail-line"><span>Próxima fecha</span><b>'+safe(c.due.slice(-2))+' NOV</b></div><div class="detail-line"><span>Contrato X2</span><b>'+(c.services.some(s=>s.access.length>1)?'Sí':'No')+'</b></div></section></div>';
 }else if(tab==='servicios'){
 content='<div class="contracts">'+c.services.map(s=>'<section class="contract"><div class="contract-header"><h3>'+safe(s.name)+'</h3><span class="contract-count">'+s.access.length+' '+(s.access.length===1?'acceso':'accesos')+'</span></div><div class="accesses">'+s.access.map(a=>'<div class="access"><b>'+safe(a.name)+'</b><time>'+safe(a.date)+'</time></div>').join('')+'</div></section>').join('')+'</div>';
 }else if(tab==='beneficios'){
 content='<section class="detail-panel"><h3>Beneficios</h3><div class="detail-line"><span>Programa de lealtad</span><b>'+safe(c.benefit)+'</b></div><div class="detail-line"><span>Misiones</span><b>Sin datos en demo</b></div></section>';
 }else{
 content='<section class="detail-panel"><h3>Cuenta</h3><div class="detail-line"><span>Folio</span><b>'+safe(c.id)+'</b></div><div class="detail-line"><span>Permisos</span><b>En Admin oficial</b></div><div class="detail-line"><span>Credenciales</span><b>No disponibles</b></div></section>';
 }
 $('detail-content').innerHTML=content;
}
function opsFiltered(filter){return operations.filter(o=>filter==='pendientes'?o.priority<=2:filter==='actividad'?true:o.kind===filter).sort((a,b)=>a.priority-b.priority)}
function nameForOp(o){return o.client?findClient(o.client)?.name:o.customerName}
function renderOperationDetail(o,filter){const host=$('ops-detail');const has=!!o;host.classList.toggle('has-detail',has);
 if(!has){host.innerHTML='<div class="ops-detail-empty">'+icon('brief')+'<b>Selecciona un movimiento</b><span>Consulta detalles y ve al expediente sin salir de Operaciones.</span></div>';document.querySelector('.ops-sheet-backdrop')?.remove();return;}
 host.innerHTML='<div class="ops-detail-top"><div><small>OPERACIÓN · DEMO</small><h2>'+safe(o.title)+'</h2></div><a href="#/operaciones/'+filter+'" class="icon-mini" aria-label="Cerrar detalle">'+icon('close')+'</a></div>'+ 
 '<div class="ops-detail-content"><div class="detail-line"><span>Persona o concepto</span><b>'+safe(nameForOp(o))+'</b></div><div class="detail-line"><span>Estado</span><b>'+safe(o.status)+'</b></div><div class="detail-line"><span>Siguiente paso</span><b>'+safe(o.next)+'</b></div>'+ 
 (o.amount?'<div class="detail-line"><span>Importe</span><b>'+cash(o.amount)+'</b></div>':'')+'<p class="ops-context">'+safe(o.detail)+'</p>'+
 (o.client?'<a class="ops-open-client" href="'+clientLink(o.client)+'">Abrir expediente '+icon('arrow')+'</a>':'')+'</div>';
 document.querySelector('.ops-sheet-backdrop')?.remove();
 if(matchMedia('(max-width:760px)').matches){const backdrop=document.createElement('a');backdrop.className='ops-sheet-backdrop';backdrop.href='#/operaciones/'+filter;backdrop.setAttribute('aria-label','Cerrar detalle');document.body.append(backdrop);host.querySelector('a[aria-label="Cerrar detalle"]')?.focus({preventScroll:true});}
}
function renderOperations(filter='pendientes',opId=null){const f=opFilters.some(x=>x[0]===filter)?filter:'pendientes';const list=opsFiltered(f);const selected=operations.find(o=>o.id===opId&&list.includes(o));
 $('ops-filters').innerHTML=opFilters.map(([k,label])=>'<a class="op-filter '+(f===k?'is-active':'')+'" href="#/operaciones/'+k+'" '+(f===k?'aria-current="page"':'')+'>'+label+'</a>').join('');
 $('ops-list-name').textContent=opFilters.find(x=>x[0]===f)[1];$('ops-list-count').textContent=list.length+' '+(list.length===1?'movimiento':'movimientos');
 $('ops-head-count').textContent=opsFiltered('pendientes').length+' por resolver';
 $('ops-list').innerHTML=list.map(o=>'<a class="ops-item '+(selected===o?'is-selected':'')+'" data-kind="'+o.kind+'" href="#/operaciones/'+f+'/'+o.id+'" aria-label="Ver detalle: '+safe(o.title)+' de '+safe(nameForOp(o))+'"><span class="op-dot"></span><span class="op-text"><strong>'+safe(o.title)+(o.amount?' · '+cash(o.amount):'')+'</strong><small>'+safe(nameForOp(o))+' · '+safe(o.next)+'</small></span><span class="op-meta"><small>'+safe(o.when)+'</small>'+icon('right')+'</span></a>').join('')||'<p class="empty">Sin movimientos en esta categoría.</p>';
 renderOperationDetail(selected||null,f);
}
function noticeRender(){const unread=notifications.filter(n=>!n.read).length;const count=$('notification-count');count.textContent=unread;count.hidden=!unread;$('notifications-button').setAttribute('aria-label',unread?unread+' notificaciones sin leer':'No hay notificaciones sin leer');
 $('notifications-list').innerHTML=notifications.map(n=>'<a class="notice-row '+(n.read?'read':'')+'" href="'+n.href+'" data-notification="'+n.id+'"><span class="notice-dot"></span><span class="notice-content"><b>'+safe(n.title)+'</b><span>'+safe(n.description)+'</span></span>'+icon('right')+'</a>').join('');$('mark-read').disabled=!unread;
}
function toggleNotices(open){ui.noticeOpen=open;$('notifications-popover').hidden=!open;$('notifications-button').setAttribute('aria-expanded',String(open));if(open)noticeRender();}
const validPages=['inicio','clientes','operaciones','gestion'];
function parse(){const parts=decodeURIComponent((location.hash||'#/inicio').slice(2)).split('/');const page=validPages.includes(parts[0])?parts[0]:'inicio';return{page,one:parts[1],two:parts[2]};}
let priorRoute='';
function show(first=false){const route=parse(),key=route.page+'/'+(route.one||'');if(route.page==='clientes'&&route.one&&!findClient(route.one)){location.hash='#/clientes';return}
 document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+route.page);
 document.querySelectorAll('[data-nav]').forEach(a=>{const on=a.dataset.nav===route.page;a.classList.toggle('is-current',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 const navIndex=['inicio','clientes','operaciones','gestion'].indexOf(route.page);
 document.querySelector('.rail-links')?.style.setProperty('--active-nav',String(navIndex));
 document.querySelector('.dock')?.style.setProperty('--active-nav',String(navIndex));
 $('client-directory').hidden=route.page==='clientes'&&!!route.one;$('client-detail').hidden=route.page!=='clientes'||!route.one;
 if(route.page==='clientes'){if(route.one)renderDossier(findClient(route.one),Object.keys(tabNames).includes(route.two)?route.two:'resumen');else renderClients()}
 if(route.page==='operaciones')renderOperations(route.one,route.two);
 toggleNotices(false);
 if(!first){if(key!==priorRoute)scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true})}
 priorRoute=key;
}
let activeTransition=null;
function navChange(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced&&document.startViewTransition){
   activeTransition?.skipTransition();
   const transition=document.startViewTransition(()=>show());
   activeTransition=transition;
   window.__goxionV71TransitionFinished=transition.finished.catch(()=>{});
   window.__goxionV71TransitionFinished.finally(()=>{if(activeTransition===transition)activeTransition=null});
 }else{
   activeTransition?.skipTransition();
   window.__goxionV71TransitionFinished=Promise.resolve();
   show();
 }
}
function goBack(){const route=parse();if(route.page==='operaciones'&&route.two){location.hash='#/operaciones/'+route.one;return true}if(route.page==='clientes'&&route.one){location.hash='#/clientes';return true}return false}
function events(){document.addEventListener('click',e=>{
 const client=e.target.closest('a.client-card');
 if(client){
   ui.selectedClient=client.dataset.id;
   document.querySelectorAll('.client-card').forEach(x=>x.style.viewTransitionName='none');
   client.style.viewTransitionName='active-client';
 }
 const f=e.target.closest('[data-filter]');if(f){ui.clientFilter=f.dataset.filter;renderClients()}
 const n=e.target.closest('[data-notification]');if(n){const record=notifications.find(x=>x.id===n.dataset.notification);if(record){record.read=true;noticeRender();}}
 if(ui.noticeOpen&&!e.target.closest('.notify-anchor'))toggleNotices(false);
 });
 $('date-step').addEventListener('click',setDemoDate);
 $('search').addEventListener('input',e=>{ui.query=e.target.value;renderClients()});
 $('notifications-button').addEventListener('click',()=>toggleNotices(!ui.noticeOpen));
 $('notify-close').addEventListener('click',()=>{toggleNotices(false);$('notifications-button').focus()});
 $('mark-read').addEventListener('click',()=>{notifications.forEach(x=>x.read=true);noticeRender();$('live-announcement').textContent='Notificaciones de demostración marcadas como leídas.'});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(ui.noticeOpen){toggleNotices(false);$('notifications-button').focus()}else goBack()}});
 window.addEventListener('hashchange',navChange);
}
renderHome();renderClients();noticeRender();events();if(!location.hash)history.replaceState(null,'','#/inicio');show(true);
})();