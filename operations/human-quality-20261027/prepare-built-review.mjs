import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parse,serialize} from 'parse5';
import {renderPages} from '../../src/pages.mjs';
import config from '../../config/site.json' with {type:'json'};
import offers from '../../config/offers.json' with {type:'json'};
import map from '../../authority/v5/site-map.json' with {type:'json'};
import geography from '../../authority/v5/geography.json' with {type:'json'};
const [batch,...routes]=process.argv.slice(2);
if(!/^[a-z][a-z0-9-]+$/.test(batch||'')||!routes.length)throw Error('Expected batch ID and explicit routes');
const out=resolve(import.meta.dirname,'../../output/human-quality-20261027/built-review',batch),sha=x=>createHash('sha256').update(x).digest('hex');
await mkdir(out,{recursive:true});
const ignored=new Set(['script','style','svg','template']),blocks=new Set(['p','li','dt','dd','h1','h2','h3','h4','h5','h6','summary','caption','th','td','div','section','article','header','nav','ul','ol','dl','tr','table','br']);
const attr=(n,k)=>n.attrs?.find(x=>x.name===k)?.value;
const all=n=>[n,...(n.childNodes||[]).flatMap(all)];
const text=n=>ignored.has(n.tagName)?'':n.nodeName==='#text'?n.value:((t)=>blocks.has(n.tagName)?'\n'+t+'\n':t)((n.childNodes||[]).map(text).join(''));
const clean=t=>t.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
const pages=renderPages({config,offers,map,geography}),records=[];
for(const route of routes){
 const page=pages.find(x=>x.path===route);if(!page)throw Error('No route '+route);
 const main=all(parse(page.html)).find(n=>n.tagName==='main');if(!main)throw Error('No main '+route);
 const html=serialize(main),nodes=all(main);
 records.push({route,mainHtmlSha256:sha(html),mainText:clean(text(main)),headings:nodes.filter(n=>/^h[1-6]$/.test(n.tagName||'')).map(n=>({level:Number(n.tagName.slice(1)),text:clean(text(n))})),links:nodes.filter(n=>n.tagName==='a').map(n=>({text:clean(text(n)),href:attr(n,'href')})),disclosures:nodes.filter(n=>n.tagName==='details').map(n=>({summary:clean(text((n.childNodes||[]).find(c=>c.tagName==='summary')||{childNodes:[]})),text:clean(text(n))})),evidenceLimit:'Complete current server-rendered main content, including expanded disclosures. No browser, destination, visual or accessibility acceptance is implied.'});
 await writeFile(resolve(out,route.replace(/^\/|\/$/g,'').replaceAll('/','-')+'.html'),page.html);
}
await writeFile(resolve(out,'pages.jsonl'),records.map(x=>JSON.stringify(x)).join('\n')+'\n');
await writeFile(resolve(out,'manifest.json'),JSON.stringify({date:'2026-10-27',routes:records.map(x=>({route:x.route,mainHtmlSha256:x.mainHtmlSha256})),sources:await Promise.all(['src/erie-content.mjs','src/service-counties.mjs','src/service-faqs.json','src/service-faq-offer-copy.json','config/offers.json'].map(async file=>({file,sha256:sha(await readFile(resolve(import.meta.dirname,'../..',file)))})))},null,2)+'\n');
console.log(JSON.stringify({batch,routes:records.length,out}));
