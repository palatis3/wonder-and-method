import approvedLocationPaths from './fixtures/current-location-paths.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {countyProfiles} from '../src/county-profiles.mjs';
import {countyGeography} from '../src/county-geography.mjs';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import {statewideCountyProfiles} from '../src/county-statewide-profiles.mjs';
import {statewideCountySearchQuestions} from '../src/county-statewide-questions.mjs';
import {countyRegions} from '../src/service-counties.mjs';
import {escapeHtml} from '../src/shared.mjs';
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import {socialCardPath} from '../src/social-cards.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {crawlFiles} from '../src/seo.mjs';
import worker from '../deployment/worker.mjs';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography,official]=await Promise.all([
 'config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/statewide-counties.json'
].map(json));
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p]));
const path=slug=>`/areas/${slug}-county/`;
const newSlugs=official.newCountySlugs;
const migrationFolder=new URL('../deployment/migrations/',import.meta.url);
const priorFiles=(await readdir(migrationFolder)).filter(name=>/\.sql$/.test(name)&&name<'0012').sort();
const priorSql=await Promise.all(priorFiles.map(name=>readFile(new URL(name,migrationFolder),'utf8')));
const migration=await readFile(new URL('0012_journey_statewide_counties.sql',migrationFolder),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);

test('all 62 official counties remain in the state directory and retired URLs resolve to their preserved entries',()=>{
 assert.deepEqual(['erie',...countyProfiles.map(c=>c.slug)].sort(),official.countySlugs);
 assert.deepEqual(statewideCountyProfiles.map(c=>c.slug).sort(),newSlugs);
 assert.equal(countyRegions.length,10);
 const members=countyRegions.flatMap(r=>r.slugs);
 assert.equal(new Set(members).size,62);assert.deepEqual([...members].sort(),official.countySlugs);
 const hub=byPath.get('/areas/new-york/').html,sitemap=crawlFiles(config,pages).sitemap;
 assert.equal(pages.length,2299);assert.equal((sitemap.match(/<loc>/g)||[]).length,2287);
 assert.equal((hub.match(/data-cs=/g)||[]).length,62);
 for(const slug of official.countySlugs){
  const retired=path(slug),destination=slug==='erie'?retired:'/areas/new-york/#'+slug;
  if(slug==='erie'||approvedLocationPaths.includes(retired))assert.ok(byPath.has(retired));else {assert.equal(retiredCountyRoutes[retired],destination);assert.ok(!byPath.has(retired));}
  assert.ok(hub.includes(`href="${destination}"`));assert.ok(hub.includes(`id="${slug}"`));
  const route=destination.split('#')[0],page=byPath.get(route);
  assert.ok(sitemap.includes(`<loc>${config.origin+route}</loc>`));assert.ok(page.html.includes(`rel="canonical" href="${config.origin+route}"`));
  assert.match(page.html,/<meta name="robots" content="index,follow"/);
 }
 for(const service of pages.filter(p=>p.path.startsWith('/services/')))assert.ok(service.html.includes('href="/areas/"'),service.path+' -> county directory');
 for(const state of ['new-york','pennsylvania','ohio'])assert.ok(byPath.get('/areas/').html.includes(`href="/areas/${state}/"`),'directory -> '+state);
});

test('county directories retain official municipality types and villages crossing county lines',()=>{
 for(const [slug,expected] of Object.entries(official.counties))assert.deepEqual(countyGeography[slug].municipalities,expected,slug);
 for(const [village,counties] of [
  ['Almond',['allegany','steuben']],['Attica',['genesee','wyoming']],['Deposit',['broome','delaware']],
  ['Dolgeville',['herkimer','fulton']],['Earlville',['madison','chenango']],['Gowanda',['cattaraugus','erie']],
  ['Rushville',['ontario','yates']],['Saranac Lake',['essex','franklin']]
 ])for(const slug of counties)assert.ok(countyGeography[slug].municipalities.villages.includes(village),village+' in '+slug);
 assert.deepEqual(countyGeography.hamilton.municipalities.cities,[]);
 assert.deepEqual(countyGeography.hamilton.municipalities.villages,['Speculator']);
 assert.ok(countyGeography.seneca.municipalities.cities.includes('Geneva'));
 assert.ok(countyGeography.madison.municipalities.cities.includes('Oneida'));
 assert.ok(!countyGeography.oneida.municipalities.cities.includes('Oneida'));
 assert.ok(!countyGeography.essex.municipalities.villages.includes('Port Henry'));
 assert.ok(!countyGeography.seneca.municipalities.villages.includes('Seneca Falls'));
 for(const slug of newSlugs){
  const g=countyGeography[slug];assert.equal(g.reviewedAt,'2026-10-20');
  assert.ok(g.sources.every(url=>new URL(url).hostname.endsWith('.ny.gov')));
 }
});

test('historical statewide worksheets preserve their authored exercises and point to consolidated entries',async()=>{
 const focus=new Set(),decisions=new Set(),localQuestions=new Set();
 for(const c of statewideCountyProfiles){
  const task=countyBuyerTasks[c.slug];
  assert.ok(task,c.slug);assert.equal(c.briefs.length,2);assert.equal(c.questions.length,2);
  focus.add(c.focus);decisions.add(task.decision);c.questions.forEach(([q])=>localQuestions.add(q));
  const worksheet=await readFile(new URL('../src/assets/county-briefs/'+c.slug+'.txt',import.meta.url),'utf8');
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(worksheet.includes(text),c.slug);
  assert.match(worksheet,/EXAMPLE \(MADE UP\)/);
  assert.ok(worksheet.includes(config.origin+'/areas/new-york/#'+c.slug),c.slug+' destination');
  assert.match(worksheet,/general.*(?:planning|guidance)|(?:planning|guidance).*general/i);
 }
 assert.equal(focus.size,37);assert.equal(decisions.size,37);assert.equal(localQuestions.size,74);
});

test('retained authored answers keep research links and derive prices from the current offer configuration',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.public_price=1887;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.plans.keep_running.monthly_price=187;
 const questions=new Set();
 for(const slug of newSlugs){
  const answers=statewideCountySearchQuestions(slug,changed);assert.equal(answers.length,3,slug);
  const faq=answers.map(answer=>answer[1]).join(' ');
  for(const [q,answer,url,label] of answers){
   assert.ok(answer.trim().length>90,slug);assert.ok(label?.trim(),slug);
   assert.ok(byPath.has(url),slug+' -> '+url);questions.add(q);
  }
  assert.doesNotMatch(faq,/\$1,400|\$400\/month|\$800\/month|\$150\/month/,slug);
  if(faq.includes('$487/month'))assert.match(faq,/includ[^.]*care|care[^.]*includ/i,slug);
 }
 assert.equal(questions.size,111);
 assert.deepEqual(statewideCountySearchQuestions('not-a-county',offers),[]);
});

test('the consolidated New York hub preserves factual entries and publishes state metadata without invented branches',async()=>{
 const page=byPath.get('/areas/new-york/'),schema=JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.ok(page.title.includes('New York'));assert.ok(page.description.trim());
 assert.ok(!schema.some(item=>['LocalBusiness','FAQPage'].includes(item['@type'])));
 const org=schema.find(item=>item['@type']==='Organization');assert.equal(org.location.address.addressLocality,'Buffalo');assert.equal(org.location.address.addressRegion,'NY');
 for(const c of statewideCountyProfiles){
  if(approvedLocationPaths.includes(path(c.slug)))assert.ok(byPath.has(path(c.slug)));else {assert.equal(retiredCountyRoutes[path(c.slug)],page.path+'#'+c.slug);assert.ok(!byPath.has(path(c.slug)));}
  assert.ok(page.html.includes(`id="${c.slug}"`));assert.ok(page.html.includes(escapeHtml(countyLocalNotes['new-york/'+c.slug]||c.geographyNote)),c.slug);
 }
 const image=socialCardPath(page.path);assert.ok(image);assert.ok(page.html.includes(config.origin+image));
 const png=await readFile(new URL('../src'+image,import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
});

test('statewide migration adds only 37 page keys and preserves stored inquiries and aggregate history',t=>{
 const database=new DatabaseSync(':memory:');t.after(()=>database.close());database.exec(priorSql.join('\n'));
 const old=priorSql.at(-1);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(old,field));
 const oldPages=allowed(old,'page'),newPages=allowed(migration,'page');
 assert.deepEqual(newPages.filter(p=>!oldPages.includes(p)).sort(),newSlugs.map(s=>journeyPageKey(path(s))).sort());
 assert.deepEqual(newPages.filter(p=>oldPages.includes(p)).sort(),oldPages.sort());
 let i=0;const insert=database.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 for(const page of oldPages)for(const source of allowed(old,'source'))insert.run('2026-10-19','page_view','unsure',page,source,i++%2?1000000:0);
 database.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('statewide-fixture',1234,'{"unchanged":"é & < >"}','statewide-fixture',1235,'{"frozen":"request"}');
 database.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('statewide-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'];
 const before=tables.map(table=>database.prepare(`SELECT * FROM ${table}`).all());
 database.exec(migration);
 tables.forEach((table,index)=>assert.deepEqual(database.prepare(`SELECT * FROM ${table}`).all(),before[index]));
 assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
 const legacy=database.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 legacy.run('2026-10-20','page_view','unsure','home','direct');legacy.run('2026-10-20','page_view','unsure','home','direct');
 assert.equal(database.prepare("SELECT total FROM journey_counts WHERE day='2026-10-20'").get().total,2);
 database.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-20','page_view','unsure','pricing',7);
 assert.equal(database.prepare("SELECT source FROM journey_counts WHERE page='pricing' AND day='2026-10-20'").get().source,'not_recorded');
});

test('every remaining county can record an allowed event without touching inquiries or weakening privacy',async t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(priorSql.join('\n')+'\n'+migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){return{meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-statewide-secret-over-32-characters'};
 const request=(page,headers={})=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.124',...headers},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
 for(const slug of newSlugs){
  const key=journeyPageKey(path(slug));assert.equal((await worker.fetch(request(key),env,{})).status,204,slug);
  assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(key).total,1);
 }
 const total=sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n;
 await worker.fetch(request('home',{'Sec-GPC':'1'}),env,{});
 await worker.fetch(request('home',{'DNT':'1'}),env,{});
 assert.equal(sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,total);
 assert.equal((await worker.fetch(request('home',{Origin:'https://other.test'}),env,{})).status,403);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
 assert.throws(()=>sqlite.prepare("INSERT INTO journey_counts VALUES('2026-10-20','page_view','unsure','areas_fake_county','direct',1)").run());
});
