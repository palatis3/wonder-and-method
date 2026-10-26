import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import approvedLocationPaths from './fixtures/current-location-paths.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {ohioProfiles,ohioBuyerTasks,ohioSearchQuestions,ohioQuestionSources} from '../src/ohio-content.mjs';
import {ohioGeography} from '../src/ohio-geography.mjs';
import {ohioRegions} from '../src/ohio-regions.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {escapeHtml} from '../src/shared.mjs';
import {serviceStates,countyServicePath} from '../src/service-area-directory.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {socialCardPath} from '../src/social-cards.mjs';
import worker from '../deployment/worker.mjs';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography,priorRoutes,sourceQueries]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/pre-ohio-routes.json','tests/fixtures/ohio-faq-source-queries.json'].map(json));
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p]));
// Official Ohio county roster, independent of the profiles and directory data.
const expectedSlugs='adams allen ashland ashtabula athens auglaize belmont brown butler carroll champaign clark clermont clinton columbiana coshocton crawford cuyahoga darke defiance delaware erie fairfield fayette franklin fulton gallia geauga greene guernsey hamilton hancock hardin harrison henry highland hocking holmes huron jackson jefferson knox lake lawrence licking logan lorain lucas madison mahoning marion medina meigs mercer miami monroe montgomery morgan morrow muskingum noble ottawa paulding perry pickaway pike portage preble putnam richland ross sandusky scioto seneca shelby stark summit trumbull tuscarawas union van-wert vinton warren washington wayne williams wood wyandot'.split(' ');
const path=slug=>`/areas/ohio/${slug}-county/`;
const newRoutes=['/areas/ohio/',...expectedSlugs.map(path)];
const schemas=page=>JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
const migrationFolder=new URL('../deployment/migrations/',import.meta.url);
const priorFiles=(await readdir(migrationFolder)).filter(name=>/\.sql$/.test(name)&&name<'0014').sort();
const priorSql=await Promise.all(priorFiles.map(name=>readFile(new URL(name,migrationFolder),'utf8')));
const migration=await readFile(new URL('0014_journey_ohio.sql',migrationFolder),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);

test('Ohio retains all 88 county entries and historical routes resolve to live destinations',()=>{
 assert.equal(priorRoutes.length,189);assert.equal(pages.length,1787);assert.equal(byPath.size,1787);
 assert.deepEqual(pages.filter(p=>!approvedLocationPaths.includes(p.path)&&!priorRoutes.includes(p.path)&&p.path.startsWith('/areas/ohio/')).map(p=>p.path).sort(),["/areas/ohio/"].sort());
 for(const route of priorRoutes){
  const destination=publicRouteRedirect(new URL(route,config.origin),'GET')?.slice(config.origin.length);
  if(destination){const [hub,slug]=destination.split('#');assert.ok(!byPath.has(route),route);assert.ok(byPath.has(hub),route);if(slug)assert.ok(byPath.get(hub).html.includes(`id="${slug}"`),route);}
  else assert.ok(byPath.has(route),route);
 }
 assert.deepEqual(ohioProfiles.map(c=>c.slug).sort(),expectedSlugs);
 assert.deepEqual(Object.keys(ohioGeography).sort(),expectedSlugs);
 assert.equal(ohioRegions.length,7);
 assert.deepEqual(ohioRegions.flatMap(r=>r.slugs).sort(),expectedSlugs);
 const sitemap=crawlFiles(config,pages).sitemap;
 assert.equal((sitemap.match(/<loc>/g)||[]).length,1775);
 for(const [route,count] of [['/areas/',2378],['/areas/new-york/',62],['/areas/ohio/',88],['/areas/pennsylvania/',67]]){
  const html=byPath.get(route).html;assert.equal((html.match(/data-cs=/g)||[]).length,count,route);
  assert.ok(html.includes('data-county-filter-controls>'));assert.doesNotMatch(html,/data-county-filter-controls hidden/);
 }
 for(const state of serviceStates)for(const county of state.counties){
  const route=countyServicePath(county,state);
  for(const hub of ['/areas/',state.path])assert.ok(byPath.get(hub).html.includes(`href="${route}"`),hub+' -> '+route);
  assert.ok(sitemap.includes(`<loc>${config.origin+route.split('#')[0]}</loc>`),route);
  for(const service of pages.filter(p=>p.path.startsWith('/services/'))){assert.ok(service.html.includes('href="/areas/"'),service.path+' -> county directory');for(const state of ['new-york','pennsylvania','ohio'])assert.ok(byPath.get('/areas/').html.includes(`href="/areas/${state}/"`),service.path+' -> directory -> '+state);}
 }
});

test('county identity survives in anchored state entries with truthful Buffalo provider metadata',()=>{
 const route='/areas/ohio/',page=byPath.get(route),data=schemas(page),org=data.find(x=>x['@type']==='Organization');
 assert.equal(org.location.address.addressLocality,'Buffalo');assert.equal(org.location.address.addressRegion,'NY');
 assert.ok(!data.some(x=>['LocalBusiness','FAQPage'].includes(x['@type'])));
 assert.deepEqual(data.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),['/','/areas/',route].map(path=>config.origin+path));
 assert.ok(page.html.includes(`rel="canonical" href="${config.origin+route}"`));assert.match(page.html,/<meta name="robots" content="index,follow"/);
 for(const c of ohioProfiles){
  if(approvedLocationPaths.includes(path(c.slug)))assert.ok(byPath.has(path(c.slug)));else {assert.equal(retiredCountyRoutes[path(c.slug)],route+'#'+c.slug);assert.ok(!byPath.has(path(c.slug)),path(c.slug));}
  assert.ok(page.html.includes(`id="${c.slug}"`),c.slug);assert.ok(page.html.includes(escapeHtml(c.name+' County')),c.slug);
  assert.ok(page.html.includes(escapeHtml(countyLocalNotes['ohio/'+c.slug]||c.geographyNote)),c.slug+' local distinction');
 }
 assert.equal(retiredCountyRoutes['/areas/ohio/erie-county/'],undefined);
 assert.deepEqual(schemas(byPath.get('/areas/ohio/erie-county/')).find(x=>x['@type']==='Service').areaServed,[{'@type':'AdministrativeArea',name:'Erie County, Ohio'}]);
 assert.equal(retiredCountyRoutes['/areas/st-lawrence-county/'],undefined);
 assert.deepEqual(schemas(byPath.get('/areas/st-lawrence-county/')).find(x=>x['@type']==='Service').areaServed,[{'@type':'AdministrativeArea',name:'St. Lawrence County, New York'}]);
 assert.equal(schemas(byPath.get('/areas/erie-county/')).find(x=>x['@type']==='Service').areaServed.name,'Erie County, New York');
});

test('Ohio municipality classifications and cross-county names retain verified geography',()=>{
 const groups=Object.values(ohioGeography).map(g=>g.municipalities);
 assert.equal(groups.reduce((n,g)=>n+g.cities.length+g.villages.length,0),1008);
 assert.equal(groups.reduce((n,g)=>n+g.townships.length,0),1313);
 for(const slug of ['delaware','fairfield','franklin'])assert.ok(ohioGeography[slug].municipalities.cities.includes('Columbus'));
 for(const slug of ['delaware','franklin','union'])assert.ok(ohioGeography[slug].municipalities.cities.includes('Dublin'));
 for(const slug of ['hancock','seneca','wood'])assert.ok(ohioGeography[slug].municipalities.cities.includes('Fostoria'));
 assert.ok(ohioGeography.butler.municipalities.cities.includes('Hamilton'));
 assert.ok(!ohioGeography.hamilton.municipalities.cities.includes('Hamilton'));
 assert.ok(ohioGeography.hamilton.municipalities.cities.includes('Cincinnati'));
 assert.ok(ohioGeography.erie.municipalities.cities.includes('Sandusky'));
 assert.ok(!ohioGeography.sandusky.municipalities.cities.includes('Sandusky'));
 assert.ok(ohioGeography.trumbull.municipalities.cities.includes('Warren'));
 assert.ok(ohioGeography.vinton.municipalities.villages.includes('McArthur'));
 assert.ok(ohioGeography.morgan.municipalities.villages.includes('McConnelsville'));
 assert.ok(ohioGeography.wyandot.municipalities.villages.includes('Forest'));
 assert.match(ohioGeography.wyandot.directoryNote,/omitted from the January 2026 Census boundary file/);
 assert.ok(ohioGeography.perry.municipalities.villages.includes('Rendville'));assert.match(ohioGeography.perry.directoryNote,/inactive governmental status/);
 for(const [slug,name] of [['geauga','Aquilla'],['darke','Ithaca']]){assert.ok(!ohioGeography[slug].municipalities.villages.includes(name));assert.ok(ohioGeography[slug].communities.some(c=>c.name===name));}
 assert.ok(ohioGeography.union.municipalities.townships.includes('Washington'));
 assert.ok(ohioGeography.union.municipalities.townships.includes('Washington (Franklin County township portion)'));
 for(const [slug,g] of Object.entries(ohioGeography)){
  assert.deepEqual(Object.keys(g.municipalities).sort(),['cities','townships','villages']);
  assert.ok(g.sources.length>=2,slug);assert.ok(g.directoryNote?.trim(),slug);
  assert.match(byPath.get('/areas/ohio/').html,/Place types and official sources/);
  for(const url of [...g.sources,...g.communities.map(x=>x.source)])assert.ok(byPath.get('/areas/ohio/').html.includes(url.replaceAll('&','&amp;')),slug+' -> '+url);
 }
});

test('Ohio historical worksheets retain their authored decisions and research provenance',async()=>{
 const focus=new Set(),titles=new Set(),decisions=new Set(),localQuestions=new Set(),searchQuestions=new Set();
 for(const c of ohioProfiles){
  const task=ohioBuyerTasks[c.slug];
  assert.ok(task,c.slug);assert.equal(c.briefs.length,2);assert.equal(c.questions.length,2);assert.equal(task.questions.length,3);
  focus.add(c.focus);titles.add(task.title);decisions.add(task.decision);c.questions.forEach(([q])=>localQuestions.add(q));
  for(const [q,answer,url,label] of ohioSearchQuestions(c.slug,offers)){
   assert.ok(answer.trim().length>90,c.slug);assert.ok(label?.trim(),c.slug);assert.ok(byPath.has(url),c.slug+' -> '+url);searchQuestions.add(q);
  }
  const worksheet=await readFile(new URL('../src/assets/county-briefs/ohio-'+c.slug+'.txt',import.meta.url),'utf8');
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(worksheet.includes(text),c.slug);
  assert.match(worksheet,/EXAMPLE \(MADE UP\)/);
  assert.ok(worksheet.includes(config.origin+'/areas/ohio/#'+c.slug),c.slug+' worksheet links its final directory entry');
  assert.match(worksheet,/general.*(?:planning|guidance)|(?:planning|guidance).*general/i);
 }
 assert.equal(focus.size,88);assert.equal(titles.size,88);assert.equal(decisions.size,88);assert.equal(localQuestions.size,176);assert.equal(searchQuestions.size,264);
 const sources=ohioQuestionSources(offers);assert.equal(sources.length,264);assert.ok(sources.every(x=>sourceQueries.includes(x.sourceQuery)), 'Every adapted question retains an exact verified research source');
});

test('state-directory prices and retained authored answers follow current offer configuration',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.public_price=1887;changed.plans.keep_running.monthly_price=187;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.baseline.one_time_price=499;changed.audit_sprint.one_time_price=975;
 const rendered=new Map(countyPages(changed).map(p=>[p.path,p.body])),html=rendered.get('/areas/ohio/');assert.ok(html);
 for(const price of ['$1,887','$187/month','$499','$686'])assert.ok(html.includes(price),price);
 for(const slug of expectedSlugs){
  const answers=ohioSearchQuestions(slug,changed);assert.equal(answers.length,3);
  assert.doesNotMatch(answers.map(answer=>answer[1]).join(' '),/\$1,400|\$400\/month|\$800\/month|\$150\/month|\$399|\$750/,slug);
 }
 assert.deepEqual(ohioSearchQuestions('not-a-county',offers),[]);
});

test('live state-hub metadata and social assets are complete',async()=>{
 const titles=new Set(),descriptions=new Set();
 for(const route of ["/areas/ohio/"]){
  const page=byPath.get(route);titles.add(page.title);descriptions.add(page.description);
  assert.match(page.description,/\S/);assert.ok(page.html.includes(config.origin+socialCardPath(route)));
  const png=await readFile(new URL('../src'+socialCardPath(route),import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
 assert.equal(titles.size,1);assert.equal(descriptions.size,1);
});

test('Ohio migration preserves all historical rows, constraints and old Worker compatibility',t=>{
 const database=new DatabaseSync(':memory:');t.after(()=>database.close());database.exec(priorSql.join('\n'));
 const old=priorSql.at(-1);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(old,field));
 const oldPages=allowed(old,'page'),newPages=allowed(migration,'page');
 assert.deepEqual(newPages.filter(p=>!oldPages.includes(p)).sort(),newRoutes.map(journeyPageKey).sort());
 assert.deepEqual(newPages.filter(p=>oldPages.includes(p)).sort(),oldPages.sort());
 let i=0;const insert=database.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 for(const page of oldPages)for(const source of allowed(old,'source'))insert.run('2026-10-19','page_view','unsure',page,source,i++%2?1000000:0);
 database.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('oh-fixture',1234,'{"unchanged":"é & < >"}','oh-fixture',1235,'{"frozen":"request"}');
 database.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('oh-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'],before=tables.map(table=>database.prepare(`SELECT * FROM ${table}`).all());
 database.exec(migration);
 tables.forEach((table,index)=>assert.deepEqual(database.prepare(`SELECT * FROM ${table}`).all(),before[index]));assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
 const legacy=database.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 legacy.run('2026-10-20','page_view','unsure','home','direct');legacy.run('2026-10-20','page_view','unsure','home','direct');
 assert.equal(database.prepare("SELECT total FROM journey_counts WHERE day='2026-10-20'").get().total,2);
 database.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-20','page_view','unsure','pricing',7);
 assert.equal(database.prepare("SELECT source FROM journey_counts WHERE page='pricing' AND day='2026-10-20'").get().source,'not_recorded');
});

test('all 89 new routes accept anonymous aggregates while privacy and inquiry isolation remain enforced',async t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(priorSql.join('\n')+'\n'+migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){return{meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-ohio-secret-over-32-characters'};
 const request=(page,headers={})=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.124',...headers},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
 for(const [index,route] of newRoutes.entries()){const key=journeyPageKey(route);assert.equal((await worker.fetch(request(key,{'CF-Connecting-IP':`192.0.2.${index+1}`}),env,{})).status,204,route);assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(key).total,1);}
 const total=sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n;
 await worker.fetch(request('home',{'Sec-GPC':'1'}),env,{});await worker.fetch(request('home',{'DNT':'1'}),env,{});
 assert.equal(sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,total);
 assert.equal((await worker.fetch(request('home',{Origin:'https://other.test'}),env,{})).status,403);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
 assert.throws(()=>sqlite.prepare("INSERT INTO journey_counts VALUES('2026-10-20','page_view','unsure','areas_fake_county','direct',1)").run());
});
