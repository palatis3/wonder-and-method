// One-use corrections from 121 complete candidate reviews. Preserve prior evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-g-repair.json';
assert(!fs.existsSync(receiptFile),'Repair already applied');
const file=root+'/drafts/local-1.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-g.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const sourceFile='src/location-service-data.json',sources=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),edits=[],sourceEdits=[];
function edit(route,change){const d=rows.find(r=>r.route===route),r=reviews.find(r=>r.route===route);assert(d&&r?.requiredFixes.length,route);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);assert.equal(d.route,before.route);assert.notEqual(hash(d),hash(before));edits.push({route,partition:1,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:r.requiredFixes});}
function source(route,change,fresh=true){const s=sources.find(x=>x.path===route);assert(s);const before=structuredClone(s);change(s);if(fresh)s.checkedDate='2026-10-27';sourceEdits.push({route,before,after:structuredClone(s),beforeSha256:hash(before),afterSha256:hash(s)});}
function observation(s,url,text){const item=s.sources.find(x=>x.url===url);assert(item,url);item.observation=text;}
function replace(d,key,from,to){assert(d[key].includes(from),d.route+' '+from);d[key]=d[key].replace(from,to);}
edit('/areas/alaska/lake-and-peninsula-borough/',d=>{
 d.decisions[0].body='Lake Clark Resort’s FAQ gives the Lake Clark Air passenger office at 2541 Merrill Field Drive, Anchorage, for check-in. Label it as the passenger departure stage, separate from the resort in Port Alsworth. The FAQ warns that searching the lodge, airline or resort names may lead to the freight office next door; a brand-name search is therefore not a substitute for the approved address.';
 d.sourceBridge='Lake Clark Resort’s preparation FAQ, checked October 27, 2026, distinguishes the Anchorage passenger office from the adjacent freight office and asks guests to discuss dietary needs well before a remote stay. The address above identifies one journey stage, not the destination property or a flight schedule.';
});
source('/areas/alaska/lake-and-peninsula-borough/',s=>observation(s,'https://www.lakeclarkresort.com/faq-1','Gives Lake Clark Air passenger check-in at 2541 Merrill Field Drive, Anchorage; warns that brand-name searches may lead to the freight office next door. Asks for dietary needs well in advance.'));
edit('/areas/california/kern-county/',d=>{
 d.decisions[0].body='Bakersfield Flying Club describes an introductory visit of about two hours, including classroom briefing, preflight preparation and flying. Its page gives two flight-duration descriptions: 25–30 minutes in a bullet and 20–30 minutes in the explanatory paragraph. Keep total visit time separate from flight time, and ask the club to reconcile that range before using it in a booking confirmation.';
 d.sourceBridge='Bakersfield Flying Club’s learn-to-fly page, checked October 27, 2026, supplies the approximate visit length and differing flight ranges above. It separately describes continuing aircraft rental and independent instruction. The introduction is not a priced commitment to an entire course.';
});
source('/areas/california/kern-county/',s=>observation(s,'https://bakersfieldflyingclub.com/learn-to-fly/','Describes about two hours for the introductory visit with briefing/preflight; flight duration appears as 25–30 minutes in a bullet and 20–30 minutes in a paragraph. Continuing aircraft rental and independent instruction are separate.'));
edit('/areas/colorado/mineral-county/',d=>{
 d.intro='A party attending three plays may need different numbers of seats at each. Your ticket page can explain an approved multi-show offer with an itinerary example rather than treating every ticket in the basket alike.';
 d.customerQuestion='In the published three-show example, how does the discount work when four of us attend one play and two attend the others?';
 d.decisions[1].body='Creede Repertory Theatre’s published four/two/two example discounts two tickets at each of the three productions. The two extra tickets for the first production remain full price. Show those quantities separately: eight tickets in total does not mean all eight receive the discount. This is a dated explanation of the published rule, not a current quote or an available offer.';
 d.sourceBridge='Creede Repertory Theatre’s ticket page, checked October 27, 2026, supplies that unequal-quantity example and excludes special events and Boomtown. It retains a May 23–September 19, 2026 season and says 2026 flex passes are no longer sold. Confirm any new season’s offer before replacing the dated illustration.';
});
source('/areas/colorado/mineral-county/',s=>observation(s,'https://creederep.org/buy-now/tickets-and-passes/','The published four/two/two example discounts two tickets per production and leaves two extra first-production tickets at full price; special events and Boomtown are excluded. Retains 2026 season dates and ended flex-pass sales, so this is dated evidence.'));
edit('/areas/colorado/montrose-county/',d=>{
 d.sourceBridge='Ross Reels’ repair page, checked October 27, 2026, describes online information, payment and submission followed by shipment with a printed order. A later FAQ still describes a check or money order with the reel, or a card-payment callback. Those payment instructions remain inconsistent and need staff clarification. The page separately ties repair timing to receipt of the reel and asks about trip dates and return transit.';
 d.limits='Staff confirm the payment route, repairability, additional work and timing. An online order is not physical receipt or a promised return date. Payments, job tracking and automated status messages need separate assessment.';
});
source('/areas/colorado/montrose-county/',s=>observation(s,'https://mayflyoutdoors.com/pages/ross-reels-warranty-repairs','Online payment/submission instructions conflict with a later check, money-order or card-callback FAQ. Separately describes shipment with printed order, receipt-based timing, additional-part contact and trip-date discussion; payment flow remains for staff clarification.'));
edit('/areas/colorado/rio-blanco-county/',d=>{
 d.decisions[2]={label:'Recheck a changed rental request',body:'Keep the selected dates, duration and vehicle with the staff conversation when a customer changes the plan. Extending a short fall request to three days should prompt review of the advance route; shortening it should not retain a reserved status by assumption. Walk-in guidance does not mean equipment is held.'};
});
source('/areas/colorado/rio-blanco-county/',s=>{const path='/guides/farm-event-website-updates/';assert(s.relatedGuides.some(g=>g.path===path));s.relatedGuides=s.relatedGuides.filter(g=>g.path!==path);},false);
edit('/areas/colorado/summit-county/',d=>replace(d,'sourceBridge','Frisco’s supplied October 2026 page','Frisco’s public rental page, reviewed in October 2026,'));
edit('/areas/georgia/chatham-county/',d=>{
 d.decisions[0].body='River Street Sweets’ general FAQ accepts APO/FPO military-address shipping, but its product-specific guidance excludes apples from military addresses. Put that exception beside the apple choice. The general destination answer must not make a mixed praline-and-apple gift appear eligible as selected; staff can review an alternative gift for the same recipient.';
 d.sourceBridge='River Street Sweets’ shipping pages, checked October 27, 2026, exclude apples from military addresses, PO boxes, Alaska and Hawaii and describe separate cooler shipments. Its general FAQ separately accepts military-address shipping. The original Savannah flagship is at 13 East River Street. This is a content interpretation example, not evidence of a tested or broken checkout.';
});
source('/areas/georgia/chatham-county/',s=>observation(s,'https://www.riverstreetsweets.com/pages/warm-weather-shipping','Apples travel separately in coolers and cannot ship to military addresses, PO boxes, Alaska or Hawaii. The general military-shipping answer must retain these product-specific exclusions.'));
edit('/areas/georgia/cherokee-county/',d=>replace(d,'limits','The source summary does not specify every item a recipient must bring, so obtain current instructions rather than invent them.','Provide the organization’s current list of gift-redemption materials and instructions; recipients should not have to guess what to bring.'));
edit('/areas/idaho/bingham-county/',d=>replace(d,'limits','The supplied research does not transaction-test the public tool, and','This example reviews published lookup instructions rather than a tested transaction, and'));
edit('/areas/idaho/bonner-county/',d=>replace(d,'limits','Obtain current service-point names and seasonal terms rather than inventing them from the summary.','Use the operator’s current service-point names and seasonal terms.'));
edit('/areas/idaho/idaho-county/',d=>replace(d,'limits','Obtain actual gear lists and verification instructions rather than infer them from the summary.','Use the operator’s approved gear lists and shop-verification instructions for each configuration.'));
edit('/areas/idaho/kootenai-county/',d=>replace(d,'limits','Obtain the operator’s exact current dock rules and times; the supplied summary does not establish every combination.','Use the operator’s current product-specific dock rules and boarding times.'));
edit('/areas/idaho/lemhi-county/',d=>{
 d.decisions[0].body='The Sacajawea Center lists its projector/DVD/sound system for the Learning Center’s upper level only. Moving a presentation downstairs therefore needs an equipment discussion even if the headcount fits the lower room. Moving to the amphitheater or ranch yard also changes furniture preparation: those listings state that chairs are not available. Keep each space’s actual equipment and layout together.';
 d.sourceBridge='The Sacajawea Center’s rental page, checked October 27, 2026, gives the room-specific equipment and outdoor-area distinctions above. Setup, takedown and cleaning must fit inside reserved time. Fees and deposits must be received before a reservation is recorded through the city contact, which is separate from the facility-question contact.';
 replace(d,'limits','Exact room capacities and amenities need approved lists rather than inference from this summary.','Use approved capacity-by-layout and amenity lists for the selected space.');
});
source('/areas/idaho/lemhi-county/',s=>observation(s,'https://www.sacajaweacenter.org/rent-the-center/','Limits the Learning Center projector/DVD/sound system to the upper level; amphitheater and ranch-yard listings state no chairs. Reserved time includes setup/takedown/cleanup, and fees/deposits precede recording the reservation. Other spaces have their own seating descriptions.'));
edit('/areas/idaho/lewis-county/',d=>{
 d.decisions[1].body='For HC1010 serial 22500, Hillco’s directory places the parts book under 22001–24999 but the operator manual under 22001–22999. Both ranges contain that number, yet they identify different document purposes. Keep the requested operator-manual label with its own range instead of sending the parts book merely because its broader range matches.';
 d.sourceBridge='Hillco Technologies in Nezperce publishes those HC1010 directory labels, checked October 27, 2026, and combines document types for some other products. The comparison concerns directory labels only; the linked manuals were not inspected and technical applicability was not verified.';
});
source('/areas/idaho/lewis-county/',s=>observation(s,'https://hillcotechnologies.com/resources-all-other-products/','For HC1010, directory labels list parts-book serials 22001–24999 and operator-manual serials 22001–22999; serial 22500 falls within both but the document purposes differ. Linked manual contents and technical applicability were not inspected.'));
edit('/areas/idaho/lincoln-county/',d=>replace(d,'sourceBridge','The supplied research was reviewed October 26, 2026;','That public notice was reviewed October 26, 2026;'));
edit('/areas/idaho/madison-county/',d=>{
 d.sourceBridge='Yellowstone Bear World’s published 2026 bottle-feeding instructions require participants to be at least five and able to follow directions from someone other than a parent. The ticket excludes park admission, and orientation is an hour before the reservation. Wildlife Excursion is separately described as an on-site, first-come purchase. The bottle-feeding page, checked October 27, gives October 18 as the end of the 2026 season.';
 replace(d,'limits','obtain the exact age restriction before publishing.','use approved requirements for the applicable season.');
});
source('/areas/idaho/madison-county/',s=>observation(s,'https://yellowstonebearworld.com/experiences/bottle-feeding/','Published 2026 requirements: age five or older, able to follow directions from someone other than a parent, separate park admission and orientation one hour before reservation. The page states the October 18 seasonal close; no current availability is implied.'));
edit('/areas/idaho/owyhee-county/',d=>replace(d,'limits','Obtain the exact current seating count and terms rather than invent them from the summary.','Use the kitchen’s approved current seating count and meal terms.'));
edit('/areas/idaho/payette-county/',d=>replace(d,'limits','The supplied guarantee and refund pages disagree','The guarantee and refund pages reviewed October 26, 2026 disagree'));
edit('/areas/idaho/twin-falls-county/',d=>replace(d,'limits','Reservation versus first-come camping wording remains unresolved in the supplied source.','The published camping instructions reviewed October 26, 2026 contain unresolved reservation and first-come wording.'));
edit('/areas/indiana/noble-county/',d=>{
 d.decisions[2].body='The Pottery’s published private-lesson options both require two sessions. Each provides 1.5 hours of wheel-throwing or handbuilding instruction, followed by 15 minutes for cleanup. Put that commitment beside the one-student or two-student choice so a private lesson does not look like a one-off event; the instructor confirms the actual schedule and learning plan.';
 d.sourceBridge='The Pottery at Kendallville’s Community Learning Center describes one-student and two-student private lessons in a community studio where other members may be working. Its page, checked October 27, 2026, gives the two-session commitment above. Dedicated teaching, exclusive room use and total attendance are separate questions.';
 d.limits='The instructor confirms the current program, schedule and participation arrangements. Dedicated instruction does not reserve the entire studio. Booking, room reservations and attendance management need separate requirements.';
});
source('/areas/indiana/noble-county/',s=>observation(s,'https://www.thecommunitylearningcenter.org/pottery-events','One-student and two-student private-lesson options both require two sessions, each with 1.5 hours of instruction plus 15 minutes cleanup. Other members may work in the community studio during the lesson.'));
edit('/areas/indiana/ohio-county/',d=>replace(d,'limits','The supplied description does not establish an exact size cutoff or a particular accessibility arrangement. Staff confirm the format and date for the actual party.','Staff confirm the walking or cart format, date and accessibility arrangements for the actual party. Do not turn an unconfirmed group size into an automatic transport promise.'));
edit('/areas/indiana/parke-county/',d=>{
 d.decisions[1].body='Fictional request: “Use our agreed appreciation-gift design [program reference]. For this recipient, personalize it as ‘Morgan’ and include the note ‘Thank you for helping our team.’ Please confirm the delivery destination through the approved private route.” The program reference stays fixed while the name, note and destination belong to this request. This invented example is not an actual client order or automatic shipment approval.';
 d.ownerInputs[1]='Approved personalization, note and private destination prompts.';
});
edit('/areas/indiana/perry-county/',d=>{
 d.decisions[1].body='Fictional mixed request: “Group A: 12 customer-owned shirts, artwork [reference A] requested on the left chest. Group B: 4 customer-owned jackets, artwork [reference B] requested on the back. Please review whether these garments and placements are suitable.” These invented quantities show separate groups; they are not shop minimums, accepted specifications or a handling-fee calculation.';
 d.limits='The shop confirms current handling terms, charges and garment suitability before accepting work. Inventory intake, proof approval and order-tracking systems require separate scope.';
});
edit('/areas/indiana/posey-county/',d=>replace(d,'limits','Use the studio’s current charges and processing terms only after confirmation; the supplied description does not support a fee calculation or guaranteed firing result.','The studio confirms current charges, processing terms and possible outcomes for the selected pieces; this example does not calculate a fee or guarantee a firing result.'));
edit('/areas/indiana/putnam-county/',d=>{
 d.decisions[1].body='Fictional inquiry: “Use logo file [reference]. Keep the wording ‘River Team’ exact. We want it on the front of a cap and are open to discussing the surrounding decoration. Please explain any proposed changes for review.” The invented wording, garment and position show how fixed identity details differ from preferences; they do not authorize digitizing or production.';
 replace(d,'sourceBridge','A real, owner-approved adaptation example would make the fixed-wording versus adjustable-appearance distinction especially clear.','The fictional inquiry above demonstrates that distinction without representing a completed client adaptation.');
});
edit('/areas/indiana/ripley-county/',d=>{
 d.decisions[1].body='Fictional inquiry: “One projecting feature is missing, and the painted surface is worn. I can provide an overall photograph and separate views of those two concerns. I would like to discuss preserving the existing appearance; I do not know the material.” The observations keep form, surface and preference separate without choosing a repair method or claiming a completed restoration.';
 replace(d,'sourceBridge','An approved case explaining the separate interventions would strengthen this content.','The fictional inquiry above shows how to describe separate concerns before the workshop assesses the object.');
});
edit('/areas/indiana/rush-county/',d=>{
 d.decisions[1].body='Fictional event brief: “24 shirts: shared ‘Community Day’ wording with logo [reference] on the front. Six awards: the same event reference, with one recipient name per award supplied through the approved route. Please review the layouts separately.” These invented counts are not minimums or an accepted order. The common occasion stays visible while each product retains its own wording, quantity and placement questions.';
 d.ownerInputs[1]='Approved combined-brief format with separate product counts and wording.';
});
edit('/areas/indiana/spencer-county/',d=>{
 d.decisions[1].body='A proposed request format can use a fictional family: “Selected variant: [exact product option]. Position [owner-approved label for first stocking]: Alex. Position [owner-approved label for second stocking]: Robin. Shared text [if this variant allows it]: The River Family.” The bracketed labels must be replaced from the seller’s current variant image; this is not a verified position map or a claim that those text areas exist on every option.';
 d.limits='The seller supplies current position labels, permitted text areas and limits. This proposed format does not imply a live preview, a verified image map or approval of customer wording. Interactive personalization, previews and production integrations require separate assessment.';
});
assert.equal(edits.length,28);assert.equal(sourceEdits.length,10);
assert.deepEqual(new Set(edits.map(e=>e.route)),new Set(reviews.filter(r=>r.requiredFixes.length).map(r=>r.route)));
const receipt={date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),reviewEvidence:[root+'/audits/local-after-residual-g.jsonl'],drafts:edits,records:sourceEdits,faqs:[],sourceChecks:[root+'/research/residual-g-fact-recheck.json',root+'/research/residual-g-additional-facts.json'],limits:'All 28 drafts and ten exact source records changed. FAQs and imported briefs unchanged. New official-source checks cover named facts only; ornament image labels were not retrieved and its demonstration uses explicit placeholders. Independent exact-body recheck required before acceptance/import.'};
fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-g-repair-routes.json',JSON.stringify(receipt.routes,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:edits.length,sourceRecords:sourceEdits.length,imported:false,status:receipt.status}));
