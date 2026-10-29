# Wonder and Method

Current website packages and monthly services: [approved V4 offers](operations/v4-offers-20261029/RELEASE.md), published October 29, 2026.

Current published application: [V4 offers](operations/v4-offers-20261029/RELEASE.md), source `f64d4a7faa12d02f8ab84ed0e20095c6446b0bfc`, runtime `472f43ed-afc5-4c6f-be80-d298b29a4892`, deployed 2026-10-29T20:34:01.721Z. All 2,437 routes and 3,124 assets match the tested build; 2,418 URLs are sitemap-eligible. All 15 exact-source CI jobs, 18 live browser checks, fresh-backup restore, scheduled recovery and external monitoring receipts passed. Database schema and operational bindings are unchanged. Later documentation-only commits do not change the deployed application identity.

Previous content release: [Nevada and Washington expansion](operations/NEVADA_WASHINGTON_EXPANSION_20261026.md), source `7ecc8b115544c7b08f3e67cff3062f81dd118d03`, deployed 2026-10-26T19:06:47.891Z. All 2,183 application routes and 2,853 asset hashes match the tested build; the sitemap contains 2,171 eligible URLs. Exact-source CI, live verification, database preservation, scheduled recovery and Search Console submission passed. Consent-based Google Analytics is configured and live receipt verified. [BUILD_STATUS.md](BUILD_STATUS.md) contains current operating requirements.

Previous published application: [Arizona and Oregon expansion](operations/ARIZONA_OREGON_EXPANSION_20261026.md), source `94666c0d430669eec288fb8e11f4a1dbe90ef6ba`, deployed 2026-10-26T15:46:07.315Z. All 2,131 application routes and 2,799 asset hashes match the tested build; the sitemap contains 2,119 eligible URLs. Exact-source CI, live verification, database preservation, scheduled recovery and Search Console submission passed. The dated Semrush audit and its published corrections are documented in the release record. [BUILD_STATUS.md](BUILD_STATUS.md) contains current operating requirements.

Historical October 23 application: [192 individually reviewed location pages](operations/location-wave-three-20261023/RELEASE.md), source `67cb069ead8cac7c9a11711bc8cfd03727582e44`, deployed Worker version `5fc0277d-4be5-4594-8d19-f0dfa646acad`. The collection has 457 pages serving 467 directory identities; with Buffalo/Erie, 458 direct service pages serve 468 identities. All 581 HTML routes and 1,378 asset hashes match the tested build; all 960 new-route/hub checks and 1,576 historical URL checks passed. The live sitemap has 580 URLs. Google resubmission is pending because browser access is disabled; the last confirmed receipt remains 388 discovered pages. Migration 0027 preserves four inquiries and 476 prior aggregate rows. All 59 guides, 1,079 directory entries, 333 county worksheets and 430 downloads remain available. Exact-source CI and publication checks passed, authenticated health is healthy, and a scheduled recovery success occurred after deployment. No external-receiver receipt, indexing or ranking result is claimed. Research of all 1,079 identities is complete; the remaining 611 approved pages await final publication. [BUILD_STATUS.md](BUILD_STATUS.md) records evidence and separate business requirements. Private evidence is under `evidence/location-wave-three-20261023/`; later documentation commits do not change deployed identity.

Previous application: [eight further location services](operations/location-next-regions-20261023/RELEASE.md), source `7ced8bd52e428d46fee9b72344d06d38a4d3ef6a`, authenticated runtime `d9a3fef4-ad7a-4485-8f2c-fcb43a159f01`. This release adds Fort Wayne/Allen County and Bloomington/Monroe County, Indiana; the Traverse City area/Grand Traverse County, Michigan; New Bern/Craven County, Durham County and Charlotte/Mecklenburg County, North Carolina; and Maryville/Blount County and Chattanooga/Hamilton County, Tennessee. The collection now has 73 commercial location pages serving 83 directory identities; including the existing Buffalo/Erie page, there are 74 direct service pages for 84 identities. All 197 HTML routes and 1,129 asset hashes match the tested build; the sitemap contains 196 URLs. All 59 guides, 1,079 area entries and 430 downloads remain available. The 65 earlier collection records and rendered bodies are unchanged. Forty live checks passed for the new routes and their hub links; the unchanged historical redirect map retains the earlier 1,576-check evidence. Migration 0024 preserved all 459 prior aggregate rows and all 4 inquiries. Google reports Success with 196 discovered pages; discovery does not establish indexing or rankings. Individual review of the remaining counties continues. [BUILD_STATUS.md](BUILD_STATUS.md) records the evidence and remaining business dependencies. Deployment identity comes from authenticated operator status; public `/version.json` returns 404.

Website and operating tools for Wonder and Method, operated by Venture House Group LLC in Buffalo. Current release documentation was reconciled on October 29, 2026. See [BUILD_STATUS.md](BUILD_STATUS.md) for the current production release and remaining business dependencies.

Production is https://wonderandmethod.com, served by Cloudflare Workers assets with D1 inquiry storage. Search indexing has been on since October 16: keep `config/site.json` `searchIndexing: true` and production `SEARCH_INDEXING: "true"`. `src/index-policy.mjs` selects index-eligible routes and the generated sitemap; private/API/utility routes retain their own restrictions.

Historical release: the October 18 audit-fix update `16ca8b9a-d503-48f6-a362-e7f0d004ed74` (66 routes, 42 index-eligible routes, 17 guides). All 15 confirmed defects are fixed; ten of thirteen improvements are implemented, and three still require genuine client/local/authorship evidence. All five operating requirements have concrete procedures, checks or safeguards, with actual funding, calendar, sustained operation and independent recovery evidence still pending. All 300 tests, a clean-source rebuild of 292 byte-identical output files, the deployment dry run and private GitHub CI passed. All 66 live pages and 218 asset hashes match. Bounded independent Astra logic and visual reviews have no open actionable findings. Evidence is under `evidence/audit-fixes-20261018/`. A private D1 export and compatible previous Worker were recorded before publication; no migration was required.

New quotes use the current `config/offers.json` version (`2026-10-29-v4-offers` at this update); accepted agreements retain their saved terms. The source-code handoff example is live at https://wonderandmethod.com/work/source-handoff/.

The private lead pipeline is ready in `.runtime/operations/weekly-board.json`; `npm run leads -- report` shows current stages by service and stated source. See [operations/LEAD_PIPELINE.md](operations/LEAD_PIPELINE.md). Actual buyer records stay out of Git and public assets. Gmail inquiry routing remains as verified in the prior release.

## Where things live

- `src/`: page templates, browser behavior and checked-in public assets.
- `config/offers.json`: current commercial terms; `config/page-dates.json`: verified page content revisions.
- `deployment/`: Worker, D1 migrations and authenticated operator tools.
- `scripts/`: build, verification, handoff and release tooling.
- `operations/`: private operating procedures; actual records are excluded from Git.
- `motion/`: current Civic sources plus historical studies.
- `evidence/` and `output/`: ignored local checks and generated artifacts.

Before deployment, commit and push the candidate, wait for both GitHub **verify** and **visual** jobs, run `npm run technical:check`, then run `npm run predeploy` without changing source or rebuilding afterward. Predeploy verifies the clean tree, upstream commit, exact successfully tested source/artifact hashes and latest exact-commit GitHub checks. See [quality checks](operations/QUALITY_CHECKS.md) for content preservation, screenshot review and shared-control coverage, and [offer updates](operations/OFFER_UPDATES.md) for changing future prices and plan details. The separate technical and release gates remain in force. Run `npm run check:citations` for an opt-in public reference check; blocked sources require manual review.

## Rebuild and check

Use Node.js 24 or later. The full test suite also requires Python 3.9+ and Gitleaks 8.30+ for actual handoff secret scanning. Put Gitleaks on PATH or set `GITLEAKS_BIN` to its executable; see [the handoff prerequisites](operations/CLIENT_HANDOFF.md). CI installs these tools explicitly. From a clean source checkout:

```powershell
npm ci
npx playwright install chromium
npm run setup:tools
npm run build
npm test
npm run verify
npm start
```

Open http://127.0.0.1:4183. The loopback server saves synthetic inquiries locally and sends no email; use invented details. The separate `deployment/` toolchain uses `npm --prefix deployment ci` and `npm --prefix deployment run check` for a Worker dry run. These checks do not deploy.

Run `npm run technical:check` for the combined build, Node tests (including the complete synthetic recovery rehearsal), static verification, local browser journeys and Worker dry run. The broader `npm run release:check` retains business readiness gates and can fail while commercial dependencies remain unresolved. Neither check authorizes billing, outreach or a new provider purchase.

Normal builds use checked-in public assets and Node dependencies. Optional Python asset/font regeneration tools use `python -m pip install -r requirements.txt`; these packages are not required to serve the site. Blender supplies `bpy`/`mathutils` through its own Python runtime, and Blender/FFmpeg must be installed separately for rendering. See `motion/README.md` for render tooling; older design directions there are historical, not the active production art.

## Live workflow

The form saves an inquiry in D1 before requesting an owner notification through Resend to the owner's Gmail inbox, as requested October 17. Public support mail remains at `support@wonderandmethod.com` on Fastmail. A provider-accepted message is not proof of inbox receipt. tawk.to loads after an explicit visitor chat action. Stripe hosts private invoices after fit and written scope approval; the public site does not automatically enroll visitors in monthly services.

The owner confirmed a reply within one business day, Monday–Friday Eastern, and scope-specific production and review dates based on the agreed page map, research, writing and creative work. First contact is by email, with a call arranged if useful. The written scope controls production, review and launch dates. Do not invent a phone number, social profiles, client work or extra staffed Care coverage.

New scopes use [config/offers.json](config/offers.json), version `2026-10-29-v4-offers`. Website plans are $2,195 / $2,995 / $4,495 / $6,495 for up to 10 / 15 / 20 / 25 pages. Website Care is $149 Brochure or $295 Commerce monthly. Production-only Improvement, Local Search Focus and Local Search Partnership start at $299 / $199 / $349 monthly, with the catalog listing all Care-inclusive variants and the eligible Brochure hosting offset. Accepted historical scopes retain their exact saved terms; original V5 material and older offer versions remain historical. Start actual job records with `operations/WORKFLOWS.md`, keeping buyer facts and approvals explicit.

Current website offers are Focused Website, Custom Website, Business Custom Website and Signature Custom Website. They include up to 10 / 15 / 20 / 25 pages at $2,195 / $2,995 / $4,495 / $6,495. Focused adapts an established layout direction; Custom and above start with original art direction. All four include original writing, basic native measurement, agreed launch checks, a source/account handoff and recorded guidance. Review rounds are 2 / 2 / 2 / 3; defect-reporting windows are 30 / 60 / 60 / 90 days. Timely in-scope reports remain covered until corrected, and paid-file delivery does not wait for that window to end. Website builds use 40% / 30% / 30% payment milestones. Read the selected plan in `config/offers.json` for exact journeys, guides, graphics, training and post-launch checks; specialty projects have their own scope. Monthly help is optional, and accepted historical agreements retain their saved terms.

Prepare a client handoff from its dedicated source folder with `node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"`. See [operations/CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md) for the starter, explicit file allowlist, required Node/Python/Gitleaks tooling and verification. With no `--source`, the command packages a fictional sample. It does not launch a site, configure accounts, send submissions or send the ZIP.

## Operations and recovery

Complete the actual prerequisites in [operations/OWNER_READINESS.md](operations/OWNER_READINESS.md) before booking or annual enrollment. The current unresolved requirements are summarized in [BUILD_STATUS.md](BUILD_STATUS.md); older audit ledgers retain their dated scope.

- [HANDOFF.md](HANDOFF.md): daily inbox, operator and recovery workflow.
- [operations/CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md): portable source-folder and ZIP preparation.
- [deployment/PRODUCTION.md](deployment/PRODUCTION.md): deployment, schema and verification gates.
- [deployment/PROVIDERS.md](deployment/PROVIDERS.md): provider roles and ownership.
- [operations/INQUIRY_RETENTION.md](operations/INQUIRY_RETENTION.md): manual 90-day cleanup, client exceptions and preservation holds.
- [operations/INQUIRY_HEALTH.md](operations/INQUIRY_HEALTH.md): business-day aggregate health and independent inbox checks.
- [operations/MEASUREMENT.md](operations/MEASUREMENT.md): private aggregate reports.
- [operations/OUTREACH.md](operations/OUTREACH.md): unsent drafts and requirements before authorized outreach.

Serve only `dist/`. Never serve the repository root, credentials, business records, evidence or exports. Keep secrets, account evidence, `evidence/`, `.runtime/`, private job records and generated private outputs out of Git; review the actual staged inventory before committing. Production secrets use Windows DPAPI CurrentUser. A local encrypted backup is not proof of recovery after losing this Windows account. The private remote source backup, fresh staged-source rebuild, current-schema synthetic restore and migrations through 0006 are recorded in the strict-audit release evidence. Independent account/device and mailbox recovery remain unverified.

Homepage SEO and menu update: `evidence/seo-positioning-20261017/` records the published headline, SEO emphasis, regional links and single mobile header CTA. The earlier Claude reassessment remains a dated audit snapshot.

Technical publication now requires `npm run technical:check` on the clean, pushed commit followed by `npm run predeploy`. The private manifest binds the tested source and generated files to that commit; changing either requires a new check. Existing business enrollment gates are unchanged. See `deployment/PRODUCTION.md`.

The pinned Playwright runner executes against a fresh loopback-only synthetic server. Test requests to other origins and unmocked APIs are blocked. Run `npm run test:browser` after building; reports and failure traces are under ignored `output/playwright/` and retained by GitHub Actions for 14 days. Browser results are required in the technical release manifest. See the current implementation record for limits and client-case preparation.
