import { chromium } from 'playwright';

const preview='https://goxion-promotions-c1-preview-production.up.railway.app';
const supabase='https://hmpevcwodcgbkviarfic.supabase.co/functions/v1';

function assert(cond,msg){ if(!cond) throw new Error(msg); }

const publicRes=await fetch(supabase+'/mi-espacio',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({modo:'publico'})
});
const publicData=await publicRes.json();
assert(publicRes.ok && publicData?.ok===true,'mi-espacio público no respondió ok');
assert(Array.isArray(publicData.catalogo) && publicData.catalogo.length>=8,'catálogo público incompleto');
assert(publicData.catalogo.every(x=>typeof x.categoria_catalogo==='string'&&x.categoria_catalogo.length>0),'falta categoria_catalogo');
const microsoft=publicData.catalogo.find(x=>/microsoft|365/i.test(x.nombre||''));
const google=publicData.catalogo.find(x=>/google one|2tb/i.test(x.nombre||''));
assert(microsoft?.categoria_catalogo==='productividad','Microsoft 365 no llegó como Productividad');
assert(google?.categoria_catalogo==='almacenamiento','Google One no llegó como Almacenamiento');

const promoRes=await fetch(supabase+'/promociones-catalogo',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:'{}'
});
const promoData=await promoRes.json();
assert(promoRes.ok && promoData?.ok===true,'promociones-catalogo no respondió ok');
assert(Array.isArray(promoData.promociones),'promociones-catalogo no devolvió arreglo');

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message||String(e)));
page.on('console',m=>{
  if(m.type()==='error' && !m.text().includes('Failed to load resource')) pageErrors.push(m.text());
});

await page.goto(preview+'/ayuda.html',{waitUntil:'load',timeout:45000});
await page.waitForTimeout(5200);
await page.locator('#btn-tab-catalogo').click();
await page.waitForFunction(()=>document.getElementById('view-catalogo')?.classList.contains('active'),null,{timeout:10000});
await page.waitForFunction(()=>document.querySelectorAll('#catalog-container .brand-card').length>=8,null,{timeout:15000});
await page.waitForFunction(()=>document.querySelectorAll('#gx-catalog-discover-rail .gx-catalog-mini-card').length>=2,null,{timeout:15000});

const ui=await page.evaluate(()=>({
  cards:document.querySelectorAll('#catalog-container .brand-card').length,
  discover:[...document.querySelectorAll('#gx-catalog-discover-rail .gx-catalog-mini-card')].map(x=>(x.textContent||'').replace(/\s+/g,' ').trim()),
  promoHidden:document.getElementById('gx-promo-showcase')?.hidden===true,
  promoCards:document.querySelectorAll('#gx-promo-deck .gx-promo-deck-card').length,
  catalogMode:document.getElementById('gx-catalog-curated')?.dataset.gxCatalogMode||''
}));

assert(ui.cards>=8,'Ayuda no renderizó catálogo real');
assert(ui.catalogMode==='public','Catálogo público no quedó en modo public');
assert(ui.discover.some(x=>/Microsoft 365/i.test(x)&&/Productividad/i.test(x)),'Descubre no muestra Microsoft como Productividad');
assert(ui.discover.some(x=>/Google One/i.test(x)&&/Almacenamiento/i.test(x)),'Descubre no muestra Google One como Almacenamiento');
if((promoData.promociones||[]).length===0){
  assert(ui.promoHidden===true || ui.promoCards===0,'Deck promo visible sin promociones reales');
}else{
  assert(ui.promoCards>=1,'Hay promociones reales pero Ayuda no renderizó deck');
}
assert(pageErrors.length===0,'Errores de página: '+pageErrors.join(' | '));

await browser.close();

console.log(JSON.stringify({
  ok:true,
  catalogCount:publicData.catalogo.length,
  categories:{microsoft:microsoft.categoria_catalogo,google:google.categoria_catalogo},
  promotions:(promoData.promociones||[]).length,
  ui
},null,2));
