/* GOXION / Gixys V9 approved: production adapter.
 * Shares exact original Plastic BotAvatar and PulseHeart, no demo payments.
 * Never mutates account data, loyalty counters, mission completion or vouchers.
 */
import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import PulseHeart from '../../../preview/gixys-mi-espacio-espejo/src/vendor/PulseHeart.jsx';
import {Messages} from '../../../preview/gixys-mi-espacio-espejo/src/companions.jsx';

const safeKey=()=>{
 try{
  const key=typeof getCurrentClientKey==='function'
   ?String(getCurrentClientKey()||'')
   :String(window.goxionCurrentClientKey||'');
  return key&&typeof globalClientesData!=='undefined'&&
    globalClientesData?.[key] ?key:'';
 }catch{return '';}
};
const client=()=>{
 const key=safeKey();
 try{return key&&typeof globalClientesData!=='undefined'?globalClientesData[key]:null;}
 catch{return null;}
};
const emit=(kind,active)=>document.dispatchEvent(
 new CustomEvent('gx-mirror:'+kind,{detail:{active:Boolean(active)}}));
const activeDashboard=()=>{
 const view=document.getElementById('view-dashboard');
 return Boolean(view&&!view.hidden&&getComputedStyle(view).display!=='none'&&
  !document.documentElement.classList.contains('gx-notif-open'));
};
const missionReady=()=>{
 const g=client()?.gamificacion;
 if(!g||g.misiones_activas!==true||!g.tareas)return false;
 const jobs=g.tareas.split('\n').map(x=>x.trim()).filter(Boolean);
 const indices=new Set((Array.isArray(g.progreso)?g.progreso:[])
  .map(x=>Number(x?.mision_index)).filter(Number.isInteger));
 return jobs.length>0&&jobs.every((_,idx)=>indices.has(idx));
};
function LoyaltyOfficial(){
 const [liked,setLiked]=useState(false);
 useEffect(()=>{
  const el=document.getElementById('loyalty-count');
  if(!el)return;
  const check=()=>{
   const m=el.textContent.match(/(\d+)\s*\/\s*(\d+)/);
   setLiked(Boolean(m&&Number(m[1])>=Number(m[2])&&Number(m[2])>=4));
  };
  check();
  const mo=new MutationObserver(check);mo.observe(el,{childList:true,characterData:true,subtree:true});
  return ()=>mo.disconnect();
 },[]);
 return <PulseHeart liked={liked} onChange={()=>{
  if(safeKey()&&activeDashboard())emit('loyalty',true);
 }} showCount={false} size={28} corner={22} likedColor="#ff4d6d"
 idleColor="#ff4d6d" pillColor="transparent" textColor="#fff"
 duration={560} dotSize={.3} overshoot={1.7}
 label="Ver mensaje de Gixy sobre lealtad"/>;
}
function CompanionRoot({active}){
 return active?<Messages official={true}/>:null;
}
let heartRoot=null,companionRoot=null,active=false;
const root=document.createElement('div');root.id='gx-gixys-message-root';
root.setAttribute('aria-label','Gixys de GOXION');
function mountHeart(){
 const count=document.getElementById('loyalty-count');
 const label=count?.parentElement?.firstElementChild;
 if(!label||!count)return;
 if(!label.classList.contains('gx-gixys-official-loyalty-label')){
  label.classList.add('gx-gixys-official-loyalty-label');
  label.replaceChildren();
  const heart=document.createElement('span');
  heart.id='gx-mirror-heart';
  const title=document.createElement('span');
  title.className='gx-gixys-official-loyalty-name';title.textContent='Nivel de Lealtad';
  label.append(heart,title);
  heartRoot=createRoot(heart);
  heartRoot.render(<LoyaltyOfficial/>);
 }
}
function activate(){
 const key=safeKey();
 if(!key){deactivate();return;}
 mountHeart();
 active=true;
 document.body.classList.add('gx-gixys-official');
 document.documentElement.setAttribute('data-gx-gixys','');
 companionRoot.render(<CompanionRoot active={true}/>);
 observeContext(key);
}
function deactivate(){
 active=false;
 if(contextObserver){contextObserver.disconnect();contextObserver=null;}
 if(badgeObserver){badgeObserver.disconnect();badgeObserver=null;}
 currentKey='';lastMission=null;lastUnread=null;
 document.body.classList.remove('gx-gixys-official');
 companionRoot.render(<CompanionRoot active={false}/>);
}
let contextObserver=null,badgeObserver=null,currentKey='',lastMission=null,lastUnread=null;
let notifTimer=0;
function observeContext(key){
 if(key!==currentKey){lastMission=null;lastUnread=null;currentKey=key;}
 contextObserver?.disconnect();badgeObserver?.disconnect();
 const area=document.getElementById('referral-section-container');
 const checkMission=()=>{
  if(!active||safeKey()!==key||!activeDashboard())return;
  const next=missionReady();
  if(lastMission===null){lastMission=next;return;}
  if(next&&!lastMission)emit('mission',true);
  lastMission=next;
 };
 checkMission();
 if(area){
  contextObserver=new MutationObserver(()=>queueMicrotask(checkMission));
  contextObserver.observe(area,{childList:true,subtree:true,characterData:true});
 }
 const observeBadge=()=>{
  if(!active||safeKey()!==key)return;
  const badge=document.getElementById('gx-client-notif-badge');
  if(!badge)return;
  badgeObserver?.disconnect();
  const check=()=>{
   if(!active||safeKey()!==key)return;
   const n=window.GOXION_CLIENT_NOTIFICATIONS?.getUnread?.();
   const next=Number.isFinite(n)?n:parseInt(badge.textContent,10)||0;
   if(lastUnread===null){lastUnread=next;return;}
   if(next>lastUnread&&activeDashboard())emit('notification',true);
   lastUnread=next;
  };
  check();
  badgeObserver=new MutationObserver(check);
  badgeObserver.observe(badge,{childList:true,subtree:true,characterData:true});
 };
 observeBadge();
}
function begin(){
 if(window.GOXION_GIXYS_OFFICIAL_STARTED)return;
 window.GOXION_GIXYS_OFFICIAL_STARTED=true;
 document.body.append(root);
 companionRoot=createRoot(root);
 window.addEventListener('goxion:client-ready',()=>setTimeout(activate,120));
 window.addEventListener('goxion:client-logout',deactivate);
 window.addEventListener('goxion:client-space:updated',()=>{if(active)queueMicrotask(activate);});
 window.addEventListener('goxion:realtime',()=>{
  if(!active)return;
  // A backend refresh can complete missions; DOM changes alone are never a
  // trusted identity, so we also check current confirmed client state.
  queueMicrotask(()=>{
   if(!activeDashboard())return;
   const next=missionReady();
   if(lastMission===false&&next)emit('mission',true);
   lastMission=next;
  });
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
   for(const k of ['mission','loyalty','notification'])emit(k,false);
  }
 });
 if(safeKey())setTimeout(activate,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});
else begin();
