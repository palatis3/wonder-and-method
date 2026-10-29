import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Exact reviewed V3 offer changes only: two 40/30/30 payment answers and the
// Roadmap/repair separation plus two timing answers. Historical baselines stay immutable.
// Every complete after-record is verified before its exact predecessor is replayed.
const reviewed = [
  {
    "path": "/areas/massachusetts/barnstable-county/",
    "beforeSha256": "b7fbae9bc46db25eb2185a0a37d4376372c7c9c93c8e09366495ba7cc1cb3bd7",
    "afterSha256": "e37dd1782811e351755e5a081757e3ea474203cdab4cfc6e5ddcc1ac027b937b",
    "before": [
      {
        "question": "Can you write project descriptions from rough notes?",
        "answer": "Yes. Complete writing is included for the pages we agree to build. Send your own project notes, approved photographs and a clear account of your contribution; they do not need to arrive as polished case studies. I turn that material into drafts for your factual approval. Original photography and new field research are separate.",
        "links": [
          {
            "path": "/services/web-design/",
            "label": "Website writing and build scope"
          }
        ]
      },
      {
        "question": "When do I pay for the website, and what do I approve first?",
        "answer": "For a new website, the payment stages are 50% after you approve the proposal, 30% after written design approval and 20% after you approve the working site, before launch. We agree on the pages, features and review dates first. Silence does not count as approval, and additions need an agreed price.",
        "links": [
          {
            "path": "/payments/",
            "label": "Website payment stages"
          }
        ]
      }
    ],
    "after": [
      {
        "question": "Can you write project descriptions from rough notes?",
        "answer": "Yes. Complete writing is included for the pages we agree to build. Send your own project notes, approved photographs and a clear account of your contribution; they do not need to arrive as polished case studies. I turn that material into drafts for your factual approval. Original photography and new field research are separate.",
        "links": [
          {
            "path": "/services/web-design/",
            "label": "Website writing and build scope"
          }
        ]
      },
      {
        "question": "When do I pay for the website, and what do I approve first?",
        "answer": "For a new website, the payment stages are 40% after you approve the proposal, 30% after written design approval and 30% after you approve the working site, before launch. We agree on the pages, features and review dates first. Silence does not count as approval, and additions need an agreed price.",
        "links": [
          {
            "path": "/payments/",
            "label": "Website payment stages"
          }
        ]
      }
    ]
  },
  {
    "path": "/areas/massachusetts/berkshire-county/",
    "beforeSha256": "e6f2aa36b481a086f3a667a41215eb14ad42d86b2fd27e9099b3798459e22726",
    "afterSha256": "4b555cd5a6ff8088c3b4a488fb67932db062d8f616c4ebb4fa13c95e07f0e1f9",
    "before": [
      {
        "question": "Can you reorganize my service pages without discarding their old links?",
        "answer": "I can review which existing addresses should stay and which need a relevant replacement. Bring a list of current pages and important links before we agree on the redesign. Redirect work is bounded by the chosen package or a separate migration quote; a redesign does not include an unlimited search for every old address.",
        "links": [
          {
            "path": "/services/website-redesign/",
            "label": "Plan a website redesign"
          }
        ]
      },
      {
        "question": "What if the review finds no safe small fix?",
        "answer": "Before payment, I check whether a first small fix looks practical. If the review shows no safe contained fix, you still receive the findings, ordered next steps, limitations and the reason no fix was made. The review fee covers that work; unexpected blockers follow the agreed replacement-work or refund terms for work not done.",
        "links": [
          {
            "path": "/services/website-audit/",
            "label": "Website reviews and fixes"
          }
        ]
      }
    ],
    "after": [
      {
        "question": "Can you reorganize my service pages without discarding their old links?",
        "answer": "I can review which existing addresses should stay and which need a relevant replacement. Bring a list of current pages and important links before we agree on the redesign. Redirect work is bounded by the chosen package or a separate migration quote; a redesign does not include an unlimited search for every old address.",
        "links": [
          {
            "path": "/services/website-redesign/",
            "label": "Plan a website redesign"
          }
        ]
      },
      {
        "question": "What if the review finds no safe small fix?",
        "answer": "The Website Roadmap delivers findings, priorities and limitations, with no implementation included. A Repair Sprint or Single Website Fix needs a reproduced problem, supported access and agreed acceptance checks before booking. If new dependencies change an accepted repair scope, I explain the options and agree a remedy before extra charges; unearned work is reconciled under the written agreement.",
        "links": [
          {
            "path": "/services/website-audit/",
            "label": "Website reviews and fixes"
          }
        ]
      }
    ]
  },
  {
    "path": "/areas/suffolk-county/",
    "beforeSha256": "0347ff5f41d36c1629b4214be4a14985941c060d4fb1575d6507341fcdca23c4",
    "afterSha256": "b51368554d0cd555afad4a3d1a30c3fd74ae38ebc1843619281c04b2ba65c36a",
    "before": [
      {
        "question": "When should I start a website project before my busy season?",
        "answer": "Work backward from the date customers need the updated information, leaving time to approve content, provide account access and review the site. Published build estimates cover production work, with review time added. Each of the two review rounds allows up to five business days. Your proposal sets the dates; missing booking details or extra scope can move them.",
        "links": [
          {
            "path": "/guides/website-redesign-timeline/",
            "label": "Allow for preparation and review time"
          }
        ]
      },
      {
        "question": "How do I choose a monthly SEO budget after the booking path is clear?",
        "answer": "Start with the work you want completed and the information you can approve each month. Improve includes one substantial researched improvement; Grow includes two connected improvements and an extra approved-content graphic or newsletter excerpt. Both include care, while Keep Running alone focuses on checks and supplied small updates. Current prices and the exact scope are confirmed before enrollment.",
        "links": [
          {
            "path": "/pricing/",
            "label": "Compare current monthly plans"
          }
        ]
      }
    ],
    "after": [
      {
        "question": "When should I start a website project before my busy season?",
        "answer": "Work backward from the date customers need the updated information, leaving time to approve content, provide account access and review the site. Planned delivery includes two business days for each consolidated review. Your plan states the review rounds; silence is never approval. Your proposal sets the dates; missing booking details or extra scope can move them.",
        "links": [
          {
            "path": "/guides/website-redesign-timeline/",
            "label": "Allow for preparation and review time"
          }
        ]
      },
      {
        "question": "How do I choose a monthly SEO budget after the booking path is clear?",
        "answer": "Start with the work you want completed and the information you can approve each month. Improve includes one substantial researched improvement; Grow includes two connected improvements and an extra approved-content graphic or newsletter excerpt. Both include care, while Keep Running alone focuses on checks and supplied small updates. Current prices and the exact scope are confirmed before enrollment.",
        "links": [
          {
            "path": "/pricing/",
            "label": "Compare current monthly plans"
          }
        ]
      }
    ]
  },
  {
    "path": "/areas/ulster-county/",
    "beforeSha256": "0f2f9328d059148508b43e4eb0588bbd4b8f33cd4c127e0806e2eb518ad5dee6",
    "afterSha256": "bb98182182c6bd5ded51b863e258e5ae2e2fcb654f511911b53e64b962e154bd",
    "before": [
      {
        "question": "How much review time should I allow before a new session season launches?",
        "answer": "Allow for two website review rounds, each with up to five business days for your response, in addition to the planned build work. Your session descriptions, approved dates and required account access must be ready first. The proposal records the schedule; late offering changes or a new feature can change the launch date rather than silently becoming included work.",
        "links": [
          {
            "path": "/guides/website-redesign-timeline/",
            "label": "Plan approval and launch time"
          }
        ]
      },
      {
        "question": "Is updating class dates the same work as monthly SEO?",
        "answer": "Routine supplied date or link changes can fit the agreed small-update work in care. Monthly SEO plans add researched improvements such as a substantial service-page rewrite or a useful guide, with writing, implementation and checks. We choose the outcome before the month begins, rather than counting the same calendar edit as both routine care and a substantial improvement.",
        "links": [
          {
            "path": "/services/seo/",
            "label": "Care versus researched improvements"
          }
        ]
      }
    ],
    "after": [
      {
        "question": "How much review time should I allow before a new session season launches?",
        "answer": "Allow two business days for each consolidated review, already included in the planned delivery window. Your selected plan states the review rounds, and launch requires your explicit approval. Your session descriptions, approved dates and required account access must be ready first. The proposal records the schedule; late offering changes or a new feature can change the launch date rather than silently becoming included work.",
        "links": [
          {
            "path": "/guides/website-redesign-timeline/",
            "label": "Plan approval and launch time"
          }
        ]
      },
      {
        "question": "Is updating class dates the same work as monthly SEO?",
        "answer": "Routine supplied date or link changes can fit the agreed small-update work in care. Monthly SEO plans add researched improvements such as a substantial service-page rewrite or a useful guide, with writing, implementation and checks. We choose the outcome before the month begins, rather than counting the same calendar edit as both routine care and a substantial improvement.",
        "links": [
          {
            "path": "/services/seo/",
            "label": "Care versus researched improvements"
          }
        ]
      }
    ]
  },
  {
    "path": "/areas/tennessee/hamilton-county/",
    "beforeSha256": "03d88bc8ac64ddfed2fdffccb632c21f34feac61dd5acd17b79b8b15be43270c",
    "afterSha256": "28464d82219ba7da4fdb6884a416df2f0b68c93e92d8a4ce365c23d8da0133be",
    "before": [
      {
        "question": "When are payments due for my website project?",
        "answer": "For a new website, the stages are 50% after you approve the written proposal, 30% after written design approval and 20% after approval of the working site, before launch. The proposal names the scope and reviews. Silence is not approval and does not trigger the next payment; additional work requires an agreed price.",
        "links": [
          {
            "path": "/payments/",
            "label": "Website payment stages"
          }
        ]
      },
      {
        "question": "What happens to the website files if the project stops early?",
        "answer": "After the account is settled, the existing paid website work is delivered within five business days, with the relevant files, operating notes and unfinished items identified. Third-party materials keep their license terms, and connected accounts still need their own transfer or access arrangements. Stopping the project does not turn incomplete work into a finished launch.",
        "links": [
          {
            "path": "/work/source-handoff/",
            "label": "Paid-work delivery and unfinished items"
          }
        ]
      }
    ],
    "after": [
      {
        "question": "When are payments due for my website project?",
        "answer": "For a new website, the stages are 40% after you approve the written proposal, 30% after written design approval and 30% after approval of the working site, before launch. The proposal names the scope and reviews. Silence is not approval and does not trigger the next payment; additional work requires an agreed price.",
        "links": [
          {
            "path": "/payments/",
            "label": "Website payment stages"
          }
        ]
      },
      {
        "question": "What happens to the website files if the project stops early?",
        "answer": "After the account is settled, the existing paid website work is delivered within five business days, with the relevant files, operating notes and unfinished items identified. Third-party materials keep their license terms, and connected accounts still need their own transfer or access arrangements. Stopping the project does not turn incomplete work into a finished launch.",
        "links": [
          {
            "path": "/work/source-handoff/",
            "label": "Paid-work delivery and unfinished items"
          }
        ]
      }
    ]
  }
];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const v3OfferFaqPaths=Object.freeze(reviewed.map(row=>row.path));
export function beforeReviewedV3OfferFaqCollection(current){
 const before=structuredClone(current);
 for(const row of reviewed){
  assert.deepEqual(current[row.path],row.after,row.path+' reviewed V3 FAQ current record');
  assert.equal(hash(current[row.path]),row.afterSha256,row.path+' reviewed V3 FAQ current hash');
  assert.equal(hash(row.before),row.beforeSha256,row.path+' historical FAQ hash');
  before[row.path]=structuredClone(row.before);
 }
 return before;
}
