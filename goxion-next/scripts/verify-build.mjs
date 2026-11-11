import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

const requiredPages = ['index.html', 'ayuda.html', 'admin.html'];
const forbiddenSourcePaths = [
  'vercel.json',
  'src/App.tsx',
  'src/main.tsx',
  'src/components/CatalogPrototype.tsx',
];

const failures = [];

if (!existsSync(dist)) {
  failures.push('No existe dist/. Ejecuta npm run build antes de verificar.');
}

for (const page of requiredPages) {
  const path = join(dist, page);
  if (!existsSync(path)) {
    failures.push('Falta dist/' + page);
    continue;
  }
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<script')) failures.push('dist/' + page + ' no contiene bundle JS.');
  if (!html.includes('GOXION')) failures.push('dist/' + page + ' perdió la identidad GOXION.');
}

for (const relative of forbiddenSourcePaths) {
  if (existsSync(join(root, relative))) {
    failures.push('Residuo no permitido: ' + relative);
  }
}

const assetsDir = join(dist, 'assets');
if (!existsSync(assetsDir)) {
  failures.push('Falta dist/assets/.');
} else {
  const assets = readdirSync(assetsDir).filter((name) => {
    const path = join(assetsDir, name);
    return statSync(path).isFile();
  });
  if (!assets.some((name) => /\.js$/i.test(name))) {
    failures.push('No se generó ningún bundle JavaScript.');
  }
  if (!assets.some((name) => /\.css$/i.test(name))) {
    failures.push('No se generó ningún bundle CSS.');
  }
}

if (failures.length) {
  console.error('\nGOXION Next · verificación fallida\n');
  for (const failure of failures) console.error('• ' + failure);
  process.exit(1);
}

console.log('GOXION Next · verificación OK');
console.log('✓ index.html');
console.log('✓ ayuda.html');
console.log('✓ admin.html');
console.log('✓ bundles JS/CSS');
console.log('✓ sin residuos de preview/prototipo');
