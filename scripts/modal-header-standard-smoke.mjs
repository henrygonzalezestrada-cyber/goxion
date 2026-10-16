import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
const port=4186,base="http://127.0.0.1:"+port;
const server=spawn(process.execPath,["scripts/serve-preview.mjs"],{
  env:{...process.env,PORT:String(port)},stdio:"ignore"
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){
 for(let i=0;i<90;i++){try{if((await fetch(base+"/index.html")).ok)return}catch{}await delay(130)}
 throw Error("Local preview not ready");
}
async function check(browser,name){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await page.goto(base+"/index.html?cliente=prueba",{waitUntil:"domcontentloaded",timeout:18000});
  const bank=await page.evaluate(()=>{
   document.body.classList.add("gx-payment-v2");
   document.getElementById("bank-modal").classList.add("show");
   document.getElementById("payment-modal").classList.add("show");
   return [".gx-bank-static-head",".gx-payment-static-head"].map((sel,i)=>{
    const head=document.querySelector(sel);
    const scroll=document.querySelector(i?".gx-payment-scroll":".gx-bank-scroll");
    const filler=document.createElement("div");
    filler.style.height="1000px";filler.style.flex="0 0 1000px";scroll.append(filler);
    const y=head.getBoundingClientRect().y;scroll.scrollTop=130;
    const close=head.querySelector("button"),style=getComputedStyle(close);
    return {scroll:scroll.scrollTop,shift:Math.abs(head.getBoundingClientRect().y-y),
      width:parseFloat(style.width),height:parseFloat(style.height),color:style.backgroundColor,
      icon:getComputedStyle(close,"::before").width};
   });
  });
  for(const b of bank){
   assert.ok(b.scroll>0&&b.shift<1,name+" · index header does not stay pinned");
   assert.equal(Math.round(b.width),34);assert.equal(Math.round(b.height),34);
   assert.ok(b.color.includes("0, 242, 254"));assert.equal(Math.round(parseFloat(b.icon)),16);
  }
  await page.goto(base+"/ayuda.html",{waitUntil:"domcontentloaded",timeout:18000});
  const help=await page.evaluate(()=>{
   document.getElementById("modal-terminos").classList.add("show");
   const el=document.querySelector("#modal-terminos .gx-standard-legacy-modal");
   const content=el.querySelector(".gx-dialog-legacy-scroll");
   const tall=document.createElement("div");tall.style.height="1200px";content.append(tall);
   const head=el.querySelector(".gx-dialog-legacy-head"),y=head.getBoundingClientRect().y;
   content.scrollTop=110;
   const notification=document.createElement("div");
   notification.className="gx-client-notif-sheet show";notification.id="gx-client-notif-sheet";
   notification.innerHTML='<div class="gx-client-notif-handle"></div>'+
     '<header class="gx-client-notif-head"><div class="gx-client-notif-toolbar"></div>'+
     '<strong class="gx-client-notif-head-title">Notificaciones</strong>'+
     '<button class="gx-client-notif-close"><svg></svg></button></header>'+
     '<div class="gx-client-notif-list"><div style="height:1100px"></div></div>';
   document.body.append(notification);
   const nh=notification.querySelector(".gx-client-notif-head"),ny=nh.getBoundingClientRect().y;
   notification.querySelector(".gx-client-notif-list").scrollTop=150;
   const controls=[
      document.querySelector(".gx-auth-inline-close"),
      el.querySelector(".close-btn"),
      notification.querySelector(".gx-client-notif-close")
   ];
   const metrics=controls.map(b=>({width:parseFloat(getComputedStyle(b).width),
      height:parseFloat(getComputedStyle(b).height),
      color:getComputedStyle(b).backgroundColor,
      icon:getComputedStyle(b,"::before").width}));
   return {titleCount:document.querySelectorAll(".gx-dialog-legacy-head .modal-title").length,
      scroll:content.scrollTop,headShift:Math.abs(head.getBoundingClientRect().y-y),
      notifShift:Math.abs(nh.getBoundingClientRect().y-ny),metrics};
  });
  assert.equal(help.titleCount,5);
  assert.ok(help.scroll>0 && help.headShift<1,name+" · legal modal title moves");
  assert.ok(help.notifShift<1,name+" · notifications title moves");
  for(const b of help.metrics){
   assert.equal(Math.round(b.width),34);assert.equal(Math.round(b.height),34);
   assert.ok(b.color.includes("0, 242, 254"));assert.equal(Math.round(parseFloat(b.icon)),16);
  }
  console.log("PASS "+name+" · encabezados y X de GOXION");
 }finally{await page.close()}
}
try{
 await ready();
 for(const [name,browserType] of [["Chromium",chromium],["WebKit",webkit]]){
  const browser=await browserType.launch({headless:true});
  try{await check(browser,name)}finally{await browser.close()}
 }
 console.log("GOXION modal headers and close controls PASS");
}finally{server.kill("SIGTERM")}
