// Retain real captures only after proving their complete cropped content is unchanged.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {parse,serializeOuter} from 'parse5';
import postcss from 'postcss';
const root=resolve(import.meta.dirname,'../..'),prior=resolve(root,'../../v3-implementation-20261029/site');
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=(base,path)=>readFile(join(base,path));
const original=JSON.parse(await read(prior,'src/city-preview-captures.json'));
const next=structuredClone(original),proof={reviewedAt:new Date().toISOString(),captureTime:original.capturedAt,reason:'The only change in buyer-experience.mjs is projectCalendar, which is outside all concept captures. The complete concept article, concept stylesheet, illustrations and fonts remain unchanged. Current prices appear in the separate debrief below the crop.',sourceComparisons:[],articleComparisons:[],unchangedCaptureHashes:[]};
function find(node,predicate){if(predicate(node))return node;for(const child of node.childNodes||[]){const result=find(child,predicate);if(result)return result;}}
const classOf=node=>node.attrs?.find(x=>x.name==='class')?.value||'';
for(const [path,beforeHash] of Object.entries(original.sourceHashes)){
 const [before,after]=await Promise.all([read(prior,path),read(root,path)]);
 assert.equal(hash(before),beforeHash,'Prior capture dependency '+path);
 if(path==='src/buyer-experience.mjs'){
  const omitCalendar=bytes=>bytes.toString('utf8').replace(/export function projectCalendar\([\s\S]*?(?=export function conceptDebrief)/,'');
  assert.equal(omitCalendar(after),omitCalendar(before),'No change outside the unrelated projectCalendar function');
 }else assert.deepEqual(after,before,'Captured source unchanged: '+path);
 proof.sourceComparisons.push({path,beforeSha256:hash(before),afterSha256:hash(after),unchanged:hash(before)===hash(after)});
 next.sourceHashes[path]=hash(after);
}
for(const id of ['fieldwork','northline','hearthside']){
 const path='/work/'+id+'/',file='dist'+path+'index.html';
 const [before,after]=await Promise.all([read(prior,file),read(root,file)]);
 const article=bytes=>serializeOuter(find(parse(bytes.toString()),n=>n.tagName==='article'&&classOf(n).split(' ').includes('portfolio-concept')));
 assert.equal(article(after),article(before),'Complete article unchanged: '+path);
 const body=find(parse(after.toString()),n=>n.tagName==='body');assert.ok(!find(body,n=>classOf(n).split(' ').some(c=>c.startsWith('v4-'))),'No V4 presentation element exists on the concept page');
 proof.articleComparisons.push({path,beforeSha256:hash(article(before)),afterSha256:hash(article(after)),bodyClass:classOf(body)});
}
const [beforeCSS,afterCSS]=await Promise.all([read(prior,'src/assets/section-surfaces.css'),read(root,'src/assets/section-surfaces.css')]);
let isolatedRules=0;
const semantic=node=>{
 if(node.type==='comment')return null;
 if(node.type==='rule'&&node.selectors.some(selector=>/\.v4-[\w-]+/.test(selector))){assert.ok(node.selectors.every(selector=>/\.v4-[\w-]+/.test(selector)),'Every selector in an added rule requires an absent V4 element');isolatedRules++;return null;}
 const nodes=node.nodes?.map(semantic).filter(Boolean);
 if(node.type==='atrule'&&nodes?.length===0)return null;
 return {type:node.type,selector:node.selector,name:node.name,params:node.params,prop:node.prop,value:node.value,important:node.important,nodes};
};
assert.deepEqual(semantic(postcss.parse(afterCSS)),semantic(postcss.parse(beforeCSS)),'Every shared rule that could apply to the unchanged concept is identical');
proof.sharedStyleComparison={beforeSha256:hash(beforeCSS),afterSha256:hash(afterCSS),priorRulesUnchanged:true,addedRulesRequireAbsentV4Elements:isolatedRules};
for(const record of original.records)for(const asset of [record,...record.variants]){
 const bytes=await read(root,'src'+asset.path);assert.equal(hash(bytes),asset.sha256,'Preserved capture asset '+asset.path);
 proof.unchangedCaptureHashes.push({path:asset.path,sha256:asset.sha256});
}
next.captureSourceHashes=original.sourceHashes;
next.revalidation={reviewedAt:proof.reviewedAt,evidence:'operations/v4-offers-20261029/review/concept-preview-revalidation.json',reason:proof.reason};
await mkdir(join(root,'operations/v4-offers-20261029/review'),{recursive:true});
await writeFile(join(root,next.revalidation.evidence),JSON.stringify(proof,null,2)+'\n');
await writeFile(join(root,'src/city-preview-captures.json'),JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({status:'pass',articles:proof.articleComparisons.length,preservedImages:proof.unchangedCaptureHashes.length,recaptured:false}));
