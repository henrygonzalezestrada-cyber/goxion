import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const src=read('assets/js/ayuda/01f-catalog-orders.js');
const start=src.indexOf('// The smart hero owns global incidents');
const end=src.indexOf('let ocupados = {};',start);
assert.ok(start>=0&&end>start);
const render=new Function('document','config',src.slice(start,end));
for(const smart of [true,false]){
 const banner={hidden:smart,style:{display:'flex'},dataset:{}},content={textContent:'old',innerHTML:''};
 const doc={documentElement:{hasAttribute:k=>smart&&k==='data-gx-smart-hero'},getElementById:k=>k==='dynamic-alert'?banner:k==='alert-content'?content:null};
 render(doc,{alertas:{activa:true,plataforma:'ViX Premium',falla:'presentando intermitencias'}});
 if(smart){assert.equal(banner.hidden,true);assert.equal(banner.style.display,'none');assert.equal(content.textContent,'');assert.equal(content.innerHTML,'')}
 else{assert.equal(banner.style.display,'flex');assert.match(content.innerHTML,/ViX Premium/)}
}
for(const path of ['ayuda.html','ayuda-espejo-feed-v2.html','ayuda-aceptacion-v2.html']){
 const html=read(path);assert.match(html,/<html[^>]*data-gx-smart-hero/);assert.match(html,/id="dynamic-alert" hidden/);
}
assert.match(read('preview/mi-espacio-v2/official-feed.css'),/data-gx-smart-hero.*#dynamic-alert.*display:none!important/);
console.log('Legacy alert: smart-hero guard active in official and all candidate tabs; legacy fallback tested');
