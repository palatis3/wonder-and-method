import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {northeastGeography} from '../src/northeast-geography.mjs';
import {northeastProfiles,northeastBuyerTasks,northeastSearchQuestions,northeastQuestionSources} from '../src/northeast-content.mjs';
import {serviceStates,countyPath,countySearchText,countyDirectory,serviceAreaDataForPath} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,packCountySearch,unpackCountySearch,unpackCountyNames} from '../src/assets/county-directory.js';
import {countyPages} from '../src/service-counties.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {countyContextOptions} from '../src/approved-rerun-county-context.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {selectedInquiryContext,inquiryContextSummary,escapeHtml} from '../src/shared.mjs';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography,fixture,priorRoutes,sourceQueries]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/northeast-expected-areas.json','tests/fixtures/pre-northeast-routes.json','tests/fixtures/northeast-faq-source-queries.json'].map(json));
const path=(state,area)=>`/areas/${state.id}/${area.slug}-${state.areaType==='Planning Region'?'planning-region':'county'}/`;
const newRoutes=fixture.states.flatMap(s=>[`/areas/${s.id}/`,...s.areas.map(a=>path(s,a))]);
const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(p=>[p.path,p]));
const schema=page=>JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test('compact finder payload preserves every original typed term and its order',()=>{
 for(const state of serviceStates)for(const county of state.counties){
  const value=countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug)));
  assert.deepEqual(unpackCountySearch(packCountySearch(value)),value.split('|'),state.id+'/'+county.slug);
 }
});

test('page-local finder dictionaries roundtrip every place on the combined and state directories',()=>{
 for(const scope of [undefined,...serviceStates]){
  const html=countyDirectory(scope),names=unpackCountyNames(JSON.parse(html.match(/data-county-place-names>(.*?)<\/script>/s)[1]));
  assert.equal(new Set(names).size,names.length);
  const cards=[...html.matchAll(/data-county-search="([^"]+)"><a class="county-link" href="([^"]+)"/g)];
  assert.equal(cards.length,scope?scope.counties.length:333);
  for(const [,packed,route] of cards){
   const {county,state}=serviceAreaDataForPath(route);
   const original=countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug)));
   assert.deepEqual(unpackCountySearch(packed,names),original.split('|'),route);
  }
 }
});

test('six states add precisely 72 routes, preserve 286 old routes and expose all 333 areas without JavaScript',()=>{
 assert.equal(priorRoutes.length,286);assert.equal(pages.length,415);assert.equal(byPath.size,415);
 assert.deepEqual(pages.filter(p=>!priorRoutes.includes(p.path)&&fixture.states.some(state=>p.path.startsWith('/areas/'+state.id+'/'))).map(p=>p.path).sort(),[...newRoutes].sort());
 for(const route of priorRoutes)assert.ok(byPath.has(route),route);
 const sitemap=crawlFiles(config,pages).sitemap;assert.equal((sitemap.match(/<loc>/g)||[]).length,414);
 assert.equal((byPath.get('/areas/').html.match(/data-county-search=/g)||[]).length,333);
 for(const s of fixture.states){
  assert.deepEqual(northeastProfiles[s.id].map(a=>a.slug).sort(),s.areas.map(a=>a.slug).sort());
  assert.deepEqual(Object.keys(northeastGeography[s.id]).sort(),s.areas.map(a=>a.slug).sort());
  const hub=byPath.get(`/areas/${s.id}/`).html;
  assert.equal((hub.match(/data-county-search=/g)||[]).length,s.areas.length);
  assert.match(hub,/<noscript>/);assert.match(hub,/<details class="county-region county-section"/);
  assert.doesNotMatch(hub,/<div id="counties"[^>]*\bhidden/);
  for(const a of s.areas){const route=path(s,a);for(const html of [hub,byPath.get('/areas/').html])assert.ok(html.includes(`href="${route}"`),route);assert.ok(sitemap.includes(`<loc>${config.origin+route}</loc>`));}
 }
});

test('each new route has correct title, H1, canonical identity, breadcrumbs and truthful Buffalo provider schema',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const s of fixture.states)for(const [route,label] of [[`/areas/${s.id}/`,s.name],...s.areas.map(a=>[path(s,a),`${a.name} ${s.areaType}`])]){
  const page=byPath.get(route),data=schema(page);titles.add(page.title);descriptions.add(page.description);
  const area=s.areas.find(a=>path(s,a)===route);
  assert.ok(page.title.includes(area?.name||s.name),route);
  if(area)assert.ok(page.title.includes(s.abbreviation),route);
  assert.ok(page.description.trim());
  const h1=page.html.match(/<h1[^>]*>(.*?)<\/h1>/s);assert.ok(h1,route);assert.ok(h1[1].includes(label),route);
  assert.ok(page.html.includes(`rel="canonical" href="${config.origin+route}"`));
  assert.match(page.html,/<meta name="robots" content="index,follow"/);
  assert.ok(!data.some(x=>['FAQPage','LocalBusiness'].includes(x['@type'])));
  const organization=data.find(x=>x['@type']==='Organization');
  assert.equal(organization.location.address.addressLocality,'Buffalo');assert.equal(organization.location.address.addressRegion,'NY');
  const expected=route===`/areas/${s.id}/`?['/','/areas/',route]:['/','/areas/',`/areas/${s.id}/`,route];
  assert.deepEqual(data.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),expected.map(p=>config.origin+p));
  if(expected.length===4)assert.equal(data.find(x=>x['@type']==='Service').areaServed.name,`${label}, ${s.name}`);
 }
 assert.equal(titles.size,72);assert.equal(descriptions.size,72);
});

test('official state totals, Connecticut town territories and municipality type exceptions are retained',()=>{
 const totals={'new-jersey':564,connecticut:179,'rhode-island':39,massachusetts:351,delaware:60,vermont:280};
 for(const [state,total] of Object.entries(totals))assert.equal(Object.values(northeastGeography[state]).reduce((n,g)=>n+Object.values(g.municipalities).flat().length,0),total,state);
 let territories=0;
 for(const [slug,names] of Object.entries(fixture.connecticutTerritories)){
  const g=northeastGeography.connecticut[slug];
  const actual=[...g.municipalities.towns,...g.aliases.filter(a=>a.type==='town').map(a=>a.name)];
  assert.deepEqual(actual.sort(),[...names].sort(),slug);territories+=names.length;
 }
 assert.equal(territories,169);
 const groton=northeastGeography.connecticut['southeastern-connecticut'].municipalities;
 assert.ok(groton.cities.includes('Groton'));assert.ok(groton.towns.includes('Groton'));
 const nj=northeastGeography['new-jersey'];assert.ok(nj.mercer.municipalities.other.includes('Princeton'));
 assert.ok(!nj.mercer.municipalities.townships.includes('Princeton'));
 assert.ok(nj.essex.municipalities.villages.includes('South Orange'));assert.ok(!nj.essex.municipalities.townships.includes('South Orange'));
 assert.ok(nj.essex.aliases.some(a=>a.name==='Township of South Orange Village'&&/former/i.test(a.note)));
 for(const [county,name] of [['hampshire','Amherst'],['hampden','East Longmeadow'],['norfolk','Braintree']]){
  const g=northeastGeography.massachusetts[county];assert.ok(g.municipalities.towns.includes(name));
  assert.equal(g.municipalityDetails.find(m=>m.name===name).governmentForm,'City');
 }
 for(const [name,counties] of [['Clayton',['kent','new-castle']],['Smyrna',['kent','new-castle']],['Milford',['kent','sussex']]])for(const county of counties)assert.ok(Object.values(northeastGeography.delaware[county].municipalities).flat().includes(name));
 const vt=northeastGeography.vermont;
 assert.ok(vt.chittenden.municipalities.villages.includes('Westbury'));
 assert.ok(!vt.caledonia.municipalities.villages.includes('Lyndonville'));assert.ok(vt.caledonia.communities.some(c=>c.name==='Lyndonville'));
 for(const [county,name] of [['caledonia','Groton'],['windham','Townshend']])assert.equal(vt[county].municipalityDetails.find(m=>m.name===name&&m.type==='Village').governmentStatus,'Inactive');
 for(const [county,name] of [['rutland','Rutland'],['franklin','St. Albans']])for(const type of ['cities','towns'])assert.ok(vt[county].municipalities[type].includes(name));
});

test('typed searches distinguish states, counties, current regions and same-named government forms',()=>{
 const cards=serviceStates.flatMap(s=>s.counties.map(c=>({id:s.id+'/'+c.slug,state:s.id,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
 const matches=query=>cards.filter(c=>countyMatch(c,parseCountyQuery(query)).score>0).map(c=>c.id).sort();
 for(const [query,expected] of [
  ['Erie County NY',['new-york/erie']],['Erie County PA',['pennsylvania/erie']],['Erie County OH',['ohio/erie']],
  ['Mercer County NJ',['new-jersey/mercer']],['Capitol Planning Region CT',['connecticut/capitol']],['Kent County RI',['rhode-island/kent']],
  ['Suffolk County MA',['massachusetts/suffolk']],['New Castle County DE',['delaware/new-castle']],['Rutland County VT',['vermont/rutland']],
  ['Groton city CT',['connecticut/southeastern-connecticut']],['Groton town CT',['connecticut/southeastern-connecticut']],
  ['Amherst town MA',['massachusetts/hampshire']],['Amherst city MA',['massachusetts/hampshire']],
  ['Princeton municipality NJ',['new-jersey/mercer']],['Princeton township NJ',[]],['Hartford county CT',[]],
  ['Township of South Orange Village NJ',['new-jersey/essex']],['Essex Junction village VT',['vermont/chittenden']],
  ['Saint Albans city VT',['vermont/franklin']],['Saint Albans town VT',['vermont/franklin']],['Saint Lawrence county NY',['new-york/st-lawrence']],
  ['Clayton town DE',['delaware/kent','delaware/new-castle']],['Milford city DE',['delaware/kent','delaware/sussex']],
  ['Rutland city VT',['vermont/rutland']],['Rutland town VT',['vermont/rutland']]
 ])assert.deepEqual(matches(query),expected,query);
 assert.equal(cards.length,333);
});

test('all 333 provenance contexts roundtrip without accepting invented areas or business locations',()=>{
 const expected=serviceStates.flatMap(s=>s.counties.map(c=>countyPath(c,s).slice('/areas/'.length,-1))).sort();
 assert.equal(countyContextOptions.length,333);assert.deepEqual(countyContextOptions.map(([key])=>key).sort(),expected);
 const template=inquiryFormMarkup({live:true}),input={name:'Synthetic person',email:'owner@example.test',business:'Synthetic company',service:'unsure',message:'Synthetic validation only. Never send.'};
 for(const [county,label] of countyContextOptions){
  const html=prefillInquiryHtml(template,new URL('https://example.test/contact/?county='+encodeURIComponent(county)+'&business_location=FORGED'));
  assert.ok(html.includes(`name="county" value="${county}"`));assert.ok(html.includes(escapeHtml(label)));assert.doesNotMatch(html,/FORGED/);
  const result=validateInquiry({...input,county});assert.deepEqual(result.errors,{});assert.equal(selectedInquiryContext(result.value).county,county);
  assert.ok(inquiryContextSummary(result.value).some(line=>line.includes(label)));
 }
 for(const county of ['connecticut/hartford-county','new-jersey/invented-county','<script>alert(1)</script>','../../contact','a'.repeat(5000)]){
  assert.ok(validateInquiry({...input,county}).errors.county,county);
  const html=prefillInquiryHtml(template,new URL('https://example.test/contact/?county='+encodeURIComponent(county)));
  assert.ok(!html.includes(`name="county" value="${county}"`));
 }
});

test('all 66 guides have matching buyer worksheets and FAQ answers tied to independent source queries',async()=>{
 const sources=northeastQuestionSources(offers).filter(source=>fixture.states.some(state=>state.id===source.stateId));assert.equal(sources.length,198);
 const identities=new Set();
 for(const s of fixture.states)for(const a of s.areas){
  const c=northeastProfiles[s.id].find(c=>c.slug===a.slug),task=northeastBuyerTasks[s.id][a.slug],html=byPath.get(path(s,a)).html;
  assert.equal(c.briefs.length,2);assert.equal(c.questions.length,3);assert.equal(task.questions.length,3);
  const worksheet=await readFile(new URL(`../src/assets/county-briefs/${s.id}-${a.slug}.txt`,import.meta.url),'utf8');
  for(const value of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(value?.trim()&&worksheet.includes(value),s.id+'/'+a.slug);
  assert.match(worksheet,/EXAMPLE \(MADE UP\)/);assert.ok(html.includes(`href="/assets/county-briefs/${s.id}-${a.slug}.txt"`));
  assert.equal((html.match(/<div class="county-faq">([\s\S]*?)<\/div>/)[1].match(/<summary>/g)||[]).length,6);
  const questions=northeastSearchQuestions(s.id,a.slug,offers);assert.equal(questions.length,3);
  questions.forEach(([question,answer,guide,label],index)=>{
   assert.ok(question.trim()&&answer.trim().length>90&&label.trim());assert.ok(byPath.has(guide));
   const source=sources.find(x=>x.stateId===s.id&&x.slug===a.slug&&x.index===index+1);
   assert.ok(source,`${s.id}/${a.slug}/${index}`);assert.equal(source.question,question);assert.equal(source.guide,guide);assert.ok(sourceQueries.includes(source.sourceQuery),source.sourceQuery);assert.ok(source.provenanceType);
   identities.add(`${s.id}/${a.slug}/${index}`);
  });
 }
 assert.equal(identities.size,198);
 assert.deepEqual(northeastSearchQuestions('new-jersey','invented',offers),[]);
});

test('new guide and FAQ prices follow offer configuration',()=>{
 const changed=structuredClone(offers);changed.launch_site.public_price=1887;changed.plans.keep_running.monthly_price=187;changed.plans.improve.monthly_price=487;changed.plans.grow.monthly_price=887;changed.baseline.one_time_price=499;changed.audit_sprint.one_time_price=975;
 const rendered=new Map(countyPages(changed).map(p=>[p.path,p.body]));
 for(const s of fixture.states)for(const a of s.areas){const html=rendered.get(path(s,a));assert.match(html,/Website builds from \$1,887/);assert.match(html,/Keep Running \$187\/month/);assert.match(html,/Website Baseline \$499/);assert.match(html,/Audit &amp; Fix Sprint \$975/);const faq=html.match(/<div class="county-faq">([\s\S]*?)<\/div>/)[1];assert.doesNotMatch(faq,/\$1,400|\$400\/month|\$800\/month|\$150\/month|\$399|\$750/);}
});
