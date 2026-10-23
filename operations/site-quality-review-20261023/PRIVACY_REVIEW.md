# Privacy, access and public asset boundary review

No confirmed actionable defect was found in this scope on source commit `b711713f376d3f180d7d330fbbe20f5c27309d2b`. The frozen build reports the same commit, 1,192 routes and source SHA-256 `8a768552349339d8b38e769cf1c8fc2603190b045120f6968f9f730f48087f78`. No source, deployment configuration or public build was changed.

## Confirmed defects

None. There is no proposed correction or approval request from this review. Existing access, logging, escaping and public-data projection safeguards should be preserved.

## Verified evidence

| Boundary | Exact source | Evidence and outcome |
| --- | --- | --- |
| Deployment includes only public output | `deployment/wrangler.production.jsonc:12`, `:14`; `scripts/build.mjs:141`, `:180`, `:189`, `:258` | Assets point to `../dist`, every asset request goes through the Worker, and private build evidence is written outside `dist`. Inspected all 3,043 emitted path names and scanned 1,716 text files. No private directories, credential/container files, source maps, secret names, private configuration markers, local user paths or notification-recipient matches. |
| Browser bundle excludes private configuration | `scripts/build.mjs:53`, `:58`, `:59`; `src/offer-catalog.mjs:13` | The site JSON projection exposes only receipt contact/window fields; offers use an explicit public field projection. Synthetic extra private fields at root, offer and review-section levels do not change the public projection. Current `client.js` and `calculator.js` were included in the emitted-text scan. |
| Operator reads fail closed | `deployment/worker.mjs:29`, `:275`, `:283`, `:313`, `:335` | Twelve synthetic requests across six operator read endpoints with missing or wrong credentials return 401, `no-store`, and `no-referrer`, without reaching assets. Existing tests verify authenticated exports and distinct staging/operator credentials. No actual operator credentials or records were accessed. |
| Runtime manifest stays private | `deployment/worker.mjs:477`, `:310` | Six canonical/case/percent-encoded manifest paths return 404 before asset access. Existing tests verify the manifest is available through authenticated status only. The installed asset resolver's repeated-slash normalization redirects to the normalized path before serving the asset; this was inspected as source, not exercised against production. |
| Staging protects pages, scripts and APIs | `deployment/worker.mjs:464`, `:554` | Four synthetic staging requests with no staging secret return 401/no-store/noindex, without asset access. Existing tests also cover wrong credentials and authorized private no-store delivery. |
| Contact fields are not copied into URLs | `src/inquiry-prefill.mjs:5`, `:9`, `:19`; `src/inquiry-response.mjs:9` | Query injection using synthetic name/email/message and invalid context is ignored. Native correction retains entered text in escaped form controls, while generated links contain no synthetic personal marker or email. Successful receipts and failed responses use `no-store` at `deployment/worker.mjs:39`; intent-prefilled HTML uses `private, no-store` at `:501`. |
| Untrusted rendered text is escaped | `src/shared.mjs:6`; `src/inquiry-confirmation.mjs:9`; `src/inquiry-submit.mjs:75`; `src/assets/lead-workbench.js:17`, `:27` | The receipt HTML sink uses the shared escaping renderer. Synthetic closing-textarea/script/image-handler payloads remain encoded in native corrections. Workbench rendering uses text nodes and validated sample IDs. No reachable unescaped input sink was confirmed. |
| Aggregate measurement has a fixed schema | `deployment/journey-counts.mjs:18`, `:23`, `:25`; `src/assets/journey-counts.js:31`, `:39` | Existing focused tests confirm unknown dimensions and extra personal fields are rejected before any state write, aggregate rows contain fixed dimensions only, GPC/DNT suppress collection, cross-origin calls are rejected, and exports require authentication. Rate keys are HMAC values stored separately from counts. |
| Sensitive diagnostics are suppressed | `deployment/wrangler.production.jsonc:45`; `deployment/worker.mjs:159`, `:557`; `deployment/approved-rerun-attention.mjs:35`, `:43` | Invocation logs are disabled in the configured deployment. Explicit Worker/monitor logs use fixed diagnostic codes. Three additional focused tests confirm operator counters omit source IP and monitor/submission errors do not emit private URLs or transport-error detail. |
| Private operator files and redirects | `deployment/production-operator.mjs:35`, `:51`, `:72` | Existing tests verify redirect refusal, private export placement, exclusive file creation, argument validation before credential access and suppression of response bodies on failure. |
| Browser-local demo storage | `src/assets/lead-workbench-state.js:13`, `:47`; `src/assets/lead-workbench.js:11`, `:41` | State accepts only the supplied fictional sample IDs, storage is opt-in and disclosed as unprotected browser storage, and display uses text nodes. CSV export prefixes formula-like cells. These are established safeguards, not findings. |
| Public response headers and optional chat | `scripts/build.mjs:199`; `deployment/worker.mjs:514`, `:520`; `src/assets/support-chat.js:49`, `:65` | Frozen `_headers` contains the CSP and frame policy; Worker responses add nosniff, referrer and permissions policies. Optional external chat loads after a user action and uses the established explicit script sources. No speculative CSP broadening or third-party script replacement is proposed. |

## Reproduction and test results

Run the owned offline harness from the site root:

```powershell
node evidence/site-quality-xhigh-20261023/privacy/offline-review.mjs
```

It performs only local imports, synthetic requests and public `dist` inspection. It writes results only under this review folder. It does not rebuild, contact production, access real credentials, send messages or open forms.

- 27 new synthetic cases passed: 12 operator rejection, six manifest denial, four staging denial, two contact escaping/query checks and three private-field projection cases.
- 18 existing focused tests passed across `worker`, `claude-backend`, `journey-counts`, `inquiry-confirmation` and `production-operator` before the harness was written.
- Three additional existing focused log/counter tests passed in the harness. Their exact command and TAP output are retained in `offline-review-results.json` and `focused-tests.tap`.
- Path inventory: 3,043 files. Text scan: 1,716 files. All configured private-boundary pattern scans returned zero matches. Text manifest SHA-256: `d0e79457fb1594adfc7318712b69a720c13c52bb2ef9752d3b871cda8f31647d`.

The text scan detects the documented high-confidence patterns; it is not a claim to identify every conceivable secret or personal datum.

## Input identity

The complete 25-file input hash list is in `offline-review-results.json`. Principal hashes:

| File | SHA-256 |
| --- | --- |
| `deployment/worker.mjs` | `993aa06a0b61fd4b4922341211a17ae0fbc9fb7804ba3691e936616539e384c5` |
| `deployment/wrangler.production.jsonc` | `d8451f55ac228ee8cda11e833150f851a15a780bc6bcd365166f47869eb36365` |
| `scripts/build.mjs` | `21ae5836532a2cad22529321fa619c8cdb412d7e1371300a64904d608cdb4576` |
| `dist/_headers` | `bcc27ae235274ffab6cffc4f4a9acdf0979847da30248e3392f0e7c890dd674e` |
| `dist/assets/client.js` | `1c33bd8c40b7ff6297b83f8bbf01b091d00aefc8a8971bdc2217af2dfef32d77` |

## Limits, not defects

This is a read-only code and frozen-artifact review. It does not independently establish live edge behavior, current provider permissions, active secret inventory, retention cleanup completion, mailbox access or provider-side telemetry settings. No authenticated production operations were performed. Media files were inventoried by name, not inspected for embedded metadata or visually reviewed. Optional chat's current remote code and provider-side processing were not re-audited; its existing deliberate load/notice/CSP model was preserved. Inquiry-delivery correctness is owned by a separate reviewer. These limits are not counted as confirmed defects.

The security-best-practices skill's vanilla JavaScript frontend guidance was applied. There was no matching Cloudflare Worker-specific reference in the installed skill, so backend conclusions are tied to inspected code and focused synthetic tests rather than a generic framework checklist.
