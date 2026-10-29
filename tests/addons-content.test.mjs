import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks,packBody} from '../src/buyer-packs.mjs';
import {writeBuyerPacks} from '../scripts/build-buyer-packs.mjs';
import {guideContentSections} from '../src/guide-content.mjs';
import {escapeHtml as e,money} from '../src/shared.mjs';
import {crawlFiles} from '../src/seo.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,config,map,geography]=await Promise.all(['config/offers.json','config/site.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const render=(values=offers)=>renderPages({config,offers:values,map,geography});
const addonPath='/services/website-addons/';
const packPath='/assets/buyer-packs/website-addons';
const baseIds=['launch_site','focused_site','business_site','signature_site','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems'];
const expectedIds=Object.keys({reporting_dashboard:795,logo_identity:995,standard_page:195,three_page_bundle:525,practical_guide:495,campaign_landing_page:695,booking_setup:495,guided_quote_form:695,business_email_domain:295,profile_recovery:395,print_collateral:395,care_onboarding:195,single_fix:295});
const schema=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test('add-on service is discoverable, indexable and separate from all fifteen base requests',()=>{
 const pages=render(),catalogue=pages.find(page=>page.path===addonPath),pricing=pages.find(page=>page.path==='/pricing/');
 assert.ok(catalogue);
 assert.deepEqual(offers.add_ons.map(item=>item.id),expectedIds);
 assert.deepEqual(pages.filter(page=>page.path.startsWith('/checkout/')).map(page=>page.path).sort(),baseIds.map(id=>'/checkout/'+id.replaceAll('_','-')+'/').sort());
 assert.equal((pricing.html.match(/class="[^"\n]*\bv3-offer-card\b[^"\n]*" id="offer-[^"]+"/g)||[]).length,15);
 assert.match(catalogue.html,/<h1>A useful addition\. A defined scope\.<\/h1>/);
 assert.match(catalogue.html,/class="studio-contact-note"/);
 assert.match(catalogue.html,/class="back-to-top"/);
 assert.match(catalogue.html,/class="support-chat/);
 assert.ok(crawlFiles(config,pages).sitemap.includes(config.origin+addonPath));
 for(const item of offers.add_ons){
  assert.ok(catalogue.html.includes('id="addon-'+item.id+'"'),item.id);
  assert.ok(catalogue.html.includes(e(item.public_name)),item.id);
  assert.ok(catalogue.html.includes(money(item.public_price)),item.id);
  assert.ok(catalogue.html.includes(e(item.scope)),item.id);
 }
 const baseCatalog=schema(pricing.html).find(item=>item['@id']===config.origin+'/pricing/#offers');
 assert.equal(baseCatalog.itemListElement.length,15);
 const addonCatalog=schema(pricing.html).find(item=>item['@id']===config.origin+addonPath+'#additions');
 assert.deepEqual(addonCatalog.itemListElement.map(item=>item.price),[...offers.add_ons.map(item=>item.public_price),undefined]);
 const service=schema(catalogue.html).find(item=>item['@type']==='Service');
 assert.deepEqual(service.offers.map(item=>item.name),[...offers.add_ons,...offers.quoted_add_ons].map(item=>item.public_name));
 const quoted=service.offers.find(item=>item.name===offers.quoted_add_ons[0].public_name);
 assert.equal(Object.hasOwn(quoted,'price'),false,'Inspection-only migration must not invent a fixed price.');
 for(const offer of service.offers){
  const url=new URL(offer.url);
  assert.equal(url.pathname,addonPath);
  assert.ok(catalogue.html.includes('id="'+url.hash.slice(1)+'"'));
 }
});

test('relevant service and guide copy links to the complete scope without replacing base allowances',()=>{
 const pages=render();
 for(const path of ['/services/','/services/web-design/','/services/website-redesign/','/services/contractor-websites/','/services/website-care/','/services/seo/','/services/website-audit/','/work/source-handoff/','/guides/website-project-cost/','/guides/contractor-website-checklist/','/guides/service-area-pages/']){
  const main=pages.find(page=>page.path===path)?.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main?.includes('href="'+addonPath),path);
 }
 const ids=new Set(expectedIds);
 for(const page of pages)for(const [,href] of page.html.matchAll(/\bhref="([^"]+)"/g)){
  const url=new URL(href.replaceAll('&amp;','&'),config.origin);
  if(!url.searchParams.has('addons'))continue;
  assert.equal(url.pathname,'/contact/',page.path);
  for(const id of url.searchParams.get('addons').split(','))assert.ok(ids.has(id),page.path+' '+id);
 }
 const packs=buyerPacks(offers);
 assert.deepEqual(packs.map(pack=>pack.id),baseIds);
 for(const pack of packs){
  const section=pack.sections.find(item=>item.title==='Optional website add-ons');
  assert.ok(section,pack.id);
  assert.match(section.items.join(' '),/included work (?:remains|stays) included|included work is never charged again|overlap/i,pack.id);
  assert.match(packBody(pack),/href="(?:https:\/\/wonderandmethod\.com)?\/services\/website-addons\/"/);
  assert.equal(pack.request,'/checkout/'+pack.id.replaceAll('_','-')+'/');
 }
});

test('guide examples and public catalogue evaluate the supplied catalogue prices on every render',()=>{
 const changed=structuredClone(offers);
 for(const [index,item] of changed.add_ons.entries()){
  item.public_price=6101+index*113;
  item.public_name='Current '+item.id;
  item.scope='Current scope for '+item.id+'.';
 }
 const original=JSON.stringify(offers);
 const page=render(changed).find(item=>item.path===addonPath);
 for(const item of changed.add_ons){
  assert.ok(page.html.includes(money(item.public_price)),item.id);
  assert.ok(page.html.includes(e(item.public_name)),item.id);
  assert.ok(page.html.includes(e(item.scope)),item.id);
 }
 const cost=guideContentSections('/guides/website-project-cost/',changed).map(section=>section.body).join('');
 for(const id of ['standard_page','three_page_bundle','practical_guide','guided_quote_form']){
  const item=changed.add_ons.find(item=>item.id===id);
  assert.ok(cost.includes(money(item.public_price)),id);
  assert.ok(cost.includes(item.public_name),id);
 }
 assert.ok(cost.includes('/services/website-addons/'));
 for(const [slug,id] of [['contractor-website-checklist','guided_quote_form'],['service-area-pages','standard_page']]){
  assert.ok(guideContentSections('/guides/'+slug+'/',changed).some(section=>section.body.includes(money(changed.add_ons.find(item=>item.id===id).public_price))));
 }
 assert.equal(JSON.stringify(offers),original);
});

test('standalone download landing page retains complete TXT and index scopes without an aggregate package price',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'wm-addons-content-'));
 try{
  await mkdir(join(folder,'assets'),{recursive:true});
  await writeFile(join(folder,'assets/site.css'),'/* synthetic shared CSS */');
  const changed=structuredClone(offers);
  changed.add_ons=changed.add_ons.map((item,index)=>({...item,public_price:4201+index*137,public_name:item.public_name+' <current>',scope:item.scope+' Current catalogue scope.'}));
  await writeBuyerPacks(folder,changed);
  const [html,txt,index]=await Promise.all([
   readFile(join(folder,'assets/buyer-packs/website-addons.html'),'utf8'),
   readFile(join(folder,'assets/buyer-packs/website-addons.txt'),'utf8'),
   readFile(join(folder,'assets/buyer-packs/index.json'),'utf8').then(JSON.parse)
  ]);
  assert.equal(index.length,16);
  assert.deepEqual(index.filter(item=>item.kind!=='addon-catalogue').map(item=>item.id),baseIds);
  const catalog=index.find(item=>item.kind==='addon-catalogue');
  assert.equal(catalog.path,packPath);
  assert.equal(catalog.download,packPath+'.txt');
  assert.equal(Object.hasOwn(catalog,'price'),false);
  assert.equal(Object.hasOwn(catalog,'priceLabel'),false);
  assert.deepEqual(catalog.items.map(item=>item.id),[...expectedIds,...offers.quoted_add_ons.map(item=>item.id)]);
  assert.deepEqual(catalog.terms,changed.add_on_terms);
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/href="\/assets\/site\.css\?v=[a-f0-9]{12}"/);
  assert.match(html,/href="website-addons\.txt" download/);
  assert.doesNotMatch(html,/<a[^>]+href="\/assets\/buyer-packs\/website-addons"/);
  for(const item of changed.add_ons){
   const record=catalog.items.find(record=>record.id===item.id);
   assert.equal(record.price,item.public_price);
   assert.equal(record.priceCurrency,'USD');
   assert.equal(record.scope,item.scope);
   assert.deepEqual(record.exclusions,item.exclusions);
   assert.deepEqual(record.acceptance,item.acceptance);
   assert.match(html,/href="\/services\/website-addons\/"/);
   assert.doesNotMatch(html,/class="addon-item"/);
   assert.ok(txt.includes(item.public_name.toUpperCase()),item.id);
   assert.ok(txt.includes(money(item.public_price)),item.id);
   assert.ok(txt.includes(item.scope),item.id);
   const request=new URL(record.request,config.origin);
   assert.equal(request.pathname,'/contact/');
   assert.equal(request.searchParams.get('offer'),'unsure');
   assert.equal(request.searchParams.get('addons'),item.id);
   assert.equal(request.searchParams.get('request_kind'),'checkout');
  }
  assert.doesNotMatch(html,/<current>/);
  for(const id of baseIds){
   const baseTxt=await readFile(join(folder,'assets/buyer-packs/'+id+'.txt'),'utf8');
   assert.match(baseTxt,/NEED MORE THAN THIS INCLUDES?/);
   assert.ok(baseTxt.includes(addonPath));
  }
 }finally{
  assert.ok(resolve(folder).startsWith(resolve(tmpdir())+'\\')||resolve(folder).startsWith(resolve(tmpdir())+'/'));
  assert.ok(folder.includes('wm-addons-content-'));
  await rm(folder,{recursive:true,force:true});
 }
});
