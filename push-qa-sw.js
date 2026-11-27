/* Isolated scope: ayuda-aceptacion-v2.html only. No fetch handler, no cache. */
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{
  let p={};try{p=e.data?.json()||{}}catch{}
  const title=typeof p.title==="string"?p.title.slice(0,80):"GOXION · Prueba";
  const body=typeof p.body==="string"?p.body.slice(0,160):"Consulta Mi Espacio.";
  const tag=typeof p.tag==="string"&&/^gx-qa-[a-f0-9-]{36}$/.test(p.tag)?p.tag:"gx-qa-notice";
  e.waitUntil(self.registration.showNotification(title,{body,tag,icon:new URL("./Logo individual.png",self.location.href).href}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=new URL("./ayuda-aceptacion-v2.html?push=1",self.location.href);
  e.waitUntil((async()=>{
    const tabs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const client=tabs.find(c=>{const u=new URL(c.url);return u.origin===target.origin&&u.pathname===target.pathname});
    if(client){await client.navigate(target.href);await client.focus();return;}
    await self.clients.openWindow(target.href);
  })());
});
