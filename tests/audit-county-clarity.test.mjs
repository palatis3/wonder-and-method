import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import erieGeography from '../authority/v5/geography.json' with {type:'json'};
import {countyPages,serviceAreaLinks} from '../src/service-counties.mjs';
import {serviceStates,countyPath,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {normalizeCountyQuery,parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import {countyCoverage} from '../src/erie-content.mjs';
import {routeIndexEligible} from '../src/index-policy.mjs';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import {pennsylvaniaBuyerTasks} from '../src/pennsylvania-content.mjs';
import {ohioBuyerTasks} from '../src/ohio-content.mjs';
import {northeastBuyerTasks} from '../src/northeast-content.mjs';
const pages=countyPages(offers),byPath=new Map(pages.map(page=>[page.path,page]));
const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug))).split('|')})));
const matches=(query,state='')=>cards.filter(card=>countyMatchScore(card,parseCountyQuery(query),state)).map(card=>`${card.state}/${card.slug}`);
const e=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('all 333 county and planning-region routes remain index eligible and crawlable without JavaScript',()=>{
 const directory=countyDirectory();
 assert.equal(cards.length,333);
 assert.deepEqual(serviceStates.map(state=>state.counties.length),[62,67,88,21,9,5,14,3,14,10,16,24]);
 for(const state of serviceStates)for(const county of state.counties){
  const route=countyPath(county,state);
  assert.ok(routeIndexEligible(route),route);
  assert.ok(directory.includes(`href="${route}"`),route);
  assert.ok(countyDirectory(state).includes(`href="${route}"`),route);
  if(route!=='/areas/erie-county/')assert.ok(byPath.has(route),route);
 }
 assert.equal((directory.match(/data-county-search=/g)||[]).length,333);
 assert.equal((directory.match(/<details class="county-region county-section"/g)||[]).length,12);
 assert.doesNotMatch(directory,/data-county-filter-controls hidden/);
 assert.match(directory,/<noscript>.*Open the lists below to browse every service area/s);
 assert.equal((directory.match(/for="county-search"/g)||[]).length,1);
 assert.equal((directory.match(/>Clear<\/button>/g)||[]).length,1);
 assert.match(directory,/ZIP codes aren't supported/);
 assert.doesNotMatch(directory,/<h2>No count/);
});

test('compact search retains typed places, state qualifiers, shared county portions and Saint aliases',()=>{
 assert.equal(normalizeCountyQuery('St. Lawrence'),normalizeCountyQuery('Saint Lawrence'));
 assert.deepEqual(matches('Erie PA'),['pennsylvania/erie']);
 assert.deepEqual(matches('Erie County OH'),['ohio/erie']);
 assert.deepEqual(matches('Erie County New York'),['new-york/erie']);
 assert.deepEqual(matches('Buffalo NY'),['new-york/erie']);
 assert.deepEqual(matches('Erie PA','ohio'),[]);
 assert.deepEqual(matches('Saint Lawrence County NY'),['new-york/st-lawrence']);
 assert.deepEqual(matches('St. Clairsville OH'),matches('Saint Clairsville Ohio'));
 assert.ok(matches('Saint Clairsville OH').includes('ohio/belmont'));
 assert.deepEqual(matches('Town of Newfane NY'),['new-york/niagara']);
 assert.equal(parseCountyQuery('Town Line NY').query,'town line');
 assert.equal(parseCountyQuery('Town Line NY').type,'','Town Line is a name, not a type prefix');
 assert.deepEqual(matches('Bethlehem Township PA'),['pennsylvania/northampton']);
 assert.ok(matches('Fairfield Township OH').includes('ohio/mahoning'));
 assert.ok(matches('Perry Township OH').includes('ohio/mahoning'));
 assert.ok(matches('Canaan Township OH').includes('ohio/medina'));
 assert.ok(matches('Canaan Township OH').includes('ohio/wayne'));
 assert.ok(matches('Ateres Village NY').includes('new-york/sullivan'));
 assert.ok(!matches('Erie').includes('new-york/jefferson'),'Deferiet is not Erie');
 assert.deepEqual(matches('14221'),[]);
 for(const state of serviceStates){
  for(const county of state.counties){
   const query=`${county.name} ${county.areaType||'County'} ${state.abbreviation}`;
   const result=matches(query);
   assert.ok(result.includes(`${state.id}/${county.slug}`),query);
   assert.ok(result.every(path=>path.startsWith(state.id+'/')),query+' cannot cross state');
  }
 }
 const erie=cards.find(card=>card.state==='pennsylvania'&&card.slug==='erie');
 const buffaloTownship=cards.find(card=>card.state==='pennsylvania'&&card.terms.some(term=>term.endsWith(':buffalo')));
 assert.ok(countyMatchScore(erie,parseCountyQuery('Erie'))>0);
 const primaryTown={state:'ohio',terms:['va:mcarthur']},otherTown={state:'ohio',terms:['v:mcarthur']};
 assert.ok(countyMatchScore(primaryTown,parseCountyQuery('McArthur'))>countyMatchScore(otherTown,parseCountyQuery('McArthur')),'primary communities rank before other place-name matches');
 assert.ok(countyMatchScore(buffaloTownship,parseCountyQuery('Buffalo'))>0,'real PA Buffalo townships remain searchable');
});

test('New York City keeps its five-borough alias while typed counties and state filters stay precise',()=>{
 const boroughs=['bronx','kings','new-york','queens','richmond'].map(slug=>'new-york/'+slug).sort();
 for(const query of ['New York City','New York City NY','New York City New York'])assert.deepEqual(matches(query).sort(),boroughs,query);
 assert.deepEqual(matches('New York City','new-york').sort(),boroughs);
 assert.deepEqual(matches('New York City PA'),[]);
 assert.deepEqual(matches('New York City','ohio'),[]);
 assert.deepEqual(matches('New York County NY'),['new-york/new-york']);
 assert.deepEqual(matches('Bethlehem city PA').sort(),['pennsylvania/lehigh','pennsylvania/northampton']);
 assert.deepEqual(matches('Sandusky city OH'),['ohio/erie']);
});

test('search names are normalized and deduplicated while directory remains under 150 KB',()=>{
 assert.ok(Buffer.byteLength(countyDirectory())<150_000);
 for(const card of cards){
  const names=card.terms.map(term=>term.slice(term.indexOf(':')+1));
  assert.equal(new Set(names).size,names.length,card.state+'/'+card.slug);
  assert.ok(names.every(name=>name&&name===normalizeCountyQuery(name)));
 }
});

test('county pages retain local detail, one fictional-example notice, downloads, state identity and bounded related links',()=>{
 for(const state of serviceStates)for(const county of state.counties){
  const page=byPath.get(countyPath(county,state));if(!page)continue;
  assert.ok(page.body.match(/<h1>(.*?)<\/h1>/)[1].endsWith(', '+state.abbreviation),page.path);
  const areaLabel=county.areaType==='Independent City'?`${county.name} City`:`${county.name} ${county.areaType||'County'}`;
  assert.ok(page.body.includes(e(areaLabel)),page.path);
  assert.equal((page.body.match(/More planning examples \(made up\)/g)||[]).length,1,page.path);
  assert.match(page.body,/class="county-planning-details"/);
  for(const [title,text] of county.briefs){assert.ok(page.body.includes(e(title)),page.path);assert.ok(page.body.includes(e(text)),page.path);}
  assert.match(page.body,/download>Download the planning worksheet \(TXT\)/);
  assert.match(page.body,/>Official sources for these places<\/summary>/);
  assert.match(page.body,/>Plan your own coverage pages<\/a>/);
  assert.ok(page.description.length<=155,page.path);
  assert.doesNotMatch(page.description,/scoped|honest|without (?:inventing|promising)/i,page.path);
  assert.ok(page.title.length<=60,page.path);
  const related=page.body.match(/<p><strong>More [\s\S]*?<\/p>/)?.[0]||'';
  assert.ok((related.match(/<a /g)||[]).length<=4,page.path);
 }
 const vinton=byPath.get('/areas/ohio/vinton-county/').body;
 assert.match(vinton,/>View villages and townships<\/summary>/);
 assert.doesNotMatch(vinton,/Communities are Census-designated/);
 const kings=byPath.get('/areas/kings-county/');
 assert.match(kings.body,/<h1>Web design &amp; SEO in Kings County \(Brooklyn\), NY<\/h1>/);
 const erie=countyCoverage(erieGeography,config,offers);
 assert.match(erie,/<h1>Web design &amp; SEO in Erie County \(Buffalo\), NY<\/h1>/);
 assert.equal((erie.match(/Use your usual community name/g)||[]).length,1);
 assert.equal((erie.match(/North Tonawanda is in Niagara County/g)||[]).length,1);
});

test('county prices and names follow configuration and safe-fix and monthly starting rules stay explicit',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.public_price=1777;changed.baseline.one_time_price=477;changed.audit_sprint.one_time_price=877;changed.plans.keep_running.monthly_price=177;
 changed.baseline.public_name='Website Check';changed.audit_sprint.public_name='Review & Fix';
 for(const page of countyPages(changed).filter(page=>/-(?:county|planning-region)\/$/.test(page.path))){
  for(const text of ['$1,777','$477','$877','$177/month','Website Check','Review &amp; Fix','one small fix if it is safe and practical','current usable','studio build'])assert.ok(page.body.includes(text),page.path+' '+text);
  assert.doesNotMatch(page.body,/one safe first fix when access allows|Care (?:is |starts at )?from/);
 }
 const links=serviceAreaLinks();
 assert.equal((links.match(/href=/g)||[]).length,13);
 assert.match(links,/href="\/areas\/"/);
 assert.doesNotMatch(links,/-county\//);
});

test('all 333 public worksheets preserve the exact task, decisions, checks and safe note fields',async()=>{
 const rows=[...Object.entries(countyBuyerTasks),...Object.entries(pennsylvaniaBuyerTasks).map(([slug,task])=>['pennsylvania-'+slug,task]),...Object.entries(ohioBuyerTasks).map(([slug,task])=>['ohio-'+slug,task]),...Object.entries(northeastBuyerTasks).flatMap(([state,tasks])=>Object.entries(tasks).map(([slug,task])=>[state+'-'+slug,task]))];
 const files=(await readdir(new URL('../src/assets/county-briefs/',import.meta.url))).filter(file=>file.endsWith('.txt'));
 assert.equal(rows.length,333);assert.equal(files.length,333);
 for(const [slug,task] of rows){
  const text=await readFile(new URL(`../src/assets/county-briefs/${slug}.txt`,import.meta.url),'utf8');
  for(const value of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(text.includes(value),slug+' task text');
  for(const value of ['YOUR BUSINESS','QUESTIONS TO ANSWER','TRY IT AS A CUSTOMER','KEEP IT ACCURATE','Your answer:','Do not include passwords or sensitive personal information.','Official place sources are linked'])assert.ok(text.includes(value),slug+' '+value);
 }
});
