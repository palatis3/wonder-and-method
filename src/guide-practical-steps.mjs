import {reviewPageLimits} from './offer-copy.mjs';
import {money,escapeHtml as e} from './shared.mjs';
const link=(url,label)=>`<a href="${url}">${label}</a>`;

export function guideReviewChoices(o){
 return `<p>If you need help finding the problem, the ${link('/services/website-audit/#offer-website_baseline',money(o.baseline.one_time_price)+' '+e(o.baseline.public_name))} reviews the agreed public pages and inquiry journey, then delivers an action plan; no implementation is included.</p><p>The ${link('/services/website-audit/#offer-audit_fix_sprint',money(o.audit_sprint.one_time_price)+' '+e(o.audit_sprint.public_name))} completes up to three agreed fixes within six planned implementation hours, including preparation, retesting and handoff. The unchanged accepted work is completed even if I underestimate it.</p><p>${e(reviewPageLimits(o))}; larger sites are quoted separately. Before you pay, I check that I can work on your platform and get the access I need. ${link('/services/website-audit/','See what each review includes')}. A review does not commit you to a redesign or monthly plan.</p>`;
}

// Shared by guide rendering and the contractor service page.
export {responsiveTables as accessibleGuideTables} from './responsive-tables.mjs';
