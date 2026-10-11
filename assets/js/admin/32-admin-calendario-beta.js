// GOXION Admin · Agenda financiera beta, alojada en la sección existente Servicios.
// No envía pagos, no reemplaza gxOpenClientFocus/gxFocusSection, no duplica estado.
(()=>{
  "use strict";
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const focus=()=>document.getElementById("gx-client-focus");
  const currentClient=()=>{
    const key=focus()?.dataset.gxClientKey||"";
    const c=typeof clientesDict!=="undefined"?clientesDict?.[key]:null;
    const id=String(c?._id||c?.id||"");
    return UUID.test(id)?{id,nombre:String(c?.nombre||"Cliente")}:null;
  };
  let dialog=null,frame=null;
  function close(){
    if(dialog?.open)dialog.close();
  }
  function openCalendar(){
    const client=currentClient();
    if(!client)return;
    if(!dialog){
      dialog=document.createElement("dialog");
      dialog.className="gx-calendar-dialog";
      dialog.id="gx-calendar-dialog";
      dialog.setAttribute("aria-label","Fechas de renovación de cliente");
      dialog.innerHTML='<div class="gx-calendar-dialog-head"><div><small>CLIENTES / SERVICIOS</small><strong>Fechas de renovación</strong><span id="gx-calendar-client-name"></span></div><button type="button" class="gx-calendar-dialog-close" aria-label="Cerrar">×</button></div><div class="gx-calendar-dialog-content"></div>';
      document.body.appendChild(dialog);
      frame=document.createElement("iframe");
      frame.className="gx-calendar-frame";
      frame.title="Simulador financiero del cliente";
      frame.setAttribute("loading","eager");
      frame.setAttribute("referrerpolicy","same-origin");
      dialog.querySelector(".gx-calendar-dialog-content").appendChild(frame);
      dialog.querySelector(".gx-calendar-dialog-close").addEventListener("click",close);
      dialog.addEventListener("click",e=>{if(e.target===dialog)close()});
      dialog.addEventListener("close",()=>frame.removeAttribute("src"));
    }
    dialog.querySelector("#gx-calendar-client-name").textContent=client.nombre;
    const url=new URL("./preview/calendario-financiero/index.html",location.href);
    url.searchParams.set("embedded","1");
    url.searchParams.set("cliente",client.id);
    url.searchParams.set("v","20261011c"); // nueva vista compacta; evita caché en Safari
    frame.src=url.toString();
    if(!dialog.open)dialog.showModal();
  }
  function inject(){
    const root=focus();
    if(!root?.classList.contains("show"))return;
    const target=document.querySelector('#gx-focus-body [data-gx-section="services"] .gx-accordion-content');
    if(!target||target.querySelector("[data-gx-calendar-entry]"))return;
    if(!currentClient())return;
    const row=document.createElement("div");
    row.className="gx-calendar-entry";
    row.dataset.gxCalendarEntry="1";
    const content=document.createElement("div");
    content.className="gx-calendar-entry-copy";
    content.innerHTML="<strong>Fechas de renovación</strong><small>Cobros individuales, X2 y fechas conjuntas</small>";
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="gx-calendar-entry-action";
    btn.textContent="Simular ›";
    btn.addEventListener("click",openCalendar);
    row.append(content,btn);
    target.appendChild(row);
  }
  function setup(){
    const body=document.getElementById("gx-focus-body");
    if(!body)return;
    // El expediente ya se re-renderiza al actualizar servicios; observamos sin alterar wrappers.
    new MutationObserver(inject).observe(body,{childList:true});
    const sheet=focus();
    if(sheet)new MutationObserver(inject).observe(sheet,{attributes:true,attributeFilter:["class","data-gx-client-key"]});
    inject();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();
