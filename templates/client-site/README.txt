Portable custom website source

This is the fictional Maple Studio demonstration. No real client has launched and no message submission is configured. Replace its content and complete review before using it for a client.

Requires Node.js 24 or newer. There are no package dependencies and no install step.

From this folder, run:

node scripts/build.mjs
node scripts/check.mjs
node scripts/preview.mjs

Open http://127.0.0.1:4173 and stop preview with Ctrl+C. The equivalent npm commands are npm run build, npm run check, and npm run preview. Preview listens only on this computer. PORT=4174 can select a different port in shells supporting that syntax; PowerShell uses $env:PORT='4174'.

Edit the files in public/. Build copies them into dist/; always make edits in public/ and rebuild. Upload the contents of dist/ to a static web host. Scripts resolve paths relative to their own location, so they also work when called from another directory. Preserve relative asset references if hosting under a subpath.

Checks validate basic HTML metadata and local HTML references. Browser review, accessibility review, search performance and email delivery require separate checks. Review each page at narrow and wide sizes, keyboard navigation, real links, images, and agreed functionality before launch.

This starter produces a static website. Any agreed connections to forms, booking, newsletter services, analytics or email need their own implementation and provider setup. Keep private API keys and server credentials on the provider or server, outside browser files.
