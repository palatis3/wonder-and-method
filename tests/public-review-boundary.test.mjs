import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {renderPages} from '../src/pages.mjs';
import {publicReviewAreas} from '../src/review-content.mjs';
import {writeBuyerPacks} from '../scripts/build-buyer-packs.mjs';
import {writeOwnedProof} from '../scripts/build-owned-proof.mjs';
const root=resolve(import.meta.dirname,'..'),read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const pages=renderPages({config,offers,map,geography});
const privateMechanics=/weighted(?:\s|_|-)*(?:score|total|rating)|(?:section|area|audit|review)\s+weights?|weighting|rubric|74\.55|scoreLimit|weightedScoreOutOf100|"(?:weight|score|scoreLimit|weightedScoreOutOf100)"\s*:|\b\d+(?:\.\d+)?\s*(?:\/|out of)\s*100\b|\b\d+(?:\.\d+)?\s*(?:\/|out of)\s*10\b/gi;
function publicSafe(name,text){
 assert.doesNotMatch(text,/terrance[\s_-]*ciszek|\bciszek\b|linkedin\.com\/in\/terrance/i,name+' private founder identity');
 // Dated source-document paths are citations, not private numerical ratings.
 const withoutUrlDates=text.replace(/https?:\/\/[^\s"'<>]+/g,url=>url.replace(/\/\d{4}\/(?:0[1-9]|1[0-2])(?=\/)/g,'/SOURCE-DATE/'));
 // This complete, unit-labelled rack-size comparison expresses length/height,
 // not a rating. Preserve detection in every other part of the citation.
 const withoutRackDimensions=withoutUrlDates.replace(/\bTop Rack maximum \d+ feet length\/\d+ feet height, Middle \d+\/\d+ and Bottom \d+\/\d+\b/g,'rack dimensions');
 const matches=[...withoutRackDimensions.matchAll(privateMechanics)].map(match=>match[0]);assert.deepEqual(matches,[],name);
}
async function textFiles(folder){const result=[];for(const entry of await readdir(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())result.push(...await textFiles(path));else if(['.html','.json','.txt','.csv','.js','.mjs'].includes(extname(path)))result.push(path);}return result;}

test('private-score detection permits dated source URLs while retaining rating and metadata checks',()=>{
 publicSafe('dated citation','<a href="https://example.com/uploads/2025/10/application.pdf">Application</a>');
 for(const text of ['8/10','87 out of 100','2025/10','{"score":8}','weightedScoreOutOf100','https://example.com/uploads/2025/10/weightedScoreOutOf100.pdf','<a href="https://example.com/uploads/2025/10/application.pdf">8/10</a>'])assert.throws(()=>publicSafe('private scoring',text),assert.AssertionError);
});

test('private-score detection permits unit-labelled rack dimensions but still rejects adjacent scores',()=>{
 const dimensions='Top Rack maximum 21 feet length/8 feet height, Middle 26/8 and Bottom 32/10';
 publicSafe('rack dimensions',dimensions);
 for(const text of ['32/10','Bottom 32/10',`${dimensions}; score 8/10`,`${dimensions}; 87 out of 100`,`${dimensions}; {"score":8}`])assert.throws(()=>publicSafe('private scoring',text),assert.AssertionError);
});

test('public review exposes all 22 useful area names and descriptions through a strict allowlist',()=>{
 const areas=publicReviewAreas(offers);assert.equal(areas.length,22);assert.deepEqual(areas.map(x=>x.id),offers.review_standard.sections.map(x=>x.id));
 for(const area of areas){assert.deepEqual(Object.keys(area),['id','title','check']);assert.ok(area.check.length>35);assert.equal(area.title,offers.review_standard.sections.find(s=>s.id===area.id).title);}
 assert.equal(offers.review_standard.sections.reduce((total,area)=>total+area.weight,0),100);
 const altered=structuredClone(offers);for(const area of altered.review_standard.sections){area.weight=987654;area.score=123456;area.privateNotes='INTERNAL-SENTINEL';}altered.review_standard.score_limit='PRIVATE-LIMIT';
 assert.deepEqual(publicReviewAreas(altered),areas);
 const rendered=renderPages({config,offers:altered,map,geography}).map(p=>p.html).join('');assert.doesNotMatch(rendered,/987654|123456|INTERNAL-SENTINEL|PRIVATE-LIMIT/);
});

test('current pages, every buyer pack, owned proof JSON and public text assets omit private scoring',async()=>{
 for(const page of pages)publicSafe(page.path,page.html);
 const output=await mkdtemp(join(tmpdir(),'wm-public-review-'));
 try{
  await mkdir(join(output,'assets'),{recursive:true});
  await writeFile(join(output,'assets/brand.css'),':root{--brand:green}');
  await writeFile(join(output,'assets/site.css'),'body{margin:0}');
  await writeBuyerPacks(output,offers);await writeOwnedProof(root,output,offers);const files=[...await textFiles(join(output,'assets')),...await textFiles(join(root,'src/assets'))];
  for(const file of files){let text=await readFile(file,'utf8');if(extname(file)==='.mjs')text=text.replace(/\(12-completedCycles\)\/12\/100/g,'REFUND-CENTS-CONVERSION');publicSafe(file,text);}
  for(const file of files.filter(file=>file.startsWith(output)&&extname(file)==='.html')){
   const html=await readFile(file,'utf8');
   assert.match(html,/href="\/assets\/site\.css\?v=[a-f0-9]{12}"/);
   assert.doesNotMatch(html,/href="\/assets\/brand\.css/);
   assert.match(html,/class="wordmark brand-lockup"/);assert.match(html,/class="brand-emblem"/);
   assert.match(html,/<main id="main" tabindex="-1"/);assert.doesNotMatch(html,/semrush/i);
  }
  const proof=JSON.parse(await readFile(join(output,'assets/buyer-packs/owned-audit-two-fix-record.json'),'utf8'));assert.deepEqual(Object.keys(proof.baseline),['capturedAt','phase','reviewAreas']);assert.equal(proof.baseline.reviewAreas.length,22);assert.ok(proof.baseline.reviewAreas.every(area=>Object.keys(area).join(',')==='id,title'));assert.equal(proof.fixes.length,2);
 }finally{assert.ok(output.startsWith(join(tmpdir(),'wm-public-review-')));await rm(output,{recursive:true,force:true});}
});

test('public identity uses Terry without a personal profile in any page or metadata',()=>{
 assert.equal(config.founderName,'Terry');assert.equal(config.founderProfile,undefined);assert.equal(config.founderPublicName,undefined);
 for(const page of pages){
  assert.doesNotMatch(page.html,/terrance[\s_-]*ciszek|\bciszek\b|linkedin\.com\/in\/terrance/i,page.path);
  for(const match of page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   const schemas=JSON.parse(match[1]);
   for(const schema of Array.isArray(schemas)?schemas:[schemas])if(schema['@type']==='Person'){assert.equal(schema.name,'Terry',page.path);assert.equal(schema.sameAs,undefined,page.path);}
  }
 }
});

test('public cleanup retains commercial percentages, owned-work limits and responsible identity',()=>{
 const pricing=pages.find(p=>p.path==='/pricing/').html;for(const percentage of ['50%','30%','20%'])assert.ok(pricing.includes(percentage),percentage);
 assert.doesNotMatch(pricing,/Save 5%|billing=annual/);
 const work=pages.find(p=>p.path==='/work/').html;assert.doesNotMatch(work,/six guides|Our standard of care/i);assert.match(work,/A live product website, fictional business concepts, and the details behind the design/);assert.match(work,/Maple Studio is fictional/);assert.match(work,/fictional inquiries in your browser/);assert.match(work,/do not establish traffic, ranking or sales results/);assert.match(work,/href="\/work\/lead-workbench\/"/);
 const about=pages.find(p=>p.path==='/about/').html;for(const value of [config.founderName,config.founderBio,config.businessIdentity,config.contactEmail])assert.ok(about.includes(value.replaceAll('&','&amp;')),value);assert.match(about,/one-person web studio, operated by/);assert.match(about,/Hello, I’m Terry/);assert.doesNotMatch(about,/project lead|owner-approved/);
 const demo=pages.find(p=>p.path==='/work/lead-workbench/').html;assert.match(demo,/lead-workbench\.js/);assert.match(demo,/name="robots" content="index,follow"/);assert.ok(pages.filter(p=>p.path!=='/work/lead-workbench/').every(p=>!p.html.includes('src="/assets/lead-workbench.js"')));
});
