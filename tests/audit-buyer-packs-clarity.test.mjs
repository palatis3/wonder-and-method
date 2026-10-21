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
const expected={launch_site:1400,focused_site:2350,signature_site:3700,keep_running:150,improve:400,grow:800,audit_fix_sprint:750,website_baseline:399};
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

test('all eight pack contracts retain prices, request destinations and exact payment amounts',()=>{
 assert.deepEqual(packs.map(pack=>pack.id),Object.keys(expected));
 for(const pack of packs){
  assert.equal(pack.price,expected[pack.id]);
  assert.equal(pack.request,'/checkout/'+pack.id.replaceAll('_','-')+'/');
  assert.match(pack.scopeStatus,/does not book work, accept terms or make a payment/);
  const text=body(pack),offer=pack.summary.offer;
  if(offer.payment_schedule){
   assert.equal(offer.payment_schedule.reduce((total,payment)=>total+payment.amount,0),pack.price);
   for(const payment of offer.payment_schedule)assert.ok(text.includes(`${money(payment.amount)} — ${payment.event} (${payment.percent}%)`),pack.id);
  }else{
   assert.ok(text.includes(money(pack.price+offers.baseline.one_time_price)),pack.id+' conditional first payment');
   assert.equal(pack.baselineFee,offers.baseline.one_time_price);
  }
  for(const pattern of [/silence.*(?:not|never)/i,/five business days/i,/export limits/i,/cancel/i,/provider/i])assert.match(text,pattern,pack.id);
 }
});

test('HTML and TXT content use one section sequence with plain visible headings',()=>{
 assert.doesNotThrow(()=>assertUniquePackSentences(packs));
 for(const pack of packs){
  const html=packBody(pack),visible=plainHtml(html);
  for(const section of pack.sections){
   const tag=section.disclosure?'summary':'h2';
   assert.equal(count(html,`<${tag}>${escapeHtml(packSectionTitle(section))}</${tag}>`),1,pack.id+' heading '+section.title);
   for(const item of section.items){
    const shown=item.replace('https://wonderandmethod.com/services/website-addons/','wonderandmethod.com/services/website-addons/');
    assert.equal(count(visible,shown),1,pack.id+' repeated or missing item: '+shown.slice(0,70));
   }
  }
  assert.doesNotMatch(visible,/\bunits\b|\bledger\b|canonical\/crawl|\bcontained\b|connected sequence|eligible profile batch/i,pack.id);
  assert.equal(count(html,'href="/services/website-addons/"'),1,pack.id);
  assert.equal(count(html,'href="/payments/"'),1,pack.id);
  assert.doesNotMatch(html,/Complete work limits, payments and terms|Before you commit/);
 }
 for(const id of ['keep_running','improve','grow']){
  const section=packs.find(pack=>pack.id===id).sections.find(section=>section.title==='Monthly units and advice');
  assert.equal(packSectionTitle(section),'What you get each month');
 }
 for(const id of ['website_baseline','audit_fix_sprint'])assert.equal(packSectionTitle(packs.find(pack=>pack.id===id).sections.find(section=>section.title==='Included units')),'What you get');
});

test('build packs retain numeric scope and approval, correction, cancellation and handoff conditions',()=>{
 for(const [id,pages,articles,forms,connections,graphics,photos] of [
  ['launch_site',6,0,1,1,1,0],['focused_site',15,2,2,2,6,6],['signature_site',30,4,2,2,12,12]
 ]){
  const pack=packs.find(pack=>pack.id===id),text=body(pack);
  assert.match(text,new RegExp('Up to '+pages+' pages'));
  assert.match(text,new RegExp(forms+' contact forms?'));
  assert.match(text,new RegExp('Up to '+connections+' agreed booking or newsletter'));
  assert.ok(text.includes(offers[id].seo_foundation));
  assert.ok(text.includes(offers[id].redirect_limit));
  assert.ok(text.includes(offers[id].training));
  assert.ok(text.includes(offers[id].correction));
  assert.ok(text.includes(offers.ownership_and_billing.build_cancellation));
  assert.ok(text.includes(offers.ownership_and_billing.late_payment));
  if(articles)assert.match(text,new RegExp('Includes '+articles+' researched articles or guides.*within that total'));
  if(photos){assert.match(text,new RegExp(graphics+' distinct designs total'));assert.match(text,new RegExp(photos+' supplied-photo edits'));assert.match(text,/Resizing does not count as another graphic/);}
  for(const pattern of [/policy pages are outside the limit; legal writing is separate/,/six agreed fields, one receiving destination and one confirmation/,/Sensitive information and file uploads need separate assessment/,/Two review rounds cover the design and finished website/,/five business days per round unless agreed otherwise/,/Silence never counts as approval or triggers payment/,/Missing inputs or reviews receive notice and revised dates/,/You own paid custom work/,/control production accounts from the start/,/No studio subscription is required/,/Within five business days after paid completion or settling an early cancellation/,/Connected services and passwords require separate/,/Correcting faults does not use a review round/])assert.match(text,pattern,id);
 }
 const signature=body(packs.find(pack=>pack.id==='signature_site'));
 for(const pattern of [/one concept, scene and final web output/,/mobile, still and reduced-motion/,/duration and performance limits/,/Complex simulations, characters, multiple productions and custom interactive 3D are separate/])assert.match(signature,pattern);
});

test('monthly packs state the starting review once and retain work, renewal and exit protections',()=>{
 for(const id of ['keep_running','improve','grow']){
  const pack=packs.find(pack=>pack.id===id),text=body(pack);
  assert.equal(count(text,baselineEnrollmentNote(offers)),1,id);
  for(const exclusion of offers.monthly_terms.excluded)assert.ok(text.includes(exclusion),id+' exclusion');
  for(const pattern of [/no minimum term/,/up to 12 marketing pages/,/still usable/,/no 24\/7 service/,/The same work is never counted twice/,/My mistakes and already-promised launch work do not use paid monthly work/,/Unused supplied edits do not carry over/,/Cancel before renewal/,/Unfinished work you approved remains owed/,/Canceling care does not disable your paid website/,/unrelated unpaid invoice cannot justify disabling/])assert.match(text,pattern,id);
  if(id==='keep_running'){
   assert.match(text,/No main improvement is included/);
   assert.match(text,/fee covers the agreed checks even without supplied edits/);
   assert.match(text,/refund or credit any unearned balance/);
  }else{
   assert.match(text,new RegExp(offers.plans[id].priorities+' completed'));
   assert.match(text,new RegExp('One '+(id==='grow'?30:20)+'-minute call'));
   assert.ok(text.includes(offers.plans[id].search_scope.method));
   assert.ok(text.includes(offers.plans[id].search_scope.metrics));
   for(const pattern of [/Public posting or email sending needs your explicit approval/,/Five business days before renewal/,/next monthly invoice pauses/,/included care in writing/,/no automatic replacement charge/,/unused-work refund or credit/,/inquiry clicks are not confirmed leads/])assert.match(text,pattern,id);
  }
 }
 const grow=body(packs.find(pack=>pack.id==='grow'));
 for(const pattern of [/up to 3 sizes/,/up to 150 words/,/No new concept, illustration, claims, email layout, account or campaign setup, testing or sending/,/second accepted improvement and extra graphic or excerpt remain owed/,/earlier improvements and updates the 90-day plan/])assert.match(grow,pattern);
});

test('one-off packs retain safe-fit limits, the conditional fix and written completion and refund rights',()=>{
 for(const id of ['website_baseline','audit_fix_sprint']){
  const text=body(packs.find(pack=>pack.id===id));
  for(const pattern of [/up to 12 marketing pages/,/Before any payment/,/no platform is automatically covered/,/not a promise to fix every finding/,/specialist certification are separate/,/One round of these changes and the quality checks are included/,/Silence is not approval/,/30 calendar days after your written approval of its completion/,/unearned amount to be refunded/,/does not include or require a new year of hosting/])assert.match(text,pattern,id);
  assert.ok(text.includes(offers.one_off_terms.remedy));
  assert.ok(text.includes(offers.one_off_terms.ownership));
 }
 const baseline=body(packs.find(pack=>pack.id==='website_baseline'));
 assert.ok(baseline.includes(offers.baseline.acceptance));
 assert.ok(baseline.includes(offers.baseline.duplicate_rule));
 assert.match(baseline,/Baseline fix does not use that month’s included work/);
 const sprint=body(packs.find(pack=>pack.id==='audit_fix_sprint'));
 assert.match(sprint,/up to two agreed small fixes in total; this is not a Baseline fix plus two more/);
 assert.match(sprint,/approve completion in writing before the second payment/);
 assert.match(sprint,/replacement work or a refund for work not done/);
 assert.ok(sprint.includes(offers.audit_sprint.baseline_rule));
});

test('new annual enrollment remains gated and all gated prices and rights remain available',()=>{
 for(const pack of packs.filter(pack=>pack.summary.monthly)){
  assert.equal(pack.annual,undefined);
  assert.doesNotMatch(body(pack),/Annual prepayment|Annual cancellation terms/);
 }
 const enabled=structuredClone(offers);enabled.annual_enrollment_gate.verified=true;
 const annualPacks=buyerPacks(enabled);assert.doesNotThrow(()=>assertUniquePackSentences(annualPacks));
 for(const pack of annualPacks.filter(pack=>pack.summary.monthly)){
  assert.deepEqual(pack.annual,offers.plans[pack.id].annual);
  const text=body(pack);
  assert.ok(text.includes(offers.annual_terms.payment));
  assert.ok(text.includes(offers.annual_terms.dates));
  for(const key of ['renewal','cancellation','refund_timing','hosting','build_rights'])assert.ok(text.includes(offers.annual_terms[key]),key);
 }
});

test('generated HTML, TXT and index keep every destination and the complete twelve-add-on download',async()=>withOutput(async output=>{
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
  assert.doesNotMatch(txt,/NEXT ACTION:|Return to the website|\bUNITS\b|\bledger\b|canonical\/crawl|\bcontained\b|connected sequence/i);
  assert.equal(count(txt,site.origin+'/services/website-addons/'),1);
  assert.equal(count(txt,'Payments and cancellation: '+site.origin+'/payments/'),1);
  for(const section of pack.sections)for(const item of section.items)assert.equal(count(txt,item),1,pack.id+' TXT item');
  const record=index.find(item=>item.id===pack.id);
  assert.deepEqual(Object.keys(record),['id','name','price','priceLabel','summary','request','annual','baselineFee','addOns']);
  assert.equal(record.addOns,'/assets/buyer-packs/website-addons');
  assert.equal(record.request,pack.request);
  // A ceiling allows the complete conditions to exceed the 900-word reading target.
  assert.ok(words(txt)<1200,pack.id+' full download has avoidable growth');
  assert.ok(words(pack.sections.filter(section=>!section.disclosure).flatMap(section=>section.items).join(' '))<900,pack.id+' main reading length');
 }
 const catalogue=index.at(-1),html=await readFile(join(folder,'website-addons.html'),'utf8'),txt=await readFile(join(folder,'website-addons.txt'),'utf8');
 assert.equal(catalogue.path,'/assets/buyer-packs/website-addons');
 assert.equal(catalogue.download,'/assets/buyer-packs/website-addons.txt');
 assert.equal(catalogue.items.length,12);
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

test('pack generation rejects a newly repeated sentence instead of publishing it',async()=>withOutput(async output=>{
 const changed=structuredClone(offers);
 changed.launch_site.correction+=' '+changed.launch_site.correction;
 await assert.rejects(()=>writeBuyerPacks(output,changed),/Duplicate sentence in launch_site/);
 await assert.rejects(access(join(output,'assets/buyer-packs/launch_site.html')));
 const example={id:'sentence-case',sections:[{title:'One',items:['You approve each stage in writing.']},{title:'Two',items:['  you   approve each stage in writing.  ']}]};
 assert.throws(()=>assertUniquePackSentences([example]),/Duplicate sentence in sentence-case/);
}));
