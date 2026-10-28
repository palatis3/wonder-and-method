// One-use revalidation after primary reading of all41 target-guide paragraph deltas.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {locationPurposeFingerprint,guidePurposeFingerprint} from '../../scripts/site-quality-rules.mjs';
const base='operations/human-quality-20261027',file='operations/google-quality-audit-20261023/related-guide-review.json',hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const old=JSON.parse(fs.readFileSync(file)),entries=JSON.parse(fs.readFileSync('src/location-service-data.json')),delta=JSON.parse(fs.readFileSync('evidence/human-quality-20261027/guide-relevance-deltas.json'));
const content=fs.readFileSync('output/human-quality-20261027/release-content/pages.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const notes=[
'The added claim-review opening preserves the original fact-checking process.',
'Artwork approval, installation and permitting ownership remain separate; the revised headings and source observations make the same boundary easier to follow.',
'The new pending message preserves the distinction between login, application and trade approval.',
'The class record retains take-home/storage and category-specific cancellation distinctions; no universal deadline is introduced.',
'The added failure sequence and platform subheadings preserve saved-record, notification and receiving checks.',
'The condensed HVAC/roofing comparison retains accepted work, role evidence, first-contact inputs and unconfirmed inquiry status.',
'The inquiry/production messages preserve deadlines, quantities, proof approval and actual submission channels.',
'The arrival card retains check-in address, vehicle-specific parking, access needs and separately confirmed return instructions.',
'The comparison still distinguishes tour access, party eligibility, selected carriage and return arrangements; the unresolved duration remains unresolved.',
'Event-state and update-owner guidance retain ended, upcoming and unconfirmed participation boundaries; expired invitations do not roll forward.',
'The revised ferry record retains the separate passenger, vehicle, equipment, return and stay confirmations and fare boundaries.',
'The added fictional chain preserves the terminal-to-property dependency and does not make ferry arrival a last-mile confirmation.',
'The added proposal-evidence prompt and headings preserve provider comparison by scope, collaboration and ownership.',
'The document row and fictional label retain technical ownership, approved revision, intended use and restricted-document boundaries.',
'Pending and failed examples extend the existing truthful inquiry receipt states.',
'The payment card retains provider-specific charges, parking instructions and mainland preparation without a cash-only island claim.',
'The change log preserves outside-service dependency, unresolved evidence and held combined-offer guidance.',
'The sample access question preserves assistance confirmation before payment and avoids diagnostic or medical-history collection.',
'RFQ receipt and revision messages preserve known-engineering/original/concept routing and separate quotation readiness from production approval.',
'The pending visit message retains location, access, facility and scope dependencies, including rechecking choices after a location change.',
'The three-arrangement record retains independent lodging, event and stall owners; requested status is not confirmation.',
'The specialist handoff retains equipment configuration, changed-condition review and explicit non-approval of fit.',
'The fictional initials preview preserves actual displayed-result approval and reapproval after product/text/style changes.',
'The two-address record retains separate loading-access ownership and jurisdiction-dependent checks without determining permit requirements.',
'The sample confirmation preserves separate session and property/location permission states.',
'Consolidating shared contact fields retains each task’s four other fields and six-field total, including optional timing.',
'Inspection and repair examples retain per-unit approvals, estimate references, shipment boundaries and truthful unresolved status.',
'Heading changes retain the selected river section, dated release plan and actual operator-confirmed trip distinction.',
'The condensed comparison preserves substantial distinct task value, maintained coverage, owner evidence and the option to use the existing service page.',
'The staged kitchen record preserves intended use, scale and timing for routing; detailed onboarding is deferred and no acceptance criteria are invented.',
'The fictional Friday correction preserves dispatch versus arrival and returning from a separate accepted quote.',
'The confirmation card and evidence library retain selected product, time zone, check-in, admission and separate reservation dependencies.',
'The property comparison retains unit-specific minimum stays and conditions; an alternative remains a separate offer requiring guest acceptance.',
'The outcome table preserves separate provider capacity, location readiness, fallback choice and operator-approved payment/weather/cancellation terms.',
'The condensed page-purpose table retains accepted work, boundaries, permissioned evidence, owner approval and actual inquiry arrangements.',
'The blocked-release example and consolidated sequence retain receiving checks, account ownership, recoverability and public retesting.',
'The responsibility split retains maintenance logs, timing and interruption distinctions, plus unchanged explicit care exclusions elsewhere in the complete article.',
'The inventory already contains keep/rewrite/merge/retire examples; consolidation preserves matching redirects, no-replacement responses, worksheet, live checks and traffic-diagnosis limits.',
'The editing fields preserve update frequency, browser-editing requirements, named responsibility and the studio’s source-file handoff boundary.',
'The dependency sequence preserves inputs, approvals, active build versus elapsed review time and unchanged package allowances.',
'The cart example preserves pack quantity, backorders, requested dispatch and buyer approval as separate readiness checks.'
];assert.equal(notes.length,delta.length);assert.equal(delta.length,41);
const guides=delta.map((d,i)=>{const bound=content.find(r=>r.route===d.route);assert(bound);const baseline=fs.readFileSync('output/human-quality-20261027/baseline-dist'+d.route+'index.html','utf8'),current=fs.readFileSync('dist'+d.route+'index.html','utf8');assert.equal(guidePurposeFingerprint(baseline),d.before);assert.equal(guidePurposeFingerprint(current),d.after);for(const r of old.filter(r=>r.to===d.route))assert.equal(r.guidePurposeSha256,d.before);return {...d,disposition:'retain-existing-connections',reason:notes[i],currentContentReview:bound.review,paragraphDeltaRead:true};});
const guideByPath=new Map(guides.map(g=>[g.route,g])),pairs=new Map(entries.flatMap(e=>(e.relatedGuides||[]).map(l=>[e.path+' -> '+l.path,{entry:e,link:l}]))),retained=[],removed=[];
for(const row of old){const pair=pairs.get(row.from+' -> '+row.to);if(!pair){removed.push(row);continue;}
 assert.equal(row.locationPurposeSha256,locationPurposeFingerprint(pair.entry));assert.equal(row.label,pair.link.label);assert(row.reason.trim());
 const g=guideByPath.get(row.to);assert(g);const local=content.find(r=>r.route===row.from);assert(local);assert.equal(local.appliedCaps.length,0);
 retained.push({...row,reviewedAt:'2026-10-27',guidePurposeSha256:g.after,reviewMethod:'Primary complete target-guide paragraph-delta review plus current complete content acceptance; prior exact local purpose, destination, label and rationale retained unchanged. No new per-pair independent review claimed.',reviewEvidence:base+'/guide-connection-revalidation.json',priorReviewSha256:hash(row)});
}assert.equal(retained.length,2675);assert.equal(removed.length,30);assert.equal(pairs.size,2675);assert.equal(new Set(retained.map(r=>r.from+' -> '+r.to)).size,2675);
const ledgers=fs.readdirSync('tests/fixtures').filter(f=>/^human-quality.*edits\.json$/.test(f)).map(f=>({file:'tests/fixtures/'+f,value:JSON.parse(fs.readFileSync('tests/fixtures/'+f))}));
const removedBindings=removed.map(row=>{let match;for(const ledger of ledgers)for(const record of ledger.value.records??[]){if(record.path!==row.from)continue;const edit=record.edits?.find(e=>e.key==='relatedGuides'),before=edit?.before??record.before?.relatedGuides,after=edit?.after??record.after?.relatedGuides;if(before?.some(l=>l.path===row.to)&&after&&!after.some(l=>l.path===row.to))match={record,file:ledger.file};}assert(match,row.from+' missing reviewed related-link removal');return {from:row.from,to:row.to,priorReviewSha256:hash(row),acceptanceFixture:match.file,acceptanceRecordSha256:hash(match.record)};});
const report={date:'2026-10-27',reviewer:'Codex primary',status:'accepted-exact-guide-deltas-and-retained-connections',priorAuthoritySha256:hash(old),newAuthoritySha256:hash(retained),retainedConnections:2675,removedObsoleteApprovals:30,locationPurposeLabelAndRationaleUnchanged:true,currentFullContentCoverage:2394,guides,removed:removedBindings,limits:['All41 changed target-guide paragraph sets read in this revalidation. Existing complete guide and local reviews are referenced; unchanged article paragraphs and prior2675 individual rationales were not all reread again.','This is primary revalidation with explicit inherited evidence, not a new independent review of2675 pairs.','Removed approvals correspond only to previously reviewed source link removals. No new public links or indexing changes.']};
fs.writeFileSync(base+'/guide-connection-revalidation.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.writeFileSync(file,JSON.stringify(retained,null,2)+'\n');console.log('Revalidated41 guide deltas; retained2675 exact connections and removed30 obsolete approvals.');
