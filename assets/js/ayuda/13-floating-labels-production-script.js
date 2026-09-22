(function(){
    var ids=[
        'login-id',
        'login-pin',
        'gx-activation-id',
        'gx-activation-pin',
        'gx-activation-pin-confirm'
    ];

    function sync(input){
        var shell=input && input.closest('.gx-float-shell');
        if(!shell)return;
        var hasValue=String(input.value||'').length>0;
        var focused=document.activeElement===input;
        shell.classList.toggle('is-float',hasValue||focused);
        shell.classList.toggle('is-focus',focused);
    }

    function syncAll(){
        ids.forEach(function(id){
            var input=document.getElementById(id);
            if(input)sync(input);
        });
    }
    window.gxSyncFloatingLabels=syncAll;

    ids.forEach(function(id){
        var input=document.getElementById(id);
        if(!input)return;
        input.addEventListener('focus',function(){sync(input)});
        input.addEventListener('blur',function(){sync(input)});
        input.addEventListener('input',function(){sync(input)},{passive:true});
        input.addEventListener('change',function(){sync(input)},{passive:true});
        sync(input);
    });

    /* Autofill de Safari puede asentarse después del primer layout. */
    requestAnimationFrame(syncAll);
    setTimeout(syncAll,180);
    setTimeout(syncAll,520);

})();