import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const failures = [];
const PAGES = ['index', 'ayuda', 'admin'];
const ALLOWED_ROOT_HTML = new Set(PAGES.map((page) => page + '.html'));

function fail(message) {
  failures.push(message);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    if (statSync(absolute).isDirectory()) output.push(...walk(absolute));
    else output.push(absolute);
  }
  return output;
}

function repoRelative(absolute) {
  return relative(ROOT, absolute).replace(/\\/g, '/');
}

function localReferencePath(fromFile, reference) {
  const clean = String(reference || '').trim();
  if (
    !clean ||
    clean.startsWith('#') ||
    /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(clean)
  ) {
    return null;
  }

  const withoutQuery = clean.split('#')[0].split('?')[0];
  if (!withoutQuery) return null;

  const absolute = withoutQuery.startsWith('/')
    ? resolve(ROOT, '.' + withoutQuery)
    : resolve(dirname(fromFile), withoutQuery);

  const normalizedRoot = normalize(ROOT + '/');
  const normalizedAbsolute = normalize(absolute);
  if (!normalizedAbsolute.startsWith(normalizedRoot) && normalizedAbsolute !== normalize(ROOT)) {
    return null;
  }
  return absolute;
}

// Root HTML must stay limited to the three production surfaces.
for (const name of readdirSync(ROOT)) {
  const absolute = join(ROOT, name);
  if (statSync(absolute).isFile() && extname(name).toLowerCase() === '.html' && !ALLOWED_ROOT_HTML.has(name)) {
    fail('HTML huérfano en raíz: ' + name);
  }
}

for (const page of PAGES) {
  const htmlPath = join(ROOT, page + '.html');
  const cssPath = join(ROOT, 'assets', 'css', page + '.css');

  if (!existsSync(htmlPath)) {
    fail('Falta ' + page + '.html');
    continue;
  }
  if (!existsSync(cssPath)) {
    fail('Falta assets/css/' + page + '.css');
  }

  const html = readFileSync(htmlPath, 'utf8');

  if (/<style\b/i.test(html)) {
    fail(page + ': reaparecieron estilos inline.');
  }

  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1] || ''));
  if (inlineScripts.length) {
    fail(page + ': reaparecieron scripts inline (' + inlineScripts.length + ').');
  }

  const runtime = './assets/js/core/runtime.js';
  const runtimeAt = html.indexOf(runtime);
  const areaScriptAt = html.indexOf('./assets/js/' + page + '/');
  if (runtimeAt < 0 || areaScriptAt < 0 || runtimeAt > areaScriptAt) {
    fail(page + ': runtime core no está cargado antes de los scripts de página.');
  }

  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const target = localReferencePath(htmlPath, match[1]);
    if (target && !existsSync(target)) {
      fail(page + ': referencia local inexistente: ' + match[1]);
    }
  }
}

const jsRoot = join(ROOT, 'assets', 'js');
for (const absolute of walk(jsRoot)) {
  if (!/\.(?:js|mjs)$/i.test(absolute)) continue;

  const source = readFileSync(absolute, 'utf8');
  const rel = repoRelative(absolute);
  const syntax = spawnSync(process.execPath, ['--check', absolute], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (syntax.status !== 0) {
    fail(rel + ': error de sintaxis: ' + String(syntax.stderr || '').trim());
  }

  if (rel !== 'assets/js/core/runtime.js' && source.includes('hmpevcwodcgbkviarfic.supabase.co')) {
    fail(rel + ': origen de Supabase hardcodeado fuera del runtime central.');
  }

  if (
    rel !== 'assets/js/core/runtime.js' &&
    (
      source.includes('"goxion_client_token"') ||
      source.includes("'goxion_client_token'") ||
      source.includes('"GOXION_ADMIN_TOKEN"') ||
      source.includes("'GOXION_ADMIN_TOKEN'")
    )
  ) {
    fail(rel + ': clave de sesión hardcodeada fuera del runtime central.');
  }

  for (const match of source.matchAll(/(?:import|export)\s+(?:[^'"]*?from\s*)?["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) continue;
    const target = resolve(dirname(absolute), specifier);
    if (!existsSync(target)) {
      fail(rel + ': import relativo inexistente: ' + specifier);
    }
  }
}

// Safari/WebKit gamification invariant: one shared emoji, no duplicate watermark clone.
{
  const path = join(ROOT, 'assets', 'js', 'ayuda', '05-gamification-shared-morph-js.js');
  if (!existsSync(path)) {
    fail('Falta el controlador de morph compartido de gamificación.');
  } else {
    const source = readFileSync(path, 'utf8');
    if (source.includes('gxShouldTravelSharedEmoji')) {
      fail('Gamificación: reapareció una rama especial por tipo de emoji.');
    }
    if (!source.includes("ghost.removeAttribute('data-watermark')")) {
      fail('Gamificación: el clon visual volvió a conservar data-watermark.');
    }
    if (
      !source.includes('const floatingEmoji = targetEmoji ? gxCreateFloatingEmoji(sourceEmoji, targetEmoji) : null;') ||
      !source.includes('floatingEmoji = gxCreateFloatingEmoji(panelEmoji, { ...sourceEmoji, text: panelEmoji.text });')
    ) {
      fail('Gamificación: apertura/cierre dejaron de usar el shared-element común.');
    }
  }
}

// Payment history must consume the real loyalty audit produced by Admin/backend.
{
  const adapterPath = join(ROOT, 'assets', 'js', 'ayuda', '02-client-supabase-layer.js');
  const dashboardPath = join(ROOT, 'assets', 'js', 'ayuda', '01e-client-dashboard.js');
  const adapter = existsSync(adapterPath) ? readFileSync(adapterPath, 'utf8') : '';
  const dashboard = existsSync(dashboardPath) ? readFileSync(dashboardPath, 'utf8') : '';

  for (const field of ['puntual', 'lealtad_efecto', 'racha_resultado']) {
    if (!adapter.includes(field)) fail('Historial de pagos: falta campo de auditoría ' + field + '.');
  }
  if (!dashboard.includes('window.gxPaymentHistoryMeta')) {
    fail('Historial de pagos: falta clasificador de lealtad.');
  }
  if (!dashboard.includes("efecto === 'reinicio'") || !dashboard.includes("efecto === 'sumo'")) {
    fail('Historial de pagos: no distingue suma y reinicio de racha.');
  }
}


// Financial engine phase 1: all production surfaces load the same shadow contract.
{
  const runtimePath = join(ROOT, 'assets', 'js', 'core', 'runtime.js');
  const financialPath = join(ROOT, 'assets', 'js', 'core', 'financial-engine.js');
  const financialTypesPath = join(ROOT, 'assets', 'js', 'core', 'financial-engine.d.ts');
  const runtimeSource = existsSync(runtimePath) ? readFileSync(runtimePath, 'utf8') : '';

  if (!runtimeSource.includes("'estado-financiero': 'estado-financiero'")) {
    fail('Motor financiero: falta endpoint estado-financiero en runtime.');
  }
  if (!existsSync(financialPath)) {
    fail('Motor financiero: falta assets/js/core/financial-engine.js.');
  }
  if (!existsSync(financialTypesPath)) {
    fail('Motor financiero: falta contrato financial-engine.d.ts.');
  }

  for (const page of PAGES) {
    const html = readFileSync(join(ROOT, page + '.html'), 'utf8');
    const runtimeAt = html.indexOf('./assets/js/core/runtime.js');
    const financialAt = html.indexOf('./assets/js/core/financial-engine.js');
    const areaAt = html.indexOf('./assets/js/' + page + '/');
    if (runtimeAt < 0 || financialAt < 0 || areaAt < 0 || !(runtimeAt < financialAt && financialAt < areaAt)) {
      fail(page + ': motor financiero no carga entre runtime y scripts de página.');
    }
  }
}


// Index phase 2A: prefer the unified financial engine with a safe legacy fallback.
{
  const indexLayerPath = join(ROOT, 'assets', 'js', 'index', '01-index-supabase-layer.js');
  const source = existsSync(indexLayerPath) ? readFileSync(indexLayerPath, 'utf8') : '';

  if (!source.includes('window.gxSelectIndexFinancialState = function')) {
    fail('Index financiero: falta selector de fuente financiera.');
  }
  if (!source.includes('window.GOXION_FINANCIAL?.clientState?.()')) {
    fail('Index financiero: no consulta el motor financiero unificado.');
  }
  if (!source.includes('legacy-fallback')) {
    fail('Index financiero: falta fallback legacy seguro.');
  }
  if (!source.includes('__GOXION_INDEX_FINANCE_AUDIT')) {
    fail('Index financiero: falta auditoría silenciosa de paridad.');
  }
}


// Phase 2B/2C: Ayuda and Admin must feed estado_cuenta from the unified engine
// through the shared compatibility selector, keeping the legacy fallback.
{
  const ayudaLayerPath = join(ROOT, 'assets', 'js', 'ayuda', '02-client-supabase-layer.js');
  const adminLayerPath = join(ROOT, 'assets', 'js', 'admin', '02-admin-supabase-layer.js');
  const financialPath = join(ROOT, 'assets', 'js', 'core', 'financial-engine.js');
  const ayuda = existsSync(ayudaLayerPath) ? readFileSync(ayudaLayerPath, 'utf8') : '';
  const admin = existsSync(adminLayerPath) ? readFileSync(adminLayerPath, 'utf8') : '';
  const financial = existsSync(financialPath) ? readFileSync(financialPath, 'utf8') : '';

  if (!financial.includes('function selectCompatibleState(') || !financial.includes('legacy-variance-fallback')) {
    fail('Motor financiero: falta selector compartido con fallback por divergencia.');
  }

  if (!ayuda.includes('window.GOXION_FINANCIAL?.clientState?.()')) {
    fail('Ayuda financiero: no consulta el motor financiero unificado.');
  }
  if (!ayuda.includes('GOXION_FINANCIAL.selectCompatibleState')) {
    fail('Ayuda financiero: no usa el selector compartido.');
  }
  if (!ayuda.includes('__GOXION_AYUDA_FINANCE_AUDIT')) {
    fail('Ayuda financiero: falta auditoría de paridad.');
  }

  if (!admin.includes('window.GOXION_FINANCIAL?.adminCompare?.()')) {
    fail('Admin financiero: no consulta el motor financiero unificado por lote.');
  }
  if (!admin.includes('GOXION_FINANCIAL.selectCompatibleState')) {
    fail('Admin financiero: no usa el selector compartido por cliente.');
  }
  if (!admin.includes('__GOXION_ADMIN_FINANCE_AUDIT')) {
    fail('Admin financiero: falta auditoría por cliente.');
  }
}

if (failures.length) {
  console.error('\nGOXION · verificación fallida\n');
  failures.forEach((item) => console.error('• ' + item));
  process.exit(1);
}

console.log('GOXION · integridad OK');
console.log('✓ sólo existen los tres HTML oficiales en raíz');
console.log('✓ referencias locales válidas');
console.log('✓ CSS/JS externalizados');
console.log('✓ runtime central preservado');
console.log('✓ sintaxis JavaScript válida');
console.log('✓ invariantes Safari y lealtad preservados');
console.log('✓ contrato financiero sombra cargado en las tres superficies');
console.log('✓ Index usa motor financiero con fallback y auditoría de paridad');
console.log('✓ Ayuda y Admin usan motor financiero con fallback por cliente');
