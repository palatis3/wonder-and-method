import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {routeIndexEligible} from '../src/index-policy.mjs';
import worker from '../deployment/worker.mjs';
import {renderPages} from '../src/pages.mjs';
import {compactComparison} from '../src/buyer-journey.mjs';
import {intakeContent} from '../src/intake-content.mjs';
import {countyBuyerTasks,countyBuyerTask} from '../src/county-buyer-tasks.mjs';
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
test('aggregate measurement cannot build live intake without the matching reviewed notice',()=>{
 assert.throws(()=>intakeContent({...config,analytics:{mode:'other'}}),/Aggregate measurement/);
 assert.throws(()=>intakeContent({...config,privacy:{...config.privacy,analytics:''}}),/Aggregate measurement/);
 assert.doesNotThrow(()=>intakeContent(config));
});
test('route policy excludes transaction, policy, demo, asset and API variants and the global hold can still override launch',async()=>{
 const excluded=['/areas/monroe-county/','/checkout/launch-site/','/checkout/grow','/checkout/launch-site/index.html','/payments','/payments.html','/privacy/','/work/lead-workbench/','/api/inquiries','/assets/example.txt','/404/'];
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',ASSETS:{fetch:async()=>new Response('fixture')}};
 for(const path of excluded){assert.equal(routeIndexEligible(path),false,path);if(!path.startsWith('/api/'))assert.match((await worker.fetch(new Request('https://example.test'+path),env,{})).headers.get('X-Robots-Tag'),/noindex/,path);}
 for(const path of ['/','/pricing/','/services/web-design/','/areas/niagara-county/','/guides/service-area-pages/'])assert.equal(routeIndexEligible(path),true,path);
 assert.equal(config.searchIndexing,true);const pages=renderPages({config:{...config,searchIndexing:false},offers,map,geography});assert.ok(pages.every(p=>p.html.includes('noindex,nofollow')));
});
test('website cards use authoritative limits and canonical destinations without duplicate posters',()=>{
 const pages=renderPages({config,offers,map,geography});const pricing=pages.find(p=>p.path==='/pricing/').html,home=pages.find(p=>p.path==='/').html;
 for(const id of ['launch_site','focused_site','signature_site']){const p=offers[id];assert.ok(new RegExp(`up to ${p.marketing_page_cap} (?:custom |marketing |custom marketing )?pages`,'i').test(compactComparison(offers)));assert.ok(home.includes('/pricing/#offer-'+id));assert.ok(pricing.includes('id="offer-'+id+'"'));assert.ok(pricing.includes('/assets/buyer-packs/'+id));}
 assert.doesNotMatch(home,/data-feature=/);assert.doesNotMatch(pricing,/package-visual-grid|data-feature=/);assert.match(home,/Compare website packages and payment terms/);
});

test('each county has a distinct useful task and matching downloadable facts worksheet',async()=>{
 const checks=new Set(),titles=new Set();for(const [slug,c] of Object.entries(countyBuyerTasks)){checks.add(c.check);titles.add(c.title);const text=await readFile(new URL('../src/assets/county-briefs/'+slug+'.txt',import.meta.url),'utf8');assert.ok(text.includes(c.check));assert.ok(text.includes(c.output));assert.match(countyBuyerTask(slug),/Illustrative .* County example/);}
 assert.equal(checks.size,10);assert.equal(titles.size,10);
});
