# Eight-state release candidate

This candidate combines the reviewed Minnesota, Oklahoma, Kansas, Nebraska, North Dakota, South Dakota, California and New Mexico work, together with the pending footer simplification and reviewed guide-link and scope corrections. Publication is pending the combined release gates.

| States | Counties assessed | New service pages | Directory-only decisions | New FAQ pairs |
|---|---:|---:|---:|---:|
| Minnesota and Oklahoma | 164 | 141 | 23 | 10 |
| Kansas and Nebraska | 198 | 123 | 75 | 6 |
| North Dakota and South Dakota | 119 | 83 | 36 | 5 |
| California and New Mexico | 91 | 82 | 9 | 5 |
| Total | 572 | 429 | 143 | 26 |

The candidate adds eight state directories and 429 service pages, for 437 added routes relative to the published Missouri/Iowa application. It contains 2,081 application routes, 2,069 eligible sitemap URLs, 1,935 service records and 273 FAQ pairs on 203 pages. All 572 counties have individual content decisions; no new general guide was justified. The directory covers 2,786 county-equivalent identities across 39 states and Washington, DC.

Every accepted page has retained source and locality evidence, complete comparisons with relevant existing service/FAQ and guide content, concrete owner inputs and proposed acceptance checks. Keyword observations retain explicit zeros, unavailable values and partial refresh limitations. Search volumes neither determine a page quota nor establish county-resident demand. Public examples do not imply a local office, client relationship, endorsement or tested booking transaction.

Migrations 0040–0043 extend the daily journey-page set from 1,616 to 2,053 keys. A fresh private production export, in-memory rehearsal, integrity and foreign-key checks, and preservation of existing rows and unrelated schemas are required before deployment. The preceding Worker remains the rollback candidate; rolling back code does not restore the database.

Release verification must bind the complete 15-job GitHub run to the exact commit, source and generated artifact. Browser exclusions require independent review; no failed, skipped or partial gate qualifies. The checked local artifact must match Linux CI byte-for-byte. After deployment, all live route and asset hashes, authenticated runtime identity, genuine scheduled recovery, external monitoring receipt and actual Search Console result must be recorded. Ordinary verification does not submit a real inquiry or send a manual heartbeat.

Private release evidence is kept in `evidence/eight-state-release-20261026/`. A completed publication record will replace this pending status only after those checks succeed. Search Console discovery is not proof of indexing, ranking or traffic.
