/* GOXION E2/B4 · Railway mirror API — isolated fictional customer only.
 * No Supabase, payments, WhatsApp, real client identifiers or credentials.
 * Every mutation is demo-only, server-owned and one per synthetic session.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.PORT||4173);
const dataFile=path.join(process.env.GX_B4_DATA_DIR||'/tmp','goxion-b4-demo.json');
const sessions=new Map();
const monthNames=['octubre','noviembre','diciembre','enero','febrero','marzo'];
const services=[
 {id:'netflix',name:'Netflix Premium · Perfil',price:10900,type:'profile',promotion:false},
 {id:'vix',name:'ViX Premium · Perfil',price:4900,type:'profile',promotion:false},
 {id:'combo',name:'Max + Prime · Combo promocional',price:9900,type:'combo',promotion:true},
 {id:'complete',name:'Crunchyroll · Cuenta completa',price:10000,type:'full',promotion:false}
];
const base=()=>({period:0,paid:[],streak:3,events:{notification:false,loyalty:false,mission:false},
 touched:[],coupon:null,missionCoupon:false,missionUsed:false,personalDiscount:true, netflixPromo:false,
 audit:[],payments:[]});
try{
 const all=JSON.parse(fs.readFileSync(dataFile,'utf8'));
 for(const [id,value] of Object.entries(all))if(/^[a-f0-9]{32}$/.test(id))sessions.set(id,value);
}catch{}
function persist(){
 try{fs.mkdirSync(path.dirname(dataFile),{recursive:true});const tmp=dataFile+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(Object.fromEntries(sessions)));fs.renameSync(tmp,dataFile);}catch(e){
 console.error('[B4 isolated demo] storage unavailable',e.message);
 }
}
const round=(v,p)=>Math.round(v*p/100);
function periodName(i){const y=2026+Math.floor((9+i)/12),m=(9+i)%12;return monthNames[i%6]+' '+y}
function eligible(s,state){return s.type==='profile'&&!(s.promotion||(s.id==='netflix'&&state.netflixPromo))}
function quote(state,period=state.period){
 const paid=state.paid.includes(period);
 const items=services.map(s=>({...s,eligible:eligible(s,state)}));
 const baseEligible=items.filter(s=>s.eligible).reduce((n,s)=>n+s.price,0);
 const original=items.reduce((n,s)=>n+s.price,0);
 const level=state.streak>=9?6:state.streak>=4?3:0;
 const loy=round(baseEligible,level);
 const mission=state.missionCoupon&&!state.missionUsed?Math.min(800,baseEligible-loy):0;
 const personal=state.personalDiscount?Math.min(500,Math.max(0,baseEligible-loy-mission)):0;
 const secretEligible=Boolean(state.coupon&&state.coupon.status==='reserved'
   &&period>=state.coupon.startPeriod&&baseEligible>0);
 const secret=secretEligible?Math.min(round(baseEligible,5),Math.max(0,baseEligible-loy-mission-personal)):0;
 return {period,label:periodName(period),paid,items,original,baseEligible,eligibleCount:items.filter(s=>s.eligible).length,
   loyaltyLevel:level,loyalty:loy,mission,personal,secret,total:Math.max(0,original-loy-mission-personal-secret),
   secretEligible,appliesCoupon:secret>0};
}
function snapshot(s){return {demo:true,version:'E2/B4 Railway v1',period:s.period,streak:s.streak,
 events:s.events,touched:s.touched,coupon:s.coupon,missionCoupon:s.missionCoupon,missionUsed:s.missionUsed,
 personalDiscount:s.personalDiscount,netflixPromo:s.netflixPromo,quote:quote(s),
 nextQuote:quote(s,s.period+1),history:s.payments.slice(-8),audit:s.audit.slice(-12)}}
function audit(s,type,extra={}){s.audit.push({type,at:new Date().toISOString(),...extra});if(s.audit.length>60)s.audit.shift()}
function act(s,type,body){
 if(type==='reset')return base();
 if(type==='notification'){
   if(!s.events.notification){s.events.notification=true;audit(s,type)}
 }else if(type==='mission'){
   if(!s.events.mission){s.events.mission=true;s.missionCoupon=true;audit(s,type)}
 }else if(type==='touch'){
   const kind=body.kind;
   if(!['notification','loyalty','mission'].includes(kind)||!s.events[kind])throw Error('Gixy aún no habilitado');
   if(!s.touched.includes(kind)){
     s.touched.push(kind);audit(s,type,{kind});
     if(s.touched.length===3&&!s.coupon){
       const q=quote(s);
       const startPeriod=q.paid||!q.eligibleCount?s.period+1:s.period;
       s.coupon={status:'reserved',percent:5,startPeriod,issuedAt:new Date().toISOString(),usedAt:null};
       audit(s,'reward_reserved',{startPeriod});
     }
   }
 }else if(type==='pay'){
   if(s.paid.includes(s.period))throw Error('Este período de prueba ya está pagado');
   const q=quote(s);
   s.paid.push(s.period);
   if(q.appliesCoupon&&s.coupon){
     s.coupon.status='used';s.coupon.appliedPeriod=s.period;s.coupon.usedAt=new Date().toISOString();
   }
   if(q.mission)s.missionUsed=true;
   s.payments.push({period:q.label,total:q.total,secret:q.secret,loyalty:q.loyalty,
     mission:q.mission,paidAt:new Date().toISOString()});
   const prev=s.streak;s.streak=Math.min(10,s.streak+1);
   if((prev<4&&s.streak===4)||(prev<9&&s.streak===9))s.events.loyalty=true;
   audit(s,'payment_confirmed',{period:s.period,couponUsed:q.appliesCoupon,levelUnlocked:prev<4&&s.streak>=4});
 }else if(type==='next'){
   if(!s.paid.includes(s.period))throw Error('Primero registra el pago del período simulado');
   if(s.period>=5)throw Error('Fin de los períodos simulados');
   s.period++;audit(s,'period_changed',{period:s.period});
 }else if(type==='promo'){
   s.netflixPromo=Boolean(body.active);audit(s,'promo_toggled',{active:s.netflixPromo});
 }else throw Error('Operación no permitida');
 return s;
}
function json(res,status,data,cookie){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
 if(cookie)headers['set-cookie']='gx_b4_sid='+cookie+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600';
 res.writeHead(status,headers);res.end(JSON.stringify(data));
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2',
 '.woff':'font/woff','.webp':'image/webp','.ico':'image/x-icon'};
function serve(req,res,url){
 let rel;try{rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');}catch{return json(res,400,{ok:false})}
 if(!(/^(preview|assets)\//.test(rel)||['logo2.PNG','logo.PNG','favicon.ico'].includes(rel))){
   res.writeHead(404);res.end('Not found');return;
 }
 const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Not found');return;
 }
 const ext=path.extname(file).toLowerCase(),headers={'content-type':mime[ext]||'application/octet-stream',
 'cache-control':'no-store','x-content-type-options':'nosniff'};
 if(rel==='preview/experiencia-b3-goxy-gixys/index.html'&&ext==='.html'){
   let html=fs.readFileSync(file,'utf8');
   const hook='</head>';
   html=html.replace(hook,'<link rel="stylesheet" href="/preview/b4-rewards-railway/client.css?v=1">'+hook);
   html=html.replace('</body>','<script src="/preview/b4-rewards-railway/client.js?v=1" defer></script></body>');
   html=html.replace('<title>GOXION · Goxy y Gixys · Bloque 3</title>',
     '<title>GOXION · Mi Espacio · Espejo funcional Railway</title>');
   res.writeHead(200,headers);res.end(html);return;
 }
 res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url||'/', 'http://localhost');
 if(url.pathname==='/health'){json(res,200,{ok:true,demo:true,store:'isolated'});return}
 if(url.pathname==='/'||url.pathname==='/espejo'||url.pathname==='/preview/experiencia-b3-goxy-gixys/'){
   res.writeHead(302,{location:'/preview/experiencia-b3-goxy-gixys/index.html'});res.end();return;
 }
 if(url.pathname.startsWith('/api/b4/')){
   if(!['GET','POST'].includes(req.method)){json(res,405,{ok:false});return}
   const existing=(req.headers.cookie||'').match(/(?:^|;\s*)gx_b4_sid=([a-f0-9]{32})(?:;|$)/);
   const sid=existing?.[1]||crypto.randomBytes(16).toString('hex');
   if(!sessions.has(sid)){sessions.set(sid,base());persist()}
   const s=sessions.get(sid);
   if(req.method==='GET'&&url.pathname==='/api/b4/state'){
     json(res,200,{ok:true,state:snapshot(s)},existing?null:sid);return;
   }
   if(req.method==='POST'&&url.pathname==='/api/b4/action'){
     let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096){json(res,413,{ok:false});return}}
     try{
       const body=JSON.parse(raw||'{}');
       if(typeof body.type!=='string')throw Error('Tipo inválido');
       sessions.set(sid,act(s,body.type,body));persist();
       json(res,200,{ok:true,state:snapshot(sessions.get(sid))},existing?null:sid);
     }catch(e){json(res,409,{ok:false,error:e.message,state:snapshot(s)},existing?null:sid)}
     return;
   }
   json(res,404,{ok:false});return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
 serve(req,res,url);
});
server.listen(port,'0.0.0.0',()=>console.log('GOXION B4 functional MIRROR (fictional only) port '+port));
