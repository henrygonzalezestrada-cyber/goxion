/* GOXION Mi Espacio V2 · DATA ONLY, sin controladores ni CSS legado.
   Fuentes: Edge Functions oficiales con token de cliente + catálogo público RLS.
   Nunca modifica servicios.precio, cliente_servicios.monto, pagos ni beneficios. */
(function(){
  'use strict';
  const core=window.GOXION_CORE;
  if(!core)throw new Error('GOXION_CORE requerido.');
  const TOKEN_KEY=core.STORAGE.CLIENT_TOKEN;
  const PRICES_URL='https://hmpevcwodcgbkviarfic.supabase.co/rest/v1/goxion_precios_referencia';
  const PUBLISHABLE_KEY='sb_publishable_5oY3Fodu8NgppBXNR0QBMQ_RIU7ZfGd';
  const takeToken=()=>localStorage.getItem(TOKEN_KEY)||'';
  const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v)||0);
  const clean=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const nameKey=name=>{
    const n=clean(name);
    if(/disney/.test(n))return 'disney-plus-premium';
    if(/google\s*(one|fotos|photos)|\bgoogle\s*2\s*tb\b/.test(n))return 'google-one-2tb';
    if(/netflix/.test(n))return 'netflix-premium';
    if(/hbo|max|warner/.test(n))return 'hbo-max-platino';
    if(/\bvix\b/.test(n))return 'vix-premium';
    if(/prime|amazon/.test(n))return 'prime-video';
    if(/youtube/.test(n))return 'youtube-premium';
     if(/crunchy\s*roll|crunchyroll/.test(n))return 'crunchyroll-mega-fan';
    if(/microsoft|office|365/.test(n))return 'microsoft-365';
    return '';
  };
  async function post(endpoint,body,token){
    const res=await fetch(core.endpoint(endpoint),{
      method:'POST',cache:'no-store',
      headers:Object.assign({'Content-Type':'application/json'},token?{'X-Client-Token':token}:{}),
      body:JSON.stringify(body||{})
    });
    const raw=await res.text();let json={};
    try{json=JSON.parse(raw||'{}')}catch(_){}
    if(!res.ok||json.ok!==true){
      const error=new Error(json.error||('Error de conexión: '+res.status));
      error.status=res.status;throw error;
    }
    return json;
  }
  async function getPriceReferences(){
    const res=await fetch(PRICES_URL+'?select=clave,plataforma,plan,precio_mensual_mxn,revisado_el,fuente_url,notas&activo=eq.true',{
      cache:'no-store',headers:{apikey:PUBLISHABLE_KEY}
    });
    if(!res.ok)throw new Error('Catálogo de precios de referencia no disponible.');
    const json=await res.json();
    if(!Array.isArray(json))throw new Error('Formato de precios inválido.');
    const fresh=json.filter(r=>{
      const day=Date.parse(String(r.revisado_el||'')+'T00:00:00Z');
      return Number.isFinite(day)&&day<=Date.now()&&Date.now()-day<=45*86400000;
    });
    return fresh;
  }
  async function restore(token){
    if(!token)return null;
    const main=await post('mi-espacio',{},token);
    if(!main.cliente?.id)throw new Error('La sesión no está asociada a una cuenta válida.');
    const reqs=[
      ['cancelaciones','cancelaciones-cliente',{accion:'listar',datos:{}}],
      ['credenciales_entregas','credenciales-cliente',{accion:'listar',datos:{}}],
      ['novedades_servicio','novedades-cliente',{accion:'listar',datos:{}}],
      ['estado_cuenta','estado-cuenta-beta',{accion:'mi_estado',datos:{}}],
      ['cliente_accesos','accesos-cliente-beta',{accion:'listar',datos:{}}]
    ];
    const extra=await Promise.allSettled(reqs.map(r=>post(r[1],r[2],token)));
    const value=(index,key)=>extra[index].status==='fulfilled'&&Array.isArray(extra[index].value?.[key])?extra[index].value[key]:[];
    const cancellations=value(0,'solicitudes');
    const deliveries=value(1,'entregas');
    const news=value(2,'novedades');
    const accesses=value(4,'accesos');
    // El estado de cuenta NO se recalcula desde la suma de servicios.
    const account=extra[3].status==='fulfilled'?extra[3].value.estado_cuenta||null:null;
    const services=(Array.isArray(main.servicios)?main.servicios:[]).filter(s=>s.activo!==false).map(s=>{
      const id=String(s.id||'');
      const cancellation=cancellations.filter(x=>String(x.cliente_servicio_id||'')===id).sort((a,b)=>Date.parse(b.created_at||b.solicitada_at||0)-Date.parse(a.created_at||a.solicitada_at||0));
      const matchingAccess=accesses.filter(x=>String(x.cliente_servicio_id||'')===id);
      return Object.assign({},s,{
        cancelacion:cancellation.find(x=>['solicitada','aprobada'].includes(clean(x.estado)))||cancellation[0]||null,
        novedades:news.filter(x=>String(x.cliente_servicio_id||'')===id),
        credencial_pendiente:deliveries.find(x=>String(x.cliente_servicio_id||'')===id&&clean(x.estado)==='pendiente'&&x.activa!==false)||null,
        accesos:matchingAccess
      });
    }).filter(s=>!['efectiva','efectuada','completada'].includes(clean(s.cancelacion?.estado)));
    return {
      cliente:main.cliente,servicios:services,pagos:Array.isArray(main.pagos)?main.pagos:[],
      gamificacion:main.gamificacion||null,misiones_progreso:Array.isArray(main.misiones_progreso)?main.misiones_progreso:[],
      referidos:Array.isArray(main.referidos)?main.referidos:[],
      cancelaciones:cancellations,estado_cuenta:account,catalogo:Array.isArray(main.catalogo)?main.catalogo:[],
      novedades:news,loaded_at:new Date().toISOString()
    };
  }
  async function load(){
    const token=takeToken();if(!token)return null;
    try{return await restore(token)}
    catch(e){if(e.status===401){localStorage.removeItem(TOKEN_KEY);return null}throw e}
  }
  async function login(name,pin){
    const res=await post('login-goxion',{nombre:String(name||'').trim(),pin:String(pin||'').trim()},'');
    if(!res.session_token)throw new Error('El acceso no devolvió una sesión válida.');
    const old=takeToken();localStorage.setItem(TOKEN_KEY,res.session_token);
    try{return await restore(res.session_token)}
    catch(e){if(old)localStorage.setItem(TOKEN_KEY,old);else localStorage.removeItem(TOKEN_KEY);throw e}
  }
  function logout(){localStorage.removeItem(TOKEN_KEY)}
  function savings(view,references){
    const map=new Map((references||[]).map(r=>[r.clave,r]));
    const entries=(view?.servicios||[]).map(service=>{
      const reference=map.get(nameKey(service.nombre));
      if(!reference||!Number.isFinite(Number(service.monto)))return null;
      return {service,reference,retail:Number(reference.precio_mensual_mxn),goxion:Number(service.monto)};
    }).filter(Boolean);
    if(entries.length===0)return null;
    const retail=entries.reduce((total,e)=>total+e.retail,0);
    const goxion=entries.reduce((total,e)=>total+e.goxion,0);
    return {retail,goxion,difference:Number((retail-goxion).toFixed(2)),covered:entries.length,total:(view?.servicios||[]).length,entries};
  }
  function motionReduced(){return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)}
  window.GOXION_V2_DATA=Object.freeze({load,login,logout,post,restore,getPriceReferences,nameKey,money,motionReduced,savings,takeToken});
})();
