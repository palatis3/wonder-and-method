from pathlib import Path
R=Path(__file__).resolve().parents[2]
def edit(file,pairs):
 p=R/file;s=p.read_text(encoding='utf-8')
 for before,after in pairs:
  if before not in s:raise ValueError(file+': missing '+before[:80])
  s=s.replace(before,after)
 p.write_text(s,encoding='utf-8')
edit('src/shared.mjs',[
 ('return {catalog_format:3,add_ons:o.add_ons.map','return {catalog_format:3,catalog_revision:o.catalog_revision,monthly_variants:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.variants])),add_ons:o.add_ons.map'),
 ("return {total,breakdown,note};", "return {total,breakdown:breakdown+(v.hostingOffset?` Eligible hosting offset: −${money(v.hostingOffset)} from the W&M invoices; net studio fees ${money(v.netServiceTotal)}.`:''),note:note+(prices.catalog_revision===4?' '+(v.offsetPending?'The eligible hosting offset is still unknown. ':'')+'Brochure Care offsets documented eligible hosting by up to $25 per paid month; Commerce and production-only plans have no offset. A period longer than three paid cycles assumes the current fee continues; later rate changes require at least 30 days written notice.':'')};")
])
edit('src/checkout-content.mjs',[
 ("import {monthlySmallChangeTerms}","import {v4MonthlyOptions} from './v4-offer-story.mjs';\nimport {monthlySmallChangeTerms}"),
 ('${money(s.price)} per month, paid in advance.','${p.variants?.production?\'From \':\'\'}${money(s.price)} per month, paid in advance. Your selected option is confirmed in the proposal.'),
 ('<p class="v3-price">${money(s.price)} <span>${monthly?', '<p class="v3-price">${p.variants?.production?\'From \':\'\'}${money(s.price)} <span>${monthly?'),
 ('<p>${e(p.v3.result)}</p><p class="checkout-tax">','<p>${e(p.v3.result)}</p>${monthly?v4MonthlyOptions(o,id):\'\'}<p class="checkout-tax">'),
 ('<p>${e(p.v3.support)}</p>${id===', '<p>${e(p.v3.support)}</p>${monthly?`<p>${e(o.hosting_offset_terms)}</p><p>${e(o.first_cycle_measurement)}</p>`:\'\'}${id===')
])
edit('src/payment-content.mjs',[
 ("import {v3PaymentTable}","import {v4MonthlyOptions,v4MonthlyTerms} from './v4-offer-story.mjs';\nimport {v3PaymentTable}"),
 ('<p>${money(o.plans[id].monthly_price)}/month</p>', '${v4MonthlyOptions(o,id)}'),
 ('<p>Commerce Care is ${money(o.care_variants.commerce.price)}/month. Website Improvement with Commerce Care is ${money(o.plans.improve.monthly_price+o.care_variants.improvement_commerce_supplement)}/month. Other commerce or multi-site combinations need their own proposal.</p><p>${e(v3Enrollment(o))}</p>', '${v4MonthlyTerms(o)}')
])
edit('src/audit-content.mjs',[
 ('${isV3(o)?\'<label for="care-variant">Care coverage</label><select id="care-variant" name="careVariant"><option value="brochure">Brochure website (included base price)</option><option value="commerce">Commerce (Care $450/month or Improvement +$175/month)</option></select><label for="onboarding">Existing-site Care onboarding, if needed</label><select id="onboarding" name="onboarding"><option value="none">None selected / reuse a completed handoff</option><option value="brochure">Brochure onboarding — $375</option><option value="commerce">Commerce onboarding — $650</option></select>\':\'\'}', '${isV3(o)?`<label for="care-variant">Monthly service option</label><select id="care-variant" name="careVariant"><option value="brochure">With Brochure Care (listed plan price)</option><option value="production">Production only (partnerships only)</option><option value="commerce">With Commerce Care</option></select><label for="onboarding">Existing-site Care onboarding, if needed</label><select id="onboarding" name="onboarding"><option value="none">None / confirmed waiver or completed handoff</option><option value="brochure">Brochure onboarding — ${money(o.care_variants.brochure.onboarding)}</option><option value="commerce">Commerce onboarding — ${money(o.care_variants.commerce.onboarding)}</option></select><p class="hint">Production-only plans have no Care onboarding. New W&amp;M builds with the same completed handoff and the first three approved introductory production clients choosing Care receive the stated waiver; confirm eligibility in your proposal.</p>`:\'\'}'),
 ('<label for="external">Domain, email and other paid tools for this period, USD</label>', '<label class="check"><input type="checkbox" name="hostingEligible">This hosting is eligible for the Brochure Care offset</label><p class="hint">Select only for documented eligible supported hosting. The offset reduces W&amp;M invoices by the actual monthly hosting cost, up to $25 per paid month. Platform licenses, domains and apps are excluded. Commerce and production-only plans receive no offset.</p><label for="external">Domain, email and other paid tools for this period, USD</label>'),
 ('Then add hosting price × hosting months, domain and other tool costs.','Then add hosting price × hosting months, domain and other tool costs. For Brochure Care, subtract the documented eligible monthly hosting fee capped at $25, multiplied by paid Care months; this reduces W&amp;M invoices while you still pay the host directly.')
])
edit('src/inquiry-form.mjs',[
 ('${e(offers.plans[id].public_name)} — ${money(offers.plans[id].monthly_price)}/month', '${e(inquiryChoiceLabel(id,offers))}')
])
