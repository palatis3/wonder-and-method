import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';import {breadcrumbTrail,breadcrumbSchema,breadcrumbMarkup} from '../src/navigation.mjs';
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
const pages=renderPages({config,offers,map,geography});
test('breadcrumbs give meaningful parents and match canonical, visible current-page navigation on all routes',()=>{
 let total=0;
 for(const {path,html} of pages){
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const breadcrumbs=data.filter(x=>x['@type']==='BreadcrumbList');
  if(path==='/'||path==='/404/'){assert.equal(breadcrumbs.length,0);assert.doesNotMatch(html,/aria-label="Breadcrumb"/);continue;}
  total++;assert.equal(breadcrumbs.length,1,path);const items=breadcrumbs[0].itemListElement;assert.ok(items.length>=2,path);
  assert.deepEqual(items.map(x=>x.position),items.map((_,i)=>i+1));assert.equal(items[0].item,config.origin+'/');assert.equal(items.at(-1).item,config.origin+path);
  for(const item of items){assert.equal(item['@type'],'ListItem');assert.ok(item.name.trim());assert.ok(pages.some(page=>config.origin+page.path===item.item),item.item);}
  const nav=html.match(/<nav class="breadcrumb" aria-label="Breadcrumb">(.*?)<\/nav>/s)?.[1];assert.ok(nav,path);assert.match(nav,/<ol>.*<\/ol>/);assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);assert.equal((nav.match(/<li>/g)||[]).length,items.length);
  const parent=path.startsWith('/services/')&&path!=='/services/'?'/services/':path.startsWith('/checkout/')?'/pricing/':path.startsWith('/guides/')&&path!=='/guides/'?'/guides/':path.startsWith('/areas/')&&path!=='/areas/'?'/areas/':path.startsWith('/work/')&&path!=='/work/'?'/work/':null;
  if(parent){assert.equal(items[1].item,config.origin+parent);assert.ok(nav.includes(`href="${parent}"`));}
 }
 assert.equal(total,pages.filter(page=>!['/','/404/'].includes(page.path)).length);
});
test('breadcrumb labels escape markup while structured names retain their actual text',()=>{
 const trail=breadcrumbTrail('/services/test/','A <better> & "clearer" page');assert.equal(breadcrumbSchema(trail,config.origin).itemListElement.at(-1).name,'A <better> & "clearer" page');assert.match(breadcrumbMarkup(trail),/A &lt;better&gt; &amp; &quot;clearer&quot; page/);
});
test('contact-form guide uses its visible title in the breadcrumb and Article headline',()=>{
 const page=pages.find(page=>page.path==='/guides/contact-form-not-working/'),heading=page.html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)?.[1];assert.ok(heading);
 const trail=breadcrumbTrail(page.path,heading);
 assert.equal(trail.at(-1).name,'Contact form help');
 assert.equal(breadcrumbSchema(trail,config.origin).itemListElement.at(-1).name,trail.at(-1).name);
 assert.ok(breadcrumbMarkup(trail).includes(`aria-current="page">${trail.at(-1).name}</span>`));
 const graph=JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(graph.find(node=>node['@type']==='BreadcrumbList').itemListElement.at(-1).name,trail.at(-1).name);
 assert.equal(graph.find(node=>node['@type']==='Article').headline,heading);
});
test('rendered navigation section jumps resolve and back-to-top has a native target across every page',()=>{
 let jumps=0;
 for(const {path,html} of pages){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  for(const [,nav] of html.matchAll(/<nav\b[^>]*>(.*?)<\/nav>/gs)){
   for(const [,id] of nav.matchAll(/href="#([^"]+)"/g)){jumps++;assert.equal(ids.filter(value=>value===id).length,1,`${path} #${id}`);}
  }
 }
 assert.ok(jumps>0,'Section jump navigation remains available where rendered');
 for(const page of pages){assert.equal((page.html.match(/id="page-top"/g)||[]).length,1);assert.match(page.html,/class="back-to-top" href="#page-top" aria-label="Back to top"/);}
});
