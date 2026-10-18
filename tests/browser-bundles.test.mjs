import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildBrowserBundles} from '../scripts/build.mjs';
import {renderPages} from '../src/pages.mjs';
const root=resolve(import.meta.dirname,'..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
test('the receipt bundle has only public receipt config and one canonical analytics import',async()=>{
 const config=await read('config/site.json');
 const {client,journeyVersion}=await buildBrowserBundles(root,{...config,privateEditorialMetadata:'must-not-ship',guideApprovals:[{secret:'must-not-ship'}]});
 const text=Buffer.from(client).toString('utf8');
 assert.doesNotMatch(text,/guideApprovals|must-not-ship|editorialEvidence|reviewedAt|guideApproval/);
 const decoded=text.replace(/\\u([a-f\d]{4})/gi,(_match,hex)=>String.fromCharCode(parseInt(hex,16)));
 assert.ok(decoded.includes(config.responseWindow));assert.ok(decoded.includes(config.contactEmail));
 const actual=createHash('sha256').update(await readFile(resolve(root,'src/assets/journey-counts.js'))).digest('hex').slice(0,12);
 assert.equal(journeyVersion,actual);
 assert.equal([...text.matchAll(/from"(\/assets\/journey-counts\.js\?v=[a-f\d]{12})"/g)].length,1);
 assert.ok(text.includes(`/assets/journey-counts.js?v=${actual}`));
 assert.doesNotMatch(text,/page_view|\/api\/journey-counts/,'analytics initialization must stay in the single shared module');
});
test('forms and calculators load their own handlers only on routes that use them',async()=>{
 const [config,offers,map,tokens,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/design-tokens.json','authority/v5/geography.json'].map(read));
 const pages=renderPages({config,offers,map,tokens,geography});
 for(const {path,html} of pages){
  assert.equal(html.includes('src="/assets/client.js"'),html.includes('id="inquiry"'),path);
  assert.equal(html.includes('src="/assets/calculator.js"'),html.includes('id="cost-calculator"')||html.includes('id="pack-selector"'),path);
  assert.equal(html.split('src="/assets/journey-counts.js"').length-1,1,path);
 }
});
