/* GOXION · Goxy: respuestas deterministas de políticas 2.0 (19/11/2026).
 * Derivadas exclusivamente de assets/legal/{terminos,referidos,cupones}-v2.txt.
 * Sin IA, datos personales ni escrituras. Revisar al cambiar fuente (test de huellas).
 */
(()=>{
 'use strict';
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9%]+/g,' ').trim();
 const doc=(view,label)=>({kind:'policy-doc',view,label});
 const terms=doc('terminos','Consultar términos 2.0');
 const account={kind:'account',label:'Abrir Mi Espacio'};
 const pay={kind:'pay-open',label:'Ver mi estado de cuenta'};
 const catalog={kind:'catalog',label:'Ver catálogo'};
 const entries={
  extension:{answer:'Puedes solicitar una prórroga el día de vencimiento o durante los tres días naturales siguientes. La fecha pactada no puede superar el día 10 después del vencimiento original. Solo tiene efecto cuando el sistema confirma su activación. Si cumples el acuerdo no pagas mora por ese retraso, pero pierdes la racha y el descuento de lealtad de ese pago. Si incumples, puede calcularse mora desde el vencimiento original, con tope del 50%. (Términos 2.0, 2.3 y 5.2).',choices:[{kind:'policy-extension',label:'Comprobar mi prórroga'},terms]},
  late:{answer:'La mora es del 5% diario simple sobre el saldo vencido y exigible de cada servicio, desde el día siguiente al vencimiento, hasta el 50% máximo (diez días), sujeto a la normativa aplicable. No hay intereses sobre intereses. Sin prórroga, el servicio impagado puede retirarse desde el día 11; con una prórroga aprobada incumplida, desde el día siguiente a la fecha pactada, manualmente y previa revisión. Los servicios al corriente no se afectan. No existe cargo administrativo adicional del 20%. (Términos 2.0, 2.2–3.4).',choices:[pay,terms]},
  loyalty:{answer:'Con cuatro pagos consecutivos puntuales elegibles obtienes 3% de descuento; con nueve, 6%. Pagar después del vencimiento original, incluso con prórroga aprobada, rompe la racha y elimina el descuento de ese pago. Puedes reconstruirla con nuevos pagos puntuales elegibles. (Términos 2.0, 5.1–5.2).',choices:[{kind:'policy-loyalty',label:'Consultar mi nivel'},terms]},
  cancel:{answer:'Puedes solicitar la cancelación por los canales oficiales. GOXION te informará la fecha efectiva y el tratamiento de los periodos pagados, saldos y reembolsos que correspondan. No afecta otros servicios independientes. (Términos 2.0, 3.1).',choices:[account,terms]},
  guarantee:{answer:'La Garantía de Continuidad y Trato Justo cubre interrupciones completas atribuibles a la gestión de GOXION. Reporta oportunamente por Mi Espacio, WhatsApp o contacto directo. Se revisan los días verificables: 5% de la cuota del servicio afectado por día completo cubierto, hasta 50%. Si no puede restablecerse, corresponde evaluar una solución equivalente aceptada, devolución proporcional o saldo a favor voluntario. Las caídas externas no generan automáticamente esta compensación. No se limita ningún derecho legal. (Términos 2.0, 4.1–4.3).',choices:[{kind:'policy-support',label:'Contactar a GOXION'},terms]},
  referrals:{answer:'El programa es opcional para clientes activos. Tu referido debe ser un cliente nuevo, contratar al menos dos perfiles elegibles y mantener ambos activos y pagados tres meses consecutivos; tú debes estar al corriente durante la validación. La recompensa es 100% de descuento en una mensualidad elegible del cuarto mes, sobre la tarifa base; no es efectivo. Si cancela antes de completar los tres meses, no se genera recompensa. (Bases de Referidos 2.0, 1–4).',choices:[account,doc('referidos','Consultar bases de referidos')]},
  coupons:{answer:'Reclamar un cupón no equivale a aplicarlo. Su elegibilidad y vigencia se comprueban al usarlo, y los cupones de un solo uso no se reutilizan. Los beneficios no se acumulan salvo autorización expresa de la campaña, ni generan saldos negativos. (Bases de Cupones 2.0, 1–3).',choices:[account,doc('cupones','Consultar bases de cupones')]},
  welcome:{answer:'La promoción de bienvenida del 10% es para clientes nuevos elegibles en su primera contratación de perfiles individuales. No aplica a combos, cuentas completas ni otras promociones incompatibles. (Bases de Cupones 2.0, 4; Términos 2.0, 6.1).',choices:[catalog,doc('cupones','Consultar condiciones')]},
  access:{answer:'Los accesos individuales se destinan a un dispositivo autorizado, salvo condiciones expresas de la modalidad contratada, como invitaciones. No está permitido compartir o revender credenciales ni registrar dispositivos fuera de lo autorizado. El incumplimiento grave comprobado puede causar suspensión o retiro. (Términos 2.0, 1.2–1.3).',choices:[{kind:'platforms',label:'Consultar acceso a mi plataforma'},terms]},
  dates:{answer:'Cada servicio tiene su propio vencimiento, importe y periodo de cobertura. Un adeudo no afecta a los demás servicios al corriente. Los comprobantes requieren validación. (Términos 2.0, 2.1).',choices:[pay,terms]},
  consent:{answer:'Aceptar o rechazar los términos es una decisión expresa por versión y cuenta. Si rechazas, se respetan los periodos contratados hasta su conclusión; las renovaciones futuras deben gestionarse antes de aplicar condiciones rechazadas. Conservas acceso razonable a comprobantes, historial, garantías y soporte. No se aplican cambios retroactivos perjudiciales. (Términos 2.0, 8).',choices:[terms,account]},
  documents:{answer:'Los documentos vigentes de GOXION son los Términos y Condiciones 2.0 y las bases independientes de Referidos y Cupones, disponibles desde el 19 de noviembre de 2026. ¿Qué documento quieres consultar?',choices:[terms,doc('referidos','Bases de referidos'),doc('cupones','Bases de cupones')]}
 };
 function classify(input){
   const n=norm(input);
   if(!n)return null;
   // Nunca convertir un importe/estado personal en una respuesta genérica.
   if(/\b(cuanto debo|cuanto tengo que pagar|cuanto voy a pagar|cuanto pagaria|cuanto me cobran|cuanto me cobraran|cuanto me falta|mi saldo|mi deuda|mi proximo pago|mi vencimiento|mi nivel|mi racha|mi avance|mi cupon|mis cupones|mis referidos|misiones|mi comprobante|mi prorroga|puedo solicitar|puedo pedir|puedo activar|tengo una prorroga|fecha exacta|si pago el|si pago en|si pago manana|si pago hasta)\b/.test(n)&&!/\b(pierdo|conservo|mantengo|rompe|afecta la lealtad|sin mora)\b/.test(n))return null;
   if(/\b(rechaz\w*|no acept\w*|acept\w*)\b/.test(n)&&/\b(terminos|condiciones|documento)\b/.test(n))return 'consent';
   if(/\b(bienvenida|primer contrato|primera contratacion|10%)\b/.test(n)&&/\b(descuento|promocion|oferta|bienvenida)\b/.test(n))return 'welcome';
   if(/\b(referid\w*|invitar a un amigo|recomendar a un amigo)\b/.test(n))return 'referrals';
   if(/\b(garantia|compensacion|trato justo|reembolso|devolucion|bonificacion)\b/.test(n)&&!/\b(cancel\w*)\b/.test(n))return 'guarantee';
   if(/\b(lealtad|racha|pagos puntuales)\b/.test(n)&&/\b(pierdo|pierde|conservo|conserva|mantengo|mantiene|rompe|tarde|prorroga|reglas|requisitos|como funciona|cuantos pagos|nivel maximo)\b/.test(n))return 'loyalty';
   if(/\b(prorroga|prorrogas|aplazamiento)\b/.test(n)&&/\b(como|que|cuantos|cuantas|cuando|hasta|dias|reglas|plazo|incumpl\w*|solicitar|pedir|funciona|mora)\b/.test(n))return 'extension';
   if(/\b(mora|recargos?|reactivacion|reconexion|impago|atraso|retiro por impago|20%)\b/.test(n)&&/\b(como|que|cuando|cuantos|cuantas|porcentaje|reglas|cobra|cobran|aplica|aplican|tope|maximo|existe|hay|20|mora|reactivacion)\b/.test(n))return 'late';
   if(/\b(cancel\w*|dar de baja)\b/.test(n)&&!/\b(estado de mi|seguimiento|ya solicite|ya cancele)\b/.test(n))return 'cancel';
   if(/\b(cupon\w*|acumul\w* descuentos|combinar descuentos)\b/.test(n)&&/\b(como|que|puedo|reglas|acumul\w*|reclam\w*|aplic\w*|compatib\w*|usar)\b/.test(n))return 'coupons';
   if(/\b(dispositivos?|compartir|revender)\b/.test(n)&&/\b(cuantos|cuantas|permitido|permitidos|puedo compartir|puedo usar|condiciones|reglas)\b/.test(n))return 'access';
   if(/\b(fechas independientes|vencimientos independientes|varias fechas|otros servicios)\b/.test(n)&&/\b(fecha|fechas|vencimiento|vencimientos|adeudo|pago|pagos|afecta)\b/.test(n))return 'dates';
   if(/\b(terminos|condiciones|politicas|documentos legales)\b/.test(n))return 'documents';
   return null;
 }
 function reply(text){const id=classify(text);return id?{id,...entries[id]}:null;}
 window.GOXY_POLICY_V2=Object.freeze({version:'2.0',reply});
})();
