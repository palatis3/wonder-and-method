import {normalizeOfferCatalog,countWords,titleCount} from './offer-catalog.mjs';
import {escapeHtml as e, money} from './shared.mjs';

export const monthlyDisplayLabels=Object.freeze({smallChanges:'set of small text, photo or link changes',futureTopics:'future-topic list',growthPlan:'rolling 90-day plan'});
export const monthlySearchChecks='available Google search or page-speed warnings where access allows';
export function monthlySmallChanges(o,id,{capitalized=false}={}){const count=o.plans[id].small_change_batches;const label=`${countWords(count)} ${count===1?monthlyDisplayLabels.smallChanges:monthlyDisplayLabels.smallChanges.replace(/^set /,'sets ')} you send each month`;return capitalized?label[0].toUpperCase()+label.slice(1):label;}
export function monthlySmallChangeTerms(o,id) {
 const ids=id?[id]:['keep_running','improve','grow'];
 const allowance=new Set(ids.map(key=>o.plans[key].small_change_batches)).size===1
  ? monthlySmallChanges(o,ids[0],{capitalized:true}).replace(' you send each month',' each month')+'.'
  : ids.map(key=>o.plans[key].public_name+': '+monthlySmallChanges(o,key)).join('; ')+'.';
 return allowance+' '+o.monthly_terms.small_batch.slice(o.monthly_terms.small_batch.indexOf('.')+1).trim();
}
export function monthlyGuidePlanSummaries(o){
 return ['keep_running','improve','grow'].map(id=>{
  const p=o.plans[id],grow=id==='grow';
  const work=id==='keep_running'?`Automated availability and security-certificate monitoring; monthly website, form and agreed-tool checks, including ${monthlySearchChecks}; plus ${monthlySmallChanges(o,id)}; a monthly report and quarterly website check. Recurring keyword research and new content are separate.`:`The same care plus ${grow?'deeper ':''}research and ${p.priorities} ${grow?'connected ':'completed '}improvement${p.priorities===1?'':'s'} each month. ${grow?`A rolling ${p.growth_plan.days}-day plan, refreshed monthly, and ${countWords(p.promotion_reuse.quantity)} extra graphic${p.promotion_reuse.quantity===1?'':'s'} or newsletter excerpt${p.promotion_reuse.quantity===1?'':'s'}.`:`A ${monthlyDisplayLabels.futureTopics}, refreshed quarterly.`} ${p.advisor}${id==='improve'?' The opportunity brief is a short note explaining the customer question, available research and proposed page or action.':''}`;
  return {id,name:p.public_name,price:p.monthly_price,work};
 });
}
export const monthlyGuidePlanLines=o=>monthlyGuidePlanSummaries(o).map(p=>`<strong>${e(p.name)} — ${money(p.price)}/month:</strong> ${e(p.work)}`);

export function monthlyPauseSummary(o){return `For ${o.plans.improve.public_name} and ${o.plans.grow.public_name}: confirm useful work and ready inputs five business days before renewal. Otherwise, the next monthly invoice pauses. Missing inputs receive notice. `+o.monthly_terms.pause;}

export const annualEnrollmentAvailable = o => o.annual_enrollment_gate?.verified === true;
export const standardCareExclusion = 'CMS, plugin and theme software updates, backups and restores, and malware cleanup are not included in standard care. These need a separate suitability assessment or a specialist.';

export function baselineEnrollmentNote(o) {
 return `A new paid website I build includes its starting review. An existing website may need the one-time ${money(o.baseline.one_time_price)} ${o.baseline.public_name}. It covers a supported existing website with up to ${o.baseline.page_cap} agreed main pages and includes an ordered fix list and a first small fix if safe and feasible. A previous ${o.baseline.public_name}, website I built or ${o.audit_sprint.public_name} avoids this charge when its review is still usable. I confirm this before payment. Larger existing sites need an assessment and a separate agreement on the review work.`;
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
 o=normalizeOfferCatalog(o);
 const p = o.plans[id];
 if (!p) throw Error('Unknown monthly plan');
 const grow = id === 'grow', improvement = p.priorities > 0;
 const included = [
  `You get ${monthlySmallChanges(o,id)}, in existing parts of your website. Send related changes together; unrelated changes across the website are separate.`,
  `Automated website availability and security-certificate monitoring, a monthly check of the main contact path and agreed website tools, and ${monthlySearchChecks}. These warning checks are not recurring keyword research or content work.`,
  'You receive a quarterly website check of the agreed areas. It is not a new full audit.'
 ];
 if (improvement) {
  included.push(
   `${p.priorities} completed ${grow ? 'connected ' : ''}improvement${p.priorities===1?'':'s'} each month, chosen from your business needs and search research. Website writing, relevant page titles and descriptions, internal links, publication, one round of changes and checks are included for each selected improvement.`,
   p.search_scope.method,
   grow ? `A rolling ${p.growth_plan.days}-day plan refreshed monthly; this replaces the quarterly topic list.` : `A ${monthlyDisplayLabels.futureTopics}, refreshed quarterly.`,
   o.monthly_terms.priority,
   p.search_scope.metrics,
   `One ${p.review_minutes}-minute call each month, or an equivalent written review. Research, planning, reporting and this review support the improvements; they do not replace them.`
  );
  if (grow) included.push(p.promotion_reuse.scope);
  included.push(p.reporting);
 } else {
  included.push('A short monthly report of checks, changes, open issues and one practical next step. No standing planning call or recurring keyword/content campaign is included. No main improvement is included.');
 }
 const acceptance = [
  improvement
   ? `Before work starts, we agree on each improvement${grow ? ' and the additional small graphic or newsletter excerpt' : ''}, the affected area, supplied facts, completion check and one round of changes. Record the published website change or delivered draft/asset, approval status, checks and any unresolved access. Silence is not acceptance.`
   : 'We agree on the set of small changes and covered checks. Record what changed, the check results and any unresolved access. Silence is not acceptance.',
  'The same work is never counted twice. Correcting my own mistakes or completing already-promised launch work does not use paid monthly work.',
  'An unused set of small changes does not carry over. Accepted work delayed by me remains owed; we agree on a new date or refund.',
  ...(grow ? ['The second accepted improvement and accepted extra graphic or excerpt remain owed if earlier work is delayed; neither is silently dropped.'] : [])
 ];
 const renewal = [
  `${money(p.monthly_price)}/month, billed in advance with no minimum term. Your proposal records the exact renewal time and timezone, payment date and written cancellation route. Cancel before renewal to stop the next invoice.`,
  improvement
   ? monthlyPauseSummary(o)
   : 'The monthly fee covers the agreed checks even when you send no edits. If access prevents the agreed care, I notify you so we can agree on the next step and settle any unearned work.',
  improvement ? 'A charge without approved useful improvement work receives an unused-work refund or credit. Begun work and any unearned balance are itemized; accepted work delayed by me remains owed.' : 'The agreed monitoring and checks are paid work, even if you send no edits. If I cannot provide the agreed care, I itemize completed work and refund or credit any unearned balance.'
 ];
 const exit = [
  o.monthly_terms.exit,
  'I provide the existing paid website files, content and operating notes within five business days after paid completion or settled cancellation. This does not automatically transfer external services or credentials; account access, licenses and export limits still apply.',
  'New migration work is assessed separately. Canceling care does not disable your paid website, and your direct bills for hosting, domains and paid tools follow each company’s terms.'
 ];
 const exclusions = [...o.monthly_terms.excluded];
 if (!exclusions.some(text => /backups? and restores|backups?\/restores/i.test(text))) exclusions.unshift(standardCareExclusion);
 return {included, acceptance, renewal, exit, exclusions};
}

export function monthlySearchMethod(o, {id = 'keyword-opportunities'} = {}) {
 return `<section class="studio-section" id="${e(id)}"><p class="eyebrow">Research and delivery</p><h2>How monthly SEO works.</h2><ol class="audit-steps"><li><strong>Find a useful question.</strong> I review your services, customer questions, existing pages and available search data.</li><li><strong>Choose the work.</strong> I compare actual search results and explain the proposed improvement. Research estimates are dated and sourced; they do not predict rankings.</li><li><strong>Finish and check.</strong> I write and publish the agreed website work, or deliver an agreed alternative draft or asset, then report what changed and what remains to be checked.</li></ol><p><a href="/guides/seo-work-and-reporting/#keyword-opportunities">See how research and reporting work</a>.</p></section>`;
}

export function monthlySharedScope(o){
 const ids=['keep_running','improve','grow'],plans=ids.map(id=>o.plans[id]);
 const smallChanges = new Set(plans.map(p=>p.small_change_batches)).size===1 ? monthlySmallChanges(o,'keep_running') : ids.map(id=>`${o.plans[id].public_name}: ${monthlySmallChanges(o,id)}`).join('; ');
 return `<p>Every plan includes automated monitoring, monthly website and contact-form checks, ${e(smallChanges)}, a quarterly website check and a monthly report.</p>`;
}

export function monthlyScopeTable(o,{showCommonScope=true,expanded=true}={}) {
 const ids = ['keep_running', 'improve', 'grow'];
 const plans = ids.map(id => o.plans[id]);
 const rows = [
  ['Monthly price', ...plans.map(p => money(p.monthly_price) + '/month')],

  ['Completed improvements', 'Not included', `${o.plans.improve.priorities} per month`, `${o.plans.grow.priorities} connected improvements per month`],
  ['Search research', 'Search warnings where access allows', `${titleCount(o.plans.improve.search_scope.active_topics)} customer topic${o.plans.improve.search_scope.active_topics===1?'':'s'}`, `${titleCount(o.plans.grow.search_scope.active_topics)} topic${o.plans.grow.search_scope.active_topics===1?'':'s'} and up to ${o.plans.grow.search_scope.competitor_limit} competitors`],
  ['Planning', 'One practical next step', 'Future topics, updated quarterly', `${o.plans.grow.growth_plan.days}-day plan, updated monthly`],
  ['Extra graphic or newsletter excerpt', 'Not included', 'Not included', `${o.plans.grow.promotion_reuse.quantity} extra graphic${o.plans.grow.promotion_reuse.quantity===1?'':'s'} or short excerpt${o.plans.grow.promotion_reuse.quantity===1?'':'s'}`],
  ['Report and review', 'Monthly report; no standing call', ...['improve','grow'].map(id=>`Monthly report and ${o.plans[id].review_minutes}-minute call or written review`)]
 ];
 return `<details class="pricing-detail-table"${expanded?' open':''}><summary>Compare monthly plans</summary><div class="comparison-scroll"><table class="pricing-comparison"><caption>Each column shows the plan’s total included work</caption><thead><tr><th scope="col">What you get</th>${plans.map(p => `<th scope="col">${e(p.public_name)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${e(row[0])}</th>${row.slice(1).map(cell => `<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${showCommonScope?monthlySharedScope(o):''}<p>A promotional graphic or newsletter draft/setup can replace one main improvement when agreed in advance. ${e(o.plans.grow.public_name)}’s extra graphic or newsletter excerpt is separate: approved content becomes a simple existing-brand graphic with a caption, or a newsletter excerpt. Public posting or sending requires your explicit approval.</p></details>`;
}

export function monthlyCampaignExample(o) {
 return `<section class="studio-section" id="growth-campaign-example"><p class="eyebrow">Example only</p><h2>What one Grow month could include.</h2><p>A restaurant wants clearer catering information. A ${money(o.plans.grow.monthly_price)} Grow month could include:</p><ol class="audit-steps"><li>Rewrite the catering page using approved menus, lead times and minimums.</li><li>Publish a separate event-planning guide and link it to that page.</li><li>Reuse the approved content in a simple graphic with a short caption, or a newsletter excerpt of up to 150 words.</li></ol><p>The page and guide are the two improvements; the extra graphic or newsletter excerpt and supplied care edits are separate. This is a fictional example, not a client result. We agree on different work when it better fits the business.</p></section>`;
}
