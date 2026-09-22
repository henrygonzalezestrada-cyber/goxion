(function(){
    var code=document.getElementById('gx-activation-code');
    var step=document.getElementById('gx-activation-step-code');
    if(!code||!step)return;
    var shell=code.closest('.gx-auth-input-shell');
    if(!shell)return;

    if(!shell.querySelector('.gx-feral-code-visual')){
        shell.classList.add('gx-feral-code-shell');
        var visual=document.createElement('div');
        visual.className='gx-feral-code-visual';
        visual.setAttribute('aria-hidden','true');
        for(var i=0;i<6;i++){
            var slot=document.createElement('span');
            slot.className='gx-feral-code-slot';
            visual.appendChild(slot);
        }
        shell.appendChild(visual);
    }

    var visual=shell.querySelector('.gx-feral-code-visual');
    var slots=Array.prototype.slice.call(visual.querySelectorAll('.gx-feral-code-slot'));
    var activeStage=null;

    function digits(){return String(code.value||'').replace(/\D/g,'').slice(0,6)}
    function sync(){
        var v=digits();
        slots.forEach(function(slot,i){
            var ch=v[i]||'';
            slot.textContent=ch;
            slot.classList.toggle('is-filled',!!ch);
            slot.classList.toggle('is-current',document.activeElement===code&&i===Math.min(v.length,5)&&v.length<6);
        });
    }
    window.gxSyncActivationCodeVisual=sync;
    window.gxCleanupActivationFold=function(){
        if(activeStage){activeStage.remove();activeStage=null}
        step.classList.remove('gx-otp-fold-running');
        sync();
    };

    code.addEventListener('input',sync,{passive:true});
    code.addEventListener('focus',sync,{passive:true});
    code.addEventListener('blur',sync,{passive:true});
    sync();

    function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
    function reduced(){return !!window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
    function play(el,frames,options){
        var a=el.animate(frames,options);
        return a.finished.catch(function(){}).then(function(){
            var last=frames[frames.length-1]||{};
            Object.keys(last).forEach(function(k){
                if(k==='offset'||k==='easing'||k==='composite')return;
                try{el.style[k]=last[k]}catch(_){}
            });
            try{a.cancel()}catch(_){}
        });
    }

    window.gxRunActivationConstellation=async function(raw){
        window.gxCleanupActivationFold();
        var v=String(raw||digits()).replace(/\D/g,'').slice(0,6);
        if(v.length!==6)return;
        code.blur();sync();

        var stepRect=step.getBoundingClientRect();
        var slotRects=slots.map(function(s){return s.getBoundingClientRect()});
        if(!stepRect.width||slotRects.some(function(r){return !r.width}))return;

        var stage=document.createElement('div');
        stage.className='gx-otp-fold-stage';
        activeStage=stage;

        var group=document.createElement('div');
        group.className='gx-otp-fold-group';
        stage.appendChild(group);

        var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class','gx-otp-fold-lines');
        svg.setAttribute('viewBox','0 0 '+stepRect.width+' '+stepRect.height);
        group.appendChild(svg);

        var nodeSize=54;
        var startTransforms=[];
        var matrixTransforms=[];
        var nodes=slotRects.map(function(r,i){
            var n=document.createElement('div');
            n.className='gx-otp-fold-node';
            n.innerHTML='<span class="gx-otp-node-digit">'+v[i]+'</span><svg class="gx-otp-node-trace" viewBox="0 0 58 58" aria-hidden="true"><rect class="gx-otp-node-lit" x="2" y="2" width="54" height="54" rx="13" ry="13" pathLength="1"></rect><rect class="gx-otp-node-energy" x="2" y="2" width="54" height="54" rx="13" ry="13" pathLength="1"></rect></svg>';
            var centerX=r.left-stepRect.left+r.width/2;
            var centerY=r.top-stepRect.top+r.height/2;
            n.style.left=(centerX-nodeSize/2)+'px';
            n.style.top=(centerY-nodeSize/2)+'px';
            var start='translate3d(0px,0px,0) scale('+(r.width/nodeSize)+')';
            n.style.transform=start;
            startTransforms[i]=start;
            group.appendChild(n);
            return n;
        });

        var gapX=22,gapY=18;
        var gridW=nodeSize*3+gapX*2;
        var gridH=nodeSize*2+gapY;
        var cx=stepRect.width/2;
        var cy=Math.max(126,Math.min(stepRect.height-118,stepRect.height*.48));
        var left=cx-gridW/2;
        var top=cy-gridH/2;
        var targets=[
            [left,top],[left+nodeSize+gapX,top],[left+(nodeSize+gapX)*2,top],
            [left,top+nodeSize+gapY],[left+nodeSize+gapX,top+nodeSize+gapY],[left+(nodeSize+gapX)*2,top+nodeSize+gapY]
        ];
        var centers=targets.map(function(p){return[p[0]+nodeSize/2,p[1]+nodeSize/2]});

        nodes.forEach(function(n,i){
            var r=slotRects[i];
            var sx=r.left-stepRect.left+r.width/2-nodeSize/2;
            var sy=r.top-stepRect.top+r.height/2-nodeSize/2;
            matrixTransforms[i]='translate3d('+(targets[i][0]-sx)+'px,'+(targets[i][1]-sy)+'px,0) scale(1)';
        });

        /* Línea tenue + línea de energía encima. El segundo trazo es el
           que "viaja" y enciende la estructura, como en la referencia. */
        var edges=[[0,1],[1,2],[2,5],[5,4],[4,3],[3,0],[1,4]];
        var connections=edges.map(function(e){
            var base=document.createElementNS('http://www.w3.org/2000/svg','line');
            base.setAttribute('class','gx-otp-line-base');
            base.setAttribute('x1',centers[e[0]][0]);base.setAttribute('y1',centers[e[0]][1]);
            base.setAttribute('x2',centers[e[1]][0]);base.setAttribute('y2',centers[e[1]][1]);
            base.setAttribute('pathLength','1');
            base.style.strokeDasharray='1';base.style.strokeDashoffset='1';base.style.opacity='0';
            svg.appendChild(base);

            var energy=base.cloneNode(false);
            energy.setAttribute('class','gx-otp-line-energy');
            energy.style.strokeDasharray='.20 .80';energy.style.strokeDashoffset='1';energy.style.opacity='0';
            svg.appendChild(energy);
            return {base:base,energy:energy};
        });

        var final=document.createElement('div');
        final.className='gx-otp-final';
        final.style.left=(cx-33)+'px';
        final.style.top=(cy-33)+'px';
        final.innerHTML='<span class="gx-otp-final-frame"></span><span class="gx-otp-final-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.1 4.1L19 7.3"/></svg></span><i class="gx-otp-dot d1"></i><i class="gx-otp-dot d2"></i><i class="gx-otp-dot d3"></i><i class="gx-otp-dot d4"></i><span class="gx-otp-final-copy"><strong>Código verificado</strong><small>Preparando tu PIN</small></span>';
        stage.appendChild(final);

        step.appendChild(stage);
        step.classList.add('gx-otp-fold-running');

        if(reduced()||typeof Element.prototype.animate!=='function'){
            nodes.forEach(function(n){n.style.opacity='0'});
            final.style.opacity='1';final.style.transform='translate3d(0,0,0) scale(1) rotateZ(0deg)';
            var rc=final.querySelector('.gx-otp-final-copy');
            if(rc){rc.style.opacity='1';rc.style.transform='translate3d(-50%,0,0)'}
            await sleep(420);
            return;
        }

        /* 1 · Fila → matriz. */
        await Promise.all(nodes.map(function(n,i){
            var r=slotRects[i];
            var sx=r.left-stepRect.left+r.width/2-nodeSize/2;
            var sy=r.top-stepRect.top+r.height/2-nodeSize/2;
            var dx=targets[i][0]-sx,dy=targets[i][1]-sy;
            return sleep(i*16).then(function(){
                return play(n,[
                    {transform:startTransforms[i]},
                    {transform:'translate3d('+(dx*.60)+'px,'+(dy*.58-3)+'px,0) scale(.94)',offset:.60},
                    {transform:matrixTransforms[i]}
                ],{duration:470,easing:'cubic-bezier(.18,.78,.18,1)',fill:'both'});
            });
        }));

        await sleep(70);

        /* 2 · La geometría base se dibuja primero, todavía morada. */
        await Promise.all(connections.map(function(cn,i){
            return sleep(i*20).then(function(){
                return play(cn.base,[
                    {strokeDashoffset:'1',opacity:'0'},
                    {strokeDashoffset:'0',opacity:'.72'}
                ],{duration:250,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
            });
        }));

        /* 3 · CARGA DE NEÓN. Recorre las líneas y después el borde de
           cada nodo. Cuando pasa, deja detrás la estructura encendida. */
        var traceOrder=[0,1,2,5,4,3];
        var energyJobs=connections.map(function(cn,i){
            return sleep(i*48).then(async function(){
                await play(cn.energy,[
                    {strokeDashoffset:'1',opacity:'0'},
                    {strokeDashoffset:'.72',opacity:'1',offset:.18},
                    {strokeDashoffset:'-.20',opacity:'1',offset:.82},
                    {strokeDashoffset:'-.36',opacity:'0'}
                ],{duration:360,easing:'linear',fill:'both'});
                cn.base.style.stroke='#45ffc0';
                cn.base.style.opacity='.82';
            });
        });

        var nodeJobs=traceOrder.map(function(nodeIndex,order){
            var n=nodes[nodeIndex];
            var lit=n.querySelector('.gx-otp-node-lit');
            var energy=n.querySelector('.gx-otp-node-energy');
            return sleep(80+order*58).then(async function(){
                n.classList.add('is-verified');
                await play(energy,[
                    {strokeDashoffset:'1',opacity:'0'},
                    {strokeDashoffset:'.72',opacity:'1',offset:.18},
                    {strokeDashoffset:'-.20',opacity:'1',offset:.82},
                    {strokeDashoffset:'-.36',opacity:'0'}
                ],{duration:390,easing:'linear',fill:'both'});
                await play(lit,[{opacity:'0'},{opacity:'.92'}],{
                    duration:120,easing:'ease-out',fill:'both'
                });
            });
        });

        await Promise.all(energyJobs.concat(nodeJobs));
        await sleep(150);

        /* 4 · Un beat físico intermedio: visible, pero sin la pausa larga. */
        await play(group,[
            {transform:'translateZ(0) perspective(760px) rotateX(0deg) rotateZ(0deg) scale(1)'},
            {transform:'translateZ(0) perspective(760px) rotateX(5deg) rotateZ(3.2deg) scale(.988)',offset:.50},
            {transform:'translateZ(0) perspective(760px) rotateX(0deg) rotateZ(0deg) scale(1)'}
        ],{duration:330,easing:'cubic-bezier(.2,.72,.2,1)',fill:'both'});

        await sleep(35);

        /* 5 · Plegado continuo. */
        var lineFade=Promise.all(connections.map(function(cn,i){
            return sleep(i*7).then(function(){
                return Promise.all([
                    play(cn.base,[{opacity:'.82'},{opacity:'0'}],{duration:230,easing:'ease-in',fill:'both'}),
                    play(cn.energy,[{opacity:'0'},{opacity:'0'}],{duration:1,fill:'both'})
                ]);
            });
        }));

        var folds=Promise.all(nodes.map(function(n,i){
            var r=slotRects[i];
            var sx=r.left-stepRect.left+r.width/2-nodeSize/2;
            var sy=r.top-stepRect.top+r.height/2-nodeSize/2;
            var dx0=targets[i][0]-sx,dy0=targets[i][1]-sy;
            var dx=(cx-nodeSize/2)-sx,dy=(cy-nodeSize/2)-sy;
            var turn=(i%2===0?-1:1)*(20+i*1.6);
            var midX=dx0+(dx-dx0)*.65;
            var midY=dy0+(dy-dy0)*.65;
            return sleep(i*14).then(function(){
                return play(n,[
                    {transform:matrixTransforms[i],opacity:'1'},
                    {transform:'translate3d('+midX+'px,'+midY+'px,0) scale(.72) rotateZ('+(turn*.46)+'deg)',opacity:'.90',offset:.60},
                    {transform:'translate3d('+dx+'px,'+dy+'px,0) scale(.15) rotateZ('+turn+'deg)',opacity:'0'}
                ],{duration:470,easing:'cubic-bezier(.22,.70,.16,1)',fill:'both'});
            });
        }));

        var finalPop=sleep(175).then(function(){
            return play(final,[
                {opacity:'0',transform:'translate3d(0,0,0) scale(.58) rotateZ(-7deg)'},
                {opacity:'1',transform:'translate3d(0,0,0) scale(1.04) rotateZ(1deg)',offset:.72},
                {opacity:'1',transform:'translate3d(0,0,0) scale(1) rotateZ(0deg)'}
            ],{duration:390,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
        });

        await Promise.all([lineFade,folds,finalPop]);

        var copy=final.querySelector('.gx-otp-final-copy');
        if(copy){
            await play(copy,[
                {opacity:'0',transform:'translate3d(-50%,4px,0)'},
                {opacity:'1',transform:'translate3d(-50%,0,0)'}
            ],{duration:170,easing:'ease-out',fill:'both'});
        }

        /* Intermedio entre las dos versiones anteriores: suficiente para
           leer el resultado, sin detener la sensación de continuidad. */
        await sleep(320);

        /* IMPORTANTE: no quitamos el stage aquí. gxSwitchStage animará
           este resultado final hacia afuera y sólo después se limpia. */
    };

})();