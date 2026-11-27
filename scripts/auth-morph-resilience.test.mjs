// Block G: deterministic state-machine test for WAAPI/RAF and reduced-motion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('assets/js/ayuda/07-production-interactions-js.js','utf8');
function fixture({mode='normal',webkit=false}={}){
  const counters={animated:0,cancelled:0,raf:0};
  class Element{
    constructor(id='',rect={left:20,top:40,width:120,height:38}){
      this.id=id;this.rect=rect;this.style={};this.children=[];this.parentNode=null;
      const classes=new Set();this.classList={add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};
      this.attrs=new Map();this.hidden=false;this.scrollHeight=360;
    }
    querySelector(selector){return selector==='.gx-auth-pill-label'?this.label:selector==='.gx-auth-inline-content'?this.content:null}
    appendChild(node){return this.insertBefore(node,null)}
    insertBefore(node,before){
      if(node.parentNode)node.remove();
      const i=before?this.children.indexOf(before):-1;
      this.children.splice(i<0?this.children.length:i,0,node);node.parentNode=this;return node;
    }
    remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null}}
    get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]??null}
    getBoundingClientRect(){return Object.fromEntries(Object.entries(this.rect).map(([k,v])=>[k,Number.parseFloat(this.style[k])||v]))}
    setAttribute(k,v){this.attrs.set(k,String(v))}
    getAttribute(k){return this.attrs.get(k)??null}
    removeAttribute(k){if(k==='style')this.style={};else this.attrs.delete(k)}
    get offsetWidth(){return this.getBoundingClientRect().width}
    animate(){
      counters.animated++;
      return {finished:mode==='stalled'?new Promise(()=>{}):Promise.resolve(),cancel(){counters.cancelled++}};
    }
  }
  if(mode==='no-waapi')delete Element.prototype.animate;
  const root=new Element('header-action-btn'),header=new Element('header'),body=new Element('body'),overlay=new Element('auth-overlay');
  root.label=new Element('label');root.content=new Element('content',{left:0,top:0,width:280,height:360});
  root.setAttribute('aria-expanded','false');header.appendChild(root);body.appendChild(header);
  const ids=new Map([[root.id,root],[overlay.id,overlay]]);
  const document={body,getElementById:id=>ids.get(id)||null,createElement:()=>new Element()};
  const ctx={document,Element,navigator:{userAgent:webkit?'AppleWebKit/605.1 Safari/605.1':'Chrome/131'},
    getComputedStyle:()=>({backgroundColor:'rgb(1,2,3)',borderColor:'rgb(4,5,6)',borderRadius:'20px',boxShadow:'none'}),
    matchMedia:()=>({matches:mode==='reduced'}),innerWidth:390,innerHeight:844,
    setTimeout,clearTimeout,performance,
    requestAnimationFrame:cb=>{counters.raf++;return mode==='raf-stall'?-1:setTimeout(()=>cb(performance.now()),8)},
    cancelAnimationFrame:id=>clearTimeout(id)
  };
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,root,header,overlay,body,counters};
}
async function finish(p,label){
  let id;
  try{await Promise.race([p,new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error(label+' did not settle')),1800)})]);}
  finally{clearTimeout(id)}
}
for(const config of [
  {mode:'normal'},{mode:'stalled'},{mode:'stalled',webkit:true},
  {mode:'raf-stall',webkit:true},{mode:'reduced'},{mode:'no-waapi'}
]){
  test('auth '+config.mode+(config.webkit?' WebKit-like':''),async()=>{
    const {ctx,root,header,overlay,body,counters}=fixture(config);
    for(let i=0;i<2;i++){
      await finish(ctx.openAuthSheet(),'open');
      assert.equal(root.getAttribute('aria-expanded'),'true');
      assert.equal(root.parentNode,body);assert.equal(header.children.length,1);
      assert.equal(root.content.style.opacity,'1');assert.equal(root.content.style.pointerEvents,'auto');
      assert.equal(root.classList.contains('gx-auth-login-visible'),true);
      assert.equal(overlay.classList.contains('show'),true);
      assert.ok(root.getBoundingClientRect().width>200);
      await finish(ctx.closeAuthSheet(),'close');
      assert.equal(root.getAttribute('aria-expanded'),'false');
      assert.equal(root.parentNode,header);assert.deepEqual(header.children,[root]);
      assert.equal(root.classList.contains('gx-auth-flip-card'),false);
      assert.equal(root.classList.contains('gx-auth-login-visible'),false);
      assert.equal(overlay.classList.contains('show'),false);
      assert.deepEqual(root.style,{});assert.equal(body.style.overflow,'auto');
    }
    if(config.mode==='no-waapi'||config.mode==='reduced')assert.equal(counters.animated,0);
    if(config.mode==='stalled')assert.ok(counters.animated>=4&&counters.cancelled===counters.animated);
    if(config.mode==='raf-stall')assert.ok(counters.raf>0);
  });
}
