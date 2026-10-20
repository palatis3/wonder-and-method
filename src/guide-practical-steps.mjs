import {money} from './shared.mjs';
const link=(url,label)=>`<a href="${url}">${label}</a>`;

export function guideReviewChoices(o){
 return `<p>If you need help finding the problem, the ${link('/contact/?offer=website_baseline&amp;goal=fix&amp;request_kind=question#inquiry',money(o.baseline.one_time_price)+' Website Baseline')} reviews the site, orders the priorities and includes one small fix if safe and practical. The ${link('/contact/?offer=audit_fix_sprint&amp;goal=fix&amp;request_kind=question#inquiry',money(o.audit_sprint.one_time_price)+' Audit &amp; Fix Sprint')} includes that review and up to two agreed small fixes in total. Both cover one supported website with up to ${o.baseline.page_cap} marketing pages; platform, access and fit are confirmed first. ${link('/services/website-audit/','Compare the full review scopes')}. A review is optional and does not commit you to a redesign or monthly plan.</p>`;
}

// Shared by guide rendering and the contractor service page.
export {responsiveTables as accessibleGuideTables} from './responsive-tables.mjs';
