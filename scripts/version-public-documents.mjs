import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,extname} from 'node:path';

// Version customer-facing documents as well as scripts/styles. An already cached
// scope or worksheet must not hide corrected wording from a returning visitor.
export async function versionPublicDocumentLinks(html,output,pagePath,hashes=new Map()){
 const changes=new Map();
 for(const [,href]of html.matchAll(/href="([^"]+)"/g)){
  if(/^(?:[a-z]+:|\/\/|#)/i.test(href))continue;
  const url=new URL(href.replaceAll('&amp;','&'),'https://build.invalid'+pagePath);
  const path=url.pathname,extension=extname(path);
  if(!path.startsWith('/assets/')||!(/\.(?:html|txt|csv|json|zip)$/i.test(path)||(!extension&&path.startsWith('/assets/buyer-packs/'))))continue;
  const file=path+(!extension?'.html':'');
  if(!hashes.has(file))hashes.set(file,createHash('sha256').update(await readFile(resolve(output,'.'+file))).digest('hex').slice(0,12));
  url.searchParams.set('v',hashes.get(file));
  changes.set(href,(url.pathname+url.search+url.hash).replaceAll('&','&amp;'));
 }
 return html.replace(/href="([^"]+)"/g,(match,href)=>changes.has(href)?`href="${changes.get(href)}"`:match);
}
