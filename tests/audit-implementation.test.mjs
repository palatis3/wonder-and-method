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
 assert.deepEqual(prices,{launch:1400,focused:2350,signature:3700,keep_running:150,improve:400,grow:800,baseline:399,sprint:750,annual:{keep_running:1710,improve:4560,grow:9120},commercial_version:offers.version,provider_model:'client_owned_direct_billing'});
 for(const [name,price] of Object.entries(prices).slice(0,3)){
  const key=name+'_site';assert.equal(offers[key].public_price,price);
  const draft=await draftScope(key,'synthetic-ladder');
  assert.deepEqual(draft.milestones.map(m=>m.amount),[price*.5,price*.3,price*.2]);
  assert.equal(draft.accepted_at,null);
  assert.equal(calculateCost(prices,{build:name,plan:'keep_running',cycles:11}).serviceTotal,price+1650);
  for(const route of ['/','/pricing/','/services/web-design/'])assert.ok(pages.find(p=>p.path===route).html.includes('/contact/?offer='+key));
 }
 assert.equal(offers.plans.keep_running.monthly_price,150);assert.equal(offers.audit_sprint.one_time_price,750);assert.equal(offers.plans.improve.monthly_price,400);
 const publicCopy=pages.map(p=>p.html).join('\n');
 assert.doesNotMatch(publicCopy,/choose implementable priority by hour 3|seven-hour estimate|signed 10-hour scope|\$6,000|\$9,500/);
 assert.match(publicCopy,/One original animated opening or 3D scene/);
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

test('monthly and existing-site costs never duplicate a usable baseline',()=>{
 const prices=priceList(offers);
 assert.equal(calculateCost(prices,{build:'existing',plan:'improve',baseline:true,cycles:12}).serviceTotal,399+400*12);
 assert.equal(calculateCost(prices,{build:'existing',plan:'grow',baseline:true,sprint:true,cycles:1}).serviceTotal,750+800);
 assert.equal(calculateCost(prices,{build:'signature',plan:'keep_running',baseline:true,cycles:1}).serviceTotal,3700+150);
 assert.equal(calculateCost(prices,{build:'existing',plan:'none',baseline:true,cycles:0}).serviceTotal,399);
});

test('published decisions include the real review framework, exclusions and inspectable examples',()=>{
 const page=path=>pages.find(p=>p.path===path).html;
 assert.equal(offers.review_standard.sections.length,22);
 assert.equal(offers.review_standard.sections.reduce((sum,s)=>sum+s.weight,0),100);
 for(const s of offers.review_standard.sections)assert.ok(page('/services/website-audit/').includes(s.title.replaceAll('&','&amp;')));
 const seo=page('/services/seo/');assert.match(seo,/<h3>Not included<\/h3><ul>/);
 assert.match(page('/guides/seo-work-and-reporting/'),/\/services\/website-care\/#owned-search-receipt/);
 assert.match(page('/guides/website-redesign-brief/'),/illustrative-completed-brief\.txt/);
 assert.match(page('/guides/website-migration-checklist/'),/illustrative-url-map\.csv/);
 for(const id of ['keep_running','improve','grow','audit_fix_sprint'])assert.match(page('/contact/'),new RegExp('value="'+id+'"'));
 assert.match(offers.signature_site.creative,/one creative concept, one scene/);
 assert.match(offers.signature_site.creative,/two existing design\/staging review rounds/);
 assert.doesNotMatch(page('/pricing/'),/Blender|Remotion|800 words|600 words|3,000 words|completely new 3D scene/);
});

test('native validation retry retains each new service without placing personal data in the URL',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-native-context-'));const {server,url}=await createServer({runtime,port:0});
 try{
  for(const service of ['keep_running','improve','grow','audit_fix_sprint','<script>']){
   const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({name:'Synthetic',email:'private@example.test',business:'Fictional',service,message:'short'})});
   assert.equal(response.status,422);const html=await response.text();
   if(service!=='<script>')assert.match(html,/Selected service:/);
   const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];
   assert.equal(retry,service==='<script>'?'/contact/':'/contact/?offer='+service);
   assert.doesNotMatch(retry,/private|Synthetic|script/);
  }
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});

test('new monthly and audit choices save successfully through the native form without sending mail',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-native-services-'));const {server,db,url}=await createServer({runtime,port:0});
 try{
  for(const service of ['keep_running','improve','grow','audit_fix_sprint']){
   const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({name:'Synthetic Service',email:'synthetic@example.test',business:'Fictional verification',service,message:'Synthetic native form choice verification only.'})});
   assert.equal(response.status,201);const html=await response.text();assert.match(html,/Selected service:/);assert.match(html,/No email was sent/);
   assert.match(html,/id="inquiry-confirmation-heading"/);assert.match(html,/Your reference/);
  }
  const records=db.prepare('SELECT payload FROM inquiries').all().map(row=>JSON.parse(row.payload).service).sort();
  assert.deepEqual(records,['audit_fix_sprint','grow','improve','keep_running']);
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

test('source-handoff scopes survive quote drafting with clear agreed delivery limits',async()=>{
 const draft=await draftScope('signature_site','expanded-synthetic');
 assert.deepEqual(draft.commercial_boundaries.modules,offers.focused_site.modules);
 assert.equal(draft.commercial_boundaries.delivery_model,'custom_website_source_handoff');
 assert.equal(draft.commercial_boundaries.initial_launch_count,1);
 assert.equal(draft.commercial_boundaries.external_connection_limit,2);
 assert.equal(draft.commercial_boundaries.training_minutes,30);
 assert.ok(!Object.hasOwn(draft.commercial_boundaries,'workflow_menu'));
 assert.match(draft.commercial_boundaries.handoff,/folder or ZIP/);
 assert.equal(draft.commercial_boundaries.provider_policy.model,'client_owned_direct_billing');assert.ok(!Object.hasOwn(draft.commercial_boundaries,'hosting_credit'));
 assert.deepEqual([offers.launch_site.forms,offers.focused_site.forms,offers.signature_site.forms],[1,2,2]);
 assert.deepEqual(offers.focused_site.cms,{collections:0,editors:0});
 const html=pages.map(p=>p.html).join(' ');
 assert.doesNotMatch(html,/These packages are custom static websites|CMS remain separate|Fixed builds are static websites|standard static hosting within/);
 const web=pages.find(p=>p.path==='/services/web-design/').html;
 assert.match(web,/source code, approved assets and written build instructions/);assert.doesNotMatch(web,/No browser editor|lead tracker is bundled/);
 assert.match(web,/one initial launch/);
 assert.doesNotMatch(web,/ten products|twenty-five total variants|three principal screens|five stages|two staff permission levels/);
 assert.ok(pages.find(p=>p.path==='/services/website-care/').html.includes(offers.plans.improve.advisor));
 assert.match(pages.find(p=>p.path==='/services/seo/').html,/Your proposal records the launch work and checks/);
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
