import { chromium } from 'playwright';
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
    if (msg.type() === 'error') errors.push(`${label} console.error: ${msg.text()}`);
  });
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
}

async function assertFunction(page, name, errors, label) {
  const type = await page.evaluate(fn => typeof window[fn], name);
  if (type !== 'function') errors.push(`${label}: falta función global ${name} (typeof=${type})`);
}

const errors = [];
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    attachDiagnostics(page, 'Ayuda', errors);
    await page.goto(origin + '/ayuda.html', { waitUntil: 'load' });
    await page.waitForTimeout(5200);

    const splashHidden = await page.locator('#splash-screen').evaluate(el => {
      const s = getComputedStyle(el);
      return s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0;
    }).catch(() => false);
    if (!splashHidden) errors.push('Ayuda: el splash no desapareció.');

    for (const fn of ['switchTab','openAuthSheet','solicitarCuenta','renderizarSoporteDinamico','cargarCatalogo']) {
      await assertFunction(page, fn, errors, 'Ayuda');
    }

    for (const [button,view] of [
      ['#btn-tab-catalogo','#view-catalogo'],
      ['#btn-tab-soporte','#view-soporte'],
      ['#btn-tab-inicio','#view-inicio'],
    ]) {
      await page.locator(button).click();
      await page.waitForTimeout(120);
      const active = await page.locator(view).evaluate(el => el.classList.contains('active')).catch(() => false);
      if (!active) errors.push(`Ayuda: ${view} no quedó activo tras ${button}.`);
    }

    await page.evaluate(() => window.solicitarCuenta?.());
    await page.waitForTimeout(150);
    const welcomeOpen = await page.locator('#gx-welcome-modal').evaluate(el => el.classList.contains('show')).catch(() => false);
    if (!welcomeOpen) errors.push('Ayuda: el registro -10% no abrió.');
    await page.evaluate(() => window.gxCloseWelcomeRegistration?.());
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    attachDiagnostics(page, 'Admin', errors);
    await page.goto(origin + '/admin.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);

    for (const fn of [
      'goAdminTab',
      'gxOpenCatalogMode',
      'gxSettingsView',
      'gxOpenRegistrationControl',
      'gxToggleNotifications',
      'gxOpenManagementDestination',
      'gxToggleClientFilters',
    ]) {
      await assertFunction(page, fn, errors, 'Admin');
    }

    for (const id of ['tab-resumen','tab-clientes','tab-catalogo','tab-ajustes','tab-operaciones','tab-gestion']) {
      const ok = await page.evaluate(tabId => {
        if (typeof window.goAdminTab !== 'function') return false;
        window.goAdminTab(tabId);
        return document.getElementById(tabId)?.classList.contains('active') === true;
      }, id).catch(() => false);
      if (!ok) errors.push(`Admin: no pudo activar ${id}.`);
      await page.waitForTimeout(80);
    }

    await page.close();
  }
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
}

if (errors.length) {
  console.error('\nGOXION modern-v2 · browser smoke falló\n');
  for (const error of errors) console.error('• ' + error);
  process.exit(1);
}

console.log('GOXION modern-v2 · browser smoke OK');
console.log('✓ Ayuda quita splash y navega entre vistas');
console.log('✓ Registro de bienvenida abre');
console.log('✓ Admin expone controladores principales');
console.log('✓ Admin cambia entre secciones principales');
