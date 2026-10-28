# Homepage flow and scrolling controls

The homepage now presents service choices immediately after the introduction, followed by the real AssetRounds project, clearly labeled website concepts, the process, questions and contact. The personal introduction remains on About. The existing hero and curved transition are preserved. [Research and decisions](RESEARCH.md) explain the sources and application to this site.

The floating chat and back-to-top controls keep their bottom corners during ordinary scrolling. Removed prose-gap calculations previously moved or hid the buttons as lines passed. Existing menu, form-field, keyboard-focus and back-to-top threshold safeguards remain. The current homepage portfolio image has been refreshed.

## Validation

- Independent Astra source review found no actionable issue. The 585 existing browser exclusions and skip predicates are unchanged; two test-source hash bindings were independently reviewed.
- All 1,046 unit tests passed. All 27 focused UX tests passed across desktop, phone and reduced-motion projects. Form/focus checks passed after the final correction, including the viewport/blur recovery regression.
- The content review identified exactly eight intended changes: the homepage, navigation script, asset manifest and five responsive portfolio image files.
- All 25 changed Linux screenshot references were inspected and accepted; see `visual-review.json`. Complete exact-commit CI and production verification remain release prerequisites. Local screenshots and code review alone do not establish publication or real chat delivery.

Private detailed logs and release records are retained under `evidence/homepage-flow-20261028/`. See the final release record for publication identity and completed verification.
