import offers from '../config/offers.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conceptPages,conceptCatalog} from '../src/portfolio-concepts.mjs';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';

test('every concept has an overview and service page with resolvable internal links',()=>{
 const pages=conceptPages({config:{},offers}),paths=new Set(pages.map(p=>p.path));
 assert.equal(pages.length,6);
 assert.equal(new Set(pages.map(p=>p.description)).size,pages.length);
 assert.equal(paths.size,conceptCatalog.length*2);
 for(const c of conceptCatalog)for(const path of [c.path,c.servicePath])assert.ok(paths.has(path));
 for(const page of pages){
  assert.match(page.body,/Fictional concept — not a client project/);
  assert.equal((page.body.match(/<h1[ >]/g)||[]).length,1);
  assert.match(page.body,/aria-current="page"/);
  for(const [,href]of page.body.matchAll(/href="([^"#]+)[^"]*"/g)){
   const path=new URL(href,'https://example.test').pathname;
   if(path.startsWith('/work/')&&path!=='/work/')assert.ok(paths.has(path),`${page.path} links to missing ${path}`);
  }
 }
});
test('retired demo URLs reach the concept overview without redirecting mutations',()=>{
 for(const id of ['fieldwork','northline','hearthside'])for(const method of ['GET','HEAD']){
  for(const suffix of ['request/','request','request/index.html','request.html']){
   const url=new URL(`https://wonderandmethod.com/work/${id}/${suffix}?service=Old%20choice&utm_source=bookmark`);
   assert.equal(publicRouteRedirect(url,method),`https://wonderandmethod.com/work/${id}/?service=Old%20choice&utm_source=bookmark`);
  }
 }
 assert.equal(publicRouteRedirect(new URL('https://wonderandmethod.com/work/fieldwork/request/'),'POST'),null);
 for(const page of conceptPages())assert.doesNotMatch(page.body,/concept-demo-form|concept-confirmation|\/request\/|data-demo-/);
});

test('original concept illustrations remain self-contained accessible SVGs',async()=>{
 for(const item of conceptCatalog){
  const svg=await readFile(new URL(`../src/assets/work/concepts/${item.id}.svg`,import.meta.url),'utf8');
  assert.match(svg,/width="1200" height="900"/);
  assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b/);
  assert.doesNotMatch(svg,/(?:href|src)="(?:https?:|\/\/)/);
 }
});

test('website preview assets contain actual desktop and phone WebP captures',async()=>{
 for(const item of conceptCatalog)for(const asset of [item.image,item.phoneImage]){
  const bytes=await readFile(new URL(`../src${asset}`,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<100000);
 }
});
