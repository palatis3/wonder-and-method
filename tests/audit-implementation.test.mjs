import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {calculateCost,calculateLegacyCost,priceList,moneyExact,annualRefund} from '../src/shared.mjs';
import {renderPages} from '../src/pages.mjs';
import {createServer} from '../scripts/server.mjs';
import {draftScope} from '../scripts/create-job.mjs';
const json=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));
const legacyOffers=await json('tests/fixtures/legacy-offers.json');
const pages=renderPages({config,offers,map,geography});

test('current fixed-project ladder reconciles through quote, rendered choices and calculator',async()=>{
 const prices=priceList(offers);
 const {add_ons,...basePrices}=prices;
 assert.equal(basePrices.catalog_format,3);assert.equal(basePrices.annual_available,false);
 for(const [key,expected] of Object.entries({launch:2950,focused:4500,business:7500,signature:11500,keep_running:275,improve:1250,local_focus:850,grow:1750,baseline:650,sprint:1800,brand_message:1800,storefront:8500,local_presence:950,workflow:2500,systems:2000}))assert.equal(basePrices[key],expected,key);
 assert.equal(basePrices.provider_model,'client_owned_direct_billing');assert.equal(basePrices.commercial_version,offers.version);
 assert.deepEqual(add_ons,offers.add_ons.map(({id,public_name,public_price})=>({id,public_name,public_price})));
 for(const name of ['launch','focused','business','signature']){
  const price=prices[name];
  const key=name+'_site';assert.equal(offers[key].public_price,price);
  const draft=await draftScope(key,'synthetic-ladder');
  assert.deepEqual(draft.milestones.map(m=>m.amount),[price*.4,price*.3,price*.3]);
  assert.equal(draft.accepted_at,null);
  assert.equal(calculateCost(prices,{build:name,plan:'keep_running',cycles:11}).serviceTotal,price+3025);
  assert.ok(pages.find(p=>p.path==='/').html.includes('/pricing/'));
  assert.ok(pages.find(p=>p.path==='/pricing/').html.includes('id="offer-'+key+'"'));
  for(const route of ['/pricing/','/services/web-design/'])assert.ok(pages.find(p=>p.path===route).html.includes('/checkout/'+key.replaceAll('_','-')+'/'));
 }
 assert.equal(offers.plans.keep_running.monthly_price,275);assert.equal(offers.audit_sprint.one_time_price,1800);assert.equal(offers.plans.improve.monthly_price,1250);
 const publicCopy=pages.map(p=>p.html).join('\n');
 assert.doesNotMatch(publicCopy,/choose implementable priority by hour 3|seven-hour estimate|signed 10-hour scope/);
 // The ROI tool contains labeled hypothetical contribution amounts, not package prices.
 assert.doesNotMatch(pages.filter(p=>p.path!=='/tools/website-roi-calculator/').map(p=>p.html).join('\n'),/\$6,000|\$9,500/);
 assert.match(pages.find(p=>p.path==='/pricing/').html,/lightweight motion treatment.*20 seconds/i);
});

test('Launch survives a real synthetic request and remains recoverable without sending mail',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-launch-'));const {server,db,url}=await createServer({runtime,port:0});
 try{
  const response=await fetch(url+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:url},body:JSON.stringify({name:'Synthetic Launch',email:'launch@example.test',business:'Synthetic scope test',website:'',service:'launch_site',message:'Synthetic Launch inquiry validates the new package choice.',company_url:''})});
  assert.equal(response.status,201);const receipt=await response.json();
  assert.match(receipt.message,/No email was sent/);
  const record=db.prepare('SELECT payload,status FROM inquiries WHERE id=?').get(receipt.reference);
  assert.equal(JSON.parse(record.payload).service,'launch_site');assert.equal(record.status,'synthetic_saved_not_emailed');
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});

test('current estimates itemize separate diagnostic, repair and care fees before proposal credits',()=>{
 const prices=priceList(offers);
 assert.equal(calculateCost(prices,{build:'existing',plan:'improve',baseline:true,cycles:12}).serviceTotal,650+1250*12);
 assert.equal(calculateCost(prices,{build:'existing',plan:'grow',baseline:true,sprint:true,cycles:1}).serviceTotal,650+1800+1750);
 assert.equal(calculateCost(prices,{build:'signature',plan:'keep_running',baseline:true,cycles:1}).serviceTotal,11500+275);
 assert.equal(calculateCost(prices,{build:'existing',plan:'none',baseline:true,cycles:0}).serviceTotal,650);
});

test('published decisions include the real review framework, exclusions and inspectable examples',()=>{
 const page=path=>pages.find(p=>p.path===path).html;
 assert.equal(offers.review_standard.sections.length,22);
 assert.equal(offers.review_standard.sections.reduce((sum,s)=>sum+s.weight,0),100);
 assert.match(page('/services/website-audit/'),/Website Roadmap/);assert.match(page('/services/website-audit/'),/Website Repair Sprint/);
 const seo=page('/services/seo/');assert.match(seo,/not included|Not included|separately scoped/i);
 assert.match(page('/guides/seo-work-and-reporting/'),/\/assets\/buyer-packs\/owned-audit-two-fixes/);assert.match(page('/guides/seo-work-and-reporting/'),/illustrative record of one agreed service-page improvement/);
 assert.match(page('/guides/website-redesign-brief/'),/illustrative-completed-brief\.txt/);
 assert.match(page('/guides/website-migration-checklist/'),/\/assets\/downloads\/website-url-map\.csv/);
 for(const id of ['keep_running','improve','local_focus','grow','audit_fix_sprint'])assert.match(page('/contact/'),new RegExp('value="'+id+'"'));
 assert.match(offers.signature_site.v3.includes.join(" "),/lightweight.*motion/i);
 assert.match(offers.signature_site.v3.includes.join(" "),/20 seconds/i);
 assert.doesNotMatch(page('/pricing/'),/Blender|Remotion|800 words|600 words|3,000 words|completely new 3D scene/);
});

test('native validation retry retains each new service without placing personal data in the URL',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-native-context-'));const {server,url}=await createServer({runtime,port:0});
 try{
  for(const service of ['keep_running','improve','local_focus','grow','audit_fix_sprint','<script>']){
   const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({name:'Synthetic',email:'private@example.test',business:'Fictional',service,message:'short'})});
   assert.equal(response.status,422);const html=await response.text();
   if(service!=='<script>')assert.match(html,new RegExp('<option value="'+service+'" selected>'));
   assert.match(html,/value="Synthetic"/);assert.match(html,/value="private@example.test"/);assert.match(html,/value="Fictional"/);
   assert.match(html,/<textarea[^>]*name="message"[^>]*>short<\/textarea>/);
   assert.match(html,/<p id="message-error" class="error">Please tell me a little about what you need \(at least 10 characters\)\.<\/p>/);
   assert.match(html,/<textarea[^>]*name="message"[^>]*aria-invalid="true"/);
   const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];
   assert.equal(retry,service==='<script>'?'/contact/':'/contact/?offer='+service);
   assert.doesNotMatch(retry,/private|Synthetic|script/);
  }
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});

test('new monthly and audit choices save successfully through the native form without sending mail',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-native-services-'));const {server,db,url}=await createServer({runtime,port:0});
 try{
  for(const service of ['keep_running','improve','local_focus','grow','audit_fix_sprint']){
   const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({name:'Synthetic Service',email:'synthetic@example.test',business:'Fictional verification',service,message:'Synthetic native form choice verification only.'})});
   assert.equal(response.status,201);const html=await response.text();assert.match(html,/Selected service:/);assert.match(html,/No email was sent/);
   assert.match(html,/id="inquiry-confirmation-heading"/);assert.match(html,/Your reference/);
  }
  const records=db.prepare('SELECT payload FROM inquiries').all().map(row=>JSON.parse(row.payload).service).sort();
  assert.deepEqual(records,['audit_fix_sprint','grow','improve','keep_running','local_focus']);
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});

test('historical snapshot: hosting costs are credited once and overlap reduces the plan invoice rather than reimbursing twice',()=>{
 const prices=priceList(legacyOffers);
 const during=calculateLegacyCost(prices,{build:'launch',plan:'keep_running',cycles:1,hostingMonths:1,serviceStart:1,hostingMonthly:20,external:0});
 assert.equal(during.buildHostingCredit,20);assert.equal(during.monthlyHostingCredit,0);assert.equal(during.planOverlapDiscount,20);assert.equal(during.total,1500+179);
 const after=calculateLegacyCost(prices,{build:'existing',plan:'keep_running',cycles:1,hostingMonths:1,hostingMonthly:20,external:0});
 assert.equal(after.buildHostingCredit,0);assert.equal(after.monthlyHostingCredit,20);assert.equal(after.planOverlapDiscount,0);assert.equal(after.total,199);
 const over=calculateLegacyCost(prices,{build:'existing',plan:'keep_running',cycles:1,hostingMonths:1,hostingMonthly:40,external:0});assert.equal(over.monthlyHostingCredit,25);assert.equal(over.total,214);
 const example=calculateLegacyCost(prices,{build:'focused',plan:'keep_running',cycles:11,serviceStart:2,hostingMonths:12,hostingMonthly:20,external:120});
 assert.deepEqual([example.buildHostingCredit,example.monthlyHostingCredit,example.planOverlapDiscount,example.total],[120,120,100,4709]);
 for(const fees of [{hostingMonthly:null,external:0},{hostingMonthly:20,external:null}])assert.equal(calculateLegacyCost(prices,{...fees}).total,null);
 assert.equal(calculateLegacyCost(prices,{build:'launch',hostingMonthly:0,external:0}).total,1500);
 assert.throws(()=>calculateLegacyCost(prices,{plan:'improve',cycles:12,serviceStart:2,hostingMonths:12}),/Hosting period/);
});

test('agreed-platform handoff scopes survive drafting with complete V3 deliverables',async()=>{
 const draft=await draftScope('signature_site','expanded-synthetic');
 assert.deepEqual(draft.commercial_boundaries.deliverables,draft.commercial_snapshot.offer.v3.includes);
 assert.equal(draft.commercial_boundaries.provider_policy.model,'client_owned_direct_billing');assert.ok(!Object.hasOwn(draft.commercial_boundaries,'hosting_credit'));
 const scope=JSON.stringify(draft.commercial_boundaries);assert.match(scope,/recorded demonstrations/);assert.match(scope,/three consolidated review rounds/);assert.match(scope,/three supplied policy pages outside/);assert.match(scope,/20 marketing pages/);
 assert.ok(!Object.hasOwn(draft.commercial_boundaries,'workflow_menu'));
 assert.deepEqual([offers.launch_site.forms,offers.focused_site.forms,offers.business_site.forms,offers.signature_site.forms],[1,1,2,3]);
 const html=pages.map(p=>p.html).join(' ');assert.doesNotMatch(html,/These packages are custom static websites|CMS remain separate|Fixed builds are static websites|standard static hosting within/);
 const web=pages.find(p=>p.path==='/services/web-design/').html;
 assert.match(web,/platform and editing workflow before booking/);assert.match(web,/recorded demonstration/);assert.match(web,/which changes you can make yourself/);
 assert.doesNotMatch(web,/lead tracker is bundled/);
});

test('historical snapshot: provider cents survive hosting credits, overlap and the displayed estimate exactly',()=>{
 const prices=priceList(legacyOffers);
 const cost=calculateLegacyCost(prices,{build:'focused',plan:'keep_running',cycles:11,serviceStart:2,hostingMonths:12,hostingMonthly:19.99,external:120.03});
 assert.deepEqual([cost.grossHosting,cost.buildHostingCredit,cost.monthlyHostingCredit,cost.planOverlapDiscount,cost.total],[239.88,119.94,119.94,99.95,4709.08]);
 assert.equal(moneyExact(cost.total),'$4,709.08');assert.equal(moneyExact(cost.buildHostingCredit),'$119.94');
 const cap=calculateLegacyCost(prices,{build:'existing',plan:'keep_running',cycles:1,hostingMonths:1,hostingMonthly:25.01,external:0.02});
 assert.equal(cap.monthlyHostingCredit,25);assert.equal(cap.total,199.03);
 const tiny=calculateLegacyCost(prices,{build:'launch',plan:'none',cycles:0,hostingMonths:12,hostingMonthly:0.1,external:0.2});
 assert.equal(tiny.total,1501.1);assert.equal(moneyExact(tiny.total),'$1,501.10');
});
