const source=(url,label,observation)=>({url,label,observation});
export const replacements=[
 {
  route:'/areas/west-virginia/pleasants-county/',partition:6,
  heading:'Explain the handoff when a gift recipient is unavailable.',
  intro:'A flower order needs more than the recipient’s street address. Help the sender describe the destination and understand how the florist handles an unsuccessful first delivery.',
  customerQuestion:'What should the florist know about reaching the recipient, and what happens if nobody can accept the gift?',
  decisions:[
   {label:'Ask for the destination details that matter',body:'Distinguish a home from a workplace, hospital or event venue before asking for delivery notes. A fictional office delivery might identify the reception desk and the recipient’s department. Explain which information belongs in the delivery instructions so it does not appear in the greeting card.'},
   {label:'Describe the provider’s actual fallback',body:'Place the approved recipient-unavailable explanation beside delivery information. The sender should understand when the florist may use a suitable place and when another attempt may be needed. Do not turn a note field into a guarantee that a requested handoff or time will be possible.'},
   {label:'Provide a route for a difficult handoff',body:'Give senders a clear way to ask about a destination that cannot accept an unattended gift. For example, a venue with limited reception hours needs discussion before an important deadline. Explain how the sender can identify the order when contacting the shop without exposing the recipient’s details on a public page.'}
  ],
  ownerInputs:['Required destination and recipient information, separated from the card message.','Approved wording for unavailable recipients and any conditions on unattended delivery.','The contact route for delivery questions, changes and unresolved attempts.'],
  sourceBridge:'The Greenhouse in Saint Marys asks for a full address and delivery notes for homes, hospitals, businesses and venues. Its FAQ says an unavailable recipient may lead to placement in a safe spot or a later delivery attempt. That handoff is a different planning task from choosing flowers or a palette.',
  limits:'The florist decides whether a handoff is possible and how a failed attempt is handled. This is proposed explanatory content; no checkout, notification or delivery was tested. Do not publish unverified access codes, exact-time promises or fees.',
  coverageNote:'The Greenhouse lists 97 Forest City Drive in Saint Marys, Pleasants County. Wonder and Method works remotely from Buffalo; the florist is a public planning example, not a client.',
  sources:[source('https://thegreenhouseinc.com/faq/','The Greenhouse: delivery and recipient questions','Requests complete addresses and delivery notes; describes safe placement or another attempt if the recipient is unavailable.'),source('https://thegreenhouseinc.com/','The Greenhouse: Saint Marys shop','Lists the shop at 97 Forest City Drive.')],
  check:'A fictional sender to an office can separate the card message from reception instructions and find the contact route when unattended delivery is unsuitable.',
  researchNote:'FAQ and home page read directly October 27. Opening-hour discrepancies are unrelated and omitted. No live order or delivery flow tested; comparison is Anson floral direction versus required flowers.'
 },
 {
  route:'/areas/west-virginia/putnam-county/',partition:6,
  heading:'Explain why a free checkout creates a request rather than a finished purchase.',
  intro:'A custom maker may use a zero-cost product listing to collect an inquiry. Explain that unusual sequence before checkout so the customer knows why an order number appears before the work has a price.',
  customerQuestion:'What does this free checkout record, and when will I learn the price of the embroidered item?',
  decisions:[
   {label:'Name the purpose of the free listing',body:'Describe the listing as the beginning of the custom discussion. Keep that explanation close to the action that adds it to the cart. A visitor should not interpret a zero total as a promise of a free garment, free design work or a completed production order.'},
   {label:'Keep the inspiration and instructions together',body:'Explain the provider’s stated sequence for adding reference images and describing the item in cart instructions. Show an illustrative request with item type, size, color and design idea. Tell the visitor why the resulting order number matters when the studio follows up; do not claim that an upload is required if the owner has not confirmed that behavior.'},
   {label:'Show the transition to a priced order',body:'Describe the consultation, price and invoice steps in their actual order. The acknowledgment should make the next action clear instead of sounding as though stitching has begun. Keep a useful contact route for someone who submitted the initial request but needs to correct its details.'}
  ],
  ownerInputs:['Approved explanation of the free listing and the reference number it creates.','Current image and cart-instruction steps, plus a contact route if they cannot be completed.','The consultation, pricing, invoicing and production-start wording.'],
  sourceBridge:'The Sovereign Sage’s custom product page instructs visitors to add a free listing, include their instructions and check out to create an order number. The studio then discusses the design and invoices; it states that creation begins after payment. Its homepage identifies the Winfield studio and Putnam County service.',
  limits:'This explains a published ordering sequence, not a tested transaction or a payment integration. No order, upload or message was sent. Checkout customization, invoice automation and customer accounts require separate scope.',
  coverageNote:'The Sovereign Sage identifies its studio in Winfield and explicitly serves Putnam County. Wonder and Method is a Buffalo studio working remotely; this is a public example, not a delivered client project.',
  sources:[source('https://thesovsage.com/products/custom-design-crewneck','The Sovereign Sage: free custom-request listing','Explains images, free listing, cart instructions and checkout for an order reference; consultation and invoice precede creation after payment.'),source('https://thesovsage.com/','The Sovereign Sage: Winfield studio','Identifies Winfield and service to Putnam County.')],
  check:'A fictional buyer understands that the zero-dollar checkout records the custom request and that the garment price and production commitment come later.',
  researchNote:'Both primary pages read October 27. Do not infer functional uploads or checkout validation from extracted text. Distinct from Pasco’s artwork approval and per-garment placement task.'
 },
 {
  route:'/areas/west-virginia/randolph-county/',partition:6,
  heading:'Show which artwork fits a custom acrylic light before the customer sends it.',
  intro:'A customizable light can accept lettering or a drawing without accepting every kind of image. Put the material’s published design limits next to examples so a customer can choose an appropriate reference.',
  customerQuestion:'Can my idea be made as lettering or a drawing, or does it depend on a photograph this product does not accept?',
  decisions:[
   {label:'Contrast suitable references with photographs',body:'Use clearly labeled examples of wording, a logo and a drawing. Keep the no-photographs condition beside those examples and the inquiry action. A visitor considering a portrait should find that limitation before preparing or sending a personal image.'},
   {label:'Discuss the outline separately from the design',body:'Explain that the acrylic’s shape is another part of the idea to discuss. In a fictional pet-name light, the lettering and a proposed silhouette are separate requests. The maker should confirm what can be produced; a mockup must not imply every outline, size or detail is supported.'},
   {label:'Keep the physical product clear',body:'Show how the acrylic design relates to the light and its controls. Label any demonstration or mockup so it cannot be confused with a tested custom result. Keep the product explanation and reference instructions together rather than sending every customer to an undifferentiated gallery.'}
  ],
  ownerInputs:['Examples of acceptable artwork and the product’s explicit exclusions.','The actual process for discussing a custom acrylic outline.','Approved product photographs, control descriptions and inquiry instructions.'],
  sourceBridge:'Almost Heaven Woodcraft in Elkins describes color-changing acrylic LED lights with a remote. Its product page accepts a logo, drawing or wording, explicitly excludes photographs, and says the acrylic can be cut to different shapes.',
  limits:'The maker confirms feasibility, dimensions and the final design. The pet-name example is hypothetical. No electrical, durability or safety claim is made, and no upload or purchase was tested.',
  coverageNote:'Almost Heaven Woodcraft identifies its shop in Elkins, Randolph County. Wonder and Method works remotely from Buffalo; this is a public planning example, not a client project.',
  sources:[source('https://www.almostheavenwoodcraft.com/led.aspx','Almost Heaven Woodcraft: acrylic LED light limits','Lists logo, drawing or wording customization, excludes photographs, and describes custom acrylic shapes and a remote control.'),source('https://www.almostheavenwoodcraft.com/','Almost Heaven Woodcraft: Elkins location','Identifies the business in Elkins.'),source('https://randolphctywv.gov/','Randolph County Commission: county places','Identifies Elkins among Randolph County communities.')],
  check:'A visitor with a portrait photograph sees the exclusion before sending it; a lettering idea can be discussed separately from a proposed outline.',
  researchNote:'LED page fetched directly October 27 and saved in output/human-quality-20261027/final-six-research/source-3.json; homepage read through web. County relationship retained from original sourced entry. Distinct from Clarion’s handwriting preservation.'
 },
 {
  route:'/areas/west-virginia/webster-county/',partition:6,
  heading:'Coordinate space for the horses with the traveler’s overnight arrangements.',
  intro:'A rider planning an overnight trip needs to discuss the horses, trailer and people together. A nearby rental property does not establish that stalls and human lodging are available for the same dates.',
  customerQuestion:'Can the horses and our overnight setup be accommodated together on the dates we need?',
  decisions:[
   {label:'Collect the three parts of the stay',body:'Frame the inquiry around horses, trailer arrangements and human lodging. A fictional party bringing two horses and one trailer should be able to describe whether the people want a rental property or a trailer hookup. Avoid collapsing those details into a single guest count.'},
   {label:'Make the separate capacity checks explicit',body:'Explain who confirms the stalls and the chosen overnight arrangement. Place that step before language suggesting the trip is booked. An adjacent farmhouse is useful context, but its proximity is not evidence that the desired rooms or dates are available.'},
   {label:'Prepare the visitor for the confirmed arrangement',body:'After the operator establishes the available setup, provide its approved arrival and supply information. Distinguish an item available to purchase from something included. Link to current park information for trail questions rather than copying a trail map into a permanent availability promise.'}
  ],
  ownerInputs:['The details needed to review horses, trailers and human lodging together.','How staff confirms each part of a stay and communicates any unavailable component.','Current arrival instructions, included supplies and separately purchased items.'],
  sourceBridge:'Kickin’ Back in the Valley describes a seven-stall horse hotel next to a rental farmhouse, with full and partial trailer hookups and shavings available for purchase. It asks visitors to call ahead for availability. Its contact page places the business in Webster County’s Hacker Valley.',
  limits:'The operator confirms accommodations, animal requirements and arrival arrangements. This is a proposed inquiry explanation, not equine-care advice or an inspected booking service. No availability, trail condition or bundled price is asserted.',
  coverageNote:'Kickin’ Back in the Valley identifies its cabins and horse hotel in Hacker Valley, Webster County. Wonder and Method works remotely from Buffalo; the business is a public research example, not a client.',
  sources:[source('https://kickinbackinthevalley.com/horse-hotel/','Kickin’ Back in the Valley: horse hotel and call-ahead requirement','Describes seven stalls, adjacent rental farmhouse, trailer hookups, purchased shavings and the need to call about availability.'),source('https://kickinbackinthevalley.com/contact-us/','Kickin’ Back in the Valley: Webster County location','Identifies the cabins and horse hotel in Webster County and gives contact routes.')],
  check:'A fictional two-horse party can ask about stalls, a trailer hookup and human accommodation without treating one available component as a confirmed entire stay.',
  researchNote:'Horse-hotel and contact pages read October 27. Homepage’s old 2022 reservation banner not adopted; no current inventory assumed. Compare against Noble’s product/addition distinction and other lodging examples. No booking submitted.'
 },
 {
  route:'/areas/west-virginia/wirt-county/',partition:6,
  heading:'Explain equipment transport alongside the repair request.',
  intro:'An equipment owner may need the machine collected as well as repaired. Describe those as related arrangements so a service inquiry does not leave the owner assuming transport is already included.',
  customerQuestion:'Can the dealer discuss collection for this machine as part of the repair arrangements?',
  decisions:[
   {label:'Describe the machine and its present location',body:'Help the owner identify the equipment and where it is before discussing a service appointment. Explain which location details staff needs for a transport question. A county name alone should not stand in for the actual collection point.'},
   {label:'Make transport a stated request',body:'Put the delivery or pickup question beside the repair contact route. An illustrative request might say that the owner cannot bring the tractor to the shop and wants to discuss collection. Present this as a request for staff review, without inventing transport charges, a service radius or loading capabilities.'},
   {label:'Confirm the movement and the workshop plan',body:'Explain how the dealer confirms collection, workshop arrangements and return or handover. A repair acknowledgment should not automatically read as a transport booking. Any preparation instructions must come from the dealer after it reviews the actual equipment and circumstances.'}
  ],
  ownerInputs:['The equipment and location information needed for a transport discussion.','Actual delivery/pickup eligibility, charges and scheduling responsibilities.','Approved acknowledgment, collection preparation and return arrangements.'],
  sourceBridge:'JSC Enterprises lists delivery/pickup among its services as well as tractor and implement repairs. Its homepage says repair appointments are arranged by calling the Spencer shop and explicitly identifies Wirt County among the areas served. The public listing does not establish transport terms for a particular machine.',
  limits:'Dealer staff decides service acceptance and transport feasibility. No loading, towing or repair instructions are supplied here. The proposal explains an inquiry; dispatch systems, quotations and live scheduling require separate scope.',
  coverageNote:'JSC Enterprises operates in Spencer and explicitly serves Wirt County. This is a service-area example, not a Wirt County office. Wonder and Method works remotely from Buffalo; the business is not presented as a client.',
  sources:[source('https://www.jscentinc.com/services','JSC Enterprises: transport and repair service categories','Lists delivery/pickup service, tractor repairs and implement repairs.'),source('https://www.jscentinc.com/','JSC Enterprises: repair appointments and Wirt service','Directs repair appointments to the Spencer shop by phone and names Wirt County among served counties.')],
  check:'A fictional owner needing collection can include that request with the equipment inquiry and understands that a repair reply alone does not confirm transport.',
  researchNote:'Home and service listing read October 27. Detailed transport page unavailable, so no distance, cost, machine eligibility or collection promise inferred. Distinct from Union’s sales-versus-repair routing.'
 },
 {
  route:'/areas/westchester-county/',partition:6,
  heading:'Organize a commercial cleaning discussion around differently used areas.',
  intro:'A busy lobby and a lightly used office need not be described as one uniform cleaning job. A useful business inquiry identifies the areas, their use and the interruption the premises can accommodate.',
  customerQuestion:'Which parts of the premises need attention, and which may need a different ongoing schedule?',
  decisions:[
   {label:'Separate the areas before discussing frequency',body:'Invite the customer to identify rooms or zones, surfaces and the main concerns. A fictional office can distinguish a busy reception carpet from a quieter meeting room. The resulting brief should preserve those differences instead of reducing the whole building to one generic service choice.'},
   {label:'Show how use informs the discussion',body:'Explain that traffic and recurring soil or spills are context for the provider’s recommendation. Let the customer distinguish a present cleaning request from interest in an ongoing plan. Do not use the website to prescribe the same interval for every area or create an automatic recurring order.'},
   {label:'Make operational constraints part of the reply',body:'Ask which areas must remain available and when staff can discuss access. Present these as conditions for the provider to review. A general drying-time statement should not become a guaranteed reopening time for a particular surface or building.'}
  ],
  ownerInputs:['The room, surface and use details needed for a commercial assessment.','How staff distinguishes a one-time request from an ongoing-plan discussion.','Approved access, interruption and follow-up wording for business premises.'],
  sourceBridge:'Chem-Dry of Westchester’s commercial page contrasts a busy lobby that may need frequent cleaning with a smaller office that may need occasional cleaning and spot treatment. It says its plan is developed around the business and budget. That supports an area-by-area inquiry rather than a generic household-versus-business form choice.',
  limits:'The cleaning provider assesses surfaces, methods, frequency and return-to-use conditions. No health, stain-removal or drying-time result is promised. This is proposed website content; no commercial quote or booking was submitted.',
  coverageNote:'Chem-Dry of Westchester identifies commercial service in Yonkers and throughout Westchester County. Wonder and Method works remotely from Buffalo; this is a public planning example, not a client engagement.',
  sources:[source('https://www.chemdrywestchester.com/services/commercial-cleaning/','Chem-Dry of Westchester: commercial cleaning plans','Contrasts cleaning needs by traffic and room use, and describes developing a plan around the business and budget.'),source('https://www.chemdrywestchester.com/services/','Chem-Dry of Westchester: service area','Identifies service throughout Westchester County.')],
  check:'A fictional office inquiry retains different needs for reception and meeting rooms without setting one automatic interval or promising a reopening time.',
  researchNote:'Service and commercial pages read October 27. Health, disinfection, stain-removal guarantees, company tenure and numerical drying claims were not adopted. No actual customer details or booking tested.'
 }
];
