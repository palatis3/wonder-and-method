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
export function contentHashV2(html) {
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

// Version 3 adds the actual page summary and article attribution to editorial
// content. Dates themselves and shared organization metadata are not edits.
function canonicalMetadata(value) {
 if(Array.isArray(value))return value.map(canonicalMetadata);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalMetadata(value[key])]));
 return value;
}
export function contentHash(html) {
 const title=html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'';
 const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';
 let article=null;
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
  const data=JSON.parse(match[1]);
  const node=(Array.isArray(data)?data:[data]).find(item=>item['@type']==='Article');
  if(node){const {datePublished,dateModified,...editorial}=node;article=editorial;break;}
 }
 return createHash('sha256').update(JSON.stringify([contentHashV2(html),title,description,canonicalMetadata(article)])).digest('hex');
}

export function nextPageDates(pages, previous, date, {previousPages={},reviewedPaths=[],onMigration=()=>{}}={}) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Use a valid YYYY-MM-DD content review date.');
 const reviewed=new Set(reviewedPaths);
 return Object.fromEntries(pages.map(page=>{
  const sha256=contentHash(page.html),old=previous[page.path];
  if(old?.sha256===sha256)return [page.path,old];
  if(old&&old.contentHashVersion!==3){
   const historical=previousPages[page.path],oldHash=old.contentHashVersion===2?contentHashV2:legacyContentHash;
   // Only verified historical bytes can prove an unchanged migration. A real
   // simultaneous edit is compared under the new hash and receives its date.
   if(historical&&oldHash(historical)===old.sha256){
    const unchanged=contentHash(historical)===sha256;
    onMigration({path:page.path,unchanged,method:'verified-previous-content'});
    return [page.path,{modifiedAt:unchanged?old.modifiedAt:date,sha256,contentHashVersion:3}];
   }
   if(!reviewed.has(page.path))throw Error('Hash migration requires verified previous content or explicit review: '+page.path);
   onMigration({path:page.path,unchanged:false,method:'explicit-review'});
  }
  return [page.path,{modifiedAt:date,sha256,contentHashVersion:3}];
 }));
}

export function assertPageDates(pages, records) {
  const stale = pages.filter(page => !records[page.path]?.modifiedAt || contentHash(page.html) !== records[page.path].sha256);
  if (stale.length) throw Error('Record reviewed content dates before building: node scripts/record-page-dates.mjs --date YYYY-MM-DD. Changed routes: ' + stale.map(page => page.path).join(', '));
}
