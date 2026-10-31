# Website publication

The publisher promotes a preuploaded Cloudflare Worker version at 100%. It checks
the current deployment and an uncached runtime response independently. A rollback
selects an earlier uploaded artifact and obtains a fresh approval through the same
workflow. It never rebuilds during promotion or uses an implicit previous version.

## Trusted upload

Run the upload helper only in a controlled build job after required GitHub checks.
Supply `CLOUDFLARE_WEBSITE_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and
`GITHUB_BUILD_TOKEN` through
the job's protected environment. The Supabase secret is an `apikey`, not a user JWT.
The helper uploads final module bytes without deploying them. Its exclusive local
receipt prevents an accidental rerun from creating another version after a timeout.
`WEBSITE_BUILD_WORKFLOWS` is a server-controlled JSON array of qualified
`owner/repository:.github/workflows/build.yml` identities. The uploader queries the
exact GitHub Actions run and requires completed/success, the matching repository,
commit and approved workflow before making the Cloudflare upload request.

```text
node scripts/workspace-upload-website.mjs BUILD_MANIFEST.json UPLOAD_RECEIPT.json
node scripts/workspace-upload-website.mjs BUILD_MANIFEST.json UPLOAD_RECEIPT.json --register
```

The second command retries database registration of a saved confirmed upload only.
The receipt freezes the verified source/build identity, business, target and
dependency revision before upload. Registration derives its identity from that
saved tuple and rejects a changed manifest rather than relabeling old bytes.
An `upload_started` receipt without a confirmed version UUID needs investigation;
it is never silently replayed. Preserve upload receipts with the independent build
artifacts. A commit annotation or Cloudflare ETag alone cannot replace this evidence.

Build manifest example (all identifiers must come from the actual target/build):

```json
{
  "organization_id": "<business UUID>",
  "target_id": "<registered website target UUID>",
  "account_id": "<Cloudflare account ID>",
  "worker_name": "<existing Worker>",
  "dependency_revision": "<accepted dependency/recovery contract>",
  "repository": "<repository identity>",
  "commit_sha": "<full commit SHA>",
  "ci_reference": "https://github.com/<owner>/<repository>/actions/runs/<successful-run-ID>",
  "modules": [{"name":"worker.mjs","path":"worker.mjs","type":"application/javascript+module"}],
  "metadata": {
    "main_module":"worker.mjs",
    "compatibility_date":"2026-10-31",
    "bindings":[
      {"type":"version_metadata","name":"CF_VERSION_METADATA"},
      {"type":"plain_text","name":"WM_RELEASE_MARKER","text":"<unique build UUID>"}
    ]
  }
}
```

The client Worker includes `releaseProbe` before static assets or cache handling.
It returns the provider version UUID, build marker and request nonce with no-store.
The marker is deliberately distinct from the final artifact digest to avoid a
self-referential hash. The uploader hashes every final module and configuration.
Only nonsecret upload metadata belongs in the manifest/receipt. Current helper
supports module artifacts up to 10 MB; native static-asset upload sessions and
secret-value provisioning require their own trusted build integration.

## Review and promotion

Register the exact account, existing Worker, environment, origin and dependency
contract in the operator website panel. Configure the matching server-side
`WEBSITE_TARGETS` JSON allowlist, scoped `CLOUDFLARE_WEBSITE_TOKEN`, and
`WEBSITE_PUBLICATION_ENABLED=true` only after the target has been qualified.
Global `EFFECTS_ENABLED` and independent recovery controls also apply.

Prepare a website review from the trusted artifact. The Worker reads the current
deployment as its baseline. The customer approval binds account/target, immutable
version, final artifact/configuration digests, source/build identity, baseline and
dependencies. Publication rechecks those bindings, the executing operator, current
customer authority, source facts and independent durable upload/approval receipts.
Only one unresolved publication can proceed per exclusively registered target.

Cloudflare has no documented deployment compare-and-swap or generic idempotency
key. An external dashboard deployment can race the final read. A lost POST result
therefore stays unknown: reconciliation searches bounded complete history for the
exact attempt label and version vector, confirms its deployment record and current
state, then checks the runtime route. A later deployment remains a visible
superseded outcome, with no automatic republish. Proven pre-POST drift cancels
before dispatch instead of inventing an uncertain write.

Publishing code does not restore databases, object bytes, bindings' data, DNS,
routes, credentials or inquiry destinations. The delivery plan separately records
authorized inquiry submission and destination receipts, owner access and handoff.
Production app access, uploaded versions, permissions and real delivery remain
qualification work; local fixtures do not establish them.

References: [version upload](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/),
[deployment creation](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/),
[deployment inventory](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
[version metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/),
[Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys).
