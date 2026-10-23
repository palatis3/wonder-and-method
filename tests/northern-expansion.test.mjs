import historicCountyRoutes from './fixtures/historic-county-routes.json' with {type:'json'};
import approvedLocationPaths from './fixtures/current-location-paths.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {northernExpansionGeography as geographyData,northernExpansionAreaInventory as inventory} from '../src/northern-expansion-geography.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';
import {escapeHtml} from '../src/shared.mjs';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [fixture,earlier,oldRoutes,sourceQueries,config,offers,map,geography]=await Promise.all(['tests/fixtures/northern-expected-areas.json','tests/fixtures/northeast-expected-areas.json','tests/fixtures/pre-northeast-routes.json','tests/fixtures/northeast-faq-source-queries.json','config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));
const areaPath=(s,a)=>`/areas/${s.id}/${a.areaType==='Independent City'?a.slug:a.slug+'-county'}/`;
const label=a=>a.areaType==='Independent City'?a.name+' City':a.name+' County';
const newRoutes=fixture.states.flatMap(s=>[`/areas/${s.id}/`,...s.areas.map(a=>areaPath(s,a))]);
const earlierRoutes=earlier.states.flatMap(s=>[`/areas/${s.id}/`,...s.areas.map(a=>`/areas/${s.id}/${a.slug}-${s.areaType==='Planning Region'?'planning-region':'county'}/`)]);
const schema=page=>JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
let pendingRuntime;
function runtime(){return pendingRuntime||=(async()=>{
 const [pagesModule,content,directory,search,seo,counties]=await Promise.all([import('../src/pages.mjs'),import('../src/northeast-content.mjs'),import('../src/service-area-directory.mjs'),import('../src/assets/county-directory.js'),import('../src/seo.mjs'),import('../src/service-counties.mjs')]);
 const pages=pagesModule.renderPages({config,offers,map,geography});
 return {pages,byPath:new Map(pages.map(p=>[p.path,p])),...content,...directory,...search,...seo,...counties};
})();}

test('official northern roster has 10 NH counties, 16 ME counties and 23 MD counties plus independent Baltimore City',()=>{
 assert.deepEqual(fixture.states.map(s=>s.areas.length),[10,16,24]);assert.equal(inventory.length,50);
 for(const s of fixture.states){
  assert.deepEqual(Object.keys(geographyData[s.id]).sort(),s.areas.map(a=>a.slug).sort());
  assert.deepEqual(inventory.filter(a=>a.stateId===s.id).map(({name,slug,areaType})=>({name,slug,areaType})).sort((a,b)=>a.slug.localeCompare(b.slug)),[...s.areas].sort((a,b)=>a.slug.localeCompare(b.slug)));
 }
 assert.equal(inventory.find(a=>a.stateId==='maryland'&&a.slug==='baltimore').officialId,'24005');
 assert.equal(inventory.find(a=>a.stateId==='maryland'&&a.slug==='baltimore-city').officialId,'24510');
});

test('northern official municipality types retain plantations, independent cities and nonmunicipal communities',()=>{
 const counts=(state,type)=>Object.values(geographyData[state]).flatMap(g=>g.municipalities[type]||[]).length;
 assert.equal(counts('new-hampshire','cities'),13);assert.equal(counts('new-hampshire','towns'),221);
 assert.equal(counts('maine','cities'),23);assert.equal(counts('maine','towns'),430);assert.equal(counts('maine','plantations'),29);
 const nh=geographyData['new-hampshire'],me=geographyData.maine,md=geographyData.maryland;
 assert.ok(nh.coos.aliases.some(a=>a.name==='Coös County'));
 assert.ok(!Object.values(nh.grafton.municipalities).flat().includes('Livermore'));
 assert.ok(nh.grafton.communities.some(p=>p.name==='Livermore'&&/unincorporated/i.test(p.type)));
 assert.ok(nh.coos.communities.some(p=>p.name==='Dixville township'&&/unincorporated/i.test(p.type)));
 assert.ok(!nh.coos.municipalities.townships.includes('Dixville'));
 assert.ok(me.franklin.municipalities.towns.includes('Rangeley'));assert.ok(me.franklin.municipalities.plantations.includes('Rangeley'));
 assert.ok(me.knox.municipalities.plantations.includes('Matinicus Isle'));assert.ok(me.lincoln.municipalities.plantations.includes('Monhegan'));
 assert.ok(me.aroostook.municipalities.plantations.includes('St. John'));
 assert.ok(!Object.values(me.penobscot.municipalities).flat().includes('Drew'));
 assert.ok(me.penobscot.communities.some(p=>p.name==='Drew'&&p.type==='Unorganized territory'));
 assert.ok(me.franklin.communities.some(p=>p.name==='Wyman'&&p.type==='Unorganized territory'));
 assert.equal(Object.values(md.baltimore.municipalities).flat().length,0);
 assert.equal(Object.values(md.howard.municipalities).flat().length,0);
 assert.deepEqual(md['baltimore-city'].municipalities.cities,['Baltimore']);
 assert.ok(md.baltimore.communities.some(p=>p.name==='Towson'&&p.type==='Census-designated place'));
 assert.ok(!md['baltimore-city'].communities.some(p=>p.name==='Towson'));
 for(const [county,name] of [['howard','Columbia'],['montgomery','Silver Spring']]){
  assert.ok(md[county].communities.some(p=>p.name===name&&p.type==='Census-designated place'));
  assert.ok(!Object.values(md[county].municipalities).flat().includes(name));
 }
 for(const [name,counties] of [['Mount Airy',['carroll','frederick']],['Millington',['kent','queen-annes']],['Queen Anne',['queen-annes','talbot']],['Templeville',['caroline','queen-annes']]])for(const county of counties)assert.ok(Object.values(md[county].municipalities).flat().includes(name),county+'/'+name);
 assert.ok(md.charles.aliases.some(a=>a.name==='Port Tobacco'&&a.canonicalName==='Port Tobacco Village'));
 assert.ok(md.montgomery.aliases.some(a=>a.name==='Chevy Chase, Village of, Section 5'&&a.canonicalName==='Chevy Chase Section Five'));
});

test('three northern hubs preserve 50 entries and historical routes resolve through live pages or redirects',async()=>{
 const {pages,byPath,serviceStates,crawlFiles,northeastProfiles}=await runtime();
 assert.equal(pages.length,1213);assert.equal(byPath.size,1213);assert.equal(serviceStates.length,22);
 const prior=[...oldRoutes,...earlierRoutes];assert.equal(new Set(prior).size,358);
 assert.deepEqual(pages.filter(p=>!approvedLocationPaths.includes(p.path)&&!prior.includes(p.path)&&fixture.states.some(state=>p.path.startsWith('/areas/'+state.id+'/'))).map(p=>p.path).sort(),fixture.states.map(state=>'/areas/'+state.id+'/').sort());
 for(const route of prior){
  if(retiredCountyRoutes[route]){const [hub,slug]=retiredCountyRoutes[route].split('#');assert.ok(!byPath.has(route));assert.ok(byPath.has(hub),route);if(slug)assert.ok(byPath.get(hub).html.includes(`id="${slug}"`),route);}
  else assert.ok(byPath.has(route),route);
 }
 const sitemap=crawlFiles(config,pages).sitemap;assert.equal((sitemap.match(/<loc>/g)||[]).length,1212);
 assert.equal((byPath.get('/areas/').html.match(/data-county-search=/g)||[]).length,1125);
 assert.equal(Object.values(northeastProfiles).flat().length,116);
 for(const s of fixture.states){
  assert.deepEqual(northeastProfiles[s.id].map(a=>a.slug).sort(),s.areas.map(a=>a.slug).sort());
  const html=byPath.get(`/areas/${s.id}/`).html;
  assert.equal((html.match(/data-county-search=/g)||[]).length,s.areas.length);
  assert.match(html,/<noscript>/);assert.match(html,/<details class="county-region county-section"/);assert.doesNotMatch(html,/<div id="counties"[^>]*\bhidden/);
  for(const a of s.areas){const destination=`/areas/${s.id}/#${a.slug}`;if(approvedLocationPaths.includes(areaPath(s,a)))assert.ok(byPath.has(areaPath(s,a)));else {assert.equal(retiredCountyRoutes[areaPath(s,a)],s.id==='maryland'&&['baltimore','baltimore-city'].includes(a.slug)?'/areas/maryland/baltimore-area/':destination);assert.ok(!byPath.has(areaPath(s,a)));}for(const hub of [html,byPath.get('/areas/').html])assert.ok(hub.includes(`href="${destination}"`));assert.ok(html.includes(`id="${a.slug}"`));assert.ok(sitemap.includes(`<loc>${config.origin}/areas/${s.id}/</loc>`));}
 }
});

test('northern state metadata and anchored entries distinguish Baltimore City from Baltimore County',async()=>{
 const {byPath}=await runtime(),titles=new Set(),descriptions=new Set();
 for(const s of fixture.states){
  const route=`/areas/${s.id}/`,page=byPath.get(route),data=schema(page);
  assert.ok(page.title.includes(s.name));assert.ok(page.html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1].includes(escapeHtml(s.name)));
  assert.ok(page.html.includes(`rel="canonical" href="${config.origin+route}"`));assert.match(page.html,/<meta name="robots" content="index,follow"/);
  const headings=[...page.html.matchAll(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/gs)].map(m=>m[1]).join('\n');
  assert.doesNotMatch(headings,/\uFFFD|Ã.|Â.|â€|â†|ðŸ/,route);assert.doesNotMatch(page.title,/\uFFFD|Ã.|Â.|â€/);
  assert.deepEqual(data.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),['/','/areas/',route].map(p=>config.origin+p));
  assert.ok(!data.some(x=>['FAQPage','LocalBusiness'].includes(x['@type'])));
  const org=data.find(x=>x['@type']==='Organization');assert.equal(org.location.address.addressLocality,'Buffalo');assert.equal(org.location.address.addressRegion,'NY');
  for(const a of s.areas){assert.ok(page.html.includes(`id="${a.slug}"`));assert.ok(page.html.includes(escapeHtml(label(a))),s.id+'/'+a.slug);}
  titles.add(page.title);descriptions.add(page.description);assert.ok(page.description.trim());
 }
 assert.equal(titles.size,3);assert.equal(descriptions.size,3);
 assert.equal(retiredCountyRoutes['/areas/maryland/baltimore-city/'],'/areas/maryland/baltimore-area/');
 assert.equal(retiredCountyRoutes['/areas/maryland/baltimore-county/'],'/areas/maryland/baltimore-area/');
 assert.ok(!byPath.has('/areas/maryland/baltimore-city-county/'));assert.ok(!byPath.has('/areas/maryland/baltimore-city-independent-city/'));
});

test('typed northern search handles state abbreviations, plantations, accented aliases and independent city identity',async()=>{
 const {serviceStates,countySearchText,parseCountyQuery,countyMatch}=await runtime();
 const cards=serviceStates.flatMap(s=>s.counties.map(c=>({id:s.id+'/'+c.slug,state:s.id,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
 const matches=query=>cards.filter(c=>countyMatch(c,parseCountyQuery(query)).score>0).map(c=>c.id).sort();
 for(const [query,expected] of [
  ['Coös County NH',['new-hampshire/coos']],['Carroll County NH',['new-hampshire/carroll']],['Carroll County MD',['maryland/carroll']],
  ['York County ME',['maine/york']],['Baltimore County MD',['maryland/baltimore']],['Baltimore City MD',['maryland/baltimore-city']],
  ['city of Baltimore MD',['maryland/baltimore-city']],['Saint Marys County MD',['maryland/st-marys']],
  ["St. Mary's County MD",['maryland/st-marys']],['Prince Georges County MD',['maryland/prince-georges']],
  ['Rangeley plantation ME',['maine/franklin']],['Rangeley town ME',['maine/franklin']],['Saint John plantation ME',['maine/aroostook']],
  ['Monhegan plantation ME',['maine/lincoln']],['Monhegan town ME',[]],['Drew plantation ME',[]],['Drew ME',['maine/penobscot']],
  ['Livermore town NH',[]],['Livermore NH',['new-hampshire/grafton']],['Columbia city MD',[]],['Columbia MD',['maryland/howard']],
  ['Towson city MD',[]],['Towson MD',['maryland/baltimore']],['Port Tobacco MD',['maryland/charles']],
  ['Chevy Chase, Village of, Section 5 MD',['maryland/montgomery']]
 ])assert.deepEqual(matches(query),expected,query);
 assert.equal(cards.length,1125);
});

test('333 fixed inquiry contexts roundtrip as page provenance and reject invented city or county identities',async()=>{
 const [{serviceStates,countyPath},{countyContextOptions},{inquiryFormMarkup},{prefillInquiryHtml},{validateInquiry},{selectedInquiryContext,inquiryContextSummary,escapeHtml}]=await Promise.all([runtime(),import('../src/approved-rerun-county-context.mjs'),import('../src/inquiry-form.mjs'),import('../src/inquiry-prefill.mjs'),import('../src/inquiry.mjs'),import('../src/shared.mjs')]);
 assert.equal(countyContextOptions.length,333);
 assert.deepEqual(countyContextOptions.map(([key])=>key).sort(),[...Object.keys(historicCountyRoutes),'/areas/erie-county/'].map(route=>route.slice(7,-1)).sort());
 const template=inquiryFormMarkup({live:true}),input={name:'Synthetic person',email:'owner@example.test',business:'Synthetic company',service:'unsure',message:'Synthetic validation only. Never send.'};
 for(const [county,text] of countyContextOptions){
  const html=prefillInquiryHtml(template,new URL('https://example.test/contact/?county='+encodeURIComponent(county)+'&business_location=FORGED'));
  assert.ok(html.includes(`name="county" value="${county}"`));assert.ok(html.includes(escapeHtml(text)));assert.doesNotMatch(html,/FORGED/);
  const result=validateInquiry({...input,county});assert.deepEqual(result.errors,{});assert.equal(selectedInquiryContext(result.value).county,county);
  assert.ok(inquiryContextSummary(result.value).some(line=>line.includes(text)&&line.includes('not your business address')));
 }
 assert.ok(countyContextOptions.some(([key,text])=>key==='maryland/baltimore-city'&&text==='Baltimore City, MD'));
 assert.ok(countyContextOptions.some(([key,text])=>key==='maryland/baltimore-county'&&text==='Baltimore County, MD'));
 for(const county of ['maryland/baltimore-city-county','maine/drew-county','new-hampshire/livermore-county','<script>alert(1)</script>','../../contact','a'.repeat(5000)])assert.ok(validateInquiry({...input,county}).errors.county,county);
});

test('50 historical northern worksheets preserve authored decisions and independent question provenance',async()=>{
 const {byPath,northeastProfiles,northeastBuyerTasks,northeastSearchQuestions,northeastQuestionSources}=await runtime();
 const sources=northeastQuestionSources(offers).filter(x=>fixture.states.some(s=>s.id===x.stateId));assert.equal(sources.length,150);
 const keys=new Set(sources.map(s=>`${s.stateId}/${s.slug}/${s.index}`));assert.equal(keys.size,150);
 for(const s of fixture.states)for(const a of s.areas){
  const profile=northeastProfiles[s.id].find(p=>p.slug===a.slug),task=northeastBuyerTasks[s.id][a.slug];
  assert.equal(profile.briefs.length,2);assert.equal(profile.questions.length,3);assert.equal(task.questions.length,3);
  const worksheet=await readFile(new URL(`../src/assets/county-briefs/${s.id}-${a.slug}.txt`,import.meta.url),'utf8');
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(text?.trim()&&worksheet.includes(text),s.id+'/'+a.slug);
  assert.match(worksheet,/EXAMPLE \(MADE UP\)/);assert.ok(worksheet.includes(`${config.origin}/areas/${s.id}/#${a.slug}`));
  assert.match(worksheet,/general.*(?:planning|guidance)|(?:planning|guidance).*general/i);
  const questions=northeastSearchQuestions(s.id,a.slug,offers);assert.equal(questions.length,3);
  for(const [index,[question,answer,guide,text]] of questions.entries()){
   assert.ok(question.trim()&&answer.trim().length>90&&text.trim());assert.ok(byPath.has(guide));
   const source=sources.find(x=>x.stateId===s.id&&x.slug===a.slug&&x.index===index+1);assert.ok(source);
   assert.equal(source.question,question);assert.equal(source.guide,guide);assert.ok(sourceQueries.includes(source.sourceQuery),source.sourceQuery);assert.ok(source.provenanceType);
  }
 }
});

test('northern state hubs and retained question answers use current offer values',async()=>{
 const {countyPages,northeastSearchQuestions}=await runtime(),changed=structuredClone(offers);
 changed.launch_site.public_price=1887;changed.plans.keep_running.monthly_price=187;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.baseline.one_time_price=499;changed.audit_sprint.one_time_price=975;
 const rendered=new Map(countyPages(changed).map(p=>[p.path,p.body]));
 for(const s of fixture.states){
  const html=rendered.get(`/areas/${s.id}/`);assert.ok(html);
  for(const price of ['$1,887','$187/month','$499','$686'])assert.ok(html.includes(price),s.id+' '+price);
  for(const a of s.areas){const answers=northeastSearchQuestions(s.id,a.slug,changed);assert.equal(answers.length,3);assert.doesNotMatch(answers.map(answer=>answer[1]).join(' '),/\$1,400|\$400\/month|\$800\/month|\$150\/month|\$399|\$750/);}
 }
});

test('extended 0018 admits exactly 125 additions and all 53 northern Worker events against synthetic SQLite',async t=>{
 const directory=new URL('../deployment/migrations/',import.meta.url),names=(await readdir(directory)).filter(n=>n.endsWith('.sql')&&n<'0018').sort();
 const previous=await Promise.all(names.map(n=>readFile(new URL(n,directory),'utf8'))),migration=await readFile(new URL('0018_journey_northeast.sql',directory),'utf8');
 const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 const priorJourney=previous.findLast(sql=>sql.includes('CREATE TABLE journey_counts'));
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(priorJourney,field));
 const before=allowed(priorJourney,'page'),after=allowed(migration,'page');assert.equal(before.length,291);assert.equal(after.length,416);assert.equal(new Set(after).size,416);
 assert.deepEqual(after.filter(p=>!before.includes(p)).sort(),[...earlierRoutes,...newRoutes].map(journeyPageKey).sort());
 assert.deepEqual(after.filter(p=>before.includes(p)),before);
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec(previous.join('\n')+'\n'+migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){return{meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-northern-secret-over-32-characters'};
 for(const [index,route] of newRoutes.entries()){
  const page=journeyPageKey(route),request=new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':`192.0.2.${index+1}`},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
  assert.equal((await worker.fetch(request,env,{})).status,204,route);assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1);
 }
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM journey_counts').get().n,53);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
});
