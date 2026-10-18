import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {packageVisualCards,assertPackageVisualOffers} from '../src/package-visuals.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,guides,manifest]=await Promise.all(['config/offers.json','src/assets/package-visuals/feature-guides.json','src/assets/package-visuals/manifest.json'].map(read));

test('eight complete posters preserve every native feature and make all upgrades traceable',async()=>{
 const parents={focused_site:'launch_site',signature_site:'focused_site',improve:'keep_running',grow:'improve'};
 const files=new Set();let featureCount=0;
 for(const kind of ['website','monthly','existing']){
  const html=packageVisualCards(offers,{kind});
  assert.doesNotMatch(html,/package-panel-|comparison-v\d|package-visual-crops/);
  for(const item of manifest[kind].offers){
   const p=guides.products.find(p=>p.id===item.key),parent=guides.products.find(x=>x.id===parents[p.id]);
   files.add(item.poster.file);assert.ok((await stat(new URL('../src/assets/package-visuals/'+item.poster.file,import.meta.url))).size>10000);
   assert.ok(html.includes('/assets/package-visuals/'+item.poster.file));
   const shown=new Set(p.poster.featureIds),assigned=p.sections.flatMap(s=>s.features);
   assert.equal(new Set(assigned).size,p.features.length);assert.equal(assigned.length,p.features.length);
   for(const f of p.features){
    featureCount++;assert.equal(html.split('data-feature="'+f.id+'"').length-1,1,f.id);
    if(!shown.has(f.id)){assert.ok(parent,p.id+' lacks an inheritance parent');const prior=parent.features.find(x=>x.id.split('.').at(-1)===f.id.split('.').at(-1));assert.equal(prior?.plain,f.plain,f.id+' is neither printed nor truthfully inherited');}
   }
   if(parent)assert.match(p.poster.inheritance,/^Includes all features of .+ PLUS$/);
   if(kind==='website'){assert.ok(p.features.some(f=>f.id.endsWith('.handoff')));assert.ok(p.features.some(f=>f.id.endsWith('.static_site')));assert.ok(!p.features.some(f=>/\.(cms|workflow|call_tracking|followup|articles|lead_pipeline_.+|client_portal_.+|small_store_.+)$/.test(f.id)));}
  }
 }
 assert.equal(files.size,8);assert.equal(featureCount,185);
 const changed=structuredClone(offers);changed.launch_site.form_limit+=' Changed field limit.';assert.throws(()=>assertPackageVisualOffers(changed),/configured offer scope changed/);
});
