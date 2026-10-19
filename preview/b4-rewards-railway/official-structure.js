/* Full original official Ayuda DOM is served untouched except scripts removed.
 * Only adds the approved V7 beta Gixy anchors and simulation controls. */
(()=>{
'use strict';
if(document.documentElement.dataset.gxB4Official!=='true')return;
const $=id=>document.getElementById(id);
// Original V9 mirror stub for production-only Mission counter updates.
window.animarMisionesCompletadasEnSecuencia=()=>{};
document.body.classList.remove('no-scroll');
document.body.classList.add('gx-official-mirror');
const splash=$('splash-screen');if(splash)splash.style.display='none';
const main=document.querySelector('.container');
if(main)main.id='gx-mirror-container';
const header=document.querySelector('.app-header');
if(header){
 const session=$('header-action-btn');
 const box=document.createElement('div');box.className='gx-header-actions';
 const bell=document.createElement('button');bell.type='button';
 bell.className='gx-client-notif-launch';bell.id='gx-client-notif-launch';
 bell.setAttribute('aria-label','Notificaciones de esta demostración');
 bell.setAttribute('aria-haspopup','dialog');bell.setAttribute('aria-expanded','false');
 bell.innerHTML='<span class="gx-client-notif-icon" aria-hidden="true"><svg class="gx-client-notif-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path class="gx-client-notif-clapper" d="M10 21h4"></path></svg></span><span id="gx-client-notif-badge" class="gx-client-notif-badge"></span>';
 box.append(bell);if(session)box.append(session);
 header.append(box);
 header.insertAdjacentHTML('beforeend','<span class="gx-mirror-square" id="gx-mirror-square" aria-hidden="true"></span>');
}
const nav=$('goxion-main-nav');
if(nav){
 const note=document.createElement('div');note.className='gx-mirror-note';note.setAttribute('role','note');
 note.innerHTML='<span class="gx-mirror-led"></span><span>ESPEJO DE AYUDA OFICIAL · Cuenta ficticia y acciones sin efecto real</span>';
 nav.before(note);
}
const bill=$('dash-billing-card');
if(bill){
 const row=$('loyalty-count')?.parentElement,label=row?.firstElementChild;
 if(label){
   label.classList.add('gx-mirror-loyalty-label');
   label.innerHTML='<span id="gx-mirror-heart"></span><span class="gx-mirror-loyalty-name">Nivel de Lealtad</span>';
 }
 bill.insertAdjacentHTML('beforeend','<span class="gx-mirror-loyalty-companion" id="gx-mirror-circle" aria-hidden="true"></span>');
}
const addon=document.createElement('div');
addon.id='gx-b4-source-elements';
addon.innerHTML=[
 '<div class="gx-b3-lab" id="gx-b3-lab">',
 '<button class="gx-b3-lab-toggle" type="button" id="gx-b3-toggle" aria-expanded="false" aria-controls="gx-b3-controls">Simular mi cuenta <span aria-hidden="true">⌄</span></button>',
 '<div class="gx-b3-controls" id="gx-b3-controls" hidden>',
 '<div class="gx-b3-heading">Goxy coordina · Gixys acompañan</div>',
 '<p>Datos ficticios, sin clientes ni cobros reales.</p>',
 '<div class="gx-b3-buttons" hidden></div>',
 '<button class="gx-b3-reset" data-gx-b3-test="reset" type="button" hidden>Reiniciar</button>',
 '</div></div>',
 '<button id="gx-smart-toggle" hidden type="button"></button>',
 '<section id="gx-smart-lab" hidden><select id="gx-smart-scenario"></select><button id="gx-smart-preview-alert" disabled hidden type="button"></button></section>',
 '<div class="gx-client-notif-overlay" id="gx-smart-notif-overlay" aria-hidden="true"></div>',
 '<section class="gx-client-notif-sheet" id="gx-smart-notif-sheet" role="dialog" aria-modal="true" aria-label="Notificaciones de prueba" aria-hidden="true" inert>',
 '<div class="gx-client-notif-handle" aria-hidden="true"></div>',
 '<header class="gx-client-notif-head"><span aria-hidden="true"></span><strong class="gx-client-notif-head-title">Notificaciones</strong>',
 '<button type="button" class="gx-client-notif-close" id="gx-smart-notif-close" aria-label="Cerrar notificaciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>',
 '</header><div class="gx-client-notif-list" id="gx-smart-notif-list"></div></section>',
 '<div class="gx-smart-toast" id="gx-smart-toast" role="status" aria-live="polite" hidden></div>',
 '<div id="gx-mirror-toast" class="gx-mirror-toast" role="status" hidden></div>'
].join('');
document.body.append(addon);
for(const view of document.querySelectorAll('.view-section'))
 view.style.display=view.id==='view-dashboard'?'block':'none';
for(const e of [document.querySelector('#support-lock-overlay'),$('dash-onboarding-card')])
 if(e)e.hidden=true;
})();