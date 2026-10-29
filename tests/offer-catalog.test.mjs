import {buyerPacks} from '../src/buyer-packs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {normalizeOfferCatalog,publicOfferProjection,resolveOfferCopy,currentOfferIds,offerRecord} from '../src/offer-catalog.mjs';
import {applyOfferChanges,updateOffers} from '../scripts/update-offers.mjs';
import {renderPages} from '../src/pages.mjs';
import {writeBuyerPacks} from '../scripts/build-buyer-packs.mjs';
import {priceList,calculateCost,inquiryChoiceLabel} from '../src/shared.mjs';
import {paymentCatalog,prepareInvoice,paymentAccounts} from '../src/payments.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {careContent,servicesOverview,seoContent} from '../src/service-content.mjs';
import {countyServiceCards} from '../src/service-counties.mjs';
import {assertOfferBindings,offerBindingProbe} from '../scripts/check-offer-bindings.mjs';
import {serviceFaqSection,validateOfferFaqBindings} from '../src/service-faqs.mjs';
import faqQuestions from '../src/service-faqs.json' with {type:'json'};
import faqBindings from '../src/service-faq-offer-copy.json' with {type:'json'};
import {escapeHtml} from '../src/shared.mjs';
import {parseFragment} from 'parse5';
import {responsiveTables} from '../src/responsive-tables.mjs';
import {inquiryMessageHelp} from '../src/shared.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,config,map,geography]=await Promise.all(['config/offers.json','config/site.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const changes={version:'2099-01-01-catalog-regression',as_of:'2099-01-01',set:{
 'launch_site.public_price':1601.03,'launch_site.public_name':'Starter Website','launch_site.marketing_page_cap':8,
 'focused_site.public_price':2603.07,'focused_site.public_name':'Complete Website','focused_site.marketing_page_cap':18,'business_site.launch_content.articles':3,
 'signature_site.public_price':4107.11,'baseline.one_time_price':425.03,'baseline.page_cap':14,'audit_sprint.one_time_price':801.01,
 'plans.keep_running.monthly_price':175.03,'plans.keep_running.public_name':'Steady Care',
 'plans.improve.monthly_price':450.07,'plans.improve.public_name':'Progress','plans.improve.priorities':3,'plans.improve.review_minutes':25,
 'plans.grow.monthly_price':901.09,'plans.grow.priorities':4,'plans.grow.search_scope.active_topics':3,
 'add_ons.2.public_price':375.03,'add_ons.2.public_name':'Changed Standard Page'
}};

test('normalization preserves current commercial promises and prices without mutating inputs',()=>{
 const before=JSON.stringify(offers),catalog=normalizeOfferCatalog(offers);
 const expected=structuredClone(offers);
 assert.deepEqual(catalog,expected);assert.equal(JSON.stringify(offers),before);
 assert.ok(Object.isFrozen(catalog.plans.improve.annual));
 assert.deepEqual([catalog.launch_site.public_price,catalog.focused_site.public_price,catalog.signature_site.public_price],[2195,2995,6495]);
});

test('one update reaches current metadata, schema, forms, calculator, downloads, quotes and payment catalog',async()=>{
 const changed=applyOfferChanges(offers,changes),pages=renderPages({config,offers:changed,map,geography});
 const page=path=>{const result=pages.find(p=>p.path===path);assert.ok(result,path);return result;};
 assert.match(page('/').description,/\$1,601\.03/);assert.match(page('/pricing/').description,/\$1,601\.03/);
 const schemas=[...page('/pricing/').html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 assert.match(JSON.stringify(schemas),/"name":"Starter Website"/);assert.match(JSON.stringify(schemas),/"price":1601\.03/);
 assert.match(page('/pricing/').html,/Up to 18/);
 assert.match(page('/contact/').html,/Starter Website[^<]*1,601\.03/);assert.match(page('/contact/').html,/Progress[^<]*350\.07/);
 assert.match(page('/checkout/launch-site/').html,/\$640\.41/);
 assert.match(page('/tools/website-roi-calculator/').html,/value="2603\.07"/);assert.match(page('/services/website-audit/').description,/\$801\.01/);
 const prices=priceList(changed),projection=publicOfferProjection(changed);
 assert.equal(prices.launch,1601.03);assert.equal(prices.baseline,425.03);assert.equal(projection.plans.improve.priorities,3);
 assert.match(inquiryChoiceLabel('improve',projection),/Progress.*350\.07/);
 assert.equal(calculateCost(prices,{build:'launch',plan:'keep_running',cycles:12,hostingMonthly:0,external:0}).total,3701.39);
 const launch=paymentCatalog(changed).find(p=>p.id==='launch_site');assert.equal(launch.name,'Starter Website');assert.deepEqual(launch.prices.map(p=>p.amount),[64041,48031,48031]);
 const draft=await draftScope('focused_site','catalog-regression',{catalog:changed});assert.equal(draft.fixed_price,2603.07);
 assert.match(draft.commercial_boundaries.deliverables.join(' '),/(?:18|eighteen) marketing pages/i);
 const ongoing=await draftScope('improve','catalog-regression',{catalog:changed});assert.match(ongoing.commercial_boundaries.deliverables.join(' '),/(?:3|three) (?:agreed )?(?:main )?improvements/i);
 const folder=await mkdtemp(join(tmpdir(),'wm-offer-downloads-'));
 try{
  await mkdir(join(folder,'assets'));await writeFile(join(folder,'assets/site.css'),'/* isolated download fixture */');await writeBuyerPacks(folder,changed);
  const txt=await readFile(join(folder,'assets/buyer-packs/focused_site.txt'),'utf8'),html=await readFile(join(folder,'assets/buyer-packs/launch_site.html'),'utf8');
  assert.match(txt,/Complete Website/i);assert.match(txt,/\$2,603\.07/);assert.match(txt,/(?:18|eighteen) marketing pages/i);assert.match(await readFile(join(folder,'assets/buyer-packs/business_site.txt'),'utf8'),/(?:3|three) researched (?:practical )?(?:articles|guides)/i);
  assert.match(html,/Starter Website/);assert.match(html,/\$640\.41/);
  const index=JSON.parse(await readFile(join(folder,'assets/buyer-packs/index.json'),'utf8'));assert.equal(index.find(p=>p.id==='improve').price,450.07);
 }finally{await rm(folder,{recursive:true,force:true});}
});

test('cent allocation uses one base price while current V3 annual enrollment stays closed',()=>{
 const changed=applyOfferChanges(offers,changes);assert.deepEqual(changed.audit_sprint.payment_schedule.map(s=>s.amount),[400.51,400.5]);
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront'])assert.equal(changed[id].payment_schedule.reduce((sum,s)=>sum+Math.round(s.amount*100),0),Math.round(changed[id].public_price*100));
 const a=changed.plans.keep_running.annual;assert.equal(a.upfront_price,2100.36);assert.equal(a.saving_vs_12_monthly,0);assert.equal(a.monthly_equivalent,a.upfront_price/12);
 const activated=structuredClone(changed);activated.annual_enrollment_gate.verified=true;assert.throws(()=>normalizeOfferCatalog(activated),/V3 does not offer new annual enrollment/);
 const raw=structuredClone(offers);raw.launch_site.public_price=1800;raw.plans.improve.monthly_price=500;assert.equal(normalizeOfferCatalog(raw).launch_site.payment_schedule[0].amount,720);assert.equal(normalizeOfferCatalog(raw).plans.improve.annual.upfront_price,6000);
});

test('current service and county prose follows renamed plans and V4 monthly quantities without retired promotion',()=>{
 const changed=applyOfferChanges(offers,{...changes,set:{...changes.set,'plans.grow.public_name':'Campaign','plans.grow.growth_plan.days':120}});
 const pages=renderPages({config,offers:changed,map,geography}),seo=pages.find(p=>p.path==='/services/seo/').html,care=pages.find(p=>p.path==='/services/website-care/').html,county=countyServiceCards(changed);
 const card=(html,id)=>html.match(new RegExp('<article class="[^"]*\\bv3-offer-card\\b[^"]*" id="offer-'+id+'">([\\s\\S]*?)</article>'))?.[1]||'';
 assert.match(card(seo,'improve'),/<h3>Progress<\/h3>/);assert.match(card(seo,'improve'),/(?:3|three) main (?:website improvements|outputs?)/i);
 assert.match(card(seo,'grow'),/<h3>Campaign<\/h3>/);assert.match(card(seo,'grow'),/(?:4|four) (?:monthly )?content\/SEO units/i);
 assert.match(care,/Steady Care/);assert.match(care,/\$175\.03/);
 for(const name of ['Starter Website','Complete Website',changed.business_site.public_name,'Progress','Local Search Focus','Campaign'])assert.ok(county.includes(name),name);
 for(const html of [seo,care,county])assert.doesNotMatch(html,/extra social graphic|newsletter excerpts|one small fix if|up to two agreed fixes total|monthly first payments are/i);
 const escaped=structuredClone(changed);escaped.plans.keep_running.public_name='Care & Support';escaped.launch_site.public_name='Start & Launch';
 assert.match(countyServiceCards(escaped),/Start &amp; Launch/);assert.doesNotMatch(countyServiceCards(escaped),/&amp;amp;/);assert.match(servicesOverview(escaped),/Care &amp; Support/);
 const currentSeo=seoContent(offers),currentCare=careContent(offers),currentCounty=countyServiceCards(offers);
 assert.match(currentSeo,/one (?:main |useful )?(?:website improvement|output)/i);assert.match(currentSeo,/two (?:monthly )?content\/SEO units/i);assert.match(currentSeo,/Local Search Focus/);
 assert.match(currentCare,/\$149/);assert.match(currentCounty,/Website Roadmap/);assert.match(currentCounty,/no implementation|review only|action plan/i);
});

test('invalid source values, broken templates and reused versions fail before writing',()=>{
 for(const mutate of [o=>o.launch_site.public_price=-1,o=>o.baseline.one_time_price=0,o=>o.plans.improve.monthly_price=4.001,o=>o.launch_site.payment_schedule[0].percent=49,o=>o.signature_site.marketing_page_cap=1,o=>o.plans.grow.priorities=1.5,o=>o.plans.improve.annual.discount_percent=100,o=>o.plans.improve.annual.cycles=11,o=>o.launch_site.public_name='',o=>o.copy_templates['launch_site.page_scope']='{{missing.field}}']){
  const raw=structuredClone(offers);mutate(raw);assert.throws(()=>normalizeOfferCatalog(raw),/Offer catalog/);
 }
 assert.throws(()=>applyOfferChanges(offers,{...changes,version:offers.version}),/unused/);
 assert.throws(()=>applyOfferChanges(offers,changes,{usedVersions:[changes.version]}),/unused/);
 assert.throws(()=>applyOfferChanges(offers,{...changes,set:{'launch_site.payment_schedule.0.amount':1}}),/source field/);
 const bound=structuredClone(offers);bound.copy_templates['launch_site.page_scope']='Up to {{launch_site.marketing_page_cap}} pages.';
 assert.throws(()=>applyOfferChanges(bound,{...changes,set:{'launch_site.page_scope':'Unbound replacement'}}),/derived/);
});

test('preview does not write; explicit write saves derived values and prevents version reuse',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'wm-offer-update-')),catalogPath=join(folder,'offers.json'),changesPath=join(folder,'changes.json');
 try{
  const original=JSON.stringify(offers);await writeFile(catalogPath,original);await writeFile(changesPath,JSON.stringify(changes));
  assert.equal((await updateOffers({catalogPath,changesPath})).mode,'preview only');assert.equal(await readFile(catalogPath,'utf8'),original);
  assert.equal((await updateOffers({catalogPath,changesPath,write:true})).mode,'written locally');
  const saved=JSON.parse(await readFile(catalogPath,'utf8'));assert.equal(saved.launch_site.payment_schedule[0].amount,640.41);assert.ok(saved.previous_versions.includes(offers.version));
  await assert.rejects(updateOffers({catalogPath,changesPath,write:true}),/unused/);
 }finally{await rm(folder,{recursive:true,force:true});}
});

test('new catalog leaves an accepted commercial snapshot and its invoice amount unchanged',async()=>{
 const scope=await draftScope('launch_site','saved-catalog-regression');scope.named_approver='Synthetic approver';scope.schedule.booked_start='2026-11-01';scope.milestones[0].approval_reference='Written booking approval';
 scope.buyer_confirmation={accepted_version:1,accepted_at:'2026-10-21T12:00:00Z',written_acceptance_reference:'Synthetic written acceptance',page_copy_limits:true,self_editing_understood:true,required_optional_bills:true,approvals:true,ownership_and_exit:true,questions_resolved:true,source_folder_zip_and_build_notes_understood:true,initial_launch_ready_service_limits_and_exclusions_understood:true,optional_handoff_call_and_separate_growth_work_understood:true};
 const before=JSON.stringify(scope),billing={mode:'test',account_id:paymentAccounts.test,customer_id:'cus_synthetic',scope_version:1,due_at:'2026-11-01T12:00:00Z',fit_reference:'Synthetic',capacity_reference:'Synthetic',cash_reference:'Synthetic',agreement_reference:'Synthetic',tax:{treatment:'no_tax',review_reference:'Synthetic',rate_ids:[]}};
 const old=prepareInvoice(scope,billing,0,{now:new Date('2026-10-22T12:00:00Z')});
 const changed=applyOfferChanges(offers,changes);await draftScope('launch_site','new-catalog-regression',{catalog:changed});paymentCatalog(changed);
 assert.equal(JSON.stringify(scope),before);assert.equal(old.amount,87800);assert.deepEqual(prepareInvoice(scope,billing,0,{now:new Date('2026-10-22T12:00:00Z')}),old);
});

test('the build probe exercises all current offers, form and page limits without changing inputs',()=>{
 const before=JSON.stringify({offers,config}),result=assertOfferBindings({config,offers,map,geography});
 assert.equal(result.status,'pass');assert.equal(result.generation,3);assert.equal(result.offers,15);assert.equal(result.modules,13);assert.ok(result.assertions>=71);assert.equal(JSON.stringify({offers,config}),before);
 const changed=offerBindingProbe(offers),packs=buyerPacks(changed),text=id=>packs.find(p=>p.id===id).sections.flatMap(s=>s.items).join(' ');
 assert.match(text('launch_site'),/(?:3|three) contact forms/i);assert.match(text('launch_site'),/(?:7|seven) (?:agreed )?fields/i);
 assert.match(text('focused_site'),/(?:4|four) contact forms/i);assert.match(text('focused_site'),/(?:18|eighteen) marketing pages/i);
 assert.match(text('signature_site'),/(?:35|thirty-five) marketing pages/i);assert.match(text('signature_site'),/(?:5|five) researched (?:practical )?guides/i);
 assert.match(text('improve'),/(?:3|three) (?:agreed )?(?:main )?improvements/i);assert.match(text('grow'),/(?:4|four) content\/SEO units/i);
 assert.doesNotMatch(text('grow'),/extra social graphic|newsletter excerpts/i);
 for(const key of ['form_field_limit','training_minutes']){const invalid=structuredClone(offers);invalid.launch_site[key]=-1;assert.throws(()=>normalizeOfferCatalog(invalid),/must be an integer/);}
});

test('bound FAQ and inquiry copy uses current names and quantities with one HTML escape',()=>{
 const changed=offerBindingProbe(offers),county=serviceFaqSection('/areas/suffolk-county/',changed);
 assert.match(county,/Probe &amp; Progress includes three agreed website improvements/);assert.match(county,/Probe &amp; Campaign includes four content\/SEO units/);assert.match(county,/Local Search Focus/);assert.doesNotMatch(county,/&amp;amp;/);
 assert.match(inquiryMessageHelp('website_baseline','checkout','',false,publicOfferProjection(changed)),/Probe & Review/);
 assert.match(serviceFaqSection('/areas/new-jersey/monmouth-county/',offers),/Website Care includes one set of small text, photo or link changes/);
});

test('all FAQ bindings reject renamed, missing, duplicated or changed source rows',()=>{
 validateOfferFaqBindings();
 for(const [path,bindings] of Object.entries(faqBindings))for(const binding of bindings){
  const template=binding.singleBatchTemplate&&offers.plans.improve.small_change_batches===1&&offers.plans.grow.small_change_batches===1?binding.singleBatchTemplate:binding.template;
  assert.ok(serviceFaqSection(path,offers).includes(escapeHtml(resolveOfferCopy(template,offers))));
  for(const mutation of ['rename','remove','duplicate','answer','route']){
   const source=structuredClone(faqQuestions),rows=source[path],index=rows.findIndex(r=>r.question===binding.question);
   if(mutation==='rename')rows[index].question+=' revised';
   if(mutation==='remove')rows.splice(index,1);
   if(mutation==='duplicate')rows.push({...rows[index]});
   if(mutation==='answer')rows[index].answer+=' revised';
   if(mutation==='route')delete source[path];
   assert.throws(()=>validateOfferFaqBindings(source),/Review changed FAQ offer binding/);
  }
 }
 // The render path must invoke the guard, even when rendering another route.
 const path='/areas/ohio/cuyahoga-county/',row=faqQuestions[path][0],original=row.question;
 try{row.question+=' revised';assert.throws(()=>serviceFaqSection('/pricing/',offers),/Review changed FAQ offer binding/);}
 finally{row.question=original;}
});

test('build checkout names escape markup once and fractional guide payments match the catalog',()=>{
 const changed=structuredClone(offerBindingProbe(offers));changed.plans.keep_running.public_name='Care & <Support>';
 const pages=renderPages({config,offers:changed,map,geography}),at=path=>pages.find(p=>p.path===path).html;
 for(const id of ['launch-site','focused-site','signature-site']){
  const html=at('/checkout/'+id+'/');assert.ok(html.includes('Care &amp; &lt;Support&gt;'));
  assert.doesNotMatch(html,/&amp;amp;|&amp;lt;|<Support>/);
 }
 const amounts=changed.launch_site.payment_schedule.map(s=>s.amount);
 assert.deepEqual(amounts,[640.41,480.31,480.31]);
 assert.equal(amounts.reduce((sum,n)=>sum+Math.round(n*100),0),Math.round(changed.launch_site.public_price*100));
 assert.ok(at('/guides/website-project-cost/').includes('$640.41 / $480.31 / $480.31'));
});

test('guide table cells and mobile labels preserve names as text through one escape',()=>{
 const changed=structuredClone(offerBindingProbe(offers)),suffix=' & <ProbeName> "quoted" \'text\' &lt;';
 for(const id of ['launch_site','focused_site','signature_site'])changed[id].public_name=id+suffix;
 changed.plans.keep_running.public_name='Care'+suffix;
 for(const addon of changed.add_ons)addon.public_name=addon.id+suffix;
 const html=renderPages({config,offers:changed,map,geography}).find(p=>p.path==='/guides/website-project-cost/').html;
 const nodes=[];function visit(node){nodes.push(node);for(const child of node.childNodes||[])visit(child);}visit(parseFragment(html));
 const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');
 assert.equal(nodes.some(node=>node.tagName==='probename'),false);
 const anchors=nodes.filter(node=>node.tagName==='a');
 for(const id of ['launch_site','focused_site','signature_site'])assert.ok(anchors.some(node=>text(node)===changed[id].public_name));
 for(const id of ['standard_page','three_page_bundle','practical_guide','guided_quote_form','booking_setup','reporting_dashboard'])assert.ok(anchors.some(node=>text(node)===id+suffix));
 assert.ok(nodes.some(node=>node.tagName==='th'&&text(node)===changed.plans.keep_running.public_name+': 12 monthly invoices'));
 const labels=nodes.flatMap(node=>(node.attrs||[]).filter(attr=>attr.name==='data-label').map(attr=>attr.value));
 assert.ok(labels.includes('Amount'));assert.ok(labels.includes('Build fee'));assert.ok(labels.includes('Page limit'));
 assert.ok(!labels.some(label=>label.includes('&lt;ProbeName&gt;')));
 // Repeated responsive processing is stable; intentional heading markup is stripped.
 const table='<table><thead><tr><th>Row</th><th><strong>'+escapeHtml(suffix)+'</strong></th></tr></thead><tbody><tr><th>Example</th><td>Value</td></tr></tbody></table>';
 assert.equal(responsiveTables(responsiveTables(table)),responsiveTables(table));
 const parsed=parseFragment(responsiveTables(table));nodes.length=0;visit(parsed);
 assert.equal(nodes.find(node=>node.tagName==='td').attrs.find(attr=>attr.name==='data-label').value,suffix.trim());
});

test('downloaded buyer documents and the report sample follow the same changed catalog',async()=>{
 const changed=offerBindingProbe(offers),folder=await mkdtemp(join(tmpdir(),'wm-bound-downloads-'));
 try{
  await mkdir(join(folder,'assets'));await writeFile(join(folder,'assets/site.css'),'/* isolated document fixture */');
  await writeBuyerPacks(folder,changed);
  const read=id=>readFile(join(folder,'assets/buyer-packs/'+id),'utf8');
  const [baseline,launch,grow,sample]=await Promise.all(['website_baseline.txt','launch_site.txt','grow.txt','keep-running-sample.html'].map(read));
  assert.match(baseline,/Probe & Review/i);assert.doesNotMatch(baseline,/Website Baseline/);
  assert.match(launch,/(?:3|three) contact forms/i);assert.match(launch,/(?:7|seven) (?:agreed )?fields/i);
  assert.match(grow,/(?:4|four) content\/SEO units/i);assert.match(grow,/35-minute|35 minutes/);
  assert.doesNotMatch(grow,/Agree two units|Two defined units|two bounded search improvements/);assert.match(grow,/120-day topic and local-presence plan/);
  assert.doesNotMatch(grow,/extra social graphic|newsletter excerpts/i);
  assert.match(sample,/<title>Sample Probe &amp; Care report/);
  assert.match(sample,/Probe &amp; Progress and Probe &amp; Campaign add researched improvements/);
  assert.doesNotMatch(sample,/Keep Running|&amp;amp;/);
 }finally{await rm(folder,{recursive:true,force:true});}
});
