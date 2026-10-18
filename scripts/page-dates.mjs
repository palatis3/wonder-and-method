import {createHash} from 'node:crypto';

export function contentHash(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!main) throw Error('Page date tracking requires a main element.');
  const stable = main.replace(/<p class="journal-byline">[\s\S]*?<\/p>/g, '')
    .replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(stable).digest('hex');
}

export function nextPageDates(pages, previous, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Use a valid YYYY-MM-DD content review date.');
  return Object.fromEntries(pages.map(page => {
    const sha256 = contentHash(page.html), old = previous[page.path];
    return [page.path, old?.sha256 === sha256 ? old : {modifiedAt: date, sha256}];
  }));
}

export function assertPageDates(pages, records) {
  const stale = pages.filter(page => !records[page.path]?.modifiedAt || contentHash(page.html) !== records[page.path].sha256);
  if (stale.length) throw Error('Record reviewed content dates before building: node scripts/record-page-dates.mjs --date YYYY-MM-DD. Changed routes: ' + stale.map(page => page.path).join(', '));
}
