// Original editorial scenarios; every business example is fictional.
export const newJerseyRows = [
{
  "id": "atlantic",
  "audience": "Businesses selling places on scheduled activities",
  "title": "Decide when a reopened-place invitation expires",
  "focus": "When a cancellation releases one place, the business needs a rule for the invitation it sends to a waiting customer. Decide whether the place is temporarily held, when that hold ends and what counts as an accepted reply. A link opened after expiry must not quietly claim a place already offered to someone else. Define how a refusal, silence and a late response affect the next invitation. Keep the operator responsible for allocating actual capacity; a website message cannot establish an allocation process the business does not run. Show the deadline and the required reply together, including the applicable time zone. Decide how staff resolve two replies received during a handoff before announcing a booking.",
  "briefs": [
    [
      "An invitation hold in Atlantic City",
      "Fictional example: An instructor in Atlantic City offers a canceled place to the first eligible waiting customer. The invitation identifies its reply deadline and says whether the place is held during that interval. Staff record a decline before offering it onward, so an old invitation cannot be treated as a standing booking link."
    ],
    [
      "A late acceptance in Hammonton",
      "Fictional example: An organizer in Hammonton receives a late acceptance after the invitation has expired. The expired destination explains that staff must check availability again and offers a supported reply route. It neither charges for an unavailable place nor implies that clicking quickly overrides the invitation rule."
    ]
  ],
  "search": "Keep the public session description separate from an individual invitation. Search visitors need current public availability, while the invited customer needs the status of that particular offer. Check shared and expired invitation links without exposing waiting-list identities in public page titles or search content.",
  "task": [
    "Decide when a reopened-place invitation expires",
    "Write an invitation for one reopened place, then walk through acceptance, refusal, silence and a late reply. Specify the hold deadline, accepted response channel, release action and staff check before the next invitation. Record how an already-used invitation is recognized.",
    [
      "Is the place held until the stated deadline?",
      "What evidence counts as acceptance?",
      "Who resolves a late reply after the next invitation?"
    ],
    "An invitation-expiry decision table and four reply-handling messages.",
    "Open an expired invitation in an approved test and confirm that it cannot claim a place assigned to the next customer."
  ],
  "local": [
    [
      "May an Atlantic City invitation promise a temporary hold?",
      "Only if the operator actually maintains that hold. State its end and the response that secures the place."
    ],
    [
      "What should a late Hammonton invitee see?",
      "Explain that the invitation expired and direct the customer to a current availability check; do not silently reactivate it."
    ]
  ],
  "faqs": [
    [
      "How should I choose a designer for reopened-place invitations?",
      "Ask them to demonstrate an expired and an already-used invitation, including the operator’s acceptance record. The proposal must identify which booking system controls the hold.",
      "how to choose a web design agency",
      "approach"
    ],
    [
      "What maintenance do invitation links need?",
      "Agree who checks expiry wording and the used-link destination when the booking process changes. Allocating places and answering invitations remain operational work unless separately agreed.",
      "what does website maintenance include",
      "maintenance"
    ],
    [
      "Can invitation changes affect session-page search visibility?",
      "Preserve the useful public session page while changing the private invitation flow. Review any altered public URLs and links; individual invitation status should not replace the searchable activity description.",
      "does website redesign affect seo",
      "migration"
    ]
  ]
},
{
  "id": "bergen",
  "audience": "Businesses offering products or appointments at multiple locations",
  "title": "Clear stale choices when a customer changes branch",
  "focus": "A location switch can invalidate decisions the customer made earlier. A selected appointment, product option or collection method may belong only to the previous branch. Decide which answers remain safe to keep and which must be cleared or explicitly reconfirmed. Explain the consequence before the customer loses useful work, then identify every invalidated choice beside the new branch. Changing a heading is insufficient when the submitted request still contains an old destination. Test switching back as well: the site should not resurrect a stale appointment simply because it remembers the earlier selection. Define the desired behavior before buying a location-selector integration, and distinguish retained customer contact details from branch-dependent commitments.",
  "briefs": [
    [
      "An invalid collection choice in Hackensack",
      "Fictional example: A Hackensack retailer lets a visitor select a collection option before changing branches. The new branch does not offer that option. The interface preserves the product inquiry but clears collection, explains why, and requires a supported receiving method before the final summary can be sent."
    ],
    [
      "An old slot after a Paramus branch switch",
      "Fictional example: A Paramus specialist lets a visitor switch branches after choosing an appointment. The old slot disappears from the request and the new branch is shown beside the empty appointment choice. Switching back requires a fresh availability check instead of restoring the old slot as if it remained reserved."
    ]
  ],
  "search": "Branch search landing pages may establish the initial selection, so include direct arrivals in the switch test. Verify the destination recorded in the final inquiry after a visitor enters through a branch-specific result. Useful branch descriptions cannot compensate for a form that submits the previous location.",
  "task": [
    "Clear stale choices when a customer changes branch",
    "Start with a completed fictional branch inquiry. Change branch and classify each stored answer as retain, clear or reconfirm, with a reason. Repeat by switching back and by arriving through a direct branch link. Compare the visible summary with the received request.",
    [
      "Which selections depend on the branch?",
      "What can safely remain after a switch?",
      "Does switching back recheck availability?"
    ],
    "A branch-change invalidation matrix and a verified before-and-after request pair.",
    "Switch branches after selecting an unavailable option and verify that neither the page nor the received request retains it."
  ],
  "local": [
    [
      "Should a Hackensack selection survive a branch change?",
      "Only if it remains valid at the new branch. Explain and clear a branch-specific collection or appointment choice that no longer applies."
    ],
    [
      "What should a Paramus customer review before sending?",
      "The new branch and every reconfirmed service choice should appear in the final summary and received request."
    ]
  ],
  "faqs": [
    [
      "How does a branch-change flow relate to local SEO?",
      "A branch result can preselect a location. Test that entry path and any subsequent switch so the inquiry still reaches the intended branch with valid choices.",
      "how to improve local seo",
      "seo"
    ],
    [
      "What affects the cost of repairing a branch selector?",
      "Scope depends on the dependent fields, booking or stock connections and the ways selection is stored. Bring a failing branch-switch example to the project brief before estimating the repair.",
      "how much does a website redesign cost",
      "cost"
    ],
    [
      "What does responsive design require during a branch switch?",
      "Keep the new branch, cleared choices and explanation visible on a small screen. Keyboard and touch users should both discover which selections require attention without searching the entire form.",
      "what is responsive web design",
      "design"
    ]
  ]
},
{
id:'burlington', audience:'Suppliers whose proposals are compared by purchasing teams', title:'Make a proposal easy for another person to evaluate',
focus:'A buyer may need to forward your service page to someone who has not attended the first conversation. Build the page around the decision that second person must make: what is supplied, which assumptions affect the estimate, what the customer provides and how acceptance works. Separate an illustrative configuration from a priced commitment. Give downloadable material a version or review date, and decide whether the webpage or document is authoritative when details change. A useful comparison should remain understandable without access to a salesperson’s explanation.',
briefs:[['A purchasing review in Mount Laurel','Fictional example: a Mount Laurel supplier offers two service levels. A compact comparison explains deliverables, customer preparation and approval stages. It identifies optional work separately so a forwarded summary does not turn an estimate into an implied all-inclusive promise.'],['A revision requested from Evesham','Fictional example: an Evesham buyer receives a revised specification. The supplier updates its approved reference document, records what changed and retires the old download link from the current page while preserving any agreed recordkeeping process.']],
search:'Organize search content around the service and its selection criteria. Useful specifications and clearly named alternatives can answer purchasing questions better than repeated geographic introductions. Check whether the page title promises a quote, a specification sheet or a general overview, then deliver that information.',
task:['Prepare a forwardable service comparison','Choose two offers and compare their deliverables, assumptions, customer inputs, exclusions and acceptance step. Identify statements that need technical approval. Give the comparison an owner and a review trigger.',['What can a reviewer decide without a sales call?','Which assumption changes the quoted scope?','Where is the current approved comparison maintained?'],'A one-page comparison with approved assumptions and a clear next step.','Ask a colleague unfamiliar with the discussion to explain the difference between the two offers.'],
local:[['Should a Burlington County supplier publish its complete proposal?','Publish a useful service comparison and approved general specifications. Customer-specific prices, confidential requirements and contractual terms belong in the appropriate proposal process.'],['How should Burlington City and Burlington Township be handled?','They are separate municipalities. Use the precise destination when delivery or attendance matters; do not infer the address from a buyer’s shorthand.']],
faqs:[['What makes a B2B website project more expensive?','Complexity comes from distinct buyer paths, technical writing, document management and integrations, not simply from calling the site B2B. For this comparison exercise, identify the required approval and revision process before pricing. Use the project-cost guide to prepare an explicit scope.','how much does a b2b website cost','cost'],['How should I hire a designer for a supplier website?','Ask how they will turn approved technical facts into a comparison a purchasing colleague can understand. Establish who checks accuracy and who maintains documents. Review a proposed information structure before judging whether the visual direction supports the buying decision.','how to hire a web designer','approach'],['Should procurement documents be checked during maintenance?','Yes, where document links and supplied changes are within the agreed care scope. Check that the current download opens and agrees with the page. The business still approves technical revisions, and a new document-control system is a separate feature decision.','what should i know about website maintenance','maintenance']]
},
{
id:'camden', audience:'Repair businesses that must screen items before accepting them', title:'Explain eligibility before asking someone to bring an item',
focus:'A repair inquiry is more useful when the customer can first see which items and conditions the business considers. Start with accepted categories, important exclusions and the information needed for initial review. Distinguish an eligibility response from a diagnosis, quotation or permission to drop something off. Explain how customers receive the next instruction and what to do when their item does not fit a listed category. Avoid an exhaustive technical form when a model name and short problem description would be enough to start.',
briefs:[['An uncertain item in Camden','Fictional example: a Camden workshop receives an inquiry about an unfamiliar model. The form allows a short description and offers a later information request. Its receipt says the team will review eligibility before confirming any appointment or charge.'],['A drop-off request from Cherry Hill','Fictional example: a Cherry Hill customer assumes a quotation request authorizes delivery. The workshop separates review, appointment confirmation and arrival instructions, so the customer sees when an item may actually be brought in.']],
search:'Give accepted repair categories useful descriptions and connect them to the eligibility step. Do not write pages for brands the business has not approved. Review searches and inquiry quality together: a visit is not useful if the page attracts work the workshop cannot consider.',
task:['Draw the eligibility boundary','List five accepted examples and three exclusions for one repair service. Identify the minimum information needed to distinguish them. Write separate messages for received, eligible for assessment and outside scope.',['Which fact determines whether the item can be considered?','When is an assessment appointment confirmed?','What instruction does an unsuitable inquiry receive?'],'An approved eligibility list and three response states.','Try a fictional out-of-scope inquiry and check that it does not receive misleading drop-off instructions.'],
local:[['Can a Camden repair form promise a diagnosis?','Only if that is genuinely the service being provided. An initial inquiry normally establishes fit and the next assessment step rather than a confirmed fault.'],['Should Cherry Hill customers see drop-off details immediately?','Show the business’s actual policy. If an appointment is required, make that requirement visible before giving arrival instructions that could imply walk-in acceptance.']],
faqs:[['When is a repair website ready for redesign?','Redesign becomes useful when the existing structure cannot explain eligibility, assessment and approval clearly. If one misleading form label is the main problem, a focused repair may be sufficient. Assess the customer path before replacing the entire site.','when is it time to redesign your website','repair'],['How does local SEO work for a specialist repair service?','It connects accurate service descriptions and genuine coverage with relevant searches. For a Camden County workshop, accepted item categories and assessment instructions are more useful than unsupported brand lists. Search improvements should support qualified inquiries, without promising rankings or an approved repair.','how does local seo work','seo'],['What should a designer do before rebuilding the repair form?','They should establish what the business needs to determine eligibility and how the inquiry reaches the reviewer. Agree on the receipt wording and test both a suitable and unsuitable example. A shorter form is only better if it still supports that decision.','what does a web designer do','design']]
},
{
id:'cape-may', audience:'Businesses publishing date-dependent booking policies', title:'Keep the policy that applies to a booking visible',
focus:'Different dates or offer types may carry different terms. Decide which policy the customer needs before choosing, and keep its version connected to that choice. Summarize important conditions in plain language while giving access to the approved full terms. The business supplies and approves those terms; a designer should not invent cancellation rules. Plan how a changed policy affects current pages, existing reservations and old confirmation links. A blanket statement such as “policies may change” cannot explain which arrangement a customer has selected.',
briefs:[['Two Cape May booking options','Fictional example: a Cape May provider has a flexible option and a fixed-date option. The comparison highlights their approved differences before the booking button, then links to the corresponding current terms rather than one ambiguous footer document.'],['An Ocean City policy update','Fictional example: an Ocean City organizer revises preparation instructions for future sessions. The business decides which bookings the revision affects and supplies the message. The website distinguishes new information from the terms associated with an earlier booking.']],
search:'Useful offer pages answer the questions that affect selection without turning policy wording into a keyword exercise. Keep dates and policy status clear in search landing pages. If an expired page remains accessible, explain its status and provide a relevant current route rather than silently changing its meaning.',
task:['Match an offer to its approved policy','Choose two booking options and record the applicable policy, review date, customer acknowledgement and maintained document. Identify the point where a customer sees the distinction. Decide who handles questions about an existing booking.',['Which condition could change the customer’s choice?','Where is the applicable version recorded?','Who approves a policy update?'],'A policy-to-offer map and a list of inconsistent links.','Follow each option from its public description to the final provider page and compare the policy labels.'],
local:[['Can a Cape May website reuse one policy for every offer?','Only when it accurately applies to every offer. Otherwise identify the differences beside the choice and link to the business-approved terms for that option.'],['What happens to an expired Wildwood event page?','Mark it as past information and offer a relevant current destination if one exists. Do not reuse its address for an unrelated event without considering shared links.']],
faqs:[['What should website maintenance include for booking policies?','It should identify which supplied policy edits are included, where links are checked and who approves the wording. The website and booking provider must agree. Advising on legal terms or determining which reservations a change affects remains the business’s responsibility.','what is included in website maintenance','maintenance'],['How long does a booking-site redesign take?','Timing depends on approved offers, policy decisions, provider access and review availability. Resolve conflicting terms before finalizing pages. The proposal should set milestones around those inputs rather than promise a generic duration that assumes every operating decision is already settled.','how long does a website redesign take','brief'],['How do I choose a designer for several booking options?','Ask them to show how a visitor compares the options and finds the policy that applies. Confirm who maintains external provider information and how past pages are handled. Evaluate that complete path alongside the design samples.','how to choose a web design agency','approach']]
},
{
  "id": "cumberland",
  "audience": "Suppliers publishing measurement-based quantity estimates",
  "title": "Show how an estimate converts and rounds customer measurements",
  "focus": "A quantity estimator must make its arithmetic understandable before a buyer treats the result as an ordering instruction. Define the accepted measurement units, the conversion used and the point where rounding occurs. Keep the measured need, any business-approved allowance and the purchasable quantity distinct. Rounding each dimension before calculating may produce a different result from rounding the final quantity. Ask the supplier to approve the rule and identify cases that need manual assessment. Do not describe an illustrative calculator as a verified specification or a guaranteed material requirement. Retain enough of the calculation in the result for a customer or staff member to spot a unit mistake without exposing implementation details.",
  "briefs": [
    [
      "A unit mismatch in Vineland",
      "Fictional example: A Vineland supplier estimates material from a customer’s dimensions. Its result shows the entered units, the calculated requirement and the separately rounded purchasable amount. A customer who entered centimeters while intending inches can see the mismatch before using the result in a quote request."
    ],
    [
      "Double rounding in Millville",
      "Fictional example: A Millville maker receives an estimate close to a pack boundary. Staff compare a just-below and just-above example and discover that the prototype rounds twice. The approved worksheet rounds at the agreed final step and labels any optional allowance separately from the measured requirement."
    ]
  ],
  "search": "An estimator landing page should explain what its result represents and where professional review remains necessary. Keep unit labels and the estimate boundary in readable page content. Search visitors who arrive directly at the tool need the same explanation as someone who first reads the product page.",
  "task": [
    "Show how an estimate converts and rounds customer measurements",
    "Choose one estimate formula and have the supplier approve its units, conversion and rounding point. Calculate sample values just below, at and above a purchase boundary. Show raw requirement, any allowance and final quantity separately, then trace the result into a quote request.",
    [
      "Where does rounding occur?",
      "Is an allowance separate from the measured need?",
      "Can staff reconstruct the displayed result?"
    ],
    "An approved arithmetic trace with boundary examples and a customer-readable estimate breakdown.",
    "Change only the input unit for an equivalent measurement and verify that the final requirement stays equivalent under the approved rounding rule."
  ],
  "local": [
    [
      "What should a Vineland estimate show beside its total?",
      "Show the entered units and the distinction between calculated need and rounded quantity, so a customer can identify a mistaken input."
    ],
    [
      "How should a Millville supplier approve rounding?",
      "Compare boundary examples against its real purchasing rule and record the approved calculation before publishing the tool."
    ]
  ],
  "faqs": [
    [
      "What does a designer contribute to a quantity estimator?",
      "They make inputs, units and the result breakdown understandable and coordinate the approved calculation with implementation. The supplier must validate the formula and assumptions.",
      "what do web designers do",
      "design"
    ],
    [
      "What affects the cost of a B2B estimating tool?",
      "The formula, unit choices, exceptional cases and quote-system connection determine the work. A static worked example and an interactive calculator are different scopes; define the required checks before pricing.",
      "how much does a b2b website cost",
      "cost"
    ],
    [
      "How can local SEO support an estimator page?",
      "Explain the product and estimation purpose clearly, with real service coverage where relevant. An accurate unit explanation is more useful than adding place names to an unexplained number.",
      "how to improve local seo",
      "seo"
    ]
  ]
},
{
id:'essex', audience:'Specialists offering several kinds of introductory consultation', title:'Help a customer choose the right first conversation',
focus:'When several consultation types share similar names, customers need a practical distinction before opening a calendar. Describe the purpose, expected preparation and outcome of each initial conversation. State whether it establishes fit, produces advice or starts a separately scoped project. Keep specialist credentials and claims limited to approved facts. Provide a route for someone who cannot confidently choose a category, and decide who reviews that uncertainty. A selection tool should help people describe their need without pretending to make a professional assessment.',
briefs:[['Two introductory calls in Newark','Fictional example: a Newark consultant offers a fit conversation and a paid working session. The page explains the different preparation and deliverables so someone seeking a project quote does not accidentally choose the wrong appointment.'],['An unclear request in Montclair','Fictional example: a Montclair studio receives a request that spans two specialties. A short general inquiry asks about the intended outcome, then a person recommends the appropriate next discussion instead of forcing the visitor to guess.']],
search:'Review whether search landing pages describe the same consultation that their buttons open. Use distinct service names when the purposes are genuinely different. A general introductory page can help uncertain customers without multiplying pages for every phrasing of the same appointment.',
task:['Compare the first conversations','Write the purpose, preparation, result and next stage for each consultation. Mark any promise that requires the specialist’s approval. Add an uncertainty route and identify who handles it.',['Does the first conversation produce advice or establish fit?','What must the customer prepare?','Where can an uncertain visitor ask for direction?'],'A consultation comparison with three specific action labels.','Ask a new reader to choose the appointment for a fictional project quote and explain what they expect to receive.'],
local:[['How should a Newark consultant label a free introduction?','Explain its actual purpose and limits rather than implying a complete consultation. State how a later paid engagement is proposed if that is the process.'],['Is South Orange still a township in the directory?','The current Census roster lists South Orange as a village following its charter change. An older township name can remain a search alias without becoming a second current municipality.']],
faqs:[['Should I hire a designer to clarify consultation choices?','A designer can help when the current structure or booking path obscures meaningful differences. First identify the confusion and approved offer details. If a focused content change solves it, there is no need to assume a full rebuild is the only worthwhile option.','should i hire a web designer','repair'],['What should a consultation website redesign brief include?','Include the appointment types, approved descriptions, preparation requirements, receiving destinations and the process for uncertain inquiries. Identify which existing links customers already use. These decisions let the redesign support the actual service rather than build a calendar around ambiguous labels.','how to redesign a website','brief'],['How does local SEO support a consultant’s services?','It helps connect genuine service information and coverage with relevant searches. Keep specialties and consultation purposes clear, and avoid unsupported claims about qualifications or outcomes. The practical goal is an informed inquiry, not simply traffic to a broadly labeled contact page.','how does local seo work','seo']]
},
];
newJerseyRows.push(
{
  "id": "gloucester",
  "audience": "Businesses considering save-for-later inquiry drafts",
  "title": "Decide what happens to an unfinished saved inquiry",
  "focus": "Saving an inquiry draft creates a promise about what will be available later. Decide whether the draft stays only on the current device or uses an approved account or recovery link, and explain that boundary beside the save action. Set a retention period the business can support and define what the visitor sees after expiry. A draft is not a submitted request, and its existence must not trigger a receipt that implies staff are reviewing it. Consider shared-device use: a later visitor should have a clear way to remove saved information. Save only what the chosen system is meant to retain, and establish how an obsolete offer choice is rechecked when an older draft resumes.",
  "briefs": [
    [
      "A shared-device draft in Woodbury",
      "Fictional example: A Woodbury supplier offers a save-for-later option on a detailed inquiry. The message says that the draft remains on this device and has not been sent. The customer can clear it before leaving a shared computer, and staff receive nothing until the customer deliberately submits the completed request."
    ],
    [
      "An outdated saved choice in Glassboro",
      "Fictional example: A Glassboro studio opens a draft saved before an offer changed. The page preserves the customer’s general description but asks them to review the outdated choice. An expired draft produces a clear restart instruction rather than a blank screen that looks like lost submitted work."
    ]
  ],
  "search": "A saved draft should not become a public search landing page containing customer details. Keep the public offer accessible independently of draft recovery. Search visitors need a normal start path, while returning visitors need an honest explanation of what their saved link or device can recover.",
  "task": [
    "Decide what happens to an unfinished saved inquiry",
    "Choose the supported draft-storage arrangement and write save, resume, expired and clear-draft messages. Mark what is retained, for how long and on which devices. Resume a draft after an offer change and specify which answers need review before submission.",
    [
      "Has anything been sent to staff?",
      "Where and for how long does the draft persist?",
      "Which old choices need rechecking on resume?"
    ],
    "A draft-retention contract and four tested recovery or clearing states.",
    "Save a harmless draft, clear it using the supported control, and confirm that reopening the same device path does not reveal its contents."
  ],
  "local": [
    [
      "What should a Woodbury save button promise?",
      "Describe the actual storage and recovery arrangement, including whether the draft is limited to the current device and remains unsent."
    ],
    [
      "How should a Glassboro visitor resume an old draft?",
      "Keep recoverable work, identify outdated offer choices and require review before sending. Explain expiry honestly when recovery is no longer supported."
    ]
  ],
  "faqs": [
    [
      "What should a redesign brief say about saved inquiries?",
      "Specify storage, expiry, device limits, clearing and the distinction between saving and sending. Include a returning visitor whose earlier offer choice is no longer valid.",
      "how to redesign a website",
      "brief"
    ],
    [
      "What affects the cost of saving inquiry drafts?",
      "Local-device storage, account-based recovery and emailed recovery links require different implementation and handling decisions. Scope the supported arrangement and its acceptance checks before estimating.",
      "how much does it cost to build a website",
      "cost"
    ],
    [
      "Does a saved-inquiry feature help local SEO?",
      "Its main purpose is completing a customer task. Keep useful public service pages separate and avoid making private draft content discoverable; judge the feature by successful resumption rather than search rankings.",
      "how to do local seo",
      "seo"
    ]
  ]
},
{
  "id": "hudson",
  "audience": "Businesses relying on clickable telephone and extension instructions",
  "title": "Check what a telephone link actually asks the device to dial",
  "focus": "A phone number displayed correctly can still have an incorrect call link behind it. Decide which number the customer should dial and how any extension is reached. Separate the readable label from the destination a phone application receives, and keep an alternative for someone using a device without calling support. Do not assume an extension, pause or department choice behaves the same across every phone application. Publish clear manual instructions when the business cannot support an automatic extension sequence. The acceptance task is a dial destination, not a completed sales call: inspect the number safely without placing unnecessary calls. Assign an owner to changes that affect repeated header, footer and service-page telephone links.",
  "briefs": [
    [
      "A stale call destination in Jersey City",
      "Fictional example: A Jersey City studio changes its visible telephone number but leaves the old call destination in the mobile header. The review compares the displayed number, copied text and phone application preview. Correcting all three prevents visitors from being sent to a number that no longer belongs to the intended contact."
    ],
    [
      "An extension fallback in Hoboken",
      "Fictional example: A Hoboken supplier publishes a main line and extension for product inquiries. A test device drops the extension from an automatic dialing sequence. The page keeps the verified main number clickable and gives a readable extension instruction, so customers can complete the routing manually when their device needs it."
    ]
  ],
  "search": "Check telephone links on the pages people actually reach from search, including a service page without a home-page visit. Consistent published contact information matters, but the practical test is whether the action points to the intended number. A correct text result cannot repair a stale call destination.",
  "task": [
    "Check what a telephone link actually asks the device to dial",
    "Inventory one repeated telephone number and its actual link destinations. Compare displayed text, copied number and dial preview on supported devices. Decide how extensions are communicated and how a non-calling device can obtain the number without losing the inquiry path.",
    [
      "Does the link dial the displayed number?",
      "Is the extension handled reliably or explained manually?",
      "Can a desktop visitor copy the number?"
    ],
    "A verified telephone-link record with extension instructions and device-specific acceptance checks.",
    "Activate the link only as far as the dial preview, cancel before calling, and compare the destination with the business-approved number."
  ],
  "local": [
    [
      "How can a Jersey City number look correct but call incorrectly?",
      "The visible text and call destination may be edited separately. Compare both against the approved number."
    ],
    [
      "Should a Hoboken extension be embedded in every call link?",
      "Only when the supported devices handle it reliably. Otherwise provide the verified main number with clear manual extension instructions."
    ]
  ],
  "faqs": [
    [
      "How much time should a redesign allow for telephone-link checks?",
      "Allow for every repeated contact component and the agreed device sample. The task is small when the number is centralized, but scattered links need an inventory and correction check.",
      "how long does it take to redesign a website",
      "brief"
    ],
    [
      "What should I ask a freelance designer about call buttons?",
      "Ask them to demonstrate the dial preview, copyable number and extension fallback. A visual button review alone will not reveal a stale destination.",
      "how to hire a freelance web designer",
      "approach"
    ],
    [
      "Who should control the phone details on my website?",
      "The business should approve the number and retain access to its editable source. At handover, identify where repeated links are maintained and demonstrate a safe update check.",
      "who owns my website",
      "handoff"
    ]
  ]
},
{
id:'hunterdon', audience:'Creative businesses publishing commissioned work', title:'Make a portfolio useful without overstating permission or scope',
focus:'A portfolio should explain what the business contributed and what the visitor can learn from the example. For each project, confirm permission to publish, ownership of photographs and the limits of any result claim. Separate completed client work from concepts, personal experiments and hypothetical demonstrations. Give each example a clear role: showing a process, a material, a design approach or a service outcome. If a name or detail cannot be shared, use an approved description rather than inventing a client story to fill the gap.',
briefs:[['A commissioned piece in Flemington','Fictional example: a Flemington studio has permission to show a finished piece but not its customer’s name. The portfolio describes the approved brief and the studio’s contribution, credits the photograph correctly and leaves private project details out.'],['A concept from Clinton','Fictional example: a Clinton designer publishes an uncommissioned concept to demonstrate an approach. Its label makes that status clear, and the inquiry link asks about a new project rather than implying that the concept proves a client result.']],
search:'Write project titles around the work and the decision it illustrates. Avoid unsupported client names, invented testimonials or geographic claims added only for search. A smaller set of well-explained, approved examples can be more useful than many images with indistinguishable captions.',
task:['Audit permission for three portfolio entries','Select one commissioned project, one concept and one older example. Record publication permission, image rights, your contribution and the claim each entry supports. Decide which details need approval before publication.',['Is the example commissioned or hypothetical?','Who owns or licenses the photograph?','What specific capability does the entry demonstrate?'],'A portfolio permission and purpose register for three entries.','Ask an unfamiliar reader to distinguish the concept from the completed commission without reading a disclaimer elsewhere.'],
local:[['Can a Hunterdon County portfolio omit a customer’s name?','Yes. Use an approved description of the work and contribution. Do not imply endorsement or publish confidential details simply to make the example more specific.'],['Should a Flemington concept appear beside completed work?','It can, if it is labeled clearly where it appears. Visitors should be able to understand its status before drawing conclusions about client experience.']],
faqs:[['How do I choose a web designer for a portfolio?','Ask how they will explain your contribution, distinguish concepts and handle image credits. Review the proposed captions and project structure as well as the gallery appearance. The design should make the evidence easier to evaluate, not inflate what the examples establish.','how to choose a web designer','approach'],['Do I own all of the images used on my website?','Not automatically. Ownership and permission depend on the source and license for each asset. The handoff should identify supplied photographs, licensed material and any usage restrictions. Keep that record with the business’s source files so future edits do not lose the attribution or conditions.','do i own my website','handoff'],['When should a portfolio website be redesigned?','Consider redesign when the current structure cannot distinguish project types or explain your role clearly. If the main problem is missing captions or permissions, address those first. A new visual system does not make an unsupported project claim more credible.','when to redesign your website','repair']]
},
{
id:'mercer', audience:'Advisory businesses explaining qualifications and limits', title:'Connect a qualification to the service it supports',
focus:'Credentials are useful when customers can understand their relevance. Identify the approved qualifications, experience statements or memberships that support each service, and keep any limitations beside the claim. Distinguish a person’s credential from a company-wide authorization. Decide who verifies the wording and what triggers a review when a role, status or service changes. The page should help a buyer evaluate fit without implying that a qualification guarantees a particular outcome or extends to every person associated with the business.',
briefs:[['A specialist introduction in Princeton','Fictional example: a Princeton advisory practice introduces a qualified team member. Its biography explains the role that person performs and the approved credential, while the service page describes what an initial consultation can and cannot determine.'],['A team change in Trenton','Fictional example: a Trenton firm changes the person responsible for an offer. Before publishing a revised biography, it checks service claims, contact routing and reused credentials so the website does not continue attributing the previous person’s qualifications to the new role.']],
search:'Use clear descriptions of the actual expertise and service rather than a long list of impressive terms. Search content should help a buyer assess relevance. Check biography links and service claims together when roles change, particularly if older pages still attract visitors.',
task:['Review the evidence behind one service claim','Choose a service and list the expertise claims that appear on its page. Identify the person or record that verifies each claim, its limitation and its review trigger. Mark anything that should be removed until confirmed.',['Whose qualification is being described?','Which service does it support?','What change would make the wording outdated?'],'A claim-and-evidence sheet with approved wording and review ownership.','Read the page as a new buyer and identify which claims apply to a person rather than the whole organization.'],
local:[['How should a Princeton advisory practice present several credentials?','Connect each approved credential to the person and service it supports. Distinguish personal qualifications from company-wide claims, and identify who checks the wording when roles or status change.'],['How should Princeton be named on a business website?','Use the accurate business address and current municipality name. Princeton is the unified municipality; its borough form of government does not recreate the former separate township and borough.']],
faqs:[['Why hire a designer for an expertise-led website?','A designer can help organize qualifications, service explanations and inquiry choices so they support a buyer’s decision. The business still verifies professional claims. The useful contribution is clarity and an effective customer path, not the creation of credentials or promised results.','why hire a web designer','design'],['What website maintenance should include staff biographies?','Agree which supplied biography and role changes are covered, then check affected service pages and contact links. The business approves credential wording and status. A recurring review can prevent stale claims, but routine care does not independently verify professional registration or qualifications.','what does website maintenance entail','maintenance'],['How can SEO improve a specialist service page?','Explain the actual problem addressed, the relevant expertise and the next review step in language buyers understand. Use accurate service terms and internal links. Do not broaden a claim to capture more searches when the practice cannot support that description.','how to improve local seo results','seo']]
},
{
id:'middlesex', audience:'Suppliers distinguishing quotations from binding orders', title:'Make a quote request visibly different from an order',
focus:'A catalog can support useful inquiries without taking payment or accepting an order. Decide what a quote request records, what the supplier must review and when an actual commitment is created. Keep estimated quantities, requested dates and optional specifications clearly labeled. Explain whether the customer receives an automated receipt or a reviewed response, and avoid calling both a confirmation. If some products can be purchased immediately while others require review, show that difference at the product level rather than hiding it in general terms.',
briefs:[['A quotation in Edison','Fictional example: an Edison supplier accepts a request for a custom quantity. The form summarizes the requested specification and date, then explains that price and feasibility will be reviewed before an order can be accepted.'],['A ready item in New Brunswick','Fictional example: a New Brunswick seller offers a standard item through an existing checkout and a modified version by quotation. The two actions are labeled differently so customers know whether they are buying or starting a discussion.']],
search:'Use product and service descriptions that match the available transaction. A search landing page promising immediate purchase should not lead only to an unexplained inquiry form. Review product-family links and action wording before deciding whether an online store is necessary.',
task:['Label the point of commitment','Trace one standard purchase and one custom quotation. Mark what the customer submits, what the business reviews, when price is agreed and when an order exists. Write different receipt messages for the two paths.',['Is the visitor requesting a price or placing an order?','Who checks the requested date?','Which message confirms an accepted commitment?'],'Two transaction outlines with accurate action and receipt labels.','Submit a permitted quotation test and check that no screen or email calls it an accepted order.'],
local:[['Does a Middlesex County catalog need checkout?','Only when the business is ready to support the ordering process it creates. A clearly explained quotation catalog may better fit custom or reviewed work.'],['Can an Edison quote request include a needed date?','Yes. Label it as a requested date and explain when feasibility is confirmed. Collecting a date does not establish capacity or delivery acceptance.']],
faqs:[['How much does a quotation website cost compared with an online store?','The required workflows determine scope. A catalog with inquiry forms differs from payment, inventory and order-management features. Use the project-cost guide to list the actual functions, provider costs and responsibilities before comparing proposals.','how much does it cost to create a website','cost'],['What should a web designer do with an existing checkout?','They should confirm the supported connection, label the customer action accurately and test the agreed path. Creating, configuring or operating a third-party store may require separate scope. The website proposal should identify where responsibility moves to that provider.','what does a web designer do','design'],['Can local SEO help a quotation-only catalog?','Yes. Accurate product-family information, specifications and quotation instructions can answer buyer questions. Describe the genuine coverage or collection arrangement where relevant. Do not label a product available for immediate purchase just because that wording appears attractive in search research.','what are local seo services','seo']]
},
{
id:'monmouth', audience:'Organizations publishing recurring events with several ticket types', title:'Separate the event series from each dated occurrence',
focus:'A recurring event has information that stays the same and information that changes for each occurrence. Decide where the enduring description lives and where dates, ticket options and exceptions are maintained. Make the selected occurrence visible before a customer follows a ticket link. If a special session changes the usual duration or audience, explain that difference instead of relying on a familiar series title. Plan the expired state as carefully as the current listing so a shared link from last month does not look like a live invitation.',
briefs:[['A series in Asbury Park','Fictional example: an Asbury Park organizer runs monthly sessions with a consistent format. One series page explains the experience, while each current listing identifies its date and exact ticket destination. Past sessions remain clearly marked as past.'],['A special Red Bank occurrence','Fictional example: a Red Bank session uses a different ticket option for a private group. Its listing explains eligibility and inclusions before the provider link, rather than assuming the general admission description covers that arrangement.']],
search:'Keep the series description useful and avoid filling search results with indistinguishable expired listings. Review titles, dates and internal links so visitors can reach the current occurrence. Retain separate event pages only when they contain meaningful details or support a real customer task.',
task:['Divide recurring and dated information','Choose one event series and separate permanent description, occurrence details and ticket-specific conditions. Assign an owner to each. Write the message shown when a dated occurrence has passed.',['Which facts belong to the series?','What changes for this occurrence?','Where does a visitor with an old link go next?'],'An event content map and an expired-listing instruction.','Open a past listing and identify the next current occurrence without confusing the two dates.'],
local:[['Should every Monmouth County event date have a new page?','Only if it needs distinct information or supports a useful booking path. A maintained series page with clear current listings may be sufficient for a simple recurring format.'],['How should Freehold be used in event instructions?','Freehold names a borough and a separate township. Use the actual venue address and approved arrival details rather than expecting the municipality name to identify the destination.']],
faqs:[['How often should an event website be redesigned?','Redesign when the structure no longer supports the event series, dated listings or ticket choices. Frequent date changes alone usually call for a reliable publishing process, not a recurring rebuild. Review the failure in the customer journey before choosing the scale of work.','how often should you redesign your website','repair'],['What maintenance does a recurring event calendar need?','Assign responsibility for approved dates, ticket destinations and expired states. Check the current listing after each change. Routine edits and supported link checks can be scoped, while managing the ticket account or building a new calendar system is a separate responsibility.','what does website maintenance include','maintenance'],['How can local SEO help an event series?','Explain the actual event and its relevant location clearly, then make current dates easy to find. Search visitors should not have to guess whether a listing is past. Location wording cannot replace accurate occurrence details or a working ticket destination.','how to do local seo marketing','seo']]
},
{
id:'morris', audience:'Businesses offering recurring work with optional additional services', title:'Define what a recurring service does and does not renew',
focus:'A recurring service page should explain the included work, its frequency and the process for requesting changes. Distinguish a regular visit or allowance from an unlimited entitlement. Identify what happens when a customer skips a period, adds a location or requests work outside the agreed scope. The business supplies its actual renewal and change rules. Keep those rules understandable before the inquiry, then confirm customer-specific terms in the agreement. A website should reduce uncertainty about the relationship rather than hide important limits in a vague subscription label.',
briefs:[['A regular service in Morristown','Fictional example: a Morristown provider offers scheduled upkeep with a defined checklist. The page explains the included tasks and frequency, while a separate inquiry route lets customers describe unusual work for review rather than assuming it is included.'],['An added location in Madison','Fictional example: a Madison customer wants the same service at another address. The provider records the new location and reviews the arrangement before changing the schedule or fee. The website describes that as a change request.']],
search:'Recurring-service searches can lead to different expectations about frequency and inclusions. Use the actual service name and explain its boundaries plainly. Compare inquiries against the published checklist to find missing explanations before creating more pages for similar package labels.',
task:['Test the edges of a recurring offer','Write the included work and frequency for one offer. Add three exceptions: a skipped period, extra work and another location. Record who reviews each request and when a revised arrangement is confirmed.',['What renews automatically under the agreement?','Which requests need a separate quote?','How is a changed schedule approved?'],'A recurring-service scope sheet and three exception instructions.','Ask a reader whether the example extra task is included, separately reviewed or unavailable.'],
local:[['Should a Morris County service page list every possible exception?','Prioritize the exceptions that commonly change scope or customer expectations. Provide a clear review route for other requests rather than an unreadable catalog of hypothetical cases.'],['Can a Morristown customer change the schedule through a form?','The form can collect a request. Explain whether the business must review capacity and confirm the change before the new schedule applies.']],
faqs:[['What should a website explain about monthly services?','It should state the included work, frequency, exclusions and change process in language a customer can use. Distinguish ongoing service from one-time additions. For a recurring offer, clarity about scope is more useful than a package name alone.','why is web design important','design'],['How should a designer price a recurring-service website?','The project quote should reflect the agreed pages and customer path. A simple inquiry-based offer differs from account management, payments or schedule changes inside a portal. Use the project-cost guide to separate essential explanations from optional application features.','how much does it cost to design a website','cost'],['What maintenance keeps a service package accurate?','The business supplies approved changes to inclusions, frequency and terms. Agreed care work can publish those edits and check affected links. A package change should also trigger a review of comparison tables and reused descriptions so older promises do not remain elsewhere.','how to do website maintenance','maintenance']]
}
);
newJerseyRows.push(
{
id:'ocean', audience:'Rental businesses that must confirm suitability and return arrangements', title:'Explain the complete rental cycle before a request is sent',
focus:'A rental choice involves suitability, availability, collection or delivery, use and return. Choose the facts customers need at each point and make clear which details require the business’s review. Photographs should identify the example shown without promising that exact unit is available. Keep approved restrictions and preparation instructions close to the relevant item. Explain how a requested period is confirmed and what happens if the customer needs to change it. A good rental page helps someone ask a useful question without suggesting that a form submission has allocated equipment.',
briefs:[['An item request in Toms River','Fictional example: a Toms River rental provider asks about intended use and requested dates for an item. The page explains the suitability review and gives a clear distinction between the request receipt and the later availability confirmation.'],['A return change in Lakewood','Fictional example: a Lakewood customer wants to extend a rental. The provider explains how to request the extension and who confirms it, instead of letting an informal message appear to change the agreed return arrangement automatically.']],
search:'Review rental descriptions for the item names, intended uses and questions that determine fit. Accurate collection and return information belongs with the offer. Avoid creating separate location pages that repeat the same rental process without adding useful coverage or arrangement details.',
task:['Trace one rental from choice to return','Record suitability facts, requested dates, confirmation, handover and return for one item. Identify the person who approves a change at each stage. Draft the message for an unconfirmed extension request.',['What must be checked before the item is suitable?','When is availability confirmed?','How does the customer request a later return?'],'A rental journey sheet and a clear extension-request instruction.','Ask a reader to find the return arrangement and explain whether an extension request is already approved.'],
local:[['Can an Ocean County rental page show sample equipment?','Yes, if the image is labeled accurately and the business explains how the supplied item and availability are confirmed. A sample photograph should not silently promise a specific unit.'],['Should Brick customers choose collection or delivery before requesting a rental?','Ask at the point it affects review. Explain any approved differences and confirm the exact arrangement through the business’s actual process.']],
faqs:[['What should a rental website redesign include?','Map the full rental cycle before choosing features. The brief should identify suitability questions, availability review, handover and return instructions. A custom reservation system is not automatically necessary; the right approach depends on how the business confirms equipment and dates.','how to redesign a website','brief'],['How much does a rental website cost?','Cost depends on the agreed catalog, writing and inquiry path, plus any separately scoped booking or payment features. Use the project-cost guide to distinguish a clear request-based website from a live reservation application and its ongoing provider bills.','how much does a website cost','cost'],['What website maintenance matters for rental information?','Check current item descriptions, approved instructions and contact destinations when the business supplies changes. Keep responsibility for live availability and rental agreements explicit. Routine website care does not by itself operate inventory or approve a customer’s extension request.','why is website maintenance important','maintenance']]
},
{
id:'passaic', audience:'Businesses maintaining content in more than one language', title:'Decide who keeps each language version accurate',
focus:'Publishing another language creates an ongoing content responsibility. Identify which pages are translated, who approves the meaning and how changes reach every supported version. Keep essential service limits, prices and contact instructions aligned rather than translating only the home page. Explain what language support is available after an inquiry so a visitor does not assume a level of service the business cannot provide. Plan a clear fallback when a page is not available in the selected language, and test the route without relying on flags to explain the choice.',
briefs:[['A service change in Paterson','Fictional example: a Paterson business updates an offer available in two languages. Its content owner sends the approved change to the translator and tracks both versions through review before removing the old wording from the live site.'],['A partial translation in Clifton','Fictional example: a Clifton provider translates its main service information but not a technical document. The document link identifies the available language, and the business explains how a customer can request clarification without promising an unsupported translation service.']],
search:'Language and location are different choices. Organize translated pages so visitors and search systems can understand their relationship, while keeping service-area facts accurate in each version. Translation should preserve the real offer; it is not a reason to manufacture different claims for different audiences.',
task:['Plan a translated-content change','Choose one service page and list its supported versions, approver and update process. Identify untranslated destinations and the message shown before visiting them. Decide how the team records that every essential version is current.',['Who verifies meaning rather than literal wording?','What happens when the source page changes?','Can the business support the language used for the inquiry?'],'A language coverage sheet and a tracked update workflow.','Change language midway through a service journey and check whether the relevant page and contact expectations remain clear.'],
local:[['Does a Passaic County website need several languages?','Base that decision on the business’s actual customers, content needs and support capacity. County coverage alone does not establish a language requirement or justify an unsupported service promise.'],['Can a Wayne business translate only selected pages?','Yes, if the available coverage is clear and essential next steps do not unexpectedly switch language without explanation. Plan how missing content is communicated.']],
faqs:[['What is SEO localization for a multilingual website?','It adapts content to a supported audience while preserving the actual service and meaning. Language versions need coherent page relationships and accurate local facts. For this exercise, begin with translation ownership and customer support rather than changing place names across duplicate pages.','what is seo localization','seo'],['How should I choose a designer for a multilingual site?','Ask how language selection, untranslated destinations and future edits will work. Confirm who supplies and approves translations. Review a complete customer journey in each supported version; an attractive language switcher cannot compensate for missing service information.','how to choose a web design agency','approach'],['How long does maintenance take when content is translated?','The work depends on the size of the approved change and the translation review process. Agree which versions are included and who provides final wording. Avoid treating a source-language edit as complete while essential translated information remains outdated.','how long does website maintenance take','maintenance']]
},
{
  "id": "salem",
  "audience": "Suppliers proposing partial fulfillment of an order",
  "title": "Obtain a decision before splitting an incomplete order",
  "focus": "When only part of an accepted request can be supplied, the customer needs a choice about the remainder. Decide whether the business offers a partial shipment, waits for the complete order or requests approval for another arrangement. Do not silently turn an unavailable item into a substitute or treat acceptance of one portion as consent to all later charges. Show the item status, the proposed split and what remains unresolved. Explain how the customer responds and who confirms the revised arrangement. Any additional delivery charge or changed timing needs the business’s approved explanation before the customer decides. Keep the original request reference visible so separate parcels or updates are not mistaken for duplicate orders.",
  "briefs": [
    [
      "A split-order proposal in Salem",
      "Fictional example: A Salem supplier can prepare only part of a requested set. Its update lists the ready and outstanding items and asks whether to hold the complete order or consider a split. The customer receives confirmation of the chosen arrangement after staff review, not a generic message implying everything is ready."
    ],
    [
      "A declined substitute in Pennsville",
      "Fictional example: A Pennsville customer agrees to receive the available portion but declines a proposed substitute. The revised summary preserves that distinction and identifies the remaining item as unresolved. Staff do not interpret consent to the first shipment as permission to replace or cancel the outstanding portion."
    ]
  ],
  "search": "Public product pages can explain the business’s general partial-fulfillment process without exposing individual order status. Search visitors should understand that displayed range information is not a promise that every item is ready together. Keep order-specific decisions in the supported customer communication channel.",
  "task": [
    "Obtain a decision before splitting an incomplete order",
    "Create a fictional order with one ready item and one unavailable item. Draft the proposed split, any approved extra-charge explanation and the customer’s choices. Record separate decisions for ready items, outstanding items and substitutions, then write the revised confirmation.",
    [
      "What happens to the unavailable remainder?",
      "Does splitting change an approved charge?",
      "Which decision explicitly authorizes substitution?"
    ],
    "A partial-fulfillment consent record and an item-by-item revised order summary.",
    "Read a reply accepting only the ready portion and confirm that the summary does not authorize a substitute or resolve the remainder by assumption."
  ],
  "local": [
    [
      "May a Salem supplier send the available portion automatically?",
      "Follow its approved terms and the customer’s accepted arrangement. When a new choice is required, obtain and record it before changing fulfillment."
    ],
    [
      "What should a Pennsville partial-order update contain?",
      "Identify ready and outstanding items, the proposed arrangement and the response needed. Keep a substitute decision separate."
    ]
  ],
  "faqs": [
    [
      "How does local SEO relate to partial fulfillment?",
      "Public pages should describe the actual supply arrangement and coverage accurately. Individual availability and split-order consent belong to the operational process, not to unverified search promises.",
      "how does local seo work",
      "areas"
    ],
    [
      "What does a designer do for partial-order communication?",
      "They make item status and customer choices readable, then connect the approved response to the system staff use. The supplier decides fulfillment rules and approves any charge explanation.",
      "what do web designers do",
      "design"
    ],
    [
      "When does partial-order confusion justify a redesign?",
      "Start with the failing update and reply path. A focused summary or message repair may suffice; broader work is warranted when the underlying order system cannot preserve separate item decisions.",
      "when is it time to redesign your website",
      "repair"
    ]
  ]
},
{
  "id": "somerset",
  "audience": "Businesses accepting customer-specific quotations with a validity period",
  "title": "Recheck an expired quotation before accepting it",
  "focus": "A customer returning to an old quotation needs to know whether it can still be accepted. Decide which event ends validity and what a request to proceed does after that point. Preserve the old quotation as an identifiable record, but avoid an active acceptance button that silently treats its terms as current. A refreshed quotation may change availability, scope or price; show those changes before seeking new acceptance. Keep expiry distinct from a payment failure or a lost link. The business must approve the validity rule and the person authorized to reissue terms. Where expiry is checked manually, describe a review request honestly instead of presenting a form as an automatic extension.",
  "briefs": [
    [
      "An expired acceptance link in Somerville",
      "Fictional example: A Somerville studio receives an acceptance through a saved quotation link after its validity period. The destination identifies the expired quotation and offers a refresh request. Staff recheck the assumptions before issuing a current offer, rather than sending a receipt that implies the earlier terms are binding."
    ],
    [
      "Changed terms in Bridgewater",
      "Fictional example: A Bridgewater supplier refreshes a quotation after one component changes. The new summary identifies its own revision and highlights the changed scope before acceptance. The old link remains clearly expired, so a customer cannot mistake the refreshed document for a silent edit to the record they saved."
    ]
  ],
  "search": "Keep public service information distinct from customer-specific quotation validity. A search visitor can learn how quotations are reviewed without seeing private terms. When a redesign changes quotation-link destinations, test a deliberately expired sample as well as a current one; neither should fall into a generic sales page.",
  "task": [
    "Recheck an expired quotation before accepting it",
    "Take a fictional quotation before and after expiry. Define the allowed action in each state, then issue a sample refresh with one changed assumption. Record the old and new identifiers, the change explanation and the new acceptance needed.",
    [
      "Which event ends quotation validity?",
      "Who may reissue the terms?",
      "Can the customer see what changed before accepting?"
    ],
    "An expired-quotation handling rule and a clearly differentiated refresh-and-acceptance record.",
    "Open the expired sample and verify that its action requests review rather than accepting the old terms."
  ],
  "local": [
    [
      "Should a Somerville expired quote disappear?",
      "Retain an appropriate identifiable record through the supported process while making its expired status and refresh route clear."
    ],
    [
      "Can a Bridgewater refreshed quote reuse an acceptance?",
      "Do not assume earlier acceptance covers changed terms. Follow the business-approved process and identify the current revision the customer is accepting."
    ]
  ],
  "faqs": [
    [
      "What affects the cost of a quotation-validity feature?",
      "The scope depends on how quotes are generated, how expiry is checked and where acceptance is recorded. A manual refresh request differs from automated quotation management.",
      "how much does a website cost",
      "cost"
    ],
    [
      "How should I choose a designer for quotation pages?",
      "Ask them to demonstrate expired and refreshed examples with different identifiers. Check that the customer can identify changed assumptions before the acceptance action.",
      "how to choose a web designer",
      "approach"
    ],
    [
      "What does responsive design require for an expired quote?",
      "Keep its status, reference and refresh action readable on a phone. Do not hide the changed terms below an acceptance control or rely on a narrow side-by-side table.",
      "what is responsive web design",
      "design"
    ]
  ]
},
{
id:'sussex', audience:'Operators whose service depends on approved operating conditions', title:'Explain who confirms a condition-dependent activity',
focus:'When an activity depends on conditions, the website needs a clear decision process rather than an unqualified promise. Identify which conditions the operator reviews, when customers receive an update and where the current status is published. Keep a general description separate from a specific go-ahead. Explain what the customer should do if a status is still pending, using only the operator’s approved instructions. Do not let an old social post, booking receipt or cached description become the apparent authority for a changed arrangement.',
briefs:[['A pending activity in Vernon','Fictional example: a Vernon operator reviews conditions before confirming an outdoor session. The page explains when an update is expected and which channel carries the decision, without pretending the website can assess conditions automatically.'],['A changed plan in Sparta','Fictional example: a Sparta customer opens an earlier confirmation after the arrangement changes. The operator’s message points to current instructions and explains the approved next step, rather than leaving conflicting directions in several places.']],
search:'Keep the enduring activity description useful while making current status unmistakable. Search content should not turn a conditional offer into a guaranteed timetable. Review high-traffic older pages and shared links so they lead to the maintained source of current instructions.',
task:['Choose the authority for current status','Write the operator’s decision point, update channel and pending-state instruction for one activity. List every place where status is repeated and identify who keeps it consistent. Draft an approved changed-plan message.',['Who makes the operating decision?','Where does the customer find the current status?','What should they do while a decision is pending?'],'A status communication plan with one maintained authority.','Open an older confirmation and check that a customer can find the current approved instruction.'],
local:[['Should a Sussex County activity page promise that every booking will run?','Only state what the operator can support. Where conditions affect the arrangement, explain the review and communication process before a customer relies on the booking.'],['Can a Newton business use a social feed for current updates?','It can if that is the maintained process, but important instructions should remain accessible and clearly linked. Explain which source is authoritative when older posts differ.']],
faqs:[['What maintenance does a condition-dependent website need?','Define how approved status changes are published and checked across the website and connected destinations. The operator makes the operating decision. Website care can support communication within agreed scope, but it does not monitor conditions or guarantee that every activity can proceed.','what should i know about website maintenance','maintenance'],['How can a redesign preserve useful activity information?','Keep the enduring description and its useful address where practical, while improving the current-status presentation. Record redirects for moved pages and check old links. The redesign should separate stable information from changing instructions rather than discard both together.','how to redesign a website without losing seo','migration'],['Why hire a designer for a simple activity site?','A small site can still have a consequential customer path. A designer can make pending, confirmed and changed instructions understandable and accessible. Decide whether that focused improvement solves the problem before adding a complex booking or notification system.','why hire a web designer','design']]
},
{
  "id": "union",
  "audience": "Businesses offering separate promotional and service email messages",
  "title": "Make an email preference change mean what the customer chose",
  "focus": "A customer who stops promotional email may still need a receipt or an update about work already requested. Decide which message categories the business actually sends and what the preference control changes. Label each supported choice in ordinary language and avoid a reassuring confirmation that the connected sending system does not honor. Keep a preference change separate from canceling an order or closing an account. Define how the selected preference reaches every relevant sender and how staff recognize a failed synchronization. This exercise specifies supported behavior, not legal compliance: the business remains responsible for approving its message categories and handling rules. Use harmless test contacts to confirm the resulting messages instead of relying only on a successful-looking preference page.",
  "briefs": [
    [
      "A promotional preference in Elizabeth",
      "Fictional example: An Elizabeth studio lets a customer stop promotional announcements while retaining updates about an active project. The confirmation names the changed category and explains the remaining service communication. A test checks the sending list as well as the page, so a saved preference is not mistaken for a completed downstream update."
    ],
    [
      "Two sending systems in Westfield",
      "Fictional example: A Westfield supplier uses separate systems for announcements and order receipts. A preference change reaches the announcement system but should not cancel an accepted order. The team verifies both outcomes with a test contact and records a synchronization failure if the old promotional setting persists."
    ]
  ],
  "search": "Keep the public explanation of email choices accessible without exposing individual subscription status. Search visitors can learn what signing up offers, while a personal preference link should lead to the supported change process. Do not turn a customer-specific confirmation into a public landing page with identifying details.",
  "task": [
    "Make an email preference change mean what the customer chose",
    "Choose one promotional category and one actual service-message category. Record the requested preference, the sending systems affected and the evidence that the change took effect. Test a preference update and a failed synchronization without changing an order or account status.",
    [
      "Which message category did the customer change?",
      "Which sending systems must receive the update?",
      "Does the confirmation reflect verified behavior?"
    ],
    "A message-category preference contract and a verified sender-synchronization test record.",
    "Use a test contact to stop the selected promotional category, then verify the actual sender setting and confirm that unrelated order status remains unchanged."
  ],
  "local": [
    [
      "Does an Elizabeth promotional opt-out cancel an active project?",
      "Treat those as separate actions. Explain the supported message change and keep project status governed by its own process."
    ],
    [
      "What should a Westfield preference test inspect?",
      "Check the actual sending-system setting and its synchronization result, not only the confirmation shown on the website."
    ]
  ],
  "faqs": [
    [
      "Could moving preference pages explain a traffic drop after redesign?",
      "Check public URL and indexing changes separately from personal preference endpoints. A drop in visits to customer-specific links is not enough to diagnose a loss of useful search traffic.",
      "why did my website traffic drop after redesign",
      "migration"
    ],
    [
      "What affects the cost of email preference work in a redesign?",
      "The message categories, connected senders and synchronization requirements determine scope. Define which setting changes and how it is verified before estimating the integration.",
      "how much does a website redesign cost",
      "cost"
    ],
    [
      "Who should control the accounts behind website email preferences?",
      "The business should retain appropriate ownership and access to the sending services. Handover should identify the preference connection, its authorized maintainers and the test used after changes.",
      "who owns my website",
      "handoff"
    ]
  ]
},
{
id:'warren', audience:'Businesses receiving inquiries that may include technical files', title:'Let a customer start an inquiry without an unsuitable upload',
focus:'An attachment field can create expectations about file size, accepted formats and confidentiality before the business has decided how to handle them. Identify the information needed for initial review and what can wait until a person responds. If files are necessary, agree on the supported process and explain its limits before asking for them. Provide a useful alternative for customers who cannot upload. A successful inquiry should not depend on attaching a document that is too large, unavailable or inappropriate to send through the public form.',
briefs:[['A drawing inquiry in Phillipsburg','Fictional example: a Phillipsburg workshop first asks for the intended use, approximate size and requested outcome. It requests detailed drawings later through an agreed process, rather than inviting every visitor to upload confidential project material immediately.'],['A mobile inquiry in Hackettstown','Fictional example: a Hackettstown customer has a file stored on another device. The form accepts a useful description and explains how the team will request the file later, so the customer does not have to abandon the inquiry.']],
search:'Capability pages can explain what the business needs to assess a request without publishing every technical detail. Review whether the landing page prepares the customer for the inquiry it opens. A complicated upload workflow should follow a demonstrated need, not be added merely to make the site appear advanced.',
task:['Separate the first inquiry from later files','Choose one technical service and divide information into initial-review essentials and later supporting material. Specify accepted file handling only where agreed. Draft the alternative route for someone without an attachment.',['Which facts allow an initial response without a file?','When is detailed material requested?','What happens if an upload fails?'],'A minimal inquiry brief and a documented later-file process.','Send a permitted test inquiry without an attachment and check that the receiving person can still take the intended next step.'],
local:[['Should a Warren County quote form require a drawing?','Only when the business needs it at that stage and has a supported way to receive it. Otherwise ask for the essential description and explain the later file request.'],['Can a Washington inquiry be routed by municipality name alone?','Washington names both a borough and a township in Warren County. Request a more precise location when it affects the work, while avoiding unnecessary address collection at the first step.']],
faqs:[['What should I ask a designer about file uploads?','Ask which file types, limits and receiving process are included, and how failures are explained. Confirm whether a simpler initial inquiry would work. The proposal should treat custom file handling as a specific feature with defined responsibilities, not an assumed form accessory.','how to choose a web design agency','approach'],['What does responsive design mean for a technical inquiry?','The form should remain understandable and usable on a phone, including when a file is not available on that device. Keep instructions beside the relevant field and provide a supported alternative. A desktop-sized upload control is not a complete mobile solution.','what is responsive web design','design'],['How much does a website with document handling cost?','The cost depends on the agreed file workflow, storage or provider requirements and review process. Start with the actual business need and consult the project-cost guide. A simple inquiry followed by an agreed file request can have a different scope from a document portal.','how much does it cost to develop a website','cost']]
}
);
