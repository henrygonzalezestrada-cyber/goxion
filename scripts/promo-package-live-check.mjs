const endpoint='https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/promociones-catalogo';
const id='33333333-3333-4333-8333-333333333301';
const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
const j=await r.json();
if(!r.ok||j?.ok!==true) throw new Error('catalog endpoint failed: '+JSON.stringify(j));
const p=(j.promociones||[]).find(x=>x.id===id);
if(!p) throw new Error('test promotion missing from public catalog');
const close=(a,b)=>Math.abs(Number(a)-Number(b))<0.011;
if(!close(p.precio_normal_total,135)) throw new Error('normal total '+p.precio_normal_total);
if(!close(p.precio_promocional_total,100)) throw new Error('promo total '+p.precio_promocional_total);
if(!close(p.precio_promocional_periodo,33.33)) throw new Error('period promo '+p.precio_promocional_periodo);
if(!close(p.ahorro_estimado,35)) throw new Error('saving '+p.ahorro_estimado);
if(Number(p.duracion_periodos)!==3) throw new Error('periods '+p.duracion_periodos);
console.log(JSON.stringify({ok:true,promo:{
 id:p.id,
 normal:p.precio_normal_total,
 promo:p.precio_promocional_total,
 perPeriod:p.precio_promocional_periodo,
 saving:p.ahorro_estimado,
 periods:p.duracion_periodos
}},null,2));