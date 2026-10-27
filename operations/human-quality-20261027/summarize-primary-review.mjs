import fs from 'node:fs';
import assert from 'node:assert/strict';
const batch=process.argv[2];
assert(/^residual-[a-z]+$/.test(batch));
const base='operations/human-quality-20261027/audits',folder=`output/human-quality-20261027/after-review/${batch}`;
const rows=fs.readFileSync(`${base}/local-after-${batch}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const packets=fs.readdirSync(folder).filter(x=>/^packet-\d+\.jsonl$/.test(x)).flatMap(x=>fs.readFileSync(`${folder}/${x}`,'utf8').trim().split(/\r?\n/).map(JSON.parse));
assert.equal(new Set(rows.map(x=>x.route)).size,rows.length);
for(const r of rows){const p=packets.find(x=>x.route===r.route);assert(p);assert.equal(r.candidateBodySha256,p.candidateBodySha256);assert.equal(r.draftSha256,p.draftSha256);assert.equal(r.finalScore,null);for(const e of Object.values(r.dimensionEvidence))assert(p.candidateMainText.includes(e.passage));}
const summary={batch,reviewer:'Codex primary',date:'2026-10-27',assigned:packets.length,reviewed:rows.length,status:rows.length===packets.length?'complete-content-only':'in-progress-content-only',nextPacket:rows.length===packets.length?null:Math.floor(rows.length/5)+1,passContent:rows.filter(x=>x.verdict==='pass-content').length,reviseContent:rows.filter(x=>x.verdict==='revise-content').length,validatedEvidenceFields:rows.length*6,holds:rows.filter(x=>x.requiredFixes.length).map(x=>({route:x.route,candidateBodySha256:x.candidateBodySha256,requiredFixes:x.requiredFixes,caps:x.appliedCaps})),limits:['Exact complete candidate reads; not independent.','Assigned neighbor compared; selected topical comparisons noted, comprehensive family audit pending.','Visuals/accessibility/final null; no publication acceptance.']};
fs.writeFileSync(`${base}/local-after-${batch}-summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({batch,reviewed:summary.reviewed,passContent:summary.passContent,reviseContent:summary.reviseContent,validatedEvidenceFields:summary.validatedEvidenceFields}));
