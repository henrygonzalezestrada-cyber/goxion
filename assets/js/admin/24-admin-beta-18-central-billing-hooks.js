(()=>{
    window.gxClientCharge=function(c){return Number(c?.estado_cuenta?.total_actual ?? (c?.servicios||[]).reduce((s,x)=>s+Number(x?.monto||0),0));};
    window.gxClientBase=function(c){return Number(c?.estado_cuenta?.subtotal ?? (c?.servicios||[]).reduce((s,x)=>s+Number(x?.monto||0),0));};
})();