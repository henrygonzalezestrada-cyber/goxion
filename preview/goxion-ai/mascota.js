/* GOXION · Goxy F5 · máquina de estados conversacional local y gestos F4.
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
    '<div class="gxai-beta-note">FASE 2 · CONVERSACIÓN SIMULADA</div>',
    '<div class="gxai-bubble">¡Hola! Soy Goxy. 🤖 Ya puedo escucharte y mostrar cuándo pienso, busco, respondo o encuentro un error. Por ahora mis respuestas son simuladas; todavía no consulto tus servicios.</div>',
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
    '<div class="gxai-chat-disclaimer">Demostración local · Sin IA, consultas de cuenta ni envíos reales.</div>',
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
      response: 'Podré guiarte paso a paso cuando conectemos la base verificada de soluciones. Esta prueba no consulta ni modifica accesos.',
      finish: 'happy'
    },
    cuenta: {
      prompt: 'Quiero consultar mi cuenta',
      step: 'searching',
      response: 'En una siguiente fase podré consultar información autorizada de Mi Espacio. Aquí no leo saldos, fechas ni datos personales.',
      finish: 'happy'
    },
    codigo: {
      prompt: 'Necesito un código',
      step: 'working',
      response: 'Cuando esté conectado podré preparar una solicitud para que un asesor atienda los códigos de verificación. Esta prueba NO envió ninguna solicitud.',
      finish: 'happy'
    },
    error: {
      prompt: 'Quiero probar qué pasa si algo falla',
      step: 'working',
      response: 'Este es un error simulado para probar mis gestos. No ocurrió ningún problema con tu cuenta y puedes intentar otra consulta.',
      finish: 'error'
    },
    libre: {
      step: 'thinking',
      response: '¡Recibí tu mensaje de prueba! Ya muestro cuándo escucho, pienso y respondo. Todavía no tengo IA ni puedo resolver o consultar tu cuenta.',
      finish: 'happy'
    }
  });
  function runDemo(entry, enteredText) {
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
    });
  }


  // Goxy tipo Tamagotchi: un toque provoca gestos, una caricia genera corazones.
  // La ventana del chat SOLO se abre mediante el botón «Hablar con Goxy».
  const pet = { id: null, lastX: 0, lastY: 0, distance: 0, stroking: false, lastHeart: 0, taps: 0 };
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
    pet.lastX = event.clientX; pet.lastY = event.clientY;
    pet.distance = 0; pet.stroking = false; pet.lastHeart = 0;
    try { heroTrigger.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  });
  heroTrigger.addEventListener('pointermove', (event) => {
    if (pet.id !== event.pointerId) return;
    const step = Math.hypot(event.clientX - pet.lastX, event.clientY - pet.lastY);
    pet.lastX = event.clientX; pet.lastY = event.clientY;
    // Un gesto rápido puede llegar como un solo evento de movimiento en iOS.
    // Contamos su recorrido para no confundir una caricia veloz con un toque.
    pet.distance += Math.min(step, 180);
    if (pet.distance >= 24) pet.stroking = true;
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
    // También detecta el último desplazamiento si Safari no envió pointermove.
    pet.distance += Math.min(Math.hypot(event.clientX - pet.lastX, event.clientY - pet.lastY), 180);
    if (pet.distance >= 24) pet.stroking = true;
    if (pet.stroking) {
      mood('love', 2400);
      makeHeart();
      petStatus.textContent = '¡Goxy te manda mucho cariño!';
    } else if (pet.distance < 16) {
      playfulTap();
    }
    pet.id = null; pet.stroking = false;
  });
  heroTrigger.addEventListener('pointercancel', () => {
    pet.id = null; pet.stroking = false;
    mood('idle');
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
    const button = event.target.closest('.gxai-suggestion');
    if (!active || !button) return;
    const entry = questions[button.dataset.prompt];
    if (entry) runDemo(entry);
  });
  // Mensajes libres: solo conversación simulada. Nada sale del navegador.
  composer.addEventListener('submit', event => {
    event.preventDefault();
    if (!active || busy || !authenticated()) return;
    const text = messageInput.value.trim();
    if (!text) return;
    messageInput.value = '';
    runDemo(questions.libre, text);
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
