import {money} from './shared.mjs';
import {statewideCountySearchQuestions} from './county-statewide-questions.mjs';

// Buyer questions informed by Semrush phrase_questions research, October 20.
// General US query estimates are not county-specific demand or ranking evidence.
// Local wording and answers are editorial adaptations, not exact-match claims.
export function countySearchQuestions(slug,o){
 const buildStart=`New website builds start at ${money(o.launch_site.public_price)}. The agreed pages, writing, features and integrations determine the scope; domain, hosting and paid tools are separate.`;
 const seoCost=`Improve is ${money(o.plans.improve.monthly_price)}/month and Grow is ${money(o.plans.grow.monthly_price)}/month. Both include Keep Running care checks and a separate round of small supplied edits. Keep Running is also available on its own for ${money(o.plans.keep_running.monthly_price)}/month.`;
 const pricing=['/pricing/','Compare current scope and prices'];
 const choosing=['/guides/custom-website-or-template/','Compare website approaches'];
 const redesign=['/guides/website-redesign-brief/','Prepare a redesign brief'];
 const migration=['/guides/website-migration-checklist/','Review the migration checklist'];
 const reporting=['/guides/seo-work-and-reporting/','See the SEO work and reporting'];
 const repair=['/guides/website-repair-or-redesign/','Compare repair and redesign'];
 const rows={
  kings:[
   ['How much does web design cost for a Brooklyn business?',`${buildStart} For a Brooklyn studio, we first agree which portfolio projects and services need their own pages, then price any booking or other additions before work starts.`,...pricing],
   ['How do I choose a web designer for a Brooklyn studio?','Compare relevant work, the proposed page plan, who writes the content, what you receive at handoff and how changes are priced. Ask how a portfolio visitor will reach the right service. A nearby address alone does not establish fit; I work with Brooklyn businesses online from Buffalo.',...choosing],
   ['Can you redesign a portfolio while protecting its existing SEO?','We first identify useful project URLs, search landing pages and inquiry routes. Keep addresses that still serve a purpose, map necessary redirects, and check titles, internal links and the sitemap before launch. Existing visibility can change, so we agree the migration checks and review available search data afterward.',...migration]
  ],
  queens:[
   ['What does a new website for a Queens business cost?',`${buildStart} A service offered in several Queens neighborhoods may need one clear coverage section rather than a separate paid page for every name. We agree the useful page list first.`,...pricing],
   ['What does responsive web design mean for my Queens customers?','The service choices, location details and contact route need to remain usable on different screen sizes. I check text, navigation and forms at phone and desktop widths. For an appointment business, the address and booking requirements should remain easy to find before someone submits a request.',...choosing],
   ['What local SEO work would you do for a Queens service business?','The agreed work can include service and neighborhood research, clearer page content, titles, internal links and technical corrections within the available access. Coverage should reflect accepted work, and public business details should agree. Separate profile services require their own scope and a genuinely eligible business.',...reporting]
  ],
  'new-york':[
   ['How should a Manhattan firm choose a web design agency or independent designer?','Ask how the site will explain your capabilities to a buyer who must share them internally. Compare the proposed writing, approvals, accessibility checks, ownership, support and full scope. I provide an independent studio process online from Buffalo; the proposal makes responsibilities and deliverables explicit.',...choosing],
   ['How long would a Manhattan website redesign take?','Timing depends on the agreed pages, integrations, access and the people approving the work. For a professional firm, collecting approved capability statements and resolving who signs off are useful early steps. The proposal confirms the start, reviews and delivery dates; delayed inputs or added work can extend them.',...redesign],
   ['How much does ongoing SEO for a Manhattan business cost?',`${seoCost} We select work around the firm's actual services and buyer questions. The written plan defines the research, improvements and reporting; it does not promise a position for competitive Manhattan searches.`,...pricing]
  ],
  suffolk:[
   ['When should a Suffolk seasonal business start a website redesign?','Plan backward from the date customers need current information. Confirm the offering, approved dates, booking tools and review availability before agreeing the build schedule. A narrow update to a seasonal page may be sufficient; a full redesign should solve a larger problem with the website.',...redesign],
   ['How much does local SEO cost for a Suffolk County business?',`${seoCost} Long Island is a broad label, so the work should explain the services and parts of Suffolk you actually cover. We agree which improvements are most useful within the selected plan.`,...pricing],
   ['Could changing my Suffolk website affect existing search traffic?','A redesign can change the pages and links search engines already know. Review useful service and seasonal URLs, preserve relevant content, map redirects for changed addresses and check the published sitemap. Expired offers need a clear status and next step; repeating town names is not a substitute for that work.',...migration]
  ],
  bronx:[
   ['How much does a website for a Bronx business cost?',`${buildStart} For a Bronx service business, a clear service menu and practical inquiry route may be more useful than a large collection of neighborhood pages. We define those decisions before choosing a package.`,...pricing],
   ['Will customers be able to use the website on a phone?','Responsive design adapts the layout to the available screen. I also check the tasks inside it: finding a service, reading the coverage rule, using navigation and completing the inquiry. A Bronx neighborhood name should fit naturally in the location question without forcing the customer to choose an incorrect city.',...choosing],
   ['How do I know whether my existing site needs a redesign?','Start with the failed customer task. If callers cannot find a service or the form is broken, a focused repair may be enough. If the structure, writing and contact paths no longer describe the business, a broader redesign may fit. We review the current site before recommending the scope.',...repair]
  ],
  nassau:[
   ['What should I compare when choosing a web designer in Nassau County?','Compare how the proposed site connects each service with the right location and appointment route. Ask who writes and checks the content, how integrations are tested, which files you receive and what future changes cost. My work is delivered online from Buffalo with the agreed scope recorded in writing.',...choosing],
   ['What would monthly SEO for my Nassau business cost?',`${seoCost} For a business with multiple appointment locations, the plan can prioritize accurate service information and clear links to the correct contact route. The selected work and reporting are agreed in writing.`,...pricing],
   ['How can a redesign protect useful service and location pages?','Inventory the pages customers already use, including location and appointment URLs. Retain useful addresses where possible and map redirects for those that change. Check the links, forms, titles and sitemap on the published site, then review available search data. These steps manage migration risk without guaranteeing unchanged rankings.',...migration]
  ],
  westchester:[
   ['How much does it cost to redesign a Westchester business website?',`Redesign scope starts with a review of what can be retained. If a new build is appropriate, website packages start at ${money(o.launch_site.public_price)}; repairs and integrations are scoped separately. Approved project examples, required pages and the inquiry process determine the proposal, not the county name.`,...pricing],
   ['What affects the schedule for a Westchester website redesign?','The page list, approved project photographs, writing inputs, integrations and review turnaround all affect timing. For a property or project business, agree which examples can be published and what a customer must prepare before requesting a quote. I confirm delivery dates in the proposal after those requirements are clear.',...redesign],
   ['How would you improve local SEO for a Westchester service business?','Start with the work accepted, customer locations and the information needed before a proposal. Improve useful existing service pages, descriptive titles and links between relevant pages. Track completed changes and available search queries and inquiries. Any project evidence must be accurate and approved for publication.',...reporting]
  ],
  richmond:[
   ['How much does a Staten Island business website cost?',`${buildStart} We agree the service pages and how customers should describe a Staten Island job, including any work accepted beyond the island. Extra features are priced before they are added.`,...pricing],
   ['What would local SEO services include for a Staten Island business?','The agreed work can cover service and location research, useful page writing, titles, internal links and technical fixes. The site should use Staten Island naturally while keeping the actual business address accurate. Coverage beyond the island needs a clear rule; it should not be implied by a list of place names.',...reporting],
   ['Do I need to change my website addresses during a redesign?','Only where a change serves a clear purpose. We first review existing service pages and their links. If an address changes, map a relevant redirect and update navigation and the sitemap. Keeping useful URLs can reduce avoidable migration work, but no redesign can promise that search positions will remain unchanged.',...migration]
  ],
  broome:[
   ['How do I choose a web designer for a Binghamton business?','Ask how the designer will explain your capabilities and collect a useful project brief. Compare writing responsibilities, the proposed page list, review rounds, ownership and maintenance arrangements. A technical business should also agree what customers can safely share in a first inquiry before adding upload tools.',...choosing],
   ['What does a website for a Broome County business cost?',`${buildStart} For a Binghamton specialist or supplier, the scope may center on capabilities, approved examples and quote requirements. We decide which details belong on the website and which can follow in a private conversation.`,...pricing],
   ['How can I check the website files I receive at handoff?','Confirm that the agreed source files, assets and operating notes are included, that you have the required accounts and access, and that a developer can follow the build and publishing instructions. The source-handoff example shows the kind of record to review; third-party services and their fees remain separate.','/work/source-handoff/','See the source-handoff example']
  ],
  ulster:[
   ['How long does a Kingston or Ulster County website redesign take?','The proposal sets dates after the pages, access, booking tools, business facts and review responsibilities are agreed. For a visitor-facing business, approved opening dates and offering details should be ready before the intended launch window. Changes in those inputs or in scope can extend the schedule.',...redesign],
   ['How often should a seasonal business redesign its website?','Use the condition of the site and the customer task, not a fixed annual rule. Current dates, booking links or availability may only need an update. A redesign becomes more useful when the structure, mobile experience or service explanations no longer support the business. We review what still works first.',...repair],
   ['What does ongoing SEO for an Ulster County business cost?',`${seoCost} Kingston and other location references should support an actual offering or visit decision. The plan can prioritize current service details, useful content and a working route to booking or inquiry.`,...pricing]
  ],
  schenectady:[
   ['How do I choose a web designer for a Schenectady specialist business?','Compare how each proposal explains your specialties and distinguishes new project inquiries from existing-customer requests. Review the writing, proof approvals, form handling, source ownership and ongoing costs. I agree those responsibilities in writing and deliver the work online from Buffalo.',...choosing],
   ['When is it time to redesign an existing Schenectady website?','A redesign may fit when several parts of the site no longer explain the services or support customer tasks. An isolated broken form, missing page or unclear heading may need a focused correction instead. We identify the problem, what can be retained and the checks needed before choosing the scope.',...repair],
   ['What would you actually change during SEO work?','The plan selects agreed improvements, such as a clearer specialty page, useful customer answers, better titles or internal links, and technical fixes within the available access. Each completed change is recorded alongside available search and inquiry signals. A list of keywords alone is not the deliverable.',...reporting]
  ],
  rensselaer:[
   ['How much does a website for a Troy business cost?',`${buildStart} For a business operating around Troy and Rensselaer County, we first distinguish the public location, service area and purpose of any other venue. That helps define the pages and inquiry details the site actually needs.`,...pricing],
   ['Can a Troy website redesign preserve its useful SEO content?','We review existing service pages, location information and links before deciding what changes. Keep useful material current, retain suitable URLs and map redirects where necessary. After launch, check the sitemap, contact paths and available search data. Migration planning reduces avoidable errors without guaranteeing traffic levels.',...migration],
   ['How should I compare web designers for a business with several locations?','Ask how each location will be explained and maintained, who supplies approved details, and how customers will reach the right service. Compare writing, integrations, ownership and future change costs as part of the proposal. Extra pages should answer different customer needs rather than repeat the same copy.',...choosing]
  ],
  chautauqua:[
   ['How often should a Jamestown or Chautauqua business redesign its site?','There is no useful fixed interval for every business. Check whether service information is current, phone navigation works and customers can reach the right inquiry. A seasonal business may need dated content maintained more often than its underlying design. Larger structural problems may justify a redesign.',...repair],
   ['How should a seasonal business plan a website redesign timeline?','Work backward from when customers need the current offering, then allow for approved content, access, feedback and launch checks. Decide what happens to expired pages and booking links. I confirm the schedule in the proposal once the work and responsibilities are agreed; new scope or late inputs can change it.',...redesign],
   ['How much does SEO for a Chautauqua County business cost?',`${seoCost} For a business with seasonal and year-round work, we can prioritize useful service pages and dated content that needs a clearer status. The plan identifies the agreed improvements and evidence to review.`,...pricing]
  ],
  oswego:[
   ['Why does responsive design matter for an Oswego booking website?','A phone visitor should be able to read the offering, requirements and availability rules before choosing a booking or inquiry route. Responsive layout helps the page fit the screen; checking the form, navigation and confirmation message verifies whether the customer can complete the task.',...choosing],
   ['Should I redesign the website or fix the reservation process first?','If the main issue is an unclear booking link, a broken form or a misleading confirmation, start by reviewing that flow. A focused repair may solve it. A broader redesign may fit when the service information and page structure also need to change. The scope follows the actual problem.',...repair],
   ['What would local SEO work include for an Oswego County business?','The agreed work can clarify the services, city or county context, visit requirements and the path to an inquiry. It can also include titles, internal links and technical corrections within the available access. I record the changes and review available search and inquiry signals; a search position is not promised.',...reporting]
  ],
  ontario:[
   ['What does a website for an Ontario County, New York business cost?',`${buildStart} We plan the services and customer tasks around the actual business, with Canandaigua, Geneva, Victor or other relevant places used to clarify its New York coverage. Extra integrations are agreed separately.`,...pricing],
   ['How can I redesign the site without creating avoidable SEO problems?','Identify useful landing pages, confirm the New York location details and preserve suitable URLs. Map redirects for necessary changes and check titles, navigation, contact paths and the sitemap before and after launch. Review available search data afterward; protecting useful content does not guarantee unchanged rankings.',...migration],
   ['What local SEO improvements would help customers understand my location?','Use accurate business details and clear service information, with Ontario County, New York stated where it resolves ambiguity. Canandaigua, Geneva and Victor references should describe actual coverage or a visit decision. The agreed work can improve those pages and their internal links, then record what changed.',...reporting]
  ]
 };
 return rows[slug]||statewideCountySearchQuestions(slug,o);
}
