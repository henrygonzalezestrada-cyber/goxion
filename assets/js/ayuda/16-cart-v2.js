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
  let busy = false, previousFocus, requestId = '';
  const dialog = document.createElement('dialog');
  dialog.id = 'gx-cart-dialog';
  dialog.setAttribute('aria-labelledby', 'gx-cart-title');
  dialog.innerHTML = `<div class="gx-cart-shell"><header><div><span class="gx-cart-eyebrow">TU SELECCIÓN · GOXION</span><h2 id="gx-cart-title">Tu próximo plan.</h2><p>Todo claro, antes de comenzar.</p></div><button type="button" class="gx-cart-close" aria-label="Cerrar carrito">×</button></header><form id="gx-cart-form"><div id="gx-cart-lines"></div><section class="gx-cart-contact"><label for="gx-cart-phone">Tu WhatsApp</label><input id="gx-cart-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+52 961 123 4567" aria-describedby="gx-cart-phone-help"><p id="gx-cart-phone-help">Aquí recibirás tus credenciales de acceso. Si tu número es de otro país, incluye el código internacional.</p></section><p id="gx-cart-member" hidden>Tus credenciales se te harán llegar en breve, después de enviar tu solicitud.</p><aside class="gx-cart-trust"><span aria-hidden="true">✦</span><div><strong>Primero tu acceso. Después tu pago.</strong><p>En GOXION somos transparentes: pagas hasta que tengas acceso a tus cuentas.</p></div></aside><footer><div class="gx-cart-total"><span>Total de tu selección</span><strong id="gx-cart-total"></strong></div><p class="gx-cart-caption">MXN · Cada concepto indica su duración. Los paquetes incluyen los periodos señalados; los servicios mensuales incluyen un mes. No se realiza ningún cobro ahora.</p><p id="gx-cart-error" role="alert"></p><button type="submit" class="gx-cart-submit">Enviar solicitud <span aria-hidden="true">↗</span></button><p class="gx-cart-caption">Confirmaremos disponibilidad al asignar tus accesos.</p></footer></form><section id="gx-cart-success" hidden tabindex="-1"><div class="gx-cart-check">✓</div><h3>¡Solicitud recibida!</h3><p id="gx-cart-success-text"></p><p>Recuerda: pagas cuando tengas acceso a tus cuentas.</p><button type="button" class="gx-cart-submit gx-cart-done">Seguir explorando</button></section></div>`;
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
    $('gx-cart-lines').innerHTML = items.length ? items.map(([key, x]) => `<article class="gx-cart-line"><div class="gx-cart-line-top"><div><span class="gx-cart-kind">${x.promotion ? 'PROMOCIÓN' : 'SERVICIO'}</span><h3>${escape(x.title)}</h3><p>${escape(x.detail)}</p><p>${escape(x.qty + ' ' + (x.qty > 1 ? x.unitPlural : x.unit))} · ${money(x.cents)} c/u</p></div><strong>${money(x.cents * x.qty)}</strong></div><div class="gx-cart-line-bottom"><div class="gx-cart-stepper"><button type="button" data-key="${escape(key)}" data-delta="-1" aria-label="Quitar uno de ${escape(x.title)}">−</button><span>${x.qty}</span><button type="button" data-key="${escape(key)}" data-delta="1" ${x.qty >= x.max ? 'disabled' : ''} aria-label="Agregar uno de ${escape(x.title)}">+</button></div><button class="gx-cart-remove" type="button" data-key="${escape(key)}" data-remove>Eliminar</button></div></article>`).join('') : '<p class="gx-cart-empty">Tu carrito está listo para algo nuevo.<br>Agrega servicios o promociones desde el catálogo.</p>';
    $('gx-cart-total').textContent = money(total());
    const logged = Boolean(client());
    dialog.querySelector('.gx-cart-contact').hidden = logged;
    $('gx-cart-phone').required = !logged;
    $('gx-cart-member').hidden = !logged;
    dialog.querySelector('button[type=submit]').disabled = busy || !items.length;
  }
  function open() {
    previousFocus = document.activeElement;
    $('gx-cart-form').hidden = false;
    $('gx-cart-success').hidden = true;
    showError('');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    render();
  }
  function close() { if (!busy) { dialog.close(); previousFocus?.focus(); } }
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
      unit:services.length > 1 ? 'combo' : unit({nombre:services[0] || ''}), unitPlural:'promociones', detail, promotion:p.id, perPeriod};
    requestId = '';
    render();
    return true;
  }
  dialog.querySelector('.gx-cart-close').addEventListener('click', close);
  dialog.querySelector('.gx-cart-done').addEventListener('click', close);
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  dialog.addEventListener('close', () => previousFocus?.focus());
  dialog.addEventListener('click', e => {
    if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); }
    const btn = e.target.closest('[data-key]');
    if (!btn || busy) return;
    const key = btn.dataset.key, item = carritoPedidos[key];
    if (!item) return;
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
    if (busy || !entries().length) return;
    const customer = client();
    let phone = $('gx-cart-phone').value.replace(/[^\d+]/g, '');
    if (!customer) {
      if (/^\d{10}$/.test(phone)) phone = '+52' + phone;
      if (!/^\+[1-9]\d{9,14}$/.test(phone)) { showError('Escribe 10 dígitos para México o tu número con + y código de país.'); $('gx-cart-phone').focus(); return; }
    }
    busy = true; showError(''); render();
    const submit = dialog.querySelector('button[type=submit]');
    submit.textContent = 'Enviando tu solicitud…';
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
      $('gx-cart-success').focus();
      requestId = '';
    } catch (error) {
      showError(error.name === 'AbortError' ? 'El servidor tardó en responder. No pudimos confirmar el envío; tu selección se conserva.' : error.message);
    } finally {
      clearTimeout(timeout); busy = false; submit.innerHTML = 'Enviar solicitud <span aria-hidden="true">↗</span>'; render();
    }
  });
  window.GOXION_CART = {open, render, changeService, addPromotion};
  render();
})();
