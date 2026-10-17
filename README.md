# Wonder and Method

Website and operating tools for Wonder and Method, operated by Venture House Group LLC in Buffalo. Current operating documentation was reconciled on October 17, 2026. See [BUILD_STATUS.md](BUILD_STATUS.md) for the distinction between production and the audit candidate.

Production is https://wonderandmethod.com, served by Cloudflare Workers assets with D1 inquiry storage. Search indexing has been on since October 16: keep `config/site.json` `searchIndexing: true` and production `SEARCH_INDEXING: "true"`. `src/index-policy.mjs` selects index-eligible routes and the generated sitemap; private/API/utility routes retain their own restrictions.

The last recorded production release is the October 16 navigation release `2c4e0fb5-6eed-4677-b96b-8214cfdc48d9` (49 routes, 37 index-eligible routes, 14 guides). The October 17 audit candidate has 55 routes, 41 index-eligible routes and 17 guides; it is not yet recorded as deployed. The active art is Civic Sculpture finale-v2, with source readiness in `public/civic-sculpture/finale-v2/pipeline-status.json`. Production builds fail when required motion assets are missing.

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

The audit work is adding `npm run technical:check` as a combined local technical gate; use it once the command is present in `package.json`. The broader `npm run release:check` retains business readiness gates and can fail while commercial dependencies remain unresolved. Neither a successful technical check nor a build authorizes billing, outreach or a new provider purchase.

Normal builds use checked-in public assets and Node dependencies. Optional Python asset/font regeneration tools use `python -m pip install -r requirements.txt`; these packages are not required to serve the site. Blender supplies `bpy`/`mathutils` through its own Python runtime, and Blender/FFmpeg must be installed separately for rendering. See `motion/README.md` for render tooling; older design directions there are historical, not the active production art.

## Live workflow

The form saves an inquiry in D1 before requesting an owner notification through Resend to `support@wonderandmethod.com` on Fastmail. A provider-accepted message is not proof of inbox receipt. Gmail is only legacy correspondence/account recovery. tawk.to loads after an explicit visitor chat action. Stripe hosts private invoices after fit and written scope approval; the public site does not automatically enroll visitors in monthly services.

The owner confirmed a reply within one business day, Monday–Friday Eastern, and typical website delivery in 7–10 days after the agreed start and ready inputs. The written scope controls each project's schedule. Do not invent a phone number, social profiles, client work or extra staffed Care coverage.

Current offer facts come from `config/offers.json`: Launch / Focused / Signature $1,400 / $2,350 / $3,700; Keep Running / Improve / Grow $150 / $400 / $800 monthly; Baseline $399; Sprint $750. Original V5 material remains preserved in `authority/`; accepted historical scopes retain their original terms. Start actual job records with `operations/WORKFLOWS.md`, keeping buyer facts and approvals explicit.

## Operations and recovery

- [HANDOFF.md](HANDOFF.md): daily inbox, operator and recovery workflow.
- [deployment/PRODUCTION.md](deployment/PRODUCTION.md): deployment, schema and verification gates.
- [deployment/PROVIDERS.md](deployment/PROVIDERS.md): provider roles and ownership.
- [operations/INQUIRY_RETENTION.md](operations/INQUIRY_RETENTION.md): manual 90-day cleanup, client exceptions and preservation holds.
- [operations/MEASUREMENT.md](operations/MEASUREMENT.md): private aggregate reports.
- [operations/OUTREACH.md](operations/OUTREACH.md): unsent drafts and requirements before authorized outreach.

Serve only `dist/`. Never serve the repository root, credentials, business records, evidence or exports. Keep secrets, account evidence, `evidence/`, `.runtime/`, private job records and generated private outputs out of Git; review the actual staged inventory before committing. Production secrets use Windows DPAPI CurrentUser. A local encrypted backup is not proof of recovery after losing this Windows account. Private remote backup, clean-clone restore and new schema deployment remain work in progress until their separate evidence is recorded.
