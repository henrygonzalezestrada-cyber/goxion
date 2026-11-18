/* GOXION · Documentos legales v2 · preparación controlada.
 * El consentimiento obligatorio permanece INACTIVO hasta que el backend registre
 * decisiones versionadas y el motor B2 aplique las mismas condiciones.
 * Nunca usar localStorage como prueba de consentimiento.
 */
(()=>{'use strict';
const base='./assets/legal/lector.html?doc=';
const items=[['terminos','Términos y Condiciones Generales v2.0'],['referidos','Bases del Programa de Referidos'],['cupones','Bases de Cupones y Promociones']];
function mount(){
 const modal=document.getElementById('modal-terminos');
 if(!modal||document.getElementById('gx-legal-v2-links'))return;
 const parent=modal.querySelector('.gx-dialog-legacy-scroll');
 if(!parent)return;
 const box=document.createElement('section');box.id='gx-legal-v2-links';
 box.style.cssText='margin:16px 0;padding:14px;border:1px solid rgba(255,255,255,.2);border-radius:14px';
 const heading=document.createElement('strong');heading.textContent='Próxima actualización · documentos para consulta';box.append(heading);
 const hint=document.createElement('p');hint.textContent='Estos documentos están en preparación. Las condiciones vigentes no cambian hasta su anuncio.';hint.style.cssText='font-size:12px;opacity:.8';box.append(hint);
 for(const [key,label] of items){const a=document.createElement('a');a.href=base+key;a.textContent=label;a.style.cssText='display:block;padding:9px 0;color:inherit;text-decoration:underline';box.append(a)}
 const preview=document.createElement('button');preview.type='button';preview.textContent='Ver vista previa del aviso de aceptación';preview.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid currentColor;background:transparent;color:inherit';preview.addEventListener('click',showPreview);box.append(preview);
 parent.prepend(box);
}
function showPreview(){
 if(document.getElementById('gx-legal-consent-preview'))return;
 const dlg=document.createElement('dialog');dlg.id='gx-legal-consent-preview';dlg.setAttribute('aria-label','Vista previa de consentimiento');dlg.style.cssText='max-width:480px;width:calc(100% - 32px);max-height:90dvh;overflow:auto;border:1px solid #777;border-radius:18px;padding:24px;background:#15171d;color:#fff;box-shadow:0 18px 70px #0009';
 const h=document.createElement('h2');h.textContent='Actualización de Términos y Condiciones';dlg.append(h);
 const p=document.createElement('p');p.textContent='Vista previa: al publicarse, podrás aceptar las nuevas condiciones o rechazar las renovaciones futuras sin perder periodos ya pagados.';dlg.append(p);
 const link=document.createElement('a');link.href=base+'terminos';link.target='_blank';link.rel='noopener';link.textContent='Leer el documento completo';link.style.cssText='display:block;margin:18px 0;color:#b5ccff';dlg.append(link);
 const check=document.createElement('input');check.type='checkbox';check.id='gx-legal-preview-read';const lab=document.createElement('label');lab.htmlFor=check.id;lab.textContent=' He leído y comprendo los Términos y Condiciones.';dlg.append(check,lab);
 const accept=document.createElement('button');accept.type='button';accept.disabled=true;accept.textContent='Aceptar y continuar';accept.style.cssText='display:block;margin:18px 0 10px;width:100%;padding:13px;border-radius:12px';check.addEventListener('change',()=>accept.disabled=!check.checked);accept.addEventListener('click',()=>{alert('Vista previa: todavía no se registra aceptación.');});dlg.append(accept);
 const reject=document.createElement('button');reject.type='button';reject.textContent='No acepto las nuevas condiciones';reject.style.cssText='width:100%;padding:12px;border-radius:12px';reject.addEventListener('click',()=>alert('Vista previa: todavía no se registra rechazo.'));dlg.append(reject);
 const close=document.createElement('button');close.type='button';close.textContent='Cerrar vista previa';close.style.cssText='margin-top:12px;width:100%;padding:10px';close.addEventListener('click',()=>dlg.close());dlg.append(close);
 dlg.addEventListener('close',()=>dlg.remove());document.body.append(dlg);dlg.showModal();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.GOXION_LEGAL_V2={version:'2.0',readyForEnforcement:false,open:(doc='terminos')=>{if(!items.some(x=>x[0]===doc))doc='terminos';location.href=base+doc;}};
})();