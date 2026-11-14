/* Browser QA for E3/B5 focused beta. Synthetic, server has NO write API. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

const root=path.resolve(process.cwd()),port=4838;
const host='http://127.0.0.1:'+port,base=host+'/preview/experiencia-e3-b5-alertas-preventivas/';
const mimetypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml',
 '.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 let decoded;try{decoded=decodeURIComponent(new URL(req.url,host).pathname);}catch{res.writeHead(400);res.end();return}
 let file=path.resolve(root,'.'+decoded);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);res.end('Not found '+decoded);return;
 }
 res.writeHead(200,{'content-type':mimetypes[path.extname(file).toLowerCase()]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
async function browser(engine,label){
 const instance=await engine.launch();
 try{
  const context=await instance.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],privateCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
   if(/supabase\.co|\/functions\/v1\/|api\/b4|discord\.com|webhook/i.test(r.url()))
    privateCalls.push(r.url());
  });
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GOXION_B5_DEMO?.isolated === true
   &&window.GOXION_B3_ROUTER?.isolated === true,{timeout:15000});
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),false,'initial banner');
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'');
  assert.equal(await page.locator('#gx-b5-controls').count(),1);
  assert.equal(await page.locator('#gx-b5-banner').count(),1,'reuses same banner, not duplicate');
  await page.locator('#gx-b3-toggle').click();
  assert.equal(await page.locator('#gx-b3-controls').isVisible(),true);
  await page.locator('#gx-b5-platform').selectOption('svc-vix');
  await page.locator('#gx-b5-confirm').click();
  await page.waitForFunction(()=>window.GOXION_B5_DEMO.view()?.deliveries === 2);
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),true,'affected banner');
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'1');
  assert((await page.locator('#gx-b5-banner').textContent()).includes('ViX Premium'));
  assert.equal((await page.locator('#dash-services').textContent()).includes('Temporalmente inactivo'),true);
  await page.locator('#gx-b5-client').selectOption('client-b');
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),false,'unaffected banner hidden');
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'','no cross-account badge');
  assert((await page.locator('#dash-services').textContent()).includes('Activo'));
  await page.locator('#gx-b5-client').selectOption('client-c');
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),true,'other affected banner');
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'1');
  await page.locator('#gx-b5-client').selectOption('client-guest');
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),false,'guest no targeted banner');
  await page.locator('#gx-b5-client').selectOption('client-d');
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),false,'suspended excluded');
  await page.locator('#gx-b5-client').selectOption('client-a');
  await page.locator('#gx-client-notif-launch').click();
  await page.locator('#gx-smart-notif-sheet.show').waitFor({timeout:3000});
  assert.equal(await page.locator('#gx-smart-notif-list .gx-client-notif-item').count(),1);
  assert((await page.locator('#gx-smart-notif-list').textContent()).includes('ViX Premium'));
  assert.equal(await page.locator('#gx-client-notif-badge').textContent(),'','mark read');
  await page.locator('#gx-smart-notif-close').click();
  await page.locator('#gx-b3-toggle').click();
  await page.locator('#gx-b5-confirm').click(); // idempotent re-confirm; tray stays open
  assert.equal((await page.evaluate(()=>window.GOXION_B5_DEMO.view().deliveries)),2);
  await page.locator('#gx-b5-resolve').click();
  assert.equal(await page.locator('#gx-b5-banner').isVisible(),false,'resolved => no active banner');
  assert((await page.locator('#dash-services').textContent()).includes('Activo'));
  await page.locator('#gx-client-notif-launch').click();
  assert((await page.locator('#gx-smart-notif-list').textContent()).includes('Incidencia resuelta'));
  await page.locator('#gx-smart-notif-close').click();
  // Required 7 responsive widths: important screens must not horizontally reflow.
  for(const width of [280,320,360,375,390,430,768]){
   await page.setViewportSize({width,height:844});
   await page.waitForTimeout(80);
   const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}));
   assert(dims.sw<=dims.w+2,label+' overflow '+width+' '+JSON.stringify(dims));
  }
  assert.deepEqual(privateCalls,[],label+' private request found');
  assert.deepEqual(errors,[],label+' browser errors');
  console.log('PASS '+label+' · Admin fixture, affected audience, original banner/bell, resolve/read, 7 widths, no private calls');
 }finally{await instance.close()}
}
try{await browser(chromium,'Chromium');await browser(webkit,'WebKit')}
finally{await new Promise(resolve=>server.close(resolve))}
