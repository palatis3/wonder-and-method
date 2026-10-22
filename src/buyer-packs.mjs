import {normalizeOfferCatalog} from './offer-catalog.mjs';
import {escapeHtml as e, money} from './shared.mjs';
import {annualEnrollmentAvailable, acceptedAnnualTerms, baselineEnrollmentNote, monthlyPlanDetails, monthlyPauseSummary} from './monthly-content.mjs';
import {offerSummary} from './offer-summary.mjs';

const ids = ['launch_site', 'focused_site', 'signature_site', 'keep_running', 'improve', 'grow', 'audit_fix_sprint', 'website_baseline'];
const rows = (title, items, options = {}) => ({title, items: (Array.isArray(items) ? items : [items]).filter(Boolean), ...options});
const payments = p => p.payment_schedule.map(m => money(m.amount) + ' — ' + m.event + ' (' + m.percent + '%)');
const providerCosts = 'You pay hosting, domain and paid-tool providers directly. Before booking, I list the actual plans, renewal dates, usage limits, taxes and any approved extra work with you. Outside costs are confirmed before you commit.';

const buyerHeadings={'At a glance':'Is this right for me?','Not included':'What costs extra?','Launch and acceptance':'How do I review and launch?','Ownership, correction and cancellation':'What happens after delivery or if I stop?','Before enrollment':'What needs checking before I pay?','Acceptance and evidence':'How do I approve the work?','Payments and renewal':'When do I pay or pause?','Ownership and exit':'What happens if I leave?','Before any payment':'What happens before I pay?','Acceptance and correction':'How are the fixes checked?','Outside costs':'Which outside bills do I pay?','Cancellation and unearned funds':'What if the work cannot be finished?','Optional website add-ons':'Need more than this includes?'};
export const packSectionTitle = section => section.label || buyerHeadings[section.title] || section.title;

// Check the content shared by HTML and TXT; rendering must not silently drop a rule.
export function assertUniquePackSentences(packs) {
 const segmenter = new Intl.Segmenter('en', {granularity:'sentence'});
 for (const pack of packs) {
  const seen = new Map();
  for (const section of pack.sections) for (const item of section.items) {
   for (const {segment} of segmenter.segment(item)) {
    const sentence = segment.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
    if (!sentence) continue;
    if (seen.has(sentence)) throw Error(`Duplicate sentence in ${pack.id}: ${segment.trim()} (${seen.get(sentence)} / ${section.title})`);
    seen.set(sentence, section.title);
   }
  }
 }
}

function buildInclusions(p, id) {
 const guides = p.launch_content.articles, graphics = p.graphic_counts, signature = id === 'signature_site';
 return [
  `Up to ${p.marketing_page_cap} pages, each with its own page link.${guides ? ` Includes ${guides} researched articles or guides, written and published at launch within that total.` : ' An agreed article can replace another page; no separate guide allocation.'} Sections count within their page; related pages may share a layout. Supplied plain policy pages are outside the limit; legal writing is separate. Agree the page list before booking; no filler pages are needed.`,
  'Complete writing for every agreed page and useful FAQs, from your verified facts or rough drafts. No word-count ceiling or padding; larger packages allow deeper service coverage. You approve facts and claims and supply licensed assets. Original field research is separate.',
  p.seo_foundation,
  `${signature ? 'One custom animated homepage feature or 3D centerpiece: one concept, scene and final web output, with lightweight mobile, still and reduced-motion versions. Agree references, duration and performance limits before production; the same two review rounds cover it. ' : 'Custom design and purposeful interface animation, with mobile and reduced-motion versions. '}${graphics.launch} announcement graphic${graphics.launch === 1 ? '' : 's'}${graphics.promotional ? ` and ${graphics.promotional} promotional graphic${graphics.promotional===1?'':'s'} for agreed uses (${graphics.total} distinct designs total), ${graphics.supplied_photo_edits} supplied-photo edits, a color-and-font guide, clean existing-logo files and a social profile picture. Resizing does not count as another graphic; final images are included, editing templates and presentation decks are separate.` : ', plus a simple color-and-font guide.'} Includes a browser-tab icon, branded image for shared page links from approved assets and page-sharing checks. Extra variants, identity redesign and original photography are separate.${signature ? ' Complex simulations, characters, multiple productions and custom interactive 3D are separate.' : ' A custom animated homepage feature or 3D centerpiece is separate.'}`,
  `${p.forms} contact form${p.forms === 1 ? '' : 's'}, each with up to six agreed fields, one receiving inbox and one confirmation. Includes basic spam protection and checks that a message saves, notifies the recipient and confirms submission. Sensitive information and file uploads need separate assessment.`,
  `Up to ${p.external_connection_limit} agreed booking or newsletter links or compatible standard embeds, using active accounts you supply. I check the customer path. Outside account setup, campaigns, automation, payments and account management are separate. If an embed is unsafe, agree a link or separately priced alternative before booking.`,
  p.redirect_limit,
  p.training
 ];
}

function monthlyInclusions(o, id, terms) {
 const p=o.plans[id], grow=id==='grow';
 const care=terms.included.slice(0,3);
 if (!p.priorities) return [...care, 'A monthly report of checks, changes, open issues and one practical next step. Keep Running does not include an SEO improvement, regular planning call or ongoing keyword or content campaign.'];
 return [...care,
  `${p.priorities} completed ${grow?'related improvements':'improvement'} each month: a service-page rewrite, researched article or guide, diagnosed search or technical repair, or clearer customer inquiry path. An eligible Google Business Profile batch, a full promotional graphic or newsletter draft and setup can replace an improvement by agreement; these are alternatives, not extra work.`,
  'Each improvement includes relevant research, complete writing from approved facts, editing, page titles and descriptions, internal links, implementation, one feedback round and checks. Website work is published; agreed drafts and images are delivered with approval status. Public posting or email sending needs your explicit approval.',
  p.search_scope.method,
  p.search_scope.metrics,
  grow ? 'A rolling 90-day plan, updated monthly, replaces the quarterly topic list; it plans future work and does not promise rankings or extra prepaid production.' : 'A future-topic list, refreshed quarterly.',
  `One ${grow?30:20}-minute call each month, or an equivalent written review. Research, planning, calls and reports support the improvements; they do not replace them.`,
  ...(grow ? [`One separate extra using approved content and existing branding: a graphic in up to ${p.promotion_reuse.graphic_sizes} sizes with a short caption, or a newsletter excerpt of up to ${p.promotion_reuse.newsletter_max_words} words. Includes one feedback round and file or text checks. No new concept, illustration, claims, email layout, account or campaign setup, testing or sending. A full graphic concept or newsletter setup can instead replace a main improvement.`] : []),
  `A monthly report links published work or delivered files, explains the choice and changes, records your approval of the facts, checks, available search and inquiry observations, missing access or decisions, and the next action. Pending approval is distinct from publication; inquiry clicks are not confirmed leads.${grow?' Each report reviews earlier improvements and updates the 90-day plan.':''}`
 ];
}

export function buyerPacks(o) {
 o=normalizeOfferCatalog(o);
 return ids.map(id => {
  const build = id.endsWith('_site'), monthly = Object.hasOwn(o.plans, id);
  const p = build ? o[id] : monthly ? o.plans[id] : id === 'audit_fix_sprint' ? o.audit_sprint : o.baseline;
  const base = {
   id, name: id === 'website_baseline' ? 'Website Baseline' : p.public_name,
   scopeStatus: 'Full details for a proposal. Sending a request does not book work, accept terms or make a payment.',
   request: '/checkout/' + id.replaceAll('_','-') + '/',
   summary:offerSummary(o,id),
   ...(monthly ? {baselineFee: o.baseline.one_time_price} : {}),
   ...(monthly && annualEnrollmentAvailable(o) ? {annual: p.annual} : {})
  };
  let sections;
  if (build) {
   sections = [
    rows('At a glance', [
     base.summary.fit,
     ...payments(p),
     `Planned build work: ${p.delivery_average}, once pages, facts, photos and access are ready. Your review time is additional; the written proposal sets start and launch dates. Added work can move these dates.`,
     'You can send future changes to me or use your own developer. The website has no drag-and-drop editor; discuss frequent self-editing before booking. We agree the website technology, hosting and who handles updates before work starts.'
    ]),
    rows('What the fee buys', buildInclusions(p,id), {label:'What you get'}),
    rows('Not included', [
     'Additional pages, features, creative assets, connection work and migrations need a separate agreed price. Ongoing care, content and search improvements are optional.',
     providerCosts + ' Provider seats, overages and transaction fees also remain yours.'
    ]),
    rows('Launch and acceptance', [
     'One launch to your supported hosting account includes domain connection, secure HTTPS access and agreed redirects; existing email settings are preserved. You complete provider identity, billing and recovery steps and give delegated access. Search setup does not promise indexing.',
     'Dated phone, keyboard, contrast, speed and contact-form checks record results, including delivery to the receiving inbox. I correct problems in the agreed work and list missing access, unavailable checks and unfinished items. This is not specialist certification or a real-world speed guarantee.',
     'Two review rounds cover the design and finished website. Your agreement names one approver, checks, version and review dates, with five business days per round unless agreed otherwise. Approve each stage in writing or send one list of unmet requirements. Silence never counts as approval or triggers payment. Missing inputs or reviews receive notice and revised dates. New directions, pages or features need an agreed price.',
     'Email updates, a dated work log, agreed reviews, a launch checklist and an account and provider list record progress.'
    ], {disclosure:true}),
    rows('Ownership, correction and cancellation', [
     'You own paid custom work and supplied assets and control production accounts from the start. Reusable components and outside software keep their licenses; export limits and operating rights are listed before booking. No studio subscription is required to keep paid work.',
     'Within five business days after paid completion or settling an early cancellation, you receive existing paid source files, hosting files where needed, approved text and images, dependencies, non-secret settings, build and publishing instructions, licenses, account details, completed checks and unfinished items, in a folder or ZIP. Connected services and passwords require separate account setup or secure transfer.',
     p.correction + ' Correcting faults does not use a review round.',
     o.ownership_and_billing.build_cancellation,
     'If a payment is late, I give notice before pausing new unpaid work. Your own assets and account access stay available. I do not disable your paid website over an unrelated service invoice.'
    ], {disclosure:true})
   ];
  } else if (monthly) {
   const terms = monthlyPlanDetails(o, id);
   sections = [
    rows('At a glance', [
     base.summary.fit,
     `Optional monthly service, paid in advance with no minimum term. First payment is ${money(p.monthly_price)} if a usable review is already available, or ${money(o.baseline.one_time_price+p.monthly_price)} with a new Website Baseline.`,
     baselineEnrollmentNote(o)
    ]),
    // Stable internal title; owner-facing HTML and TXT use the label.
    rows('Monthly units and advice', monthlyInclusions(o,id,terms), {label:'What you get each month'}),
    rows('Not included', ['Software updates, backups, restores and malware cleanup need separate support.','New pages or tools beyond the agreed improvements, large migrations, branding and specialist assessments cost separately.','You pay outside subscriptions, usage charges and tax directly; search or business results are not guaranteed.']),
    rows('Complete limits',terms.exclusions,{label:'Read the full limits',disclosure:true}),
    rows('Before enrollment', [
     p.priorities?'One supported website, one main market and one agreed monthly goal, with named accounts and website tools. I check that I can safely access, change and recover the site. Multiple locations, languages, new page layouts, unknown older applications, unreviewed plugins and complex systems need a separate scope.':'We name the website areas, contact path, tools and related small edits covered by care. I check that I can safely access, change and recover your site. Unreviewed plugins and complex applications need a separate scope; no platform is automatically covered.',
     o.monthly_terms.response,
     providerCosts
    ], {disclosure:true}),
    rows('Acceptance and evidence', [
     p.priorities
      ? `Agree each improvement${id==='grow'?' and the extra graphic or excerpt':''}, affected area, facts and completion checks before work. Record approval and anything unresolved. Silence is not acceptance.`
      : 'Agree the small edits and covered checks; record changes, results and unresolved access. Silence is not acceptance.',
     'The same work is never counted twice. My mistakes and already-promised launch work do not use paid monthly work. Unused supplied edits do not carry over.',
     'If I delay approved work, we agree a new date or refund.',
     ...(id==='grow'?['The second accepted improvement and extra graphic or excerpt remain owed if earlier work is delayed.']:[])
    ], {disclosure:true}),
    rows('Payments and renewal', [
     'Your proposal records the renewal date, time, timezone and written cancellation route. Cancel before renewal to stop the next invoice.',
     ...(p.priorities ? [
      monthlyPauseSummary(o),
      'A charge without approved useful work receives an unused-work refund or credit. Begun work and any unearned balance are itemized.'
     ] : [
      'The monthly fee covers the agreed checks even without supplied edits. If access prevents care, I notify you and agree the next step, itemize completed work and refund or credit any unearned balance.'
     ])
    ], {disclosure:true}),
    ...(annualEnrollmentAvailable(o) ? [rows('Annual prepayment', [
     `${money(p.annual.upfront_price)} paid upfront for ${p.annual.cycles} service periods; ${money(p.annual.monthly_equivalent)}/month equivalent, not a monthly charge. Save ${money(p.annual.saving_vs_12_monthly)} compared with twelve monthly invoices. Availability requires confirmed fit, capacity and the enrollment checks.`,
     o.annual_terms.payment, o.annual_terms.dates
    ])] : []),
    ...(annualEnrollmentAvailable(o) ? [rows('Annual cancellation terms',acceptedAnnualTerms(o).slice(1),{disclosure:true})] : []),
    rows('Ownership and exit', [
     'Your paid custom files, content and accounts remain yours under the listed licenses and provider export limits. Unfinished work you approved remains owed. Within five business days after paid completion or settled cancellation, I provide existing paid files and operating notes. Outside services and credentials need separate transfer or setup; new migration work is priced separately.',
     'Canceling care does not disable your paid website; an unrelated unpaid invoice cannot justify disabling it either. Your direct provider subscriptions continue or cancel as you instruct, under their own terms.'
    ], {disclosure:true})
   ];
  } else {
   const baseline = id === 'website_baseline';
   sections = [
    rows('At a glance', [
     base.summary.fit,
     ...payments(p),
     `One supported website with up to ${p.page_cap} agreed main pages, listed with dates before payment. Larger reviews need a separate assessment and price.`,
     baseline
      ? 'A website review and ordered fix list, with a first small fix when safe and feasible. You can buy this on its own; monthly care is optional.'
      : 'A website review and up to two agreed small fixes in total; this is not a Baseline fix plus two more.'
    ]),
    rows('Before any payment', [
     'Send your public website address and the problem. Before payment, I check that I can safely work on the site and explain the useful work, access needed, outside costs and dates. An unsuitable site creates no financial commitment.',
     'I need suitable access and a way to recover the website if a change fails. Static sites and existing WordPress, Wix, Squarespace or Webflow sites are assessed individually; no platform is automatically covered.'
    ]),
    // Stable internal title; owner-facing HTML and TXT use the label.
    rows('Included units', [
     baseline ? p.acceptance : 'You receive the review findings, before-and-after notes, retest results and an ordered list of remaining work. You approve completion in writing before the second payment.',
     ...(!baseline?[o.audit_sprint.fix_definition]:[]),
     ...(!baseline?['For an unexpected blocker, I explain the options and agree replacement work or a refund for work not done.']:[]),
     ...(baseline?['If you later start monthly care, the Baseline fix does not use that month’s included work.']:[]),
     baseline ? o.baseline.duplicate_rule : o.audit_sprint.baseline_rule
    ], {label:'What you get'}),
    rows('Not included', o.audit_sprint.boundaries.replace('data/security audits','data or security audits').replace('systems/templates','systems or templates')),
    rows('Acceptance and correction', [o.one_off_terms.acceptance, o.one_off_terms.correction]),
    rows('Outside costs', [o.one_off_terms.extra_costs.replace('Client pays vendors directly','You pay providers directly'), 'Your existing hosting, domain and tool contracts continue under their own terms. The one-off fee does not include or require a new year of hosting.']),
    rows('Cancellation and unearned funds', o.one_off_terms.remedy, {disclosure:true}),
    rows('Ownership and files', o.one_off_terms.ownership, {label:'Your files and accounts',disclosure:true})
   ];
  }
  sections.push(rows('Optional website add-ons', [
   'Need more? Add-ons are priced at https://wonderandmethod.com/services/website-addons/. Your included work stays included.'
  ]));
  return {...base, price: build ? p.public_price : monthly ? p.monthly_price : p.one_time_price, priceLabel: monthly ? '/month' : 'fixed fee', sections};
 });
}

export function packBody(pack) {
 const sections = pack.sections.map(section => {
  const content = '<ul>' + section.items.map(item => '<li>' + e(item).replace('https://wonderandmethod.com/services/website-addons/', '<a href="/services/website-addons/">the website add-ons price list</a>') + '</li>').join('') + '</ul>';
  const title=e(packSectionTitle(section));
  return section.disclosure
   ? '<details class="pack-terms"><summary>' + title + '</summary>' + content + '</details>'
   : '<section><h2>' + title + '</h2>' + content + '</section>';
 }).join('');
 return '<p class="pack-status">' + e(pack.scopeStatus) + '</p>' + (pack.id==='keep_running'?'<p><a class="text-link" href="/assets/buyer-packs/keep-running-sample">Read a sample Keep Running report</a></p>':'') + sections + '<p><a class="button" href="' + e(pack.request) + '">Request ' + e(pack.name) + '</a></p><nav class="related-links" aria-label="' + e(pack.name) + ' next steps"><a href="/contact/?offer=' + e(pack.id) + '&amp;request_kind=question#inquiry">Ask about ' + e(pack.name) + '</a><a href="/pricing/">Compare prices</a><a href="/payments/">Payments and cancellation</a></nav>';
}

export function buyerPackSection(o) {
 const packs = buyerPacks(o);
 return `<section class="studio-section buyer-packs" id="buyer-packs"><details><summary>Full details for each offer</summary><p>Review the included work, payments, responsibilities and cancellation terms before requesting a proposal.</p><div id="pack-selector-control" hidden><label for="pack-selector">Choose your offer</label><select id="pack-selector">${packs.map(p => `<option value="${p.id}">${e(p.name)}</option>`).join('')}</select></div>${packs.map(p => `<details class="buyer-pack" data-pack="${p.id}" id="pack-${p.id}"><summary>${e(p.name)} — ${money(p.price)} ${p.priceLabel}</summary><p><a href="/assets/buyer-packs/${p.id}">Full details for ${e(p.name)}</a> · <a href="/assets/buyer-packs/${p.id}.txt" download>Download plain text</a></p></details>`).join('')}</details></section>`;
}
