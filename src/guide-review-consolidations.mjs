import {p,ul,table,box} from './guide-content-helpers.mjs';

// This pass consolidates the independently reviewed prose. It runs after the
// first editorial pass; prices and other offer-derived content remain live.
export function consolidateReviewedGuide(path, sections) {
 const slug=path.split('/').filter(Boolean).at(-1);
 let items=sections.map(s=>({...s}));
 const get=id=>{const s=items.find(s=>s.id===id);if(!s)throw Error(`Missing consolidation section ${path}#${id}`);return s;};
 const set=(id,body,title)=>{const s=get(id);s.body=body;if('bodyHTML' in s)s.bodyHTML=body;if(title)s.title=title;};
 const edit=(id,fn)=>set(id,fn(get(id).body));
 const replace=(id,from,to)=>edit(id,b=>{if(!b.includes(from))throw Error(`Changed consolidation text ${path}#${id}: ${from.slice(0,70)}`);return b.replace(from,to);});
 const removeInto=(id,target)=>{const s=get(id);const anchors=[s.id,...[...s.body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])];edit(target,b=>anchors.map(a=>`<span id="${a}"></span>`).join('')+b);items=items.filter(x=>x.id!==id);};
 const summary=(id,label)=>edit(id,b=>b.replace(/<summary>[^<]*<\/summary>/,`<summary>${label}</summary>`));
 const order=ids=>{items=[...ids.map(get),...items.filter(s=>!ids.includes(s.id))];};
 const paragraphs=id=>get(id).body.match(/<p>[\s\S]*?<\/p>/g)||[];
 const rows=id=>[...get(id).body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c=>c[1]));
 switch(slug) {
 case 'ai-website-or-custom':
  set('choose-the-job',box('Choose the right comparison',p('AI describes a drafting method; a template supplies a starting structure; custom work shapes the result around your requirements. These approaches can overlap. A builder can produce a first layout and copy, while a custom project can give more attention to the service story and connected journey. Compare who checks facts, tests inquiries and maintains the result. For layout and editing choices, use the <a href="/guides/custom-website-or-template/">custom-versus-template comparison</a>.')));
  summary('review-ai-copy','Generated-copy checks');summary('ai-search','AI-search eligibility details');break;
 case 'approved-buyer-account-flow':summary('planning-3','Portal-transition checks');break;
 case 'class-take-home':
  replace('layout','Verify the correct policy branch.','Store the actual class category with the booking and link its change and cancellation terms. A multi-day course must not inherit a single-day deadline.');removeInto('planning-2','layout');break;
 case 'contact-form-not-working':
  edit('platform-settings',b=>b.replace(/<p><strong>(Squarespace|Wix|WordPress):<\/strong> ([a-z])/g,(_,platform,initial)=>`<h3>${platform}</h3><p>${initial.toUpperCase()}`));break;
 case 'contractor-website-checklist':
  set('search','<details><summary>Search readiness checks</summary><span id="local-seo-workflow"></span>'+p('Once service scope, coverage and the tested estimate route are clear, check <a href="/guides/local-seo-profile-eligibility/">Google Business Profile eligibility</a> before adding or changing a profile.')+p('Keyword tools estimate search demand; use real customer questions alongside those estimates. Improve the page that answers the question, then review relevant search traffic and inquiries. For a new site, <a href="/services/contractor-websites/">see contractor website packages and the sample page plan</a>.')+'</details>');break;
 case 'custom-print-order':
  set('planning-3',p('State your studio’s accepted submission route beside the inquiry: [approved form, address or other actual channel]. Explain what confirms acceptance and where artwork or quantity changes go.')+p('Dated example: the Hatch page reviewed on October 22, 2026 directed its order form through fax, mail or drop-off, rather than electronic or telephone orders. That example does not establish another studio’s ordering channel.'));break;
 case 'custom-website-or-template':
  edit('compare',b=>b.replace(/^<div class="journal-callout"[\s\S]*?<\/div>/,'').replace(/<p>Try a small comparison[\s\S]*?<\/p>/,''));
  set('quality',p('Use the same service headline, scope, proof and inquiry fields in both options. Record the result, required workaround and responsible person for each trial:')+ul(['A new visitor can identify the service, suitability, prices or scope limits and next step.','On a phone and with a keyboard, complete the inquiry; confirm that the owner receives it and can reply. Check that motion pauses and respects reduced-motion preferences.','Have the named editor make an expected change and explain how the site would be recovered.','Confirm accounts, renewals, export/source ownership and ongoing bills.'])+paragraphs('quality').at(-1),'Run one trial of the finished experience');
  order(['fit','compare','template','custom','quality','website-or-social']);summary('website-or-social','Website and social-profile roles');break;
 case 'customer-case-study-template':
  edit('worked-example',b=>b.replace('<p><strong>All businesses, projects and messages in these examples are fictional.</strong> They illustrate planning decisions, not client work or measured results.</p>','').replace('A real case study would attach approved copy and a dated test record; this fictional example does not claim those records or a change in sales.','').replace('No such client records are claimed by this fictional example.',''));
  edit('worked-example',b=>p('<strong>Fictional exercise: all businesses, projects and messages below are invented, not client work or measured results.</strong>')+b);break;
 }
 switch(slug) {
 case 'farm-event-website-updates':
  set('planning-2',p('Assign an update owner when the invitation is published. Record the event date and a next-day check of the heading, action button and linked social announcements against the four-state table above. Keep rights-cleared photographs or a factual recap if useful, and remove expired registration prompts.')+p('The researched 2026 event has already ended. Do not automatically roll its date or participation claim into 2027; a future invitation needs fresh organizer and farm confirmation.'),'Assign the update and retest');
  removeInto('planning-3','planning-2');
  set('check',paragraphs('check').at(-1),'Confirm the event facts');break;
 case 'brevard-county-launch-tour-website': {
  const maintenance=paragraphs('planning-3').at(-1);
  set('check',p('Use one fictional reservation: a family books a Saturday boat departure and the rocket moves to Monday. Review its product card, availability screen, checkout summary and confirmation. Each must identify the same service and approved change terms.')+p('Ask what remains booked, whether anything is refunded and what the family must do. Keep the offered tour departure unchanged in this test: the site must not silently move it or imply guaranteed liftoff. Resolve contradictions between old banners and current product policies before accepting bookings.')+maintenance,'Walk the Saturday-to-Monday change through the booking');
  removeInto('planning-3','check');order(['customer-decision','layout','planning-1','planning-2','check']);break;
 }
 case 'franklin-county-canoe-rental-website':
  set('check',ul(['<strong>Longer carry:</strong> select Floodwood Crossing and request handoff at the water. Confirm whether that carry is included and who performs it; parking delivery must not become water delivery by implication. The reader should distinguish both access points without calling to decode “delivery”.','<strong>Changed access after a quote:</strong> request another access point. Route the change to the operator to review the work, price and meeting instructions; do not silently keep the old quote.'])+paragraphs('check').at(-1));removeInto('planning-3','check');break;
 case 'ferry-booking-status':
  set('layout',p('For this fictional record, select the actual operator, route and travel mode first. Keep its current conditions with the record; resolve car-dependent property or delivery needs before treating arrival as settled.')+table('One guest record: confirmed and unresolved arrangements',['Part','Illustrative status','Next check'],[
   ['Passenger','Confirmed for [outbound sailing]','Match date and reference. Distinguish a reserved departure, an unreserved ticket and enhanced boarding.'],
   ['Vehicle','Not included in this example','Confirm need, permission and any reserved space or standby status. Check whether passenger fares are separate.'],
   ['Equipment','Kayak space unconfirmed','Transport operator confirms space; passenger travel does not settle this.'],
   ['Return','Not yet booked','Confirm return sailing and reference.'],
   ['Stay','Reserved separately','Check its independent change terms. Record transport and stay confirmations separately before promising revised arrival.']
  ])+p('Replace these illustrative statuses with verified details and enable only the arrangements actually offered.'));
  order(['customer-decision','layout','planning-1','planning-2','planning-3','check']);summary('florida-camping-capacity','Camping and kayak-space evidence');break;
 case 'marine-service-intake':
  replace('layout','Yard, berth or storage location','Selected yard, berth or storage location; offer a staff-routing option when unsure');
  replace('layout','<tr><th scope="row">Worksite entry','<tr><th scope="row">Location-specific facility</th><td>Selected lift, storage or other required facility; recheck after a location change</td><td>Named yard/facility coordinator confirms suitability and capacity</td></tr><tr><th scope="row">Worksite entry');
  replace('check','The record should retain the request while reopening location, access and scope review.','The record should retain the request while reopening location, access and scope review. If the selected location changes, clear or recheck dependent facility choices.');
  edit('florida-yard-location',b=>b.replace(/<p><strong>Try this case:<\/strong>[\s\S]*?<\/p>/,''));summary('florida-yard-location','Location-specific facility evidence');
  order(['customer-decision','layout','planning-1','planning-2','planning-3','check']);break;
 }
 switch(slug) {
 case 'service-area-pages': {
  const old=paragraphs('choose');
  set('choose',p('Start with the customer’s decision: address availability, remote or on-site delivery, service fit or the information needed for a quote. Improve the existing service or coverage page when it can answer that question.')+p('A separate page earns its place through substantial, supported and maintained advice, evidence or service information. This may be a complete preparation sequence even when service and prices are shared. A place name, landmark paragraph, stock photograph or local example alone is insufficient. There is no minimum city count or required quota of location pages.')+old.at(-1));
  set('example',paragraphs('example')[0]+table('Two fictional territory decisions',['Customer question','Useful new answer','Page decision','Owner'],[
   ['North: how are shared access, the site contact and water access arranged?','Owner-confirmed courtyard-cleaning route, address check and a complete preparation sequence: who confirms access, initial request details, site-contact participation and assessment limits.','Draft a focused explanation only if the completed answer adds substantial help beyond the core service page. Link the service and actual request route.','Operations owner; fictional route/access record, October 23, 2026. Review when access or coverage changes.'],
   ['South: do you serve my address and what should I send?','The main exterior-cleaning page already explains the same service, coverage and inquiry; no additional procedure or evidence is available.','Keep the shared coverage section; do not substitute a district name to create another page.','Operations owner; fictional coverage record, October 23, 2026. Review when territory changes.']
  ])+p('Neither row implies an office, completed local project, testimonial, demand estimate, guaranteed availability or ranking result. Do not invent an operating condition to justify a URL. If the North preparation sequence belongs naturally on the main service page, keep it there too.')+paragraphs('example').at(-1));
  removeInto('question','choose');break;
 }
 case 'small-business-faq-examples':
  for(const id of ['price-fit','coverage-inputs','timing-next-step'])edit(id,b=>[...b.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map(m=>{const split=m[1].indexOf('?');return `<h3>${m[1].slice(0,split+1)}</h3>`+p('<strong>Weak:</strong> '+m[1].slice(split+1).trim())+p('<strong>Better fictional answer:</strong> '+m[2])+p('<strong>Why it helps:</strong> '+m[3].split('. ')[0]+'.');}).join(''));
  edit('approve',b=>p('The owner must approve accepted work and exclusions, assessment charges, territory and travel conditions, required inquiry details and later photo routes, scheduling rules, recipient and fallback contact, and any reply window. Test the approved route; an aspiration is not a current service.')+b);break;
 case 'website-redesign-timeline':
  replace('example','Ready inputs → build work → first review window → agreed corrections → second review window → approval and launch readiness.','Ready inputs → writing/design → design review and approval → build → finished-site review, corrections and approval → launch checks.');
  edit('example',b=>b+paragraphs('studio')[0]);
  edit('studio',b=>b.replace(/^<p>[\s\S]*?<\/p>/,p('The proposal confirms the start, review windows and exact dates for your selected package. Build targets assume the agreed inputs are ready; late inputs and added work extend the elapsed schedule.')));break;
 case 'website-audit-checklist':
  for(const s of items)edit(s.id,b=>b.replace(/Status: fail\./g,'Status: Needs fixing.').replace(/“needs access”/g,'“Need access”').replace(/rather than a pass/g,'rather than “Works”').replace(/a missing account into a pass/g,'a missing account into “Works”'));
  get('owned-fixes').title='Examples: a wrong service link and an undelivered inquiry';get('access').title='Use “Need access” when you cannot test';break;
 }
 switch(slug) {
 case 'how-to-choose-a-web-designer': {
  const q=[...get('questions').body.matchAll(/<li>([\s\S]*?)<\/li>/g)].slice(3).map(m=>m[1]);
  set('questions',p('Record each answer and its supporting proposal clause or demonstration.')+'<h3>Scope</h3>'+ul([q[0],q[6],q[8]])+'<h3>Collaboration</h3>'+ul([q[1],q[4]])+'<h3>Ownership and acceptance</h3>'+ul([q[2],q[3],q[5],q[7]])+paragraphs('questions').at(-1));break;
 }
 case 'industrial-website-planning':
  replace('approval','Document owner; exact revision and approval.','Document owner; title, revision, publication date, intended use and approver.');
  replace('approval','Correct file opens, revision is visible and nearby text agrees.','Approved file opens; revision and purpose are visible; important fit information and surrounding page text agree.');
  edit('documents',b=>b.replace(/<p>For each specification[\s\S]*?<\/p>/,'').replace(/<p>The technical owner[\s\S]*?<\/p>/,p('Record how superseded files will be handled. Scope restricted-access workflows separately instead of publishing those files as ordinary downloads.')));break;
 case 'manufacturing-rfq-form':
  edit('planning-2',b=>'<h3>File requirements</h3>'+b.replace('<p>Give every inquiry','<h3>File receipt and additional transfers</h3><p>Give every inquiry')+'<h3>Revised files</h3>'+p('Identify the revision that replaces an earlier file under the same request reference. The reviewer confirms which version is current before quoting or production; a new upload alone does not approve the change.'));break;
 case 'repair-authorization-form':
  set('planning-3',p('Use the main decision record for status updates. Each email or portal update should identify the unit, the completed step and the next responsible party. Show a shipment authorization reference only after it is actually issued; name unresolved acceptance or estimate changes.')+'<details><summary>Shipping and completion boundaries</summary>'+p('Maintain current shipping requirements separately, with a staff contact for unusual equipment or contents. Do not invent packaging, decontamination or hazardous-material instructions, or turn a historical turnaround figure into a live completion promise.')+'</details>');break;
 case 'kayak-rental-access-information':
  set('planning-2',p('Assign staff to confirm the arrangements requested through the sample message above and identify anything unresolved before payment. If a conversation is needed, label the submission as an availability inquiry and state only the business’s approved reply arrangement.'));break;
 case 'marion-county-equestrian-stay-website':
  set('planning-2',p('In the three-arrangement record above, label outside-booking status as customer-reported and link to its responsible provider. “Requested” must not become “confirmed”. Each provider controls its own confirmation and cancellation terms; a date change may require the customer to revisit several bookings.'));
  break;
 case 'wholesale-order-readiness':
  for(const s of items)edit(s.id,b=>b.replace('The same supplier page','Primitives By Kathy’s ordering page').replace('the same supplier page','Primitives By Kathy’s ordering page'));
  set('planning-1',paragraphs('planning-1')[0]+p('Keep retail and trade routes visible before cart, delivery or payment entry. An application does not grant purchasing approval; use the <a href="/guides/approved-buyer-account-flow/">buyer-account guide</a> to define the pending and approved states.'));break;
 }
 switch(slug) {
 case 'citrus-county-manatee-tour-website':
  replace('layout','[Option one]','Land viewing, if offered');replace('layout','[Option two]','Paddle rental, if offered');replace('layout','[Option three, if offered]','Named guided activity, if offered');
  edit('planning-2',b=>'<h3>Meeting point</h3>'+b.replace('<p>Give seasonal','<h3>Seasonal access</h3><p>Give seasonal').replace('Keep any accessibility or equipment questions connected to a real person who can confirm the arrangement.','</p><h3>Assistance</h3><p>Connect accessibility or equipment questions to a real person who can confirm the arrangement.'));break;
 case 'experience-product-choice':
  set('layout',p('Compare only actual offers against current operator instructions. Passenger counts, including infants where required, are a shared check for every option.')+table('Experience choice record',['Option and access','Party conditions','Return or facilities','Booking owner'],[
   ['Fallingwater interior or grounds','Check the current age condition for the selected tour','Confirm the selected experience’s access','Operator’s specific tour route'],
   ['Fallingwater Family Field Trip: exterior only','Check the private-party arrangement','Interior access is not included','Telephone reservation with operator'],
   ['Rail Explorers route','Confirm this service’s party rules','Rail return with picnic stop, or shuttle return without that picnic area. Northern Ramble duration unresolved; omit a definitive duration pending operator clarification.','Select the route, then current operator departures'],
   ['Christmas at Cass carriage','Check current dates, party and seat requirements','Review restroom constraints for the selected carriage before checkout','Operator’s selected carriage ticket route']
  ]));
  set('planning-3',p('Check current dates and equipment for a seasonal Christmas service before publishing its offer.'),'Check the selected seasonal service');
  edit('check',b=>b.replace(' Ask the operator to resolve the Rail Explorers duration conflict before publishing a duration.',''));break;
 case 'island-payment-preparation':
  set('layout',p('Complete one card with each provider’s current terms; paid travel does not settle another merchant’s charge.')+table('Before-departure payment and parking card',['Item','Provider and instructions','Payment status'],[
   ['Travel','[Transport provider and current instructions]','[Paid / remaining amount; accepted method]'],
   ['Parking','[Selected lot, operator and current payment-instruction link]','[Paid / remaining amount; accepted method]'],
   ['Food or activity','[Actual merchant and confirmed inclusions]','[Paid / remaining amount; accepted method]']
  ])+p('Identify who receives each separate charge. For an uncertain plan, show the responsible business’s monitored contact route before travel.'));
  set('planning-1',p('Dated source note, October 22, 2026: Smith Island visitor information locates the nearest bank or ATM in Crisfield and says some island businesses accept cards or payment apps. Review cash needs before leaving the mainland; this does not make the island cash-only.'));break;
 case 'itinerary-dependency-review':
  set('layout',box('Illustrative change message',p('<strong>Before:</strong> “[Package] includes [outside activity].” <strong>While confirmation is missing:</strong> “We have paused new bookings for our [combined package/option] while [owner] checks the outside activity. [Confirmed remaining service] is still available. Contact [route] before relying on this itinerary.”'))+table('One record per dependent offer',['Dependent offer','Evidence to confirm','Owner','Status and customer action'],[
   ['Train-assisted cycling itinerary','Current operator confirmation of bike carriage','[Named itinerary owner]','Awaiting confirmation; hold the combined offer and use the supported inquiry route.'],
   ['Overnight extension from Frostburg','Suitable next-day return service','[Named return-planning owner]','Do not promise a return until confirmed; explain the unresolved leg.'],
   ['Manitou island trip','Current dock/boat access from NPS and transport provider','[Named access-check owner]','Hold the disputed promise until conflicting or stale evidence is resolved.']
  ])+p('These are proposed records. Replace statuses with verified facts and offer an inquiry only when your business can handle it; your paused package does not establish that an outside operator has stopped selling its own activity.'));break;
 case 'niagara-county-hotel-transport-information':
  edit('layout',b=>b.replace(/<tr><th scope="row">Maintenance record[\s\S]*?<\/tr>/,'')+'<h3>Update record</h3>'+p('Checked by: [owner]. Checked date: [date]. Applicable season: [season]. Next review: [date or change trigger]. Fallback arrival link: [verified route]. Maintain this record instead of copying a timetable from the tourism guide.'));break;
 case 'shared-kitchen-inquiry':
  edit('layout',b=>b.replace('<th scope="col">Initial answer to capture</th>','<th scope="col">Proposed stage and answer</th>').replace(/(<th scope="row">(?:Business model|Proposed work|Production scale|Timing|Onboarding status)<\/th><td>)/g,'$1Initial routing: ').replace('<th scope="row">Storage and receiving</th><td>','<th scope="row">Storage and receiving</th><td>Later review: ')+p('The facility approves these stages and which initial questions are required. Collect detailed storage, receiving and onboarding records later through the approved process; do not treat this proposed worksheet as the facility’s acceptance criteria.'));break;
 }
 switch(slug) {
 case 'website-care-versus-seo': {
  set('short-answer',paragraphs('short-answer').at(-1));
  const planParagraphs=paragraphs('plans');
  const costDetails=get('costs').body.replace(/^<details><summary>[^<]*<\/summary>/,'').replace(/<\/details>$/,'').replace(/<span id="before-buying"><\/span>/,'');
  set('plans','<details><summary>Plan prices, limits and renewal terms</summary>'+planParagraphs[1]+costDetails+planParagraphs[3]+'</details>','Plan prices, limits and renewal terms');
  removeInto('costs','plans');
  edit('compare',b=>b+p('Care includes supported maintenance, documented recovery coverage and representative quarterly recovery tests. Major upgrades, malware cleanup and recovery from unrelated incidents need a separately approved scope.'));break;
 }
 case 'website-maintenance-cost':
  set('task-owners',table('Responsibility for five common requests',['Request and scope','Owner','Separately scoped work'],[
   ['Supplied photo replacement: may fit the monthly small-edit set after scope check.','Business supplies approved files, captions and permission; studio checks layout and links.','Original photography or a new gallery.'],
   ['New service page: agreed Improve/Grow improvement or priced addition.','Owner approves accepted work, exclusions, coverage and evidence; agree completion checks.','Not a supplied small edit.'],
   ['Form failure: agreed care check records the failed step.','Studio records test; owner supplies authorized access or involves provider.','Repair depends on cause and scope; no unlimited repair promise.'],
   ['Booking link: check the agreed existing link.','Confirm account owner, supported connection and provider bill.','Setup or changes to the connection.'],
   ['Platform recovery coverage: agreed at onboarding.','Studio and provider responsibilities documented before enrollment.','Supported maintenance and representative recovery tests are included. Malware and unrelated incident recovery are separately scoped. Automated monitoring is not continuous human staffing.']
  ])+paragraphs('task-owners').at(-1));
  edit('choose-care',b=>b.replace(/<p>If the site works[\s\S]*?<\/p>/,p('Use <a href="/guides/website-care-versus-seo/">care versus SEO</a> to match the work to an ongoing arrangement.')));summary('choose-care','Choose a review or ongoing help');break;
 case 'website-redesign-brief':
  edit('editing',b=>b.replace(/<p>Describe updates[\s\S]*?<\/p>/,p('Studio projects agree the platform and editing workflow before booking. You receive written instructions, recorded demonstrations and the agreed files/account inventory. State the tasks your team needs to edit in a browser so that the proposal names a suitable setup.')));break;
 case 'website-project-cost': {
  const r=rows('matched-proposals');
  const keep=[2,5,7,3];
  const existing=paragraphs('matched-proposals');
  set('matched-proposals',existing[0]+table('Four differences to resolve',['Requirement',...r[0].slice(1)],keep.map(i=>r[i]))+'<h3>Also confirm</h3>'+ul([1,4,6,8].map(i=>`<strong>${r[i][0]}:</strong> A: ${r[i][1]} B: ${r[i][2]}`))+p('Use the <a href="/guides/how-to-choose-a-web-designer/">provider comparison guide</a> to request the same missing facts from both bidders. Compare complete scope rather than an assumed market average.')+existing.at(-1));break;
 }
 case 'website-repair-or-redesign':
  edit('start',b=>b.replace(/<ul><li>Keep it when[\s\S]*?<\/ul>/,'').replace(/<p>Review the site when[\s\S]*?<\/p>/,p('Review when services, customer tasks or editing needs change, or when supported repairs no longer resolve repeated problems. No fixed replacement interval fits every business.')));break;
 }
 switch(slug) {
 case 'parts-compatibility-inquiry':
  edit('layout',b=>b.replace(/^<div class="journal-callout"[\s\S]*?<\/div>/,'')+box('Fictional specialist handoff',p('Item: [selected catalog reference]. Known configuration: [documented original application]. Change: replacement engine reported by the customer. Unresolved question: whether the selected part suits the changed configuration. The specialist confirms what further evidence is needed; this record is not fit approval.')));
  set('planning-1',paragraphs('planning-1')[0]+p('Expose specialist review alongside catalog lookup, including when a lookup returns an item. A no-results screen should not be the only route for modified or uncertain equipment.'));break;
 case 'otsego-county-baseball-lodging-website':
  replace('check','Review case: a team organizer','Apply the family record above to this case: a team organizer');
  set('planning-2',p('If several households will pay separately, establish whether the owner can hold a group allocation, accept separate reservations or quote only one booking. Publish only arrangements the business actually offers.'),'Resolve the multi-household payment and hold');break;
 case 'walton-county-bonfire-booking-website':
  set('planning-1',p('Use the selected access point and event date from the main record consistently on the button, checkout and acknowledgement. A package photograph must not imply every pictured beach is available. When a fallback is offered, record the customer’s second choice and whether staff must contact them before changing it; a blank choice is not permission.')+p('Keep each map preview tied to the choice and version under discussion, so a later location change does not leave an old pin in the confirmation.'));
  set('planning-2',p('If payment is accepted before location readiness is confirmed, use owner-approved terms for that stage and the outcome if the arrangement cannot be completed.')+paragraphs('planning-2').at(-1));break;
 case 'ferry-route-and-last-mile':
  edit('sources',b=>b.replace(/(<li><a href="https:\/\/www\.cmlf\.com\/ground-transportation-and-shuttles\/">[\s\S]*?) <span>Reviewed 2026-10-22\.<\/span><\/li><li><a href="https:\/\/www\.cmlf\.com\/ground-transportation-and-shuttles\/">[^<]*<\/a>\. /,'$1 '));break;
 case 'alexandria-sign-project-website': {
  const observation=paragraphs('planning-1')[0];
  set('planning-1',p('Alexandria’s reviewed policy separates administrative/Board review from sign or building permits. That distinction belongs beside the site-review step; it does not determine the route for a particular customer’s sign.')+paragraphs('planning-1')[1]+'<details><summary>Dated Alexandria policy observation</summary>'+observation+'</details>');break;
 }
 case 'departure-address':
  edit('planning-1',b=>'<details><summary>Why a landmark can give the wrong arrival route</summary>'+b+'</details>');summary('florida-cruise-terminals','Departure and return terminal evidence');break;
 }
 switch(slug) {
 case 'local-seo-profile-eligibility':
  set('pages',p('Use the <a href="/guides/service-area-pages/">service-area page guide</a> to decide whether coverage belongs on an existing service page or needs a substantial separate explanation.'));
  set('sequence','<span id="local-profile-actions"></span>'+ul(['For an eligible profile, choose the fewest specific categories describing the actual work and apply the address-display guidance above.','Keep the maintained website, phone number and customer-facing hours consistent.','Invite honest reviews after real work without rewards; replies must protect customer details.'])+p('Follow <a href="https://support.google.com/business/answer/3474122">Google’s review guidance</a>. Use the <a href="/guides/local-seo-audit/">local SEO audit</a> for the surrounding website and inquiry checks.'));
  set('expectations',p('Use <a href="/guides/seo-work-and-reporting/">work and reporting</a> to define an improvement and evaluate its evidence.')+paragraphs('expectations').at(-1));break;
 case 'quote-request-form':
  edit('field-review',b=>b+p('<strong>Shared required contact fields:</strong> name and one reliable email reply route (work email for the B2B example). The tables below show each task’s four additional fields; timing is optional. Each fictional form therefore has six fields in total.'));
  for(const id of ['project-example','scheduled-example','b2b-example'])edit(id,b=>b.replace(/<tr><th scope="row">(?:Name|Email|Contact name|Work email)<\/th>[\s\S]*?<\/tr>/g,'').replace(/Six fields for a /g,'Task-specific fields for a '));break;
 case 'seo-work-and-reporting': {
  const references=paragraphs('work').join('')+paragraphs('receipt').join('');
  edit('completed-report',b=>b+references);removeInto('work','completed-report');removeInto('receipt','completed-report');
  const keyword=get('keyword-opportunities').body;
  const worked=keyword.match(/<div class="journal-table-wrap"[\s\S]*?<\/table><\/div>/)?.[0];
  set('keyword-opportunities','<span id="local-keywords"></span>'+p('Start with the real service, actual coverage and a customer question. Combine customer evidence and Search Console with keyword estimates; record the source, database, date, geography and missing metrics. Inspect current results to distinguish a service, guide, product, map listing or comparison.')+ul(['Investigate relevant lower-competition terms, useful existing impressions and seasonal questions. Low difficulty without business fit is not an opportunity.','Compare current pages and identify a truthful contribution. Group close variants around one need and improve an existing page when it fits.','Record approved facts, the destination, why the task matters and its completion check. Estimates do not predict Maps position, and national figures for a place-name query do not count local residents.'])+worked+paragraphs('keyword-opportunities').at(-1));
  edit('campaigns',b=>b.replace(/^<details><summary>[^<]*<\/summary>/,'').replace(/<\/details>$/,''));summary('campaigns','Local Search Partnership allowance and approval rules');break;
 }
 }
 switch(slug) {
 case 'slow-website-on-mobile': {
  edit('test-speed',b=>b.replace('Note whether the real-user section describes this page or the whole origin, meaning the site at that domain and protocol.','Record the data type and coverage using the reference below.').replace(/<p>PageSpeed Insights distinguishes[\s\S]*?<\/p>/,''));
  const metric=paragraphs('interpret')[0];
  set('interpret',table('Reading a performance report',['Term','Meaning and limit'],[
   ['Lab','A controlled test; useful for diagnostics, but not every visitor, phone or later interaction.'],
   ['Field','Real-user data. PageSpeed Insights uses a rolling 28-day window, so a release does not instantly replace it.'],
   ['URL / origin','One page versus the site at its domain and protocol. Low-traffic pages may show origin data or no field data; absence means insufficient data, not pass or fail.']
  ])+p('See <a href="https://developers.google.com/speed/docs/insights/v5/about">the PageSpeed Insights explanation</a>. Check the immediate task and comparable lab evidence after a change; review later field data separately.')+metric+p('Google’s <a href="https://web.dev/articles/vitals">Core Web Vitals explanation</a> describes these metrics. A lab score does not represent all customers, and a better score does not guarantee rankings or inquiries.'));break;
 }
 case 'website-not-generating-leads': {
  const worked=get('worked-example').body;
  edit('find-the-bottleneck',b=>b+'<h3>Fit-stage example</h3>'+worked.replace(/<p>If visitors cannot find[\s\S]*?<\/p>/,p('Use <a href="/guides/website-repair-or-redesign/">repair or redesign</a> to choose the size of a supported change.')));
  removeInto('worked-example','find-the-bottleneck');
  set('measurement',p('Use the records you already have and mark missing measurements as unknown. Consent choices and blocked scripts can leave analytics gaps; a missing measurement does not establish a failed customer step.'));break;
 }
 case 'website-not-showing-on-google': {
  const r=rows('specific-index-checks');
  set('specific-index-checks',[['Access',[1,2]],['Replacement or duplicate',[3,4,5]],['Errors',[6,7]],['Discovery',[8,9]]].map(([label,indices])=>`<h3>${label}</h3>`+table(label+' findings and next checks',r[0],indices.map(i=>r[i]))).join('')+paragraphs('specific-index-checks').at(-1));break;
 }
 }
 switch(slug) {
 case 'website-content-template': {
  const original=rows('page-purpose');
  original[1][2]='Prompt: “We help [customer] with [specific service] in [actual coverage]. [Useful boundary or process detail]. To begin, [action].” Add approved proof and descriptive service links; do not repeat every service in the introduction.';
  original[2][2]='Accepted jobs and exclusions; required inputs; deliverables and sequence; permissioned evidence or labeled illustration; decision-changing questions; who replies and what happens next. Different services need their own facts, timelines and questions.';
  original[3][2]='Prompt: “I am [name and role]. I help [customer] with [work]. Here is how I handle [important decision]. See [approved evidence] or contact [route].” Use confirmed experience and proportionate biography; do not imply a team or history that does not exist.';
  original[4][2]='Name the inquiry, estimate or appointment request and whether a person reviews it first. Identify required/optional details, accurate reply arrangements, errors and confirmation. Defer sensitive or complex information to an appropriate exchange.';
  set('page-purpose',table('Core website content plan',original[0],original.slice(1))+paragraphs('page-purpose').at(-1));
  const contactLinks=paragraphs('contact').at(-1);
  for(const id of ['homepage','about','contact'])removeInto(id,'page-purpose');
  set('service','<span id="service-page-seo"></span>'+p('In the fictional repair example, “Do you repair railings?” belongs if the owner confirms the work; “What is home improvement?” adds little to this service decision, even if a keyword tool shows high demand. Answer related wording variants once beside the relevant detail; use the <a href="/guides/small-business-faq-examples/">FAQ examples</a> for several connected questions.')+p('The <a href="#notes-to-copy">annotated example</a> shows the full transformation. Use a separate guide only when a worked process would overwhelm the service page.'),'Choose useful service-page questions');
  edit('notes-to-copy',b=>b.replace(/<p>Use the existing <a href="\/assets\/guides\/website-content-template.txt"[\s\S]*?<\/p>/,''));
  const approval=paragraphs('facts')[1];set('facts',paragraphs('facts')[0]);
  edit('review',b=>approval+contactLinks+b);break;
 }
 case 'website-launch-announcement':
  edit('fictional-brief',b=>b.replace(/<p>The business owner must approve[\s\S]*?<\/p>/,''));
  edit('email',b=>b.replace(' Send through the business’s approved email process to an appropriate audience; this template does not establish permission to contact anyone.',''));
  edit('social',b=>b.replace(/<p>Use an approved screenshot[\s\S]*?<\/p>/,p('A shorter channel version must preserve the same factual promise, without adding a new service, promotion or opening date.')));
  edit('notice',b=>b.replace(' Record when the notice will be reviewed or removed, so a launch message does not stay “new” indefinitely.',''));
  edit('approve-send',b=>b.replace('Approved version with every prompt replaced.','Approved version with every bracketed prompt replaced by checked facts and working links; include image permission and the channel’s text description.').replace('Account owner, intended audience and chosen posting or sending route.','Account owner, appropriate audience and approved posting or sending process. A template does not establish permission to contact anyone.'));break;
 case 'website-launch-checklist': {
  edit('release-record',b=>b.replace(' Note the version, approver, date and checks.',''));
  edit('recovery',b=>b.replace('A launch record should name the published version, date, approver, checks and unresolved items. ','Use the release record above. '));
  const collected='<h3>Before launch: content</h3>'+get('content-approval').body+'<h3>Before launch: customer journey</h3>'+get('customer-journey').body+'<h3>Before launch: accounts and recovery</h3>'+get('accounts-search').body+get('recovery').body+'<h3>After launch: the public version</h3>'+get('live-check').body;
  set('content-approval',collected,'Release checks before and after launch');
  for(const id of ['customer-journey','accounts-search','recovery','live-check'])removeInto(id,'content-approval');break;
 }
 }
 switch(slug) {
 case 'website-maintenance-checklist': {
  const existing=paragraphs('recovery');
  set('recovery',existing.slice(0,6).join('')+'<h3 id="maintenance-time">How long does website maintenance take?</h3>'+p('Use the <a href="#start">responsibility split above</a> to assign the task before agreeing timing. Record work time, elapsed wait for access/approval, and customer downtime separately; no universal duration fits every task.')+box('One planning example',p('For supplied opening-hour changes, the editor prepares and checks the page, waits for the owner’s approval, then publishes and retests. Preparation can occur without a planned outage. A platform change may instead require its provider to agree a maintenance window, notice and restoration plan. Record the planned window, actual interruption and completion evidence in the same log.')));break;
 }
 case 'website-migration-checklist': {
  const redirectDetails=paragraphs('redirect-example')[0];
  set('map','<span id="redesign-seo-checklist"></span>'+redirectDetails+paragraphs('map').at(-1));removeInto('redirect-example','content-inventory');
  const current=paragraphs('after');
  set('after','<span id="redesign-help"></span>'+current.slice(0,3).join('')+'<span id="traffic-drop"></span><details><summary>Investigate a traffic drop</summary>'+p('Identify what fell: recorded visits, search clicks, impressions or suitable inquiries. Compare the same reporting setup, period length, search type and filters; note tracking/consent changes, seasonality and incomplete data.')+p('Use the inventory to check affected old/new URLs, retained explanations and internal links. Follow the <a href="/guides/website-not-showing-on-google/">search-visibility checks</a> for indexing, canonical or access findings, and <a href="https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops">Google’s traffic-drop guidance</a> for wider patterns. Repair and retest verified defects; a change occurring after launch does not by itself establish its cause.')+'</details>');break;
 }
 }
 switch(slug) {
 case 'timed-booking-handoff': {
  const unwrap=b=>b.replace(/<details>\s*<summary>[\s\S]*?<\/summary>/g,'').replace(/<\/details>/g,'');
  const preparation=unwrap(get('planning-1').body).replace('Essex Steam Train distinguishes the train-only and train-and-boat products, and requires physical ticket collection. ','');
  edit('check',b=>p('Dated product distinction: Essex Steam Train’s reviewed page separates train-only from the longer train-and-boat trip and requires physical ticket collection before departure. Keep that selected product’s duration and collection step with the test below.')+b);
  const library='<h3>Product preparation</h3>'+preparation+'<h3>Access separate from lodging</h3>'+unwrap(get('planning-4').body)+'<h3>Campsite, equipment and transport</h3>'+unwrap(get('planning-5').body)+'<h3>Other admission and timing cases</h3>'+unwrap(get('related-cases').body);
  set('related-cases',library,'Operator evidence library');
  for(const id of ['planning-1','planning-4','planning-5'])removeInto(id,'related-cases');break;
 }
 case 'vacation-rental-property-fit':
  set('planning-3',p('Keep price and booking status tied to the current offer or booking system. A question does not reserve dates. Test the exact-property booking handoff on a phone, including the route back when the requested stay does not fit. The alternative in the main card remains a separate offer until accepted.'));
  set('planning-1',p('Carry the selected property name or public identifier into the form and acknowledgement, with a way to correct it. If no property is chosen, offer a property-search inquiry for destination, dates and flexibility, guest count and the few requirements that change a recommendation. Do not collect a full roster or identity documents at this stage.'));
  set('source-observations','<details><summary>Dated property and minimum-stay comparison</summary>'+table('Published examples checked October 22, 2026',['Property or source','Stay and date condition','Limits to carry forward'],[
   ['<a href="https://www.royalshell.com/vacation-rentals/florida/sanibel-island/almas-cove/508964/">Royal Shell — Almas Cove, Sanibel</a>','Reviewed listing: two-month minimum.','Property-specific guest and pet information; do not assume a portfolio-wide weekly stay.'],
   ['<a href="https://www.royalshell.com/seasonal-vacation-rentals/florida/naples/verona-walk/hvr8484/">Royal Shell — H VR 8484, Verona Walk</a>','Reviewed seasonal listing: four-month requirement; ask about off-season opportunities.','Keep these terms with this Naples property, separate from the Sanibel example.'],
   ['<a href="https://beachsidemanagement.com/faqs">Beachside Management — Siesta Key rental questions</a>','Minimum stays vary by unit and season.','Property-specific fees and staff questions; a general FAQ does not replace current selected-unit terms.']
  ])+'</details>');break;
 }
 switch(slug) {
 case 'alexandria-sign-project-website':
  for(const [id,note] of [
   ['planning-2','AV Horizon’s example separates permitting tasks and owners; use that distinction to define what your own quote includes.'],
   ['planning-3','Craft Onyx’s fabrication with customer mounting illustrates a different service boundary from an installed offer. State who receives the sign, arranges mounting and handles required reviews.']
  ]){const ps=paragraphs(id);set(id,p(note)+ps[1]+'<details><summary>Dated operator scope observation</summary>'+ps[0]+'</details>');}break;
 case 'departure-address': {
  edit('layout',b=>b.replace(/(<div class="journal-table-wrap"[^>]*aria-label="A layout to adapt to your business">[\s\S]*?<\/table><\/div>)/,'<details><summary>Evidence for the arrival instructions</summary>$1</details>'));
  const examples=get('planning-1').body.replace(/^<details><summary>[^<]*<\/summary>/,'').replace(/<\/details>$/,'');
  set('planning-1','<details><summary>Dated arrival examples by field</summary><h3>Boarding address</h3>'+examples+'<h3>Vehicle and parking</h3>'+get('planning-2').body+'<h3>Season and access arrangement</h3>'+get('planning-3').body+'</details>','Arrival evidence by field');
  removeInto('planning-2','planning-1');removeInto('planning-3','planning-1');break;
 }
 case 'website-redesign-brief':
  edit('requirements-evidence',b=>b.replace(/<p><a href="\/assets\/guides\/website-redesign-brief.txt"[\s\S]*?<\/p>/,''));
  edit('acceptance',b=>b.replace(/<div class="journal-callout"[^>]*><h3>A brief you can reuse<\/h3>[\s\S]*?<\/div>/,''));
  set('rfp',p('<a href="/assets/guides/website-redesign-brief.txt" download>Download the redesign brief (TXT)</a>, fill it with your business facts and send the same requirements to each designer. Ask for included work, exclusions, outside costs, timing, payment terms and the change process; compare their answers in this shared record.'));break;
 case 'website-repair-or-redesign': {
  const keep=paragraphs('keep');
  edit('worksheet',b=>b+keep[1]+p('For a proposed fix, record the affected page, supported change, account access, undo route, exact customer retest and owner of any remaining problem.'));
  set('keep',keep[0]);
  edit('contained',b=>b.replace(/<ul>[\s\S]*?<\/ul>/,p('Complete the access, undo and retest fields in the decision record above before authorizing the change.')));
  replace('rework','scope a rebuild with retained content, useful URLs, account ownership and migration checks.','scope a rebuild using the retained-content and account record above, plus migration checks.');break;
 }
 }
 return items.map(s=>'bodyHTML' in s?{...s,bodyHTML:s.body}:s);
}
