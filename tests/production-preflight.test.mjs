import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProductionSecrets} from '../deployment/production-preflight.mjs';

test('release preflight requires all three monitoring bindings as well as authentication and mail secrets',()=>{
 const names=['OPERATOR_TOKEN','FINGERPRINT_SECRET','RESEND_API_KEY','HEALTHCHECK_URL','INQUIRY_SUBMISSION_HEALTHCHECK_URL','RETENTION_HEALTHCHECK_URL'];
 const records=names.map(name=>({name,type:'secret_text'}));
 assert.deepEqual(assertProductionSecrets(records),names);
 assert.throws(()=>assertProductionSecrets(records.filter(record=>record.name!=='HEALTHCHECK_URL')),/HEALTHCHECK_URL/);
 assert.throws(()=>assertProductionSecrets(records.map(record=>record.name==='HEALTHCHECK_URL'?{...record,type:'plain_text'}:record)),/HEALTHCHECK_URL/);
 for(const name of ['INQUIRY_SUBMISSION_HEALTHCHECK_URL','RETENTION_HEALTHCHECK_URL'])assert.throws(()=>assertProductionSecrets(records.filter(record=>record.name!==name)),new RegExp(name));
 assert.throws(()=>assertProductionSecrets({secret:'never echo this'}),error=>!error.message.includes('never echo'));
});
