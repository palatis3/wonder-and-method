// Selected precision and repetition improvements from completed independent H150 review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-h-repair.json';
assert(!fs.existsSync(receiptFile),'Repair already applied');
const file=root+'/drafts/local-2.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-h.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(reviews.length,150);
const sourceFile='src/location-service-data.json',sources=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),edits=[],sourceEdits=[];
function edit(route,change){const d=rows.find(r=>r.route===route),r=reviews.find(r=>r.route===route);assert(d&&r?.recommendedFixes.length,route);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);assert.notEqual(hash(d),hash(before));edits.push({route,partition:2,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),recommendedFixes:r.recommendedFixes});}
function source(route,change,fresh=false){const s=sources.find(x=>x.path===route),r=reviews.find(r=>r.route===route);assert(s&&r);assert.equal(hash(s),r.sourceEntrySha256,route);const before=structuredClone(s);change(s);if(fresh)s.checkedDate='2026-10-27';sourceEdits.push({route,before,after:structuredClone(s),beforeSha256:hash(before),afterSha256:hash(s)});}
function replace(d,key,from,to=''){assert(d[key].includes(from),d.route+' '+from);d[key]=d[key].replace(from,to).trim();}
edit('/areas/iowa/henry-county/',d=>{d.customerQuestion='Which building holds the collection I want, and how should I check access before visiting?';});
edit('/areas/iowa/louisa-county/',d=>{
 replace(d,'limits',' The reusable lesson belongs in concise guidance; a long local page should not repeat it without additional useful detail.');
 d.decisions[2].body='Ask for the desired experience and date through the current staff route. Staff can discuss what is possible and supply instructions for the arrangement they confirm. Keep the request clear about whether the group wants the outdoor grounds, the visitor center or both.';
});
edit('/areas/iowa/marshall-county/',d=>replace(d,'limits',' The general meal-preparation lesson should remain concise rather than become another long local explanation.'));
edit('/areas/iowa/osceola-county/',d=>replace(d,'limits','The reusable booking-method lesson should remain concise; new reservation systems','New reservation systems'));
edit('/areas/iowa/sac-county/',d=>replace(d,'limits',' Keep this reusable explanation brief rather than repeating it through multiple planning sections.'));
edit('/areas/iowa/tama-county/',d=>{
 replace(d,'limits',' Keep the common open-grounds/limited-building lesson brief unless additional local decisions need explanation.');
 d.decisions[2].body='State that rental use depends on the center’s camps, educational programs and park events. An empty-looking weekday is not proof that the space can be hired. Keep the proposed event date and purpose with the room inquiry for staff review.';
});
edit('/areas/kentucky/jackson-county/',d=>{d.limits='The provider determines suitable work, technical methods and access arrangements for the actual property.';});
edit('/areas/kentucky/johnson-county/',d=>{d.limits='The florist confirms the delivery arrangement through its actual order-review process.';});
edit('/areas/kentucky/knott-county/',d=>{d.limits='The appropriate seller confirms availability and purchase arrangements for the selected model.';});
edit('/areas/kentucky/lee-county/',d=>{d.limits='The operator confirms current equipment services, handoffs and the inclusions of each outing.';});
edit('/areas/kentucky/lincoln-county/',d=>{d.limits='The cabinet designer confirms fit, suitability and the final accessory specification.';});
edit('/areas/kentucky/livingston-county/',d=>{d.limits='The operator confirms the current format, participation requirements and arrangements for each offer.';});
edit('/areas/kentucky/shelby-county/',d=>{
 d.heading='Recheck the engraved message when the award format changes';
 d.customerQuestion='If we choose a different award size or format, what wording needs another review?';
 d.decisions[1].body='Use accurate photographs to distinguish a wall plaque from a freestanding award and record the intended display space. Keep the selected size and format beside the proposed message so a later product change is visible to the person reviewing engraving.';
 d.decisions[2].body='For an illustrative request, an organizer first considers a large wall plaque, then chooses a smaller freestanding award. Carry the recognition message into a fresh engraving review rather than assuming the earlier layout will fit. Ask staff whether wording, line breaks or another approved format needs discussion before final text is accepted.';
});
edit('/areas/louisiana/east-feliciana-parish/',d=>{
 replace(d,'sourceBridge','the baseline notice was checked October 24, 2026','the public notice was checked October 27, 2026');
 replace(d,'limits','Recheck this temporary notice before publication.','Keep the temporary notice dated and assign its next review.');
});
source('/areas/louisiana/east-feliciana-parish/',s=>{s.sources[0].observation='The public notice, rechecked October 27, 2026, identifies the former Barn Hill Preserve/Magnolia Wilds property, honors previously scheduled tours and otter swims, and provides help alongside new-booking information. Individual terms beyond that notice remain for the operator.';},true);
edit('/areas/louisiana/rapides-parish/',d=>{assert(d.decisions[1].body.includes('In the published example'));d.decisions[1].body=d.decisions[1].body.replace('In the published example','In an illustrative example');});
edit('/areas/maine/washington-county/',d=>{
 d.sourceBridge='Raye’s Mustard tells the story of its Eastport mill. Its public contact page, checked October 27, 2026, separately lists gift-shop hours, labels the production mill closed to the public and says tours remain paused until further notice. Retail visiting and production access therefore need distinct explanations.';
 replace(d,'limits','The owner confirms current visitor arrangements before publication.','The owner confirms visitor arrangements and approves later status updates.');
});
source('/areas/maine/washington-county/',s=>{const a=s.sources.find(x=>x.url==='https://rayesmustard.com/pages/contact-us');assert(a);a.observation='The contact page, rechecked October 27, 2026, gives gift-shop fall hours separately, labels the production mill closed to the public and states that tours are not offered until further notice.';},true);
edit('/areas/maryland/caroline-county/',d=>{
 d.decisions[0].body='Begin with the work already planned: custom home, renovation or addition, the available drawing set and its author. If an outside architect is involved, keep that relationship visible when asking the builder about the project. Someone without plans can still describe an idea without inventing a completed design.';
 d.decisions[1].body='Ask what has changed since the drawings were prepared. In an illustrative addition inquiry, the homeowner now wants a different room layout from the architect’s existing plan. Keep the original reference, proposed change and architect’s role together for discussion; the old drawing should not silently become the customer’s final intention or imply that the builder has accepted design responsibility.';
});
source('/areas/maryland/prince-georges-county/',s=>{
 s.coverageNote='For website projects across Prince George’s County, including Bowie and Upper Marlboro. Pyramid Atlantic Art Center’s Hyattsville studios provide the public planning example. Wonder and Method works online from Buffalo, New York. Named organizations are public examples, not clients, partners or endorsements.';
});
assert.equal(edits.length,17);assert.equal(sourceEdits.length,3);
const routes=[...new Set([...edits,...sourceEdits].map(e=>e.route))];assert.equal(routes.length,18);
const receipt={date:'2026-10-27',status:'implemented-pending-independent-recheck',routes,reviewEvidence:[root+'/audits/local-after-residual-h.jsonl'],drafts:edits,records:sourceEdits,faqs:[],sourceChecks:[{url:'https://www.sanctuaryhillla.org/',checkedDate:'2026-10-27',fact:'Previous tours/otter swims honored; current/former names and existing-help/new-booking routes retained.'},{url:'https://rayesmustard.com/pages/contact-us',checkedDate:'2026-10-27',fact:'Gift-shop hours separate; production mill closed to public; tours paused until further notice.'}],limits:'Eighteen selected optional precision/coherence improvements: seventeen drafts, three source records. No FAQs or imported briefs changed. Hypothetical engraving and revised-plan examples explicitly illustrative. Independent exact-body recheck required.'};
fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-h-repair-routes.json',JSON.stringify(routes,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({routes:routes.length,drafts:edits.length,sourceRecords:sourceEdits.length,imported:false}));
