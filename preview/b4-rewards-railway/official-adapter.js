/* GOXION official Ayuda mirror adapter.
 * Original full HTML and CSS. All production JS deliberately disabled.
 * Synthetic UI behaviors only: no auth, support requests or purchases.
 */
(async()=>{
'use strict';
if(document.documentElement.dataset.gxB4Official!=='true')return;
const $=id=>document.getElementById(id);
const peso=n=>'$'+(n/100).toFixed(2);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=[
 {name:'Netflix Premium',brand:'NETFLIX',logo:'/logos/netflix.PNG',price:10900,type:'Perfil individual'},
 {name:'ViX Premium',brand:'VIX',logo:'/logos/vix.PNG',price:4900,type:'Perfil individual'},
 {name:'Max + Prime Video',brand:'COMBO',logo:'/logos/hbo-max.PNG',price:9900,type:'Promoción de combo'},
 {name:'Crunchyroll',brand:'CRUNCHYROLL',logo:'/logos/crunchyroll.PNG',price:10000,type:'Cuenta completa'}
];
function demo(message){
 const el=$('gx-mirror-toast');if(!el)return;
 el.textContent=message;el.hidden=false;clearTimeout(demo.timer);
 demo.timer=setTimeout(()=>el.hidden=true,3200);
}
function view(name='dashboard'){
 document.querySelectorAll('.view-section').forEach(el=>{
  const desired=(name==='inicio'?'view-inicio':name==='dashboard'?'view-dashboard':
    name==='catalogo'?'view-catalogo':'view-soporte');
  el.style.display=el.id===desired?'block':'none';
 });
 for(const btn of document.querySelectorAll('#goxion-main-nav .tab-btn')){
  btn.classList.toggle('active',btn.dataset.goxionTab===(name==='dashboard'?'inicio':name));
 }
 window.scrollTo({top:0,behavior:'instant'});
}
window.GOXION_B4_OFFICIAL_NAV=Object.freeze({view});
window.switchTab=tab=>view(tab==='inicio'?'dashboard':tab);
const logo=($('header-action-btn'));
function closeDemoAuth(){
 const root=$('header-action-btn');
 root?.classList.remove('gx-b4-auth-open');
 root?.setAttribute('aria-expanded','false');
 document.querySelector('#gx-b4-auth-overlay')?.remove();
 document.body.classList.remove('gx-b4-auth-visible');
}
if(logo){
 logo.classList.add('gx-client-session-active','gx-mirror-auth');
 const title=$('header-btn-text');if(title)title.textContent='Mi Espacio';
 logo.addEventListener('click',ev=>{
  if(ev.target.closest('input,button'))return;
  const open=!logo.classList.contains('gx-b4-auth-open');
  if(!open){closeDemoAuth();return}
  logo.classList.add('gx-b4-auth-open');logo.setAttribute('aria-expanded','true');
  document.body.classList.add('gx-b4-auth-visible');
  const scrim=document.createElement('div');scrim.id='gx-b4-auth-overlay';
  scrim.addEventListener('click',closeDemoAuth);document.body.append(scrim);
 },true);
}
document.querySelector('.gx-auth-inline-close')?.addEventListener('click',e=>{
 e.preventDefault();e.stopPropagation();closeDemoAuth();
},true);
const login=$('btn-login-submit');
if(login)login.addEventListener('click',ev=>{
 ev.preventDefault();ev.stopPropagation();
 closeDemoAuth();
 view('dashboard');demo('Sesión de ejemplo: no se verifican credenciales ni contraseñas.');
},true);
const eye=$('gx-pin-eye-btn');
if(eye)eye.addEventListener('click',()=>{
 const input=$('login-pin');if(input)input.type=input.type==='password'?'text':'password';
},true);
document.querySelectorAll('.gx-welcome-trigger,.gx-auth-activate-entry').forEach(btn=>btn.addEventListener('click',e=>{
 e.preventDefault();e.stopPropagation();
 demo('El registro real está desactivado en este espejo. No se crean clientes.');
},true));
$('btn-tab-inicio')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();view('dashboard')},true);
$('btn-tab-catalogo')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();view('catalogo')},true);
$('btn-tab-soporte')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();view('soporte')},true);
document.querySelectorAll('.teaser-card').forEach(x=>x.addEventListener('click',()=>view('catalogo'),true));
const contents=$('catalog-container');
if(contents){
 contents.innerHTML=names.map((p,i)=>
  '<article class="glass-card gx-b4-official-product" data-gx-product="'+i+'">'+
  '<div class="gx-b4-official-product-header"><img alt="" src="'+p.logo+'" onerror="this.style.display=\u0027none\u0027">'+
  '<div><span class="gx-b4-official-kind">'+p.type+'</span><strong>'+p.name+'</strong></div></div>'+
  '<div class="gx-b4-official-product-foot"><span>'+peso(p.price)+'/mes</span>'+
  '<button type="button" class="gx-b4-official-product-button" data-gx-catalog-demo="'+i+'">Consultar disponibilidad</button></div></article>'
 ).join('');
 const search=$('gx-catalog-search');
 if(search)search.addEventListener('input',()=>{
  const value=search.value.toLowerCase().trim();
  contents.querySelectorAll('[data-gx-product]').forEach((node,i)=>{
   node.hidden=!names[i].name.toLowerCase().includes(value);
  });
 });
}
const deck=$('gx-promo-showcase');
if(deck){
 deck.hidden=false;
 const e=$('gx-promo-deck');if(e)e.innerHTML='<div class="glass-card gx-b4-promo-sample">'+
  '<small>PROMOCIÓN DE EJEMPLO · NO ACUMULABLE CON 5% GIXYS</small>'+
  '<strong>Max + Prime Video</strong><span>Precio promocional $99.00/mes</span>'+
  '<p>Los descuentos de este combo permanecen excluidos del 5% secreto.</p></div>';
}
const curated=$('gx-catalog-curated');
if(curated){curated.hidden=false;
 const rail=$('gx-catalog-best-rail');
 if(rail)rail.innerHTML=names.slice(0,2).map((x,i)=>
 '<button type="button" class="gx-b4-official-mini" data-gx-catalog-demo="'+i+'">'+
 '<span>'+escape(x.name)+'</span><strong>'+peso(x.price)+'/mes</strong></button>').join('');
 const discovered=$('gx-catalog-discover-rail');
 if(discovered)discovered.innerHTML='<div class="gx-b4-official-mini">Promociones y cuentas completas conservan sus exclusiones</div>';
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-gx-catalog-demo]');
 if(!el)return;e.preventDefault();e.stopPropagation();
 const product=names[Number(el.dataset.gxCatalogDemo)];
 demo('Vista de catálogo: '+product.name+'. Contrataciones reales desactivadas.');
},true);
const support=$('support-platforms-grid');
if(support){
 support.innerHTML=names.map((s,i)=>
 '<button class="gx-b4-support-choice" type="button" data-gx-support-demo="'+i+'">'+
 '<img alt="" src="'+s.logo+'"><span>'+escape(s.name)+'</span></button>').join('');
}
const supportIssue=$('issue-selector');
if(supportIssue)supportIssue.innerHTML='<option value="">Selecciona una opción</option>'+
 '<option value="access">Problemas para acceder</option>'+
 '<option value="intermittence">Intermitencia del servicio</option>'+
 '<option value="credentials">Recuperar credenciales</option>';
let supportSelected=null;
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-gx-support-demo]');
 if(!b)return;e.preventDefault();e.stopPropagation();
 supportSelected=names[Number(b.dataset.gxSupportDemo)];
 document.querySelectorAll('[data-gx-support-demo]').forEach(x=>x.classList.toggle('is-active',x===b));
 const stage=$('step-2');if(stage)stage.style.display='block';
 demo('Soporte de prueba para '+supportSelected.name+'.');
},true);
supportIssue?.addEventListener('change',()=>{
 const el=$('solution-text');if(!el)return;
 el.textContent='Goxy puede ayudarte con este tema. Este espejo no envía reportes.';
 const stage=$('step-3');if(stage)stage.style.display='block';
});
const send=$('smart-action-btn');
if(send)send.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
 demo('Solicitud simulada. No se envió ningún mensaje de soporte.');
},true);
const overlay=$('support-lock-overlay');if(overlay){overlay.hidden=true;overlay.style.display='none'}
const mods=['modal-terminos','modal-garantia','modal-lealtad','modal-referidos','modal-feedback'];
document.addEventListener('click',e=>{
 const close=e.target.closest('.modal-close,[data-gx-close],.gx-auth-inline-close');
 if(close){
  const m=close.closest('.modal,.gx-modal,.gx-overlay');if(m)m.style.display='none';
  if(close.classList.contains('gx-auth-inline-close'))$('header-action-btn')?.setAttribute('aria-expanded','false');
 }
},true);
const referral=$('referral-section-container');
if(referral){
 const resp=await fetch('/preview/gixys-mi-espacio-espejo/missions-demo.html');
 if(!resp.ok)throw Error('Mission fixture unavailable');
 referral.innerHTML=await resp.text();
}
const missionCard=$('gx-mirror-mission-card'),missionBtn=$('gx-mirror-complete-btn');
missionCard?.addEventListener('click',()=>{
 if(typeof window.openGamif==='function')window.openGamif('coupon');
 else $('gamif-expanded-coupon')?.classList.add('active');
});
$('gx-mirror-close-missions')?.addEventListener('click',()=>{
 if(typeof window.closeGamif==='function')window.closeGamif();
 else $('gamif-expanded-coupon')?.classList.remove('active');
});
let missionEmitted=false;
missionBtn?.addEventListener('click',()=>{
 if(missionEmitted)return;
 missionEmitted=true;missionBtn.disabled=true;
 missionBtn.classList.add('is-complete');
 $('gx-mirror-mission-line')?.classList.add('done','gx-mission-just-completed');
 if($('gx-mirror-mission-status'))$('gx-mirror-mission-status').textContent='Misión completada · Cupón de prueba disponible';
 if($('gx-mirror-action-label'))$('gx-mirror-action-label').textContent='Misión completada';
 if($('gx-mirror-mission-bar'))$('gx-mirror-mission-bar').style.width='100%';
 document.dispatchEvent(new CustomEvent('gx-mirror:mission',{detail:{active:true,source:'server-synthetic'}}));
});
document.addEventListener('gx-mirror:loyalty-toggle',e=>{
 if(e.detail?.value&&/^4\/4/.test($('loyalty-count')?.textContent||'')){
  window.GOXION_B3_ROUTER?.emit('loyalty',true);
 }
});
// source of visual events continues to be V7 Gixys and B1 notice.
window.GOXION_GIXYS_MIRROR=Object.freeze({isolated:true,source:'ayuda.html',noBackend:true,version:'B4 official markup'});
document.dispatchEvent(new Event('gx-mirror-ready'));
})().catch(err=>{console.error('GOXION official mirror',err);});
