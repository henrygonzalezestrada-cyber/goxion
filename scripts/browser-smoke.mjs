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

async function runIndex(browser, browserName, errors) {
  const label = `${browserName} · Index`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  attachDiagnostics(page, label, errors);
  await page.goto(origin + '/index.html?cliente=prueba', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const financeReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL === 'object' &&
    typeof window.GOXION_FINANCIAL?.clientState === 'function' &&
    typeof window.gxSelectIndexFinancialState === 'function'
  ).catch(() => false);
  if (!financeReady) errors.push(`${label}: motor financiero/selector no disponible.`);

  const paymentExperience = await page.evaluate(() => ({
    accounts: Array.isArray(window.GOXION_CORE?.BUSINESS?.BANK?.ACCOUNTS)
      ? window.GOXION_CORE.BUSINESS.BANK.ACCOUNTS.map(x => ({
          id:x.ID,
          institution:x.INSTITUTION,
          clabe:String(x.CLABE || "")
        }))
      : [],
    hasModal: !!document.getElementById("bank-modal"),
    hasOpen: typeof window.abrirDatosPago === "function",
    hasCopy: typeof window.copiarClabePago === "function",
    hasFallback: typeof window.copiarTextoSeguro === "function"
  })).catch(() => null);

  if (
    !paymentExperience ||
    paymentExperience.accounts.length !== 2 ||
    paymentExperience.accounts.some(x => !/^\d{18}$/.test(x.clabe)) ||
    !paymentExperience.accounts.some(x => x.id === "nu") ||
    !paymentExperience.accounts.some(x => x.id === "revolut" && x.institution === "STP") ||
    !paymentExperience.hasModal ||
    !paymentExperience.hasOpen ||
    !paymentExperience.hasCopy ||
    !paymentExperience.hasFallback
  ) {
    errors.push(`${label}: experiencia de pago Nu/Revolut incompleta o inválida.`);
  }

  const cases = await page.evaluate(() => {
    const legacy = {
      cliente_id:'c1',
      periodo:'2026-09-01',
      estado:'pendiente',
      subtotal:200,
      total_actual:210,
      lealtad:{pagos_efectivos:4,nivel:1},
      cargos:{mora:10,reactivacion:0}
    };
    const financial = {
      cliente_id:'c1',
      fuente_financiera:'supabase:goxion_estado_financiero',
      contrato_financiero:{version:'1.1',modo:'oficial'},
      periodo:'2026-09-01',
      estado:'pendiente',
      subtotal:200,
      total_actual:210,
      lealtad:{pagos_efectivos:4,nivel:1},
      cargos:{mora:10,reactivacion:0}
    };
    const changed = {
      ...financial,
      total_actual:215
    };

    return {
      preferred: window.gxSelectIndexFinancialState(legacy,financial,'c1'),
      malformed: window.gxSelectIndexFinancialState(legacy,{...financial,total_actual:'x'},'c1'),
      wrongClient: window.gxSelectIndexFinancialState(legacy,{...financial,cliente_id:'c2'},'c1'),
      diff: window.gxSelectIndexFinancialState(legacy,changed,'c1')
    };
  });

  if (cases.preferred.audit.source !== 'financial-v1' || cases.preferred.audit.matches !== true) {
    errors.push(`${label}: no prefirió motor financiero válido o paridad incorrecta.`);
  }
  if (cases.malformed.audit.source !== 'legacy-fallback') {
    errors.push(`${label}: no hizo fallback ante estado financiero inválido.`);
  }
  if (cases.wrongClient.audit.source !== 'legacy-fallback') {
    errors.push(`${label}: aceptó estado financiero de otro cliente.`);
  }
  if (
    cases.diff.audit.matches !== false ||
    cases.diff.audit.source !== 'legacy-variance-fallback' ||
    Number(cases.diff.state?.total_actual || 0) !== 210 ||
    !cases.diff.audit.differences.some(x => x.field === 'total_actual')
  ) {
    errors.push(`${label}: diferencia financiera no activó fallback seguro/auditoría.`);
  }

  await page.close();
}

async function runAyuda(browser, browserName, errors) {
  const label = `${browserName} · Ayuda`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  attachDiagnostics(page, label, errors);

  await page.route('**/functions/v1/promociones-catalogo', async route => {
    const promo = (id, mechanic, title, items, normal, offer, priority) => ({
      id,
      nombre:title,
      titulo_publico:title,
      descripcion_publica:'Oferta promocional de prueba C1',
      badge:mechanic==='combo'?'COMBO':(mechanic==='porcentaje'?'30% OFF':'PROMO'),
      mecanica:mechanic,
      precio_promocional:offer,
      precio_promocional_total:offer,
      descuento_porcentaje:mechanic==='porcentaje'?30:null,
      duracion_periodos:3,
      inicio:'2026-09-01T00:00:00Z',
      fin:'2026-12-31T23:59:59Z',
      mostrar_precio_anterior:true,
      mostrar_contador:false,
      oferta_flash:false,
      activa:true,
      audiencia:'todos',
      destacada:true,
      publicada:true,
      adquisicion_habilitada:true,
      prioridad:priority,
      revision:1,
      precio_normal_total:normal,
      ahorro_estimado:normal-offer,
      items,
      elegibilidad:{elegible:null,codigo:'PUBLICO',motivo:'Inicia sesión para confirmar si aplica a tu cuenta'},
      adquirida:null
    });
    const svc=(id,nombre,precio,rol='incluido')=>({servicio_id:id,rol,orden:0,servicio:{id,nombre,precio,etiqueta:''}});
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        ok:true,
        autenticado:false,
        contrato:'goxion-promotions-catalog-c1',
        version:'1.0',
        promociones:[
          promo('c1-price','precio_fijo','Netflix · 3 meses',[svc('netflix','Netflix Premium',109,'principal')],109,79,30),
          promo('c1-combo','combo','HBO Max + Prime Video',[svc('hbo','HBO Max Platino',79),svc('prime','Prime Video',45)],124,99,20),
          promo('c1-percent','porcentaje','Disney+ · 30% OFF',[svc('disney','Disney+ Premium',89,'principal')],89,62.3,10)
        ]
      })
    });
  });

  await page.goto(origin + '/ayuda.html', { waitUntil: 'load' });
  await page.waitForTimeout(5200);

  const financeReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL === 'object' &&
    window.GOXION_FINANCIAL?.MODE === 'official' &&
    typeof window.GOXION_FINANCIAL?.clientState === 'function' &&
    typeof window.GOXION_FINANCIAL?.selectCompatibleState === 'function'
  ).catch(() => false);
  if (!financeReady) errors.push(`${label}: motor financiero compartido no disponible.`);

  const selectorCases = await page.evaluate(() => {
    const legacy = {
      cliente_id:'c1',
      periodo:'2026-09-01',
      estado:'pendiente',
      subtotal:200,
      total_actual:210,
      pago_en_revision:false,
      pago_incompleto:false,
      lealtad:{pagos_efectivos:4,nivel:1},
      cargos:{mora:10,reactivacion:0}
    };
    const financial = {
      ...legacy,
      fuente_financiera:'supabase:goxion_estado_financiero',
      contrato_financiero:{version:'1.1',modo:'oficial'}
    };
    return {
      ok: window.GOXION_FINANCIAL.selectCompatibleState(legacy,financial,'c1'),
      variance: window.GOXION_FINANCIAL.selectCompatibleState(
        legacy,
        {...financial,pago_en_revision:true},
        'c1'
      )
    };
  }).catch(() => null);

  if (!selectorCases || selectorCases.ok.audit.source !== 'financial-v1' || selectorCases.ok.audit.matches !== true) {
    errors.push(`${label}: selector financiero común no aceptó un contrato equivalente.`);
  }
  if (
    selectorCases &&
    (
      selectorCases.variance.audit.source !== 'legacy-variance-fallback' ||
      selectorCases.variance.audit.matches !== false ||
      selectorCases.variance.state?.pago_en_revision !== false
    )
  ) {
    errors.push(`${label}: selector financiero no hizo fallback ante diferencia de revisión.`);
  }

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

  // Catálogo C9 Polish: valor vertical + porcentaje atómico + cierre sin snap + detalle scrollable.
  await page.evaluate(() => window.switchTab?.('catalogo'));
  await page.waitForFunction(() => {
    const cards=document.querySelectorAll('#gx-promo-deck .gx-promo-deck-card');
    return document.getElementById('gx-promo-showcase')?.hidden===false && cards.length===3;
  },null,{timeout:8000}).catch(()=>{});

  // C14 público vs Mi Espacio: en portada no se excluye por stock/propiedad;
  // tras autenticar sí entra la capa inteligente.
  const c14PublicPersonalized=await page.evaluate(() => {
    const service=(nombre,precio,etiqueta,disponibles,categoria_catalogo='streaming')=>({
      nombre,precio,etiqueta,disponibles_servidor:disponibles,categoria_catalogo,
      cuentas:1,limite:1,activo:true,descripcion:'Smoke C14'
    });
    const config={
      alertas:{activa:false},
      combo_upsell:true,
      serviciosGlobales:[
        service('Netflix Premium',109,'Popular 🔥',0),
        service('Disney+ Premium',89,'Popular 🔥',1),
        service('YouTube Premium',89,'Mas ahorro',1),
        service('Google One 2TB',29,'',1,'almacenamiento'),
        service('Mystery Tool',79,'',1,'productividad')
      ]
    };

    window.goxionCurrentClientKey='';
    window.cargarCatalogo({_goxion_config:config});
    const publicPopular=[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')];
    const publicMode=document.getElementById('gx-catalog-curated')?.dataset.gxCatalogMode||'';
    const publicCardCount=document.querySelectorAll('#catalog-container .brand-card').length;
    const publicDiscoverNames=[...document.querySelectorAll('#gx-catalog-discover-rail .gx-catalog-mini-card')]
      .map(x=>x.textContent||'');

    window.goxionCurrentClientKey='demo';
    window.cargarCatalogo({
      _goxion_config:config,
      demo:{servicios:[{nombre:'Disney+ Premium'}]}
    });
    const personalPopular=[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')];
    const personalMode=document.getElementById('gx-catalog-curated')?.dataset.gxCatalogMode||'';
    const personalOwned=document.querySelectorAll('#catalog-container .gx-owned-service').length;

    window.goxionCurrentClientKey='';
    window.cargarCatalogo({_goxion_config:config});

    return {
      publicMode,
      publicPopularCount:publicPopular.length,
      publicPopularNames:publicPopular.map(x=>x.textContent||''),
      publicDiscoverNames,
      publicCardCount,
      personalMode,
      personalPopularCount:personalPopular.length,
      personalOwned
    };
  }).catch(()=>null);

  if(
    !c14PublicPersonalized ||
    c14PublicPersonalized.publicMode!=='public' ||
    c14PublicPersonalized.publicPopularCount!==2 ||
    !c14PublicPersonalized.publicPopularNames.some(x=>x.includes('Netflix')) ||
    !c14PublicPersonalized.publicPopularNames.some(x=>x.includes('Disney')) ||
    !c14PublicPersonalized.publicDiscoverNames.some(x=>x.includes('Mystery Tool')&&x.includes('Productividad')) ||
    c14PublicPersonalized.publicCardCount!==5 ||
    c14PublicPersonalized.personalMode!=='personalized' ||
    c14PublicPersonalized.personalPopularCount!==0 ||
    c14PublicPersonalized.personalOwned<1
  ){
    errors.push(`${label}: C14 público/Mi Espacio no separa correctamente repertorio y recomendaciones. ${JSON.stringify(c14PublicPersonalized)}`);
  }

  // C11 catálogo: cristal curado con los parámetros visuales ya usados por GOXION.
  await page.waitForFunction(() =>
    document.querySelectorAll('.gx-catalog-mini-card').length>=1,
    null,{timeout:3000}
  ).catch(()=>{});

  const catalogC11=await page.evaluate(() => {
    const mini=document.querySelector('#gx-catalog-best-rail .gx-catalog-mini-card:not(.is-popular-featured):not(.is-new-featured)') ||
      document.querySelector('#gx-catalog-discover-rail .gx-catalog-mini-card:not(.is-new-featured)') ||
      document.querySelector('.gx-catalog-mini-card');
    const logo=mini?.querySelector('.gx-catalog-mini-logo');
    const img=logo?.querySelector('img');
    const switchBtn=document.querySelector('.gx-catalog-curated-switch button');
    const filterBtn=document.querySelector('.gx-catalog-filter-chip');
    const cards=[...document.querySelectorAll('.gx-catalog-mini-card')];
    const ms=mini?getComputedStyle(mini):null;
    const ls=logo?getComputedStyle(logo):null;
    const is=img?getComputedStyle(img):null;
    const ss=switchBtn?getComputedStyle(switchBtn):null;
    const fs=filterBtn?getComputedStyle(filterBtn):null;
    return {
      cardCount:cards.length,
      backgroundColor:ms?.backgroundColor||'',
      backdrop:(ms?.backdropFilter||ms?.webkitBackdropFilter||''),
      borderColor:ms?.borderTopColor||'',
      logoBackground:ls?.backgroundColor||'',
      logoBorder:ls?.borderTopWidth||'',
      imagePadding:is?.paddingTop||'',
      switchHeight:switchBtn?.getBoundingClientRect().height||0,
      filterHeight:filterBtn?.getBoundingClientRect().height||0,
      switchFont:ss?parseFloat(ss.fontSize):0,
      filterFont:fs?parseFloat(fs.fontSize):0,
      switchPadding:ss?parseFloat(ss.paddingLeft):0,
      filterPadding:fs?parseFloat(fs.paddingLeft):0,
      duplicateDesde:cards.map(card=>(card.textContent.match(/Desde\s*\$/g)||[]).length)
    };
  }).catch(()=>null);

  if(
    !catalogC11 ||
    catalogC11.cardCount<1 ||
    catalogC11.backgroundColor!=='rgba(8, 8, 12, 0.25)' ||
    !catalogC11.backdrop.includes('blur(10px)') ||
    catalogC11.borderColor!=='rgba(255, 255, 255, 0.08)' ||
    !['rgba(0, 0, 0, 0)','transparent'].includes(catalogC11.logoBackground) ||
    catalogC11.logoBorder!=='0px' ||
    catalogC11.imagePadding!=='0px' ||
    Math.abs(catalogC11.switchHeight-catalogC11.filterHeight)>1 ||
    Math.abs(catalogC11.switchFont-catalogC11.filterFont)>.15 ||
    Math.abs(catalogC11.switchPadding-catalogC11.filterPadding)>.5 ||
    catalogC11.duplicateDesde.some(n=>n>1)
  ){
    errors.push(`${label}: C11 catálogo no conserva glass/logo/filtros/precio limpio. ${JSON.stringify(catalogC11)}`);
  }

  // C12 curaduría: etiquetas viven arriba; catálogo completo queda neutral.
  const c12Popular=await page.evaluate(() => {
    const catalog=[...document.querySelectorAll('#catalog-container .brand-card')];
    const featured=[...document.querySelectorAll('#gx-catalog-best-rail .is-popular-featured')];
    const soft=[...document.querySelectorAll('#gx-catalog-best-rail .is-popular-soft')];
    const newFeatured=[...document.querySelectorAll('#gx-catalog-discover-rail .is-new-featured')];
    return {
      catalogPromoClasses:catalog.filter(x=>x.classList.contains('has-promo')||[...x.classList].some(c=>c.startsWith('has-promo-'))).length,
      catalogBadges:document.querySelectorAll('#catalog-container .animated-etiqueta').length,
      featuredCount:featured.length,
      featuredLabel:(featured[0]?.querySelector('.gx-catalog-mini-badge')?.textContent||'').trim(),
      featuredBorderAnimation:featured[0]?getComputedStyle(featured[0],'::before').animationName:'none',
      softCardAnimations:soft.map(x=>getComputedStyle(x).animationName),
      softBadgeAnimations:soft.map(x=>getComputedStyle(x.querySelector('.gx-catalog-mini-badge')).animationName),
      newFeaturedCount:newFeatured.length,
      newFeaturedAnimation:newFeatured[0]?getComputedStyle(newFeatured[0]).animationName:'none',
      fallbackCards:[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')]
        .filter(x=>!x.classList.contains('is-popular-featured')&&!x.classList.contains('is-popular-soft')).length,
      misplacedBadges:[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-badge')]
        .filter(x=>!x.parentElement?.classList.contains('gx-catalog-mini-meta-line')).length
    };
  }).catch(()=>null);

  if(
    !c12Popular ||
    c12Popular.catalogPromoClasses!==0 ||
    c12Popular.catalogBadges!==0 ||
    c12Popular.fallbackCards!==0 ||
    c12Popular.misplacedBadges!==0 ||
    c12Popular.featuredCount>1 ||
    (c12Popular.featuredCount===1 && (
      c12Popular.featuredLabel!=='MÁS POPULAR' ||
      c12Popular.featuredBorderAnimation!=='rotateLight'
    )) ||
    c12Popular.softCardAnimations.some(x=>x!=='none') ||
    c12Popular.softBadgeAnimations.some(x=>x==='none') ||
    c12Popular.newFeaturedCount>1 ||
    (c12Popular.newFeaturedCount===1 && c12Popular.newFeaturedAnimation==='none')
  ){
    errors.push(`${label}: C12 no conserva jerarquía Popular/Nuevo o catálogo neutral. ${JSON.stringify(c12Popular)}`);
  }

  await page.evaluate(() =>
    document.querySelector('[data-gx-curated-mode="saving"]')?.click()
  );
  await page.waitForFunction(() => {
    const active=document.querySelector('[data-gx-curated-mode="saving"]')?.classList.contains('active');
    const rail=document.getElementById('gx-catalog-best-rail');
    return active===true && !!rail && (
      rail.querySelectorAll('.gx-catalog-mini-card').length>0 ||
      !!rail.querySelector('.gx-catalog-curated-empty')
    );
  },null,{timeout:2200}).catch(()=>{});
  await page.waitForTimeout(80);

  const c12Saving=await page.evaluate(() => {
    const cards=[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')];
    const saving=[...document.querySelectorAll('#gx-catalog-best-rail .is-saving-soft')];
    return {
      cards:cards.length,
      empty:!!document.querySelector('#gx-catalog-best-rail .gx-catalog-curated-empty'),
      cardAnimations:saving.map(x=>getComputedStyle(x).animationName),
      badgeAnimations:saving.map(x=>getComputedStyle(x.querySelector('.gx-catalog-mini-badge')).animationName),
      featuredPopular:document.querySelectorAll('#gx-catalog-best-rail .is-popular-featured').length,
      fallbackCards:cards.filter(x=>!x.classList.contains('is-saving-soft')).length,
      misplacedBadges:[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-badge')]
        .filter(x=>!x.parentElement?.classList.contains('gx-catalog-mini-meta-line')).length
    };
  }).catch(()=>null);

  if(
    !c12Saving ||
    c12Saving.featuredPopular!==0 ||
    c12Saving.fallbackCards!==0 ||
    c12Saving.misplacedBadges!==0 ||
    c12Saving.cardAnimations.some(x=>x!=='none') ||
    c12Saving.badgeAnimations.some(x=>x==='none') ||
    (c12Saving.cards===0 && c12Saving.empty!==true)
  ){
    errors.push(`${label}: C12 Mayor ahorro usa movimiento excesivo o queda sin estado vacío. ${JSON.stringify(c12Saving)}`);
  }

  await page.evaluate(() =>
    document.querySelector('[data-gx-curated-mode="popular"]')?.click()
  );
  await page.waitForFunction(() => {
    const active=document.querySelector('[data-gx-curated-mode="popular"]')?.classList.contains('active');
    const rail=document.getElementById('gx-catalog-best-rail');
    return active===true && !!rail;
  },null,{timeout:2200}).catch(()=>{});
  await page.waitForTimeout(80);

  const c14Layout=await page.evaluate(() => {
    const card=document.querySelector('#gx-catalog-best-rail .gx-catalog-mini-card');
    const title=card?.querySelector('.gx-catalog-mini-copy>strong');
    const meta=card?.querySelector('.gx-catalog-mini-meta-line');
    const price=card?.querySelector('.gx-catalog-mini-price');
    const priceLabel=price?.querySelector('span');
    const priceValue=price?.querySelector('b');
    const allHead=document.getElementById('gx-catalog-all-head');
    const toolbar=document.querySelector('.gx-catalog-toolbar');
    const catalog=document.getElementById('catalog-container');
    const cardBox=card?.getBoundingClientRect();
    const titleBox=title?.getBoundingClientRect();
    const metaBox=meta?.getBoundingClientRect();
    const priceBox=price?.getBoundingClientRect();
    const priceLabelBox=priceLabel?.getBoundingClientRect();
    const priceValueBox=priceValue?.getBoundingClientRect();
    const headBox=allHead?.getBoundingClientRect();
    const toolbarBox=toolbar?.getBoundingClientRect();
    const catalogBox=catalog?.getBoundingClientRect();
    return {
      cardHeight:cardBox?.height||0,
      cardWidth:cardBox?.width||0,
      titleBeforeMeta:!!titleBox&&!!metaBox&&titleBox.bottom<=metaBox.top+1,
      priceVertical:!!priceLabelBox&&!!priceValueBox&&priceLabelBox.bottom<=priceValueBox.top+2,
      priceRightOfCopy:!!priceBox&&!!titleBox&&priceBox.left>titleBox.left,
      toolbarBelowHead:!!headBox&&!!toolbarBox&&toolbarBox.top>=headBox.bottom-1,
      catalogBelowToolbar:!!toolbarBox&&!!catalogBox&&catalogBox.top>=toolbarBox.bottom-1,
      leftAlignment:!!headBox&&!!cardBox&&Math.abs(headBox.left-cardBox.left)<=6
    };
  }).catch(()=>null);

  if(
    !c14Layout ||
    c14Layout.cardHeight>80 ||
    c14Layout.cardHeight<64 ||
    c14Layout.cardWidth>250 ||
    c14Layout.titleBeforeMeta!==true ||
    c14Layout.priceVertical!==true ||
    c14Layout.priceRightOfCopy!==true ||
    c14Layout.toolbarBelowHead!==true ||
    c14Layout.catalogBelowToolbar!==true ||
    c14Layout.leftAlignment!==true
  ){
    errors.push(`${label}: C14 layout no mantiene jerarquía/espaciado compacto. ${JSON.stringify(c14Layout)}`);
  }

  const c15Alignment=await page.evaluate(() => {
    const cards=[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')].slice(0,2);
    const metric=card=>{
      const box=card.getBoundingClientRect();
      const logo=card.querySelector('.gx-catalog-mini-logo')?.getBoundingClientRect();
      const title=card.querySelector('.gx-catalog-mini-copy>strong')?.getBoundingClientRect();
      const meta=card.querySelector('.gx-catalog-mini-meta-line')?.getBoundingClientRect();
      const priceLabel=card.querySelector('.gx-catalog-mini-price>span')?.getBoundingClientRect();
      const priceValue=card.querySelector('.gx-catalog-mini-price>b')?.getBoundingClientRect();
      return {
        top:box.top,bottom:box.bottom,width:box.width,height:box.height,
        logoY:logo?(logo.top+logo.height/2):null,
        titleY:title?title.top:null,
        metaY:meta?meta.top:null,
        priceLabelY:priceLabel?priceLabel.top:null,
        priceValueY:priceValue?priceValue.top:null
      };
    };
    const m=cards.map(metric);
    const delta=(key)=>m.length===2&&m.every(x=>Number.isFinite(x[key]))
      ?Math.abs(m[0][key]-m[1][key])
      :0;
    const featured=cards.find(x=>x.classList.contains('is-popular-featured'));
    return {
      count:cards.length,
      metrics:m,
      widthDelta:delta('width'),
      heightDelta:delta('height'),
      logoYDelta:delta('logoY'),
      titleYDelta:delta('titleY'),
      metaYDelta:delta('metaY'),
      priceLabelYDelta:delta('priceLabelY'),
      priceValueYDelta:delta('priceValueY'),
      featuredAnimation:featured?getComputedStyle(featured,'::before').animationName:'none'
    };
  }).catch(()=>null);

  if(
    !c15Alignment ||
    c15Alignment.count<1 ||
    c15Alignment.widthDelta>1 ||
    c15Alignment.heightDelta>1 ||
    c15Alignment.logoYDelta>1.5 ||
    c15Alignment.titleYDelta>1.5 ||
    c15Alignment.metaYDelta>1.5 ||
    c15Alignment.priceLabelYDelta>1.5 ||
    c15Alignment.priceValueYDelta>1.5 ||
    (c15Alignment.count>1 && c15Alignment.featuredAnimation!=='rotateLight')
  ){
    errors.push(`${label}: C15 mini tarjetas siguen desalineadas o no reutilizan rotateLight. ${JSON.stringify(c15Alignment)}`);
  }

  const c16Mini=await page.evaluate(() => {
    const cards=[...document.querySelectorAll('#gx-catalog-best-rail .gx-catalog-mini-card')].slice(0,2);
    const rows=cards.map(card=>{
      const r=card.getBoundingClientRect();
      const pill=card.querySelector('.gx-catalog-mini-badge,.gx-catalog-mini-note');
      const price=card.querySelector('.gx-catalog-mini-price');
      const arrow=card.querySelector('.gx-catalog-mini-arrow');
      const pr=price?.getBoundingClientRect();
      const ar=arrow?.getBoundingClientRect();
      const ps=pill?getComputedStyle(pill):null;
      return {
        width:r.width,
        height:r.height,
        pillFits:!pill || pill.scrollWidth<=pill.clientWidth+1,
        pillFont:ps?parseFloat(ps.fontSize):0,
        pillHeight:pill?.getBoundingClientRect().height||0,
        priceLowerOffset:pr?(pr.top+pr.height/2)-(r.top+r.height/2):99,
        arrowCenterDiff:ar?Math.abs((ar.top+ar.height/2)-(r.top+r.height/2)):99,
        arrowOpacity:arrow?parseFloat(getComputedStyle(arrow).opacity):0
      };
    });
    return {count:cards.length,rows};
  }).catch(()=>null);

  if(
    !c16Mini ||
    c16Mini.count<1 ||
    c16Mini.rows.some(x=>x.width<200||x.width>245) ||
    c16Mini.rows.some(x=>x.height<70||x.height>76) ||
    c16Mini.rows.some(x=>x.pillFits!==true) ||
    c16Mini.rows.some(x=>x.pillFont>6.8||x.pillFont<5.1) ||
    c16Mini.rows.some(x=>x.pillHeight>19) ||
    c16Mini.rows.some(x=>Math.abs(x.priceLowerOffset)>2) ||
    c16Mini.rows.some(x=>x.arrowCenterDiff>1.5||x.arrowOpacity<.8)
  ){
    errors.push(`${label}: C16 mini tarjetas no conservan aire/pill/precio/flecha. ${JSON.stringify(c16Mini)}`);
  }

  const closedLayout=await page.evaluate(() => {
    const cards=[...document.querySelectorAll('#gx-promo-deck .gx-promo-deck-card')];
    const front=cards.find(x=>x.classList.contains('is-front'));
    const metrics=cards.map(card=>{
      const style=getComputedStyle(card);
      const primary=card.querySelector('.gx-promo-primary-value');
      const saving=card.querySelector('.gx-promo-saving');
      const old=card.querySelector('.gx-promo-old-price');
      const action=card.querySelector('[data-gx-promo-action]');
      const cardRect=card.getBoundingClientRect();
      const actionRect=action?.getBoundingClientRect();
      const p=primary?.getBoundingClientRect();
      const sv=saving?.getBoundingClientRect();
      const o=old?.getBoundingClientRect();
      return {
        index:Number(card.dataset.gxPromoIndex||0),
        cssHeight:parseFloat(style.height),
        actionText:(action?.textContent||'').trim(),
        actionCenterDiff:actionRect?Math.abs((actionRect.left+actionRect.width/2)-(cardRect.left+cardRect.width/2)):99,
        oldPriceFont:old?parseFloat(getComputedStyle(old).fontSize):0,
        saving:(saving?.textContent||'').replace(/\s+/g,' ').trim(),
        verticalValue:!!p&&!!sv&&!!o&&p.top<sv.top&&sv.top<o.top
      };
    });
    const pct=cards.find(x=>x.dataset.gxPromoIndex==='2');
    const pctPrimary=pct?.querySelector('.gx-promo-primary-value');
    const combo=cards.find(x=>x.dataset.gxPromoIndex==='1');
    const logos=[...combo.querySelectorAll('.gx-promo-card-logos.is-combo .gx-promo-logo-item')];
    return {
      metrics,
      heightSpread:Math.max(...metrics.map(x=>x.cssHeight))-Math.min(...metrics.map(x=>x.cssHeight)),
      percentWhiteSpace:pctPrimary?getComputedStyle(pctPrimary).whiteSpace:null,
      percentFits:pctPrimary?pctPrimary.scrollWidth<=pctPrimary.parentElement.clientWidth+2:false,
      comboTransformA:getComputedStyle(logos[0]).transform,
      comboTransformB:getComputedStyle(logos[1]).transform,
      borderAnimation:front?getComputedStyle(front,'::after').animationName:'none',
      traceAnimation:front?getComputedStyle(front,'::before').animationName:'none',
      c10AHeroAnimation:front?getComputedStyle(front).animationName:'none',
      c10ALogoAnimation:front?getComputedStyle(front.querySelector('.gx-promo-card-logos')).animationName:'none',
      c10AGlowDisplay:front?getComputedStyle(front.querySelector('.gx-promo-card-glow')).display:'block'
    };
  }).catch(()=>null);

  if(
    !closedLayout ||
    closedLayout.heightSpread>1 ||
    closedLayout.metrics.some(x=>x.actionText!=='Ver detalles'||x.actionCenterDiff>2) ||
    closedLayout.metrics.some(x=>x.oldPriceFont<13) ||
    closedLayout.metrics.some(x=>!/^Ahorras\s+\$/.test(x.saving)) ||
    closedLayout.metrics.some(x=>x.verticalValue!==true) ||
    closedLayout.percentWhiteSpace!=='nowrap' ||
    closedLayout.percentFits!==true ||
    closedLayout.comboTransformA==='none' ||
    closedLayout.comboTransformB==='none' ||
    closedLayout.c10AHeroAnimation==='none' ||
    closedLayout.c10ALogoAnimation==='none' ||
    closedLayout.c10AGlowDisplay!=='none'
  ){
    errors.push(`${label}: C9 cerrado no conserva valor vertical/porcentaje/efecto premium. ${JSON.stringify(closedLayout)}`);
  }

  // Combo al frente y guardar geometría cerrada para comparar el cierre intermedio.
  await page.evaluate(() => {
    const combo=document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="1"]');
    if(combo&&!combo.classList.contains('is-front')) combo.click();
  });
  await page.waitForFunction(() =>
    document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="1"]')?.classList.contains('is-front')===true,
    null,{timeout:2200}
  ).catch(()=>{});
  // Esperar a que termine la transición del deck antes de guardar la geometría cerrada.
  await page.waitForTimeout(900);

  await page.evaluate(() => {
    const card=document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="1"]');
    if(!card)return;
    const r=card.getBoundingClientRect();
    const action=card.querySelector('[data-gx-promo-action]')?.getBoundingClientRect();
    const value=card.querySelector('.gx-promo-value-stack')?.getBoundingClientRect();
    window.__gxC9Closed={
      height:r.height,
      actionBottomGap:action?r.bottom-action.bottom:null,
      valueTop:value?value.top-r.top:null
    };
    card.dataset.gxSmokeToken='c9-card';
    window.__gxPromoSmokeCard=card;
    card.querySelector('[data-gx-promo-action]')?.click();
  });

  await page.waitForFunction(() => {
    const card=document.querySelector('body > .gx-promo-deck-card.is-returning[data-gx-smoke-token="c9-card"]');
    const action=card?.querySelector('[data-gx-promo-action]');
    return !!card && !!action && action.textContent.trim()==='Contratar ahora';
  },null,{timeout:3200}).catch(()=>{});
  await page.waitForFunction(() => {
    const card=document.querySelector('body > .gx-promo-deck-card.is-expanded[data-gx-smoke-token="c9-card"]');
    if(!card) return false;
    const logos=[...card.querySelectorAll('.gx-promo-card-logos.is-combo .gx-promo-logo-item')];
    const angle=(node)=>{
      const t=getComputedStyle(node).transform;
      if(!t||t==='none')return 0;
      const m=t.match(/matrix\(([^,]+),\s*([^,]+)/);
      return m?Math.atan2(Number(m[2]),Number(m[1]))*180/Math.PI:99;
    };
    return logos.length>=2 && Math.abs(angle(logos[0]))<=0.5 && Math.abs(angle(logos[1]))<=0.5;
  },null,{timeout:1400}).catch(()=>{});
  await page.waitForTimeout(40);

  const expanded=await page.evaluate(() => {
    const card=document.querySelector('body > .gx-promo-deck-card.is-expanded[data-gx-smoke-token="c9-card"]');
    if(!card)return null;
    const r=card.getBoundingClientRect();
    const copy=card.querySelector('.gx-promo-card-copy')?.getBoundingClientRect();
    const value=card.querySelector('.gx-promo-value-stack')?.getBoundingClientRect();
    const action=card.querySelector('[data-gx-promo-action]')?.getBoundingClientRect();
    const detail=card.querySelector('.gx-promo-morph-detail');
    const logos=[...card.querySelectorAll('.gx-promo-card-logos.is-combo .gx-promo-logo-item')];
    const angle=(node)=>{
      const t=getComputedStyle(node).transform;
      if(!t||t==='none')return 0;
      const m=t.match(/matrix\(([^,]+),\s*([^,]+)/);
      return m?Math.atan2(Number(m[2]),Number(m[1]))*180/Math.PI:99;
    };
    return {
      sameNode:card===window.__gxPromoSmokeCard,
      height:Math.round(r.height),
      actionText:(card.querySelector('[data-gx-promo-action]')?.textContent||'').trim(),
      actionBottomGap:action?Math.round(r.bottom-action.bottom):999,
      valueGap:(copy&&value)?Math.round(value.top-copy.bottom):999,
      oldPriceFont:parseFloat(getComputedStyle(card.querySelector('.gx-promo-old-price')).fontSize),
      detailSections:card.querySelectorAll('.gx-promo-detail-section').length,
      detailOverflow:detail?getComputedStyle(detail).overflowY:null,
      detailScrollable:detail?detail.scrollHeight>=detail.clientHeight:false,
      angleA:angle(logos[0]),
      angleB:angle(logos[1])
    };
  }).catch(()=>null);

  if(
    !expanded ||
    expanded.sameNode!==true ||
    expanded.height>540 ||
    expanded.actionText!=='Contratar ahora' ||
    expanded.actionBottomGap>24 ||
    expanded.valueGap>8 ||
    expanded.oldPriceFont<14 ||
    expanded.detailSections!==2 ||
    expanded.detailOverflow!=='auto' ||
    Math.abs(expanded.angleA)>0.5 ||
    Math.abs(expanded.angleB)>0.5
  ){
    errors.push(`${label}: C9 expandido no quedó ordenado/scrollable/compacto. ${JSON.stringify(expanded)}`);
  }

  // Cierre: justo antes del final la composición ya debe coincidir con la cerrada.
  await page.evaluate(() =>
    document.querySelector('body > .gx-promo-deck-card.is-expanded [data-gx-promo-close]')?.click()
  );
  await page.waitForTimeout(760);

  const midClose=await page.evaluate(() => {
    const card=document.querySelector('body > .gx-promo-deck-card.is-returning[data-gx-smoke-token="c9-card"]');
    if(!card)return null;
    const r=card.getBoundingClientRect();
    const action=card.querySelector('[data-gx-promo-action]')?.getBoundingClientRect();
    const value=card.querySelector('.gx-promo-value-stack')?.getBoundingClientRect();
    const detail=card.querySelector('.gx-promo-morph-detail');
    const closed=window.__gxC9Closed||{};
    return {
      returning:card.classList.contains('is-returning'),
      actionText:(card.querySelector('[data-gx-promo-action]')?.textContent||'').trim(),
      heightDiff:Math.abs(r.height-(closed.height||0)),
      actionGapDiff:action&&closed.actionBottomGap!=null?Math.abs((r.bottom-action.bottom)-closed.actionBottomGap):999,
      valueTopDiff:value&&closed.valueTop!=null?Math.abs((value.top-r.top)-closed.valueTop):999,
      detailOpacity:detail?parseFloat(getComputedStyle(detail).opacity):1
    };
  }).catch(()=>null);

  if(
    !midClose ||
    midClose.returning!==true ||
    midClose.actionText!=='Ver detalles' ||
    midClose.heightDiff>10 ||
    midClose.actionGapDiff>12 ||
    midClose.valueTopDiff>14 ||
    midClose.detailOpacity>.12
  ){
    errors.push(`${label}: C9 cierre aún hace snap al último segundo. ${JSON.stringify(midClose)}`);
  }

  await page.waitForFunction(() =>
    !document.querySelector('body > .gx-promo-deck-card.is-expanded') &&
    !!document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-smoke-token="c9-card"]'),
    null,{timeout:3200}
  ).catch(()=>{});

  const restored=await page.evaluate(() => {
    const card=document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-smoke-token="c9-card"]');
    if(!card)return null;
    const logos=[...card.querySelectorAll('.gx-promo-card-logos.is-combo .gx-promo-logo-item')];
    return {
      sameNode:card===window.__gxPromoSmokeCard,
      actionText:(card.querySelector('[data-gx-promo-action]')?.textContent||'').trim(),
      transformA:getComputedStyle(logos[0]).transform,
      transformB:getComputedStyle(logos[1]).transform
    };
  }).catch(()=>null);

  if(!restored||restored.sameNode!==true||restored.actionText!=='Ver detalles'||restored.transformA==='none'||restored.transformB==='none'){
    errors.push(`${label}: C9 no restauró tarjeta/CTA/combo cerrado. ${JSON.stringify(restored)}`);
  }

  // Porcentaje: XX% OFF nunca puede saltar de línea ni empujar el bloque.
  await page.evaluate(() => {
    const pct=document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="2"]');
    if(pct&&!pct.classList.contains('is-front')) pct.click();
  });
  await page.waitForFunction(() =>
    document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="2"]')?.classList.contains('is-front')===true,
    null,{timeout:2200}
  ).catch(()=>{});

  const percentStable=await page.evaluate(() => {
    const pct=document.querySelector('#gx-promo-deck .gx-promo-deck-card[data-gx-promo-index="2"]');
    const primary=pct?.querySelector('.gx-promo-primary-value');
    const value=pct?.querySelector('.gx-promo-value-stack');
    return {
      whiteSpace:primary?getComputedStyle(primary).whiteSpace:null,
      fits:primary?primary.scrollWidth<=primary.parentElement.clientWidth+2:false,
      minHeight:value?parseFloat(getComputedStyle(value).minHeight):0
    };
  }).catch(()=>null);

  if(!percentStable||percentStable.whiteSpace!=='nowrap'||percentStable.fits!==true||percentStable.minHeight<70){
    errors.push(`${label}: porcentaje C9 sigue rompiendo el bloque de valor. ${JSON.stringify(percentStable)}`);
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
  // WebKit puede tardar más en comenzar el primer frame geométrico del morph.
  // Esperamos una señal de crecimiento real en vez de asumir que ocurrirá
  // exactamente a los 150 ms del runner.
  if (supportBefore) {
    await page.waitForFunction(
      ({ beforeWidth }) => {
        const el = document.querySelector('#support-platforms-grid .platform-btn');
        return el && el.getBoundingClientRect().width > beforeWidth + 20;
      },
      { beforeWidth: supportBefore.width },
      { timeout: 1200 }
    ).catch(() => {});
  }
  const supportOpening = await supportBtn.boundingBox();
  if (!supportBefore || !supportOpening || supportOpening.width <= supportBefore.width + 20) {
    errors.push(`${label}: Soporte no inició el crecimiento del morph.`);
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

  const financialActionRequests = [];
  await page.route('**/functions/v1/acciones-financieras', async route => {
    const request = route.request();
    let body = {};
    try { body = JSON.parse(request.postData() || '{}'); } catch {}
    financialActionRequests.push({
      body,
      token: request.headers()['x-admin-token'] || ''
    });

    const action = body?.accion || '';
    const resultByAction = {
      aprobar_pago: {
        ok:true,
        periodo_pagado:'septiembre de 2026',
        periodo_pendiente:'2026-10-01',
        pagos_puntuales:5,
        puntual:true,
        reutilizado:false,
        lealtad_efecto:'sumo',
        racha_resultado:5
      },
      trato_justo_guardar: {
        ok:true,
        compensacion:{id:'tj-smoke',monto:5},
        total_periodo:5,
        servicio:{nombre:'ViX',monto:50}
      },
      trato_justo_eliminar: {
        ok:true,
        total_periodo:0
      },
      trato_justo_masivo: {
        ok:true,
        clientes_aplicados:2,
        creadas:2,
        actualizadas:0,
        no_elegibles:[],
        total_compensacion:10
      },
      beneficio_crear: {
        ok:true,
        beneficio:{id:'benefit-smoke',valor:25}
      },
      beneficio_cancelar: {
        ok:true,
        beneficio:{id:'benefit-smoke',estado:'cancelado'}
      },
      beneficio_eliminar: {
        ok:true,
        eliminado:true
      },
      promocion_guardar: {
        ok:true,
        promocion:{id:'promo-smoke',precio_promocional:50}
      },
      promocion_estado: {
        ok:true,
        promocion:{id:'promo-smoke',activa:false}
      },
      promocion_eliminar: {
        ok:true,
        eliminada:true
      },
      promocion_asignar: {
        asignacion:{id:'assign-smoke',precio_promocional:50}
      },
      promocion_quitar_asignacion: {
        desactivada:true
      },
      registrar_pago_parcial: {
        pago_parcial:{id:'partial-smoke',saldo_restante:40},
        monto_pagado:60,
        saldo_restante:40
      },
      pactar_fecha_pago: {
        acuerdo:{id:'agreement-smoke',fecha_original:'2026-09-15',fecha_pactada:'2026-09-20'}
      },
      cancelar_fecha_pactada: {
        cancelado:true
      }
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok:true,
        accion:action,
        operation_id:'smoke-' + action,
        contrato:'goxion-financial-actions-v1',
        version:'1.2',
        resultado:resultByAction[action] || {ok:true},
        estado_anterior:{periodo:'2026-09-01',total_actual:100},
        estado_financiero:{periodo:'2026-09-01',total_actual:95}
      })
    });
  });

  await page.route('**/functions/v1/promociones-admin-beta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok:true,
        contrato:'goxion-promotions-studio-v2',
        version:'2.0',
        servicios:[
          {id:'catalog-smoke-a',nombre:'Netflix Smoke',precio:109,activo:true},
          {id:'catalog-smoke-b',nombre:'HBO Smoke',precio:79,activo:true},
          {id:'catalog-smoke-c',nombre:'Prime Smoke',precio:45,activo:true}
        ],
        promociones:[]
      })
    });
  });

  await page.goto(origin + '/admin.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const financeReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL === 'object' &&
    window.GOXION_FINANCIAL?.MODE === 'official' &&
    typeof window.GOXION_FINANCIAL?.adminState === 'function' &&
    typeof window.GOXION_FINANCIAL?.adminCompare === 'function' &&
    typeof window.GOXION_FINANCIAL?.selectCompatibleState === 'function'
  ).catch(() => false);
  if (!financeReady) errors.push(`${label}: motor financiero compartido no disponible.`);

  const actionsReady = await page.evaluate(() =>
    typeof window.GOXION_FINANCIAL_ACTIONS === 'object' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.approvePayment === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.saveFairDeal === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.deleteFairDeal === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.applyFairDealBulk === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.saveBenefit === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.cancelBenefit === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.savePromotion === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.togglePromotion === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.assignPromotion === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.registerPartialPayment === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.pactPaymentDate === 'function' &&
    typeof window.GOXION_FINANCIAL_ACTIONS?.cancelPactPaymentDate === 'function'
  ).catch(() => false);
  if (!actionsReady) errors.push(`${label}: acciones financieras compartidas no disponibles.`);

  if (actionsReady) {
    const actionResult = await page.evaluate(async () => {
      localStorage.setItem('GOXION_ADMIN_TOKEN', 'smoke.admin.token');
      return window.GOXION_FINANCIAL_ACTIONS.approvePayment({
        clienteId:'client-smoke',
        monto:100,
        puntual:true,
        notas:'Smoke no persistente',
        periodoEsperado:'2026-09'
      });
    }).catch(error => ({ error: error?.message || String(error) }));

    if (actionResult?.error) {
      errors.push(`${label}: cliente de acciones financieras falló: ${actionResult.error}`);
    } else {
      if (actionResult?.operation_id !== 'smoke-aprobar_pago' || actionResult?.pagos_puntuales !== 5) {
        errors.push(`${label}: acciones financieras no normalizaron la respuesta de aprobación.`);
      }
      const approvalRequest = financialActionRequests.find(x => x.body?.accion === 'aprobar_pago');
      if (
        approvalRequest?.body?.datos?.cliente_id !== 'client-smoke' ||
        approvalRequest?.body?.datos?.periodo_esperado !== '2026-09' ||
        approvalRequest?.token !== 'smoke.admin.token'
      ) {
        errors.push(`${label}: contrato HTTP de aprobación financiera incorrecto.`);
      }
    }

    const fairDealResults = await page.evaluate(async () => ({
      save: await window.GOXION_FINANCIAL_ACTIONS.saveFairDeal({
        clienteId:'client-smoke',
        clienteServicioId:'service-smoke',
        periodo:'2026-09',
        diasFalla:2,
        motivo:'Falla técnica'
      }),
      remove: await window.GOXION_FINANCIAL_ACTIONS.deleteFairDeal({
        id:'tj-smoke'
      }),
      bulk: await window.GOXION_FINANCIAL_ACTIONS.applyFairDealBulk({
        clienteIds:['client-smoke','client-smoke-2'],
        servicioId:'catalog-smoke',
        servicioNombre:'ViX',
        periodo:'2026-09',
        diasFalla:2,
        motivo:'Falla técnica'
      })
    })).catch(error => ({ error: error?.message || String(error) }));

    if (fairDealResults?.error) {
      errors.push(`${label}: contrato financiero de Trato Justo falló: ${fairDealResults.error}`);
    } else {
      if (fairDealResults.save?.compensacion?.monto !== 5) {
        errors.push(`${label}: Trato Justo individual no normalizó la respuesta.`);
      }
      if (fairDealResults.remove?.total_periodo !== 0) {
        errors.push(`${label}: eliminación de Trato Justo no normalizó la respuesta.`);
      }
      if (fairDealResults.bulk?.clientes_aplicados !== 2 || fairDealResults.bulk?.total_compensacion !== 10) {
        errors.push(`${label}: Trato Justo masivo no normalizó la respuesta.`);
      }

      const byAction = Object.fromEntries(financialActionRequests.map(x => [x.body?.accion, x]));
      if (
        byAction.trato_justo_guardar?.body?.datos?.cliente_id !== 'client-smoke' ||
        byAction.trato_justo_guardar?.body?.datos?.cliente_servicio_id !== 'service-smoke' ||
        byAction.trato_justo_guardar?.body?.datos?.periodo !== '2026-09-01' ||
        byAction.trato_justo_guardar?.body?.datos?.dias_falla !== 2
      ) {
        errors.push(`${label}: contrato HTTP de Trato Justo individual incorrecto.`);
      }
      if (byAction.trato_justo_eliminar?.body?.datos?.id !== 'tj-smoke') {
        errors.push(`${label}: contrato HTTP de eliminación de Trato Justo incorrecto.`);
      }
      if (
        byAction.trato_justo_masivo?.body?.datos?.cliente_ids?.length !== 2 ||
        byAction.trato_justo_masivo?.body?.datos?.servicio_id !== 'catalog-smoke' ||
        byAction.trato_justo_masivo?.body?.datos?.periodo !== '2026-09-01'
      ) {
        errors.push(`${label}: contrato HTTP de Trato Justo masivo incorrecto.`);
      }
    }

    const phase3de = await page.evaluate(async () => ({
      benefitSave: await window.GOXION_FINANCIAL_ACTIONS.saveBenefit({
        clienteId:'client-smoke',
        concepto:'Beneficio smoke',
        tipo:'monto',
        valor:25,
        periodoInicio:'2026-09',
        periodosTotal:2
      }),
      benefitCancel: await window.GOXION_FINANCIAL_ACTIONS.cancelBenefit({id:'benefit-smoke'}),
      promoSave: await window.GOXION_FINANCIAL_ACTIONS.savePromotion({
        servicio_id:'catalog-smoke',
        nombre:'Promo smoke',
        precio_promocional:50,
        duracion_periodos:2,
        inicio:'2026-09-01T00:00',
        fin:'2026-10-31T23:59',
        activa:true
      }),
      promoState: await window.GOXION_FINANCIAL_ACTIONS.togglePromotion({id:'promo-smoke',activa:false}),
      promoAssign: await window.GOXION_FINANCIAL_ACTIONS.assignPromotion({
        clienteServicioId:'service-smoke',
        promocionId:'promo-smoke',
        periodoInicio:'2026-09'
      }),
      promoUnassign: await window.GOXION_FINANCIAL_ACTIONS.removePromotionAssignment({id:'assign-smoke'}),
      partial: await window.GOXION_FINANCIAL_ACTIONS.registerPartialPayment({
        clienteId:'client-smoke',
        saldoRestante:40,
        notas:'Pago parcial smoke',
        periodoEsperado:'2026-09'
      }),
      pact: await window.GOXION_FINANCIAL_ACTIONS.pactPaymentDate({
        clienteId:'client-smoke',
        fechaPactada:'2026-09-20',
        motivo:'Acuerdo smoke',
        periodoEsperado:'2026-09'
      }),
      cancelPact: await window.GOXION_FINANCIAL_ACTIONS.cancelPactPaymentDate({
        clienteId:'client-smoke',
        periodoEsperado:'2026-09'
      })
    })).catch(error => ({ error: error?.message || String(error) }));

    if (phase3de?.error) {
      errors.push(`${label}: contratos 3D/3E fallaron: ${phase3de.error}`);
    } else {
      if (phase3de.benefitSave?.beneficio?.id !== 'benefit-smoke' || phase3de.benefitCancel?.beneficio?.estado !== 'cancelado') {
        errors.push(`${label}: beneficio programado no normalizó la respuesta.`);
      }
      if (phase3de.promoSave?.promocion?.id !== 'promo-smoke') {
        errors.push(`${label}: promoción no normalizó la respuesta.`);
      }
      if (phase3de.partial?.saldo_restante !== 40 || phase3de.partial?.monto_pagado !== 60) {
        errors.push(`${label}: pago parcial no normalizó la respuesta.`);
      }
      if (phase3de.pact?.acuerdo?.fecha_pactada !== '2026-09-20' || phase3de.cancelPact?.cancelado !== true) {
        errors.push(`${label}: fecha pactada no normalizó la respuesta.`);
      }

      const actionMap = Object.fromEntries(financialActionRequests.map(x => [x.body?.accion, x]));
      if (
        actionMap.beneficio_crear?.body?.datos?.cliente_id !== 'client-smoke' ||
        actionMap.beneficio_crear?.body?.datos?.periodos_total !== 2
      ) errors.push(`${label}: contrato HTTP de beneficio programado incorrecto.`);

      if (
        actionMap.promocion_guardar?.body?.datos?.servicio_id !== 'catalog-smoke' ||
        actionMap.promocion_asignar?.body?.datos?.cliente_servicio_id !== 'service-smoke'
      ) errors.push(`${label}: contrato HTTP de promociones incorrecto.`);

      if (
        actionMap.registrar_pago_parcial?.body?.datos?.saldo_restante !== 40 ||
        actionMap.registrar_pago_parcial?.body?.datos?.periodo_esperado !== '2026-09'
      ) errors.push(`${label}: contrato HTTP de pago parcial incorrecto.`);

      if (
        actionMap.pactar_fecha_pago?.body?.datos?.fecha_pactada !== '2026-09-20' ||
        actionMap.cancelar_fecha_pactada?.body?.datos?.periodo_esperado !== '2026-09'
      ) errors.push(`${label}: contrato HTTP de fecha pactada incorrecto.`);
    }
  }


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

  // Promotions Studio: validar las cuatro mecánicas sin guardar nada.
  const promoStudio = await page.evaluate(async () => {
    try {
      await window.gxPromoLoad?.();
      window.gxPromoOpenEditor?.();

      const mechanics = [...document.querySelectorAll('[data-gx-promo-mechanic]')]
        .map(x => x.getAttribute('data-gx-promo-mechanic'));

      window.gxPromoSetMechanic?.('combo');
      const comboOptions = document.querySelectorAll('[data-gx-promo-service-check]').length;

      window.gxPromoSetMechanic?.('addon');
      const addonTrigger = document.getElementById('gx-promo-addon-trigger');
      const addonOptions = document.querySelectorAll('[data-gx-promo-addon-check]').length;

      const acquisition = document.getElementById('gx-promo-acquisition');
      const published = document.getElementById('gx-promo-published');
      const acquisitionInitiallyDisabled = acquisition?.disabled === true;

      if (published) published.checked = true;
      window.gxPromoPublicationChanged?.();
      const acquisitionEnabledAfterPublish = acquisition?.disabled === false;

      const hasPreview = !!document.getElementById('gx-promo-preview');
      const editorVisible = document.getElementById('gx-promo-editor')?.hidden === false;

      window.gxPromoCloseEditor?.();

      return {
        mechanics,
        comboOptions,
        addonOptions,
        hasTrigger: !!addonTrigger,
        hasPreview,
        editorVisible,
        hasAcquisition: !!acquisition,
        acquisitionInitiallyDisabled,
        acquisitionEnabledAfterPublish
      };
    } catch (error) {
      return { error: error?.message || String(error) };
    }
  });

  if (
    promoStudio?.error ||
    !['precio_fijo','porcentaje','combo','addon'].every(x => promoStudio?.mechanics?.includes(x)) ||
    promoStudio?.comboOptions !== 3 ||
    promoStudio?.addonOptions !== 3 ||
    promoStudio?.hasTrigger !== true ||
    promoStudio?.hasPreview !== true ||
    promoStudio?.editorVisible !== true ||
    promoStudio?.hasAcquisition !== true ||
    promoStudio?.acquisitionInitiallyDisabled !== true ||
    promoStudio?.acquisitionEnabledAfterPublish !== true
  ) {
    errors.push(`${label}: Promotions Studio universal no quedó operativo.`);
  }

  // Promotions Studio: comprobar contrato real del formulario sin persistir.
  const promoSaveUi = await page.evaluate(async () => {
    try {
      window.gxPromoOpenEditor?.();
      document.getElementById('gx-promo-name').value = 'Smoke Promotions Studio';
      document.getElementById('gx-promo-public-title').value = 'Oferta smoke';
      document.getElementById('gx-promo-price').value = '100';
      document.getElementById('gx-promo-periods').value = '3';
      window.gxPromoUpdatePreview?.();
      const priceLabel=(document.getElementById('gx-promo-price-label')?.textContent||'').trim();
      const previewText=(document.getElementById('gx-promo-preview')?.textContent||'').replace(/\s+/g,' ').trim();
      const published = document.getElementById('gx-promo-published');
      const acquisition = document.getElementById('gx-promo-acquisition');
      if (published) published.checked = true;
      window.gxPromoPublicationChanged?.();
      if (acquisition) acquisition.checked = true;
      await window.gxPromoSave?.();
      return { ok:true, priceLabel, previewText };
    } catch (error) {
      return { error:error?.message || String(error) };
    }
  });
  if (
    promoSaveUi?.error ||
    !String(promoSaveUi?.priceLabel||'').includes('Precio total') ||
    !String(promoSaveUi?.previewText||'').includes('$100')
  ) {
    errors.push(`${label}: guardado UI de Promotions Studio multi-periodo falló: ${JSON.stringify(promoSaveUi)}`);
  }

  const promoUiRequest = [...financialActionRequests].reverse().find(x =>
    x.body?.accion === 'promocion_guardar' &&
    x.body?.datos?.nombre === 'Smoke Promotions Studio'
  );
  if (
    !promoUiRequest ||
    promoUiRequest.body?.datos?.mecanica !== 'precio_fijo' ||
    promoUiRequest.body?.datos?.precio_promocional !== 100 ||
    promoUiRequest.body?.datos?.duracion_periodos !== 3 ||
    promoUiRequest.body?.datos?.publicada !== true ||
    promoUiRequest.body?.datos?.adquisicion_habilitada !== true ||
    !Array.isArray(promoUiRequest.body?.datos?.items) ||
    promoUiRequest.body.datos.items.length !== 1
  ) {
    errors.push(`${label}: Promotions Studio no envió publicación/adquisición completas al gateway financiero.`);
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

async function runBrowserStage(browserType, browserName, stageName, runner, errors) {
  const attempts = browserName === 'WebKit' ? 2 : 1;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let browser;
    try {
      browser = await browserType.launch({ headless: true });
      await runner(browser, browserName, errors);
      return;
    } catch (error) {
      lastError = error;
      const message = String(error?.stack || error?.message || error);
      const closedUnexpectedly =
        message.includes('Target page, context or browser has been closed') ||
        message.includes('Browser has been closed');

      if (!(browserName === 'WebKit' && closedUnexpectedly && attempt < attempts)) {
        break;
      }
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  errors.push(`${browserName} · ${stageName}: no pudo completar el smoke: ${lastError?.stack || lastError?.message || lastError}`);
}

try {
  await waitForServer();

  for (const [browserName, browserType] of browsers) {
    await runBrowserStage(browserType, browserName, 'Index', runIndex, errors);
    await runBrowserStage(browserType, browserName, 'Ayuda', runAyuda, errors);
    await runBrowserStage(browserType, browserName, 'Admin', runAdmin, errors);
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
console.log('✓ motor financiero compartido disponible en modo oficial');
console.log('✓ Index prefiere motor financiero válido y conserva fallback legacy');
console.log('✓ Ayuda/Admin consumen selector financiero común con fallback por divergencia');
console.log('✓ Ayuda quita splash y navega entre vistas');
console.log('✓ Mi Espacio crece y se contrae a su cápsula original');
console.log('✓ Soporte conserva crecimiento/contracción intermedia');
console.log('✓ Historial distingue suma/reinicio de lealtad');
console.log('✓ Registro de bienvenida abre');
console.log('✓ Admin expone todas las funciones usadas por controles HTML');
console.log('✓ Admin recorre navegación, catálogo, ajustes, filtros, registros y notificaciones');
console.log('✓ Admin pasa smoke en desktop y mobile');
console.log('✓ Admin prueba contrato de aprobación financiera sin persistir');
console.log('✓ Admin prueba Trato Justo individual/masivo sin persistir');
console.log('✓ Admin prueba beneficios, promociones y cobros especiales sin persistir');
