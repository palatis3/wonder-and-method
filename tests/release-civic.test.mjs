import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {releaseFingerprint,evaluateRelease,workerRuntimeSourceFiles} from '../src/release.mjs';
import {verifyTechnicalManifest,technicalChecks} from '../src/release-verification.mjs';
import {civicAssetState,copyCivicAssets,civicPublicPath} from '../scripts/build-civic-assets.mjs';

const config={homeEdition:'civic-sculpture'};
test('direct and nested Worker helper edits invalidate approval even without an artifact rebuild',async()=>{
 const f=await fixture();try{
  await f.put('deployment/worker.mjs',"import './inquiry-acknowledgment.mjs'; export default {};");
  await f.put('deployment/inquiry-acknowledgment.mjs',"import './helpers/recovery.mjs'; export const enabled=true;");
  await f.put('deployment/helpers/recovery.mjs','export const retryLimit=3;');
  assert.deepEqual(await workerRuntimeSourceFiles(f.root),['deployment/helpers/recovery.mjs','deployment/inquiry-acknowledgment.mjs','deployment/worker.mjs']);
  const current={commit:'b'.repeat(40),...await releaseFingerprint(f.root)};
  const manifest={schemaVersion:1,kind:'website-technical',dirty:false,...current,checks:[...technicalChecks]};
  for(const [file,original] of [['deployment/inquiry-acknowledgment.mjs',"import './helpers/recovery.mjs'; export const enabled=true;"],['deployment/helpers/recovery.mjs','export const retryLimit=3;']]){
   await f.put(file,original+'\nexport const changed=true;');
   const changed={commit:current.commit,...await releaseFingerprint(f.root)};
   assert.equal(changed.artifactSha256,current.artifactSha256);
   assert.notEqual(changed.sourceSha256,current.sourceSha256);
   assert.throws(()=>verifyTechnicalManifest(manifest,changed),/sourceSha256/);
   await f.put(file,original);
  }
  await f.put('deployment/helpers/recovery.mjs',"import './missing.mjs';");
  await assert.rejects(releaseFingerprint(f.root),/Could not resolve/);
 }finally{await f.close();}
});
test('changing Worker routing or retired destinations invalidates an exact technical approval',async()=>{
 const f=await fixture();try{
  const current={commit:'a'.repeat(40),...await releaseFingerprint(f.root)};
  const manifest={schemaVersion:1,kind:'website-technical',dirty:false,...current,checks:[...technicalChecks]};
  assert.equal(verifyTechnicalManifest(manifest,current),true);
  for(const file of ['deployment/public-route-canonical.mjs','deployment/retired-county-routes.mjs']){
  await f.put(file,'changed canonical routing');
  const changed={commit:current.commit,...await releaseFingerprint(f.root)};
  assert.equal(changed.artifactSha256,current.artifactSha256);
  assert.notEqual(changed.sourceSha256,current.sourceSha256);
  assert.throws(()=>verifyTechnicalManifest(manifest,changed),/sourceSha256/);
  await f.put(file,'fixture');
  }
 }finally{await f.close();}
});
test('predeploy manifest rejects a changed dist byte even when source and commit are unchanged',async()=>{
 const f=await fixture();
 try{
  const commit='a'.repeat(40),current={commit,...await releaseFingerprint(f.root)};
  const manifest={schemaVersion:1,kind:'website-technical',dirty:false,...current,checks:[...technicalChecks]};
  assert.equal(verifyTechnicalManifest(manifest,current),true);
  assert.throws(()=>verifyTechnicalManifest({...manifest,checks:manifest.checks.filter(check=>check!=='browser-journeys')},current),/Incomplete technical check sequence/);
  assert.throws(()=>verifyTechnicalManifest({...manifest,checks:manifest.checks.filter(check=>check!=='site-quality')},current),/Incomplete technical check sequence/);
  assert.throws(()=>verifyTechnicalManifest({...manifest,kind:'website-technical-core'},current),/Business approval/);
  for(const gate of ['seo-editorial','reading-accessibility'])assert.throws(()=>verifyTechnicalManifest({...manifest,checks:manifest.checks.filter(check=>check!==gate)},current),/Incomplete technical check sequence/);
  await f.put('dist/index.html','Fixture');
  const changed={commit,...await releaseFingerprint(f.root)};
  assert.equal(changed.sourceSha256,current.sourceSha256);
  assert.throws(()=>verifyTechnicalManifest(manifest,changed),/artifactSha256/);
 }finally{await f.close();}
});
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'wm-civic-approval-'));
 const put=async(path,content)=>{await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),typeof content==='string'?content:JSON.stringify(content));};
 for(const dir of ['content','src','experience','scripts','authority/v5','deployment/migrations'])await mkdir(join(root,dir),{recursive:true});
 for(const file of ['dist/index.html','package.json','package-lock.json','config/offers.json','deployment/worker.mjs','deployment/public-route-canonical.mjs','deployment/retired-county-routes.mjs','deployment/inquiry-maintenance.mjs','deployment/inquiry-health.mjs','deployment/journey-counts.mjs','deployment/payment-records.mjs','deployment/wrangler.production.jsonc','deployment/package.json','deployment/package-lock.json','motion/civic-sculpture-preview.js','motion/civic-sculpture-preview.css'])await put(file,'fixture');
 for(const file of ['package.json','deployment/package.json'])await put(file,{type:'module'});
 await put('config/site.json',config);
 await put('config/page-dates.json',{});
 await put('deployment/journey-dimensions.mjs','fixture');
 await put('deployment/inquiry-rate.mjs','fixture');
 await put('deployment/notification-budget.mjs','fixture');
 const manifest=(revision)=>{
  const base=`/civic-sculpture/${revision==='finale-v2'?'finale-v2/':''}`;
  return {status:'ready',...(revision?{revision}:{}),video:base+'intro.mp4',poster:base+'poster.webp',mobilePoster:base+'mobile.webp',openingPoster:base+'opening.webp',videoBytes:5,...(revision==='finale-v2'?{ambientVideo:base+'ambient.mp4',ambientVideoBytes:5,ambientLoop:true,width:1440,height:720,fps:24,durationSeconds:10,frames:240,ambientDurationSeconds:4,ambientFrames:96,ambientFirstPoseMatchesIntroFinal:true}:{})};
 };
 const v1=manifest(),v2=manifest('finale-v2');
 const media=async m=>{for(const key of ['video','poster','mobilePoster','openingPoster','ambientVideo'])if(m[key])await put(civicPublicPath(m[key]),'media');};
 await media(v1);await put('public/civic-sculpture/manifest.json',v1);await put('output/civic-sculpture/pipeline-status.json',{state:'complete'});
 return {root,put,media,v1,v2,close:()=>rm(root,{recursive:true,force:true})};
}

test('every consumed versioned Civic input invalidates exact-version approval without a rebuild',async()=>{
 const f=await fixture();
 try{
  await f.media(f.v2);await f.put('public/civic-sculpture/manifest.json',f.v2);await f.put('output/civic-sculpture/finale-v2/pipeline-status.json',{state:'complete'});
  const state=await civicAssetState(f.root,config);
  const inputs=['motion/civic-sculpture-preview.js','motion/civic-sculpture-preview.css',...state.civicSourceFiles];
  const approvedVersion=await releaseFingerprint(f.root);
  const site={mode:'production',origin:'https://example.test',productionDomain:'example.test',formMode:'live',privacyReviewed:true,contactVerified:true};
  const deployment={vars:{ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true'},d1_databases:[{binding:'DB',database_id:'50f6e09c-6a46-49cb-a7ef-6221a1a65bf1'}],routes:[{pattern:'example.test',custom_domain:true}]};
  const evidence={gates:{},approvedVersion,approvedTarget:site.origin},contract={release_gates:[]};
  assert.equal(evaluateRelease(contract,evidence,approvedVersion,site,deployment).ready,true);
  for(const input of inputs){
   const original=await readFile(join(f.root,input),'utf8');
   await f.put(input,input.endsWith('.json')?{...JSON.parse(original),changed:true}:original.replace(/./,'X'));
   const changed=await releaseFingerprint(f.root);
   assert.equal(changed.artifactSha256,approvedVersion.artifactSha256);
   assert.notEqual(changed.sourceSha256,approvedVersion.sourceSha256,input);
   assert.ok(evaluateRelease(contract,evidence,changed,site,deployment).missing.some(item=>item.gate==='exact_version'),input);
   await f.put(input,original);
  }
  await f.put('output/civic-sculpture/finale-v2/frames/0001.png','unconsumed');await f.put('output/civic-sculpture/finale-v2/render.log','unconsumed');
  assert.deepEqual(await releaseFingerprint(f.root),approvedVersion);
 }finally{await f.close();}
});

test('pending versioned media are not required and rendering intermediates do not affect the accepted v1 fingerprint',async()=>{
 const f=await fixture();
 try{
  const before=await releaseFingerprint(f.root);
  await f.put('output/civic-sculpture/finale-v2/pipeline-status.json',{state:'rendering'});
  const state=await civicAssetState(f.root,config);
  assert.equal(state.civicReadiness.selectedRevision,'v1');assert.equal(state.civicAmbientReady,false);
  assert.deepEqual(await releaseFingerprint(f.root),before);
  await f.put('public/civic-sculpture/manifest.json',{...f.v1,status:'rendering'});await rm(join(f.root,civicPublicPath(f.v1.video)));
  const still=await civicAssetState(f.root,config);assert.equal(still.civicMotionReady,false);assert.ok(still.civicAssetFiles.every(p=>p.endsWith('.webp')));
  await releaseFingerprint(f.root); // No requirement for a nonexistent stream.
 }finally{await f.close();}
});

test('promoted finale falls back to accepted v1 until both streams and their pipeline validate',async()=>{
 const f=await fixture();
 try{
  await f.put('output/civic-sculpture/finale-v2/accepted-manifest-v1.json',f.v1);await f.media(f.v2);
  await f.put('public/civic-sculpture/manifest.json',f.v2);await f.put('output/civic-sculpture/finale-v2/pipeline-status.json',{state:'rendering'});
  assert.equal((await civicAssetState(f.root,config)).civicReadiness.selectedRevision,'v1');
  await f.put('output/civic-sculpture/finale-v2/pipeline-status.json',{state:'complete'});
  await f.put(civicPublicPath(f.v2.ambientVideo),'bad-size');
  assert.equal((await civicAssetState(f.root,config)).civicReadiness.selectedRevision,'v1');
  await rm(join(f.root,civicPublicPath(f.v2.ambientVideo)));
  assert.equal((await civicAssetState(f.root,config)).civicReadiness.selectedRevision,'v1');
  await f.put(civicPublicPath(f.v2.ambientVideo),'media');
  await f.put('public/civic-sculpture/manifest.json',{...f.v2,ambientVideo:undefined});
  assert.equal((await civicAssetState(f.root,config)).civicReadiness.selectedRevision,'v1','v2 must include both streams');
  await f.put('public/civic-sculpture/manifest.json',f.v2);
  const ready=await civicAssetState(f.root,config);assert.equal(ready.civicReadiness.selectedRevision,'finale-v2');assert.equal(ready.civicAmbientReady,true);
  const out=join(f.root,'preview');await copyCivicAssets(f.root,out,{...config,...ready});
  for(const path of ready.civicAssetFiles)assert.equal((await stat(join(out,'assets',path.slice(7)))).size,5);
  assert.equal(ready.civicAssetFiles.length,5);
  assert.throws(()=>civicPublicPath('/civic-sculpture/../secret.mp4'));
  assert.throws(()=>civicPublicPath('https://other.test/video.mp4'));
 }finally{await f.close();}
});

test('optional phone assets are paired, hash verified, copied and included in release fingerprints',async()=>{
 const f=await fixture();
 try{
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const manifest={...f.v2,mobileVideoWidth:960,mobileVideoHeight:480,smallPosterWidth:480,smallPosterHeight:240};
  for(const key of ['mobileVideo','mobileAmbientVideo','smallPoster']){
   manifest[key]=`/civic-sculpture/finale-v2/${key}.${key==='smallPoster'?'webp':'mp4'}`;
   manifest[key+'Bytes']=5;manifest[key+'Sha256']=hash('media');await f.put(civicPublicPath(manifest[key]),'media');
  }
  manifest.mobileVideoSourceSha256=manifest.mobileAmbientVideoSourceSha256=hash('media');
  await f.media(manifest);await f.put('public/civic-sculpture/manifest.json',manifest);await f.put('output/civic-sculpture/finale-v2/pipeline-status.json',{state:'complete'});
  const state=await civicAssetState(f.root,config);assert.equal(state.civicReadiness.mobileReady,true);assert.equal(state.civicReadiness.smallPosterReady,true);
  const before=await releaseFingerprint(f.root);const out=join(f.root,'preview');await copyCivicAssets(f.root,out,{...config,...state});
  for(const key of ['mobileVideo','mobileAmbientVideo','smallPoster']){const path=civicPublicPath(manifest[key]);assert.ok(state.civicSourceFiles.includes(path));assert.equal((await stat(join(out,'assets',path.slice(7)))).size,5);}
  await f.put(civicPublicPath(manifest.mobileAmbientVideo),'wrong'); // Same size, invalid content hash.
  const fallback=await civicAssetState(f.root,config);assert.equal(fallback.civicMotionReady,true);assert.equal(fallback.civicReadiness.mobileReady,false);assert.equal(fallback.civicMedia.mobileVideo,undefined);assert.equal(fallback.civicMedia.mobileAmbientVideo,undefined);
  assert.notEqual((await releaseFingerprint(f.root)).sourceSha256,before.sourceSha256);
  await rm(join(f.root,civicPublicPath(manifest.smallPoster)));assert.equal((await civicAssetState(f.root,config)).civicMedia.smallPoster,undefined);
 }finally{await f.close();}
});
