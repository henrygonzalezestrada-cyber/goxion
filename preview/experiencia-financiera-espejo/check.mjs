/* E1/B2 · two genuine visual dialects (Ayuda → Index), all synthetic.
 * QA: financial invariants, navigation, selected obligations, proof states,
 * safety, responsiveness and no backend in Chromium and WebKit.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const folder='preview/experiencia-financiera-espejo/';
const ayuda=fs.readFileSync(folder+'index.html','utf8');
const index=fs.readFileSync(folder+'estado.html','utf8');
assert(ayuda.includes('data-gx-smart-beta="true" data-gx-b2-preview="true"'));
assert(ayuda.includes('../experiencia-mi-espacio-inteligente/smart.css?v=e1b1v6'));
assert(ayuda.includes('src="./ayuda-b2.js?v=e1b2v2"'));
assert(index.includes('../../assets/css/index.css'));
assert(index.includes('animate-ui-native.bundle.js?v=e1b2r5v3'));
assert(index.includes('data-gx-animate-ui="native-r5"'));
assert(!/cdn.jsdelivr|esm.sh|unpkg.com/i.test(index),'No external React runtime/CDN');
assert(index.includes('class="sticky-area"')&&index.includes('class="balance-hero"'));
assert(index.includes('class="glass-card services-container"'));
assert(!/supabase|clientes\.json|discord|X-Client-Token/i.test(index));
const port=4267,base='http://127.0.0.1:'+port+'/'+folder;
const server=spawn(process.execPath,['scripts/serve-preview.mjs'],{
 env:{...process.env,PORT:String(port)},stdio:'ignore'});
const nap=t=>new Promise(resolve=>setTimeout(resolve,t));
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'estado.html')).ok)return}catch{}await nap(125)}throw Error('HTTP fixture failed')}
const forbidden=/(?:supabase|clientes\.json|discord|comprobantes-b2-beta|estado-financiero-b2-beta|\/functions\/v1\/)/i;
async function run(name,engine){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [280,320,360,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,hasTouch:true});
   const errors=[],leaks=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(forbidden.test(r.url()))leaks.push(r.url())});
   await page.route('**/fonts.googleapis.com/**',r=>r.abort());
   await page.route('**/fonts.gstatic.com/**',r=>r.abort());
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.GOXION_E1B2_AYUDA?.isolated&&window.GOXION_SMART_BETA?.isolated,{timeout:6000});
   assert(await page.locator('#gx-smart-lab').evaluate(el=>el.hidden),'Ayuda lab is hidden');
   await page.locator('#gx-smart-toggle').click();
   await page.selectOption('#gx-smart-scenario','multi');
   assert((await page.locator('.gx-account-capsule-label').textContent()).includes('$45.00'),
    'Ayuda should use the FIRST obligation, not whole period');
   await page.locator('#dash-billing-card .gx-account-capsule').click();
   await page.waitForURL('**/experiencia-financiera-espejo/estado.html?escenario=multi',{timeout:5000});
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX?.isolated&&window.GOXION_ANIMATEUI_NATIVE?.actualReactComponents,{timeout:7000});
   await page.locator('#gx-b2-loyalty-mark .gx-aui-loyalty-orbit').waitFor({timeout:4000});
   // R8 · el importe suma al cargar (700 ms): esperar al valor exacto.
   await page.waitForFunction(()=>document.querySelector('#gx-b2-hero-amount').textContent==='$45.00',null,{timeout:5000});
   await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total')?.textContent==='$45.00',null,{timeout:5000});
   if(name==='Chromium'&&width===390){
    console.log('GX_R5_SHOT_MULTI='+(await page.screenshot({type:'png',fullPage:true})).toString('base64'));
   }
   assert.equal(await page.locator('#gx-b2-loyalty-mark').getAttribute('aria-valuenow'),'3');
   assert.equal(await page.locator('#gx-b2-loyalty-mark').getAttribute('aria-valuemax'),'4');
   assert.equal(await page.locator('#gx-b2-loyalty-mark .gx-aui-loyalty-orbit').count(),1);
   assert.equal(await page.locator('#gx-b2-loyalty-mark .gx-aui-loyalty-star svg').count(),1,
    'Real Animate UI animated Star must mount');
   assert.equal(await page.evaluate(()=>window.GOXION_ANIMATEUI_NATIVE.version),'2.0.0');
   assert.equal(await page.locator('.card-info').evaluate(el=>getComputedStyle(el).borderTopWidth),'1px');
   assert.equal(await page.locator('.card-info')
    .evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(8, 8, 12, 0.25)',
    'Identity glass should reuse exact neutral Ayuda value, not a blue gradient');
   assert.equal(await page.locator('#gx-b2-breakdown')
    .evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(8, 8, 12, 0.25)',
    'Ledger glass should reuse exact neutral Ayuda value');
   assert(await page.locator('.card-info')
    .evaluate(el=>getComputedStyle(el).backdropFilter.includes('blur(10px)')),
    'Glass must refract content underneath through actual backdrop-filter');
   assert.equal(await page.locator('#gx-b2-services')
    .evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(8, 8, 12, 0.25)');

   // R9 · el glow del hero se quitó por completo (a Henry no le
   // agradó y se comportaba extraño al contraer): no debe quedar
   // ::before con animación detrás del importe. El glow vive ahora
   // en la píldora de estado: gradiente líquido que mezcla el
   // color principal con otro (gx-r9-liquid) y respiración de
   // lealtad, solo transform/opacity/background-position.
   assert.equal(await page.locator('#gx-b2-hero').evaluate(el=>getComputedStyle(el,'::before').animationName),'none',
    'R9 '+name+' '+width+' hero glow must be gone');
   assert.equal(await page.locator('#gx-b2-hero').evaluate(el=>getComputedStyle(el,'::before').content),'none',
    'R9 '+name+' '+width+' hero must have no ::before layer left');
   assert.equal(await page.locator('#gx-b2-hero-badge').evaluate(el=>getComputedStyle(el).animationName),'gx-r9-liquid',
    'R9 '+name+' '+width+' badge must carry the liquid glow');
   assert((await page.locator('#gx-b2-hero-badge').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('linear-gradient'),
    'R9 '+name+' '+width+' badge liquid glow must be a gradient');
   assert.equal(await page.locator('#gx-b2-loyalty-mark').evaluate(el=>getComputedStyle(el).animationName),'gx-r8-breathe',
    'R8 '+name+' '+width+' loyalty mark must breathe');
   // R8 · conteo a mitad de camino: al cambiar de escenario el texto
   // pasa por valores intermedios exactos (nunca falsos ni $45.72
   // a mitad de morph) y termina en el valor exacto.
   await page.locator('#gx-b2-lab-toggle').click();
   await page.selectOption('#gx-b2-scenario','upcoming');
   await page.waitForFunction(()=>{
    const t=document.querySelector('#gx-b2-hero-amount').textContent;
    const v=parseFloat(t.replace(/[^0-9.]/g,''));
    return t!=='$45.00'&&t!=='$89.00'&&v>45&&v<89;
   },null,{timeout:5000,polling:50});
   await page.waitForFunction(()=>document.querySelector('#gx-b2-hero-amount').textContent==='$89.00',null,{timeout:5000});
   // R8 · cancelar con scroll: al desplazar, el conteo se corta y el
   // valor exacto queda de inmediato, sin números a medias.
   await page.selectOption('#gx-b2-scenario','multi');
   await page.evaluate(()=>window.scrollTo(0,120));
   await page.waitForFunction(()=>document.querySelector('#gx-b2-hero-amount').textContent==='$45.00',null,{timeout:3000});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX.getMorphProgress()<.01,null,{timeout:6000,polling:50});
   await page.locator('#gx-b2-lab-toggle').click();
   assert.equal(await page.locator('#gx-b2-calendar-body').evaluate(el=>el.hidden),true);
   // The *actual* Ayuda Morphicons 1.5.0 DOM driver animates this path,
   // not a rotated Unicode glyph or a guessed CSS chevron.
   assert.equal(await page.evaluate(()=>window.GOXION_CALENDAR_MORPH?.installed),true);
   assert.equal(await page.evaluate(()=>window.GOXION_CALENDAR_MORPH?.library),'morphicons@1.5.0');
   assert.equal(await page.locator('#gx-b2-calendar-toggle .gx-morph-chevron path').count(),1);
   assert.equal(await page.locator('#gx-b2-calendar-toggle .gx-chevron-motion')
     .getAttribute('data-gx-morphicons-host'),'1');
   const downPath=await page.locator('#gx-b2-calendar-toggle .gx-morph-chevron path').getAttribute('d');
   const iconStyle=await page.locator('#gx-b2-calendar-toggle .gx-morph-chevron')
     .evaluate(el=>({width:el.getBoundingClientRect().width,
      transform:getComputedStyle(el).transform}));
   assert(Math.abs(iconStyle.width-21)<1,name+' '+width+' Ayuda icon size changed');
   assert(['none','matrix(1, 0, 0, 1, 0, 0)'].includes(iconStyle.transform),
    name+' '+width+' chevron must morph path, never rotate SVG');
   await page.locator('#gx-b2-calendar-toggle').click();
   assert.equal(await page.locator('#gx-b2-calendar-toggle').getAttribute('aria-expanded'),'true');
   // CSS uses the same 250ms color transition as Ayuda; wait for it
   // to complete rather than sampling cyan on the first animation frame.
   await page.waitForFunction(()=>{
    const el=document.querySelector('#gx-b2-calendar-toggle .gx-chevron-motion');
    return Boolean(el&&getComputedStyle(el).color==='rgb(155, 145, 255)');
   },null,{timeout:2500,polling:50});
   await page.waitForFunction(down=>{
    const el=document.querySelector('#gx-b2-calendar-toggle .gx-morph-chevron path');
    return Boolean(el&&el.getAttribute('d')!==down);
   },downPath,{timeout:5000,polling:50});
   const openPath=await page.locator('#gx-b2-calendar-toggle .gx-morph-chevron path').getAttribute('d');
   assert.notEqual(openPath,downPath,'Opening must morph the glyph path');
   await page.locator('#gx-b2-calendar-toggle').click();
   assert.equal(await page.locator('#gx-b2-calendar-toggle').getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('#gx-b2-calendar-body').evaluate(el=>el.hidden),true);
   await page.waitForFunction(open=>{
    const el=document.querySelector('#gx-b2-calendar-toggle .gx-morph-chevron path');
    return Boolean(el&&el.getAttribute('d')!==open);
   },openPath,{timeout:5000,polling:50});
   await page.locator('#gx-b2-calendar-toggle').click();
   assert.equal(await page.locator('#gx-b2-calendar-row').count(),0);
   assert.equal(await page.locator('[data-charge]').count(),2);
   assert.match(await page.locator('#gx-b2-calendar-list').innerText(),/6 de noviembre/i);
   await page.locator('[data-mode="all"]').click();
   // R8 · el total seleccionado suma hasta $94.00 (700 ms) y aterriza
   // con el pulso R7; esperar al valor exacto antes de afirmar.
   await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total').textContent==='$94.00',null,{timeout:5000});
   // R7 · pulso de importe al cambiar Próximo ↔ Todo junto: valores
   // exactos. La animación WAAPI (no la CSS del libro) es la que
   // debe existir sobre el total seleccionado; el pulso corre al
   // terminar el conteo R8 (300 ms), así que se espera a verlo
   // aparecer en vez de muestrear un instante fijo (los frames
   // rAF pueden ir lentos en headless y el pulso aún no habría
   // arrancado al muestrear).
   await page.waitForFunction(()=>{
    const el=document.querySelector('#gx-b2-selected-total');
    return el.getAnimations().some(a=>!(a instanceof CSSAnimation));
   },null,{timeout:3000,polling:50});
   assert.equal(await page.locator('#gx-b2-hero-amount').textContent(),'$45.00',
    'Hero must not replace next due with entire period');
   // R9 · regresión del bug de Todo junto: el conteo del total
   // seleccionado debe correr también con la página desplazada.
   // Causa raíz (dos capas): la guarda progress()>0.02 en
   // breakdown() lo suprimía siempre que se había desplazado para
   // llegar al control (en iPhone, siempre); y aunque se quitara,
   // request() cancelaba el conteo al llegar el scrollend del
   // desplazamiento (~50 ms después del toque). Desplazar, volver
   // a Próximo y a Todo junto: en ambos casos pasa por intermedios
   // y aterriza exacto.
   await page.evaluate(()=>document.querySelector('[data-mode="all"]').scrollIntoView({block:'center'}));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX.getMorphProgress()>.02,null,{timeout:5000,polling:50});
   await page.locator('[data-mode="next"]').click();
   await page.waitForFunction(()=>{
    const t=document.querySelector('#gx-b2-selected-total').textContent;
    const v=parseFloat(t.replace(/[^0-9.]/g,''));
    return t!=='$94.00'&&t!=='$45.00'&&v>45&&v<94;
   },null,{timeout:5000,polling:50});
   await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total').textContent==='$45.00',null,{timeout:5000});
   await page.locator('[data-mode="all"]').click();
   await page.waitForFunction(()=>{
    const t=document.querySelector('#gx-b2-selected-total').textContent;
    const v=parseFloat(t.replace(/[^0-9.]/g,''));
    return t!=='$94.00'&&t!=='$45.00'&&v>45&&v<94;
   },null,{timeout:5000,polling:50});
   await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total').textContent==='$94.00',null,{timeout:5000});
   await page.locator('[data-charge="b"]').click();
   await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total').textContent==='$49.00',null,{timeout:5000});
   // R7 · acomodo: a mitad de scroll el precio ya viajó, el par ya está
   // separado (gap 10) y el badge nunca atraviesa el importe. Se mide
   // bajando desde arriba: el anclaje de scroll mueve el scrollY real,
   // así que se busca la banda de progreso 0.35–0.60 probando
   // posiciones hasta entrar en ella.
   // R9 · partir de arriba (scroll 0, progreso <0.01): la regresión R9
   // deja la página desplazada (progreso ≈1) y al bajar desde ahí el
   // anclaje empuja el scrollY real 10–16 px por encima de lo pedido,
   // así que el progreso se asienta siempre por encima de 0.60 y la
   // banda no se alcanza nunca. Desde reposo se entra desde abajo,
   // como en R8.
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX.getMorphProgress()<.01,null,
    {timeout:6000,polling:50});
   let mid=null;
   for(const y of [120,150,100,170,90]){
    await page.evaluate(yy=>window.scrollTo(0,yy),y);
    try{
     await page.waitForFunction(()=>{const p=window.GOXION_E1B2_INDEX.getMorphProgress();return p>=.35&&p<=.6},{timeout:3000,polling:50});
     mid=await page.evaluate(()=>{
      const r=s=>{const b=document.querySelector(s).getBoundingClientRect();
       return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height}};
      const a=r('#gx-b2-hero-amount'),b=r('#gx-b2-hero-badge'),h=r('#gx-b2-hero');
      return {p:+window.GOXION_E1B2_INDEX.getMorphProgress().toFixed(3),
       gap:+(b.l-a.r).toFixed(1),
       vOverlap:+(Math.min(a.b,b.b)-Math.max(a.t,b.t)).toFixed(1),
       emptyBand:+(h.b-Math.max(a.b,b.b)).toFixed(1),
       amountFont:+parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-amount')).fontSize).toFixed(1),
       heroH:+h.h.toFixed(1)};
     });
     break;
    }catch{}
   }
   assert(mid,'R7 '+name+' '+width+' morph did not reach mid-scroll band');
   assert(mid.gap>=8,'R7 '+name+' '+width+' compact pair must be separated mid-scroll. Geometry: '+JSON.stringify(mid));
   assert(mid.amountFont<=32,'R7 '+name+' '+width+' price must travel first. Geometry: '+JSON.stringify(mid));
   assert(mid.vOverlap<=0||mid.gap>=0,'R7 '+name+' '+width+' badge must never cross the amount. Geometry: '+JSON.stringify(mid));
   assert(mid.emptyBand<=16,'R7 '+name+' '+width+' hero must hug content, no empty band. Geometry: '+JSON.stringify(mid));
   assert((await page.locator('#gx-b2-hero-badge').evaluate(el=>getComputedStyle(el).transitionProperty)).includes('background-color'),
    'R7 '+name+' '+width+' badge color must transition, not switch instantly');
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX.getMorphProgress()<.01,null,
    {timeout:6000,polling:50});
   // Scroll morph is a real relocation of the same DOM nodes, not a cloned hero.
   // Height temporarily reduced so even desktop-width scenarios can scroll.
   const expanded=await page.evaluate(()=>{
    const a=document.querySelector('#gx-b2-hero-amount');
    const hero=document.querySelector('#gx-b2-hero');
    return {font:parseFloat(getComputedStyle(a).fontSize),height:hero.getBoundingClientRect().height,
     amountTop:parseFloat(getComputedStyle(a).top),
     badgeTop:parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-badge')).top)};
   });
   await page.setViewportSize({width,height:550});
   await page.evaluate(()=>window.scrollTo(0,330));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX?.getMorphProgress?.()>.992,null,
    {timeout:6000,polling:50});
   const collapsed=await page.evaluate(()=>{
    const a=document.querySelector('#gx-b2-hero-amount').getBoundingClientRect();
    const b=document.querySelector('#gx-b2-hero-badge').getBoundingClientRect();
    return {
     font:parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-amount')).fontSize),
     height:document.querySelector('#gx-b2-hero').getBoundingClientRect().height,
     amountTop:parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-amount')).top),
     badgeTop:parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-badge')).top),
     labelOpacity:parseFloat(getComputedStyle(document.querySelector('#gx-b2-hero-label')).opacity),
     amountCenter:a.left+a.width/2,badgeCenter:b.left+b.width/2,
     badgeLeft:b.left,badgeRight:b.right,amountRight:a.right,
     vw:document.documentElement.clientWidth,
     stickyTop:document.querySelector('#gx-b2-sticky').getBoundingClientRect().top
    };
   });
   // The label is initially visible, and only its vacated space gets
   // reclaimed. The approved expanded state remains pixel-for-pixel aligned.
   assert.equal(expanded.amountTop,17,name+' '+width+' expanded amount moved');
   assert.equal(expanded.badgeTop,80,name+' '+width+' expanded badge moved');
   assert(collapsed.labelOpacity<.05,name+' '+width+' label should be gone');
   assert(collapsed.amountTop<=1,name+' '+width+' hidden label leaves empty space above amount');
   assert(collapsed.badgeTop<=3,name+' '+width+' hidden label leaves empty space above badge');
   assert(collapsed.height<=38,name+' '+width+' hidden label reserves excess hero height');
   assert(collapsed.font<expanded.font-17,name+' '+width+' amount did not morph');
   assert(collapsed.height<expanded.height-58,name+' '+width+' sticky height did not compress');
   
   assert(collapsed.amountCenter<collapsed.badgeCenter,
    name+' '+width+' amount must sit LEFT of the badge');
   assert(collapsed.badgeLeft>=collapsed.amountRight+2,
    name+' '+width+' compact badge should not overlap the amount. Geometry: '+
     JSON.stringify({expanded,collapsed}));
   assert(collapsed.badgeCenter-collapsed.amountCenter<Math.min(165,collapsed.vw*.64),
    name+' '+width+' compact amount/status split too far apart');
   assert(collapsed.badgeLeft>=-2&&collapsed.amountRight<=collapsed.vw+2,
    name+' '+width+' collapsed header overflows horizontally');
   assert(Math.abs(collapsed.stickyTop)<4,name+' '+width+' sticky header left viewport');
   assert.equal(await page.locator('#gx-b2-sticky').count(),1,'No duplicate sticky headers');
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>window.GOXION_E1B2_INDEX.getMorphProgress()<.08,null,
    {timeout:6000,polling:50});
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('#gx-b2-hero-amount').textContent(),'$45.00');

   await page.locator('#gx-b2-lab-toggle').click();
   const scenarios=[
    ['same_day','$94.00'],
    ['first_paid','$49.00'],
    ['partial','$25.00'],
    ['review','$79.00'],
    ['correction','$79.00'],
    ['overdue','$47.25'],
    ['extension','$79.00'],
    ['clear','$0.00'],
    ['unavailable','—'],
    ['new','$0.00'],
    ['upcoming','$89.00']
   ];
   for(const [scenario,expected] of scenarios){
    await page.selectOption('#gx-b2-scenario',scenario);
    // R8 · cada cambio de escenario suma hasta el valor exacto.
    await page.waitForFunction(exp=>document.querySelector('#gx-b2-hero-amount').textContent===exp,expected,{timeout:5000});
    if(scenario==='same_day'){
     await page.locator('#gx-b2-calendar-toggle').click();
     assert.equal(await page.locator('[data-charge]').count(),2);
     await page.waitForFunction(()=>document.querySelector('#gx-b2-selected-total').textContent==='$94.00',null,{timeout:5000});
    }
    if(scenario==='review'){
     await page.locator('#gx-b2-proof .gx-aui-proof-review').waitFor({timeout:5000});
     if(name==='Chromium'&&width===390){
      console.log('GX_R5_SHOT_REVIEW='+(await page.screenshot({type:'png',fullPage:true})).toString('base64'));
     }
     assert.match(await page.locator('#gx-b2-proof').innerText(),/No lo envíes de nuevo/i);
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-progress-track').count(),1);
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-progress-indicator').count(),1);
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-progress-labels span').count(),3);
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-proof-icon svg').count(),1);
     assert.equal(await page.locator('#gx-b2-proof .gx-r4-station-shell').count(),0,
      'No old custom SVG/handmade milestone stations');
     assert.equal(await page.locator('#gx-b2-action').count(),0);
     assert.equal((await page.locator('#gx-b2-actions').textContent()).trim(),'');
     assert(await page.locator('#gx-b2-proof').evaluate(el=>el.nextElementSibling?.classList.contains('card-info')),
      'Proof experience must sit under hero');
     assert.equal(await page.locator('#gx-b2-proof').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    }
    if(scenario==='correction'){
     await page.locator('#gx-b2-proof .gx-aui-proof-correction').waitFor({timeout:5000});
     assert.match(await page.locator('#gx-b2-proof').innerText(),/Revisa los datos/i);
     assert.equal(await page.locator('#gx-b2-proof').getAttribute('data-phase'),'correction');
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-progress-indicator').count(),1);
     assert.equal(await page.locator('#gx-b2-action').textContent(),'Consultar observación');
    }
    if(scenario==='extension'){
     assert.match(await page.locator('#gx-b2-hero-badge').textContent(),/21 oct/i);
     assert.equal(await page.locator('#gx-b2-breakdown .surcharge-line').count(),0);
    }
    if(scenario==='first_paid'){
     await page.locator('#gx-b2-proof .gx-aui-proof-approved').waitFor({timeout:5000});
     assert.match(await page.locator('#gx-b2-services').textContent(),/Liquidado/);
     assert.match(await page.locator('#gx-b2-proof').textContent(),/Comprobante validado/);
     assert.equal(await page.locator('.gx-b2-service-progress [role="progressbar"]').getAttribute('aria-valuenow'),'1');
     assert.equal(await page.locator('.gx-b2-service-progress [role="progressbar"]').getAttribute('aria-valuemax'),'2');
     assert.equal(await page.locator('#gx-b2-proof .gx-aui-progress-indicator').count(),1);
    }
    if(scenario==='partial'){
     assert.match(await page.locator('#gx-b2-breakdown').textContent(),/Abono ya aprobado/);
     assert.match(await page.locator('#gx-b2-breakdown').textContent(),/\$20\.00/);
    }
    if(scenario==='overdue'){
     assert.match(await page.locator('#gx-b2-breakdown').textContent(),/\$2\.25/);
     if(name==='Chromium'&&width===390){
      await page.locator('#gx-b2-loyalty-mark .gx-aui-heart-crack svg').waitFor();
      console.log('GX_R5_SHOT_LOST='+(await page.screenshot({type:'png',fullPage:true})).toString('base64'));
     }
     assert.equal(await page.locator('#gx-b2-loyalty-panel').getAttribute('data-loyalty-state'),'lost');
     await page.locator('#gx-b2-loyalty-mark .gx-aui-heart-crack svg').waitFor({timeout:4000});
     assert.equal(await page.locator('#gx-b2-loyalty-mark .gx-aui-heart-crack svg').count(),1);
     assert.equal(await page.locator('#gx-b2-loyalty-mark .gx-aui-loyalty-orbit').count(),0,
      'Broken heart must have no loyalty ring');
     assert.match(await page.locator('#gx-b2-loyalty-panel').textContent(),/Racha reiniciada/i);
    }
    if(scenario==='unavailable'){
     assert.equal(await page.locator('#gx-b2-action').count(),0);
     assert.match(await page.locator('#gx-b2-actions').textContent(),/bloqueado/);
     assert.equal(await page.locator('#gx-b2-loyalty-panel').evaluate(el=>el.hidden),true,
      'Never fabricate a loyalty streak without trusted state');
    }
    if(['clear','new'].includes(scenario))assert.equal(await page.locator('#gx-b2-action').count(),0);
    if(scenario==='new')assert.equal(await page.locator('#gx-b2-loyalty-panel').evaluate(el=>el.hidden),true);
    if(scenario==='extension'){
     assert.equal(await page.locator('#gx-b2-loyalty-mark').getAttribute('aria-valuenow'),'7');
     assert.equal(await page.locator('#gx-b2-loyalty-mark').getAttribute('aria-valuemax'),'9');
    }
    const rect=await page.evaluate(()=>({vw:document.documentElement.clientWidth,full:document.documentElement.scrollWidth}));
    assert(rect.full<=rect.vw+2,name+' '+width+' '+scenario+' horizontal overflow '+rect.full+'/'+rect.vw);
   }
   await page.selectOption('#gx-b2-scenario','upcoming');
   await page.locator('#gx-b2-lab-toggle').click(); // Close floating QA overlay before customer action.
   assert(await page.locator('#gx-b2-lab').evaluate(el=>el.hidden));
   await page.locator('#gx-b2-action').click();
   assert.equal(await page.locator('#gx-b2-demo-modal').evaluate(el=>el.hidden),false);
   // R7 · hoja de reporte con entrada de resorte + blur, y copiar CLABE
   // con icono que se transforma a check, sin toast genérico.
   assert.equal(await page.locator('#gx-b2-demo-modal .gx-b2-demo-modal').evaluate(el=>getComputedStyle(el).animationName),'gx-r7-sheet-in',
    'R7 '+name+' '+width+' report sheet must enter with spring + blur');
   await page.locator('#gx-b2-copy-clabe').click();
   await page.waitForFunction(()=>document.querySelector('#gx-b2-copy-clabe').classList.contains('is-copied'),null,{timeout:3000});
   assert.equal(await page.locator('#gx-b2-copy-state').textContent(),'Copiado');
   // La transición del icono dura .25 s: esperar a que llegue a 1 en
   // vez de muestrear el valor inicial del cambio de estilo.
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#gx-b2-copy-clabe .gx-b2-copy-check')).opacity==='1',null,{timeout:3000,polling:50});
   assert.equal(await page.locator('#gx-b2-copy-clabe').evaluate(el=>getComputedStyle(el.querySelector('.gx-b2-copy-check')).opacity),'1');
   assert.equal(await page.locator('[role="status"],[role="alert"]').count(),0,'R7 copy must not show a generic toast');
   await page.locator('#gx-b2-demo-submit').click();
   assert.equal(await page.locator('#gx-b2-demo-modal').evaluate(el=>el.hidden),true);
   assert.equal(await page.locator('#gx-b2-hero-badge').textContent(),'En revisión');
   await page.locator('#gx-b2-proof .gx-aui-proof-review').waitFor({timeout:5000});
   assert.equal(await page.locator('.gx-aui-progress-labels span').count(),3);
   assert.equal(await page.locator('#gx-b2-action').count(),0);
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
   assert.deepEqual(leaks,[]);assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log(name+' E1/B2 FINAL · 7 widths × 12 states; Ayuda Morphicons path morph, R5 UI and financial invariants PASS');
 }finally{await browser.close()}
}
try{await ready();await run('Chromium',chromium);await run('WebKit',webkit);console.log('E1/B2 BETA PASS')}
finally{server.kill('SIGTERM')}
