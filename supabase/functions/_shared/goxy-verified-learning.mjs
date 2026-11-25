// GOXION · QA verified knowledge adapter. Not imported by any live Edge function.
// No answer generation, no write, no network on its own. A reviewed route points to a canonical guide.
export const KNOWLEDGE_REVISION='a66e4922e1c4783366f2e035540508cef77505cb';
export function normalizeAlias(text){
 if(typeof text!=='string'||text.length>120||/[\d@<>:/\\]|https?|www\.|\b(?:pin|contrase(?:ñ|n)a|password|token|correo|cuenta bancaria|clabe|tel[eé]fono|domicilio)\s*(?:es|seria|tengo|escribe|copia)\b/iu.test(text))return null;
 const key=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[¿?¡!.,;]+/g,' ').replace(/\s+/g,' ').trim();
 return /^[a-z]+(?: [a-z]+)*$/.test(key)&&key.length>=8&&key.length<=80?key:null;
}
export async function resolveVerifiedGuide({message,platform,canonicalMatch,knowledge,lookup,revision=KNOWLEDGE_REVISION}){
 // Canonical matching and identity/legal/financial flows take precedence.
 if(canonicalMatch!==null||typeof platform!=='string'||!Object.hasOwn(knowledge?.guides||{},platform)||typeof lookup!=='function'||revision!==KNOWLEDGE_REVISION)return null;
 const alias=normalizeAlias(message);if(!alias)return null;
 try{
  const result=await lookup({p_platform:platform,p_alias:alias,p_revision:revision});
  if(result?.ok!==true||result.platform!==platform||result.source_revision!==revision||!Number.isInteger(result.guide_id))return null;
  const guide=knowledge.guides[platform].find(x=>x.id===result.guide_id);
  if(!guide||typeof guide.instructions!=='string'||typeof guide.requires_human!=='boolean')return null;
  return {guide,platform,source:'verified_route',revision};
 }catch{return null;}
}
