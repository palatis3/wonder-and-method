Sent the full review once to **Build Wonder and Method workflows** (`01a1372f-80d0-7bf0-b8dc-c159ebe59991`). The tool accepted delivery. The subsequent read showed the main thread active, but **no visible acknowledgment yet**. Nothing was resent.

Official documentation checked **October 31, 2026**. No uploads, deployments, account changes, repository edits, or inquiries were performed.

**Implementable publication contract**

Use API base `https://api.cloudflare.com/client/v4`, bearer-token authentication, and:

```text
S = /accounts/{account_id}/workers/scripts/{script_name}
```

Bind the account, Worker, and environment to the approval.

| Action | Endpoint | Required evidence |
|---|---|---|
| Read preuploaded version | `GET S/versions/{version_id}` | Successful envelope; `result.id` equals the full approved UUID; capture bindings, runtime configuration, metadata, and script ETag when present. |
| Publish at 100% | `POST S/deployments` | Exact approved version vector; retain returned deployment ID and response. |
| Read current deployment | `GET S/deployments?page=1&per_page=100` | First item in **unfiltered** `result.deployments` is documented as the active deployment. |
| Read known deployment | `GET S/deployments/{deployment_id}` | Confirms that deployment’s existence and configuration, not whether it remains active. |
| Roll back | Same deployment POST, with explicitly approved earlier version UUID | Creates a new deployment; does not reverse storage changes or erase history. |

Sources: [Version GET](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/), [Deployment POST](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/), [Deployment list](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/), [Deployment GET](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/get/).

Exact publication payload:

```http
POST /client/v4/accounts/{account_id}/workers/scripts/{script_name}/deployments
Authorization: Bearer <scoped-token>
Content-Type: application/json
```

```json
{
  "strategy": "percentage",
  "versions": [
    {
      "version_id": "<approved-full-version-uuid>",
      "percentage": 100
    }
  ],
  "annotations": {
    "workers/message": "publish attempt=<unique-id>; approval=<approval-id>"
  }
}
```

The message is a caller-supplied correlation label, limited to 1,000 bytes. It is neither idempotency nor provenance. Omit `force`: it can bypass protections such as rollback after a secret change. The inspected contract documents **no idempotency key, expected-current-deployment precondition, or compare-and-swap field**. [Deployment creation contract](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/)

Promotion should reference the already uploaded UUID. Rebuilding or using an upload-and-deploy command during promotion breaks the approved-artifact chain. Rollback likewise needs an explicit UUID; an implicit “previous” version can differ from the previous production deployment. [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/), [Wrangler rollback](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

**Minimum token permissions**

For an existing Worker:

- **Individual Workers Editor**, scoped to that Worker, permits publication and rollback. It also permits other edits; no deploy-only role was documented.
- **Individual Workers Content Read-Only** covers version-detail reads.
- **Individual Workers Metadata Read-Only** covers deployment reads but is not listed for version GET.
- Legacy endpoint permissions also accept **Workers Scripts Write** for publication and **Workers Scripts Read** for reads.
- Route/domain modifications separately require Worker Editor plus **Zone → Workers Routes → Write** for affected zones. Existing-route promotion does not itself need that zone write permission. [Workers roles](https://developers.cloudflare.com/workers/authorization/workers/)

Build provenance reads are separate:

```http
GET /client/v4/accounts/{account_id}/builds/builds?version_ids=<uuid>
```

The query accepts up to 20 comma-separated version UUIDs. Its endpoint accepts **Workers CI Read** or Write. The Builds guide requires a **user-scoped token**; account-scoped tokens are unsupported. Do not grant configuration-edit access merely because a broader setup example uses it. [Builds by version](https://developers.cloudflare.com/api/resources/workers_builds/methods/get_builds_by_version/), [Builds API guide](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)

**What actually binds the approved artifact**

| Evidence | What it establishes—and does not |
|---|---|
| Worker script tag | Provider-assigned Worker identity; different from a version tag or commit SHA. |
| Version UUID | Identifies Cloudflare’s stored code/configuration version in the correct Worker. |
| Version annotations | Caller-provided labels, including `workers/commit_sha`, repository/PR fields, message, tag, and alias. They are not attestations. |
| Source, author, creation time | Upload context. `source=workersci` or `wrangler` does not establish a verified source tree. |
| Build record associated with version | Provider-linked build UUID, commit, repository, commands, root directory, and outcome support provenance checks. |
| Independent artifact manifest | Hashes final module/asset bytes and canonical configuration, linked by a trusted upload receipt to the returned version UUID. |

Versions capture bundled code, static assets, bindings, and compatibility settings; resource data is outside that snapshot. [Versions model](https://developers.cloudflare.com/workers/versions-and-deployments/)

The upload schema accepts commit and repository annotations as input. “Detected from CI” does not make those fields independently trustworthy. [Upload schema](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/)

Version GET describes ETag only as **hashed script content**. It does not specify a canonical hash algorithm or guarantee coverage of every asset, binding, and configuration field. Treat it as supplementary provider evidence, not a verified full-artifact SHA-256. Its documented response also does not include every upload annotation. [Version response](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/)

Recommended approval record:

```text
account_id
worker_identity + script_name + environment
version_id
artifact_manifest_sha256
repository_id + commit_sha + immutable_ci_run_id
build_uuid, when applicable
config_manifest_sha256
dependency_contract_revision
inquiry_destination_revision
approval_id
```

A trusted uploader should hash **final build outputs**, upload those exact outputs, and durably bind the returned UUID to those hashes. Include paths, module types, assets, build-tool/dependency versions, and configuration in the manifest. Keep secrets out of ordinary receipts; record protected secret-version references instead.

Hashing source files and rebuilding later is insufficient. A lost upload receipt cannot be reconstructed solely from matching annotations.

Cloudflare’s build-by-version endpoint exposes associated commit/build details. However, build retries use current configuration, and injected build/commit environment variables can be overridden. Preserve actual build records and output hashes rather than trusting environment strings. [Build association](https://developers.cloudflare.com/api/resources/workers_builds/methods/get_builds_by_version/), [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

**Timeout recovery without duplicate publication**

Recommended local states:

```text
approved → prepared → dispatching → accepted → observed_active
                           ↘ outcome_unknown
historical match + newer deployment → applied_then_superseded
```

Before the POST:

1. Durably register the attempt ID, exact payload/hash, approved UUID, baseline deployment ID, authority, environment, and generation/STOP epoch.
2. Serialize publication per account/Worker.
3. Recheck approval and current deployment immediately before dispatch.

A local lock cannot prevent dashboard users or another credential from deploying concurrently.

After a successful response, preserve the deployment ID and response independently before completing the local transaction. Then check current deployment and actual hostname behavior separately.

After timeout:

| Readback | Correct interpretation |
|---|---|
| Known deployment ID resolves, matching exact payload | Cloudflare accepted that deployment. Check the current list separately. |
| Unique history match by attempt label **plus** exact version vector, Worker, strategy, and plausible time | Recover deployment ID, then confirm through GET. |
| Matching deployment is current | Accepted and observed active **at the observation time**. |
| Matching deployment exists, but a newer deployment is current | Applied, then superseded. Do not automatically republish the old version. |
| Current version is the desired UUID, but no matching attempt evidence exists | Desired state observed; attempt attribution remains unresolved. |
| No match, duplicate matches, missing history, or inaccessible reads | Outcome remains unknown. Do not infer nonexecution or retry the POST. |

Use pagination and clock-skew allowance when searching history. Use an **unfiltered** first page to determine current state; a time-filtered list can omit the active deployment. Preserve readback timestamps and responses. [Deployment history contract](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/)

A delayed original POST can still become active after a later deployment. No documented external fencing/CAS mechanism eliminates that race. Keep unresolved attempts blocking normal automated progression; emergency intervention needs explicit conflict handling and continued observation.

A lease expiring is not proof of nonexecution. Disable automatic SDK/proxy retries for this POST unless execution is known not to have occurred. Postgres and Cloudflare cannot participate in one atomic commit.

A 100% control-plane allocation also does not prove every user response is new: caches, in-flight work, routing, and Durable Objects can differ. The deployment schema supports immediate or deferred Durable Object code updates, including deferred delay up to 86,400 seconds. Record that policy when applicable. [Deployment model](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/)

**Version URLs and runtime evidence**

Cloudflare now calls former preview URLs **Version URLs**:

```text
https://<version-prefix>-<worker-name>.<subdomain>.workers.dev
```

Aliased form:

```text
https://<alias>-<worker-name>.<subdomain>.workers.dev
```

Record the provider-returned URL together with the **full UUID**. An alias is a convenience reference assigned during upload, not an immutable approval identifier; resolve and verify its target each time.

Version URLs use that version’s existing resources. They do not create isolated resources or reproduce all production-zone security/performance settings. They are public when enabled unless protected separately. Current documentation excludes Workers implementing Durable Objects, including Containers, from Version URLs. [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)

The separate branch **Preview** workflow is different. A Preview URL must not be treated as proof of the production Worker’s approved version or resources. [Preview/build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

Recommended runtime check: a protected, uncached handler returning:

```text
env.CF_VERSION_METADATA.id
build_manifest_identifier
request_nonce_echo
```

Configure the version metadata binding:

```json
{
  "version_metadata": {
    "binding": "CF_VERSION_METADATA"
  }
}
```

It exposes version ID, tag, and timestamp. The resulting HTTP response remains application-produced evidence, not cryptographic attestation. Ensure the request executes the Worker rather than returning a cached asset. Check the intended production hostname separately from `workers.dev`. [Version metadata binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)

**Rollback limits and mutable dependencies**

A versioned binding declaration identifies a resource; it does not freeze that resource. Changing Worker B behind Worker A’s service binding does not create a new A version. Routes, domains, and cron triggers are separate operations. [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)

Maintain independent compatibility/recovery contracts for:

- KV, R2, D1, Durable Object and external database data/schema.
- Queued work and downstream services.
- External credentials or secret-store values.
- Routes, domains, triggers, and mutable application configuration.

Documented limitations include:

- Only the last 100 uploaded versions are deployable; rollback documentation also limits eligible history.
- First Worker creation differs from the preupload/promotion workflow.
- Version uploads cannot apply Durable Object class lifecycle changes; those require a deployment workflow that applies migrations.
- Rollback can be blocked by lifecycle changes or deleted referenced resources.
- Successful rollback can still fail against incompatible data formats.
- `force=true` must not become an automatic response to a blocked rollback. [Deployment constraints](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/), [Rollback limitations](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

Use compatible expand/contract migrations and explicit forward repair when necessary. Code rollback does not undo irreversible database or provider actions.

**Inquiry destination verification is independent**

Recommended record:

```text
tenant_id + channel + destination_identifier
configuration_revision
binding_or_secret_reference
destination_authority_verified_at + evidence_ref
transport_status + receipt_status
```

Verify the real form/API route and server-side recipient resolution against the approved tenant, including downstream notification services and mutable stored configuration. Never trust a browser-supplied recipient.

A secret binding name proves neither its value nor mailbox ownership. A deployment annotation saying “inquiries verified” proves neither routing nor receipt.

Read-only review can establish configuration and existing authorization evidence. Synthetic tests can verify routing to an isolated capture sink. Neither proves current real delivery. Keep these states separate:

```text
configured/authorized
provider accepted
destination received
```

No real inquiries were sent.

**Focused failure tests**

1. Same commit/tag, different bundle or asset bytes → approval mismatch.
2. Correct UUID, wrong account/Worker/environment → reject before POST.
3. New unapproved upload becomes “latest” → still publish only approved UUID.
4. POST accepted, response lost → reconcile one deployment; POST count stays one.
5. Receipt persisted, local commit crashes → recover without another write.
6. Later concurrent deployment wins → record superseded; no automatic republish.
7. Desired UUID is current without attempt evidence → attribution unresolved.
8. Original timed-out POST completes late → detect takeover/conflict.
9. Duplicate labels, filtered history, pagination gaps, 403/429, or unavailable reads → remain unknown.
10. Lease expires or authority/STOP generation changes mid-flight → no second dispatch; reconcile remote outcome.
11. Deployment has an extra version or wrong percentage → exact-publication check fails.
12. Alias changes or Version URL reaches production resources → identity/isolation assumptions fail.
13. Cached release check or incorrect production route → distinguish acceptance from runtime verification.
14. Deleted resource, changed secret, or incompatible schema → no automatic forced rollback.
15. Missing upload receipt or ETag-only proof → artifact provenance unverified.
16. Inquiry destination changes without a Worker version change → invalidate prior destination verification.

Core API documentation was accessible. One attempted build-environment page failed retrieval, and a Markdown role-document variant was unsupported; current HTML configuration and role pages supplied the relevant evidence. **No documented idempotency/CAS or canonical full-artifact ETag contract was found.** Actual account permissions, deployed content, and inquiry delivery remain unqualified by this read-only research.
