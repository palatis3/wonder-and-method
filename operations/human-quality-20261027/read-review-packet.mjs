// A bounded display aid. Exact shared lines already read in the root-corrections
// checkpoint are cross-referenced, not rescored or treated as fresh evidence.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [batch,number]=process.argv.slice(2),root='output/human-quality-20261027/after-review';
const sharedRecords=[1,2].flatMap(i=>fs.readFileSync(`${root}/root-corrections/packet-00${i}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse));
const counts=new Map();for(const r of sharedRecords)for(const line of new Set(r.candidateMainText.split('\n')))counts.set(line,(counts.get(line)||0)+1);
const shared=new Set([...counts].filter(([,n])=>n>=7).map(([line])=>line));
const rows=fs.readFileSync(`${root}/${batch}/packet-${number.padStart(3,'0')}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse);
for(const r of rows){const lines=r.candidateMainText.split('\n');console.log(JSON.stringify({route:r.route,candidateBodySha256:r.candidateBodySha256,sharedExactLinesCrossReferenced:lines.filter(l=>shared.has(l)).length,mainText:lines.filter(l=>!shared.has(l)).join('\n'),sourceUrls:r.sourceEntry.sources.map(s=>s.url),sibling:rows.some(x=>x.route===r.nearestSibling.route)?{route:r.nearestSibling.route,reference:'Complete candidate also displayed in this packet; compare its text directly.'}:r.nearestSibling.draft}));}
console.log(JSON.stringify({sharedLineSetSha256:createHash('sha256').update(JSON.stringify([...shared])).digest('hex'),sharedLineCount:shared.size,reference:'Nine complete root-corrections candidate reads; only lines present in at least seven of those pages omitted from this display.'}));
