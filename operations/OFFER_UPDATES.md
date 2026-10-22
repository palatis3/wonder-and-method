# Updating current offers

`config/offers.json` is the source for current prices, names and scope. The site build, browser price data, buyer downloads, new quote drafts and payment catalog read it. Updating it does **not** publish the site, change Stripe products, send invoices or modify accepted agreements.

Create a JSON change file outside the public assets directory. For example:

```json
{
  "version": "2026-11-01-price-review",
  "as_of": "2026-11-01",
  "set": {
    "launch_site.public_price": 1500,
    "plans.keep_running.monthly_price": 175
  }
}
```

Preview the exact changes first:

```sh
node scripts/update-offers.mjs changes.json
```

After reviewing the diff, explicitly write the local catalog:

```sh
node scripts/update-offers.mjs changes.json --write
node --test tests/offer-catalog.test.mjs tests/payments.test.mjs tests/buyer-packs.test.mjs tests/expanded-website-packages.test.mjs
npm run build
```

Use a new version for each update. The command rejects the current version, recorded prior versions and known historical catalog versions. The preview does not write files. `--write` updates only the current local catalog; normal review, tests and deployment remain separate.

## Fields to edit

- Build fees: `launch_site.public_price`, `focused_site.public_price`, `signature_site.public_price`.
- Monthly fees: `plans.keep_running.monthly_price`, `plans.improve.monthly_price`, `plans.grow.monthly_price`.
- Reviews: `baseline.one_time_price`, `audit_sprint.one_time_price`.
- Names: each offer's `public_name`.
- Main limits: build `marketing_page_cap`, `launch_content.articles`, `forms`, `external_connection_limit`, `graphic_counts.launch`, `graphic_counts.promotional`, `graphic_counts.supplied_photo_edits`, and `search_research` limits. Monthly plans use `priorities`, `small_change_batches`, `review_minutes` and `search_scope` limits.
- Add-ons use their array position, for example `add_ons.0.public_price`. Check the corresponding `id` before editing. Changing an add-on also updates the add-on catalog version.

Do not edit payment-stage `amount`, `graphic_counts.total`, annual `upfront_price`, `monthly_equivalent` or `saving_vs_12_monthly`. They are derived. Annual amounts use the monthly price, twelve cycles and `annual.discount_percent`. Annual enrollment remains controlled by its existing separate gate; a price update does not activate it. Each payment amount is rounded to cents, with the final stage receiving the remainder so the stages exactly equal the total. Annual monthly equivalent is a comparison and can contain fractional cents; the annual payment itself uses whole cents.

The existing annual settlement tool requires twelve equal whole-cent cycles. Catalog validation therefore blocks activating annual enrollment when a derived annual total cannot divide evenly into twelve cents-based cycles. Monthly-only price updates may retain such an inactive annual comparison. Review compatible annual prices and settlement terms before any future activation.

## Scope and wording

The `copy_templates` map binds repeated descriptions to structured values, using references such as `{{focused_site.marketing_page_cap}}`. The updater saves the resolved text back to its existing field, preserving readable JSON for other tools. Edit the source quantity instead of that resolved text. For an intentional rewrite of a bound description, provide its matching entry in the change file's `templates` map, together with the corresponding `set` field. Templates support `words`, `title`, `money`, `sets` and `improvements` formatting.

This is not an automatic product redesign. Review every scope change for fit, singular/plural wording, example page maps, delivery capacity, acceptance checks and exclusions. Qualitative promises remain authored; changing a count does not invent new deliverables or revise every example. Structural additions/removals of plans or payment milestones require code and test review. Existing regression tests intentionally assert today's approved prices and promises; a future authorized commercial change must update those expectations during review, not bypass them.

Never normalize or rewrite accepted `commercial_snapshot` records, historical offer files or the legacy calculator's saved inputs. Those preserve the actual agreement. New drafts use the current normalized catalog; invoice preparation continues to use the accepted snapshot.
