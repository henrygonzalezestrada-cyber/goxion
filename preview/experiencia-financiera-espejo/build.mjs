/* E1/B2 mirror: inherit the approved E1/B1 Ayuda DOM generated directly
 * from ayuda.html, and add only a mock read-only account route.
 * No backend calls, live accounts, Index runtime, payment credentials.
 */
import fs from 'node:fs';
const origin='preview/experiencia-mi-espacio-inteligente/index.html';
let html=fs.readFileSync(origin,'utf8');
if(!html.includes('data-gx-smart-beta="true"')||!html.includes('id="dash-billing-card"')
 ||!html.includes('mission-mirror.js?v=e1b1v6'))throw Error('Espejo de Ayuda no coincide con E1/B1 V6 aprobada');
html=html.replace('data-gx-smart-beta="true"','data-gx-smart-beta="true" data-gx-b2-preview="true"')
 .replace('GOXION · Mi Espacio · Espejo E1/B1','GOXION · Mi Espacio · Espejo E1/B2')
 .replace(/(href|src)="\.\/(priority-engine\.js|smart-demo\.js|notice-demo\.js|mission-mirror\.js|smart\.css)(\?v=[^"]+)?"/g,
  (_,prop,file,version)=>prop+'="../experiencia-mi-espacio-inteligente/'+file+(version||'')+'"')
 .replace('</head>','<link rel="stylesheet" href="./ayuda-b2.css?v=e1b2v2">\n</head>')
 .replace('</body></html>',
 '<script src="./fixtures.js?v=e1b2v2" defer></script>\n'+
 '<script src="./ayuda-b2.js?v=e1b2v2" defer></script>\n</body></html>');
html=html.replace('Solo se reproduce con eventos importantes simulados. Sin iniciar sesión ni efectuar cobros.',
 'Prueba el estado de cuenta tocando la cápsula principal. Datos ficticios, sin cobros ni cargas reales.');
if(!html.includes('src="./ayuda-b2.js?v=e1b2v2"')||html.includes('src="./smart-demo.js"'))
 throw Error('Enlace de recursos para espejo B2 inválido');
fs.mkdirSync('preview/experiencia-financiera-espejo',{recursive:true});
fs.writeFileSync('preview/experiencia-financiera-espejo/index.html',html);
console.log('E1/B2 espejo de Ayuda desde B1:',html.length,'bytes');
