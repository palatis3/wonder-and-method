import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dir=resolve(root,'.runtime/worker-test');await mkdir(dir,{recursive:true});
const config=JSON.parse(await readFile(resolve(root,'deployment/wrangler.jsonc'),'utf8'));
config.name='wonder-method-local-test';config.main=resolve(root,'deployment/worker.mjs');config.assets.directory=resolve(root,'dist');config.triggers={crons:[]};
config.d1_databases[0].migrations_dir=resolve(root,'deployment/migrations');
config.vars={...config.vars,STAGING_AUTH:'synthetic:test-only-not-a-real-secret',OPERATOR_TOKEN:'synthetic-local-operator-only',FINGERPRINT_SECRET:'synthetic-local-fingerprint-at-least-thirty-two-characters'};
await writeFile(resolve(dir,'wrangler.json'),JSON.stringify(config,null,2));
console.log('Prepared local-only Worker fixture with synthetic test credentials; no remote bindings.');
