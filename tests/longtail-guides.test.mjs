import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {floridaGuidePaths} from '../src/florida-guide-paths.mjs';
import {operatingGuidePaths} from '../src/operating-guide-paths.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {journal,journalSections} from '../src/journal.mjs';
import {longtailGuideDetails} from '../src/longtail-guides.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {saveJourneyCount} from '../deployment/journey-counts.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [config,offers,map,geography,previous]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/pre-longtail-routes.json'].map(async p=>JSON.parse(await read(p))));
const expected=['ai-search-visibility','ai-website-content-review','local-seo-audit','slow-website-on-mobile'].map(x=>'/guides/'+x+'/');
const pages=renderPages({config,offers,map,geography});
test('four distinct guides retain approval gates while the historical 411 routes resolve through live pages or county redirects',()=>{
 assert.equal(previous.length,411);assert.equal(pages.length,189);
 for(const route of previous){
  const destination=retiredCountyRoutes[route];
  if(destination){const [hub,slug]=destination.split('#');assert.ok(!pages.some(page=>page.path===route),route);const target=pages.find(page=>page.path===hub);assert.ok(target,destination);if(slug)assert.ok(target.html.includes(`id="${slug}"`),destination);}
  else assert.ok(pages.some(page=>page.path===route),route);
 }
 assert.deepEqual(pages.filter(page=>!previous.includes(page.path)&&!operatingGuidePaths.has(page.path)&&!floridaGuidePaths.has(page.path)&&page.path.startsWith('/guides/')).map(page=>page.path).sort(),expected.slice().sort());
 const index=pages.find(p=>p.path==='/guides/').html;
 for(const path of expected){
  const detail=longtailGuideDetails[path.split('/').at(-2)],page=pages.find(p=>p.path===path),body=journalSections(path,offers).map(s=>s.body).join('');
  assert.ok(index.includes(`href="${path}"`));assert.ok(page.html.includes(detail.download));assert.match(body,/Fictional|fictional/);
  assert.match(page.html,/name="robots" content="index,follow"/);assert.ok(page.html.includes(`rel="canonical" href="${config.origin+path}"`));
  assert.equal(journal.filter(g=>g.path===path).length,1);
  const held=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(g=>g.path!==path)},offers,map,geography});
  assert.ok(!held.some(p=>p.path===path));for(const p of held)assert.ok(!p.html.includes(`href="${path}`),p.path+' links held guide');
 }
});
test('worksheets are rectangular, start untested and distinguish examples from actual findings',async()=>{
 for(const detail of Object.values(longtailGuideDetails)){
  const text=await read('src'+detail.download),rows=text.trim().split(/\r?\n/).map(line=>[...line.matchAll(/(?:^|,)"((?:[^"]|"")*)"/g)].map(m=>m[1]));
  assert.ok(rows.length>=3);assert.ok(rows[0].some(x=>/Status/i.test(x)));assert.ok(rows.every(row=>row.length===rows[0].length));
  assert.match(rows[1].join(' '),/Not checked/);assert.ok(rows.some(row=>row.some(x=>/Fictional/i.test(x))));
  assert.ok(rows[0].some(x=>/source|evidence/i.test(x)));assert.ok(rows[0].some(x=>/owner|approver/i.test(x)));
 }
 const local=await read('src/assets/guides/local-seo-audit.csv');assert.match(local,/Needs access/);assert.doesNotMatch(local,/"Pass"/);
});
const allowed=(sql,field)=>[...sql.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
test('migration 0019 adds only four page keys, preserves data and accepts those keys through the worker validator',async t=>{
 const names=(await readdir(new URL('../deployment/migrations/',import.meta.url))).filter(x=>/^\d{4}.*\.sql$/.test(x)&&Number(x.slice(0,4))<=19).sort();
 const sql=await Promise.all(names.map(n=>read('deployment/migrations/'+n))),migration=sql.at(-1),previousSql=sql.at(-2);
 assert.match(names.at(-1),/^0019_/);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(previousSql,field));
 const old=allowed(previousSql,'page'),next=allowed(migration,'page');assert.ok(old.every(k=>next.includes(k)));
 assert.deepEqual(next.filter(k=>!old.includes(k)).sort(),expected.map(journeyPageKey).sort());
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 for(const [i,key]of old.entries())insert.run('2026-10-22','page_view','unsure',key,'direct',i%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,'accepted')").run('longtail-fixture',1234,'{"preserve":"é & < >"}','longtail-fixture');
 const before=db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),inquiries=db.prepare('SELECT * FROM inquiries').all();db.exec(migration);
 assert.deepEqual(db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),before);assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 for(const [column,value]of [['page','unapproved'],['event','typed_value'],['source','full_referrer'],['service','arbitrary'],['total',-1],['total',1000001]]){const row={day:'2026-10-23',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert.run(...Object.values(row)));}
 const DB={prepare(sql){const build=values=>({bind:(...v)=>build(v),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'x'.repeat(32)};
 for(const path of expected){const page=journeyPageKey(path);const response=await saveJourneyCount(new Request('https://example.test/api/journey',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','User-Agent':'Synthetic browser fixture'},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})}),env,{readLimited:async stream=>new Response(stream).text(),fingerprint:async()=>page,now:Date.parse('2026-10-22T12:00:00Z')});assert.equal(response.status,204);assert.equal(db.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1);}
});
