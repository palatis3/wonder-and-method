import {escapeHtml as e, money} from './shared.mjs';
import {annualEnrollmentAvailable, acceptedAnnualTerms, baselineEnrollmentNote, monthlyPlanDetails} from './monthly-content.mjs';
import {offerSummary} from './offer-summary.mjs';

const ids = ['launch_site', 'focused_site', 'signature_site', 'keep_running', 'improve', 'grow', 'audit_fix_sprint', 'website_baseline'];
const rows = (title, items, options = {}) => ({title, items: (Array.isArray(items) ? items : [items]).filter(Boolean), ...options});
const payments = p => p.payment_schedule.map(m => money(m.amount) + ' — ' + m.event + ' (' + m.percent + '%)');
const providerCosts = 'You pay hosting, domain and paid-tool providers directly. Before booking, I list the actual plans, renewal dates, usage limits, taxes and any approved extra work with you. Outside costs are confirmed before you commit.';

export function buyerPacks(o) {
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
   const graphics = p.graphic_counts, guides = p.launch_content.articles;
   const pageScope = p.page_scope.replace('Supplied plain policy pages are separate.', '').replace(/  +/g, ' ');
   const policiesExplained = /policy pages.*included.*outside.*count; legal drafting is separate/.test(pageScope);
   sections = [
    rows('At a glance', [
     p.purpose,
     `${money(p.public_price)} fixed studio fee. Up to ${p.marketing_page_cap} pages${guides ? `, including ${guides} articles or guides` : ''}; complete writing, search research and custom design. ${graphics.total} finished graphic${graphics.total === 1 ? '' : 's'} and ${p.forms} contact form${p.forms === 1 ? '' : 's'}.`,
     'You provide accurate business facts, approved assets and account access. I write the website content for your approval.',
     p.delivery_target,
     p.platform_fit + ' A drag-and-drop editor is not included.'
    ]),
    rows('What the fee buys', [
     pageScope,
     ...(!policiesExplained ? [p.policy_page] : []),
     p.copy,
     p.seo_foundation,
     p.launch_content.summary,
     p.creative,
     p.form_limit,
     p.module_summary,
     p.embedded_service_rule,
     p.redirect_limit,
     p.training
    ]),
    rows('Launch and acceptance', [
     o.provider_policy.setup,
     'The initial launch includes a browser-tab icon, a default branded sharing image and page-sharing checks; sitemap and search-access checks; domain, HTTPS and agreed redirects; and checks of the agreed booking or newsletter links. Existing email settings are preserved. Search setup is not a promise of indexing or rankings.',
     'You receive dated phone, keyboard, contrast, performance and contact-form checks, including whether a test message reached the receiving inbox. Missing access, unavailable checks and unfinished items are recorded.',
     p.quality_review,
     p.revisions.replace('In-scope defects are corrected separately.', 'Defects against the agreed work are corrected without using a review round or an extra charge.'),
     p.acceptance,
     o.ownership_and_billing.acceptance_and_delay,
     'Progress is recorded through email updates, a dated work log, agreed reviews, a launch checklist and an account/provider inventory. The accepted proposal names the pages, completion checks and approver.'
    ]),
    rows('Payments and outside costs', [...payments(p), providerCosts]),
    rows('Ownership, correction and cancellation', [
     p.ownership_boundary,
     p.handoff,
     p.correction,
     o.ownership_and_billing.build_cancellation,
     o.ownership_and_billing.late_payment
    ]),
    rows('Outside this scope', p.exclusions)
   ];
  } else if (monthly) {
   const terms = monthlyPlanDetails(o, id);
   sections = [
    rows('At a glance', [
     p.fit,
     `${money(p.monthly_price)}/month, paid in advance. Existing supported sites needing a new Website Baseline: ${money(o.baseline.one_time_price + p.monthly_price)} for the Baseline and first month. The ${money(o.baseline.one_time_price)} review covers up to ${o.baseline.page_cap} marketing pages; larger existing sites are assessed separately.`,
     'Monthly service is optional, with no minimum term. Your written proposal confirms the work, access, dates and outside costs before payment.'
    ]),
    rows('Before enrollment', [o.monthly_terms.eligibility, baselineEnrollmentNote(o), o.monthly_terms.response]),
    // Keep this section title stable for request-page consumers.
    rows('Monthly units and advice', terms.included),
    rows('Acceptance and evidence', terms.acceptance),
    rows('Payments and renewal', [...terms.renewal, providerCosts]),
    ...(annualEnrollmentAvailable(o) ? [rows('Annual prepayment', [
     `${money(p.annual.upfront_price)} paid upfront for ${p.annual.cycles} service periods; ${money(p.annual.monthly_equivalent)}/month equivalent, not a monthly charge. Save ${money(p.annual.saving_vs_12_monthly)} compared with twelve monthly invoices. Availability requires confirmed fit, capacity and the enrollment checks.`,
     o.annual_terms.payment, o.annual_terms.dates
    ])] : []),
    ...(annualEnrollmentAvailable(o) ? [rows('Annual cancellation terms',acceptedAnnualTerms(o).slice(1),{disclosure:true})] : []),
    rows('Ownership and exit', terms.exit),
    rows('Outside this scope', terms.exclusions)
   ];
  } else {
   const baseline = id === 'website_baseline';
   sections = [
    rows('At a glance', [
     `${money(p.one_time_price)} fixed fee for one supported website with up to ${p.page_cap} marketing pages.`,
     baseline
      ? 'A website review and ordered fix list, with a first small fix when safe and feasible. You can buy this on its own; monthly care is optional.'
      : 'A website review and up to 2 agreed small fixes in total, retested with before-and-after notes and an ordered list of remaining work.',
     'Send the public website address and the problem first. I confirm whether the work fits before requesting payment.'
    ]),
    rows('Before any payment', [
     o.one_off_terms.preflight,
     'Access, compatible tools and a recovery route must fit the task. Static sites and existing WordPress, Wix, Squarespace or Webflow sites are assessed individually; no platform is automatically covered.'
    ]),
    // Keep this title for request-page consumers; scope is stated only once.
    rows('Included units', [
     p.acceptance,
     baseline ? p.refinement : o.audit_sprint.fix_definition,
     baseline
      ? 'If you later start monthly care, the Baseline fix does not use that month’s included work.'
      : 'The review and fixes are one Sprint. Its limit is up to 2 fixes total, not a Baseline fix plus 2 more.',
     baseline ? o.baseline.duplicate_rule : o.audit_sprint.baseline_rule
    ]),
    rows('Acceptance and correction', [o.one_off_terms.acceptance, o.one_off_terms.correction]),
    rows('Payments and outside costs', [...payments(p), o.one_off_terms.extra_costs, 'Your existing hosting, domain and tool contracts continue under their own terms. The one-off fee does not include or require a new year of hosting.']),
    rows('Cancellation and unearned funds', o.one_off_terms.remedy),
    rows('Ownership and handoff', o.one_off_terms.ownership),
    rows('Outside this scope', o.audit_sprint.boundaries)
   ];
  }
  return {...base, price: build ? p.public_price : monthly ? p.monthly_price : p.one_time_price, priceLabel: monthly ? '/month' : 'fixed fee', sections};
 });
}

export function packBody(pack) {
 const sections = pack.sections.slice(1).map(s => {
  const content = `<ul>${s.items.map(item => `<li>${e(item)}</li>`).join('')}</ul>`;
  return s.disclosure
   ? `<details class="pack-terms"><summary>${e(s.title)}</summary>${content}</details>`
   : `<section><h2>${e(s.title)}</h2>${content}</section>`;
 }).join('');
 const s=pack.summary;
 const payment=s.monthly?'Monthly in advance; no minimum term':s.build?'50% to book · 30% after design approval · 20% after working-site approval':pack.id==='website_baseline'?'Before work, after fit is confirmed':'Half before work; half after written completion approval';
 return `<p class="pack-status">${e(pack.scopeStatus)}</p><p><a class="button" href="${e(pack.request)}">Request ${e(pack.name)}</a></p><section><h2>At a glance</h2><dl class="pack-glance"><dt>Price</dt><dd>${money(pack.price)} ${e(pack.priceLabel)}</dd><dt>Good for</dt><dd>${e(s.fit)}</dd><dt>Payments</dt><dd>${e(payment)}</dd>${s.build?`<dt>Average delivery</dt><dd>${e(s.offer.delivery_average)}, from the confirmed start with inputs ready. Reviews, missing inputs or added work can extend the dates.</dd>`:''}</dl></section><section><h2>What’s included</h2><ul>${s.points.map(point=>`<li>${e(point)}</li>`).join('')}</ul>${s.build?'<p>I write the website from your business facts. You approve its accuracy, provide licensed media and arrange account access. Two feedback rounds cover the design and working website. The website does not include a drag-and-drop editor; later changes need coding skills, a developer or optional monthly help.</p>':s.monthly?'<p>Send related small edits together. I agree each improvement with you before beginning it and report the finished work and anything still open. The same work never counts twice. Software updates, backups, restores and malware cleanup are separate.</p>':'<p>I confirm the website’s technology, access and safe recovery options before payment. Neither offer guarantees that every finding can be fixed. You receive an ordered list of any remaining work.</p>'}</section><section><h2>Before you commit</h2><p>${e(providerCosts)}</p><p>You keep your paid custom work and control your accounts. Existing paid website files and notes arrive within five business days after paid completion or settled cancellation. Provider licenses and account transfers still apply.</p><p>${s.build?'I correct faults in the agreed build for 30 days after launch.':s.monthly?'If I delay work you have paid for, I still need to finish it, agree a new date or refund it.':'I correct faults in the agreed work for 30 days after your written approval of its completion.'} Your written proposal confirms the work, dates and payment arrangements. Silence never counts as approval.</p>${s.monthly?`<p>${e(pack.sections.find(section=>section.title==='Before enrollment')?.items[1]||'')}</p>`:''}</section><details class="pack-terms"><summary>Complete work limits, payments and terms</summary>${sections}</details><nav class="related-links" aria-label="${e(pack.name)} next steps"><a href="/contact/?offer=${e(pack.id)}&amp;request_kind=question#inquiry">Ask about ${e(pack.name)}</a><a href="/pricing/">Compare prices</a><a href="/payments/">Payments and cancellation</a></nav>`;
}

export function buyerPackSection(o) {
 const packs = buyerPacks(o);
 return `<section class="studio-section buyer-packs" id="buyer-packs"><details><summary>Full details for each offer</summary><p>Review the included work, payments, responsibilities and cancellation terms before requesting a proposal.</p><div id="pack-selector-control" hidden><label for="pack-selector">Choose your offer</label><select id="pack-selector">${packs.map(p => `<option value="${p.id}">${e(p.name)}</option>`).join('')}</select></div>${packs.map(p => `<details class="buyer-pack" data-pack="${p.id}" id="pack-${p.id}"><summary>${e(p.name)} — ${money(p.price)} ${p.priceLabel}</summary><p><a href="/assets/buyer-packs/${p.id}">Full details for ${e(p.name)}</a> · <a href="/assets/buyer-packs/${p.id}.txt" download>Download plain text</a></p></details>`).join('')}</details></section>`;
}
