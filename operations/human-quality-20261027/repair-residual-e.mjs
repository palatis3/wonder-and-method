import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receipt=root+'/research/residual-e-repair.json';
assert(!fs.existsSync(receipt),'Repair already applied');
const file=root+'/drafts/local-5.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-e.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),edits=[];
function edit(route,change){const d=rows.find(r=>r.route===route),r=reviews.find(r=>r.route===route);assert(d&&r?.requiredFixes.length);assert.equal(hash(d),r.draftSha256);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);edits.push({route,partition:5,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:r.requiredFixes});}
edit('/areas/queens-county/',d=>{d.limits='Studio staff confirm materials and access. New access systems or automated acceptance require separate assessment; the public website can prepare the artist’s question without approving the firing or granting workspace.';});
edit('/areas/schenectady-county/',d=>{
 d.decisions[2].label='Keep the collection plan with every item';
 d.decisions[2].body='Use the business’s actual confirmation process to keep each product and quantity visible in the fulfillment plan. A fictional organizer asking for embroidered shirts and engraved gifts should be able to ask, “Will these be ready for one collection, or would we need separate arrangements?” Do not let readiness of the shirts stand in for readiness of the gifts.';
 d.limits='The business confirms production acceptance, dates and readiness for each item. Automated fulfillment coordination requires separate scope; a clear summary can support the existing staff review.';
});
edit('/areas/tennessee/davidson-county/',d=>{
 d.decisions[2].body='Ask what the customer already has, what help is needed and what result is being discussed. Preserve combined-package relationships through the existing booking or quote destination. A customer seeking finishing for an existing recording should retain that starting point rather than arrive as an unexplained room-time request.';
 d.limits='The studio confirms package details and arrangements. Shared calendars, engineer scheduling and payment integrations require separate scope.';
});
edit('/areas/texas/bailey-county/',d=>{
 d.decisions[2].label='Bring hours and priority into the request';
 d.decisions[2].body='Keep the proposed event hours and any setup time with the purpose and charge description sent to staff. Explain the facility’s actual operating-hour limits and library or city priority rules. An organizer should know which contact reviews the complete request and whether a different time needs discussion before treating a preferred slot as reserved.';
});
assert.equal(edits.length,4);
fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(receipt,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(r=>r.route),drafts:edits,records:[],faqs:[],reviewEvidence:[root+'/audits/local-after-residual-e.jsonl'],limits:'Draft-only corrections to four diagnosed pages. Original FAQs, source entries and historical audits retained; independent exact recheck before import.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:edits.length,imported:false}));
