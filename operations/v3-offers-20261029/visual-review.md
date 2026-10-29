# V3 visual candidate review

FAIL pending two corrections. Release approval remains false.

Final capture run 40872555231 at fe8e69657c24c2bea6d99a82f8e28ad2b917edba contains 92 images. All 10 changed images were inspected over their full captured height using 30 native-scale sheets/slices. Prior coverage is retained only for 82 byte-identical images. All final and prior hashes are recorded in visual-review.json. Eleven additional desktop closing crops were inspected.

The three earlier findings are resolved: directory Care/onboarding is separate from Roadmap, homepage search starts at $850/month, and SEO exclusions have distinct list items.

1. V3-VIS-04: shared desktop closing links concatenate and touch the primary pill. Confirmed across pricing, services, web design, addons, audit, care, SEO and five specialist pages. Add an explicitly spaced action group and recapture. This preexisting defect was missed in the earlier review; its layout PASS is superseded.
2. V3-VIS-05: the homepage entry card promises Custom design beside the $2,950 established-layout plan. Replace with accurate design-neutral wording and recapture desktop and phone.

No other changed-image clipping, missing imagery, broken card boundaries or footer failures found. This is static screenshot review, not interaction/accessibility proof. No baseline was copied. Full CI and publication remain pending.

Source addendum: VIS04 and VIS05 source fixes independently PASS. New closing flex/gap/target rules survive pruning and occur in the linked CSS for all 12 affected built routes; current built homepage uses accurate design-neutral wording. Independent family-style tests pass 2/2. Visual verdict remains FAIL pending corrected captures.
