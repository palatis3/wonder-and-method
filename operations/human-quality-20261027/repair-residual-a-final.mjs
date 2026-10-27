// One-use implementation of twenty exact reviewed findings; imports await recheck.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=`${root}/research/residual-a-final-repair.json`;
assert(!fs.existsSync(receiptFile),'Repair already applied');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const file=`${root}/drafts/local-1.jsonl`,rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(`${root}/audits/local-after-residual-a.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse),edits=[];
function edit(route,change){const d=rows.find(x=>x.route===route),r=reviews.find(x=>x.route===route);assert(d&&r);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.route,before.route);assert.equal(d.inputHash,before.inputHash);edits.push({route,partition:1,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d)});}
edit('/areas/florida/polk-county/',d=>{
 d.decisions[1].body='Fictional comparison: “This machine has stopped moving as expected; I have its identification and a photograph, but no drawing” starts an equipment-assessment discussion. “I need a new bracket and have a sketch showing its intended use” starts a component discussion. Keep the known reference, observed problem or proposed result with each request. Share technical files later through the shop’s approved route.';
 d.sourceBridge='Independent Machine Works at 2810 Parkway Street in Lakeland introduces CNC machining, fabrication and welding, and equipment repair. Those categories support different starting conversations. The two requests above are fictional illustrations, not completed jobs or promises that the shop accepts either item.';
 d.limits='The shop and qualified specialists determine accepted work, engineering and manufacturing methods. CAD exchange, confidential-file systems, instant quoting and production tracking require separate scope.';
});
edit('/areas/florida/st-lucie-county/',d=>{
 d.decisions[0].body='Fictional consultation brief: “The folded clothes overflow onto a chair, daily-use items are hard to reach, and the closet door shares space with our dresser. We have not chosen finishes.” Keep the overflowing items, access difficulty and room constraint as separate questions. The household can describe daily use without choosing dimensions or an accessory system.';
 d.sourceBridge='Chalet’s Custom Closets describes in-home consultation, 3D design, selection, manufacture, installation and walkthrough, and names Port St. Lucie and Fort Pierce among served places. The fictional brief above illustrates preparation for that discussion; it is not a completed project or a promised storage result.';
});
edit('/areas/florida/taylor-county/',d=>{
 d.decisions[0].body='Fictional partial-record inquiry: “Our existing frame is at [site]. The label reads [visible maker/reference]; the original project paperwork is missing. The cover is torn and we want to discuss replacement, possibly in another color.” Keep the visible identifier, missing records, current concern and requested change distinct. Staff can explain which photographs or additional records they need without the customer guessing dimensions or compatibility.';
 d.sourceBridge='Big Top Manufacturing identifies its headquarters in Perry and describes replacement fabric membranes designed around existing frames alongside new-structure work. The fictional inquiry keeps the existing asset at the center of that discussion without asserting that a particular frame can accept a replacement.';
});
edit('/areas/florida/washington-county/',d=>{
 d.decisions[0].body='Fictional request: “I have an older Husqvarna saw. Its model label reads [visible reference], but I do not know the missing part number or whether the item can be replaced on its own. Can you review the machine reference and photographs?” Keep unreadable or unknown details explicit. Staff can distinguish a known-part purchase from an assessment question rather than asking the customer to choose from a brand list.';
 d.decisions[1].body='Explain how staff confirm an offered component’s identity, condition and availability. In the fictional request, a follow-up question could ask whether an offered item is new or used and what assessment is needed. Neither an older-parts listing nor a photograph guarantees stock or compatibility.';
 d.limits='The request is fictional. The shop verifies equipment, suitability, stock and accepted service. Live inventory, automatic compatibility lookup and repair tracking need separate scope; clear parts wording can support the existing telephone and contact routes.';
});
edit('/areas/indiana/adams-county/',d=>{
 d.limits='The seller confirms available combinations and final order details. New configurators, automated option validation and order-system connections require separate assessment.';
});
edit('/areas/indiana/crawford-county/',d=>{
 d.limits='Supply the current duration and start instructions for each tour so visitors can distinguish activity time from the whole visit. Staff confirms actual arrangements; the page does not calculate a guaranteed departure time. Live departure displays, capacity controls and ticket-system integrations require separate scope.';
});
edit('/areas/indiana/daviess-county/',d=>{
 d.decisions[1].body='Fictional inquiry: “We have house plans and a lead builder; please review the drywall package. The builder is our coordination contact, and we are not asking you to manage the whole build.” Contrast that with a customer seeking broader construction help before a lead team is chosen. Keep the requested contribution, available plans and responsible contact together so staff can assess the actual role.';
 d.limits='The role comparison is fictional. The business confirms scope, responsibilities and accepted work; the website does not allocate a construction contract. Bid management, construction scheduling, estimating and document-control systems require separate scope.';
});
edit('/areas/indiana/dearborn-county/',d=>{
 d.decisions[1].body='Illustrative three-stop sequence, using generic labels: ticket redemption → rental collection and fitting → lesson meeting point. A guest bringing their own equipment may not need the rental stop. Replace these generic labels with the operator’s approved place names and directions when preparing the venue’s guide; this illustration supplies no counter names, wait times or arrival deadline.';
 d.sourceBridge='Perfect North Slopes separately explains ticket redemption, rental collection and the first-lesson meeting area at its Lawrenceburg-area destination. That supports a connected first-visit sequence. The generic illustration above shows the handoffs without claiming to be current venue directions.';
 d.limits='The operator confirms the applicable stops, route and preparation for the chosen offer. A purchase confirmation does not establish that every preparation step is complete. Ticketing integrations, fitting records, live wait times and lesson scheduling require separate scope.';
});
edit('/areas/indiana/dubois-county/',d=>{
 d.decisions[1].body='Fictional inquiry: “We want to discuss routine cleaning of [known floor material] in [work area]. We do not know the existing finish or which rental category fits. We need to discuss access and a preferred use period.” This gives staff the surface, task and uncertainty without choosing a scrubber, floor machine or burnisher for the customer. Use the supplier’s approved questions for any further details.';
 d.sourceBridge='Jasper Equipment & Supply lists extractors, vacuums, scrubbers, floor machines and burnishers alongside janitorial supplies. Its rental information asks for advance reservation when possible and mentions delivery or pickup. The fictional inquiry demonstrates preparation for staff selection, not a surface-to-machine recommendation.';
});
edit('/areas/indiana/franklin-county/',d=>{
 d.sourceBridge='Ritzi Jewelers in Brookville describes on-site watch repair, an estimate with approximate timing and maintenance that may lead to further recommendations. Brookville supplies the Franklin County example; Batesville itself spans Franklin and Ripley counties.';
 d.limits='Supply the shop’s current exceptions to on-site work, additional-work approval steps and readiness messages. The shop determines diagnosis and accepted work; an approximate estimate does not promise a collection date. Repair tracking, authorization systems and automated completion estimates require separate scope.';
});
edit('/areas/indiana/hendricks-county/',d=>{
 d.decisions[1].body='Illustrative comparison structure: “Both packages: [shop-approved shared tasks]. Larger package adds: [named cleaning or overhaul tasks]. Replacement parts: assessed and priced separately.” The brackets are fields for the shop’s actual lists, not claims that a particular task is included. A rider can then ask which added work addresses the concern without assuming the larger package covers every repair.';
 d.limits='The technician determines what the bicycle needs and confirms the actual task lists. The comparison structure does not select a package or authorize extra work. Repair-authorization records and live completion-status features require separate scope.';
});
edit('/areas/indiana/jennings-county/',d=>{
 d.decisions[1].body='Fictional organizer’s inquiry: “We want one award displayed at the club and individual wearable recognition for recipients. Both should carry the event name; recipient names differ. Please show the actual trophy/plaque and ring/belt choices and tell us what details each needs.” This separates presentation and shared content without assuming common sizes, materials or customization rules across formats.';
 d.sourceBridge='Premier Sports Group in North Vernon presents trophies and plaques alongside rings and championship belts and invites custom-award inquiries for events and tournaments. The fictional inquiry uses that range to separate a shared display from recipient-specific recognition, without inventing specifications.';
 d.limits='The supplier confirms suitable options, recipient details, specifications and timing. Configurators, recipient-data systems, automated proofs and new ordering integrations require separate assessment.';
});
edit('/areas/indiana/knox-county/',d=>{
 d.sourceBridge='Vincennes Printing presents Haven Solutions print products alongside folding, mailing and finishing capabilities and invites a job-specification inquiry. Confirm the current finishing and mailing arrangements with the printer, then explain whether the buyer is requesting finished pieces for their own distribution or asking the shop to review mailing help.';
});
edit('/areas/indiana/lawrence-county/',d=>{
 d.sourceBridge='Johnny’s Signs in Bedford describes lighting and other repairs separately from LED retrofits and design modernization, with assessment before work. Those services support retaining both restoration and change goals. Supply approved repair and upgrade examples with captions identifying the work actually performed.';
});
edit('/areas/indiana/marion-county/',d=>{
 d.limits='A public process page does not report live project status. Dashboards, approval records, reminders and internal scheduling need separate requirements.';
});
edit('/areas/indiana/miami-county/',d=>{
 d.limits='Supply the venue-approved setup and departure allowances for each option, including how extra time and supplier access are confirmed. The venue agrees availability and the complete access period; booking and access-management systems need separate scope.';
});
edit('/areas/indiana/monroe-county/',d=>{
 d.limits='The landscape business approves fees, timing, deliverables and drawing-use rights. Archives, plan-review tools and customer portals need separate requirements.';
});
edit('/areas/indiana/morgan-county/',d=>{
 d.limits='The October 24–25, 2026 intensive is a historical example of a course with a stated progression role. The instructor confirms current offerings, prerequisites and eligibility. Class registration and prerequisite tracking need separate scope.';
});
edit('/areas/indiana/porter-county/',d=>{
 d.decisions[1].body='Fictional inquiry: “The piano is at [location]. I know its maker from the label, but not its age or last service date. Some keys feel different from the others during ordinary playing. What details would help you assess a visit?” Keep the reported touch concern separate from a diagnosis, and leave unknown history visible. The technician determines whether regulation, repair or another service is appropriate.';
 d.sourceBridge='Adam Gratz Piano Tuning and Repair lists a Valparaiso address and Northwest Indiana coverage, with tuning, pitch raise, voicing, regulation and repairs. The fictional inquiry shows how an owner can describe an observation before selecting among those services.';
});
edit('/areas/indiana/st-joseph-county/',d=>{
 d.decisions[2].body='Fictional project brief: “We need a new stockpile comparison for [marked project area]. Our earlier dataset is [reference and survey date]; please assess whether it is suitable for comparison and which output would answer the question.” Keep the purpose, area and prior-data reference together. This is a requirements discussion, not a promise of a particular method, accuracy or calculated result.';
 d.sourceBridge='Williams Aerial & Mapping in South Bend describes LiDAR collection, photogrammetric mapping and orthophotography, including corridor work and stockpile updates, and lists 4483 Corporate Drive, Building 301. The fictional brief connects the update purpose to its area and prior-data reference without representing an actual delivered survey.';
});
assert.equal(edits.length,20);
const faqFile='src/service-faqs.json',faqs=JSON.parse(fs.readFileSync(faqFile,'utf8')),route='/areas/indiana/adams-county/',beforeFaq=structuredClone(faqs[route]);
assert.equal(beforeFaq.length,1);assert.equal(beforeFaq[0].question,'Can the website show wood and stain samples without promising an exact color match?');
delete faqs[route];
fs.writeFileSync(file,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(faqFile,JSON.stringify(faqs,null,2)+'\n');
fs.writeFileSync(receiptFile,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),drafts:edits,faqChanges:[{route,before:beforeFaq,after:null,beforeSha256:hash(beforeFaq),afterSha256:hash(null)}],sourceChanges:[],limits:'Twenty draft repairs; not imported. One duplicate FAQ removed from source; acceptance layer pending independent review. Knox source provenance remains in existing source notes.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:edits.length,faqRemoved:1,imported:false,recheckPending:true}));
