# Inquiry and form correctness audit

Audited frozen HEAD `b711713f376d3f180d7d330fbbe20f5c27309d2b` on 2026-10-23. Two actionable P2 findings were reproduced. No production requests, emails, retries, deletions, credential reads, builds, or public edits were performed. All new files are in this audit directory; the database and provider are synthetic and local.

## FORMS-01 — Native line endings reject valid messages, truncate recovery, and bypass deduplication (P2)

**Location:** `src/inquiry.mjs:41–43`; recovery truncation at `src/inquiry-form.mjs:20`; exact-payload matching in `deployment/worker.mjs:220–222` and `deployment/worker.mjs:251–255`.

**Trigger:** A native form contains a legal 3,000-character textarea message with at least one interior newline. Its textarea value counts the newline as one LF character; native URL-encoded HTML submission expands it to CRLF. A second trigger is retrying an unconfirmed multiline request through the other transport within ten minutes (for example, after reloading while enhancement is unavailable).

**Expected:** A message within the stated textarea limit is accepted without losing its ending. Equivalent retries return the original reference, consume one distinct-inquiry allowance, and stay attached to one notification idempotency key.

**Actual:** `validateInquiry` trims only the outside of text. The legal 3,000-character message becomes 3,001 characters on native submission and receives 422. Recovery markup slices that raw value to 3,000 characters; after HTML newline normalization, the returned textarea contains 2,999 characters and has lost its final character. For messages under the limit, LF and CRLF also survive as different payload bytes: equivalent native and enhanced requests both return 202, create two records, and send two different fake provider requests with different idempotency keys. An identical same-transport retry correctly reuses its reference.

**Evidence:** `audit.mjs`, checks `FORMS-01` and `FORMS-01-native-limit`, and `harness-result.json`: valid LF text of length 3,000, native rejection at length 3,001, shortened recovery of length 2,999; plus two equivalent multiline records and two accepted fake provider requests. No provider or production endpoint was contacted. Actual transport-switch frequency is unknown; both server effects are reproduced with synthetic inputs.

**Minimal fix:** Canonicalize message line endings before length validation, recovery rendering, and creating the deduplication identity; apply compatible equivalence to the rolling lookup and atomic insertion guard. Preserve recognition of recent pre-change LF/CRLF payloads during deployment; simply changing new normalization would miss existing native rows. Do not rewrite historical inquiry payloads or frozen notification bodies. Add a native 3,000-character multiline acceptance/preservation regression and a two-order native/JSON retry regression proving one reference, one rate charge, and one send.

## FORMS-02 — Native correction can require a website after switching to a new-build service (P2)

**Location:** `src/inquiry-form.mjs:48`; editable service control at `src/inquiry-form.mjs:31`, created by `src/inquiry-response.mjs:19`.

**Trigger:** A native Website Baseline or Audit & Fix Sprint proposal lacks a website, so the worker returns the 422 correction form. The visitor uses its exposed service selector to choose Launch Website (or another service for which a website is optional), leaving the website blank because this is a new website.

**Expected:** The visitor can send the corrected new-build request without inventing an existing website address. Server validation already accepts that exact changed request.

**Actual:** The correction response renders the website input with `required`, provides an editable service selector, and contains no script. Changing the selector cannot remove the attribute, so native browser constraint validation continues to block the new-build request. The heading/help text also remains tied to the previous service. This problem affects the native recovery page even when the browser normally has JavaScript enabled, because that response contains no script.

**Evidence:** `audit.mjs`, check `FORMS-02`, obtains the real worker's native 422 response, verifies its selector, `required` website input and absence of script, then confirms the changed Launch request with a blank website has no server validation errors. The browser block follows the returned HTML's native constraint semantics; this audit did not launch a browser for an end-to-end click reproduction.

**Minimal fix:** Avoid an unconditional browser `required` attribute tied to one initial service on editable native forms; retain authoritative conditional server validation and give the editable form an accurate conditional website hint. Fixed-service checkouts can keep their native required field. The enhanced handler can continue updating the requirement dynamically. Add a no-JavaScript recovery regression for Baseline/Sprint → Launch/Help me choose with an empty website.

## Verified behavior and scope limits

- Existing focused tests passed: 48 tests across `worker.test.mjs`, `audit-backend-reliability.test.mjs`, `audit-inquiry-clarity.test.mjs`, and `inquiry-confirmation.test.mjs`.
- Six selected `claude-backend.test.mjs` tests passed for the notification budget, expired-lease eligibility, attempt/age caps, frozen notification bodies, fresh lease times in slow batches, and next-day quota recovery. No additional notification-state defect was confirmed.
- The harness confirms old `care`, `search_plan`, and `search_sprint` service aliases; query preservation from `/contact.html`; fixed checkout protection from conflicting offer parameters; and retained additions/monthly priorities.
- The prior `operations/google-quality-audit-20261023` quality gate remains preserved: 1,192 pages and zero findings in its declared routing/content scope. It was not rerun or treated as proof of these additional form cases.
- South Carolina integration remains unexecuted private preparation. Its generated location pages use the existing generic contact intent; no newly emitted county parameter requiring a schema change was found. Runtime behavior after applying an approved overlay remains unverified and must keep the documented integration gates.
- Broad security/privacy, provider delivery, actual mailbox behavior, and the production database were outside this audit. No hypothetical concerns are filed as findings.

## Reproduction and input integrity

From the site root:

```powershell
node evidence/site-quality-xhigh-20261023/forms/audit.mjs
node --test --test-reporter=dot tests/worker.test.mjs tests/audit-backend-reliability.test.mjs tests/audit-inquiry-clarity.test.mjs tests/inquiry-confirmation.test.mjs
node --test --test-reporter=spec --test-name-pattern='site-wide notification budget|scheduled recovery selects|five-attempt cap|slow retry batches|daily quota hold|new notification text|resolution' tests/claude-backend.test.mjs
```

The harness explicitly disables global network fetch, uses SQLite `:memory:`, injects its provider response, and writes only `harness-result.json` beside itself. SHA256 hashes for all 29 material source, test, integration and prior-gate inputs are recorded there and copied to `findings.json`. The tracked worktree was unchanged before and after the checks.

## Authorized remediation

Both findings are fixed in the combined-release working tree. `implementation.json` records the six owned changed files, their new SHA256 hashes and the actual test commands/results. The original audit harness and result are retained as pre-fix evidence; the harness deliberately asserts the old defects and should not be used as a passing current-code check.

- `src/inquiry.mjs` now normalizes message CRLF/CR to LF before checking its length and saving it.
- `deployment/worker.mjs` compares exact LF, CRLF and CR message variants in both the rolling lookup and atomic insertion guard. Other fields still compare exactly. It does not rewrite any customer row, frozen provider body, lease, or schema.
- `src/inquiry-form.mjs` supplies a conditional website hint on editable native proposal forms without an initial-service `required` constraint. Fixed checkouts retain their browser requirement; existing enhanced-client updates continue unchanged.
- `src/inquiry-response.mjs` uses the same website label in the native error summary. The existing clarity assertions were intentionally updated.
- New `tests/inquiry-native-parity.test.mjs` covers legal 3,000-character Unicode multiline messages, complete recovery on another field's error, JSON/native retries in both orders, recent old CRLF/CR records and unchanged snapshots, concurrent equivalent insertion, exact differences outside line endings, and native service changes from review proposals to new-build/undecided services.

All 61 focused tests passed: seven new regressions, the previous 48 inquiry checks, and six notification state-machine checks. `git diff --check` passed for the tracked owned changes. No build, full suite, production call, deployment, or actual provider send was run. Combined-release browser/build/Cloudflare verification remains with the primary agent.
