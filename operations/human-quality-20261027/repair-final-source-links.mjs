import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const research=read('evidence/human-quality-20261027/source-repair-research.json'),sourcePath='src/location-service-data.json',sources=read(sourcePath),briefPath='src/human-location-briefs.json',briefs=read(briefPath);
const records=[];
for(const finding of research.findings){
 assert.equal(finding.status,200);const entry=sources.find(r=>r.path===finding.route);assert(entry);const before=structuredClone(entry);
 const citation=entry.sources.find(r=>r.url===finding.originalUrl);assert(citation,finding.route+' original source');citation.url=finding.replacementUrl;entry.checkedDate='2026-10-27';
 if(finding.route.includes('/texas/'))citation.label+=' (published record, JSON)';
 else{
  assert.equal(finding.route,'/areas/pennsylvania/dauphin-county/');
  citation.label='Scott D. Portzline: additional services and appraisals';
  citation.observation='Describes value appraisals for estate settlement, sale and insurance purposes alongside tuning, repairs, moving and used-piano services; identifies Harrisburg-area coverage.';
  entry.lead='A piano owner preparing an estate settlement or sale may need a value appraisal before asking for maintenance. I help Dauphin County specialists explain the purpose of an appraisal alongside their tuning and repair work.';
  entry.decision='Scott D. Portzline Piano Services advertises Harrisburg-area service and describes value appraisals for estate settlement, sale and insurance purposes, alongside tuning, repairs and moving. For a piano-service website, I can clarify that appraisal offer or build a fuller introduction distinguishing the questions each service answers. An owner preparing an estate settlement or sale should be able to explain the decision and request an appraisal without being routed straight into a routine tuning appointment.';
  entry.scopes[0].check='An owner preparing an estate settlement or sale can request information about a particular piano without the website treating the inquiry as approval to tune or repair it.';
  entry.scopes[1].pages[0]='Estate or sale questions';entry.scopes[1].pages[1]='Appraisal and output discussion';
  entry.scopes[1].check='An owner seeking a value appraisal can understand what they receive and ask about later work without assuming that the appraisal includes repairs or guarantees acceptance by another party.';
  entry.planningTable.rows[0][3]='Can the customer explain an estate or selling question?';
 }
 records.push({path:entry.path,before,beforeSha256:hash(before),after:structuredClone(entry),afterSha256:hash(entry),research:{url:finding.replacementUrl,checkedAt:finding.checkedAt,rawResponse:finding.rawResponse,responseMetadata:finding.responseMetadata}});
}
assert.equal(records.length,7);
const route='/areas/pennsylvania/dauphin-county/',brief=briefs.find(r=>r.route===route),beforeBrief=structuredClone(brief);
brief.intro='An owner preparing an estate settlement or sale may need a value appraisal before discussing maintenance. Explain the appraisal’s actual output and keep later tuning, repair or moving work separately agreed.';
brief.customerQuestion='Can I request a piano value appraisal for an estate or sale without booking tuning or repairs?';
brief.sourceBridge='Scott D. Portzline Piano Services describes value appraisals for estate settlement, sale and insurance purposes alongside tuning, repairs, moving and used-piano services. Its Harrisburg-area service includes the Dauphin County market.';
let draftMatches=0;
for(let part=1;part<=6;part++){
 const path=`operations/human-quality-20261027/drafts/local-${part}.jsonl`,rows=fs.readFileSync(path,'utf8').trim().split(/\r?\n/).map(JSON.parse),draft=rows.find(r=>r.route===route);if(!draft)continue;
 for(const key of ['intro','customerQuestion','sourceBridge']){assert.equal(draft[key],beforeBrief[key]);draft[key]=brief[key];}
 fs.writeFileSync(path,rows.map(JSON.stringify).join('\n')+'\n');draftMatches++;
}
assert.equal(draftMatches,1);
const ledger={date:'2026-10-27',reviewer:'Codex primary; seven live source records independently researched by Astra',basis:'Replace seven confirmed404 citations with live official sources; disclose six JSON published records. Correct the piano appraisal attribution and example to supported value-appraisal/estate/sale purposes. Preserve all routes, commercial terms and unrelated content.',records,briefs:[{route,before:beforeBrief,beforeSha256:hash(beforeBrief),after:brief,afterSha256:hash(brief)}]};
const ledgerPath='tests/fixtures/human-quality-final-source-links.json';assert(!fs.existsSync(ledgerPath),'Do not rerun the source repair');
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');fs.writeFileSync(sourcePath,JSON.stringify(sources,null,2)+'\n');fs.writeFileSync(briefPath,JSON.stringify(briefs,null,2)+'\n');
console.log(JSON.stringify({sourceRecords:records.length,authoredBriefs:1,draftMatches}));
