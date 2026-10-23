import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {floridaGeography,floridaAreaInventory} from '../src/florida-geography.mjs';
import {floridaGuideDetails} from '../src/florida-guides.mjs';
import {floridaAreaGuideLinks} from '../src/florida-area-guide-links.mjs';
import {serviceStates,countyPath,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {saveJourneyCount} from '../deployment/journey-counts.mjs';
import {journal,journalSections} from '../src/journal.mjs';
import offers from '../config/offers.json' with {type:'json'};
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const geo=Object.values(floridaGeography.florida);

test('Florida preserves all 67 counties and cross-boundary municipal and statistical identities',()=>{
 assert.equal(floridaAreaInventory.length,67);assert.equal(new Set(floridaAreaInventory.map(a=>a.fips)).size,67);
 const municipalities=geo.flatMap(g=>g.municipalityDetails),cdps=geo.flatMap(g=>g.communities);
 assert.equal(municipalities.length,415);assert.equal(new Set(municipalities.map(p=>p.geoid)).size,411);
 assert.equal(cdps.length,558);assert.equal(new Set(cdps.map(p=>p.geoid)).size,547);
 assert.ok(cdps.every(p=>p.type==='Census-designated place'));
 const state=serviceStates.find(s=>s.id==='florida');assert.equal(state.counties.length,67);
 for(const county of state.counties)assert.equal(countyPath(county,state),'/areas/florida/#'+county.slug);
 const cards=serviceStates.flatMap(s=>s.counties.map(c=>({id:s.id+'/'+c.slug,state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
 for(const [query,expected] of [['Longboat Key town FL',['florida/manatee','florida/sarasota']],['Marineland town FL',['florida/flagler','florida/st-johns']],['Orange county FL',['florida/orange']],['Baldwin town FL',['florida/duval']],['The Villages CDP FL',['florida/marion','florida/sumter']]])assert.deepEqual(cards.filter(c=>countyMatchScore(c,parseCountyQuery(query))).map(c=>c.id).sort(),expected,query);
 assert.match(floridaGeography.florida.duval.directoryNote,/Baldwin/);
});

test('Florida publication records match five practical articles and eleven deliberately selected county links',async()=>{
 const decisions=JSON.parse(await read('operations/florida-expansion-20261022/data/county-decisions.json'));
 assert.equal(decisions.length,67);assert.equal(decisions.filter(d=>d.decision==='local-article').length,4);assert.equal(decisions.filter(d=>d.decision==='shared-guide').length,7);
 assert.equal(Object.keys(floridaAreaGuideLinks).length,11);assert.equal(Object.keys(floridaGuideDetails).length,5);
 for(const d of decisions){assert.equal(d.queries.length,4);for(const q of d.queries)if(q.status==='unavailable')assert.equal(q.monthlySearchEstimate,null);assert.deepEqual((floridaAreaGuideLinks[d.areaId]||[]).map(g=>g.path),d.articles);}
 for(const detail of Object.values(floridaGuideDetails)){
  assert.equal(journal.filter(g=>g.path===detail.path).length,1);assert.equal(journeyPageKey(detail.path),'guide');
  const sections=journalSections(detail.path,offers),body=sections.map(s=>s.body).join('');assert.equal(sections.length,new Set(sections.map(s=>s.id)).size);
  assert.match(body,/worksheet/i);assert.match(body,/Illustrative check/i);assert.ok((body.match(/<tr>/g)||[]).length>=7);
  const worksheet=await read('src'+detail.download);assert.ok(worksheet.length>400);assert.ok(worksheet.includes(detail.path));
 }
});

test('migration 0021 preserves historical analytics and inquiries while accepting only the new Florida hub dimension',async t=>{
 const names=(await readdir(new URL('../deployment/migrations/',import.meta.url))).filter(n=>/^\d{4}.*\.sql$/.test(n)&&Number(n.slice(0,4))<=21).sort();
 const sql=await Promise.all(names.map(n=>read('deployment/migrations/'+n)));assert.match(names.at(-1),/^0021_/);
 const allowed=(s,field)=>[...s.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 const old=allowed(sql.at(-2),'page'),next=allowed(sql.at(-1),'page');assert.equal(old.length,428);assert.equal(next.length,429);assert.deepEqual(next.filter(k=>!old.includes(k)),['areas_florida']);assert.ok(next.every(key=>journeyPages.has(key))); // Later additive migrations may extend the runtime set.
 for(const field of ['event','service','source'])assert.deepEqual(allowed(sql.at(-1),field),allowed(sql.at(-2),field));
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');for(const [i,key]of old.entries())insert.run('2026-10-22','page_view','unsure',key,'direct',i%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,'accepted')").run('florida-fixture',1234,'{"preserve":"é & < >"}','florida-fixture');
 const before=db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),inquiries=db.prepare('SELECT * FROM inquiries').all();db.exec(sql.at(-1));
 assert.deepEqual(db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),before);assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 for(const [column,value]of [['page','areas_florida_invented_county'],['event','typed_value'],['source','full_referrer'],['service','arbitrary'],['total',-1],['total',1000001]]){const row={day:'2026-10-23',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert.run(...Object.values(row)));}
 const DB={prepare(sql){const build=values=>({bind:(...v)=>build(v),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const page=journeyPageKey('/areas/florida/');const response=await saveJourneyCount(new Request('https://example.test/api/journey',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','User-Agent':'Synthetic browser fixture'},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})}),{DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'x'.repeat(32)},{readLimited:async stream=>new Response(stream).text(),fingerprint:async()=>page,now:Date.parse('2026-10-22T12:00:00Z')});assert.equal(response.status,204);assert.equal(db.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1);
});
