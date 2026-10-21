// Each exercise is a planning aid, not a claim about a local business or customer.
export const pennsylvaniaTasksA = {
  adams: {
    name: 'Adams', title: 'Trace one departure from description to arrival',
    scenario: 'Imagine an Adams County operator with two timed experiences and an external reservation service. The descriptions look similar, but the meeting instructions and included items differ.',
    decision: 'Choose one departure. Write its date or selection rule, arrival time, duration, meeting address, inclusions and booking destination on a single sheet. Mark which details the operator must approve and where each is maintained. Decide how the website handles a customer who has not yet chosen a date.',
    questions: ['What must the customer know before choosing this departure?', 'Does the booking destination preserve the selected option?', 'Who approves a change to the meeting point or timetable?'],
    output: 'One approved departure summary and a list of mismatches between the website, booking destination and confirmation instructions.',
    check: 'On a phone, choose the departure and find its meeting instructions without returning to the home page.'
  },
  allegheny: {
    name: 'Allegheny', title: 'Match every service to how customers receive it',
    scenario: 'Consider an Allegheny County specialist offering location appointments, online consultations and selected visits. A single contact page currently makes all three look interchangeable.',
    decision: 'List the actual services and mark each as location, remote or on-site. Add the facts needed to choose: address, supported format, preparation or coverage review. Where a service supports two arrangements, explain the difference and identify the correct contact or booking destination. Confirm the wording with the business before describing any location as an office.',
    questions: ['Which services require the customer to travel?', 'What location detail is needed to review an on-site visit?', 'Where does the customer choose the delivery format?'],
    output: 'A service-and-delivery table with location wording and one next step for each arrangement.',
    check: 'Ask someone to arrange an online consultation from the page and explain whether they must visit a Pittsburgh address.'
  },
  armstrong: {
    name: 'Armstrong', title: 'Prepare a useful first component inquiry',
    scenario: 'Imagine an Armstrong County supplier receiving made-to-order requests that include long descriptions but omit the quantity or intended use needed for an initial review.',
    decision: 'Choose one component family and separate public capability facts from information needed for a quote. Draft a short inquiry using only the details that change the first feasibility decision. Identify any later specifications and how they will be requested. Have the responsible technical person approve the public capability language and examples.',
    questions: ['Which specification changes whether the work can be considered?', 'What can wait until the supplier confirms initial fit?', 'Does the receipt explain that price and timing need review?'],
    output: 'One approved capability outline, a minimal inquiry field list and a follow-up specification checklist.',
    check: 'Submit a permitted test inquiry and verify that the receiving person can identify the requested component, quantity and next review step.'
  },
  beaver: {
    name: 'Beaver', title: 'Split the showroom visit from the assessment request',
    scenario: 'Imagine a Beaver County showroom displaying product examples and offering a separate assessment service. Customers cannot tell whether they should browse, bring an item or make an appointment.',
    decision: 'Write the two visitor paths side by side. For browsing, identify what is displayed, opening information and how availability is confirmed. For assessment, identify accepted items, required preparation and how a time is agreed. Review photographs and labels so examples do not imply current stock. Confirm the precise destination used by each path.',
    questions: ['Can someone browse without an appointment?', 'Which details must accompany an assessment request?', 'Who confirms the availability of a displayed product?'],
    output: 'Two short visitor instructions, with a distinct action label and maintained destination for each.',
    check: 'Starting from one product image, find both the stock-check route and the assessment instructions without guessing what “contact us” means.'
  },
  bedford: {
    name: 'Bedford', title: 'Plan the day a seasonal package expires',
    scenario: 'Consider a Bedford County package promoted through a lasting web link. Its dates and inclusions change, while old messages continue sending visitors to the same offer.',
    decision: 'Separate the enduring service description from dates, inclusions and booking deadlines. Name an approver and review point for each changing detail. Draft the closed state now, including the genuine next option. Decide which content remains useful after the season and whether any replacement is close enough to justify a redirect.',
    questions: ['Which facts become inaccurate after the closing date?', 'What should a visitor using an old link be offered?', 'Who supplies and approves the next season’s details?'],
    output: 'An open-and-closed page outline with a review date, responsible person and current alternative.',
    check: 'Read the proposed expired version as a new visitor and identify whether any wording still promises a bookable package.'
  },
  berks: {
    name: 'Berks', title: 'Label a representative slice of the catalog',
    scenario: 'Imagine a Berks County supplier whose gallery mixes stocked items, completed projects and configurable products. Each currently uses the same inquiry button and availability wording.',
    decision: 'Select one example of each status and write the facts a buyer needs: item identity, relevant specifications, status and next action. Identify who can confirm stock or quotation requirements. Apply the labels consistently to the sample before expanding across the catalog. Keep previous-project permissions and any unsupported availability claim on the review list.',
    questions: ['Which image shows an available item and which shows an example?', 'What choice changes the information needed for a quote?', 'Who keeps the displayed availability statement current?'],
    output: 'A small approved listing pattern for stocked, example and quotation-only items, with a suitable action for each.',
    check: 'Ask a reader to choose one product and explain whether they can buy it now or must request confirmation.'
  },
  blair: {
    name: 'Blair', title: 'Write the customer action at each repair stage',
    scenario: 'Imagine a Blair County specialist whose assessment page does not explain when an estimate is issued or when the customer authorizes repair work.',
    decision: 'Map inquiry, inspection, proposed work, approval and collection. For each stage, record what the customer supplies, what the business confirms and the message that moves the job forward. Use only approved charges and timing rules. Keep new assessment inquiries separate from questions about existing jobs, and identify the appropriate contact destination for each.',
    questions: ['What does submitting the initial form actually authorize?', 'How does the customer approve the proposed work?', 'Which details are needed to ask about an existing job?'],
    output: 'A five-stage process explanation and two clearly labelled contact routes, ready for factual review.',
    check: 'Read only the initial form and receipt; confirm that they do not imply an inspection, repair approval or completion date has already been agreed.'
  },
  bradford: {
    name: 'Bradford', title: 'Choose the minimum details needed for a visit review',
    scenario: 'Consider a Bradford County service that plans its route after reviewing jobs. Its current form requests extensive personal detail but treats a preferred date like a confirmed booking.',
    decision: 'For each field, state the decision it supports. Keep the service type, useful job description, necessary location detail and reply route. Decide when a complete address becomes necessary. Label date preferences accurately and write the receipt around the actual coverage and scheduling review. Remove questions that do not help the first decision.',
    questions: ['Can the first coverage review use a community or postal area?', 'What makes a requested visit date confirmed?', 'Which information can be collected during follow-up instead?'],
    output: 'A justified first-inquiry field list and a receipt that explains the next scheduling step.',
    check: 'Complete the form with permitted sample details and verify that the result describes a request awaiting review, not a booked visit.'
  },
  bucks: {
    name: 'Bucks', title: 'Compare one private lesson with one group workshop',
    scenario: 'Imagine a Bucks County instructor offering the same subject privately and in a group. Prospective participants need to choose a format before they can select a date.',
    decision: 'Compare duration, intended level, preparation, supplied materials and booking unit. Identify whether the customer reserves one place, a whole group or a proposed appointment. Have the instructor approve requirements and any stated outcomes. Give each format a clear route and a useful option for someone who needs help choosing.',
    questions: ['Which difference should determine the customer’s format choice?', 'What preparation must be visible before registration?', 'Does the destination sell a place or request a private date?'],
    output: 'A concise format comparison, approved preparation notes and precise labels for both booking actions.',
    check: 'Ask a first-time visitor to select the appropriate introductory option and find its preparation and location without opening an unrelated calendar.'
  },
  butler: {
    name: 'Butler', title: 'Turn a vague coverage line into an acceptance rule',
    scenario: 'Imagine a Butler County provider advertising “Butler and nearby areas” while offering remote planning and on-site work with different coverage arrangements.',
    decision: 'Choose one service and write the rule the team actually uses to consider a location. Include any job information needed before accepting a visit. Check whether Butler City, Butler Township or another municipality must be distinguished at that stage. Add a route for uncertain addresses and keep exceptions subject to the real review process.',
    questions: ['What work does this coverage statement apply to?', 'Which location detail changes the acceptance decision?', 'What should someone outside the named area do next?'],
    output: 'One approved coverage paragraph and the minimum inquiry fields needed to apply it.',
    check: 'Give the page to someone with a hypothetical Cranberry Township request and ask them to explain how they would confirm coverage.'
  },
  cambria: {
    name: 'Cambria', title: 'Protect five useful old links during a redesign',
    scenario: 'Imagine a Cambria County business reorganizing an established website. Customers still use service links from emails, printed material and saved instructions.',
    decision: 'Select five important existing addresses and record their purpose, approved content and proposed destination. Mark each as retained, revised in place, moved or retired. For a move, identify the genuinely relevant replacement and agree redirect scope. Note any missing evidence or access instead of assuming every old link has been discovered.',
    questions: ['Which content still answers a real customer question?', 'Does the proposed menu label make that destination clearer?', 'Which shared links must be checked after launch?'],
    output: 'A small migration inventory connecting old addresses, content decisions and agreed launch checks.',
    check: 'Open each of the five old links in the reviewed version and confirm that its visitor can reach an accurate service explanation and current next step.'
  },
  cameron: {
    name: 'Cameron', title: 'Check the essential task before the extras load',
    scenario: 'Imagine a Cameron County small-business website whose first screen relies on a large gallery and an outside map. A visitor only needs the accepted service and contact details.',
    decision: 'Choose one essential task and list the text and controls it requires. Put those facts in the page itself, with a clear reading order and descriptive action labels. Identify what remains usable if the map, gallery or external booking tool is slow. Check that customers can still read your phone number and services if an image or map loads slowly.',
    questions: ['Can the visitor understand the service without the gallery?', 'Is the written destination available without the map?', 'What useful route remains if the booking tool fails to load?'],
    output: 'An essential-content outline and a short list of mobile or loading problems to address.',
    check: 'Using a narrow screen and a deliberately slower test connection, find the service, address and inquiry action before opening any optional media.'
  },
  carbon: {
    name: 'Carbon', title: 'Define what a group reservation actually confirms',
    scenario: 'Imagine a Carbon County operator accepting private group requests alongside bookings for scheduled sessions. Both currently use a button labelled “Book now.”',
    decision: 'Write the commitment made by each route: one place, several places or an exclusive session. Record the approved group limits and the details needed for review. Decide exactly when the date is accepted and what the customer receives as confirmation. Revise the action and receipt wording to match that process.',
    questions: ['Is the visitor reserving places or requesting a private date?', 'Which group detail affects whether the request can be accepted?', 'What event makes the reservation confirmed?'],
    output: 'Two distinct booking descriptions with required details, accurate action labels and confirmation wording.',
    check: 'Follow the private-group route with permitted test information and verify that no screen promises an accepted date before the actual review or reservation step.'
  },
  centre: {
    name: 'Centre', title: 'Write the open, full and closed class states',
    scenario: 'Imagine a Centre County provider whose class description stays useful across several intakes, while dates and enrollment status change during the year.',
    decision: 'Choose one class and separate lasting content from session facts. Draft the visitor message and next action for open, full and closed enrollment. Identify who supplies each status change and where it is published. Only include a waiting list or future-date inquiry when the team has agreed how to handle it.',
    questions: ['Which page is responsible for the current session status?', 'What does joining any waiting list actually mean?', 'Where should a visitor go after enrollment closes?'],
    output: 'A three-state session outline and an update responsibility list for dates, requirements and registration links.',
    check: 'Enter the closed session through its direct link and confirm that its status and genuine alternative are clear without returning to the course list.'
  },
  chester: {
    name: 'Chester', title: 'Design a first proposal inquiry around fit',
    scenario: 'Imagine a Chester County professional service receiving lengthy proposals through a public form, including documents that are unnecessary for the first conversation.',
    decision: 'Identify the few facts that determine initial fit: intended outcome, broad scope, timing and relevant constraints. Draft plain prompts for those facts and a note explaining what to leave out. Define who reviews the inquiry and the next conversation or assessment step. Reserve confidential documents for an appropriate later process.',
    questions: ['What must the reviewer know before agreeing an initial conversation?', 'Which details should never be requested in this ordinary form?', 'Does the receipt distinguish review from accepting an engagement?'],
    output: 'A short proposal-inquiry outline, clear submission guidance and an accurate review message.',
    check: 'Use a hypothetical non-sensitive project and verify that a visitor can explain the need without attaching documents or disclosing confidential client information.'
  },
  clarion: {
    name: 'Clarion', title: 'Prepare the first trade inquiry before discussing terms',
    scenario: 'Imagine a Clarion County supplier whose wholesale prospects use a general retail form. The team then has to ask which product, quantity and delivery option they meant.',
    decision: 'Choose one product family and list the capabilities a trade buyer can read publicly. Identify the details needed to discuss an order, including any quantity-dependent terms. Write a distinct trade contact route and explain what happens after submission. Keep account-specific pricing and unapproved minimums out of the public description.',
    questions: ['Which capability facts help a trade buyer decide to inquire?', 'Does a minimum order vary by product or arrangement?', 'Who receives the request and confirms the next step?'],
    output: 'A trade-page outline and a minimal wholesale inquiry that supports the actual review process.',
    check: 'Follow the trade route from a product page and confirm that submitting a request does not imply an account or order has already been accepted.'
  },
  clearfield: {
    name: 'Clearfield', title: 'Reconcile one older location label with current information',
    scenario: 'Imagine a Clearfield County business with saved directions mentioning Sandy Township and current pages describing DuBois. Customers still use both versions.',
    decision: 'Select one affected page or document. Verify its actual address and arrival instructions with the business, then check the current municipal context. Decide whether older wording should be corrected, retained as an explained historical reference or removed. Review any linked downloads and important old URLs so the update remains consistent.',
    questions: ['Which location fact has been verified and which still needs confirmation?', 'Does the familiar older term help a customer find the real destination?', 'Would changing the page address improve anything for the visitor?'],
    output: 'A before-and-after location note, address and list of related pages or links to check.',
    check: 'Open the old shared route and confirm that it leads to current, understandable directions without assuming that municipal consolidation changed the postal address.'
  }
};
