/* GOXION · Simulador de interacciones, exclusivo de preview. No produce escrituras ni solicitudes. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const lab=window.GOXION_GIXY_LAB;
  if(!lab)return;
  const scene=(name)=>'.scene[data-scene="'+name+'"] canvas.gixy';
  const resetButton=(name,show)=>{$(name+"-reset").hidden=!show;};
  const burst=(el)=>{el.classList.remove("is-beating");void el.offsetWidth;el.classList.add("is-beating");};
  let missionCompleted=false,loyaltyAdvanced=false,notificationStep=0;
  $("mission-btn").addEventListener("click",()=>{
    if(missionCompleted)return;
    missionCompleted=true;
    $("mission-count").textContent="3 de 3";
    $("mission-progress").setAttribute("aria-valuenow","3");
    $("mission-fill").style.width="100%";
    $("mission-result").classList.add("is-complete");
    $("mission-result").lastChild.textContent="¡Todas las misiones completadas!";
    $("mission-btn").classList.add("is-complete");
    $("mission-btn").disabled=true;
    $("mission-action-text").textContent="Misión de prueba completada";
    resetButton("mission",true);
    lab.celebrate(scene("mission"));
  });
  $("mission-reset").addEventListener("click",()=>{
    missionCompleted=false;
    $("mission-count").textContent="2 de 3";
    $("mission-progress").setAttribute("aria-valuenow","2");
    $("mission-fill").style.width="66.666%";
    $("mission-result").classList.remove("is-complete");
    $("mission-result").lastChild.textContent="Una misión por completar";
    $("mission-btn").classList.remove("is-complete");
    $("mission-btn").disabled=false;
    $("mission-action-text").textContent="Completar misión de prueba";
    resetButton("mission",false);
  });
  $("loyalty-btn").addEventListener("click",()=>{
    if(loyaltyAdvanced)return;
    loyaltyAdvanced=true;
    $("loyalty-count").textContent="4/4 pagos puntuales";
    $("loyalty-state").textContent="Nivel 1 alcanzado · simulación";
    $("loyalty-progress").setAttribute("aria-valuenow","4");
    $("loyalty-fill").style.width="100%";
    burst($("loyalty-heart"));
    $("loyalty-btn").classList.add("is-complete");
    $("loyalty-btn").disabled=true;
    $("loyalty-action-text").textContent="Avance de prueba completado";
    resetButton("loyalty",true);
    lab.celebrate(scene("loyalty"));
  });
  $("loyalty-reset").addEventListener("click",()=>{
    loyaltyAdvanced=false;
    $("loyalty-count").textContent="3/4 pagos puntuales";
    $("loyalty-state").textContent="A un pago del nivel 1";
    $("loyalty-progress").setAttribute("aria-valuenow","3");
    $("loyalty-fill").style.width="75%";
    $("loyalty-heart").classList.remove("is-beating");
    $("loyalty-btn").classList.remove("is-complete");
    $("loyalty-btn").disabled=false;
    $("loyalty-action-text").textContent="Simular avance de lealtad";
    resetButton("loyalty",false);
  });
  const bell=$("bell-btn"),toast=$("notification-toast");
  // El botón existe solo en esta beta; en GOXION real lo sustituye el evento de la campana.
  const hideToast=()=>{toast.hidden=true;};
  function renderNotification(){
    const pending=notificationStep===1;
    bell.classList.toggle("has-news",pending);
    bell.setAttribute("aria-expanded",String(pending));
    $("notification-state").textContent=pending?"1 aviso sin leer":notificationStep===2?"Aviso leído":"Todo al día";
    $("notification-subtitle").textContent=pending?"Tu nueva notificación está lista.":notificationStep===2?"Todo está actualizado.":"Prueba un aviso nuevo y su lectura.";
    $("notification-action-text").textContent=pending?"Marcar aviso como leído":notificationStep===2?"Aviso de prueba atendido":"Probar llegada de un aviso";
    $("notification-btn").classList.toggle("is-complete",notificationStep===2);
    $("notification-btn").disabled=notificationStep===2;
    resetButton("notification",notificationStep!==0);
  }
  function notify(){
    if(notificationStep===0){
      notificationStep=1;
      toast.hidden=false;
      bell.classList.remove("is-ringing");
      void bell.offsetWidth;
      bell.classList.add("is-ringing");
      lab.setState("working",scene("notification"));
      lab.celebrate(scene("notification"));
    }else if(notificationStep===1){
      notificationStep=2;
      hideToast();
      lab.setState("idle",scene("notification"));
      lab.celebrate(scene("notification"));
    }
    renderNotification();
  }
  $("notification-btn").addEventListener("click",notify);
  bell.addEventListener("click",notify);
  $("toast-dismiss").addEventListener("click",hideToast);
  bell.addEventListener("animationend",()=>bell.classList.remove("is-ringing"));
  $("notification-reset").addEventListener("click",()=>{
    notificationStep=0;hideToast();bell.classList.remove("is-ringing");
    lab.setState("idle",scene("notification"));renderNotification();
  });
  document.querySelectorAll(".state-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      for(const other of document.querySelectorAll(".state-btn")){
        const selected=other===btn;
        other.classList.toggle("is-selected",selected);
        other.setAttribute("aria-pressed",String(selected));
      }
      lab.setState(btn.dataset.state,".roster .gixy");
    });
  });
})();