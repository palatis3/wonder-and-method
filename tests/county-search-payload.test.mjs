import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseFragment} from 'parse5';
import {countyDirectory,countySearchAsset,serviceStates,countySearchText,countyServicePath,countyAreaName} from '../src/service-area-directory.mjs';
import {decodeCountySearchAsset} from '../src/assets/county-directory.js';
import budget from './fixtures/nv-wa-payload-budget.json' with {type:'json'};

const attribute=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const all=node=>[node,...(node.childNodes||[]).flatMap(all)];
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');

test('combined payload retains all typed terms, native links and the complete parsed list structure within existing budgets',async()=>{
 const html=countyDirectory(undefined,{compact:true}),again=countyDirectory(undefined,{compact:true});
 assert.equal(html,again,'same inputs produce byte-identical output');
 assert.ok(Buffer.byteLength(html)<450_000);
 assert.ok(gzipSync(html).length<195_000);
 const dom=all(parseFragment(html));
 const descriptor=JSON.parse(text(dom.find(node=>attribute(node,'data-county-search-asset')!==undefined)));
 assert.equal(dom.filter(node=>attribute(node,'data-county-place-names')!==undefined||attribute(node,'data-county-search-cards')!==undefined).length,0);
 const asset=countySearchAsset();
 assert.equal(descriptor.path,asset.path);assert.equal(descriptor.format,'columns-delta-v1');
 assert.equal(asset.path,'/assets/county-search-'+createHash('sha256').update(asset.bytes).digest('hex').slice(0,20)+'.bin');
 const client=readFileSync(new URL('../src/assets/county-directory.js',import.meta.url));
 // Retained old serializer measured against the same 2893-area inventory.
 // The reviewed fixture includes deferred data and both browser modules.
 assert.ok(gzipSync(html).length+asset.bytes.length+gzipSync(client).length<=budget.baselineTotalGzip,'combined HTML, deferred data and client must improve the equivalent-inventory transfer');
 let withServicePaths=html;
 for(const state of serviceStates.filter(state=>['north-dakota','south-dakota','california','new-mexico','arizona','oregon','nevada','washington'].includes(state.id)))for(const county of state.counties){
  withServicePaths=withServicePaths.replace('href="'+countyServicePath(county,state)+'"','href="/areas/'+state.id+'/'+county.slug+'-county/"');
 }
 assert.ok(Buffer.byteLength(withServicePaths)<450_000&&gzipSync(withServicePaths).length<195_000);
 assert.ok(gzipSync(withServicePaths).length+asset.bytes.length+gzipSync(client).length<=budget.baselineAllServicePathsTotalGzip,'all 317 eight-state service paths remain below the equivalent-inventory baseline');
 const {entries:terms}=await decodeCountySearchAsset(asset.bytes);
 const expected=serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(state=>state.counties.toSorted((a,b)=>a.name.localeCompare(b.name)).map(county=>({state,county})));
 assert.equal(expected.length,budget.areaCount);assert.equal(terms.length,expected.length);
 const cards=dom.filter(node=>attribute(node,'data-cs')!==undefined),links=dom.filter(node=>attribute(node,'data-cl')!==undefined);
 assert.equal(cards.length,expected.length);assert.equal(links.length,expected.length);
 for(const [index,{county,state}] of expected.entries()){
  const card=cards[index],link=links[index],region=state.regions.find(region=>region.slugs.includes(county.slug));
  assert.equal(card.tagName,'li');assert.equal(attribute(card,'data-cs'),'');
  assert.equal(card.parentNode.tagName,'ul');assert.equal(attribute(card.parentNode,'data-county-state'),state.id);
  assert.deepEqual(card.childNodes,[link],'optional li end tags preserve each native card boundary');
  assert.equal(link.tagName,'a');assert.equal(attribute(link,'href'),countyServicePath(county,state));
  assert.equal(text(link),countyAreaName(county)+(county.anchor&&county.anchor!==county.name?' ('+county.anchor+')':''));
  assert.deepEqual(terms[index],countySearchText(county,state,region).split('|'),state.id+'/'+county.slug);
 }
 for(const state of serviceStates){
  const list=dom.find(node=>attribute(node,'data-county-state')===state.id);
  assert.equal(list.childNodes.length,state.counties.length);
  assert.ok(list.childNodes.every(node=>node.tagName==='li'));
 }
});
