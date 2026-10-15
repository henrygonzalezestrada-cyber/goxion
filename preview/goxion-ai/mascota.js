/* GOXION · Goxy · Fase 2 · mascota interactiva y chat de demostración.
   Vive únicamente en preview/goxion-ai/. No usa API, no escribe datos ni envía mensajes.
   Robot original SVG/CSS inspirado en el concepto visual de robot-heads (MIT):
   https://github.com/fayazara/robot-heads ; no se incorpora código de esa librería. */
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

  function robotSVG() {
    return [
      '<svg class="gxai-mascot" data-mood="idle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 300" role="img" aria-label="Goxy, mascota interactiva de GOXION">',
      '<defs>',
      '<linearGradient id="gxai-case" x1=".04" y1="0" x2=".93" y2="1"><stop stop-color="#b3a6dc"/><stop offset=".22" stop-color="#7566bd"/><stop offset=".52" stop-color="#263767"/><stop offset=".82" stop-color="#182448"/><stop offset="1" stop-color="#070d21"/></linearGradient>',
      '<linearGradient id="gxai-bezel" x1="0" x2="1" y1=".2" y2="1"><stop stop-color="#a69ccf"/><stop offset=".25" stop-color="#596da0"/><stop offset=".55" stop-color="#263561"/><stop offset="1" stop-color="#131a39"/></linearGradient>',
      '<linearGradient id="gxai-glass" x1="0" x2=".72" y1="0" y2="1"><stop stop-color="#0e203c"/><stop offset=".4" stop-color="#060915"/><stop offset="1" stop-color="#03050b"/></linearGradient>',
      '<linearGradient id="gxai-rim" x1="0" x2="1"><stop stop-color="#7c4dff"/><stop offset=".55" stop-color="#00f2fe"/><stop offset="1" stop-color="#7c4dff"/></linearGradient>',
      '<radialGradient id="gxai-light"><stop stop-color="#bfffff"/><stop offset=".37" stop-color="#00f2fe"/><stop offset="1" stop-color="#5740cc"/></radialGradient>',
      '</defs>',
      '<ellipse cx="161" cy="268" rx="100" ry="12" fill="#00f2fe" opacity=".035"/>',
      '<g class="gxai-head">',
      '<path d="M161 54V30" stroke="#93a9db" stroke-width="8" stroke-linecap="round"/>',
      '<path d="M161 52V28" stroke="#e3d9ff" stroke-width="2" stroke-linecap="round" opacity=".58"/>',
      '<circle class="gxai-antenna-bulb" cx="161" cy="20" r="12" fill="url(#gxai-light)" stroke="#99e9ff" stroke-width="2"/>',
      '<rect x="34" y="113" width="35" height="83" rx="16" fill="url(#gxai-bezel)" stroke="#7c4dff" stroke-width="3"/>',
      '<rect x="251" y="113" width="35" height="83" rx="16" fill="url(#gxai-bezel)" stroke="#00f2fe" stroke-width="3"/>',
      '<rect class="gxai-ear-led" x="40" y="134" width="5" height="39" rx="2" fill="#8f71ff"/>',
      '<rect class="gxai-ear-led" x="277" y="134" width="5" height="39" rx="2" fill="#00f2fe"/>',
      '<path d="M69 84Q79 58 117 55H206Q247 56 255 91L262 204Q262 241 218 249H102Q58 241 56 202Z" fill="url(#gxai-case)" stroke="#909bd6" stroke-width="2.4"/>',
      '<path d="M83 92Q89 75 125 74H201Q232 74 238 100L243 194Q242 224 213 227H108Q78 225 76 196Z" fill="url(#gxai-bezel)" stroke="#101b37" stroke-width="4"/>',
      '<path d="M91 103Q97 90 125 88H200Q222 89 226 111L231 186Q231 211 206 213H113Q88 213 87 188Z" fill="url(#gxai-glass)" stroke="url(#gxai-rim)" stroke-width="2.4"/>',
      '<path d="M98 111Q108 93 137 93H196Q214 93 219 108" stroke="#d3d3ff" stroke-opacity=".16" stroke-width="7" fill="none" stroke-linecap="round"/>',
      '<path d="M109 103Q143 91 173 95" stroke="white" opacity=".055" stroke-width="5" fill="none" stroke-linecap="round"/>',
      '<g class="gxai-face gxai-face-idle" fill="none" stroke="#00f2fe" stroke-width="10" stroke-linecap="round">',
      '<rect class="gxai-eye-idle" x="122" y="140" width="15" height="26" rx="7" fill="#00f2fe" stroke="none"/>',
      '<rect class="gxai-eye-idle" x="183" y="140" width="15" height="26" rx="7" fill="#00f2fe" stroke="none"/>',
      '<path d="M145 179Q160 190 175 179" stroke-width="4.5"/>',
      '</g>',
      '<g class="gxai-face gxai-face-happy" fill="none" stroke="#00f2fe" stroke-linecap="round">',
      '<path d="M113 159Q129 129 145 159M176 159Q192 129 208 159" stroke-width="9"/>',
      '<path d="M140 181Q160 196 180 181" stroke-width="5"/>',
      '</g>',
      '<g class="gxai-face gxai-face-thinking" fill="#00f2fe">',
      '<rect x="124" y="148" width="17" height="9" rx="4"/><rect x="184" y="148" width="17" height="9" rx="4"/>',
      '<circle cx="145" cy="184" r="3"/><circle cx="160" cy="184" r="4"/><circle cx="176" cy="184" r="3"/>',
      '</g>',
      '<g class="gxai-face gxai-face-listening" fill="#00f2fe">',
      '<rect x="122" y="140" width="15" height="26" rx="7"/><rect x="183" y="140" width="15" height="26" rx="7"/>',
      '<rect x="144" y="181" width="4" height="8" rx="2"/><rect x="152" y="177" width="4" height="15" rx="2"/><rect x="160" y="174" width="4" height="21" rx="2"/><rect x="168" y="177" width="4" height="15" rx="2"/><rect x="176" y="181" width="4" height="8" rx="2"/>',
      '</g>',
      '<g class="gxai-face gxai-face-speaking" fill="#00f2fe">',
      '<rect x="121" y="139" width="15" height="25" rx="7"/><rect x="184" y="139" width="15" height="25" rx="7"/>',
      '<ellipse cx="160" cy="184" rx="14" ry="7"/>',
      '</g>',
      '<g class="gxai-face gxai-face-wink" fill="none" stroke="#00f2fe" stroke-linecap="round">',
      '<path d="M114 154Q131 144 145 156" stroke-width="7"/><rect x="183" y="140" width="16" height="26" rx="8" fill="#00f2fe" stroke="none"/>',
      '<path d="M148 181Q161 189 174 181" stroke-width="4.5"/>',
      '</g>',
      '<g class="gxai-face gxai-face-surprised" fill="#00f2fe">',
      '<circle cx="132" cy="153" r="8"/><circle cx="191" cy="153" r="8"/>',
      '<ellipse cx="161" cy="185" rx="9" ry="12" fill="none" stroke="#00f2fe" stroke-width="5"/>',
      '</g>',
      '<g class="gxai-face gxai-face-love" fill="#00f2fe">',
      '<path d="M131 164C126 158 113 149 115 141C117 132 127 133 131 139C137 132 148 132 149 141C150 151 138 158 131 164Z"/>',
      '<path d="M191 164C186 158 173 149 175 141C177 132 187 133 191 139C197 132 208 132 209 141C210 151 198 158 191 164Z"/>',
      '<path d="M146 181Q161 196 176 181" fill="none" stroke="#00f2fe" stroke-width="4" stroke-linecap="round"/>',
      '<circle class="gxai-blush" cx="107" cy="177" r="9" fill="#a681ff"/><circle class="gxai-blush" cx="216" cy="177" r="9" fill="#a681ff"/>',
      '</g>',
      '<circle cx="82" cy="121" r="3.5" fill="#b5a7ff" opacity=".65"/><circle cx="236" cy="121" r="3.5" fill="#b6eaff" opacity=".65"/>',
      '</g>',
      '</svg>'
    ].join('');
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
    '<span class="gxai-open-copy">Hablar con Goxy</span><svg class="gxai-open-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg></span></button>'
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
    '<small>Mascota interactiva · Beta visual</small></span>',
    '<button class="gxai-close" type="button" aria-label="Cerrar chat">×</button>',
    '</header>',
    '<div class="gxai-chat-scroll" role="log" aria-live="polite">',
    '<div class="gxai-beta-note">FASE 1 · PRUEBA VISUAL</div>',
    '<div class="gxai-bubble">¡Hola! 👋 Soy Goxy, tu compañero de soporte. Puedes tocarme o acariciarme para ver mis gestos. Cuando conectemos la IA, también podré ayudarte con tus servicios.</div>',
    '<div class="gxai-suggestions">',
    '<button type="button" class="gxai-suggestion" data-prompt="acceso">Tengo un problema de acceso</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="cuenta">Quiero consultar mi cuenta</button>',
    '<button type="button" class="gxai-suggestion" data-prompt="codigo">Necesito un código</button>',
    '</div>',
    '</div>',
    '<footer class="gxai-chat-foot">El chat aún no se conecta a la IA ni consulta información privada.<br>Pronto podrás escribir tus preguntas aquí.</footer>',
    '</section>'
  ].join('');
  section.appendChild(layer);

  const mascots = Array.from(section.querySelectorAll('.gxai-mascot'));
  const scroll = layer.querySelector('.gxai-chat-scroll');
  const dialog = layer.querySelector('.gxai-chat');
  const heroTrigger = hero.querySelector('.gxai-mascot-button');
  const openButton = hero.querySelector('.gxai-open');
  const closeButton = layer.querySelector('.gxai-close');
  const reactionLayer = hero.querySelector('.gxai-reactions');
  const petStatus = hero.querySelector('.gxai-pet-status');
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  let active = false;
  let transitionTimer = null, interactionTimer = null, requestId = 0;
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
  function openChat() {
    if (active || !authenticated()) {
      if (!authenticated()) window.openAuthSheet?.();
      return;
    }
    previousFocus = doc.activeElement;
    active = true; requestId++;
    prevOverflowHtml = doc.documentElement.style.overflow;
    prevOverflowBody = doc.body.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    doc.body.style.overflow = 'hidden';
    layer.classList.add('gxai-visible');
    layer.setAttribute('aria-hidden', 'false');
    mood('happy', 680);
    // Foco al diálogo sin preseleccionar el botón X ni abrir el teclado en iOS.
    dialog.setAttribute('tabindex', '-1');
    dialog.focus({preventScroll:true});
  }
  function closeChat() {
    if (!active) return;
    active = false; requestId++;
    clearTimeout(transitionTimer);
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
  const questions = {
    acceso: ['Tengo un problema de acceso', 'Ya identifico el tema: acceso a una plataforma. En esta primera beta aún no tengo conexión con la IA; cuando la activemos, podré guiarte paso a paso con tus servicios contratados.'],
    cuenta: ['Quiero consultar mi cuenta', 'En la siguiente fase podré consultar información autorizada de Mi Espacio. Esta beta no lee saldos, fechas ni datos de tu cuenta.'],
    codigo: ['Necesito un código', 'Para los códigos de verificación prepararé una solicitud de asistencia humana. Ese envío todavía no está conectado; por ahora puedes usar el botón de asesor humano que ya existe en Soporte.']
  };


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
    const gestures = ['happy', 'wink', 'surprised', 'happy'];
    const state = gestures[pet.taps++ % gestures.length];
    mood(state, 1600);
    petStatus.textContent = state === 'wink' ? 'Goxy te guiñó un ojo' : state === 'surprised' ? 'Goxy está sorprendido' : 'Goxy se alegró de verte';
  }
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
    const key = button.dataset.prompt;
    const data = questions[key];
    if (!data) return;
    bubble(data[0], true);
    mood('thinking');
    const current = ++requestId;
    transitionTimer = setTimeout(() => {
      if (!active || requestId !== current) return;
      bubble(data[1], false);
      mood('speaking', 1200);
    }, 650);
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
    expression: (state) => {
      if (['idle','happy','thinking','listening','speaking','wink','surprised','love'].includes(state)) mood(state, state === 'idle' ? 0 : 1600);
    },
    close: closeChat,
    open: openChat
  });
})();
