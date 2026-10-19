import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProductionSecrets} from '../deployment/production-preflight.mjs';

test('release preflight requires the production inquiry heartbeat as well as authentication and mail secrets',()=>{
 const names=['OPERATOR_TOKEN','FINGERPRINT_SECRET','RESEND_API_KEY','HEALTHCHECK_URL'];
 const records=names.map(name=>({name,type:'secret_text'}));
 assert.deepEqual(assertProductionSecrets(records),names);
 assert.throws(()=>assertProductionSecrets(records.filter(record=>record.name!=='HEALTHCHECK_URL')),/HEALTHCHECK_URL/);
 assert.throws(()=>assertProductionSecrets(records.map(record=>record.name==='HEALTHCHECK_URL'?{...record,type:'plain_text'}:record)),/HEALTHCHECK_URL/);
 assert.throws(()=>assertProductionSecrets({secret:'never echo this'}),error=>!error.message.includes('never echo'));
});
