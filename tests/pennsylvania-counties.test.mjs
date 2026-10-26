import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import approvedLocationPaths from './fixtures/current-location-paths.mjs';
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {pennsylvaniaProfiles,pennsylvaniaBuyerTasks,pennsylvaniaSearchQuestions,pennsylvaniaQuestionSources} from '../src/pennsylvania-content.mjs';
import {pennsylvaniaGeography} from '../src/pennsylvania-geography.mjs';
import {pennsylvaniaRegions} from '../src/pennsylvania-regions.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {escapeHtml} from '../src/shared.mjs';
import {serviceStates,countyServicePath} from '../src/service-area-directory.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {socialCardPath} from '../src/social-cards.mjs';
import worker from '../deployment/worker.mjs';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography,priorRoutes]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/pre-pennsylvania-routes.json'].map(json));
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p]));
// Official Pennsylvania county roster, independent of the profiles and directory data.
const expectedSlugs='adams allegheny armstrong beaver bedford berks blair bradford bucks butler cambria cameron carbon centre chester clarion clearfield clinton columbia crawford cumberland dauphin delaware elk erie fayette forest franklin fulton greene huntingdon indiana jefferson juniata lackawanna lancaster lawrence lebanon lehigh luzerne lycoming mckean mercer mifflin monroe montgomery montour northampton northumberland perry philadelphia pike potter schuylkill snyder somerset sullivan susquehanna tioga union venango warren washington wayne westmoreland wyoming york'.split(' ');
const path=slug=>`/areas/pennsylvania/${slug}-county/`;
const newRoutes=['/areas/new-york/','/areas/pennsylvania/',...expectedSlugs.map(path)];
const schemas=page=>JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
const migrationFolder=new URL('../deployment/migrations/',import.meta.url);
const priorFiles=(await readdir(migrationFolder)).filter(name=>/\.sql$/.test(name)&&name<'0013').sort();
const priorSql=await Promise.all(priorFiles.map(name=>readFile(new URL(name,migrationFolder),'utf8')));
const migration=await readFile(new URL('0013_journey_pennsylvania.sql',migrationFolder),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);

test('Pennsylvania retains all 67 county entries within its consolidated state directory',()=>{
 assert.equal(priorRoutes.length,120);assert.equal(pages.length,1787);assert.equal(byPath.size,1787);
 assert.deepEqual(pages.filter(p=>!approvedLocationPaths.includes(p.path)&&!priorRoutes.includes(p.path)&&(p.path.startsWith('/areas/pennsylvania/')||p.path==='/areas/new-york/')).map(p=>p.path).sort(),["/areas/new-york/", "/areas/pennsylvania/"].sort());
 for(const route of priorRoutes){
  const destination=publicRouteRedirect(new URL(route,config.origin),'GET')?.slice(config.origin.length);
  if(destination){const [hub,slug]=destination.split('#');assert.ok(!byPath.has(route),route);assert.ok(byPath.has(hub),route);if(slug)assert.ok(byPath.get(hub).html.includes(`id="${slug}"`),route);}
  else assert.ok(byPath.has(route),route);
 }
 assert.deepEqual(pennsylvaniaProfiles.map(c=>c.slug).sort(),expectedSlugs);
 assert.deepEqual(Object.keys(pennsylvaniaGeography).sort(),expectedSlugs);
 assert.equal(pennsylvaniaRegions.length,10);
 assert.deepEqual(pennsylvaniaRegions.flatMap(r=>r.slugs).sort(),expectedSlugs);
 const sitemap=crawlFiles(config,pages).sitemap;
 assert.equal((sitemap.match(/<loc>/g)||[]).length,1775);
 for(const [route,count] of [['/areas/',2378],['/areas/new-york/',62],['/areas/pennsylvania/',67]]){
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
 const route='/areas/pennsylvania/',page=byPath.get(route),data=schemas(page),org=data.find(x=>x['@type']==='Organization');
 assert.equal(org.location.address.addressLocality,'Buffalo');assert.equal(org.location.address.addressRegion,'NY');
 assert.ok(!data.some(x=>['LocalBusiness','FAQPage'].includes(x['@type'])));
 assert.deepEqual(data.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),['/','/areas/',route].map(path=>config.origin+path));
 assert.ok(page.html.includes(`rel="canonical" href="${config.origin+route}"`));assert.match(page.html,/<meta name="robots" content="index,follow"/);
 for(const c of pennsylvaniaProfiles){
  if(approvedLocationPaths.includes(path(c.slug)))assert.ok(byPath.has(path(c.slug)));else {assert.equal(retiredCountyRoutes[path(c.slug)],route+'#'+c.slug);assert.ok(!byPath.has(path(c.slug)),path(c.slug));}
  assert.ok(page.html.includes(`id="${c.slug}"`),c.slug);assert.ok(page.html.includes(escapeHtml(c.name+' County')),c.slug);
  assert.ok(page.html.includes(escapeHtml(countyLocalNotes['pennsylvania/'+c.slug]||c.geographyNote)),c.slug+' local distinction');
 }
 assert.equal(retiredCountyRoutes['/areas/pennsylvania/erie-county/'],undefined);
 assert.deepEqual(schemas(byPath.get('/areas/pennsylvania/erie-county/')).find(x=>x['@type']==='Service').areaServed,[{'@type':'AdministrativeArea',name:'Erie County, Pennsylvania'}]);
 assert.equal(retiredCountyRoutes['/areas/st-lawrence-county/'],undefined);
 assert.deepEqual(schemas(byPath.get('/areas/st-lawrence-county/')).find(x=>x['@type']==='Service').areaServed,[{'@type':'AdministrativeArea',name:'St. Lawrence County, New York'}]);
 assert.equal(schemas(byPath.get('/areas/erie-county/')).find(x=>x['@type']==='Service').areaServed.name,'Erie County, New York');
});

test('municipality types, cross-county cities and current consolidation changes are retained',()=>{
 const entries=Object.values(pennsylvaniaGeography).flatMap(g=>Object.values(g.municipalities).flat());
 assert.equal(entries.length,2566);
 const all=group=>Object.values(pennsylvaniaGeography).flatMap(g=>g.municipalities[group]);
 assert.deepEqual(all('towns'),['Bloomsburg']);
 assert.equal(all('cities').length,57);assert.equal(all('boroughs').length,963);assert.equal(all('townships').length,1545);
 for(const slug of ['lehigh','northampton'])assert.ok(pennsylvaniaGeography[slug].municipalities.cities.includes('Bethlehem'));
 assert.ok(pennsylvaniaGeography.clearfield.municipalities.cities.includes('DuBois'));
 assert.ok(!pennsylvaniaGeography.clearfield.municipalities.townships.includes('Sandy'));
 assert.ok(!pennsylvaniaGeography.mercer.municipalities.boroughs.includes('Wheatland'));
 assert.ok(!pennsylvaniaGeography.lawrence.municipalities.boroughs.includes('South New Castle'));
 assert.ok(pennsylvaniaGeography.mercer.municipalities.boroughs.includes('Greenville'));
 assert.equal(Object.values(pennsylvaniaGeography).reduce((n,g)=>n+g.communities.length,0),9);
 for(const [slug,g] of Object.entries(pennsylvaniaGeography)){
  assert.deepEqual(Object.keys(g.municipalities).sort(),['boroughs','cities','towns','townships']);
  assert.ok(g.sources.includes('https://dced.pa.gov/local-government/municipal-statistics/municipalities/'));
  assert.match(byPath.get('/areas/pennsylvania/').html,/Place types and official sources/);
  for(const url of [...g.sources,...g.communities.map(x=>x.source)])assert.ok(byPath.get('/areas/pennsylvania/').html.includes(url.replaceAll('&','&amp;')),slug+' -> '+url);
 }
});

test('Pennsylvania historical worksheets retain their authored decisions and research provenance',async()=>{
 const focus=new Set(),titles=new Set(),decisions=new Set(),localQuestions=new Set(),searchQuestions=new Set();
 for(const c of pennsylvaniaProfiles){
  const task=pennsylvaniaBuyerTasks[c.slug];
  assert.ok(task,c.slug);assert.equal(c.briefs.length,2);assert.equal(c.questions.length,2);assert.equal(task.questions.length,3);
  focus.add(c.focus);titles.add(task.title);decisions.add(task.decision);c.questions.forEach(([q])=>localQuestions.add(q));
  for(const [q,answer,url,label] of pennsylvaniaSearchQuestions(c.slug,offers)){
   assert.ok(answer.trim().length>90,c.slug);assert.ok(label?.trim(),c.slug);assert.ok(byPath.has(url),c.slug+' -> '+url);searchQuestions.add(q);
  }
  const worksheet=await readFile(new URL('../src/assets/county-briefs/pennsylvania-'+c.slug+'.txt',import.meta.url),'utf8');
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(worksheet.includes(text),c.slug);
  assert.match(worksheet,/EXAMPLE \(MADE UP\)/);
  assert.ok(worksheet.includes(config.origin+'/areas/pennsylvania/#'+c.slug),c.slug+' worksheet links its final directory entry');
  assert.match(worksheet,/general.*(?:planning|guidance)|(?:planning|guidance).*general/i);
 }
 assert.equal(focus.size,67);assert.equal(titles.size,67);assert.equal(decisions.size,67);assert.equal(localQuestions.size,134);assert.equal(searchQuestions.size,201);
 const sources=pennsylvaniaQuestionSources(offers);assert.equal(sources.length,201);assert.ok(sources.every(x=>x.sourceQuery?.trim()));
});

test('state-directory prices and retained authored answers follow current offer configuration',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.public_price=1887;changed.plans.keep_running.monthly_price=187;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.baseline.one_time_price=499;changed.audit_sprint.one_time_price=975;
 const rendered=new Map(countyPages(changed).map(p=>[p.path,p.body])),html=rendered.get('/areas/pennsylvania/');assert.ok(html);
 for(const price of ['$1,887','$187/month','$499','$686'])assert.ok(html.includes(price),price);
 for(const slug of expectedSlugs){
  const answers=pennsylvaniaSearchQuestions(slug,changed);assert.equal(answers.length,3);
  assert.doesNotMatch(answers.map(answer=>answer[1]).join(' '),/\$1,400|\$400\/month|\$800\/month|\$150\/month|\$399|\$750/,slug);
 }
 assert.deepEqual(pennsylvaniaSearchQuestions('not-a-county',offers),[]);
});

test('live state-hub metadata and social assets are complete',async()=>{
 const titles=new Set(),descriptions=new Set();
 for(const route of ["/areas/new-york/", "/areas/pennsylvania/"]){
  const page=byPath.get(route);titles.add(page.title);descriptions.add(page.description);
  assert.match(page.description,/\S/);assert.ok(page.html.includes(config.origin+socialCardPath(route)));
  const png=await readFile(new URL('../src'+socialCardPath(route),import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
 assert.equal(titles.size,2);assert.equal(descriptions.size,2);
});

test('Pennsylvania migration preserves all historical rows, constraints and old Worker compatibility',t=>{
 const database=new DatabaseSync(':memory:');t.after(()=>database.close());database.exec(priorSql.join('\n'));
 const old=priorSql.at(-1);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(old,field));
 const oldPages=allowed(old,'page'),newPages=allowed(migration,'page');
 assert.deepEqual(newPages.filter(p=>!oldPages.includes(p)).sort(),newRoutes.map(journeyPageKey).sort());
 assert.deepEqual(newPages.filter(p=>oldPages.includes(p)).sort(),oldPages.sort());
 let i=0;const insert=database.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 for(const page of oldPages)for(const source of allowed(old,'source'))insert.run('2026-10-19','page_view','unsure',page,source,i++%2?1000000:0);
 database.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('pa-fixture',1234,'{"unchanged":"é & < >"}','pa-fixture',1235,'{"frozen":"request"}');
 database.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('pa-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'],before=tables.map(table=>database.prepare(`SELECT * FROM ${table}`).all());
 database.exec(migration);
 tables.forEach((table,index)=>assert.deepEqual(database.prepare(`SELECT * FROM ${table}`).all(),before[index]));assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
 const legacy=database.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 legacy.run('2026-10-20','page_view','unsure','home','direct');legacy.run('2026-10-20','page_view','unsure','home','direct');
 assert.equal(database.prepare("SELECT total FROM journey_counts WHERE day='2026-10-20'").get().total,2);
 database.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-20','page_view','unsure','pricing',7);
 assert.equal(database.prepare("SELECT source FROM journey_counts WHERE page='pricing' AND day='2026-10-20'").get().source,'not_recorded');
});

test('all 69 new routes accept anonymous aggregates while privacy and inquiry isolation remain enforced',async t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(priorSql.join('\n')+'\n'+migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){return{meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-pennsylvania-secret-over-32-characters'};
 const request=(page,headers={})=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.124',...headers},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
 for(const [index,route] of newRoutes.entries()){const key=journeyPageKey(route);assert.equal((await worker.fetch(request(key,{'CF-Connecting-IP':`192.0.2.${index+1}`}),env,{})).status,204,route);assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(key).total,1);}
 const total=sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n;
 await worker.fetch(request('home',{'Sec-GPC':'1'}),env,{});await worker.fetch(request('home',{'DNT':'1'}),env,{});
 assert.equal(sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,total);
 assert.equal((await worker.fetch(request('home',{Origin:'https://other.test'}),env,{})).status,403);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
 assert.throws(()=>sqlite.prepare("INSERT INTO journey_counts VALUES('2026-10-20','page_view','unsure','areas_fake_county','direct',1)").run());
});
