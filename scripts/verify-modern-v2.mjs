import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const PAGES = ['ayuda', 'index', 'admin'];
const failures = [];

function originalFile(name) {
  try {
    return execFileSync('git', ['show', 'origin/main:' + name], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    failures.push('No se pudo leer main:' + name + '.');
    return '';
  }
}

function styleBlocks(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1].trim());
}

function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1] || ''));
}

function slugify(value, fallback) {
  return (value || fallback)
    .replace(/^goxion-?/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function cssBlocksFromExtracted(css) {
  const blocks = [];
  const regex = /\/\* ===== .*?style block \d+ ===== \*\/\n([\s\S]*?)(?=\n\n\/\* =====|$)/g;
  let match;
  while ((match = regex.exec(css))) blocks.push(match[1].trim());
  return blocks;
}

function normalizeScriptAttrs(attrs) {
  return String(attrs || '')
    .replace(/\s+src\s*=\s*(["'])[^"']+\1/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function officialSkeleton(html) {
  let styleIndex = 0;
  let output = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, () => {
    styleIndex += 1;
    return styleIndex === 1 ? '<link data-gx-extracted-css>' : '';
  });

  output = output.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs) => {
      if (/\bsrc\s*=/.test(attrs || '')) return full;
      const clean = normalizeScriptAttrs(attrs);
      return '<script' + (clean ? ' ' + clean : '') + ' data-gx-extracted></script>';
    },
  );

  return output.trim();
}

function modernSkeleton(html, page) {
  let output = html.replace(
    new RegExp(
      '<link\\s+rel=["\\\']stylesheet["\\\']\\s+href=["\\\']\\./assets/css/' +
        page +
        '\\.css["\\\']\\s*/?>',
      'i',
    ),
    '<link data-gx-extracted-css>',
  );

  output = output.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs) => {
      const srcMatch = String(attrs || '').match(/\bsrc\s*=\s*(["'])([^"']+)\1/i);
      if (!srcMatch || !srcMatch[2].startsWith('./assets/js/' + page + '/')) {
        return full;
      }
      const clean = normalizeScriptAttrs(attrs);
      return '<script' + (clean ? ' ' + clean : '') + ' data-gx-extracted></script>';
    },
  );

  return output.trim();
}

for (const page of PAGES) {
  const htmlPath = join(ROOT, page + '.html');
  const cssPath = join(ROOT, 'assets', 'css', page + '.css');

  if (!existsSync(htmlPath)) {
    failures.push('Falta ' + page + '.html');
    continue;
  }
  if (!existsSync(cssPath)) {
    failures.push('Falta assets/css/' + page + '.css');
    continue;
  }

  const official = originalFile(page + '.html');
  const modern = readFileSync(htmlPath, 'utf8');
  const officialStyles = styleBlocks(official);
  const extractedStyles = cssBlocksFromExtracted(readFileSync(cssPath, 'utf8'));

  if (
    officialStyles.length !== extractedStyles.length ||
    !officialStyles.every((block, index) => block === extractedStyles[index])
  ) {
    failures.push(page + ': el CSS extraído dejó de coincidir 1:1 con main.');
  }

  const scripts = inlineScripts(official);
  scripts.forEach((match, index) => {
    const attrs = match[1] || '';
    const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || '';
    const isModule = /\btype=["']module["']/i.test(attrs);
    const ext = isModule ? 'mjs' : 'js';
    const ordinal = String(index + 1).padStart(2, '0');
    const base = slugify(id, ordinal + '-inline');
    const relative = join('assets', 'js', page, ordinal + '-' + base + '.' + ext);
    const absolute = join(ROOT, relative);

    if (!existsSync(absolute)) {
      failures.push(page + ': falta ' + relative);
      return;
    }

    const extracted = readFileSync(absolute, 'utf8').trim();
    if (extracted !== match[2].trim()) {
      failures.push(page + ': ' + relative + ' ya no coincide con su script original.');
    }

    if (isModule) {
      const relativeImports = [
        ...extracted.matchAll(/(?:import|export)\s+(?:[^'"]*?from\s*)?['"]([^'"]+)['"]/g),
      ]
        .map((item) => item[1])
        .filter((specifier) => specifier.startsWith('./') || specifier.startsWith('../'));

      if (relativeImports.length) {
        failures.push(
          page +
            ': ' +
            relative +
            ' tiene imports relativos que cambiarían de resolución al externalizarse.',
        );
      }
    }

    const syntax = spawnSync(process.execPath, ['--check', absolute], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (syntax.status !== 0) {
      failures.push(page + ': error de sintaxis en ' + relative + ': ' + syntax.stderr.trim());
    }
  });

  if (officialSkeleton(official) !== modernSkeleton(modern, page)) {
    failures.push(page + ': el DOM/orden fuera de CSS/JS ya no coincide con main.');
  }

  if (/<style\b/i.test(modern)) {
    failures.push(page + ': quedaron estilos inline.');
  }

  const remainingInline = inlineScripts(modern);
  if (remainingInline.length) {
    failures.push(page + ': quedaron ' + remainingInline.length + ' scripts inline.');
  }
}

if (failures.length) {
  console.error('\nGOXION modern-v2 · verificación fallida\n');
  failures.forEach((failure) => console.error('• ' + failure));
  process.exit(1);
}

console.log('GOXION modern-v2 · integridad OK');
console.log('✓ DOM visible preservado frente a main');
console.log('✓ CSS extraído 1:1');
console.log('✓ JavaScript extraído 1:1');
console.log('✓ orden de scripts preservado');
console.log('✓ sintaxis JavaScript válida');
