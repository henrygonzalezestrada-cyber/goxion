/* GOXION · Goxy F12 · recuperación de acceso y ficha WhatsApp consentida.
   Vive únicamente en preview/goxion-ai/. No usa API, no escribe datos ni envía mensajes.
   Render original MIT © Fayaz Ahmed empaquetado en goxy-heads.bundle.js.
   Mantiene controles y lógica F2 sin tocar la IA ni datos del cliente. */
(() => {
  'use strict';
  const doc = document;
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
    '<div class="gxai-kicker">CONOCE A GOXY · TU ASISTENTE</div>',
    '<button class="gxai-mascot-button" type="button" aria-label="Juega con Goxy: tócalo o desliza tu dedo para acariciarlo">',
    svg,
    '<span class="gxai-reactions" aria-hidden="true"></span>',
    '</button>',
    '<div class="gxai-touch-hint">Tócalo o acarícialo de lado a lado</div>',
    '<span class="gxai-pet-status" role="status" aria-live="polite"></span>',
    '<h2 class="gxai-title">¿Necesitas <span>ayuda?</span></h2>',
    '<p class="gxai-desc">¿Tienes algún problema con tus plataformas o algo que te gustaría saber? Estoy aquí para ayudarte.</p>',
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
    '<span class="gxai-heading"><strong id="gxai-chat-title">Goxy · Asistente GOXION</strong>',
    '<small class="gxai-chat-phase" role="status" aria-live="polite">Listo para escucharte</small></span>',
    '<button class="gxai-close" type="button" aria-label="Cerrar chat">×</button>',
    '</header>',
    '<div class="gxai-chat-scroll" role="log" aria-live="polite">',
    '<div class="gxai-beta-note">GOXY · IA CON SOPORTE REAL</div>',
    '<div class="gxai-bubble">¡Hola! Soy Goxy. 🤖 Cuéntame qué necesitas: revisar misiones, promociones o solucionar un problema con tus plataformas. Si hace falta, buscaré una explicación adicional automáticamente. Nunca compartas contraseñas, códigos ni PIN aquí.</div>',
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
    '<form class="gxai-composer" aria-label="Conversación de demostración">',
    '<input class="gxai-message-input" type="text" placeholder="Cuéntame qué problema tienes…" aria-label="Mensaje de prueba" autocomplete="off" maxlength="240">',
    '<button class="gxai-send" type="submit" aria-label="Enviar mensaje de prueba">',
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-8-4 16-3-6-7-2Zm7 2 7-10"/></svg>',
    '</button>',
    '</form>',
    '<div class="gxai-chat-disclaimer">Guías oficiales GOXION · IA beta pendiente de configuración. Sin datos privados.</div>',
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
  let interactionTimer = null, requestId = 0;
  let activeFlow = 0;
  const flowTimers = new Set();
  let busy = false;
  let typing = null;
  let chatState = 'idle';
  let prevOverflowHtml = '', prevOverflowBody = '', previousFocus = null;
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
    typing.setAttribute('aria-label', 'Goxy está procesando la demostración');
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
    messageInput.disabled = value;
    sendButton.disabled = value;
    suggestions.forEach(button => { button.disabled = value; });
  }
  function cancelFlow() {
    activeFlow++;
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
      const childH = Number(window.visualViewport?.height) || layoutH;
      const viewH = Math.max(180, Math.min(layoutH, Math.round(viewport.height), Math.round(childH)));
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
  function openChat() {
    if (active || !authenticated()) {
      if (!authenticated()) window.openAuthSheet?.();
      return;
    }
    previousFocus = doc.activeElement;
    active = true; requestId++;
    cancelFlow();
    aiConfigured = false;
    aiMode = false;
    aiEntry = false;
    awaitingSymptom = false;
    lastGuide = null;
    accessStage = null;
    caseContext = null;
    pendingHandoff = null;
    resetConversation();
    setAIStatus('checking', 'Verificando el servicio de IA con tu sesión de Mi Espacio.');
    const statusId = requestId;
    refreshMyPlatforms();
    ai.status().then(state => {
      if (!active || statusId !== requestId) return;
      aiConfigured = state.ok===true && state.configured===true && state.providerReady===true;
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
  function closeChat() {
    if (!active) return;
    active = false; requestId++;
    cancelFlow();
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
    resetConversation();
    chatState = 'idle';
    chatPhase.textContent = phases.idle.label;
    layer.setAttribute('data-chat-state','idle');
    layer.classList.remove('gxai-visible','gxai-keyboard-open');
    layer.style.setProperty('--gxai-viewport-height','100dvh');
    layer.style.setProperty('--gxai-viewport-top','0px');
    layer.setAttribute('aria-hidden', 'true');
    doc.documentElement.style.overflow = prevOverflowHtml;
    doc.body.style.overflow = prevOverflowBody;
    mood('idle');
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  }
  function bubble(text, fromMe) {
    const node = doc.createElement('div');
    node.className = 'gxai-bubble' + (fromMe ? ' gxai-me' : '');
    node.textContent = text;
    scroll.appendChild(node);
    scroll.scrollTop = scroll.scrollHeight;
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
    later(flowId, 220, () => chatTransition(entry.step || 'working'));
    later(flowId, 680, () => {
      hideTyping();
      if (entry.finish !== 'error') chatTransition('speaking');
      else chatTransition('error');
      bubble(entry.response, false);
    });
    later(flowId, 1050, () => {
      if (entry.finish === 'happy') chatTransition('happy');
      else chatTransition('error');
    });
    later(flowId, 1330, () => {
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
      choices.appendChild(button);
    });
    scroll.appendChild(choices);
    scroll.scrollTop = scroll.scrollHeight;
  }
  const choosePlatformOptions = names => names.map(platform =>
    ({kind:'platform',platform,label:platform}));
  function showPlatforms() {
    chosenGuide = null;
    aiMode = false;
    awaitingSymptom = false;
    lastGuide = null;
    messageInput.placeholder = 'Cuéntame qué problema tienes…';
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
  function showGuide(platform, index) {
    aiEntry = false;
    const guide = knowledge.guide(platform,index);
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
    const answer = 'Guía GOXION · '+platform+'\n'+guide.issue+'\n\n'+
      guide.instructions+'\n\n'+(guide.requiresHuman
      ? 'Para códigos, correos de autorización o revisiones de cuenta, continúa con un asesor humano. No compartas esos datos en este chat.'
      : 'Si todavía necesitas ayuda, puedes hablar con un asesor.');
    runDemo({prompt:guide.issue,step:'searching',response:answer,finish:'happy'},
      null,()=>showChoices([
        {kind:'unresolved',platform,label:'Ya intenté esto y sigo con el problema'},
        {kind:'issues',platform,label:'Otra situación de '+platform},
        {kind:'human',label:'Hablar con asesor humano'},
        {kind:'platforms',label:'Cambiar plataforma'}
      ]));
  }

  // IA F7: solo se consulta el backend si el usuario seleccionó una guía
  // canónica. Nunca enviar fichas cliente, PIN ni valores de Mi Espacio.
  async function askAI(query) {
    if (!active || busy || !authenticated() || !chosenGuide) return;
    const text=String(query||'').trim();
    if (!text || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[\s.-]?){9,16}\b|\b\d{4,8}\b/iu.test(text)) {
      bubble('Por seguridad no compartas correos, códigos, PIN o datos personales. Describe solamente la falla.',false);
      chatTransition('error');
      return;
    }
    clearChoices();
    bubble(text.slice(0,240),true);
    setBusy(true);
    chatTransition('thinking');
    showTyping();
    const current=++activeFlow;
    aiController=new AbortController();
    const chosen={...chosenGuide};
    const reply=await ai.ask({message:text,...chosen,history:[...conversation],signal:aiController.signal});
    if(!active || current!==activeFlow || !authenticated())return;
    aiController=null;
    hideTyping();
    if(reply.ok && typeof reply.answer==='string'){
      chatTransition('speaking');
      bubble(reply.answer,false);
      keepTurn(text,reply.answer);
      if(Number.isInteger(reply.remaining)){
        disclaimer.textContent = 'Te quedan '+reply.remaining+
          ' consultas IA de tu cupo móvil de 24 h · Nunca compartas códigos ni PIN.';
      }
      later(current,950,()=>chatTransition('happy'));
    }else if(reply.code!=='ABORTED'){
      chatTransition('error');
      bubble(reply.message||'Goxy no puede conectarse con la IA todavía. La guía oficial y el asesor siguen disponibles.',false);
      if(reply.code==='AI_NOT_CONFIGURED') {
        aiConfigured=false;
        aiMode=false;
        setAIStatus('pending','Falta configurar la clave privada de Groq en Supabase. Las guías permanecen disponibles.');
      }
    }
    later(current,1700,()=>{
      setBusy(false);
      chatTransition('listening');
      showChoices([
        {kind:'human',label:'Hablar con asesor humano'},
        {kind:'issues',platform:chosen.platform,label:'Ver otras soluciones'}
      ]);
    });
  }
  // Datos personales SOLO con el backend autenticado de GOXION.
  // El resultado se presenta al usuario sin enviarse al modelo de Groq.
  async function accountRead(topic,query) {
    if(!active || busy || !authenticated())return;
    const text=String(query||'').trim();
    clearChoices();
    bubble(text.slice(0,240),true);
    setBusy(true);
    chatTransition('searching');
    showTyping();
    const flow=++activeFlow;
    aiController=new AbortController();
    const response=await ai.account(topic,{signal:aiController.signal,message:text});
    if(!active || flow!==activeFlow || !authenticated())return;
    aiController=null;
    hideTyping();
    if(response.ok===true && typeof response.answer==='string'){
      chatTransition('speaking');
      bubble(response.answer,false);
    }else if(response.code!=='ABORTED'){
      chatTransition('error');
      bubble(response.message||'No pude comprobar ese dato ahora. Consulta Mi Espacio para información oficial.',false);
    }
    later(flow,350,()=>{
      setBusy(false);
      chatTransition('listening');
      showChoices([
        {kind:'account',label:'Abrir Mi Espacio'},
        ...(topic==='missions'
          ? [{kind:'promotions',label:'Ver promociones'}]
          : topic==='promotions' ? [{kind:'missions',label:'Mis misiones'}] : [
            {kind:'missions',label:'Mis misiones'},
            {kind:'promotions',label:'Promociones'}]),
        {kind:'platforms',label:'Ayuda con mis servicios'}
      ]);
    });
  }
  function respondFree(text,reply,options=[]) {
    if(!active || busy || !authenticated())return;
    clearChoices();bubble(text.slice(0,240),true);bubble(reply,false);
    chatTransition('speaking');
    if(options.length)showChoices(options);
    const id=++activeFlow;
    later(id,250,()=>chatTransition('listening'));
  }
  function accountTopic(text){
    const normal=knowledge.normalize(text);
    if(/\b(mision(?:es)?|tareas?|retos?|cupon(?:es)?)\b/.test(normal))return 'missions';
    if(/\b(promocion(?:es)?|ofertas?|descuentos? especiales?)\b/.test(normal))return 'promotions';
    if(/\b(pago|pagar|saldo|corte|vencimient[oa]|fecha de pago|estado de cuenta|mora|prorroga|cuanto debo|cuanto voy a pagar|lealtad)\b/.test(normal))return 'payment';
    return null;
  }
  // F11: clasificador LOCAL. Decidir no requiere otra llamada a Groq.
  // Solo escalar cuando hay plataforma, síntomas suficientes y ninguna
  // acción bloqueada por control humano. La cuota se consume únicamente
  // dentro de askAI(), no en la clasificación ni en las guías.
  function isVague(text) {
    const words=knowledge.normalize(text);
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
  function escalateAutomatically(query,platform,issueIndex) {
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
  function handleText(query) {
    // La información que ya administra GOXION y los saludos no consumen IA.
    const words = knowledge.normalize(query);
    if(helpWithAccess(query))return;
    const topic=accountTopic(query);
    if(topic){ void accountRead(topic,query); return; }
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
      aiMode=false;awaitingSymptom=false;lastGuide=null;chosenGuide=null;
      resetConversation();
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
      const failed=/\b(ya|hice|intente|probe|sigue|todavia|aun|no sirvio|no resolvio|no funciona|mismo problema)\b/.test(words);
      if(samePlatform && lastGuide && failed){
        escalateAutomatically(query,target,lastGuide.issueIndex);
        return;
      }
      if (index !== null && !aiMode) {showGuide(target,index);return;}
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
          'Para poder ayudarte necesito un detalle más: ¿qué ves en la pantalla y en qué momento sucede?',
          [{kind:'issues',platform:target,label:'Ver guías disponibles'}]);
        return;
      }
      escalateAutomatically(query,target,samePlatform?lastGuide?.issueIndex:undefined);
      return;
    }
    // Sin plataforma elegida, no consumir IA intentando adivinarla.
    runDemo(questions.libre,query,showPlatforms);
  }
  function humanHandoff() {
    if(!active||!authenticated())return;
    pendingHandoff=null;
    if(!chosenPlatform){
      respondFree('Necesito un asesor','Para preparar tu solicitud necesito saber primero cuál de tus plataformas tiene el problema.',
        [{kind:'platforms',label:'Elegir plataforma'}]);
      return;
    }
    const guide=lastGuide?knowledge.guide(lastGuide.platform,lastGuide.issueIndex):null;
    const details=caseContext||{
      issue:guide?.issue||'Problema de acceso o reproducción',
      checks:guide?['Guía de soporte consultada','Se requiere intervención de asesor']:['Se solicita revisión de soporte']
    };
    const ticket=handoff?.prepare(chosenPlatform,details);
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
    const current=clientContext.supportReference?.(pendingHandoff.platform);
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
  function choiceAction(button) {
    if (!active || busy || !authenticated()) return;
    const type = button.dataset.kind;
    const platform = button.dataset.platform;
    const index = Number(button.dataset.issueIndex);
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
      void accountRead(type==='missions'?'missions':type==='promotions'?'promotions':'payment',
        type==='missions'?'Mis misiones':type==='promotions'?'Promociones activas':'Mi próximo pago');
      return;
    }
    if (type === 'account') { closeChat(); window.switchTab?.('inicio'); return; }
    if (type === 'platforms') {
      chosenPlatform = null;
      runDemo({prompt:'Ver plataformas',step:'searching',
        response:'Elige tu plataforma para consultar las soluciones disponibles.',finish:'happy'},null,showPlatforms);
    } else if (type === 'platform' && knowledge.platforms().includes(platform)) {
      if(accessStage?.type==='pick'){
        const mode=accessStage.what;accessStage=null;chosenPlatform=platform;
        const route=accessRouter.routes(platform,mode);
        respondFree('Consultar '+platform,route.reply,route.options);return;
      }
      if(chosenPlatform!==platform)resetConversation();
      chosenPlatform = platform;
      awaitingSymptom = true;
      chosenGuide = null;
      lastGuide = null;
      aiMode = false;
      runDemo({prompt:platform,step:'searching',
        response:'Estas son las situaciones de soporte registradas para '+platform+':',finish:'happy'},null,()=>showIssues(platform));
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
  closeButton.addEventListener('click', closeChat);
  layer.querySelector('.gxai-backdrop').addEventListener('click', closeChat);
  layer.addEventListener('click', event => {
    const chosen = event.target.closest?.('.gxai-choice');
    if (chosen) { choiceAction(chosen); return; }
    const button = event.target.closest?.('.gxai-suggestion');
    if (!active || !button) return;
    const entry = questions[button.dataset.prompt];
    if (!entry) return;
    // Los accesos a guías mantienen el recorrido manual aprobado.
    aiEntry = false;
    if (button.dataset.prompt === 'acceso' || button.dataset.prompt === 'codigo') {
      runDemo(entry,null,showPlatforms);
    } else if(button.dataset.prompt === 'cuenta'){
      respondFree('Quiero consultar mi cuenta',
        'Puedo consultar tus misiones y las promociones publicadas. Para importes y fechas exactas, utiliza el estado de cuenta oficial porque contempla varios vencimientos, mora y prórrogas.',
        [{kind:'payment',label:'Próximo pago'},{kind:'missions',label:'Mis misiones'},
         {kind:'promotions',label:'Promociones'},{kind:'account',label:'Abrir Mi Espacio'}]);
    } else if(button.dataset.prompt==='misiones'||button.dataset.prompt==='promociones'){
      void accountRead(button.dataset.prompt==='misiones'?'missions':'promotions',entry.prompt);
    } else runDemo(entry);
  });
  // Mensajes libres: guías reales de soporte, sin consultar cuentas ni red.
  composer.addEventListener('submit', event => {
    event.preventDefault();
    if (!active || busy || !authenticated()) return;
    const text = messageInput.value.trim();
    if (!text) return;
    messageInput.value = '';
    handleText(text);
  });
  messageInput.addEventListener('input', () => {
    if (active && !busy && authenticated()) chatTransition('listening');
  });
  doc.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); closeChat(); return; }
    if (event.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll('button:not([disabled])')];
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
  // API local de prueba: cambiar expresión desde consola sin exponer una API financiera.
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
    contractedPlatforms: () => [...myPlatforms]
  });
})();
