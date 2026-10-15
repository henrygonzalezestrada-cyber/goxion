/* GOXION · Goxy F6 · guías de soporte canónicas y gestos con scroll vertical.
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
    '<div class="gxai-touch-hint">Tócalo o acarícialo</div>',
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
    '<div class="gxai-beta-note">FASE 3 · GUÍAS REALES DE SOPORTE</div>',
    '<div class="gxai-bubble">¡Hola! 🤖 Puedo guiarte con las instrucciones oficiales de tus plataformas. Selecciona un tema o escríbeme qué servicio presenta la falla. No compartas contraseñas, códigos ni PIN por aquí.</div>',
    '<div class="gxai-suggestions">',
    '<button type="button" class="gxai-suggestion" data-prompt="acceso">Tengo un problema de acceso</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="cuenta">Quiero consultar mi cuenta</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="codigo">Necesito un código</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="error">Probar un error</button>',
    '</div>',
    '</div>',
    '<footer class="gxai-chat-foot">',
    '<form class="gxai-composer" aria-label="Conversación de demostración">',
    '<input class="gxai-message-input" type="text" placeholder="Escribe para probar el chat…" aria-label="Mensaje de prueba" autocomplete="off" maxlength="240">',
    '<button class="gxai-send" type="submit" aria-label="Enviar mensaje de prueba">',
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-8-4 16-3-6-7-2Zm7 2 7-10"/></svg>',
    '</button>',
    '</form>',
    '<div class="gxai-chat-disclaimer">Guías oficiales GOXION · Sin IA, datos privados ni solicitudes automáticas.</div>',
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
    error:     { label: 'Error de demostración',     face: 'error' }
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
    messageInput.disabled = value;
    sendButton.disabled = value;
    suggestions.forEach(button => { button.disabled = value; });
  }
  function cancelFlow() {
    activeFlow++;
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

  function openChat() {
    if (active || !authenticated()) {
      if (!authenticated()) window.openAuthSheet?.();
      return;
    }
    previousFocus = doc.activeElement;
    active = true; requestId++;
    cancelFlow();
    prevOverflowHtml = doc.documentElement.style.overflow;
    prevOverflowBody = doc.body.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    doc.body.style.overflow = 'hidden';
    layer.classList.add('gxai-visible');
    layer.setAttribute('aria-hidden', 'false');
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
    chatState = 'idle';
    chatPhase.textContent = phases.idle.label;
    layer.setAttribute('data-chat-state','idle');
    layer.classList.remove('gxai-visible');
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
    }
  });
  function runDemo(entry, enteredText, onDone) {
    if (!active || busy || !authenticated()) return;
    const query = String(enteredText || entry.prompt || '').trim();
    if (!query) return;
    bubble(query.slice(0, 240), true);
    setBusy(true);
    chatTransition('thinking');
    showTyping();
    const flowId = ++activeFlow;
    later(flowId, 640, () => chatTransition(entry.step || 'working'));
    later(flowId, 1460, () => {
      hideTyping();
      if (entry.finish !== 'error') chatTransition('speaking');
      else chatTransition('error');
      bubble(entry.response, false);
    });
    later(flowId, 2450, () => {
      if (entry.finish === 'happy') chatTransition('happy');
      else chatTransition('error');
    });
    later(flowId, 3900, () => {
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
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'gxai-choice';
      button.textContent = item.label;
      button.dataset.kind = item.kind;
      if (item.platform) button.dataset.platform = item.platform;
      if (Number.isInteger(item.issueIndex)) button.dataset.issueIndex = String(item.issueIndex);
      choices.appendChild(button);
    });
    scroll.appendChild(choices);
    scroll.scrollTop = scroll.scrollHeight;
  }
  const choosePlatformOptions = () => knowledge.platforms().map(platform =>
    ({kind:'platform',platform,label:platform}));
  function showPlatforms() {
    showChoices(choosePlatformOptions());
  }
  function showIssues(platform) {
    const issues = knowledge.issues(platform);
    showChoices([
      ...issues.map((issue,index)=>({kind:'issue',platform,issueIndex:index,label:issue.issue})),
      {kind:'platforms',label:'Ver otras plataformas'},
      {kind:'human',label:'Hablar con asesor humano'}
    ]);
  }
  function showGuide(platform, index) {
    const guide = knowledge.guide(platform,index);
    if (!guide) {
      runDemo({prompt:'Consultar guía',step:'searching',
        response:'No encontré esa guía actualizada. Puedes elegir otra situación o hablar directamente con un asesor.',
        finish:'error'},null,showPlatforms);
      return;
    }
    chosenPlatform = platform;
    // Las instrucciones proceden EXCLUSIVAMENTE de support-issues.js,
    // convertidas a texto. Nunca incluir correo_login, perfil_pin o credenciales.
    const answer = 'Guía GOXION · '+platform+'\n'+guide.issue+'\n\n'+
      guide.instructions+'\n\n'+(guide.requiresHuman
      ? 'Para códigos, correos de autorización o revisiones de cuenta, continúa con un asesor humano. No compartas esos datos en este chat.'
      : 'Si todavía necesitas ayuda, puedes hablar con un asesor.');
    runDemo({prompt:guide.issue,step:'searching',response:answer,finish:'happy'},
      null,()=>showChoices([
        {kind:'issues',platform,label:'Otra situación de '+platform},
        {kind:'human',label:'Hablar con asesor humano'},
        {kind:'platforms',label:'Cambiar plataforma'}
      ]));
  }
  function handleText(query) {
    const words = knowledge.normalize(query);
    if (/\b(cambiar|otra|elegir|ver)(?: de)? plataformas?\b/.test(words)) {
      chosenPlatform = null;
      runDemo({prompt:query,step:'searching',
        response:'Claro, elige la plataforma que necesitas revisar.',finish:'happy'},query,showPlatforms);
      return;
    }
    const platform = knowledge.resolvePlatform(query);
    if (/\b(asesor|humano|whatsapp|persona)\b/.test(words)) {
      runDemo({prompt:query,step:'working',
        response:'Puedes continuar con el asesor humano de GOXION. Se abrirá el contacto oficial cuando pulses el botón; aquí no se envió ningún mensaje.',
        finish:'happy'},query,()=>showChoices([{kind:'human',label:'Hablar con asesor humano'}]));
      return;
    }
    if (/\b(pago|pagar|deuda|saldo|vencimiento|factura|mora|prorroga|lealtad|cupon)\b/.test(words) && !platform) {
      runDemo(questions.cuenta,query,()=>showChoices([
        {kind:'account',label:'Ir a Mi Espacio'}, {kind:'platforms',label:'Buscar ayuda de plataformas'}
      ]));
      return;
    }
    const target = platform || chosenPlatform;
    if (target) {
      const index = knowledge.matchIssue(target,query);
      if (index !== null) { showGuide(target,index); return; }
      chosenPlatform = target;
      runDemo({prompt:query,step:'searching',
        response:'Encontré las guías disponibles para '+target+'. ¿Cuál de estas situaciones se parece a tu problema?',finish:'happy'},query,
        ()=>showIssues(target));
      return;
    }
    runDemo(questions.libre,query,showPlatforms);
  }
  function humanHandoff() {
    if (!active || !authenticated()) return;
    // Es el botón de contacto humano YA aprobado en Ayuda, sin datos de cliente
    // adjuntos ni llamada a sendSmartWA, que añadiría perfil/PIN.
    const official = section.querySelector('.direct-contact-box button');
    closeChat();
    official?.click();
  }
  function choiceAction(button) {
    if (!active || busy || !authenticated()) return;
    const type = button.dataset.kind;
    const platform = button.dataset.platform;
    const index = Number(button.dataset.issueIndex);
    if (type === 'human') { humanHandoff(); return; }
    if (type === 'account') { closeChat(); window.switchTab?.('inicio'); return; }
    if (type === 'platforms') {
      chosenPlatform = null;
      runDemo({prompt:'Ver plataformas',step:'searching',
        response:'Elige tu plataforma para consultar las soluciones disponibles.',finish:'happy'},null,showPlatforms);
    } else if (type === 'platform' && knowledge.platforms().includes(platform)) {
      chosenPlatform = platform;
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
  closeButton.addEventListener('click', closeChat);
  layer.querySelector('.gxai-backdrop').addEventListener('click', closeChat);
  layer.addEventListener('click', event => {
    const chosen = event.target.closest?.('.gxai-choice');
    if (chosen) { choiceAction(chosen); return; }
    const button = event.target.closest?.('.gxai-suggestion');
    if (!active || !button) return;
    const entry = questions[button.dataset.prompt];
    if (!entry) return;
    if (button.dataset.prompt === 'acceso' || button.dataset.prompt === 'codigo') {
      runDemo(entry,null,showPlatforms);
    } else if (button.dataset.prompt === 'cuenta') {
      runDemo(entry,null,()=>showChoices([
        {kind:'account',label:'Ir a Mi Espacio'}, {kind:'platforms',label:'Buscar ayuda de plataformas'}
      ]));
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
    renderer: 'robot-heads@0.3.0'
  });
})();
