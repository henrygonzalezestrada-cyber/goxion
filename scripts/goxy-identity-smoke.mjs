import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('ayuda-espejo-feed-v2.html','utf8'),js=readFileSync('preview/mi-espacio-v2/goxy-identity.js','utf8'),css=readFileSync('preview/mi-espacio-v2/official-feed.css','utf8');
const profile=html.match(/<div id="gxn-goxy-colors" hidden>.*?<\/small><\/div>/s)[0];
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await p.route('https://goxy.test/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<html data-gx-support-v3><body class="gx-v2-client-session"><button id="gxn-profile-trigger"><span id="gxn-avatar" class="gxn-avatar gxn-robot-ready"><span class="gxn-goxy-real"><span id="gxn-goxy-slot"></span></span><span class="gxn-goxy-silhouette"></span></span></button><div id="gxn-profile-menu">'+profile+'</div><section id="view-soporte"><div class="gxai-hero"><span class="gxai-canvas-slot"></span></div><div class="gxai-chat"><span class="gxai-canvas-slot"></span></div></section></body></html>'}));
 await p.goto('https://goxy.test/');
 await p.addStyleTag({content:css});
 await p.evaluate(()=>window.GOXION_V2_CLIENT_ID='synthetic-a');
 await p.addScriptTag({content:js});
 await p.locator('[data-goxy-color-choice="violeta"]').click();
 assert.deepEqual(await p.locator('[data-goxy-color]').evaluateAll(xs=>xs.map(x=>x.dataset.goxyColor)),['#7753a8','#7753a8','#7753a8']);
 await p.evaluate(()=>document.getElementById('view-soporte').classList.add('active'));
 await p.waitForFunction(()=>document.getElementById('gxn-avatar').classList.contains('gx-goxy-away'));
 assert.equal(await p.locator('#gxn-goxy-slot').getAttribute('data-goxy-paused'),'true');
 assert.equal(await p.locator('.gxai-hero .gxai-canvas-slot').getAttribute('data-goxy-paused'),'false');
 assert.equal(await p.locator('.gxai-chat .gxai-canvas-slot').getAttribute('data-goxy-paused'),'true');
 await p.evaluate(()=>document.documentElement.classList.add('gxai-immersive-open'));
 await p.waitForFunction(()=>document.querySelector('.gxai-chat .gxai-canvas-slot').dataset.goxyPaused==='false');
 assert.equal(await p.locator('.gxai-hero .gxai-canvas-slot').getAttribute('data-goxy-paused'),'true');
 await p.evaluate(()=>{window.GOXION_V2_CLIENT_ID='synthetic-b';window.dispatchEvent(new Event('goxion:v2-feed:rendered'))});
 assert.equal(await p.locator('#gxn-goxy-slot').getAttribute('data-goxy-color'),'#3552b1');
 await p.evaluate(()=>{window.GOXION_V2_CLIENT_ID='synthetic-a';window.dispatchEvent(new Event('goxion:v2-feed:rendered'))});
 assert.equal(await p.locator('#gxn-goxy-slot').getAttribute('data-goxy-color'),'#7753a8');
 await p.evaluate(()=>window.dispatchEvent(new Event('goxion:client-logout')));
 assert.equal(await p.locator('#gxn-goxy-slot').getAttribute('data-goxy-color'),'#3552b1');
 assert.equal(await p.locator('#gxn-goxy-colors').isVisible(),false);
 console.log(name+' · identidad Goxy, color por cuenta, presencia y pausa OK');
 }finally{await browser.close()}
}
