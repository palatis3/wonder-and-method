// Original editorial planning guides. All business examples are explicitly fictional.
export const delawareRows = [
  {
    "id": "kent",
    "audience": "Service businesses screening coverage by customer address",
    "title": "Use the service address to resolve a coverage question",
    "focus": "A county selector is a poor substitute for the address where work is requested. Decide which address details the business needs to determine coverage and which can wait until a private conversation. A town name may cross a county boundary, so do not automatically reject an inquiry because the visitor selected an unexpected county. Publish the business’s actual coverage rule, provide an uncertain-address route and distinguish a preliminary coverage check from acceptance of the job. Ask the operator to approve edge cases before implementing any automated rule. A simple reviewed inquiry may be more accurate than a map that appears precise but uses an unverified boundary.",
    "briefs": [
      [
        "A Smyrna coverage inquiry",
        "Fictional example: a Smyrna customer cannot tell which county option applies to the requested work address. A service business accepts the address for review and explains that a person will confirm coverage. It avoids requiring the customer to select an inaccurate county simply to submit the inquiry."
      ],
      [
        "A Milford boundary check",
        "Fictional example: a Milford provider uses an internal address list to review requests. Its website asks for the work location separately from the billing location, then presents a receipt that promises a coverage review rather than an appointment. The operator checks uncertain matches before discussing availability."
      ]
    ],
    "search": "Plan search content around the actual service and supported coverage rather than a mechanically generated page for each county selection. Smyrna and Clayton span Kent and New Castle counties; Milford spans Kent and Sussex. Those distinctions matter when testing address rules. They do not justify duplicate service descriptions or imply that every address in a named municipality is served.",
    "task": [
      "Test the edges of your coverage rule",
      "Choose an accepted address, an excluded address and an uncertain address. Record the minimum details needed, the review owner and the message each customer receives. Use test addresses approved by the business rather than publishing customer information.",
      [
        "Does the work address differ from billing?",
        "Can a boundary case reach a person?",
        "What actually confirms coverage?"
      ],
      "An address-review decision sheet with three tested outcomes.",
      "Try an uncertain county selection and confirm the form permits an accurate inquiry."
    ],
    "local": [
      [
        "Why can a Kent County form need more than a town name?",
        "Clayton and Smyrna also extend into New Castle County, while Milford extends into Sussex. Use the actual work address when a coverage rule depends on the boundary."
      ],
      [
        "Does naming Dover establish a local office?",
        "No. A service-area reference does not establish premises. Wonder and Method works online from Buffalo; the business being described must supply its own accurate address and coverage."
      ]
    ],
    "faqs": [
      [
        "How should I choose a designer for an address-based service website?",
        "Ask them to demonstrate an accepted, excluded and uncertain address. The proposal should explain who supplies coverage rules and how a customer reaches manual review when the address cannot be classified reliably.",
        "how to choose a web design agency",
        "approach"
      ],
      [
        "What maintenance should a coverage form receive?",
        "Include checks of approved address rules, explanatory text and inquiry delivery in the agreed care scope. Changes to a coverage boundary need an operator decision before publication; ordinary website care cannot infer new operating territory.",
        "what does website maintenance include",
        "maintenance"
      ],
      [
        "Can local SEO help customers understand coverage?",
        "Accurate service descriptions and coverage guidance can answer location questions. Keep the uncertain-address route visible. Avoid claiming all of Kent County if the business only accepts specific addresses or reviews requests individually.",
        "how to improve local seo",
        "seo"
      ]
    ]
  },
  {
  "id": "new-castle",
  "audience": "Businesses needing visible inquiry-delivery failures and backup escalation",
  "title": "Make failed inquiry delivery visible to a backup owner",
  "focus": "A successful-looking form can conceal a failed delivery to the business. Decide what evidence proves that the intended receiving system accepted a request and where a failure becomes visible. A screen confirmation, an outgoing email attempt and a monitored inbox receipt are different events. Assign a person to inspect delivery failures and a backup route that still works when the main destination does not. Define the escalation threshold the business can actually monitor, without promising instant attention. Keep customer-facing wording tied to known facts and preserve an appropriate request reference for reconciliation. The worksheet should rehearse a failed destination, not merely assign different inquiry topics to different departments.",
  "briefs": [
    [
      "A rejected receiving mailbox in Wilmington",
      "Fictional example: A Wilmington business discovers that a website message was accepted by its form service but rejected by the receiving mailbox. An approved test identifies the failure signal and the person who sees it. The customer receipt does not claim that a staff member has read the request, and a backup owner handles the undelivered record."
    ],
    [
      "A backup recovery in Newark",
      "Fictional example: A Newark team’s usual recipient is unavailable when a delivery alert appears. The backup follows a documented escalation route and records whether the request was recovered. Staff reconcile the original reference before asking the customer to send it again, reducing duplicate work and preserving an honest account of the failure."
    ]
  ],
  "search": "Search visitors need a reliable contact action, but rankings do not establish message delivery. Test the inquiry route linked from important landing pages and state any supported alternate contact accurately. Keep delivery logs and customer details private while publishing only the contact information customers can use.",
  "task": [
    "Make failed inquiry delivery visible to a backup owner",
    "Using an approved test environment or provider-supported test, simulate a rejected receiving destination. Record the failure evidence, alert recipient, escalation threshold, backup action and reconciliation reference. Compare the customer message with what the system actually knows at each point.",
    [
      "What proves delivery to the receiving system?",
      "Who sees a rejected message?",
      "Can the backup recover it without creating an unexplained duplicate?"
    ],
    "A failed-delivery escalation runbook and an observed alert-to-recovery test record.",
    "Demonstrate that an approved failed-delivery test becomes visible to the designated backup without relying on the customer reporting it."
  ],
  "local": [
    [
      "Does a Wilmington success screen prove staff received the inquiry?",
      "It may prove only that the form accepted it. Identify the actual receiving-system evidence before claiming delivery."
    ],
    [
      "What should a Newark backup owner receive?",
      "A clear failure signal, an appropriate reference and the supported recovery instruction, with access limited to what the role needs."
    ]
  ],
  "faqs": [
    [
      "How should I choose an agency for reliable inquiry delivery?",
      "Ask it to demonstrate an approved failure test and the resulting alert. A successful sample message alone does not show how rejection or an unavailable recipient is handled.",
      "how to choose a web design agency",
      "approach"
    ],
    [
      "What maintenance should include delivery-failure checks?",
      "Agree who monitors provider alerts, reviews receiving-destination changes and rehearses the backup route. Ordinary content editing does not automatically include ongoing delivery monitoring.",
      "what does website maintenance include",
      "maintenance"
    ],
    [
      "What affects the cost of improving inquiry reliability?",
      "The receiving provider, available delivery evidence, alerting and recovery requirements determine scope. Define the failed-destination acceptance test before estimating an integration or monitoring service.",
      "how much does a website redesign cost",
      "cost"
    ]
  ]
},
  {
    "id": "sussex",
    "audience": "Businesses taking inquiries while temporarily unavailable",
    "title": "Keep a pause in service from becoming a misleading invitation",
    "focus": "A business can be temporarily unavailable without disappearing from the web. Decide whether it is closed to all inquiries, accepting future requests or continuing support for existing customers. State those paths separately and avoid a generic contact button that implies immediate availability. The message needs a review date or a clear owner even when the reopening date is not known. Identify which pages, forms and external destinations repeat availability claims. Preserve useful service information while making the current limitation visible beside the next action. When work resumes, check the full path rather than removing only the homepage notice and leaving contradictory instructions elsewhere.",
    "briefs": [
      [
        "A pause in Lewes",
        "Fictional example: a Lewes business pauses new work while finishing existing commitments. Its service pages retain their explanations but identify new inquiries as future-interest requests. Current customers receive a separate approved contact route, and the receipt avoids suggesting that a future project has entered the schedule."
      ],
      [
        "An uncertain reopening in Georgetown",
        "Fictional example: a Georgetown operator cannot confirm when new appointments will resume. The website states that uncertainty directly and assigns a date for the owner to review the notice. It does not invent a reopening estimate to make the contact page look more complete."
      ]
    ],
    "search": "Keep enduring service explanations at stable addresses where they remain useful. Add current availability near the action and review search-facing descriptions that might imply immediate acceptance. Do not repeatedly delete and recreate the same service page for temporary pauses. Track inquiries seeking current availability to decide whether the notice needs clearer placement or more specific wording.",
    "task": [
      "Write the pause and reopening states",
      "Define what new customers, existing customers and future-interest visitors may do during a pause. Identify all repeated availability messages and the person who approves resuming work.",
      [
        "Which requests are still accepted?",
        "Who reviews an unknown reopening date?",
        "What must change when service resumes?"
      ],
      "A pause checklist and approved messages for three visitor groups.",
      "Open a service page directly and confirm its action accurately reflects the current pause."
    ],
    "local": [
      [
        "Should a Sussex County business remove every page during a pause?",
        "Usually keep useful accurate information and explain the current status. Remove misleading acceptance claims and preserve an appropriate route for existing customers if support continues."
      ],
      [
        "Can a Rehoboth Beach page promise a reopening month?",
        "Only if the operator approves that commitment. If the date is uncertain, say so and establish a review process rather than publishing an invented estimate."
      ]
    ],
    "faqs": [
      [
        "Will a temporary service pause require a website migration?",
        "Usually the content and action can change at the existing address. If a redesign also moves pages, document redirects and preserve useful service information. A pause alone is not a reason to discard established URLs.",
        "does website redesign affect seo",
        "migration"
      ],
      [
        "What maintenance helps keep a closure notice accurate?",
        "Agree who supplies status changes, which repeated notices are checked and when an undated pause is reviewed. Publishing approved changes can be scoped; deciding operational availability belongs to the business.",
        "what does website maintenance include",
        "maintenance"
      ],
      [
        "How should I evaluate a designer’s temporary-closure plan?",
        "Ask to see the paths for new inquiries, existing customers and visitors with an old direct link. A useful plan includes the reopening checks and a named content owner, not just a prominent banner.",
        "how to choose a web design agency",
        "approach"
      ]
    ]
  }
];
