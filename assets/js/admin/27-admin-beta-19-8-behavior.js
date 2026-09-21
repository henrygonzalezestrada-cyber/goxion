(()=>{
  document.body.classList.add('gx-beta-19-6','gx-beta-19-8');

  // Mantiene cada pestaña del cliente anclada a su inicio. En 19.5 el scroll
  // interno se conservaba al cambiar de sección y podía dejar Cuenta/Cobro cortados.
  const previousFocusSection = window.gxFocusSection;
  if(typeof previousFocusSection === 'function'){
    window.gxFocusSection = function(section, btn){
      const focus = document.getElementById('gx-client-focus');
      const body = document.getElementById('gx-focus-body');
      const normalized = section === 'summary' ? 'billing' : section;
      const previous = focus?.dataset?.gxFocusSection || '';
      const result = previousFocusSection.call(this, section, btn);
      if(body && previous !== normalized){
        body.scrollTop = 0;
        try{ body.scrollTo({top:0,left:0,behavior:'instant'}); }catch{}
      }
      return result;
    };
  }

})();