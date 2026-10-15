/* GOXION · Goxy F6 · adaptador de solo lectura.
 * Fuente única: assets/js/ayuda/data/support-issues.js, ya cargada por ayuda.html.
 * No almacena credenciales, no consulta servicios privados y no genera tickets.
 */
(() => {
  'use strict';
  const aliases = Object.freeze({
    'Netflix': ['netflix','net flix'],
    'Disney+': ['disney','disney+','disney plus'],
    'Max': ['hbo','hbo max','max'],
    'Prime Video': ['prime','amazon prime','prime video'],
    'YouTube': ['youtube','you tube'],
    'ViX': ['vix','vix premium'],
    'Crunchyroll': ['crunchyroll','crunchy'],
    'Microsoft': ['microsoft','office 365','microsoft 365'],
    'Google One': ['google one','google 1','almacenamiento google']
  });
  const normalize = input => String(input||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9+]+/g,' ').trim();
  function data() {
    const catalog = window.GOXION_DATA?.supportIssues;
    return catalog && typeof catalog === 'object' ? catalog : {};
  }
  function platforms() {
    return Object.keys(data()).filter(k => k !== 'Default' && Array.isArray(data()[k]));
  }
  function resolvePlatform(text) {
    const clean = ' ' + normalize(text) + ' ';
    const list = platforms();
    for (const [brand, variants] of Object.entries(aliases)) {
      if (!list.includes(brand)) continue;
      if (variants.some(alias => clean.includes(' '+normalize(alias)+' '))) return brand;
    }
    return list.find(k => clean.includes(' '+normalize(k)+' ')) || null;
  }
  // Detecta varios servicios dentro de un combo, sin mirar credenciales.
  function resolveAllPlatforms(text) {
    const normalized = ' ' + normalize(text) + ' ';
    return platforms().filter(brand => {
      const variants = [...(aliases[brand] || []),brand];
      return variants.some(alias => normalized.includes(' ' + normalize(alias) + ' '));
    });
  }
  function issues(brand) {
    return platforms().includes(brand) ? data()[brand] : [];
  }
  function guide(brand, index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0) return null;
    const row = issues(brand)[i];
    if (!row || typeof row.issue !== 'string' || typeof row.instructions !== 'string') return null;
    // Solo texto: las etiquetas HTML de la base original no pasan al chat.
    const steps = row.instructions
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/(?:p|div|li)>/gi,'\n')
      .replace(/<[^>]+>/g,'')
      .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
      .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
      .trim();
    return Object.freeze({
      platform: brand, issue: row.issue.trim(), instructions: steps,
      requiresHuman: Boolean(row.labelInput?.trim() || row.templateWA?.trim())
    });
  }
  function matchIssue(brand, query) {
    const clean = normalize(query);
    if (!clean) return null;
    const candidates = issues(brand);
    if (!candidates.length) return null;
    const hints = ['codigo','verificacion','hogar','pantallas','pantalla','dispositivo','registrar','vincular','contrasena','invitacion','espacio','almacenamiento','sesion'];
    const tokens = clean.split(' ').filter(x=>x.length>=4);
    const distinctive = tokens.filter(t=>hints.some(h=>t.startsWith(h.slice(0,5))));
    if (!distinctive.length) return null;
    const scored = candidates.map((item,index)=>{
      const hay = normalize(item.issue);
      const n = distinctive.filter(t=>hay.includes(t.slice(0,5))).length;
      return {index,score:n};
    }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
    if (scored.length!==1 && scored[0]?.score===scored[1]?.score) return null;
    return scored[0]?.index ?? null;
  }
  window.GOXY_SUPPORT = Object.freeze({platforms,resolvePlatform,resolveAllPlatforms,issues,guide,matchIssue,normalize});
})();