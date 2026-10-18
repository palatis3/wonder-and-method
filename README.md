# Wonder and Method

Website and operating tools for Wonder and Method, operated by Venture House Group LLC in Buffalo. Current operating documentation was reconciled on October 17, 2026. See [BUILD_STATUS.md](BUILD_STATUS.md) for the current production release and remaining business dependencies.

Production is https://wonderandmethod.com, served by Cloudflare Workers assets with D1 inquiry storage. Search indexing has been on since October 16: keep `config/site.json` `searchIndexing: true` and production `SEARCH_INDEXING: "true"`. `src/index-policy.mjs` selects index-eligible routes and the generated sitemap; private/API/utility routes retain their own restrictions.

The last verified production release is the October 17 buyer-experience update `707651fa-6602-40e0-ba83-a33643a0fa3f` (66 routes, 42 index-eligible routes, 17 guides). All 258 tests, a fresh staged-source rebuild, the deployment dry run and private GitHub CI passed for that release; 66 live pages and 212 asset hashes matched. An independent Astra review cleared all ten improvements with no open findings. Evidence is under `evidence/next10-implementation-20261018/`. Three fictional concepts remain clearly labeled. The active art is Civic Sculpture finale-v2, and all approved package artwork is preserved.

The owner-approved source-handoff simplification is being implemented locally. Whole-release verification and publication are pending; the prior production evidence does not verify these new changes. New quotes follow the current `config/offers.json` version, while accepted agreements retain their saved terms.

The private lead pipeline is ready in `.runtime/operations/weekly-board.json`; `npm run leads -- report` shows current stages by service and stated source. See [operations/LEAD_PIPELINE.md](operations/LEAD_PIPELINE.md). Actual buyer records stay out of Git and public assets. Gmail inquiry routing remains as verified in the prior release.

## Rebuild and check

Use Node.js 24 or later. From a clean source checkout:

```powershell
npm ci
npm run build
npm test
npm run verify
npm start
```

Open http://127.0.0.1:4183. The loopback server saves synthetic inquiries locally and sends no email; use invented details. The separate `deployment/` toolchain uses `npm --prefix deployment ci` and `npm --prefix deployment run check` for a Worker dry run. These checks do not deploy.

Run `npm run technical:check` for the combined build, tests, static verification and Worker dry run. The broader `npm run release:check` retains business readiness gates and can fail while commercial dependencies remain unresolved. Neither check authorizes billing, outreach or a new provider purchase.

Normal builds use checked-in public assets and Node dependencies. Optional Python asset/font regeneration tools use `python -m pip install -r requirements.txt`; these packages are not required to serve the site. Blender supplies `bpy`/`mathutils` through its own Python runtime, and Blender/FFmpeg must be installed separately for rendering. See `motion/README.md` for render tooling; older design directions there are historical, not the active production art.

## Live workflow

The form saves an inquiry in D1 before requesting an owner notification through Resend to the owner's Gmail inbox, as requested October 17. Public support mail remains at `support@wonderandmethod.com` on Fastmail. A provider-accepted message is not proof of inbox receipt. tawk.to loads after an explicit visitor chat action. Stripe hosts private invoices after fit and written scope approval; the public site does not automatically enroll visitors in monthly services.

The owner confirmed a reply within one business day, Monday–Friday Eastern, and typical website production of 7–10 working days after the agreed start and ready inputs, plus agreed client review windows. First contact is by email, with a call arranged if useful. The written scope controls production, review and launch dates. Do not invent a phone number, social profiles, client work or extra staffed Care coverage.

Current offer facts come from `config/offers.json`: Launch / Focused / Signature $1,400 / $2,350 / $3,700; Keep Running / Improve / Grow $150 / $400 / $800 monthly; Baseline $399; Sprint $750. Original V5 material remains preserved in `authority/`; accepted historical scopes retain their original terms. Start actual job records with `operations/WORKFLOWS.md`, keeping buyer facts and approvals explicit.

All new website plans deliver custom code, one initial launch, a client source folder/ZIP, written build/publishing notes and one optional handoff call of up to 30 minutes. Existing 3/7/12-page caps, creative/motion scope, two review rounds, payments and 30-day defect correction are unchanged. Launch includes up to one ready-service link or compatible standard embed; Focused and Signature include up to two. The client supplies ready-to-use services. CMS/browser editors or editor accounts, applications/portals/stores/CRM, booking/newsletter account configuration, tracking-number setup and scheduled post-launch growth work are separate scope. Monthly services remain optional.

Prepare a client handoff from its dedicated source folder with `node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"`. See [operations/CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md) for the starter, explicit file allowlist, required Node/Python/Gitleaks tooling and verification. With no `--source`, the command packages a fictional sample. It does not launch a site, configure accounts, send submissions or send the ZIP.

## Operations and recovery

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
