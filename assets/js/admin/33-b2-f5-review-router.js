/* GOXION F5 · el botón de revisión conserva el Admin habitual
 * para fecha única, pero nunca intenta cobro global de una cuenta B2. */
(function(){
 "use strict";
 const original=window.gxOpenPaymentModal;
 if(typeof original!=="function")return;
 let checking=false;
 window.gxOpenPaymentModal=async function(key,...args){
  if(checking)return;
  const client=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
  const clientId=String(client?._id||client?.id||"");
  const core=window.GOXION_CORE;
  const token=localStorage.getItem(core?.STORAGE?.ADMIN_TOKEN||"")||"";
  if(!/^[0-9a-f-]{36}$/i.test(clientId)||!token)return original.call(this,key,...args);
  const memory="goxion_f5_admin_regimen:"+clientId;
  checking=true;
  try{
   const response=await fetch(core.endpoint("acciones-financieras-b2-beta"),{
    method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json","X-Admin-Token":token},
    body:JSON.stringify({accion:"b2_listar_comprobantes",datos:{cliente_id:clientId}})
   });
   const result=await response.json().catch(()=>({}));
   if(response.ok&&result.ok===true&&result.modo==="b2_multifecha"){
    sessionStorage.setItem(memory,"b2");
    const link=new URL("./preview/integracion-b2/admin.html",location.href);
    link.searchParams.set("cliente",String(key));
    link.searchParams.set("f3","1");
    location.href=link.toString();
    return;
   }
   if(response.ok&&result.ok===true&&result.modo==="global"){
    sessionStorage.setItem(memory,"global");
    return original.call(this,key,...args);
   }
   if(sessionStorage.getItem(memory)!=="b2")return original.call(this,key,...args);
   alert("La cuenta B2 requiere validar su régimen de cobro.");
  }catch(err){
   console.warn("F5 Admin: régimen de cobro no verificado",String(err).slice(0,120));
   if(sessionStorage.getItem(memory)!=="b2")return original.call(this,key,...args);
   alert("No se pudo validar el saldo B2 del cliente. Inténtalo de nuevo.");
  }finally{checking=false;}
 };
})();