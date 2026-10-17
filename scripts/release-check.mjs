import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {releaseFingerprint,evaluateRelease} from '../src/release.mjs';
const root=resolve(import.meta.dirname,'..');
const read=async name=>JSON.parse(await readFile(resolve(root,name),'utf8'));
const result=evaluateRelease(await read('authority/v5/build-contract.json'),await read('config/release-evidence.json'),await releaseFingerprint(root),await read('config/site.json'),await read('deployment/wrangler.production.jsonc'));
console.log(JSON.stringify(result,null,2));
if(!result.ready)process.exitCode=1;
