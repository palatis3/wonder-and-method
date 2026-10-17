import assert from 'node:assert/strict';
import {readStagingCredentials} from '../deployment/staging-credentials.mjs';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://wonder-method-staging.palatis3.workers.dev';
const secrets=readStagingCredentials();
const authorization='Basic '+Buffer.from(secrets.STAGING_AUTH).toString('base64');
const operator={Authorization:'Bearer '+secrets.OPERATOR_TOKEN,'X-Staging-Authorization':authorization,Accept:'application/json'};
const report={checkedAt:new Date().toISOString(),origin:base,mode:'authenticated synthetic staging',checks:[],emailSent:false,publicLaunch:false};
const check=(name,details)=>report.checks.push({name,passed:true,...details});
for(const path of ['/','/contact/','/assets/style.css','/assets/prices.json','/robots.txt','/api/operator/inquiries']){
  const response=await fetch(base+path); assert.equal(response.status,401,path);assert.match(response.headers.get('x-robots-tag'),/noindex/);await response.body.cancel();
}
check('All tested pages, assets and operator paths require authentication');
const wrong=await fetch(base,{headers:{Authorization:'Basic '+Buffer.from('review:wrong').toString('base64')}});assert.equal(wrong.status,401);await wrong.body.cancel();
check('Wrong staging password rejected');
for(const path of ['/','/services/web-design/','/services/seo/','/pricing/','/work/','/process/','/about/','/areas/erie-county/','/contact/','/privacy/']){
  const response=await fetch(base+path,{headers:{Authorization:authorization}});assert.equal(response.status,200,path);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(response.headers.get('cache-control'),/private.*no-store/);
  const html=await response.text();assert.match(html,/noindex/);assert.match(html,/Wonder/);
}
check('Ten core and privacy routes render with noindex and private no-store');
const css=await fetch(base+'/assets/style.css',{headers:{Authorization:authorization}});assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);
assert.equal(createHash('sha256').update(Buffer.from(await css.arrayBuffer())).digest('hex'),createHash('sha256').update(await readFile(new URL('../dist/assets/style.css',import.meta.url))).digest('hex'));
check('Remote stylesheet exactly matches build bytes and content type');
for(const path of ['/operations/weekly-board.json','/authority/v5/economics.json','/.env','/not-a-real-page/']) {const response=await fetch(base+path,{headers:{Authorization:authorization}});assert.equal(response.status,404,path);const body=await response.text(); if(path==='/not-a-real-page/') { if(process.argv.includes('--expect-legacy-404')) assert.equal(body,'','Rollback must restore the observed original 404 behavior'); else assert.match(body,/Wonder/, 'Branded 404 page must render'); }}
check('Private files and unknown pages return 404 after authentication');
if(process.argv.includes('--read-only')) { console.log(JSON.stringify(report,null,2)); process.exit(0); }
const forbidden=await fetch(base+'/api/inquiries',{method:'POST',headers:{Authorization:authorization,Origin:'https://example.test','Content-Type':'application/json',Accept:'application/json'},body:'{}'});assert.equal(forbidden.status,403);await forbidden.body.cancel();
const invalid=await fetch(base+'/api/inquiries',{method:'POST',headers:{Authorization:authorization,Origin:base,'Content-Type':'application/json',Accept:'application/json'},body:'{}'});assert.equal(invalid.status,422);await invalid.body.cancel();
check('Cross-origin and invalid submissions rejected');
const lead={name:'Synthetic Cloud Staging Tester',email:'staging@example.test',business:'Synthetic staging verification',website:'https://example.test',service:'focused_site',message:'Synthetic remote lifecycle check '+new Date().toISOString()};
const submit=()=>fetch(base+'/api/inquiries',{method:'POST',headers:{Authorization:authorization,Origin:base,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(lead)});
const first=await submit();assert.equal(first.status,202);const saved=await first.json();assert.match(saved.reference,/^[a-f0-9-]{36}$/);assert.match(saved.message,/No email was sent/);
const duplicate=await submit();assert.equal(duplicate.status,202);assert.equal((await duplicate.json()).reference,saved.reference);
const denied=await fetch(base+'/api/operator/inquiries',{headers:{Authorization:authorization,Accept:'application/json'}});assert.equal(denied.status,401);await denied.body.cancel();
const exported=await fetch(base+'/api/operator/inquiries',{headers:operator});assert.equal(exported.status,200);const record=(await exported.json()).records.find(x=>x.id===saved.reference);assert(record);assert.equal(record.synthetic,1);assert.equal(record.delivery_status,'synthetic');assert.equal(record.attempts,0);
check('Synthetic durable save, duplicate reference and separate operator authentication',{reference:saved.reference});
// Delete only the exact synthetic record created by this test, never other records.
const deleted=await fetch(base+'/api/operator/inquiries/'+saved.reference,{method:'DELETE',headers:{...operator,'X-Confirm-Delete':saved.reference}});assert.equal(deleted.status,200);await deleted.body.cancel();
const after=await fetch(base+'/api/operator/inquiries',{headers:operator});assert(!(await after.json()).records.some(x=>x.id===saved.reference));
check('Exact synthetic test record deleted and absence verified');
await writeFile(new URL('../evidence/remote-staging.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
