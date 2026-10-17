# Implementation status — October 17, 2026

| State | Recorded baseline |
|---|---|
| Production | October 16 navigation release `2c4e0fb5-6eed-4677-b96b-8214cfdc48d9`; 49 routes, 37 index-eligible routes, 14 guides |
| Audit candidate | Local build: 55 routes, 41 index-eligible routes, 17 guides; deployment and live verification pending |
| Search | Indexing enabled since October 16; keep site `searchIndexing` and Worker `SEARCH_INDEXING` true |
| Media | Civic Sculpture finale-v2; readiness input `public/civic-sculpture/finale-v2/pipeline-status.json`; required motion assets enforced by production build |
| Communication | D1 save → Resend owner notification → Fastmail support inbox; explicit-action tawk.to chat |
| Payments | Private Stripe invoices after fit/scope approval; no public automatic monthly enrollment |

Production release evidence is under `evidence/navigation-refresh-20261016/`. The Claude audit and independent implementation assessment are under `evidence/claude-audit-20261017/`; they describe the baseline and proposed acceptance criteria, not a post-change score.

The candidate includes inquiry recovery bounds, fenced notification leases, new notification payload snapshots, follow-up/retention operator support and more specific aggregate page categories. Migration `0003_inquiry_followup.sql` adds nullable last substantive contact, client/hold fields and frozen payloads without a creation-date backfill. Migration `0004_journey_categories.sql` preserves existing aggregate rows while extending fixed categories. Local source presence does not prove either migration or the candidate Worker is deployed.

Current runbooks are reconciled to Fastmail, indexing-on production and the candidate boundary. The owner's confirmed facts are Buffalo, a one-business-day reply Monday–Friday Eastern, and typical delivery 7–10 days after the agreed start and ready inputs. No phone number, social profile or paid-client evidence is invented.

Still to record: final candidate technical and browser results, migration state, exact production version and live parity, requested Google notification outcome, sanitized private Git backup and clean-clone recovery. Do not claim these complete based on documentation or local tests. Any unresolved business readiness, staffed Care coverage, real-client validation, provider billing and independent legal review retain their own gates.

Earlier dated releases, route counts, noindex periods, design directions, inbox setup and performance measurements remain historical evidence in their release folders. They are not current operator instructions or measurements of this candidate. Do not infer a new audit score from fixes implemented or tests passed.
