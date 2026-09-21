(()=>{
  document.body.classList.add('gx-beta-20');
  const URL='https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/beneficios-admin-beta';
  const TOKEN_KEY='GOXION_ADMIN_TOKEN';
  const money=v=>Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function monthLabel(v){if(!v)return '—';const d=new Date(String(v).slice(0,7)+'-01T12:00:00');return Number.isNaN(d.getTime())?String(v).slice(0,7):d.toLocaleDateString('es-MX',{month:'short',year:'numeric'}).replace('.','');}
  function monthDiff(a,b){const A=new Date(String(a).slice(0,7)+'-01T12:00:00'),B=new Date(String(b).slice(0,7)+'-01T12:00:00');if(Number.isNaN(A.getTime())||Number.isNaN(B.getTime()))return 0;return (B.getFullYear()-A.getFullYear())*12+(B.getMonth()-A.getMonth());}
  async function call(accion,datos={}){const token=localStorage.getItem(TOKEN_KEY)||(typeof currentToken!=='undefined'?currentToken:'')||'';if(!token)throw new Error('Sesión administrativa no disponible.');const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':token},body:JSON.stringify({accion,datos}),cache:'no-store'});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{}if(!r.ok||j?.ok!==true)throw new Error(j?.error||`HTTP ${r.status}`);return j;}
  window.gxBenefitAction=call;
  window.gxBenefitCardHTML=function(b,c,key){
    const state=String(b.estado_visual||b.estado||'activo');
    const stateText={activo:'Activo',programado:'Programado',reservado:'Reservado',consumido:'Consumido',finalizado:'Finalizado',cancelado:'Cancelado'}[state]||state;
    const value=b.tipo==='porcentaje'?`${Number(b.valor||0).toFixed(0)}%`:`$${money(b.valor)}`;
    const current=String(c?.estado_cuenta?.periodo||c?.periodo_pendiente||'').slice(0,10);
    let detail='';
    if(b.modo==='una_vez_elegible'){
      const applied=(c?.estado_cuenta?.beneficios_programados||[]).find(x=>String(x.id)===String(b.id));
      detail=applied?`Aplicando $${money(applied.monto)} en ${monthLabel(current)}`:`Disponible desde ${monthLabel(b.periodo_inicio)} · espera el siguiente periodo con saldo`;
    }else{
      const idx=Math.max(1,Math.min(Number(b.periodos_total||1),monthDiff(b.periodo_inicio,current)+1));
      const end=new Date(String(b.periodo_inicio).slice(0,7)+'-01T12:00:00');end.setMonth(end.getMonth()+Number(b.periodos_total||1)-1);
      detail=`${state==='programado'?'Inicia':'Periodo '+idx+' de '+Number(b.periodos_total||1)} · hasta ${end.toLocaleDateString('es-MX',{month:'short',year:'numeric'}).replace('.','')}`;
    }
    const cancellable=b.activo!==false&&!['consumido','finalizado','cancelado'].includes(state);
    return `<div class="gx-benefit-row ${esc(state)}"><div class="gx-benefit-row-main"><span class="gx-benefit-origin">${b.origen==='misiones'?'🎯 Misiones':b.origen==='bienvenida'?'✦ Bienvenida':'◷ Programado'}</span><strong>${esc(b.concepto||'Beneficio')}</strong><small>${esc(detail)}</small></div><div class="gx-benefit-row-side"><strong>−${esc(value)}</strong><span>${esc(stateText)}</span>${cancellable?`<button type="button" onclick="gxCancelBenefit('${esc(b.id)}','${String(key).replace(/'/g,"\\'")}')" aria-label="Cancelar beneficio">×</button>`:''}</div></div>`;
  };
  window.gxOpenBenefitModal=function(key){const c=(typeof clientesDict!=='undefined'?clientesDict?.[key]:null);if(!c)return;document.getElementById('gx-benefit-key').value=key;document.getElementById('gx-benefit-client').textContent=`${c.nombre||'Cliente'} · ${c.folio||''}`;document.getElementById('gx-benefit-concept').value='';document.getElementById('gx-benefit-type').value='monto';document.getElementById('gx-benefit-value').value='';document.getElementById('gx-benefit-duration').value='1';document.getElementById('gx-benefit-period').value=String(c.periodo_pendiente||new Date().toISOString().slice(0,7)).slice(0,7);gxUpdateBenefitPreview();const m=document.getElementById('gx-benefit-modal');m.classList.add('show');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>document.getElementById('gx-benefit-concept')?.focus(),120);};
  window.gxCloseBenefitModal=function(){const m=document.getElementById('gx-benefit-modal');m.classList.remove('show');m.setAttribute('aria-hidden','true');document.body.style.overflow='';};
  window.gxUpdateBenefitPreview=function(){const type=document.getElementById('gx-benefit-type')?.value||'monto',value=Number(document.getElementById('gx-benefit-value')?.value||0),n=Math.max(1,Number(document.getElementById('gx-benefit-duration')?.value||1)),period=document.getElementById('gx-benefit-period')?.value||'';document.getElementById('gx-benefit-symbol').textContent=type==='porcentaje'?'%':'$';const shown=type==='porcentaje'?`${value||0}%`:`$${money(value)}`;document.getElementById('gx-benefit-preview').textContent=`${shown} por ${n} periodo${n===1?'':'s'} · inicia ${monthLabel(period+'-01')}. Al terminar, el cobro vuelve automáticamente a su condición normal.`;};
  window.gxSaveBenefit=async function(){const key=document.getElementById('gx-benefit-key').value,c=(typeof clientesDict!=='undefined'?clientesDict?.[key]:null);if(!c?._id)return;const btn=document.getElementById('gx-benefit-save');btn.disabled=true;btn.textContent='Guardando…';try{await call('crear_manual',{cliente_id:c._id,concepto:document.getElementById('gx-benefit-concept').value.trim()||'Descuento programado',tipo:document.getElementById('gx-benefit-type').value,valor:Number(document.getElementById('gx-benefit-value').value),periodo_inicio:document.getElementById('gx-benefit-period').value+'-01',periodos_total:Number(document.getElementById('gx-benefit-duration').value)});gxCloseBenefitModal();await window.gxReloadAdminClient?.(key);}catch(e){alert('❌ No se pudo programar el descuento.\n\n'+(e?.message||e));}finally{btn.disabled=false;btn.textContent='Programar descuento';}};
  window.gxCancelBenefit=async function(id,key){if(!confirm('¿Cancelar este beneficio? Dejará de aplicarse desde el próximo cálculo.'))return;try{await call('cancelar',{id});await window.gxReloadAdminClient?.(key);}catch(e){alert('❌ No se pudo cancelar.\n\n'+(e?.message||e));}};
})();