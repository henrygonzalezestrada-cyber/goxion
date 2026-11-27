import {chromium} from "playwright";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../assets/js/ayuda/23-push-qa.js",import.meta.url),"utf8");
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:["--no-sandbox"]});
try{
  for(const mode of ["iphone-web","iphone-installed","desktop","guest","denied"]){
    const context=await browser.newContext({viewport:{width:375,height:812},userAgent:mode.startsWith("iphone")?"Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1":"Mock Chromium"});
    await context.addInitScript(({mode})=>{
      window.GOXION_QA_ISOLATED=true;
      window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:"qa-token"}};
      if(mode!=="guest")localStorage.setItem("qa-token","fixture-session");
      window.PushManager=function(){};
      window.Notification={permission:mode==="denied"?"denied":"default"};
      Object.defineProperty(navigator,"standalone",{value:mode==="iphone-installed"});
      let subscribed=false;
      const subscription={toJSON:()=>({endpoint:"https://fcm.googleapis.com/mock/test",keys:{p256dh:"fake",auth:"fake"}}),unsubscribe:async()=>{subscribed=false;return true}};
      const reg={pushManager:{getSubscription:async()=>subscribed?subscription:null,subscribe:()=>{window._gesture=true;subscribed=true;return Promise.resolve(subscription)}}};
      Object.defineProperty(navigator,"serviceWorker",{value:{register:async()=>reg,ready:Promise.resolve(reg),getRegistration:async()=>reg}});
    },{mode});
    const page=await context.newPage();const errors=[],actions=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("https://qa.invalid/ayuda-aceptacion-v2.html",route=>route.fulfill({contentType:"text/html",body:'<button id="gx-client-notif-launch">Notificaciones</button><section><div id="gx-client-notif-list"></div></section><script>'+source+'</script>'}));
    await page.route("https://nsvybyvvdpdgbgtvydfb.supabase.co/functions/v1/push-cliente-qa",async route=>{
      const a=JSON.parse(route.request().postData()).accion;actions.push(a);
      const bodies={config:{publicKey:"BA"},activar:{deviceId:"12345678-abcd-4321-abcd-123456789012"},estado:{active:true},probar:{accepted:true},desactivar:{}};
      await route.fulfill({json:{ok:true,...bodies[a]}});
    });
    await page.goto("https://qa.invalid/ayuda-aceptacion-v2.html");
    const panel=page.locator(".gx-push-qa");
    await panel.waitFor({state:"attached"});
    if(mode==="guest"){assert.equal(await panel.isVisible(),false);assert.equal(actions.length,0)}
    else if(mode==="iphone-web"){
      await panel.getByRole("button",{name:"Cómo activar"}).click();
      assert(await panel.getByText("Elige Agregar a pantalla de inicio",{exact:false}).isVisible());
      assert.equal(actions.length,0);
    }else if(mode==="denied"){
      assert(await panel.getByText("Los avisos están bloqueados",{exact:false}).isVisible());
      assert.equal(await panel.getByRole("button",{name:"Activar avisos"}).isVisible(),false);
    }else{
      await panel.getByRole("button",{name:"Activar avisos"}).click();
      await panel.getByRole("button",{name:"Enviar prueba"}).click();
      await panel.getByText("El proveedor aceptó",{exact:false}).waitFor();
      assert(await page.evaluate(()=>window._gesture));
      if(mode==="desktop"){
        await panel.getByRole("button",{name:"Desactivar"}).click();
        await panel.getByText("Avisos desactivados.",{exact:true}).waitFor();
      }else{
        await page.evaluate(()=>{window.dispatchEvent(new Event("goxion:client-logout"));localStorage.removeItem("qa-token")});
        await page.waitForFunction(()=>!localStorage.getItem("goxion_push_qa_device"));
      }
      assert(actions.includes("activar")&&actions.includes("probar")&&actions.includes("desactivar"));
    }
    assert.deepEqual(errors,[]);console.log("PASS",mode);
    await context.close();
  }
}finally{await browser.close()}
