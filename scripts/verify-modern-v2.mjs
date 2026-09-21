import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const PAGES = ['ayuda', 'index', 'admin'];
const failures = [];
const manifest = JSON.parse(readFileSync(join(ROOT, 'modernization-manifest.json'), 'utf8'));
const MODERNIZED_SCRIPTS = new Set(manifest.modernizedScripts || []);
const ADDED_SCRIPTS = new Set(manifest.addedScripts || []);

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

function cssBlocksFromExtracted(css, page) {
  const blocks = [];
  const markerPrefix = '/* ===== ' + page + '.html · style block ';
  const markerRegex = /\/\* ===== ([a-z]+\.html) · style block (\d+) ===== \*\//g;
  const markers = [];
  let marker;
  while ((marker = markerRegex.exec(css))) {
    if (marker[1] === page + '.html') {
      markers.push({ start: marker.index, bodyStart: markerRegex.lastIndex });
    }
  }
  for (let index = 0; index < markers.length; index += 1) {
    const bodyStart = markers[index].bodyStart;
    const bodyEnd = index + 1 < markers.length ? markers[index + 1].start : css.length;
    blocks.push(css.slice(bodyStart, bodyEnd).trim());
  }
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function modernSkeleton(html, page) {
  let output = html;

  for (const relative of ADDED_SCRIPTS) {
    const src = './' + relative;
    const pattern = new RegExp(
      '<script\\b[^>]*\\bsrc=["\\\']' +
        escapeRegExp(src) +
        '["\\\'][^>]*><\\/script>\\s*',
      'gi',
    );
    output = output.replace(pattern, '');
  }

  output = output.replace(
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
  const extractedStyles = cssBlocksFromExtracted(readFileSync(cssPath, 'utf8'), page);

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
    if (!MODERNIZED_SCRIPTS.has(relative) && extracted !== match[2].trim()) {
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

const ayudaModern = readFileSync(join(ROOT, 'ayuda.html'), 'utf8');
if (!ayudaModern.includes('<script type="module" src="./assets/js/core/motion-engine.mjs"></script>')) {
  failures.push('ayuda: motion-engine no está cargado.');
}

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    if (statSync(absolute).isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

for (const area of ['ayuda', 'index', 'admin']) {
  const root = join(ROOT, 'assets', 'js', area);
  for (const absolute of walkFiles(root)) {
    if (!/\.(?:js|mjs)$/i.test(absolute)) continue;
    const source = readFileSync(absolute, 'utf8');
    const relative = absolute.slice(ROOT.length + 1).replace(/\\/g, '/');

    if (source.includes('hmpevcwodcgbkviarfic.supabase.co')) {
      failures.push(relative + ': volvió a hardcodear el origen de Supabase.');
    }

    if (
      MODERNIZED_SCRIPTS.has(relative) &&
      (source.includes('"goxion_client_token"') ||
        source.includes("'goxion_client_token'") ||
        source.includes('"GOXION_ADMIN_TOKEN"') ||
        source.includes("'GOXION_ADMIN_TOKEN'"))
    ) {
      failures.push(relative + ': volvió a hardcodear una clave de sesión.');
    }
  }
}

for (const relative of [...MODERNIZED_SCRIPTS, ...ADDED_SCRIPTS]) {
  if (!existsSync(join(ROOT, relative))) {
    failures.push('Manifest: falta ' + relative);
  }
}

// Gamificación compartida: trofeo, check y demás watermarks deben seguir
// exactamente el mismo flujo. El clon visual no puede conservar data-watermark,
// porque Safari puede rasterizar ese pseudo-elemento como una segunda copia.
{
  const gamifPath = join(ROOT, 'assets', 'js', 'ayuda', '05-gamification-shared-morph-js.js');
  if (existsSync(gamifPath)) {
    const gamif = readFileSync(gamifPath, 'utf8');

    if (gamif.includes('gxShouldTravelSharedEmoji')) {
      failures.push('Gamificación: reapareció una rama especial por tipo de emoji.');
    }

    if (!gamif.includes("ghost.removeAttribute('data-watermark')")) {
      failures.push('Gamificación: el clon visual volvió a conservar data-watermark.');
    }

    const openShared = gamif.includes(
      "const floatingEmoji = targetEmoji ? gxCreateFloatingEmoji(sourceEmoji, targetEmoji) : null;"
    );
    const closeShared = gamif.includes(
      "floatingEmoji = gxCreateFloatingEmoji(panelEmoji, { ...sourceEmoji, text: panelEmoji.text });"
    );

    if (!openShared || !closeShared) {
      failures.push('Gamificación: el shared-element flow dejó de ser común en apertura/cierre.');
    }
  }
}

for (const page of PAGES) {
  const modern = readFileSync(join(ROOT, page + '.html'), 'utf8');
  const runtimeTag = '<script src="./assets/js/core/runtime.js"></script>';
  const runtimeAt = modern.indexOf(runtimeTag);
  const pageScriptAt = modern.indexOf('<script', runtimeAt + runtimeTag.length);
  if (runtimeAt < 0 || pageScriptAt < 0 || runtimeAt > pageScriptAt) {
    failures.push(page + ': runtime core no está cargado antes de los scripts de página.');
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
