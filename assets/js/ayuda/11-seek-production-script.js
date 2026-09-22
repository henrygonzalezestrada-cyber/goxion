(()=>{
    const root=document.getElementById('gx-seek');
    const skin=root?.querySelector('.gx-seek-skin');
    const field=document.getElementById('gx-catalog-search');
    const hit=document.getElementById('gx-seek-hit');
    const toolbar=root?.closest('.gx-seek-toolbar');
    if(!root || !skin || !field || !hit || !toolbar) return;

    const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));

    /* ── ONE SPRING, FOR EVERYTHING THAT SETTLES ──────────
       Frames, no milisegundos. dt se expresa en unidades de 1/60 s
       y el damping se ELEVA a dt en vez de multiplicarse por dt.
       De esa manera un frame perdido disipa la misma energía que los
       dos frames que reemplazó y el spring no cambia en una página ocupada. */
    const springOf=tune=>({
        k:.08+(tune/100)*.16,
        d:.62+(tune/100)*.20
    });

    const SHUT=44;
    const SPRING=64;
    let current=SHUT;
    let velocity=0;
    let target=SHUT;
    let raf=0;
    let prev=0;
    let pressTimer=0;
    let busyTimer=0;
    let opened=false;

    const still=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    /* GOXION no usa los 64px del componente aislado de Bencho.
       Aquí la pieza convive con chips de 30px dentro de una toolbar.
       Cerrada conserva 44px; abierta toma ~62% del espacio, con techo
       de 280px, dejando a los filtros visibles al costado. */
    function openWidth(){
        const total=toolbar.getBoundingClientRect().width||320;
        const compact=window.matchMedia?.('(max-width:390px)').matches;
        const ceiling=compact?230:280;
        const floor=compact?196:220;
        return Math.round(clamp(total*.62,floor,ceiling));
    }

    function publish(){
        const span=Math.max(SHUT,target);
        const p=clamp((current-SHUT)/Math.max(1,span-SHUT),0,1);
        const say=clamp((p-.55)/.45,0,1);
        root.style.setProperty('--gx-seek-w',current.toFixed(2)+'px');
        root.style.setProperty('--gx-seek-p',p.toFixed(3));
        root.style.setProperty('--gx-seek-say',say.toFixed(3));
        root.style.setProperty('--gx-seek-shift',(-6*(1-say)).toFixed(2)+'px');
    }

    function settleInstant(){
        current=target;
        velocity=0;
        publish();
    }

    function run(){
        cancelAnimationFrame(raf);
        raf=0;
        prev=0;

        if(still()){
            settleInstant();
            return;
        }

        const {k,d}=springOf(SPRING);
        const tick=t=>{
            const dt=prev?clamp((t-prev)/16.67,0,2.5):1;
            prev=t;
            velocity+=(target-current)*k*dt;
            velocity*=Math.pow(d,dt);
            current+=velocity*dt;
            publish();

            if(Math.abs(target-current)<.02 && Math.abs(velocity)<.02){
                current=target;
                velocity=0;
                publish();
                raf=0;
                return;
            }
            raf=requestAnimationFrame(tick);
        };
        raf=requestAnimationFrame(tick);
    }

    function setTarget(next){
        target=next;
        run();
    }

    function setOpen(value,{focus=false}={}){
        opened=Boolean(value);
        root.dataset.open=String(opened);
        field.tabIndex=opened?0:-1;
        setTarget(opened?openWidth():SHUT);
        if(focus){
            /* En GOXION sí permitimos el teclado de software: esto es una
               búsqueda funcional, no una tarjeta demostrativa. */
            setTimeout(()=>field.focus({preventScroll:true}),still()?0:65);
        }
    }

    /* ── OPENING: COMPRESS, THEN EXPAND ────────────────────
       90 ms alcanza para sentir que el objeto cede sin convertirlo
       en una espera. El foco llega durante la expansión, no al final,
       para que el campo ya sea utilizable cuando visualmente aparece. */
    function start(){
        if(opened) return;

        /* El foco ocurre DENTRO del gesto del usuario. Safari/iOS puede
           negarse a mostrar el teclado si focus() llega después de un
           setTimeout. El objeto sí espera 90ms para crecer: primero toma
           foco y cede, luego se expande. Interacción y geometría siguen
           siendo dos tiempos distintos sin sacrificar usabilidad. */
        opened=true;
        root.dataset.open='true';
        field.tabIndex=0;
        root.dataset.press='true';
        try{ field.focus({preventScroll:true}); }catch(_){ field.focus(); }

        clearTimeout(pressTimer);
        pressTimer=setTimeout(()=>{
            root.dataset.press='false';
            setTarget(openWidth());
        },still()?0:90);
    }

    function away(){
        if(field.value.trim()) return;
        setOpen(false);
    }

    function typingBeat(){
        root.dataset.busy='true';
        clearTimeout(busyTimer);
        busyTimer=setTimeout(()=>{root.dataset.busy='false';},340);
    }

    hit.addEventListener('click',start);
    field.addEventListener('input',()=>{
        typingBeat();
        if(!opened) setOpen(true);
    });
    field.addEventListener('blur',away);
    field.addEventListener('keydown',e=>{
        if(e.key!=='Escape') return;
        e.preventDefault();
        field.value='';
        if(typeof window.gxApplyCatalogFilters==='function') window.gxApplyCatalogFilters();
        setOpen(false);
        field.blur();
    });

    /* ── MAGNET ────────────────────────────────────────────
       Se mide contra la toolbar estable, no contra el objeto que ya está
       desplazándose. Si el vector se midiera desde el propio objeto se
       formaría un feedback loop visible como temblor. Se desactiva en
       touch y una vez abierto: un campo no debe pelear con quien escribe. */
    if(window.matchMedia?.('(hover:hover) and (pointer:fine)').matches && !still()){
        let magRaf=0;
        let lean={x:0,y:0};
        const publishLean=()=>{
            magRaf=0;
            root.style.setProperty('--gx-seek-lx',lean.x.toFixed(2)+'px');
            root.style.setProperty('--gx-seek-ly',lean.y.toFixed(2)+'px');
        };
        const read=e=>{
            if(opened){
                if(lean.x||lean.y){lean={x:0,y:0};if(!magRaf)magRaf=requestAnimationFrame(publishLean);}
                return;
            }
            const b=root.getBoundingClientRect();
            const dx=e.clientX-(b.left+b.width/2);
            const dy=e.clientY-(b.top+b.height/2);
            const dist=Math.hypot(dx,dy);
            const R=92;
            if(dist>R){
                if(lean.x||lean.y){lean={x:0,y:0};if(!magRaf)magRaf=requestAnimationFrame(publishLean);}
                return;
            }
            const pull=(1-dist/R)**1.4*4.5;
            lean={x:(dx/(dist||1))*pull,y:(dy/(dist||1))*pull};
            if(!magRaf)magRaf=requestAnimationFrame(publishLean);
        };
        const gone=()=>{
            lean={x:0,y:0};
            if(!magRaf)magRaf=requestAnimationFrame(publishLean);
        };
        document.addEventListener('pointermove',read,{passive:true});
        document.addEventListener('pointerleave',gone);
    }

    const resize=()=>{
        if(opened){
            target=openWidth();
            run();
        }
    };
    window.addEventListener('resize',resize,{passive:true});

    if(field.value.trim()){
        opened=true;
        root.dataset.open='true';
        field.tabIndex=0;
        target=openWidth();
        current=target;
    }else{
        field.tabIndex=-1;
    }
    publish();

})();