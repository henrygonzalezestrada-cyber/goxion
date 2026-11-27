/* GOXION · Goxy F17 · asistente oficial compartido con preview/goxion-ai.
   Archivo único para beta y producción; nunca duplicar motores o listeners.
   Render MIT robot-heads empaquetado localmente; finanzas y acceso bajo backend. */
(() => {
  'use strict';
  const doc = document;
  const refined = doc.documentElement.hasAttribute('data-gx-support-v3');
  const section = doc.getElementById('view-soporte');
  const card = doc.getElementById('smart-support-card');
  if (!section || !card || card.classList.contains('gxai-card')) return;

  // Conserva el DOM antiguo para que sus funciones y listeners sigan encontrando los IDs.
  const original = doc.createElement('div');
  original.className = 'gxai-original';
  original.hidden = true;
  original.setAttribute('aria-hidden', 'true');
  while (card.firstChild) original.appendChild(card.firstChild);
  card.classList.add('gxai-card');

  // Render fiel del proyecto original robot-heads, en lugar del SVG plano.
  // El bundle aislado renderiza un Canvas real dentro de cada ranura.
  function robotSVG() {
    return '<span class="gxai-mascot gxai-canvas-slot" data-mood="idle" role="img" aria-label="Goxy, robot animado con pantalla LED"></span>';
  }

  if (typeof window.GOXY_CLIENT_CONTEXT?.refresh !== 'function') {
    console.error('[GOXION Goxy] Contexto mínimo de plataformas no cargado.');
    return;
  }
  if (typeof window.GOXY_AI?.ask !== 'function') {
    console.error('[GOXION Goxy] No se cargó el puente seguro de IA.');
    return;
  }
  if (typeof window.GOXY_SUPPORT?.guide !== 'function') {
    console.error('[GOXION Goxy] No está disponible el catálogo canónico de soporte.');
    return;
  }
  if (typeof window.GOXY_ROBOT?.mountAll !== 'function') {
    console.error('[GOXION Goxy] El motor original de robot-heads no está disponible.');
    return;
  }
  const svg = robotSVG();
  const hero = doc.createElement('div');
  hero.className = 'gxai-hero';
  hero.innerHTML = [
    refined ? '<div class="gxai-kicker">Goxy, tu asistente</div>' : '<div class="gxai-kicker">CONOCE A GOXY · TU ASISTENTE</div>',
    '<button class="gxai-mascot-button" type="button" aria-label="Juega con Goxy: tócalo o desliza tu dedo para acariciarlo">',
    svg,
    '<span class="gxai-reactions" aria-hidden="true"></span>',
    '</button>',
    '<div class="gxai-touch-hint">Tócalo o acarícialo de lado a lado</div>',
    '<span class="gxai-pet-status" role="status" aria-live="polite"></span>',
    '<h2 class="gxai-title">¿Necesitas <span>ayuda?</span></h2>',
    refined ? '<p class="gxai-desc">Resuelve tus dudas y encuentra ayuda para tus plataformas.</p>' : '<p class="gxai-desc">¿Tienes algún problema con tus plataformas o algo que te gustaría saber? Estoy aquí para ayudarte.</p>',
    '<button class="gxai-open" type="button" aria-label="Abrir conversación con Goxy">',
    '<span class="gxai-open-inner"><span class="gxai-open-signal" aria-hidden="true"><i></i><i></i><i></i></span>',
    '<span class="gxai-open-copy">Hablar con Goxy</span><span class="gxai-open-balance" aria-hidden="true"></span></span></button>'
  ].join('');
  card.append(hero, original);

  const layer = doc.createElement('div');
  layer.className = 'gxai-chat-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = [
    '<button class="gxai-backdrop" type="button" tabindex="-1" aria-label="Cerrar conversación"></button>',
    '<section class="gxai-chat" role="dialog" aria-modal="true" aria-labelledby="gxai-chat-title">',
    '<header class="gxai-chat-head">',
    '<span class="gxai-avatar" aria-hidden="true">', svg, '</span>',
    refined ? '<strong class="gxai-chat-name" id="gxai-chat-title">Goxy</strong><span class="gxai-heading">' : '<span class="gxai-heading"><strong id="gxai-chat-title">Goxy · Asistente GOXION</strong>',
    '<small class="gxai-chat-phase" role="status" aria-live="polite">Listo para escucharte</small></span>',
    refined ? '<button class="gxai-close" type="button" aria-label="Cerrar chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>' : '<button class="gxai-close" type="button" aria-label="Cerrar chat">×</button>',
    '</header>',
    '<div class="gxai-chat-scroll" role="log" aria-live="polite">',
    refined ? '' : '<div class="gxai-beta-note">GOXY · IA CON SOPORTE REAL</div>',
    refined ? '<div class="gxai-bubble">¡Hola! Soy Goxy, tu asistente virtual. ¿En qué puedo ayudarte hoy?</div>' : '<div class="gxai-bubble">¡Hola! Soy Goxy. 🤖 Cuéntame qué necesitas: revisar misiones, promociones o solucionar un problema con tus plataformas. Si hace falta, buscaré una explicación adicional automáticamente. Nunca compartas contraseñas, códigos ni PIN aquí.</div>',
    '<div class="gxai-ai-panel" role="status" aria-live="polite">',
    '<span class="gxai-ai-light" aria-hidden="true"></span>',
    '<div class="gxai-ai-panel-copy"><strong class="gxai-ai-title">Comprobando IA…</strong><small class="gxai-ai-description">Verificando la conexión segura con Goxy.</small></div>',
    '<button class="gxai-ai-start" type="button" disabled tabindex="-1" aria-hidden="true">Asistencia automática</button>',
    '</div>',
    '<div class="gxai-suggestions">',
    '<button type="button" class="gxai-suggestion" data-prompt="acceso">Tengo un problema de acceso</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="cuenta">Quiero consultar mi cuenta</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="codigo">Necesito un código</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="misiones">Mis misiones</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="promociones">Promociones activas</button>',
    '</div>',
    '</div>',
    '<footer class="gxai-chat-foot">',
    refined ? '<div class="gxai-attachment" hidden></div><div class="gxai-tools-menu" hidden><button class="gxai-tool-gallery" type="button">Compartir imagen</button><button class="gxai-tool-camera" type="button">Tomar fotografía</button><button class="gxai-tool-example" type="button" hidden>Probar captura de ejemplo</button></div><input class="gxai-image-picker" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden><input class="gxai-camera-picker" type="file" accept="image/*" capture="environment" hidden><div class="gxai-composer-row"><button class="gxai-more" type="button" aria-label="Más herramientas" aria-expanded="false" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>' : '',
    '<form class="gxai-composer" aria-label="Conversación con Goxy">',
    '<input class="gxai-message-input" type="text" placeholder="'+(refined?'Escríbele a Goxy…':'Cuéntame qué problema tienes…')+'" aria-label="Tu mensaje a Goxy" autocomplete="off" maxlength="240">',
    refined ? '<button class="gxai-send" type="submit" aria-label="Enviar mensaje" disabled hidden>' : '<button class="gxai-send" type="submit" aria-label="Enviar mensaje">',
    refined ? '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>' : '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-8-4 16-3-6-7-2Zm7 2 7-10"/></svg>',
    '</button>',
    '</form>',
    refined ? '</div>' : '',
    refined ? '<div class="gxai-chat-disclaimer">No compartas contraseñas, códigos ni PIN.</div>' : '<div class="gxai-chat-disclaimer">Asistencia GOXION · Nunca compartas contraseñas, códigos ni PIN.</div>',
    '</footer>',
    '</section>'
  ].join('');
  section.appendChild(layer);
  window.GOXY_ROBOT.mountAll();

  const mascots = Array.from(section.querySelectorAll('.gxai-mascot'));
  const scroll = layer.querySelector('.gxai-chat-scroll');
  const dialog = layer.querySelector('.gxai-chat');
  const heroTrigger = hero.querySelector('.gxai-mascot-button');
  const openButton = hero.querySelector('.gxai-open');
  const closeButton = layer.querySelector('.gxai-close');
  const chatPhase = layer.querySelector('.gxai-chat-phase');
  const composer = layer.querySelector('.gxai-composer');
  const messageInput = layer.querySelector('.gxai-message-input');
  const sendButton = layer.querySelector('.gxai-send');
  const suggestions = Array.from(layer.querySelectorAll('.gxai-suggestion'));
  const reactionLayer = hero.querySelector('.gxai-reactions');
  const petStatus = hero.querySelector('.gxai-pet-status');
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  let active = false;
  let closeTimer = null;
  const vision=refined?window.GOXY_VISION:null;
  const incidents=refined?window.GOXY_INCIDENTS:null;
  let pilotSupport=false,pilotDenied=false,incidentLast=null;
  const diagnosis=refined?window.GOXY_DIAGNOSIS?.create():null;
  const dialogue=refined?window.GOXY_DIALOG_ROUTING?.createConversation?.():null;
  const learning=refined?window.GOXY_FEEDBACK:null;
  let feedbackReady=false,semanticReady=false,verifiedReady=false;
  const more=layer.querySelector('.gxai-more'),toolsMenu=layer.querySelector('.gxai-tools-menu'),attachment=layer.querySelector('.gxai-attachment');
  const gallery=layer.querySelector('.gxai-image-picker'),camera=layer.querySelector('.gxai-camera-picker');
  const exampleButton=layer.querySelector('.gxai-tool-example');
  let imageDraft=null,visionReady=false,visionTestOnly=false,exampleImage=null,preparingImage=false,imageGeneration=0;
  const imageNotice=()=>visionReady?(visionTestOnly?(vision?.isMirrorPilot?.()?'Piloto · Sólo capturas de prueba sin datos privados. Se enviará a Groq.':'Prueba QA · Sólo capturas sin datos privados. Se enviará a Groq.'):'Oculta datos personales, contraseñas y códigos antes de enviar. La imagen se enviará a Groq para su análisis.'):'Vista previa local · El análisis todavía no está habilitado.';
  const syncSend = () => {
    if(!refined)return;
    const ready=imageDraft?(imageDraft.example?Boolean(exampleImage):visionReady)&&!preparingImage:!preparingImage&&Boolean(messageInput.value.trim());
    // Mantener el nodo en el layout con ancho cero: CSS abre y cierra
    // el espacio junto a la aparición de la flecha, sin saltos de flex.
    sendButton.hidden=false;
    sendButton.classList.toggle('gxai-send-ready',ready);
    sendButton.setAttribute('aria-hidden',String(!ready));
    sendButton.disabled=busy||!ready;
    if(more)more.disabled=busy||preparingImage||!vision;
  };
  let interactionTimer = null, requestId = 0;
  let activeFlow = 0;
  const flowTimers = new Set();
  let busy = false;
  syncSend();
  function toggleTools(open=false){
    if(!toolsMenu||!more)return;
    toolsMenu.hidden=!open;more.setAttribute('aria-expanded',String(open));
  }
  function clearImage(){
    imageGeneration++;imageDraft=null;preparingImage=false;
    messageInput.disabled=busy;
    if(attachment){attachment.replaceChildren();attachment.hidden=true;}
    if(gallery)gallery.value='';if(camera)camera.value='';
    toggleTools(false);syncSend();
  }
  function renderAttachment(message){
    if(!attachment)return;
    attachment.replaceChildren();attachment.hidden=false;
    if(imageDraft){
      const img=doc.createElement('img');img.src=imageDraft.data;img.alt='Vista previa de la imagen';
      attachment.append(img);
    }
    const info=doc.createElement('span');info.textContent=message;attachment.append(info);
    const remove=doc.createElement('button');remove.type='button';remove.className='gxai-remove-image';remove.textContent='×';remove.setAttribute('aria-label','Quitar imagen');remove.addEventListener('click',clearImage);
    attachment.append(remove);
  }
  async function chooseImage(file){
    if(!active||busy||!authenticated()||!file||!vision)return;
    clearImage();preparingImage=true;const generation=imageGeneration;
    renderAttachment('Preparando imagen…');syncSend();
    try{
      const result=await vision.prepare(file);
      if(!active||generation!==imageGeneration||!authenticated())return;
      imageDraft=result;
      renderAttachment(imageNotice());
    }catch(e){if(active&&generation===imageGeneration)renderAttachment('No pude preparar la imagen. Prueba con una captura JPG o PNG.');}
    finally{if(generation===imageGeneration){preparingImage=false;syncSend();}}
  }
  if(vision&&more){
    more.addEventListener('click',()=>{if(active&&!busy)toggleTools(toolsMenu.hidden)});
    layer.querySelector('.gxai-tool-gallery').addEventListener('click',()=>{toggleTools(false);gallery.click()});
    layer.querySelector('.gxai-tool-camera').addEventListener('click',()=>{toggleTools(false);camera.click()});
    exampleButton.addEventListener('click',()=>{if(!active||busy||!exampleImage||!authenticated())return;clearImage();imageDraft={data:exampleImage,example:true};messageInput.value='';messageInput.disabled=true;renderAttachment('Captura ficticia · se enviará únicamente este ejemplo a Groq.');syncSend();});
    for(const picker of [gallery,camera])picker.addEventListener('change',()=>{const file=picker.files?.[0];if(file)void chooseImage(file);});
    syncSend();
  }
  let typing = null;
  let chatState = 'idle';
  let prevOverflowHtml = '', prevOverflowBody = '', previousFocus = null;
  let pageFreeze = null;
  let aiController = null;
  let chosenGuide = null;
  let aiConfigured = false;
  const ai = window.GOXY_AI;
  const disclaimer = layer.querySelector('.gxai-chat-disclaimer');
  const aiPanel = layer.querySelector('.gxai-ai-panel');
  const aiTitle = layer.querySelector('.gxai-ai-title');
  const aiDescription = layer.querySelector('.gxai-ai-description');
  const aiStart = layer.querySelector('.gxai-ai-start');
  // Los servicios solo alimentan las opciones contextuales del CHAT.
  // No existe una tarjeta separada ni se duplican botones al abrir el modal.
  const clientContext = window.GOXY_CLIENT_CONTEXT;
  const accessRouter = window.GOXY_ACCESS;
  const handoff = window.GOXY_HANDOFF;
  const payment = window.GOXY_PAYMENT;
  let myPlatforms = [];
  let myContextReady = false;
  function applyMyPlatforms(snapshot) {
    myContextReady = snapshot?.ok === true;
    myPlatforms = myContextReady && Array.isArray(snapshot.platforms)
      ? snapshot.platforms.filter(platform => window.GOXY_SUPPORT.platforms().includes(platform)) : [];
  }
  function refreshMyPlatforms() {
    const current = requestId;
    myPlatforms = [];
    myContextReady = false;
    // Mi Espacio ya tiene la lista en memoria en una sesión normal.
    // Hidratar de forma síncrona evita enseñar un catálogo ajeno por un instante.
    try {
      const local = clientContext.local?.();
      if (local?.ok) {
        applyMyPlatforms(local);
        return;
      }
    } catch (_) {}
    // Solo si falta el estado, usar la lectura autenticada preexistente.
    clientContext.refresh().then(snapshot => {
      if (!active || current !== requestId || !authenticated()) return;
      applyMyPlatforms(snapshot);
    }).catch(() => {
      if (active && current === requestId) applyMyPlatforms({ok:false});
    });
  }
  let aiMode = false;
  let aiEntry = false;
  let awaitingSymptom = false;
  let lastGuide = null;
  let accessStage = null;
  let caseContext = null;
  let pendingHandoff = null;
  let lastAccountTopic = null;
  let pendingAI = null;
  let lastAIAnswerAt = 0, lastAIAccount = '';
  // Solo memoria local de esta sesión de chat: nunca localStorage, ni BD.
  const conversation = [];
  function resetConversation() { conversation.length = 0; }
  function keepTurn(userText,assistantText){
    if(typeof userText!=='string'||typeof assistantText!=='string')return;
    // Guardar únicamente los turnos de IA ya filtrados, no respuestas privadas.
    const sensitive=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[\s.-]?){9,16}\b|\b\d{4,8}\b/iu;
    if(sensitive.test(userText)||sensitive.test(assistantText))return;
    conversation.push({role:'user',content:userText.slice(0,280)},
      {role:'assistant',content:assistantText.slice(0,280)});
    if(conversation.length>6)conversation.splice(0,conversation.length-6);
  }
  function setAIStatus(status, message) {
    aiPanel.setAttribute('data-ai-status', status);
    aiStart.disabled = status !== 'ready';
    if(refined){
      // Estado normal sin tarjeta técnica; errores útiles siguen disponibles.
      aiPanel.hidden=status==='ready'||status==='checking';
      aiTitle.textContent='Asistencia adicional no disponible';
      aiDescription.textContent='Puedes seguir usando las guías y contactar a nuestro equipo.';
      disclaimer.textContent='No compartas contraseñas, códigos ni PIN.';
      return;
    }
    aiTitle.textContent = status === 'ready' ? 'Asistencia inteligente lista' :
      status === 'pending' ? 'Guías de soporte disponibles' :
      status === 'checking' ? 'Preparando tu asistencia…' : 'Asistencia adicional no disponible';
    aiDescription.textContent = message;
    aiStart.textContent = 'Automático';
    disclaimer.textContent = status === 'ready'
      ? 'Asistencia adicional automática · Hasta 8 consultas IA/24 h.'
      : 'Las guías oficiales y el asesor humano siguen disponibles.';
  }

  function authenticated() {
    const tokenKey = window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
    const token = tokenKey ? localStorage.getItem(tokenKey) : '';
    const key = typeof window.getCurrentClientKey === 'function'
      ? window.getCurrentClientKey()
      : String(window.goxionCurrentClientKey || '');
    return Boolean(token && key && !section.querySelector('#support-lock-overlay.show'));
  }

  function mood(state, timeout = 0) {
    clearTimeout(interactionTimer);
    mascots.forEach(el => el.setAttribute('data-mood', state));
    if (timeout) interactionTimer = setTimeout(() => mood(active ? 'listening' : 'idle'), timeout);
  }

  // F5: único propietario de los estados del chat, compatible con la futura IA.
  // Las fases se activan por eventos de conversación; no requieren llamadas a APIs.
  const phases = Object.freeze({
    idle:      { label: 'Listo para escucharte',     face: 'idle' },
    listening: { label: 'Te escucho',               face: 'listening' },
    thinking:  { label: 'Analizando tu mensaje…',    face: 'thinking' },
    searching: { label: 'Buscando una solución…',    face: 'searching' },
    working:   { label: 'Preparando la respuesta…',  face: 'working' },
    speaking:  { label: 'Respondiendo…',             face: 'speaking' },
    happy:     { label: '¡Listo!',                   face: 'happy' },
    error:     { label: 'No pude responder',          face: 'error' }
  });
  function chatTransition(name) {
    if (!active || !Object.prototype.hasOwnProperty.call(phases, name)) return;
    chatState = name;
    const phase = phases[name];
    layer.setAttribute('data-chat-state', name);
    chatPhase.textContent = phase.label;
    mood(phase.face);
  }
  function showTyping() {
    if (typing) return;
    typing = doc.createElement('div');
    typing.className = 'gxai-typing';
    typing.setAttribute('aria-label', 'Goxy está preparando la respuesta');
    typing.innerHTML = '<i></i><i></i><i></i>';
    scroll.appendChild(typing);
    scroll.scrollTop = scroll.scrollHeight;
  }
  function hideTyping() {
    if (!typing) return;
    typing.remove();
    typing = null;
  }
  function setBusy(value) {
    busy = value;
    aiStart.disabled = value || !aiConfigured;
    messageInput.disabled = value || imageDraft?.example===true;
    sendButton.disabled = value;
    syncSend();
    suggestions.forEach(button => { button.disabled = value; });
  }
  function cancelFlow() {
    activeFlow++;
    pendingAI = null;
    aiController?.abort();
    aiController = null;
    flowTimers.forEach(timer => clearTimeout(timer));
    flowTimers.clear();
    hideTyping();
    setBusy(false);
  }
  function later(flowId, ms, action) {
    const timer = setTimeout(() => {
      flowTimers.delete(timer);
      if (flowId !== activeFlow || !active) return;
      if (!authenticated()) { closeChat(); return; }
      action();
    }, ms);
    flowTimers.add(timer);
  }

  // F10 · iOS. En la beta, Goxy vive en un iframe del mismo origen.
  // Al abrir el teclado Safari reduce el viewport del PADRE pero el iframe
  // puede conservar 100dvh: medir ambos para colocar el compositor encima.
  function syncChatViewport() {
    if (!active) return;
    try {
      const parent = window.parent && window.parent !== window ? window.parent : window;
      const viewport = parent.visualViewport || window.visualViewport;
      const layoutH = parent.innerHeight || window.innerHeight || 0;
      if (!viewport || !layoutH) return;
      // El viewport del iframe puede encogerse POR SEGUNDA vez en Safari.
      // El padre ya representa el teclado real: no aplicar una doble reducción.
      const viewH = Math.max(220, Math.min(layoutH, Math.round(viewport.height)));
      const top = Math.max(0, Math.round(viewport.offsetTop || 0));
      layer.style.setProperty('--gxai-viewport-height', viewH + 'px');
      layer.style.setProperty('--gxai-viewport-top', top + 'px');
      const keyboard = doc.activeElement === messageInput && layoutH - viewH > 100;
      if (keyboard) layer.classList.add('gxai-keyboard-open');
      else layer.classList.remove('gxai-keyboard-open');
      if (keyboard) scroll.scrollTop = scroll.scrollHeight;
    } catch (_) {
      // En un origen distinto se conserva el fallback CSS con 100dvh.
    }
  }
  try {
    const host = window.parent && window.parent !== window ? window.parent : window;
    host.visualViewport?.addEventListener('resize',syncChatViewport);
    host.visualViewport?.addEventListener('scroll',syncChatViewport);
    host.addEventListener?.('resize',syncChatViewport);
    if (host !== window) window.visualViewport?.addEventListener('resize',syncChatViewport);
  } catch (_) {}
  messageInput.addEventListener('focus', () => {
    syncChatViewport();
    // iOS anima el teclado después del focus; comprobar al final del cambio.
    setTimeout(syncChatViewport, 120);
    setTimeout(syncChatViewport, 360);
  });
  messageInput.addEventListener('blur', () => {
    setTimeout(syncChatViewport, 80);
    setTimeout(syncChatViewport, 260);
  });
  // Visual-only morph: measure the real hero and destination. No cloned chat,
  // no additional robot engine, no delay to authenticated operations.
  function prepareImmersiveMorph(origin, source) {
    if (!refined) return;
    layer.classList.add('gxai-measuring');
    const target=dialog.getBoundingClientRect();
    const avatar=layer.querySelector('.gxai-avatar').getBoundingClientRect();
    const valid=target.width>0&&target.height>0&&avatar.width>0&&source.width>0&&
      origin.bottom>target.top&&origin.top<target.bottom;
    layer.classList.toggle('gxai-no-morph',!valid||reducedMotion());
    if(!valid){layer.classList.remove('gxai-measuring');return;}
    const clamp=(n,max)=>Math.max(0,Math.min(max,n));
    const top=clamp(origin.top-target.top,target.height);
    const right=clamp(target.right-origin.right,target.width);
    const bottom=clamp(target.bottom-origin.bottom,target.height);
    const left=clamp(origin.left-target.left,target.width);
    layer.style.setProperty('--gxai-morph-clip',`inset(${top}px ${right}px ${bottom}px ${left}px round 24px)`);
    layer.style.setProperty('--gxai-morph-x',((source.left+source.width/2)-(avatar.left+avatar.width/2))+'px');
    layer.style.setProperty('--gxai-morph-y',((source.top+source.height/2)-(avatar.top+avatar.height/2))+'px');
    layer.style.setProperty('--gxai-morph-scale',String(Math.min(3.3,Math.max(1,source.width/avatar.width))));
    // Commit the starting geometry without transitioning from stale coordinates.
    layer.classList.add('gxai-morph-setup');
    layer.classList.remove('gxai-measuring');
    void dialog.offsetWidth;
    layer.classList.remove('gxai-morph-setup');
  }
  function openChat() {
    if(closeTimer!==null) return;
    if (active || !authenticated()) {
      if (!authenticated()) window.openAuthSheet?.();
      return;
    }
    previousFocus = doc.activeElement;
    const origin=refined?card.getBoundingClientRect():null;
    const source=refined?heroTrigger.querySelector('.gxai-mascot').getBoundingClientRect():null;
    active = true; requestId++;
    cancelFlow();diagnosis?.reset();dialogue?.reset();
    pilotSupport=false;pilotDenied=false;incidentLast=null;
    if(vision){clearImage();visionReady=false;visionTestOnly=false;exampleImage=null;exampleButton.hidden=true;const visionId=requestId;if(vision.isQA()||vision.isMirrorPilot?.())vision.status().then(state=>{if(active&&visionId===requestId&&authenticated()){pilotSupport=pilotSupport||state.pilotReady===true;pilotDenied=pilotDenied||Boolean(vision.isMirrorPilot?.()&&state.code==='PILOT_REQUIRED');visionReady=state.ok===true&&state.ready===true&&(!vision.isMirrorPilot?.()||state.testOnly===true);visionTestOnly=state.testOnly===true;exampleImage=state.ok===true&&state.exampleReady===true&&typeof state.exampleImage==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(state.exampleImage)?state.exampleImage:null;exampleButton.hidden=!exampleImage;if(imageDraft&&!imageDraft.example)renderAttachment(imageNotice());syncSend();}});}
    aiConfigured = false;
    feedbackReady=false;semanticReady=false;verifiedReady=false;
    aiMode = false;
    aiEntry = false;
    awaitingSymptom = false;
    lastGuide = null;
    accessStage = null;
    caseContext = null;
    pendingHandoff = null;
    lastAccountTopic = null;
    resetConversation();
    setAIStatus('checking', 'Verificando el servicio de IA con tu sesión de Mi Espacio.');
    const statusId = requestId;
    refreshMyPlatforms();
    ai.status().then(state => {
      if (!active || statusId !== requestId) return;
      aiConfigured = state.ok===true && state.configured===true && state.providerReady===true;
      feedbackReady=Boolean(learning&&(window.GOXION_QA_ISOLATED||location.pathname.endsWith('/ayuda-espejo-feed-v2.html'))&&state.ok===true&&state.feedbackReady===true);
      semanticReady=Boolean(learning&&window.GOXION_QA_ISOLATED&&state.ok===true&&state.semanticReady===true&&aiConfigured);
      verifiedReady=Boolean(refined&&window.GOXION_QA_ISOLATED&&state.ok===true&&state.verifiedReady===true&&typeof ai.verifiedRoute==='function');
      if (aiConfigured) setAIStatus('ready',
        'Tengo ayuda adicional disponible y la utilizaré si las guías no son suficientes.');
      else if (state.ok===true && state.configured===false) setAIStatus('pending',
        'Falta configurar la clave privada de Groq en Supabase. Iniciar sesión no activa la IA.');
      else if (state.ok===true && state.configured===true) setAIStatus('unavailable',
        state.code==='AI_KEY_REJECTED'
          ? 'Groq rechazó la clave. Revisa el secreto configurado en Supabase.'
          : state.code==='MODEL_NOT_AVAILABLE'
          ? 'El modelo seleccionado no está disponible para esta clave.'
          : 'La clave está guardada, pero no se pudo verificar Groq. Intenta de nuevo después.');
      else setAIStatus('unavailable', state.code==='SESSION_INVALID'
        ? 'La sesión no pudo validarse. Vuelve a ingresar a Mi Espacio.'
        : 'No se pudo comprobar el servidor. Puedes seguir con las guías.');
    }).catch(() => {
      if (active && statusId===requestId) setAIStatus('unavailable',
        'No fue posible conectar con el servidor de IA. Las guías siguen disponibles.');
    });
    prevOverflowHtml = doc.documentElement.style.overflow;
    prevOverflowBody = doc.body.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    doc.body.style.overflow = 'hidden';
    // iOS permite desplazamiento elástico aunque overflow sea hidden.
    // Inmovilizar el body conservando su posición real y restaurarlo al cerrar.
    const pageY = Number(window.scrollY)||0;
    pageFreeze={pageY,position:doc.body.style.position,top:doc.body.style.top,
      width:doc.body.style.width,overscroll:doc.documentElement.style.overscrollBehavior};
    doc.body.style.position='fixed';
    doc.body.style.top='-'+pageY+'px';
    doc.body.style.width='100%';
    doc.documentElement.style.overscrollBehavior='none';
    if(refined){
      doc.documentElement.classList.add('gxai-immersive-open');
      syncChatViewport();
      prepareImmersiveMorph(origin,source);
    }
    layer.classList.remove('gxai-closed');
    layer.classList.add('gxai-visible');
    layer.setAttribute('aria-hidden', 'false');
    syncChatViewport();
    chatTransition('happy');
    const greetingFlow = activeFlow;
    later(greetingFlow, 750, () => { if (!busy) chatTransition('listening'); });
    // Foco al diálogo sin preseleccionar el botón X ni abrir el teclado en iOS.
    dialog.setAttribute('tabindex', '-1');
    dialog.focus({preventScroll:true});
  }
  function closeChat(animated=false) {
    if(closeTimer!==null){if(animated!==true)finishClose();return;}
    if (!active) return;
    const animate=refined&&animated===true&&!reducedMotion()&&authenticated()&&!layer.classList.contains('gxai-keyboard-open')&&!layer.classList.contains('gxai-no-morph');
    active = false; requestId++;
    cancelFlow();diagnosis?.reset();dialogue?.reset();
    if(vision){clearImage();visionReady=false;visionTestOnly=false;exampleImage=null;exampleButton.hidden=true;}
    clearChoices();
    chosenPlatform = null;
    chosenGuide = null;
    myPlatforms=[];
    myContextReady=false;
    aiMode = false;
    aiEntry = false;
    awaitingSymptom = false;
    lastGuide = null;
    accessStage = null;
    caseContext = null;
    pendingHandoff = null;
    lastAccountTopic = null;
    resetConversation();
    chatState = 'idle';
    chatPhase.textContent = phases.idle.label;
    layer.setAttribute('data-chat-state','idle');
    if(animate){
      // Mantener el contexto y z-index mientras el avatar vuelve al origen.
      // Los flujos de datos ya se cancelaron, sólo se anima la salida visual.
      doc.documentElement.classList.add('gxai-immersive-closing');
      layer.classList.add('gxai-closing');
      closeTimer=setTimeout(finishClose,300);
      return;
    }
    finishClose();
  }
  function finishClose(){
    if(closeTimer!==null){clearTimeout(closeTimer);closeTimer=null;}
    if(refined){layer.classList.add('gxai-closed');doc.documentElement.classList.remove('gxai-immersive-open','gxai-immersive-closing');}
    layer.classList.remove('gxai-visible','gxai-keyboard-open','gxai-closing');
    layer.style.setProperty('--gxai-viewport-height','100dvh');
    layer.style.setProperty('--gxai-viewport-top','0px');
    layer.setAttribute('aria-hidden', 'true');
    doc.documentElement.style.overflow = prevOverflowHtml;
    doc.body.style.overflow = prevOverflowBody;
    if(pageFreeze){
      doc.body.style.position=pageFreeze.position||'';
      doc.body.style.top=pageFreeze.top||'';
      doc.body.style.width=pageFreeze.width||'';
      doc.documentElement.style.overscrollBehavior=pageFreeze.overscroll||'';
      if(refined){try{window.scrollTo({top:pageFreeze.pageY,left:0,behavior:'instant'});}catch(_){window.scrollTo?.(0,pageFreeze.pageY);}}
      else window.scrollTo?.(0,pageFreeze.pageY);
      pageFreeze=null;
    }
    mood('idle');
    if(refined){
      // No conservar mensajes privados al cerrar ni entre cuentas.
      scroll.querySelectorAll('.gxai-bubble:not(:first-child),.gxai-choices,.gxai-date-panel').forEach(el=>el.remove());
      messageInput.value='';syncSend();scroll.scrollTop=0;
    }
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  }
  function bubble(text, fromMe) {
    const node = doc.createElement('div');
    node.className = 'gxai-bubble' + (fromMe ? ' gxai-me' : refined ? ' gxai-local-answer' : '');
    node.textContent = text;
    scroll.appendChild(node);
    scroll.scrollTop = scroll.scrollHeight;
    return node;
  }
  function rateResponse(node,source='local',topic=null){
    if(!feedbackReady||!learning||!active||!authenticated()||!node)return;
    const session=requestId,identity=String(window.getCurrentClientKey?.()||'');
    const token=()=>localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    const login=token();
    const isCurrent=()=>active&&requestId===session&&authenticated()&&identity===String(window.getCurrentClientKey?.()||'')&&login===token();
    learning.attach({doc,node,topic:topic||dialogue?.get()?.topic||(chosenPlatform?'support':'other'),source,send:payload=>isCurrent()?ai.feedback(payload):Promise.resolve({ok:false}),isCurrent,reducedMotion});
  }
  const questions = Object.freeze({
    acceso: {
      prompt: 'Tengo un problema de acceso',
      step: 'searching',
      response: 'Te ayudo. Selecciona la plataforma con la falla para mostrarte las situaciones y guías registradas en GOXION.',
      finish: 'happy'
    },
    cuenta: {
      prompt: 'Quiero consultar mi cuenta',
      step: 'searching',
      response: 'Para ver tus servicios, saldos o próximo pago exacto, utiliza Mi Espacio y el estado de cuenta oficial. Todavía no puedo consultar información personal desde este chat.',
      finish: 'happy'
    },
    codigo: {
      prompt: 'Necesito un código',
      step: 'searching',
      response: 'Selecciona tu plataforma y te mostraré sus pasos de acceso. Cuando haga falta revisar un código o autorizar un dispositivo, te dirigiré al asesor humano; este chat no recibe códigos.',
      finish: 'happy'
    },
    error: {
      prompt: 'Quiero probar qué pasa si algo falla',
      step: 'working',
      response: 'Este es un error simulado para probar mis gestos. No ocurrió ningún problema con tu cuenta y puedes intentar otra consulta.',
      finish: 'error'
    },
    libre: {
      step: 'searching',
      response: 'Voy a ayudarte a localizar la guía oficial. Selecciona una plataforma para continuar.',
      finish: 'happy'
    },
    misiones: { prompt:'Mis misiones',step:'searching',response:'Consultando misiones…',finish:'happy' },
    promociones: {prompt:'Promociones activas',step:'searching',response:'Consultando catálogo…',finish:'happy' }
  });
  function runDemo(entry, enteredText, onDone) {
    if (!active || busy || !authenticated()) return;
    const query = String(enteredText || entry.prompt || '').trim();
    if (!query) return;
    clearChoices();
    bubble(query.slice(0, 240), true);
    setBusy(true);
    chatTransition('thinking');
    showTyping();
    const flowId = ++activeFlow;
    later(flowId, refined?90:220, () => chatTransition(entry.step || 'working'));
    later(flowId, refined?250:680, () => {
      hideTyping();
      if (entry.finish !== 'error') chatTransition('speaking');
      else chatTransition('error');
      const answer=bubble(entry.response, false);
      if(entry.finish!=='error')rateResponse(answer);
    });
    later(flowId, refined?380:1050, () => {
      if (entry.finish === 'happy') chatTransition('happy');
      else chatTransition('error');
    });
    later(flowId, refined?520:1330, () => {
      setBusy(false);
      chatTransition('listening');
      if (typeof onDone === 'function') onDone();
    });
  }

  // F6: navegación por las guías existentes, sin duplicar ni editar sus textos.
  const knowledge = window.GOXY_SUPPORT;
  let chosenPlatform = null;
  let choices = null;
  function clearChoices() {
    if (choices) { choices.remove(); choices = null; }
  }
  function showChoices(items) {
    clearChoices();
    if (!active || !authenticated() || !items.length) return;
    choices = doc.createElement('div');
    choices.className = 'gxai-choices';
    items.forEach(item => {
      if(item.kind==='heading'){
        const heading=doc.createElement('span');
        heading.className='gxai-choice-heading';
        heading.textContent=item.label;
        choices.appendChild(heading);
        return;
      }
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'gxai-choice';
      button.textContent = item.label;
      button.dataset.kind = item.kind;
      if (item.platform) button.dataset.platform = item.platform;
      if (Number.isInteger(item.issueIndex)) button.dataset.issueIndex = String(item.issueIndex);
      if (Number.isInteger(item.serviceIndex)) button.dataset.serviceIndex=String(item.serviceIndex);
      if(item.device)button.dataset.device=item.device;
      if (item.view) button.dataset.view=item.view;
      if (item.chargeId) button.dataset.chargeId=item.chargeId;
      if (item.date) button.dataset.date=item.date;
      choices.appendChild(button);
    });
    scroll.appendChild(choices);
    scroll.scrollTop = scroll.scrollHeight;
    if(refined){const currentChoices=choices;requestAnimationFrame(()=>{if(active&&choices===currentChoices)scroll.scrollTop=scroll.scrollHeight;});}
  }
  const choosePlatformOptions = names => names.map(platform =>
    ({kind:'platform',platform,label:platform}));
  function showPlatforms() {
    chosenGuide = null;
    aiMode = false;
    awaitingSymptom = false;
    lastGuide = null;
    messageInput.placeholder = refined?'Escríbele a Goxy…':'Cuéntame qué problema tienes…';
    const all=knowledge.platforms();
    const mine=myPlatforms.filter(platform=>all.includes(platform));
    if (mine.length) {
      showChoices([
        {kind:'heading',label:'Tus plataformas activas'},
        ...choosePlatformOptions(mine),
        {kind:'other',label:'Consultar otras plataformas'}
      ]);
    } else {
      showChoices([
        {kind:'heading',label:'Plataformas disponibles'},
        ...choosePlatformOptions(all)
      ]);
    }
  }
  function showOtherPlatforms() {
    chosenGuide=null;
    aiMode=false;
    awaitingSymptom=false;
    lastGuide=null;
    const others=knowledge.platforms().filter(platform=>!myPlatforms.includes(platform));
    showChoices([
      {kind:'heading',label:'Otras plataformas'},
      ...choosePlatformOptions(others),
      ...(myPlatforms.length?[{kind:'mine',label:'Volver a mis plataformas'}]:[])
    ]);
  }
  function showIssues(platform) {
    dialogue?.noteSupport();
    chosenGuide = null;
    aiMode = false;
    aiEntry = false;
    awaitingSymptom = false;
    lastGuide = null;
    const issues = knowledge.issues(platform);
    showChoices([
      ...issues.map((issue,index)=>({kind:'issue',platform,issueIndex:index,label:issue.issue})),
      {kind:'platforms',label:'Cambiar plataforma'},
      {kind:'human',label:'Hablar con asesor humano'}
    ]);
  }
  function showGuide(platform, index, enteredText=null) {
    aiEntry = false;
    const guide = knowledge.guide(platform,index);
    if(guide&&diagnosis){const next=diagnosis.begin(platform,index);if(next){applyDiagnosis(next,enteredText||guide.issue);return;}}
    if (!guide) {
      runDemo({prompt:'Consultar guía',step:'searching',
        response:'No encontré esa guía actualizada. Puedes elegir otra situación o hablar directamente con un asesor.',
        finish:'error'},null,showPlatforms);
      return;
    }
    if(chosenPlatform!==platform)resetConversation();
    chosenPlatform = platform;
    chosenGuide = {platform,issueIndex:index};
    lastGuide = {platform,issueIndex:index,requiresHuman:guide.requiresHuman};
    awaitingSymptom = false;
    aiMode = false;
    // Las instrucciones proceden EXCLUSIVAMENTE de support-issues.js,
    // convertidas a texto. Nunca incluir correo_login, perfil_pin o credenciales.
    const instructions=refined&&window.GOXY_DIALOG_ROUTING?window.GOXY_DIALOG_ROUTING.chatGuide(guide,index):guide.instructions;
    const answer = 'Guía GOXION · '+platform+'\n'+guide.issue+'\n\n'+
      instructions+'\n\n'+(guide.requiresHuman
      ? 'Para códigos, correos de autorización o revisiones de cuenta, continúa con un asesor humano. No compartas esos datos en este chat.'
      : 'Si todavía necesitas ayuda, puedes hablar con un asesor.');
    runDemo({prompt:guide.issue,step:'searching',response:answer,finish:'happy'},
      enteredText,()=>showChoices([
        {kind:'unresolved',platform,label:'Ya intenté esto y sigo con el problema'},
        {kind:'issues',platform,label:'Otra situación de '+platform},
        {kind:'human',label:'Hablar con asesor humano'},
        {kind:'platforms',label:'Cambiar plataforma'}
      ]));
  }

  // IA F7: solo se consulta el backend si el usuario seleccionó una guía
  // canónica. Nunca enviar fichas cliente, PIN ni valores de Mi Espacio.
  // La cuota del servidor es definitiva: esta cola solo gestiona su pausa corta.
  // Si llega otra pregunta durante la espera, se conserva únicamente la última.
  function queueAI(text,waitMs,chosen,alreadyShown=false,retryCount=0){
    if(!active||!authenticated())return;
    if(!alreadyShown)bubble(text.slice(0,240),true);
    clearChoices();
    pendingAI={text,chosen,retryCount,
      identity:String(window.getCurrentClientKey?.()||'')};
    chatTransition('thinking');
    chatPhase.textContent='Preparando tu siguiente consulta…';
    showTyping();
    setBusy(false);
    const flow=++activeFlow;
    later(flow,Math.min(35000,Math.max(400,waitMs)),()=>{
      const next=pendingAI;pendingAI=null;
      if(!next||next.identity!==String(window.getCurrentClientKey?.()||''))return;
      hideTyping();
      void askAI(next.text,{alreadyShown:true,overrideGuide:next.chosen,
        cooldownBypass:true,retryCount:next.retryCount});
    });
  }
  async function askAI(query,options={}){
    const chosen=options.overrideGuide||chosenGuide;
    if(!active||busy||!authenticated()||!chosen)return;
    const text=String(query||'').trim();
    if(!text||/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[\s.-]?){9,16}\b|\b\d{4,8}\b/iu.test(text)){
      bubble('Por seguridad no compartas correos, códigos, PIN o datos personales. Describe solamente la falla.',false);
      chatTransition('error');return;
    }
    const identity=String(window.getCurrentClientKey?.()||'');
    const loginToken=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    const remaining=lastAIAccount===identity?21000-(Date.now()-lastAIAnswerAt):0;
    if(!options.cooldownBypass&&remaining>0){
      queueAI(text,remaining,chosen,options.alreadyShown===true,0);
      return;
    }
    clearChoices();
    if(!options.alreadyShown)bubble(text.slice(0,240),true);
    setBusy(true);
    chatTransition('thinking');
    showTyping();
    const current=++activeFlow;
    aiController=new AbortController();
    const reply=await ai.ask({message:text,...chosen,history:[...conversation],signal:aiController.signal});
    if(!active||current!==activeFlow||!authenticated())return;
    if(identity!==String(window.getCurrentClientKey?.()||'')||
      loginToken!==(localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'')){
      closeChat();return;
    }
    aiController=null;
    if(reply.code==='RATE_LIMIT'){
      const seconds=Number(reply.retry_after);
      if(Number.isFinite(seconds)&&seconds>0&&seconds<=34&&(options.retryCount||0)<1){
        queueAI(text,(seconds+1)*1000,chosen,true,(options.retryCount||0)+1);
        return;
      }
    }
    hideTyping();
    if(reply.ok&&typeof reply.answer==='string'){
      lastAIAnswerAt=Date.now();lastAIAccount=identity;
      chatTransition('speaking');
      const answerNode=bubble(reply.answer,false);
      if(refined){answerNode.classList.remove('gxai-local-answer');answerNode.classList.add('gxai-ai-answer');}
      rateResponse(answerNode,'ai','support');
      keepTurn(text,reply.answer);
      if(Number.isInteger(reply.remaining)){
        if(refined){
          if(reply.remaining===0) bubble('Alcanzaste tu límite de consultas con IA. Las guías y la atención humana siguen disponibles.',false).classList.add('gxai-quota-notice');
          else if(reply.remaining===1) bubble('Te queda una consulta con IA. Las guías y la atención humana siguen disponibles.',false).classList.add('gxai-quota-notice');
        }else disclaimer.textContent='Te quedan '+reply.remaining+
          ' consultas IA de tu cupo móvil de 24 h · Nunca compartas códigos ni PIN.';
      }
      if(!refined)later(current,950,()=>chatTransition('happy'));
    }else if(reply.code!=='ABORTED'){
      chatTransition('error');
      if(refined && reply.code==='RATE_LIMIT' && Number(reply.retry_after)===3600){
        bubble('Alcanzaste tu límite de consultas con IA. Las guías y la atención humana siguen disponibles.',false).classList.add('gxai-quota-notice');
      }else bubble(reply.code==='RATE_LIMIT'
        ? 'La asistencia avanzada sigue en pausa. Puedes continuar con las guías y el asesor sin gastar IA.'
        : refined && ['AI_NOT_CONFIGURED','AI_UNAVAILABLE','PROVIDER_LIMIT','QUOTA_UNAVAILABLE'].includes(reply.code)
          ? 'Por ahora no puedo usar la asistencia adicional. Las guías y nuestro equipo siguen disponibles.'
          : reply.message||'Goxy no puede conectar con la IA todavía. Las guías siguen disponibles.',false);
      if(reply.code==='AI_NOT_CONFIGURED'){
        aiConfigured=false;aiMode=false;
        setAIStatus('pending','Falta configurar la clave privada de Groq en Supabase. Las guías permanecen disponibles.');
      }
    }
    later(current,refined?250:1700,()=>{
      setBusy(false);
      chatTransition('listening');
      showChoices([{kind:'human',label:'Hablar con asesor humano'},
        {kind:'issues',platform:chosen.platform,label:'Ver otras soluciones'}]);
    });
  }
  // Datos personales SOLO con el backend autenticado de GOXION.
  // El resultado se presenta al usuario sin enviarse al modelo de Groq.
  // La lectura B2 proviene del mismo cotizador oficial que Index/Mi Espacio.
  // Goxy no reproduce descuentos, mora ni precios; sólo presenta el resultado.
  async function accountRead(topic,query,paymentMode='all',chargeId=null){
    if(!active||busy||!authenticated())return;
    const text=String(query||'').trim();
    const identity=String(window.getCurrentClientKey?.()||'');
    const loginToken=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    lastAccountTopic=topic;
    if(topic==='forecast' && !(chargeId||payment.parseDate(text))){
      respondFree(text,'Claro, puedo calcular cuánto pagarías en una fecha futura usando el motor oficial. ¿Qué día tienes en mente? Por ejemplo: «el 31 de octubre» o «en 5 días».',
        [{kind:'forecast-date',label:'Elegir fecha en calendario'}]);
      return;
    }
    clearChoices();bubble(text.slice(0,240),true);
    setBusy(true);chatTransition('searching');showTyping();
    const flow=++activeFlow;
    aiController=new AbortController();
    let response;
    if(topic==='payment')response=await payment.read({signal:aiController.signal});
    else if(topic==='extension')response=await payment.extension({signal:aiController.signal});
    else if(topic==='loyalty')response=await payment.loyalty({signal:aiController.signal});
    else if(topic==='forecast')response=await ai.forecast(chargeId||payment.parseDate(text),
      {signal:aiController.signal});
    else response=await ai.account(topic,{signal:aiController.signal,message:text});
    if(!active||flow!==activeFlow||!authenticated())return;
    if(identity!==String(window.getCurrentClientKey?.()||'')||
       loginToken!==(localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'')){
      closeChat();return;
    }
    aiController=null;
    const hinted=topic==='payment'&&paymentMode==='all'?knowledge.resolvePlatform(text):null;
    const viewMode=hinted?'platform':paymentMode;
    const financial=topic==='payment'?payment.describe(response,viewMode,hinted||chargeId):
      topic==='extension'?payment.extensionDescribe(response):
      topic==='loyalty'?payment.loyaltyDescribe(response):
      topic==='forecast'?payment.forecastDescribe(response):null;
    const success=Boolean(financial)||(response.ok===true&&typeof response.answer==='string');
    if(success){
      dialogue?.noteAccount(topic);
      chatTransition('speaking');
      let answer=financial?.answer||response.answer;
      const catalogQuestion=topic==='missions'&&/\bcatalogo\b/.test(knowledge.normalize(text));
      const catalogMission=catalogQuestion&&/\bcatalogo\b/.test(knowledge.normalize(answer))&&
        /figura (?:pendiente|completada)/.test(answer);
      if(catalogMission)answer=answer.replace(
        'Sigue las instrucciones de esa misión en Mi Espacio; si requiere una validación, GOXION debe confirmarla allí.',
        'Para realizarla, abre la pestaña Catálogo de Mi Espacio y visita el catálogo. GOXION comprueba el avance de esa misión.');
      const reply=bubble(answer,false);
      if(refined&&topic==='promotions'){
        // Presentación solamente: nombres y condiciones exactos del catálogo.
        const prefix='Promociones públicas vigentes en el catálogo: ';
        const divider='. Su elegibilidad y precio final';
        const at=answer.indexOf(divider);
        if(answer.startsWith(prefix)&&at>prefix.length){
          const names=answer.slice(prefix.length,at).split('; ').filter(Boolean);
          const title=doc.createElement('strong');title.className='gxai-reply-title';
          title.textContent=prefix.trim();
          const list=doc.createElement('ul');list.className='gxai-reply-list';
          names.forEach(name=>{const li=doc.createElement('li');li.textContent=name;list.appendChild(li);});
          const note=doc.createElement('span');note.className='gxai-reply-note';note.textContent=answer.slice(at+2);
          reply.replaceChildren(title,list,note);
        }
      }
      reply.classList.add('gxai-delayed-bubble');
      rateResponse(reply,'official',topic);
      showChoices(financial?financial.choices:refined&&topic==='promotions'?[{kind:'catalog',label:'Ver promociones en Catálogo'},{kind:'account',label:'Ir a Mi Espacio'}]:[
        {kind:'account',label:'Abrir Mi Espacio'},
        ...(catalogMission?[{kind:'catalog',label:'Abrir catálogo'}]:[]),
        ...(topic==='missions'?[{kind:'promotions',label:'Ver promociones'}]:
          [{kind:'missions',label:'Mis misiones'}]),
        {kind:'platforms',label:'Ayuda con mis servicios'}
      ]);
      choices?.classList.add('gxai-delayed-choices');
    }else if(response.code!=='ABORTED'){
      chatTransition('error');
      bubble(response.message||'No pude comprobar ese dato ahora. Consulta Mi Espacio para información oficial.',false);
      showChoices([{kind:'account',label:'Abrir Mi Espacio'}]);
    }
    later(flow,refined?180:560,()=>{hideTyping();setBusy(false);chatTransition('listening');});
  }
  function respondFree(text,reply,options=[]){
    if(!active||busy||!authenticated())return;
    clearChoices();bubble(text.slice(0,240),true);
    chatTransition('thinking');showTyping();
    const message=bubble(reply,false);
    message.classList.add('gxai-delayed-bubble');
    rateResponse(message);
    if(options.length){
      showChoices(options);
      choices?.classList.add('gxai-delayed-choices');
    }
    const id=++activeFlow;
    later(id,520,()=>{hideTyping();chatTransition('speaking');});
    later(id,850,()=>chatTransition('listening'));
  }
  // F14: la intención financiera tiene prioridad sobre el menú de plataformas.
  // Una respuesta elíptica ("¿y si no puedo pagarlo?") conserva el contexto.
  function accountTopic(text){
    const normal=knowledge.normalize(text);
    if(/\b(mision(?:es)?|tareas?|retos?|cupon(?:es)?)\b/.test(normal))return 'missions';
    if(lastAccountTopic==='missions' && /\b(catalogo|referid|encuesta|opinion|comentario)\b/.test(normal))
      return 'missions';
    if(/\b(promocion(?:es)?|ofertas?|descuentos? especiales?)\b/.test(normal))return 'promotions';
    if(/\b(lealtad|nivel maximo|nivel 2|programa goxion|racha de pagos)\b/.test(normal))
      return 'loyalty';
    if(/\b(cuanto|cuantos|si|hasta|para|en)\b/.test(normal) &&
      /\b(mora|recargo|interes|tard|fecha|dia|dias|mes|pagari|pago|pagar|pague)\b/.test(normal) &&
      (/\b(si|hasta|tard|despues|mora|recargo|interes)\b/.test(normal) &&
      /\b(pago|pagar|pagari|fecha|dia|dias|mora|recargo)\b/.test(normal)))return 'forecast';
    if(lastAccountTopic==='forecast' && (payment.parseDate(text) ||
      /\b(fecha|dia|dias|manana)\b/.test(normal)))return 'forecast';
    if(/\b(prorroga|plazo|aplazar|posponer|extender|diferir|no puedo pagar|no podre pagar|no voy a poder pagar|sin dinero|no me alcanza|no llego|pagarlo|pagarla|pagarles|pagar hasta)\b/.test(normal))
      return 'extension';
    if(lastAccountTopic==='payment' &&
      /\b(y si no|y si|no puedo|no podre|me atraso|despues|hasta)\b/.test(normal))
      return 'extension';
    if(/\b(pago|pagar|pague|pagare|debo|deuda|mensualidad(?:es)?|proximo cobro|proxima fecha|cuando vence|vencimient[oa]|fecha de pago|estado de cuenta|saldo|corte|mora|cuanto debo|cuanto voy a pagar)\b/.test(normal))
      return 'payment';
    return null;
  }
  // F11: clasificador LOCAL. Decidir no requiere otra llamada a Groq.
  // Solo escalar cuando hay plataforma, síntomas suficientes y ninguna
  // acción bloqueada por control humano. La cuota se consume únicamente
  // dentro de askAI(), no en la clasificación ni en las guías.
  function isVague(text) {
    const words=knowledge.normalize(text);
    if(refined&&window.GOXY_DIALOG_ROUTING?.classify(text,{platform:chosenPlatform},knowledge.resolveAllPlatforms)?.kind==='symptom')return false;
    if (/\b(no abre|no carga|no funciona|se congela|pantalla negra|error|sin sonido|no reproduce|no inicia sesion|se cierra|bloquea|falla al)\b/.test(words))return false;
    const meaningful=words.split(' ').filter(w=>w.length>2 &&
      !['tengo','necesito','quiero','ayuda','problema','plataforma','servicio','con','para','por','esta','algo'].includes(w));
    return meaningful.length<3;
  }
  function needsHumanAuthorization(guide) {
    if(!guide?.requiresHuman)return false;
    const issue=knowledge.normalize(guide.issue||'');
    // El flag de contacto humano también aparece en TODAS las guías;
    // solo algunos procedimientos son autorizaciones exclusivas.
    return /\b(codigo|verificacion|vincular|invitacion|registrar dispositivo)\b/.test(issue);
  }
  function escalationFallback(platform) {
    respondFree('Necesito más ayuda',
      'Por ahora no tengo disponible una explicación avanzada. Puedo revisar contigo otra guía de '+platform+
      ' o enviarte con un asesor para continuar.',
      [{kind:'issues',platform,label:'Consultar otra solución'},
       {kind:'human',label:'Hablar con asesor humano'}]);
  }
  async function tryVerifiedRoute(query,platform){
    const identity=String(window.getCurrentClientKey?.()||''),login=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    clearChoices();setBusy(true);chatTransition('thinking');showTyping();
    const flow=++activeFlow;const controller=new AbortController();aiController=controller;
    const deadline=setTimeout(()=>controller.abort(),5500);
    let reply;try{reply=await ai.verifiedRoute(query,platform,{signal:controller.signal});}catch{reply={ok:false};}finally{clearTimeout(deadline);}
    if(!active||flow!==activeFlow||!authenticated())return;
    if(identity!==String(window.getCurrentClientKey?.()||'')||login!==(localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'')){closeChat();return;}
    aiController=null;hideTyping();setBusy(false);
    if(reply?.ok===true&&reply.platform===platform&&Number.isInteger(reply.guideId)&&knowledge.guide(platform,reply.guideId)){
      showGuide(platform,reply.guideId,query);return;
    }
    // A miss or unavailable database must never cause a retry loop.
    escalateAutomatically(query,platform,undefined,true);
  }
  function escalateAutomatically(query,platform,issueIndex,skipVerified=false) {
    if(!knowledge.platforms().includes(platform)||!active||busy||!authenticated())return;
    const guide=Number.isInteger(issueIndex)?knowledge.guide(platform,issueIndex):null;
    // La IA no puede ejecutar autorizaciones: evitar cobros en gestiones humanas.
    if(needsHumanAuthorization(guide)){
      respondFree(query,
        'Esta gestión necesita una autorización de GOXION. Ya tenemos el contexto; un asesor debe finalizarla. No me envíes códigos ni contraseñas.',
        [{kind:'human',label:'Continuar con asesor humano'},
         {kind:'issues',platform,label:'Ver otras soluciones'}]);
      return;
    }
    if(verifiedReady&&!skipVerified&&!Number.isInteger(issueIndex)&&!lastGuide&&!aiMode){
      void tryVerifiedRoute(query,platform);return;
    }
    if(!aiConfigured){
      escalationFallback(platform);
      return;
    }
    aiMode=true;
    awaitingSymptom=false;
    chosenPlatform=platform;
    chosenGuide=Number.isInteger(issueIndex)?{platform,issueIndex}:{platform};
    messageInput.placeholder='Cuéntame qué ocurre…';
    void askAI(query);
  }
  function recordDevice(query,device){
    const accepted=['Smart TV','Fire TV','Roku','Celular o tableta','Computadora','Otro dispositivo'];
    if(!accepted.includes(device))return false;
    accessStage=null;
    caseContext=caseContext||{issue:'Problema de acceso',checks:[]};
    caseContext.checks=[...caseContext.checks,'Dispositivo: '+device];
    respondFree(query,'Gracias. Ya tengo la plataforma, el problema y el dispositivo. Puedo preparar ahora tu solicitud para que el asesor no vuelva a preguntarte lo mismo.',
      [{kind:'human',label:'Preparar ficha para WhatsApp'},
       {kind:'account',label:'Revisar Mi Espacio'}]);
    return true;
  }
  function helpWithAccess(query) {
    if(accessStage?.type==='device'){
      const n=knowledge.normalize(query);
      const device=/roku/.test(n)?'Roku':/fire tv/.test(n)?'Fire TV':
        /smart tv|televisor|android tv|pantalla/.test(n)?'Smart TV':
        /celular|movil|telefono|tablet/.test(n)?'Celular o tableta':
        /computadora|laptop|pc/.test(n)?'Computadora':null;
      if(device)return recordDevice(query,device);
    }
    const result=accessRouter?.inspect(query,chosenPlatform,accessStage);
    if(!result?.reply)return false;
    if(result.platform)chosenPlatform=result.platform;
    if(Object.hasOwn(result,'stage'))accessStage=result.stage;
    if(result.stage?.type==='premium')caseContext={
      issue:'La plataforma solicita contratar Premium pese a estar contratada',
      checks:['Servicio activo verificado en Mi Espacio','Preguntado tipo de acceso']
    };
    if(accessStage===null && result.reply.includes('QR') && result.reply.includes('vincule')){
      caseContext={
        issue:'La plataforma solicita acceso por QR y requiere vinculación',
        checks:['Servicio comprobado en Mi Espacio','Solo código QR disponible']
      };
    }
    if(result.handoff){
      accessStage={type:'device'};
      respondFree(query,result.reply+' Para preparar el caso, ¿en qué dispositivo intentas entrar?',
        ['Smart TV','Fire TV','Roku','Celular o tableta','Computadora','Otro dispositivo']
          .map(device=>({kind:'device',device,label:device})));
    }else respondFree(query,result.reply,result.options||[]);
    return true;
  }
  function clearSupportContext(platform=null){
    diagnosis?.reset();dialogue?.reset();
    chosenPlatform=platform;chosenGuide=null;lastGuide=null;aiMode=false;aiEntry=false;
    awaitingSymptom=false;accessStage=null;caseContext=null;pendingHandoff=null;
    lastAccountTopic=null;resetConversation();
  }
  function applyDiagnosis(result,query=null){
    if(!result)return false;
    const state=result.state;
    if(state){
      if(state.platform&&chosenPlatform!==state.platform){resetConversation();accessStage=null;pendingHandoff=null;}
      chosenPlatform=state.platform;
      chosenGuide=Number.isInteger(state.index)?{platform:state.platform,issueIndex:state.index}:null;
      lastGuide=chosenGuide?{...chosenGuide,requiresHuman:knowledge.guide(state.platform,state.index)?.requiresHuman}:null;
      caseContext={issue:state.issue,checks:[...state.checks]};
      aiMode=false;awaitingSymptom=false;
    }else if(!result.handoff){clearSupportContext();}
    if(result.handoff){humanHandoff();return true;}
    if(result.answer&&state)keepTurn(query||'Se analizó una imagen del problema.',result.answer);
    if(query!==null&&result.answer)respondFree(query,result.answer,result.choices);
    else{if(result.answer)rateResponse(bubble(result.answer,false),state?.source==='image'?'vision':'local','support');showChoices(result.choices||[]);}
    return true;
  }
  function contextualRoute(query){
    return refined?window.GOXY_DIALOG_ROUTING?.classify(query,{
      platform:chosenPlatform,awaitingSymptom,accessStage
    },knowledge.resolveAllPlatforms):null;
  }
  async function semanticFallback(query){
    if(!active||busy||!authenticated())return;
    const fallback=dialogue.fallback();
    const identity=String(window.getCurrentClientKey?.()||''),login=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    const remaining=lastAIAccount===identity?21000-(Date.now()-lastAIAnswerAt):0;
    if(!semanticReady||remaining>0){respondFree(query,fallback.answer,fallback.choices);return;}
    clearChoices();bubble(query.slice(0,240),true);setBusy(true);chatTransition('thinking');showTyping();
    const flow=++activeFlow;aiController=new AbortController();
    const res=await ai.interpret(query,dialogue.get().topic||'other',{signal:aiController.signal});
    if(!active||flow!==activeFlow||!authenticated())return;
    if(identity!==String(window.getCurrentClientKey?.()||'')||login!==(localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'')){closeChat();return;}
    aiController=null;hideTyping();setBusy(false);chatTransition('speaking');
    if(res.ok===true||['RATE_LIMIT','PROVIDER_LIMIT','AI_UNAVAILABLE','INVALID_INTENT'].includes(res.code)){lastAIAccount=identity;lastAIAnswerAt=Date.now();}
    const decision=res.ok===true?learning.semanticReply(res.intent):fallback;
    if(res.ok===true)dialogue.noteAccount(decision.topic);
    const answer=bubble(decision.answer,false);
    if(res.ok===true){answer.classList.remove('gxai-local-answer');answer.classList.add('gxai-ai-answer');}
    rateResponse(answer,res.ok===true?'ai':'local',decision.topic);showChoices(decision.choices||[]);
    later(flow,300,()=>chatTransition('listening'));
  }
  async function readIncident(query,req,fallback=null){
    cancelFlow();const flow=++activeFlow;
    const current=requestId,identity=String(window.getCurrentClientKey?.()||''),token=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'';
    setBusy(true);chatTransition('thinking');
    const controller=new AbortController();aiController=controller;
    const timer=setTimeout(()=>controller.abort(),6500);
    let state;try{state=await vision.incident(controller.signal);}catch{state={ok:false};}finally{clearTimeout(timer);}
    if(!active||flow!==activeFlow||current!==requestId||!authenticated())return;
    if(identity!==String(window.getCurrentClientKey?.()||'')||token!==(localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||'')){closeChat();return;}
    aiController=null;setBusy(false);chatTransition('listening');
    const resume=()=>fallback?fallback():handleText(query,true);
    if(state?.code==='PILOT_REQUIRED'){pilotDenied=true;resume();return;}
    if(state?.ok)pilotSupport=true;
    if(!pilotSupport){resume();return;}
    const decision=incidents.reply(state,req,query);
    if(!decision){resume();return;}
    if(decision.platform&&decision.platform!==chosenPlatform)clearSupportContext(decision.platform);
    if(decision.platform){chosenPlatform=decision.platform;awaitingSymptom=true;}
    keepTurn(query,decision.answer);respondFree(query,decision.answer,fallback&&decision.platform?[{kind:'issues',platform:decision.platform,label:'Ver situaciones conocidas'}]:decision.choices);
  }
  function handleText(query,skipIncident=false) {
    // La información que ya administra GOXION y los saludos no consumen IA.
    const words = knowledge.normalize(query);
    if(refined&&(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(query)||/^(?:\d[\s-]?){4,16}$/.test(query.trim()))){
      bubble('Por seguridad, no compartas correos, PIN ni códigos en este chat. Describe lo que aparece sin incluir esos datos.',false);return;
    }
    const route=contextualRoute(query);
    // First consult the official incident source only for a new support case or explicit status question.
    const mirrorPilot=Boolean(vision?.isMirrorPilot?.()&&!pilotDenied&&incidents);
    if(mirrorPilot&&!skipIncident){
      const req=incidents.request(query,chosenPlatform,route?.kind);
      if(req&&(req.explicit||incidentLast!==req.platform)){
        incidentLast=req.platform;void readIncident(query,req);return;
      }
    }
    if(mirrorPilot&&pilotSupport&&incidents.photoOffer(query,route?.brand||chosenPlatform)){
      if(route?.brand&&route.brand!==chosenPlatform)clearSupportContext(route.brand);
      const stage=diagnosis?.get()?.stage;
      const definiteAuthorization=stage==='await-human'&&lastGuide?.requiresHuman===true;
      const answer=definiteAuthorization?'No hace falta otra captura para esa autorización: nuestro equipo debe finalizarla. Puedo preparar el contexto sin pedir códigos.':visionReady?'Sí, una captura del aviso puede ayudarnos a distinguir el problema. Oculta los códigos, correos y datos privados antes de compartirla.':'Por ahora no puedo analizar una imagen en esta sesión. Dime qué aviso aparece, sin compartir datos privados, y revisamos el siguiente paso.';
      keepTurn(query,answer);respondFree(query,answer,definiteAuthorization?[{kind:'human',label:'Preparar ficha de soporte'}]:visionReady?[{kind:'diagnosis-image',label:'Compartir captura'}]:[]);return;
    }
    if(route?.kind==='thanks'){
      bubble(query.slice(0,240),true);bubble('¡Con gusto! Si necesitas algo más, aquí estoy.',false);chatTransition('listening');
      return;
    }
    if(route?.kind==='resolved'){
      incidentLast=null;clearSupportContext();
      respondFree(query,'¡Qué bueno que ya funciona! Si vuelve a ocurrir, podemos revisarlo juntos.',[{kind:'platforms',label:'Ayuda con otra plataforma'},{kind:'account',label:'Ir a Mi Espacio'}]);
      return;
    }
    if(route?.kind==='farewell'){
      incidentLast=null;clearSupportContext();
      respondFree(query,'¡Hasta pronto! Aquí estaré cuando me necesites.',[]);
      return;
    }
    if(route?.kind==='ack'&&!awaitingSymptom&&!diagnosis?.get()&&!dialogue?.get().pending){
      const previous=choices?Array.from(choices.querySelectorAll('button[data-kind]')).map(b=>({...b.dataset,label:b.textContent,issueIndex:b.dataset.issueIndex===undefined?undefined:Number(b.dataset.issueIndex),serviceIndex:b.dataset.serviceIndex===undefined?undefined:Number(b.dataset.serviceIndex)})):[];
      respondFree(query,'De acuerdo. Podemos continuar cuando quieras.',previous);
      return;
    }
    if(route?.kind==='human'){
      if(route.brand&&route.brand!==chosenPlatform)clearSupportContext(route.brand);
      if(chosenPlatform){respondFree(query,'Claro. Puedo preparar una ficha para nuestro equipo; tú decides si la compartes.',[{kind:'human',label:'Preparar ficha de soporte'},{kind:'policy-support',label:'Ir a atención humana'}]);}
      else respondFree(query,'Claro, puedes hablar directamente con nuestro equipo.',[{kind:'policy-support',label:'Ir a atención humana'},{kind:'platforms',label:'Elegir plataforma para preparar ficha'}]);
      return;
    }
    if(route?.kind==='multiple'){
      clearSupportContext();
      respondFree(query,'Podemos revisar ambos servicios, uno por uno. ¿Con cuál empezamos?',choosePlatformOptions(route.brands));
      return;
    }
    if(route?.kind==='device'){
      respondFree(query,'Entendido. Revisemos lo que ocurre en '+route.device.replace(/^en /,'')+'. ¿Qué mensaje aparece o qué deja de funcionar?',[{kind:'issues',platform:chosenPlatform,label:'Ver problemas conocidos'}]);
      return;
    }
    if(dialogue){
      const decision=dialogue.consume(query,{platform:chosenPlatform,brands:knowledge.resolveAllPlatforms(query),activePlatforms:myPlatforms});
      if(decision){
        diagnosis?.reset();chosenPlatform=null;chosenGuide=null;lastGuide=null;aiMode=false;aiEntry=false;awaitingSymptom=false;accessStage=null;caseContext=null;pendingHandoff=null;lastAccountTopic=null;resetConversation();
        respondFree(query,decision.answer,decision.choices);return;
      }
    }
    if(route?.brand&&route.brand!==chosenPlatform&&['brand','symptom'].includes(route.kind)&&!(diagnosis?.get()?.platform===null))clearSupportContext(route.brand);
    if(route?.kind==='brand'&&!diagnosis?.get()){
      awaitingSymptom=true;
      respondFree(query,'¿Qué ocurre con '+route.brand+'? Cuéntame el síntoma o elige una situación conocida.',[{kind:'issues',platform:route.brand,label:'Ver soluciones disponibles'}]);
      return;
    }
    const rule=refined?window.GOXY_POLICY_V2?.reply(query):null;
    if(rule){clearSupportContext();respondFree(query,rule.answer,rule.choices);return;}
    const topic=accountTopic(query);
    if(topic && route?.kind!=='symptom'){ if(refined){const previous=lastAccountTopic;clearSupportContext();lastAccountTopic=previous;} void accountRead(topic,query); return; }
    // Una pregunta comercial no es una falla de acceso ni gasta Groq.
    const platformOffer=knowledge.resolvePlatform(query);
    if(platformOffer && /\b(si contrato|si contratara|quiero contratar|quiero adquirir|cuanto pagaria|cuanto cuesta|cuanto sale|cuanto saldria|precio|costo|mensual|contratacion|contratar)\b/.test(words) &&
       !/\b(me pide contratar|me sale contratar|para iniciar sesion|para entrar|premium|iniciar sesion|acceso|error)\b/.test(words)){
      respondFree(query,'Puedo ayudarte a cotizar '+platformOffer+'. El precio final depende de la modalidad, la disponibilidad y las promociones vigentes. Para darte la tarifa correcta y no inventar un importe, abre Catálogo: ahí puedes ver el plan y su precio antes de contratar.',
        [{kind:'catalog',label:'Ver planes y precios'},
         {kind:'promotions',label:'Promociones disponibles'}]);
      return;
    }
    if(refined&&route?.brand&&route.brand!==chosenPlatform&&!(diagnosis?.get()?.platform===null))clearSupportContext(route.brand);
    if(helpWithAccess(query)){diagnosis?.reset();return;}
    if(diagnosis&&!accessStage){const decision=diagnosis.consume(query,chosenPlatform,visionReady);if(decision&&applyDiagnosis(decision,query))return;}
    if(/^(hola(?: goxy)?|buenos dias|buenas tardes|buenas noches|hey|que puedes hacer|que puedo hacer|que haces|en que me ayudas|en que me puedes ayudar|como me ayudas|me puedes ayudar)$/.test(words)) {
      respondFree(query,chosenPlatform
        ? 'Puedo guiarte sobre '+chosenPlatform+', consultar tus misiones y promociones, o enviarte a tu estado de cuenta. Si la guía no basta, te ayudo a aclararla con IA.'
        : '¡Hola! Puedo consultar tus misiones y promociones, orientarte sobre próximos pagos desde Mi Espacio y resolver dudas de plataformas con guías oficiales. La IA se usa solo cuando necesitamos una explicación adicional.',
        [{kind:'platforms',label:'Ayuda con plataformas'},
         {kind:'missions',label:'Mis misiones'},{kind:'payment',label:'Próximo pago'}]);
      return;
    }
    // Diagnóstico de códigos sin gastar IA ni solicitar el valor del código.
    if(/\b(codigo|vincular|enlazar|verificacion)\b/.test(words) &&
        /\b(no acepta|no funciona|no responde|rechaza|incorrecto|caducado|expirado)\b/.test(words)){
      respondFree(query,
        (chosenPlatform ? 'Sobre '+chosenPlatform+': ' : '')+
        'Entiendo que el código no está funcionando. ¿La pantalla indica «incorrecto», «caducado» o muestra otro mensaje? No escribas el código aquí. Si necesitas que GOXION autorice o vincule el dispositivo, esa acción la realizará un asesor.',
        [{kind:'human',label:'Solicitar ayuda a un asesor'},
         {kind:'platforms',label:'Revisar guías de acceso'}]);
      return;
    }
    // Una autorización que ya intentó el cliente no se arregla gastando más IA.
    if(/\b(ya|antes|recien)\b/.test(words) &&
       /\b(codigo|verificacion|vinculacion|autorizar|enlazar)\b/.test(words) &&
       /\b(coloque|ingrese|puse|escribi|mande|envie|no funciona|no responde)\b/.test(words)) {
      respondFree(query,
        'Entiendo que ya intentaste vincular tu dispositivo. No puedo validar ni autorizar ese código desde aquí: eso requiere un asesor de GOXION. Puedes solicitar ayuda sin compartir el código por el chat.',
        [{kind:'human',label:'Hablar con asesor humano'},
         {kind:'platforms',label:'Ver otras guías'}]);
      return;
    }
    // Acciones de navegación o consulta nunca gastan IA, aun tras una explicación.
    if (/\b(cambiar|otra|elegir|ver)(?: de)? plataformas?\b/.test(words)) {
      chosenPlatform = null;
      runDemo({prompt:query,step:'searching',
        response:'Claro, elige la plataforma que necesitas revisar.',finish:'happy'},query,showPlatforms);
      return;
    }
    const platform = knowledge.resolvePlatform(query);
    if(platform && chosenPlatform && platform!==chosenPlatform){
      if(refined)clearSupportContext(platform);
      else {aiMode=false;awaitingSymptom=false;lastGuide=null;chosenGuide=null;resetConversation();}
    }
    if (/\b(asesor|humano|whatsapp|persona)\b/.test(words)) {
      runDemo({prompt:query,step:'working',
        response:'Puedes continuar con el asesor humano de GOXION. Se abrirá el contacto oficial cuando pulses el botón; aquí no se envió ningún mensaje.',
        finish:'happy'},query,()=>showChoices([{kind:'human',label:'Hablar con asesor humano'}]));
      return;
    }
    if (/\b(deuda|factura)\b/.test(words) && !platform) {
      void accountRead('payment',query);
      return;
    }
    // La IA solo continúa después de una escalada real, no como modo elegido.
    const target = platform || chosenPlatform;
    if (target) {
      const samePlatform = lastGuide?.platform===target;
      const index = knowledge.matchIssue(target,query);
      const failed=refined?(route?.kind==='follow'||/\b(ya (lo )?(hice|intente|probe|revise)|sigue (igual|fallando|sin funcionar)|no sirvio|no resolvio)\b/.test(words)):/\b(ya|hice|intente|probe|sigue|todavia|aun|no sirvio|no resolvio|no funciona|mismo problema)\b/.test(words);
      if(samePlatform && lastGuide && failed && (index===null||index===lastGuide.issueIndex)){
        escalateAutomatically(query,target,lastGuide.issueIndex);
        return;
      }
      if (index !== null && (!aiMode||refined&&index!==chosenGuide?.issueIndex)) {if(refined&&index!==chosenGuide?.issueIndex){resetConversation();caseContext=null;pendingHandoff=null;}showGuide(target,index,refined?query:null);return;}
      if (aiMode && chosenGuide?.platform===target) {
        void askAI(query);
        return;
      }
      chosenPlatform=target;
      if (isVague(query) && !awaitingSymptom) {
        awaitingSymptom=true;
        respondFree(query,
          'Entiendo, revisemos '+target+'. ¿Qué sucede exactamente: no abre, aparece un error, no reproduce o falla al iniciar sesión? Cuéntame el síntoma sin enviar datos privados.',
          [{kind:'issues',platform:target,label:'Ver problemas conocidos'}]);
        return;
      }
      if(isVague(query) && awaitingSymptom){
        respondFree(query,
          refined?'Si no sabes cómo describirlo, elige la situación más parecida o habla con nuestro equipo.':'Para poder ayudarte necesito un detalle más: ¿qué ves en la pantalla y en qué momento sucede?',
          refined?[...knowledge.issues(target).map((issue,index)=>({kind:'issue',platform:target,issueIndex:index,label:issue.issue})),{kind:'human',label:'Hablar con asesor'}]:[{kind:'issues',platform:target,label:'Ver guías disponibles'}]);
        return;
      }
      escalateAutomatically(query,target,samePlatform?lastGuide?.issueIndex:undefined);
      return;
    }
    // Sin plataforma elegida, no consumir IA intentando adivinarla.
    if(dialogue){void semanticFallback(query);return;}
    runDemo(questions.libre,query,showPlatforms);
  }
  function humanHandoff(serviceIndex=null) {
    if(!active||!authenticated())return;
    pendingHandoff=null;
    if(!chosenPlatform){
      respondFree('Necesito un asesor','Para preparar tu solicitud necesito saber primero cuál de tus plataformas tiene el problema.',
        [{kind:'platforms',label:'Elegir plataforma'}]);
      return;
    }
    const accounts=clientContext.destinations?.(chosenPlatform)||[];
    if(accounts.length>1 && !Number.isInteger(serviceIndex)){
      bubble('Veo más de un acceso de '+chosenPlatform+'. ¿Cuál es el que presenta el problema?',false);
      showChoices(accounts.map(c=>({kind:'handoff-service',serviceIndex:c.index,label:c.label})));
      return;
    }
    const guide=lastGuide?knowledge.guide(lastGuide.platform,lastGuide.issueIndex):null;
    const details=caseContext||{
      issue:guide?.issue||'Problema de acceso o reproducción',
      checks:guide?['Guía de soporte consultada','Se requiere intervención de asesor']:['Se solicita revisión de soporte']
    };
    const ticket=handoff?.prepare(chosenPlatform,{...details,serviceIndex});
    if(!ticket){
      respondFree('Solicitar asistencia','No pude comprobar los datos del servicio en tu sesión. Vuelve a abrir Mi Espacio y prueba de nuevo.',
        [{kind:'account',label:'Abrir Mi Espacio'}]);
      return;
    }
    pendingHandoff=ticket;
    clearChoices();
    bubble('Preparé esta ficha con los datos de tu servicio. Revísala antes de compartirla; no incluye PIN, contraseñas ni códigos:',false);
    bubble(ticket.message,false);
    bubble('Si la confirmas, abriré WhatsApp con el mensaje listo. Tú tendrás que pulsar Enviar; todavía no se ha notificado al asesor.',false);
    showChoices([{kind:'send-handoff',label:'Confirmar y abrir WhatsApp'},
                 {kind:'cancel-handoff',label:'No compartir ahora'}]);
  }
  function openHandoff(){
    if(!active||!authenticated()||!pendingHandoff)return;
    const current=clientContext.supportReference?.(pendingHandoff.platform,pendingHandoff.serviceIndex);
    if(!current || current.clientId!==pendingHandoff.clientId){
      pendingHandoff=null;
      bubble('La sesión cambió. Por seguridad prepara la ficha nuevamente.',false);
      showChoices([{kind:'platforms',label:'Elegir plataforma'}]);
      return;
    }
    const link=handoff?.url(pendingHandoff);
    if(!link){
      bubble('No pude preparar el enlace del WhatsApp oficial. Continúa desde Soporte.',false);
      pendingHandoff=null;
      return;
    }
    window.open(link,'_blank','noopener,noreferrer');
    closeChat();
  }
  function showForecastDate(){
    clearChoices();
    if(!active||!authenticated())return;
    const first=payment.localDay(),max=payment.addDays(first,45);
    scroll.querySelector?.('.gxai-date-panel')?.remove();
    const panel=doc.createElement('div');panel.className='gxai-date-panel';
    const label=doc.createElement('label');
    label.textContent='¿Qué día planeas pagar?';
    label.htmlFor='gxai-forecast-date';
    // Safari iOS dibuja el texto interno de input[type=date] fuera de su
    // caja visible y fuerza un ancho intrínseco pese a min-width:0.
    // El control nativo sigue siendo el área táctil real, pero su apariencia
    // queda debajo de un rótulo estable y perfectamente centrado.
    const dateSlot=doc.createElement('div');
    dateSlot.className='gxai-date-slot';
    const visualDate=doc.createElement('span');
    visualDate.className='gxai-date-visible';
    visualDate.setAttribute('aria-hidden','true');
    const input=doc.createElement('input');
    input.id='gxai-forecast-date';
    input.type='date';input.className='gxai-date-input';
    input.setAttribute('aria-label','Fecha prevista para realizar tu pago');
    input.min=first;input.max=max;input.value=payment.addDays(first,1);
    const updateDateLabel=()=>{
      const dateValue=/^\d{4}-\d{2}-\d{2}$/.test(input.value)?input.value:null;
      if(!dateValue){visualDate.textContent='Seleccionar fecha';return;}
      const [year,month,day]=dateValue.split('-').map(Number);
      visualDate.textContent=new Intl.DateTimeFormat('es-MX',{
        day:'numeric',month:'short',year:'numeric',timeZone:'UTC'
      }).format(new Date(Date.UTC(year,month-1,day))).replaceAll('.','');
    };
    input.addEventListener('input',updateDateLabel);
    input.addEventListener('change',updateDateLabel);
    updateDateLabel();
    dateSlot.appendChild(visualDate);
    dateSlot.appendChild(input);
    const button=doc.createElement('button');
    button.type='button';button.className='gxai-choice';button.textContent='Calcular importe';
    button.addEventListener('click',()=>{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(input.value)||
        input.value<first||input.value>max){
        chatPhase.textContent='Elige una fecha válida hasta 45 días adelante';return;
      }
      panel.remove();
      void accountRead('forecast','Si pago el '+input.value,undefined,input.value);
    });
    // Título arriba; controles alineados abajo. Input nativo flotante dentro
    // de la caja evita el sobreancho intrínseco en Safari sin perder el picker.
    panel.appendChild(label);panel.appendChild(dateSlot);panel.appendChild(button);
    scroll.appendChild(panel);scroll.scrollTop=scroll.scrollHeight;
  }
  function choiceAction(button) {
    if (!active || busy || !authenticated()) return;
    const type = button.dataset.kind;
    const platform = button.dataset.platform;
    const index = Number(button.dataset.issueIndex);
    if(type==='conversation-reply'&&dialogue){handleText(button.textContent.trim());return;}
    if(type==='diagnosis-reply'&&diagnosis){handleText(button.textContent.trim());return;}
    if(type==='diagnosis-image'&&visionReady){toggleTools(false);gallery?.click();return;}
    if (type === 'unresolved') {
      const guide=lastGuide && knowledge.guide(lastGuide.platform,lastGuide.issueIndex);
      if(needsHumanAuthorization(guide)){
        respondFree('La guía no resolvió mi problema',
          'Esa vinculación requiere una autorización de GOXION. Ya revisaste la guía: lo siguiente es contactar a un asesor, sin compartir el código aquí.',
          [{kind:'human',label:'Contactar asesor'},
           {kind:'issues',platform:lastGuide.platform,label:'Otra solución'}]);
        return;
      }
      const platform=button.dataset.platform||chosenPlatform;
      if(platform && knowledge.platforms().includes(platform))
        void escalateAutomatically('Ya seguí los pasos disponibles de '+platform+' pero el problema continúa. ¿Qué puedo revisar después?',platform,lastGuide?.issueIndex);
      return;
    }
    if(type==='device'){
      recordDevice('Estoy en '+button.dataset.device,button.dataset.device);
      return;
    }
    if(type==='handoff-service'){
      const selected=Number(button.dataset.serviceIndex);
      if(Number.isInteger(selected))humanHandoff(selected);
      return;
    }
    if(type==='send-handoff'){openHandoff();return;}
    if(type==='cancel-handoff'){
      pendingHandoff=null;
      bubble('De acuerdo. No se abrió WhatsApp ni se compartió el caso.',false);
      showChoices([{kind:'platforms',label:'Volver al soporte'}]);return;
    }
    if(type==='confirm-vix'){
      chosenPlatform='ViX';accessStage=null;
      respondFree('ViX','Perfecto. ¿Qué problema tienes al entrar a ViX?',
        [{kind:'issues',platform:'ViX',label:'Ver soluciones de ViX'}]);return;
    }
    if(type==='premium-email' || type==='premium-qr'){
      const answer=type==='premium-email'?'Sí, puedo iniciar con correo y contraseña':'Solamente aparece un código QR';
      if(helpWithAccess(answer))return;
    }
    if(type==='open-service'){
      const idx=Number(button.dataset.serviceIndex);
      const view=button.dataset.view;
      if(Number.isInteger(idx)&&accessRouter?.navigate(idx,view,chosenPlatform,doc))closeChat();
      return;
    }
    if(type==='mine'){showPlatforms();return;}
    if (type === 'other') { showOtherPlatforms(); return; }
    if (type === 'human') { humanHandoff(); return; }
    if (type === 'missions' || type==='promotions' || type==='payment'){
      if(refined)clearSupportContext();
      void accountRead(type==='missions'?'missions':type==='promotions'?'promotions':'payment',
        type==='missions'?'Mis misiones':type==='promotions'?'Promociones activas':'Mi próximo pago');
      return;
    }
    if (type === 'account') { closeChat(); window.switchTab?.('inicio'); return; }
    if (type === 'catalog') { closeChat(); window.switchTab?.('catalogo'); return; }
    if (type === 'pay-open') { closeChat(); window.irAlTicket?.(); return; }
    if(type==='policy-doc'||type==='terms-open'&&refined&&window.GOXY_POLICY_V2){
      const view=type==='policy-doc'?button.dataset.view:'terminos';
      if(!['terminos','referidos','cupones'].includes(view))return;
      closeChat();
      window.GOXION_LEGAL_V2?.openDocument(view);
      return;
    }
    if(type==='policy-extension'){void accountRead('extension','Comprobar mi prórroga');return;}
    if(type==='policy-loyalty'){void accountRead('loyalty','Consultar mi nivel');return;}
    if(type==='policy-support'){closeChat();const button=doc.querySelector('#view-soporte .gx-support-human button');button?.scrollIntoView({block:'center',behavior:reducedMotion()?'instant':'smooth'});button?.focus({preventScroll:true});return;}
    if (type === 'terms-open') { closeChat(); window.openModal?.('modal-garantia'); return; }
    if (type === 'extend-open') {
      closeChat();window.switchTab?.('inicio');
      // Solo se abre el control oficial y únicamente si aún está visible.
      setTimeout(()=>doc.querySelector('.gx-prorroga-entry')?.click(),160);
      return;
    }
    if (type === 'forecast-date') {showForecastDate();return;}
    if (type === 'forecast-check' && button.dataset.date){
      void accountRead('forecast','Si pago el '+button.dataset.date,undefined,button.dataset.date);
      return;
    }
    if (type === 'pay-next' || type === 'pay-all' || type === 'pay-one' || type === 'pay-platform') {
      void accountRead('payment',type==='pay-next'?'Mi próximo vencimiento':
        type==='pay-all'?'Todo lo pendiente':'Pago de este perfil',
        type==='pay-next'?'next':type==='pay-one'?'one':type==='pay-platform'?'platform':'all',
        type==='pay-one'?button.dataset.chargeId:type==='pay-platform'?platform:null);
      return;
    }
    if (type === 'platforms') {
      if(refined)clearSupportContext();else chosenPlatform = null;
      runDemo({prompt:'Ver plataformas',step:'searching',
        response:'Elige tu plataforma para consultar las soluciones disponibles.',finish:'happy'},null,showPlatforms);
    } else if (type === 'platform' && knowledge.platforms().includes(platform)) {
      if(accessStage?.type==='pick'){
        const mode=accessStage.what;accessStage=null;chosenPlatform=platform;
        const route=accessRouter.routes(platform,mode);
        respondFree('Consultar '+platform,route.reply,route.options);return;
      }
      if(chosenPlatform!==platform){if(refined)clearSupportContext(platform);else resetConversation();}
      chosenPlatform = platform;
      awaitingSymptom = true;
      chosenGuide = null;
      lastGuide = null;
      aiMode = false;
      const openIssues=()=>runDemo({prompt:platform,step:'searching',
        response:'Estas son las situaciones de soporte registradas para '+platform+':',finish:'happy'},null,()=>showIssues(platform));
      if(vision?.isMirrorPilot?.()&&!pilotDenied&&incidents&&incidentLast!==platform){
        incidentLast=platform;void readIncident(platform,{platform,explicit:false},openIssues);return;
      }
      openIssues();
    } else if (type === 'issues' && knowledge.platforms().includes(platform)) {
      chosenPlatform = platform;
      runDemo({prompt:'Ver otras situaciones',step:'searching',
        response:'¿Qué situación necesitas revisar de '+platform+'?',finish:'happy'},null,()=>showIssues(platform));
    } else if (type === 'issue' && knowledge.platforms().includes(platform) &&
               Number.isInteger(index) && index >= 0) {
      showGuide(platform,index);
    }
  }


  // Goxy tipo Tamagotchi: un toque provoca gestos, una caricia genera corazones.
  // La ventana del chat SOLO se abre mediante el botón «Hablar con Goxy».
  const pet = { id: null, startX: 0, startY: 0, lastX: 0, lastY: 0, distance: 0, stroking: false, scrolling: false, lastHeart: 0, taps: 0 };
  function makeHeart() {
    if (reducedMotion() || reactionLayer.childElementCount >= 9) return;
    const heart = doc.createElement('span');
    const offset = (pet.taps + reactionLayer.childElementCount) % 5;
    heart.className = 'gxai-heart';
    heart.textContent = '♥';
    heart.style.setProperty('--gxai-drift', String((offset - 2) * 24) + 'px');
    heart.style.left = String(38 + offset * 6) + '%';
    reactionLayer.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove(), { once: true });
    setTimeout(() => heart.remove(), 1500);
  }
  function playfulTap() {
    if (!authenticated()) return;
    // Usar siete estados NATIVOS y distintos de robot-heads.
    // Antes wink→happy y surprised→listening podían parecer el mismo gesto.
    // Orden rotativo sin repetición consecutiva: cada toque revela otro comportamiento.
    const gestures = [
      { state: 'happy', text: 'Goxy se alegró de verte' },
      { state: 'searching', text: 'Goxy mira a su alrededor' },
      { state: 'listening', text: 'Goxy te presta atención' },
      { state: 'working', text: 'Goxy está muy concentrado' },
      { state: 'thinking', text: 'Goxy tiene una idea' },
      { state: 'speaking', text: 'Goxy te saluda' },
      { state: 'sleeping', text: 'Shhh… Goxy está dormitando' }
    ];
    const gesture = gestures[pet.taps++ % gestures.length];
    mood(gesture.state, gesture.state === 'sleeping' ? 2700 : 2100);
    petStatus.textContent = gesture.text;
  }
  // robot-heads integra poke() en su propio click. Lo detenemos durante
  // la captura para evitar que siempre sobreescriba los gestos con "happy".
  // Pointer Events maneja toques/caricias; activación por teclado continúa.
  heroTrigger.addEventListener('click', (event) => {
    if (event.detail > 0 && event.target !== heroTrigger) event.stopPropagation();
  }, { capture: true });

  heroTrigger.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || !authenticated()) return;
    pet.id = event.pointerId;
    pet.startX = pet.lastX = event.clientX;
    pet.startY = pet.lastY = event.clientY;
    pet.distance = 0; pet.stroking = false; pet.scrolling = false; pet.lastHeart = 0;
    // iOS: no capturar ni cancelar pointerdown. Safari debe conservar pan-y.
    // La caricia se reconoce solo después de una intención HORIZONTAL clara.
  });
  heroTrigger.addEventListener('pointermove', (event) => {
    if (pet.id !== event.pointerId) return;
    if (pet.scrolling) return;
    const dx = event.clientX - pet.startX;
    const dy = event.clientY - pet.startY;
    pet.lastX = event.clientX; pet.lastY = event.clientY;
    // Los arrastres verticales pertenecen al scroll, incluso sobre la cabeza.
    // Hasta distinguir la dirección no consumimos el gesto.
    if (!pet.stroking && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.15) {
      pet.scrolling = true;
      return;
    }
    // El recorrido horizontal, no el diagonal o vertical, activa el cariño.
    if (!pet.stroking && Math.abs(dx) >= 24 && Math.abs(dx) >= Math.abs(dy) * 1.2) {
      pet.stroking = true;
    }
    if (!pet.stroking) return;
    const now = performance.now();
    if (now - pet.lastHeart > 230) {
      pet.lastHeart = now;
      mood('love', 1100);
      makeHeart();
      petStatus.textContent = '¡A Goxy le encantan las caricias!';
    }
  });
  heroTrigger.addEventListener('pointerup', (event) => {
    if (pet.id !== event.pointerId) return;
    // Si Safari solo envió el último evento, clasificar dirección antes de actuar.
    const dx = event.clientX - pet.startX;
    const dy = event.clientY - pet.startY;
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.15) pet.scrolling = true;
    if (!pet.scrolling && !pet.stroking && Math.abs(dx) >= 24 && Math.abs(dx) >= Math.abs(dy) * 1.2) pet.stroking = true;
    if (pet.scrolling) {
      pet.id = null; pet.stroking = false; pet.scrolling = false;
      return;
    }
    if (pet.stroking) {
      mood('love', 2400);
      makeHeart();
      petStatus.textContent = '¡Goxy te manda mucho cariño!';
    } else if (Math.hypot(dx, dy) < 16) {
      playfulTap();
    }
    pet.id = null; pet.stroking = false; pet.scrolling = false;
  });
  heroTrigger.addEventListener('pointercancel', () => {
    pet.id = null; pet.stroking = false; pet.scrolling = false;
    // En scroll nativo, Safari dispara pointercancel: no impedir el movimiento.
    mood(active ? 'listening' : 'idle');
  });
  // Eventos click sintetizados por teclado: no abrir el chat, también hacen gestos.
  heroTrigger.addEventListener('click', (event) => {
    event.preventDefault();
    if (event.detail === 0) playfulTap();
  });
  openButton.addEventListener('click', openChat);
  // No hay interruptor de IA para el cliente: el enrutador decide localmente
  // cuándo una aclaración del modelo realmente aporta valor.
  closeButton.addEventListener('click', () => closeChat(true));
  layer.querySelector('.gxai-backdrop').addEventListener('click', closeChat);
  layer.addEventListener('click', event => {
    const chosen = event.target.closest?.('.gxai-choice');
    if (chosen) { choiceAction(chosen); return; }
    const button = event.target.closest?.('.gxai-suggestion');
    if (!active || !button) return;
    const entry = questions[button.dataset.prompt];
    if (!entry || busy) return;
    if(refined){if(pendingAI)cancelFlow();clearSupportContext();}
    // Los accesos a guías mantienen el recorrido manual aprobado.
    aiEntry = false;
    if (button.dataset.prompt === 'acceso' || button.dataset.prompt === 'codigo') {
      runDemo(entry,null,showPlatforms);
    } else if(button.dataset.prompt === 'cuenta'){
      respondFree('Quiero consultar mi cuenta',
        'Puedo mostrarte los próximos vencimientos, los pagos por perfil y el saldo confirmado. También reviso tus misiones y promociones.',
        [{kind:'payment',label:'Próximo pago'},{kind:'missions',label:'Mis misiones'},
         {kind:'promotions',label:'Promociones'},{kind:'account',label:'Abrir Mi Espacio'}]);
    } else if(button.dataset.prompt==='misiones'||button.dataset.prompt==='promociones'){
      void accountRead(button.dataset.prompt==='misiones'?'missions':'promotions',entry.prompt);
    } else runDemo(entry);
  });
  // Mensajes libres: guías reales de soporte, sin consultar cuentas ni red.
  async function analyzeImage(query){
    if(!active||busy||!authenticated()||!imageDraft||!(imageDraft.example?exampleImage:visionReady))return;
    const example=imageDraft.example===true;
    const testOnly=visionTestOnly;
    if(!example&&(query.length>240||/[<>]/.test(query)||/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[\s.-]?){9,16}\b|\b\d{4,8}\b/iu.test(query))){renderAttachment('Describe el problema sin correos, números privados, PIN ni códigos (máximo 240 caracteres).');return;}
    if(!window.confirm(example?'¿Enviar esta captura ficticia a Groq para comprobar el análisis visual?':testOnly?(vision.isMirrorPilot?.()?'Piloto de prueba: utiliza únicamente una captura sin datos de clientes, correos, contraseñas, PIN, QR ni códigos. Se enviará a Groq, que puede conservarla excepcionalmente hasta 30 días. ¿Confirmas que está libre de datos privados y autorizas enviarla?':'Prueba aislada: confirma que la captura no contiene datos personales, contraseñas, PIN ni códigos. Se enviará a Groq, que puede conservarla excepcionalmente hasta 30 días. ¿Autorizas el envío?'):'¿Confirmas que la imagen no contiene información privada, contraseñas, PIN ni códigos y autorizas enviarla a Groq para analizarla?'))return;
    if(pendingAI)cancelFlow();
    const image=imageDraft.data;clearImage();messageInput.value='';syncSend();
    clearChoices();const sent=bubble(example?'Analiza esta captura de prueba':query||'Analiza esta imagen',true);
    {const img=doc.createElement('img');img.src=image;img.alt=example?'Captura ficticia de Netflix':'Imagen adjunta';img.style.cssText='display:block;width:100%;max-width:240px;max-height:240px;object-fit:contain;border-radius:12px;margin-top:8px';sent.append(img);scroll.scrollTop=scroll.scrollHeight;}
    setBusy(true);chatTransition('thinking');chatPhase.textContent='Analizando tu imagen…';showTyping();
    const flow=++activeFlow,identity=String(window.getCurrentClientKey?.()||'');
    aiController=new AbortController();
    const visualPrompt=vision.isMirrorPilot?.()&&chosenPlatform&&knowledge.platforms().includes(chosenPlatform)?('Ayuda con '+chosenPlatform+'. '+query).slice(0,240):query;
    const reply=await (example?vision.example(aiController.signal):vision.analyze(image,visualPrompt,aiController.signal,testOnly));
    if(!active||flow!==activeFlow||!authenticated()||identity!==String(window.getCurrentClientKey?.()||''))return;
    aiController=null;hideTyping();setBusy(false);
    let diagnosed=false;
    if(reply.ok&&typeof reply.answer==='string'){
      chatTransition('speaking');
      if(diagnosis){const known=chosenPlatform;clearSupportContext();const decision=diagnosis.fromVision(vision.isMirrorPilot?.()&&reply.diagnosis&&!reply.diagnosis.platform&&known?{...reply.diagnosis,platform:known}:reply.diagnosis);if(decision){if(!decision.answer){const answer=bubble(reply.answer,false);answer.classList.add('gxai-ai-answer');rateResponse(answer,'vision','support');}diagnosed=applyDiagnosis(decision);if(!decision.answer)keepTurn('Se analizó una imagen del problema.',reply.answer);}}
      if(!diagnosed){const answer=bubble(reply.answer,false);answer.classList.add('gxai-ai-answer');rateResponse(answer,'vision','support');}
    }
    else if(reply.code!=='ABORTED'){chatTransition('error');bubble(reply.code==='RATE_LIMIT'?'La cuota de IA requiere una pausa. Puedes intentar de nuevo cuando esté disponible.':reply.code==='INVALID_IMAGE'?'No pude validar la imagen o el texto. Prueba con una captura JPG o PNG sin información privada.':reply.code==='VISION_DISABLED'?'El análisis no está autorizado para esta sesión.':'No pude analizar la imagen ahora. Puedes describir la falla o acudir a nuestro equipo.',false);}
    if(diagnosed){/* diagnosis engine already supplied the next steps */}
    else if(example&&reply.ok){clearSupportContext('Netflix');showChoices([{kind:'issue',platform:'Netflix',issueIndex:1,label:'Ver guía de actualización de hogar'},{kind:'policy-support',label:'Ir a atención humana'}]);}
    else showChoices([{kind:'platforms',label:'Consultar guías de soporte'},{kind:'policy-support',label:'Ir a atención humana'}]);
    later(flow,400,()=>chatTransition('listening'));
  }
  composer.addEventListener('submit', event => {
    event.preventDefault();
    if (!active || busy || !authenticated()) return;
    const text = messageInput.value.trim();
    if(imageDraft){if(imageDraft.example?exampleImage:visionReady)void analyzeImage(text);return;}
    if(preparingImage||!text)return;
    messageInput.value = '';
    if(refined){syncSend();}
    if(pendingAI&&refined&&(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)||/^(?:\d[\s-]?){4,16}$/.test(text))){
      bubble('Por seguridad, no compartas correos, PIN ni códigos en este chat.',false);return;
    }
    if(pendingAI){
      // Consultas gratuitas y cambio de plataforma siguen disponibles sin esperar IA.
      const local=knowledge.normalize(text);
      const route=contextualRoute(text);
      if((vision?.isMirrorPilot?.()&&!pilotDenied&&incidents&&(incidents.request(text,chosenPlatform,route?.kind)?.explicit||incidents.photoOffer(text,route?.brand||chosenPlatform)))||(route&&['thanks','resolved','farewell','ack','human','multiple','brand','device'].includes(route.kind))||(refined&&window.GOXY_POLICY_V2?.reply(text))||accountTopic(text) ||
        /\b(contrasena|password|clave de acceso|clave de inicio)\b/.test(local) ||
        (/\b(contrato|contratar|cotizar|cuanto cuesta|cuanto pagaria|precio|costo|mensual)\b/.test(local)&&knowledge.resolvePlatform(text)) ||
        /^(hola(?: goxy)?|que puedes hacer|que puedo hacer|que haces|buenos dias|buenas tardes|buenas noches)$/.test(local) ||
         (knowledge.resolvePlatform(text) &&
         knowledge.resolvePlatform(text)!==pendingAI.chosen?.platform)){
        cancelFlow();
        handleText(text);
        return;
      }
      bubble(text.slice(0,240),true);
      pendingAI.text=text;
      chatPhase.textContent='Recibí tu última pregunta; esperando el turno de IA…';
      return;
    }
    handleText(text);
  });
  messageInput.addEventListener('input', () => {
    syncSend();
    if (active && !busy && !pendingAI && authenticated()) chatTransition('listening');
  });
  doc.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); closeChat(true); return; }
    if (event.key !== 'Tab') return;
    const focusables = refined ? [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el=>el.tabIndex>=0&&el.getClientRects().length>0&&!el.closest('[hidden],[aria-hidden="true"]')) : [...dialog.querySelectorAll('button:not([disabled])')];
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length-1];
    if (event.shiftKey && (doc.activeElement === first || doc.activeElement === dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || doc.activeElement === dialog)) {
      event.preventDefault(); first.focus();
    }
  });
  doc.querySelectorAll('[data-goxion-tab]').forEach(btn => {
    if (btn.dataset.goxionTab !== 'soporte') btn.addEventListener('click', closeChat);
  });
  window.addEventListener('pagehide', closeChat);
  // Interfaz local para navegación y pruebas sin exponer APIs financieras.
  window.GOXION_AI_BETA = Object.freeze({
    chatState: () => chatState,
    // Mismo contrato de eventos que utilizará el futuro orquestador, sin API.
    chatEvent: (state) => { if (authenticated() && phases[state] && !busy) chatTransition(state); },
    expression: (state) => {
      if (['idle','happy','thinking','searching','listening','speaking','working','sleeping','error','wink','surprised','love'].includes(state)) mood(state, state === 'idle' ? 0 : 1600);
    },
    close: closeChat,
    open: openChat,
    renderer: 'robot-heads@0.3.0',
    aiConfigured: () => aiConfigured,
    aiMode: () => aiMode,
    aiEntry: () => aiEntry,
    awaitingSymptom: () => awaitingSymptom,
    aiStatus: () => aiPanel.getAttribute('data-ai-status'),
    contractedPlatforms: () => [...myPlatforms],
    aiQueued: () => Boolean(pendingAI)
  });
})();
