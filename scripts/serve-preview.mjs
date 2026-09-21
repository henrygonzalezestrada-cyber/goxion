import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolvePath(pathname) {
  const decoded = decodeURIComponent((pathname || '/').split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const safe = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = join(root, safe);

  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  if (!extname(candidate)) {
    const html = candidate + '.html';
    if (existsSync(html) && statSync(html).isFile()) return html;
  }

  return null;
}

createServer((req, res) => {
  if ((req.url || '').split('?')[0] === '/__gx_error' && req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; if (body.length > 16000) body = body.slice(0,16000); });
    req.on('end', () => {
      console.error('[GX_CLIENT_ERROR] ' + body);
      res.writeHead(204, { 'cache-control': 'no-store' });
      res.end();
    });
    return;
  }

  const file = resolvePath(req.url || '/');

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('GOXION preview · recurso no encontrado');
    return;
  }

  const extension = extname(file).toLowerCase();
  res.writeHead(200, {
    'content-type': mime[extension] || 'application/octet-stream',
    'cache-control': 'no-cache, no-store, must-revalidate',
  });

  if (extension === '.html') {
    const telemetry = `<script>
(function(){
  function send(kind,payload){
    try{
      navigator.sendBeacon('/__gx_error', JSON.stringify({
        kind:kind,
        path:location.pathname,
        payload:payload,
        ua:navigator.userAgent,
        at:new Date().toISOString()
      }));
    }catch(_){}
  }
  addEventListener('error',function(e){
    send('error',{message:e.message,source:e.filename,line:e.lineno,column:e.colno,stack:e.error&&e.error.stack});
  },true);
  addEventListener('unhandledrejection',function(e){
    var r=e.reason;
    send('unhandledrejection',{message:r&&r.message||String(r),stack:r&&r.stack||''});
  });
})();</script>`;
    const html = readFileSync(file, 'utf8').replace(/<head(\\s[^>]*)?>/i, match => match + telemetry);
    res.end(html);
    return;
  }

  createReadStream(file).pipe(res);
}).listen(port, host, () => {
  console.log(`GOXION modern-v2 preview activo en http://${host}:${port}`);
});
