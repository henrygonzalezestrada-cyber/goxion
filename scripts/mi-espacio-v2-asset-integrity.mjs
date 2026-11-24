import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const base='preview/mi-espacio-v2/';
const js=read(base+'official-feed-runtime.js');
const css=read(base+'official-feed.css');
new vm.Script(js);
assert(js.includes('function applyMissionReceipt'));
assert(css.includes('#gx-v2-feed .shell'));
assert(css.includes('.gxn-nav[data-mode="compact"]'));
assert(!css.includes('function applyMissionReceipt'));
for(const path of ['ayuda-aceptacion-v2.html','ayuda-espejo-feed-v2.html']){
 const html=read(path);
 assert.match(html,/<script src="\.\/preview\/mi-espacio-v2\/official-feed-runtime\.js\?v=[^"]+"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\.\/preview\/mi-espacio-v2\/official-feed\.css\?v=[^"]+">/);
}
console.log('PASS: archivos JS/CSS y referencias de las dos rutas compartidas');
