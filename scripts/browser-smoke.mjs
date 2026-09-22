import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4173;
const origin = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, ['scripts/serve-preview.mjs'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(PORT) },
});

let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(origin + '/');
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Preview local no inició.\n' + serverOutput);
}

function attachDiagnostics(page, label, errors) {
  page.on('pageerror', error => errors.push(`${label} pageerror: ${error.stack || error.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const value = msg.text();
    if (value.includes('Failed to load resource')) return;
    if (value.includes('Sesión administrativa inválida o expirada')) return;
    errors.push(`${label} console.error: ${value}`);
  });
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
}

async function assertFunction(page, name, errors, label) {
  const type = await page.evaluate(fn => typeof window[fn], name);
  if (type !== 'function') errors.push(`${label}: falta función global ${name} (typeof=${type})`);
}

async function runAyuda(browser, browserName, errors) {
  const label = `${browserName} · Ayuda`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  attachDiagnostics(page, label, errors);
  await page.goto(origin + '/ayuda.html', { waitUntil: 'load' });
  await page.waitForTimeout(5200);

  const financeReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL === 'object' &&
    window.GOXION_FINANCIAL?.MODE === 'shadow' &&
    typeof window.GOXION_FINANCIAL?.clientState === 'function'
  ).catch(() => false);
  if (!financeReady) errors.push(`${label}: motor financiero compartido no disponible.`);


  const splashHidden = await page.locator('#splash-screen').evaluate(el => {
    const s = getComputedStyle(el);
    return s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0;
  }).catch(() => false);
  if (!splashHidden) errors.push(`${label}: el splash no desapareció.`);

  for (const fn of ['switchTab','openAuthSheet','closeAuthSheet','solicitarCuenta','renderizarSoporteDinamico','cargarCatalogo','gxPaymentHistoryMeta']) {
    await assertFunction(page, fn, errors, label);
  }

  const loyaltyHistoryCases = await page.evaluate(() => ({
    reset: window.gxPaymentHistoryMeta(
      { estado:'pagado', puntual:false, lealtad_efecto:'reinicio', racha_resultado:0 },
      { isLatestPaid:true, hadPriorPaid:true, storedStreak:0 }
    ),
    added: window.gxPaymentHistoryMeta(
      { estado:'pagado', puntual:true, lealtad_efecto:'sumo', racha_resultado:5 },
      { isLatestPaid:true, hadPriorPaid:true, storedStreak:5 }
    ),
    unchanged: window.gxPaymentHistoryMeta(
      { estado:'pagado', lealtad_efecto:'sin_cambio', racha_resultado:5 },
      { isLatestPaid:true, hadPriorPaid:true, storedStreak:5 }
    ),
    legacyReset: window.gxPaymentHistoryMeta(
      { estado:'pagado', notas:'Aprobado desde Admin' },
      { isLatestPaid:true, hadPriorPaid:true, storedStreak:0 }
    )
  }));

  if (loyaltyHistoryCases.reset.loyalty !== 'Racha reiniciada') {
    errors.push(`${label}: historial no refleja reinicio explícito de racha.`);
  }
  if (loyaltyHistoryCases.added.loyalty !== 'Sumó lealtad') {
    errors.push(`${label}: historial no refleja suma explícita de lealtad.`);
  }
  if (loyaltyHistoryCases.unchanged.loyalty === 'Sumó lealtad') {
    errors.push(`${label}: historial marca suma cuando la lealtad no cambió.`);
  }
  if (loyaltyHistoryCases.legacyReset.loyalty === 'Sumó lealtad') {
    errors.push(`${label}: historial legacy afirma suma aunque la racha guardada terminó en 0.`);
  }

  // Mi Espacio: validar el morph cápsula → tarjeta → cápsula también en WebKit/Safari.
  const authBefore = await page.locator('#header-action-btn').boundingBox();
  const authSourceBg = await page.locator('#header-action-btn').evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    window.__gxAuthOpenPromise = window.openAuthSheet?.();
  });
  await page.waitForTimeout(140);
  const authOpening = await page.locator('#header-action-btn').boundingBox();
  const authOpeningBg = await page.locator('#header-action-btn').evaluate(el => getComputedStyle(el).backgroundColor);
  if (!authBefore || !authOpening || authOpening.width <= authBefore.width + 20) {
    errors.push(`${label}: Mi Espacio no creció durante el morph de apertura.`);
  }

  await page.evaluate(async () => { await window.__gxAuthOpenPromise; });
  const authOpen = await page.locator('#header-action-btn').boundingBox();
  const authFinalBg = await page.locator('#header-action-btn').evaluate(el => getComputedStyle(el).backgroundColor);

  const parseRgb = value => (String(value).match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const colorDistance = (a, b) => {
    const aa = parseRgb(a), bb = parseRgb(b);
    if (aa.length < 3 || bb.length < 3) return Infinity;
    return Math.hypot(
      (aa[0] || 0) - (bb[0] || 0),
      (aa[1] || 0) - (bb[1] || 0),
      (aa[2] || 0) - (bb[2] || 0),
      ((aa[3] ?? 1) - (bb[3] ?? 1)) * 255
    );
  };
  if (colorDistance(authOpeningBg, authFinalBg) >= colorDistance(authSourceBg, authFinalBg)) {
    errors.push(`${label}: Mi Espacio conservó demasiado tiempo el fondo de la cápsula durante la apertura.`);
  }
  const authVisible = await page.locator('#header-action-btn').evaluate(el =>
    el.classList.contains('gx-auth-login-visible') && el.getAttribute('aria-expanded') === 'true'
  ).catch(() => false);
  if (!authOpen || authOpen.width <= (authBefore?.width || 0) + 80 || !authVisible) {
    errors.push(`${label}: Mi Espacio no terminó como tarjeta expandida.`);
  }

  await page.evaluate(() => {
    window.__gxAuthClosePromise = window.closeAuthSheet?.();
  });
  // WebKit puede estirar el fade previo. Medimos desde el inicio real
  // del morph: cuando el formulario deja de estar visible.
  await page.waitForFunction(() =>
    !document.getElementById('header-action-btn')?.classList.contains('gx-auth-login-visible'),
    null,
    { timeout: 2500 }
  );
  await page.waitForTimeout(140);
  const authClosing = await page.locator('#header-action-btn').boundingBox();
  if (!authClosing || !authOpen || authClosing.width >= authOpen.width - 20) {
    errors.push(`${label}: Mi Espacio no se contrajo durante el morph de cierre (abierto=${authOpen?.width}, cierre=${authClosing?.width}).`);
  }

  await page.evaluate(async () => { await window.__gxAuthClosePromise; });
  await page.waitForTimeout(40);
  const authAfter = await page.locator('#header-action-btn').boundingBox();
  const authClosedClean = await page.locator('#header-action-btn').evaluate(el =>
    !el.classList.contains('gx-auth-flip-card') &&
    !el.classList.contains('gx-auth-login-visible') &&
    el.getAttribute('aria-expanded') === 'false' &&
    !el.getAttribute('style') &&
    !document.querySelector('.gx-auth-pill-placeholder')
  ).catch(() => false);

  if (!authBefore || !authAfter ||
      Math.abs(authAfter.width - authBefore.width) > 3 ||
      Math.abs(authAfter.height - authBefore.height) > 3 ||
      !authClosedClean) {
    errors.push(`${label}: Mi Espacio no regresó limpiamente a la cápsula original.`);
  }

  for (const [tab,view] of [
    ['catalogo','#view-catalogo'],
    ['soporte','#view-soporte'],
    ['inicio','#view-inicio'],
  ]) {
    const active = await page.evaluate(({ tab, view }) => {
      if (typeof window.switchTab !== 'function') return false;
      window.switchTab(tab);
      return document.querySelector(view)?.classList.contains('active') === true;
    }, { tab, view }).catch(() => false);
    await page.waitForTimeout(120);
    if (!active) errors.push(`${label}: ${view} no quedó activo tras switchTab('${tab}').`);
  }

  // Soporte: comprobar que el morph realmente tenga geometría intermedia,
  // no sólo un salto entre estado compacto y expandido.
  await page.evaluate(() => window.switchTab?.('soporte'));
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.renderizarSoporteDinamico?.({
      _goxion_config: { serviciosGlobales: [{ nombre: 'ViX' }] }
    });
  });

  const supportBtn = page.locator('#support-platforms-grid .platform-btn').first();
  const supportBefore = await supportBtn.boundingBox();
  await page.evaluate(() => {
    const el = document.querySelector('#support-platforms-grid .platform-btn');
    window.selectPlatform?.('ViX', el, {
      preventDefault(){},
      stopPropagation(){}
    });
  });
  await page.waitForTimeout(150);
  const supportOpening = await supportBtn.boundingBox();
  if (!supportBefore || !supportOpening || supportOpening.width <= supportBefore.width + 20) {
    errors.push(`${label}: Soporte no mostró crecimiento intermedio del morph.`);
  }
  await page.waitForTimeout(420);
  const supportOpen = await supportBtn.boundingBox();

  await page.evaluate(() => window.closeSupportMorph?.());
  await page.waitForFunction(() =>
    !document.querySelector('#support-platforms-grid .platform-btn')?.classList.contains('gx-support-expanded'),
    null,
    { timeout: 2500 }
  ).catch(() => {});
  await page.waitForTimeout(140);
  const supportClosing = await supportBtn.boundingBox();
  if (!supportOpen || !supportClosing || supportClosing.width >= supportOpen.width - 20) {
    errors.push(`${label}: Soporte no mostró contracción intermedia del morph.`);
  }
  await page.waitForTimeout(420);
  const supportAfter = await supportBtn.boundingBox();
  if (!supportBefore || !supportAfter || Math.abs(supportAfter.width - supportBefore.width) > 4) {
    errors.push(`${label}: Soporte no regresó a su geometría compacta.`);
  }

  await page.evaluate(() => window.switchTab?.('inicio'));
  await page.evaluate(() => window.solicitarCuenta?.());
  await page.waitForTimeout(150);
  const welcomeOpen = await page.locator('#gx-welcome-modal').evaluate(el => el.classList.contains('show')).catch(() => false);
  if (!welcomeOpen) errors.push(`${label}: el registro -10% no abrió.`);
  // La página se cierra enseguida; no necesitamos esperar la animación de salida del modal.
  await page.close();
}

async function runAdminViewport(browser, browserName, errors, viewport, suffix) {
  const label = `${browserName} · Admin · ${suffix}`;
  const page = await browser.newPage({ viewport });
  attachDiagnostics(page, label, errors);
  await page.goto(origin + '/admin.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const financeReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL === 'object' &&
    window.GOXION_FINANCIAL?.MODE === 'shadow' &&
    typeof window.GOXION_FINANCIAL?.adminState === 'function' &&
    typeof window.GOXION_FINANCIAL?.adminCompare === 'function'
  ).catch(() => false);
  if (!financeReady) errors.push(`${label}: motor financiero compartido no disponible.`);


  // Cualquier función invocada desde HTML debe seguir expuesta globalmente
  // después de externalizar los scripts. Esto detecta roturas de alcance
  // aunque el control todavía se vea correctamente.
  const missingHandlers = await page.evaluate(() => {
    const names = new Set();
    const events = ['onclick','onchange','oninput','onsubmit'];
    const ignored = new Set([
      'if','for','while','switch','function','setTimeout','setInterval',
      'Math','Number','String','Array','Object','Boolean','Date',
      'parseInt','parseFloat'
    ]);

    for (const el of document.querySelectorAll('*')) {
      for (const attr of events) {
        const code = el.getAttribute(attr);
        if (!code) continue;
        for (const match of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
          const name = match[1];
          if (!ignored.has(name)) names.add(name);
        }
      }
    }

    return [...names].filter(name => typeof window[name] !== 'function').sort();
  });
  if (missingHandlers.length) {
    errors.push(`${label}: funciones de controles no expuestas: ${missingHandlers.join(', ')}`);
  }

  for (const fn of [
    'goAdminTab',
    'gxOpenCatalogMode',
    'gxSettingsView',
    'gxOpenRegistrationControl',
    'gxCloseRegistrationControl',
    'gxRegistrationTab',
    'gxToggleNotifications',
    'gxOpenManagementDestination',
    'gxToggleClientFilters',
    'gxClearClientFilters',
  ]) {
    await assertFunction(page, fn, errors, label);
  }

  // Navegación principal: la estructura aprobada debe poder recorrer todas
  // las vistas sin excepciones tanto en escritorio como en WebKit móvil.
  for (const id of ['tab-resumen','tab-clientes','tab-catalogo','tab-ajustes','tab-operaciones','tab-gestion']) {
    const ok = await page.evaluate(tabId => {
      if (typeof window.goAdminTab !== 'function') return false;
      window.goAdminTab(tabId);
      return document.getElementById(tabId)?.classList.contains('active') === true;
    }, id).catch(() => false);
    if (!ok) errors.push(`${label}: no pudo activar ${id}.`);
    await page.waitForTimeout(90);
  }

  // Catálogo: sólo alternar modos visuales, sin guardar ni crear.
  for (const mode of ['services','promotions']) {
    const ok = await page.evaluate(value => {
      try {
        window.goAdminTab?.('tab-catalogo');
        window.gxOpenCatalogMode?.(value);
        return true;
      } catch {
        return false;
      }
    }, mode);
    if (!ok) errors.push(`${label}: falló modo de catálogo ${mode}.`);
    await page.waitForTimeout(80);
  }

  // Ajustes: recorrer las siete superficies, sin ejecutar acciones persistentes.
  for (const view of ['missions','loyalty','fairdeal','accounts','credentials','app','alerts']) {
    const ok = await page.evaluate(value => {
      try {
        window.goAdminTab?.('tab-ajustes');
        window.gxSettingsView?.(value);
        return true;
      } catch {
        return false;
      }
    }, view);
    if (!ok) errors.push(`${label}: falló vista de ajustes ${view}.`);
    await page.waitForTimeout(70);
  }

  // Filtros de clientes: abrir/cerrar debe ser reversible.
  const filtersOk = await page.evaluate(() => {
    try {
      window.goAdminTab?.('tab-clientes');
      window.gxToggleClientFilters?.();
      window.gxClearClientFilters?.();
      return true;
    } catch {
      return false;
    }
  });
  if (!filtersOk) errors.push(`${label}: filtros de clientes fallaron.`);

  // Registros: abrir, recorrer pestañas y cerrar, sin aprobar/rechazar.
  const registrationOk = await page.evaluate(async () => {
    try {
      window.gxOpenRegistrationControl?.();
      const tabs = ['new','pending','review','activated','history','legacy'];
      for (const tab of tabs) window.gxRegistrationTab?.(tab);
      window.gxCloseRegistrationControl?.();
      return true;
    } catch {
      return false;
    }
  });
  if (!registrationOk) errors.push(`${label}: control de registros falló.`);

  // Notificaciones: sólo abrir/cerrar el drawer.
  const notifOk = await page.evaluate(() => {
    try {
      window.gxToggleNotifications?.(true);
      window.gxToggleNotifications?.(false);
      return true;
    } catch {
      return false;
    }
  });
  if (!notifOk) errors.push(`${label}: panel de notificaciones falló.`);

  await page.close();
}

async function runAdmin(browser, browserName, errors) {
  await runAdminViewport(
    browser,
    browserName,
    errors,
    { width: 1280, height: 900 },
    'desktop'
  );
  await runAdminViewport(
    browser,
    browserName,
    errors,
    { width: 390, height: 844 },
    'mobile'
  );
}

const errors = [];
const browsers = [
  ['Chromium', chromium],
  ['WebKit', webkit],
];

try {
  await waitForServer();

  for (const [browserName, browserType] of browsers) {
    let browser;
    try {
      browser = await browserType.launch({ headless: true });
      await runAyuda(browser, browserName, errors);
      await runAdmin(browser, browserName, errors);
    } catch (error) {
      errors.push(`${browserName}: no pudo completar el smoke: ${error.stack || error.message}`);
    } finally {
      await browser?.close().catch(() => {});
    }
  }
} finally {
  server.kill('SIGTERM');
}

if (errors.length) {
  console.error('\nGOXION modern-v2 · browser smoke falló\n');
  for (const error of errors) console.error('• ' + error);
  process.exit(1);
}

console.log('GOXION modern-v2 · browser smoke OK');
console.log('✓ Chromium y WebKit');
console.log('✓ motor financiero compartido disponible en modo sombra');
console.log('✓ Ayuda quita splash y navega entre vistas');
console.log('✓ Mi Espacio crece y se contrae a su cápsula original');
console.log('✓ Soporte conserva crecimiento/contracción intermedia');
console.log('✓ Historial distingue suma/reinicio de lealtad');
console.log('✓ Registro de bienvenida abre');
console.log('✓ Admin expone todas las funciones usadas por controles HTML');
console.log('✓ Admin recorre navegación, catálogo, ajustes, filtros, registros y notificaciones');
console.log('✓ Admin pasa smoke en desktop y mobile');
