import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {prepareProductionCredentials,readProductionCredentials} from '../deployment/production-credentials.mjs';
import {readResendKey} from '../deployment/resend-credentials.mjs';
const root=resolve(import.meta.dirname,'..');
prepareProductionCredentials();
const values={...readProductionCredentials(),RESEND_API_KEY:readResendKey()};
try{
 execFileSync(process.execPath,[resolve(root,'deployment/node_modules/wrangler/bin/wrangler.js'),'secret','bulk','--config',resolve(root,'deployment/wrangler.production.jsonc')],{cwd:resolve(root,'deployment'),input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe']});
 console.log('Bound production operator, fingerprint and existing domain-restricted sending secrets. Secret values were not printed or written to plaintext.');
}catch{throw Error('Production secret binding failed. Inspect only secret names and deployment status; do not print child-process input or credential values.');}
