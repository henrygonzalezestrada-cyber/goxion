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
 parent.prepend(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.GOXION_LEGAL_V2={version:'2.0',readyForEnforcement:false,open:(doc='terminos')=>{if(!items.some(x=>x[0]===doc))doc='terminos';location.href=base+doc;}};
})();