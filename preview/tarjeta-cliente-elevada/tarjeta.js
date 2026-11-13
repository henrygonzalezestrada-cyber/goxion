/* ============================================================
   Tarjeta de cliente elevada — espejo (solo visualización)
   Datos FICTICIOS de demostración. Nada escribe: cada acción
   muestra su estado visual y un aviso, sin llamar al motor.
   Una sola fuente de datos: la cifra se calcula en un solo
   lugar (resto = base - descuentos - abonos + mora) y se pinta
   una sola vez por vista. Sin duplicados.
   ============================================================ */
'use strict';

/* ---------- Datos demo (ficticios; sin nombres, PINs, teléfonos ni CLABE reales) ---------- */
const DEMO_CLIENTS = [
  {
    id: 'a',
    nombre: 'Daniela R.',
    folio: 'GX-2026-0142',
    regimen: 'B2',
    estado: 'Por vencer', estadoClase: 'por-vencer',
    frase: 'Vence en 17 días', fecha: '30 nov', periodo: 'nov 2026',
    base: 98.00, descuentos: 0, abonos: 49.00, mora: 0,
    ciclo: [
      { fecha: '6 nov',  servicio: 'ViX Premium · Perfil 1', importe: 49.00, estado: 'Liquidado' },
      { fecha: '30 nov', servicio: 'ViX Premium · Perfil 2', importe: 49.00, estado: 'Pendiente' }
    ],
    servicios: [
      { nombre: 'ViX Premium', perfil: 'Perfil 1', importe: 49.00, estado: 'Activo', estadoClase: 'ok' },
      { nombre: 'ViX Premium', perfil: 'Perfil 2', importe: 49.00, estado: 'Activo', estadoClase: 'ok' }
    ],
    lealtad: { pagos: 0, nota: 'Racha reiniciada · Mejor racha: 10 pagos' },
    referido: { actual: 2, total: 3 },
    misiones: { activas: true, ronda: 2, cupon: 'Cupón disponible' },
    descuentosAplicados: [],
    beneficiosProgramados: [
      { origen: 'Misiones', concepto: 'Descuento por misión', detalle: 'Periodo 2 de 3 · hasta ene 2027', valor: '-$5.00', estado: 'Programado' }
    ],
    pendientes: [],
    identidad: { mostrar: 'Daniela R.', usuario: 'daniela.demo@ejemplo.mx', telefono: 'WhatsApp registrado', origen: 'GOXION' },
    credenciales: [
      { servicio: 'ViX Premium · Perfil 1', perfil: 'Daniela · P1', pin: '••••', cuentaMadre: 'ViX · Cuenta 2 (3/4)', contrasena: 'De la cuenta compartida' },
      { servicio: 'ViX Premium · Perfil 2', perfil: 'Daniela · P2', pin: '••••', cuentaMadre: 'ViX · Cuenta 2 (3/4)', contrasena: 'De la cuenta compartida' }
    ]
  },
  {
    id: 'b',
    nombre: 'Jorge P.',
    folio: 'GX-2026-0157',
    regimen: 'Fecha única',
    estado: 'Pagado', estadoClase: 'pagado',
    frase: 'Mensualidad cubierta', fecha: '15 dic', periodo: 'dic 2026',
    base: 79.00, descuentos: 4.74, abonos: 74.26, mora: 0,
    ciclo: null,
    servicios: [
      { nombre: 'YouTube Premium', perfil: 'Perfil único', importe: 79.00, estado: 'Activo', estadoClase: 'ok' }
    ],
    lealtad: { pagos: 12, nota: 'Nivel 2 · 6% de descuento' },
    referido: { actual: 1, total: 3 },
    misiones: { activas: false, ronda: 0, cupon: 'Sin cupón activo' },
    descuentosAplicados: [
      { origen: 'Lealtad · Nivel 2', concepto: 'Descuento por racha', detalle: 'Aplicado en dic 2026', valor: '-$4.74' }
    ],
    beneficiosProgramados: [],
    pendientes: [],
    identidad: { mostrar: 'Jorge P.', usuario: 'jorge.demo@ejemplo.mx', telefono: 'WhatsApp registrado', origen: 'GOXION' },
    credenciales: [
      { servicio: 'YouTube Premium', perfil: 'Jorge · YT', pin: '••••', cuentaMadre: 'YT · Cuenta 1 (2/5)', contrasena: 'De la cuenta compartida' }
    ]
  },
  {
    id: 'c',
    nombre: 'Mariana S.',
    folio: 'GX-2026-0163',
    regimen: 'Fecha única',
    estado: 'En revisión', estadoClase: 'en-revision',
    frase: 'Vencido hace 2 días', fecha: '11 nov', periodo: 'nov 2026',
    base: 208.00, descuentos: 0, abonos: 0, mora: 10.40,
    ciclo: null,
    servicios: [
      { nombre: 'Netflix', perfil: 'Perfil 1', importe: 119.00, estado: 'Activo', estadoClase: 'ok' },
      { nombre: 'Disney+', perfil: 'Perfil 1', importe: 89.00, estado: 'Activo', estadoClase: 'ok' },
      { nombre: 'Disney+', perfil: 'Perfil 2', importe: 0, estado: 'Sin configurar', estadoClase: 'off' }
    ],
    lealtad: { pagos: 4, nota: 'En racha · 4 pagos puntuales' },
    referido: { actual: 0, total: 3 },
    misiones: { activas: true, ronda: 1, cupon: 'Sin cupón activo' },
    descuentosAplicados: [],
    beneficiosProgramados: [],
    pendientes: [
      { tipo: 'review', icono: 'ic-doc', titulo: 'Comprobante en revisión', detalle: 'El cliente reportó $208.00. Faltan $10.40 de mora.', accion: 'Revisar ahora' },
      { tipo: 'cancel', icono: 'ic-x', titulo: 'Cancelación pendiente · Disney+', detalle: 'Solicitud del cliente, espera tu decisión.', accion: 'Decidir' },
      { tipo: 'config', icono: 'ic-alert', titulo: '1 acceso sin configurar', detalle: 'Disney+ · Perfil 2 no tiene PIN asignado.', accion: 'Configurar' }
    ],
    identidad: { mostrar: 'Mariana S.', usuario: 'mariana.demo@ejemplo.mx', telefono: 'WhatsApp registrado', origen: 'GOXION' },
    credenciales: [
      { servicio: 'Netflix · Perfil 1', perfil: 'Mariana · N1', pin: '••••', cuentaMadre: 'Netflix · Cuenta 4 (4/4)', contrasena: 'De la cuenta compartida' },
      { servicio: 'Disney+ · Perfil 1', perfil: 'Mariana · D1', pin: '••••', cuentaMadre: 'Disney+ · Cuenta 1 (2/4)', contrasena: 'De la cuenta compartida' },
      { servicio: 'Disney+ · Perfil 2', perfil: 'Sin asignar', pin: 'Sin PIN', cuentaMadre: 'Sin cuenta asignada', contrasena: '—' }
    ]
  }
];

/* ---------- Utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const money = v => '$' + v.toFixed(2);
/* La cifra correcta, calculada en un solo lugar. Para B2 es el resto del ciclo. */
const resto = c => c.base - c.descuentos - c.abonos + c.mora;
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const icon = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';

let toastTimer = null;
function showToast(msg) {
  const t = $('#gx-toast');
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('gx-show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('gx-show');
    setTimeout(() => { t.hidden = true; }, 240);
  }, 2600);
}
const DEMO_MSG = 'Espejo: solo visualización. En el Admin real esta acción sí haría su efecto.';

/* ---------- Tarjeta cerrada ---------- */
function cardHTML(c, i) {
  const r = resto(c);
  const ajuste = 'base ' + money(c.base) +
    ' · descuentos −' + money(c.descuentos) +
    ' · abonos −' + money(c.abonos) +
    ' · mora ' + money(c.mora);
  const pendientes = c.pendientes.map(p =>
    '<div class="gx-pending-item' + (p.tipo === 'review' ? ' gx-pending-item--review' : '') + '">' +
    icon(p.icono) + '<span><b>' + esc(p.titulo) + '</b>' +
    (p.tipo === 'review' ? ' · $208.00' : '') + '</span>' +
    '<span class="gx-pending-act">' + esc(p.accion) + '</span></div>'
  ).join('');
  const servicios = c.servicios.map(s =>
    '<div class="gx-service-row"><span class="gx-dot' + (s.estadoClase === 'off' ? ' gx-dot--off' : '') + '"></span>' +
    '<span>' + esc(s.nombre) + ' · ' + esc(s.perfil) + '</span>' +
    '<span class="gx-service-state">' + esc(s.estado) + '</span>' +
    (s.importe ? '<span class="gx-service-amount">' + money(s.importe) + '</span>' : '') + '</div>'
  ).join('');
  const chips =
    '<span class="gx-chip">' + icon('ic-star') + 'Lealtad · <b>' + c.lealtad.pagos + ' pago' + (c.lealtad.pagos === 1 ? '' : 's') + '</b></span>' +
    '<span class="gx-chip">' + icon('ic-gift') + 'Referido · <b>' + c.referido.actual + '/' + c.referido.total + '</b>' +
    '<span class="gx-bar"><i style="--p:' + (c.referido.actual / c.referido.total) + '"></i></span></span>' +
    (c.misiones.activas
      ? '<span class="gx-chip gx-chip--live">' + icon('ic-target') + 'Misiones · <b>Ronda ' + c.misiones.ronda + '</b></span>'
      : '<span class="gx-chip">' + icon('ic-target') + 'Misiones · <b>Sin activas</b></span>');

  return '<article class="client-card" data-st="' + c.estadoClase + '" data-client="' + c.id + '" style="--i:' + i + '" tabindex="0" role="button" aria-label="Abrir ficha de ' + esc(c.nombre) + '">' +
    '<div class="gx-card-head"><div><div class="gx-card-name">' + esc(c.nombre) + '</div>' +
    '<span class="gx-card-folio">' + esc(c.folio) + '</span></div>' +
    '<span class="gx-badge">' + esc(c.estado) + '</span></div>' +
    '<div class="gx-money"><div class="gx-money-figure">' + (r === 0 ? '$0.00' : money(r)) +
    ' <small>· ' + (r === 0 ? 'cubierto' : 'resto por cobrar') + '</small></div>' +
    '<p class="gx-money-line">' + ajuste + '</p></div>' +
    '<p class="gx-phrase">' + icon('ic-clock') + esc(c.frase) + ' · <time>Fecha ' + esc(c.fecha) + ' · ' + esc(c.periodo) + '</time></p>' +
    (pendientes ? '<div class="gx-pending">' + pendientes + '</div>' : '') +
    '<div class="gx-services"><p class="gx-services-title">Servicios · ' + c.servicios.length + '</p>' + servicios + '</div>' +
    '<div class="gx-progress">' + chips + '</div>' +
    '<button type="button" class="gx-card-wa" data-gx-wa="' + c.id + '">' + icon('ic-message') + 'Enviar WhatsApp</button>' +
    '</article>';
}

function renderCards() {
  $('#gx-client-list').innerHTML = DEMO_CLIENTS.map(cardHTML).join('');
  $$('.client-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-gx-wa]')) return; /* el botón WA no abre la ficha */
      openSheet(card.dataset.client);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(card.dataset.client); }
    });
  });
  $$('[data-gx-wa]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    showToast(DEMO_MSG);
  }));
}

/* ---------- Ficha (hoja inferior) ---------- */
let currentClient = null;

function atencionHTML(c) {
  const items = c.pendientes.map((p, idx) => {
    let actions = '';
    if (p.tipo === 'review') actions = '<button type="button" class="gx-btn gx-btn--primary gx-btn--sm" data-gx-review="' + c.id + '">Revisar ahora</button>';
    if (p.tipo === 'cancel') actions = '<button type="button" class="gx-btn gx-btn--ok gx-btn--sm" data-gx-cancel="aceptar">Aceptar</button>' +
      '<button type="button" class="gx-btn gx-btn--danger gx-btn--sm" data-gx-cancel="rechazar">Rechazar</button>';
    if (p.tipo === 'config') actions = '<button type="button" class="gx-btn gx-btn--line gx-btn--sm" data-gx-config="' + c.id + '">Configurar acceso</button>';
    return '<div class="gx-att-item' + (p.tipo === 'review' ? ' gx-att-item--review' : p.tipo === 'config' ? ' gx-att-item--config' : '') + '" data-gx-att="' + idx + '">' +
      icon(p.icono) + '<div class="gx-att-body"><b>' + esc(p.titulo) + '</b><p>' + esc(p.detalle) + '</p>' +
      '<div class="gx-att-actions">' + actions + '</div></div></div>';
  }).join('');
  return '<section class="gx-section gx-section--atencion" id="gx-sec-atencion" style="--d:0ms">' +
    '<h3>' + icon('ic-alert') + 'Atención' + (c.pendientes.length ? '<span class="gx-count-badge">' + c.pendientes.length + ' pendiente' + (c.pendientes.length === 1 ? '' : 's') + '</span>' : '') + '</h3>' +
    (items || '<div class="gx-empty">' + icon('ic-check') + '<span><b>Sin pendientes.</b><br>Nada requiere tu atención en este cliente.</span></div>') +
    '</section>';
}

function cobroHTML(c) {
  const r = resto(c);
  const rows =
    '<div class="gx-break-row"><span>Base mensual</span><b>' + money(c.base) + '</b></div>' +
    '<div class="gx-break-row"><span>Descuentos</span><b>−' + money(c.descuentos) + '</b></div>' +
    '<div class="gx-break-row"><span>Abonos acreditados</span><b>−' + money(c.abonos) + '</b></div>' +
    '<div class="gx-break-row"><span>Mora</span><b>' + money(c.mora) + '</b></div>' +
    '<div class="gx-break-row gx-break-row--total"><span>' + (c.regimen === 'B2' ? 'Total del ciclo' : 'Total del periodo') + '</span><b>' + money(c.base - c.descuentos + c.mora) + '</b></div>';
  const cycle = c.ciclo ? '<div class="gx-cycle"><p class="gx-cycle-title">Cobro B2 · ' + esc(c.periodo) + '</p>' +
    c.ciclo.map(ch =>
      '<div class="gx-cycle-row"><time>' + esc(ch.fecha) + '</time><span>' + esc(ch.servicio) + '</span>' +
      '<span class="gx-cycle-state ' + (ch.estado === 'Liquidado' ? 'gx-cycle-state--done' : 'gx-cycle-state--todo') + '">' + esc(ch.estado) + '</span>' +
      '<b>' + money(ch.importe) + '</b></div>').join('') + '</div>' : '';
  const descuentos = c.descuentosAplicados.length
    ? c.descuentosAplicados.map(d =>
      '<div class="gx-disc-row">' + icon('ic-check') + '<span>' + esc(d.origen) + ' · ' + esc(d.concepto) + '<br><small>' + esc(d.detalle) + '</small></span><b>' + esc(d.valor) + '</b></div>').join('')
    : '<div class="gx-empty">' + icon('ic-info') + '<span>Sin descuentos este periodo.</span></div>';
  const pagar = r > 0
    ? '<button type="button" class="gx-btn gx-btn--primary" id="gx-marcar-pagado">' + icon('ic-check') + 'Marcar pagado · ' + money(r) + '</button>'
    : '<button type="button" class="gx-btn gx-btn--primary" disabled style="opacity:.45">Marcar pagado</button>' +
      '<p class="gx-money-line" style="margin-top:6px">Sin saldo pendiente este periodo.</p>';
  return '<section class="gx-section" id="gx-sec-cobro" style="--d:60ms">' +
    '<h3>' + icon('ic-card') + 'Cobro</h3>' +
    '<div class="gx-cobro-hero"><p class="gx-money-label">Resto por cobrar</p>' +
    '<div class="gx-money-figure">' + money(r) + '</div></div>' +
    '<div class="gx-breakdown">' + rows + '</div>' +
    cycle + pagar +
    '<p class="gx-sub-title">Descuentos aplicados · una sola lista</p>' + descuentos +
    '</section>';
}

function serviciosHTML(c) {
  const rows = c.servicios.map((s, idx) =>
    '<div class="gx-svc"><div class="gx-svc-head"><span class="gx-dot' + (s.estadoClase === 'off' ? ' gx-dot--off' : '') + '"></span>' +
    '<b>' + esc(s.nombre) + '</b><span class="gx-service-amount">' + (s.importe ? money(s.importe) : '—') + '</span></div>' +
    '<p class="gx-svc-sub">' + esc(s.perfil) + ' · ' + esc(s.estado) + '</p>' +
    '<div class="gx-svc-actions"><button type="button" class="gx-btn gx-btn--line gx-btn--sm" data-gx-edit-acceso="' + idx + '">' + icon('ic-key') + 'Editar acceso</button></div></div>'
  ).join('');
  return '<section class="gx-section" id="gx-sec-servicios" style="--d:120ms">' +
    '<h3>' + icon('ic-play') + 'Servicios</h3>' + rows + '</section>';
}

function beneficiosHTML(c) {
  const programados = c.beneficiosProgramados.map(b =>
    '<div class="gx-ben-row">' + icon('ic-clock') + '<div><b>' + esc(b.origen) + ' · ' + esc(b.concepto) + '</b>' +
    '<p>' + esc(b.detalle) + ' · ' + esc(b.estado) + '</p></div><span class="gx-ben-val">' + esc(b.valor) + '</span></div>'
  ).join('');
  return '<section class="gx-section" id="gx-sec-beneficios" style="--d:180ms">' +
    '<h3>' + icon('ic-star') + 'Beneficios</h3><div class="gx-ben-list">' +
    '<div class="gx-ben-row">' + icon('ic-star') + '<div><b>Lealtad · ' + c.lealtad.pagos + ' pago' + (c.lealtad.pagos === 1 ? '' : 's') + ' puntual' + (c.lealtad.pagos === 1 ? '' : 'es') + '</b>' +
    '<p>' + esc(c.lealtad.nota) + '</p><span class="gx-ben-ctrl">' +
    '<button type="button" data-gx-loyal="menos" aria-label="Restar un pago puntual">' + icon('ic-minus') + '</button>' +
    '<button type="button" data-gx-loyal="mas" aria-label="Sumar un pago puntual">' + icon('ic-plus') + '</button>' +
    '<button type="button" data-gx-loyal="reiniciar" aria-label="Reiniciar lealtad">' + icon('ic-refresh') + '</button></span></div></div>' +
    '<div class="gx-ben-row">' + icon('ic-gift') + '<div><b>Referido · ' + c.referido.actual + '/' + c.referido.total + ' meses</b>' +
    '<p>' + (c.referido.actual === 0 ? 'Sin referido activo.' : 'Beneficio activo: un mes con descuento al completar 3.') + '</p></div></div>' +
    '<div class="gx-ben-row">' + icon('ic-target') + '<div><b>Misiones · ' + (c.misiones.activas ? 'Ronda ' + c.misiones.ronda + ' activa' : 'Sin misiones activas') + '</b>' +
    '<p>' + esc(c.misiones.cupon) + '</p></div></div>' +
    programados +
    (c.beneficiosProgramados.length === 0 ? '<div class="gx-ben-row">' + icon('ic-clock') + '<div><b>Beneficios programados</b><p>Ninguno programado para este cliente.</p></div></div>' : '') +
    '</div></section>';
}

function cuentaHTML(c) {
  const creds = c.credenciales.map((k, idx) =>
    '<div class="gx-cred" id="gx-cred-' + idx + '"><div class="gx-cred-head">' + icon('ic-key') + '<b>' + esc(k.servicio) + '</b>' +
    '<span class="gx-service-state">' + (k.pin === 'Sin PIN' ? 'Sin configurar' : 'Configurado') + '</span></div>' +
    '<div class="gx-cred-grid">' +
    '<div><span>Perfil</span><b>' + esc(k.perfil) + '</b></div>' +
    '<div><span>PIN del perfil</span><b>' + esc(k.pin) + '</b></div>' +
    '<div><span>Cuenta madre</span><b>' + esc(k.cuentaMadre) + '</b></div>' +
    '<div><span>Contraseña</span><b>' + esc(k.contrasena) + '</b></div></div>' +
    '<div class="gx-cred-actions"><button type="button" class="gx-btn gx-btn--line gx-btn--sm" data-gx-gestionar>Gestionar contraseña</button></div></div>'
  ).join('');
  return '<section class="gx-section" id="gx-sec-cuenta" style="--d:240ms">' +
    '<h3>' + icon('ic-user') + 'Cuenta y accesos</h3>' +
    '<label class="gx-field"><span>Nombre a mostrar</span><input type="text" value="' + esc(c.identidad.mostrar) + '" readonly></label>' +
    '<label class="gx-field"><span>Usuario / correo</span><input type="text" value="' + esc(c.identidad.usuario) + '" readonly></label>' +
    '<label class="gx-field"><span>Teléfono</span><input type="text" value="' + esc(c.identidad.telefono) + '" readonly></label>' +
    '<label class="gx-field"><span>Origen</span><input type="text" value="' + esc(c.identidad.origen) + '" readonly></label>' +
    '<p class="gx-sub-title">PIN de acceso del cliente</p>' +
    '<div class="gx-pin-box">' + icon('ic-lock') + '<div><b>••••</b><p>Protegido · no se puede recuperar</p></div>' +
    '<span class="gx-pin-actions"><button type="button" class="gx-btn gx-btn--line gx-btn--sm" data-gx-pin="cambiar">Cambiar PIN</button>' +
    '<button type="button" class="gx-btn gx-btn--line gx-btn--sm" data-gx-pin="generar">Generar PIN</button></span></div>' +
    '<p class="gx-sub-title">Accesos y claves · un solo sitio</p>' + creds +
    '</section>';
}

function renderSheet(c) {
  $('#gx-sheet-folio').textContent = c.folio;
  $('#gx-sheet-name').textContent = c.nombre;
  $('#gx-sheet-meta').innerHTML = '<b>' + esc(c.estado) + '</b> · Fecha ' + esc(c.fecha) + ' · ' + esc(c.periodo) + (c.regimen === 'B2' ? ' · B2' : '');
  $('#gx-sheet-body').innerHTML =
    atencionHTML(c) + cobroHTML(c) + serviciosHTML(c) + beneficiosHTML(c) + cuentaHTML(c);
  wireSheet(c);
}

function wireSheet(c) {
  const body = $('#gx-sheet-body');
  /* Navegación: desplaza a la sección (nunca oculta nada) */
  $$('#gx-sheet-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = $('#gx-sec-' + btn.dataset.gxSection, body);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $$('#gx-sheet-nav button').forEach(b => b.classList.remove('gx-active'));
      btn.classList.add('gx-active');
    });
  });
  /* Marcar pagado: visible siempre; en el espejo solo cambia de estado visual */
  const mp = $('#gx-marcar-pagado', body);
  if (mp) mp.addEventListener('click', () => {
    mp.classList.add('is-done', 'gx-btn--done');
    mp.innerHTML = icon('ic-check') + 'Marcado (demo) · ' + money(resto(c));
    showToast('Espejo: no se registra ningún pago. En el Admin real quedaría el pago manual, con la guarda contra doble cobro.');
  });
  /* Revisar ahora → modal */
  $$('[data-gx-review]', body).forEach(b => b.addEventListener('click', () => openReview(c)));
  /* Cancelación: estado visual + aviso */
  $$('[data-gx-cancel]', body).forEach(b => b.addEventListener('click', () => {
    b.closest('.gx-att-actions').innerHTML = '<span class="gx-chip gx-chip--live">' + icon('ic-check') + 'Decidido (demo) · ' + esc(b.dataset.gxCancel) + '</span>';
    showToast(DEMO_MSG);
  }));
  /* Configurar acceso → baja a la credencial y la resalta */
  $$('[data-gx-config]', body).forEach(b => b.addEventListener('click', () => {
    const target = $('#gx-cred-2', body) || $('#gx-cred-0', body);
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('flash'); }
  }));
  /* Editar acceso → baja a su bloque de claves (un solo sitio) */
  $$('[data-gx-edit-acceso]', body).forEach(b => b.addEventListener('click', () => {
    const target = $('#gx-cred-' + b.dataset.gxEditAcceso, body);
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.classList.add('flash'); }
  }));
  /* Controles de lealtad, PIN y contraseñas: aviso demo */
  $$('[data-gx-loyal], [data-gx-pin], [data-gx-gestionar]', body).forEach(b =>
    b.addEventListener('click', () => showToast(DEMO_MSG)));
  /* Resaltar la sección visible en la navegación */
  const sections = $$('.gx-section', body);
  const navBtns = $$('#gx-sheet-nav button');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const id = en.target.id.replace('gx-sec-', '');
        navBtns.forEach(b => b.classList.toggle('gx-active', b.dataset.gxSection === id));
      }
    });
  }, { root: body, rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => io.observe(s));
}

/* ---------- Apertura / cierre de la ficha ---------- */
function openSheet(id) {
  const c = DEMO_CLIENTS.find(x => x.id === id);
  if (!c) return;
  currentClient = c;
  renderSheet(c);
  const sheet = $('#gx-sheet'), backdrop = $('#gx-backdrop');
  sheet.hidden = false; backdrop.hidden = false;
  void sheet.offsetWidth; /* reflow para que la transición de entrada corra */
  sheet.classList.add('gx-open');
  backdrop.classList.add('gx-open');
  const atencion = $('#gx-sec-atencion');
  if (atencion && c.pendientes.length) atencion.classList.add('gx-pulse');
  $('#gx-sheet-body').scrollTop = 0;
  $$('#gx-sheet-nav button').forEach((b, i) => b.classList.toggle('gx-active', i === 0));
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  const sheet = $('#gx-sheet'), backdrop = $('#gx-backdrop');
  if (sheet.hidden) return;
  sheet.classList.add('gx-closing');
  backdrop.classList.remove('gx-open');
  setTimeout(() => {
    sheet.hidden = true; backdrop.hidden = true;
    sheet.classList.remove('gx-open', 'gx-closing');
    document.body.style.overflow = '';
  }, 240);
}
$('#gx-sheet-close').addEventListener('click', closeSheet);
$('#gx-sheet-back').addEventListener('click', closeSheet);
$('#gx-backdrop').addEventListener('click', closeSheet);
$('#gx-sheet-wa').addEventListener('click', () => showToast(DEMO_MSG));

/* ---------- Modal de revisión (visual, sin escritura) ---------- */
let reviewClient = null;
function openReview(c) {
  reviewClient = c;
  $('#gx-review-sub').textContent = c.nombre + ' · ' + c.folio + ' · Comprobante reportado por el cliente';
  $('#gx-review-amount').textContent = '$208.00';
  const m = $('#gx-review-modal'), b = $('#gx-modal-backdrop');
  m.hidden = false; b.hidden = false;
  void m.offsetWidth;
  m.classList.add('gx-open'); b.classList.add('gx-open');
}
function closeReview() {
  const m = $('#gx-review-modal'), b = $('#gx-modal-backdrop');
  if (m.hidden) return;
  m.classList.remove('gx-open'); b.classList.remove('gx-open');
  setTimeout(() => { m.hidden = true; b.hidden = true; }, 300);
}
$('#gx-review-cancel').addEventListener('click', closeReview);
$('#gx-modal-backdrop').addEventListener('click', closeReview);
[['gx-review-approve', 'Aprobar'], ['gx-review-partial', 'Pago incompleto'], ['gx-review-reject', 'Rechazar']].forEach(([id, label]) => {
  $('#' + id).addEventListener('click', () => {
    const item = $('[data-gx-att="0"] .gx-att-actions');
    if (item) item.innerHTML = '<span class="gx-chip gx-chip--live">' + icon('ic-check') + label + ' (demo)</span>';
    closeReview();
    showToast('Espejo: decisión "' + label + '" solo visual. En el Admin real se validaría antes de aprobar y se notificaría al cliente.');
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeReview(); closeSheet(); }
});

/* ---------- Arranque ---------- */
renderCards();
