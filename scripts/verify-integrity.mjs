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


// Financial engine: all production surfaces load the same official contract.
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
  const financialSource = existsSync(financialPath) ? readFileSync(financialPath, 'utf8') : '';
  if (!financialSource.includes("MODE: 'official'") || !financialSource.includes("CONTRACT_VERSION: '1.1'")) {
    fail('Motor financiero: frontend no está alineado al contrato financiero oficial v1.1.');
  }
  const financialActionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  if (!existsSync(financialActionsPath)) {
    fail('Acciones financieras: falta assets/js/core/financial-actions.js.');
  }
  const financialActionsSource = existsSync(financialActionsPath) ? readFileSync(financialActionsPath, 'utf8') : '';
  if (!financialActionsSource.includes("CONTRACT_VERSION: '1.2'")) {
    fail('Acciones financieras: frontend no está alineado al contrato v1.2.');
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
  if (!source.includes('GOXION_FINANCIAL.selectCompatibleState')) {
    fail('Index financiero: selector no delega al motor compartido.');
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


// Phase 3A: payment approval must use the unified financial action gateway.
{
  const runtimePath = join(ROOT, 'assets', 'js', 'core', 'runtime.js');
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const actionsTypesPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.d.ts');
  const adminHtmlPath = join(ROOT, 'admin.html');
  const writePath = join(ROOT, 'assets', 'js', 'admin', '03-supabase-v3-writes.js');
  const opsPath = join(ROOT, 'assets', 'js', 'admin', '07-admin-ops-v2.js');

  const runtime = existsSync(runtimePath) ? readFileSync(runtimePath, 'utf8') : '';
  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const adminHtml = existsSync(adminHtmlPath) ? readFileSync(adminHtmlPath, 'utf8') : '';
  const writes = existsSync(writePath) ? readFileSync(writePath, 'utf8') : '';
  const ops = existsSync(opsPath) ? readFileSync(opsPath, 'utf8') : '';

  if (!runtime.includes("'acciones-financieras': 'acciones-financieras'")) {
    fail('Acciones financieras: falta endpoint acciones-financieras en runtime.');
  }
  if (!existsSync(actionsPath) || !actions.includes('window.GOXION_FINANCIAL_ACTIONS')) {
    fail('Acciones financieras: falta cliente compartido.');
  }
  if (!existsSync(actionsTypesPath)) {
    fail('Acciones financieras: falta contrato TypeScript.');
  }
  if (!actions.includes("invoke('aprobar_pago'") || !actions.includes('periodo_esperado')) {
    fail('Acciones financieras: aprobar pago no usa el contrato protegido por periodo.');
  }

  const engineAt = adminHtml.indexOf('./assets/js/core/financial-engine.js');
  const actionsAt = adminHtml.indexOf('./assets/js/core/financial-actions.js');
  const adminAt = adminHtml.indexOf('./assets/js/admin/');
  if (engineAt < 0 || actionsAt < 0 || adminAt < 0 || !(engineAt < actionsAt && actionsAt < adminAt)) {
    fail('Admin: acciones financieras no cargan entre el motor y los scripts de página.');
  }

  for (const [label, source] of [['writes', writes], ['ops', ops]]) {
    if (!source.includes('GOXION_FINANCIAL_ACTIONS.approvePayment')) {
      fail('Admin ' + label + ': aprobación de pago no usa acciones financieras.');
    }
    if (source.includes('aprobar_pago_periodo')) {
      fail('Admin ' + label + ': persiste una aprobación directa a periodo-cobro.');
    }
  }
}


// Phase 3B: Fair Deal writes must use the unified financial action gateway.
{
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const writePath = join(ROOT, 'assets', 'js', 'admin', '03-supabase-v3-writes.js');
  const individualPath = join(ROOT, 'assets', 'js', 'admin', '12-admin-v10-trato-justo-controller.js');
  const bulkPath = join(ROOT, 'assets', 'js', 'admin', '19-admin-trato-justo-masivo-controller.js');

  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const writes = existsSync(writePath) ? readFileSync(writePath, 'utf8') : '';
  const individual = existsSync(individualPath) ? readFileSync(individualPath, 'utf8') : '';
  const bulk = existsSync(bulkPath) ? readFileSync(bulkPath, 'utf8') : '';

  for (const required of [
    "invoke('trato_justo_guardar'",
    "invoke('trato_justo_eliminar'",
    "invoke('trato_justo_masivo'",
    'saveFairDeal',
    'deleteFairDeal',
    'applyFairDealBulk',
  ]) {
    if (!actions.includes(required)) fail('Acciones financieras: falta Trato Justo ' + required + '.');
  }

  if (writes.includes('gxTratoJustoAction') || writes.includes('GXCORE.endpoint("trato-justo")')) {
    fail('Admin writes: persiste el puente directo de escritura a Trato Justo.');
  }

  if (
    !individual.includes('GOXION_FINANCIAL_ACTIONS.saveFairDeal') ||
    !individual.includes('GOXION_FINANCIAL_ACTIONS.deleteFairDeal') ||
    individual.includes('gxTratoJustoAction') ||
    individual.includes("'guardar_compensacion'") ||
    individual.includes("'eliminar_compensacion'")
  ) {
    fail('Trato Justo individual: no usa exclusivamente acciones financieras.');
  }

  if (
    !bulk.includes('GOXION_FINANCIAL_ACTIONS.applyFairDealBulk') ||
    bulk.includes('gxTratoJustoAction') ||
    bulk.includes('guardar_compensaciones_masivas')
  ) {
    fail('Trato Justo masivo: no usa exclusivamente acciones financieras.');
  }
}



// Phase 3C: Programmed benefits must use the unified financial action gateway.
{
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const benefitPath = join(ROOT, 'assets', 'js', 'admin', '28-admin-beta-20-benefits.js');
  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const benefits = existsSync(benefitPath) ? readFileSync(benefitPath, 'utf8') : '';

  for (const required of [
    "invoke('beneficio_crear'",
    "invoke('beneficio_cancelar'",
    "invoke('beneficio_eliminar'",
    'saveBenefit',
    'cancelBenefit',
    'deleteBenefit',
  ]) {
    if (!actions.includes(required)) fail('Beneficios programados: falta ' + required + '.');
  }
  if (
    !benefits.includes('GOXION_FINANCIAL_ACTIONS.saveBenefit') ||
    !benefits.includes('GOXION_FINANCIAL_ACTIONS.cancelBenefit')
  ) {
    fail('Beneficios programados: Admin no usa acciones financieras.');
  }
  if (benefits.includes('GXCORE.endpoint("beneficios-admin-beta")') || benefits.includes('gxBenefitAction')) {
    fail('Beneficios programados: persiste un puente directo de escritura.');
  }
}


// Ayuda C1: promotional catalog stays isolated in its own presentation controller.
{
  const ayudaHtmlPath = join(ROOT, 'ayuda.html');
  const promoCatalogPath = join(ROOT, 'assets', 'js', 'ayuda', '15-promotions-catalog-c1.js');
  const ayudaCssPath = join(ROOT, 'assets', 'css', 'ayuda.css');
  const catalogOrdersPath = join(ROOT, 'assets', 'js', 'ayuda', '01f-catalog-orders.js');
  const ayudaHtml = existsSync(ayudaHtmlPath) ? readFileSync(ayudaHtmlPath, 'utf8') : '';
  const promoCatalog = existsSync(promoCatalogPath) ? readFileSync(promoCatalogPath, 'utf8') : '';
  const ayudaCss = existsSync(ayudaCssPath) ? readFileSync(ayudaCssPath, 'utf8') : '';
  const catalogOrders = existsSync(catalogOrdersPath) ? readFileSync(catalogOrdersPath, 'utf8') : '';

  if (!existsSync(promoCatalogPath)) fail('Ayuda C1: falta controlador de catálogo promocional.');
  if (!ayudaHtml.includes('id="gx-promo-showcase"')) fail('Ayuda C1: falta deck promocional.');
  if (!ayudaHtml.includes('id="gx-catalog-curated"')) fail('Ayuda C1: falta curaduría del catálogo.');
  if (!ayudaHtml.includes('./assets/js/ayuda/15-promotions-catalog-c1.js')) fail('Ayuda C1: controlador no está cargado.');
  if (!promoCatalog.includes("GXCORE.endpoint('promociones-catalogo')")) fail('Ayuda C1: promociones no consumen el endpoint dedicado.');
  if (!promoCatalog.includes('gx-promo-deck-card')) fail('Ayuda C1: falta deck interactivo.');
  if (!promoCatalog.includes('gx-promo-morph-detail')) fail('Ayuda C9: falta contenido interno del morph.');
  if (!promoCatalog.includes('document.body.appendChild(card)') || !promoCatalog.includes('expandedPlaceholder')) {
    fail('Ayuda C9: el morph debe reutilizar la misma tarjeta.');
  }
  if (promoCatalog.includes('gx-promo-card-orbit')) fail('Ayuda C9: las órbitas no deben existir en el hero.');
  if (!promoCatalog.includes('gx-promo-value-stack')) fail('Ayuda C9: falta bloque de valor vertical.');
  if (!promoCatalog.includes('gx-promo-old-price')) fail('Ayuda C9: falta precio anterior separado.');
  if (!promoCatalog.includes('Ahorras 
{
  const adminHtmlPath = join(ROOT, 'admin.html');
  const studioPath = join(ROOT, 'assets', 'js', 'admin', '29-promotions-studio-v2.js');
  const adminHtml = existsSync(adminHtmlPath) ? readFileSync(adminHtmlPath, 'utf8') : '';
  const studio = existsSync(studioPath) ? readFileSync(studioPath, 'utf8') : '';

  if (!existsSync(studioPath)) {
    fail('Promotions Studio: falta el controlador v2.');
  }

  const legacyPromoAt = adminHtml.indexOf('./assets/js/admin/25-admin-beta-19-controller.js');
  const studioAt = adminHtml.indexOf('./assets/js/admin/29-promotions-studio-v2.js');
  if (legacyPromoAt < 0 || studioAt < 0 || studioAt <= legacyPromoAt) {
    fail('Promotions Studio: el controlador v2 no carga después del puente promocional heredado.');
  }

  for (const mechanic of ['precio_fijo', 'porcentaje', 'combo', 'addon']) {
    if (!studio.includes(mechanic)) fail('Promotions Studio: falta mecánica ' + mechanic + '.');
  }

  for (const action of [
    'GOXION_FINANCIAL_ACTIONS.savePromotion',
    'GOXION_FINANCIAL_ACTIONS.togglePromotion',
    'GOXION_FINANCIAL_ACTIONS.deletePromotion',
  ]) {
    if (!studio.includes(action)) fail('Promotions Studio: falta gateway financiero ' + action + '.');
  }

  if (!studio.includes('adquisicion_habilitada')) {
    fail('Promotions Studio: falta el contrato de adquisición habilitada.');
  }
  if (!studio.includes("byId('gx-promo-published')?.checked===true &&") || !studio.includes("byId('gx-promo-acquisition')?.checked===true")) {
    fail('Promotions Studio: adquisición debe depender explícitamente de publicación.');
  }

  for (const id of [
    'gx-promo-mechanic-fields',
    'gx-promo-audience',
    'gx-promo-stack-loyalty',
    'gx-promo-published',
    'gx-promo-acquisition',
    'gx-promo-preview',
  ]) {
    if (!adminHtml.includes('id="' + id + '"')) fail('Promotions Studio: falta UI ' + id + '.');
  }
}

// Phase 3D/3E: Promotions and special collection actions must use the financial gateway.
{
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const promoPath = join(ROOT, 'assets', 'js', 'admin', '25-admin-beta-19-controller.js');
  const opsPath = join(ROOT, 'assets', 'js', 'admin', '07-admin-ops-v2.js');
  const guardsPath = join(ROOT, 'assets', 'js', 'admin', '08-admin-payment-referral-guards.js');

  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const promo = existsSync(promoPath) ? readFileSync(promoPath, 'utf8') : '';
  const ops = existsSync(opsPath) ? readFileSync(opsPath, 'utf8') : '';
  const guards = existsSync(guardsPath) ? readFileSync(guardsPath, 'utf8') : '';

  for (const required of [
    "invoke('promocion_guardar'",
    "invoke('promocion_estado'",
    "invoke('promocion_eliminar'",
    "invoke('promocion_asignar'",
    "invoke('promocion_quitar_asignacion'",
    "invoke('registrar_pago_parcial'",
    "invoke('pactar_fecha_pago'",
    "invoke('cancelar_fecha_pactada'",
    'savePromotion',
    'togglePromotion',
    'assignPromotion',
    'registerPartialPayment',
    'pactPaymentDate',
    'cancelPactPaymentDate',
  ]) {
    if (!actions.includes(required)) fail('Acciones financieras 3D/3E: falta ' + required + '.');
  }

  if (!promo.includes('GOXION_FINANCIAL_ACTIONS.savePromotion') || !promo.includes('GOXION_FINANCIAL_ACTIONS.togglePromotion')) {
    fail('Promociones: guardar/activar no pasan por acciones financieras.');
  }
  if (promo.includes("promoApi('guardar'") || promo.includes("promoApi('cambiar_estado'")) {
    fail('Promociones: persiste una escritura directa al endpoint legacy.');
  }

  for (const [label, source] of [['ops', ops], ['guards', guards]]) {
    if (!source.includes('GOXION_FINANCIAL_ACTIONS.registerPartialPayment')) {
      fail('Pagos parciales ' + label + ': falta integración con acciones financieras.');
    }
  }
}

// Catalog categories: Admin must persist a real category instead of relying on name heuristics.
{
  const adminHtml = readFileSync(join(ROOT, 'admin.html'), 'utf8');
  const inlineAdmin = readFileSync(join(ROOT, 'assets', 'js', 'admin', '01-01-inline.js'), 'utf8');
  const mobileCatalog = readFileSync(join(ROOT, 'assets', 'js', 'admin', '15-admin-catalog-controller.js'), 'utf8');
  const adminWrites = readFileSync(join(ROOT, 'assets', 'js', 'admin', '03-supabase-v3-writes.js'), 'utf8');

  if (!adminHtml.includes('<th>Categoría</th>')) fail('Catálogo categorizado: falta columna Categoría.');
  if (!inlineAdmin.includes("'categoria_catalogo'")) fail('Catálogo categorizado: escritorio no edita categoria_catalogo.');
  if (!mobileCatalog.includes("'categoria_catalogo'")) fail('Catálogo categorizado: móvil no edita categoria_catalogo.');
  if (!adminWrites.includes('categoria_catalogo: "streaming"') || !adminWrites.includes('"categoria_catalogo"')) {
    fail('Catálogo categorizado: escritura/default no están integrados.');
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
console.log('✓ contrato financiero oficial v1.1 cargado en las tres superficies');
console.log('✓ acciones financieras compartidas alineadas al contrato v1.2');
console.log('✓ Index usa motor financiero con fallback y auditoría de paridad');
console.log('✓ Ayuda y Admin usan motor financiero con fallback por cliente');
console.log('✓ aprobación de pagos usa una sola puerta financiera protegida por periodo');
console.log('✓ Trato Justo individual y masivo usan una sola puerta financiera');
console.log('✓ beneficios programados usan el núcleo financiero');
console.log('✓ promociones y cobros especiales usan el núcleo financiero');
)) fail('Ayuda C9: el ahorro debe expresarse como Ahorras $X.');
  if (!promoCatalog.includes('data-gx-promo-action')) fail('Ayuda C9: falta CTA único morfable.');
  if (!promoCatalog.includes('setPromoActionState')) fail('Ayuda C9: falta transición Ver detalles → Contratar ahora.');
  if (promoCatalog.includes('Ver en catálogo')) fail('Ayuda C9: persiste el segundo botón descartado.');
  if (!promoCatalog.includes('detail.scrollTop=0')) fail('Ayuda C9: el detalle scrollable debe reiniciarse antes de abrir/cerrar.');
  if (!promoCatalog.includes('Fase 2: la tarjeta adopta el layout cerrado REAL mientras sigue fija y grande')) {
    fail('Ayuda C9: el cierre no prepara el layout cerrado real antes de contraer.');
  }
  if (!promoCatalog.includes('GOXION_CATALOG_CART')) fail('Ayuda C9: Contratar ahora no usa el carrito estable.');
  if (!catalogOrders.includes('window.GOXION_CATALOG_CART')) fail('Ayuda C9: falta puente estable del carrito.');
  if (!ayudaCss.includes('GOXION · CATÁLOGO PROMOCIONAL C9 POLISH')) fail('Ayuda C9: faltan estilos finales.');
  if (!ayudaCss.includes('white-space:nowrap') || !ayudaCss.includes('gxPromoC9EdgeTrace')) {
    fail('Ayuda C9: faltan regla atómica de porcentaje o efecto premium visible.');
  }
  if (ayudaCss.includes('GOXION · CATÁLOGO PROMOCIONAL C8 FINAL UI')) fail('Ayuda C9: persiste capa C8 final.');
  if (!ayudaCss.includes('GOXION · C11 CATÁLOGO GLASS HARMONY')) {
    fail('Ayuda C11: falta armonización glass del catálogo.');
  }
  if (!ayudaCss.includes('#view-catalogo .gx-catalog-mini-card') ||
      !ayudaCss.includes('background:var(--card-glass)') ||
      !ayudaCss.includes('backdrop-filter:blur(10px)')) {
    fail('Ayuda C11: la curaduría no reutiliza los parámetros glass existentes.');
  }
  if (!ayudaCss.includes('#view-catalogo .gx-catalog-mini-logo')) {
    fail('Ayuda C11: faltan estilos de logo libre en la curaduría.');
  }
  if (promoCatalog.includes("entry.tag||('Desde 
{
  const adminHtmlPath = join(ROOT, 'admin.html');
  const studioPath = join(ROOT, 'assets', 'js', 'admin', '29-promotions-studio-v2.js');
  const adminHtml = existsSync(adminHtmlPath) ? readFileSync(adminHtmlPath, 'utf8') : '';
  const studio = existsSync(studioPath) ? readFileSync(studioPath, 'utf8') : '';

  if (!existsSync(studioPath)) {
    fail('Promotions Studio: falta el controlador v2.');
  }

  const legacyPromoAt = adminHtml.indexOf('./assets/js/admin/25-admin-beta-19-controller.js');
  const studioAt = adminHtml.indexOf('./assets/js/admin/29-promotions-studio-v2.js');
  if (legacyPromoAt < 0 || studioAt < 0 || studioAt <= legacyPromoAt) {
    fail('Promotions Studio: el controlador v2 no carga después del puente promocional heredado.');
  }

  for (const mechanic of ['precio_fijo', 'porcentaje', 'combo', 'addon']) {
    if (!studio.includes(mechanic)) fail('Promotions Studio: falta mecánica ' + mechanic + '.');
  }

  for (const action of [
    'GOXION_FINANCIAL_ACTIONS.savePromotion',
    'GOXION_FINANCIAL_ACTIONS.togglePromotion',
    'GOXION_FINANCIAL_ACTIONS.deletePromotion',
  ]) {
    if (!studio.includes(action)) fail('Promotions Studio: falta gateway financiero ' + action + '.');
  }

  if (!studio.includes('adquisicion_habilitada')) {
    fail('Promotions Studio: falta el contrato de adquisición habilitada.');
  }
  if (!studio.includes("byId('gx-promo-published')?.checked===true &&") || !studio.includes("byId('gx-promo-acquisition')?.checked===true")) {
    fail('Promotions Studio: adquisición debe depender explícitamente de publicación.');
  }

  for (const id of [
    'gx-promo-mechanic-fields',
    'gx-promo-audience',
    'gx-promo-stack-loyalty',
    'gx-promo-published',
    'gx-promo-acquisition',
    'gx-promo-preview',
  ]) {
    if (!adminHtml.includes('id="' + id + '"')) fail('Promotions Studio: falta UI ' + id + '.');
  }
}

// Phase 3D/3E: Promotions and special collection actions must use the financial gateway.
{
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const promoPath = join(ROOT, 'assets', 'js', 'admin', '25-admin-beta-19-controller.js');
  const opsPath = join(ROOT, 'assets', 'js', 'admin', '07-admin-ops-v2.js');
  const guardsPath = join(ROOT, 'assets', 'js', 'admin', '08-admin-payment-referral-guards.js');

  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const promo = existsSync(promoPath) ? readFileSync(promoPath, 'utf8') : '';
  const ops = existsSync(opsPath) ? readFileSync(opsPath, 'utf8') : '';
  const guards = existsSync(guardsPath) ? readFileSync(guardsPath, 'utf8') : '';

  for (const required of [
    "invoke('promocion_guardar'",
    "invoke('promocion_estado'",
    "invoke('promocion_eliminar'",
    "invoke('promocion_asignar'",
    "invoke('promocion_quitar_asignacion'",
    "invoke('registrar_pago_parcial'",
    "invoke('pactar_fecha_pago'",
    "invoke('cancelar_fecha_pactada'",
    'savePromotion',
    'togglePromotion',
    'assignPromotion',
    'registerPartialPayment',
    'pactPaymentDate',
    'cancelPactPaymentDate',
  ]) {
    if (!actions.includes(required)) fail('Acciones financieras 3D/3E: falta ' + required + '.');
  }

  if (!promo.includes('GOXION_FINANCIAL_ACTIONS.savePromotion') || !promo.includes('GOXION_FINANCIAL_ACTIONS.togglePromotion')) {
    fail('Promociones: guardar/activar no pasan por acciones financieras.');
  }
  if (promo.includes("promoApi('guardar'") || promo.includes("promoApi('cambiar_estado'")) {
    fail('Promociones: persiste una escritura directa al endpoint legacy.');
  }

  for (const [label, source] of [['ops', ops], ['guards', guards]]) {
    if (!source.includes('GOXION_FINANCIAL_ACTIONS.registerPartialPayment')) {
      fail('Pagos parciales ' + label + ': falta integración con acciones financieras.');
    }
  }
}

// Catalog categories: Admin must persist a real category instead of relying on name heuristics.
{
  const adminHtml = readFileSync(join(ROOT, 'admin.html'), 'utf8');
  const inlineAdmin = readFileSync(join(ROOT, 'assets', 'js', 'admin', '01-01-inline.js'), 'utf8');
  const mobileCatalog = readFileSync(join(ROOT, 'assets', 'js', 'admin', '15-admin-catalog-controller.js'), 'utf8');
  const adminWrites = readFileSync(join(ROOT, 'assets', 'js', 'admin', '03-supabase-v3-writes.js'), 'utf8');

  if (!adminHtml.includes('<th>Categoría</th>')) fail('Catálogo categorizado: falta columna Categoría.');
  if (!inlineAdmin.includes("'categoria_catalogo'")) fail('Catálogo categorizado: escritorio no edita categoria_catalogo.');
  if (!mobileCatalog.includes("'categoria_catalogo'")) fail('Catálogo categorizado: móvil no edita categoria_catalogo.');
  if (!adminWrites.includes('categoria_catalogo: "streaming"') || !adminWrites.includes('"categoria_catalogo"')) {
    fail('Catálogo categorizado: escritura/default no están integrados.');
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
console.log('✓ contrato financiero oficial v1.1 cargado en las tres superficies');
console.log('✓ acciones financieras compartidas alineadas al contrato v1.2');
console.log('✓ Index usa motor financiero con fallback y auditoría de paridad');
console.log('✓ Ayuda y Admin usan motor financiero con fallback por cliente');
console.log('✓ aprobación de pagos usa una sola puerta financiera protegida por periodo');
console.log('✓ Trato Justo individual y masivo usan una sola puerta financiera');
console.log('✓ beneficios programados usan el núcleo financiero');
console.log('✓ promociones y cobros especiales usan el núcleo financiero');
") ||
      !promoCatalog.includes("gx-catalog-mini-price")) {
    fail('Ayuda C11: el mini catálogo puede volver a duplicar Desde $xx.');
  }
  if (promoCatalog.includes('promocion_adquirir') || promoCatalog.includes('acquirePromotion')) {
    fail('Ayuda C1: no debe ejecutar adquisiciones durante la fase visual/lectura.');
  }

  // C12: las etiquetas de Admin alimentan curaduría, no decoran el catálogo completo.
  if (catalogOrders.includes('animated-etiqueta') || catalogOrders.includes('has-promo')) {
    fail('Ayuda C12: catálogo completo volvió a usar etiquetas comerciales.');
  }
  if (catalogOrders.includes('score += 2')) {
    fail('Ayuda C12: una etiqueta volvió a alterar genéricamente el recommendation score.');
  }
  if (!catalogOrders.includes('const cardPromoClass = "";') || !catalogOrders.includes('const badgeHtml = "";')) {
    fail('Ayuda C12: el catálogo neutral perdió su separación de presentación.');
  }
  if (!promoCatalog.includes("const tagPopular=") ||
      !promoCatalog.includes("const tagSaving=") ||
      !promoCatalog.includes("const tagNew=") ||
      !promoCatalog.includes("const newEntries=") ||
      !promoCatalog.includes(".filter(x=>x.isNew)") ||
      !promoCatalog.includes("is-popular-featured") ||
      !promoCatalog.includes("is-saving-soft")) {
    fail('Ayuda C12: falta la lógica de curaduría Popular/Ahorro/Nuevo.');
  }
  if (!ayudaCss.includes('GOXION · C12 CURATED HIERARCHY')) {
    fail('Ayuda C12: faltan estilos de jerarquía de movimiento.');
  }

  // C13: el preview pertenece sólo al carrusel; curaduría usa señales reales.
  if (!promoCatalog.includes('function realPromotions()') ||
      !promoCatalog.includes("p?.gx_preview!==true") ||
      !promoCatalog.includes("!String(p?.id||'').startsWith('preview-')")) {
    fail('Ayuda C13: preview volvió a contaminar Mayor ahorro.');
  }
  if (!promoCatalog.includes('.filter(x=>x.isPopular)') ||
      !promoCatalog.includes('.filter(x=>brandPromoSaving(x)>0||x.isSaving)')) {
    fail('Ayuda C13: Populares/Ahorro dejaron de ser curaduría estricta.');
  }
  if (!promoCatalog.includes('gx-catalog-mini-meta-line')) {
    fail('Ayuda C13: etiqueta no está separada entre nombre y precio.');
  }
  if (!ayudaCss.includes('GOXION · C13 CURATION SYNC') ||
      !ayudaCss.includes('#ff3366') ||
      !ayudaCss.includes('#ffaa00') ||
      !ayudaCss.includes('#00ff9d') ||
      !ayudaCss.includes('#00f2fe')) {
    fail('Ayuda C13: se perdió el lenguaje original Popular/Ahorro/Nuevo.');
  }

  // C14: portada pública completa; Mi Espacio personaliza sólo con sesión real.
  if (!catalogOrders.includes('window.__GOXION_CATALOG_SESSION') ||
      !catalogOrders.includes("authenticated: gxCatalogClient.authenticated === true")) {
    fail('Ayuda C14: falta separación explícita público/personalizado.');
  }
  if (!promoCatalog.includes('function catalogIsPersonalized()') ||
      !promoCatalog.includes('function curatedPool(entries)') ||
      !promoCatalog.includes('entries.slice()') ||
      !promoCatalog.includes('entries.filter(x=>x.available&&!x.owned)')) {
    fail('Ayuda C14: la curaduría no distingue portada pública de Mi Espacio.');
  }
  if (!promoCatalog.includes("section.dataset.gxCatalogMode=personalized?'personalized':'public'")) {
    fail('Ayuda C14: falta estado observable de curaduría.');
  }
  if (!promoCatalog.includes('<div class="gx-catalog-mini-price"><span>Desde</span><b>')) {
    fail('Ayuda C14: el precio compacto no usa jerarquía Desde/monto.');
  }
  if (!ayudaCss.includes('GOXION · C14 PUBLIC / PERSONALIZED CATALOG') ||
      !ayudaCss.includes('grid-template-columns:40px minmax(0,1fr) 48px')) {
    fail('Ayuda C14: faltan escala compacta o ritmo espacial.');
  }

  // C15: la mini tarjeta Popular reutiliza el efecto histórico, sin inventar otro.
  if (!ayudaCss.includes('GOXION · C15 MINI CARDS ALIGNMENT') ||
      !ayudaCss.includes('animation:rotateLight 3.5s linear infinite!important') ||
      !ayudaCss.includes('background:conic-gradient(')) {
    fail('Ayuda C15: no reutiliza rotateLight histórico.');
  }

  // C16: píldoras adaptativas, más aire horizontal y precio/flecha estables.
  if (!promoCatalog.includes('function fitCuratedPills(') ||
      !promoCatalog.includes('--gx-mini-pill-font') ||
      !promoCatalog.includes('fitCuratedPills(section)')) {
    fail('Ayuda C16: falta auto-fit de píldoras o layout respirado.');
  }
  if (!ayudaCss.includes('GOXION · C16 BREATHING MINI CARDS') ||
      !ayudaCss.includes('grid-auto-columns:minmax(214px,66%)') ||
      !ayudaCss.includes('transform:translateY(6px)') ||
      !ayudaCss.includes('position:absolute!important') ||
      !ayudaCss.includes('font-size:var(--gx-mini-pill-font,6.7px)')) {
    fail('Ayuda C16: faltan ancho, precio centrado, flecha fija o pill responsive.');
  }

  if (!ayudaCss.includes('GOXION · C17 FINAL MINI POLISH') ||
      !ayudaCss.includes('grid-auto-columns:61%') ||
      !ayudaCss.includes('overflow:visible') ||
      !ayudaCss.includes('stroke-linecap:round') ||
      !ayudaCss.includes('gap:14px')) {
    fail('Ayuda C17: falta cierre visual de mini tarjetas.');
  }

  // Categories: Descubre must prefer the explicit catalog category.
  if (!promoCatalog.includes("p?.categoria_catalogo") ||
      !promoCatalog.includes("category:String(category||'')") ||
      !promoCatalog.includes("productividad:'Productividad'") ||
      !promoCatalog.includes("almacenamiento:'Almacenamiento'")) {
    fail('Ayuda categorías: categoria_catalogo no alimenta Descubre.');
  }
  if (!promoCatalog.includes('gx-catalog-mini-chevron') ||
      !promoCatalog.includes('M3.2 2.8L8.2 8L3.2 13.2')) {
    fail('Ayuda C17: falta chevron SVG redondeado.');
  }
  if (!ayudaCss.includes('grid-template-columns:40px minmax(0,1fr) 48px 8px') ||
      !ayudaCss.includes('grid-template-rows:14px 18px') ||
      !ayudaCss.includes('grid-template-rows:12px 22px')) {
    fail('Ayuda C15: falta la retícula fija de alineación interna.');
  }
  if (!ayudaCss.includes('grid-auto-columns:calc((100% - var(--gx-mini-gap))/2)')) {
    fail('Ayuda C15: las mini tarjetas no ocupan dos columnas equilibradas.');
  }

  const allHeadAt = ayudaHtml.indexOf('id="gx-catalog-all-head"');
  const toolbarAt = ayudaHtml.indexOf('class="gx-catalog-toolbar gx-seek-toolbar"');
  const catalogGridAt = ayudaHtml.indexOf('id="catalog-container"');
  if (allHeadAt < 0 || toolbarAt < 0 || catalogGridAt < 0 || !(allHeadAt < toolbarAt && toolbarAt < catalogGridAt)) {
    fail('Ayuda C14: búsqueda/filtros no pertenecen visualmente al Catálogo completo.');
  }
}


// Promotions Studio v2: universal campaign builder exposes publication and protected acquisition.
{
  const adminHtmlPath = join(ROOT, 'admin.html');
  const studioPath = join(ROOT, 'assets', 'js', 'admin', '29-promotions-studio-v2.js');
  const adminHtml = existsSync(adminHtmlPath) ? readFileSync(adminHtmlPath, 'utf8') : '';
  const studio = existsSync(studioPath) ? readFileSync(studioPath, 'utf8') : '';

  if (!existsSync(studioPath)) {
    fail('Promotions Studio: falta el controlador v2.');
  }

  const legacyPromoAt = adminHtml.indexOf('./assets/js/admin/25-admin-beta-19-controller.js');
  const studioAt = adminHtml.indexOf('./assets/js/admin/29-promotions-studio-v2.js');
  if (legacyPromoAt < 0 || studioAt < 0 || studioAt <= legacyPromoAt) {
    fail('Promotions Studio: el controlador v2 no carga después del puente promocional heredado.');
  }

  for (const mechanic of ['precio_fijo', 'porcentaje', 'combo', 'addon']) {
    if (!studio.includes(mechanic)) fail('Promotions Studio: falta mecánica ' + mechanic + '.');
  }

  for (const action of [
    'GOXION_FINANCIAL_ACTIONS.savePromotion',
    'GOXION_FINANCIAL_ACTIONS.togglePromotion',
    'GOXION_FINANCIAL_ACTIONS.deletePromotion',
  ]) {
    if (!studio.includes(action)) fail('Promotions Studio: falta gateway financiero ' + action + '.');
  }

  if (!studio.includes('adquisicion_habilitada')) {
    fail('Promotions Studio: falta el contrato de adquisición habilitada.');
  }
  if (!studio.includes("byId('gx-promo-published')?.checked===true &&") || !studio.includes("byId('gx-promo-acquisition')?.checked===true")) {
    fail('Promotions Studio: adquisición debe depender explícitamente de publicación.');
  }

  for (const id of [
    'gx-promo-mechanic-fields',
    'gx-promo-audience',
    'gx-promo-stack-loyalty',
    'gx-promo-published',
    'gx-promo-acquisition',
    'gx-promo-preview',
  ]) {
    if (!adminHtml.includes('id="' + id + '"')) fail('Promotions Studio: falta UI ' + id + '.');
  }
}

// Phase 3D/3E: Promotions and special collection actions must use the financial gateway.
{
  const actionsPath = join(ROOT, 'assets', 'js', 'core', 'financial-actions.js');
  const promoPath = join(ROOT, 'assets', 'js', 'admin', '25-admin-beta-19-controller.js');
  const opsPath = join(ROOT, 'assets', 'js', 'admin', '07-admin-ops-v2.js');
  const guardsPath = join(ROOT, 'assets', 'js', 'admin', '08-admin-payment-referral-guards.js');

  const actions = existsSync(actionsPath) ? readFileSync(actionsPath, 'utf8') : '';
  const promo = existsSync(promoPath) ? readFileSync(promoPath, 'utf8') : '';
  const ops = existsSync(opsPath) ? readFileSync(opsPath, 'utf8') : '';
  const guards = existsSync(guardsPath) ? readFileSync(guardsPath, 'utf8') : '';

  for (const required of [
    "invoke('promocion_guardar'",
    "invoke('promocion_estado'",
    "invoke('promocion_eliminar'",
    "invoke('promocion_asignar'",
    "invoke('promocion_quitar_asignacion'",
    "invoke('registrar_pago_parcial'",
    "invoke('pactar_fecha_pago'",
    "invoke('cancelar_fecha_pactada'",
    'savePromotion',
    'togglePromotion',
    'assignPromotion',
    'registerPartialPayment',
    'pactPaymentDate',
    'cancelPactPaymentDate',
  ]) {
    if (!actions.includes(required)) fail('Acciones financieras 3D/3E: falta ' + required + '.');
  }

  if (!promo.includes('GOXION_FINANCIAL_ACTIONS.savePromotion') || !promo.includes('GOXION_FINANCIAL_ACTIONS.togglePromotion')) {
    fail('Promociones: guardar/activar no pasan por acciones financieras.');
  }
  if (promo.includes("promoApi('guardar'") || promo.includes("promoApi('cambiar_estado'")) {
    fail('Promociones: persiste una escritura directa al endpoint legacy.');
  }

  for (const [label, source] of [['ops', ops], ['guards', guards]]) {
    if (!source.includes('GOXION_FINANCIAL_ACTIONS.registerPartialPayment')) {
      fail('Pagos parciales ' + label + ': falta integración con acciones financieras.');
    }
  }
}

// Catalog categories: Admin must persist a real category instead of relying on name heuristics.
{
  const adminHtml = readFileSync(join(ROOT, 'admin.html'), 'utf8');
  const inlineAdmin = readFileSync(join(ROOT, 'assets', 'js', 'admin', '01-01-inline.js'), 'utf8');
  const mobileCatalog = readFileSync(join(ROOT, 'assets', 'js', 'admin', '15-admin-catalog-controller.js'), 'utf8');
  const adminWrites = readFileSync(join(ROOT, 'assets', 'js', 'admin', '03-supabase-v3-writes.js'), 'utf8');

  if (!adminHtml.includes('<th>Categoría</th>')) fail('Catálogo categorizado: falta columna Categoría.');
  if (!inlineAdmin.includes("'categoria_catalogo'")) fail('Catálogo categorizado: escritorio no edita categoria_catalogo.');
  if (!mobileCatalog.includes("'categoria_catalogo'")) fail('Catálogo categorizado: móvil no edita categoria_catalogo.');
  if (!adminWrites.includes('categoria_catalogo: "streaming"') || !adminWrites.includes('"categoria_catalogo"')) {
    fail('Catálogo categorizado: escritura/default no están integrados.');
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
console.log('✓ contrato financiero oficial v1.1 cargado en las tres superficies');
console.log('✓ acciones financieras compartidas alineadas al contrato v1.2');
console.log('✓ Index usa motor financiero con fallback y auditoría de paridad');
console.log('✓ Ayuda y Admin usan motor financiero con fallback por cliente');
console.log('✓ aprobación de pagos usa una sola puerta financiera protegida por periodo');
console.log('✓ Trato Justo individual y masivo usan una sola puerta financiera');
console.log('✓ beneficios programados usan el núcleo financiero');
console.log('✓ promociones y cobros especiales usan el núcleo financiero');
