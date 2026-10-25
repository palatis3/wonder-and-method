// Original planning guides; every business example is expressly fictional.
export const newHampshireRows = [
  {
    "id": "belknap",
    "audience": "Businesses deciding whether visitors need an internal search tool",
    "title": "Plan the answer when a website search finds nothing",
    "focus": "Before requesting a search box, list the things customers would actually search for and where those answers live. A small service website may need clearer navigation rather than a custom search feature. If search is useful, decide whether it covers pages, products, documents or all three, and give every result a meaningful label. Plan for misspellings, unfamiliar terminology and a query that genuinely has no match. An empty result should explain what was searched and offer an appropriate next step without pretending that an unavailable service exists. Identify who reviews repeated failed searches and turns them into content decisions. This exercise defines the usefulness of the feature before its appearance or implementation is chosen.",
    "briefs": [
      [
        "An unfamiliar name in Laconia",
        "Fictional example: a Laconia equipment supplier notices that customers use an older name for a current product family. Its planning sheet records the approved relationship between the names and the destination that answers the question. The team does not add an unrelated product simply to make every possible search return something."
      ],
      [
        "A missing service in Meredith",
        "Fictional example: a Meredith studio considers internal search for a small website. Testing common questions reveals that several concern a service it does not offer. The studio improves its service overview and contact guidance first, then evaluates whether a search tool would add more help than those clearer pages already provide."
      ]
    ],
    "search": "Internal website search and public search-engine visibility are different tasks. Use failed internal queries as clues about navigation or missing explanations, while reviewing public search data separately. Do not automatically publish indexable pages for every internal query. A useful search destination should contain an actual answer, current offer or clearly explained limitation rather than a generated empty-results page.",
    "task": [
      "Test ten customer search phrases",
      "Write ten phrases a visitor might enter, including an old name, a misspelling and an unavailable service. Assign a useful destination or an honest no-match response to each. Compare this with a simpler navigation change.",
      [
        "What content is included in the search?",
        "Which no-match query signals a missing explanation?",
        "Who reviews repeated failed searches?"
      ],
      "A search-intent table and a decision on whether the feature is justified.",
      "Try the unavailable-service phrase and confirm that the next step does not imply the business offers it."
    ],
    "local": [
      [
        "Does a Gilford business need internal search because it serves several towns?",
        "Not necessarily. The number of places served is separate from the amount and complexity of searchable content. Start with the questions visitors need to answer."
      ],
      [
        "Should a Belmont search with no results lead to the home page?",
        "Give context first. Explain that no match was found and offer relevant categories or a question route; silently returning home leaves the original uncertainty unresolved."
      ]
    ],
    "faqs": [
      [
        "Should I hire a designer to add website search?",
        "First test whether clear navigation resolves the problem. If search remains useful, ask the designer to define its content scope, result labels and no-match behavior; custom search needs an explicit project scope.",
        "should i hire a web designer",
        "approach"
      ],
      [
        "How much does adding website search cost?",
        "Cost depends on the content source, indexing and result behavior. Use the project-cost guide and current pricing to compare a navigation improvement with any separately scoped search integration.",
        "how much does it cost to develop a website",
        "cost"
      ],
      [
        "What maintenance does internal search require?",
        "Agree how new or retired content enters the index and who reviews failed queries. Routine website care does not automatically include operating a custom search service or rewriting all missing answers.",
        "what does website maintenance include",
        "maintenance"
      ]
    ]
  },
  {
    "id": "carroll",
    "audience": "Businesses offering choices that cannot all be combined",
    "title": "Explain incompatible options before a customer requests the impossible combination",
    "focus": "A list of individually available options can still imply combinations the business cannot deliver. Identify which choices depend on each other and which exclusions materially change the result. Explain the reason in customer language when it helps selection, rather than presenting an unexplained disabled control. Decide what happens when someone changes an earlier choice after selecting later options: preserve compatible details, flag the affected choices and ask for a review before submission. An informational comparison may be enough for a small range; a custom configurator should be justified by the actual rules. Have the business approve those rules and give uncertain customers a route to ask about an exception without promising that one is available.",
    "briefs": [
      [
        "A finish choice in Conway",
        "Fictional example: a Conway maker offers two finishes, but only one is suitable for a particular material in its approved range. The option description explains that limitation before the inquiry. A customer changing the material is asked to review the finish again instead of sending an internally contradictory specification unnoticed."
      ],
      [
        "A format change in Wolfeboro",
        "Fictional example: a Wolfeboro studio offers a compact display format that cannot include one optional component. Its comparison states the exclusion beside the format choice and shows which alternatives retain the component. The page treats an unusual combination as a review request, not an automatically accepted custom order."
      ]
    ],
    "search": "Describe real option differences on the relevant offer page using the terms customers recognize. Do not generate separate search pages for impossible combinations or advertise a choice without its important restriction. Review inquiries that repeatedly contain incompatible selections; the missing explanation may belong beside the first choice rather than in a longer general FAQ.",
    "task": [
      "Write an option dependency map",
      "Choose four common options and mark which can coexist. Identify the earlier choice that controls each restriction. Draft the message shown when a customer changes that controlling choice.",
      [
        "Which choices depend on another selection?",
        "What must be reviewed after a change?",
        "Can the same rules be explained without a custom tool?"
      ],
      "An approved combination table and change-of-choice message.",
      "Change the first option after selecting the last one and check that the final summary contains a deliverable combination."
    ],
    "local": [
      [
        "Does an Ossipee offer need an interactive configurator?",
        "Only if the number of meaningful rules warrants it. A clear comparison and reviewed inquiry may be enough when the choice set is small."
      ],
      [
        "Can a Tamworth customer request an excluded combination?",
        "Provide a question route if the business considers exceptions. State that review is required; accepting the message should not be presented as accepting the combination."
      ]
    ],
    "faqs": [
      [
        "What does web design contribute to complicated options?",
        "It makes dependencies understandable and ensures a changed selection does not leave a misleading summary. The business supplies the actual compatibility rules; the designer should not infer them from product names.",
        "what does a web designer do",
        "design"
      ],
      [
        "What affects the cost of an option selector?",
        "The number of rules, validation states and external connections matters more than the number of visible buttons. Use the project-cost guide to compare a content solution with a separately quoted custom tool.",
        "how much does a website cost",
        "cost"
      ],
      [
        "How should option rules be maintained?",
        "Keep an approved source for valid combinations and update explanatory content and any selector together. Assign a business reviewer before introducing new materials, formats or exceptions.",
        "what is included in website maintenance",
        "maintenance"
      ]
    ]
  },
  {
    "id": "cheshire",
    "audience": "Businesses publishing a starting price for variable work",
    "title": "Make the lowest advertised price describe a real purchasable scope",
    "focus": "A starting price helps only when the customer can understand what qualifies for it. Describe the included work, assumed inputs and conditions that move the project beyond that baseline. Distinguish a current advertised offer from an illustrative example and a customer-specific quote. Place important exclusions beside the price rather than relying on a remote footnote. The business must approve how additional charges and applicable payment terms are described. If no realistic customer can receive the stated scope at that amount, reconsider whether a starting price is the right presentation. A clear price explanation should narrow the next conversation to meaningful choices without pretending that variable work has already been assessed or quoted.",
    "briefs": [
      [
        "A baseline project in Keene",
        "Fictional example: a Keene creative studio advertises a starting scope that assumes the customer supplies approved text and images. The page names those inputs beside the price and explains that content preparation is discussed separately. A prospect can recognize which assumption changes the estimate before using the inquiry form."
      ],
      [
        "A larger request in Jaffrey",
        "Fictional example: a Jaffrey customer wants an additional version of a standard deliverable. The service page shows that the baseline covers one version and invites a description of the extra work. Its receipt does not repeat the starting price as though it were an approved quote for the expanded request."
      ]
    ],
    "search": "A price-related landing page should answer what the amount includes and which decisions change it. Use accurate offer names and current scope rather than creating separate thin pages for every cost phrase. Review whether search visitors reach the assumptions before contacting the business. Traffic from price searches is less useful when the public number attracts requests the stated scope cannot support.",
    "task": [
      "Audit a starting-price statement",
      "Write the smallest actual scope the business will supply at the advertised starting amount. List required customer inputs and three changes that need review. Put the most consequential condition beside the price.",
      [
        "Can the baseline be purchased as described?",
        "Which assumption most often changes the quote?",
        "Does the inquiry receipt avoid confirming an unreviewed price?"
      ],
      "An approved baseline description and estimate-changing checklist.",
      "Ask a reader to describe the included work using only the price section, without relying on a sales explanation."
    ],
    "local": [
      [
        "Should a Swanzey business publish a starting price?",
        "Use one when it represents a clear, current scope that helps customers evaluate fit. Otherwise a useful explanation of price inputs may be more accurate."
      ],
      [
        "Can a Rindge request be quoted from a county name alone?",
        "No. The business needs the facts that actually determine scope. A place label does not resolve deliverables, preparation or other approved pricing conditions."
      ]
    ],
    "faqs": [
      [
        "How much should a website cost when the scope varies?",
        "Start with the current pricing and project-cost guide, then identify required pages, content and functions. Treat any public starting amount as a defined scope rather than a quote for every request.",
        "how much does a website cost",
        "cost"
      ],
      [
        "How should I compare website design prices?",
        "Compare included deliverables, supplied content, revision process and responsibilities using the same assumptions. Ask what changes the baseline before treating two advertised starting prices as equivalent.",
        "how much does it cost to design a website",
        "cost"
      ],
      [
        "What maintenance does a price page need?",
        "Assign an owner for approved amounts, scope and effective changes. Update repeated price references and linked offers together so an older number does not appear to describe a new package.",
        "what should i know about website maintenance",
        "maintenance"
      ]
    ]
  },
  {
    "id": "coos",
    "audience": "Businesses reviewing a form that must work without a mouse",
    "title": "Keep keyboard movement aligned with the inquiry a customer is completing",
    "focus": "A form can look orderly while its keyboard sequence sends a visitor through controls in an unexpected order. Trace the actual customer task from the first label to submission, including conditional questions, help links and correction messages. Make the current focus visible and check that a newly revealed section does not strand the user elsewhere. Do not assume that a keyboard test alone establishes complete accessibility; it is one concrete usability check with a defined scope. Keep the required information and submission consequence understandable throughout the sequence. The business should identify which fields are essential, while the design review tests whether someone can reach, understand and correct them without relying on a pointing device.",
    "briefs": [
      [
        "A hidden question in Berlin",
        "Fictional example: a Berlin service business reveals an extra question when a customer chooses a particular appointment type. During a keyboard test, the reviewer checks that the new question can be reached in a sensible order and that its label remains clear. The team records the behavior instead of assuming a visually neat form is sufficient."
      ],
      [
        "A correction in Lancaster",
        "Fictional example: a Lancaster customer leaves a required field incomplete. The form review checks whether the error explains the missing information and helps the customer return to that field without losing the rest of the inquiry. The test includes the final confirmation so submission is not confused with merely moving focus."
      ]
    ],
    "search": "Search visitors may arrive directly at an inquiry section, bypassing introductory navigation. Keep the form purpose and required context available at that entry point. A keyboard improvement primarily supports task completion; it should not be marketed as a guaranteed ranking increase. Review qualified inquiries and observed usability problems separately from general changes in search traffic.",
    "task": [
      "Walk a form using the keyboard",
      "Choose one ordinary inquiry and one with a conditional question. Record the order of controls, visible focus, error recovery and final receipt. Note any point where the next action becomes unclear.",
      [
        "Can every required control be reached?",
        "Does a revealed question join a sensible sequence?",
        "Can an error be corrected without re-entering unrelated details?"
      ],
      "A keyboard-path review with specific issues and expected behavior.",
      "Complete the conditional inquiry without a mouse and verify that the received message contains the intended answers."
    ],
    "local": [
      [
        "Does a Gorham website need a different keyboard path from a Berlin one?",
        "The path depends on the form and its task, not the municipality. Use the same clear labels and test the actual conditions each service requires."
      ],
      [
        "Can a Colebrook form claim full accessibility after one keyboard check?",
        "No. Describe the check performed and fix the observed issues. Broader accessibility assessment requires a suitably defined review rather than a blanket claim from one test."
      ]
    ],
    "faqs": [
      [
        "What should a web designer check in a keyboard form review?",
        "They should inspect focus visibility, sequence, conditional controls and error recovery across the customer task. Ask for observed behavior and concrete fixes rather than a general assurance that the form looks accessible.",
        "what does a web designer do",
        "design"
      ],
      [
        "Does responsive design include usable forms?",
        "A smaller layout must still present labels, instructions and corrections clearly. Test keyboard interaction and small-screen presentation as related checks; neither one alone proves that every user can complete the task.",
        "what is responsive web design",
        "design"
      ],
      [
        "When should a form be redesigned instead of repaired?",
        "Use focused fixes when the problem is limited to order, labeling or one error state. Consider a broader redesign when the form structure itself no longer matches the information the business needs.",
        "when is it time to redesign your website",
        "repair"
      ]
    ]
  },
  {
    "id": "grafton",
    "audience": "Businesses publishing detailed service explanations on one long page",
    "title": "Make a direct section link understandable without the page introduction",
    "focus": "A customer may follow a link to the middle of a long service page from an email, search result or shared message. Decide which sections need stable links and enough local context to stand on their own. A heading should identify the question being answered, while the nearby text explains any prerequisite or limitation that affects the next action. Keep a clear route back to the service overview. When sections are renamed or combined, consider whether existing links still lead somewhere useful. Do not make every paragraph a separate page merely to obtain a shareable address. The practical goal is a long page that supports both a first reading and a focused return to one decision.",
    "briefs": [
      [
        "A preparation link in Lebanon",
        "Fictional example: a Lebanon studio emails a customer a link to the preparation section of its service page. That section names the appointment it applies to and links to the current overview. The customer does not need to scroll to the top to discover that the instructions belong to a different service than expected."
      ],
      [
        "A renamed section in Littleton",
        "Fictional example: a Littleton business reorganizes a long explanation and changes several headings. Before publication, the editor tests links used in customer messages and keeps meaningful destinations available. The new structure improves reading without leaving a previously shared section link at an unexplained point in the page."
      ]
    ],
    "search": "Use descriptive headings that reflect genuine customer questions and organize related detail beneath them. A long page should have a coherent service purpose rather than becoming a collection of unrelated keywords. Review direct entry points and section links during content changes. Search snippets may show only part of the page, so important conditions should accompany the relevant explanation.",
    "task": [
      "Test three direct entry points",
      "Choose three sections someone might share directly. Read each without the introduction, then record missing context, the next action and the route to the full overview. Inventory existing section links before changing headings.",
      [
        "Does the section identify its scope?",
        "Is a necessary condition visible nearby?",
        "What happens to a previously shared link after the edit?"
      ],
      "A section-link map and revised headings with sufficient context.",
      "Open each section link in a new browser tab and explain the intended action without first reading the entire page."
    ],
    "local": [
      [
        "Should a Hanover service split every question onto a new page?",
        "Only when a separate page offers a distinct useful destination. Related questions can remain on one well-structured page with clear section links."
      ],
      [
        "Can a Plymouth section link replace the full service overview?",
        "It can support a focused question, but keep a visible route to the broader scope and applicable conditions. The excerpt should not imply an offer beyond that overview."
      ]
    ],
    "faqs": [
      [
        "How should a designer organize a long service page?",
        "Ask them to show the full reading sequence and a direct entry into a middle section. Evaluate whether both paths preserve the service scope, important conditions and next step.",
        "how to choose a web design agency",
        "approach"
      ],
      [
        "Can changing headings affect a website redesign?",
        "Yes, especially when existing messages or pages link to specific sections. Inventory those references and test their destinations as part of the migration, alongside ordinary page URLs.",
        "does website redesign affect seo",
        "migration"
      ],
      [
        "What maintenance do long pages need?",
        "Review section context, cross-references and shared links after structural edits. A small wording change may be local, while moving a section can affect instructions used elsewhere.",
        "what does website maintenance include",
        "maintenance"
      ]
    ]
  },
  {
    "id": "hillsborough",
    "audience": "Businesses with several pages answering almost the same service question",
    "title": "Decide what must survive before combining overlapping pages",
    "focus": "Two similar pages may divide useful information, confuse navigation or serve genuinely different decisions. Compare their audience, purpose, evidence and next action before choosing to combine them. Record any unique explanation, incoming link or customer instruction that would be lost if one disappeared. A consolidation should produce a stronger destination, not merely reduce the page count. Decide which address remains, how moved material is organized and where old links should lead. Do not assume that the page with the longest text is the best destination. Use available search and inquiry evidence alongside a reading of the actual content, and preserve meaningful differences when separate pages still earn their place.",
    "briefs": [
      [
        "Two service pages in Manchester",
        "Fictional example: a Manchester studio has separate pages called brand consultation and brand planning, but both invite the same first conversation. The editor compares their useful content and combines the duplicated explanation while retaining the distinct preparation advice. The new destination clearly describes the one actual service rather than implying two packages."
      ],
      [
        "A necessary distinction in Nashua",
        "Fictional example: a Nashua supplier considers combining two apparently similar product pages. Review shows that one supports individual replacement requests and the other explains a separate bulk process. The team preserves those distinct next steps instead of merging the pages solely because their introductory wording happens to resemble each other."
      ]
    ],
    "search": "Review queries, links and qualified inquiries for each page before consolidation. Keep useful material and map old URLs to a relevant destination when pages move. Avoid interpreting keyword similarity as proof of identical intent. After publication, check indexing and customer paths without promising that fewer pages will automatically produce better rankings or more inquiries.",
    "task": [
      "Compare two overlapping pages",
      "Create a table for audience, decision, unique facts, inbound references and next action. Mark duplicate material separately from useful differences. Choose retain, combine or rewrite and document the destination of each old link.",
      [
        "Do the pages support the same decision?",
        "Which unique information would be lost?",
        "Where should an old shared URL lead?"
      ],
      "A page-consolidation decision and content-preservation map.",
      "Read the proposed combined page and verify that a visitor can still complete every justified original task."
    ],
    "local": [
      [
        "Should a Bedford business combine pages just because titles are similar?",
        "No. Compare the underlying customer tasks and useful differences. Similar wording may indicate a labeling problem rather than a need to merge the services."
      ],
      [
        "Does serving Milford and Manchester require duplicate service pages?",
        "Only publish separate location content when it adds real distinctions. The place names alone do not justify repeating the same explanation and contact action."
      ]
    ],
    "faqs": [
      [
        "Can consolidating service pages affect SEO?",
        "It can change the destinations associated with existing queries and links. Inventory useful content, choose relevant redirects where needed and check the result; consolidation is not a guaranteed ranking improvement.",
        "does website redesign affect seo",
        "migration"
      ],
      [
        "How should I hire a designer for a cluttered website?",
        "Ask them to compare actual page purposes before proposing a smaller sitemap. A good brief identifies what must survive and which distinct customer actions should remain easy to find.",
        "how to hire a web designer",
        "approach"
      ],
      [
        "When is a redesign better than combining a few pages?",
        "A focused content change may solve isolated overlap. Broader redesign is more justified when navigation, templates and inquiry routes repeatedly obscure the differences between services.",
        "when is it time to redesign your website",
        "repair"
      ]
    ]
  },
  {
    "id": "merrimack",
    "audience": "Businesses offering email updates alongside a service inquiry",
    "title": "Keep an optional subscription separate from the reply a customer requested",
    "focus": "Someone asking about a service needs a reply to that question, but that does not necessarily mean they want ongoing promotional messages. Give the inquiry and the optional subscription separate labels and explain what each action does. State the actual type of updates offered and use the business-approved subscription process. Do not make a marketing preference look like a condition for receiving a service response unless that accurately reflects a reviewed offer. Decide how the selected preference reaches the receiving system and what the confirmation says when someone declines. The website should support a clear choice; it should not invent legal conclusions or imply that a generic checkbox establishes every requirement for the business’s communications.",
    "briefs": [
      [
        "An inquiry in Concord",
        "Fictional example: a Concord studio adds an optional updates choice beside its service inquiry. A customer can request a project conversation without selecting it, and the receipt confirms only the inquiry in that case. The business checks that the receiving message preserves the preference rather than adding every sender to a promotional list."
      ],
      [
        "A subscription in New London",
        "Fictional example: a New London business offers a separate signup for occasional product updates. The page describes the actual subject of those messages and uses the approved subscription destination. It does not imply that signing up requests a quote, reserves a product or guarantees a personal response from the sales team."
      ]
    ],
    "search": "Use service pages to answer service questions and a clearly labeled subscription invitation for ongoing updates. Search visitors should not have to join a list to understand basic offer information. Review inquiry completion and subscription interest as separate outcomes. Avoid counting an optional signup as a qualified project lead when no project request was made.",
    "task": [
      "Separate two communication purposes",
      "Write the inquiry receipt and subscription confirmation as different messages. Record which selection triggers each one, where preferences are sent and how a visitor understands the offered updates.",
      [
        "Can someone inquire without subscribing?",
        "What messages does the subscription actually include?",
        "Does the receiving system retain the selected preference?"
      ],
      "A communication-purpose map and two accurate confirmation states.",
      "Submit a fictional inquiry with the optional subscription declined and verify the resulting message and routing."
    ],
    "local": [
      [
        "Should a Hooksett service inquiry require a newsletter choice?",
        "If the choice is optional, make that clear and let the inquiry proceed without it. The form should not obscure the customer’s primary request."
      ],
      [
        "Does a Franklin subscription create a service inquiry?",
        "Only if the visitor explicitly requests that next step. A signup for updates and a project conversation are separate intentions even when they share a page."
      ]
    ],
    "faqs": [
      [
        "What should a designer clarify about email signup?",
        "They should distinguish service replies from optional updates and confirm the actual subscription process. Marketing-platform work and specialized communication requirements must be explicitly scoped rather than assumed.",
        "what does a web designer do",
        "design"
      ],
      [
        "How much does a website email signup cost?",
        "An approved external signup link differs from an integrated preference workflow. Define the needed behavior, consult the project-cost guide and current pricing, and quote any additional integration separately.",
        "how much does it cost to create a website",
        "cost"
      ],
      [
        "What maintenance do inquiry and signup forms need?",
        "Check destinations, labels and confirmation states after approved changes. Confirm that an ordinary inquiry does not become a subscription through an accidental routing change.",
        "what does website maintenance include",
        "maintenance"
      ]
    ]
  },
  {
    "id": "rockingham",
    "audience": "Businesses sending campaign visitors to a service landing page",
    "title": "Keep the landing page faithful to the invitation that brought the visitor",
    "focus": "A person following a campaign link arrives with an expectation formed by the message they just read. Record that promise before writing a landing page: the offer, audience, condition and intended next step. Make those facts easy to recognize without forcing the visitor to reconstruct them from a general home page. If the offer is limited or differs from the standard service, explain the distinction and what happens when it is no longer available. Keep campaign claims within the business’s approved scope. A dedicated page is justified by useful context, not simply by a new tracking label. The customer should understand what they can actually request before the page asks for contact information.",
    "briefs": [
      [
        "A specific invitation in Portsmouth",
        "Fictional example: a Portsmouth studio shares a campaign about a defined introductory review. The linked page describes that review and its limits before presenting the inquiry action. It does not quietly switch to selling a larger project while leaving the visitor to assume the original review is included without a separate agreement."
      ],
      [
        "An ended offer in Exeter",
        "Fictional example: an Exeter business ends a campaign while old messages remain in circulation. The landing page marks the original offer as unavailable and explains a relevant current option. It identifies the difference rather than silently replacing the old promise with a broader service carrying different conditions and next steps."
      ]
    ],
    "search": "Decide whether a campaign page adds durable search value or primarily serves a specific invitation. Keep its approved offer consistent with the main service information and avoid near-identical pages for every message variation. Review campaign visits separately from organic search performance. A clear landing experience helps interpretation but does not establish that the campaign generated a sale.",
    "task": [
      "Compare invitation and destination",
      "Place the campaign text beside the proposed page and highlight each promise. Match every important claim to an explanation, condition and next action. Write the page’s state after the campaign ends.",
      [
        "What did the visitor expect from the link?",
        "Which condition changes eligibility or scope?",
        "What remains useful after the invitation expires?"
      ],
      "A promise-to-page checklist and an end-of-campaign notice.",
      "Open the landing page from the campaign message and explain the exact offer without consulting another page."
    ],
    "local": [
      [
        "Does a Derry campaign need its own landing page?",
        "Only when distinct context or instructions help the visitor. A suitable existing service page may already answer the invitation accurately."
      ],
      [
        "Can a Hampton campaign page imply a local office?",
        "No. Describe the actual business location and delivery arrangement. Campaign targeting does not create an office or a local operating presence."
      ]
    ],
    "faqs": [
      [
        "How should I choose a designer for campaign pages?",
        "Ask them to compare the invitation, landing explanation and submitted inquiry as one path. Confirm how the page changes when the offer ends and who approves the claims.",
        "how to choose a web design agency",
        "approach"
      ],
      [
        "What affects the cost of a landing page?",
        "Distinct content, assets, forms and testing needs determine scope. Use the project-cost guide and current pricing; campaign management or advertising services should not be inferred from a page-design quote.",
        "how much does it cost to build a website",
        "cost"
      ],
      [
        "How can SEO support a campaign destination?",
        "A useful page should accurately explain the service and connect to relevant site content. Do not publish duplicate campaign variations solely to target small keyword changes or promise organic rankings from a dedicated page.",
        "how to improve local seo",
        "seo"
      ]
    ]
  },
  {
    "id": "strafford",
    "audience": "Businesses using photographs to explain products or completed work",
    "title": "Use captions to state what a photograph actually demonstrates",
    "focus": "An attractive photograph can leave important questions unanswered: which part the business supplied, what size is shown, whether accessories are included and whether the scene is a real example or an illustration. Decide what the reader must understand before using the image as evidence. Put the consequential explanation in nearby text rather than relying on a filename or a visual inference. Keep captions accurate when an image is cropped or reused elsewhere. The business must approve any claims about project involvement and permission to publish. A useful caption should help a customer evaluate the pictured choice without turning a reference image into an implied client relationship, standard inclusion or guaranteed result.",
    "briefs": [
      [
        "A product scene in Dover",
        "Fictional example: a Dover maker photographs a small product beside decorative objects. The caption identifies the item being offered, its approved dimensions and which surrounding objects are not part of the offer. When the image is reused on a category page, that essential distinction remains available rather than disappearing with the longer description."
      ],
      [
        "A project detail in Rochester",
        "Fictional example: a Rochester studio has permission to show a detail from a larger project. The caption explains the studio’s actual contribution and identifies the image as a detail view. It does not suggest that the studio designed the entire setting or that everything visible is included in the advertised service."
      ]
    ],
    "search": "Use informative surrounding text to connect an image to the relevant service or product. A caption should describe useful facts, not repeat a county keyword mechanically. Keep search-facing image context consistent with the page’s actual claims. Review whether a visitor arriving through an image can identify what is being shown and find the correct offer.",
    "task": [
      "Audit five image captions",
      "For five important images, record the item or work shown, scale information, included elements, publication permission and role of the business. Write a short caption that resolves the most consequential ambiguity.",
      [
        "What might a viewer wrongly assume is included?",
        "Does the crop change the apparent scale or contribution?",
        "Is the caption still accurate wherever the image is reused?"
      ],
      "An image-context register and five approved captions.",
      "Show a captioned image without the rest of the page and ask what the business actually supplied or offers."
    ],
    "local": [
      [
        "Should a Durham image caption name the town?",
        "Include the location when it is accurate, approved and useful to understanding the example. Do not add a place label simply to imply local client work."
      ],
      [
        "Can a Somersworth business use an illustrative image?",
        "Yes, with appropriate rights and clear context. Identify it as illustrative when a reader might otherwise mistake it for the business’s own work or a specific result."
      ]
    ],
    "faqs": [
      [
        "What should a web designer do with project photographs?",
        "They should ask what the images demonstrate, which claims are approved and what context must remain visible. Choosing an attractive crop does not establish the business’s role in the pictured work.",
        "what do web designers do",
        "design"
      ],
      [
        "How can image captions support local SEO?",
        "Accurate captions and nearby service information can make content more understandable. Use genuine context and avoid inventing locations or clients; adding a town name to every image is not a search strategy.",
        "how does local seo work",
        "seo"
      ],
      [
        "What maintenance do reused images need?",
        "Check captions, inclusion statements and permissions when offers or image placements change. Keep essential context with the image so a shorter card does not imply a broader claim than the full page.",
        "what is included in website maintenance",
        "maintenance"
      ]
    ]
  },
  {
    "id": "sullivan",
    "audience": "Businesses relying on an external booking destination",
    "title": "Provide a useful next step when the booking provider is unavailable",
    "focus": "An external booking link can fail while the main website still loads normally. Decide what information the customer needs when they cannot see availability or complete a reservation. Offer an approved contact route for assistance, but make clear whether that route merely requests help or can actually confirm a booking. Ask the customer not to submit duplicate payment attempts when the status is uncertain, using wording appropriate to the business’s actual process. Identify who checks the provider and who removes a temporary notice once service returns. A fallback should preserve useful context without creating a second uncoordinated booking record or pretending that the website team controls an outside provider’s recovery time.",
    "briefs": [
      [
        "An unavailable calendar in Claremont",
        "Fictional example: a Claremont studio’s external calendar does not load. Its website provides an assistance contact and explains that a message is not a confirmed appointment. The receiving team can use the requested service and broad preference to help, without assuming it has checked live availability during the provider interruption."
      ],
      [
        "An uncertain completion in Newport",
        "Fictional example: a Newport customer reaches an error after attempting a reservation through an outside provider. The help instructions ask for the non-sensitive reference information the business can use to investigate. They do not tell the customer to pay again automatically or promise that an unseen reservation has already been canceled."
      ]
    ],
    "search": "Keep essential service and contact information on the main site so a search visitor has a useful route during an external interruption. A temporary provider problem does not require publishing multiple new search pages. If an outage notice is added, give it an owner and removal condition, and avoid unsupported claims about when normal booking will resume.",
    "task": [
      "Rehearse a booking-provider interruption",
      "Write separate instructions for a calendar that will not load and a submission with uncertain completion. Identify the information needed for assistance, the person who checks status and the condition for removing the notice.",
      [
        "Does the fallback confirm anything?",
        "How is an uncertain booking checked before retrying?",
        "Who verifies that the normal route works again?"
      ],
      "Two fallback messages and a recovery ownership checklist.",
      "Pretend the provider link is unavailable and find a useful help route without receiving a false reservation confirmation."
    ],
    "local": [
      [
        "Can a Sunapee inquiry replace a failed booking immediately?",
        "Only if the business has a real process for confirming availability and handling the request. Otherwise label it as assistance rather than a completed reservation."
      ],
      [
        "Should a Charlestown outage notice promise a recovery time?",
        "Publish a time only when the responsible provider or business has supplied an approved expectation. State uncertainty clearly instead of guessing."
      ]
    ],
    "faqs": [
      [
        "What does maintenance cover for an external booking link?",
        "Agree on link checks, notices and escalation responsibilities. Operating or repairing the external booking service is a separate responsibility unless explicitly included in the arrangement.",
        "what does website maintenance include",
        "maintenance"
      ],
      [
        "Should a designer plan for booking-provider failures?",
        "Yes, the customer journey should include a useful failure state and accurate assistance wording. That planning does not imply the designer can guarantee uptime or fix the provider itself.",
        "how to hire a good web designer",
        "approach"
      ],
      [
        "Does an unreliable booking link mean the whole site needs redesign?",
        "Not necessarily. A targeted fallback and clearer ownership may solve the immediate problem. Consider redesign if the site cannot explain the service or offer an independent contact route when the provider is unavailable.",
        "when to redesign your website",
        "repair"
      ]
    ]
  }
];
