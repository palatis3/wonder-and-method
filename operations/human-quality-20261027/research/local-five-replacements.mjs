// Individually authored after the October 27 primary-source checks.
// Source conflicts are recorded rather than resolved on an operator's behalf.
const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/rockland-county/',retireWorksheet:true,
  heading:'Keep a promotion’s conditions with the estimate request.',
  intro:'A painting promotion can depend on when the customer mentions it, not just the final job value. The website should help visitors carry the offer into the right conversation.',
  customerQuestion:'When do I need to mention this offer, and does my proposed job qualify?',
  decisions:[
   {label:'Show the conditions beside the offer',body:'Keep the minimum job value and combination restriction beside the advertised saving. A large discount headline followed by distant conditions makes the estimate request harder to understand. Use the owner’s approved offer and a review date.'},
   {label:'Preserve the reference when scheduling the estimate',body:'Tell the visitor to mention the advertisement at the required point. An inquiry can include an optional offer reference, but the confirmation should say whether staff still need to arrange the estimate. Do not imply that sending the form has scheduled an appointment or applied a discount.'},
   {label:'Retire the whole offer together',body:'Give one person responsibility for the headline, conditions and request wording. When the offer changes, review all three together so an old form label does not promise terms absent from the current page.'}
  ],
  ownerInputs:['The approved offer, qualifying job value and combination restrictions.','When and how the customer must identify the offer.','Offer review responsibility and the actual estimate-request destination.'],
  sourceBridge:'Rockland House Painters advertises $250 off jobs of $3,500 or more, excludes combination with other offers and requires the ad to be mentioned when the estimate is scheduled. Its inquiry acknowledgment describes staff follow-up. These published conditions make the offer reference part of the scheduling conversation.',
  limits:'This proposal clarifies public content and an ordinary inquiry. Staff confirm eligibility, price and scheduling; automatic discount calculation and quoting systems require separate scope.',
  coverageNote:'The source explicitly offers painting across Rockland County. It is a public service-area example, not evidence of a Wonder and Method office, client or completed project.',
  sources:[source('https://housepaintingrocklandcounty.com/','Rockland House Painters: estimate offer and conditions','Minimum job value, non-combination rule and timing of the advertisement reference.')],
  check:'A visitor can find the conditions and mention the offer at scheduling without mistaking a submitted inquiry for an appointment.',
  researchNote:'Homepage read directly. Offer terms are a dated published example, not a claim of current eligibility or an applied discount.'
 },
 {
  route:'/areas/suffolk-county/',retireWorksheet:true,
  heading:'Separate a basic service call from a project that needs scoping.',
  intro:'An online service-call form may suit a small repair while a larger marine-electronics upgrade needs a conversation first. The website can explain which route fits before requesting a date.',
  customerQuestion:'Can I use the service-call form for this job, or should I discuss the installation first?',
  decisions:[
   {label:'Describe the work the online route accepts',body:'Put the published job-size and parts conditions before the service-call link. Use examples the operator approves. A visitor considering a larger upgrade should see the contact route before filling out a form intended for basic work.'},
   {label:'Give larger work a useful first conversation',body:'Ask for a concise description of the proposed change, the boat and its location. Staff can decide which further information they need. Do not turn a public inquiry into a technical diagnosis, equipment specification or promised installation slot.'},
   {label:'Explain what happens after submission',body:'Separate receipt of a request from the technician’s confirmation of time and equipment. Have the operator reconcile payment wording before repeating it on another page; a confirmation message should use the agreed sequence rather than infer it from a “book now” label.'}
  ],
  ownerInputs:['Approved limits and examples for the ordinary service call.','The contact route and initial information for larger installations.','One reconciled payment and appointment-confirmation sequence.'],
  sourceBridge:'Long Island Marine Electronics says its online form is for basic service calls taking less than a day and requiring no ordered parts; larger upgrades and refits should be discussed by phone. It says a technician follows up to confirm time and equipment. Its payment descriptions conflict, so this example does not choose a charging rule.',
  limits:'The operator confirms technical scope, parts, payment and scheduling. Diagnostics, inventory, payments and dispatch integrations are separate from this content proposal.',
  coverageNote:'The operator describes mobile work at marinas across Nassau and Suffolk counties. Service coverage does not establish a public branch at every destination.',
  sources:[source('https://longislandmarineelectronics.com/book-now/','Long Island Marine Electronics: service-call eligibility','Basic-call limits, phone scoping for larger work and technician confirmation; inconsistent payment descriptions.')],
  check:'A basic-call visitor reaches the intended form; an upgrade inquiry reaches staff; neither receives a promised time merely from submitting.',
  researchNote:'Booking page read directly. Upper text says first hour charged today; FAQ says card held and later billing. No payment rule or current appointment availability adopted.'
 },
 {
  route:'/areas/pennsylvania/lancaster-county/',retireWorksheet:true,
  heading:'Distinguish weekly pool care from a seasonal opening.',
  intro:'A company offering lawn and pool work can share one website while giving a one-time seasonal request a different start from recurring maintenance.',
  customerQuestion:'Am I asking to open the pool, maintain it weekly, or arrange lawn work?',
  decisions:[
   {label:'Choose the service before the schedule',body:'Give lawn and pool work clear starting points. Within pool services, separate the seasonal task from ongoing visits. Shared contact details and coverage can remain together without making each service look like one combined package.'},
   {label:'Describe what recurs',body:'Use approved examples of weekly work beside the recurring choice. Keep opening and winterizing descriptions with their own requests. A customer should not infer that a seasonal visit includes subsequent weekly care, or that a lawn-service claim describes pool treatment.'},
   {label:'Keep seasonal requests current',body:'Ask which service and intended period the customer wants, then leave acceptance to staff. Review seasonal wording and the existing inquiry destination together before the busy period. Do not make a public request date function as a reserved visit.'}
  ],
  ownerInputs:['Approved distinctions between weekly pool care, opening and winterizing.','Separate lawn-service descriptions and any genuine package terms.','Current coverage and the inquiry details needed to discuss timing.'],
  sourceBridge:'Turf N Surf lists Lancaster County coverage and separates lawn services from pool work. Its pool page describes weekly testing, balancing, cleaning and filter maintenance, alongside seasonal openings and winterizing. Those are different customer requests even when one team supplies them.',
  limits:'The proposal explains services and ordinary inquiries. Treatment advice, route scheduling, recurring billing and bundled pricing require separate assessment.',
  coverageNote:'Turf N Surf names Lancaster among its service counties. The example uses that published coverage, without claiming a local office or a client relationship.',
  sources:[source('https://turfnsurfllc.com/','Turf N Surf: service coverage','Names Lancaster, York, Dauphin and Lebanon counties.'),source('https://turfnsurfllc.com/pool-services/','Turf N Surf: pool care','Separates recurring care from seasonal opening and winterizing.'),source('https://turfnsurfllc.com/lawn-services/','Turf N Surf: lawn work','Separate lawn-service categories; no transfer of lawn claims to pool treatment.')],
  check:'Three fictional inquiries—opening, weekly pool care and mowing—retain their different service requests through the contact step.',
  researchNote:'All three operator pages read. No treatment instructions, bundle inclusions or automatic payment claims inferred.'
 },
 {
  route:'/areas/pennsylvania/montgomery-county/',retireWorksheet:true,
  heading:'Start a deck inquiry with what is changing.',
  intro:'Repairing an existing deck, expanding it and building a new one are different starting points. A service page can preserve that distinction before asking a visitor to describe the project.',
  customerQuestion:'Do I want to repair the deck I have, change its footprint or plan a new one?',
  decisions:[
   {label:'Name the existing structure and intended change',body:'Offer repair or refinishing, expansion and a new build as understandable choices. Let someone who is unsure describe the problem in ordinary language. The page should organize the inquiry without deciding whether a structure is safe or repairable.'},
   {label:'Keep materials as a project preference',body:'Explain the listed wood and composite options using approved descriptions. Ask what the customer is considering without making the selection a final specification or a claim that every existing deck can accept the chosen material.'},
   {label:'Carry context to the quote conversation',body:'Keep the selected project type with the address and brief description sent through the existing request process. Staff should be able to distinguish a surface-refresh question from a proposed expansion. Site assessment, permissions and final scope remain part of the contractor’s process.'}
  ],
  ownerInputs:['Approved repair, expansion and new-build descriptions.','Current material choices and the language for an undecided customer.','The existing quote route and information staff use for initial review.'],
  sourceBridge:'Wolfpack Home Services’ deck page distinguishes new decks, expansions, repairs and refinishing, and describes wood and composite materials. Its coverage text names Montgomery County communities including Collegeville, Hatfield and Lansdale. The useful website choice is the kind of change to the deck, rather than another generic town page.',
  limits:'This is an inquiry and content proposal. Structural assessment, permit decisions, estimates and project management remain with the contractor.',
  coverageNote:'The provider explicitly names Montgomery County communities in its coverage. This public example establishes service context, not a project delivered by Wonder and Method.',
  sources:[source('https://wolfpackhomeservices.com/our-services/decks/','Wolfpack Home Services: deck work','New construction, expansion, repair/refinishing, materials and Montgomery County coverage.')],
  check:'A repair request and a proposed expansion reach the same contact process with different project descriptions intact.',
  researchNote:'Deck page read directly. Generic return-on-investment and durability promotion omitted; no structural or legal conclusion adopted.'
 },
 {
  route:'/areas/pennsylvania/northampton-county/',retireWorksheet:true,
  heading:'Separate the print-method choice from artwork approval.',
  intro:'A small apparel order may need a different printing method, and a completed purchase may still be waiting for proof approval. The website should explain both decisions in their actual order.',
  customerQuestion:'Can I order fewer than 24 pieces, and when does the approved artwork move into production?',
  decisions:[
   {label:'Attach the minimum to the correct method',body:'Put the screen-printing minimum beside that method, with the operator’s alternatives for a smaller quantity. Do not make one method’s threshold appear to be a minimum for the whole business. Keep the method explanation ahead of the order link.'},
   {label:'Show the proof step after checkout',body:'Explain the published sequence from product and artwork submission to the digital proof. Say which customer action approves the design before printing. A purchase receipt and an approved proof should have different labels and expectations.'},
   {label:'Discuss deadlines from the approval point',body:'Show that production timing depends on confirmed proof approval, using the operator’s current wording. Give unusual dimensions or design help the custom-quote route. A requested deadline should remain subject to staff confirmation rather than become a promise from the checkout date.'}
  ],
  ownerInputs:['Current minimums and alternatives for each printing method.','The proof delivery, correction and approval process.','Approved turnaround wording and the custom-project contact route.'],
  sourceBridge:'Vinyl Press USA in Easton publishes a 24-piece screen-printing minimum and directs smaller orders toward DTG or DTF. Its FAQ describes online selection, artwork upload and checkout followed by a digital proof before printing; turnaround is confirmed from proof approval.',
  limits:'This proposal clarifies the existing ordering process. It does not build artwork approval, production scheduling, ecommerce or order-management software.',
  coverageNote:'Vinyl Press USA gives its Easton address at 925 Northampton Street. The example concerns its published print-method and proof sequence, not a universal rule for county printers.',
  sources:[source('https://vinylpressusa.com/faq/','Vinyl Press USA: quantities, proofs and turnaround','Method-specific minimum, alternatives for smaller orders and proof approval before printing.')],
  check:'A 12-piece inquiry can identify the published alternatives; an ordinary online buyer can distinguish a receipt from proof approval.',
  researchNote:'FAQ read directly. No purchase or proof flow tested; no universal minimum or guaranteed turnaround inferred.'
 },
 {
  route:'/areas/pennsylvania/pike-county/',retireWorksheet:true,
  heading:'Keep the specialist-service destination with its contact details.',
  intro:'A shared store brand does not make every specialist service available at every location. A visitor should be able to find the named service and the location to contact before travelling.',
  customerQuestion:'Which listed shop should I contact about the stove service, and where is it?',
  decisions:[
   {label:'Pair the named service with the published location',body:'Keep the stove-shop reference and the Milford location together. A general store directory can still list other branches, but it should not silently distribute a specialist label to every address.'},
   {label:'Keep an inquiry separate from catalog browsing',body:'Label the service-contact action with its purpose and branch. A product page can help identify an item, but it should not imply that the item is stocked, displayed or serviced at whichever shop is nearest the visitor.'},
   {label:'Check the service and destination together',body:'Use the actual branch phone and address beside the service reference. Ask staff to confirm availability when the public page does not establish it. Review destination changes together with service copy so an old branch link does not send the customer elsewhere.'}
  ],
  ownerInputs:['The current specialist-service and branch mapping.','Approved phone and address for each named service destination.','The process for confirming stock, availability or work at another branch.'],
  sourceBridge:'Luhrs’ services page identifies a Stove Shop in Milford and separately lists Milford, Dingmans Ferry, Hawley and Greentown contacts. Milford’s listed address is 300 West Harford Street. That supports a specific service-to-location link; it does not establish that other branches cannot help.',
  limits:'The work clarifies location content and contact links. Branch inventory, product availability and service scheduling remain with the retailer.',
  coverageNote:'The source identifies the Milford specialist service and its location. Other listed shops provide context for the navigation decision, without an assumed identical service range.',
  sources:[source('https://shopluhrs.com/services/','Luhrs: services and store contacts','Names Milford Stove Shop and separate branch contacts.'),source('https://shopluhrs.com/services/s-dp-luhrs-true-value-hardware/','Luhrs: Milford service listing','Corroborating Milford location information; no exclusive-service claim.')],
  check:'From the stove-service description, the visitor finds the Milford contact and address without treating another branch’s catalog as availability.',
  researchNote:'Public services and Milford pages read. Linked stove ecommerce destination blocked; no inventory or exclusivity conclusion made.'
 },
 {
  route:'/areas/pennsylvania/wayne-county/',retireWorksheet:true,
  heading:'Connect browsing to an in-home sample visit or a showroom appointment.',
  intro:'A flooring photograph can start a conversation, but choosing a material in the room is a different step. The website should make the consultation options clear before a visitor travels to the showroom.',
  customerQuestion:'Can I see samples in my home, or do I need to arrange a showroom visit?',
  decisions:[
   {label:'Give the two visit options clear labels',body:'Explain the shop-at-home process beside the showroom’s appointment requirement. Put the appointment contact near the address so a map link does not imply walk-in availability.'},
   {label:'Carry the browsing reference into the conversation',body:'Let the customer identify the example and room they are considering. Use stable labels for website images where needed. Explain that staff bring samples for an in-room choice; a photograph should not stand in for confirmed stock or a final material selection.'},
   {label:'Keep the estimate and installation in sequence',body:'Describe the steps after the sample discussion using the owner’s process. A consultation request should not look like a booked installation. Keep the estimate and later scheduling visible without asking visitors to complete a technical specification themselves.'}
  ],
  ownerInputs:['Approved in-home and appointment-only showroom instructions.','Identifiable browsing examples and the information staff need for samples.','The sequence from selection to estimate and installation scheduling.'],
  sourceBridge:'Tom’s Interior World in Honesdale describes browsing the website, calling for a shop-at-home visit, choosing from samples brought to the room, then receiving an estimate and arranging installation. It separately says the showroom is open by appointment only.',
  limits:'The proposal improves explanations and consultation inquiries. Measuring, product availability, estimates and installation scheduling remain with the business.',
  coverageNote:'Tom’s Interior World lists 353 Gridline Road in Honesdale. The example concerns that business’s two consultation routes, not general showroom opening hours in Wayne County.',
  sources:[source('https://www.tomsinteriorworld.com/','Tom’s Interior World: shop at home and showroom visits','Sample-selection sequence and appointment-only showroom.')],
  check:'A customer choosing an in-home visit and one planning a showroom visit both find the appropriate contact without an installation promise.',
  researchNote:'Homepage read directly. Empty footer-hour placeholders ignored; no stock or current appointment availability claim.'
 },
 {
  route:'/areas/tennessee/grundy-county/',
  heading:'Explain how a show day can change the cave-tour visit.',
  intro:'A cave tour at a concert venue is not automatically a visit to every part of that venue. The website should explain access limits and distinguish the walking experience from separately prepared adventure tours.',
  customerQuestion:'Will my tour include the music hall on a show day, and is an adventure tour a different booking?',
  decisions:[
   {label:'Keep show-day access conditions beside the walking tour',body:'Explain that music-hall access may be limited on show days. Put that condition before the booking link, alongside the actual tour calendar. A cave-tour purchase should not imply concert admission or guaranteed access to the performance space.'},
   {label:'Give adventure preparation its own place',body:'Separate the named adventure tours from the walking tour. Keep their age, group, notice and required-gear conditions together rather than treating them as a longer version of the ordinary visit. Refer participation questions to the operator.'},
   {label:'Use the chosen date and experience together',body:'Link each experience to its intended booking destination. Check a show-day walking visit and a planned adventure group separately, without submitting a booking. Use the current calendar when public summaries disagree about regular operating days.'}
  ],
  ownerInputs:['Approved show-day access wording and the current tour calendar.','Current adventure age, group, advance-notice and gear requirements.','Distinct tour and concert destinations with an update owner.'],
  sourceBridge:'The Caverns in Grundy County says music-hall access on its guided tour may be limited on show days. Its adventure listings are for ages 16 and up, require specified gear and 30-day advance booking, and use a four-person minimum, with four required in the first booking for a departure. These conditions belong with the selected adventure, not the ordinary walking-tour button.',
  limits:'The operator confirms access, participation, availability and preparation. This content proposal does not decide suitability, administer tickets or combine tour and concert admission.',
  coverageNote:'The Caverns identifies its location in Grundy County’s Pelham valley. The local decision comes from its combined cave-tour and performance-venue use.',
  sources:[source('https://www.thecaverns.com/cave-tours','The Caverns: tours and show-day access','Conditional music-hall access and distinct adventure preparation.'),source('https://www.thecaverns.com/','The Caverns: Grundy County location','Identifies the venue’s county and Pelham setting.')],
  check:'A show-day visitor sees the access qualification; an adventure organizer sees its separate preparation and booking route.',
  researchNote:'Tour page read directly. Conflicting daily versus weekend/concert-day summaries are not resolved here; exact squeezing descriptions also omitted. Required gear is helmet, headlamp and kneepads; operator retains complete participation guidance.'
 },
 {
  route:'/areas/texas/gillespie-county/',
  heading:'Separate borrowed-item returns from resale-shop donations.',
  intro:'A library return box does not establish an unattended donation point. A shared-building website should distinguish returning a borrowed item, visiting the shop and discussing a donation.',
  customerQuestion:'Can I return this borrowed book, or do I need to contact the resale shop about a donation?',
  decisions:[
   {label:'Start with the purpose of the visit',body:'Give library visits, borrowed-item returns and shop visits separate directions. Keep each published entrance with its own purpose. Do not attach a single opening-hours line to both the library and resale shop.'},
   {label:'Name what the return box is for',body:'Describe the front-parking-area box as the library’s borrowed-item return. Keep donation instructions elsewhere so a visitor cannot reasonably infer permission to leave goods unattended simply because a drop box exists.'},
   {label:'Resolve donation questions before the trip',body:'Place the published call-first furniture instruction with the donation contact. Where the two pages disagree about general donation acceptance, ask the owner for one approved rule before restating hours. Until then, a contact-first direction can explain the uncertainty without choosing a schedule.'}
  ],
  ownerInputs:['Current entrances and separate library and shop hours.','The approved description of the borrowed-item return box.','One reconciled donation rule and the furniture-donation contact.'],
  sourceBridge:'Harper Library describes a west-side library entrance, a highway-side resale-shop entrance and a borrowed-item return box in the front parking area. Its resale-shop page asks furniture donors to call first. The two pages differ about general donation acceptance, so this example does not publish a settled donation schedule.',
  limits:'This is a content and arrival-direction proposal. The library confirms donation acceptance and current access; no unattended donation permission is inferred.',
  coverageNote:'Harper Library supplies a Gillespie County shared-building example. The useful distinction is the purpose of each arrival, not the town name alone.',
  sources:[source('https://harpertxlibrary.org/','Harper Library: entrances and library returns','Separate entrances, operating schedules and borrowed-item return box.'),source('https://harpertxlibrary.org/library-resale-shop','Harper Library: donations','Furniture call-first instruction; general acceptance wording differs from the homepage.')],
  check:'A borrowed-book return and a furniture donation lead to different instructions, with no implied unattended donation permission.',
  researchNote:'Canonical non-www homepage and shop page read. Homepage limits donations to shop opening; shop text also mentions the library. Conflict explicitly preserved; no rule selected.'
 },
 {
  route:'/areas/texas/grimes-county/',
  heading:'Make the selected pickup date part of the bee preorder.',
  intro:'A live-bee preorder needs a pickup arrangement, not a generic shipping choice or ordinary shop visit. The website should explain that distinction before the customer begins checkout.',
  customerQuestion:'Which pickup date must I choose for this bee order, and can it be shipped?',
  decisions:[
   {label:'Attach fulfillment rules to the actual product',body:'Explain the published pickup-only rule for nucs, packages and colonies beside those products. Do not transfer it to every item sold by the farm or imply that an ordinary parcel-shipping option applies to live bees.'},
   {label:'Keep the calendar choice with the preorder',body:'Show that the buyer must select an offered pickup date in the calendar to complete checkout. Use the operator’s existing product and date selection. A shop-hours panel should not imply permission to choose an unlisted day.'},
   {label:'Confirm the collection destination',body:'Keep the farm pickup address and chosen date together in the public explanation and provider handoff. Direct unusual-date questions to staff without promising an exception. Product care and collection instructions remain the operator’s responsibility.'}
  ],
  ownerInputs:['Current pickup-only product categories and approved fulfillment wording.','Existing preorder links and the offered pickup-date calendar.','The confirmed collection address and staff contact for order questions.'],
  sourceBridge:'BeeWeaver’s published preorder instructions require a calendar pickup date before checkout and identify 16481 County Road 319, Navasota, as the collection point. It says nucs, packages and colonies are not shipped and does not offer pickup outside the listed dates. The date is part of the order, rather than an ordinary store-hours choice.',
  limits:'This proposal explains the existing preorder handoff. It does not provide beekeeping advice, manage live inventory, change pickup availability or create ecommerce functionality.',
  coverageNote:'BeeWeaver publishes the Navasota mailing address; KBTX’s on-site reporting identifies the farm as being in Grimes County. The example does not infer county boundaries from the mailing city alone.',
  sources:[source('https://beeweaver.com/','BeeWeaver: bee preorders and pickup','Calendar selection and pickup-only instructions for the named live-bee products.'),source('https://beeweaver.com/contact/','BeeWeaver: farm contact','Published collection location and separate contact information.'),source('https://www.kbtx.com/2025/03/10/grimes-county-bee-farm-breeds-sustainable-queens-combat-population-decline/','KBTX: BeeWeaver in Grimes County','Reporter’s farm visit corroborates county location; biological claims are not used.')],
  check:'A fictional colony order retains its offered pickup date and farm address without presenting delivery or an unlisted collection day.',
  researchNote:'Operator homepage and contact page read. Current promotion refers to 2027 preorders; no inventory or actual checkout tested. KBTX used only as independent geographical corroboration.'
 },
 {
  route:'/areas/texas/jefferson-county/',
  heading:'Compare museum tour access before choosing a time.',
  intro:'Two tours at the same museum can accommodate different parties and require different arrangements. The website can explain the experience, access contact and meeting point before a calendar opens.',
  customerQuestion:'Which tour fits a party with a child under eight, and how do I arrange first-floor wheelchair access?',
  decisions:[
   {label:'Keep ages and stairs beside the tour choice',body:'Distinguish the Historic Home experience from the Carriage House and Garden tour. Put the published age and stair information with each option so a family can identify the relevant listing before selecting a time.'},
   {label:'Give advance access arrangements a usable contact',body:'Show the limited first-floor wheelchair-access arrangement and its advance-notice requirement beside the home tour. Do not make ordinary tour availability imply that the access arrangement has been reserved or that all floors are accessible.'},
   {label:'Send visitors to the tour starting point',body:'Keep the Visitor Center address with the selected tour and confirmation instructions. Distinguish it from the institution’s administrative address. Have staff reconcile conflicting schedule text before repeating clock times on another page.'}
  ],
  ownerInputs:['Current age, stair and experience descriptions for each tour.','Approved first-floor access notice and reservation contact.','The tour meeting address and one reconciled current schedule.'],
  sourceBridge:'McFaddin-Ward House lists the Historic Home tour for ages eight and up and describes stairs. The Carriage House and Garden tour accepts all ages. Limited first-floor wheelchair access to the home requires a reservation with at least 24 hours’ notice. All tours start at the Visitor Center, 1906 Calder Avenue.',
  limits:'The museum confirms current tour times, access arrangements and availability. This example does not establish full-building accessibility or complete a reservation.',
  coverageNote:'The museum’s Visitor Center is in Beaumont, Jefferson County, independently corroborated by the saved Census address check. The proposed website comparison concerns its two published experiences.',
  sources:[source('https://mcfaddin-ward.org/tours/','McFaddin-Ward House: tour choices and access','Ages, stairs, advance first-floor wheelchair arrangement and Visitor Center meeting point.'),source('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=1906+Calder+Avenue%2C+Beaumont+TX&benchmark=Public_AR_Current&vintage=Current_Current&format=json','Census: Visitor Center county location','Previously saved address match corroborates Jefferson County.')],
  check:'A party with a six-year-old identifies the all-ages tour; a visitor needing the stated access arrangement finds its advance contact and correct meeting point.',
  researchNote:'Tour page read directly. Specific departure times and generic last-tour metadata disagree, so none are adopted. Published limited first-floor arrangement is retained without expanding its scope.'
 },
 {
  route:'/areas/texas/kendall-county/',
  heading:'Put Aquifer group requirements before the ticket choice.',
  intro:'Lower-cave photographs do not tell a family whether it can book that experience. A cave-tour page should distinguish the ordinary tour from a separately arranged group expedition.',
  customerQuestion:'Can our six-person party book the Aquifer experience as ordinary individual tickets?',
  decisions:[
   {label:'Show group size with the named experience',body:'Keep the Aquifer minimum and maximum beside that choice. A party below the minimum should see that limitation before following an ordinary-tour ticket link. Explain the separate group inquiry using the operator’s published route.'},
   {label:'Keep participation and preparation together',body:'Place the age, swimming and physical-participation requirements with the Aquifer description and link the full operator guidance. The group-size check alone cannot establish that someone can participate. Staff answer suitability and equipment questions.'},
   {label:'Reconcile duration before publishing a timetable',body:'Ask the operator for one approved duration where its own page lists two ranges. Keep the advance-arrangement process visible without turning a preferred booking lead time into a mandatory rule. Do not use an assumed duration to promise a finish time.'}
  ],
  ownerInputs:['Current Aquifer group limits and the separate arrangement contact.','Approved participation, swimming, equipment and preparation guidance.','One reconciled duration and the actual advance-booking terms.'],
  sourceBridge:'Cascade Caverns’ Aquifer listing requires a prepaid group of 10–15, ages 16 and up, and swimming ability, physical fitness and comfort in confined cave conditions. The source recommends advance arrangements but gives conflicting duration ranges. A six-person family therefore cannot treat Aquifer as an ordinary individual-ticket option, regardless of the unresolved duration.',
  limits:'The operator confirms participation and bookings. This example offers no suitability assessment or settled duration; ticketing, live availability and group administration require separate scope.',
  coverageNote:'Cascade Caverns supplies the Boerne-area Kendall County example. Its named group experience creates the specific decision; requirements are not generalized to other caves.',
  sources:[source('https://www.cascadecaverns.com/tours/','Cascade Caverns: ordinary and group experiences','Aquifer group and participation requirements, advance arrangements and conflicting duration text.')],
  check:'A six-person party sees the ten-person minimum before booking; a qualifying-size group still sees participation requirements and the operator contact.',
  researchNote:'Tour page read directly. Aquifer paragraph says three to four hours; bullets say two to three. Neither is selected. Two weeks and Saturdays are preferences, not mandatory claims. No medical assessment or live booking test.'
 },
];
