// Practical planning exercises. Every scenario is illustrative, not completed client work.
export const pennsylvaniaTasksD = {
  pike: {
    name: 'Pike', title: 'Mark the travel requirement at each service stage.',
    scenario: 'A Milford provider starts with an online conversation, then arranges a visit only when the project needs one.',
    decision: 'Write the path from first inquiry to delivery. Mark each stage as remote, a customer visit or a provider visit. For each required visit, name the condition that triggers it and the information needed to arrange it. Use the correct Milford Borough or Township destination when that becomes relevant. Compare the path with the website: attendance requirements should appear before a customer makes the corresponding request.',
    questions: ['Which stage can be completed without travel?', 'What makes an in-person stage necessary?', 'Who confirms its destination and date?'],
    output: 'A service-stage outline, an approved attendance explanation and a receipt that distinguishes a request from a confirmed visit.',
    check: 'Ask someone unfamiliar with the offer to identify every required trip and explain when each one is agreed, using only the page.'
  },
  potter: {
    name: 'Potter', title: 'Turn a thin service description into a factual writing brief.',
    scenario: 'A Coudersport business has a short website that names its services but leaves most customer questions unanswered.',
    decision: 'Select one service and list what a new customer needs to decide whether to inquire. Mark each fact as approved, awaiting confirmation or unavailable. Gather a permitted real example if one exists, recording the actual work and publication permission. Decide whether the missing answers fit on the current page or justify a distinct page. Do not enlarge the site simply to fill a navigation menu.',
    questions: ['Which accepted work and exclusions are still unclear?', 'What does the business actually do after an inquiry?', 'Who can approve the facts and any example?'],
    output: 'A concise content brief with your business details, unresolved questions and one justified page decision.',
    check: 'Give the revised explanation to a new reader and ask them to describe a suitable request without needing the owner to explain the offer verbally.'
  },
  schuylkill: {
    name: 'Schuylkill', title: 'Identify the facts that change a Pottsville estimate.',
    scenario: 'A Pottsville provider cannot quote responsibly until the scope, condition and selected options are understood.',
    decision: 'Choose a representative service and list the actual price inputs. Separate details a customer can supply immediately from facts the business must assess. Draft a short explanation of why each essential input matters, then remove fields that do not affect the first decision. If the destination affects travel, confirm the specific address at the relevant stage; an Ashland label alone does not establish the county.',
    questions: ['Which three inputs most often change this estimate?', 'Which information can reasonably be unknown at first?', 'At what point is a price actually accepted?'],
    output: 'An owner-approved pricing explanation, a focused request checklist and a confirmation message that promises review.',
    check: 'Submit a sample request with one unknown detail and confirm that the path still works without displaying a misleading fixed price.'
  },
  snyder: {
    name: 'Snyder', title: 'Separate a shop visit from a demonstration request.',
    scenario: 'A Selinsgrove retailer welcomes ordinary browsing but arranges demonstrations around the equipment and staff required.',
    decision: 'Write two short paths: visiting the shop and requesting a demonstration. Give each its own approved hours or confirmation conditions, destination and preparation. Identify any item whose display status differs from availability for purchase. Follow the current website buttons and booking links to check that neither path silently promises the other. Keep an uncertain date as a preference until the business accepts it.',
    questions: ['What can a visitor do during ordinary opening hours?', 'Which facts are needed to arrange the demonstration?', 'What confirms that the requested session can proceed?'],
    output: 'Two clear actions with their supporting instructions and a checked destination for each.',
    check: 'Ask a reader to find browsing hours, then request a demonstration; they should be able to explain the different commitments made by those actions.'
  },
  somerset: {
    name: 'Somerset', title: 'Give a seasonal service a useful year-round page.',
    scenario: 'A Berlin property-service business receives inquiries before, during and after the period when a particular task is offered.',
    decision: 'Separate the permanent service explanation from current availability. Write the approved message for open, paused and future-inquiry states, including a suitable next step for each. Assign responsibility for changing the notice and checking any repeated versions. Keep the ordinary contact route available where appropriate. If a Seven Springs destination affects the work, confirm the address instead of assuming that the community identifies one county.',
    questions: ['Which facts remain useful throughout the year?', 'What exactly changes when the service closes to new requests?', 'Who approves and publishes the next status change?'],
    output: 'A stable service description, three agreed status messages and a named update owner.',
    check: 'Read the page as an out-of-season visitor and confirm that you can tell whether to inquire, wait or use another contact route without assuming a booking exists.'
  },
  sullivan: {
    name: 'Sullivan', title: 'Prepare a dated notice and a reliable contact fallback.',
    scenario: 'A Dushore operator sometimes changes opening hours and needs a simple process that can be maintained by a small team.',
    decision: 'Write a sample temporary-hours notice with explicit affected dates and a clear statement of what changes. List the pages where hours appear and name the person who approves the update. Add a review or removal task. Check that the fallback contact is usable and that any reply expectation reflects actual capacity. An automatic expiry or synchronized listing update should be named separately if required.',
    questions: ['What are the ordinary hours and the dated exception?', 'How can someone confirm a visit when availability is uncertain?', 'Who removes or replaces the notice?'],
    output: 'An approved notice pattern, a list of affected pages and a practical update responsibility.',
    check: 'Ask a reader to determine whether the notice applies to a specific date and how they would confirm a visit before travelling.'
  },
  susquehanna: {
    name: 'Susquehanna', title: 'Write coverage rules that support an uncertain border inquiry.',
    scenario: 'A Montrose provider accepts work in an approved territory and reviews some requests from beyond it individually.',
    decision: 'Create separate notes for regularly accepted locations, case-by-case locations and work the business does not accept. Link those notes to the relevant services. Identify the minimum location detail needed for the first review, such as community and state, and the point when the full address is needed. Have the owner approve any cross-state statement and operating limits before publication. Keep service territory distinct from location.',
    questions: ['Which destinations are genuinely accepted for this service?', 'What determines whether an exception can be considered?', 'What does the customer receive before acceptance is confirmed?'],
    output: 'An accurate coverage explanation and a short location-review inquiry with an honest receipt.',
    check: 'Try a sample request from an uncertain destination and confirm that the website invites review without promising availability or inventing another office.'
  },
  tioga: {
    name: 'Tioga', title: 'Test a first visit and a repeat request on the same site.',
    scenario: 'A Wellsboro business needs to help both a first-time visitor planning collection and a customer returning for further service.',
    decision: 'Write the information required for each task and circle the facts they share. Keep those shared details consistent while giving each task a direct route. Use practical labels rather than assuming that every resident is a repeat customer or every visitor is new. Include Pennsylvania in the location context. Check when a readiness notice, reference or confirmed arrangement is required.',
    questions: ['What must someone know before a first visit?', 'Which information can a returning customer provide by reference?', 'Where are shared hours and destination details maintained?'],
    output: 'Two concise customer paths connected to one approved source of shared service information.',
    check: 'Ask one reader to plan a first collection and another to request repeat work; neither should need to navigate through instructions meant only for the other task.'
  },
  union: {
    name: 'Union', title: 'Define the appointment before connecting a calendar.',
    scenario: 'A Lewisburg professional business offers an initial conversation and a more substantial working session with different preparation.',
    decision: 'Describe the purpose, format, required preparation and deliverable for each appointment. Include owner-approved fees and scope limits where applicable. Decide whether a customer can book directly or must submit a request for review. Keep confidential documents out of an ordinary introduction form and agree any necessary exchange separately. Compare the finished explanation with the booking destination so its duration and confirmation match the actual offer.',
    questions: ['What does the customer receive from this session?', 'What must be ready before it can proceed?', 'Does selecting a date reserve time or request review?'],
    output: 'An appointment comparison and a checked request or booking route for each offer.',
    check: 'Have a reader choose the suitable session and describe its outcome, preparation and commitment before opening the calendar.'
  },
  venango: {
    name: 'Venango', title: 'Select a small set of project examples that can be substantiated.',
    scenario: 'A Oil City business has years of images but little information about permission, scope or which examples represent its current work.',
    decision: 'Review a manageable shortlist. For each example, record publication permission, date, actual business role, relevant service and any claim that needs evidence. Select examples that explain different useful decisions. Label demonstrations separately and leave unapproved work unpublished. Draft a caption that distinguishes the business’s contribution from other work visible in the photograph. Record existing URLs before reorganizing an online archive.',
    questions: ['What may the business publish about this project?', 'Which part of the work did it actually perform?', 'What does this example help a prospective customer decide?'],
    output: 'An approved portfolio shortlist with factual captions, service links and unresolved permissions clearly identified.',
    check: 'Ask a reader to describe the provider’s contribution to each example; the answer should be supported by the caption, not inferred from the photograph.'
  },
  warren: {
    name: 'Warren', title: 'Route collection, repair and new work to the right instructions.',
    scenario: 'A Warren shop handles ready items, repair assessments and new project inquiries through one service desk.',
    decision: 'List the information and next step for each of the three tasks. Decide whether one reason field can serve the receiving team or whether materially different questions justify separate forms. Keep collection readiness distinct from ordinary shop hours. Give existing customers a route to ask about earlier work without creating another estimate request. Confirm all publishing and form changes against the agreed technical scope.',
    questions: ['What proves an item is ready to collect?', 'What does the repair assessment require?', 'What information starts a genuinely new project?'],
    output: 'Three task descriptions, appropriate contact choices and clear receipt wording.',
    check: 'Try one sample journey for each task and verify that a collection customer can find instructions, a repair customer can request assessment and a new customer can describe the project.'
  },
  washington: {
    name: 'Washington', title: 'Clarify Pennsylvania context without crowding out the service.',
    scenario: 'A Washington business has pages that repeat the place name but leave its state, actual location and service details unclear.',
    decision: 'Review the title, introduction, contact details and coverage section together. Establish Washington County, Pennsylvania where needed, then use the remaining content to explain the offer, limits and inquiry process. Distinguish places served from physical locations. Check any McDonald destination against the exact address when county boundaries matter. Remove repeated locality wording that contributes no useful information, while retaining accurate context for a first-time reader.',
    questions: ['Can a new reader identify the correct state immediately?', 'Which address is a real location rather than an area served?', 'What service decision does each section help the customer make?'],
    output: 'A clearer title and introduction, consistent business details and a useful coverage explanation.',
    check: 'Show a reader the search title and landing page; they should identify the Pennsylvania business, describe its offer and find the appropriate next step.'
  },
  wayne: {
    name: 'Wayne', title: 'Match each workshop status to an honest next step.',
    scenario: 'A Honesdale workshop organizer has confirmed sessions, possible future dates and occasional requests for private groups.',
    decision: 'Sort every current listing into confirmed and open, confirmed but closed, ended or still proposed. Agree the information and action appropriate to each state. Keep a stable explanation of the workshop linked to current dates, and create a separate inquiry route for custom sessions. Check that external registration links identify the intended session. Assign responsibility for changing status when a date closes or passes.',
    questions: ['Which dates and venues have actually been confirmed?', 'What action is appropriate when registration is closed?', 'How does a custom group request reach the organizer?'],
    output: 'A reviewed schedule, clear status wording and checked links to current registration or inquiry destinations.',
    check: 'Open a current, a closed and a proposed session as a visitor; each should make its status clear before any booking action appears.'
  },
  westmoreland: {
    name: 'Westmoreland', title: 'Put job fit before a long locality list.',
    scenario: 'A Greensburg provider serves several communities, but the work accepted and delivery conditions differ between services.',
    decision: 'Make a short comparison of service categories, essential job criteria and approved coverage. Put the conditions beside the service they affect. Give uncertain destinations a clear review route. Then examine the locality navigation: retain entries that help people check coverage and justify any separate page with genuinely different information. Avoid implying location in Latrobe or New Kensington merely because those places are served.',
    questions: ['Which service is the customer actually requesting?', 'What makes that work suitable for the business?', 'Which coverage condition applies to that service?'],
    output: 'A service-and-coverage comparison with an agreed inquiry path and a justified locality page list.',
    check: 'Ask a reader with a sample job to identify the service, check the relevant coverage and explain what still requires confirmation without reading every locality entry.'
  },
  wyoming: {
    name: 'Wyoming', title: 'Define what starts the project clock.',
    scenario: 'A Tunkhannock specialist receives deadline requests before specifications and required materials have been confirmed.',
    decision: 'Map the steps from inquiry through acceptance, preparation and production. Identify the event that establishes the start and list the inputs that must be ready. Separate waiting for an available start from the duration of the work. Draft a plain explanation of how changed scope is reviewed and when timing is confirmed again. Use the actual borough or township destination when travel or delivery affects the plan.',
    questions: ['What must be approved or supplied before work starts?', 'Which duration is an estimate and which date is agreed?', 'How is the effect of a later change confirmed?'],
    output: 'An owner-approved timeline explanation with dependencies and a clear route for change requests.',
    check: 'Give a reader a proposed deadline and one missing input; they should understand why the request does not yet establish a promised completion date.'
  },
  york: {
    name: 'York', title: 'Give each proposed page a purpose and an owner.',
    scenario: 'A York service business wants more pages while its team is still deciding who approves new offer details and handles inquiries.',
    decision: 'List the proposed pages and assign each a distinct customer question, required facts, factual approver, inquiry recipient and update owner. Compare the list with existing content and combine overlapping ideas. Select the first page that has a real purpose and ready inputs. Confirm whether a different receiving path needs additional form or routing work before publishing. Keep York City and York Township destinations precise where they matter.',
    questions: ['Which unanswered customer decision justifies this page?', 'Who approves the facts and keeps them current?', 'Who receives and acts on the resulting inquiry?'],
    output: 'A prioritized content plan with named responsibilities and one ready-to-publish service brief.',
    check: 'Trace a sample inquiry from the proposed page to its responsible person and confirm that the team can explain the offer, accept the request and maintain the page.'
  }
};
