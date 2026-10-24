# Independent Mississippi / Alabama geography checkpoint

**PASS — no actionable findings.

Offline independent standard-library HTML parsing, complete streaming of both raw GRFC files, raw CSV population joins, exact county/detail/group/membership comparisons and complete representative recomputation. Producer scripts are reviewed but never imported or executed.

| State | Counties | Incorporated entities (active) | CDPs | Municipal / CDP memberships | Cross-county places | GRFC rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| mississippi | 82 | 300 (299) | 127 | 320 / 129 | 20 | 112861 |
| alabama | 67 | 465 (465) | 130 | 518 / 133 | 50 | 190536 |

Checked all 15 manifest files, 149 counties, 1022 unique places and 409 representative selections. Candidate module exports exactly match the verified public JSON and county inventory.

Tillatoba remains FUNCSTAT I, an inactive incorporated town in Yalobusha, and is separated from active towns in the public directory. CDPs remain statistical communities, with explicit notes in every county.

Huntsville is present in Limestone, Madison, Marshall and Morgan. The 2025 county-part estimates are 5,206; 228,416; unavailable; and 5 respectively. Its whole-place 233,627 estimate is never substituted for Marshall. Kilpatrick (DeKalb) and Pine Level (Autauga) have no estimates in the supplied 2025 files. Their values remain null, as does Tillatoba. All representative choices were independently sorted by county-part population with missing estimates last, then by name.

The public representative file preserves the distinct county-part and whole-place fields and the missing-value policy. These four unavailable municipal county-parts do not rank in the selected top-three representatives; their typed geography remains present. No absent value is turned into zero or a whole-place estimate.

The producer scripts correctly retain current entity membership independently from older population availability. No commercial or keyword conclusions are assessed here.

## Findings

None.

## Reproduce

`python evidence/ms-al-expansion-20261024/geography-review/verify.py`

The script writes findings and the independently reconstructed membership registry only within this review folder.

## Limits

- This verifies retained source bytes and transformations, not fresh remote retrieval or independent authenticity of recorded HTTP metadata.
- The January 2026 geography and 2025 population estimates have different reference dates; absent county-part estimates remain unavailable rather than being inferred from whole-place totals.
- Google policy snapshots receive manifest integrity checks only. Commercial choices, keyword demand, source integration, CI and production are outside this checkpoint.
- No source mutations, UI, network, CI monitoring or outreach; only this review folder is written.

## Exact reviewed hashes

| File | SHA256 |
| --- | --- |
| `source-manifest.json` | `a2a23093f2ab6733d1ddeb893a2b88ce0106b5044d909b9bf87a101c3a53704a` |
| `prepare-sources.py` | `be922eed5d39b83295aca09cf5d6a32da1f2daccf417f81519137093021b483e` |
| `build-public-geography.py` | `b33f892ac779ca12678ed4a203da58e341c7585314964d0eb80297ce5cd5ae1b` |
| `county-inventory.json` | `6ff0c61ade94412a002b6e543e10867b44c498fdb40c2ffc1a9e34c1acd63155` |
| `place-inventory.json` | `0f3c019a1f5355d6f4589a6aa8950d7272138df6fb0fe8d2f0be9050e666c914` |
| `geography-source-summary.json` | `b0a02dae48163f1fe5db2e543d2e0067376a48087be62bced8a5d7cc51e26573` |
| `public-geography.json` | `9d7223b74985bb533c2b18111ebc0974083aa343b8b45cdae17a6526c212a204` |
| `public-area-inventory.json` | `cc01924ff0dba1d3ede728c086459a85782bafc1e65162d7fd5df551e93c05c6` |
| `public-representative-places.json` | `9e384c0733900a5f6ab3ca1e12ec3f2da3b73f362b3bb1d92aa6632214e38723` |
| `public-geography-summary.json` | `eb80774293e460fae589332d6bd3d8fa52f0d47b4c47819549605033b0ef3017` |
| `candidate-ms-al-geography.mjs` | `07800ad749b9e470c0043a1f73e005c5a46df0cb4dca0ad225769da8474472e6` |
| `raw/co-est2025-alldata.csv` | `4f5a499d851e2cb48fd7a5405e5a9235453a8a66933657aacd10df0e264f35d5` |
| `raw/ms-county.html` | `5ab62a644110ae3d4eb3a00f236a11ccc4f853fa4d3d305eb7e3a9db8a8b713e` |
| `raw/ms-incplace.html` | `e447ad08b02f6b2a02619b3d68e26b77729d8fd11a214483d045993f3b34ed1b` |
| `raw/ms-cdp.html` | `2cf8ada8c8238fd4b5aa0989b6168775cf35cc0cddfac9252a1e25962955429e` |
| `raw/ms-grfc.txt` | `978983e52a83f41258d98cca407a96846aa25d7cf66fcce9eab5b0a5145ad76a` |
| `raw/sub-est2025_28.csv` | `4b049c6a6e22589241b529fd77e92894f02af320b71e8dd968a2d7ba5f253eef` |
| `raw/al-county.html` | `85cc652e9aab6512ba1ebafcaa6917481bd7d3d9ef7a98dc76166663d94fd4b0` |
| `raw/al-incplace.html` | `8c54f7b2a152ea0602d2e8c47497f6c54a38093a9975f6d81389195ffe84fccc` |
| `raw/al-cdp.html` | `6a0cf061fc3c25bd666c59f04dc29f25f1d1e3053f964d1135426c5d7b7f6cb0` |
| `raw/al-grfc.txt` | `df38459f762c9217fa52691d22f9fb762be11298ac9ca19f749b91f21c520d85` |
| `raw/sub-est2025_01.csv` | `220436709a033c74b0f880198da0b24f96b6c51121ff064bfe4ccfc85e44c378` |
| `raw/google-spam-policies.html` | `fcf8febdcfe9e3b62920a5a683337dd509e73d568432994304d12dc5a1112756` |
| `raw/google-helpful-content.html` | `64989fbabbf79dfcd6dc1464a9785b5614d9e28619f85debc7ab5ee0e081d32f` |
| `raw/google-documentation-updates.html` | `9949706d58ee2e3aa4c771d0b86dcdb2af382e97054c65ef7d93e7de819302cd` |
| `raw/census-functional-status.html` | `754eaea562c206799501f1c98fc5ce3fde3c8d388b613acda29a1c817794bf47` |
