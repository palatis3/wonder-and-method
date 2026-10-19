import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,config,map,geography]=await Promise.all(['config/offers.json','config/site.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));

test('every public page uses provider-neutral keyword-research language',()=>{
 const pages=renderPages({config,offers,map,geography});
 for(const page of pages){
  assert.doesNotMatch(page.html,/semrush/i,page.path+' must not expose vendor names in copy, links or metadata');
  assert.doesNotMatch(page.html,/\benquir(?:y|ies)\b/i,page.path+' uses consistent US inquiry spelling');
 }
 assert.match(pages.find(p=>p.path==='/services/seo/').html,/keyword research/i);
});

test('public downloadable text and feature guides use the same research terminology',async()=>{
 async function inspect(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
   const url=new URL(item.name+(item.isDirectory()?'/':''),dir);
   if(item.isDirectory())await inspect(url);
   else if(/\.(?:txt|csv|json|html|svg|md)$/i.test(item.name))assert.doesNotMatch(await readFile(url,'utf8'),/semrush/i,url.pathname);
  }
 }
 await inspect(new URL('../src/assets/',import.meta.url));
});
