// Each task is an illustrative planning exercise, not a completed client project.
export const statewideCountyBuyerTasks = {
  allegany:{
    name:'Allegany', title:'Prepare a quote request that a Wellsville provider can assess.',
    scenario:'An illustrative Wellsville business receives “How much would this cost?” without enough detail to identify the work.',
    decision:'Write down the three facts that change the estimate, then ask for those facts before adding optional details. Use a flexible community field for an Alfred or Angelica request; collect the precise service address at the point when it is needed. Explain what the customer receives next.',
    questions:['Which item or type of work is being estimated?','Which size, condition or specification changes the price?','When does the provider need the full service address?'],
    output:'A short estimate checklist, a focused inquiry form and a receipt that explains the review step.',
    check:'A person unfamiliar with the business can submit a useful request without treating the receipt as an accepted price or appointment.'
  },
  cattaraugus:{
    name:'Cattaraugus', title:'Separate rental, instruction and purchase before asking for a date.',
    scenario:'An illustrative Ellicottville business shows equipment that can be rented, purchased or used during instruction.',
    decision:'Create a compact comparison showing what the customer receives, what is included, the applicable location and the next step for each option. Keep the policies specific to the selected offer. If an Olean collection point is used, identify it separately from the activity location.',
    questions:['Is the customer buying, hiring or booking instruction?','Which equipment and support are included in that choice?','Where does collection, attendance or return happen?'],
    output:'An offer comparison with distinct calls to action and owner-approved inclusion notes.',
    check:'A visitor can select instruction without accidentally opening the equipment purchase path or assuming a rental includes teaching.'
  },
  cayuga:{
    name:'Cayuga', title:'Check a booking from service page to arrival point.',
    scenario:'An illustrative Cayuga County provider uses a mailing address and a different meeting point near Fair Haven.',
    decision:'Choose one offering and follow every step a new customer sees. Confirm that the page, booking destination and arrival instructions identify the same service and actual meeting point. Include a written address or approved directions so the map is not the only source of information.',
    questions:['Which location is for correspondence and which is for arrival?','Does the selected service use a different entrance or meeting point?','Who approves changes to arrival instructions?'],
    output:'A service-specific arrival block and a checked link to the corresponding reservation route.',
    check:'A first-time customer can identify where to go without interpreting a general “Cayuga County lakes” description as directions.'
  },
  chemung:{
    name:'Chemung', title:'Show a repair customer when approval is required.',
    scenario:'An illustrative Horseheads repair business receives items for assessment before it can confirm the work or completion date.',
    decision:'Describe the stages in order: inquiry, accepted drop-off, assessment, estimate approval and collection. Put any actual diagnostic charge at the correct stage. Give existing customers a clear status-contact route, and keep the full drop-off address distinct from other Elmira-area place names.',
    questions:['What has been agreed when the item is dropped off?','Which work requires the customer’s explicit approval?','How does the customer learn that collection is available?'],
    output:'A repair-process explanation with approved fee information and separate new-job and existing-job contact instructions.',
    check:'The page does not imply that dropping off an item authorizes every repair or guarantees a completion date.'
  },
  chenango:{
    name:'Chenango', title:'Let a repeat buyer identify an order without re-entering the specification.',
    scenario:'An illustrative Norwich supplier receives a request to repeat an earlier item with a different quantity.',
    decision:'Offer a reference field and a clear place to describe changes. Explain that price, quantity, specification and delivery are reviewed before acceptance. Use a separate checklist for a new buyer who has no reference. Keep confidential order records out of public examples.',
    questions:['Which reference lets the team find the earlier specification?','What has changed since the previous order?','Which terms must be confirmed again before acceptance?'],
    output:'A reorder inquiry and a separate new-specification checklist.',
    check:'A returning customer can describe one change without assuming the previous price or delivery terms still apply.'
  },
  clinton:{
    name:'Clinton', title:'Make destination, delivery method and currency explicit.',
    scenario:'An illustrative Plattsburgh seller receives an inquiry from Quebec about an item displayed on its website.',
    decision:'Ask whether the customer is requesting shipment, collection or a remote service. Confirm the destination and identify the currency of any displayed amount. Publish only the shipping or service territory the owner has approved; proximity to Canada does not establish the terms.',
    questions:['Where does the customer want the item or service delivered?','Is the displayed amount in US dollars or another stated currency?','Who confirms the final shipping and transaction terms?'],
    output:'A destination-aware inquiry with plain delivery and currency information.',
    check:'The customer can tell whether the displayed figure is an item price or an approved total for the requested delivery.'
  },
  columbia:{
    name:'Columbia', title:'Keep a sold Hudson piece useful without presenting it as available.',
    scenario:'An illustrative Hudson maker wants to retain an image of sold work because it explains a possible commission.',
    decision:'Label the original as sold and remove any purchase action. Explain which features may inform a new commission and which are unique to the pictured piece. Show scale and material, then link to a commission brief that asks about the new buyer’s requirements.',
    questions:['Is the image the actual item offered or a previous example?','Which features can be recreated or varied?','What must be agreed before a new commission is priced?'],
    output:'An accurately labeled archive item linked to a commission explanation.',
    check:'A visitor understands that the pictured original cannot be bought and that a new commission requires its own agreement.'
  },
  cortland:{
    name:'Cortland', title:'Publish the next program date without leaving last season’s registration open.',
    scenario:'An illustrative Homer instructor runs a recurring program and is preparing the next enrollment period.',
    decision:'Keep the stable program description and review the dated facts as one set: session date, venue, registration deadline and booking link. Define the page state after closing. Preserve useful learning information while removing actions that imply a place can still be booked.',
    questions:['Which information stays the same between sessions?','Where are dates repeated across the website?','What should visitors do after registration closes?'],
    output:'A maintained program page with explicit open, full or closed registration status.',
    check:'Following an old link does not offer a booking for an expired Cortland-area session.'
  },
  delaware:{
    name:'Delaware', title:'Prepare a Delhi property visit without publishing private access details.',
    scenario:'An illustrative Delhi provider needs to assess a job before discussing entry arrangements with the property owner.',
    decision:'Use the initial form for the project goal, community and intended timeframe. Publish a preparation checklist covering genuinely useful measurements or reference material. Exchange entry codes and private arrangements later through the agreed channel after the visit is accepted.',
    questions:['What information establishes whether the project fits?','Who can authorize the visit and approve the work?','Which access details should stay outside the public inquiry?'],
    output:'A public visit-preparation checklist and a separate private confirmation step.',
    check:'A customer can start a project inquiry without exposing an entry code or mistaking the form for permission to attend.'
  },
  essex:{
    name:'Essex', title:'Replace a vague activity label with useful participation information.',
    scenario:'An illustrative Lake Placid operator offers two outings that are both described simply as “adventure.”',
    decision:'Compare the actual duration, format, included equipment, meeting point and operator-approved requirements. Put those facts before the booking action. Give a contact route for questions that require individual discussion, and link to responsible official sources for changing conditions when relevant.',
    questions:['What will the participant actually do and for how long?','What is supplied and what must the participant arrange?','Which requirements need clarification before a booking?'],
    output:'A concrete activity comparison and an approved preparation section.',
    check:'A new visitor can distinguish the two options without relying solely on a promotional difficulty label or photograph.'
  },
  franklin:{
    name:'Franklin', title:'Keep Saranac Lake property instructions attached to the selected booking.',
    scenario:'An illustrative host offers two properties around Saranac Lake and handles check-in differently for each.',
    decision:'Name each property consistently across the site and reservation provider. Keep shared policies together but attach the correct arrival details to each property. Avoid a county dropdown as the primary selector because Saranac Lake spans Franklin and Essex counties.',
    questions:['Which property did the visitor select?','Does arrival happen at the property or a separate office?','Which instructions differ between the two bookings?'],
    output:'Property-specific pages or sections with checked booking links and distinct arrival information.',
    check:'Choosing one property cannot silently lead to the other property’s check-in address.'
  },
  fulton:{
    name:'Fulton', title:'Turn a sample photograph into a useful product specification.',
    scenario:'An illustrative Gloversville maker receives inquiries about a photographed item that is available in several materials and sizes.',
    decision:'Label the image as a sample when appropriate. List supported choices, dimensions or units and the information required for a quote. Explain the sample-approval stage and keep the same revision in any linked specification sheet. Confirm the actual Johnstown or Gloversville collection location separately.',
    questions:['Which visible features are fixed and which can vary?','What quantity and specification are needed for pricing?','How is the final sample or specification approved?'],
    output:'A product-family page with an accurate variation table and quotation checklist.',
    check:'A buyer can request a supported variation without assuming every combination is stocked or every photographed feature is included.'
  },
  genesee:{
    name:'Genesee', title:'Route today’s service problem differently from next month’s project.',
    scenario:'An illustrative Batavia provider handles both time-sensitive calls and planned work around Genesee County.',
    decision:'Publish the actual monitored route for urgent service and the hours it is handled. Use the planning form for project type, location and preferred period. Give each route a truthful response expectation; do not add an immediate-response promise to an ordinary form receipt.',
    questions:['Which requests need a phone conversation now?','When is that route actually monitored?','Which facts help plan work that can be scheduled later?'],
    output:'Clear urgent-service instructions and a separate project-planning inquiry.',
    check:'A visitor with a same-day problem does not assume an unattended web form has dispatched a technician.'
  },
  greene:{
    name:'Greene', title:'Close a Catskill event without hiding the ongoing business.',
    scenario:'An illustrative Catskill studio’s home page still promotes a workshop after registration has ended.',
    decision:'Update the event status and remove the expired booking action. Keep the regular service menu visible, and decide whether the workshop page now provides useful archive material or points to a current program. Check any repeated dates and external registration links at the same time.',
    questions:['What is the correct status of this event?','Which ongoing service should remain visible alongside it?','Does the old event page still provide useful information?'],
    output:'A clear event lifecycle and a restored path to current services.',
    check:'Someone arriving from an old event link can tell that registration has ended and can still find the studio’s current offer.'
  },
  hamilton:{
    name:'Hamilton', title:'Make essential Long Lake arrival information easy to save.',
    scenario:'An illustrative Long Lake business places its arrival instructions only inside a large image.',
    decision:'Rewrite the approved address, arrival window and contact route as ordinary text. Let a map or photograph provide additional context. Check the page at a narrow screen width and in print view, while keeping private entry instructions in the agreed separate channel.',
    questions:['Which facts must the customer be able to read without the image?','Can the essential information be printed or saved clearly?','Who keeps the arrival details current?'],
    output:'A concise, readable arrival page with optional supporting media.',
    check:'A visitor can identify the destination and contact details when images are unavailable, without a claim that the site is an offline application.'
  },
  herkimer:{
    name:'Herkimer', title:'Explain the actual material behind a specialist product name.',
    scenario:'An illustrative Herkimer seller uses “Herkimer diamond” in a product title but does not identify the material or item dimensions.',
    decision:'Retain the recognizable name while explaining that the material is quartz. Add accurate dimensions, condition and whether the image shows the item for sale. Publish origin or certification claims only when supported by the owner’s records.',
    questions:['What is the material and what does the common name mean?','Does the customer receive this exact item or a representative example?','Which origin and condition claims can the business substantiate?'],
    output:'A precise product description with a useful image caption and scale information.',
    check:'The buyer can distinguish a quartz specimen from a diamond and understands exactly what is being offered.'
  },
  jefferson:{
    name:'Jefferson', title:'Review the access arrangement before confirming an island visit.',
    scenario:'An illustrative Clayton service business receives a request at a Jefferson County island property.',
    decision:'Ask for the actual destination and known access arrangement, then let the business verify what travel it can accept. Keep the service request distinct from a confirmed transport plan. Offer collection or another approved arrangement only if it fits the business’s real capabilities.',
    questions:['Which property or meeting point is involved?','What access arrangement has been proposed?','Who confirms transport, timing and charges before acceptance?'],
    output:'An access-aware service inquiry and a written travel-confirmation step.',
    check:'A county address alone cannot trigger an unsupported promise of road access, boat transport or a mainland visit price.'
  },
  lewis:{
    name:'Lewis', title:'State the unit before asking a wholesale buyer for quantity.',
    scenario:'An illustrative Lowville producer receives an inquiry for “twenty” without knowing whether the buyer means individual items or cases.',
    decision:'Name the product, unit and pack size beside the quantity field or inquiry instructions. Distinguish retail from wholesale requirements and explain when availability and fulfillment are confirmed. If pickup is offered in Croghan, give its own approved collection details.',
    questions:['What is the orderable unit and how many items does it contain?','Which minimums or trade terms actually apply?','Is the request for collection or delivery?'],
    output:'A product-unit explanation and a practical trade inquiry checklist.',
    check:'The business can interpret the requested quantity without guessing, and the customer does not treat the inquiry as a confirmed order.'
  },
  livingston:{
    name:'Livingston', title:'Check eligibility without relying on an ambiguous place name.',
    scenario:'An illustrative Livingston County program receives an inquiry labeled “Dansville.”',
    decision:'Publish the approved catchment or participation rule and ask for the minimum detail needed to apply it. Dansville village is in Livingston, while Dansville town is in Steuben. Provide manual review for uncertainty instead of making an unreliable name match decide eligibility.',
    questions:['What is the program’s actual eligibility rule?','Which location detail is necessary to apply that rule?','What should a visitor do when the answer is uncertain?'],
    output:'A clear eligibility explanation with an appropriate review route.',
    check:'A valid inquiry is not rejected simply because a shared place name was assigned to the wrong county.'
  },
  madison:{
    name:'Madison', title:'Distinguish an application receipt from an accepted place.',
    scenario:'An illustrative Hamilton program reviews applicants before confirming participation.',
    decision:'Describe the application requirements, closing date and decision step. Write a receipt that confirms submission only, then identify how an acceptance or waitlist decision is communicated. Keep the correct Madison County venue information visible, especially when referring to Oneida or Hamilton.',
    questions:['What has happened when the applicant submits the form?','Who reviews the application and how is the decision communicated?','What additional step confirms participation?'],
    output:'A clear application page and accurate receipt wording.',
    check:'The applicant cannot mistake “received” for “accepted,” and the venue is not confused with Oneida or Hamilton County.'
  },
  montgomery:{
    name:'Montgomery', title:'Bring an Amsterdam brochure’s essential facts onto the website.',
    scenario:'An illustrative Amsterdam supplier puts its service descriptions and contact address inside a downloadable brochure only.',
    decision:'Identify the facts a buyer needs to choose a service and place them in readable page content. Keep the more detailed document available with a descriptive label, file type and revision. Assign one owner to review the page and document together when specifications change.',
    questions:['Which facts are required before a buyer can decide to contact you?','What useful detail belongs in the downloadable document?','How will conflicting revisions be detected and corrected?'],
    output:'A usable service page and a clearly labeled, maintained document link.',
    check:'A phone visitor can understand the offer and find the approved address without opening the brochure.'
  },
  orleans:{
    name:'Orleans', title:'Separate a Medina business’s opening hours from its appointment calendar.',
    scenario:'An illustrative Medina shop is open for browsing but requires appointments for a specialist service.',
    decision:'Publish browsing hours and appointment requirements as different facts. Connect the specialist offer to its approved booking route and describe what happens when no slot is available. Include a review process for short-term closures so exceptions do not become permanent notices.',
    questions:['What can customers do during ordinary opening hours?','Which service needs a confirmed appointment?','Who approves and later removes temporary exceptions?'],
    output:'Distinct opening and appointment information with a dated notice process.',
    check:'A visitor understands that an open shop does not guarantee an immediate specialist appointment.'
  },
  otsego:{
    name:'Otsego', title:'Give a Cooperstown group organizer a useful first brief.',
    scenario:'An illustrative Cooperstown provider receives a group request before all participants have agreed on a date.',
    decision:'Ask for approximate size, preferred and alternative dates, desired service and an organizer contact. Explain which decisions are still provisional and whether a hold is available under the real policy. Make inclusions clear enough for the organizer to share with other decision-makers.',
    questions:['Which dates and group size are still estimates?','What is included in the proposed format?','When, if ever, does the request become a held or confirmed booking?'],
    output:'A shareable group-offer summary and a concise organizer inquiry.',
    check:'The organizer can brief the group without suggesting that a date, ticket or external attraction has been reserved.'
  },
  putnam:{
    name:'Putnam', title:'Describe a first appointment with verified access facts.',
    scenario:'An illustrative Carmel provider uses “easy access” without explaining the entrance or how to ask about a visit arrangement.',
    decision:'Replace the general phrase with owner-verified entrance and facility details relevant to the appointment. Provide a contact route for specific arrangements. Keep the question about what the visitor needs, without requiring a diagnosis or sensitive history in the general form.',
    questions:['Which entrance and facilities can the owner verify?','What information helps someone decide whether to contact the business?','How can the visitor ask about an arrangement privately?'],
    output:'A practical first-visit section and a clear arrangement-contact route.',
    check:'A visitor can identify the known facts and unresolved questions without interpreting the website as a physical-access certification.'
  },
  schoharie:{
    name:'Schoharie', title:'Publish a dated pickup offer with a clear cutoff.',
    scenario:'An illustrative Schoharie producer offers a changing bundle for collection on a specified day.',
    decision:'Keep the bundle contents, unit, ordering cutoff, collection window and actual pickup address together. Explain how availability and substitutions are confirmed. Decide what the page displays after the cutoff instead of leaving an expired offer active.',
    questions:['Which date and quantity does this offer cover?','When does ordering close and when is acceptance confirmed?','What happens if an included item is unavailable?'],
    output:'A complete dated offer with collection instructions and an expiry action.',
    check:'A customer arriving after the cutoff does not submit what appears to be an accepted order for the previous collection day.'
  },
  schuyler:{
    name:'Schuyler', title:'Check what a Watkins Glen event-related package actually includes.',
    scenario:'An illustrative Watkins Glen host promotes a package around an external event.',
    decision:'Identify the host’s own dates, inclusions and reservation terms. State whether event admission is included only when the business can substantiate that offer. Link to the organizer for current event information and distinguish Watkins Glen International from Watkins Glen State Park where relevant.',
    questions:['What does this business supply as part of the package?','Which external arrangements must the customer make separately?','Who reviews event references and removes the expired offer?'],
    output:'An accurate package page with a clear boundary around external services.',
    check:'A customer cannot infer tickets, affiliation or event guarantees from a nearby-place reference or promotional image.'
  },
  seneca:{
    name:'Seneca', title:'Compare a short visit with a reserved experience.',
    scenario:'An illustrative Waterloo business offers a walk-in visit and a longer reserved session.',
    decision:'Use the same comparison fields for both options: duration, inclusions, venue, requirements and booking process. Explain the difference between a walk-in policy and available space. A lake name should support the destination, not replace the actual address.',
    questions:['How much time should the customer allow for each option?','What is included only in the reserved experience?','Which availability or group details require confirmation?'],
    output:'An experience comparison linked to the correct inquiry or reservation path.',
    check:'A visitor can choose the suitable format without assuming that the longer session is included in an ordinary visit.'
  },
  steuben:{
    name:'Steuben', title:'Route a Corning portfolio visitor to buying, commissioning or learning.',
    scenario:'An illustrative Corning maker displays finished pieces alongside images used to promote classes.',
    decision:'Label the role of each example and give it a relevant next step. A sale item needs availability and purchase terms; a commission needs a brief; a class needs requirements and booking details. Keep independent work clearly distinct from nearby institutions.',
    questions:['Is this example for sale, a commission reference or teaching material?','What does the customer receive through the associated offer?','Which claims and images are approved for this use?'],
    output:'A labeled portfolio with three understandable service routes.',
    check:'A visitor does not mistake an instructor’s demonstration for a guaranteed class result or an archived piece for current stock.'
  },
  'st-lawrence':{
    name:'St. Lawrence', title:'Assign an owner to every changing location fact.',
    scenario:'An illustrative business has real premises in Potsdam and Ogdensburg, with different people supplying updates.',
    decision:'Create a small content register listing each location’s hours, services, contact route, fact owner and approver. Consolidate changes before publication and record what was checked. Keep common service descriptions shared instead of maintaining divergent copies.',
    questions:['Who knows when this location’s information changes?','Who approves the change before it is published?','Which booking and contact destinations must be checked afterward?'],
    output:'A location-information register and one documented publishing route.',
    check:'A supplied change can be traced to its approver, and one location’s hours cannot accidentally overwrite the other’s.'
  },
  sullivan:{
    name:'Sullivan', title:'Qualify a venue inquiry without collecting a guest list.',
    scenario:'An illustrative Bethel venue needs to assess an event’s fit before preparing a proposal.',
    decision:'Ask for event format, preferred dates, approximate size and organizer contact. Explain the venue’s approved capabilities and whether accommodation or other services are separate. Keep detailed attendee information and payments out of the initial general inquiry.',
    questions:['Which format and approximate size need to be accommodated?','Which spaces and services are actually included?','What must happen before a date is confirmed?'],
    output:'A concise event brief and accurate venue-offer explanation.',
    check:'The venue can assess the request without an unnecessary guest list, and the organizer understands that no date has yet been reserved.'
  },
  tioga:{
    name:'Tioga', title:'Separate the base offer from optional installation.',
    scenario:'An illustrative Owego supplier advertises an item that some customers also want delivered and installed.',
    decision:'Explain what the published item price or quote covers. Identify delivery and installation as separate choices when they are genuinely optional, and list the site facts needed to assess them. Confirm the actual New York or Pennsylvania destination before applying the provider’s approved service terms.',
    questions:['What exactly is included in the base offer?','Which additions are optional and which costs are required?','What information is needed before installation can be quoted?'],
    output:'A transparent inclusion list and an installation-assessment inquiry.',
    check:'A customer can compare the offer without discovering an unavoidable omitted charge only after submitting the request.'
  },
  tompkins:{
    name:'Tompkins', title:'Make an Ithaca capability page useful to a second reviewer.',
    scenario:'An illustrative Ithaca specialist’s prospective client sends the service page to a colleague who missed the introductory call.',
    decision:'Bring the problem, deliverables, required inputs, review stages and approved evidence together on the page. Define essential technical terms. Clearly distinguish illustrative examples from completed client work, and avoid implying a university relationship from an Ithaca address.',
    questions:['What will the client receive and what decisions remain theirs?','Which inputs and approvals are needed to proceed?','What evidence can be published accurately and with permission?'],
    output:'A self-contained capability page with a useful proposal checklist.',
    check:'The colleague can assess the offer and identify outstanding questions without relying on an undisclosed sales conversation.'
  },
  warren:{
    name:'Warren', title:'Follow a Glens Falls appointment link through the visible booking path.',
    scenario:'An illustrative Glens Falls provider links to an existing scheduling service from two different service pages.',
    decision:'Open each link at phone and desktop widths. Confirm the business identity, service, location and visible next step. Record whether the provider preserves the selected service and any access limits. If a generic landing page is unavoidable, explain the next choice on the website.',
    questions:['Does the external page match the service the customer selected?','Is the correct location and appointment format visible?','Which parts of the provider flow can actually be checked?'],
    output:'A checked set of booking links and a short record of the visible customer path.',
    check:'A customer is not unexpectedly returned to an unrelated service list or sent to the wrong Lake George-area location.'
  },
  washington:{
    name:'Washington', title:'Keep a job application out of the customer quote inbox.',
    scenario:'An illustrative Fort Edward business advertises a vacancy while using one general contact page for all messages.',
    decision:'Publish the approved role and application route separately from service inquiries. Identify the actual work location, especially where Hudson Falls could be confused with Hudson. Agree who receives applicant information and whether an existing recruitment service is used.',
    questions:['Is this visitor asking to buy a service or apply for work?','Which recipient and information are appropriate for each route?','What happens to the vacancy page when the role closes?'],
    output:'Clear customer and applicant contact paths with an owner for vacancy updates.',
    check:'An applicant reaches the approved process without attaching personal documents to an unrelated sales request.'
  },
  wayne:{
    name:'Wayne', title:'Inventory every address reference before a Newark business moves.',
    scenario:'An illustrative Newark business is changing premises while keeping its existing domain and email.',
    decision:'List the website address references, booking pages, downloads and business-controlled listings. Approve the move date and new instructions, then update them together where access and scope allow. Preserve unrelated mail settings and map any necessary website URL changes.',
    questions:['Where does the old address still appear?','Which accounts or external pages need separate access?','What should customers see before, during and after the move?'],
    output:'A move checklist with owners, effective dates and post-publication checks.',
    check:'The new website address works, the customer sees current visit information, and existing email has not been changed accidentally.'
  },
  wyoming:{
    name:'Wyoming', title:'Use one failed customer task to choose the first fix.',
    scenario:'An illustrative Warsaw business receives calls saying its website inquiry did not arrive.',
    decision:'Test the path from service selection to validation, submission, receipt and the receiving inbox. Record the failure and available access. If the problem is contained, compare a focused repair with a full redesign before deciding on the larger scope.',
    questions:['At which step does the customer task fail?','Can the issue be corrected without replacing working pages?','What evidence will show that the agreed fix works?'],
    output:'A dated problem record, a bounded recommendation and a repeatable acceptance check.',
    check:'The selected work resolves the observed issue; a new visual design is not used as a substitute for verifying message delivery.'
  },
  yates:{
    name:'Yates', title:'Build a Penn Yan page map from decisions, not spare page slots.',
    scenario:'An illustrative Penn Yan business is choosing its first website package and considering a page for every nearby lake.',
    decision:'List the customer questions and group those that share the same answer. Give distinct offers their own pages when their requirements or inquiry paths differ. Use Seneca, Keuka or Canandaigua references to explain the actual destination, and assign an owner to facts that change.',
    questions:['Which decisions must a customer make before contacting the business?','Which questions belong together on one useful page?','Who maintains dates, availability and location information after launch?'],
    output:'A purposeful page map with content responsibilities and update notes.',
    check:'Every proposed page has a distinct customer purpose, and no page exists only to repeat the same service under another lake name.'
  }
};
