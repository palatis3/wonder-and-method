import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {intakeContent} from '../src/intake-content.mjs';
import {evaluateRelease} from '../src/release.mjs';
import {renewalDecision} from '../scripts/operations.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
test('offer summaries retain page caps, policy boundaries and working detailed destinations',async()=>{
 const offers=await read('config/offers.json'),pages=renderPages({config:await read('config/site.json'),offers,map:await read('authority/v5/site-map.json'),geography:await read('authority/v5/geography.json')});
 const home=pages.find(p=>p.path==='/').html;assert.ok(home.includes('href="/pricing/"'));
 for(const route of ['/pricing/','/services/web-design/']){
  const html=pages.find(p=>p.path===route).html;
  for(const id of ['focused_site','signature_site']){
   assert.match(html,new RegExp('up to '+offers[id].marketing_page_cap+' (?:custom )?pages','i'));
   if(route==='/pricing/')assert.ok(html.includes('href="/assets/buyer-packs/'+id+'"'));
   else{assert.ok(html.includes('href="/assets/buyer-packs/'+id+'"'));assert.ok(buyerPacks(offers).some(pack=>pack.id===id));}
   assert.ok(pages.find(page=>page.path==='/services/web-design/').html.includes('id="offer-'+id+'"'));
   const checkout='/checkout/'+id.replaceAll('_','-')+'/';assert.ok(html.includes('href="'+checkout+'"'));assert.ok(pages.some(page=>page.path===checkout));
  }
  assert.match(html,/policy pages.*(?:outside|extra to).*(?:count|limit)/);
  if(route==='/pricing/')assert.match(html,/policy pages you supply are outside that count; legal writing is separate/);
  else assert.match(html,/you supply (?:the|their) legal wording/);
 }
 const contact=pages.find(p=>p.path==='/contact/').html;assert.ok(contact.includes('<option value="focused_site">'));assert.ok(!contact.includes('</option value='));
});

test('production intake fails closed and uses actual reviewed practices when configured',()=>{assert.throws(()=>intakeContent({mode:'production',formMode:'synthetic'}));assert.throws(()=>intakeContent({mode:'production',formMode:'live',privacyReviewed:true}));const result=intakeContent({mode:'production',formMode:'live',businessIdentity:'Synthetic Business',contactEmail:'test@example.test',contactVerified:true,responseWindow:'Synthetic staffed window',productionDomain:'example.test',privacyReviewed:true,privacy:{purpose:'Synthetic review fixture',retention:'Synthetic retention policy',access:'Synthetic access owner',rights:'Synthetic request route',contact:'test@example.test',reviewedAt:'2026-10-13',processors:[{name:'Synthetic processor',purpose:'Fixture',policyUrl:'https://example.test/privacy'}]}});assert.equal(result.button,'Send project details');assert.ok(!result.privacyBody.includes('local SQLite'));assert.ok(!result.notice.includes('invented'));});
test('approval must bind current source, artifacts and exact live target',()=>{const contract={release_gates:[]},current={artifactSha256:'a',sourceSha256:'b'},config={mode:'production',origin:'https://example.test',productionDomain:'example.test',formMode:'live',privacyReviewed:true,contactVerified:true},deployment={vars:{ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true'},d1_databases:[{binding:'DB',database_id:'50f6e09c-6a46-49cb-a7ef-6221a1a65bf1'}],routes:[{pattern:'example.test',custom_domain:true}]},evidence={gates:{},approvedVersion:{...current},approvedTarget:'https://example.test'};assert.equal(evaluateRelease(contract,evidence,current,config,deployment).ready,true);for(const mismatch of [{...current,sourceSha256:'changed'},{...current,artifactSha256:'changed'}])assert.equal(evaluateRelease(contract,evidence,mismatch,config,deployment).ready,false);assert.equal(evaluateRelease(contract,{...evidence,approvedTarget:'https://else.test'},current,config,deployment).ready,false);assert.equal(evaluateRelease(contract,evidence,current,{...config,mode:'staging'},deployment).ready,false);for(const db of [undefined,[],[{binding:'WRONG',database_id:'50f6e09c-6a46-49cb-a7ef-6221a1a65bf1'}],[{binding:'DB',database_id:'00000000-0000-0000-0000-000000000000'}]])assert.equal(evaluateRelease(contract,evidence,current,config,{...deployment,d1_databases:db}).ready,false);});
test('renewal rejects impossible evidence dates and timezone-free cancellation',()=>{const valid={service:'search',renewal_timestamp:'2026-11-02T09:00:00-05:00',timezone:'America/New_York',renewal_local_date:'2026-11-02',written_cancellation_route:'Synthetic route',closures:[],business_calendar_confirmed:true,useful_task_approved:true,required_inputs_ready:true,task_approved_local_date:'2026-10-26',inputs_ready_local_date:'2026-10-26'};for(const date of [0,'0','2026-02-30','garbage'])assert.equal(renewalDecision({...valid,task_approved_local_date:date,inputs_ready_local_date:date}).action,'pause-next-invoice-until-dated-task-review');assert.equal(renewalDecision({...valid,cancellation_received_at:'2026-11-02T08:00:00'}).action,'hold-for-valid-cancellation-time');});
