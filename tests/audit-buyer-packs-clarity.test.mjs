import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import offers from '../config/offers.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};
import {buyerPacks,packBody,packSectionTitle,assertUniquePackSentences} from '../src/buyer-packs.mjs';
import {baselineEnrollmentNote} from '../src/monthly-content.mjs';
import {writeBuyerPacks} from '../scripts/build-buyer-packs.mjs';
import {escapeHtml,money} from '../src/shared.mjs';

const packs=buyerPacks(offers);
const body=pack=>pack.sections.flatMap(section=>[packSectionTitle(section),...section.items]).join('\n');
const count=(text,part)=>text.split(part).length-1;
const words=text=>text.trim().split(/\s+/u).length;
const expected={launch_site:2950,focused_site:4500,business_site:7500,signature_site:11500,keep_running:275,improve:1250,local_focus:850,grow:1750,website_baseline:650,audit_fix_sprint:1800,brand_message:1800,storefront:8500,local_presence:950,workflow:2500,systems:2000};
const plainHtml=html=>html.replace(/<[^>]*>/gu,'').replace(/&amp;/gu,'&').replace(/&#39;/gu,"'").replace(/&quot;/gu,'"').replace(/&lt;/gu,'<').replace(/&gt;/gu,'>');

async function withOutput(run){
 const parent=resolve(tmpdir()),output=await mkdtemp(join(parent,'wm-audit-packs-'));
 try{
  await mkdir(join(output,'assets'));
  await writeFile(join(output,'assets/site.css'),'/* synthetic document fixture */\n');
  return await run(output);
 }finally{
  const child=relative(parent,resolve(output));
  assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child)&&child.startsWith('wm-audit-packs-'),'cleanup remains in its created temporary directory');
  await rm(output,{recursive:true,force:true});
 }
}

test('fifteen pack contracts retain fixed prices, request destinations and exact project payments',()=>{
 assert.deepEqual(packs.map(pack=>pack.id),Object.keys(expected));
 for(const pack of packs){
  assert.equal(pack.price,expected[pack.id]);assert.equal(pack.request,'/checkout/'+pack.id.replaceAll('_','-')+'/');assert.match(pack.scopeStatus,/does not book work, accept terms or make a payment/);
  const text=body(pack),offer=pack.summary.offer;
  if(!pack.summary.monthly){assert.equal(offer.payment_schedule.reduce((sum,p)=>sum+p.amount,0),pack.price);for(const p of offer.payment_schedule)assert.ok(text.includes(`${money(p.amount)} — ${p.event} (${p.percent}%)`),pack.id);}
  else{assert.equal(pack.baselineFee,undefined);assert.match(text,/One month is billed in advance/);assert.match(text,/Cancel before the next billing date/);}
  for(const pattern of [/export limits/i,/cancel/i,/provider/i,/not pay twice/])assert.match(text,pattern,pack.id);
 }
});

test('HTML and TXT share unique sections and complete approved scope and exclusions',()=>{
 assert.doesNotThrow(()=>assertUniquePackSentences(packs));
 for(const pack of packs){
  const html=packBody(pack),visible=plainHtml(html);
  for(const section of pack.sections){
   const tag=section.disclosure?'summary':'h2';assert.equal(count(html,`<${tag}>${escapeHtml(packSectionTitle(section))}</${tag}>`),1,pack.id+' '+section.title);
   for(const item of section.items){const shown=item.replace('https://wonderandmethod.com/services/website-addons/','the website add-ons price list');assert.equal(count(visible,shown),1,pack.id+' '+shown.slice(0,60));}
  }
  assert.equal(count(html,'href="/services/website-addons/"'),1);assert.equal(count(html,'href="/payments/"'),1);
  for(const item of pack.summary.offer.v3.excludes)assert.ok(body(pack).includes(item));
  for(const item of pack.summary.offer.v3.acceptance)assert.ok(body(pack).includes(item));
 }
});

test('V3 payment and exit conditions remain explicit without selling new annual contracts',()=>{
 for(const pack of packs){assert.equal(pack.annual,undefined);assert.match(body(pack),/return unearned prepaid fees/);assert.match(body(pack),/including during a billing disagreement/);assert.match(body(pack),/editable source files/);}
 const enabled=structuredClone(offers);enabled.annual_enrollment_gate.verified=true;
 assert.throws(()=>buyerPacks(enabled),/does not offer new annual enrollment/);
});

test('generated HTML, TXT and index keep every destination and the complete thirteen-module and bundle download',async()=>withOutput(async output=>{
 await writeBuyerPacks(output,offers);
 const folder=join(output,'assets/buyer-packs');
 const index=JSON.parse(await readFile(join(folder,'index.json'),'utf8'));
 assert.deepEqual(index.map(item=>item.id),[...Object.keys(expected),'website-addons']);
 for(const pack of packs){
  const html=await readFile(join(folder,pack.id+'.html'),'utf8');
  const txt=await readFile(join(folder,pack.id+'.txt'),'utf8');
  assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
  assert.ok(html.includes(`href="${site.origin}/assets/buyer-packs/${pack.id}"`));
  assert.ok(html.includes(packBody(pack)));
  assert.ok(txt.endsWith('\n'));
  assert.ok(txt.includes('READY TO START? Request '+pack.name+' here: '+site.origin+pack.request));
  assert.doesNotMatch(txt,/NEXT ACTION:|Return to the website|\bledger\b|canonical\/crawl|\bcontained\b|connected sequence/i);
  assert.equal(count(txt,site.origin+'/services/website-addons/'),1);
  assert.equal(count(txt,'Payments and cancellation: '+site.origin+'/payments/'),1);
  for(const section of pack.sections)for(const item of section.items)assert.equal(count(txt,item),1,pack.id+' TXT item');
  const record=index.find(item=>item.id===pack.id);
  assert.deepEqual(Object.keys(record),['id','name','price','priceLabel','summary','request','annual','baselineFee','addOns']);
  assert.equal(record.addOns,'/assets/buyer-packs/website-addons');
  assert.equal(record.request,pack.request);
  // V3 adds the shared launch-quality and editing checks to each build download.
  assert.ok(words(txt)<1600,pack.id+' full download has avoidable growth');
  assert.ok(words(pack.sections.filter(section=>!section.disclosure).flatMap(section=>section.items).join(' '))<900,pack.id+' main reading length');
 }
 const catalogue=index.at(-1),html=await readFile(join(folder,'website-addons.html'),'utf8'),txt=await readFile(join(folder,'website-addons.txt'),'utf8');
 assert.equal(catalogue.path,'/assets/buyer-packs/website-addons');
 assert.equal(catalogue.download,'/assets/buyer-packs/website-addons.txt');
 assert.equal(catalogue.items.length,14);
 assert.deepEqual(catalogue.terms,offers.add_on_terms);
 assert.match(html,/href="website-addons\.txt" download>Download all prices and full terms \(TXT\)/);
 assert.match(html,/href="\/services\/website-addons\/"/);
 assert.doesNotMatch(html,/class="addon-item"|class="addon-catalogue"/);
 for(const item of offers.add_ons){
  const stored=catalogue.items.find(candidate=>candidate.id===item.id);
  assert.equal(stored.price,item.public_price);
  assert.equal(stored.scope,item.scope);
  assert.deepEqual(stored.exclusions,item.exclusions);
  assert.deepEqual(stored.acceptance,item.acceptance);
  for(const field of [item.scope,...item.exclusions,...item.acceptance]){
   assert.ok(txt.includes(field),item.id+' TXT scope');
  }
 }
 for(const [key,term] of Object.entries(offers.add_on_terms))if(key!=='version')assert.ok(txt.includes(term),key);
 assert.ok(txt.endsWith('\n'));
}));

test('duplicate-sentence guard rejects repeated terms rather than silently accepting them',()=>{
 const example={id:'sentence-case',sections:[{title:'One',items:['You approve each stage in writing.']},{title:'Two',items:['  you   approve each stage in writing.  ']}]};
 assert.throws(()=>assertUniquePackSentences([example]),/Duplicate sentence in sentence-case/);
});

test('V3 generation normalizes repeated scope text without publishing duplicate promises',async()=>withOutput(async output=>{
 const changed=structuredClone(offers);
 changed.launch_site.v3.support+=' '+changed.launch_site.v3.support;
 await writeBuyerPacks(output,changed);
 const txt=await readFile(join(output,'assets/buyer-packs/launch_site.txt'),'utf8');
 assert.equal(count(txt,offers.launch_site.v3.support),1);
 assert.doesNotThrow(()=>assertUniquePackSentences(buyerPacks(changed)));
}));
