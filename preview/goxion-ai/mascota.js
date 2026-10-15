/* GOXION AI · Fase 1 · mascota y chat de demostración.
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
      '<svg class="gxai-mascot" data-mood="idle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 300" role="img" aria-label="Mascota GOXION sonriente y animada">',
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
      '<circle cx="82" cy="121" r="3.5" fill="#b5a7ff" opacity=".65"/><circle cx="236" cy="121" r="3.5" fill="#b6eaff" opacity=".65"/>',
      '</g>',
      '</svg>'
    ].join('');
  }

  const svg = robotSVG();
  const hero = doc.createElement('div');
  hero.className = 'gxai-hero';
  hero.innerHTML = [
    '<div class="gxai-kicker">TU ASISTENTE DE SOPORTE</div>',
    '<button class="gxai-mascot-button" type="button" aria-label="Abrir conversación con la mascota GOXION">',
    svg,
    '</button>',
    '<h2 class="gxai-title">¿Necesitas <span>ayuda?</span></h2>',
    '<p class="gxai-desc">¿Tienes algún problema con tus plataformas o algo que te gustaría saber? Estoy aquí para ayudarte.</p>',
    '<button class="gxai-open" type="button" aria-label="Abrir chat de la mascota">',
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg>',
    'Platica conmigo <span aria-hidden="true">↗</span></button>'
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
    '<span class="gxai-heading"><strong id="gxai-chat-title">Asistente GOXION</strong>',
    '<small>Mascota interactiva · Beta visual</small></span>',
    '<button class="gxai-close" type="button" aria-label="Cerrar chat">×</button>',
    '</header>',
    '<div class="gxai-chat-scroll" role="log" aria-live="polite">',
    '<div class="gxai-beta-note">FASE 1 · PRUEBA VISUAL</div>',
    '<div class="gxai-bubble">¡Hola! 👋 Soy tu futuro asistente GOXION. Ya puedo saludarte y reaccionar a tus interacciones. En la siguiente fase conectaremos mis respuestas inteligentes.</div>',
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

  heroTrigger.addEventListener('click', openChat);
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
      if (['idle','happy','thinking','listening','speaking'].includes(state)) mood(state, state === 'idle' ? 0 : 1600);
    },
    close: closeChat
  });
})();
