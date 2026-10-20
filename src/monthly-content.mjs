import {escapeHtml as e, money} from './shared.mjs';

export const annualEnrollmentAvailable = o => o.annual_enrollment_gate?.verified === true;
export const standardCareExclusion = 'CMS, plugin and theme software updates, backups and restores, and malware cleanup are not included in standard care. These need a separate suitability assessment or a specialist.';

export function baselineEnrollmentNote(o) {
 return `The ${money(o.baseline.one_time_price)} Website Baseline covers a supported existing website with up to ${o.baseline.page_cap} marketing pages. It includes a review, an ordered fix list and a first small fix if one is safe and feasible. A new paid studio build includes its baseline; a previous Website Baseline, studio build or Audit & Fix Sprint can remove this charge when its review is still usable. I confirm this before payment. Larger existing sites need an assessment and separately agreed review scope.`;
}

// Current sales copy and existing accepted annual agreements are separate.
// Keeping cancellation rights available does not activate new annual enrollment.
export function acceptedAnnualTerms(o) {
 return [
  'These terms apply only if you already have an accepted annual agreement. Your saved agreement determines its price and dates; this is not an offer to enroll.',
  'Annual payment covers twelve service periods, with the same monthly work and sequence. It does not bring twelve months of work forward. Any separately agreed Website Baseline is charged only when needed.',
  o.annual_terms.renewal,
  o.annual_terms.cancellation,
  o.annual_terms.refund_timing,
  o.annual_terms.hosting,
  o.annual_terms.build_rights
 ];
}

export function monthlyPlanDetails(o, id) {
 const p = o.plans[id];
 if (!p) throw Error('Unknown monthly plan');
 const grow = id === 'grow', improvement = p.priorities > 0;
 const included = [
  `${p.small_change_batches} round of small text, photo or link edits you supply each month, in existing parts of your website. Send related changes together; unrelated changes across the website are separate.`,
  'Automated website availability and security-certificate monitoring, a monthly check of the main contact path and agreed website tools, and search-health warnings where access allows.',
  'A quarterly website check of the agreed areas, not a new full audit.'
 ];
 if (improvement) {
  included.push(
   `${p.priorities} completed ${grow ? 'connected improvements' : 'improvement'} each month, chosen from your business needs and search research. Website writing, relevant page titles and descriptions, internal links, publication, one round of changes and checks are included for each selected improvement.`,
   p.search_scope.method,
   grow ? 'A rolling 90-day plan refreshed monthly; this replaces the quarterly topic list.' : 'A list of future topics, refreshed quarterly.',
   o.monthly_terms.priority,
   p.search_scope.metrics,
   `One ${grow ? 30 : 20}-minute call each month, or an equivalent written review. Research, planning, reporting and this review support the improvements; they do not replace them.`
  );
  if (grow) included.push(p.promotion_reuse.scope);
  included.push(p.reporting);
 } else {
  included.push('A short monthly report of checks, changes, open issues and one practical next step. No standing planning call or recurring keyword/content campaign is included. No main improvement is included.');
 }
 const acceptance = [
  improvement
   ? `Before work starts, agree each improvement${grow ? ' and the additional small graphic or newsletter excerpt' : ''}, the affected area, supplied facts, completion check and one round of changes. Record the published website change or delivered draft/asset, approval status, checks and any unresolved access. Silence is not acceptance.`
   : 'Agree the round of small edits and covered checks. Record what changed, the check results and any unresolved access. Silence is not acceptance.',
  'The same work is never counted twice. Correcting my own mistakes or completing already-promised launch work does not use paid monthly work.',
  'An unused round of supplied edits does not carry over. Accepted work delayed by me remains owed; we agree a new date or refund.',
  ...(grow ? ['The second accepted improvement and accepted extra graphic or excerpt remain owed if earlier work is delayed; neither is silently dropped.'] : [])
 ];
 const renewal = [
  `${money(p.monthly_price)}/month, billed in advance with no minimum term. Your proposal records the exact renewal time and timezone, payment date and written cancellation route. Cancel before renewal to stop the next invoice.`,
  improvement
   ? 'Five business days before the next service period, we confirm useful improvement work and ready inputs. If none is agreed, the next monthly invoice pauses. Missing inputs receive notice. Before a pause, I agree with you in writing what happens to included care; there is no automatic replacement charge, and paid work remains due.'
   : 'The monthly fee covers the agreed checks even when you send no edits. If access prevents the agreed care, I notify you so we can agree the next step and settle any unearned work.',
  improvement ? 'A charge without approved useful improvement work receives an unused-work refund or credit. Begun work and any unearned balance are itemized; accepted work delayed by me remains owed.' : 'The agreed monitoring and checks are paid work, even if you send no edits. If I cannot provide the agreed care, I itemize completed work and refund or credit any unearned balance.'
 ];
 const exit = [
  o.monthly_terms.exit,
  'I provide the existing paid website files, content and operating notes within five business days after paid completion or settled cancellation. This does not automatically transfer external services or credentials; account access, licenses and export limits still apply.',
  'New migration work is assessed separately. Canceling care does not disable your paid website, and your direct provider bills follow those providers’ terms.'
 ];
 const exclusions = [...o.monthly_terms.excluded];
 if (!exclusions.some(text => /backups? and restores|backups?\/restores/i.test(text))) exclusions.unshift(standardCareExclusion);
 return {included, acceptance, renewal, exit, exclusions};
}

export function monthlySearchMethod(o, {id = 'keyword-opportunities'} = {}) {
 return `<section class="studio-section" id="${e(id)}"><p class="eyebrow">Research and delivery</p><h2>How monthly SEO works.</h2><ol class="audit-steps"><li><strong>Find a useful question.</strong> I review your services, customer questions, existing pages and available search data.</li><li><strong>Choose the work.</strong> I compare actual search results and explain the proposed improvement. Research estimates are dated and sourced; they do not predict rankings.</li><li><strong>Finish and check.</strong> I write and publish the agreed website work, or deliver an agreed alternative draft or asset, then report what changed and what remains to be checked.</li></ol><p><a href="/guides/seo-work-and-reporting/#keyword-opportunities">See how research and reporting work</a>.</p></section>`;
}

export function monthlyScopeTable(o) {
 const plans = ['keep_running', 'improve', 'grow'].map(id => o.plans[id]);
 const rows = [
  ['Monthly price', ...plans.map(p => money(p.monthly_price) + '/month')],

  ['Completed improvements', 'Not included', `${o.plans.improve.priorities} per month`, `${o.plans.grow.priorities} connected improvements per month`],
  ['Search research', 'Search warnings where access allows', 'One customer topic', 'Two topics and up to 3 competitors'],
  ['Planning', 'One practical next step', 'Future-topic list, refreshed quarterly; one practical next step', 'Rolling 90-day plan, refreshed monthly, replaces the quarterly topic list; one practical next step'],
  ['Extra graphic or newsletter excerpt', 'Not included', 'Not included', '1 extra graphic or short excerpt'],
  ['Report and review', 'Monthly report; no standing call', 'Monthly report and 20-minute call or written review', 'Monthly report and 30-minute call or written review, instead of the 20-minute review']
 ];
 return `<details class="pricing-detail-table"><summary>Compare monthly plans</summary><div class="comparison-scroll"><table class="pricing-comparison"><caption>Each column shows the plan’s total included work</caption><thead><tr><th scope="col">What you get</th>${plans.map(p => `<th scope="col">${e(p.public_name)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${e(row[0])}</th>${row.slice(1).map(cell => `<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>Every plan includes automated monitoring, monthly website and contact-form checks, one round of supplied small edits, a quarterly website check and a monthly report.</p><p>A promotional graphic or newsletter draft/setup can replace one main improvement when agreed in advance. Grow’s extra graphic or newsletter excerpt is separate: approved content becomes a simple existing-brand graphic with a caption, or a newsletter excerpt. Public posting or sending requires your explicit approval.</p><p>${e(standardCareExclusion)}</p></details>`;
}

export function monthlyCampaignExample(o) {
 return `<section class="studio-section" id="growth-campaign-example"><p class="eyebrow">Example only</p><h2>What one Grow month could include.</h2><p>A restaurant wants clearer catering information. A ${money(o.plans.grow.monthly_price)} Grow month could include:</p><ol class="audit-steps"><li>Rewrite the catering page using approved menus, lead times and minimums.</li><li>Publish a separate event-planning guide and link it to that page.</li><li>Reuse the approved content in a simple graphic with a short caption, or a newsletter excerpt of up to 150 words.</li></ol><p>The page and guide are the two improvements; the extra graphic or newsletter excerpt and supplied care edits are separate. This is a fictional example, not a client result. We agree different work when it better fits the business.</p></section>`;
}
