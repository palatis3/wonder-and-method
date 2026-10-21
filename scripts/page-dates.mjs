import {createHash} from 'node:crypto';

export function legacyContentHash(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!main) throw Error('Page date tracking requires a main element.');
  const stable = main.replace(/<p class="journal-byline">[\s\S]*?<\/p>/g, '')
    .replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(stable).digest('hex');
}

// Dates track editorial text, destinations and image descriptions. Navigation,
// shared contact prompts, CSS classes, asset cache keys and the byline date do
// not turn an unchanged article into newly reviewed content.
export function contentHash(html) {
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
 if(!main)throw Error('Page date tracking requires a main element.');
 const stable=main
  .replace(/<p class="journal-byline">[\s\S]*?<\/p>/g,'')
  .replace(/<p\b[^>]*class="[^"]*\bpolicy-review-date\b[^"]*"[^>]*>[\s\S]*?<\/p>/g,'')
  .replace(/<nav\b[^>]*class="[^"]*\bbreadcrumb\b[^"]*"[^>]*>[\s\S]*?<\/nav>/g,'')
  .replace(/<section\b[^>]*class="[^"]*\bfounder-strip\b[^"]*"[^>]*>[\s\S]*?<\/section>/g,'')
  .replace(/<p\b[^>]*class="[^"]*\bservice-intro-action\b[^"]*"[^>]*>[\s\S]*?<\/p>/g,'')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'')
  .replace(/<a\b[^>]*href="([^"]+)"[^>]*>/g,(_tag,href)=>` [link:${href.replace(/([?&])v=[a-f0-9]{12}(?=&|#|$)/g,'$1').replace(/\?(?=#|$)|&(?=#|$)/g,'')}] `)
  .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g,(_tag,alt)=>` [image:${alt}] `)
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/g,' ')
  .replace(/\s+/g,' ').trim();
 return createHash('sha256').update(stable).digest('hex');
}

export function nextPageDates(pages, previous, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Use a valid YYYY-MM-DD content review date.');
  return Object.fromEntries(pages.map(page => {
    const sha256 = contentHash(page.html), old = previous[page.path];
    return [page.path, old?.sha256 === sha256 ? old : {modifiedAt: date, sha256,contentHashVersion:2}];
  }));
}

export function assertPageDates(pages, records) {
  const stale = pages.filter(page => !records[page.path]?.modifiedAt || contentHash(page.html) !== records[page.path].sha256);
  if (stale.length) throw Error('Record reviewed content dates before building: node scripts/record-page-dates.mjs --date YYYY-MM-DD. Changed routes: ' + stale.map(page => page.path).join(', '));
}
