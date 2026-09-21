(function(){
    var welcomeIds=['gx-welcome-name','gx-welcome-phone'];

    function syncWelcome(input){
        var shell=input && input.closest('.gx-welcome-float-shell');
        if(!shell)return;
        var hasValue=String(input.value||'').length>0;
        var focused=document.activeElement===input;
        shell.classList.toggle('is-float',hasValue||focused);
        shell.classList.toggle('is-focus',focused);
    }

    function syncAllWelcome(){
        welcomeIds.forEach(function(id){
            var input=document.getElementById(id);
            if(input)syncWelcome(input);
        });
    }
    window.gxSyncWelcomeFloatingLabels=syncAllWelcome;

    welcomeIds.forEach(function(id){
        var input=document.getElementById(id);
        if(!input)return;
        input.addEventListener('focus',function(){syncWelcome(input)});
        input.addEventListener('blur',function(){syncWelcome(input)});
        input.addEventListener('input',function(){syncWelcome(input)},{passive:true});
        input.addEventListener('change',function(){syncWelcome(input)},{passive:true});
        syncWelcome(input);
    });

    /* El formulario puede abrir después de varios segundos; Safari
       también puede completar datos después del primer frame. */
    requestAnimationFrame(syncAllWelcome);
    setTimeout(syncAllWelcome,180);
    setTimeout(syncAllWelcome,520);

    /* Sincronizamos al abrir la promoción, incluso si el navegador
       conservó valores de una sesión anterior. */
    var trigger=document.querySelector('.gx-welcome-trigger');
    trigger?.addEventListener('click',function(){
        requestAnimationFrame(function(){
            requestAnimationFrame(syncAllWelcome);
        });
    },{passive:true});

})();