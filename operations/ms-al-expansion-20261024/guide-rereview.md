# Service-area guide relevance rereview

Reviewed 2026-10-24T04:24:55.661Z by the independent Astra integration reviewer. **PASS: retain all three links, labels and exact existing relevance reasons.**

I read the complete current built guide main text and the complete Leon, Broward and Calhoun location records. The guide includes Mississippi and Alabama in its remote-service coverage list. Its customer-decision, actual-delivery, address-assessment, genuine-premises, unresolved-condition and maintenance guidance continues to support the three connections.

- **Leon:** workshop capability and intermittent availability must be checked before travel; Midway/Gadsden must stay distinct from Tallahassee/Leon. The guide still supports those location and coverage distinctions.
- **Broward:** the actual truck/worksite, Pompano Beach shop and Broward road reach stay distinct, without implying a Fort Lauderdale shop or dispatch. The guide still supports the existing shop-and-road label.
- **Calhoun:** inventory or custom-building interest leads to destination/access/scheduling questions that remain subject to confirmation. The guide still supports explaining coverage without guaranteeing delivery availability.

All three location-purpose fingerprints are unchanged. The updated guidePurposeFingerprint from the exported helper is `621cbb2281c67aca77e5122baff4a9742c454ca3e93134a3e5d3392812365482`. Proposed replacement rows in guide-rereview.json preserve each reason, label, reviewPart and locationPurposeSha256; only reviewedAt, reviewMethod and guidePurposeSha256 change. The scoped relevance validator returns zero findings.

The full built guide hash is `e8284e0c4466c7074fc85e17ed1d5082b3d3e173f4c5e2de1d149d3e3c05223c`; exact source and helper hashes are recorded in guide-rereview.json. This review reads current content; it does not reverify business source websites.

## Font-script hygiene follow-up

The current scripts/subset-newsreader-common.py hash is `2d5ce5b9ad68f574c90dd914756c2499e2c21e4c034678ed551cc7aeb938f3e7` (previous review: `632eb19aab1bfc00b8289c87ddd698ad4b3e5f2146ba21cfe90905322889eb7d`). Only import sys and sys.dont_write_bytecode = True were added. Removing those exact lines reconstructs the prior reviewed hash. The primary reports a byte-identical --check run; this checkpoint did not rerun the writing script. The dated main integration review is preserved unchanged.
