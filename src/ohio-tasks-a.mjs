// Illustrative planning exercises; business facts and operating rules require owner approval.
export const ohioTasksA = {
  adams: {
    name: 'Adams', title: 'Follow a repair report through its first response',
    scenario: 'Imagine an Adams County repair business whose form says “book a repair” even though staff must review the symptom before accepting work.',
    decision: 'Choose one accepted item type. Write the minimum useful symptom report, the receipt message and the next staff action. Mark the later points where assessment, price and repair approval occur. Ask the owner to approve each label and any stated response expectation. Keep a drop-off address separate from a general description of the service area.',
    questions: ['What can the customer observe without diagnosing the fault?', 'Which message acknowledges receipt, and which accepts work?', 'What does the customer need to know before bringing in the item?'],
    output: 'One repair-intake sequence with approved form labels, receipt wording and a named next action.',
    check: 'On a phone, describe a sample fault and read the receipt preview. Confirm that neither screen implies an accepted repair or appointment.'
  },
  allen: {
    name: 'Allen', title: 'Define the minimum useful capability inquiry',
    scenario: 'Consider a Lima supplier receiving drawings without the material, quantity or intended use needed for an initial capability review.',
    decision: 'Choose one approved capability and list what the business can state publicly about it. Separate established limits from conditions that require individual assessment. Draft a short inquiry with only the facts needed to route the request, then describe how detailed specifications are exchanged. Have a technical approver check every capability and tolerance claim before the page is designed.',
    questions: ['Which material or process claims are approved for publication?', 'What information makes an initial review possible?', 'Who confirms feasibility, schedule and quotation after that review?'],
    output: 'An approved capability summary and a concise first-contact specification brief.',
    check: 'Give the draft to someone unfamiliar with the business and ask them to identify what can be assessed now and what remains unconfirmed.'
  },
  ashland: {
    name: 'Ashland', title: 'Explain the course from the first session onward',
    scenario: 'Imagine an Ashland County instructor receiving a late-entry inquiry for a course whose third session depends on work completed in the first two.',
    decision: 'Write the full session sequence and identify the knowledge each stage assumes. Place the instructor’s approved late-entry rule beside the schedule. Separate the lasting course description from current intake dates and status. Choose the next action for someone who cannot join now, and assign a person to maintain it when the intake changes.',
    questions: ['What earlier material does a later session assume?', 'How does the instructor decide whether late entry is suitable?', 'Where can someone find the next genuine starting opportunity?'],
    output: 'A complete course sequence, an approved late-entry explanation and a current-intake update rule.',
    check: 'Open the page as if arriving before session three. Find the suitability guidance and next action without starting registration.'
  },
  ashtabula: {
    name: 'Ashtabula', title: 'Reconcile one seasonal visit’s operating details',
    scenario: 'Consider a Ashtabula County operator whose service page, seasonal announcement and booking destination show different visit information.',
    decision: 'Choose one visit and record its normal dates, approved exception process and actual arrival point. Mark where each fact appears and who supplies updates. Decide where the current status is authoritative and how other pages lead to it. Write the visitor’s next step when conditions change without promising automatic alerts that the business does not provide.',
    questions: ['Which dates describe the season and which describe an exception?', 'Who decides whether the visit proceeds?', 'Do the page and confirmation route use the same arrival point?'],
    output: 'One approved visit record with a list of conflicting details and responsible update owners.',
    check: 'Follow a direct link from an old announcement and find current dates, change instructions and the correct destination on a phone.'
  },
  athens: {
    name: 'Athens', title: 'Compare one-time help with a recurring arrangement',
    scenario: 'Imagine an Athens County provider offering a single session and ongoing help, while both website buttons lead to a form labeled “subscribe.”',
    decision: 'Write a side-by-side comparison using purpose, included work, frequency, preparation and approval. Identify what the first inquiry starts and where a recurring agreement is separately accepted. Give each option a suitable action label while retaining one shared explanation where the service is the same. Have the owner verify the terms before publishing the comparison.',
    questions: ['Can the first service stand alone?', 'What changes when the customer chooses recurring help?', 'Which explicit step confirms an ongoing arrangement?'],
    output: 'An approved option comparison with distinct inquiry labels and clear agreement points.',
    check: 'Ask a reader to request just one task. Check that the page and receipt do not imply enrollment in later sessions.'
  },
  auglaize: {
    name: 'Auglaize', title: 'Separate a photo review from a physical assessment',
    scenario: 'Consider a Auglaize County restoration business whose gallery makes initial photographs look sufficient for a final quotation.',
    decision: 'Choose an authorized project example and describe what was visible initially, what required inspection and what work was approved. Identify the limits of an initial review and the next arrangement needed to resolve them. Write captions that explain those stages without predicting the same outcome for a new item. Assess any proposed upload feature separately from an ordinary inquiry.',
    questions: ['What can the first photographs actually establish?', 'Which unknowns require an in-person inspection?', 'What does the customer approve after receiving the assessment?'],
    output: 'A staged example and an accurate explanation of the initial review’s limits.',
    check: 'Show only the first image and its caption to a reader. Ask whether they understand that final scope and price may still require inspection.'
  },
  belmont: {
    name: 'Belmont', title: 'Apply the coverage rule to the correct address',
    scenario: 'Imagine a Belmont County mobile provider receiving a customer’s billing address when the requested work would happen at a different property.',
    decision: 'Choose one service and write its approved coverage rule. Identify the location facts needed to apply that rule and label the inquiry field accordingly. Add the process for a boundary exception, including who reviews it and when the customer receives a decision. Check that a requested date remains separate from appointment confirmation until the location is accepted.',
    questions: ['Which address determines whether this service is available?', 'What happens when the location falls outside the normal boundary?', 'When are travel terms and the appointment confirmed?'],
    output: 'A service-specific coverage explanation and a request form that collects the relevant location.',
    check: 'Try a sample inquiry with different billing and service addresses. Confirm that the business receives the location where the work is requested.'
  },
  brown: {
    name: 'Brown', title: 'Trace a sample into an approved order',
    scenario: 'Consider a Brown County maker whose gallery presents options for discussion but uses the same action label as a finished item for sale.',
    decision: 'Choose one product family. Identify the sample’s role, the choices requiring discussion and the point where specification, price and fulfillment are approved. Write an action for each stage and clarify whether the first contact is an inquiry or purchase. Confirm who updates examples when an option is no longer offered and how collection readiness is communicated.',
    questions: ['Does the image show an available item or a sample?', 'Which choices must be settled before the order is accepted?', 'What confirms the final specification and fulfillment arrangement?'],
    output: 'A sample-to-order sequence with approved labels, decision points and fulfillment wording.',
    check: 'Ask someone to explain what they would receive after clicking the sample’s button. Their answer should match the business’s actual next step.'
  },
  butler: {
    name: 'Butler', title: 'Route two audiences without duplicating the offer',
    scenario: 'Imagine a Butler County service business whose homeowner and facilities inquiries share a long form containing fields irrelevant to one audience.',
    decision: 'List the service facts both audiences need, then identify the questions unique to each. Keep the shared offer authoritative and create distinct entry labels or concise inquiry routes where appropriate. Define the receiving destination and minimum useful context for each route. Use Hamilton, Ohio and Butler County accurately wherever location affects the inquiry.',
    questions: ['Which facts are genuinely shared by both audiences?', 'What makes a household request different from a facilities brief?', 'Can an uncertain visitor reach an appropriate first conversation?'],
    output: 'A shared service outline with two clear audience routes and their required inquiry information.',
    check: 'Walk through one homeowner request and one multi-site request. Check that neither requires irrelevant information or reaches an unexplained contact destination.'
  },
  carroll: {
    name: 'Carroll', title: 'Organize equipment inquiries around observable symptoms',
    scenario: 'Consider a Carroll County equipment service whose contact form requires a fault code that many customers cannot identify.',
    decision: 'Gather a few approved examples of how customers describe problems. Group them in plain language and connect them to supported equipment types. Decide which identifier or history is necessary at first contact and what qualified staff determines later. Write the next review step and remove any suggestion that choosing a symptom confirms its technical cause.',
    questions: ['What can the customer describe accurately without testing the equipment?', 'Which item details are needed to route the request?', 'How does the next contact establish the assessment arrangement?'],
    output: 'A symptom-led service outline and a short inquiry with approved information requirements.',
    check: 'Use a simple description such as “stops after starting.” Confirm that the customer can continue without guessing a failed component or performing an unapproved test.'
  },
  champaign: {
    name: 'Champaign', title: 'Put workshop suitability before registration',
    scenario: 'Imagine a Champaign County instructor whose registration destination reveals an experience requirement that is missing from the workshop page.',
    decision: 'Write one workshop summary containing its intended level, approved age or participation requirements, supplied materials and items to bring. Put those facts before the action and identify whether the route requests a place or confirms one. Compare the page with the ready registration destination and assign an owner for changing dates or enrollment status.',
    questions: ['What must a participant confirm before joining?', 'Which materials are supplied and which must they bring?', 'Which message actually confirms their place?'],
    output: 'An approved workshop summary and a consistent registration path.',
    check: 'Open the page on a phone as a new participant. Find suitability, preparation and the confirmation rule before leaving for registration.'
  },
  clark: {
    name: 'Clark', title: 'Compare inspection, repair and replacement by output',
    scenario: 'Consider a Springfield provider whose three service labels make it difficult to tell whether an assessment includes any subsequent work.',
    decision: 'Create a comparison with purpose, included work, customer preparation, output and next approval. Ask the owner to verify each entry and any stated charges. Identify an assessment route for customers who cannot choose a technical option themselves. Keep the initial inquiry, recommended work and customer approval separate throughout the page and receipt wording.',
    questions: ['What does each service deliver before another decision is needed?', 'Which option can an uncertain customer reasonably request?', 'Where does the customer approve additional work?'],
    output: 'A verified three-service comparison with an appropriate action for each stage.',
    check: 'Give a reader the inspection description alone. Ask whether they can identify its output without assuming a repair or replacement is included.'
  },
  clermont: {
    name: 'Clermont', title: 'Turn a preferred visit into an honest request',
    scenario: 'Imagine a Clermont County provider whose receipt repeats the customer’s preferred date under the heading “your appointment.”',
    decision: 'Choose one visit type and separate its purpose, destination and preferred time into clear questions. Describe who reviews those details and which later message accepts an appointment. Rewrite the action and receipt to match that process. Confirm that the receiving person gets the relevant location and visit purpose together, with a response expectation approved by the business.',
    questions: ['What will this visit actually assess or accomplish?', 'Is the destination the work site or only a contact address?', 'How will the customer recognize an accepted appointment?'],
    output: 'A consistent visit-request path from page description to acknowledgment and staff review.',
    check: 'Preview a sample request for a particular afternoon. Confirm that no screen presents the preference as an accepted visit time.'
  },
  clinton: {
    name: 'Clinton', title: 'Prepare a useful group-training brief',
    scenario: 'Consider a Wilmington trainer who receives requests for “a team session” without knowing the group’s experience or desired outcome.',
    decision: 'Choose one training subject. Draft a brief that asks for the audience, approximate size, current experience, intended outcome and preferred format. Explain how the trainer reviews that information before discussing a proposal. Keep a desired date separate from availability and show what customization, if any, needs its own agreed scope.',
    questions: ['What should participants be able to practice after the session?', 'How does their current experience affect the starting point?', 'Which format and preparation arrangements require confirmation?'],
    output: 'A concise organizer brief and an approved explanation of the next proposal stage.',
    check: 'Ask a colleague to complete the brief for a sample group. Check that a trainer could assess fit without first asking what “training” means.'
  },
  columbiana: {
    name: 'Columbiana', title: 'Start a trade inquiry without collecting confidential files',
    scenario: 'Imagine a Columbiana County supplier whose first contact form asks every buyer to upload a complete specification before anyone reviews fit.',
    decision: 'Choose one capability and define the nonconfidential summary needed to start a conversation. Identify what staff can assess from it and when detailed documents become necessary. Write the next exchange step without claiming an ordinary form provides a secure portal. Review public examples for permission and keep restricted customer information out of the page draft.',
    questions: ['What summary is enough to identify the relevant capability?', 'Who decides which detailed documents are needed next?', 'Which published examples have permission for their names, images and specifications?'],
    output: 'A bounded first-contact brief and an explicit handoff to any later document process.',
    check: 'Complete the draft using only a general requirement and contact details. Confirm that the buyer can inquire without disclosing a confidential drawing.'
  },
  coshocton: {
    name: 'Coshocton', title: 'Confirm collection suitability before the handover',
    scenario: 'Consider a Coshocton County provider receiving collection requests that omit the item size and who will be present at handover.',
    decision: 'List the item and location facts required to assess collection. Separate the requested window from an accepted slot, then describe when preparation and handover instructions are agreed. Identify the responsible contact if the requester will not be present. Have the operator approve any unattended-handover wording and remove it if the service does not support that arrangement.',
    questions: ['What facts establish whether the item can be collected?', 'Which message confirms the collection slot?', 'Who receives and follows the final handover instructions?'],
    output: 'An approved collection-request sequence with suitability, scheduling and handover clearly separated.',
    check: 'Follow a sample request made by someone who will be absent. Find the step where the actual handover contact and instructions are confirmed.'
  },
  crawford: {
    name: 'Crawford', title: 'Explain how a repair-or-replace recommendation is formed',
    scenario: 'Imagine a Crawford County business whose service page asks whether the customer wants repair or replacement before an item has been inspected.',
    decision: 'Describe the inspection’s scope and the useful information a customer can supply beforehand. Allow unknown history to remain unknown. Record how findings are communicated and which options require another quotation or approval. Ask the business to verify assessment charges and limits so the page supports a decision without predicting the technical recommendation.',
    questions: ['What evidence does the business need before recommending an option?', 'Which facts can the customer supply reliably?', 'How does the customer review findings and approve the next step?'],
    output: 'A clear assessment explanation with a practical preparation list and recommendation process.',
    check: 'Read the page as someone unsure whether an item is worth repairing. Confirm that an assessment can be requested without committing to either outcome.'
  },
  cuyahoga: {
    name: 'Cuyahoga', title: 'Separate shared offers from real location differences',
    scenario: 'Consider a Cuyahoga County business with two real locations whose copied service pages now disagree about available work and contact details.',
    decision: 'Choose one shared offer and name its main service page. For each real location, record services, access, hours, appointment rules and inquiry destination. Remove unsupported office claims and identify the person responsible for each changing fact. Link location-specific instructions to the shared offer instead of maintaining several competing descriptions of the same work.',
    questions: ['Which offer facts should stay identical across locations?', 'What differences affect a customer’s choice or visit?', 'Does each contact action reach the appropriate team with enough context?'],
    output: 'A shared-offer record and a verified location comparison with update owners.',
    check: 'Arrive directly on each location page and find the available service, visiting instructions and correct contact route without returning to the home page.'
  },
  darke: {
    name: 'Darke', title: 'Define the promise behind a seasonal waiting list',
    scenario: 'Imagine a Darke County provider collecting next-season requests while the website receipt implies that every submission has secured a project slot.',
    decision: 'Write what the list actually records and how the owner reviews requests. Identify the project details that affect suitability, the status communicated after submission and the next contact point. Keep desired timing separate from confirmed availability. Decide what happens to old seasonal pages and who closes the inquiry when the business is no longer maintaining a list.',
    questions: ['Does joining record interest, reserve a place or do something else?', 'What information is reviewed before a project is accepted?', 'When and how does the customer hear the next decision?'],
    output: 'An accurate waiting-list explanation, receipt and rule for closed seasonal pages.',
    check: 'Read the confirmation as a customer needing a firm date. Verify that it clearly identifies what remains undecided.'
  },
  defiance: {
    name: 'Defiance', title: 'Assess an item and its delivery destination together',
    scenario: 'Consider a Defiance County supplier whose website promises delivery before staff know the item dimensions or the destination’s access arrangements.',
    decision: 'Choose one item group and record the approved delivery limits. Identify the item, destination and access facts needed for review, then write when timing and charges are confirmed. Label a requested date as a preference where appropriate. Keep the delivery address distinct from billing details and assign a person to approve the final arrangement.',
    questions: ['Which item characteristics affect whether delivery is possible?', 'What destination information is needed before confirming the route?', 'Which message accepts the delivery terms and date?'],
    output: 'A realistic delivery inquiry with approved constraints and a clear confirmation stage.',
    check: 'Try a sample with different billing and delivery addresses. Confirm that the item details and intended destination reach the reviewer together.'
  },
  delaware: {
    name: 'Delaware', title: 'Add a service without losing the core customer path',
    scenario: 'Imagine a Delaware County business adding an assessment offer while older pages still say every customer begins directly with the main service.',
    decision: 'Define who the new offer suits and how it changes the first decision. Choose a separate page or a comparison section based on the information needed. Inventory the navigation, summaries, inquiry options and guides affected by the change. Name an approver for new claims and check that existing customers can still reach the core service easily.',
    questions: ['What distinct decision does the new offer help someone make?', 'Which old descriptions become inaccurate when it launches?', 'Can a returning visitor still find the original service promptly?'],
    output: 'A new-service brief and a specific list of related content and links to update.',
    check: 'Start once as a new customer and once as a returning customer. Find the relevant service and correct inquiry without interpreting contradictory instructions.'
  },
  erie: {
    name: 'Erie', title: 'Follow a reservation into its external destination',
    scenario: 'Consider a Erie County operator whose website describes one offer while its booking button opens a general reservation list.',
    decision: 'Choose one offer and record the date choices, party details, inclusions and ready provider destination. Identify what the visitor must select again after leaving the site. Check approved limits before the button and explain who confirms the booking. Record which parts of the external account the operator maintains and which website connection is included in the agreed work.',
    questions: ['Does the button open the intended offer or a broader selection?', 'Which date and party details must be entered again?', 'What evidence confirms a reservation rather than an outbound click?'],
    output: 'A checked reservation handoff with accurate action wording and account responsibilities.',
    check: 'On a phone, follow the offer into the provider without purchasing. Confirm that the visitor can identify the intended reservation and its current requirements.'
  }
};
