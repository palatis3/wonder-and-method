import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {calculateCost,priceList} from '../src/shared.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {createServer} from '../scripts/server.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const o=await read('../config/offers.json');
const prices=priceList(o);
const lead={name:'Synthetic Tester',email:'synthetic@example.test',business:'Synthetic business',website:'https://example.test',service:'focused_site',message:'This is a synthetic test for a service website.',company_url:''};
test('historical V5 buyer cost examples retain their original price basis',async()=>{const data=await read('../authority/v5/buyer-costs.json');for(const row of data.rows){const build=row.build==='Focused'?6000:9500;const monthly=(row.route.includes('Care')?199:0)+(row.route.includes('Search')?1100:0);const once=build+(row.route.includes('Sprint')?1500:0);assert.equal(once+monthly*11,row.month12);assert.equal(once+monthly*23,row.month24);}});
test('cost calculator rejects invalid assumptions and retains unknown fees',()=>{assert.equal(calculateCost(prices,{}).total,null);for(const cycles of [-1,1.5,121,NaN])assert.throws(()=>calculateCost(prices,{cycles}));assert.equal(calculateCost(prices,{build:'focused',plan:'keep_running',external:120,hostingMonthly:0}).total,o.focused_site.public_price+12*o.plans.keep_running.monthly_price+120);});
test('server validation rejects invalid fields, injection and honeypot',()=>{assert.deepEqual(validateInquiry(lead).errors,{});assert.ok(validateInquiry({...lead,email:'a\r\nBcc: evil@test.com'}).errors.email);assert.ok(validateInquiry({...lead,website:'javascript:alert(1)'}).errors.website);assert.ok(validateInquiry({...lead,message:'short'}).errors.message);assert.ok(validateInquiry({...lead,company_url:'spam'}).errors.company_url);assert.ok(validateInquiry({...lead,service:'invented'}).errors.service);assert.ok(validateInquiry({...lead,name:{}}).errors.name);});
test('local inquiry persists, deduplicates, refuses bad origins, rate limits and hides records',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wm-test-'));const {server,db,url}=await createServer({runtime:dir,port:0});
 try{
  const send=(data=lead,headers={})=>fetch(url+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Origin':url,...headers},body:JSON.stringify(data)});
  const first=await send();assert.equal(first.status,201);const payload=await first.json();assert.match(payload.message,/No email was sent/);assert.ok(payload.reference);
  assert.equal((await send()).status,200);assert.equal(db.prepare('SELECT count(*) AS n FROM inquiries').get().n,1);
  assert.equal((await send(lead,{Origin:'https://bad.example'})).status,403);
  assert.equal((await send({...lead,email:'bad'})).status,422);
  assert.equal((await send({...lead,company_url:'bot'})).status,422);
  assert.equal((await fetch(url+'/operations/weekly-board.json')).status,404);
  assert.equal((await fetch(url+'/.runtime/inquiries.sqlite')).status,404);
  assert.equal((await fetch(url+'/pricing',{redirect:'manual'})).status,308);
  assert.equal((await send({...lead,name:'Another synthetic'})).status,201);
  assert.equal((await send()).status,429);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
test('native HTML form works without browser JavaScript',async()=>{const dir=await mkdtemp(join(tmpdir(),'wm-test-'));const {server,url}=await createServer({runtime:dir,port:0});try{const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams(lead)});assert.equal(response.status,201);assert.match(await response.text(),/Test inquiry recorded/);}finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}});
