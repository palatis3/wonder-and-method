// One-use acceptance of documented editorial changes, retaining prior frozen tests.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(resolve(root,p),'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const pages=fs.readFileSync(resolve(root,'output/human-quality-20261027/inventory/pages.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
const baseline=new Map(pages.filter(p=>p.sourceIdentity.sourceEntry).map(p=>[p.route,p.sourceIdentity.sourceEntry]));
const current=read('src/location-service-data.json'),ux=read('tests/fixtures/ux-copy-edits.json');
for(const row of ux.records)assert.equal(hash(baseline.get(row.path)),row.afterSha256,row.path+' accepted UX intermediate');
const evidenceFiles=fs.readdirSync(resolve(import.meta.dirname,'research')).filter(p=>p.endsWith('.json')).map(file=>({file:'operations/human-quality-20261027/research/'+file,text:fs.readFileSync(resolve(import.meta.dirname,'research',file),'utf8')}));
const allowed=new Set(['lead','decisionTitle','decision','scopes','scopeTrigger','quoteQuestions','coverageNote','sources','description','checkedDate','legacyWorksheetRetired','relatedGuides','planningTable']);
const records=[];
for(const after of current){
 const before=baseline.get(after.path);assert(before,after.path);if(hash(before)===hash(after))continue;
 const edits=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(key=>({key,beforeExists:Object.hasOwn(before,key),afterExists:Object.hasOwn(after,key),before:before[key],after:after[key]}));
 for(const edit of edits)assert(allowed.has(edit.key),after.path+' unexpected field '+edit.key);
 const evidence=evidenceFiles.filter(e=>e.text.includes(after.path)).map(e=>e.file);assert(evidence.length,after.path+' needs recorded change evidence');
 records.push({path:after.path,beforeSha256:hash(before),afterSha256:hash(after),beforeKeys:Object.keys(before),edits,reviewEvidence:evidence});
}
assert.equal(records.length,86);
const beforeFaqs=JSON.parse(execFileSync('git',['show','HEAD:src/service-faqs.json'],{cwd:root,maxBuffer:10000000}));
for(const row of ux.faqs)assert.equal(hash(beforeFaqs[row.path]),row.afterSha256,row.path+' accepted UX FAQ');
const nowFaqs=read('src/service-faqs.json'),faqs=[];
for(const path of new Set([...Object.keys(beforeFaqs),...Object.keys(nowFaqs)])){
 const before=beforeFaqs[path],after=nowFaqs[path];if(hash(before)===hash(after))continue;
 const evidence=evidenceFiles.filter(e=>e.text.includes(path)).map(e=>e.file);
 if(path==='/services/website-redesign/')evidence.push('operations/human-quality-20261027/audits/services-final-independent.jsonl');
 assert(evidence.length,path+' FAQ needs change evidence');
 faqs.push({path,beforeSha256:hash(before),afterSha256:hash(after),before,after,reviewEvidence:evidence});
}
assert.equal(faqs.length,13);
fs.writeFileSync(resolve(root,'tests/fixtures/human-quality-edits.json'),JSON.stringify({schemaVersion:1,scope:'Exact editorial source/FAQ changes only. No visual, accessibility or release acceptance.',baselineInventorySha256:hash(pages.map(p=>[p.route,p.baselineRenderedSha256])),records,faqs},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({records:records.length,faqs:faqs.length}));
