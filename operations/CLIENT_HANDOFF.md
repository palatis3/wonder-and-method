# Custom-code website handoff

Run one command from the Wonder & Method repository:

```sh
node scripts/prepare-client-handoff.mjs
```

This creates a **fictional sample**, not a deployed client website. The CLI prints the completed folder, dated ZIP, archive SHA-256 and file counts. Default output is ignored `output/client-handoffs/`. A client run uses the same command with `--source "PATH/TO/DEDICATED-CLIENT-FOLDER"`; use `--out .runtime/source-handoff` for a local rehearsal. Do not pass the studio repository as the client source or collect multiple clients into one source folder.

## Prerequisites and first client folder

- Node.js 24 or newer.
- Python 3.9 or newer, including its standard-library `zipfile` module; it creates and checks ZIPs without an npm dependency. The command tries `python3`, then `python`; override with `--python PATH`.
- Gitleaks 8.30 or newer. The command uses `--gitleaks PATH`, `GITLEAKS_BIN`, the ignored local `.runtime/tools/gitleaks/bin/gitleaks.exe` on Windows (`gitleaks` on other systems), or `gitleaks` on PATH. Missing/failing scanners fail the handoff; there is no skip flag. CI must install these runtimes/tools explicitly.

Copy `templates/client-site/` into a dedicated client source directory. Change the approved content and styling, `handoff-manifest.json` identity, and project documentation. For a real source delivery use `status: "client-delivery"` and an accurate scope reference; do not leave fictional project text or present packaging as a completed launch. Keep the manifest's `sourceFiles` and `documentFiles` as exact forward-slash relative file paths. Add every approved new page/asset explicitly; directories and globs are not accepted. `documentFiles` are ordinary readable `.txt` files beneath `docs/`; use `README.txt` for source instructions. Write client instructions as plain text with readable paragraphs and commands, without formatting syntax. The dependency-free contract uses `scripts/build.mjs`, `scripts/check.mjs`, `scripts/preview.mjs` and builds into `dist/`. Projects requiring dependencies or server-side features need a separately reviewed packaging workflow.

The approved package retains its price, page cap, creative/motion scope, payment terms, two review rounds and 30-day defect correction. It delivers custom code, one initial launch, a source folder/ZIP, written build/publishing notes and one optional handoff call of up to 30 minutes. Launch allows up to one ready-service link or compatible standard embed; Focused and Signature allow up to two. The client supplies ready-to-use services; configuring those services is not included. Accepted historical agreements retain their original obligations. This workflow does not replace `scripts/job-packet.mjs`, which handles internal scope/billing review, and does not include that private packet in the delivery.

## What the command verifies

1. Validate the explicit allowlist and disjoint source/output directories. Reject traversal, symlinks/junctions, hardlinked files, hidden/repository internals, dependency folders, generated files, private/credential/billing/database filenames, archives and unsupported formats, even when named in the manifest. Output is limited to this workspace's ignored `output/` or `.runtime/` trees.
2. Copy only listed source and docs into a fresh staging folder. Scan them with Gitleaks defaults before executing build scripts. Ambient scanner config, ignore files and inline allow comments cannot suppress that scan.
3. Run the delivered build and check scripts in the fresh copy. Require a static `dist/index.html`, reject unsafe generated paths, copy the built files to `ready-to-host/`, and verify source hashes stayed unchanged. No dependency installation occurs.
4. Add `START-HERE.txt`, the manifest, check/scan metadata and SHA-256 inventory. Scan the complete content before adding generated verification metadata. Gitleaks raw output and reports stay in temporary staging and are removed; detected secrets fail without printing their values.
5. Create a dated ZIP with Python's standard library. Test ZIP CRCs and compare every archive path and SHA-256 with the delivered folder. Publish the folder and ZIP only after success. The inventory covers every delivered file except the inventory itself; the ZIP check covers all files including the inventory.

The delivery contains `START-HERE.txt`, `website-source/`, `ready-to-host/`, `docs/`, and `verification/`. The source tree has no prebuilt `dist/`, private operations records, package installations, repository history, deployment credentials, or another client's directory. Manifest selection plus human content review is essential: automated tools cannot infer client ownership from ordinary content or guarantee that every secret/private fact is absent. Build/check scripts are trusted local code, **not sandboxed**; review unfamiliar scripts before executing them. The scanner does not make untrusted code safe.

## Release and one initial launch

Review the unpacked site in a browser, including mobile widths, keyboard navigation, copy, links, images and all agreed functionality. Confirm that every file belongs to this client and that rights/approved scope permit its delivery. Resolve any real scanner finding at its source; do not create scanner exclusions to ship credentials. A scanner error or missing runtime must be fixed before packaging again.

Use the client-approved static-host destination for the included initial launch and confirm DNS/HTTPS and the public pages. Record the real URL, date, host and actual checks in the internal project record. A ready-to-host folder or successful local build is not evidence of public launch, form submission, inbox delivery, account configuration, or client acceptance. The fictional sample verifies none of those external actions.

The delivered deployment notes contain generic provider configuration and describe service portability. Static files are portable; provider accounts, DNS, email, form handling, booking/newsletter endpoints, redirects and server headers need separate setup or migration. Describe the agreed deliverable affirmatively in client instructions. Further work requires a separate agreement. Keep provider secrets in the appropriate secure account, outside this archive.

## Targeted checks

```sh
node --test tests/client-handoff.test.mjs
node scripts/prepare-client-handoff.mjs --out .runtime/source-handoff
```

Tests use the real installed Gitleaks for successful packaging and a synthetic secret rejection. They exercise fresh extracted-source rebuilding, archive checksums, missing scanner failure, malformed paths, forbidden private files, symlinks, changed source and unsafe generated build output. No accounts, network submission or deployment are created.
