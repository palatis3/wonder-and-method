// One-use targeted repairs; keep prior judgments and before/after evidence intact.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='operations/human-quality-20261027',receiptFile=root+'/research/residual-f-repair.json';
assert(!fs.existsSync(receiptFile),'Repair already applied');
const file=root+'/drafts/local-6.jsonl',rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reviews=fs.readFileSync(root+'/audits/local-after-residual-f.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const sourceFile='src/location-service-data.json',sources=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),edits=[],sourceEdits=[];
function edit(route,change){const d=rows.find(r=>r.route===route),r=reviews.find(r=>r.route===route);assert(d&&r?.requiredFixes.length,route);assert.equal(hash(d),r.draftSha256,route);const before=structuredClone(d);change(d);assert.equal(d.inputHash,before.inputHash);assert.equal(d.route,before.route);edits.push({route,partition:6,before,after:structuredClone(d),beforeSha256:hash(before),afterSha256:hash(d),requiredFixes:r.requiredFixes});}
function source(route,change){const s=sources.find(x=>x.path===route);assert(s);const before=structuredClone(s);change(s);s.checkedDate='2026-10-27';sourceEdits.push({route,before,after:structuredClone(s),beforeSha256:hash(before),afterSha256:hash(s)});}
function observation(s,url,text){const item=s.sources.find(x=>x.url===url);assert(item,url);item.observation=text;}
edit('/areas/ulster-county/',d=>{
 d.decisions[1].body='Use the route the owner confirms for that offering. Fictional choices: “I want the listed Saturday beginner session” can lead to its approved provider listing; “Could you arrange a private session for our group on [date]?” should retain the group request for staff review when discussion is required. These illustrate two routes, not Kingston Ceramics Studio’s booking rules. A private inquiry does not reserve a session.';
});
edit('/areas/vermont/bennington-county/',d=>{
 d.decisions[2].body='Give older or unlisted equipment a review route, including archive assessment where offered. Ask for the equipment reference and the setup that must travel together. An archived pattern is not an in-stock item, and a past design does not confirm that a new case can be supplied for the current kit.';
 d.limits='The maker confirms fit and production options. Fit calculators, equipment modeling, configurators and manufacturing connections require separate scope; clear preparation can support the existing custom-project inquiry.';
});
edit('/areas/vermont/essex-county/',d=>{
 d.decisions[0].body='Island Pond Country Inn’s published categories make a useful comparison: Essentials lists a small refrigerator; Deluxe describes an eat-in kitchen with smaller appliances; Suites list an equipped full-size kitchen. The Deluxe description does not enumerate those appliances, so a guest who needs a particular cooking method should ask rather than infer a stovetop or microwave from the category name.';
 d.decisions[1].body='The Suites description includes bar seating and a dining area. Keep that fact beside the Suite photographs, and ask the owner for any group-specific seating detail before publishing a dining capacity. Sleeping occupancy alone does not establish how many people can eat together.';
 d.decisions[2].body='The published Suite deck gas grill is listed for spring, summer and fall. Put that qualification beside the grill rather than letting a summer photograph promise winter use. Preserve the exact accommodation choice through the existing booking link and keep a question route for uncertain meal plans.';
 d.sourceBridge='Island Pond Country Inn in Brighton publishes different meal facilities for Essentials, Deluxe and Suite categories. The comparison above uses its accommodation descriptions checked October 27, 2026; unspecified Deluxe appliances and dining capacity remain questions for the inn.';
});
source('/areas/vermont/essex-county/',s=>observation(s,'https://ipcinn.com/accommodations/','Essentials lists a small refrigerator; Deluxe describes an eat-in kitchen with unspecified smaller appliances; Suites list an equipped full-size kitchen, bar seating and dining area, with a deck gas grill for spring, summer and fall.'));
edit('/areas/vermont/windsor-county/',d=>{d.limits='Class inventory, private scheduling, payments and participant accounts require separate scope. Clear descriptions can connect the school, café and store while preserving their different visitor commitments.';});
edit('/areas/virginia/alexandria-city/',d=>{
 d.decisions[1].body='Use only images approved for publication with the necessary creator credits and restrictions. Keep the credit beside the photograph and record any limits on later reuse. A framed artwork and its photograph can involve different permissions, so approval of one should not silently stand in for the other.';
 d.limits='Collection records, secure uploads and project systems need separate scope. Accurate contribution captions can connect accepted services to an ordinary item or collection inquiry without requiring confidential records in the first message.';
});
edit('/areas/virginia/alleghany-county/',d=>{
 d.decisions[2].body='Attach the correct building and studio to the selected activity. The ended glass listing identified the Glass Studio at 512 Church Street; that dated example should not send someone to a generic school destination. Use the owner’s current session information for an actual registration and arrival plan.';
 d.limits='The owner approves current offers and participant requirements. Eligibility automation, attendance, payments and student records need separate scope; the public page can clarify the class choice before the existing registration handoff.';
});
edit('/areas/virginia/amherst-county/',d=>{d.limits='Ticketing, capacity, contracts and calendar synchronization require separate scope. Accurate event descriptions can distinguish ordinary visits, offsite appearances and private inquiries while preserving the existing ticket and contact routes.';});
edit('/areas/virginia/arlington-county/',d=>{
 d.decisions[0].body='Use a concise, approved account of the firm’s role, deliverables and relevant capability. Name the contribution behind the example so a client logo does not have to stand in for an explanation of the work.';
 d.decisions[1].body='A fictional inquiry could say: “Selected capability: [service name]. We need an assessment of our existing process and a written set of options for our team to discuss. Can you review whether that assignment fits?” Carry the service and desired deliverable into the received message. This is an invented request, not a claimed client result or a service promise by either named firm; detailed private records can wait for an agreed exchange.';
 d.limits='The firm confirms assignment fit and the next consultation. Proposal portals, sensitive document exchange and procurement workflows require separate scope; a capability page can prepare an ordinary introduction.';
});
edit('/areas/virginia/augusta-county/',d=>{
 d.decisions[0].body='Valley Mills Farm’s published Weekend package gives Friday noon–9 p.m. access for setup and rehearsal. Its separately named Single Day Investment lists 12 hours of venue access. Put those terms side by side: the single-day name should not imply the same previous-day preparation window. The venue confirms the selected package and date.';
 d.decisions[1].body='For the Weekend package, Saturday access is 9 a.m.–11 p.m.; festivities end at 10 p.m., with everyone offsite by 11 p.m. Its preparation suites open five hours before the event, while Single Day Investment lists three hours of Manor Suite and Dressing Cottage use. Keep preparation-space access distinct from the whole venue’s access period.';
 d.decisions[2].body='The Weekend package lists Sunday 8–10 a.m. collection of personal items. Both compared packages list venue setup and teardown of ceremony and reception spaces, but that does not make personal-item collection the same task. Ask how any collection need outside the selected terms would be handled before treating it as included.';
 d.sourceBridge='Valley Mills Farm in Swoope publishes the Weekend and Single Day Investment terms compared above. These details were checked October 27, 2026 and illustrate preparation, event and collection access; other packages have different terms and are not interchangeable.';
});
source('/areas/virginia/augusta-county/',s=>observation(s,'https://www.valleymillsfarm.com/weddings/','Weekend terms distinguish Friday preparation, Saturday venue and suite access, and Sunday personal-item collection; Single Day Investment lists 12 hours of venue access and three hours of preparation-suite use. Both list ceremony/reception setup and teardown.'));
edit('/areas/virginia/bland-county/',d=>{
 d.customerQuestion='How should the visit page distinguish facility hours, guided departures and the last self-guided start?';
 d.decisions[0].body='Wolf Creek Indian Village & Museum’s published example lists museum and shop hours of 9 a.m.–5 p.m., Monday–Saturday, with Sunday closed. Guided village tours run 10 a.m.–3:30 p.m., departing each half hour subject to guide availability. Keeping those labels separate prevents the 5 p.m. closing time from looking like a last guided departure.';
 d.decisions[1].body='The last published self-guided departure is 4 p.m., with the visit completed by 5 p.m. A fictional 4:15 p.m. arrival question therefore needs a reply about what remains possible; it should not be routed as though either tour is still starting. The dated timetable does not establish today’s guide availability or accept a visit.';
 d.sourceBridge='Wolf Creek Indian Village & Museum publishes the separate facility and departure times above and directs groups to arrange visits by phone. The timetable was checked October 27, 2026. Bland County identifies the Bastian-address attraction as a county destination.';
});
source('/areas/virginia/bland-county/',s=>observation(s,'https://indianvillage.org/the-village/','Lists Monday–Saturday museum/shop hours of 9 a.m.–5 p.m.; guided departures from 10 a.m. through 3:30 p.m. each half hour subject to guide availability; last self-guided departure 4 p.m. and completion by 5 p.m.; Sunday closed.'));
edit('/areas/virginia/botetourt-county/',d=>{
 d.decisions[2].body='The published Arcadia Campground address is 1800 Arcadia Road, Buchanan; the outfitter office is separately listed at 640 Lowe Street, Buchanan. Keep each address labeled by its purpose and follow the operator’s instructions for the selected arrangement. The presence of both addresses does not tell every camping guest to check in at the office or create a combined paddle-and-camp booking.';
 d.sourceBridge='Twin River Outfitters describes day trips and makes Arcadia Campground available to the public by advance reservation. Its campground page, checked October 27, 2026, gives distinct Arcadia Road and Lowe Street addresses. A trip, an overnight stay and the corresponding arrival instructions need separate explanations.';
});
source('/areas/virginia/botetourt-county/',s=>observation(s,'https://canoevirginia.net/campgrounds/arcadia/','Makes Arcadia Campground available to the public by advance reservation at 1800 Arcadia Road, Buchanan; lists the outfitter office separately at 640 Lowe Street, Buchanan.'));
edit('/areas/virginia/charlottesville-city/',d=>{
 d.decisions[2].label='Check both customer journeys';
 d.decisions[2].body='Review the public navigation as a first-time prospect and as a returning customer. On a phone, each should be able to identify the appropriate action and reach its approved destination. Record the public handoff that was checked without presenting it as proof that every private account task works.';
 d.limits='The public website can explain services and link the existing client hub. Rebuilding the provider system or transferring private customer data requires separate scope.';
});
edit('/areas/virginia/clarke-county/',d=>{
 d.decisions[0].body='Mount Hebron Farm’s field-boarding description lists run-in shelters, automatic water, covered hay from December through March and rotational grazing. Keep those facilities and the seasonal hay period together; they do not imply that every care task is supplied.';
 d.decisions[1].body='The farm describes owners as generally responsible for the remaining care and invites contact about occasional help for travel, schedule changes or weather. A fictional inquiry could state, “I expect to be away on [dates]; which responsibilities would I need to arrange, and is any temporary help available?” The question does not create an absence-care commitment.';
 d.decisions[2].body='The published stalls are for temporary holding, with examples such as veterinary or farrier visits and rides, rather than an automatic ongoing stall allocation. Ask the farm to review the intended use. It is a private family property, so address and tour arrangements should continue through its contact process.';
 d.sourceBridge='Mount Hebron Farm identifies a Clarke County location near Berryville. Its boarding page, checked October 27, 2026, supplies the facility and responsibility distinctions above. Its dated prices and future-service note are not used here as evidence of current availability.';
});
source('/areas/virginia/clarke-county/',s=>observation(s,'https://www.mount-hebron-farm.com/horse-boarding','Describes run-in shelters, automatic water, covered hay December–March and rotational grazing; owners generally handle remaining care and can ask about occasional assistance. Stalls serve temporary holding, and visits/address details require contact.'));
edit('/areas/virginia/colonial-heights-city/',d=>{
 d.decisions[2].label='Keep labeled orders with the distribution plan';
 d.decisions[2].body='Explain who collects or ships the finished items and how individually labeled orders reach the right supporter. Keep the organizer’s distribution contact attached to the campaign. A completed production run does not by itself tell supporters when or where to receive their items.';
 d.limits='Content does not create a fundraising shop or guarantee proceeds. Campaign stores, payment collection, order administration and proceeds calculations need separate scope.';
});
edit('/areas/virginia/cumberland-county/',d=>{
 d.decisions[0].body='Spruceberry Farm lists the Great Pumpkin Patch for September–October and Evergreen Expedition year-round. That named contrast helps a teacher planning a spring visit avoid treating an autumn crop activity as an all-year offer. The farm confirms which program and date it can arrange; curriculum claims need their own supporting evidence.';
 d.decisions[1].body='Invite the class’s ages, participation needs and mobility questions before agreeing a route. The farm acknowledges terrain challenges and describes adaptive field routes, which gives teachers a reason to discuss the actual group rather than infer universal access from a general farm photograph.';
 d.decisions[2].body='The published guidance permits packed lunches in designated indoor or outdoor picnic zones. It describes moving educational stations indoors in light rain and rescheduling for severe weather. Keep those conditions with the trip plan and let staff confirm the day’s arrangement rather than turning general opening hours into a school itinerary.';
 d.sourceBridge='Spruceberry Farm’s Cumberland County field-trip page, checked October 27, 2026, names seasonal and year-round programs and provides lunch, weather and terrain context. Those details make the learning choice and practical day useful parts of one inquiry.';
});
source('/areas/virginia/cumberland-county/',s=>observation(s,'https://www.spruceberryfarm.com/field-trips','Lists Great Pumpkin Patch for September–October and Evergreen Expedition year-round, designated picnic zones for packed lunches, indoor stations in light rain and severe-weather rescheduling; acknowledges terrain challenges and adaptive route discussions.'));
edit('/areas/virginia/dickenson-county/',d=>{
 d.decisions[0].body='Thunder River’s Full Hook Up Site 9 lists water, sewer and electricity; Primitive Site 8 is described as a grassy riverside tent/pop-up location with a picnic table and fire ring. Keep the connection description with the named site instead of transferring the full-hookup list to the primitive option.';
 d.decisions[1].body='Site 9 is described as back-in and 25 by 50 feet. Site 12 is also back-in but its published listing does not state dimensions. Display that difference openly and ask staff about the full vehicle setup; Site 9’s dimensions must not fill the gap in Site 12’s description or establish either site’s fit.';
 d.decisions[2].body='Site 9 is described with a river view; Site 12 is on the upper level with a mountain view and water, sewer and 50-amp electricity. Match photographs to those site identities. A river photograph should not make every full-hookup listing look riverside, and a published listing does not prove current availability.';
 d.sourceBridge='Thunder River Campground’s public inventory, checked October 27, 2026, supplies the named site distinctions above. County visitor information confirms its Haysi location. Missing dimensions and vehicle suitability remain questions for the operator.';
});
source('/areas/virginia/dickenson-county/',s=>observation(s,'https://www.thunderrivercg.com/inventory','Site 9 is back-in, 25 by 50 feet, with full hookups and a river view. Site 12 is upper-level back-in with water/sewer/50-amp electricity and mountain view, without stated dimensions. Primitive Site 8 is a grassy riverside tent/pop-up location.'));
edit('/areas/virginia/fairfax-area/',d=>{d.limits='The owner confirms coverage and whether the requested work can be accepted. Address validation, automatic eligibility maps and dispatch routing are separate functions; a clear worksite description can support ordinary staff review.';});
edit('/areas/virginia/fredericksburg-city/',d=>{
 d.decisions[2].label='Carry the example into the inquiry';
 d.decisions[2].body='Fictional inquiry: “Your [screened-porch example] shows the enclosed seating area we like. We have an existing uncovered deck and want to discuss whether a similar use is possible.” Keep the stable reference and the customer’s different starting point together. The example describes an inquiry, not a completed client project or a claim that the pictured design can be repeated.';
 d.limits='A portfolio example records one project. The business assesses another property’s dimensions, requirements and feasibility; an image does not set its scope or price.';
});
edit('/areas/virginia/hampton-roads/',d=>{
 d.decisions[2].label='Retain exceptions when the request changes';
 d.decisions[2].body='A fictional follow-up might say, “The requested work has moved from Hampton to Norfolk; is the same service and preferred date still possible?” Keep the changed worksite in the reply and let staff reconsider any travel or service limits. A previously discussed date should not silently carry over to a different location.';
 d.limits='The business confirms coverage and accepted appointments. Live travel estimates, crew availability, dispatch and automated service-area pricing require separate scope.';
});
edit('/areas/virginia/henry-county/',d=>{d.limits='The shop and responsible professionals retain engineering review and production decisions. Secure CAD exchange, confidential-file handling, production scheduling and quoting software need separate scope.';});
edit('/areas/virginia/highland-county/',d=>{
 d.decisions[0].body='Mill Gap Farms lists maple-leaf bottles labeled 1.69 ounces and 3.35 ounces of organic maple syrup. Keep those names with the corresponding photographs so image size does not stand in for quantity. Its separate specialty-product collection is a contents choice, not merely a larger or differently shaped bottle.';
 d.decisions[1].body='The 1.69-ounce product page offers the bottle with or without a gold foil cap. Show that finishing choice separately from the syrup volume, and avoid extending it to every product without checking. A gift presentation should not imply custom labels or packaging that has not been offered.';
 d.sourceBridge='Mill Gap Farms identifies its Highland County location outside Monterey. Its maple-leaf collection and 1.69-ounce product description, checked October 27, 2026, support the size and cap comparison above. Stock, event quantities and fulfillment still require the producer’s current information.';
});
source('/areas/virginia/highland-county/',s=>{
 observation(s,'https://millgapfarms.com/collections/frontpage','Lists 1.69-ounce, 3.35-ounce and 8.45-ounce maple-leaf bottles; product names provide quantity independently of image scale. No stock promise is inferred.');
 s.sources.push({url:'https://millgapfarms.com/products/1-69-ounce-maple-leaf?variant=30310238453812',label:'Mill Gap Farms: 1.69-ounce bottle presentation',observation:'Describes the organic maple syrup bottle with or without a gold foil cap.'});
});
edit('/areas/virginia/hopewell-city/',d=>{
 d.decisions[0].body='Anchor Point Marina publishes paired dry-rack limits: Top Rack, 21 feet long and 8 feet high; Middle Rack, 26 feet long and 8 feet high; Bottom Rack, 32 feet long and 10 feet high. Keep each pair with its rack name. The largest length and height do not describe every position or a wet-slip arrangement.';
 d.decisions[1].body='In that comparison, moving from Top to Middle increases the published length limit but leaves the height limit at 8 feet. Ask for the marina’s measurement instructions and let the customer flag uncertain equipment height. A length match alone does not confirm fit, lifting suitability or acceptance.';
 d.sourceBridge='Anchor Point Marina’s storage page, checked October 27, 2026, supplies the rack limits above. It identifies Hopewell but uses “303A Beacon Road” in its location paragraph and “303A Beacon Ridge Road” in the footer. Keep arrival directions with marina confirmation rather than silently treating the two labels as resolved.';
});
source('/areas/virginia/hopewell-city/',s=>{
 observation(s,'https://www.anchorpointmarina.net/location-rates/','Lists Top Rack maximum 21 feet length/8 feet height, Middle 26/8 and Bottom 32/10. The location paragraph says 303A Beacon Road while the footer says 303A Beacon Ridge Road; arrival details need marina confirmation.');
 s.coverageNote='Anchor Point Marina identifies its Appomattox River location in the independent City of Hopewell. Confirm the arrival address with the marina because its published street labels differ.';
});
edit('/areas/virginia/king-and-queen-county/',d=>{
 d.decisions[1].body='A fictional mixed request could keep two lines: “A: 20 pieces, requested size [thickness × width × length, with units]; B: 8 pieces, requested size [thickness × width × length, with units].” These placeholders show how each quantity stays with its dimensions; they are not Ball Lumber’s approved order format or a production specification. The mill supplies its actual terminology and reviews missing details.';
 d.decisions[2].body='Continue the fictional request with, “Another business would handle treatment after supply; please confirm what your proposed supply includes.” Ask about receiving arrangements separately. A downstream operation remains a stated plan for review, not an assumed service the mill has accepted or a technical treatment recommendation.';
});
edit('/areas/virginia/manassas-city/',d=>{d.limits='The caterer confirms quantities, staffing and arrangements. Existing providers can retain supported transactions; menu synchronization and custom connections require separate scope.';});
edit('/areas/virginia/montgomery-county/',d=>{d.limits='The builder and project professionals retain design, estimates and scheduling. Client accounts, design-file exchange and project-management connections require separate scope. Use approved, anonymized evidence rather than exposing private project details.';});
edit('/areas/virginia/page-county/',d=>{
 d.decisions[0].body='Luray RV Resort’s RV-site descriptions offer full-hookup, pull-through and back-in choices for the guest’s own camper. Its supplied Airstream rentals instead list a kitchenette, full bathroom and air conditioning. Put those different offerings beside their own photographs so an RV-site booking does not look like it includes a rental vehicle.';
 d.decisions[1].body='The resort’s glamping-tent description lists air conditioning, a kitchenette with mini-fridge, microwave and stovetop, and a private bathroom. That is different from its primitive riverfront tent sites, described as walk-in. Keep bedding and other preparation details tied to the selected listing; do not transfer a supplied tent’s facilities to a bare tent site.';
 d.sourceBridge='Luray RV Resort on Shenandoah River’s accommodation page, checked October 27, 2026, supplies the site, Airstream and tent distinctions above. Its FAQ asks guests to confirm accommodation-specific pet policies. Named facilities explain the choice without establishing current availability or suitability for a particular party.';
});
source('/areas/virginia/page-county/',s=>{s.sources.push({url:'https://www.lurayrvresortshenandoahriver.com/camping',label:'Luray RV Resort: facilities by accommodation',observation:'Distinguishes RV sites from Airstream rentals with kitchenette, full bathroom and air conditioning; glamping tents include a kitchenette and private bathroom, while primitive riverfront tent sites are walk-in.'});});
assert.equal(edits.length,26);assert.equal(sourceEdits.length,10);
assert.deepEqual(new Set(edits.map(e=>e.route)),new Set(reviews.filter(r=>r.requiredFixes.length).map(r=>r.route)));
const receipt={date:'2026-10-27',status:'implemented-pending-independent-recheck',routes:edits.map(e=>e.route),reviewEvidence:[root+'/audits/local-after-residual-f.jsonl'],drafts:edits,records:sourceEdits,faqs:[],sourceChecks:[root+'/research/residual-f-fact-recheck.json',root+'/research/residual-f-additional-facts.json'],limits:'All 26 drafts and 10 exact source records changed; FAQs and imported briefs unchanged. New official-source checks cover listed facts, not every retained URL. Independent exact-body recheck required before acceptance/import.'};
fs.writeFileSync(file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/research/residual-f-repair-routes.json',JSON.stringify(receipt.routes,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({drafts:edits.length,sourceRecords:sourceEdits.length,imported:false,status:receipt.status}));
