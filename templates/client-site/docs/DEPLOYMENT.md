# Initial static deployment and provider portability

## Example host configuration

| Setting | Value |
| --- | --- |
| Source / project root | `website-source/` |
| Runtime | Node.js 24 or newer |
| Install command | None; no dependencies |
| Build command | `node scripts/build.mjs && node scripts/check.mjs` |
| Publish / output directory | `dist` |
| Manual static upload | Contents of `ready-to-host/` |
| Required environment variables | None |

These are generic static-host settings, not a provider account or deployment receipt. For an ordinary static host such as Cloudflare Pages, Netlify, or GitHub Pages, confirm its current upload/build interface and use the matching output directory. A host that requires a Git repository can use a separate client repository containing `website-source/`. This folder also works with a conventional web server that serves static files. No provider CLI, credentials, or provider configuration is bundled.

The agreed website package includes one initial launch. The launch operator must confirm the client-owned domain and hosting destination, configure DNS and HTTPS where agreed, deploy the reviewed build, and test the public URL and agreed interactions. Record the actual URL, date, host, and checks in the project record. Generating this folder does not perform or prove a launch. Hosting, domain renewals, and later deployments are not silently provided by this archive.

Source files, HTML, CSS, and browser JavaScript can move between static hosts. DNS records, certificates, redirects, server headers, domain/email settings, provider accounts, and service-specific endpoints do not automatically move with them. Preserve or recreate these separately when moving hosts. For a site under a URL subpath, test all links at that subpath.

## Forms, email and third-party features

The fictional sample has no form and sends nothing. A `mailto:` link, if later added, opens a visitor's email application and does not guarantee delivery. A real contact form needs a configured endpoint, spam protection, validation, consent where appropriate, and end-to-end delivery tests. A static upload alone does not supply these. Provider-side secrets must remain on the server/provider, never in this source or ZIP.

Ready-service links or embeds may use existing client-owned destinations within the signed package's allowance: up to one for Launch, up to two for the upper website plans. The client supplies a service that is ready to use. Creating/configuring booking or newsletter accounts, a CMS/editor, apps, portals, stores, CRM, tracking-number setup, and scheduled growth follow-up are not bundled. Each actual provider connection needs its own setup record and migration instructions. Email accounts and historical messages are not included in this source delivery.
