/* GOXION · Carrito 2.0. El pedido solicita atención; no activa ni cobra servicios. */
(function () {
  'use strict';
  const core = window.GOXION_CORE;
  const money = n => new Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'}).format(n / 100);
  const cents = n => Math.round(Number(n) * 100);
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const entries = () => Object.entries(carritoPedidos).filter(([, x]) => x.qty > 0);
  const plans = () => Object.values(window.catalogGroups || {}).flatMap(x => x.plans || []);
  const client = () => {
    const key = typeof getCurrentClientKey === 'function' ? getCurrentClientKey() : window.goxionCurrentClientKey;
    return core.getClientToken?.() && key && typeof globalClientesData !== 'undefined' ? globalClientesData[key] : null;
  };
  const icons = {
    bag:'M6 7H18L20 21H4L6 7ZM9 7V5A3 3 0 0 1 15 5V7',
    close:'M6 6L18 18M18 6L6 18',
    trash:'M4 7H20M9 7V4H15V7M6 7L7 21H17L18 7M10 11V17M14 11V17',
    plus:'M5 12H19M12 5V19', minus:'M5 12H19',
    send:'M5 12H19M13 6L19 12L13 18',
    loading:'M20 12A8 8 0 1 1 12 4', check:'M5 12L10 17L20 7',
    shield:'M12 3L20 6V12C20 17 12 21 12 21S4 17 4 12V6L12 3ZM8 12L11 15L16 10'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"></path></svg>`;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const morphs = new WeakMap();
  function iconTo(host, name) {
    const path = host?.querySelector('path');
    if (!path) return;
    let morph = morphs.get(path);
    if (!morph && window.gxCreateIconMorph) {
      morph = window.gxCreateIconMorph(path, path.getAttribute('d'), {reducedMotion:'user'});
      morphs.set(path, morph);
    }
    if (morph) { if (reduced()) morph.set(icons[name]); else morph.morphTo(icons[name], 'snappy'); }
    else path.setAttribute('d', icons[name]);
  }
  const logo = title => {
    const names = [['prime','prime-video'],['disney','disney'],['crunchyroll','crunchyroll'],['google','google-one'],['hbo','hbo-max'],['max','hbo-max'],['netflix','netflix'],['youtube','youtube'],['microsoft','microsoft'],['vix','vix']];
    const found = names.find(([name]) => title.toLowerCase().includes(name));
    return found ? 'logos/' + found[1] + '.PNG' : 'logo2.PNG';
  };
  let busy = false, previousFocus, requestId = '', closing = false, editing = false, motion, oldOverflow;

  const dialog = document.createElement('dialog');
  dialog.id = 'gx-cart-dialog';
  dialog.setAttribute('aria-labelledby', 'gx-cart-title');
  dialog.innerHTML = `<div class="gx-cart-shell"><header><div class="gx-cart-heading"><span class="gx-cart-bag">${svg('bag')}</span><h2 id="gx-cart-title">Tu carrito</h2><span id="gx-cart-count"></span></div><button type="button" class="gx-cart-close" aria-label="Cerrar carrito">${svg('close')}</button></header><form id="gx-cart-form"><div class="gx-cart-scroll"><div id="gx-cart-lines"></div><section class="gx-cart-contact"><label for="gx-cart-phone">WhatsApp para tus accesos</label><input id="gx-cart-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+52 961 123 4567" aria-describedby="gx-cart-phone-help"><p id="gx-cart-phone-help">México: 10 dígitos. Otro país: incluye + y código.</p></section><p id="gx-cart-member" hidden>Recibirás tus credenciales en breve.</p></div><footer><div class="gx-cart-trust">${svg('shield')}<span>En GOXION, primero tu acceso; después tu pago.</span></div><div class="gx-cart-total"><span>Total <small>MXN</small></span><strong id="gx-cart-total" aria-live="polite"></strong></div><p class="gx-cart-caption">Paquetes completos y servicios mensuales.</p><p id="gx-cart-error" role="alert"></p><button type="submit" class="gx-cart-submit"><span class="gx-cart-submit-label">Enviar solicitud</span><span class="gx-cart-send-icon">${svg('send')}</span></button></footer></form><section id="gx-cart-success" hidden tabindex="-1"><div class="gx-cart-check">${svg('check')}</div><h3>¡Todo listo!</h3><p id="gx-cart-success-text"></p><p>Pagas cuando tengas acceso.</p><button type="button" class="gx-cart-submit gx-cart-done">Seguir explorando ${svg('send')}</button></section></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  function showError(message) { $('gx-cart-error').textContent = message; }
  function total() { return entries().reduce((sum, [, x]) => sum + x.cents * x.qty, 0); }
  function unit(plan) {
    return /cuenta\s+completa/i.test(plan.nombre) ? 'cuenta completa' : 'perfil';
  }
  function render() {
    const items = entries();
    const count = items.reduce((n, [, x]) => n + x.qty, 0);
    $('cart-items-count').textContent = count + (count === 1 ? ' selección' : ' selecciones');
    $('cart-total-price').textContent = money(total()) + ' MXN';
    $('floating-cart').classList.toggle('show', count > 0 && Boolean($('view-catalogo')?.classList.contains('active')));
    for (const p of plans()) {
      const el = $('qty-' + p.safeId);
      if (el) el.textContent = carritoPedidos[p.nombre]?.qty || 0;
    }
    if (!dialog.open) return;
    const list = $('gx-cart-lines');
    const oldRows = new Map(Array.from(list.querySelectorAll('.gx-cart-line')).map(row => [row.dataset.cartKey, {row, top:row.getBoundingClientRect().top}]));
    list.querySelector('.gx-cart-empty')?.remove();
    for (const [index, [key, x]] of items.entries()) {
      let row = oldRows.get(key)?.row;
      const fresh = !row;
      if (!row) { row = document.createElement('article'); row.className = 'gx-cart-line'; row.dataset.cartKey = key; }
      const description = x.promotion
        ? (x.summary || x.detail)
        : 'Mensual';
      const markup = `<img class="gx-cart-logo" src="${logo(x.title)}" alt=""><div class="gx-cart-copy"><h3>${escape(x.title)}</h3><p>${escape(x.qty + ' ' + (x.qty > 1 ? x.unitPlural : x.unit))} · ${escape(description)}</p></div><strong class="gx-cart-price">${money(x.cents*x.qty)}</strong><div class="gx-cart-line-bottom"><span class="gx-cart-unit-price">${x.qty > 1 ? money(x.cents) + ' c/u' : ''}</span><div class="gx-cart-stepper"><button type="button" data-key="${escape(key)}" data-delta="-1" aria-label="Quitar uno de ${escape(x.title)}">${svg('minus')}</button><span>${x.qty}</span><button type="button" data-key="${escape(key)}" data-delta="1" ${x.qty >= x.max ? 'disabled' : ''} aria-label="Agregar uno de ${escape(x.title)}">${svg('plus')}</button></div><button class="gx-cart-remove" type="button" data-key="${escape(key)}" data-remove aria-label="Eliminar ${escape(x.title)}">${svg('trash')}</button></div>`;
      if (row._markup !== markup) {
        row.innerHTML = markup; row._markup = markup;
        if (!fresh && !reduced()) for (const node of row.querySelectorAll('.gx-cart-price,.gx-cart-stepper span')) node.animate([{opacity:.3,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
      }
      row.style.setProperty('--row-delay', index * 45 + 'ms');
      list.append(row);
    }
    for (const [key, {row}] of oldRows) if (!items.some(([id]) => key === id)) row.remove();
    if (!items.length) list.innerHTML = `<p class="gx-cart-empty">${svg('bag')}Elige algo para ti en el catálogo.</p>`;
    if (!reduced()) for (const {row, top} of oldRows.values()) if (row.isConnected) {
      const delta = top - row.getBoundingClientRect().top;
      if (Math.abs(delta)>1) row.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    const amount = money(total());
    if ($('gx-cart-total').textContent !== amount) {
      $('gx-cart-total').textContent = amount;
      if (!reduced()) $('gx-cart-total').animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:280});
    }
    $('gx-cart-count').textContent = count;
    const logged = Boolean(client());
    dialog.querySelector('.gx-cart-contact').hidden = logged;
    $('gx-cart-phone').required = !logged;
    $('gx-cart-member').hidden = !logged;
    dialog.querySelector('button[type=submit]').disabled = busy || !items.length;
  }
  function originTransform() {
    const target = $('floating-cart');
    if (!target?.classList.contains('show')) return 'translateY(28px) scale(.94)';
    const from = target.getBoundingClientRect(), to = dialog.getBoundingClientRect();
    return `translate(${from.left+from.width/2-to.left-to.width/2}px,${from.top+from.height/2-to.top-to.height/2}px) scale(${Math.min(1,from.width/to.width)},${Math.max(.08,from.height/to.height)})`;
  }
  function open() {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    $('gx-cart-form').hidden = false; $('gx-cart-success').hidden = true;
    showError(''); closing = false;
    oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.classList.remove('is-closing'); dialog.classList.add('is-opening');
    dialog.querySelector('.gx-cart-scroll').scrollTop = 0;
    render();
    iconTo(dialog.querySelector('.gx-cart-bag'), 'bag');
    iconTo(dialog.querySelector('.gx-cart-close'), 'close');
    if (!reduced()) {
      motion = dialog.animate([{transform:originTransform(),opacity:.35,borderRadius:'36px'},{transform:'none',opacity:1,borderRadius:'26px'}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'});
      motion.finished.catch(()=>{}).then(()=>dialog.classList.remove('is-opening'));
    } else dialog.classList.remove('is-opening');
  }
  async function close() {
    if (busy || closing || !dialog.open) return;
    closing = true; motion?.cancel();
    dialog.classList.remove('is-opening'); dialog.classList.add('is-closing');
    iconTo(dialog.querySelector('.gx-cart-close'), 'bag');
    if (!reduced()) {
      motion = dialog.animate([{transform:'none',opacity:1},{transform:originTransform(),opacity:0,borderRadius:'36px'}],{duration:320,easing:'cubic-bezier(.4,0,.6,1)'});
      await motion.finished.catch(()=>{});
    }
    dialog.close(); dialog.classList.remove('is-closing'); closing = false;
  }
  function changeService(name, delta) {
    if (busy) return false;
    const plan = plans().find(x => x.nombre === name);
    if (!plan) return false;
    const max = Math.max(0, Math.floor(Number(plan.disponibles) || 0));
    const price = cents(plan.precio);
    if (!Number.isFinite(price) || price < 0) return false;
    const current = carritoPedidos[name]?.qty || 0;
    if (delta > 0 && current >= max) return false;
    const label = unit(plan);
    carritoPedidos[name] = { title:name, precio:price / 100, cents:price, qty:Math.max(0, current + delta), max,
      unit:label, unitPlural:label === 'perfil' ? 'perfiles' : 'cuentas completas', detail:'Servicio mensual · 1 mes', serviceId:plan.id };
    requestId = '';
    render();
    return true;
  }
  function addPromotion(p) {
    if (busy || !p.id || p.adquisicion_habilitada !== true || p.disponibilidad?.disponible === false) return false;
    const key = 'promo:' + p.id;
    // Una adquisición por campaña y cliente: cantidades adicionales se revisan en Admin.
    if (carritoPedidos[key]?.qty) { open(); return true; }
    const recurring = p.duracion_tipo === 'hasta_fin_campana';
    const periods = Math.max(1, Number(p.duracion_periodos) || 1);
    const perPeriod = recurring || p.mecanica === 'porcentaje' || p.mecanica === 'addon';
    const price = cents(perPeriod ? (p.precio_promocional_periodo ?? p.precio_promocional) : (p.precio_promocional_total ?? p.precio_promocional));
    if (!Number.isFinite(price) || price < 0) return false;
    const services = (p.items || []).map(x => x.servicio?.nombre).filter(Boolean);
    const detail = (perPeriod ? 'Precio por periodo' : 'Precio total del paquete') + ' · ' +
      (recurring ? 'hasta finalizar campaña' : periods + (periods === 1 ? ' periodo' : ' periodos')) +
      (services.length ? ' · ' + services.join(' + ') : '');
    carritoPedidos[key] = {title:p.nombre || p.titulo_publico || 'Promoción GOXION', precio:price / 100, cents:price, qty:1, max:1,
      unit:services.length > 1 ? 'combo' : unit({nombre:services[0] || ''}), unitPlural:'promociones', detail, summary:recurring ? 'Por mes · hasta fin de campaña' : perPeriod ? 'Por mes · ' + periods + ' periodo' + (periods>1?'s':'') : 'Paquete · ' + periods + (periods===1?' mes':' meses'), promotion:p.id, perPeriod};
    requestId = '';
    render();
    return true;
  }
  dialog.querySelector('.gx-cart-close').addEventListener('click', close);
  dialog.querySelector('.gx-cart-done').addEventListener('click', close);
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = oldOverflow || ''; previousFocus?.focus(); });
  dialog.addEventListener('click', async e => {
    if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); }
    const btn = e.target.closest('[data-key]');
    if (!btn || busy || editing || closing) return;
    const key = btn.dataset.key, item = carritoPedidos[key];
    if (!item) return;
    const removing = btn.hasAttribute('data-remove') || (btn.dataset.delta === '-1' && item.qty === 1);
    if (removing && !reduced()) {
      editing = true;
      const row = btn.closest('.gx-cart-line');
      iconTo(btn, 'close');
      await row.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(35px) scale(.96)'}],{duration:200,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
      editing = false;
    }
    if (btn.hasAttribute('data-remove')) item.qty = 0;
    else if (item.promotion) item.qty = Math.max(0, Math.min(item.max, item.qty + Number(btn.dataset.delta)));
    else changeService(key, Number(btn.dataset.delta));
    requestId = ''; showError(''); render();
    // Mantener foco después de actualizar las filas.
    const replacement = Array.from(dialog.querySelectorAll('[data-key]')).find(x => x.dataset.key === key);
    (replacement || dialog.querySelector('.gx-cart-close')).focus();
  });
  $('gx-cart-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || editing || closing || !entries().length) return;
    const customer = client();
    let phone = $('gx-cart-phone').value.replace(/[^\d+]/g, '');
    if (!customer) {
      if (/^\d{10}$/.test(phone)) phone = '+52' + phone;
      if (!/^\+[1-9]\d{9,14}$/.test(phone)) { showError('Escribe 10 dígitos para México o tu número con + y código de país.'); $('gx-cart-phone').focus(); return; }
    }
    busy = true; showError(''); render();
    const submit = dialog.querySelector('button[type=submit]');
    submit.querySelector('.gx-cart-submit-label').textContent = 'Enviando';
    submit.classList.add('is-sending'); iconTo(submit, 'loading');
    const token = core.getClientToken?.() || localStorage.getItem(core.STORAGE.CLIENT_TOKEN) || '';
    const headers = {'Content-Type':'application/json', ...(token ? {'X-Client-Token':token} : {})};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const demand = new Map();
      const requireStock = (id, name, qty) => { const key = String(id || name); const old = demand.get(key); demand.set(key, {id, name, qty:(old?.qty || 0) + qty}); };
      // Revalidar campañas antes del envío; nunca usar las tarjetas de preview como pedidos reales.
      if (entries().some(([, x]) => x.promotion)) {
        const response = await fetch(core.endpoint('promociones-catalogo'), {method:'POST', headers, body:'{}', cache:'no-store', signal:controller.signal});
        const fresh = await response.json();
        if (!response.ok || fresh.ok !== true) throw new Error('No pudimos verificar las promociones. Intenta de nuevo.');
        for (const [, x] of entries()) if (x.promotion) {
          const p = (fresh.promociones || []).find(p => String(p.id) === String(x.promotion));
          if (!p || !p.adquisicion_habilitada || p.disponibilidad?.disponible === false || p.elegibilidad?.elegible === false || p.adquirida?.estado === 'activa') throw new Error(x.title + ': ya no está disponible. Elimínala para continuar.');
          if (cents(x.perPeriod ? (p.precio_promocional_periodo ?? p.precio_promocional) : (p.precio_promocional_total ?? p.precio_promocional)) !== x.cents) throw new Error(x.title + ': cambió de precio. Elimínala y agrégala nuevamente.');
          for (const item of p.disponibilidad?.items || []) if (item.requiere_cupo !== false) requireStock(item.servicio_id, item.nombre, x.qty);
        }
      }
      for (const [, x] of entries()) if (!x.promotion) {
        const p = plans().find(p => p.nombre === x.title);
        if (!p || cents(p.precio) !== x.cents) throw new Error(x.title + ': revisa su precio y disponibilidad en el catálogo.');
        requireStock(p.id || p._id, p.nombre, x.qty);
      }
      if (demand.size) {
        const r = await fetch(core.endpoint('inventario-publico'), {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}', cache:'no-store', signal:controller.signal});
        const stock = await r.json();
        if (!r.ok || stock.ok !== true) throw new Error('No pudimos verificar disponibilidad. Tu carrito se conserva.');
        for (const need of demand.values()) {
          const available = (stock.inventario || []).find(x => String(x.id) === String(need.id) || x.nombre === need.name);
          if (!available || need.qty > Number(available.disponibles)) throw new Error(need.name + ': no hay cupos suficientes para toda tu selección. Reduce la cantidad o elimina un concepto.');
        }
      }
      requestId ||= 'cart:' + crypto.randomUUID();
      const lines = entries().map(([, x]) => `${x.title}\n${x.qty} ${x.qty === 1 ? x.unit : x.unitPlural} × ${money(x.cents)} = ${money(x.cents*x.qty)}\n${x.detail}${x.promotion ? '\nPROMO_ID: ' + x.promotion : ''}`);
      const message = [customer ? `Cliente: ${customer.nombre}\nFolio: ${customer.folio || ''}` : `Cliente: INVITADO\nWhatsApp: ${phone}`,
        ...lines, 'Total de la selección: ' + money(total()) + ' MXN', 'Pago después de recibir acceso. Solicitud pendiente de asignación; no activar ni cobrar automáticamente.', 'Referencia: ' + requestId].join('\n\n');
      const response = await fetch(core.endpoint('notificar-goxion'), {method:'POST', headers, signal:controller.signal,
        body:JSON.stringify({categoria:'pedidos', titulo:'🛒 CARRITO GOXION · NUEVA SOLICITUD', mensaje:message, colorHex:'7c4dff', session_token:token, referencia:requestId})});
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) throw new Error(data.error || 'No pudimos confirmar el envío. Tu selección sigue en el carrito.');
      carritoPedidos = {};
      $('gx-cart-phone').value = '';
      $('gx-cart-form').hidden = true;
      $('gx-cart-success').hidden = false;
      $('gx-cart-success-text').textContent = customer ? 'Tus credenciales se te harán llegar en breve.' : 'Te haremos llegar tus credenciales en breve al WhatsApp ' + phone + '.';
      iconTo(dialog.querySelector('.gx-cart-check'), 'check');
      if (!reduced()) $('gx-cart-success').animate([{opacity:0,transform:'translateY(18px) scale(.96)'},{opacity:1,transform:'none'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'});
      $('gx-cart-success').focus();
      requestId = '';
    } catch (error) {
      showError(error.name === 'AbortError' ? 'El servidor tardó en responder. No pudimos confirmar el envío; tu selección se conserva.' : error.message);
    } finally {
      clearTimeout(timeout); busy = false; submit.classList.remove('is-sending'); submit.querySelector('.gx-cart-submit-label').textContent = 'Enviar solicitud'; iconTo(submit, 'send'); render();
    }
  });
  window.GOXION_CART = {open, render, changeService, addPromotion};
  render();
})();
