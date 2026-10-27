// One-use, individually diagnosed draft repairs. Preserve all historical reviews.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-d-repair.json';
assert(!fs.existsSync(receiptFile),'Do not repeat this applied repair.');
const file=root+'/drafts/local-4.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-d.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),edits=[];
function edit(route,change){
 const draft=rows.find(row=>row.route===route),review=reviews.find(row=>row.route===route);assert(draft&&review?.requiredFixes.length,route+' diagnosed');
 assert.equal(hash(draft),review.draftSha256,route+' unchanged reviewed draft');const before=structuredClone(draft);change(draft);
 assert.equal(draft.route,before.route);assert.equal(draft.inputHash,before.inputHash);
 edits.push({route,partition:4,before,after:structuredClone(draft),beforeSha256:hash(before),afterSha256:hash(draft),requiredFixes:review.requiredFixes});
}
edit('/areas/north-carolina/hertford-county/',d=>{
 d.decisions[0].body='Use the business’s approved definition for the selected item. A fictional tool request could keep these fields separate: “Item: [tool]; requested collection: [date and time]; requested return: [date and time]; please confirm how the short period counts business hours.” These are questions for staff, not an invented day length, rate or overnight allowance.';
 d.decisions[1].body='For event items, distinguish use from collection, delivery and return. Fictional request: “Event use: [Saturday date and hours]; requested collection: [Friday date and time]; requested return: [Monday date and time]. Are those handoffs available, and what period would apply?” Keep all three fields in the inquiry. The requested weekend arrangement is not a published operator entitlement.';
});
edit('/areas/north-carolina/randolph-county/',d=>{
 d.decisions[0].body='Identify the artwork and text that stay the same. Fictional brief: “Every letter uses the same approved logo and event description. The greeting changes to [Recipient A] or [Recipient B].” These invented labels show the structure without exposing a real mailing list; the printer still reviews the design and variable fields.';
 d.decisions[1].body='Continue the fictional brief with the matching requirement: “Letter A and reply card A carry [Reference A] and must remain together; the B pair uses [Reference B].” Ask the printer to review how the related pieces will be matched and proofed. Approval of the common layout does not approve the recipient records or establish that matching checks have been completed.';
});
edit('/areas/ohio/knox-county/',d=>{
 d.decisions[2].body='Distinguish making a gift in class from commissioning one. State the actual class format and completion or collection arrangements. A visitor should know what they would make themselves, what the instructor supplies and whether the piece leaves with them that day or needs later collection, using the business’s approved instructions.';
});
edit('/areas/ohio/montgomery-county/',d=>{
 d.decisions[2].body='Pair permitted before-and-after views with what changed and what was preserved. Explain the assessment step and service boundaries. A caption can identify a new finish while naming the grain, trim or other details retained, so the customer’s reference stays connected to the work it actually shows.';
 d.limits='The business examines the furniture and selects suitable treatment; this content is not a refinishing procedure. Finish simulators, estimates, collection booking and job tracking need separate scope.';
});
edit('/areas/ohio/richland-county/',d=>{
 d.decisions[2].body='Keep menu choices separate from the actual service included. Explain staffed and drop-off options accurately, naming what the caterer handles and what the organizer must arrange. A preferred meal format should stay attached to any open delivery, setup or staffing question until the caterer confirms the plan.';
 d.limits='The caterer confirms staffing, layout, timing and suitability. Menu builders, instant pricing, staff scheduling and booking integrations require separate scope; content can prepare a general event inquiry.';
});
edit('/areas/otsego-county/',d=>{
 d.heading='Ask what private or semi-private event space actually includes.';
 d.intro='A private-event label does not identify the area reserved or the activity nearby. Help an organizer state the privacy they need and request the venue’s actual boundaries before comparing menus or dates.';
 d.customerQuestion='How can we ask whether a company dinner would have its own space or share the setting with other visitors?';
 d.decisions[0].body='Put the included area and access conditions beside the package when the venue supplies them. A fictional inquiry could begin: “We are planning a company dinner and need to hear a short presentation. Which area would be reserved for our group, and would it be exclusive to us?” The question seeks a defined boundary rather than assuming that private means the whole venue.';
 d.decisions[1].body='Continue the fictional inquiry: “For the semi-private option, what other visitor activity could be nearby, and what separation would our group have?” Ask the venue to describe the actual arrangement and provide accurately captioned photographs. The example identifies what needs an answer; it does not claim that either package guarantees quiet or a particular layout.';
 d.sourceBridge='Brewery Ommegang’s public page offers private and semi-private Tap House event packages and customized catering discussions, but does not define the reserved areas or nearby shared activity. That missing distinction motivates the fictional inquiry above. The brewery is in the Town of Middlefield in Otsego County and uses a Cooperstown mailing address.';
 d.limits='The venue supplies privacy boundaries and confirms the arrangement. The illustrative questions are not a statement of Ommegang’s package terms or a completed client event. An event photograph or inquiry does not establish exclusive access, and a preferred meal format remains subject to venue review.';
});
edit('/areas/pennsylvania/berks-county/',d=>{
 d.intro='A one-off household service request and a recurring business requirement may use the same contact route, but they need different context. Help the customer identify the work and whether they are asking about one visit or an ongoing arrangement.';
 d.decisions[0].body='Start with the actual service and a concise description. Fictional household inquiry: “I have a septic-service question at one property. What initial information do you need to decide whether to assess it?” The request leaves the service and visit for staff to confirm rather than forcing the customer through a commercial contract brief.';
 d.decisions[1].body='A contrasting fictional business inquiry could say: “We want to discuss recurring grease-related service at our premises. Access is limited to [hours]; the appropriate frequency is still unknown. Who can review the requirement with us?” The placeholder describes an access constraint, not an accepted schedule or technical service recommendation. Staff can ask the relevant questions without treating it as a single household job.';
});
edit('/areas/pennsylvania/bucks-county/',d=>{
 d.decisions[2].body='Request detailed documents or photographs through an agreed channel when needed; uploads require separate scope. Keep the first message proportionate to the job. Staff can ask a repair customer for a relevant detail view without requiring the full plans or project history that a larger renovation may need.';
 d.limits='The business confirms project fit and estimates. Content can explain the next assessment step without promising that every small job is accepted or that an inquiry is a final quote. New upload or routing features need their own agreed scope.';
});
edit('/areas/pennsylvania/butler-county/',d=>{
 d.limits='Each business confirms its own appointments, consultation coverage and selection process. Content can connect accurate visit information to an existing provider; changes to provider accounts, booking behavior or new appointment features require separately agreed scope.';
});
edit('/areas/pennsylvania/cambria-county/',d=>{
 d.limits='The craftsperson assesses the original, the proposed relationship and the work required. A surviving detail can support the discussion without establishing a confirmed match; an inspiration photograph does not establish historical accuracy or approve a new specification.';
});
edit('/areas/pennsylvania/carbon-county/',d=>{
 d.decisions[2].label='Keep preliminary dimensions labeled';
 d.decisions[2].body='Fictional custom-glass inquiry: “I want to discuss a tabletop. My rough estimate is [length and width, with units]; please tell me what you need to assess the request and how final dimensions are approved.” Keep the approximate label in the receiving message. This begins a review; it is not a cutting list or permission to manufacture.';
 d.limits='The glass business confirms suitability, final measurements and accepted work. A custom inquiry does not authorize manufacture. Content can make that review boundary clear while preserving the existing contact route.';
});
edit('/areas/pennsylvania/chester-county/',d=>{
 d.customerQuestion='How should a cleaning website distinguish a first-visit question from a returning customer’s scheduling request?';
 d.decisions[0].body='Describe the actual first-visit and ongoing offers, preparation and exclusions. Fictional first-time inquiry: “We have not used your service before and are unsure which listed cleaning covers our needs. Can someone review the rooms and requested work before we choose a booking option?” If the work falls outside the supported choices, preserve the question for a quote discussion rather than inventing a suitable package.';
 d.decisions[1].body='A contrasting fictional returning-customer request might be: “We want the same agreed service again; where should we use our existing scheduling route?” Keep that familiar link easy to reach and explain what the provider’s acknowledgment actually means. Neither example promises a slot or assumes every requested task is confirmed.';
 d.limits='Content improvements can clarify the service choice while retaining the existing booking route. Building scheduling, recurring payments or a new portal requires separate scope. The cleaning business confirms the accepted work and appointment arrangements.';
});
edit('/areas/pennsylvania/clearfield-county/',d=>{
 d.limits='The specialist assesses the actual memorial and suitable work. A before-and-after example records one stone’s outcome; it does not select a treatment or promise that another stone’s marks will disappear.';
});
edit('/areas/pennsylvania/crawford-county/',d=>{
 d.limits='The shop determines whether the supplied component and requested marking are suitable and confirms the work. A completed artwork file does not approve the part itself, and a shipping inquiry is not permission to begin an unagreed operation.';
});
edit('/areas/pennsylvania/delaware-county/',d=>{
 d.limits='The business confirms accepted work, assessment, price and any visit. Content can preserve the job’s scale through the existing inquiry. Uploads, conditional routing, calculators and automatic scheduling require separate assessment.';
});
assert.equal(edits.length,15);assert.deepEqual(new Set(edits.map(e=>e.route)),new Set(reviews.filter(r=>r.requiredFixes.length).map(r=>r.route)));
fs.writeFileSync(file,rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
fs.writeFileSync(receiptFile,JSON.stringify({date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),reviewEvidence:[root+'/audits/local-after-residual-d.jsonl'],drafts:edits,sourceChecks:[{route:'/areas/otsego-county/',url:'https://www.ommegang.com/tap-room-restaurant/private-events/',checkedDate:'2026-10-27',finding:'Official page offers private and semi-private Tap House packages but does not identify reserved areas or shared-activity boundaries. Corrected draft states this limitation and uses fictional inquiry questions. No rates, capacity or staff identity imported.'}],limits:'Drafts only. Source records, FAQs and imported briefs unchanged; exact independent recheck required before import.'},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-d-repair-routes.json',JSON.stringify(edits.map(e=>e.route),null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({draftsRepaired:15,imported:false,independentRecheckPending:true}));
