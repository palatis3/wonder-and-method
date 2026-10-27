// Four substantive distinctions identified by manual cross-state comparison.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',target=root+'/research/family-four-repair.json';assert(!fs.existsSync(target));
const audit=JSON.parse(fs.readFileSync(root+'/audits/family-comparison-20261027.json','utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const files=[1,2,3,4,5,6].map(partition=>({partition,file:`${root}/drafts/local-${partition}.jsonl`,rows:fs.readFileSync(`${root}/drafts/local-${partition}.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse)}));
const sourceFile='src/location-service-data.json',sources=JSON.parse(fs.readFileSync(sourceFile,'utf8')),edits=[],records=[];
function edit(route,change){const f=files.find(f=>f.rows.some(d=>d.route===route)),d=f.rows.find(d=>d.route===route),r=audit.findings.find(r=>r.repairRoute===route);assert(r);assert.equal(hash(d),r.draftSha256[r.routes.indexOf(route)]);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);edits.push({route,partition:f.partition,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:[r.assessment]});}
function source(route,text){const s=sources.find(s=>s.path===route),before=structuredClone(s);s.sources[0].observation=text;s.checkedDate='2026-10-27';records.push({route,before,after:structuredClone(s),beforeSha256:hash(before),afterSha256:hash(s)});}
edit('/areas/florida/suwannee-county/',d=>{
 d.heading='Keep presenter and audience print versions separate.';
 d.intro='One event can need a bound presenter report and a shorter audience handout. A print inquiry should identify the approved content, finishing and quantity for each version so a shared file folder does not turn into one undifferentiated print order.';
 d.customerQuestion='How do we order presenter reports and audience handouts without sending every page to both groups?';
 d.decisions=[
 {label:'Name the two finished outputs',body:'Fictional workshop brief: twelve presenters need a bound twenty-page report with a four-page appendix; sixty attendees need a separate two-page handout. These are invented planning quantities, not shop minimums. Name the presenter report and attendee handout as different outputs before discussing paper or binding.'},
 {label:'Attach the correct content to each version',body:'The presenter report includes its appendix in every bound copy; the attendee handout uses only the approved two-page file. Give each output a clear file name and revision reference, with its intended page order. A shared event name should not cause the appendix to enter the handout or make an old draft the production source.'},
 {label:'Review quantities and finishing independently',body:'Keep twelve complete bound reports separate from sixty loose handouts in the quote request. Use the shop’s accepted preparation and review process to confirm covers, sidedness and finishing for each. One accepted version should not be treated as approval of the other, and the event date remains a needed-by request until the printer agrees completion.'}
 ];
 d.ownerInputs=['Approved presenter and attendee files, revisions and content lists.','Separate finished quantities, binding and paper preferences.','Current proof review and collection or delivery process.'];
 d.sourceBridge='The UPS Store in Live Oak lists presentation printing, binding, covers, collating and paper options. Those capabilities support this fictional two-audience brief: the website can distinguish content versions before the printer reviews production.';
});
edit('/areas/north-carolina/pasquotank-county/',d=>{
 d.heading='Show what a vehicle-graphics approval actually covers.';
 d.intro='Approving a design is one stage between consultation and installation. Explain which vehicle and proof the decision applies to, so a customer can resolve one item without accidentally approving an unmeasured vehicle or a later installation date.';
 d.customerQuestion='We approved the van design, but the trailer still needs measuring. What has actually been agreed?';
 d.decisions=[
 {label:'Separate measurements from the proposed design',body:'F&H describes consultation and precise measurement before developing graphics, followed by design approval, printing and installation. Show those stages with the actual vehicle reference. A picture of a similar van can explain the intended appearance, but it does not establish measurements for the customer’s trailer.'},
 {label:'Name the exact item being approved',body:'In a fictional project, van proof V2 is ready for the customer’s review while trailer measurements remain outstanding. The approval instruction should identify V2 and the van; it must not read “approve all fleet graphics.” Keep the trailer unresolved and ask the shop how it records that separate decision. This is a content example, not a claim that F&H uses these proof codes.'},
 {label:'Explain what happens after the decision',body:'Give the customer the shop’s actual next step after approval and a contact for a correction before production. Do not display an installation date as confirmed merely because artwork has been approved. Whether part of a multi-vehicle job can proceed separately remains the shop’s scheduling and production decision.'}
 ];
 d.ownerInputs=['Actual measurement, proof and production stages.','Vehicle-specific approval wording and correction contact.','The message that confirms an installation arrangement.'];
 d.sourceBridge='F&H Print Sign Design in Elizabeth City publishes a consultation-to-measurement-to-approval workflow before printing and installation. The local example supports a precise approval explanation; it does not establish an online proofing tool or a guaranteed production schedule.';
 d.limits='The shop confirms measurements, artwork, suitability and production arrangements. A public workflow explanation can support its existing process; proofing accounts, status tracking and scheduling integrations require separate scope.';
});
source('/areas/north-carolina/pasquotank-county/','Describes consultation and measurement, then custom design approval before printing and installation. Offers graphics across several vehicle categories; no live proofing or scheduling capability is inferred.');
edit('/areas/vermont/washington-county/',d=>{
 d.heading='Distinguish a mailing campaign from ongoing order fulfillment.';
 d.intro='A single postcard mailing and a stream of internet orders need different release instructions. Explain when each job is ready to be sent, what an order contains and who resolves changes before promising that printing includes the whole distribution process.';
 d.customerQuestion='Are we handing over one mailing list, or asking you to fulfill separate orders as they arrive?';
 d.decisions=[
 {label:'Identify one campaign or recurring releases',body:'Leahy Press in Montpelier lists mailing and fulfillment from direct-mail postcards to internet orders. A fictional campaign with one approved audience list is different from individual catalogue orders arriving over several weeks. Ask which pattern the buyer needs instead of treating both as one bulk delivery.'},
 {label:'Describe the contents of one order',body:'For the fictional recurring job, an order might contain one current catalogue and one matching price insert. The buyer must identify the approved editions and what should happen when one item changes or becomes unavailable. Ask the printer which packing, stock and release responsibilities it can accept; its general fulfillment offer does not specify every one of these arrangements.'},
 {label:'Agree how orders and exceptions reach staff',body:'Explain the existing method for handing over approved orders and handling a correction before dispatch. A first inquiry can state the anticipated frequency and exception questions without uploading customer lists. A website explanation does not create automatic synchronization with an online shop or guarantee that a later address change reaches an already released parcel.'}
 ];
 d.ownerInputs=['Campaign or recurring-order pattern and intended release frequency.','Approved item editions and the packing or stock tasks requested.','Actual order-transfer method, correction contact and dispatch confirmation.'];
 d.sourceBridge='Leahy Press explicitly offers direct-mail work and internet-order fulfillment alongside printing. That distinction supports a release-and-exception brief for recurring orders, beyond deciding who collects a finished print run.';
 d.limits='The printer confirms fulfillment scope, files, stock arrangements and timing. Ordering software, inventory synchronization and automatic customer-data transfer require separate assessment.';
});
source('/areas/vermont/washington-county/','Lists printing and mailing/fulfillment services covering direct-mail postcards and internet orders. Detailed stock, packing, release and system-integration arrangements require a project discussion.');
edit('/areas/new-hampshire/hillsborough-county/',d=>{
 d.heading='Keep a garment substitution attached to the right part of the quote.';
 d.intro='Changing one catalogue item can affect its artwork and price without changing the rest of a mixed order. Explain how customers identify the replacement and what staff must review again, instead of letting a new picture silently replace the whole brief.';
 d.customerQuestion='Can we change the hoodie style while keeping the approved shirt group unchanged?';
 d.decisions=[
 {label:'Identify the item being replaced',body:'Wicked Apparel’s catalogue and image-supported quote route provide a starting point for a change request. In a fictional brief, twenty white shirts stay as quoted while eight navy hoodies change to another catalogue style. Name the old and proposed hoodie references and retain the size breakdown; these invented quantities are not a minimum order or a claim of stock.'},
 {label:'Carry the decoration questions into the change',body:'State whether the hoodie’s front logo and any back artwork should remain, then ask the shop to assess the new garment and print area. A replacement product photo is a reference, not proof that the old decoration or price still applies. Keep the unchanged shirts separate so the amendment does not accidentally request new artwork for every item.'},
 {label:'Wait for the revised quote or approval',body:'Use the shop’s actual correction route to identify which part of the earlier request changes. Keep the desired completion date as a question during review; a customer message alone does not confirm availability, a revised price or production permission. Staff decides the printing method and communicates the accepted change.'}
 ];
 d.ownerInputs=['Old and proposed catalogue references with each group’s size quantities.','Artwork placements to retain or review on the replacement garment.','Current quote-revision route and accepted-change confirmation.'];
 d.sourceBridge='Wicked Apparel in Manchester connects catalogue selection with an image-supported screen-printing quote. That combination supports a clearly labeled substitution request, while the shop retains product and production decisions.';
 d.limits='The shop confirms product availability, decoration suitability, price and timing. The example explains a change through the existing inquiry process; it does not add a live configurator or approve a substitute automatically.';
});
assert.equal(edits.length,4);assert.equal(records.length,2);
const routes=edits.map(e=>e.route);
const receipt={date:'2026-10-27',status:'implemented-pending-independent-recheck',routes,drafts:edits,records,faqs:[],reviewEvidence:[root+'/audits/family-comparison-20261027.json'],sourceChecks:[root+'/research/family-four-source-checks.json'],limits:'Four complete brief revisions distinguish multi-audience output, vehicle-specific proof approval, recurring fulfillment and a garment substitution. Fictional examples are explicit. No route or indexing policy changes and no brief import yet.'};
for(const f of files)if(edits.some(e=>e.partition===f.partition))fs.writeFileSync(f.file,f.rows.map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
fs.writeFileSync(target,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/family-four-repair-routes.json',JSON.stringify(routes,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:4,sourceRecords:2,imported:false}));
