/* GOXION E3/B5: preventive incidents AUDIENCE CONTRACT (demo-only).
 * This module computes a dry-run plan. It never sends, writes, or fetches.
 * The production owner remains Admin Comunicaciones, not this module.
 */
const identity=/^[a-zA-Z0-9_-]{3,80}$/;
const validId=value=>typeof value==='string'&&identity.test(value);
const unique=values=>[...new Set(values)];

export function previewAffectedClients({incident,clients,deliveredKeys=[]}={}){
  const blocked=reason=>({mode:'dry_run_only',deliverable:false,reason,recipients:[],excluded:[]});
  if(!incident||incident.status!=='confirmed')return blocked('incidencia_no_confirmada');
  if(!validId(incident.id)||!Number.isSafeInteger(incident.revision)||incident.revision<1)
    return blocked('identidad_invalida');
  if(!validId(incident.confirmedBy)||!Number.isFinite(Date.parse(incident.confirmedAt||'')))
    return blocked('confirmacion_no_verificada');
  if(!Array.isArray(incident.serviceIds)||!incident.serviceIds.length||
    incident.serviceIds.some(id=>!validId(id)))
    return blocked('servicios_no_verificables');
  if(!Array.isArray(clients)||!Array.isArray(deliveredKeys)||
    deliveredKeys.some(key=>typeof key!=='string'))
    return blocked('audiencia_no_verificable');
  const services=new Set(unique(incident.serviceIds));
  const delivered=new Set(deliveredKeys), seen=new Set();
  const recipients=[],excluded=[];
  for(const client of clients){
    if(!client||!validId(client.id)||seen.has(client.id)){
      excluded.push({reason:'identidad_cliente_invalida_o_repetida'});
      continue;
    }
    seen.add(client.id);
    if(client.status!=='active'||client.test===true||client.suspended===true){
      excluded.push({id:client.id,reason:'cliente_no_elegible'});continue;
    }
    if(!Array.isArray(client.contracts)){
      excluded.push({id:client.id,reason:'contratos_no_verificables'});continue;
    }
    const matches=unique(client.contracts.filter(contract=>
      contract&&contract.active===true&&services.has(contract.serviceId))
      .map(contract=>contract.serviceId));
    if(!matches.length){
      excluded.push({id:client.id,reason:'sin_servicios_afectados_activos'});continue;
    }
    const key=['incident',incident.id,incident.revision,client.id].join(':');
    if(delivered.has(key)){
      excluded.push({id:client.id,reason:'aviso_previo_registrado'});continue;
    }
    recipients.push({
      clientId:client.id,
      incidentId:incident.id,
      revision:incident.revision,
      serviceIds:matches,
      dedupeKey:key,
      category:'service_incident',
      // Final text must come from the official communications system.
      destination:'campana_existente'
    });
  }
  recipients.sort((a,b)=>a.clientId.localeCompare(b.clientId));
  return {mode:'dry_run_only',deliverable:false,reason:'requiere_confirmacion_y_revalidacion_backend',
    confirmed:incident.id,revision:incident.revision,recipients,excluded};
}

export function revalidateBeforeDelivery({
  incident,clients,deliveredKeys=[],plannedRecipients=[]
}={}){
  // The plan must never act as an authorization. Compute the truth again.
  const plan=previewAffectedClients({incident,clients,deliveredKeys});
  const stillAllowed=new Set(plan.recipients.map(row=>row.dedupeKey));
  const proposed=new Set(Array.isArray(plannedRecipients)?
    plannedRecipients.map(row=>row?.dedupeKey):[]);
  return {...plan,recipients:plan.recipients.filter(row=>proposed.has(row.dedupeKey)&&
    stillAllowed.has(row.dedupeKey))};
}
