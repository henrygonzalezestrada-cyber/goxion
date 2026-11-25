/* GOXION · Visión, fase de aceptación. No almacenamiento ni URLs remotas.
 * El servicio de imágenes sólo se consulta en el proyecto QA, nunca en producción.
 */
(()=>{
 'use strict';
 const endpoint=()=>window.GOXION_CORE?.endpoint?.('goxy-vision-qa');
 const isQA=()=>location.pathname.endsWith('/ayuda-aceptacion-v2.html');
 const token=()=>{try{return localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||'')||''}catch{return ''}};
 const maxBytes=750000, maxSide=1440;
 async function prepare(file){
   if(!file||!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)||file.size<=0||file.size>12*1024*1024)throw Error('Elige una imagen de hasta 12 MB.');
   const url=URL.createObjectURL(file);
   try{
     const img=new Image();img.src=url;await img.decode();
     if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>48000000)throw Error('La imagen es demasiado grande.');
     const canvas=document.createElement('canvas');
     const factor=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
     canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
     const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('No puedo preparar la imagen.');
     ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
     let quality=.86,data=canvas.toDataURL('image/jpeg',quality);
     while(data.length>Math.floor(maxBytes*4/3)&&quality>.39){quality-=.1;data=canvas.toDataURL('image/jpeg',quality);}
     canvas.width=canvas.height=1;
     if(!/^data:image\/jpeg;base64,/.test(data)||data.length>Math.floor(maxBytes*4/3))throw Error('No pude reducir la imagen. Prueba con una captura más pequeña.');
     return {data};
   }finally{URL.revokeObjectURL(url)}
 }
 async function send(payload,signal){
   if(!isQA()||!window.GOXION_QA_ISOLATED)return {ok:false,code:'VISION_QA_ONLY'};
   const url=endpoint();if(!url||!url.endsWith('/goxy-vision-qa'))return {ok:false,code:'ENVIRONMENT_MISMATCH'};
   const auth=token();if(!auth)return {ok:false,code:'SESSION_INVALID'};
   try{
     const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Client-Token':auth},body:JSON.stringify(payload),signal,cache:'no-store'});
     const data=await r.json().catch(()=>({ok:false,code:'INVALID_RESPONSE'}));
     if(auth!==token())return {ok:false,code:'SESSION_INVALID'};
     return {...data,ok:r.ok&&data.ok===true};
   }catch(e){return {ok:false,code:e?.name==='AbortError'?'ABORTED':'VISION_UNAVAILABLE'}}
 }
 const status=signal=>send({mode:'status'},signal);
 const analyze=(image,message,signal)=>send({mode:'analyze',image,message:String(message||'').trim(),consent:true},signal);
 const example=signal=>send({mode:'example',consent:true},signal);
 window.GOXY_VISION=Object.freeze({prepare,status,analyze,example,isQA});
})();