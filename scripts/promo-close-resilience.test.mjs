import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/ayuda/15-promotions-catalog-c1.js',import.meta.url),'utf8');
const start=source.indexOf('  function closePromoDetail(');
const end=source.indexOf('  function realPromotions()',start);
assert.ok(start>=0&&end>start,'C9 controller exists');
const close=source.slice(start,end);

test('C9 commits the original geometry before any animation frame is delivered',async()=>{
  const classes=new Set(['is-expanded']);
  const tasks=[];
  const style={height:'526px',width:'352px',top:'159px',left:'22px',
    setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};
  let frames=0,restored=0,settled=0;
  const deck={insertBefore(node){assert.equal(node,card);restored++;card.parentElement=this}};
  const placeholder={parentNode:deck,remove(){}};
  const card={
    dataset:{gxPromoIndex:'0'},isConnected:true,style,
    classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:k=>classes.has(k)},
    querySelector(){return null},get offsetWidth(){return parseFloat(style.width)},
    getAnimations(){return []},getBoundingClientRect(){return {width:parseFloat(style.width),height:parseFloat(style.height)}},setAttribute(k,v){this[k]=v},removeEventListener(){},
  };
  const state={expandedCard:card,expandedPlaceholder:placeholder,
    expandedOrigin:{top:100,left:36,width:300,height:348,cssWidth:300,cssHeight:348},renderedPromotions:[{}]};
  const classList={remove(){}};
  const scope={state,v3:true,setPromoActionState(){},
    document:{hidden:false,documentElement:{classList},body:{classList}},performance:{now:()=>0},applyDeckPositions(){},startAuto(){},
    settleStalledPromoMorph(node,height){assert.equal(node,card);assert.equal(height,348);settled++},
    setTimeout(fn,delay){tasks.push({fn,delay});return tasks.length},
    requestAnimationFrame(){frames++;return frames},
  };
  vm.runInNewContext(close+'\nclosePromoDetail();',scope);
  assert.equal(classes.has('is-closing'),true);
  const phase=tasks.find(x=>x.delay===110);
  assert.ok(phase);
  phase.fn();
  assert.equal(classes.has('is-returning'),true);
  // RAF is deliberately starved (zero callbacks run).
  assert.equal(style.height,'348px');
  assert.equal(style.width,'300px');
  assert.equal(style.top,'100px');
  assert.equal(style.left,'36px');
  assert.equal(restored,0,'same fixed node until return finishes');
  const final=tasks.find(x=>x.delay===820);
  assert.ok(final);
  const finalPromise=final.fn();
  await new Promise(r=>setImmediate(r));
  const liveness=tasks.find(x=>x.delay===1000);
  assert.ok(liveness,'bounded final frame fallback');
  liveness.fn();
  await finalPromise;
  assert.equal(settled,1);
  assert.equal(restored,1);
  assert.equal(state.expandedCard,null);
  assert.equal(classes.has('is-returning'),false);
  assert.equal(card['aria-expanded'],'false');
});

test('C9 does not reinsert a card whose compositor remains at an intermediate size',async()=>{
  const classes=new Set(['is-expanded']);
  const tasks=[];
  let clock=0,restored=0,measuredAtRestore=0;
  const style={height:'526px',width:'352px',setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};
  const card={
    dataset:{gxPromoIndex:'0'},isConnected:true,style,
    classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:k=>classes.has(k)},
    querySelector(){return null},get offsetWidth(){return this.getBoundingClientRect().width},
    getBoundingClientRect(){return classes.has('gx-promo-return-settled')?
      {width:300,height:348}:{width:330,height:427}},
    getAnimations(){return []},setAttribute(k,v){this[k]=v},removeEventListener(){}
  };
  const deck={insertBefore(node){
    assert.equal(node,card); measuredAtRestore=node.getBoundingClientRect().height;restored++;
  }};
  const state={expandedCard:card,expandedPlaceholder:{parentNode:deck,remove(){}},
    expandedOrigin:{top:100,left:36,width:300,height:348,cssWidth:300,cssHeight:348},renderedPromotions:[{}]};
  const classList={remove(){}};
  const scope={state,v3:true,setPromoActionState(){},document:{hidden:false,documentElement:{classList},body:{classList}},
    applyDeckPositions(){},startAuto(){},settleStalledPromoMorph(){},performance:{now:()=>clock},
    setTimeout(fn,delay){if(delay===110||delay===820)tasks.push({fn,delay});else{clock+=delay;queueMicrotask(fn)}},
    requestAnimationFrame(){return 1}
  };
  vm.runInNewContext(close+'\nclosePromoDetail();',scope);
  tasks.find(x=>x.delay===110).fn();
  assert.equal(restored,0);
  await tasks.find(x=>x.delay===820).fn();
  assert.equal(measuredAtRestore,348,'never reparent at a partially transitioned height');
  assert.equal(restored,1);
  assert.equal(classes.has('gx-promo-return-settled'),false,'escape hatch must not affect future transitions');
  assert.equal(state.expandedCard,null);
});
