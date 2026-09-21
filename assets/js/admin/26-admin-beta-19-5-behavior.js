(()=>{
  document.body.classList.add('gx-beta-19-5');

  // Beta 19.5: Resumen y Cobro se unifican. Cualquier llamada heredada a "summary"
  // aterriza en Cobro para conservar compatibilidad con funciones previas.
  window.gxFocusSection=function(section,btn){
    const normalized=section==='summary'?'billing':section;
    const f=document.getElementById('gx-client-focus');
    const body=document.getElementById('gx-focus-body');
    const overview=document.getElementById('gx-focus-overview');
    if(!f||!body)return;
    document.querySelectorAll('[data-gx-focus-section]').forEach(x=>x.classList.toggle('active',x.dataset.gxFocusSection===normalized));
    if(overview){overview.hidden=true;overview.setAttribute('aria-hidden','true');}
    body.querySelectorAll('[data-gx-section]').forEach(x=>x.classList.toggle('gx-focus-section-active',x.dataset.gxSection===normalized));
    f.dataset.gxFocusSection=normalized;
  };

  // La función de apertura de 19.4 todavía intenta iniciar en Resumen; la normalización
  // anterior la redirige a Cobro. Este refuerzo evita un frame visual en la pestaña antigua.
  const open195=window.gxOpenClientFocus;
  if(typeof open195==='function'){
    window.gxOpenClientFocus=function(key,...args){
      const r=open195.call(this,key,...args);
      setTimeout(()=>window.gxFocusSection('billing',document.querySelector('[data-gx-focus-section="billing"]')),105);
      return r;
    };
  }

})();