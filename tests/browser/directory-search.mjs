// State directories use jurisdiction-specific labels; the all-area index uses
// "Place". Require the search role and a nonempty accessible name in either case.
// Exact jurisdiction wording is covered by human-directory-clarity.test.mjs.
export const directorySearch=page=>page.getByRole('searchbox',{name:/\S/}).and(page.locator('#county-search'));
