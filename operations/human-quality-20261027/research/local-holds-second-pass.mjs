// Individually authored replacements after primary-source research, 2026-10-27.
// This module is data only. Integration and independent review are separate steps.
const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/nassau-county/',retireWorksheet:true,
  heading:'Keep the arrival category with the airport-pickup instructions.',
  intro:'An airport transfer needs more than two addresses. The website should distinguish the flight arrival, the requested pickup and a later change to an existing reservation.',
  customerQuestion:'Which waiting allowance applies to my arrival, and how do I confirm a changed pickup?',
  decisions:[
   {label:'Identify the arrival before showing the allowance',body:'Keep domestic and international arrival instructions separate. Place the applicable waiting allowance beside the flight details, with the operator’s contact route for a delay. Do not use one generic airport notice for both cases.'},
   {label:'Preserve the trip through the provider handoff',body:'Carry the selected airport, flight and journey details into the existing quote or reservation process where the provider supports it. A quote request and a confirmed booking need different acknowledgments; test each route using fictional trip details.'},
   {label:'Give changes their own confirmation step',body:'Show how to update an existing reservation and ask the passenger to check the operator’s confirmation. Keep the change deadline tied to scheduled pickup, rather than silently substituting the aircraft’s arrival time.'}
  ],
  ownerInputs:['Approved arrival categories, waiting rules and delay contact.','Existing quote, reservation and reservation-change links.','A fictional changed-flight example and the confirmation wording.'],
  sourceBridge:'LI Access Limo’s Nassau page lists 45 minutes of standard waiting for domestic arrivals and 60 for international arrivals. It asks for reservation updates at least six hours before pickup and confirmation of the change. Later changes depend on availability; flight-based adjustments are made when possible.',
  limits:'The proposed work explains the existing process. Flight tracking, fare calculation, dispatch and automatic reservation changes require separate assessment.',
  coverageNote:'LI Access Limo explicitly describes Nassau County transfers. Its business address is in Coram; this example concerns published service coverage, not a Nassau office or a Wonder and Method client.',
  sources:[source('https://liaccesslimo.com/nassau-county/','LI Access Limo: Nassau transfers and reservation changes','Arrival-specific waiting allowances and change-confirmation instructions.'),source('https://liaccesslimo.com/contact/','LI Access Limo: trip details and contact choices','Separates journey information, quote requests and existing booking links.')],
  check:'Compare a domestic arrival, an international arrival and a changed reservation. Each retains the appropriate instruction and next step.',
  researchNote:'Both operator pages read directly through web extraction. Payment statements differ between the contact and Nassau pages, so no universal payment rule is used.'
 },
 {
  route:'/areas/new-jersey/atlantic-county/',
  heading:'Choose the fitting by prior experience and party size.',
  intro:'A returning shopper may still need help, but not the same appointment as someone having their first fitting. The booking introduction should make that distinction before a calendar opens.',
  customerQuestion:'I have been fitted here before; which appointment should I choose for another fitting or a particular outfit?',
  decisions:[
   {label:'Explain who each appointment is for',body:'Put the previous-fitting condition beside the returning-customer choice. Use a short first-visit description for customers who do not meet it. Avoid a vague “new or existing customer” label that could be mistaken for an account-login question.'},
   {label:'Keep the selected number of people',body:'Give one-person and two-person choices their own labeled destinations. Check that the appointment name, duration and displayed charge agree with the provider listing before the visitor chooses a time.'},
   {label:'Attach preparation to the relevant visit',body:'Show any outfit-specific preparation with the appointment that needs it. Keep cancellation information available before booking, and have the owner resolve any provider text that applies a deposit condition to a complimentary service.'}
  ],
  ownerInputs:['Current appointment names and eligibility descriptions.','The provider links for each party size and visit type.','Approved preparation, cancellation and charge wording.'],
  sourceBridge:'The Bra Boudoir in Mays Landing lists a 45-minute, $10 first fitting and a complimentary 30-minute return appointment for customers previously fitted there. Separate two-person choices are listed. The first-fitting description asks customers seeking an undergarment for a particular outfit to bring that outfit.',
  limits:'The website can clarify these choices without collecting fitting details. Scheduling, deposits and customer records stay in the agreed provider.',
  coverageNote:'The Bra Boudoir identifies its location as Mays Landing, Atlantic County. The example concerns appointment selection at that business, not a rule for every local shop.',
  sources:[source('https://www.brafittingsnewjersey.com/book-online','The Bra Boudoir: appointment choices','Separate visit and party-size listings.'),source('https://www.brafittingsnewjersey.com/service-page/one-person-bra-fitting','The Bra Boudoir: first fitting','Visit preparation, duration and listed charge.'),source('https://www.brafittingsnewjersey.com/service-page/return-customer-appointment','The Bra Boudoir: return appointment','Prior-fitting condition and complimentary listing.')],
  check:'A first visitor, a previously fitted shopper and a pair of shoppers can identify their intended listing without submitting a booking.',
  researchNote:'Listing and both service pages read. Generic deposit cancellation text appears even on the complimentary return listing; do not infer a charge or resolve that ambiguity for the operator.'
 },
 {
  route:'/areas/new-jersey/burlington-county/',retireWorksheet:true,
  heading:'Separate the organizer’s shop setup from a member’s order.',
  intro:'Creating an organization’s apparel shop involves choices that an individual shopper should not have to make. The public website can give these two visitors different starting points.',
  customerQuestion:'Am I ordering from my organization’s shop or asking to create one?',
  decisions:[
   {label:'Make the organizer’s decisions visible',body:'Explain which product and price decisions belong to the organization before it requests a new shop. Ask for approved branding and the person who can authorize the selection, without presenting an inquiry as an activated storefront.'},
   {label:'Send members to the intended existing shop',body:'Label a shop link with its organization and purpose. Test it from the public service page so a member reaches the right catalog instead of the new-shop inquiry. Leave actual ordering in the established service.'},
   {label:'Handle a deadline before promising delivery',body:'Invite the organizer to state a required date and wait for the supplier’s assessment. Keep any purchase-order discussion with the supplier rather than implying that selecting a payment preference completes procurement approval.'}
  ],
  ownerInputs:['Approved organization name, branding and product choices.','The existing shop destinations and their update owner.','Deadline information and the supplier’s order-review wording.'],
  sourceBridge:'A2Z Emblems in Burlington City says an organization can choose products and set its price point for a specialty shop. Its FAQ accepts municipal purchase orders and explains that turnaround depends on the order, with deadline feasibility discussed individually.',
  limits:'This is a content and navigation proposal. Creating stores, synchronizing orders, collecting payments and administering purchase orders require their own scope.',
  coverageNote:'A2Z Emblems identifies its storefront in Burlington City. The example is the distinction between setting up an organization shop and using an existing one.',
  sources:[source('https://a2zemblems.com/','A2Z Emblems: specialty shops and ordering FAQ','Organizer choices, order-dependent timing and municipal purchase orders.')],
  check:'An organization representative reaches the setup inquiry; a member reaches the named shop; a deadline remains subject to supplier review.',
  researchNote:'Direct fetch timed out; the official homepage’s indexed text was available and read. No private shop or actual order was inspected. The index was six months old, so the example is explicitly a published model, not verified present availability.'
 },
 {
  route:'/areas/new-jersey/camden-county/',retireWorksheet:true,
  heading:'Explain what a studio pass includes before arranging a visit.',
  intro:'A monthly makerspace pass can include both studio access and a workshop benefit. Those benefits still need clear hours and an accurate way to arrange attendance.',
  customerQuestion:'Does a monthly studio pass reserve a workshop or let me arrive at any time?',
  decisions:[
   {label:'Compare the access periods',body:'Keep day access and a monthly pass in separate choices. Put the period covered beside the price, so a visitor can compare the offers without treating a recurring access benefit as round-the-clock opening.'},
   {label:'Explain the workshop benefit separately',body:'State which workshop benefit accompanies the pass and how the studio confirms its use. Do not make a general registration button imply that every workshop is included or that a specific place has been reserved.'},
   {label:'Show the actual booking instruction and hours',body:'Place the current opening information and in-person booking instruction before an online registration link. If hours vary, provide the studio’s current contact or calendar route instead of inventing a permanent weekly schedule.'}
  ],
  ownerInputs:['Approved day and monthly access descriptions.','The included-workshop terms and staff confirmation process.','Current studio hours and the agreed booking instructions.'],
  sourceBridge:'The Fashion Design Center of South Jersey’s Camden makerspace page lists $15 day access and a $60 monthly pass with unlimited open-studio time and one free workshop. It also says studio hours vary and booking must be in person.',
  limits:'Pass administration, workshop capacity, payments and access-control systems are separate from this explanatory page.',
  coverageNote:'The makerspace page gives a Camden address. Its published pass model supplies the example; the website’s older posts and varying hours do not establish that a particular session is available now.',
  sources:[source('https://jypseagoods.wixsite.com/mysite-1/makerspace','Fashion Design Center: makerspace access','Day and monthly access, workshop benefit and booking instruction.')],
  check:'A monthly-pass visitor can distinguish access, the workshop benefit and the action needed to arrange a visit.',
  researchNote:'Makerspace page read through web extraction; registration page timed out. No claim is made about current workshop inventory or unanswered FAQ details.'
 },
 {
  route:'/areas/new-jersey/cape-may-county/',retireWorksheet:true,
  heading:'Keep each shop’s hours and contact with its own address.',
  intro:'A retail brand with a separate gallery needs location-specific visit information. An online product listing alone should not send a visitor to an assumed display location.',
  customerQuestion:'Which location should I contact before visiting to see a featured item?',
  decisions:[
   {label:'Choose the location before the directions',body:'Give each shop its own name, address, contact and hours. Keep these together when the page becomes a single column on a phone, so a gallery address cannot inherit the other shop’s telephone number or closing time.'},
   {label:'Treat product status as its own fact',body:'Use the current product page for online purchase information. Unless the owner supplies location-level stock or display information, offer a specific inquiry rather than claiming the item is available to see at both addresses.'},
   {label:'Keep seasonal changes consistent',body:'Assign one owner-approved source for each location’s hours and update every place that repeats them. Check a hypothetical evening visit against the selected location, not against a single brand-wide “open” label.'}
  ],
  ownerInputs:['The approved address, contact and hours for each location.','What staff can actually confirm about viewing featured items.','The person who updates seasonal hours and product links.'],
  sourceBridge:'Whale’s Tale lists 312 Washington Mall; Splash Gallery lists 512 Carpenter’s Lane, each with its own contact. Their published fall hours differ on Friday and Saturday evenings. The online catalog also marks some products sold out, without establishing stock at either physical location.',
  limits:'This work clarifies visiting and online-shopping information. Shared inventory, stock reservations and store-location integrations need separate assessment.',
  coverageNote:'Both published retail addresses are in Cape May. They are separate visitor destinations; neither is a Wonder and Method office or client location.',
  sources:[source('https://whalestale.com/pages/contact-us-1','Whale’s Tale and Splash: location contacts','Separate addresses, contact routes and fall hours.'),source('https://whalestale.com/','Whale’s Tale: featured products','Online product status and seasonal visit information.')],
  check:'An evening gallery visit and an online product purchase retain their different destinations and information needs.',
  researchNote:'Homepage and contact page read. No location-level stock claim or private inventory was verified.'
 },
 {
  route:'/areas/new-jersey/essex-county/',
  heading:'Preserve the catalog selection without implying a completed purchase.',
  intro:'A catalog can help a buyer select an industrial part while still handing the request to a quotation process. Custom work needs a useful alternative when no catalog selection fits.',
  customerQuestion:'Can I request this known part, or should I explain a custom component instead?',
  decisions:[
   {label:'Keep the known part identifiable',body:'Carry the product reference from the catalog into the agreed quotation route. Label the action by its actual result, so an RFQ cart is not described as a paid checkout or a guarantee that the part is in stock.'},
   {label:'Give a custom requirement an appropriate route',body:'Provide a separate way to describe the intended application when the buyer cannot select a catalog part. Ask the owner which initial details are useful; avoid forcing a fabricated product number just to submit an inquiry.'},
   {label:'Show what the supplier still needs to approve',body:'Keep suitability, availability and production details in the supplier’s review. Test a known-part request and a custom inquiry to check that the received information preserves the distinction without promising engineering approval.'}
  ],
  ownerInputs:['Product references and existing catalog/RFQ destinations.','Approved initial questions for a custom-component inquiry.','The supplier’s quotation and suitability-review wording.'],
  sourceBridge:'Minor Rubber’s Bloomfield site separates standard catalog components from custom molding and extrusion. It describes standard products as available to find and quote through the catalog, and its separate cart page is explicitly an RFQ cart.',
  limits:'The proposal improves product explanations and the existing handoff. CAD processing, engineering assessment, inventory synchronization and ordering systems require separate work.',
  coverageNote:'Minor Rubber lists its facility in Bloomfield, Essex County. This example concerns its published catalog and custom-capability routes, not a claim that it is a studio client.',
  sources:[source('https://www.minorrubber.com/','Minor Rubber: catalog and custom capabilities','Standard-product quotation and custom manufacturing routes.'),source('https://www.minorrubber.com/product-catalog.html?page=cart','Minor Rubber: RFQ cart','The product-selection destination is labeled as a request-for-quotation cart.')],
  check:'A catalog selection stays identifiable; a custom inquiry can proceed without a made-up part number; neither is called an approved purchase.',
  researchNote:'Homepage and empty RFQ cart read. Separate quote form and FAQ returned 429; no form-field requirements or successful submission are claimed.'
 },
 {
  route:'/areas/new-jersey/gloucester-county/',retireWorksheet:true,
  heading:'Keep the vehicle category and condition beside the starting price.',
  intro:'A detailing package’s starting price may apply to one vehicle category. A useful request should preserve the vehicle and its condition before the operator confirms the work.',
  customerQuestion:'Does the advertised starting price apply to my vehicle and its current condition?',
  decisions:[
   {label:'Identify what the starting price covers',body:'Place the relevant vehicle category beside each package price. Show size adjustments where the customer compares packages, so a larger vehicle is not mistaken for the base-price example.'},
   {label:'Make condition review part of the request',body:'Offer a clear place to describe a condition that may change the quote. Explain who confirms an additional charge before work starts; do not calculate a final price from a short free-text note.'},
   {label:'Carry the vehicle into appointment confirmation',body:'Keep the chosen service and vehicle description in the received request. The preferred time remains subject to the operator’s confirmation. Test with a larger vehicle and a condition concern rather than only the simplest sedan example.'}
  ],
  ownerInputs:['Owner-approved package prices and vehicle categories.','Conditions requiring review and approved surcharge wording.','The existing appointment request and confirmation process.'],
  sourceBridge:'Adam’s Autoshine in Gloucester County labels its package starting prices for sedans and coupes. It publishes separate adjustments for larger vehicle groups and a possible condition surcharge that it says is confirmed before work starts. Its appointment form asks for vehicle make and model.',
  limits:'This page does not determine a final price or guarantee an appointment. Pricing automation, vehicle databases and scheduling integrations need a separate scope.',
  coverageNote:'Adam’s Autoshine explicitly advertises Gloucester County service. Its site mixes shop wording with mobile-location information, so this example does not supply an unverified shop address or preparation requirement.',
  sources:[source('https://adamsautoshine.com/','Adam’s Autoshine: package conditions and appointment request','Vehicle-group pricing, condition review and request information.')],
  check:'A larger vehicle with a condition concern retains both facts when the request reaches the operator.',
  researchNote:'Complete public page read. Decorative check/cross icons in package lists are not reliably represented in text, so no detailed package-inclusion list is reused. Shop address and mobile utility requirements remain unverified and are excluded.'
 },
 {
  route:'/areas/new-jersey/hunterdon-county/',
  heading:'Apply the weather instruction to the selected detailing service.',
  intro:'A weather change can affect exterior work differently from an interior-only appointment. The website should preserve the selected service through a request and any later rescheduling discussion.',
  customerQuestion:'If rain is forecast, does my selected service need a different arrangement?',
  decisions:[
   {label:'Keep the service choice with the weather note',body:'Attach weather guidance to the work being requested. Give an interior-only customer the relevant instruction instead of applying a blanket exterior-service cancellation message to every appointment.'},
   {label:'State what remains to be confirmed',body:'Distinguish a submitted request from the operator’s confirmed arrangement and exact quote. Put any response-time qualification beside the promise, so a business-hours target does not become an unqualified round-the-clock guarantee.'},
   {label:'Explain how changed conditions are handled',body:'Describe the operator’s contact and rescheduling process without implying the website changes a booking automatically. Test an exterior-service example and an interior-only example under the same forecast, including the current preparation instructions.'}
  ],
  ownerInputs:['Service-specific weather and rescheduling wording.','Business hours and the actual request-confirmation process.','Current access/preparation instructions and the operator contact.'],
  sourceBridge:'River Valley Detail Co. lists Hunterdon coverage and says it contacts customers before forecast rain to discuss rescheduling or a service-dependent alternative. Its FAQ distinguishes interior-only work from a full exterior detail, and its request section qualifies the response target by business hours.',
  limits:'Weather feeds, automatic rescheduling, staff dispatch and booking-system changes require separate assessment.',
  coverageNote:'The operator lists Hunterdon communities within coverage centered on the New Hope–Lambertville corridor. A named county does not imply unrestricted coverage or guaranteed availability at every address.',
  sources:[source('https://rivervalleydetailco.com/','River Valley Detail Co.: weather and confirmation FAQ','Service-dependent rain handling, coverage and qualified request response.')],
  check:'An interior-only request does not inherit the exterior-weather message, and the acknowledgment does not promise an automatic confirmed date.',
  researchNote:'Complete page read. The earlier brief lacked supporting details that are now visible. No ratings, environmental-compliance claims or private booking behavior are reused.'
 },
 {
  route:'/areas/new-jersey/morris-county/',retireWorksheet:true,
  heading:'Explain the initial visit separately from approved repair work.',
  intro:'A service visit may cover an initial assessment while further diagnostic or repair work needs its own approval. The website should make those stages clear before a customer requests an appointment.',
  customerQuestion:'What does the initial visit cover, and when would I approve additional work?',
  decisions:[
   {label:'Define the first visit’s boundary',body:'Put the visit charge beside its stated assessment scope. Explain what is included before the booking action, without describing the initial visit as an unlimited diagnosis or a completed repair.'},
   {label:'Keep a membership exception with its address condition',body:'Explain when a member’s visit charge is waived and what information staff uses to confirm eligibility. Do not imply that an account or membership automatically extends a benefit to every property.'},
   {label:'Show where approval and any credit occur',body:'Keep the additional-work approval separate from the visit request. Explain how an applicable visit charge is credited, then test a member request and a nonmember request without treating either as advance approval of repair work.'}
  ],
  ownerInputs:['The visit charge, assessment limits and additional-work approval wording.','Membership eligibility and the covered-address condition.','The rule for applying a visit charge to later approved work.'],
  sourceBridge:'Sidekick Plumbing’s Morris County page lists a $75 initial visit, plus applicable New Jersey sales tax, covering dispatch and up to 15 minutes of visual assessment in readily accessible areas. Active members receive a waiver at their covered address. When the charge applies, it is credited once toward approved additional work recommended from the visit.',
  limits:'The proposed page explains the published process. It does not perform diagnosis, establish membership eligibility, dispatch a technician or approve a repair.',
  coverageNote:'Sidekick Plumbing publishes this process for its Morris County service. The example does not infer an emergency-response guarantee from a phone number or ordinary contact form.',
  sources:[source('https://sidekickplumbing.com/','Sidekick Plumbing: initial visit and written approval','Assessment scope, conditional member waiver and application of the visit charge.')],
  check:'A reader can distinguish the initial visit, a covered-address waiver and approval of additional work.',
  researchNote:'Complete homepage read; explicit current process replaces the old unsupported emergency-channel distinction. No booking or membership lookup was performed.'
 },
 {
  route:'/areas/new-jersey/union-county/',
  heading:'Offer a consultation without making it an invented booking requirement.',
  intro:'Someone unsure which hair service to choose may want a conversation before committing. A website can explain that option while keeping ordinary service booking clear.',
  customerQuestion:'Can I discuss the right service first without booking the treatment itself?',
  decisions:[
   {label:'Explain what the consultation is for',body:'Describe the conversation’s purpose and distinguish it from the treatment. Give an uncertain visitor a way to discuss goals and relevant history without asking the website to choose or approve a procedure.'},
   {label:'Keep optional and required steps distinct',body:'State whether the owner offers a standalone consultation and whether it is optional for the selected service. Do not convert advice to consult into a mandatory rule for every customer or an extra step before every booking.'},
   {label:'Name the actual appointment being arranged',body:'Label the consultation and service destinations accurately. Verify their provider listings and confirmation messages with the owner so a visitor does not expect a full treatment during a consultation slot.'}
  ],
  ownerInputs:['The owner-approved consultation purpose and current terms.','Which services encourage or require advance discussion.','Actual consultation and treatment booking/contact destinations.'],
  sourceBridge:'Meraki Salon’s Mountainside consultation article says consultations are complimentary and may be booked separately before a service commitment. It encourages a consultation before keratin treatment. That published option supports an ask-first route, but not a universal requirement to book a separate consultation.',
  limits:'The website should not assess treatment suitability or collect unnecessary personal information. Scheduling and client records remain in the agreed provider.',
  coverageNote:'Meraki identifies its salon in Mountainside and its service area as Union County. This example is about choosing a consultation or service, not a medical assessment or a claim of a studio client relationship.',
  sources:[source('https://www.merakisalon-nj.com/blog/what-happens-during-a-professional-hair-consultation','Meraki Salon: consultation options','Standalone complimentary consultation and service-specific encouragement.'),source('https://www.merakisalon-nj.com/services/blowouts-styling','Meraki Salon: Mountainside service information','Local service context and ordinary appointment route.')],
  check:'An undecided visitor can ask for a consultation while an ordinary service request is not forced through an unsupported prerequisite.',
  researchNote:'Official indexed article and service-page text read. Direct article fetch returned cache miss and homepage extraction was empty. No live provider booking flow was tested; do not claim a particular consultation calendar link works.'
 }
];
