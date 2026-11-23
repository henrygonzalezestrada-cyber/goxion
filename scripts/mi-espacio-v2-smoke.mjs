/* GOXION Mi Espacio V2 · QA estructural: laboratorio como contrato visual.
   Solo lectura; verifica que no se mezclaron renderizadores anteriores. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='preview/mi-espacio-v2/';
const lab=fs.readFileSync('preview/experiencia-mi-espacio-inteligente/morph-v2.html','utf8');
const html=fs.readFileSync(base+'index.html','utf8');
const data=fs.readFileSync(base+'v2-data.js','utf8');
const app=fs.readFileSync(base+'v2-app.js','utf8');
const css=fs.readFileSync(base+'v2.css','utf8');
for(const [name,text] of Object.entries({lab,html,data,app,css}))assert(text.length>300,name+' no debe estar vacío');
for(const selector of ['gxn-nav','greeting','focus','gxb-row','gxb-panel','gxv-savings','gxs-list','gxm-list','gxi-auth','gxi-space']){
 assert(html.includes('id="'+selector+'"'),selector+' requerido en el DOM V2');
}
for(const s of ['gxb-morph-surface','gxb-morph-emoji','gxb-dismiss','gxs-card','gxm-entry','gxi-auth-card']){
 assert(html.includes('class="'+s)||html.includes(' '+s+' ' )||css.includes('.'+s)||app.includes("className='"+s),s+' falta del contrato');
}
assert(html.includes('<style>')&&html.includes('</style>'),'CSS canónico del laboratorio, sin skin heredado');
assert(html.includes('adaptive-top-nav.css'),'componente navegación aprobada');
assert(app.includes("function snapshotEmoji")&&app.includes("async function transition("),'morph animado recuperado del laboratorio');
assert(!html.includes('id="gxi-catalog"')&&!html.includes('id="gxi-support"'),'módulos oficiales no duplicados');
assert(app.includes("window.location.assign(new URL('../../ayuda.html'"),'Catálogo y Soporte a GOXION oficial');
assert(app.includes("logos.dataset.count="),'Geometría de logos');
assert(app.includes("card.insertAdjacentElement('afterend',details)"),'Explicación de ahorro fuera de tarjeta');
const notify=fs.readFileSync(base+'v2-notifications.js','utf8');
const notifyCSS=fs.readFileSync(base+'v2-notifications.css','utf8');
new Function(notify);
assert(notify.includes('function bindSwipeRows')&&notify.includes('function undoPendingDelete'),'gestos y deshacer oficiales');
assert(html.includes('v2-notifications.js')&&html.includes('v2-notifications.css'),'avisos con cristal neutro integrado');
assert(app.includes('GOXION_V2_NOTIFICATIONS?.refresh'),'notificaciones conectadas al motor');
assert(app.includes('function observeSavings'),'ahorro animado y visible en scroll');
assert(data.includes('crunchyroll-mega-fan'),'Crunchyroll Mega Fan con tarifa independiente');
assert(!html.includes('id="gxn-notice-menu"'),'no existe dropdown provisional');
assert(notifyCSS.includes('rgba(21,25,32,.9)'),'cristal neutro en notificaciones');
const mirror=fs.readFileSync(base+'espejo.html','utf8');
const bridge=fs.readFileSync(base+'v2-official-bridge.js','utf8');
const notice=fs.readFileSync(base+'v2-notifications.js','utf8');
const neutral=fs.readFileSync(base+'v2-notifications.css','utf8');
for(const [name,text] of Object.entries({mirror,bridge,notice,neutral}))assert(text.length>200,name+' debe estar completo');
new Function(bridge);new Function(notice);
assert(mirror.includes('id="gxi-official-portal"')&&mirror.includes('id="gxi-official-frame"'),'espejo con Catálogo/Soporte oficiales');
assert(bridge.includes("new URL('../../ayuda.html'")&&bridge.includes("child.switchTab(tab)"),'módulos y controladores de producción, no clones');
assert(bridge.includes("window.GOXION_V2_OFFICIAL_BRIDGE=Object.freeze"),'puente de navegación');
assert(!html.includes('id="gxi-official-frame"'),'laboratorio V2 visual separado del espejo integral');
assert(neutral.includes('linear-gradient(135deg,#7c4dff,#00f2fe)'),'badge morado a cian de la oficial');
assert(neutral.includes('width:44px')&&neutral.includes('width:74px'),'campana circular y cápsula expandida');
assert(notice.includes('function bindSwipeRows')&&notice.includes('function undoPendingDelete'),'funciones originales de gestos y deshacer');
assert(!html.includes('assets/css/ayuda.css'),'el diseño viejo no se carga');
assert(!html.includes('01e-client-dashboard'),'no hay renderizadores antiguos');
assert(!html.includes('mirror.js'),'no hay adaptador del espejo');
for(const term of ['id="demo-panel"','id="demo-toggle"','id="gxs-demo-case"','id="gxv-demo-case"','Probar situaciones','$248','mario@example.com','Mario · Mi Espacio','Probar estados']){
 assert(!html.includes(term),'Elementos de prueba prohibidos: '+term);
}
for(const term of ['originals=[','const examples=[','Probar situaciones']){
 assert(!app.includes(term),'No se permite simulación en el JS publicado: '+term);
}
assert(app.includes("const state={view:null,prices:[]"),'datos reales inicializados vacíos');
assert(data.includes("GOXION_V2_DATA")&&data.includes("getPriceReferences"),'datos/precios independientes');
assert(/select=clave,plataforma,plan,precio_mensual_mxn/.test(data),'API pública de tarifas reales');
assert(data.includes("45*86400000"),'control de vigencia precios');
assert(data.includes("X-Client-Token"),'sesión con token oficial');
assert(data.includes("localStorage.getItem(TOKEN_KEY)"),'token oficial, sin sesión falsa');
assert(data.includes("cliente_servicio_id"),'cancelaciones/accesos por contrato');
assert(app.includes("const secret=String(currentAccess"),'PIN solo en memoria y no en HTML');
assert(!app.includes('pin,\'pin\',pin'),'no filtrar PIN en DOM');
assert(!data.includes('service_role')&&!app.includes('service_role'),'nunca service role en cliente');
for(const token of ['.gxb-panel{','.gxs-services{','.gxm-history{','.gxv-savings{']){
 assert(lab.includes(token)&&html.includes(token),'estilo laboratorio no copiado: '+token);
}
for(const key of ['netflix-premium','hbo-max-platino','vix-premium','prime-video','youtube-premium','microsoft-365']){
 assert(data.includes(key),'comparador para '+key);
}
assert.equal((html.match(/<main\b/g)||[]).length,1,'un solo DOM principal');
assert.equal((html.match(/id="gxn-nav"/g)||[]).length,1,'una sola cápsula');
assert.equal((html.match(/id="gxb-row"/g)||[]).length,1,'un solo grupo de beneficios');
assert.equal((html.match(/id="gxv-savings"/g)||[]).length,1,'una sola tarjeta de ahorro');
assert.equal((html.match(/id="gxm-history"/g)||[]).length,1,'un historial');
new Function(data);new Function(app);
console.log('GOXION Mi Espacio V2 · QA estructural y sintaxis correctos');
