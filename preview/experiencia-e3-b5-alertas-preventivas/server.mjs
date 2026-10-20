/* GOXION E3/B5 Railway: static focused preview only; no APIs,
 * no credentials, no external calls and no data collection. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.PORT||4173);
const routes=[
 'preview/experiencia-e3-b5-alertas-preventivas/',
 'preview/experiencia-b3-goxy-gixys/',
 'preview/gixys-mi-espacio-espejo/',
 'preview/experiencia-mi-espacio-inteligente/',
 'assets/css/',
 'assets/js/ayuda/05-gamification-shared-morph-js.js',
 'logo2.PNG'
];
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp',
 '.woff':'font/woff','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 const pathname=new URL(req.url||'/','http://localhost').pathname;
 if(pathname==='/health'){
  res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify({ok:true,mode:'demo_only',production:false}));return;
 }
 if(pathname==='/'||pathname==='/espejo'){
  res.writeHead(302,{location:'/preview/experiencia-e3-b5-alertas-preventivas/index.html'});
  res.end();return;
 }
 // Goxy support opens real Ayuda ONLY by explicit click. No sandbox
 // identifiers, mock client details or cookies are forwarded.
 if(pathname==='/preview/experiencia-b3-goxy-gixys/goxy-handoff.html'){
  res.writeHead(302,{location:'https://henrygonzalezestrada-cyber.github.io/goxion/ayuda.html'});
  res.end();return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 let relative;try{relative=decodeURIComponent(pathname).replace(/^\/+/,'')}catch{
  res.writeHead(400);res.end();return;
 }
 if(!routes.some(allowed=>relative===allowed||relative.startsWith(allowed))){
  res.writeHead(404);res.end();return;
 }
 const filename=path.resolve(root,relative);
 if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){
  res.writeHead(404);res.end();return;
 }
 res.writeHead(200,{'content-type':mime[path.extname(filename).toLowerCase()]||'application/octet-stream',
  'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'self' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; frame-ancestors 'none'"});
 if(req.method==='HEAD')res.end();
 else fs.createReadStream(filename).pipe(res);
}).listen(port,'0.0.0.0',()=>console.log('GOXION E3/B5 static isolated preview :'+port));
