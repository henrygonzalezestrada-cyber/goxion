/* GOXION V2 · espejo integral de navegación. Fuente funcional de Catálogo y Soporte:
   ../../ayuda.html oficial, en origen común y un único iframe aislado.
   No clona la interfaz ni el carrito, ni aplica CSS legado en Mi Espacio.
   Este portal NO constituye la migración definitiva a ayuda.html. */
(function(){
 'use strict';
 const portal=document.getElementById('gxi-official-portal');
 const frame=document.getElementById('gxi-official-frame');
 const progress=document.getElementById('gxi-portal-loading');
 const error=document.getElementById('gxi-portal-error');
 const space=document.getElementById('gxi-space');
 if(!portal||!frame||!progress||!error||!space)return;
 let initiated=false,ready=false,selected='catalog',syncing=false,observer=null;
 function markLoading(value){progress.hidden=!value;error.hidden=true;if(value)frame.hidden=true}
 function failure(){
  markLoading(false);frame.hidden=true;error.hidden=false;
 }
 function styleOfficial(){
  const doc=frame.contentDocument;
  if(!doc)throw new Error('El módulo oficial debe compartir origen');
  if(!doc.getElementById('gxi-portal-frame-skin')){
   const css=doc.createElement('style');css.id='gxi-portal-frame-skin';
   css.textContent=[
    'html,body{min-height:100%!important;overflow-x:clip!important}',
    'body.no-scroll{overflow-y:auto!important}',
    '.app-header,#goxion-main-nav,#sticky-client-bar,#splash-screen,.goxion-release-version,#dynamic-alert{display:none!important}',
    '.container{padding-top:0!important;margin-top:0!important;max-width:580px!important}',
    '.bg{display:none!important}'
   ].join('');
   doc.head.append(css);
  }
 }
 function synchronize(){
  if(syncing||portal.hidden||!ready)return;
  const doc=frame.contentDocument;if(!doc)return;
  if(doc.getElementById('view-catalogo')?.classList.contains('active')){selected='catalog';window.GOXION_V2_SYNC_TAB?.('catalog')}
  else if(doc.getElementById('view-soporte')?.classList.contains('active')){selected='support';window.GOXION_V2_SYNC_TAB?.('support')}
  else if(doc.getElementById('view-dashboard')?.classList.contains('active')||doc.getElementById('view-inicio')?.classList.contains('active'))window.GOXION_V2_GO_SPACE?.();
 }
 function attachObserver(){
  observer?.disconnect();
  const doc=frame.contentDocument;if(!doc)return;
  const views=['view-inicio','view-dashboard','view-catalogo','view-soporte']
   .map(id=>doc.getElementById(id)).filter(Boolean);
  if(!views.length)return;
  observer=new MutationObserver(()=>synchronize());
  views.forEach(view=>observer.observe(view,{attributes:true,attributeFilter:['class']}));
 }
 function showSection(){
  if(!ready)return;
  try{
   const child=frame.contentWindow,tab=selected==='support'?'soporte':'catalogo';
   styleOfficial();
   if(typeof child?.switchTab!=='function')throw new Error('Navegación oficial no disponible');
   syncing=true;
   child.switchTab(tab);
   syncing=false;
   if(child.document.scrollingElement)child.document.scrollingElement.scrollTop=0;
   frame.title=selected==='catalog'?'Catálogo oficial GOXION':'Soporte oficial GOXION';
   frame.hidden=false;progress.hidden=true;error.hidden=true;
   attachObserver();
  }catch(ex){syncing=false;console.warn('GOXION espejo integral:',ex);failure()}
 }
 function onFrameLoad(){
  try{styleOfficial();ready=true;showSection()}
  catch(ex){console.warn('GOXION espejo integral:',ex);failure()}
 }
 frame.addEventListener('load',onFrameLoad);
 frame.addEventListener('error',failure);
 function open(name){
  if(name!=='catalog'&&name!=='support')return false;
  selected=name;portal.hidden=false;space.hidden=true;markLoading(!ready);
  if(!initiated){
   initiated=true;
   frame.src=new URL('../../ayuda.html',document.baseURI).href;
  }else showSection();
  return true;
 }
 function close(){
  portal.hidden=true;space.hidden=false;
  observer?.disconnect();
  return true;
 }
 function openLegal(){
  open('support');
  const run=()=>{
   try{frame.contentWindow?.GOXION_LEGAL_V2?.openNotification?.()}catch(e){console.warn('Aviso legal:',e)}
  };
  if(ready)run();else frame.addEventListener('load',run,{once:true});
 }
 window.GOXION_V2_OFFICIAL_BRIDGE=Object.freeze({open,close,openLegal});
})();
