import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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
  const file = resolvePath(req.url || '/');

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('GOXION preview · recurso no encontrado');
    return;
  }

  res.writeHead(200, {
    'content-type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': extname(file) === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
  });

  createReadStream(file).pipe(res);
}).listen(port, host, () => {
  console.log(`GOXION modern-v2 preview activo en http://${host}:${port}`);
});
