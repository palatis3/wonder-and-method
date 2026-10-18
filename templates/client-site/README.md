# Portable custom website source

This is the fictional Maple Studio demonstration. No real client has launched and no message submission is configured. Replace its content and complete review before using it for a client.

Requires Node.js 24 or newer. There are no package dependencies and no install step.

From this folder, run:

```sh
node scripts/build.mjs
node scripts/check.mjs
node scripts/preview.mjs
```

Open http://127.0.0.1:4173 and stop preview with Ctrl+C. The equivalent npm commands are `npm run build`, `npm run check`, and `npm run preview`. Preview listens only on this computer. `PORT=4174` can select a different port in shells supporting that syntax; PowerShell uses `$env:PORT='4174'`.

Edit the files in `public/`. Build copies them into `dist/`; never edit generated files in `dist/`. Upload the **contents** of `dist/` to a static web host. Scripts resolve paths relative to their own location, so they also work when called from another directory. Preserve relative asset references if hosting under a subpath.

Checks validate basic HTML metadata and local HTML references. They are not a browser, accessibility audit, search-ranking guarantee, or test of email delivery. Review each page at narrow and wide sizes, keyboard navigation, real links, images, and agreed functionality before launch.

This starter is deliberately static. Forms, booking, newsletter services, analytics and email require their own implementation and provider setup if separately agreed. Never put a private API key or server credential into browser files. No CMS, editor, client account, portal, or application backend is included.
