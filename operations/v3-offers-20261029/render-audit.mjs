import {mkdir,writeFile} from 'node:fs/promises';
import {renderPages} from '../../src/pages.mjs';
import config from '../../config/site.json' with {type:'json'};
import offers from '../../config/offers.json' with {type:'json'};
import map from '../../authority/v5/site-map.json' with {type:'json'};
import geography from '../../authority/v5/geography.json' with {type:'json'};
const pages=renderPages({config,offers,map,geography});
const routes=new Map(pages.map(page=>[page.path,{ids:new Set([...page.html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))}]));
const broken=new Map();let checked=0;
for(const page of pages)for(const [,href] of page.html.matchAll(/\bhref="([^"]+)"/g)){
 const url=new URL(href.replaceAll('&amp;','&'),config.origin+page.path);
 if(url.origin!==config.origin||!url.hash||!routes.has(url.pathname))continue;
 checked++;
 if(routes.get(url.pathname).ids.has(decodeURIComponent(url.hash.slice(1))))continue;
 const key=url.pathname+url.hash;if(!broken.has(key))broken.set(key,{target:key,sources:[]});broken.get(key).sources.push(page.path);
}
await mkdir('output/v3-audit',{recursive:true});
await writeFile('output/v3-audit/rendered-pages.json',JSON.stringify(pages));
await writeFile('output/v3-audit/fragment-audit.json',JSON.stringify({routes:pages.length,checked,broken:[...broken.values()]},null,2));
console.log(JSON.stringify({routes:pages.length,checked,broken:[...broken.values()].map(({target,sources})=>({target,count:sources.length,example:sources[0]}))},null,2));
