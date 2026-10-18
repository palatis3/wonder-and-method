# Run one job through six stages

Current offers come from `config/offers.json` and the versioned commercial snapshot saved with each job. New builds are $1,400 Launch, $2,350 Focused and $3,700 Signature. Keep Running, Improve and Grow are $150/$400/$800 per monthly cycle or $1,710/$4,560/$9,120 for twelve prepaid cycles. The baseline is $399; Audit & Fix Sprint is $750. Original V5 assumptions and `service-rules.json` are historical; their old prices, word limits and economics do not control new work. Previously accepted agreements retain their rights and prices.

New website plans deliver custom code, one initial launch, a source folder/ZIP, written build/publishing notes and one optional handoff call of up to 30 minutes. Expanded packages include 6/15/30 marketing pages, 0/2/4 researched launch articles or guides within those totals, complete writing or rewriting and essential FAQs, keyword and on-site SEO, and reviews of up to 2/3/5 relevant search competitors. Launch/promotional graphics total 1/6/12 distinct finished designs; supplied-photo allowances remain 0/6/12. Focused includes up to five prioritized content ideas; Signature includes up to ten in a 90-day handoff plan, not ongoing production or monitoring. Existing motion scope, two review rounds, prices, payment terms and 30-day defect correction are retained. Launch includes up to one ready-service link or compatible standard embed; Focused and Signature include up to two. No CMS/browser editor/editor accounts, application/portal/store/CRM, booking/newsletter account configuration, tracking-number setup or scheduled growth follow-up is bundled. Requests for these need separate feasibility, scope, costs and approval. This new-offer model does not remove promised work from an accepted historical agreement.

Use `.runtime/operations/weekly-board.json` as the private business board (`weekly-board.json` is the tracked blank template) with one row per economic buyer and links to that job's accepted scope and cumulative receipt. Keep actual client records in ignored `operations/jobs`, outside public assets. Unknown values remain unknown. Synthetic tests never establish a real business gate.

Create an offer draft with `node scripts/create-job.mjs JOB-ID OFFER-ID`. Offers: `launch_site`, `focused_site`, `signature_site`, `keep_running`, `improve`, `grow`, `website_baseline`, `audit_fix_sprint`. Add `--annual` only for an ongoing plan. `npm run local:packet -- operations/jobs/JOB-ID` renders a buyer-review packet, not an issued invoice. [PAYMENTS.md](PAYMENTS.md) explains the separate Stripe workflow.

## 1. Fit

Record buyer job, intended customer action, existing-site strengths, editing needs, input owner, approver, timing, dependencies and investment. Confirm that source-code editing or separately agreed editing help suits the buyer; a bundled browser editor is not an option in new website plans. Choose an offer only when it fits; no change, a finite repair, separate scope, referral or no fit are valid outcomes. Confirm the buyer can handle the wanted inquiries.

Research is not a qualifying conversation or a sale. Keep only business contact details needed to respond or deliver. Every board row needs a next action, accountable owner and date. Outreach or marketing sends require explicit authorization.

## 2. Quote and book

Complete the current offer's actual pages, launch-guide topics inside the page total, keyword-to-page map, competitor review, distinct graphic list, facts/rights, editing route, forms, integrations, tests, exclusions, provider inventory, review stages and dates. Use its current scope and payment schedule, not historical limits. Preserve each accepted commercial snapshot.

For ready-service links/embeds, record the client-supplied destination, its readiness and compatibility, the plan's one/two-item allowance and the completion check. Do not promise provider account setup, campaigns or automation. Record the supported hosting/contact path, source delivery, one initial launch and optional 30-minute handoff call. Keep later growth work in its separate agreement; the correction window is not a growth allowance.

Clients own and pay for hosting, domains and paid tools directly. Resolve required/optional providers, plans, currency/taxes, setup and renewal amounts/dates, seats, usage/overage, licenses, export, support and recovery before acceptance. Unknown mandatory costs block commitment. Resolve contracting identity, agreement, tax/invoice and coverage decisions for the work.

Use actual dated capacity and cash. Include leave, outside obligations, coordination, sales/admin, reviews, launches, service cycles and the complete correction tail, plus any separately agreed or historically owed follow-up. V5 calculators are conservative historical aids; their output does not prove today's offers profitable or staffed. Do not enlarge capacity using unmeasured estimates. Record actual work and revise planning from evidence.

Book only after fit, written exact-version scope, named approver, ready inputs, dated slot, cash/capability checks and agreed booking payment. Use [PAYMENTS.md](PAYMENTS.md). An unrestricted public purchase link cannot replace these checks.

## 3. Design and build

Build from approved facts, rights and direction. Log actual active labor and performed work. The named approver supplies consolidated feedback. Record written design acceptance before its milestone invoice; silence is not acceptance.

A change card names the changed deliverable, test, fee/payment, date effect and written approval before extra work. Append it to the same receipt and preserve the earlier scope. Defects against sold scope remain owed and do not consume revisions or improvement allowances. Late inputs receive a named blocker, notice, next update and revised available date.

## 4. Approve and launch

Verify the accepted scope: mobile/keyboard/zoom/reflow/reduced motion, real form and intended-mailbox receipt, errors/duplicates/spam, redirects/status/canonical/sitemap, agreed indexing, performance, confidentiality, rights, client access and rollback. Synthetic results do not establish a real client's delivery.

Obtain written exact-version staging acceptance. For builds, collect the final 20% after acceptance and before launch. Block release for broken inquiries, missing mailbox proof, secrets, unsupported claims, unlicensed assets, indexable confidential staging, critical accessibility barriers, missing rollback or missing acceptance. Publish in a confirmed staffed window with recovery ready; record target/version/date and exceptions with owners.

## 5. Correct and hand over

The build defect window is 30 calendar days from launch. New website offers do not include scheduled growth follow-up. Separately agreed work and historical accepted follow-up remain owed, including work delayed by the studio. Provide the paid source folder/ZIP, assets/licenses, agreed account map, build/publishing instructions and unresolved-item notes within five business days of relevant paid completion or reconciled termination. Offer the included optional handoff call of up to 30 minutes; extra training or a software-operation course needs separate scope. Confirm client access without waiting for the correction window to end.

Use `node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"` and [CLIENT_HANDOFF.md](CLIENT_HANDOFF.md). The command uses an explicit file manifest, a real secret scan, a fresh-copy build/check and ZIP checksum comparison. Record its archive path/checksum and verification results in the existing release/handoff receipt. Review ownership/content before sending; scanning cannot guarantee the absence of all secrets or private information. The delivered folder contains `START-HERE.txt`, `website-source/`, `ready-to-host/`, `docs/` and `verification/`. Keep actual launch, form/inbox delivery and provider-access evidence separate from local packaging proof. Static files are portable; connected services, email, DNS and provider accounts require their own setup or migration.

At exit stop future renewal and reconcile completed work, approved committed costs, payments, unused periods and unearned work. Deposits are not automatically earned. Deliver paid materials, record export/access and retention ownership, and remove unnecessary delegated access. Service cancellation or unrelated billing must not disable paid client-owned work. New migration is separate only when outside the accepted handoff scope.

## 6. Optional service

No further studio service is a normal outcome. Keep Running includes the current care and supplied-update batch; Improve adds one agreed priority and Grow adds two delivered sequentially. Use the saved current offer for complete deliverables/exclusions; do not invent hourly or word quotas.

Before enrollment establish supported-site fit, usable baseline, actual coverage, contact/escalation routes, paid period/timezone, written cancellation route, useful work and ready inputs. A usable baseline included with a build or Sprint is not sold again. Build defect correction and separately paid service remain distinct; historically included follow-up remains owed or explicitly credited without charging twice.

Monthly service is prepaid per agreed cycle with no minimum term. Cancellation before recorded renewal stops the next cycle. Apply the five-business-day useful-work/input check for improvement work; pause the next invoice if its prerequisites are absent. If charged without required useful work, honor the current refund/credit and unearned-work terms. Record actual checks and a dated receipt; never mark an unperformed check passed.

Annual service is twelve prepaid cycles with manual written renewal. Record each cycle and fund the gross unearned balance plus separate fee buffer before enrollment. Reconcile earned work, unearned liability and delayed accepted work monthly. Refund future whole unused cycles at the discounted equivalent; no penalty, retained processing fee, discount clawback or repricing completed cycles. Initiate refunds within the agreed ten-business-day deadline; bank posting time is separate. Preserve historical signed benefits.

Baseline and Sprint are finite offers with their own acceptance and correction terms. Baseline is $399 after fit, before work. Sprint is $375 before work and $375 after written completion acceptance. Neither enrolls a customer in ongoing service automatically.

Before the first booking, complete `operations/OWNER_READINESS.md`. The dated capacity draft is a planning aid, not availability or measured delivery evidence. Keep one build start at a time until a full delivery is reconciled.
