// Each worksheet describes a hypothetical business and a concrete planning decision.
export const pennsylvaniaTasksB = {
  clinton:{
    name:'Clinton', title:'Turn a short Lock Haven promotion into a complete offer.',
    scenario:'A Lock Haven business has prepared a promotional graphic, but the included work, collection arrangements and end date are not yet stated together.',
    decision:'Write the promise in one sentence, then put the qualifying options, exclusions and expiry beside it. Compare that version with the announcement and inquiry receipt. Assign an owner to approve the terms and replace the offer when it ends. For a Mill Hall collection option, include the confirmed destination or explain when it is supplied.',
    questions:['What exactly does the advertised offer include?','Which condition or deadline changes a customer’s eligibility?','What will the customer receive after making the request?'],
    output:'One approved offer outline, matching action text and a dated replacement instruction.',
    check:'Follow the promotion link on a phone and identify the inclusions, cutoff and next step without consulting the original announcement.'
  },
  columbia:{
    name:'Columbia', title:'Separate a confirmed place from a Bloomsburg waitlist request.',
    scenario:'A Bloomsburg organizer uses the same “Sign up” button for an available event and a waiting list for a full session.',
    decision:'Write the confirmation message for each path first. Label the actions to match: registration, request or waitlist. Identify who contacts the customer and whether a separate provider confirms the place. Put the venue address with the event details, distinguishing Catawissa Borough from Catawissa Township where relevant. Record the update needed when registration closes.',
    questions:['Does this action confirm a place or only record interest?','Who sends the next message and what does it establish?','What should a visitor do once the session is full?'],
    output:'Two accurate action labels, matching confirmation messages and a closure instruction.',
    check:'Ask a new reader to join the waitlist and explain whether they now hold a place; the page and receipt should produce the same answer.'
  },
  crawford:{
    name:'Crawford', title:'Build a capability table a Meadville buyer can use.',
    scenario:'A Meadville fabricator has photographs of finished work but no clear distinction between standard capabilities and specifications requiring review.',
    decision:'Choose one process or product family. Record approved materials, dimensional units, relevant limits and the conditions requiring a specialist’s review. Link each public example to its owner-approved description and publication permission. Separate initial inquiry information from confidential drawings that need an agreed later exchange. Keep the table small enough to check when capabilities change.',
    questions:['Which materials and dimensions can the business publicly support?','Which tolerance or finish depends on a drawing review?','Who owns and approves the evidence accompanying each claim?'],
    output:'A checked capability matrix and a short specification checklist for new inquiries.',
    check:'Give a buyer a sample requirement and ask them to identify whether it fits the published range or needs review, without inferring capability from a photograph.'
  },
  cumberland:{
    name:'Cumberland', title:'Compare Carlisle website proposals against the same brief.',
    scenario:'A Carlisle owner has two proposals with different page counts and prices, but cannot tell which one includes writing, migration or booking work.',
    decision:'Create rows for purposeful pages, writing, features, existing-address handling, account ownership, review rounds and handoff. Mark each as included, separately priced or unresolved in both proposals. Add the business inputs and named approver beside the relevant stage. List provider charges separately. Resolve missing assumptions before deciding whether one proposal offers better value.',
    questions:['Which customer tasks must the finished website support?','What work or provider cost is outside each quoted scope?','Who supplies the inputs and approves each stage?'],
    output:'A comparable scope table with open questions and an agreed approval sequence.',
    check:'Choose one customer task, such as a consultation request, and trace every required page, connection and approval to an explicit proposal item.'
  },
  dauphin:{
    name:'Dauphin', title:'Create one approved brief for a Harrisburg project team.',
    scenario:'A Harrisburg team has separate reviewers for operating facts, messaging and budget, and each has sent a different list of website changes.',
    decision:'Assign an owner to each decision, then choose one person to return the consolidated response. Identify the version being reviewed and separate factual corrections from presentation preferences. Resolve conflicts before sending instructions. Mark any missing Derry Township service or appointment information as an open dependency, with an owner and due date, rather than filling the gap with an assumption.',
    questions:['Who can confirm each service claim and operating fact?','Who resolves conflicting feedback before it reaches the designer?','Which unanswered decision could change the scope or schedule?'],
    output:'A single approved brief, reviewer roles and dated review checkpoints.',
    check:'Present two conflicting comments to the team and confirm that the agreed approver can return one unambiguous instruction for the next version.'
  },
  delaware:{
    name:'Delaware', title:'Route three different Media customer needs correctly.',
    scenario:'A Media business receives appointment changes, general phone questions and new project requests through one undifferentiated contact page.',
    decision:'Write a short example of each customer need, then assign it to a supported phone, appointment or inquiry route. Explain who receives it and what response can be expected. Keep new-project questions out of an existing-appointment path. Where a visit is involved, check the full address and distinguish Chester City from Chester Township instead of relying on a general Chester label.',
    questions:['Which request is best handled by phone?','Which action is supported by the existing appointment provider?','What minimum information makes a new project inquiry useful?'],
    output:'A concise contact chooser with destinations and confirmation wording.',
    check:'Ask a returning customer to find the appointment-change route on a phone without starting a new booking or completing the project questionnaire.'
  },
  elk:{
    name:'Elk', title:'Explain which St. Marys product combinations can be requested.',
    scenario:'A St. Marys maker shows several product variations, but buyers cannot tell which finishes work with which materials or what changes the quote.',
    decision:'Select one product family and list its standard options. Mark combinations that are unsupported or require review, using owner-approved information. Label sample photographs with their actual specification. Add the quantity, dimensions and intended variation needed for a quote, then explain how a revised order reference is reviewed. Avoid using the options table as a promise of stock or production capacity.',
    questions:['Which choices are standard for this product family?','Which combination requires approval before pricing?','What change to quantity or specification triggers a new quote?'],
    output:'A readable options table, accurately labeled samples and a quotation checklist.',
    check:'Choose a nonstandard material-and-finish combination and confirm that the customer reaches a review request rather than an apparent accepted order.'
  },
  erie:{
    name:'Erie', title:'Distinguish Erie, Pennsylvania from New York at each decision point.',
    scenario:'A Erie business serves customers across state lines, but its site mixes a general Erie label with unclear office and service-area wording.',
    decision:'List the real location, supported delivery methods and actual coverage separately. Add Pennsylvania context to titles and service introductions where it resolves ambiguity. Check contact details, map links and confirmation messages against the address. Use a full destination for North East collection instructions, since the borough and township are separate. Keep the designer’s Buffalo base distinct from the client’s location.',
    questions:['Where is the business physically located?','Which work is delivered remotely, at the location or elsewhere?','Where could a reader reasonably mistake Pennsylvania for New York?'],
    output:'A consistent location statement and a checked set of contact and coverage details.',
    check:'Open the page without its navigation and identify the state, actual location and delivery method without relying on a search-engine snippet.'
  },
  fayette:{
    name:'Fayette', title:'Attach every stop to the correct Fayette County visit.',
    scenario:'A Uniontown business has an initial meeting at one location and a later stop elsewhere, while its website shows only a general business map.',
    decision:'Write the itinerary in order, separating the business address, first meeting point and subsequent stops. Record what the operator has approved for public directions, timing and access. Keep private instructions in the confirmation process. Identify which information changes between offers, and attach it to the selected experience. Use precise addresses where Connellsville or a cross-county Seven Springs location could be ambiguous.',
    questions:['Where must the customer go first?','Which travel or support between stops is actually included?','When and how are any remaining directions confirmed?'],
    output:'An offer-specific itinerary with destinations and a confirmation checklist.',
    check:'Choose one experience on a phone and locate its first meeting point without accidentally following directions for another offer or the mailing address.'
  },
  forest:{
    name:'Forest', title:'Give a Tionesta notice an owner and a review date.',
    scenario:'A Tionesta business has a temporary collection notice that is still visible after the person who posted it stopped checking the arrangements.',
    decision:'Record the affected service, approved current instruction, source and last-checked date. Name the person responsible for reviewing it and define what they must confirm before removal or replacement. Link to the responsible authority when the business cannot maintain changing information itself. Distinguish the actual affected location from the broader Tionesta Borough or Township area, and check matching messages or downloads.',
    questions:['Who is responsible for confirming the notice remains accurate?','What must be checked at the next review?','What should customers do while the notice is unresolved?'],
    output:'A dated notice record, an assigned reviewer and an explicit replacement decision.',
    check:'Read the notice as a new visitor and identify its scope, last review and contact route without assuming the page is a live status feed.'
  },
  franklin:{
    name:'Franklin', title:'Define what a Chambersburg product quote hands over.',
    scenario:'A Chambersburg showroom displays a sample, accepts orders for variations and offers collection or separately quoted delivery.',
    decision:'Label the sample and establish how availability is confirmed. Compare collection and delivery in terms of destination, timing and included services. Identify any assembly or installation that needs a separate quote. For a Shippensburg delivery, request the actual address because the borough spans county boundaries. Have the business approve the handover wording before using it on the product page or inquiry receipt.',
    questions:['Is the pictured item a sample, stock item or made-to-order option?','What exactly is included in collection or delivery?','When are the item, price and handover date confirmed?'],
    output:'An accurate availability label and a handover comparison tied to the quotation process.',
    check:'Select delivery and identify whether installation is included before submitting the inquiry; the page should leave no need to infer it from a photograph.'
  },
  fulton:{
    name:'Fulton', title:'Turn a preferred McConnellsburg date into a clear request.',
    scenario:'A McConnellsburg service has limited appointments and manually reviews each requested visit before confirming a time.',
    decision:'Replace any apparent instant-booking promise with a clear request process. Ask for a useful date window and the information required to assess the service. Write the receipt and confirmation as separate messages. Choose a supported fallback when no requested date is available, such as another window or an approved waitlist. Confirm location requirements for visits in Ayr, Todd or Taylor Township at the appropriate stage.',
    questions:['Does the website display real availability or collect preferences?','Who accepts the work and confirms the appointment?','What useful alternative is offered when the dates do not fit?'],
    output:'A request form outline, two distinct messages and an unavailable-date response.',
    check:'Submit a preferred date in a preview and explain what remains unconfirmed; the receipt must not imply the business has reserved that slot.'
  },
  greene:{
    name:'Greene', title:'Give a Waynesburg customer a private repair-update route.',
    scenario:'A Waynesburg repair business wants returning customers to ask about progress without filling out the new-repair form or accessing public job records.',
    decision:'Define the minimum reference and return contact details needed for an update. Identify who checks the requester’s identity before discussing the job. Describe the supported update route and owner-approved response expectations. Keep example stages general and free of customer records. A new account portal, live status display or connection to repair software needs a separate assessment of access and support.',
    questions:['Which reference helps staff find the existing conversation?','How is the requester checked before private information is shared?','What does the customer receive after asking for an update?'],
    output:'A concise existing-job contact process and a public explanation of the repair stages.',
    check:'Ask about a sample job without exposing another customer’s details or receiving a collection confirmation that the business has not approved.'
  },
  huntingdon:{
    name:'Huntingdon', title:'Separate a Huntingdon hire item from optional support.',
    scenario:'A Huntingdon supplier shows equipment with accessories and assistance in one photograph, leaving customers unsure what the standard hire includes.',
    decision:'List the supplied item, included accessories, hire period and separately agreed support. Label the photograph accordingly. Add owner-approved collection, preparation and return requirements, with a contact route for suitability questions. For a Mount Union handover, confirm the precise location and how the time is agreed. Keep specialist operating instructions with the responsible provider and its approved materials.',
    questions:['Which equipment and accessories are included in the quoted hire?','What support or delivery requires a separate agreement?','Which collection or return details must be confirmed before acceptance?'],
    output:'A clear inclusion comparison and an approved handover checklist.',
    check:'Compare equipment-only and supported hire on a phone, then identify the correct inquiry route without assuming every pictured item or service is included.'
  },
  indiana:{
    name:'Indiana', title:'Resolve the state and municipality in Indiana business details.',
    scenario:'A Indiana County business uses “Indiana” throughout its site, while a collection address and service-area description leave visitors unsure which state it serves.',
    decision:'Check the main title, service introduction, contact details and downloads for sufficient Pennsylvania context. Separate the actual postal address from the service area. If the location is in White Township, use the address and clarify the municipality where helpful. Keep Indiana Borough, Indiana County and the state of Indiana distinct without forcing the same phrase into every sentence.',
    questions:['Where could a first-time visitor misunderstand the state?','Does the published address identify the actual collection destination?','Which service-area claim is supported by the business’s real operations?'],
    output:'A checked location statement and a list of corrected titles, links and address details.',
    check:'Read the service page apart from the rest of the site and establish both the Pennsylvania coverage and the correct destination for a visit.'
  },
  jefferson:{
    name:'Jefferson', title:'Decide what happens to a Jefferson County page after its event.',
    scenario:'A Punxsutawney business has a dated package and a year-round service, but both currently lead to the same temporary inquiry form.',
    decision:'Separate the regular service explanation from the event dates, limits and cutoff. Define the event page’s later role: useful dated archive, relevant current offer or an appropriate redirect. Assign the owner of that change and list the announcements, navigation links and receipts affected. Review every inherited date and term before publishing a future edition, including any event-association claim.',
    questions:['Which part of the offer applies only to this event date?','Where should late visitors find the regular service?','Who checks the page and connected messages after the cutoff?'],
    output:'A before-and-after page plan with an approved expiry instruction and link checklist.',
    check:'View the planned post-event page and find a truthful next step without being invited to request an expired package.'
  },
  juniata:{
    name:'Juniata', title:'Define a complete Mifflintown batch order before the cutoff.',
    scenario:'A Mifflintown maker groups accepted orders into runs, but receives requests missing quantities or specifications shortly before the deadline.',
    decision:'Choose the minimum information needed to assess an order and explain how missing details are corrected. State the submission cutoff with date, time and time zone. Decide whether late or incomplete requests need review or move to another batch. Keep receipt, order acceptance and collection confirmation distinct. Verify the collection address so Mifflin and Mifflintown are not used interchangeably.',
    questions:['What makes a request complete enough for acceptance?','What happens if details arrive after the stated cutoff?','How does the customer receive confirmed collection instructions?'],
    output:'A batch request checklist, a cutoff policy and three accurately labeled messages.',
    check:'Try a sample request with a missing quantity and identify the next action without assuming that an early submission has reserved production capacity.'
  }
};
