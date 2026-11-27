/* K2 pilot scope: existing mirror only. No network/cache interception. */
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{
  let p={};try{p=e.data?.json()||{}}catch{}
  const test=p.title==="GOXION · Aviso de prueba";
  const title=test?"GOXION · Aviso de prueba":"GOXION · Tienes un aviso";
  const body=test?"Tu dispositivo está listo para recibir avisos.":"Abre Mi Espacio para consultar la información.";
  const tag=typeof p.tag==="string"&&/^gx-push-[a-f0-9-]{36}$/.test(p.tag)?p.tag:"gx-push-notice";
  e.waitUntil(self.registration.showNotification(title,{body,tag,icon:new URL("./Logo individual.png",self.location.href).href}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=new URL("./ayuda-espejo-feed-v2.html?push=1",self.location.href);
  e.waitUntil((async()=>{
    const tabs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const client=tabs.find(c=>{const u=new URL(c.url);return u.origin===target.origin&&u.pathname===target.pathname});
    if(client){await client.navigate(target.href);await client.focus();return;}
    await self.clients.openWindow(target.href);
  })());
});
