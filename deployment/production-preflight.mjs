// Inspect secret names only. The release gate never retrieves or logs values.
export function assertProductionSecrets(records){
 if(!Array.isArray(records))throw Error('Production secret inventory could not be verified.');
 const names=new Set(records.filter(record=>record?.type==='secret_text').map(record=>record.name));
 const required=['OPERATOR_TOKEN','FINGERPRINT_SECRET','RESEND_API_KEY','HEALTHCHECK_URL','INQUIRY_SUBMISSION_HEALTHCHECK_URL','RETENTION_HEALTHCHECK_URL'];
 const missing=required.filter(name=>!names.has(name));
 if(missing.length)throw Error('Production release requires configured secrets: '+missing.join(', '));
 return required;
}
