# Eight-location publication-record review

Reviewed October 23, 2026. **No actionable findings.** The current publication documentation agrees with the saved release evidence and preserves the relevant limits. Earlier content and implementation reviews remain closed.

## Records checked

Reviewed the current release changes and relevant operating sections in README.md, BUILD_STATUS.md, HANDOFF.md, deployment/PRODUCTION.md, this release's README.md and RELEASE.md. Checked the private release-record.json, artifact-parity.json, ci-result.json, live-http.json, new-routes.json, database-preservation.json, backup-record.json, operator-after.json and google-receipt.json. Also inspected the retained Google screenshot and summaries of the initial propagation checks and final transport-retry record.

No raw database export or SQL was read. No external action, test rerun, rebuild or source change was performed.

## Consistency findings

- **Application identity:** All current release summaries name source `7ced8bd52e428d46fee9b72344d06d38a4d3ef6a` and authenticated runtime `d9a3fef4-ad7a-4485-8f2c-fcb43a159f01`. The operator response independently reports both values, a clean release and 197 routes. Later documentation commits are explicitly separate from that application identity.
- **Exact-source verification:** CI run 39908668095 completed successfully for the named commit with successful verify and visual jobs. artifact-parity.json and release-record.json agree on source and artifact fingerprints and 283 expected browser passes, 164 skips, zero unexpected results and zero flaky results. The recorded 690 unit passes and 34 unchanged visual references remain consistent with the release summaries.
- **Live parity and inventory:** The final live record identifies the expected runtime, contains 197 matching HTML results and reports 1,129 matching asset hashes and 196 eligible sitemap routes. The expected error page returns 404 and is not index eligible. The eight-route record contains 40 passing checks and zero failures. Documentation correctly distinguishes 73 collection pages/83 identities from 74 direct service pages/84 identities when Buffalo/Erie is included, and 209 contract HTML files from 197 public routes.
- **Propagation:** The initial eight-route result records 13 failures; the later result records none. The initial full-site log is retained, and the final full-site timestamp follows those initial probes. The release record explicitly attributes the mixed results to the preceding runtime during propagation and records closure without source/configuration changes. The final transport-retry file contains an empty retry list. Documentation does not conceal the initial failures or describe a source fix.
- **Database preservation:** The pre-migration backup record reports a local restore with integrity “ok,” zero foreign-key errors, four inquiries and 459 aggregate rows. The post-migration preservation record reports only the expected 0024 addition, preservation of all four inquiries and 459 prior aggregate rows, integrity “ok” and zero foreign-key errors. The documented 445 historical keys plus eight additions equals the reviewed 453-key allowlist. The schema is appropriately described as expanded, not unchanged.
- **Historical routing:** Current reports expressly reuse the previous 1,576-check live matrix because its fixture, redirect map and canonical implementation are unchanged. They do not claim that matrix was rerun. This is consistent with the prior implementation review and the release-record reuse flag. The 332 historical paths, 49 restored paths and 283 redirects are consistent.
- **Google:** The saved screenshot visibly shows the production sitemap, October 23 submitted/read dates, Success, 196 discovered pages and zero discovered videos. google-receipt.json records successful submission at 09:41:04.289Z and the same result. Documentation correctly avoids claiming indexing or rankings. The earlier HTTP verifier's submissionPerformed:false is not a contradiction: that verifier preceded the separate Google action.
- **Operational limits:** operator-after.json reports healthy authenticated status on the new runtime. Its latest scheduled success is 09:17:29.844Z, before this deployment; the release record correctly sets postDeploymentScheduledSuccessObserved and newExternalReceiverReceiptObserved to false. The documents preserve these distinctions and do not equate provider acceptance, healthy status or a local restore with inbox receipt, sustained reply coverage or independent recovery.
- **Remaining work:** Business enrollment, owner/client evidence, annual-service and independent-recovery requirements remain in force. The documents explicitly say the remaining individual county review continues and do not declare all 1,079 entries assessed or the business complete. Earlier releases in PRODUCTION.md are clearly labeled historical.

## Links and closure

Checked local Markdown link destinations in the six documents. All existing targets resolve; this review supplies the publication-record.md target referenced by RELEASE.md. Current CI links use the verified run identity, and private evidence remains referenced by its saved location rather than copied into public output.

The publication record is consistent and ready to commit with the documentation update. This review confirms the saved evidence and statements at this checkpoint; it does not claim a new live probe, a later scheduled receipt or completion of the remaining market/business work.

Only this review file was written.
