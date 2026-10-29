"""One-time, bounded presentation migration from the V3 release."""
from pathlib import Path
R=Path(__file__).resolve().parents[2]
def change(file,pairs):
 p=R/file;s=p.read_text(encoding='utf-8')
 for before,after in pairs:
  if before not in s:raise ValueError(f'Missing migration target in {file}: {before[:80]}')
  s=s.replace(before,after)
 p.write_text(s,encoding='utf-8')
change('src/v3-service-content.mjs',[
 ("import {costPresets", "import {v4PricingHero,v4MonthlyTerms,v4DisplayPrice} from './v4-offer-story.mjs';\nimport {costPresets"),
 ('Custom and above include basic measurement; deeper reporting is separately scoped.','Every website plan includes native GA4 and Search Console setup plus one tested inquiry-success event. Deeper reporting is separately scoped.'),
 ('plus 30 days to report in-scope defects.','plus a defect-reporting window of 30 days for Focused, 60 for Custom and Business, or 90 for Signature. Business and Signature also include a day-30 observations review.'),
 ("export function v3Pricing(o){return intro('Clear scope · US dollars','Good work. Clear choices.','Build a website you’re proud to share, solve a specific problem or keep improving what you already have.')",'export function v3Pricing(o){return v4PricingHero(o)'),
 ('Choose care, a monthly website improvement or a local-search partnership. Care is included once in each partnership; overlapping work is never billed twice.','Choose practical care, website improvements or search-led production. Every production plan is available on its own or with Brochure or Commerce Care.'),
 ("v3Cards(o,monthlyOfferIds,{anchors:true})+monthlyExamples(o)","v3Cards(o,monthlyOfferIds,{anchors:true})+v4MonthlyTerms(o)+monthlyExamples(o)"),
 ("${p.id==='care_onboarding'?' brochure / $650 commerce':''}","${p.id==='care_onboarding'?` brochure / ${money(o.care_variants.commerce.onboarding)} commerce`:''}"),
 ('Measurement already included in Custom, Business or Signature','Measurement already included in Focused, Custom, Business or Signature'),
 ('for up to 20 marketing pages and one ordinary inquiry journey.','for up to 30 marketing pages and three ordinary inquiry journeys.'),
 ('for up to 100 products, one checkout and one ordinary inquiry journey.','for up to 100 products, one checkout and three ordinary inquiry journeys.'),
 ('Commerce includes checkout/order-notification checks and up to 45 minutes of supplied edits; brochure care includes up to 30 minutes.','Both variants include up to 60 minutes of supplied edits each month. Commerce includes checkout and order-notification checks. Brochure includes an offset for up to $25/month of eligible hosting.'),
 ('Local Search Focus improves an existing page or selected profile details.','Local Search Focus creates one page or refreshes up to two, plus profile facts and one post.'),
 ("panel('included-care','Care included once','Keep the foundations working.','All three partnerships include Brochure Website Care for the same supported website.'", "panel('included-care','Your choice of care','Keep the foundations working.','Each production plan is available without Care, with Brochure Care or with Commerce Care.'"),
 ('Website Improvement can replace brochure care with Commerce Care for','Any production plan can replace bundled Brochure Care with Commerce Care for'),
 ("`<p>${e(v3Enrollment(o))}</p><p>Any production plan", "v4MonthlyTerms(o)+`<p>Any production plan"),
 ("lead:'Connect one defined process across supported tools, with useful documentation and a clear plan for failures.'", "lead:'Connect up to five simple native automations—or one more complex workflow—with useful documentation, tested failures and a clear handoff.'"),
 ("${money(v3Price(p))}${monthlyOfferIds.includes(key)?'/month':' fixed fee'}", "${p.variants?.production?'From ':''}${money(v4DisplayPrice(o,key))}${monthlyOfferIds.includes(key)?'/month':' fixed fee'}"),
 ('<dt>Contact forms</dt>', '<dt>Review rounds</dt><dd>${p.review_rounds}</dd><dt>Defect-reporting window</dt><dd>${p.defect_days} days from launch</dd><dt>Basic measurement</dt><dd>Native GA4, Search Console and one inquiry-success event</dd><dt>Contact forms</dt>')
])
change('src/buyer-decisions.mjs',[
 ('Focused allows eight pages; Custom ten; Business fifteen, including one researched guide; Signature twenty, including up to two guides.','Focused allows ${o.launch_site.marketing_page_cap} pages; Custom ${o.focused_site.marketing_page_cap}; Business ${o.business_site.marketing_page_cap}, including one researched guide; Signature ${o.signature_site.marketing_page_cap}, including up to two guides.'),
 ("${v3Cards(o,['launch_site','focused_site','business_site','signature_site'],{compact:true})}</details>","<dl class=\"v4-plan-guide\"><dt>Focused</dt><dd>One clear offer, an established layout adapted to your identity, up to ${o.launch_site.marketing_page_cap} pages.</dd><dt>Custom</dt><dd>Original visual direction, up to ${o.focused_site.marketing_page_cap} pages and one inquiry journey.</dd><dt>Business</dt><dd>More service depth, up to ${o.business_site.marketing_page_cap} pages, two journeys and one researched guide.</dd><dt>Signature</dt><dd>Two homepage concepts, purposeful motion, up to ${o.signature_site.marketing_page_cap} pages, three journeys and two researched guides.</dd></dl><p>Page limits are useful capacity, not a target for filler. Guides count within the total.</p></details>")
])
