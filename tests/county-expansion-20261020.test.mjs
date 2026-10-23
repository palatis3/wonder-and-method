import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {countyGeography} from '../src/county-geography.mjs';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import {countySearchQuestions} from '../src/county-search-questions.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';

const slugs=['kings','queens','new-york','suffolk','bronx','nassau','westchester','richmond','broome','ulster','schenectady','rensselaer','chautauqua','oswego','ontario'];
const boroughs=['kings','queens','new-york','bronx','richmond'];
const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p]));
const directory=new URL('../deployment/migrations/',import.meta.url);
const priorNames=(await readdir(directory)).filter(name=>/\.sql$/.test(name)&&name<'0011').sort();
const prior=await Promise.all(priorNames.map(name=>readFile(new URL(name,directory),'utf8')));
const migration=await readFile(new URL('0011_journey_county_expansion.sql',directory),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
const oldSchema=prior.at(-1);

test('all fifteen additions remain in the area hub reached from service pages',()=>{
 assert.equal(pages.length,124);
 const servicePages=pages.filter(p=>p.path.startsWith('/services/'));
 assert.ok(servicePages.length>=7);
 for(const slug of slugs){
  const path='/areas/new-york/#'+slug,page=byPath.get('/areas/new-york/');
  assert.equal(retiredCountyRoutes[`/areas/${slug}-county/`],path);assert.ok(!byPath.has(`/areas/${slug}-county/`));assert.ok(page.html.includes(`id="${slug}"`));
  assert.ok(byPath.get('/areas/').html.includes(`href="${path}"`),`Directory missing ${path}`);for(const source of [byPath.get('/areas/erie-county/'),...servicePages])assert.ok(source.html.includes('href="/areas/"'),`${source.path} missing county directory`);
  assert.match(page.html,/href="\/services\/seo\/"/);
  assert.match(page.html,/href="\/services\/web-design\/"/);
  assert.match(page.html,/Place types and official sources/);
 }
 assert.match(byPath.get('/areas/new-york/').html,/Brooklyn/);
 assert.match(byPath.get('/areas/new-york/').html,/Manhattan/);
 assert.match(byPath.get('/areas/new-york/').html,/Staten Island/);
});

test('public pages retain distinct metadata and only live pages enter the sitemap',()=>{
 const titles=pages.map(p=>p.title),descriptions=pages.map(p=>p.description);
 assert.equal(new Set(titles).size,titles.length);
 assert.equal(new Set(descriptions).size,descriptions.length);
 const sitemap=crawlFiles(config,pages).sitemap;
 assert.equal((sitemap.match(/<loc>/g)||[]).length,123);
 for(const page of pages){
  if(page.path==='/404/')continue;
  assert.match(page.html,/<meta name="robots" content="index,follow"/,page.path);
  assert.ok(sitemap.includes(`<loc>${config.origin+page.path}</loc>`),page.path);
  assert.ok(page.html.includes(`rel="canonical" href="${config.origin+page.path}"`),page.path);
 }
});

test('borough geography and downloaded planning exercises stay useful and accurately labelled',async()=>{
 const taskText=new Set();
 for(const slug of slugs){
  const g=countyGeography[slug],task=countyBuyerTasks[slug];
  assert.ok(g.sources.every(source=>{const url=new URL(source);return url.protocol==='https:'&&url.hostname.endsWith('.gov');}),slug);
  if(boroughs.includes(slug)){
   assert.equal(g.borough,true,slug);
   assert.equal(Object.values(g.municipalities).flat().length,0,slug);
   assert.ok(g.communities.length>=5,slug);
  }else assert.ok(Object.values(g.municipalities).flat().length>=6,slug);
  const file=await readFile(new URL(`../src/assets/county-briefs/${slug}.txt`,import.meta.url),'utf8');
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(file.includes(text),slug);
  assert.match(file,/EXAMPLE \(MADE UP\)/);
  taskText.add(task.decision);
 }
 assert.equal(taskText.size,15);
 const chautauqua=countyGeography.chautauqua.municipalities;
 assert.equal(chautauqua.towns.length,27);assert.equal(chautauqua.villages.length,13);assert.equal(chautauqua.cities.length,2);
 assert.ok(chautauqua.villages.includes('Celoron'));
 for(const dissolved of ['Cherry Creek','Forestville'])assert.ok(!chautauqua.villages.includes(dissolved));
});

test('retained research answers preserve valid links and dynamic prices while the public hub uses current costs',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.public_price=1887;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.plans.keep_running.monthly_price=187;
 const changedPages=new Map(countyPages(changed).map(p=>[p.path,p.body]));
 const questionSet=new Set();
 for(const slug of slugs){
  const answers=countySearchQuestions(slug,changed);assert.equal(answers.length,3,slug);
  const faq=answers.map(answer=>answer[1]).join(' ');
  for(const [question,answer,url] of countySearchQuestions(slug,changed)){
   questionSet.add(question);
   assert.ok(answer.length>=120,slug);assert.ok(byPath.has(url),slug+' -> '+url);
  }
  assert.doesNotMatch(faq,/\$1,400|\$400\/month|\$800\/month|\$150\/month/,slug);
  if(faq.includes('$487/month'))assert.match(faq,/Both include Keep Running care checks.*Keep Running is also available on its own/);
 }
 assert.equal(questionSet.size,45);
 const hub=changedPages.get('/areas/new-york/');assert.ok(hub);assert.match(hub,/\$1,887/);assert.match(hub,/\$187\/month/);
});

test('county migration changes only the fifteen page categories and preserves all stored records',t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(prior.join('\n'));
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(oldSchema,field));
 assert.deepEqual(allowed(migration,'page').filter(p=>!allowed(oldSchema,'page').includes(p)),slugs.map(s=>journeyPageKey(`/areas/${s}-county/`)).sort());
 assert.deepEqual(allowed(migration,'page').filter(p=>allowed(oldSchema,'page').includes(p)).sort(),allowed(oldSchema,'page').sort());
 const insert=sqlite.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');let i=0;
 for(const page of allowed(oldSchema,'page'))for(const source of allowed(oldSchema,'source'))insert.run('2026-10-19','page_view','unsure',page,source,i++%2?1000000:0);
 sqlite.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('existing-fixture',1234,'{"keep":"exact"}','existing-fixture',1235,'{"frozen":"request"}');
 sqlite.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('existing-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'];
 const before=tables.map(table=>sqlite.prepare(`SELECT * FROM ${table}`).all());
 sqlite.exec(migration);
 tables.forEach((table,index)=>assert.deepEqual(sqlite.prepare(`SELECT * FROM ${table}`).all(),before[index]));
 assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 const legacy=sqlite.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 legacy.run('2026-10-20','page_view','unsure','home','direct');legacy.run('2026-10-20','page_view','unsure','home','direct');
 assert.equal(sqlite.prepare("SELECT total FROM journey_counts WHERE day='2026-10-20'").get().total,2);
 sqlite.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-20','page_view','unsure','pricing',7);
 assert.equal(sqlite.prepare("SELECT source FROM journey_counts WHERE page='pricing' AND day='2026-10-20'").get().source,'not_recorded');
});

test('the current Worker accepts every new county without creating inquiries or weakening category validation',async t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(prior.join('\n')+'\n'+migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-county-secret-over-32-characters'};
 for(const slug of slugs){
  const page=journeyPageKey(`/areas/${slug}-county/`);
  const request=new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.123'},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
  assert.equal((await worker.fetch(request,env,{})).status,204,slug);
  assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1,slug);
 }
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
 assert.throws(()=>sqlite.prepare("INSERT INTO journey_counts VALUES('2026-10-20','page_view','unsure','areas_fake_county','direct',1)").run());
});
