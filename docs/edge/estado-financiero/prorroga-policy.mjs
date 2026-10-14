// GOXION · Contrato puro de prórroga, sin operaciones financieras ni efectos.
const valid = value => {
 const v=String(value||"");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const [y,m,d]=v.split("-").map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===v;
};
const days=(a,b)=>Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
const ret=(reason,extra={})=>({ok:false,reason,...extra});
export function cotizarProrroga({
 original,pactada,hoy,principalCentavos,
 descuentoCentavos=0,aprobada=false,solicitud=null,
 usadasPeriodo=0,maxDias=5
}={}){
 if(!valid(original)||!valid(pactada)||!valid(hoy)
  ||!Number.isSafeInteger(principalCentavos)||principalCentavos<0
  ||!Number.isSafeInteger(descuentoCentavos)||descuentoCentavos<0
  ||!Number.isInteger(maxDias)||maxDias<1||maxDias>5)return ret("parametros_invalidos");
 const extension=days(original,pactada);
 if(extension<1||extension>maxDias)return ret("prorroga_fuera_de_rango");
 if(!aprobada&&(usadasPeriodo>0||!Number.isSafeInteger(usadasPeriodo)||usadasPeriodo<0))
  return ret("ya_uso_prorroga_del_periodo");
 if(!aprobada&&(!valid(solicitud)||solicitud>original||solicitud>hoy))
  return ret("solicitud_fuera_de_plazo");
 const incumplida=aprobada&&hoy>pactada;
 const diasRetro=incumplida?Math.max(0,days(original,hoy)):0;
 const baseIncumplida=principalCentavos+descuentoCentavos;
 const porcentaje=Math.min(diasRetro*5,50);
 const mora=Math.round(baseIncumplida*porcentaje/100);
 return {
  ok:true,fecha_original:original,fecha_pactada:pactada,
  dias_extension:extension,aprobada,incumplida,
  conserva_lealtad:aprobada&&!incumplida,
  mora_actual_centavos:aprobada?mora:0,
  mora_si_incumple_al_dia_siguiente_centavos:Math.round(
    baseIncumplida*Math.min(days(original,pactada)+1,10)*.05),
  mora_dias_retroactivos:diasRetro,
  porcentaje_mora:porcentaje,
  principal_actual_centavos:principalCentavos,
  principal_al_incumplir_centavos:baseIncumplida,
  descuento_en_riesgo_centavos:descuentoCentavos,
  total_si_paga_pactada_centavos:principalCentavos,
  total_si_incumple_al_dia_siguiente_centavos:baseIncumplida+
    Math.round(baseIncumplida*Math.min(days(original,pactada)+1,10)*.05),
  total_actual_centavos:principalCentavos+(aprobada?mora:0)+
     (incumplida?descuentoCentavos:0),
  nota:"La prórroga conserva lealtad hasta la fecha pactada; después recargo retroactivo y pérdida de lealtad si sigue pendiente"
 };
}
