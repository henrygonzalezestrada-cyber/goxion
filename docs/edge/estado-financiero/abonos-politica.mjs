// GOXION B2 · evaluación pura de propuesta de abono, NO una operación de pago.
// La cifra de saldo usada para probar es un saldo YA conciliado de obligación.
// El registro de la propuesta NO modifica deuda, mora, cobertura ni lealtad.
function cents(v){return Number.isInteger(v)&&v>=0&&v<=1_000_000_000;}
function iso(v){
 if(typeof v!=="string"||!/^\d{4}-\d\d-\d\d$/.test(v))return false;
 const d=new Date(v+"T00:00:00.000Z");
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;
}
function reject(reason){
 return {permitido:false,cobrable:false,accion:"ninguna",razon:reason,
         saldo_proyectado_centavos:null,mora_condonada_centavos:0};
}
export function evaluarPropuestaAbono({
  saldo_confirmado_centavos,
  monto_propuesto_centavos,
  obligacion_estado,
  fecha_vencimiento,
  fecha_hoy,
  pago_en_revision=false,
  cliente_suspendido=false,
  beneficio_pendiente=false,
  acuerdo_fecha=null,
  mora_acumulada_centavos=0
}={}){
 if(!cents(saldo_confirmado_centavos)||!cents(monto_propuesto_centavos)||
    !cents(mora_acumulada_centavos)||!iso(fecha_vencimiento)||!iso(fecha_hoy))
   return reject("datos_invalidos");
 if(obligacion_estado!=="conciliado")return reject("obligacion_no_conciliada");
 if(cliente_suspendido)return reject("cliente_suspendido");
 if(pago_en_revision)return reject("comprobante_en_revision");
 if(beneficio_pendiente)return reject("beneficios_por_conciliar");
 if(acuerdo_fecha!==null&&(!iso(acuerdo_fecha)||acuerdo_fecha<fecha_vencimiento))
   return reject("acuerdo_invalido");
 if(saldo_confirmado_centavos===0)return reject("sin_saldo");
 if(monto_propuesto_centavos===0)return reject("monto_cero");
 if(monto_propuesto_centavos>saldo_confirmado_centavos)return reject("excede_saldo");
 if(monto_propuesto_centavos===saldo_confirmado_centavos)
   return {...reject("usar_pago_completo"),accion:"pago_completo_existente"};
 const fecha_operativa=acuerdo_fecha||fecha_vencimiento;
 const vencido=fecha_hoy>fecha_operativa;
 return {
   permitido:true,cobrable:false,accion:"solicitar_abono",
   modo:"propuesta_sin_acreditacion",
   fecha_operativa,
   saldo_actual_centavos:saldo_confirmado_centavos,
   monto_propuesto_centavos,
   // Este saldo es una ilustración del efecto de una aprobación futura.
   // Nunca reemplaza el saldo calculado en el backend oficial.
   saldo_proyectado_centavos:saldo_confirmado_centavos-monto_propuesto_centavos,
   mora_acumulada_centavos,
   mora_condonada_centavos:0,
   mora_puede_seguir_generandose:vencido,
   evita_mora_automaticamente:false,
   acuerdo_requerido_para_diferir_fecha:!acuerdo_fecha&&
        saldo_confirmado_centavos>monto_propuesto_centavos,
   mensaje:vencido
     ?"El abono no elimina mora acumulada. La mora futura depende del saldo aprobado y de un acuerdo vigente."
     :"Un abono no cancela automáticamente la mora futura sobre el saldo restante.",
   guardas:["comprobante_revisado_por_admin","idempotencia_de_solicitud",
           "pago_aprobado_y_asignado_a_obligacion",
           "recalculo_de_mora_en_backend"]
 };
}
