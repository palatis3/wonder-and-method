import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {parseFragment} from 'parse5';
import {countyDirectory,serviceStates,countySearchText,countyServicePath,countyAreaName} from '../src/service-area-directory.mjs';
import {decodeCountyNames,decodeCountySearchCards} from '../src/assets/county-directory.js';

const attribute=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const all=node=>[node,...(node.childNodes||[]).flatMap(all)];
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');

test('combined payload retains all typed terms, native links and the complete parsed list structure within existing budgets',async()=>{
 const html=countyDirectory(),again=countyDirectory();
 assert.equal(html,again,'same inputs produce byte-identical output');
 assert.ok(Buffer.byteLength(html)<450_000);
 assert.ok(gzipSync(html).length<195_000);
 const dom=all(parseFragment(html));
 const nameNode=dom.find(node=>attribute(node,'data-county-place-names')!==undefined);
 const cardNode=dom.find(node=>attribute(node,'data-county-search-cards')!==undefined);
 const namePayload=JSON.parse(text(nameNode)),cardPayload=JSON.parse(text(cardNode));
 assert.equal(namePayload.encoding,'gzip-base91');assert.equal(cardPayload.encoding,'gzip-base91');assert.equal(cardPayload.format,'columns-delta-v1');
 assert.doesNotMatch(namePayload.data+cardPayload.data,/[<"\\]/);
 const names=await decodeCountyNames(namePayload),terms=await decodeCountySearchCards(cardPayload,names);
 const expected=serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(state=>state.counties.toSorted((a,b)=>a.name.localeCompare(b.name)).map(county=>({state,county})));
 assert.equal(expected.length,2378);assert.equal(terms.length,expected.length);
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
