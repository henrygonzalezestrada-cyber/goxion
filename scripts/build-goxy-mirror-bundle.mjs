/* Derivación aislada del MISMO renderer publicado robot-heads@0.3.0.
 * Conserva la fuente canónica oficial intacta. Una sola carga del motor en
 * espejo. Sólo el retrato de Novedades opta a actualización de material viva.
 * El efecto del motor usa material H.current, que ya se actualiza al render.
 * Mantener el bucle estable al cambiar exclusivamente e (color); si está
 * pausado, se conserva el redraw inmediato. Fallar ante cambio de upstream.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {strict as assert} from "node:assert";
const source="preview/goxion-ai/goxy-heads.bundle.js";
const target="preview/mi-espacio-v2/goxy-heads-mirror.bundle.js";
let s=readFileSync(source,"utf8");
function exact(before,after){
 assert.equal(s.split(before).length,2,"adaptación única del renderer: "+before);
 s=s.replace(before,after);
}
exact("[O,u,T,z,e,n,i,d,g]","[O,u,T,z,(O||o[\"data-gx-live-shell\"]!==\"true\")?e:null,n,i,d,g]");
exact("state:$v(c),color:gc,trimColor:Iv","state:$v(c),\"data-gx-live-shell\":l.classList.contains(\"gx-launch-goxy-render\")?\"true\":void 0,color:gc,trimColor:Iv");
if(process.argv.includes("--check"))assert.equal(readFileSync(target,"utf8"),s,"bundle espejo derivado de la fuente canónica");
else writeFileSync(target,s);
console.log("Goxy espejo: material vivo sin reiniciar bucle; renderer oficial y demás montajes intactos.");
