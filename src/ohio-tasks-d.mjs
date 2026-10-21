// Every scenario is illustrative. These exercises produce an owner-approved planning brief.
export const ohioTasksD = {
  portage: {
    name: 'Portage', title: 'Compare workshop levels before offering a booking choice.',
    scenario: 'A Ravenna workshop offers two levels, and visitors are unsure which one matches their experience.',
    decision: 'Choose one activity from each level and describe the starting skill it requires. Add the equipment supplied, anything the participant brings and the route for a question about suitability or access. Compare these facts with the labels on the booking page. If a visitor cannot choose from observable requirements, revise the explanation before adding more dates. The owner approves the requirements and identifies who answers uncertain cases.',
    questions: ['What should a participant already be able to do?', 'Which materials or equipment are actually included?', 'Who resolves a suitability question before confirmation?'],
    output: 'A two-level comparison, an approved preparation note and a clear question route.',
    check: 'Give someone the page and a fictional skill history; ask them to select a level or identify exactly how to ask for advice.'
  },
  preble: {
    name: 'Preble', title: 'Follow one service choice into the outside scheduler.',
    scenario: 'A Eaton business uses an outside booking provider, but its website buttons all open a general calendar.',
    decision: 'Select one service and record the expected appointment name, location and next action. Open the link on a phone and compare the provider page with those expectations. Mark every choice the visitor must repeat. If the provider supports a reliable direct link, assess that setup; otherwise write a short instruction beside the button. Record who controls the outside account and who confirms the appointment. Stop a test before creating a real booking unless a test has been arranged.',
    questions: ['Does the chosen service survive the transition?', 'Which location does the provider display?', 'What message actually confirms the appointment?'],
    output: 'A checked booking path with clear button wording and a named account owner.',
    check: 'Ask a new reader to reach the intended service and location without verbal guidance, then explain which confirmation they should expect.'
  },
  putnam: {
    name: 'Putnam', title: 'Write the delivery and collection paths side by side.',
    scenario: 'A Ottawa business offers collection and reviewed delivery, but explains both through one general contact form.',
    decision: 'Choose a representative request and write two paths for receiving it. For each, identify the relevant address, requested timing, acceptance step and approved charge explanation. Keep collection opening hours separate from an agreed collection time. Mark any delivery rule that still needs the owner’s decision. Compare the form and receipt against each path so neither option inherits the other’s instructions. Publish the accepted differences beside the choice itself.',
    questions: ['Which destination matters for each option?', 'What timing is requested and what timing is confirmed?', 'Who accepts the final fulfillment arrangement?'],
    output: 'A concise comparison and separate, accurate confirmation wording for both options.',
    check: 'Have someone choose delivery, then collection, and explain where to go or wait and what still requires confirmation in each case.'
  },
  richland: {
    name: 'Richland', title: 'Trace one customer download from purpose to next action.',
    scenario: 'A Mansfield provider has several versions of a preparation document linked from different pages.',
    decision: 'Pick the document customers currently need and record its owner, revision date, file address and purpose. Find every website link that introduces it. Compare the page instructions with the document’s contact details and next step. Decide what an old saved link should show when the document is replaced. Essential service information should remain readable on the page. Get the owner’s approval before retiring or replacing instructions people may still rely on.',
    questions: ['Which version is approved for current use?', 'What should the reader do after opening it?', 'How will an old link direct readers appropriately?'],
    output: 'A document record, a clear download label and an agreed replacement plan.',
    check: 'Open the current link and a known old link, then verify that neither presents superseded instructions as the current process.'
  },
  ross: {
    name: 'Ross', title: 'Decide whether a new offer needs its own page.',
    scenario: 'A Chillicothe business adds an option and is considering a separate service page.',
    decision: 'Compare the existing and new offers across audience, outcome, preparation, evidence and inquiry. Write the new visitor decision in one sentence. If the distinction is only a selectable variant, sketch a section within the existing page. If the offer requires an independent explanation or action, outline that page and its link from the original service. Ask the owner to approve the difference and identify any operating facts still missing before writing begins.',
    questions: ['What different decision does the new offer create?', 'Which information cannot be explained clearly on the existing page?', 'Where should someone enter the new inquiry path?'],
    output: 'A justified page-or-section choice, an outline and an approved next step.',
    check: 'Ask a reader to choose between the two offers and explain the difference without relying only on their names.'
  },
  sandusky: {
    name: 'Sandusky', title: 'Separate the county service area from the visit destination.',
    scenario: 'A Fremont business uses Sandusky as shorthand in several places on a county coverage page.',
    decision: 'List each location reference on the page, contact card and directions link. Mark it as county coverage, an actual location or another contextual reference. Replace ambiguous shorthand with the approved full place name. Sandusky city is in Erie County; Sandusky County has Fremont as its seat. For a destination such as Bellevue that crosses county lines, record whether an address review is needed. Confirm the location shown after the visitor opens any map or booking link.',
    questions: ['Does this reference mean the city or the county?', 'Where must the customer actually travel?', 'Does eligibility require checking the street address?'],
    output: 'A consistent location vocabulary and a verified visit path.',
    check: 'Ask someone unfamiliar with the area to identify the service boundary and the actual meeting destination from the page alone.'
  },
  scioto: {
    name: 'Scioto', title: 'Turn several reviewers’ comments into one approved instruction.',
    scenario: 'A Portsmouth organization has three contributors who describe its inquiry process differently.',
    decision: 'Name the factual owner for each disputed topic and the person authorized to approve the website. Put the competing statements beside one another and resolve them before editing. Record the agreed answer, its approver and the version being reviewed. Create a single feedback list that separates factual corrections from new requests. Set a review date the contributors can meet and identify unresolved decisions explicitly; silence is not a usable instruction to publish.',
    questions: ['Who can confirm each operating fact?', 'Who resolves conflicts and returns the final list?', 'Which requests change the agreed page or feature scope?'],
    output: 'An approval map, a resolved service explanation and one consolidated feedback list.',
    check: 'Give the list to someone outside the discussion and verify that they can implement each instruction without choosing between contradictory comments.'
  },
  seneca: {
    name: 'Seneca', title: 'Label a demonstration with the evidence it actually provides.',
    scenario: 'A Tiffin provider wants to publish sample work before it has permission to show completed customer projects.',
    decision: 'Choose one sample and record whether it is fictional, self-initiated or commissioned. Write that status beside the item. Explain the problem explored, one design decision and what a visitor can inspect directly. Remove invented client associations, testimonials and performance claims. Check permission for every included asset. If the example uses a local setting, label the setting as fictional.',
    questions: ['What is the true status of this example?', 'Which quality can a visitor inspect for themselves?', 'Which claims would need evidence the sample does not supply?'],
    output: 'An honestly labeled portfolio item with a useful explanatory caption.',
    check: 'Ask a reader who commissioned the example and what result it proves; revise the wording if their answer overstates either fact.'
  },
  shelby: {
    name: 'Shelby', title: 'Separate a repeat request from an accepted new order.',
    scenario: 'A Sidney supplier receives “same as last time” inquiries through a standard website form.',
    decision: 'Choose a prior-job reference staff can safely use and list the details that may change: specification, quantity, destination and timing. Ask only for ordinary information needed to begin review. Write a receipt that confirms the inquiry arrived and identifies what still requires agreement. Map the later acceptance step for current price and availability. If the business needs authenticated ordering or live account data, record that as a separate capability to assess.',
    questions: ['Which reference identifies the earlier specification?', 'What must be checked again for this request?', 'Who confirms the new order and its current terms?'],
    output: 'A repeat-inquiry brief and a confirmation that does not imply an automatic reorder.',
    check: 'Submit an authorized test with a changed quantity and verify that both the visitor and recipient can identify the change and the pending acceptance.'
  },
  stark: {
    name: 'Stark', title: 'Turn one approved project into a useful service example.',
    scenario: 'A Canton home-service provider has several permitted photos but no explanatory project captions.',
    decision: 'Choose one project and gather its starting condition, agreed scope and the decision the images help explain. Confirm publication permission and whether a location can be named. Write a caption that distinguishes visible evidence from claims requiring further proof. Group multiple photographs of that job together and link the example to its relevant service. Remove unnecessary identifying details. Do not turn a county coverage list into a list of supposed project locations.',
    questions: ['What customer decision does this example help explain?', 'Which facts and image permissions are confirmed?', 'What result can the photographs actually substantiate?'],
    output: 'One coherent project example with your business details, useful captions and a service link.',
    check: 'Ask a reader to identify the work performed, the example’s limits and the appropriate next inquiry without relying on the image alone.'
  },
  summit: {
    name: 'Summit', title: 'Record one observable obstacle in a service inquiry path.',
    scenario: 'A Akron business suspects its service page is difficult to use but has not identified the specific obstacle.',
    decision: 'Choose a visitor task and start at the relevant entry page. Follow the offer to its inquiry on a phone and with a keyboard, using an authorized test where submission is needed. Record the exact step that becomes unclear or fails, with the visible result. Separate that observation from a theory about lost sales. Propose one contained change and name the same task as its acceptance check. Add analytics context only when available and appropriate.',
    questions: ['What is the visitor trying to accomplish?', 'Which observable step blocks or confuses the task?', 'What result would demonstrate that the proposed change works?'],
    output: 'A reproducible issue, a scoped improvement and a clear acceptance task.',
    check: 'Repeat the original journey after the change and compare the result with the recorded obstacle, without claiming a sales increase from the check alone.'
  },
  trumbull: {
    name: 'Trumbull', title: 'Route a request by its purpose rather than a department code.',
    scenario: 'A Warren business lists internal team names that prospective customers do not recognize.',
    decision: 'Write the main reasons people contact the business in ordinary customer language. Match each reason to an approved recipient and explain any reference needed. Add a general route for uncertain requests and name the person who reviews it. Decide whether the page will link to separate supported channels or needs a separately scoped form setup. Test every receiving destination rather than assuming a selector sends information to the right team.',
    questions: ['What does the customer need to accomplish?', 'Who receives and handles that type of request?', 'Where does an unmatched or uncertain request go?'],
    output: 'A purpose-based contact outline with verified recipients and a general inquiry path.',
    check: 'Give someone three fictional requests, including one ambiguous case, and ask them to select a suitable route without knowing the organization chart.'
  },
  tuscarawas: {
    name: 'Tuscarawas', title: 'Coordinate a business name change across customer entry points.',
    scenario: 'A New Philadelphia business is adopting a new name while customers still use old website links.',
    decision: 'Inventory visible identity, important page addresses, contact details and customer documents. For each item, record the approved replacement and the person responsible. Draft a factual transition note only if the old-to-new relationship is confirmed. Preserve useful page addresses or map moved pages to relevant destinations. Keep domain, email and outside listing tasks separate so their ownership is clear. Identify any history or continuity claim that needs an owner’s decision before publication.',
    questions: ['What has changed and what continuity can be stated accurately?', 'Which old links must still help returning customers?', 'Who controls each outside account affected by the new name?'],
    output: 'An identity checklist, approved transition wording and a useful old-link map.',
    check: 'Open a saved old service address and a current contact page; confirm that both make the new identity and next action understandable.'
  },
  union: {
    name: 'Union', title: 'Approve a service-area rule before adding new locations.',
    scenario: 'A Marysville business wants to announce wider coverage for one of its services.',
    decision: 'Define the service being expanded and write the boundary in a form staff can apply to an inquiry. Record any address review, travel condition or exception process. Distinguish that rule from the coverage of other offers. Check existing pages and forms for contradictory statements. For Dublin or Plain City, do not infer county from the municipality alone because both cross county boundaries. Publish only the confirmed arrangement and assign responsibility for later changes.',
    questions: ['Which service is included in the expansion?', 'What exact rule determines whether a destination qualifies?', 'Who reviews uncertain addresses and confirms acceptance?'],
    output: 'An approved coverage statement with a clear address-review path.',
    check: 'Ask staff to apply the written rule to one accepted, one excluded and one uncertain fictional destination, and resolve any inconsistent answers.'
  },
  'van-wert': {
    name: 'Van Wert', title: 'Divide consultation preparation into now, later and unnecessary.',
    scenario: 'A Van Wert consultant’s inquiry form asks for a complete brief before anyone has discussed the problem.',
    decision: 'List the information currently requested and mark each item as essential for initial fit, useful later or unnecessary. Keep the first request focused on ordinary context and allow an unknown answer where appropriate. Write a short guide to what the customer can gather for the consultation. Identify material that needs a different transfer method and explain when the business will request it. Make the receipt distinguish a consultation request from a confirmed appointment.',
    questions: ['What information is truly needed to review initial fit?', 'What can be clarified during the conversation?', 'Which material should stay out of a general public form?'],
    output: 'A smaller intake brief and a practical preparation note.',
    check: 'Ask someone with an incomplete project idea to attempt the form; verify that they can ask for help without inventing answers or sharing inappropriate material.'
  },
  vinton: {
    name: 'Vinton', title: 'Give every proposed page a distinct customer purpose.',
    scenario: 'A McArthur business is planning its first website and has a list of pages based mainly on nearby place names.',
    decision: 'Write the core offer, accepted work, real coverage, useful evidence and next step. Group related information into a readable outline. Give each proposed page a one-sentence purpose and remove page divisions that only repeat the same explanation under another municipality. Keep genuine conditions and unanswered questions visible even when the site is small. Identify a future change that would justify another service page, so the structure can grow when there is something new to explain.',
    questions: ['Which question does each page answer?', 'Can related information share one clear explanation?', 'What important fact would be lost if this page were removed?'],
    output: 'A compact page map with approved coverage and a complete inquiry path.',
    check: 'Ask a first-time reader to identify fit, coverage and the next action from the outline without needing a separate page for every village.'
  },
  warren: {
    name: 'Warren', title: 'Identify the responsible organization at every partner handoff.',
    scenario: 'A Lebanon business refers part of a customer’s request to an independent provider.',
    decision: 'Draw the service as a short sequence and write the responsible organization beside each stage. Confirm the actual relationship and permission to name the partner. Mark where the visitor leaves the website, who accepts the next request and who supplies the final terms or date. Remove wording that suggests shared availability, pricing or support unless that arrangement is verified. Distinguish a simple referral link from any integration that would need separate assessment.',
    questions: ['Who performs each part of the service?', 'What does the customer do at the handoff?', 'Which organization confirms the final arrangement?'],
    output: 'An approved responsibility sequence and accurate external-link wording.',
    check: 'Ask a reader who they would contact about each stage and whether submitting the first form confirms the partner’s work; correct any false inference.'
  },
  washington: {
    name: 'Washington', title: 'Separate remote contact from eligibility at the work address.',
    scenario: 'A Marietta provider offers an online first conversation before reviewing a physical service destination.',
    decision: 'List each service stage and label it remote, at the customer’s address or at another location. Record the confirmed geographic conditions for the stages that require them. Identify who reviews uncertain or cross-border requests and how the website explains that review. Ask the responsible owner to approve any state-specific wording. Do not expand coverage simply because an online form accepts requests from elsewhere or the proposed destination is nearby.',
    questions: ['Where does each stage actually happen?', 'Which location facts affect acceptance of the work?', 'Who confirms an uncertain destination before it is promised?'],
    output: 'A stage-by-stage coverage explanation and a clearly limited initial inquiry.',
    check: 'Give a reader a fictional out-of-area request and ask them to identify which conversation is available and which later work still requires review.'
  },
  wayne: {
    name: 'Wayne', title: 'Write the approval point for a custom order.',
    scenario: 'A Wooster provider receives new requests after customers believe they have approved a final specification.',
    decision: 'Choose one review stage and state what the customer receives, what they should check and who returns the consolidated response. Identify the version and the action that approval permits. Separate a correction to agreed work from a changed specification or added option. Publish the actual included review rounds after owner approval, and explain how later scope and timing are agreed. Avoid a promise of unlimited changes or an assumption that silence settles an outstanding decision.',
    questions: ['What exactly is the customer approving at this stage?', 'Who returns one resolved list of feedback?', 'How is a later request assessed before work continues?'],
    output: 'A clear review instruction, approval record and change-request explanation.',
    check: 'Present one correction and one new-scope request to a reader and ask them to identify the appropriate next step for each.'
  },
  williams: {
    name: 'Williams', title: 'Assign responsibility for each appointment prerequisite.',
    scenario: 'A Bryan provider brings its equipment but needs the customer to prepare several things before the visit.',
    decision: 'Create separate lists for provider-supplied items and customer preparation. For each prerequisite, record who verifies it and when. Identify conditions a customer cannot reasonably assess and give them a question or professional-review route. Compare the lists with the booking page and confirmation wording. Explain what happens if readiness is uncertain or an essential condition is missing, using the business’s approved process rather than a newly invented cancellation rule.',
    questions: ['What does the provider definitely supply?', 'What must the customer prepare or confirm?', 'Which unresolved condition prevents final appointment acceptance?'],
    output: 'An owner-approved preparation checklist and a clear readiness check.',
    check: 'Ask a reader to prepare for a fictional appointment and name every item they supply, every item provided and every uncertainty they must raise.'
  },
  wood: {
    name: 'Wood', title: 'Create a direct request route and an optional process explanation.',
    scenario: 'A Bowling Green provider serves both first-time buyers and familiar customers seeking the same service.',
    decision: 'Write the shortest responsible path to the inquiry, including conditions everyone needs to see. Then outline an optional explanation of the service stages and preparation for a newcomer. Keep the main action visible from that explanation. Identify any changed term a returning customer might miss and place it near the direct route. Both paths should arrive at the same accurate description of what submission confirms.',
    questions: ['What does a familiar customer need immediately?', 'Which process questions does a first-time buyer need answered?', 'What current condition must both audiences see?'],
    output: 'A page outline with a visible direct action and useful optional guidance.',
    check: 'Give one reader a first-purchase scenario and another a repeat request; verify that each can find the right action and explain what happens afterward.'
  },
  wyandot: {
    name: 'Wyandot', title: 'Rehearse the first ordinary update during website handoff.',
    scenario: 'A Upper Sandusky business needs a new staff member to keep service and contact information current after launch.',
    decision: 'Choose a likely text update and identify its approved source, editor, checking step and publishing method. List the domain, hosting and connected services separately from the website files, with an owner and renewal responsibility for each. Record the instructions and licenses needed to run the site, plus known limits or unfinished items. Arrange account access securely; do not put passwords in the handoff checklist. Confirm who will handle later updates before assuming the business can publish them itself.',
    questions: ['Where is the current editable content?', 'Who controls each account needed to operate the site?', 'How is an approved change checked and published?'],
    output: 'A usable handoff inventory and a documented update path.',
    check: 'Have the intended maintainer locate the source of a service detail and explain the full publishing path without relying on the original developer’s memory.'
  }
};
