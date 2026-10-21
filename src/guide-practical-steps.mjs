import {money} from './shared.mjs';
const link=(url,label)=>`<a href="${url}">${label}</a>`;

export function guideReviewChoices(o){
 return `<p>If you need help finding the problem, the ${link('/services/website-audit/',money(o.baseline.one_time_price)+' Website Baseline')} reviews the site, lists the priorities and includes one small fix if safe and practical. The ${link('/services/website-audit/',money(o.audit_sprint.one_time_price)+' Audit &amp; Fix Sprint')} includes that review and up to two small fixes in total. Both are for one website of up to ${o.baseline.page_cap} main pages. Before you pay, I check that I can work on your platform and get the access I need. ${link('/services/website-audit/','See what each review includes')}. A review does not commit you to a redesign or monthly plan.</p>`;
}

// Shared by guide rendering and the contractor service page.
export {responsiveTables as accessibleGuideTables} from './responsive-tables.mjs';
