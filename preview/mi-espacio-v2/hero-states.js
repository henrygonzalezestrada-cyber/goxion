/* Presentation only: global alerts and existing cancellation states. */
(function(){
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const str=(v,n=100)=>String(v||'').trim().slice(0,n);
const all=n=>['todos','todos los servicios'].includes(norm(n));
function globalItem(a,logo){
 if(a?.activa!==true)return null;
 const name=str(a.plataforma,65)||'Todos los servicios',type=str(a.falla),detail=str(a.mensaje,480),maintenance=norm(type).includes('mantenimiento');
 return {id:'global',kind:'global',name,title:all(name)?'Incidencia general':name+' '+(maintenance?'en mantenimiento':'presenta una incidencia'),meta:type||'Incidencia activa',detail,logo:all(name)?'':logo(name),tone:maintenance?'caution':'alert',priority:90,sig:JSON.stringify([a.id,name,type,detail,a.updated_at||''])};
}
function collect(v,primary,logo){
 const items=[],a=globalItem(v?.alertas,logo);if(a)items.push(a);
 (v?.servicios||[]).filter(s=>['solicitada','aprobada'].includes(norm(s.cancelacion?.estado))).forEach((s,i)=>{
 if(primary==='cancellation'&&i===0)return;const c=s.cancelacion,approved=norm(c.estado)==='aprobada';
 items.push({id:'cancel:'+String(c.id||s.id),kind:'cancel',serviceId:String(s.id),name:str(s.nombre,65),title:approved?'Cancelación confirmada':'Cancelación en proceso',meta:str(s.nombre,65),detail:approved&&c.fecha_efectiva?'Fecha efectiva: '+str(c.fecha_efectiva):'Consulta el seguimiento de tu solicitud.',tone:'caution',priority:approved?60:65});
 });
 return items.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
function create({card,logo,openCancellation,storage=true,seconds=5}){
 const doc=card.ownerDocument,win=doc.defaultView,copy=card.querySelector('.focus-copy'),icon=card.querySelector('.focus-icon'),bottom=card.querySelector('.focus-bottom'),primary=bottom.querySelector('.focus-action');
 const glyphs={global:'M12 3 22 20H2L12 3zM12 9v5M12 17v1',cancel:'M5 5h14v14H5zM8 12h8',resolved:'M4 12l5 5L20 6',more:'M5 12h1m5 0h1m5 0h1'};
 function el(tag,cls,t){const n=doc.createElement(tag);n.className=cls||'';if(t)n.textContent=t;return n}
 function art(item){const a=el('span','gx-state-art');a.setAttribute('aria-hidden','true');const draw=()=>{const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',glyphs[item.kind]||glyphs.more);svg.append(path);a.append(svg)};if(item.logo){const img=el('img');img.alt='';img.src=item.logo;img.onerror=()=>{img.remove();draw()};a.append(img)}else draw();return a}
 const bubbles=el('div','gx-state-bubbles');bubbles.hidden=true;bubbles.setAttribute('role','group');bubbles.setAttribute('aria-label','Otros estados importantes');bottom.append(bubbles);
 const panel=el('div','gx-state-panel'),body=el('div','gx-state-body'),title=el('div','focus-title'),meta=el('span','focus-meta'),detail=el('div','gx-state-detail'),picture=el('span','gx-state-hero-art'),actions=el('div','focus-bottom'),back=el('button','focus-action','Volver a mi estado'),follow=el('button','focus-action','Ver seguimiento'),list=el('div','gx-state-overflow');
 panel.hidden=true;panel.setAttribute('aria-label','Detalle de estado');title.setAttribute('aria-live','polite');back.type=follow.type='button';body.append(title,meta,detail,list);actions.append(follow,back);panel.append(body,picture,actions);card.append(panel);
 let items=[],account='',last=null,seen='',timer=0,opened=null,queued=null,automatic=false,anim=null,closing=false,lastKey='',returnFocus=null;
 const reduced=()=>win.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const visible=()=>!doc.hidden&&card.getClientRects().length>0&&(!doc.getElementById('view-dashboard')||doc.body.classList.contains('gx-v2-private-visible'));
 const key=()=>account?'goxion:hero-alert:v1:'+account:'';
 function save(){if(storage&&key())try{win.localStorage.setItem(key(),JSON.stringify({last,seen}))}catch(_){}}
 function read(id){if(account===id)return;reset();account=id;if(storage&&key())try{const v=JSON.parse(win.localStorage.getItem(key())||'null');if(v){last=v.last?.kind==='global'?v.last:null;seen=typeof v.seen==='string'?v.seen:''}}catch(_){}}
 function render(){const sig=JSON.stringify(items);if(sig===lastKey)return;lastKey=sig;const old=primary.getBoundingClientRect();bubbles.replaceChildren();bubbles.hidden=!items.length;
 for(const item of items.slice(0,2)){const b=el('button','gx-state-bubble');b.type='button';b.dataset.stateId=item.id;b.dataset.tone=item.tone;b.setAttribute('aria-label',item.title);b.append(art(item));b.onclick=()=>show(item,false,b);bubbles.append(b)}
 if(items.length>2){const b=el('button','gx-state-bubble gx-state-more','+'+(items.length-2));b.type='button';b.setAttribute('aria-label','Ver '+(items.length-2)+' estados adicionales');b.onclick=()=>show({id:'more',kind:'more',title:'Otros estados importantes',meta:'Selecciona para consultar',tone:'neutral'},false,b);bubbles.append(b)}
 const now=primary.getBoundingClientRect();if(!reduced()&&old.width&&now.width&&Math.abs(old.left-now.left)>1)primary.animate?.([{transform:'translateX('+(old.left-now.left)+'px)'},{transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 function hide(immediate=false){clearTimeout(timer);timer=0;if(!opened&&!closing)return;const old=opened,wasAuto=automatic;opened=null;automatic=false;closing=true;anim?.cancel();
 const finish=()=>{if(opened)return;panel.hidden=true;card.classList.remove('gx-state-presenting');copy.inert=icon.inert=bottom.inert=false;closing=false;if(!wasAuto&&returnFocus){const b=[...bubbles.children].find(x=>x.dataset.stateId===old?.id)||returnFocus;if(b.isConnected)b.focus({preventScroll:true});else primary.focus({preventScroll:true})}returnFocus=null;drain()};
 if(!immediate&&!reduced()&&panel.animate){const target=[...bubbles.children].find(b=>b.dataset.stateId===old?.id),a=picture.getBoundingClientRect(),b=target?.getBoundingClientRect();if(b&&a.width)picture.animate?.([{transform:'translate(0,0) scale(1)'},{transform:'translate('+(b.left+b.width/2-a.left-a.width/2)+'px,'+(b.top+b.height/2-a.top-a.height/2)+'px) scale(.34)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});anim=panel.animate([{opacity:1},{opacity:0}],{duration:280,easing:'ease-out'});anim.onfinish=finish}else finish();
 }
 function show(item,auto=false,source=null){clearTimeout(timer);anim?.cancel();closing=false;opened=item;automatic=auto;returnFocus=source;panel.hidden=false;card.classList.add('gx-state-presenting');copy.inert=icon.inert=bottom.inert=true;
 panel.dataset.tone=item.tone;title.textContent=item.title;meta.textContent=item.meta||'';detail.textContent=item.detail||'';detail.hidden=!item.detail;list.hidden=item.kind!=='more';list.replaceChildren();picture.replaceChildren(art(item));picture.hidden=item.kind==='more';
 if(item.kind==='more')for(const i of items.slice(2)){const b=el('button','gx-state-overflow-item',i.title+' · '+i.name);b.type='button';b.onclick=()=>show(i,false,source);list.append(b)}
 follow.hidden=item.kind!=='cancel';back.textContent=item.kind==='resolved'?'Entendido':'Volver a mi estado';
 if(!reduced())anim=panel.animate?.([{opacity:0,transform:'translateX(9px)'},{opacity:1,transform:'translateX(0)'}],{duration:260,easing:'cubic-bezier(.2,.75,.25,1)'});
 if(auto){timer=win.setTimeout(()=>hide(),seconds*1000);if(item.sig){seen=item.sig;save()}}else back.focus({preventScroll:true});
 }
 back.onclick=()=>hide();follow.onclick=()=>{const id=opened?.serviceId;if(id){hide(true);openCancellation?.(id)}};panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();hide()}};
 function drain(){if(account&&queued&&!opened&&!closing&&visible()){const item=queued;queued=null;show(item,true)}}
 function update(view,primaryCode){const id=String(view?.cliente?.id||'');if(!id){reset();return}read(id);const raw=view.alertas,a=globalItem(raw,logo);items=collect(view,primaryCode,logo);
 if(a){if(a.sig!==seen&&a.sig!==queued?.sig)queued=a;last=a;save()}
 else if(raw?.activa===false&&last&&norm(raw.plataforma||'Todos los servicios')===norm(last.name)){const r={id:'resolved',kind:'resolved',sig:'resolved:'+last.sig,title:isAll(last.name)?'Incidencia finalizada':last.name+' · Incidencia finalizada',meta:'Aviso cerrado por GOXION',detail:'Si todavía tienes dificultades, puedes acudir a Soporte.',tone:'success'};if(seen!==r.sig)queued=r;last=null;save()}
 else if(raw?.activa===false){last=null;if(queued?.kind==='global')queued=null;save()}else if(!raw&&queued?.kind==='global')queued=null;
 render();if(opened?.kind==='global'&&(!a||a.sig!==opened.sig))hide(true);if(opened?.kind==='cancel'&&!items.some(x=>x.id===opened.id))hide(true);drain();
 }
 function reset(){clearTimeout(timer);queued=null;account='';hide(true);items=[];last=null;seen='';lastKey='';render()}
 new win.MutationObserver(()=>{if(!visible()&&opened&&automatic)hide(true);else drain()}).observe(doc.body,{attributes:true,attributeFilter:['class']});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&opened&&automatic)hide(true);else drain()});
 return {update,reset};
}
window.GOXION_HERO_STATES=Object.freeze({collect,create});
})();