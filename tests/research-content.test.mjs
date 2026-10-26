import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import semrushGuidePaths from './fixtures/semrush-guide-paths.json' with {type:'json'};
import {floridaGuidePaths} from '../src/florida-guide-paths.mjs';
import {operatingGuidePaths} from '../src/operating-guide-paths.mjs';
import {longtailGuides} from '../src/longtail-guides.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {calculateWebsiteRoi,roiFields} from '../src/assets/roi-math.mjs';
import {researchGuides,researchGuideDetails} from '../src/research-guides.mjs';
import {journalSections} from '../src/journal.mjs';
import {renderPages} from '../src/pages.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(async p=>JSON.parse(await read(p))));
const pages=renderPages({config,offers,map,geography});
const inputs={oneTime:3000,monthlyCost:100,months:12,inquiries:4,closeRate:25,contribution:500};
const routes=[...researchGuides.map(x=>x.path),'/tools/website-roi-calculator/'];

test('historical 278-route coverage resolves through live pages or permanent county destinations and seven content routes remain',async()=>{
 const previous=JSON.parse(await read('tests/fixtures/pre-content-guide-routes.json'));
 assert.equal(previous.length,278);assert.equal(pages.length,2183);
 for(const path of ['/areas/louisiana/','/areas/arkansas/'])assert.ok(pages.some(page=>page.path===path),path);
 for(const route of previous){
  const destination=publicRouteRedirect(new URL(route,config.origin),'GET')?.slice(config.origin.length);
  if(destination){const [hub,slug]=destination.split('#');assert.ok(!pages.some(page=>page.path===route),route);const target=pages.find(page=>page.path===hub);assert.ok(target,destination);if(slug)assert.ok(target.html.includes(`id="${slug}"`),destination);}
  else assert.ok(pages.some(page=>page.path===route),route);
 }
 assert.deepEqual(pages.filter(page=>!previous.includes(page.path)&&!operatingGuidePaths.has(page.path)&&!floridaGuidePaths.has(page.path)&&!semrushGuidePaths.includes(page.path)&&!longtailGuides.some(item=>item.path===page.path)&&page.path!=='/work/buffalo-civic/'&&!page.path.startsWith('/areas/')).map(page=>page.path).sort(),routes.slice().sort());
});

test('ROI example reconciles costs, contribution, payback and break-even',()=>{
 const r=calculateWebsiteRoi(inputs);assert.equal(r.ok,true);assert.equal(r.totalCost,4200);assert.equal(r.totalContribution,6000);assert.equal(r.net,1800);assert.equal(r.expectedJobs,12);assert.equal(r.paybackMonths,7.5);assert.equal(r.breakEvenInquiries,2.8);assert.ok(Math.abs(r.roiPercent-42.8571428571)<1e-8);
 const loss=calculateWebsiteRoi({...inputs,inquiries:2});assert.equal(loss.net,-1200);assert.equal(loss.paybackMonths,20);
 const zero=calculateWebsiteRoi({...inputs,oneTime:0,monthlyCost:0,inquiries:0});assert.equal(zero.roiPercent,null);assert.equal(zero.breakEvenInquiries,0);assert.equal(zero.paybackMonths,null);
 for(const key of ['closeRate','contribution']){const r=calculateWebsiteRoi({...inputs,[key]:0});assert.equal(r.net,-4200);assert.equal(r.roiPercent,-100);assert.equal(r.breakEvenInquiries,null);assert.equal(r.paybackMonths,null);}
 assert.equal(calculateWebsiteRoi({...inputs,oneTime:0}).paybackMonths,0);
});

test('ROI rejects missing, nonfinite and out-of-bound assumptions and keeps valid extremes finite',()=>{
 for(const key of Object.keys(roiFields))for(const bad of ['',null,undefined,true,NaN,Infinity,-1]){const r=calculateWebsiteRoi({...inputs,[key]:bad});assert.equal(r.ok,false,`${key}: ${bad}`);assert.ok(r.errors[key]);}
 for(const [key,bad]of [['months',0],['months',1.5],['months',121],['closeRate',101],['inquiries',1000001]])assert.equal(calculateWebsiteRoi({...inputs,[key]:bad}).ok,false);
 const high=calculateWebsiteRoi(Object.fromEntries(Object.entries(roiFields).map(([k,v])=>[k,v.max])));assert.ok(high.ok);for(const [key,value]of Object.entries(high))if(typeof value==='number')assert.ok(Number.isFinite(value),key);
 assert.equal(calculateWebsiteRoi(Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,String(v)]))).net,1800);
 for(const key of ['oneTime','monthlyCost','inquiries','closeRate','contribution'])for(const tiny of [1e-310,1e-323,0.001,1.001,'1e-310','1e-1000','1e2'])assert.equal(calculateWebsiteRoi({...inputs,[key]:tiny}).ok,false,`${key}: ${tiny}`);
 for(const key of ['oneTime','monthlyCost','inquiries','closeRate','contribution'])assert.equal(calculateWebsiteRoi({...inputs,[key]:0.01}).ok,true,key+' accepts two decimal places');
});

test('six distinct guides are complete, linked, approved, downloadable and individually gateable',async()=>{
 const index=pages.find(x=>x.path==='/guides/').html;
 const conciseGuides={
  '/guides/website-redesign-timeline/':['start','ready','sequence','example','reviews','studio'],
  '/guides/website-handover-checklist/':['meaning','accounts','files','register','verification','example']
 };
 for(const guide of researchGuides){
  const detail=researchGuideDetails[guide.path.split('/').at(-2)],sections=journalSections(guide.path,offers),html=pages.find(x=>x.path===guide.path).html;
  const body=sections.map(x=>x.body).join(' '),minimumWords=conciseGuides[guide.path]?600:700;
  assert.ok(sections.length>=6);assert.ok(body.replace(/<[^>]*>/g,' ').split(/\s+/).length>=minimumWords,guide.path);assert.equal(new Set(sections.map(s=>s.id)).size,sections.length);
  if(conciseGuides[guide.path])assert.deepEqual(sections.map(section=>section.id),conciseGuides[guide.path],guide.path+' retains every practical topic after the clarity edit');
  if(guide.path==='/guides/website-redesign-timeline/'){
   for(const id of ['launch_site','focused_site','signature_site'])assert.ok(body.includes(offers[id].delivery_target.match(/\d+[–-]\d+/)[0]+' business days'),id);
   assert.match(body,/two review rounds, each allowing up to five business days/);assert.match(body,/Reviews, late inputs and added work extend the elapsed schedule/);
  }
  if(guide.path==='/guides/website-handover-checklist/'){
   assert.match(body,/source files, images, configuration notes and build instructions/);assert.match(body,/within five business days after the paid work is finished, or after a canceled account is settled/);assert.match(body,/Your accounts stay under your control throughout/);
  }
  assert.ok(index.includes(`href="${guide.path}"`));assert.ok(html.includes(detail.download));assert.ok((await read('src'+detail.download)).length>300);
  const png=await readFile(new URL('../src/assets/social/guides-'+detail.slug+'.png',import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  const held=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(x=>x.path!==guide.path)},offers,map,geography});assert.ok(!held.some(x=>x.path===guide.path));for(const page of held)assert.ok(!page.html.includes(`href="${guide.path}`),page.path+' links held '+guide.path);
 }
 const prior=JSON.parse(await read('config/page-dates.json'));assert.ok(routes.every(path=>prior[path]));
 const calculator=pages.find(x=>x.path===routes.at(-1)).html;assert.match(calculator,/id="worked-example"/);assert.match(calculator,/<summary>How this is calculated<\/summary>/);assert.match(calculator,/<h2>The example, step by step<\/h2>/);assert.match(calculator,/id="website-roi" hidden/);assert.doesNotMatch(calculator,/<input[^>]+type="(?:email|password)"/);
});

test('content migration preserves previous categories, aggregate rows, inquiries and fixed validation',async t=>{
 const files=(await readdir(new URL('../deployment/migrations/',import.meta.url))).filter(x=>/^\d{4}.*\.sql$/.test(x)&&Number(x.slice(0,4))<=15).sort();const sql=await Promise.all(files.map(x=>read('deployment/migrations/'+x)));
 const migration=sql.at(-1),previous=sql.at(-2);assert.match(files.at(-1),/^0015_/);
 const allowed=(source,field)=>[...source.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(previous,field));
 const oldPages=allowed(previous,'page'),newPages=allowed(migration,'page');assert.deepEqual(newPages.filter(x=>!oldPages.includes(x)).sort(),routes.map(journeyPageKey).sort());assert.ok(oldPages.every(x=>newPages.includes(x)));
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');let i=0;for(const page of oldPages)for(const source of allowed(previous,'source'))insert.run('2026-10-20','page_view','unsure',page,source,i++%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,'accepted')").run('content-fixture',1234,'{"preserve":"é & < >"}','content-fixture');
 const before=db.prepare('SELECT * FROM journey_counts').all(),inquiries=db.prepare('SELECT * FROM inquiries').all();db.exec(migration);assert.deepEqual(db.prepare('SELECT * FROM journey_counts').all(),before);assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const key of routes.map(journeyPageKey))insert.run('2026-10-20','page_view','unsure',key,'direct',1);
 for(const [column,value]of [['page','unapproved'],['event','typed_value'],['source','full_referrer'],['service','arbitrary'],['total',-1],['total',1000001]]){const row={day:'2026-10-21',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert.run(...Object.values(row)));}
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return db.prepare(sql).get(...values)||null;},async all(){return{results:db.prepare(sql).all(...values)};},async run(){return{meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-content-secret-over-32-characters'};
 for(const [i,key]of routes.map(journeyPageKey).entries()){const request=new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':`192.0.2.${i+1}`},body:JSON.stringify({event:'page_view',service:'unsure',page:key,source:'direct'})});assert.equal((await worker.fetch(request,env,{})).status,204,key);}
 assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);
});
